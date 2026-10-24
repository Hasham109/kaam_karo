/**
 * Session management service (SEC-AUTH-002, SEC-AUTH-005, SEC-AUTH-006; BP §25, §27; D-002).
 * Handles bearer session tokens, SHA-256 token hashing, expiration, and revocation.
 */
import * as crypto from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AppError, CONFIG_SERVICE, type ConfigService, configParsers } from '@kaamkaro/platform';
import { PrismaService } from '../../../platform/prisma.service';
import {
  AccountStatus,
  type AdminSubRole,
  type ClientSurface,
  type User,
  type UserRoleType,
} from '../../../generated/prisma/client.js';

export interface CreatedSession {
  readonly id: string;
  readonly rawToken: string;
  readonly expiresAt: Date;
}

export interface AuthenticatedUserContext {
  readonly sessionId: string;
  readonly userId: string;
  readonly surface: ClientSurface;
  readonly roles: readonly UserRoleType[];
  readonly subRoles: readonly AdminSubRole[];
  readonly mfaVerifiedAt: Date | null;
  readonly user: User;
}

const DEFAULT_APP_SESSION_TTL_SECONDS = 30 * 24 * 3600; // 30 days safe default (OQ-028)
const DEFAULT_ADMIN_IDLE_TIMEOUT_SECONDS = 8 * 3600; // 8 hours safe default (OQ-028, OQ-051)

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG_SERVICE) private readonly config: ConfigService,
  ) {}

  private async getTtlSeconds(surface: ClientSurface): Promise<number> {
    if (surface === 'ADMIN_PORTAL') {
      const adminTimeout = await this.config.inspect(
        'auth.admin_idle_timeout',
        configParsers.positiveInteger,
      );
      return adminTimeout.status === 'configured'
        ? adminTimeout.value
        : DEFAULT_ADMIN_IDLE_TIMEOUT_SECONDS;
    }
    const appTtl = await this.config.inspect('auth.session_ttl', configParsers.positiveInteger);
    return appTtl.status === 'configured' ? appTtl.value : DEFAULT_APP_SESSION_TTL_SECONDS;
  }

  /**
   * Generates a bearer token and stores its SHA-256 hash (SEC-BASE-002, SEC-AUTH-002).
   * Raw token is returned to the client once and never persisted.
   */
  async createSession(
    userId: string,
    surface: ClientSurface,
    options: {
      deviceLabel?: string;
      pushToken?: string;
      mfaVerified?: boolean;
    } = {},
  ): Promise<CreatedSession> {
    const rawToken = `kk_sec_${crypto.randomBytes(32).toString('base64url')}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const ttlSeconds = await this.getTtlSeconds(surface);

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const mfaVerifiedAt = options.mfaVerified ? new Date() : null;

    const session = await this.prisma.deviceSession.create({
      data: {
        userId,
        surface,
        tokenHash,
        deviceLabel: options.deviceLabel ?? null,
        pushToken: options.pushToken ?? null,
        mfaVerifiedAt,
        expiresAt,
      },
    });

    return {
      id: session.id,
      rawToken,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Authenticate a bearer token. Returns user context or null if invalid/expired/revoked.
   * Throws 403 if the user account is BLOCKED (SEC-AUTH-006).
   */
  async authenticateToken(rawToken: string): Promise<AuthenticatedUserContext | null> {
    if (!rawToken || typeof rawToken !== 'string') return null;

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const session = await this.prisma.deviceSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            roles: true,
            adminUser: {
              include: {
                subRoles: {
                  where: { revokedAt: null },
                },
              },
            },
          },
        },
      },
    });

    if (!session) return null;

    // Check revocation (SEC-AUTH-002)
    if (session.revokedAt !== null) return null;

    // Check expiry
    if (session.expiresAt.getTime() <= Date.now()) return null;

    // Check account status (SEC-AUTH-006, SEC-AUTH-008)
    if (session.user.status === AccountStatus.BLOCKED) {
      throw new AppError(
        'ACCOUNT_BLOCKED',
        403,
        'Your account is blocked. Please contact support.',
      );
    }
    if (session.user.status === AccountStatus.ANONYMISED) {
      throw new AppError('ACCOUNT_ANONYMISED', 403, 'This account has been deleted.');
    }

    // Touch lastSeenAt (async, fire-and-forget to avoid blocking the hot path)
    this.prisma.deviceSession
      .update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      })
      .catch(() => {});

    // Compute active roles and subRoles
    const roles = session.user.roles.map((r) => r.role);
    const subRoles: AdminSubRole[] = [];

    if (
      session.surface === 'ADMIN_PORTAL' &&
      session.user.adminUser &&
      session.user.adminUser.isActive &&
      session.mfaVerifiedAt !== null
    ) {
      for (const sr of session.user.adminUser.subRoles) {
        subRoles.push(sr.subRole);
      }
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      surface: session.surface,
      roles,
      subRoles,
      mfaVerifiedAt: session.mfaVerifiedAt,
      user: session.user,
    };
  }

  /**
   * Refresh session (extends session with a newly generated bearer token).
   */
  async refreshSession(sessionId: string): Promise<CreatedSession> {
    const session = await this.prisma.deviceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.revokedAt !== null || session.expiresAt.getTime() <= Date.now()) {
      throw AppError.of('UNAUTHENTICATED');
    }

    const rawToken = `kk_sec_${crypto.randomBytes(32).toString('base64url')}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const ttlSeconds = await this.getTtlSeconds(session.surface);

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const updated = await this.prisma.deviceSession.update({
      where: { id: sessionId },
      data: {
        tokenHash,
        expiresAt,
      },
    });

    return {
      id: updated.id,
      rawToken,
      expiresAt: updated.expiresAt,
    };
  }

  /**
   * Revoke current session (sign out).
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.deviceSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revoke all sessions for a user, e.g. sign out other devices (C27/P21; SEC-AUTH-002).
   */
  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await this.prisma.deviceSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }
}

/**
 * Phone OTP authentication service (SEC-AUTH-001, SEC-AUTH-004; BP §27, §29; D-002).
 * Validates Pakistani mobile numbers, rate limits requests, hashes OTPs with pepper,
 * and provisions or loads user accounts.
 */
import * as crypto from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { AppError, CONFIG_SERVICE, type ConfigService, configParsers } from '@kaamkaro/platform';
import { PrismaService } from '../../../platform/prisma.service';
import { AUTH_PEPPER, OTP_CHALLENGE_STORE, OTP_SENDER } from '../identity.constants';
import type { OtpChallengeStore } from './otp-challenge.store';
import type { OtpSender } from './otp-sender.interface';
import {
  AccountStatus,
  type ClientSurface,
  UserRoleType,
} from '../../../generated/prisma/client.js';
import { SessionService } from '../session/session.service';

export interface UserSummaryDto {
  id: string;
  phoneE164: string | null;
  displayName: string | null;
  status: AccountStatus;
  roles: readonly UserRoleType[];
}

export interface VerifyOtpResult {
  token: string;
  user: UserSummaryDto;
  isNewUser: boolean;
  expiresAt: string;
}

export function normalizePakistaniPhone(raw: string): string {
  if (!raw || typeof raw !== 'string') {
    throw new AppError('INVALID_PHONE', 400, 'Mobile number must be provided.');
  }
  const cleaned = raw.trim().replace(/[\s\-()]/g, '');
  if (/^\+923[0-9]{9}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^03[0-9]{9}$/.test(cleaned)) {
    return `+92${cleaned.slice(1)}`;
  }
  if (/^3[0-9]{9}$/.test(cleaned)) {
    return `+92${cleaned}`;
  }
  if (/^00923[0-9]{9}$/.test(cleaned)) {
    return `+92${cleaned.slice(4)}`;
  }
  throw new AppError(
    'INVALID_PHONE',
    400,
    'Mobile number must be a valid Pakistani mobile number (+92 3xx xxxxxxx)',
  );
}

function parseOtpSendLimit(raw: unknown): { maxSends: number; windowSeconds: number } | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.maxSends === 'number' &&
    obj.maxSends > 0 &&
    typeof obj.windowSeconds === 'number' &&
    obj.windowSeconds > 0
  ) {
    return { maxSends: Math.floor(obj.maxSends), windowSeconds: Math.floor(obj.windowSeconds) };
  }
  return undefined;
}

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG_SERVICE) private readonly config: ConfigService,
    @Inject(OTP_SENDER) private readonly otpSender: OtpSender,
    @Inject(OTP_CHALLENGE_STORE) private readonly store: OtpChallengeStore,
    @Inject(AUTH_PEPPER) private readonly pepper: string,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Request an OTP sent to a Pakistani mobile number.
   * Returns identical response regardless of whether account exists or is blocked (SEC-AUTH-001, SEC-AUTH-004).
   */
  async sendOtp(
    phoneRaw: string,
    _surface: ClientSurface,
  ): Promise<{ status: 'PENDING'; resendCooldownSeconds: number }> {
    const phoneE164 = normalizePakistaniPhone(phoneRaw);

    // Read fail-closed limits per action (SEC-REVIEW-T2.6 #1; SEC-AUTH-004)
    const expirySeconds = await this.config.require(
      'auth.otp.expiry_seconds',
      configParsers.positiveInteger,
    );
    const resendCooldownSeconds = await this.config.require(
      'auth.otp.resend_cooldown_seconds',
      configParsers.positiveInteger,
    );
    const maxAttempts = await this.config.require(
      'auth.otp.max_attempts',
      configParsers.positiveInteger,
    );
    await this.config.require('auth.otp.lockout_seconds', configParsers.positiveInteger);
    const sendLimit = await this.config.require('auth.rate_limit.otp_send', parseOtpSendLimit);

    // 1. Check lockout
    const lockoutUntil = await this.store.getLockoutUntil(phoneE164);
    if (lockoutUntil !== null && Date.now() < lockoutUntil) {
      throw new AppError('ACCOUNT_LOCKED', 429, 'Too many failed attempts. Try again later.');
    }

    // 2. Check rate limit on sends
    const sends = await this.store.recordSend(phoneE164, sendLimit.windowSeconds);
    if (sends > sendLimit.maxSends) {
      throw new AppError('RATE_LIMIT_EXCEEDED', 429, 'Too many OTP requests. Try again later.');
    }

    // 3. Check resend cooldown
    const existing = await this.store.getChallenge(phoneE164);
    if (existing !== null && Date.now() < existing.resendAvailableAt) {
      const waitSeconds = Math.ceil((existing.resendAvailableAt - Date.now()) / 1000);
      throw new AppError(
        'RESEND_COOLDOWN',
        429,
        `Please wait ${waitSeconds} seconds before requesting another code.`,
      );
    }

    // 4. Generate 6-digit cryptographic OTP (SEC-AUTH-003)
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto
      .createHmac('sha256', this.pepper)
      .update(`${phoneE164}:${code}`)
      .digest('hex');

    const now = Date.now();
    await this.store.saveChallenge({
      phoneE164,
      codeHash,
      attempts: 0,
      maxAttempts,
      expiresAt: now + expirySeconds * 1000,
      resendAvailableAt: now + resendCooldownSeconds * 1000,
    });

    // 5. Send via OtpSender (fake in dev/test, SMS provider in prod)
    await this.otpSender.sendOtp(phoneE164, code);

    return {
      status: 'PENDING',
      resendCooldownSeconds,
    };
  }

  /**
   * Verify phone OTP and establish a device session (SEC-AUTH-001, SEC-AUTH-002, SEC-AUTH-004, SEC-AUTH-006).
   */
  async verifyOtp(params: {
    phoneRaw: string;
    code: string;
    surface: ClientSurface;
    deviceLabel?: string;
    pushToken?: string;
  }): Promise<VerifyOtpResult> {
    const phoneE164 = normalizePakistaniPhone(params.phoneRaw);

    if (!/^[0-9]{4,8}$/.test(params.code)) {
      throw new AppError('INVALID_OTP', 400, 'OTP must be numeric.');
    }

    const lockoutSeconds = await this.config.require(
      'auth.otp.lockout_seconds',
      configParsers.positiveInteger,
    );

    // 1. Check lockout
    const lockoutUntil = await this.store.getLockoutUntil(phoneE164);
    if (lockoutUntil !== null && Date.now() < lockoutUntil) {
      throw new AppError('ACCOUNT_LOCKED', 429, 'Too many failed attempts. Try again later.');
    }

    // 2. Fetch challenge
    const challenge = await this.store.getChallenge(phoneE164);
    if (!challenge) {
      throw new AppError('INVALID_OTP', 401, 'Invalid or expired OTP.');
    }

    // 3. Check attempt count
    if (challenge.attempts >= challenge.maxAttempts) {
      await this.store.deleteChallenge(phoneE164);
      await this.store.setLockout(phoneE164, Date.now() + lockoutSeconds * 1000);
      throw new AppError(
        'MAX_ATTEMPTS_EXCEEDED',
        429,
        'Too many incorrect attempts. Request a new OTP.',
      );
    }

    // 4. Verify HMAC-SHA256 hash using timingSafeEqual
    const expectedHash = crypto
      .createHmac('sha256', this.pepper)
      .update(`${phoneE164}:${params.code}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedHash, 'hex');
    const actualBuf = Buffer.from(challenge.codeHash, 'hex');
    const isMatch =
      expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!isMatch) {
      challenge.attempts += 1;
      if (challenge.attempts >= challenge.maxAttempts) {
        await this.store.deleteChallenge(phoneE164);
        await this.store.setLockout(phoneE164, Date.now() + lockoutSeconds * 1000);
        throw new AppError(
          'MAX_ATTEMPTS_EXCEEDED',
          429,
          'Too many incorrect attempts. Request a new OTP.',
        );
      }
      await this.store.saveChallenge(challenge);
      throw new AppError('INVALID_OTP', 401, 'Invalid or expired OTP.');
    }

    // OTP matches: consume challenge
    await this.store.deleteChallenge(phoneE164);

    // 5. Load or create user
    let user = await this.prisma.user.findUnique({
      where: { phoneE164 },
      include: { roles: true },
    });

    let isNewUser = false;
    const targetRole =
      params.surface === 'CUSTOMER_APP' ? UserRoleType.CUSTOMER : UserRoleType.PROVIDER;

    if (!user) {
      isNewUser = true;
      user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            phoneE164,
            status: AccountStatus.ACTIVE,
          },
        });
        await tx.userRole.create({
          data: {
            userId: createdUser.id,
            role: targetRole,
          },
        });
        return tx.user.findUniqueOrThrow({
          where: { id: createdUser.id },
          include: { roles: true },
        });
      });
    } else {
      // Check account lifecycle status (SEC-AUTH-006, SEC-AUTH-008)
      if (user.status === AccountStatus.BLOCKED) {
        throw new AppError(
          'ACCOUNT_BLOCKED',
          403,
          'Your account is blocked. Please contact support.',
        );
      }
      if (user.status === AccountStatus.ANONYMISED) {
        throw new AppError('ACCOUNT_ANONYMISED', 403, 'This account has been deleted.');
      }

      // If user logs in to a different surface (e.g. customer becoming a provider, BP §25)
      const hasRole = user.roles.some((r) => r.role === targetRole);
      if (!hasRole && params.surface !== 'ADMIN_PORTAL') {
        await this.prisma.userRole.create({
          data: {
            userId: user.id,
            role: targetRole,
          },
        });
        user = await this.prisma.user.findUniqueOrThrow({
          where: { id: user.id },
          include: { roles: true },
        });
      }
    }

    // 6. Create session
    const session = await this.sessionService.createSession(user.id, params.surface, {
      ...(params.deviceLabel ? { deviceLabel: params.deviceLabel } : {}),
      ...(params.pushToken ? { pushToken: params.pushToken } : {}),
    });

    return {
      token: session.rawToken,
      user: {
        id: user.id,
        phoneE164: user.phoneE164,
        displayName: user.displayName,
        status: user.status,
        roles: user.roles.map((r) => r.role),
      },
      isNewUser,
      expiresAt: session.expiresAt.toISOString(),
    };
  }
}

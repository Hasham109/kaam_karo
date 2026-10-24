/**
 * Authentication Guard (BP §29; SEC-BASE-003, SEC-AUTH-002, SEC-AUTH-005, SEC-AUTH-006).
 * Validates Bearer session token, loads user context, and sets request.user.
 */
import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '@kaamkaro/platform';
import { SessionService } from '../session/session.service';
import type { HttpRequest } from '../../../platform/http-types';
import type {
  AdminSubRole,
  ClientSurface,
  UserRoleType,
} from '../../../generated/prisma/client.js';

export const IS_PUBLIC_KEY = 'kaamkaro:is-public';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface RequestUser {
  readonly id: string;
  readonly sessionId: string;
  readonly surface: ClientSurface;
  readonly roles: readonly UserRoleType[];
  readonly subRoles: readonly AdminSubRole[];
  readonly mfaVerifiedAt: Date | null;
  readonly [key: string]: unknown;
}

export interface AuthenticatedRequest extends HttpRequest {
  user: RequestUser;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<HttpRequest>();
    const authHeader = req.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw AppError.of('UNAUTHENTICATED');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw AppError.of('UNAUTHENTICATED');
    }

    const userContext = await this.sessionService.authenticateToken(token);
    if (!userContext) {
      throw AppError.of('UNAUTHENTICATED');
    }

    req.user = {
      id: userContext.userId,
      sessionId: userContext.sessionId,
      surface: userContext.surface,
      roles: userContext.roles,
      subRoles: userContext.subRoles,
      mfaVerifiedAt: userContext.mfaVerifiedAt,
    };

    return true;
  }
}

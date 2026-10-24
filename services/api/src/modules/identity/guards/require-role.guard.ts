/**
 * Role-Based Access Control Guards (BP §8, §29; ROLE-001…003, ADMIN-ROLE-001…008, SEC-AUTH-005).
 */
import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '@kaamkaro/platform';
import type { HttpRequest } from '../../../platform/http-types';
import type { AdminSubRole, UserRoleType } from '../../../generated/prisma/client.js';

export const REQUIRED_ROLES_KEY = 'kaamkaro:required-roles';
export const RequireRole = (...roles: UserRoleType[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);

@Injectable()
export class RequireRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRoleType[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<HttpRequest>();
    const user = req.user;

    if (!user) {
      throw AppError.of('UNAUTHENTICATED');
    }

    const roles = Array.isArray(user['roles']) ? (user['roles'] as UserRoleType[]) : [];
    const hasRole = roles.some((r) => requiredRoles.includes(r));
    if (!hasRole) {
      throw AppError.of('FORBIDDEN');
    }

    return true;
  }
}

export const REQUIRED_ADMIN_SUB_ROLES_KEY = 'kaamkaro:required-admin-sub-roles';
export const RequireAdminSubRole = (...subRoles: AdminSubRole[]) =>
  SetMetadata(REQUIRED_ADMIN_SUB_ROLES_KEY, subRoles);

@Injectable()
export class RequireAdminSubRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredSubRoles = this.reflector.getAllAndOverride<AdminSubRole[]>(
      REQUIRED_ADMIN_SUB_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredSubRoles || requiredSubRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<HttpRequest>();
    const user = req.user;

    if (!user) {
      throw AppError.of('UNAUTHENTICATED');
    }

    // Must be on admin portal surface and have completed MFA (SEC-AUTH-005)
    if (user['surface'] !== 'ADMIN_PORTAL' || !user['mfaVerifiedAt']) {
      throw new AppError(
        'FORBIDDEN_FOR_SUB_ROLE',
        403,
        'Admin access requires authenticated staff session with verified MFA.',
      );
    }

    const subRoles = Array.isArray(user['subRoles']) ? (user['subRoles'] as AdminSubRole[]) : [];
    const hasSubRole = subRoles.some((sr) => requiredSubRoles.includes(sr));
    if (!hasSubRole) {
      throw new AppError(
        'FORBIDDEN_FOR_SUB_ROLE',
        403,
        `Requires one of admin sub-roles: ${requiredSubRoles.join(', ')}`,
      );
    }

    return true;
  }
}

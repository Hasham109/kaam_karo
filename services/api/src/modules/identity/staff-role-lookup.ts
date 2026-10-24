/**
 * Real StaffRoleLookup implementation over admin_user_sub_role (RQ-012; SEC-REVIEW-T2.6 #4;
 * ADMIN-ROLE-001…008, SEC-AUTH-005; BP §8.4, §27, §29).
 * Used by catalog activation, config management, and admin controllers.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service';
import { type AdminSubRoleName, type StaffRoleLookup, isUuid } from '../catalog';
import { AccountStatus } from '../../generated/prisma/client.js';

@Injectable()
export class DatabaseStaffRoleLookup implements StaffRoleLookup {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Active sub-roles of a staff user with completed MFA; [] for anyone else
   * (customer, provider, blocked account, deactivated staff, or missing MFA).
   */
  async subRolesOf(userId: string): Promise<readonly AdminSubRoleName[]> {
    if (!isUuid(userId)) return [];

    const adminUser = await this.prisma.adminUser.findUnique({
      where: { userId },
      include: {
        user: { select: { status: true } },
        subRoles: {
          where: { revokedAt: null },
          select: { subRole: true },
        },
      },
    });

    if (!adminUser) return [];

    // Must be active staff and active user (ADMIN-ROLE-001, SEC-AUTH-006)
    if (!adminUser.isActive || adminUser.user.status !== AccountStatus.ACTIVE) {
      return [];
    }

    // Must have enrolled in MFA (SEC-AUTH-005)
    if (adminUser.mfaEnrolledAt === null) {
      return [];
    }

    return adminUser.subRoles.map((sr) => sr.subRole as AdminSubRoleName);
  }
}

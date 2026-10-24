import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../../../platform/prisma.service';
import { AccountStatus } from '../../../generated/prisma/client.js';
import { DatabaseStaffRoleLookup } from '../staff-role-lookup';

describe('DatabaseStaffRoleLookup (RQ-012; SEC-REVIEW-T2.6 #4; ADMIN-ROLE-001…008)', () => {
  it('returns active sub-roles for active staff with enrolled MFA', async () => {
    const prismaMock = {
      adminUser: {
        findUnique: async () => ({
          id: 'admin-1',
          isActive: true,
          mfaEnrolledAt: new Date(),
          user: { status: AccountStatus.ACTIVE },
          subRoles: [{ subRole: 'SUPER_ADMIN' }, { subRole: 'OPERATIONS' }],
        }),
      },
    } as unknown as PrismaService;

    const lookup = new DatabaseStaffRoleLookup(prismaMock);
    const roles = await lookup.subRolesOf('550e8400-e29b-41d4-a716-446655440000');

    expect(roles).toEqual(['SUPER_ADMIN', 'OPERATIONS']);
  });

  it('returns [] for malformed UUID', async () => {
    const prismaMock = {
      adminUser: { findUnique: async () => null },
    } as unknown as PrismaService;
    const lookup = new DatabaseStaffRoleLookup(prismaMock);
    expect(await lookup.subRolesOf('not-a-uuid')).toEqual([]);
  });

  it('returns [] if adminUser is inactive', async () => {
    const prismaMock = {
      adminUser: {
        findUnique: async () => ({
          id: 'admin-1',
          isActive: false,
          mfaEnrolledAt: new Date(),
          user: { status: AccountStatus.ACTIVE },
          subRoles: [{ subRole: 'SUPER_ADMIN' }],
        }),
      },
    } as unknown as PrismaService;

    const lookup = new DatabaseStaffRoleLookup(prismaMock);
    expect(await lookup.subRolesOf('550e8400-e29b-41d4-a716-446655440000')).toEqual([]);
  });

  it('returns [] if user is blocked (SEC-AUTH-006)', async () => {
    const prismaMock = {
      adminUser: {
        findUnique: async () => ({
          id: 'admin-1',
          isActive: true,
          mfaEnrolledAt: new Date(),
          user: { status: AccountStatus.BLOCKED },
          subRoles: [{ subRole: 'SUPER_ADMIN' }],
        }),
      },
    } as unknown as PrismaService;

    const lookup = new DatabaseStaffRoleLookup(prismaMock);
    expect(await lookup.subRolesOf('550e8400-e29b-41d4-a716-446655440000')).toEqual([]);
  });

  it('returns [] if MFA is not enrolled (SEC-AUTH-005)', async () => {
    const prismaMock = {
      adminUser: {
        findUnique: async () => ({
          id: 'admin-1',
          isActive: true,
          mfaEnrolledAt: null,
          user: { status: AccountStatus.ACTIVE },
          subRoles: [{ subRole: 'SUPER_ADMIN' }],
        }),
      },
    } as unknown as PrismaService;

    const lookup = new DatabaseStaffRoleLookup(prismaMock);
    expect(await lookup.subRolesOf('550e8400-e29b-41d4-a716-446655440000')).toEqual([]);
  });
});

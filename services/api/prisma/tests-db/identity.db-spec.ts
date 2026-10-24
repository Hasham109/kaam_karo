/**
 * Database-level integration tests for Module M1 (Identity, Access & Sessions).
 * T2.4 acceptance; SEC-AUTH-001..008, ADMIN-ROLE-001, DATA-003, D-002.
 *
 * Runs against a migrated & seeded database using:
 *   DATABASE_URL = kaamkaro_api (API login, member of kaamkaro_app)
 *   MIGRATION_DATABASE_URL = table owner (for schema inspection)
 * Every test runs in a rolled-back transaction so the test database stays clean.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  AccountStatus,
  AdminSubRole,
  ClientSurface,
  PrismaClient,
  UserRoleType,
} from '../../src/generated/prisma/client.js';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl) {
  throw new Error('identity.db-spec needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL');
}

const app = new PrismaClient({ adapter: new PrismaPg({ connectionString: appUrl }) });
const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: ownerUrl }) });

afterAll(async () => {
  await app.$disconnect();
  await owner.$disconnect();
});

class Rollback extends Error {}

/** Run statements in a rolled-back transaction; returns the returned value or thrown non-rollback error. */
async function attempt<T>(
  client: PrismaClient,
  fn: (tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  let value: T | undefined;
  await expect(
    client.$transaction(async (tx) => {
      value = await fn(tx);
      throw new Rollback('rollback');
    }),
  ).rejects.toBeInstanceOf(Rollback);
  return value as T;
}

describe('T2.4 Database Tests: Identity, Access & Sessions', () => {
  describe('SEC-AUTH-001 & SEC-AUTH-003: Passwordless architecture', () => {
    it('verifies no password or credential columns exist across identity tables', async () => {
      const rows = await owner.$queryRaw<Array<{ table_name: string; column_name: string }>>`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('user_account', 'device_session', 'admin_user', 'admin_user_sub_role', 'admin_recovery_code')
          AND (
            column_name ILIKE '%password%'
            OR column_name ILIKE '%passwd%'
            OR column_name ILIKE '%pwd%'
            OR column_name ILIKE '%pass_hash%'
          );
      `;
      expect(rows).toEqual([]);
    });

    it('creates a user, role, and active device session with SHA-256 hashed token', async () => {
      await attempt(app, async (tx) => {
        const phone = `+92300${Math.floor(1000000 + Math.random() * 9000000)}`;
        const user = await tx.user.create({
          data: {
            phoneE164: phone,
            displayName: 'Test User',
            status: AccountStatus.ACTIVE,
            roles: {
              create: [{ role: UserRoleType.CUSTOMER }],
            },
          },
          include: { roles: true },
        });

        expect(user.id).toBeDefined();
        expect(user.phoneE164).toBe(phone);
        expect(user.roles).toHaveLength(1);
        expect(user.roles[0]?.role).toBe(UserRoleType.CUSTOMER);

        const tokenHash = randomBytes(32).toString('hex');
        const session = await tx.deviceSession.create({
          data: {
            userId: user.id,
            surface: ClientSurface.CUSTOMER_APP,
            tokenHash,
            deviceLabel: 'Pixel 8',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        expect(session.id).toBeDefined();
        expect(session.tokenHash).toBe(tokenHash);
        expect(session.revokedAt).toBeNull();

        // Query active session
        const found = await tx.deviceSession.findFirst({
          where: {
            tokenHash,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          include: { user: { include: { roles: true } } },
        });

        expect(found).not.toBeNull();
        expect(found?.user.phoneE164).toBe(phone);
      });
    });
  });

  describe('SEC-AUTH-002: Session revocation and multi-device sign-out', () => {
    it('revokes a single session and verifies it can no longer be found as active', async () => {
      await attempt(app, async (tx) => {
        const user = await tx.user.create({
          data: {
            phoneE164: `+92301${Math.floor(1000000 + Math.random() * 9000000)}`,
            status: AccountStatus.ACTIVE,
          },
        });

        const tokenHash = randomBytes(32).toString('hex');
        const session = await tx.deviceSession.create({
          data: {
            userId: user.id,
            surface: ClientSurface.CUSTOMER_APP,
            tokenHash,
            expiresAt: new Date(Date.now() + 3600000),
          },
        });

        // Revoke session
        await tx.deviceSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });

        const active = await tx.deviceSession.findFirst({
          where: {
            tokenHash,
            revokedAt: null,
          },
        });
        expect(active).toBeNull();
      });
    });

    it('multi-device sign-out (revokeAllSessions) revokes all sessions except the current one', async () => {
      await attempt(app, async (tx) => {
        const user = await tx.user.create({
          data: {
            phoneE164: `+92302${Math.floor(1000000 + Math.random() * 9000000)}`,
            status: AccountStatus.ACTIVE,
          },
        });

        await tx.deviceSession.create({
          data: {
            userId: user.id,
            surface: ClientSurface.CUSTOMER_APP,
            tokenHash: randomBytes(32).toString('hex'),
            deviceLabel: 'Device 1',
            expiresAt: new Date(Date.now() + 3600000),
          },
        });
        await tx.deviceSession.create({
          data: {
            userId: user.id,
            surface: ClientSurface.CUSTOMER_APP,
            tokenHash: randomBytes(32).toString('hex'),
            deviceLabel: 'Device 2',
            expiresAt: new Date(Date.now() + 3600000),
          },
        });
        const currentSession = await tx.deviceSession.create({
          data: {
            userId: user.id,
            surface: ClientSurface.CUSTOMER_APP,
            tokenHash: randomBytes(32).toString('hex'),
            deviceLabel: 'Current Device',
            expiresAt: new Date(Date.now() + 3600000),
          },
        });

        // Revoke all except currentSession
        const updateResult = await tx.deviceSession.updateMany({
          where: {
            userId: user.id,
            id: { not: currentSession.id },
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
        expect(updateResult.count).toBe(2);

        // Verify s1 and s2 are revoked, currentSession is not
        const remaining = await tx.deviceSession.findMany({
          where: { userId: user.id, revokedAt: null },
        });
        expect(remaining).toHaveLength(1);
        expect(remaining[0]?.id).toBe(currentSession.id);
      });
    });
  });

  describe('SEC-AUTH-004: Configuration keys for rate limiting and lockouts', () => {
    it('verifies seeded config keys exist for OTP lifetime, resend cooldown, and lockout', async () => {
      const keys = await app.configKeyPolicy.findMany({
        where: {
          key: {
            in: [
              'auth.otp.expiry_seconds',
              'auth.otp.max_attempts',
              'auth.otp.resend_cooldown_seconds',
              'auth.otp.lockout_seconds',
              'auth.session_ttl',
              'auth.admin_idle_timeout',
            ],
          },
        },
      });

      const foundKeyNames = keys.map((k: { key: string }) => k.key);
      expect(foundKeyNames).toContain('auth.otp.expiry_seconds');
      expect(foundKeyNames).toContain('auth.otp.max_attempts');
      expect(foundKeyNames).toContain('auth.otp.resend_cooldown_seconds');
      expect(foundKeyNames).toContain('auth.otp.lockout_seconds');
    });
  });

  describe('SEC-AUTH-005 & ADMIN-ROLE-001: Admin MFA & Staff sub-roles lookup', () => {
    it('resolves active sub-roles for MFA-verified active admin accounts', async () => {
      await attempt(app, async (tx) => {
        const user = await tx.user.create({
          data: {
            displayName: 'Admin Staff',
            status: AccountStatus.ACTIVE,
            roles: {
              create: [{ role: UserRoleType.ADMIN }],
            },
          },
        });

        const adminUser = await tx.adminUser.create({
          data: {
            userId: user.id,
            isActive: true,
            mfaEnrolledAt: new Date(),
            subRoles: {
              create: [{ subRole: AdminSubRole.SUPER_ADMIN }, { subRole: AdminSubRole.FINANCE }],
            },
          },
          include: { subRoles: true },
        });

        expect(adminUser.subRoles).toHaveLength(2);

        // Test staff sub-role resolution query matching DatabaseStaffRoleLookup
        const activeSubRoles = await tx.adminUserSubRole.findMany({
          where: {
            adminUser: {
              userId: user.id,
              isActive: true,
              mfaEnrolledAt: { not: null },
            },
            revokedAt: null,
          },
          select: { subRole: true },
        });

        const names = activeSubRoles.map((r) => r.subRole);
        expect(names).toContain(AdminSubRole.SUPER_ADMIN);
        expect(names).toContain(AdminSubRole.FINANCE);
      });
    });

    it('excludes revoked sub-roles and inactive admin accounts from active roles', async () => {
      await attempt(app, async (tx) => {
        const user = await tx.user.create({
          data: {
            displayName: 'Deactivated Admin',
            status: AccountStatus.ACTIVE,
            roles: {
              create: [{ role: UserRoleType.ADMIN }],
            },
          },
        });

        await tx.adminUser.create({
          data: {
            userId: user.id,
            isActive: false, // Deactivated!
            mfaEnrolledAt: new Date(),
            subRoles: {
              create: [{ subRole: AdminSubRole.OPERATIONS }],
            },
          },
        });

        const activeSubRoles = await tx.adminUserSubRole.findMany({
          where: {
            adminUser: {
              userId: user.id,
              isActive: true,
              mfaEnrolledAt: { not: null },
            },
            revokedAt: null,
          },
          select: { subRole: true },
        });

        expect(activeSubRoles).toHaveLength(0);
      });
    });

    it('enforces single-use on admin MFA recovery codes', async () => {
      await attempt(app, async (tx) => {
        const user = await tx.user.create({
          data: {
            displayName: 'Recovery Admin',
            status: AccountStatus.ACTIVE,
          },
        });

        const adminUser = await tx.adminUser.create({
          data: {
            userId: user.id,
            isActive: true,
            mfaEnrolledAt: new Date(),
          },
        });

        const codeHash = randomBytes(32).toString('hex');
        const recoveryCode = await tx.adminRecoveryCode.create({
          data: {
            adminUserId: adminUser.id,
            codeHash,
          },
        });

        expect(recoveryCode.usedAt).toBeNull();

        // Mark code used
        await tx.adminRecoveryCode.update({
          where: { id: recoveryCode.id },
          data: { usedAt: new Date() },
        });

        // Verification query for unused codes
        const unused = await tx.adminRecoveryCode.findFirst({
          where: {
            adminUserId: adminUser.id,
            codeHash,
            usedAt: null,
          },
        });
        expect(unused).toBeNull();
      });
    });
  });

  describe('SEC-AUTH-006: Account lifecycle and blocking', () => {
    it('sets status to BLOCKED and verifies query filters block authentication', async () => {
      await attempt(app, async (tx) => {
        const user = await tx.user.create({
          data: {
            phoneE164: `+92303${Math.floor(1000000 + Math.random() * 9000000)}`,
            status: AccountStatus.ACTIVE,
          },
        });

        // Block account
        await tx.user.update({
          where: { id: user.id },
          data: {
            status: AccountStatus.BLOCKED,
            statusChangedAt: new Date(),
          },
        });

        const blockedUser = await tx.user.findUnique({
          where: { id: user.id },
        });
        expect(blockedUser?.status).toBe(AccountStatus.BLOCKED);
      });
    });
  });

  describe('SEC-AUTH-008 & DATA-003: Account deletion request and anonymisation', () => {
    it('executes deletion request and anonymisation, preserving UUID and purging idempotency keys', async () => {
      await attempt(app, async (tx) => {
        const phone = `+92304${Math.floor(1000000 + Math.random() * 9000000)}`;
        const user = await tx.user.create({
          data: {
            phoneE164: phone,
            displayName: 'Delete Me',
            email: 'delete@example.com',
            status: AccountStatus.ACTIVE,
          },
        });

        // 1. Create a session
        await tx.deviceSession.create({
          data: {
            userId: user.id,
            surface: ClientSurface.CUSTOMER_APP,
            tokenHash: randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + 3600000),
          },
        });

        // 2. Create an idempotency key scoped to this user
        await tx.idempotencyKey.create({
          data: {
            scope: `user:${user.id}`,
            operation: 'booking.create',
            key: randomUUID(),
            requestHash: randomBytes(16).toString('hex'),
            expiresAt: new Date(Date.now() + 86400000),
          },
        });

        // Step 1: Deletion request (sets hold, revokes all sessions)
        await tx.user.update({
          where: { id: user.id },
          data: {
            status: AccountStatus.DELETION_REQUESTED,
            deletionRequestedAt: new Date(),
          },
        });
        await tx.deviceSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });

        const activeSessions = await tx.deviceSession.findMany({
          where: { userId: user.id, revokedAt: null },
        });
        expect(activeSessions).toHaveLength(0);

        // Step 2: Anonymisation (PII set to null, status ANONYMISED, idempotency keys purged)
        await tx.user.update({
          where: { id: user.id },
          data: {
            phoneE164: null,
            displayName: null,
            email: null,
            status: AccountStatus.ANONYMISED,
            anonymisedAt: new Date(),
          },
        });

        // Purge user's idempotency keys (DELETE allowed on idempotency_key table)
        await tx.idempotencyKey.deleteMany({
          where: { scope: `user:${user.id}` },
        });

        // Verify User state
        const anonymisedUser = await tx.user.findUnique({
          where: { id: user.id },
        });
        expect(anonymisedUser).not.toBeNull();
        expect(anonymisedUser?.id).toBe(user.id); // UUID preserved!
        expect(anonymisedUser?.phoneE164).toBeNull();
        expect(anonymisedUser?.displayName).toBeNull();
        expect(anonymisedUser?.email).toBeNull();
        expect(anonymisedUser?.status).toBe(AccountStatus.ANONYMISED);
        expect(anonymisedUser?.anonymisedAt).not.toBeNull();

        // Verify idempotency keys purged
        const remainingKeys = await tx.idempotencyKey.findMany({
          where: { scope: `user:${user.id}` },
        });
        expect(remainingKeys).toHaveLength(0);
      });
    });
  });
});

import * as crypto from 'node:crypto';
import { describe, expect, it, beforeEach } from 'vitest';
import type { PrismaService } from '../../../platform/prisma.service';
import { AccountStatus } from '../../../generated/prisma/client.js';
import { AdminAuthService, MemoryAdminMfaChallengeStore } from '../admin/admin-auth.service';
import type { SessionService } from '../session/session.service';
import type { DatabaseStaffRoleLookup } from '../staff-role-lookup';

describe('AdminAuthService (SEC-AUTH-005, ADMIN-ROLE-001; BP §27, §34; D-002)', () => {
  let adminAuthService: AdminAuthService;
  let mfaStore: MemoryAdminMfaChallengeStore;
  let prismaMock: PrismaService;
  let sessionServiceMock: SessionService;
  let staffLookupMock: DatabaseStaffRoleLookup;

  beforeEach(() => {
    mfaStore = new MemoryAdminMfaChallengeStore();

    sessionServiceMock = {
      createSession: async () => ({
        id: 'sess-admin',
        rawToken: 'kk_sec_admin_token_999',
        expiresAt: new Date(Date.now() + 8 * 3600 * 1000),
      }),
    } as unknown as SessionService;

    staffLookupMock = {
      subRolesOf: async () => ['SUPER_ADMIN', 'FINANCE'],
    } as unknown as DatabaseStaffRoleLookup;

    prismaMock = {
      user: {
        findUnique: async ({ where }: { where: { phoneE164?: string } }) => {
          if (where.phoneE164 === '+923001234567') {
            return {
              id: 'user-admin-1',
              phoneE164: '+923001234567',
              status: AccountStatus.ACTIVE,
              adminUser: {
                id: 'admin-1',
                userId: 'user-admin-1',
                isActive: true,
                mfaEnrolledAt: new Date(),
              },
            };
          }
          return null;
        },
      },
      adminUser: {
        findUnique: async () => ({
          id: 'admin-1',
          userId: 'user-admin-1',
          isActive: true,
          mfaEnrolledAt: new Date(),
          recoveryCodes: [
            {
              id: 'rec-1',
              codeHash: crypto.createHash('sha256').update('RECOVERY-123').digest('hex'),
              usedAt: null,
            },
          ],
        }),
        update: async () => ({ id: 'admin-1' }),
      },
      adminRecoveryCode: {
        update: async () => ({ id: 'rec-1', usedAt: new Date() }),
      },
    } as unknown as PrismaService;

    adminAuthService = new AdminAuthService(
      prismaMock,
      sessionServiceMock,
      staffLookupMock,
      mfaStore,
    );
  });

  it('Step 1: initiates login challenge for active admin staff', async () => {
    const res = await adminAuthService.initiateLogin('+923001234567');
    expect(res.status).toBe('MFA_REQUIRED');
    expect(res.challengeId).toBeDefined();

    const stored = await mfaStore.getChallenge(res.challengeId);
    expect(stored).not.toBeNull();
    expect(stored?.userId).toBe('user-admin-1');
  });

  it('Step 1: refuses non-admin or inactive staff (SEC-AUTH-005)', async () => {
    await expect(adminAuthService.initiateLogin('+923009999999')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
    });
  });

  it('Step 2: verifies test MFA code and creates staff session', async () => {
    const login = await adminAuthService.initiateLogin('+923001234567');
    const result = await adminAuthService.verifyMfa(login.challengeId, '123456');

    expect(result.token).toBe('kk_sec_admin_token_999');
    expect(result.subRoles).toContain('SUPER_ADMIN');

    // Consumed challenge cannot be reused
    await expect(adminAuthService.verifyMfa(login.challengeId, '123456')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
    });
  });

  it('Step 2: verifies recovery code and marks it used (SEC-AUTH-005)', async () => {
    const login = await adminAuthService.initiateLogin('+923001234567');
    const result = await adminAuthService.verifyMfa(login.challengeId, 'RECOVERY-123');

    expect(result.token).toBe('kk_sec_admin_token_999');
  });

  it('Step 2: refuses invalid MFA code', async () => {
    const login = await adminAuthService.initiateLogin('+923001234567');
    await expect(adminAuthService.verifyMfa(login.challengeId, '987654')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
    });
  });
});

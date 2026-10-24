import { describe, expect, it, beforeEach } from 'vitest';
import type { PrismaService } from '../../../platform/prisma.service';
import { AccountStatus } from '../../../generated/prisma/client.js';
import type { ConfigService } from '@kaamkaro/platform';
import { AnonymizerService } from '../anonymizer/anonymizer.service';
import type { SessionService } from '../session/session.service';

interface MockUser {
  id: string;
  phoneE164?: string | null;
  displayName?: string | null;
  email?: string | null;
  status: AccountStatus;
  deletionRequestedAt?: Date | null;
  anonymisedAt?: Date | null;
}

describe('AnonymizerService (SEC-AUTH-008; DATA-003; RQ-013 item 1)', () => {
  let anonymizerService: AnonymizerService;
  let prismaMock: PrismaService;
  let sessionServiceMock: SessionService;
  let configMock: ConfigService;
  let usersTable: Map<string, MockUser>;
  let deletedIdempotencyScopes: string[];

  beforeEach(() => {
    usersTable = new Map();
    deletedIdempotencyScopes = [];

    usersTable.set('user-1', {
      id: 'user-1',
      phoneE164: '+923001234567',
      displayName: 'Ali Khan',
      email: 'ali@example.com',
      status: AccountStatus.ACTIVE,
      deletionRequestedAt: null,
      anonymisedAt: null,
    });

    configMock = {
      inspect: async (k: string) => {
        if (k === 'account.deletion_hold_days') {
          return { status: 'configured', value: 30 };
        }
        return { status: 'not_configured' };
      },
    } as unknown as ConfigService;

    sessionServiceMock = {
      revokeAllSessions: async () => 2,
    } as unknown as SessionService;

    prismaMock = {
      user: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          usersTable.get(where.id) ?? null,
        update: async ({ where, data }: { where: { id: string }; data: Partial<MockUser> }) => {
          const user = usersTable.get(where.id);
          const updated = { ...user, ...data } as MockUser;
          usersTable.set(where.id, updated);
          return updated;
        },
      },
      $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
        const tx = {
          user: {
            update: async ({ where, data }: { where: { id: string }; data: Partial<MockUser> }) => {
              const user = usersTable.get(where.id);
              const updated = { ...user, ...data } as MockUser;
              usersTable.set(where.id, updated);
              return updated;
            },
          },
          deviceSession: {
            deleteMany: async () => ({ count: 2 }),
          },
          idempotencyKey: {
            deleteMany: async ({ where }: { where: { scope: string } }) => {
              deletedIdempotencyScopes.push(where.scope);
              return { count: 5 };
            },
          },
        };
        return fn(tx);
      },
    } as unknown as PrismaService;

    anonymizerService = new AnonymizerService(prismaMock, sessionServiceMock, configMock);
  });

  it('Step 1: requestDeletion starts hold period and revokes all sessions (SEC-AUTH-008)', async () => {
    const res = await anonymizerService.requestDeletion('user-1');
    expect(res.status).toBe('DELETION_REQUESTED');
    expect(res.holdDays).toBe(30);

    const user = usersTable.get('user-1');
    expect(user?.status).toBe(AccountStatus.DELETION_REQUESTED);
    expect(user?.deletionRequestedAt).toBeDefined();
  });

  it('Step 1: blocked user cannot request deletion (SEC-AUTH-008)', async () => {
    usersTable.set('user-1', {
      id: 'user-1',
      status: AccountStatus.BLOCKED,
    });

    await expect(anonymizerService.requestDeletion('user-1')).rejects.toMatchObject({
      code: 'ACCOUNT_BLOCKED',
      status: 403,
    });
  });

  it('Step 3: anonymizeUser clears PII and deletes user idempotency_key records (SEC-AUTH-008, RQ-013)', async () => {
    await anonymizerService.anonymizeUser('user-1');

    const user = usersTable.get('user-1');
    expect(user?.status).toBe(AccountStatus.ANONYMISED);
    expect(user?.phoneE164).toBeNull();
    expect(user?.displayName).toBeNull();
    expect(user?.email).toBeNull();
    expect(user?.anonymisedAt).toBeDefined();

    // RQ-013 item 1 check: idempotency keys with scope user:<id> are deleted
    expect(deletedIdempotencyScopes).toContain('user:user-1');
  });
});

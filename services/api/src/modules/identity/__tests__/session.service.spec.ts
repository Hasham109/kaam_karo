import * as crypto from 'node:crypto';
import { describe, expect, it, beforeEach } from 'vitest';
import type { PrismaService } from '../../../platform/prisma.service';
import { AccountStatus } from '../../../generated/prisma/client.js';
import type { ConfigService } from '@kaamkaro/platform';
import { SessionService } from '../session/session.service';

interface MockSession {
  id: string;
  userId: string;
  surface: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

describe('SessionService (SEC-AUTH-002, SEC-BASE-002; BP §25, §27)', () => {
  let sessionService: SessionService;
  let prismaMock: PrismaService;
  let configMock: ConfigService;
  let sessionsTable: Map<string, MockSession>;

  beforeEach(() => {
    sessionsTable = new Map();

    configMock = {
      inspect: async (key: string) => {
        if (key === 'auth.session_ttl') {
          return { status: 'configured', value: 86400 }; // 1 day
        }
        if (key === 'auth.admin_idle_timeout') {
          return { status: 'configured', value: 3600 }; // 1 hour
        }
        return { status: 'not_configured' };
      },
    } as unknown as ConfigService;

    prismaMock = {
      deviceSession: {
        create: async ({
          data,
        }: {
          data: Omit<MockSession, 'id' | 'revokedAt' | 'createdAt' | 'updatedAt'>;
        }) => {
          const row: MockSession = {
            id: `sess-${Date.now()}-${Math.random()}`,
            ...data,
            revokedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          sessionsTable.set(row.tokenHash, row);
          return row;
        },
        findUnique: async ({ where }: { where: { tokenHash?: string; id?: string } }) => {
          if (where.tokenHash) {
            const row = sessionsTable.get(where.tokenHash);
            if (!row) return null;
            return {
              ...row,
              user: {
                id: row.userId,
                status: AccountStatus.ACTIVE,
                roles: [{ role: 'CUSTOMER' }],
                adminUser: null,
              },
            };
          }
          if (where.id) {
            for (const s of sessionsTable.values()) {
              if (s.id === where.id) return s;
            }
            return null;
          }
          return null;
        },
        update: async ({ where, data }: { where: { id: string }; data: Partial<MockSession> }) => {
          for (const [hash, s] of sessionsTable.entries()) {
            if (s.id === where.id) {
              const updated = { ...s, ...data };
              sessionsTable.set(hash, updated);
              return updated;
            }
          }
          return null;
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: { userId?: string; id?: { not?: string }; revokedAt?: null };
          data: Partial<MockSession>;
        }) => {
          let count = 0;
          for (const [hash, s] of sessionsTable.entries()) {
            if (where.userId && s.userId !== where.userId) continue;
            if (where.id?.not) {
              if (s.id === where.id.not) continue;
            }
            if (s.revokedAt === null) {
              sessionsTable.set(hash, { ...s, ...data });
              count += 1;
            }
          }
          return { count };
        },
      },
    } as unknown as PrismaService;

    sessionService = new SessionService(prismaMock, configMock);
  });

  it('creates session with raw token and stores SHA-256 tokenHash (SEC-BASE-002)', async () => {
    const session = await sessionService.createSession('user-1', 'CUSTOMER_APP');
    expect(session.rawToken).toMatch(/^kk_sec_/);

    const expectedHash = crypto.createHash('sha256').update(session.rawToken).digest('hex');
    expect(sessionsTable.has(expectedHash)).toBe(true);

    const stored = sessionsTable.get(expectedHash);
    expect(stored?.userId).toBe('user-1');
    expect(stored?.surface).toBe('CUSTOMER_APP');
  });

  it('authenticates valid session token', async () => {
    const created = await sessionService.createSession('user-1', 'CUSTOMER_APP');
    const authContext = await sessionService.authenticateToken(created.rawToken);

    expect(authContext).not.toBeNull();
    expect(authContext?.userId).toBe('user-1');
    expect(authContext?.surface).toBe('CUSTOMER_APP');
    expect(authContext?.roles).toContain('CUSTOMER');
  });

  it('refuses revoked session with null (SEC-AUTH-002)', async () => {
    const created = await sessionService.createSession('user-1', 'CUSTOMER_APP');
    await sessionService.revokeSession(created.id);

    const authContext = await sessionService.authenticateToken(created.rawToken);
    expect(authContext).toBeNull();
  });

  it('refuses expired session with null (SEC-AUTH-002)', async () => {
    const created = await sessionService.createSession('user-1', 'CUSTOMER_APP');
    // Fast-forward expiry
    const hash = crypto.createHash('sha256').update(created.rawToken).digest('hex');
    const stored = sessionsTable.get(hash);
    if (stored) {
      stored.expiresAt = new Date(Date.now() - 1000); // 1s ago
    }

    const authContext = await sessionService.authenticateToken(created.rawToken);
    expect(authContext).toBeNull();
  });

  it('signs out all other devices for a user (C27/P21; SEC-AUTH-002)', async () => {
    const s1 = await sessionService.createSession('user-1', 'CUSTOMER_APP');
    const s2 = await sessionService.createSession('user-1', 'CUSTOMER_APP');
    const s3 = await sessionService.createSession('user-1', 'CUSTOMER_APP');

    // Revoke all except s3
    const count = await sessionService.revokeAllSessions('user-1', s3.id);
    expect(count).toBe(2);

    expect(await sessionService.authenticateToken(s1.rawToken)).toBeNull();
    expect(await sessionService.authenticateToken(s2.rawToken)).toBeNull();
    expect(await sessionService.authenticateToken(s3.rawToken)).not.toBeNull();
  });
});

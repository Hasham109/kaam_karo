import { describe, expect, it, beforeEach } from 'vitest';
import type { PrismaService } from '../../../platform/prisma.service';
import { CustomerProfileService } from '../customer-profile.service';

interface MockCustomerProfile {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MockUser {
  id: string;
  phoneE164: string;
  displayName: string | null;
  email: string | null;
  preferredLanguage: string | null;
}

describe('CustomerProfileService (ROLE-001; BP §25)', () => {
  let customerProfileService: CustomerProfileService;
  let prismaMock: PrismaService;
  let profiles: Map<string, MockCustomerProfile>;
  let users: Map<string, MockUser>;

  beforeEach(() => {
    profiles = new Map();
    users = new Map();

    users.set('user-cust-1', {
      id: 'user-cust-1',
      phoneE164: '+923001234567',
      displayName: 'Zainab Bibi',
      email: 'zainab@example.com',
      preferredLanguage: 'UR',
    });

    prismaMock = {
      customerProfile: {
        findUnique: async ({ where }: { where: { userId?: string } }) => {
          if (where.userId) return profiles.get(where.userId) ?? null;
          return null;
        },
        create: async ({ data }: { data: { userId: string } }) => {
          const profile: MockCustomerProfile = {
            id: 'cp-1',
            userId: data.userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          profiles.set(data.userId, profile);
          return profile;
        },
        findUniqueOrThrow: async ({ where }: { where: { userId: string } }) => {
          const p = profiles.get(where.userId);
          if (!p) throw new Error('Not found');
          return p;
        },
      },
      user: {
        findUnique: async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null,
        update: async ({ where, data }: { where: { id: string }; data: Partial<MockUser> }) => {
          const user = users.get(where.id);
          if (!user) throw new Error('User not found');
          const updated = { ...user, ...data };
          users.set(where.id, updated);
          return updated;
        },
      },
    } as unknown as PrismaService;

    customerProfileService = new CustomerProfileService(prismaMock);
  });

  it('creates profile if not exists on getProfile (ROLE-001)', async () => {
    const profile = await customerProfileService.getProfile('user-cust-1');

    expect(profile.id).toBe('cp-1');
    expect(profile.userId).toBe('user-cust-1');
    expect(profile.displayName).toBe('Zainab Bibi');
    expect(profile.preferredLanguage).toBe('UR');
  });

  it('updates profile display name and language (ROLE-001)', async () => {
    const updated = await customerProfileService.updateProfile('user-cust-1', {
      displayName: 'Zainab Ahmed',
      email: 'newemail@example.com',
    });

    expect(updated.displayName).toBe('Zainab Ahmed');
    expect(updated.email).toBe('newemail@example.com');
  });
});

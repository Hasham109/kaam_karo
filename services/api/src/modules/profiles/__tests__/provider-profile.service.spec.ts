import { describe, expect, it, beforeEach } from 'vitest';
import { AppError } from '@kaamkaro/platform';
import type { PrismaService } from '../../../platform/prisma.service';
import { ProviderProfileService } from '../provider-profile.service';

describe('ProviderProfileService (ROLE-002, D-004, D-018)', () => {
  let providerProfileService: ProviderProfileService;
  let prismaMock: PrismaService;

  const mockUser = {
    id: 'user-prov-1',
    phoneE164: '+923009876543',
    displayName: 'Ustad Tariq',
    email: 'tariq@example.com',
  };

  interface MockProviderProfile {
    id: string;
    userId: string;
    businessName: string | null;
    photoMediaId: string | null;
    usualTeamSize: number | null;
    createdAt: Date;
    updatedAt: Date;
  }

  let profileStore: MockProviderProfile[];

  beforeEach(() => {
    profileStore = [];

    prismaMock = {
      providerProfile: {
        findUnique: async ({ where }: { where: { userId?: string; id?: string } }) => {
          if (where.userId) {
            return profileStore.find((p) => p.userId === where.userId) ?? null;
          }
          if (where.id) {
            return profileStore.find((p) => p.id === where.id) ?? null;
          }
          return null;
        },
        create: async ({ data }: { data: { userId: string } }) => {
          const profile: MockProviderProfile = {
            id: 'prov-prof-1',
            userId: data.userId,
            businessName: null,
            photoMediaId: null,
            usualTeamSize: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          profileStore.push(profile);
          return profile;
        },
        update: async ({
          where,
          data,
        }: {
          where: { userId: string };
          data: Partial<MockProviderProfile>;
        }) => {
          const profile = profileStore.find((p) => p.userId === where.userId);
          if (!profile) throw new Error('Not found');
          Object.assign(profile, data, { updatedAt: new Date() });
          return profile;
        },
      },
      user: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          if (where.id === mockUser.id) return mockUser;
          return null;
        },
      },
    } as unknown as PrismaService;

    providerProfileService = new ProviderProfileService(prismaMock);
  });

  it('creates profile if not exists on getProfile (ROLE-002)', async () => {
    const profile = await providerProfileService.getProfile('user-prov-1');

    expect(profile.id).toBe('prov-prof-1');
    expect(profile.userId).toBe('user-prov-1');
    expect(profile.phoneE164).toBe('+923009876543');
    expect(profile.displayName).toBe('Ustad Tariq');
  });

  it('updates provider profile business name and usual team size (D-004, D-018, ROLE-002)', async () => {
    await providerProfileService.getProfile('user-prov-1');

    const updated = await providerProfileService.updateProfile('user-prov-1', {
      businessName: 'Tariq Plumbing & Sanitary Works',
      usualTeamSize: 3,
    });

    expect(updated.businessName).toBe('Tariq Plumbing & Sanitary Works');
    expect(updated.usualTeamSize).toBe(3);
  });

  it('returns public view for provider profile (ROLE-002)', async () => {
    await providerProfileService.getProfile('user-prov-1');
    await providerProfileService.updateProfile('user-prov-1', {
      businessName: 'Tariq Plumbing & Sanitary Works',
      usualTeamSize: 3,
    });

    const publicView = await providerProfileService.getPublicProfile('prov-prof-1');
    expect(publicView.id).toBe('prov-prof-1');
    expect(publicView.businessName).toBe('Tariq Plumbing & Sanitary Works');
    expect(publicView.usualTeamSize).toBe(3);
  });

  it('rejects public view for non-existent provider', async () => {
    await expect(providerProfileService.getPublicProfile('non-existent-prov')).rejects.toThrow(
      AppError,
    );
  });
});

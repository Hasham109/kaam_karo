import { describe, expect, it, beforeEach } from 'vitest';
import { AppError } from '@kaamkaro/platform';
import type { PrismaService } from '../../../platform/prisma.service';
import type { CustomerProfileService } from '../customer-profile.service';
import { FavoriteService } from '../favorite.service';

describe('FavoriteService (PROF-FAV-001; BP §25)', () => {
  let favoriteService: FavoriteService;
  let prismaMock: PrismaService;
  let customerProfileServiceMock: CustomerProfileService;

  const mockCustomerProfile = {
    id: 'cust-prof-1',
    userId: 'user-cust-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProviderProfile = {
    id: 'prov-prof-1',
    userId: 'user-prov-1',
    businessName: 'Rashid Electric Works',
    photoMediaId: null,
    usualTeamSize: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  interface MockFavorite {
    id: string;
    customerProfileId: string;
    providerProfileId: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  let favoritesStore: MockFavorite[];

  beforeEach(() => {
    favoritesStore = [];

    customerProfileServiceMock = {
      ensureCustomerProfile: async (userId: string) => {
        if (userId === 'user-cust-1') return mockCustomerProfile;
        throw new Error('Customer profile not found');
      },
    } as unknown as CustomerProfileService;

    prismaMock = {
      providerProfile: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          if (where.id === mockProviderProfile.id) return mockProviderProfile;
          return null;
        },
      },
      favorite: {
        findMany: async ({ where }: { where: { customerProfileId: string } }) => {
          return favoritesStore
            .filter((f) => f.customerProfileId === where.customerProfileId)
            .map((f) => ({
              ...f,
              providerProfile: mockProviderProfile,
            }));
        },
        findUnique: async ({
          where,
        }: {
          where: {
            customerProfileId_providerProfileId: {
              customerProfileId: string;
              providerProfileId: string;
            };
          };
        }) => {
          const match = favoritesStore.find(
            (f) =>
              f.customerProfileId === where.customerProfileId_providerProfileId.customerProfileId &&
              f.providerProfileId === where.customerProfileId_providerProfileId.providerProfileId,
          );
          return match ?? null;
        },
        upsert: async ({
          create,
          update,
          where,
        }: {
          create: { customerProfileId: string; providerProfileId: string; notes?: string | null };
          update: { notes?: string | null };
          where: {
            customerProfileId_providerProfileId: {
              customerProfileId: string;
              providerProfileId: string;
            };
          };
        }) => {
          const existing = favoritesStore.find(
            (f) =>
              f.customerProfileId === where.customerProfileId_providerProfileId.customerProfileId &&
              f.providerProfileId === where.customerProfileId_providerProfileId.providerProfileId,
          );
          if (existing) {
            existing.notes = update.notes ?? null;
            return { ...existing, providerProfile: mockProviderProfile };
          }
          const created: MockFavorite = {
            id: 'fav-1',
            customerProfileId: create.customerProfileId,
            providerProfileId: create.providerProfileId,
            notes: create.notes ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          favoritesStore.push(created);
          return { ...created, providerProfile: mockProviderProfile };
        },
        delete: async ({ where }: { where: { id: string } }) => {
          const index = favoritesStore.findIndex((f) => f.id === where.id);
          if (index >= 0) favoritesStore.splice(index, 1);
          return {};
        },
      },
    } as unknown as PrismaService;

    favoriteService = new FavoriteService(prismaMock, customerProfileServiceMock);
  });

  it('rejects adding favorite for non-existent provider', async () => {
    await expect(
      favoriteService.addFavorite('user-cust-1', {
        providerProfileId: 'non-existent-prov',
      }),
    ).rejects.toThrow(AppError);
  });

  it('adds provider to customer favorites with optional note (PROF-FAV-001)', async () => {
    const fav = await favoriteService.addFavorite('user-cust-1', {
      providerProfileId: mockProviderProfile.id,
      notes: 'Very punctual electrician, fixed breaker box well',
    });

    expect(fav.id).toBeDefined();
    expect(fav.providerProfileId).toBe(mockProviderProfile.id);
    expect(fav.businessName).toBe('Rashid Electric Works');
    expect(fav.notes).toBe('Very punctual electrician, fixed breaker box well');
  });

  it('lists saved favorites for customer (PROF-FAV-001)', async () => {
    await favoriteService.addFavorite('user-cust-1', {
      providerProfileId: mockProviderProfile.id,
      notes: 'Favorite AC guy',
    });

    const list = await favoriteService.listFavorites('user-cust-1');
    expect(list).toHaveLength(1);
    expect(list[0]?.businessName).toBe('Rashid Electric Works');
    expect(list[0]?.notes).toBe('Favorite AC guy');
  });

  it('removes provider from customer favorites (PROF-FAV-001)', async () => {
    await favoriteService.addFavorite('user-cust-1', {
      providerProfileId: mockProviderProfile.id,
    });

    await favoriteService.removeFavorite('user-cust-1', mockProviderProfile.id);

    const list = await favoriteService.listFavorites('user-cust-1');
    expect(list).toHaveLength(0);
  });
});

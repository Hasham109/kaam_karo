import { describe, expect, it, beforeEach } from 'vitest';
import { AppError } from '@kaamkaro/platform';
import type { PrismaService } from '../../../platform/prisma.service';
import { AddressService } from '../address.service';
import type { CustomerProfileService } from '../customer-profile.service';

describe('AddressService (PROF-ADDR-001, PROF-ADDR-002, PROF-ADDR-003)', () => {
  let addressService: AddressService;
  let prismaMock: PrismaService;
  let customerProfileServiceMock: CustomerProfileService;

  const mockCustomerProfile = {
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'user-cust-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCity = {
    id: '22222222-2222-2222-2222-222222222222',
    nameEn: 'Lahore',
    nameUr: 'لاہور',
    slug: 'lahore',
    isActive: true,
  };

  interface MockAddressRecord {
    id: string;
    customerProfileId: string;
    labelKind: string;
    customLabel: string | null;
    cityId: string;
    areaName: string | null;
    addressText: string;
    placeRef: string | null;
    latitude: number | null;
    longitude: number | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    version: number;
  }

  let addressStore: MockAddressRecord[];

  beforeEach(() => {
    addressStore = [];

    customerProfileServiceMock = {
      ensureCustomerProfile: async (userId: string) => {
        if (userId === 'user-cust-1') return mockCustomerProfile;
        throw new Error('Customer profile not found');
      },
    } as unknown as CustomerProfileService;

    prismaMock = {
      city: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          if (where.id === mockCity.id) return mockCity;
          return null;
        },
      },
      address: {
        create: async ({
          data,
        }: {
          data: Omit<
            MockAddressRecord,
            'createdAt' | 'updatedAt' | 'deletedAt' | 'version' | 'latitude' | 'longitude'
          >;
        }) => {
          const created: MockAddressRecord = {
            id: data.id,
            customerProfileId: data.customerProfileId,
            labelKind: data.labelKind,
            customLabel: data.customLabel ?? null,
            cityId: data.cityId,
            areaName: data.areaName ?? null,
            addressText: data.addressText,
            placeRef: data.placeRef ?? null,
            latitude: null,
            longitude: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            version: 1,
          };
          addressStore.push(created);
          return created;
        },
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<MockAddressRecord>;
        }) => {
          const item = addressStore.find((a) => a.id === where.id);
          if (!item) throw new Error('Not found');
          Object.assign(item, data);
          return item;
        },
      },
      $queryRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
        // Values passed in template tag
        // If query filters by id (getAddress) or customerProfileId (listAddresses)
        const idFilter = values.find(
          (v) => typeof v === 'string' && addressStore.some((a) => a.id === v),
        );
        if (idFilter) {
          const item = addressStore.find((a) => a.id === idFilter && a.deletedAt === null);
          return item ? [item] : [];
        }
        return addressStore.filter(
          (a) => a.customerProfileId === mockCustomerProfile.id && a.deletedAt === null,
        );
      },
      $executeRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
        // Mock execute raw for PostGIS INSERT / UPDATE
        const [
          id,
          profileId,
          labelKind,
          customLabel,
          cityId,
          areaName,
          addressText,
          placeRef,
          lon,
          lat,
        ] = values as [
          string,
          string,
          string,
          string | null,
          string,
          string | null,
          string,
          string | null,
          number | undefined,
          number | undefined,
        ];
        const existingIndex = addressStore.findIndex((a) => a.id === id);
        if (existingIndex >= 0) {
          const item = addressStore[existingIndex]!;
          if (labelKind !== null && labelKind !== undefined) item.labelKind = labelKind;
          if (customLabel !== null && customLabel !== undefined) item.customLabel = customLabel;
          if (areaName !== null && areaName !== undefined) item.areaName = areaName;
          if (addressText !== null && addressText !== undefined) item.addressText = addressText;
          if (placeRef !== null && placeRef !== undefined) item.placeRef = placeRef;
          if (lat !== undefined && lon !== undefined) {
            item.latitude = lat;
            item.longitude = lon;
          }
          item.version += 1;
        } else {
          addressStore.push({
            id,
            customerProfileId: profileId,
            labelKind,
            customLabel: customLabel ?? null,
            cityId,
            areaName: areaName ?? null,
            addressText,
            placeRef: placeRef ?? null,
            latitude: lat ?? null,
            longitude: lon ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            version: 1,
          });
        }
        return 1;
      },
    } as unknown as PrismaService;

    addressService = new AddressService(prismaMock, customerProfileServiceMock);
  });

  it('rejects address creation when city does not exist', async () => {
    await expect(
      addressService.createAddress('user-cust-1', {
        labelKind: 'HOME',
        cityId: '00000000-0000-0000-0000-000000000000',
        addressText: 'Street 1, Lahore',
      }),
    ).rejects.toThrow(AppError);
  });

  it('rejects CUSTOM label kind when customLabel is missing or blank (PROF-ADDR-001)', async () => {
    await expect(
      addressService.createAddress('user-cust-1', {
        labelKind: 'CUSTOM',
        customLabel: '   ',
        cityId: mockCity.id,
        addressText: 'Nani ka ghar, Lahore',
      }),
    ).rejects.toThrow('Custom label text is required');
  });

  it('creates address with manual entry without coordinates (PROF-ADDR-003)', async () => {
    const address = await addressService.createAddress('user-cust-1', {
      labelKind: 'HOME',
      cityId: mockCity.id,
      areaName: 'Gulberg III',
      addressText: 'House 12, Street 4, Gulberg III',
    });

    expect(address.id).toBeDefined();
    expect(address.labelKind).toBe('HOME');
    expect(address.areaName).toBe('Gulberg III');
    expect(address.addressText).toBe('House 12, Street 4, Gulberg III');
    expect(address.latitude).toBeNull();
    expect(address.longitude).toBeNull();
  });

  it('creates address with coordinates via PostGIS (PROF-ADDR-001)', async () => {
    const address = await addressService.createAddress('user-cust-1', {
      labelKind: 'WORK',
      cityId: mockCity.id,
      areaName: 'DHA Phase 5',
      addressText: 'Office 402, Plaza 10',
      latitude: 31.4697,
      longitude: 74.4128,
    });

    expect(address.id).toBeDefined();
    expect(address.labelKind).toBe('WORK');
    expect(address.latitude).toBe(31.4697);
    expect(address.longitude).toBe(74.4128);
  });

  it('soft-deletes saved address without hard deleting row (PROF-ADDR-002)', async () => {
    const address = await addressService.createAddress('user-cust-1', {
      labelKind: 'HOME',
      cityId: mockCity.id,
      addressText: 'Model Town Block C',
    });

    await addressService.deleteAddress('user-cust-1', address.id);

    // After soft-delete, getAddress should throw not found
    await expect(addressService.getAddress('user-cust-1', address.id)).rejects.toThrow(
      'Saved address not found',
    );

    // But record still exists in physical store with deletedAt populated
    const physical = addressStore.find((a) => a.id === address.id);
    expect(physical).toBeDefined();
    expect(physical?.deletedAt).toBeInstanceOf(Date);
  });
});

import { describe, expect, it, beforeEach } from 'vitest';
import { AppError } from '@kaamkaro/platform';
import { LocationConfirmation, LocationSource } from '../../../generated/prisma/client.js';
import type { PrismaService } from '../../../platform/prisma.service';
import type { AddressService } from '../address.service';
import { LocationSnapshotService } from '../location-snapshot.service';

describe('LocationSnapshotService (PROF-ADDR-002, PROF-ADDR-004, LOC-GEO-003)', () => {
  let snapshotService: LocationSnapshotService;
  let prismaMock: PrismaService;
  let addressServiceMock: AddressService;

  const mockCity = {
    id: '33333333-3333-3333-3333-333333333333',
    nameEn: 'Lahore',
    nameUr: 'لاہور',
    slug: 'lahore',
    isActive: true,
  };

  const mockSavedAddress = {
    id: '44444444-4444-4444-4444-444444444444',
    customerProfileId: 'cp-1',
    labelKind: 'HOME' as const,
    customLabel: null,
    cityId: mockCity.id,
    areaName: 'Johar Town Phase 2',
    addressText: 'House 55, Block G3, Johar Town',
    placeRef: 'landmark-ref-123',
    latitude: 31.4697,
    longitude: 74.2728,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,
  };

  interface MockSnapshotRecord {
    id: string;
    addressLabel: string | null;
    addressText: string | null;
    cityId: string;
    areaName: string | null;
    placeRef: string | null;
    accuracyMeters: number | null;
    source: LocationSource;
    confirmationStatus: LocationConfirmation;
    sourceAddressId: string | null;
    createdBy: string | null;
    latitude: number | null;
    longitude: number | null;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  }

  let snapshotStore: MockSnapshotRecord[];

  beforeEach(() => {
    snapshotStore = [];

    addressServiceMock = {
      getAddress: async (userId: string, addressId: string) => {
        if (userId === 'user-cust-1' && addressId === mockSavedAddress.id) {
          return mockSavedAddress;
        }
        throw new AppError('ADDRESS_NOT_FOUND', 404, 'Saved address not found');
      },
    } as unknown as AddressService;

    prismaMock = {
      city: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          if (where.id === mockCity.id) return mockCity;
          return null;
        },
      },
      locationSnapshot: {
        create: async ({
          data,
        }: {
          data: {
            id: string;
            addressLabel?: string | null;
            addressText: string;
            cityId: string;
            areaName?: string | null;
            placeRef?: string | null;
            accuracyMeters?: number | null;
            source: LocationSource;
            confirmationStatus: LocationConfirmation;
            sourceAddressId?: string | null;
            createdBy?: string | null;
          };
        }) => {
          const snapshot: MockSnapshotRecord = {
            id: data.id,
            addressLabel: data.addressLabel ?? null,
            addressText: data.addressText,
            cityId: data.cityId,
            areaName: data.areaName ?? null,
            placeRef: data.placeRef ?? null,
            accuracyMeters: data.accuracyMeters ?? null,
            source: data.source,
            confirmationStatus: data.confirmationStatus,
            sourceAddressId: data.sourceAddressId ?? null,
            createdBy: data.createdBy ?? null,
            latitude: null,
            longitude: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          };
          snapshotStore.push(snapshot);
          return snapshot;
        },
      },
      $queryRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
        const id = values[0];
        const match = snapshotStore.find((s) => s.id === id);
        return match ? [match] : [];
      },
      $executeRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
        // Mock execute raw for PostGIS location snapshot insert
        const id = values[0] as string;
        if (values.length >= 10 && values[6] === LocationSource.SAVED_ADDRESS) {
          // values: id, label, addressText, cityId, areaName, placeRef, source, confirmation, sourceAddressId, createdBy, lon, lat
          const [
            ,
            label,
            addressText,
            cityId,
            areaName,
            placeRef,
            source,
            confirmation,
            sourceAddressId,
            createdBy,
            lon,
            lat,
          ] = values as [
            string,
            string | null,
            string,
            string,
            string | null,
            string | null,
            LocationSource,
            LocationConfirmation,
            string | null,
            string | null,
            number | null,
            number | null,
          ];
          snapshotStore.push({
            id,
            addressLabel: label,
            addressText,
            cityId,
            areaName,
            placeRef,
            accuracyMeters: null,
            source,
            confirmationStatus: confirmation,
            sourceAddressId,
            createdBy,
            latitude: lat,
            longitude: lon,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          });
        } else {
          // values: id, addressLabel, addressText, cityId, areaName, placeRef, accuracyMeters, source, confirmationStatus, createdBy, lon, lat
          const [
            ,
            label,
            addressText,
            cityId,
            areaName,
            placeRef,
            accuracyMeters,
            source,
            confirmation,
            createdBy,
            lon,
            lat,
          ] = values as [
            string,
            string | null,
            string,
            string,
            string | null,
            string | null,
            number | null,
            LocationSource,
            LocationConfirmation,
            string | null,
            number | null,
            number | null,
          ];
          snapshotStore.push({
            id,
            addressLabel: label,
            addressText,
            cityId,
            areaName,
            placeRef,
            accuracyMeters,
            source,
            confirmationStatus: confirmation,
            sourceAddressId: null,
            createdBy,
            latitude: lat,
            longitude: lon,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          });
        }
        return 1;
      },
    } as unknown as PrismaService;

    snapshotService = new LocationSnapshotService(prismaMock, addressServiceMock);
  });

  it('creates immutable snapshot from saved address (PROF-ADDR-002, LOC-GEO-003)', async () => {
    const snapshot = await snapshotService.createSnapshot('user-cust-1', {
      sourceAddressId: mockSavedAddress.id,
    });

    expect(snapshot.id).toBeDefined();
    expect(snapshot.sourceAddressId).toBe(mockSavedAddress.id);
    expect(snapshot.addressLabel).toBe('HOME');
    expect(snapshot.addressText).toBe('House 55, Block G3, Johar Town');
    expect(snapshot.areaName).toBe('Johar Town Phase 2');
    expect(snapshot.source).toBe(LocationSource.SAVED_ADDRESS);
    expect(snapshot.confirmationStatus).toBe(LocationConfirmation.CONFIRMED);
    expect(snapshot.latitude).toBe(31.4697);
    expect(snapshot.longitude).toBe(74.2728);
  });

  it('creates snapshot via manual entry without coordinates (PROF-ADDR-003)', async () => {
    const snapshot = await snapshotService.createSnapshot('user-cust-1', {
      cityId: mockCity.id,
      areaName: 'Faisal Town',
      addressText: 'Street 9, House 12',
      source: LocationSource.MANUAL_ENTRY,
    });

    expect(snapshot.id).toBeDefined();
    expect(snapshot.cityId).toBe(mockCity.id);
    expect(snapshot.areaName).toBe('Faisal Town');
    expect(snapshot.addressText).toBe('Street 9, House 12');
    expect(snapshot.latitude).toBeNull();
    expect(snapshot.longitude).toBeNull();
  });

  it('masks exact address and coordinates for unaccepted provider (PROF-ADDR-004)', async () => {
    const snapshot = await snapshotService.createSnapshot('user-cust-1', {
      sourceAddressId: mockSavedAddress.id,
    });

    // 1. Unaccepted provider caller
    const providerView = await snapshotService.getSnapshotForCaller(
      snapshot.id,
      'PROVIDER',
      false, // isAcceptedProviderOnJob = false
    );

    expect(providerView.cityId).toBe(mockCity.id);
    expect(providerView.areaName).toBe('Johar Town Phase 2');
    // Masked fields
    expect(providerView.addressText).toBeNull();
    expect(providerView.addressLabel).toBeNull();
    expect(providerView.latitude).toBeNull();
    expect(providerView.longitude).toBeNull();
    expect(providerView.placeRef).toBeNull();

    // 2. Accepted provider caller
    const acceptedProviderView = await snapshotService.getSnapshotForCaller(
      snapshot.id,
      'PROVIDER',
      true, // isAcceptedProviderOnJob = true
    );

    expect(acceptedProviderView.addressText).toBe('House 55, Block G3, Johar Town');
    expect(acceptedProviderView.latitude).toBe(31.4697);
    expect(acceptedProviderView.longitude).toBe(74.2728);

    // 3. Customer caller sees full details
    const customerView = await snapshotService.getSnapshotForCaller(snapshot.id, 'CUSTOMER', false);
    expect(customerView.addressText).toBe('House 55, Block G3, Johar Town');
  });
});

import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppError } from '@kaamkaro/platform';
import { LocationConfirmation, LocationSource } from '../../generated/prisma/client.js';
import { PrismaService } from '../../platform/prisma.service';
import { AddressService } from './address.service';
import type { CreateLocationSnapshotDto } from './dto/profile.dto';

export interface LocationSnapshotRecord {
  id: string;
  addressLabel: string | null;
  addressText: string | null;
  cityId: string;
  areaName: string | null;
  placeRef: string | null;
  accuracyMeters: number | null;
  source: LocationSource;
  confirmationStatus: LocationConfirmation;
  latitude: number | null;
  longitude: number | null;
  sourceAddressId: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

@Injectable()
export class LocationSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly addressService: AddressService,
  ) {}

  async createSnapshot(
    userId: string,
    dto: CreateLocationSnapshotDto,
  ): Promise<LocationSnapshotRecord> {
    const id = randomUUID();

    // 1. If created from a saved address (LOC-GEO-003, PROF-ADDR-002)
    if (dto.sourceAddressId) {
      const savedAddress = await this.addressService.getAddress(userId, dto.sourceAddressId);

      const label =
        savedAddress.labelKind === 'CUSTOM' ? savedAddress.customLabel : savedAddress.labelKind;

      if (savedAddress.latitude !== null && savedAddress.longitude !== null) {
        await this.prisma.$executeRaw`
          INSERT INTO location_snapshot (
            id, address_label, address_text, city_id, area_name, place_ref,
            source, confirmation_status, source_address_id, created_by, point
          ) VALUES (
            ${id}::uuid,
            ${label ?? null},
            ${savedAddress.addressText},
            ${savedAddress.cityId}::uuid,
            ${savedAddress.areaName ?? null},
            ${savedAddress.placeRef ?? null},
            ${LocationSource.SAVED_ADDRESS}::location_source,
            ${LocationConfirmation.CONFIRMED}::location_confirmation,
            ${savedAddress.id}::uuid,
            ${userId}::uuid,
            ST_SetSRID(ST_MakePoint(${savedAddress.longitude}, ${savedAddress.latitude}), 4326)::geography
          );
        `;
      } else {
        await this.prisma.locationSnapshot.create({
          data: {
            id,
            addressLabel: label ?? null,
            addressText: savedAddress.addressText,
            cityId: savedAddress.cityId,
            areaName: savedAddress.areaName ?? null,
            placeRef: savedAddress.placeRef ?? null,
            source: LocationSource.SAVED_ADDRESS,
            confirmationStatus: LocationConfirmation.CONFIRMED,
            sourceAddressId: savedAddress.id,
            createdBy: userId,
          },
        });
      }

      return this.getRawSnapshot(id);
    }

    // 2. Direct manual entry, map pin, or place search (PROF-ADDR-003, LOC-GEO-003, LOC-GEO-004)
    if (!dto.cityId || !dto.addressText) {
      throw new AppError('INVALID_SNAPSHOT_DATA', 400, 'cityId and addressText are required');
    }

    const city = await this.prisma.city.findUnique({
      where: { id: dto.cityId },
    });
    if (!city) {
      throw new AppError('INVALID_CITY', 400, 'City does not exist');
    }

    const source =
      dto.source ??
      (dto.latitude !== undefined ? LocationSource.MAP_PIN : LocationSource.MANUAL_ENTRY);
    const confirmation = dto.confirmationStatus ?? LocationConfirmation.CONFIRMED;

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.prisma.$executeRaw`
        INSERT INTO location_snapshot (
          id, address_label, address_text, city_id, area_name, place_ref,
          accuracy_meters, source, confirmation_status, created_by, point
        ) VALUES (
          ${id}::uuid,
          ${dto.addressLabel ?? null},
          ${dto.addressText},
          ${dto.cityId}::uuid,
          ${dto.areaName ?? null},
          ${dto.placeRef ?? null},
          ${dto.accuracyMeters ?? null},
          ${source}::location_source,
          ${confirmation}::location_confirmation,
          ${userId}::uuid,
          ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography
        );
      `;
    } else {
      await this.prisma.locationSnapshot.create({
        data: {
          id,
          addressLabel: dto.addressLabel ?? null,
          addressText: dto.addressText,
          cityId: dto.cityId,
          areaName: dto.areaName ?? null,
          placeRef: dto.placeRef ?? null,
          accuracyMeters: dto.accuracyMeters ?? null,
          source,
          confirmationStatus: confirmation,
          createdBy: userId,
        },
      });
    }

    return this.getRawSnapshot(id);
  }

  /**
   * Reads raw snapshot from DB with PostGIS coordinates.
   */
  async getRawSnapshot(snapshotId: string): Promise<LocationSnapshotRecord> {
    const rows = await this.prisma.$queryRaw<LocationSnapshotRecord[]>`
      SELECT 
        id, 
        address_label as "addressLabel", 
        address_text as "addressText", 
        city_id as "cityId", 
        area_name as "areaName", 
        place_ref as "placeRef",
        accuracy_meters as "accuracyMeters",
        source,
        confirmation_status as "confirmationStatus",
        source_address_id as "sourceAddressId",
        created_by as "createdBy",
        CASE WHEN point IS NOT NULL THEN ST_Y(point::geometry) ELSE NULL END as "latitude",
        CASE WHEN point IS NOT NULL THEN ST_X(point::geometry) ELSE NULL END as "longitude",
        created_at as "createdAt",
        updated_at as "updatedAt",
        version
      FROM location_snapshot
      WHERE id = ${snapshotId}::uuid;
    `;

    const row = rows[0];
    if (!row) {
      throw new AppError('SNAPSHOT_NOT_FOUND', 404, 'Location snapshot not found');
    }
    return row;
  }

  /**
   * Retrieves snapshot with role-based masking (PROF-ADDR-004):
   * Before a provider is accepted on a booking, only area-level information is revealed;
   * exact addressText is masked as null.
   */
  async getSnapshotForCaller(
    snapshotId: string,
    callerRole: 'CUSTOMER' | 'PROVIDER' | 'ADMIN',
    isAcceptedProviderOnJob = false,
  ): Promise<LocationSnapshotRecord> {
    const raw = await this.getRawSnapshot(snapshotId);

    // PROF-ADDR-004: Providers only see area-level details before job acceptance
    if (callerRole === 'PROVIDER' && !isAcceptedProviderOnJob) {
      return {
        ...raw,
        addressText: null, // Mask exact address
        addressLabel: null,
        latitude: null, // Mask exact coordinates
        longitude: null,
        placeRef: null,
      };
    }

    return raw;
  }
}

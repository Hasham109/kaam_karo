import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AppError } from '@kaamkaro/platform';
import type { AddressLabelKind } from '../../generated/prisma/client.js';
import { PrismaService } from '../../platform/prisma.service';
import { CustomerProfileService } from './customer-profile.service';
import type { CreateAddressDto, UpdateAddressDto } from './dto/profile.dto';

export interface AddressRecord {
  id: string;
  customerProfileId: string;
  labelKind: AddressLabelKind;
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

@Injectable()
export class AddressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerProfileService: CustomerProfileService,
  ) {}

  async listAddresses(userId: string): Promise<AddressRecord[]> {
    const profile = await this.customerProfileService.ensureCustomerProfile(userId);

    const rows = await this.prisma.$queryRaw<AddressRecord[]>`
      SELECT 
        id, 
        customer_profile_id as "customerProfileId", 
        label_kind as "labelKind", 
        custom_label as "customLabel", 
        city_id as "cityId", 
        area_name as "areaName", 
        address_text as "addressText", 
        place_ref as "placeRef",
        CASE WHEN point IS NOT NULL THEN ST_Y(point::geometry) ELSE NULL END as "latitude",
        CASE WHEN point IS NOT NULL THEN ST_X(point::geometry) ELSE NULL END as "longitude",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt",
        version
      FROM address
      WHERE customer_profile_id = ${profile.id}::uuid
        AND deleted_at IS NULL
      ORDER BY created_at DESC;
    `;

    return rows;
  }

  async getAddress(userId: string, addressId: string): Promise<AddressRecord> {
    const profile = await this.customerProfileService.ensureCustomerProfile(userId);

    const rows = await this.prisma.$queryRaw<AddressRecord[]>`
      SELECT 
        id, 
        customer_profile_id as "customerProfileId", 
        label_kind as "labelKind", 
        custom_label as "customLabel", 
        city_id as "cityId", 
        area_name as "areaName", 
        address_text as "addressText", 
        place_ref as "placeRef",
        CASE WHEN point IS NOT NULL THEN ST_Y(point::geometry) ELSE NULL END as "latitude",
        CASE WHEN point IS NOT NULL THEN ST_X(point::geometry) ELSE NULL END as "longitude",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt",
        version
      FROM address
      WHERE id = ${addressId}::uuid
        AND customer_profile_id = ${profile.id}::uuid
        AND deleted_at IS NULL;
    `;

    const row = rows[0];
    if (!row) {
      throw new AppError('ADDRESS_NOT_FOUND', 404, 'Saved address not found');
    }
    return row;
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<AddressRecord> {
    const profile = await this.customerProfileService.ensureCustomerProfile(userId);

    const city = await this.prisma.city.findUnique({
      where: { id: dto.cityId },
    });
    if (!city) {
      throw new AppError('INVALID_CITY', 400, 'City does not exist');
    }

    if (dto.labelKind === 'CUSTOM' && !dto.customLabel?.trim()) {
      throw new AppError(
        'CUSTOM_LABEL_REQUIRED',
        400,
        'Custom label text is required for CUSTOM labelKind',
      );
    }

    const id = randomUUID();

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.prisma.$executeRaw`
        INSERT INTO address (
          id, customer_profile_id, label_kind, custom_label, city_id, area_name, address_text, place_ref, point
        ) VALUES (
          ${id}::uuid,
          ${profile.id}::uuid,
          ${dto.labelKind}::address_label_kind,
          ${dto.customLabel ?? null},
          ${dto.cityId}::uuid,
          ${dto.areaName ?? null},
          ${dto.addressText},
          ${dto.placeRef ?? null},
          ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography
        );
      `;
    } else {
      await this.prisma.address.create({
        data: {
          id,
          customerProfileId: profile.id,
          labelKind: dto.labelKind,
          customLabel: dto.customLabel ?? null,
          cityId: dto.cityId,
          areaName: dto.areaName ?? null,
          addressText: dto.addressText,
          placeRef: dto.placeRef ?? null,
        },
      });
    }

    return this.getAddress(userId, id);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressRecord> {
    await this.getAddress(userId, addressId);

    if (dto.labelKind === 'CUSTOM' && !dto.customLabel?.trim()) {
      throw new AppError(
        'CUSTOM_LABEL_REQUIRED',
        400,
        'Custom label text is required for CUSTOM labelKind',
      );
    }

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE address
        SET 
          label_kind = COALESCE(${dto.labelKind ?? null}::address_label_kind, label_kind),
          custom_label = COALESCE(${dto.customLabel ?? null}, custom_label),
          area_name = COALESCE(${dto.areaName ?? null}, area_name),
          address_text = COALESCE(${dto.addressText ?? null}, address_text),
          place_ref = COALESCE(${dto.placeRef ?? null}, place_ref),
          point = ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)::geography,
          updated_at = NOW(),
          version = version + 1
        WHERE id = ${addressId}::uuid;
      `;
    } else {
      await this.prisma.address.update({
        where: { id: addressId },
        data: {
          ...(dto.labelKind !== undefined ? { labelKind: dto.labelKind } : {}),
          ...(dto.customLabel !== undefined ? { customLabel: dto.customLabel } : {}),
          ...(dto.areaName !== undefined ? { areaName: dto.areaName } : {}),
          ...(dto.addressText !== undefined ? { addressText: dto.addressText } : {}),
          ...(dto.placeRef !== undefined ? { placeRef: dto.placeRef } : {}),
        },
      });
    }

    return this.getAddress(userId, addressId);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await this.getAddress(userId, addressId);

    // PROF-ADDR-002: Soft-delete only. Never deletes physical row or touches booking snapshots.
    await this.prisma.address.update({
      where: { id: addressId },
      data: { deletedAt: new Date() },
    });
  }
}

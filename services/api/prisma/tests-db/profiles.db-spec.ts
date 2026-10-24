/**
 * Database-level integration tests for Module M2 (Profiles, Addresses, Location Snapshots & Favorites).
 * T2.5 acceptance; PROF-ADDR-001..004, PROF-FAV-001, LOC-GEO-003..004, ROLE-001, ROLE-002, D-004, D-018.
 *
 * Runs against a migrated & seeded database using:
 *   DATABASE_URL = kaamkaro_api (API login, member of kaamkaro_app)
 *   MIGRATION_DATABASE_URL = table owner (for schema inspection)
 * Every test runs in a rolled-back transaction so the test database stays clean.
 */
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  AccountStatus,
  AddressLabelKind,
  LocationConfirmation,
  LocationSource,
  PrismaClient,
  UserRoleType,
} from '../../src/generated/prisma/client.js';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl) {
  throw new Error('profiles.db-spec needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL');
}

const app = new PrismaClient({ adapter: new PrismaPg({ connectionString: appUrl }) });
const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: ownerUrl }) });

afterAll(async () => {
  await app.$disconnect();
  await owner.$disconnect();
});

class Rollback extends Error {}

/** Run statements in a rolled-back transaction; returns the returned value or thrown non-rollback error. */
async function attempt<T>(
  client: PrismaClient,
  fn: (tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  let value: T | undefined;
  await expect(
    client.$transaction(async (tx) => {
      value = await fn(tx);
      throw new Rollback('rollback');
    }),
  ).rejects.toBeInstanceOf(Rollback);
  return value as T;
}

describe('T2.5 Database Tests: Profiles, Addresses, Snapshots & Favorites', () => {
  describe('PROF-ADDR-001: Multiple labelled addresses per customer', () => {
    it('supports HOME, WORK, and CUSTOM labelled addresses with PostGIS coordinates', async () => {
      await attempt(app, async (tx) => {
        // Find existing seeded city (e.g., Lahore)
        const city = await tx.city.findFirstOrThrow({ where: { code: 'lahore' } });

        // Create user and customer profile
        const user = await tx.user.create({
          data: {
            phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
            displayName: 'Ayesha Khan',
            status: AccountStatus.ACTIVE,
            roles: { create: [{ role: UserRoleType.CUSTOMER }] },
          },
        });

        const profile = await tx.customerProfile.create({
          data: { userId: user.id },
        });

        const homeId = randomUUID();
        const workId = randomUUID();
        const customId = randomUUID();

        // 1. HOME address with PostGIS point
        await tx.$executeRaw`
          INSERT INTO address (
            id, customer_profile_id, label_kind, custom_label, city_id, area_name, address_text, point
          ) VALUES (
            ${homeId}::uuid,
            ${profile.id}::uuid,
            ${AddressLabelKind.HOME}::address_label_kind,
            NULL,
            ${city.id}::uuid,
            'Gulberg III',
            'House 14, Street 2, Gulberg III',
            ST_SetSRID(ST_MakePoint(74.3436, 31.5204), 4326)::geography
          );
        `;

        // 2. WORK address with PostGIS point
        await tx.$executeRaw`
          INSERT INTO address (
            id, customer_profile_id, label_kind, custom_label, city_id, area_name, address_text, point
          ) VALUES (
            ${workId}::uuid,
            ${profile.id}::uuid,
            ${AddressLabelKind.WORK}::address_label_kind,
            NULL,
            ${city.id}::uuid,
            'DHA Phase 5',
            'Plaza 10, Sector C, DHA Phase 5',
            ST_SetSRID(ST_MakePoint(74.4128, 31.4697), 4326)::geography
          );
        `;

        // 3. CUSTOM labelled address (PROF-ADDR-001)
        await tx.$executeRaw`
          INSERT INTO address (
            id, customer_profile_id, label_kind, custom_label, city_id, area_name, address_text, point
          ) VALUES (
            ${customId}::uuid,
            ${profile.id}::uuid,
            ${AddressLabelKind.CUSTOM}::address_label_kind,
            'Parents House',
            ${city.id}::uuid,
            'Model Town',
            'Block J, House 22',
            ST_SetSRID(ST_MakePoint(74.3211, 31.4822), 4326)::geography
          );
        `;

        // Verify all 3 addresses can be read with coordinates extracted
        const addresses = await tx.$queryRaw<
          Array<{
            id: string;
            label_kind: string;
            custom_label: string | null;
            area_name: string | null;
            lat: number | null;
            lon: number | null;
          }>
        >`
          SELECT 
            id, 
            label_kind, 
            custom_label, 
            area_name,
            ST_Y(point::geometry) as lat,
            ST_X(point::geometry) as lon
          FROM address
          WHERE customer_profile_id = ${profile.id}::uuid
          ORDER BY label_kind ASC;
        `;

        expect(addresses).toHaveLength(3);
        const customAddr = addresses.find((a) => a.label_kind === 'CUSTOM');
        expect(customAddr?.custom_label).toBe('Parents House');
        expect(customAddr?.area_name).toBe('Model Town');
        expect(customAddr?.lat).toBeCloseTo(31.4822, 3);
        expect(customAddr?.lon).toBeCloseTo(74.3211, 3);
      });
    });
  });

  describe('PROF-ADDR-002: Location snapshot immutability & freeze trigger', () => {
    it('preserves location snapshot when saved address is updated or soft-deleted', async () => {
      await attempt(app, async (tx) => {
        const city = await tx.city.findFirstOrThrow({ where: { code: 'lahore' } });

        const user = await tx.user.create({
          data: {
            phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
            displayName: 'Bilal Customer',
            status: AccountStatus.ACTIVE,
          },
        });

        const profile = await tx.customerProfile.create({
          data: { userId: user.id },
        });

        const addressId = randomUUID();
        await tx.$executeRaw`
          INSERT INTO address (
            id, customer_profile_id, label_kind, custom_label, city_id, area_name, address_text, point
          ) VALUES (
            ${addressId}::uuid,
            ${profile.id}::uuid,
            ${AddressLabelKind.HOME}::address_label_kind,
            NULL,
            ${city.id}::uuid,
            'Johar Town',
            'House 88, Block R1, Johar Town',
            ST_SetSRID(ST_MakePoint(74.2811, 31.4655), 4326)::geography
          );
        `;

        // Create location snapshot copied from saved address
        const snapshotId = randomUUID();
        await tx.$executeRaw`
          INSERT INTO location_snapshot (
            id, address_label, address_text, city_id, area_name, source,
            confirmation_status, source_address_id, created_by, point
          ) VALUES (
            ${snapshotId}::uuid,
            'HOME',
            'House 88, Block R1, Johar Town',
            ${city.id}::uuid,
            'Johar Town',
            ${LocationSource.SAVED_ADDRESS}::location_source,
            ${LocationConfirmation.CONFIRMED}::location_confirmation,
            ${addressId}::uuid,
            ${user.id}::uuid,
            ST_SetSRID(ST_MakePoint(74.2811, 31.4655), 4326)::geography
          );
        `;

        // Now modify the saved address
        await tx.$executeRaw`
          UPDATE address
          SET 
            address_text = 'House 999, Completely Different Location',
            area_name = 'Cantt',
            point = ST_SetSRID(ST_MakePoint(74.3800, 31.5500), 4326)::geography,
            version = version + 1
          WHERE id = ${addressId}::uuid;
        `;

        // Soft delete the saved address
        await tx.address.update({
          where: { id: addressId },
          data: { deletedAt: new Date() },
        });

        // Verify the location snapshot is COMPLETELY UNTOUCHED (PROF-ADDR-002)
        const snapshot = await tx.locationSnapshot.findUniqueOrThrow({
          where: { id: snapshotId },
        });

        expect(snapshot.addressText).toBe('House 88, Block R1, Johar Town');
        expect(snapshot.areaName).toBe('Johar Town');
        expect(snapshot.sourceAddressId).toBe(addressId);
        expect(snapshot.confirmationStatus).toBe(LocationConfirmation.CONFIRMED);
      });
    });

    it('enforces database trigger kk_location_snapshot_freeze on confirmed snapshots', async () => {
      await attempt(app, async (tx) => {
        const city = await tx.city.findFirstOrThrow({ where: { code: 'lahore' } });

        const snapshotId = randomUUID();
        await tx.locationSnapshot.create({
          data: {
            id: snapshotId,
            addressText: 'Street 5, Faisal Town',
            cityId: city.id,
            areaName: 'Faisal Town',
            source: LocationSource.MANUAL_ENTRY,
            confirmationStatus: LocationConfirmation.CONFIRMED,
          },
        });

        // Trigger kk_location_snapshot_freeze blocks any UPDATE on a CONFIRMED snapshot
        await expect(
          tx.locationSnapshot.update({
            where: { id: snapshotId },
            data: { addressText: 'Tampered Address' },
          }),
        ).rejects.toThrow(/kk_decision_final: location snapshot/);
      });
    });
  });

  describe('PROF-ADDR-003: Manual address entry without location permissions', () => {
    it('creates and reads manual address without point coordinates', async () => {
      await attempt(app, async (tx) => {
        const city = await tx.city.findFirstOrThrow({ where: { code: 'lahore' } });

        const user = await tx.user.create({
          data: {
            phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
            displayName: 'Manual Entry User',
            status: AccountStatus.ACTIVE,
          },
        });

        const profile = await tx.customerProfile.create({
          data: { userId: user.id },
        });

        const address = await tx.address.create({
          data: {
            customerProfileId: profile.id,
            labelKind: AddressLabelKind.HOME,
            cityId: city.id,
            areaName: 'Wapda Town',
            addressText: 'House 123, Block D2, Wapda Town (Near Roundabout)',
          },
        });

        expect(address.id).toBeDefined();
        expect(address.areaName).toBe('Wapda Town');
        expect(address.addressText).toContain('Near Roundabout');

        // Check raw SQL to confirm point column is indeed NULL
        const rows = await tx.$queryRaw<Array<{ point_is_null: boolean }>>`
          SELECT (point IS NULL) as point_is_null
          FROM address
          WHERE id = ${address.id}::uuid;
        `;
        expect(rows[0]?.point_is_null).toBe(true);
      });
    });
  });

  describe('PROF-FAV-001: Saved favorites for customers', () => {
    it('allows customer to save provider with notes and list favorites', async () => {
      await attempt(app, async (tx) => {
        const custUser = await tx.user.create({
          data: {
            phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
            displayName: 'Customer User',
            status: AccountStatus.ACTIVE,
          },
        });
        const custProfile = await tx.customerProfile.create({
          data: { userId: custUser.id },
        });

        const provUser = await tx.user.create({
          data: {
            phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
            displayName: 'Provider User',
            status: AccountStatus.ACTIVE,
          },
        });
        const provProfile = await tx.providerProfile.create({
          data: {
            userId: provUser.id,
            businessName: 'Akram AC Services',
            usualTeamSize: 2,
          },
        });

        // Add favorite
        const favorite = await tx.favorite.create({
          data: {
            customerProfileId: custProfile.id,
            providerProfileId: provProfile.id,
            notes: 'Great at inverter split installation',
          },
        });

        expect(favorite.id).toBeDefined();
        expect(favorite.notes).toBe('Great at inverter split installation');

        // Customer can list favorites
        const favorites = await tx.favorite.findMany({
          where: { customerProfileId: custProfile.id },
          include: { providerProfile: true },
        });

        expect(favorites).toHaveLength(1);
        expect(favorites[0]?.providerProfile.businessName).toBe('Akram AC Services');
        expect(favorites[0]?.providerProfile.usualTeamSize).toBe(2);
      });
    });

    it('enforces composite unique constraint on (customerProfileId, providerProfileId)', async () => {
      await attempt(app, async (tx) => {
        const custUser = await tx.user.create({
          data: {
            phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
            displayName: 'Customer 2',
            status: AccountStatus.ACTIVE,
          },
        });
        const custProfile = await tx.customerProfile.create({
          data: { userId: custUser.id },
        });

        const provUser = await tx.user.create({
          data: {
            phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
            displayName: 'Provider 2',
            status: AccountStatus.ACTIVE,
          },
        });
        const provProfile = await tx.providerProfile.create({
          data: {
            userId: provUser.id,
            businessName: 'Tariq Plumber',
          },
        });

        await tx.favorite.create({
          data: {
            customerProfileId: custProfile.id,
            providerProfileId: provProfile.id,
          },
        });

        // Duplicate insert should throw unique constraint violation
        await expect(
          tx.favorite.create({
            data: {
              customerProfileId: custProfile.id,
              providerProfileId: provProfile.id,
            },
          }),
        ).rejects.toThrow();
      });
    });
  });

  describe('ROLE-001 & ROLE-002, D-004, D-018: Profile management', () => {
    it('updates provider profile usualTeamSize (D-004, D-018)', async () => {
      await attempt(app, async (tx) => {
        const provUser = await tx.user.create({
          data: {
            phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
            displayName: 'Team Leader Zahid',
            status: AccountStatus.ACTIVE,
            roles: { create: [{ role: UserRoleType.PROVIDER }] },
          },
        });

        const profile = await tx.providerProfile.create({
          data: {
            userId: provUser.id,
            businessName: 'Zahid Painting Solutions',
            usualTeamSize: 1,
          },
        });

        const updated = await tx.providerProfile.update({
          where: { id: profile.id },
          data: { usualTeamSize: 4 },
        });

        expect(updated.usualTeamSize).toBe(4);
      });
    });
  });
});

/**
 * Database-level integration tests for Module M6 Location & Maps.
 * T3.1 acceptance: LOC-GEO-001..006, LOC-GEO-008, SCOPE-GEO-001, SCOPE-GEO-002; D-007, D-019.
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
  type LocationConfirmation,
  type LocationSource,
  PrismaClient,
} from '../../src/generated/prisma/client.js';
import {
  calculateHaversineDistanceMeters,
  estimateUrbanDurationSeconds,
} from '../../src/modules/location/haversine.ts';
import { isInsidePakistan, LAHORE_CENTER } from '../../src/modules/location/pakistan-boundary.ts';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl) {
  throw new Error('location.db-spec needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL');
}

const app = new PrismaClient({ adapter: new PrismaPg({ connectionString: appUrl }) });
const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: ownerUrl }) });

afterAll(async () => {
  await app.$disconnect();
  await owner.$disconnect();
});

class Rollback extends Error {}

async function attempt<T>(client: PrismaClient, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  let value: T | undefined;
  try {
    await client.$transaction(async (tx) => {
      value = await fn(tx as unknown as PrismaClient);
      throw new Rollback();
    });
  } catch (err) {
    if (err instanceof Rollback) return value as T;
    throw err;
  }
  return value as T;
}

describe('[T3.1, LOC-GEO-001..006, SCOPE-GEO-001..002] Location Database Integration', () => {
  it('[SCOPE-GEO-002, D-007, D-019] verifies seeded Lahore city is active with one whole-city zone', async () => {
    const lahore = await app.city.findUniqueOrThrow({ where: { code: 'lahore' } });
    expect(lahore.isListed).toBe(true);
    expect(lahore.isActive).toBe(true);
    expect(lahore.nameEn).toBe('Lahore');
    expect(lahore.nameUr).toBe('لاہور');

    const zones = await app.$queryRaw<
      Array<{ code: string; is_active: boolean; is_whole: boolean }>
    >`
      SELECT code, is_active, area IS NULL AS is_whole
      FROM service_zone
      WHERE city_id = ${lahore.id}::uuid
    `;
    expect(zones).toHaveLength(1);
    expect(zones[0]!.code).toBe('lahore-whole-city');
    expect(zones[0]!.is_active).toBe(true);
    expect(zones[0]!.is_whole).toBe(true);
  });

  it('[LOC-GEO-002, SCOPE-GEO-002] resolves listed Pakistani cities for customer selection', async () => {
    const cities = await app.city.findMany({
      where: { isListed: true },
      orderBy: [{ isActive: 'desc' }, { nameEn: 'asc' }],
    });
    expect(cities.length).toBeGreaterThan(0);
    const lahore = cities.find((c) => c.code === 'lahore');
    expect(lahore).toBeDefined();
    expect(lahore?.isActive).toBe(true);
  });

  it('[LOC-GEO-005, LOC-GEO-006] calculates Haversine straight-line distance and urban duration', () => {
    const mallRoad = { latitude: 31.558, longitude: 74.326 };
    const dhaPhase5 = { latitude: 31.472, longitude: 74.408 };

    const distanceMeters = calculateHaversineDistanceMeters(mallRoad, dhaPhase5);
    expect(distanceMeters).toBeGreaterThan(11_500);
    expect(distanceMeters).toBeLessThan(13_500);

    const durationSeconds = estimateUrbanDurationSeconds(distanceMeters);
    expect(durationSeconds).toBeGreaterThan(1000);
  });

  it('[SCOPE-GEO-001] validates Pakistan boundary checks on coordinates', () => {
    expect(isInsidePakistan(LAHORE_CENTER.latitude, LAHORE_CENTER.longitude)).toBe(true);
    expect(isInsidePakistan(51.5074, -0.1278)).toBe(false);
  });

  it('[LOC-GEO-004, PROF-ADDR-002] inserts PostGIS location snapshot and verifies distance query & trigger freeze', async () => {
    await attempt(app, async (tx) => {
      const lahore = await tx.city.findUniqueOrThrow({ where: { code: 'lahore' } });
      const snapshotId = randomUUID();
      const source: LocationSource = 'MAP_PIN';
      const confirmationStatus: LocationConfirmation = 'CONFIRMED';

      // 1. Insert confirmed location snapshot with PostGIS geography point
      await tx.$executeRaw`
        INSERT INTO location_snapshot (
          id, address_label, address_text, city_id, area_name,
          source, confirmation_status, point
        ) VALUES (
          ${snapshotId}::uuid,
          'Home',
          'House 12, Street 4, Gulberg III, Lahore',
          ${lahore.id}::uuid,
          'Gulberg III',
          ${source}::location_source,
          ${confirmationStatus}::location_confirmation,
          ST_SetSRID(ST_MakePoint(74.34, 31.51), 4326)::geography
        );
      `;

      // 2. Query PostGIS distance in metres from Mall Road (74.326, 31.558)
      const rows = await tx.$queryRaw<Array<{ distance_meters: number; address_text: string }>>`
        SELECT
          ST_Distance(point, ST_SetSRID(ST_MakePoint(74.326, 31.558), 4326)::geography) AS distance_meters,
          address_text
        FROM location_snapshot
        WHERE id = ${snapshotId}::uuid
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0]!.distance_meters).toBeGreaterThan(5000); // ~5-6 km
      expect(rows[0]!.distance_meters).toBeLessThan(7000);

      // 3. Verify trigger kk_location_snapshot_freeze prevents updating a confirmed snapshot
      await expect(
        tx.$executeRaw`
          UPDATE location_snapshot
          SET address_text = 'Tampered address'
          WHERE id = ${snapshotId}::uuid
        `,
      ).rejects.toThrow();
    });
  });
});

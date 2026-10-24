/**
 * Database integration tests for Module M5 Availability & M3 Trust.
 * T3.6 acceptance: AVAIL-001..007, TRUST-VER-001..004; BP §22, §59; ARCH §4 M3, M5, §6.5.
 *
 * Runs against a migrated & seeded PostgreSQL database.
 */
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  AvailabilityRuleKind,
  AvailabilityStatus,
  PrismaClient,
  RatingStanding,
  ServiceAreaKind,
  VerificationLevel,
  VerificationRecordStatus,
} from '../../src/generated/prisma/client.js';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl) {
  throw new Error('availability.db-spec needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL');
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

async function createTestProvider(tx: PrismaClient) {
  const user = await tx.user.create({
    data: {
      phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: 'Test Provider User',
    },
  });

  const provider = await tx.providerProfile.create({
    data: {
      userId: user.id,
      businessName: 'Apex Services Pvt Ltd',
      usualTeamSize: 2,
    },
  });

  return { user, provider };
}

describe('[T3.6][AVAIL-001..007, TRUST-VER-001..004] Availability & Trust Database Integration', () => {
  describe('Database Check Constraints', () => {
    it('[AVAIL-001] enforces availability_rule_day_range (day_of_week BETWEEN 1 AND 7)', async () => {
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);

        await expect(
          tx.availabilityRule.create({
            data: {
              providerProfileId: provider.id,
              kind: AvailabilityRuleKind.WEEKLY_HOURS,
              dayOfWeek: 8, // Invalid! Outside 1..7
            },
          }),
        ).rejects.toThrowError(/availability_rule_day_range/);
      });
    });

    it('[AVAIL-001..003] enforces availability_rule_shape constraint', async () => {
      // 1. WEEKLY_HOURS missing day_of_week must fail
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);
        await expect(
          tx.availabilityRule.create({
            data: {
              providerProfileId: provider.id,
              kind: AvailabilityRuleKind.WEEKLY_HOURS,
              dayOfWeek: null, // Invalid for WEEKLY_HOURS!
            },
          }),
        ).rejects.toThrowError(/availability_rule_shape/);
      });

      // 2. DATE_OVERRIDE missing override_kind must fail
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);
        await expect(
          tx.availabilityRule.create({
            data: {
              providerProfileId: provider.id,
              kind: AvailabilityRuleKind.DATE_OVERRIDE,
              date: new Date('2026-11-15'),
              overrideKind: null, // Invalid for DATE_OVERRIDE!
            },
          }),
        ).rejects.toThrowError(/availability_rule_shape/);
      });

      // 3. Valid WEEKLY_HOURS succeeds
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);
        const rule = await tx.availabilityRule.create({
          data: {
            providerProfileId: provider.id,
            kind: AvailabilityRuleKind.WEEKLY_HOURS,
            dayOfWeek: 1, // Monday
            startTime: new Date('1970-01-01T09:00:00Z'),
            endTime: new Date('1970-01-01T17:00:00Z'),
          },
        });
        expect(rule.id).toBeDefined();
        expect(rule.dayOfWeek).toBe(1);
      });
    });

    it('[AVAIL-005] enforces service_area_shape constraint', async () => {
      // 1. ZONE area without service_zone_id must fail
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);
        await expect(
          tx.serviceArea.create({
            data: {
              providerProfileId: provider.id,
              kind: ServiceAreaKind.ZONE,
              serviceZoneId: null, // Invalid!
            },
          }),
        ).rejects.toThrowError(/service_area_shape/);
      });

      // 2. ZONE area with valid service_zone_id succeeds
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);
        const lahoreZone = await tx.serviceZone.findFirstOrThrow();

        const area = await tx.serviceArea.create({
          data: {
            providerProfileId: provider.id,
            kind: ServiceAreaKind.ZONE,
            serviceZoneId: lahoreZone.id,
          },
        });
        expect(area.id).toBeDefined();
        expect(area.kind).toBe(ServiceAreaKind.ZONE);
      });
    });

    it('[AVAIL-006] enforces provider_max_active_jobs_positive constraint (>= 1 or null)', async () => {
      // max_active_jobs = 0 must fail
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);
        await expect(
          tx.providerLiveStatus.create({
            data: {
              providerProfileId: provider.id,
              status: AvailabilityStatus.ONLINE_AVAILABLE,
              maxActiveJobs: 0, // Invalid!
            },
          }),
        ).rejects.toThrowError(/provider_max_active_jobs_positive/);
      });

      // max_active_jobs >= 1 succeeds
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);
        const live = await tx.providerLiveStatus.create({
          data: {
            providerProfileId: provider.id,
            status: AvailabilityStatus.ONLINE_AVAILABLE,
            maxActiveJobs: 3,
          },
        });
        expect(live.maxActiveJobs).toBe(3);
      });
    });

    it('[RATING-ENF-004] enforces provider_standing_warning_count non-negative', async () => {
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);
        await expect(
          tx.providerStanding.create({
            data: {
              providerProfileId: provider.id,
              verificationLevel: VerificationLevel.BASIC,
              ratingStanding: RatingStanding.GOOD_STANDING,
              ratingWarningCount: -1, // Invalid!
            },
          }),
        ).rejects.toThrowError(/provider_standing_warning_count/);
      });
    });
  });

  describe('PostGIS Spatial Queries on service_area', () => {
    it('[AVAIL-005] creates RADIUS service area and queries coverage via PostGIS ST_DWithin', async () => {
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);
        // Provider center: Gulberg Lahore (31.5204, 74.3587) with 10 km radius (10,000 meters)
        await tx.$executeRaw`
          INSERT INTO service_area (
            id, provider_profile_id, kind, center, radius_meters, created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            ${provider.id}::uuid,
            'RADIUS'::service_area_kind,
            ST_SetSRID(ST_MakePoint(74.3587, 31.5204), 4326)::geography,
            10000,
            NOW(),
            NOW()
          );
        `;

        // Point A: Model Town Lahore (~4 km away) -> should be within coverage
        const pointACovered = await tx.$queryRaw<Array<{ covered: boolean }>>`
          SELECT ST_DWithin(
            center,
            ST_SetSRID(ST_MakePoint(74.3211, 31.4822), 4326)::geography,
            radius_meters
          ) AS covered
          FROM service_area
          WHERE provider_profile_id = ${provider.id}::uuid;
        `;
        expect(pointACovered).toHaveLength(1);
        expect(pointACovered[0]!.covered).toBe(true);

        // Point B: Sheikhupura (~40 km away) -> should NOT be within 10 km coverage
        const pointBCovered = await tx.$queryRaw<Array<{ covered: boolean }>>`
          SELECT ST_DWithin(
            center,
            ST_SetSRID(ST_MakePoint(73.9784, 31.7131), 4326)::geography,
            radius_meters
          ) AS covered
          FROM service_area
          WHERE provider_profile_id = ${provider.id}::uuid;
        `;
        expect(pointBCovered).toHaveLength(1);
        expect(pointBCovered[0]!.covered).toBe(false);
      });
    });
  });

  describe('Verification Records & Standing Lifecycle', () => {
    it('[TRUST-VER-001..003] records verification lifecycle and links decided admin user', async () => {
      await attempt(app, async (tx) => {
        const { provider } = await createTestProvider(tx);

        // Seed admin user
        const adminUser = await tx.user.create({
          data: {
            phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
            displayName: 'Trust & Safety Admin',
          },
        });

        // 1. Initial standing starts at BASIC
        const standing = await tx.providerStanding.create({
          data: {
            providerProfileId: provider.id,
            verificationLevel: VerificationLevel.BASIC,
          },
        });
        expect(standing.verificationLevel).toBe(VerificationLevel.BASIC);

        // 2. Provider submits verification record
        const record = await tx.verificationRecord.create({
          data: {
            providerProfileId: provider.id,
            requestedLevel: VerificationLevel.VERIFIED,
            documentMediaIds: [randomUUID()],
            status: VerificationRecordStatus.SUBMITTED,
          },
        });
        expect(record.status).toBe(VerificationRecordStatus.SUBMITTED);

        // 3. Admin approves
        const decided = await tx.verificationRecord.update({
          where: { id: record.id },
          data: {
            status: VerificationRecordStatus.APPROVED,
            decidedAt: new Date(),
            decidedByUserId: adminUser.id,
            decisionReason: 'Verified government CNIC and police character certificate.',
          },
        });
        expect(decided.status).toBe(VerificationRecordStatus.APPROVED);
        expect(decided.decidedByUserId).toBe(adminUser.id);

        // 4. Update standing
        const updatedStanding = await tx.providerStanding.update({
          where: { providerProfileId: provider.id },
          data: { verificationLevel: VerificationLevel.VERIFIED },
        });
        expect(updatedStanding.verificationLevel).toBe(VerificationLevel.VERIFIED);
      });
    });
  });
});

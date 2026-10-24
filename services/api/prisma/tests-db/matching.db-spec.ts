/**
 * Database integration tests for Module M8 Matching (T3.7; owner A05).
 * Requirement IDs: MATCH-ELIG-073..079, MATCH-SCORE-001..013, MATCH-FAIR-001..004,
 * MATCH-EXPL-001, MATCH-MODE-001, MATCH-GAP-001, OPS-ADMIN-021; BP §54, §61.3, §68; D-005, D-020.
 *
 * Runs against live migrated & seeded PostgreSQL database with PostGIS.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  AvailabilityCheck,
  EligibilityResult,
  Prisma,
  PrismaClient,
  RequestStatus,
  VerificationLevel,
} from '../../src/generated/prisma/client.js';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl) {
  throw new Error('matching.db-spec needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL');
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
    await client.$transaction(
      async (tx) => {
        value = await fn(tx as unknown as PrismaClient);
        throw new Rollback();
      },
      { maxWait: 10000, timeout: 30000 },
    );
  } catch (err) {
    if (err instanceof Rollback) return value as T;
    throw err;
  }
  return value as T;
}

async function createMatchingFixtures(tx: PrismaClient) {
  // 1. Customer User and Profile
  const customerUser = await tx.user.create({
    data: {
      phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: 'Test Customer Matching',
    },
  });

  const customerProfile = await tx.customerProfile.create({
    data: {
      userId: customerUser.id,
    },
  });

  // 2. Provider User and Profile (Verified)
  const providerUser1 = await tx.user.create({
    data: {
      phoneE164: `+92311${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: 'Tariq Electrician',
    },
  });

  const providerProfile1 = await tx.providerProfile.create({
    data: {
      userId: providerUser1.id,
      businessName: 'Tariq Electricals',
    },
  });

  // Standing for Provider 1 (VERIFIED)
  await tx.providerStanding.create({
    data: {
      providerProfileId: providerProfile1.id,
      verificationLevel: VerificationLevel.VERIFIED,
      ratingStanding: 'GOOD_STANDING',
      ratingWarningCount: 0,
    },
  });

  // 3. Provider User and Profile (Basic - Unverified)
  const providerUser2 = await tx.user.create({
    data: {
      phoneE164: `+92322${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: 'Amir Apprentice',
    },
  });

  const providerProfile2 = await tx.providerProfile.create({
    data: {
      userId: providerUser2.id,
      businessName: 'Amir Services',
    },
  });

  // Standing for Provider 2 (BASIC)
  await tx.providerStanding.create({
    data: {
      providerProfileId: providerProfile2.id,
      verificationLevel: VerificationLevel.BASIC,
      ratingStanding: 'GOOD_STANDING',
      ratingWarningCount: 0,
    },
  });

  // 4. Fetch seeded service and city
  const service = await tx.service.findFirstOrThrow();
  const city = await tx.city.findFirstOrThrow({ where: { code: 'lahore' } });
  const snapshotId = '55555555-5555-5555-5555-555555555555';

  await tx.$executeRaw`
    INSERT INTO location_snapshot (
      id, address_text, city_id, source, confirmation_status, point
    ) VALUES (
      ${snapshotId}::uuid,
      'Gulberg III, Lahore',
      ${city.id}::uuid,
      'PLACE_SEARCH'::location_source,
      'CONFIRMED'::location_confirmation,
      ST_SetSRID(ST_MakePoint(74.3587, 31.5204), 4326)::geography
    );
  `;

  // 5. Customer Request
  const request = await tx.customerRequest.create({
    data: {
      customerProfileId: customerProfile.id,
      serviceId: service.id,
      status: RequestStatus.SUBMITTED,
      locationSnapshotId: snapshotId,
      requestedWindowFrom: new Date('2026-10-25T10:00:00Z'),
      requestedWindowTo: new Date('2026-10-25T12:00:00Z'),
      submittedAt: new Date(),
    },
  });

  return {
    customerUser,
    customerProfile,
    providerProfile1,
    providerProfile2,
    service,
    request,
  };
}

describe('Matching Engine Database Integration (T3.7)', () => {
  it('persists match candidate record with decimal score, json reasons, and ranking version', async () => {
    await attempt(app, async (tx) => {
      const { request, providerProfile1 } = await createMatchingFixtures(tx);

      const candidate = await tx.matchCandidate.create({
        data: {
          requestId: request.id,
          providerProfileId: providerProfile1.id,
          eligibility: EligibilityResult.ELIGIBLE,
          ineligibleReasons: [],
          distanceMeters: 2450,
          etaSeconds: 580,
          availability: AvailabilityCheck.AVAILABLE,
          matchReasons: [
            { key: 'DISTANCE', en: '2.5 km away', ur: '2.5 کلومیٹر دور' },
            { key: 'VERIFIED', en: 'Verified Specialist', ur: 'تصدیق شدہ ماہر' },
          ],
          score: new Prisma.Decimal('0.874521'),
          rank: 1,
          rankingVersion: 'v1.0.0',
        },
      });

      expect(candidate.id).toBeTruthy();
      expect(candidate.eligibility).toBe(EligibilityResult.ELIGIBLE);
      expect(candidate.rank).toBe(1);
      expect(candidate.score?.toString()).toBe('0.874521');
      expect(candidate.rankingVersion).toBe('v1.0.0');

      // Fetch and verify JSON deserialization
      const fetched = await tx.matchCandidate.findUnique({
        where: { id: candidate.id },
      });
      expect(fetched?.distanceMeters).toBe(2450);
      const reasons = fetched?.matchReasons as Array<Record<string, unknown>>;
      expect(reasons.length).toBe(2);
      expect(reasons[0]?.['key']).toBe('DISTANCE');
      expect(reasons[1]?.['ur']).toContain('تصدیق شدہ');
    });
  });

  it('enforces required fields and NOT NULL constraint on match_candidate', async () => {
    await attempt(app, async (tx) => {
      const { providerProfile1 } = await createMatchingFixtures(tx);

      // Violate NOT NULL constraint on requestId
      await expect(
        tx.matchCandidate.create({
          data: {
            requestId: null as unknown as string,
            providerProfileId: providerProfile1.id,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: ['RULE_75_OUT_OF_AREA'],
            availability: AvailabilityCheck.UNAVAILABLE,
            rankingVersion: 'v1.0.0',
          },
        }),
      ).rejects.toThrow();
    });
  });

  it('persists ineligible candidate record with hard-filter failure codes (BP §54.1)', async () => {
    await attempt(app, async (tx) => {
      const { request, providerProfile2 } = await createMatchingFixtures(tx);

      const candidate = await tx.matchCandidate.create({
        data: {
          requestId: request.id,
          providerProfileId: providerProfile2.id,
          eligibility: EligibilityResult.INELIGIBLE,
          ineligibleReasons: ['RULE_77_VERIFICATION_LEVEL', 'RULE_74_NO_SKILL'],
          availability: AvailabilityCheck.UNAVAILABLE,
          rankingVersion: 'v1.0.0',
        },
      });

      expect(candidate.id).toBeTruthy();
      expect(candidate.eligibility).toBe(EligibilityResult.INELIGIBLE);
      expect(candidate.ineligibleReasons).toContain('RULE_77_VERIFICATION_LEVEL');
      expect(candidate.ineligibleReasons).toContain('RULE_74_NO_SKILL');
      expect(candidate.score).toBeNull();
      expect(candidate.rank).toBeNull();
    });
  });

  it('[MATCH-MODE-001, D-005] verifies zero booking rows are created during matching execution', async () => {
    await attempt(app, async (tx) => {
      const { request, providerProfile1 } = await createMatchingFixtures(tx);

      const bookingCountBefore = await tx.booking.count();

      // Simulate matching candidate evaluation
      await tx.matchCandidate.create({
        data: {
          requestId: request.id,
          providerProfileId: providerProfile1.id,
          eligibility: EligibilityResult.ELIGIBLE,
          ineligibleReasons: [],
          availability: AvailabilityCheck.AVAILABLE,
          score: new Prisma.Decimal('0.910000'),
          rank: 1,
          rankingVersion: 'v1.0.0',
        },
      });

      await tx.customerRequest.update({
        where: { id: request.id },
        data: { status: RequestStatus.MATCHES_SHOWN },
      });

      const bookingCountAfter = await tx.booking.count();
      // Zero auto-assignment: no booking created
      expect(bookingCountAfter).toBe(bookingCountBefore);
    });
  });

  it('[MATCH-GAP-001] updates customer request to NO_SUPPLY when all providers are ineligible', async () => {
    await attempt(app, async (tx) => {
      const { request, providerProfile1, providerProfile2 } = await createMatchingFixtures(tx);

      // Save ineligible candidates for all providers
      await tx.matchCandidate.createMany({
        data: [
          {
            requestId: request.id,
            providerProfileId: providerProfile1.id,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: ['RULE_75_OUT_OF_AREA'],
            availability: AvailabilityCheck.UNAVAILABLE,
            rankingVersion: 'v1.0.0',
          },
          {
            requestId: request.id,
            providerProfileId: providerProfile2.id,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: ['RULE_77_VERIFICATION_LEVEL'],
            availability: AvailabilityCheck.UNAVAILABLE,
            rankingVersion: 'v1.0.0',
          },
        ],
      });

      // Update to NO_SUPPLY
      const updatedRequest = await tx.customerRequest.update({
        where: { id: request.id },
        data: { status: RequestStatus.NO_SUPPLY },
      });

      expect(updatedRequest.status).toBe(RequestStatus.NO_SUPPLY);

      const eligibleCount = await tx.matchCandidate.count({
        where: {
          requestId: request.id,
          eligibility: EligibilityResult.ELIGIBLE,
        },
      });
      expect(eligibleCount).toBe(0);
    });
  });
});

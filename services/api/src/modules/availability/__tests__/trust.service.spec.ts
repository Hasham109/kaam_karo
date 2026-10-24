/**
 * Unit tests for TrustService (T3.6; owner A05).
 * Requirement IDs: TRUST-VER-001..004, MATCH-ELIG-077, BP §22, ARCH §6.4, D-018
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { TrustService } from '../trust.service';
import { RatingStanding, VerificationLevel, VerificationRecordStatus } from '../availability.types';
import type { PrismaService } from '../../../platform';

interface MockStanding {
  id: string;
  providerProfileId: string;
  verificationLevel: VerificationLevel;
  ratingStanding: RatingStanding;
  ratingWarningCount: number;
}

interface MockVerificationRecord {
  id: string;
  providerProfileId: string;
  requestedLevel: VerificationLevel;
  categoryId?: string | null;
  documentMediaIds: string[];
  status: VerificationRecordStatus;
  submittedAt: Date;
  decidedAt?: Date | null;
  decidedByUserId?: string | null;
  decisionReason?: string | null;
}

class MockPrismaService {
  public standings = new Map<string, MockStanding>();
  public records: MockVerificationRecord[] = [];

  providerStanding = {
    findUnique: async ({ where }: { where: { providerProfileId: string } }) => {
      return this.standings.get(where.providerProfileId) ?? null;
    },
    create: async ({
      data,
    }: {
      data: {
        providerProfileId: string;
        verificationLevel?: VerificationLevel;
        ratingStanding?: RatingStanding;
        ratingWarningCount?: number;
      };
    }) => {
      const standing: MockStanding = {
        id: `standing-${data.providerProfileId}`,
        providerProfileId: data.providerProfileId,
        verificationLevel: data.verificationLevel ?? VerificationLevel.BASIC,
        ratingStanding: data.ratingStanding ?? RatingStanding.GOOD_STANDING,
        ratingWarningCount: data.ratingWarningCount ?? 0,
      };
      this.standings.set(data.providerProfileId, standing);
      return standing;
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { providerProfileId: string };
      create: {
        providerProfileId: string;
        verificationLevel?: VerificationLevel;
        ratingStanding?: RatingStanding;
      };
      update: { verificationLevel?: VerificationLevel };
    }) => {
      let existing = this.standings.get(where.providerProfileId);
      if (!existing) {
        existing = {
          id: `standing-${where.providerProfileId}`,
          providerProfileId: where.providerProfileId,
          verificationLevel: create.verificationLevel ?? VerificationLevel.BASIC,
          ratingStanding: create.ratingStanding ?? RatingStanding.GOOD_STANDING,
          ratingWarningCount: 0,
        };
        this.standings.set(where.providerProfileId, existing);
      } else {
        if (update.verificationLevel) existing.verificationLevel = update.verificationLevel;
      }
      return existing;
    },
  };

  verificationRecord = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.records.find((r) => r.id === where.id) ?? null;
    },
    create: async ({
      data,
    }: {
      data: {
        providerProfileId: string;
        requestedLevel: VerificationLevel;
        categoryId?: string | null;
        documentMediaIds: string[];
        status: VerificationRecordStatus;
        submittedAt: Date;
      };
    }) => {
      const record: MockVerificationRecord = {
        id: `record-${this.records.length + 1}`,
        providerProfileId: data.providerProfileId,
        requestedLevel: data.requestedLevel,
        categoryId: data.categoryId ?? null,
        documentMediaIds: data.documentMediaIds,
        status: data.status,
        submittedAt: data.submittedAt,
      };
      this.records.push(record);
      return record;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: {
        status?: VerificationRecordStatus;
        decidedAt?: Date;
        decidedByUserId?: string | null;
        decisionReason?: string | null;
      };
    }) => {
      const record = this.records.find((r) => r.id === where.id);
      if (!record) throw new Error('Record not found');
      if (data.status) record.status = data.status;
      if (data.decidedAt) record.decidedAt = data.decidedAt;
      if (data.decidedByUserId) record.decidedByUserId = data.decidedByUserId;
      if (data.decisionReason) record.decisionReason = data.decisionReason;
      return record;
    },
  };

  $transaction = async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
    return fn(this);
  };
}

describe('TrustService (T3.6; TRUST-VER-001..004)', () => {
  let service: TrustService;
  let mockPrisma: MockPrismaService;
  const testProviderId = '11111111-1111-1111-1111-111111111111';
  const staffUserId = '99999999-9999-9999-9999-999999999999';

  beforeEach(() => {
    mockPrisma = new MockPrismaService();
    service = new TrustService(mockPrisma as unknown as PrismaService);
  });

  describe('[TRUST-VER-001] Level Basic Initial Standing', () => {
    it('creates initial standing with level BASIC (not eligible for normal jobs)', async () => {
      const standing = await service.getProviderStanding(testProviderId);
      expect(standing.verificationLevel).toBe(VerificationLevel.BASIC);
      expect(standing.isEligibleForNormalJobs).toBe(false);

      const isEligible = await service.isEligibleForNormalJobs(testProviderId);
      expect(isEligible).toBe(false);
    });
  });

  describe('[TRUST-VER-002] Level Verified Application & Approval', () => {
    it('submits verification application with required documents', async () => {
      const record = await service.submitVerification(testProviderId, {
        requestedLevel: VerificationLevel.VERIFIED,
        documentMediaIds: ['22222222-2222-2222-2222-222222222222'],
      });

      expect(record.status).toBe(VerificationRecordStatus.SUBMITTED);
      expect(record.requestedLevel).toBe(VerificationLevel.VERIFIED);
      expect(record.documentMediaIds).toHaveLength(1);
    });

    it('rejects application without documents or requesting BASIC level', async () => {
      await expect(
        service.submitVerification(testProviderId, {
          requestedLevel: VerificationLevel.VERIFIED,
          documentMediaIds: [],
        }),
      ).rejects.toThrowError(/At least one verification document is required/);

      await expect(
        service.submitVerification(testProviderId, {
          requestedLevel: VerificationLevel.BASIC,
          documentMediaIds: ['22222222-2222-2222-2222-222222222222'],
        }),
      ).rejects.toThrowError(/Cannot apply for BASIC level/);
    });

    it('approves application, updates standing to VERIFIED, and grants normal job eligibility', async () => {
      const record = await service.submitVerification(testProviderId, {
        requestedLevel: VerificationLevel.VERIFIED,
        documentMediaIds: ['22222222-2222-2222-2222-222222222222'],
      });

      const decided = await service.decideVerification(record.id, {
        decision: 'APPROVED',
        reason: 'CNIC and address verified by Risk/Trust desk.',
        decidedByUserId: staffUserId,
      });

      expect(decided.status).toBe(VerificationRecordStatus.APPROVED);
      expect(decided.decidedByUserId).toBe(staffUserId);

      // Standing is now VERIFIED
      const standing = await service.getProviderStanding(testProviderId);
      expect(standing.verificationLevel).toBe(VerificationLevel.VERIFIED);
      expect(standing.isEligibleForNormalJobs).toBe(true);

      const isEligible = await service.isEligibleForNormalJobs(testProviderId);
      expect(isEligible).toBe(true);
    });

    it('rejects decision with short or empty reason', async () => {
      const record = await service.submitVerification(testProviderId, {
        requestedLevel: VerificationLevel.VERIFIED,
        documentMediaIds: ['22222222-2222-2222-2222-222222222222'],
      });

      await expect(
        service.decideVerification(record.id, {
          decision: 'APPROVED',
          reason: 'ok', // too short (< 5 chars)
          decidedByUserId: staffUserId,
        }),
      ).rejects.toThrowError(/at least 5 characters/);
    });
  });

  describe('[TRUST-VER-003] Level Business Verified', () => {
    it('approves Business Verified level for company/team listings (D-018)', async () => {
      const record = await service.submitVerification(testProviderId, {
        requestedLevel: VerificationLevel.BUSINESS_VERIFIED,
        documentMediaIds: [
          '22222222-2222-2222-2222-222222222222',
          '33333333-3333-3333-3333-333333333333',
        ],
      });

      await service.decideVerification(record.id, {
        decision: 'APPROVED',
        reason: 'NTN and business registration verified.',
        decidedByUserId: staffUserId,
      });

      const standing = await service.getProviderStanding(testProviderId);
      expect(standing.verificationLevel).toBe(VerificationLevel.BUSINESS_VERIFIED);
      expect(standing.isEligibleForNormalJobs).toBe(true);
    });

    it('rejects already decided verification records', async () => {
      const record = await service.submitVerification(testProviderId, {
        requestedLevel: VerificationLevel.VERIFIED,
        documentMediaIds: ['22222222-2222-2222-2222-222222222222'],
      });

      await service.decideVerification(record.id, {
        decision: 'REJECTED',
        reason: 'Document blurry and unreadable.',
        decidedByUserId: staffUserId,
      });

      await expect(
        service.decideVerification(record.id, {
          decision: 'APPROVED',
          reason: 'Retrying decision.',
          decidedByUserId: staffUserId,
        }),
      ).rejects.toThrowError(/already decided/);
    });
  });
});

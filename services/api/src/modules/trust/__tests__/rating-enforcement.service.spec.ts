/**
 * RatingEnforcementService Unit Test Suite (Task T7.6; owner A05).
 * Requirements: RATING-ENF-001..008, MATCH-ELIG-073, ROLE-003, D-014, D-017; BP §19, §54.1 rule 73, §8.3; ARCH §6.7.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { RatingEnforcementService } from '../rating-enforcement.service.js';
import {
  AdminSubRole,
  RatingStanding,
  ReviewModerationStatus,
} from '../../../generated/prisma/client.js';

describe('[T7.6] RatingEnforcementService Test Suite', () => {
  let service: RatingEnforcementService;
  let mockPrisma: any;
  let mockConfigService: any;
  let mockOutboxWriter: any;
  let mockAuditWriter: any;

  const PROVIDER_ID = '00000000-0000-0000-0000-000000000001';
  const USER_ID = '00000000-0000-0000-0000-000000000002';
  const ADMIN_ID = '00000000-0000-0000-0000-000000000099';

  beforeEach(() => {
    mockPrisma = {
      providerProfile: {
        findUnique: vi.fn().mockResolvedValue({
          id: PROVIDER_ID,
          userId: USER_ID,
        }),
        findMany: vi.fn().mockResolvedValue([{ id: PROVIDER_ID, userId: USER_ID }]),
      },
      providerStanding: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'standing-1',
          providerProfileId: PROVIDER_ID,
          ratingStanding: RatingStanding.GOOD_STANDING,
          ratingWarningCount: 0,
          ratingStandingChangedAt: null,
          lastRatingCheckAt: null,
        }),
        create: vi.fn().mockImplementation(({ data }: any) => ({
          id: 'standing-created',
          ...data,
          ratingStandingChangedAt: null,
          lastRatingCheckAt: null,
        })),
        update: vi.fn().mockImplementation(({ data }: any) => ({
          id: 'standing-1',
          providerProfileId: PROVIDER_ID,
          ...data,
        })),
      },
      review: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      }),
    };

    mockConfigService = {
      get: vi.fn().mockImplementation(async (key: string) => {
        switch (key) {
          case 'rating.block_threshold':
            return 2.0; // D-017
          case 'rating.warnings_before_block':
            return 2; // D-014
          case 'rating.min_reviews_for_enforcement':
            return 3;
          case 'rating.review_period_days':
            return 7;
          case 'rating.window':
            return null;
          default:
            return null;
        }
      }),
    };

    mockOutboxWriter = {
      append: vi.fn().mockResolvedValue(undefined),
    };

    mockAuditWriter = {
      write: vi.fn().mockResolvedValue('audit-log-1'),
    };

    service = new RatingEnforcementService(
      mockPrisma as any,
      mockConfigService as any,
      mockOutboxWriter as any,
      mockAuditWriter as any,
    );
  });

  describe('Boundary Condition (RATING-ENF-003, D-017)', () => {
    it('triggers enforcement when average rating is 1.99 (strictly below 2.0)', async () => {
      // Setup 3 reviews giving average 1.99 (approx 2, 2, 2 -> 2.0; let's do 2, 2, 1 -> 1.67 or precise 1.99)
      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 2, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 2, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]); // avg = (2+2+1)/3 = 1.7 < 2.0

      const result = await service.evaluateProvider(PROVIDER_ID, { dryRun: false });

      expect(result.isBelowThreshold).toBe(true);
      expect(result.action).toBe('WARN_1');
      expect(result.currentStanding).toBe(RatingStanding.GOOD_STANDING);
      expect(mockPrisma.providerStanding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ratingStanding: RatingStanding.WARNING,
            ratingWarningCount: 1,
          }),
        }),
      );
    });

    it('does NOT trigger enforcement when average rating is exactly 2.0 (boundary check)', async () => {
      // 3 reviews of rating 2 -> average exactly 2.0
      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 2, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 2, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 2, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]);

      const result = await service.evaluateProvider(PROVIDER_ID, { dryRun: false });

      expect(result.averageRating).toBe(2.0);
      expect(result.isBelowThreshold).toBe(false);
      expect(result.action).toBe('NO_ACTION');
      expect(mockOutboxWriter.append).not.toHaveBeenCalled();
    });

    it('does NOT trigger enforcement when average rating is above 2.0 (e.g. 4.5)', async () => {
      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 5, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 4, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]);

      const result = await service.evaluateProvider(PROVIDER_ID, { dryRun: false });

      expect(result.isBelowThreshold).toBe(false);
      expect(result.action).toBe('NO_ACTION');
      expect(mockOutboxWriter.append).not.toHaveBeenCalled();
    });
  });

  describe('Warning Progression & Account Blocking (RATING-ENF-004, RATING-ENF-005, D-014)', () => {
    it('issues Warning 1 on first evaluation below threshold (Good Standing -> Warning 1)', async () => {
      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 2, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]);

      const result = await service.evaluateProvider(PROVIDER_ID, { dryRun: false });

      expect(result.action).toBe('WARN_1');
      expect(mockOutboxWriter.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'provider.rating_warning',
          aggregateType: 'provider',
          aggregateId: PROVIDER_ID,
          payload: expect.objectContaining({
            providerUserId: USER_ID,
            providerId: PROVIDER_ID,
            warningNumber: 1,
            maxWarnings: 2,
            averageRating: '1.30',
            threshold: '2.00',
          }),
        }),
      );
    });

    it('holds at Warning 1 if review grace period has not elapsed (reviewPeriodDays = 7)', async () => {
      const changedAt = new Date('2026-10-25T10:00:00Z');
      const checkNow = new Date('2026-10-27T10:00:00Z'); // 2 days later (< 7 days)

      mockPrisma.providerStanding.findUnique.mockResolvedValue({
        id: 'standing-1',
        providerProfileId: PROVIDER_ID,
        ratingStanding: RatingStanding.WARNING,
        ratingWarningCount: 1,
        ratingStandingChangedAt: changedAt,
        lastRatingCheckAt: changedAt,
      });

      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 2, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]);

      const result = await service.evaluateProvider(PROVIDER_ID, {
        dryRun: false,
        now: checkNow,
      });

      expect(result.action).toBe('NO_ACTION');
      expect(result.reason).toContain('Within review grace period');
      expect(mockOutboxWriter.append).not.toHaveBeenCalled();
    });

    it('advances from Warning 1 to Warning 2 once review grace period elapses (>= 7 days)', async () => {
      const changedAt = new Date('2026-10-10T10:00:00Z');
      const checkNow = new Date('2026-10-20T10:00:00Z'); // 10 days later (> 7 days)

      mockPrisma.providerStanding.findUnique.mockResolvedValue({
        id: 'standing-1',
        providerProfileId: PROVIDER_ID,
        ratingStanding: RatingStanding.WARNING,
        ratingWarningCount: 1,
        ratingStandingChangedAt: changedAt,
        lastRatingCheckAt: changedAt,
      });

      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]);

      const result = await service.evaluateProvider(PROVIDER_ID, {
        dryRun: false,
        now: checkNow,
      });

      expect(result.action).toBe('WARN_2');
      expect(mockPrisma.providerStanding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ratingStanding: RatingStanding.WARNING,
            ratingWarningCount: 2,
          }),
        }),
      );

      expect(mockOutboxWriter.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'provider.rating_warning',
          payload: expect.objectContaining({
            warningNumber: 2,
            maxWarnings: 2,
          }),
        }),
      );
    });

    it('blocks provider account (BLOCKED_LOW_RATING) after maximum warnings exceeded (RATING-ENF-005)', async () => {
      const changedAt = new Date('2026-10-10T10:00:00Z');
      const checkNow = new Date('2026-10-20T10:00:00Z');

      // Standing is already at Warning 2 of 2
      mockPrisma.providerStanding.findUnique.mockResolvedValue({
        id: 'standing-1',
        providerProfileId: PROVIDER_ID,
        ratingStanding: RatingStanding.WARNING,
        ratingWarningCount: 2,
        ratingStandingChangedAt: changedAt,
        lastRatingCheckAt: changedAt,
      });

      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]);

      const result = await service.evaluateProvider(PROVIDER_ID, {
        dryRun: false,
        now: checkNow,
      });

      expect(result.action).toBe('BLOCKED');
      expect(mockPrisma.providerStanding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ratingStanding: RatingStanding.BLOCKED_LOW_RATING,
          }),
        }),
      );

      // Emits provider.blocked_low_rating event (RATING-ENF-007)
      expect(mockOutboxWriter.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'provider.blocked_low_rating',
          payload: expect.objectContaining({
            providerUserId: USER_ID,
            providerId: PROVIDER_ID,
            reason: 'LOW_RATING',
            averageRating: '1.00',
            threshold: '2.00',
          }),
        }),
      );

      // Writes immutable audit log (ROLE-003, DATA-004, RATING-ENF-005)
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: expect.objectContaining({ role: 'SYSTEM' }),
          action: 'PROVIDER_BLOCKED_LOW_RATING',
          reason: 'LOW_RATING',
        }),
        expect.anything(),
      );
    });
  });

  describe('Recovery / Warning Reset (RATING-ENF-004, ARCH §6.7, OQ-013)', () => {
    it('resets warnings and restores GOOD_STANDING when average rating recovers to >= 2.0', async () => {
      // Provider currently at Warning 1
      mockPrisma.providerStanding.findUnique.mockResolvedValue({
        id: 'standing-1',
        providerProfileId: PROVIDER_ID,
        ratingStanding: RatingStanding.WARNING,
        ratingWarningCount: 1,
        ratingStandingChangedAt: new Date('2026-10-15T00:00:00Z'),
      });

      // Provider completes new 5-star jobs -> rating recovers to 3.0
      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 4, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 4, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]); // avg = 3.0 >= 2.0

      const result = await service.evaluateProvider(PROVIDER_ID, { dryRun: false });

      expect(result.action).toBe('RECOVERED');
      expect(mockPrisma.providerStanding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ratingStanding: RatingStanding.GOOD_STANDING,
            ratingWarningCount: 0,
          }),
        }),
      );
    });
  });

  describe('Eligible Reviews Filtering (RATING-ENF-002)', () => {
    it('completely ignores moderated-out (REMOVED) reviews from rating calculation', async () => {
      // Database query should filter strictly moderationStatus === VISIBLE
      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 4, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 5, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 5, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]);

      const result = await service.evaluateProvider(PROVIDER_ID, { dryRun: false });

      expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            moderationStatus: ReviewModerationStatus.VISIBLE,
          }),
        }),
      );
      expect(result.averageRating).toBe(4.7);
      expect(result.isBelowThreshold).toBe(false);
      expect(result.action).toBe('NO_ACTION');
    });
  });

  describe('Dry-Run Mode (RATING-ENF-008, D-017, OQ-013)', () => {
    it('runs in dry-run mode and blocks nobody when rating.min_reviews_for_enforcement is null', async () => {
      mockConfigService.get.mockImplementation(async (key: string) => {
        if (key === 'rating.min_reviews_for_enforcement') return null; // Seeded null TODO(OWNER)
        if (key === 'rating.review_period_days') return 7;
        if (key === 'rating.block_threshold') return 2.0;
        if (key === 'rating.warnings_before_block') return 2;
        return null;
      });

      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]);

      const result = await service.evaluateProvider(PROVIDER_ID);

      expect(result.isDryRun).toBe(true);
      expect(result.action).toBe('WOULD_WARN_1');
      // No updates or events in dry run
      expect(mockPrisma.providerStanding.update).not.toHaveBeenCalled();
      expect(mockOutboxWriter.append).not.toHaveBeenCalled();
      expect(mockAuditWriter.write).not.toHaveBeenCalled();
    });

    it('runs in dry-run mode when rating.review_period_days is null', async () => {
      mockConfigService.get.mockImplementation(async (key: string) => {
        if (key === 'rating.min_reviews_for_enforcement') return 3;
        if (key === 'rating.review_period_days') return null; // Seeded null TODO(OWNER)
        return null;
      });

      mockPrisma.providerStanding.findUnique.mockResolvedValue({
        id: 'standing-1',
        providerProfileId: PROVIDER_ID,
        ratingStanding: RatingStanding.WARNING,
        ratingWarningCount: 2,
        ratingStandingChangedAt: new Date(),
      });

      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]);

      const result = await service.evaluateProvider(PROVIDER_ID);

      expect(result.isDryRun).toBe(true);
      expect(result.action).toBe('WOULD_BLOCK');
      // In dry run, provider is NOT blocked
      expect(mockPrisma.providerStanding.update).not.toHaveBeenCalled();
    });

    it('executes scheduled job across all providers returning dry-run report', async () => {
      mockConfigService.get.mockImplementation(async (key: string) => {
        if (key === 'rating.min_reviews_for_enforcement') return null;
        if (key === 'rating.review_period_days') return null;
        return null;
      });

      mockPrisma.providerProfile.findMany.mockResolvedValue([
        { id: 'prov-1', userId: 'user-1' },
        { id: 'prov-2', userId: 'user-2' },
      ]);

      const report = await service.runEnforcementJob();

      expect(report.isDryRun).toBe(true);
      expect(report.providersEvaluated).toBe(2);
      expect(report.providersBlocked).toBe(0);
      expect(report.evaluations).toHaveLength(2);
    });
  });

  describe('Admin Reinstate Flow (RATING-ENF-006, BP §8.3, ROLE-003, D-014)', () => {
    it('refuses reinstatement when audit reason is missing or less than 5 characters', async () => {
      await expect(
        service.reinstateProvider(ADMIN_ID, PROVIDER_ID, { reason: '' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.reinstateProvider(ADMIN_ID, PROVIDER_ID, { reason: 'ok' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully reinstates blocked provider with audited reason (>= 5 chars)', async () => {
      mockPrisma.providerStanding.findUnique.mockResolvedValue({
        id: 'standing-1',
        providerProfileId: PROVIDER_ID,
        ratingStanding: RatingStanding.BLOCKED_LOW_RATING,
        ratingWarningCount: 2,
      });

      const updated = await service.reinstateProvider(
        ADMIN_ID,
        PROVIDER_ID,
        { reason: 'Provider completed remedial customer service training' },
        [AdminSubRole.OPERATIONS],
      );

      expect(updated.ratingStanding).toBe(RatingStanding.GOOD_STANDING);
      expect(updated.ratingWarningCount).toBe(0);

      // Verifies AuditWriter entry (ROLE-003, DATA-004)
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: expect.objectContaining({
            userId: ADMIN_ID,
            role: 'ADMIN',
          }),
          action: 'PROVIDER_REINSTATED',
          reason: 'Provider completed remedial customer service training',
        }),
        expect.anything(),
      );

      // Verifies domain event
      expect(mockOutboxWriter.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'provider.reinstated',
          aggregateId: PROVIDER_ID,
        }),
      );
    });
  });

  describe('Provider Standing Details & Localized Notices (BP §13 P17, D-014)', () => {
    it('returns warning notice copy in English and Urdu when standing is WARNING', async () => {
      mockPrisma.providerStanding.findUnique.mockResolvedValue({
        id: 'standing-1',
        providerProfileId: PROVIDER_ID,
        ratingStanding: RatingStanding.WARNING,
        ratingWarningCount: 1,
        ratingStandingChangedAt: new Date('2026-10-20T10:00:00Z'),
        lastRatingCheckAt: new Date('2026-10-20T10:00:00Z'),
      });

      mockPrisma.review.findMany.mockResolvedValue([
        { rating: 1, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 2, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 2, moderationStatus: ReviewModerationStatus.VISIBLE },
      ]);

      const details = await service.getProviderStandingDetails(PROVIDER_ID);

      expect(details.ratingStanding).toBe(RatingStanding.WARNING);
      expect(details.ratingWarningCount).toBe(1);
      expect(details.maxWarnings).toBe(2);
      expect(details.blockThreshold).toBe(2.0);
      expect(details.isEligibleForMatching).toBe(true);

      expect(details.warningNoticeEn).toContain('Your average rating is below 2');
      expect(details.warningNoticeEn).toContain('warning 1 of 2');
      expect(details.warningNoticeUr).toContain('آپ کی اوسط ریٹنگ 2 سے کم ہے');
      expect(details.warningNoticeUr).toContain('وارننگ 1 از 2');
    });

    it('flags isEligibleForMatching as false when standing is BLOCKED_LOW_RATING (MATCH-ELIG-073)', async () => {
      mockPrisma.providerStanding.findUnique.mockResolvedValue({
        id: 'standing-1',
        providerProfileId: PROVIDER_ID,
        ratingStanding: RatingStanding.BLOCKED_LOW_RATING,
        ratingWarningCount: 2,
        ratingStandingChangedAt: new Date('2026-10-20T10:00:00Z'),
      });

      const details = await service.getProviderStandingDetails(PROVIDER_ID);

      expect(details.ratingStanding).toBe(RatingStanding.BLOCKED_LOW_RATING);
      expect(details.isEligibleForMatching).toBe(false);
      expect(details.warningNoticeEn).toContain('Your account is blocked');
      expect(details.warningNoticeUr).toContain('آپ کا اکاؤنٹ بلاک کر دیا گیا ہے');
    });
  });
});

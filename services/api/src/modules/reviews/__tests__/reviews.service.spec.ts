/**
 * Comprehensive Unit Tests for ReviewsService and Canonical Rating Calculation.
 * Requirements: REV-001..007, OPS-ADMIN-011, RATING-ENF-001..002, CFG-RULE-009, ROLE-003.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  UnprocessableEntityException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ReviewsService } from '../reviews.service.js';
import { computePublicRating } from '../rating.util.js';
import {
  BookingStatus,
  ReviewFlagStatus,
  ReviewModerationStatus,
  AdminSubRole,
} from '../../../generated/prisma/client.js';

describe('ReviewsModule (T7.3, REV-001..007)', () => {
  let service: ReviewsService;
  let mockPrisma: any;
  let mockConfigService: any;
  let mockOutboxWriter: any;
  let mockAuditWriter: any;

  beforeEach(() => {
    mockPrisma = {
      booking: {
        findUnique: vi.fn(),
      },
      review: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      providerProfile: {
        findUnique: vi.fn(),
      },
      reviewFlag: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(mockPrisma);
        }
        return Promise.all(cb);
      }),
    };

    mockConfigService = {
      get: vi.fn().mockResolvedValue({ status: 'unconfigured' }),
    };

    mockOutboxWriter = {
      append: vi.fn().mockResolvedValue({ id: 'outbox-1' }),
    };

    mockAuditWriter = {
      write: vi.fn().mockResolvedValue('audit-log-1'),
    };

    service = new ReviewsService(mockPrisma, mockConfigService, mockOutboxWriter, mockAuditWriter);
  });

  describe('REV-006 & RATING-ENF-002: Canonical Public Rating Calculation', () => {
    it('returns null average and 0 count when no reviews exist', () => {
      const res = computePublicRating([]);
      expect(res.averageRating).toBeNull();
      expect(res.ratingCount).toBe(0);
    });

    it('computes exact arithmetic mean rounded to 1 decimal place', () => {
      const reviews = [
        { rating: 5, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 4, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 4, moderationStatus: ReviewModerationStatus.VISIBLE },
      ];
      // (5 + 4 + 4) / 3 = 4.3333... -> 4.3
      const res = computePublicRating(reviews);
      expect(res.averageRating).toBe(4.3);
      expect(res.ratingCount).toBe(3);
    });

    it('excludes reviews with moderationStatus !== VISIBLE (REMOVED, FLAGGED, PENDING)', () => {
      const reviews = [
        { rating: 5, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 5, moderationStatus: ReviewModerationStatus.VISIBLE },
        { rating: 1, moderationStatus: ReviewModerationStatus.REMOVED }, // excluded
        { rating: 1, moderationStatus: ReviewModerationStatus.FLAGGED }, // excluded
        { rating: 1, moderationStatus: ReviewModerationStatus.PENDING_MODERATION }, // excluded
      ];
      // (5 + 5) / 2 = 5.0
      const res = computePublicRating(reviews);
      expect(res.averageRating).toBe(5.0);
      expect(res.ratingCount).toBe(2);
    });

    it('handles all removed reviews gracefully by returning null', () => {
      const reviews = [
        { rating: 1, moderationStatus: ReviewModerationStatus.REMOVED },
        { rating: 2, moderationStatus: ReviewModerationStatus.REMOVED },
      ];
      const res = computePublicRating(reviews);
      expect(res.averageRating).toBeNull();
      expect(res.ratingCount).toBe(0);
    });
  });

  describe('REV-001, REV-002, REV-007, RATING-ENF-001: Submit Review', () => {
    const validBooking = {
      id: 'b-100',
      status: BookingStatus.COMPLETED,
      providerProfileId: 'prov-profile-1',
      customerProfileId: 'cust-profile-1',
      customerProfile: { userId: 'user-customer-1' },
      updatedAt: new Date(),
    };

    it('rejects ratings outside 1–5 with UnprocessableEntityException (422)', async () => {
      await expect(
        service.submitReview('user-customer-1', {
          bookingId: 'b-100',
          rating: 0,
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      await expect(
        service.submitReview('user-customer-1', {
          bookingId: 'b-100',
          rating: 6,
        }),
      ).rejects.toThrow(UnprocessableEntityException);

      await expect(
        service.submitReview('user-customer-1', {
          bookingId: 'b-100',
          rating: 4.5,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects review on non-existent booking with NotFoundException (404)', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.submitReview('user-customer-1', {
          bookingId: 'non-existent',
          rating: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects review if caller is not the booking customer with ForbiddenException (403) (REV-007)', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(validBooking);

      await expect(
        service.submitReview('impostor-user', {
          bookingId: 'b-100',
          rating: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects review on non-Completed booking with ConflictException NOT_COMPLETED (409) (REV-001)', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...validBooking,
        status: BookingStatus.IN_PROGRESS,
      });

      await expect(
        service.submitReview('user-customer-1', {
          bookingId: 'b-100',
          rating: 5,
        }),
      ).rejects.toThrow(new ConflictException('NOT_COMPLETED'));
    });

    it('rejects second review for same booking with ConflictException ALREADY_REVIEWED (409) (REV-001, D-014)', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(validBooking);
      mockPrisma.review.findUnique.mockResolvedValue({ id: 'existing-rev-1' });

      await expect(
        service.submitReview('user-customer-1', {
          bookingId: 'b-100',
          rating: 5,
        }),
      ).rejects.toThrow(new ConflictException('ALREADY_REVIEWED'));
    });

    it('rejects review if eligibility window expired with ConflictException REVIEW_WINDOW_CLOSED (CFG-RULE-009)', async () => {
      // 14 days window configured
      mockConfigService.get.mockResolvedValue({
        status: 'configured',
        value: 14,
      });

      const oldBooking = {
        ...validBooking,
        // Completed 20 days ago
        updatedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
      };
      mockPrisma.booking.findUnique.mockResolvedValue(oldBooking);
      mockPrisma.review.findUnique.mockResolvedValue(null);

      await expect(
        service.submitReview('user-customer-1', {
          bookingId: 'b-100',
          rating: 5,
        }),
      ).rejects.toThrow(new ConflictException('REVIEW_WINDOW_CLOSED'));
    });

    it('accepts review without text (rating only) (REV-002)', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(validBooking);
      mockPrisma.review.findUnique.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue({
        id: 'rev-new-1',
        bookingId: 'b-100',
        providerProfileId: 'prov-profile-1',
        customerProfileId: 'cust-profile-1',
        rating: 5,
        tags: [],
        text: null,
        moderationStatus: ReviewModerationStatus.VISIBLE,
        providerResponse: null,
        providerRespondedAt: null,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.submitReview('user-customer-1', {
        bookingId: 'b-100',
        rating: 5,
      });

      expect(res.id).toBe('rev-new-1');
      expect(res.rating).toBe(5);
      expect(res.text).toBeNull();
      expect(mockOutboxWriter.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'review.created',
          aggregateType: 'review',
          payload: expect.objectContaining({
            rating: 5,
            hasText: false,
          }),
        }),
      );
    });

    it('accepts full review with rating, structured tags, and text (REV-001, REV-002)', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(validBooking);
      mockPrisma.review.findUnique.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue({
        id: 'rev-new-2',
        bookingId: 'b-100',
        providerProfileId: 'prov-profile-1',
        customerProfileId: 'cust-profile-1',
        rating: 4,
        tags: ['Punctual', 'Clean work'],
        text: 'Great plumber, very neat work and on time.',
        moderationStatus: ReviewModerationStatus.VISIBLE,
        providerResponse: null,
        providerRespondedAt: null,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.submitReview('user-customer-1', {
        bookingId: 'b-100',
        rating: 4,
        tags: ['Punctual', 'Clean work'],
        text: 'Great plumber, very neat work and on time.',
      });

      expect(res.id).toBe('rev-new-2');
      expect(res.rating).toBe(4);
      expect(res.tags).toEqual(['Punctual', 'Clean work']);
      expect(res.text).toContain('Great plumber');
    });
  });

  describe('REV-003: Provider Response to Review', () => {
    const existingReview = {
      id: 'rev-1',
      bookingId: 'b-100',
      providerProfileId: 'prov-profile-1',
      customerProfileId: 'cust-profile-1',
      rating: 4,
      tags: [],
      text: 'Good job.',
      moderationStatus: ReviewModerationStatus.VISIBLE,
      providerResponse: null,
      providerRespondedAt: null,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('allows the provider of the booking to respond', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(existingReview);
      mockPrisma.providerProfile.findUnique.mockResolvedValue({
        id: 'prov-profile-1',
        userId: 'provider-user-1',
      });
      mockPrisma.review.update.mockResolvedValue({
        ...existingReview,
        providerResponse: 'Thank you for your feedback!',
        providerRespondedAt: new Date(),
      });

      const res = await service.respondToReview('provider-user-1', 'rev-1', {
        text: 'Thank you for your feedback!',
      });

      expect(res.providerResponse).toBe('Thank you for your feedback!');
      expect(mockOutboxWriter.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'review.response_created',
          aggregateType: 'review',
        }),
      );
    });

    it('rejects response from non-owner provider with ForbiddenException (403)', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(existingReview);
      mockPrisma.providerProfile.findUnique.mockResolvedValue({
        id: 'prov-profile-1',
        userId: 'provider-user-1',
      });

      await expect(
        service.respondToReview('impostor-provider', 'rev-1', {
          text: 'Thanks!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects duplicate response with ConflictException ALREADY_RESPONDED (409)', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        ...existingReview,
        providerResponse: 'Already replied previously',
      });
      mockPrisma.providerProfile.findUnique.mockResolvedValue({
        id: 'prov-profile-1',
        userId: 'provider-user-1',
      });

      await expect(
        service.respondToReview('provider-user-1', 'rev-1', {
          text: 'Second reply',
        }),
      ).rejects.toThrow(new ConflictException('ALREADY_RESPONDED'));
    });
  });

  describe('REV-004: Flag / Report Review', () => {
    it('creates flag in moderation queue and transitions review status to FLAGGED', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-bad-1',
        moderationStatus: ReviewModerationStatus.VISIBLE,
      });

      mockPrisma.reviewFlag.create.mockResolvedValue({
        id: 'flag-1',
        reviewId: 'rev-bad-1',
        flaggedByUserId: 'user-reporter-1',
        reason: 'Offensive language used in review',
        status: ReviewFlagStatus.OPEN,
        createdAt: new Date(),
      });

      const res = await service.flagReview('user-reporter-1', 'rev-bad-1', {
        reason: 'Offensive language used in review',
      });

      expect(res.id).toBe('flag-1');
      expect(res.status).toBe(ReviewFlagStatus.OPEN);
      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-bad-1' },
        data: { moderationStatus: ReviewModerationStatus.FLAGGED },
      });
      expect(mockOutboxWriter.append).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'review.flagged',
        }),
      );
    });

    it('rejects empty flag reason with UnprocessableEntityException (422)', async () => {
      await expect(service.flagReview('user-1', 'rev-1', { reason: '   ' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('REV-005, RATING-ENF-002, ROLE-003, OPS-ADMIN-011: Moderation Queue Decisions', () => {
    const openFlag = {
      id: 'flag-1',
      reviewId: 'rev-bad-1',
      status: ReviewFlagStatus.OPEN,
      reason: 'Harassment',
      review: {
        id: 'rev-bad-1',
        moderationStatus: ReviewModerationStatus.FLAGGED,
      },
    };

    it('rejects decision without mandatory audit reason (<5 chars) with UnprocessableEntityException (ROLE-003)', async () => {
      await expect(
        service.decideModerationFlag('staff-1', [AdminSubRole.RISK_TRUST], 'flag-1', {
          action: 'HIDE',
          reason: 'bad',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('hides review on HIDE action, setting status to REMOVED and flag to UPHELD', async () => {
      mockPrisma.reviewFlag.findUnique.mockResolvedValue(openFlag);

      const res = await service.decideModerationFlag(
        'staff-1',
        [AdminSubRole.RISK_TRUST],
        'flag-1',
        {
          action: 'HIDE',
          reason: 'Violates platform anti-harassment policy BP §19',
        },
      );

      expect(res.status).toBe(ReviewFlagStatus.UPHELD);
      expect(res.reviewModerationStatus).toBe(ReviewModerationStatus.REMOVED);
      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-bad-1' },
        data: { moderationStatus: ReviewModerationStatus.REMOVED },
      });
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'staff-1',
          action: 'REVIEW_HIDE',
          objectType: 'Review',
          objectId: 'rev-bad-1',
          reason: 'Violates platform anti-harassment policy BP §19',
        }),
        expect.anything(),
      );
    });

    it('keeps review visible on KEEP action, setting status to VISIBLE and flag to DISMISSED', async () => {
      mockPrisma.reviewFlag.findUnique.mockResolvedValue(openFlag);

      const res = await service.decideModerationFlag(
        'staff-1',
        [AdminSubRole.RISK_TRUST],
        'flag-1',
        {
          action: 'KEEP',
          reason: 'Review is genuine feedback and does not contain private data',
        },
      );

      expect(res.status).toBe(ReviewFlagStatus.DISMISSED);
      expect(res.reviewModerationStatus).toBe(ReviewModerationStatus.VISIBLE);
      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-bad-1' },
        data: { moderationStatus: ReviewModerationStatus.VISIBLE },
      });
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REVIEW_KEEP',
          reason: 'Review is genuine feedback and does not contain private data',
        }),
        expect.anything(),
      );
    });

    it('rejects re-deciding an already decided flag with ConflictException ALREADY_DECIDED (409)', async () => {
      mockPrisma.reviewFlag.findUnique.mockResolvedValue({
        ...openFlag,
        status: ReviewFlagStatus.UPHELD,
      });

      await expect(
        service.decideModerationFlag('staff-1', [AdminSubRole.RISK_TRUST], 'flag-1', {
          action: 'HIDE',
          reason: 'Valid audit reason here',
        }),
      ).rejects.toThrow(new ConflictException('ALREADY_DECIDED'));
    });
  });
});

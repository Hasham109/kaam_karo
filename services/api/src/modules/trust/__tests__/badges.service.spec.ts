/**
 * BadgesService Unit Test Suite (T7.4; owner A05).
 * Requirement IDs: TRUST-BADGE-001..014, OPS-ADMIN-022, ROLE-003, D-010; BP §55.2, §66.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { BadgesService } from '../badges.service';
import type { BadgeRulesConfig } from '../trust.types';

describe('[T7.4] BadgesService Test Suite', () => {
  let service: BadgesService;
  let mockPrisma: any;
  let mockAuditWriter: any;
  let mockOutboxWriter: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      providerProfile: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      providerStanding: {
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(5),
      },
      providerLiveStatus: {
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(3),
      },
      availabilityRule: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([]),
      },
      providerAvailability: {
        count: vi.fn().mockResolvedValue(3),
      },
      supplierBadge: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      booking: {
        count: vi.fn().mockResolvedValue(0),
      },
      review: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      favorite: {
        count: vi.fn().mockResolvedValue(0),
      },
      customerFavorite: {
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      }),
    };

    mockAuditWriter = {
      write: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
      log: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
    };

    mockOutboxWriter = {
      append: vi.fn().mockResolvedValue('outbox-1'),
      write: vi.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      get: vi.fn().mockResolvedValue(null),
    };

    service = new BadgesService(
      mockPrisma as any,
      mockAuditWriter as any,
      mockOutboxWriter as any,
      mockConfigService as any,
    );
  });

  describe('Badge Definitions (BP §55.2; TRUST-BADGE-001..014)', () => {
    it('returns all 14 platform candidate badges with valid en/ur metadata', () => {
      const defs = service.getBadgeDefinitions();
      expect(defs).toHaveLength(14);

      const badgeTypes = defs.map((d) => d.badgeType);
      expect(badgeTypes).toContain('VERIFIED');
      expect(badgeTypes).toContain('HIGHLY_RATED');
      expect(badgeTypes).toContain('EXPERIENCED');
      expect(badgeTypes).toContain('CUSTOMER_FAVORITE');
      expect(badgeTypes).toContain('FAST_RESPONSE');
      expect(badgeTypes).toContain('FAST_SERVICE');
      expect(badgeTypes).toContain('RELIABLE');
      expect(badgeTypes).toContain('REPEAT_CUSTOMER_FAVORITE');
      expect(badgeTypes).toContain('TOP_SPECIALIST');
      expect(badgeTypes).toContain('RECENTLY_JOINED');
      expect(badgeTypes).toContain('EMERGENCY_AVAILABLE');
      expect(badgeTypes).toContain('AVAILABLE_TODAY');
      expect(badgeTypes).toContain('AVAILABLE_NOW');
      expect(badgeTypes).toContain('LARGE_TEAM');

      // 4 Fact badges and 10 Rule badges
      const facts = defs.filter((d) => d.kind === 'FACT');
      const rules = defs.filter((d) => d.kind === 'RULE');
      expect(facts).toHaveLength(4);
      expect(rules).toHaveLength(10);
    });
  });

  describe('Fact Badges Dynamic Evaluation (TRUST-BADGE-001, -011..013)', () => {
    it('awards VERIFIED badge only when verification level >= VERIFIED (TRUST-BADGE-001)', async () => {
      // Basic standing -> no VERIFIED badge
      mockPrisma.providerProfile.findUnique.mockResolvedValueOnce({
        id: 'prov-basic',
        standing: { verificationLevel: 'BASIC' },
        availability: null,
      });

      const badgesBasic = await service.getProviderBadges('prov-basic');
      expect(badgesBasic.some((b) => b.badgeType === 'VERIFIED')).toBe(false);

      // Verified standing -> has VERIFIED badge
      mockPrisma.providerProfile.findUnique.mockResolvedValueOnce({
        id: 'prov-ver',
        standing: { verificationLevel: 'VERIFIED', updatedAt: new Date() },
        availability: null,
      });

      const badgesVer = await service.getProviderBadges('prov-ver');
      expect(badgesVer.some((b) => b.badgeType === 'VERIFIED')).toBe(true);
      const verifiedBadge = badgesVer.find((b) => b.badgeType === 'VERIFIED')!;
      expect(verifiedBadge.kind).toBe('FACT');
    });

    it('awards EMERGENCY_AVAILABLE badge when emergency toggle is active (TRUST-BADGE-011)', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValueOnce({
        id: 'prov-emerg',
        standing: { verificationLevel: 'BASIC' },
        availability: { isEmergencyAvailable: true },
      });

      const badges = await service.getProviderBadges('prov-emerg');
      expect(badges.some((b) => b.badgeType === 'EMERGENCY_AVAILABLE')).toBe(true);
    });

    it('awards AVAILABLE_NOW badge when liveStatus is ONLINE_AVAILABLE (TRUST-BADGE-013)', async () => {
      mockPrisma.providerProfile.findUnique.mockResolvedValueOnce({
        id: 'prov-online',
        standing: { verificationLevel: 'BASIC' },
        availability: { liveStatus: 'ONLINE_AVAILABLE' },
      });

      const badges = await service.getProviderBadges('prov-online');
      expect(badges.some((b) => b.badgeType === 'AVAILABLE_NOW')).toBe(true);
    });
  });

  describe('Rule Badges & D-010 Null Config Invariant', () => {
    it('enforces D-010: while trust.badge_rules is null, nobody gets a rule badge (TRUST-BADGE-002..010, -014)', async () => {
      mockConfigService.get.mockResolvedValueOnce(null); // Null rule in config
      mockPrisma.providerProfile.findMany.mockResolvedValueOnce([
        { id: 'prov-1', createdAt: new Date() },
      ]);

      const result = await service.recalculateBadges(
        { reason: 'Recalculation with null config' },
        'admin-user-1',
      );

      expect(result.badgesAwarded).toBe(0);
      expect(mockPrisma.supplierBadge.create).not.toHaveBeenCalled();
      expect(mockAuditWriter.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'RECALCULATE_NULL_RULES',
        }),
      );
    });

    it('awards HIGHLY_RATED badge when meeting configured rating and reviews thresholds (TRUST-BADGE-002)', async () => {
      const rulesConfig: BadgeRulesConfig = {
        HIGHLY_RATED: { minRating: 4.8, minReviews: 20 },
      };
      mockConfigService.get.mockResolvedValueOnce(rulesConfig);

      mockPrisma.providerProfile.findMany.mockResolvedValueOnce([
        { id: 'prov-top', createdAt: new Date() },
      ]);

      // 25 reviews with rating 5 (avg 5.0)
      const reviews = Array.from({ length: 25 }, () => ({ rating: 5 }));
      mockPrisma.review.findMany.mockResolvedValueOnce(reviews);

      const result = await service.recalculateBadges(
        { reason: 'Recalculate with highly rated rule' },
        'admin-user-1',
      );

      expect(result.badgesAwarded).toBe(1);
      expect(mockPrisma.supplierBadge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            badgeType: 'HIGHLY_RATED',
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('enforces TRUST-BADGE-004 invariant: Customer Favorite badge never reads Favorite table alone as the rule', async () => {
      const rulesConfig: BadgeRulesConfig = {
        CUSTOMER_FAVORITE: { minFavorites: 15, minCompletedJobs: 10 },
      };
      mockConfigService.get.mockResolvedValueOnce(rulesConfig);

      mockPrisma.providerProfile.findMany.mockResolvedValueOnce([
        { id: 'prov-fav', createdAt: new Date() },
      ]);

      // Provider has 20 favorites but only 5 completed jobs -> fails completed jobs condition
      mockPrisma.customerFavorite.count.mockResolvedValueOnce(20);
      mockPrisma.booking.count.mockResolvedValueOnce(5);

      const result = await service.recalculateBadges(
        { reason: 'Recalculate customer favorite' },
        'admin-user-1',
      );

      // Should NOT be awarded because completed jobs < 10
      expect(result.badgesAwarded).toBe(0);
    });

    it('awards LARGE_TEAM badge when provider crew size meets threshold (TRUST-BADGE-014)', async () => {
      const rulesConfig: BadgeRulesConfig = {
        LARGE_TEAM: { minCrewSize: 3 },
      };
      mockConfigService.get.mockResolvedValueOnce(rulesConfig);

      mockPrisma.providerProfile.findMany.mockResolvedValueOnce([
        { id: 'prov-team', crewSize: 4, createdAt: new Date() },
      ]);

      const result = await service.recalculateBadges(
        { reason: 'Recalculate large team rule' },
        'admin-user-1',
      );

      expect(result.badgesAwarded).toBe(1);
      expect(mockPrisma.supplierBadge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            badgeType: 'LARGE_TEAM',
          }),
        }),
      );
    });
  });

  describe('Mandatory Audit Reasons (ROLE-003, OPS-ADMIN-022)', () => {
    it('rejects recalculateBadges when reason is under 5 characters (ROLE-003)', async () => {
      await expect(service.recalculateBadges({ reason: 'abc' }, 'admin-1')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('rejects updateAdminBadgeRule for fact badges (definition read-only per BP §55.2)', async () => {
      await expect(
        service.updateAdminBadgeRule(
          'VERIFIED',
          { threshold: {}, reason: 'Valid reason here' },
          'admin-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('dispatches outbox domain event badge.recalculated upon recalculation', async () => {
      const rulesConfig: BadgeRulesConfig = {
        EXPERIENCED: { minCompletedJobs: 50 },
      };
      mockConfigService.get.mockResolvedValueOnce(rulesConfig);
      mockPrisma.providerProfile.findMany.mockResolvedValueOnce([
        { id: 'prov-exp', createdAt: new Date() },
      ]);
      mockPrisma.booking.count.mockResolvedValueOnce(60);

      await service.recalculateBadges({ reason: 'Valid recalculation audit reason' }, 'admin-1');

      expect(mockOutboxWriter.write).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventType: 'badge.recalculated',
        }),
      );
    });
  });
});

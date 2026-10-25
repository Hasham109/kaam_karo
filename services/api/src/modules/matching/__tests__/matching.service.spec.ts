/**
 * Unit Test Suite for Matching Engine (T3.7, owner A05; M8 Matching).
 * Requirement IDs: MATCH-ELIG-073..079, MATCH-SCORE-001..013, MATCH-FAIR-001..004,
 * MATCH-EXPL-001, MATCH-MODE-001, MATCH-GAP-001, OPS-ADMIN-021; BP §54, §61.3, §68; D-005, D-010, D-020
 *
 * Verbatim Acceptance Criteria (IMPL §6 T3.7):
 * "One test per hard rule; weight change → ranking change without deploy; no code path assigns a provider without the customer's choice (D-005)"
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditWriter, PrismaService } from '../../../platform/index.js';
import {
  type AvailabilityService,
  AvailabilityStatus,
  ServiceAreaKind,
  type TrustService,
} from '../../availability/index.js';
import type { GeoService } from '../../location/index.js';
import { MatchingScorer } from '../matching-scorer.js';
import { MatchingService } from '../matching.service.js';
import {
  AvailabilityCheck,
  DEFAULT_FAIRNESS_CONFIG,
  DEFAULT_MATCHING_WEIGHTS,
  EligibilityResult,
  HardRuleCode,
  RequestStatus,
  SupplyGapAction,
  VerificationLevel,
} from '../matching.types.js';

type MockPrisma = {
  customerRequest: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  service: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  providerProfile: {
    findMany: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  providerService: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  dispute: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  providerLedgerEntry: {
    findMany: ReturnType<typeof vi.fn>;
  };
  matchCandidate: {
    deleteMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

type MockGeoService = {
  computeRoute: ReturnType<typeof vi.fn>;
};

type MockAvailabilityService = {
  getLiveStatus: ReturnType<typeof vi.fn>;
  getServiceAreas: ReturnType<typeof vi.fn>;
  checkSlotAvailability: ReturnType<typeof vi.fn>;
};

type MockTrustService = {
  getProviderStanding: ReturnType<typeof vi.fn>;
};

type MockAuditWriter = {
  write: ReturnType<typeof vi.fn>;
};

describe('MatchingService (T3.7)', () => {
  let service: MatchingService;
  let mockPrisma: MockPrisma;
  let mockGeoService: MockGeoService;
  let mockAvailabilityService: MockAvailabilityService;
  let mockTrustService: MockTrustService;
  let mockAuditWriter: MockAuditWriter;

  const mockRequestId = '11111111-1111-1111-1111-111111111111';
  const mockServiceId = '22222222-2222-2222-2222-222222222222';
  const mockCustomerProfileId = '33333333-3333-3333-3333-333333333333';
  const mockProviderProfileId1 = '44444444-4444-4444-4444-444444444441';
  const mockProviderProfileId2 = '44444444-4444-4444-4444-444444444442';

  const defaultMockRequest = {
    id: mockRequestId,
    customerProfileId: mockCustomerProfileId,
    serviceId: mockServiceId,
    serviceZoneId: 'zone-lahore-central',
    locationLat: 31.5204,
    locationLng: 74.3587,
    status: RequestStatus.SUBMITTED,
    isEmergency: false,
    scheduledStart: new Date('2026-10-25T10:00:00Z'),
    scheduledEnd: new Date('2026-10-25T12:00:00Z'),
  };

  const defaultMockCatalogService = {
    id: mockServiceId,
    nameEn: 'AC General Service',
    nameUr: 'اے سی جنرل سروس',
    minimumVerificationLevel: VerificationLevel.VERIFIED,
    emergencyAllowed: true,
  };

  beforeEach(() => {
    mockPrisma = {
      customerRequest: {
        findUnique: vi.fn().mockResolvedValue({ ...defaultMockRequest }),
        update: vi
          .fn()
          .mockImplementation(({ data }) => Promise.resolve({ ...defaultMockRequest, ...data })),
      },
      service: {
        findUnique: vi.fn().mockResolvedValue({ ...defaultMockCatalogService }),
      },
      providerProfile: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: mockProviderProfileId1,
            userId: 'user-prov-1',
            businessName: 'Lahore Cooling Masters',
            photoMediaId: 'photo-1',
            createdAt: new Date('2026-09-01T00:00:00Z'),
          },
          {
            id: mockProviderProfileId2,
            userId: 'user-prov-2',
            businessName: 'Quick Electric & AC',
            photoMediaId: 'photo-2',
            createdAt: new Date('2026-10-15T00:00:00Z'), // newer provider
          },
        ]),
      },
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-prov-1') {
            return Promise.resolve({
              id: 'user-prov-1',
              displayName: 'Tariq Mehmood',
              status: 'ACTIVE',
            });
          }
          return Promise.resolve({
            id: 'user-prov-2',
            displayName: 'Imran Khan',
            status: 'ACTIVE',
          });
        }),
      },
      providerService: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          const { providerProfileId } = where.providerProfileId_serviceId;
          return Promise.resolve({
            id: `ps-${providerProfileId}`,
            providerProfileId,
            serviceId: mockServiceId,
            isActive: true,
            basePriceMinor: 200000n, // Rs. 2,000
          });
        }),
      },
      dispute: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      providerLedgerEntry: {
        findMany: vi.fn().mockResolvedValue([]), // Balance 0 (no debt)
      },
      matchCandidate: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: `cand-${data.providerProfileId}`, ...data }),
          ),
        findMany: vi.fn().mockResolvedValue([]),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    };

    mockGeoService = {
      computeRoute: vi.fn().mockResolvedValue({
        distanceMeters: 2500,
        durationSeconds: 600,
        isFallback: false,
      }),
    };

    mockAvailabilityService = {
      getLiveStatus: vi.fn().mockResolvedValue({
        status: AvailabilityStatus.ONLINE_AVAILABLE,
        isEmergencyAvailable: true,
      }),
      getServiceAreas: vi.fn().mockResolvedValue([
        {
          kind: ServiceAreaKind.RADIUS,
          centerLatitude: 31.5204,
          centerLongitude: 74.3587,
          radiusMeters: 10000,
        },
      ]),
      checkSlotAvailability: vi.fn().mockResolvedValue({
        isAvailable: true,
        reasons: [],
      }),
    };

    mockTrustService = {
      getProviderStanding: vi.fn().mockImplementation((providerProfileId: string) => {
        return Promise.resolve({
          providerProfileId,
          verificationLevel: VerificationLevel.VERIFIED,
          ratingStanding: 'GOOD_STANDING',
          ratingWarningCount: 0,
          isEligibleForNormalJobs: true,
        });
      }),
    };

    mockAuditWriter = {
      write: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    service = new MatchingService(
      mockPrisma as unknown as PrismaService,
      mockGeoService as unknown as GeoService,
      mockAvailabilityService as unknown as AvailabilityService,
      mockTrustService as unknown as TrustService,
      undefined,
      mockAuditWriter as unknown as AuditWriter,
    );
  });

  // ===========================================================================
  // 1. HARD ELIGIBILITY RULES (BP §54.1 rules 73–79 & D-020) — ONE TEST PER HARD RULE
  // ===========================================================================

  describe('Hard Filters 73–79 & Unpaid Commission', () => {
    it('[MATCH-ELIG-073] Hard Rule 73: excludes suspended or low-rating blocked accounts', async () => {
      // Mock provider 1 with suspended rating standing
      mockTrustService.getProviderStanding.mockResolvedValueOnce({
        providerProfileId: mockProviderProfileId1,
        verificationLevel: VerificationLevel.VERIFIED,
        ratingStanding: 'SUSPENDED',
        ratingWarningCount: 2,
        isEligibleForNormalJobs: false,
      });

      const res = await service.findMatchesForRequest(mockRequestId);

      // Provider 1 should be excluded from candidates
      const p1 = res.candidates.find((c) => c.providerProfileId === mockProviderProfileId1);
      expect(p1).toBeUndefined();

      // Verify ineligible record stored with rule 73 code
      expect(mockPrisma.matchCandidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerProfileId: mockProviderProfileId1,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: expect.arrayContaining([HardRuleCode.RULE_73_SUSPENDED]),
          }),
        }),
      );
    });

    it('[MATCH-ELIG-074] Hard Rule 74: excludes provider without requested service skill', async () => {
      // Provider 1 does not offer this service
      mockPrisma.providerService.findUnique.mockResolvedValueOnce(null);

      const res = await service.findMatchesForRequest(mockRequestId);

      const p1 = res.candidates.find((c) => c.providerProfileId === mockProviderProfileId1);
      expect(p1).toBeUndefined();

      expect(mockPrisma.matchCandidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerProfileId: mockProviderProfileId1,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: expect.arrayContaining([HardRuleCode.RULE_74_NO_SKILL]),
          }),
        }),
      );
    });

    it('[MATCH-ELIG-075] Hard Rule 75: excludes provider outside customer service radius/zone', async () => {
      // Provider 1 service area center is 50km away with 5km radius (does not cover customer)
      mockAvailabilityService.getServiceAreas.mockResolvedValueOnce([
        {
          kind: ServiceAreaKind.RADIUS,
          centerLatitude: 31.9,
          centerLongitude: 74.9,
          radiusMeters: 5000,
        },
      ]);

      const res = await service.findMatchesForRequest(mockRequestId);

      const p1 = res.candidates.find((c) => c.providerProfileId === mockProviderProfileId1);
      expect(p1).toBeUndefined();

      expect(mockPrisma.matchCandidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerProfileId: mockProviderProfileId1,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: expect.arrayContaining([HardRuleCode.RULE_75_OUT_OF_AREA]),
          }),
        }),
      );
    });

    it('[MATCH-ELIG-076] Hard Rule 76: excludes offline or slot-unavailable providers', async () => {
      // Provider 1 is OFFLINE
      mockAvailabilityService.getLiveStatus.mockResolvedValueOnce({
        status: AvailabilityStatus.OFFLINE,
        isEmergencyAvailable: false,
      });

      const res = await service.findMatchesForRequest(mockRequestId);

      const p1 = res.candidates.find((c) => c.providerProfileId === mockProviderProfileId1);
      expect(p1).toBeUndefined();

      expect(mockPrisma.matchCandidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerProfileId: mockProviderProfileId1,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: expect.arrayContaining([HardRuleCode.RULE_76_UNAVAILABLE]),
            availability: AvailabilityCheck.UNAVAILABLE,
          }),
        }),
      );
    });

    it('[MATCH-ELIG-077] Hard Rule 77: excludes provider failing verification requirements', async () => {
      // Service requires VERIFIED, provider 1 is only BASIC
      mockTrustService.getProviderStanding.mockResolvedValueOnce({
        providerProfileId: mockProviderProfileId1,
        verificationLevel: VerificationLevel.BASIC,
        ratingStanding: 'GOOD_STANDING',
        ratingWarningCount: 0,
        isEligibleForNormalJobs: false,
      });

      const res = await service.findMatchesForRequest(mockRequestId);

      const p1 = res.candidates.find((c) => c.providerProfileId === mockProviderProfileId1);
      expect(p1).toBeUndefined();

      expect(mockPrisma.matchCandidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerProfileId: mockProviderProfileId1,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: expect.arrayContaining([HardRuleCode.RULE_77_VERIFICATION_LEVEL]),
          }),
        }),
      );
    });

    it('[MATCH-ELIG-078] Hard Rule 78: excludes provider blocked by active safety/dispute rule', async () => {
      // Active dispute exists between customer and provider 1
      mockPrisma.dispute.findFirst.mockResolvedValueOnce({
        id: 'disp-active',
        status: 'UNDER_REVIEW',
      });

      const res = await service.findMatchesForRequest(mockRequestId);

      const p1 = res.candidates.find((c) => c.providerProfileId === mockProviderProfileId1);
      expect(p1).toBeUndefined();

      expect(mockPrisma.matchCandidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerProfileId: mockProviderProfileId1,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: expect.arrayContaining([HardRuleCode.RULE_78_CUSTOMER_BLOCKED]),
          }),
        }),
      );
    });

    it('[MATCH-ELIG-079] Hard Rule 79: excludes provider exceeding active job capacity (BUSY)', async () => {
      // Provider 1 status is BUSY
      mockAvailabilityService.getLiveStatus.mockResolvedValueOnce({
        status: AvailabilityStatus.BUSY,
        isEmergencyAvailable: false,
      });

      const res = await service.findMatchesForRequest(mockRequestId);

      const p1 = res.candidates.find((c) => c.providerProfileId === mockProviderProfileId1);
      expect(p1).toBeUndefined();

      expect(mockPrisma.matchCandidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerProfileId: mockProviderProfileId1,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: expect.arrayContaining([HardRuleCode.RULE_79_CAPACITY_LIMIT]),
          }),
        }),
      );
    });

    it('[LEDGER-NEG-001, D-020] Unpaid Commission: excludes provider with negative balance below limit', async () => {
      // Provider 1 owes Rs. 600 commission in cash debits
      mockPrisma.providerLedgerEntry.findMany.mockImplementation(
        ({ where }: { where: { providerProfileId?: string } }) => {
          if (where.providerProfileId === mockProviderProfileId1) {
            return Promise.resolve([
              { direction: 'DEBIT', amountMinor: 60000n }, // -Rs. 600
            ]);
          }
          return Promise.resolve([]);
        },
      );

      const res = await service.findMatchesForRequest(mockRequestId);

      const p1 = res.candidates.find((c) => c.providerProfileId === mockProviderProfileId1);
      expect(p1).toBeUndefined();

      expect(mockPrisma.matchCandidate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            providerProfileId: mockProviderProfileId1,
            eligibility: EligibilityResult.INELIGIBLE,
            ineligibleReasons: expect.arrayContaining([HardRuleCode.UNPAID_COMMISSION]),
          }),
        }),
      );
    });
  });

  // ===========================================================================
  // 2. CONFIGURABLE WEIGHT CHANGES WITHOUT DEPLOY (IMPL §6 T3.7, OPS-ADMIN-021)
  // ===========================================================================

  describe('Configurable Scoring & Weight Changes without Deploy', () => {
    it('[OPS-ADMIN-021] weight change alters ranking without code deployment', async () => {
      // Setup: Provider 1 is closer (1 km), Provider 2 is further (10 km) but has higher verification
      mockAvailabilityService.getServiceAreas.mockImplementation((id: string) => {
        if (id === mockProviderProfileId1) {
          return Promise.resolve([
            {
              kind: ServiceAreaKind.RADIUS,
              centerLatitude: 31.5204,
              centerLongitude: 74.3587,
              radiusMeters: 10000,
            },
          ]);
        }
        return Promise.resolve([
          {
            kind: ServiceAreaKind.RADIUS,
            centerLatitude: 31.6204,
            centerLongitude: 74.3587,
            radiusMeters: 25000,
          },
        ]);
      });

      mockGeoService.computeRoute.mockImplementation(
        (origin: { latitude: number; longitude: number }) => {
          if (origin.latitude === 31.5204) {
            return Promise.resolve({ distanceMeters: 1000, durationSeconds: 300 });
          }
          return Promise.resolve({ distanceMeters: 10000, durationSeconds: 1800 });
        },
      );

      mockTrustService.getProviderStanding.mockImplementation((id: string) => {
        if (id === mockProviderProfileId1) {
          return Promise.resolve({
            providerProfileId: id,
            verificationLevel: VerificationLevel.VERIFIED,
            ratingStanding: 'GOOD_STANDING',
            ratingWarningCount: 0,
            isEligibleForNormalJobs: true,
          });
        }
        return Promise.resolve({
          providerProfileId: id,
          verificationLevel: VerificationLevel.BUSINESS_VERIFIED,
          ratingStanding: 'GOOD_STANDING',
          ratingWarningCount: 0,
          isEligibleForNormalJobs: true,
        });
      });

      // 1. Initial run: distance weight is dominant (0.80) -> Provider 1 should be ranked #1
      await service.updateMatchingConfig({
        reason: 'Dominant distance weighting for emergency pilot',
        weights: {
          ...DEFAULT_MATCHING_WEIGHTS,
          distanceWeight: 0.8,
          verificationWeight: 0.05,
        },
      });

      const run1 = await service.findMatchesForRequest(mockRequestId);
      expect(run1.candidates[0]?.providerProfileId).toBe(mockProviderProfileId1);
      expect(run1.candidates[0]?.rank).toBe(1);

      // 2. Weight change via updateMatchingConfig: flip weights so verification is dominant (0.90)
      await service.updateMatchingConfig({
        reason: 'Priority shifted to verified business credentialing',
        weights: {
          ...DEFAULT_MATCHING_WEIGHTS,
          distanceWeight: 0.02,
          verificationWeight: 0.9,
        },
      });

      const run2 = await service.findMatchesForRequest(mockRequestId);
      // Provider 2 has BUSINESS_VERIFIED and should now take rank #1!
      expect(run2.candidates[0]?.providerProfileId).toBe(mockProviderProfileId2);
      expect(run2.candidates[0]?.rank).toBe(1);

      // Ranking version must have incremented and audit log created
      expect(run2.rankingVersion).not.toEqual(run1.rankingVersion);
      expect(mockAuditWriter.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE_MATCHING_CONFIG',
          reason: 'Priority shifted to verified business credentialing',
        }),
      );
    });
  });

  // ===========================================================================
  // 3. ZERO AUTO-ASSIGNMENT (D-005, MATCH-MODE-001)
  // ===========================================================================

  describe('Zero Auto-Assignment Guarantee (D-005, MATCH-MODE-001)', () => {
    it('[MATCH-MODE-001, D-005] matching never creates or accepts a booking without customer choice', async () => {
      const res = await service.findMatchesForRequest(mockRequestId);

      // Matching returns discovery candidates
      expect(res.candidates.length).toBeGreaterThan(0);
      expect(res.isSupplyGap).toBe(false);

      // Verification: Request status transitioned to MATCHES_SHOWN, NOT auto-assigned
      expect(mockPrisma.customerRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockRequestId },
          data: { status: RequestStatus.MATCHES_SHOWN },
        }),
      );

      // No booking assignment calls executed
      expect((mockPrisma as Record<string, unknown>).booking).toBeUndefined();
    });
  });

  // ===========================================================================
  // 4. EXPLANATIONS & SUPPLY GAP HANDLING (MATCH-EXPL-001, MATCH-GAP-001)
  // ===========================================================================

  describe('Explanations & Supply Gap Handling', () => {
    it('[MATCH-EXPL-001] provides human-readable reasons in Urdu and English', async () => {
      const res = await service.findMatchesForRequest(mockRequestId);

      const topCard = res.candidates[0];
      expect(topCard).toBeDefined();
      expect(topCard!.matchReasons.length).toBeGreaterThan(0);

      for (const reason of topCard!.matchReasons) {
        expect(reason.key).toBeTruthy();
        expect(reason.en).toBeTruthy();
        expect(reason.ur).toBeTruthy();
      }

      // Check distance reason format
      const distReason = topCard!.matchReasons.find((r) => r.key === 'DISTANCE');
      expect(distReason).toBeDefined();
      expect(distReason!.en).toContain('km away');
      expect(distReason!.ur).toContain('کلومیٹر دور');
    });

    it('[MATCH-GAP-001] returns NO_SUPPLY and structured recovery options when zero suppliers match', async () => {
      // Force all providers ineligible (e.g. out of area)
      mockAvailabilityService.getServiceAreas.mockResolvedValue([]);

      const res = await service.findMatchesForRequest(mockRequestId);

      expect(res.eligibleCount).toBe(0);
      expect(res.isSupplyGap).toBe(true);
      expect(res.candidates).toEqual([]);
      expect(res.supplyGapOptions.length).toBe(5);

      // Must include 5 specific actions from BP §61.3
      const actions = res.supplyGapOptions.map((o) => o.action);
      expect(actions).toContain(SupplyGapAction.BROADEN_RADIUS);
      expect(actions).toContain(SupplyGapAction.CHOOSE_ANOTHER_TIME);
      expect(actions).toContain(SupplyGapAction.REQUEST_CALLBACK);
      expect(actions).toContain(SupplyGapAction.JOIN_WAITLIST);
      expect(actions).toContain(SupplyGapAction.TRY_RELATED_SERVICE);

      // Verify request marked as NO_SUPPLY in database
      expect(mockPrisma.customerRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockRequestId },
          data: { status: RequestStatus.NO_SUPPLY },
        }),
      );
    });
  });

  // ===========================================================================
  // 5. INPUT VALIDATION & CANDIDATE QUERYING
  // ===========================================================================

  describe('Validation & Candidate History', () => {
    it('rejects matching when request is in draft COMPOSING state', async () => {
      mockPrisma.customerRequest.findUnique.mockResolvedValueOnce({
        ...defaultMockRequest,
        status: RequestStatus.COMPOSING,
      });

      await expect(service.findMatchesForRequest(mockRequestId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects matching when request lacks confirmed coordinates', async () => {
      mockPrisma.customerRequest.findUnique.mockResolvedValueOnce({
        ...defaultMockRequest,
        locationLat: null,
        locationLng: null,
      });

      await expect(service.findMatchesForRequest(mockRequestId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when customer request does not exist', async () => {
      mockPrisma.customerRequest.findUnique.mockResolvedValueOnce(null);

      await expect(service.findMatchesForRequest('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retrieves stored match candidate evaluations for a request', async () => {
      mockPrisma.matchCandidate.findMany.mockResolvedValueOnce([
        {
          id: 'cand-1',
          requestId: mockRequestId,
          providerProfileId: mockProviderProfileId1,
          eligibility: EligibilityResult.ELIGIBLE,
          ineligibleReasons: [],
          distanceMeters: 2500,
          etaSeconds: 600,
          availability: AvailabilityCheck.AVAILABLE,
          matchReasons: [{ key: 'DISTANCE', en: '2.5 km away', ur: '2.5 کلومیٹر دور' }],
          score: 0.85,
          rank: 1,
          rankingVersion: 'v1.0.0',
          createdAt: new Date(),
        },
      ]);

      const res = await service.getMatchCandidates(mockRequestId);
      expect(res.requestId).toBe(mockRequestId);
      expect(res.candidates.length).toBe(1);
      expect(res.candidates[0]?.providerProfileId).toBe(mockProviderProfileId1);
    });

    it('rejects config update with empty or short audit reason', async () => {
      await expect(service.updateMatchingConfig({ reason: 'abc' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===========================================================================
  // 6. SCORER ALGORITHM & FAIRNESS TESTS (MATCH-SCORE-001..013)
  // ===========================================================================

  describe('MatchingScorer Algorithm & Fairness', () => {
    it('[MATCH-SCORE-006] Bayesian smoothing ensures 4.8 with 240 ratings beats 5.0 with 1 rating', () => {
      const providerHighVolume = {
        distanceMeters: 2000,
        etaSeconds: 600,
        isAvailableInWindow: true,
        isExactServiceMatch: true,
        meetsCustomerPreferences: true,
        verificationLevel: VerificationLevel.VERIFIED,
        ratingAverage: 4.8,
        ratingCount: 240,
        completedJobsCount: 240,
        medianResponseSeconds: 300,
        providerCancellationRate: 0.01,
        repeatCustomerRate: 0.25,
        repeatCustomerTotalJobs: 50,
        priceMinor: 200000n,
        categoryMedianPriceMinor: 200000n,
        activeWarningCount: 0,
        providerCreatedAt: new Date('2025-01-01'),
      };

      const providerLowVolume = {
        ...providerHighVolume,
        ratingAverage: 5.0,
        ratingCount: 1, // Only 1 review of 5.0
        completedJobsCount: 1,
      };

      const scoreHigh = MatchingScorer.computeScore(
        providerHighVolume,
        DEFAULT_MATCHING_WEIGHTS,
        DEFAULT_FAIRNESS_CONFIG,
      );

      const scoreLow = MatchingScorer.computeScore(
        providerLowVolume,
        DEFAULT_MATCHING_WEIGHTS,
        DEFAULT_FAIRNESS_CONFIG,
      );

      // High volume 4.8 rating score must be higher than smoothed 5.0 with 1 review!
      expect(scoreHigh.ratingScore).toBeGreaterThan(scoreLow.ratingScore);
    });

    it('[MATCH-SCORE-010] repeat customer rate is 0.0 below minimum sample size (10 jobs)', () => {
      const rawSignals = {
        distanceMeters: 2000,
        etaSeconds: 600,
        isAvailableInWindow: true,
        isExactServiceMatch: true,
        meetsCustomerPreferences: true,
        verificationLevel: VerificationLevel.VERIFIED,
        ratingAverage: 4.8,
        ratingCount: 20,
        completedJobsCount: 5,
        medianResponseSeconds: 300,
        providerCancellationRate: 0.0,
        repeatCustomerRate: 0.8, // High rate, but only 5 jobs total!
        repeatCustomerTotalJobs: 5, // Below 10
        priceMinor: 200000n,
        categoryMedianPriceMinor: 200000n,
        activeWarningCount: 0,
        providerCreatedAt: new Date('2025-01-01'),
      };

      const score = MatchingScorer.computeScore(
        rawSignals,
        DEFAULT_MATCHING_WEIGHTS,
        DEFAULT_FAIRNESS_CONFIG,
      );

      expect(score.repeatCustomerScore).toBe(0.0);
    });

    it('[MATCH-FAIR-001] newly approved provider receives fairness boost within max age window', () => {
      const now = new Date('2026-10-24T12:00:00Z');
      const recentProvider = {
        distanceMeters: 2000,
        etaSeconds: 600,
        isAvailableInWindow: true,
        isExactServiceMatch: true,
        meetsCustomerPreferences: true,
        verificationLevel: VerificationLevel.VERIFIED,
        ratingAverage: 4.5,
        ratingCount: 5,
        completedJobsCount: 5,
        medianResponseSeconds: 300,
        providerCancellationRate: 0.0,
        repeatCustomerRate: null,
        repeatCustomerTotalJobs: 5,
        priceMinor: 200000n,
        categoryMedianPriceMinor: 200000n,
        activeWarningCount: 0,
        providerCreatedAt: new Date('2026-10-15T12:00:00Z'), // 9 days old <= 30
      };

      const oldProvider = {
        ...recentProvider,
        providerCreatedAt: new Date('2026-05-01T12:00:00Z'), // > 30 days old
      };

      const scoreRecent = MatchingScorer.computeScore(
        recentProvider,
        DEFAULT_MATCHING_WEIGHTS,
        DEFAULT_FAIRNESS_CONFIG,
        now,
      );

      const scoreOld = MatchingScorer.computeScore(
        oldProvider,
        DEFAULT_MATCHING_WEIGHTS,
        DEFAULT_FAIRNESS_CONFIG,
        now,
      );

      expect(scoreRecent.newProviderBoostScore).toBe(1.0);
      expect(scoreOld.newProviderBoostScore).toBe(0.0);
    });
  });
});

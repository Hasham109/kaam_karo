/**
 * Unit tests for QuotesService (T3.5; owner A04).
 * Requirement IDs: QUOTE-001..009, FARE-001..013, PRICE-001..007, BOOK-STATUS-010, COMM-003.
 * ARCH §4 M10, §5.6, §6.3, §6.6; BP §17, §18, §53, §58; D-004, D-015, D-018, D-025, D-028, D-029.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@kaamkaro/platform';
import type { PrismaService } from '../../../platform/prisma.service.js';
import { QuotesService } from '../quotes.service.js';
import {
  QuoteStatus,
  QuoteCustomerResponse,
  FareLineType,
  FareLineState,
  MaterialsClass,
  ActorRole,
  BookingStatus,
  type CreateQuoteDto,
} from '../quotes.types.js';

function createMockPrisma() {
  const mock: Record<string, unknown> = {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    quote: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    fareLine: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    jobEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    providerProfile: {
      findFirst: vi.fn(),
    },
  };
  mock.$transaction = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mock));
  return mock as unknown as {
    booking: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    quote: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    fareLine: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    jobEvent: { create: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> };
    providerProfile: { findFirst: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
}

describe('QuotesService Unit Tests (T3.5)', () => {
  let service: QuotesService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockConfigService: { get: ReturnType<typeof vi.fn> };

  const mockBookingId = '11111111-1111-1111-1111-111111111111';
  const mockQuoteId = '22222222-2222-2222-2222-222222222222';
  const mockFareLineId = '33333333-3333-3333-3333-333333333333';
  const mockProviderUserId = '44444444-4444-4444-4444-444444444444';
  const mockCustomerUserId = '55555555-5555-5555-5555-555555555555';
  const mockProviderProfileId = '66666666-6666-6666-6666-666666666666';

  beforeEach(() => {
    mockPrisma = createMockPrisma();

    mockConfigService = {
      get: vi.fn((key: string, _parser?: unknown, fallback?: unknown) => {
        if (key === 'fare.emergency_exception_enabled') return false;
        return fallback;
      }),
    };

    service = new QuotesService(
      mockPrisma as unknown as PrismaService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('Acceptance Criterion 1: Offer without crew size rejected (D-004, PROV-CREW-001)', () => {
    it('[QUOTE-003][D-004] rejects quote creation when crewSize is missing, zero, negative or non-integer', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.REQUESTED,
      });

      // Missing crew size
      await expect(
        service.createQuote(
          { bookingId: mockBookingId } as unknown as CreateQuoteDto,
          mockProviderUserId,
        ),
      ).rejects.toThrow(BadRequestException);

      // Zero crew size
      await expect(
        service.createQuote(
          { bookingId: mockBookingId, crewSize: 0 } as unknown as CreateQuoteDto,
          mockProviderUserId,
        ),
      ).rejects.toThrow(BadRequestException);

      // Negative crew size
      await expect(
        service.createQuote(
          { bookingId: mockBookingId, crewSize: -2 } as unknown as CreateQuoteDto,
          mockProviderUserId,
        ),
      ).rejects.toThrow(BadRequestException);

      // Non-integer crew size
      await expect(
        service.createQuote(
          { bookingId: mockBookingId, crewSize: 1.5 } as unknown as CreateQuoteDto,
          mockProviderUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('[QUOTE-003][D-004] accepts valid crewSize >= 1 and creates quote in SENT status', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.REQUESTED,
      });
      mockPrisma.providerProfile.findFirst.mockResolvedValue({
        id: mockProviderProfileId,
      });

      const now = new Date();
      mockPrisma.quote.create.mockResolvedValue({
        id: mockQuoteId,
        bookingId: mockBookingId,
        providerProfileId: mockProviderProfileId,
        requestId: null,
        status: QuoteStatus.SENT,
        validUntil: new Date(Date.now() + 48 * 3600 * 1000),
        crewSize: 3,
        inclusions: 'Complete rewiring',
        exclusions: 'Civil work',
        expectedDurationMinutes: 120,
        customerResponse: null,
        respondedAt: null,
        sentAt: now,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      mockPrisma.fareLine.create.mockResolvedValue({
        id: mockFareLineId,
        quoteId: mockQuoteId,
        bookingId: null,
        lineType: FareLineType.LABOR,
        description: 'Wiring labor',
        quantity: null,
        unit: null,
        amountMinor: BigInt(350000),
        proposedByRole: ActorRole.PROVIDER,
        proposedByUserId: mockProviderUserId,
        state: FareLineState.PROPOSED,
        materialsClass: null,
        isDeductible: null,
        notes: null,
        evidenceMediaIds: [],
        applicableRule: null,
        isEmergencyException: false,
        decidedByUserId: null,
        decidedAt: null,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      const result = await service.createQuote(
        {
          bookingId: mockBookingId,
          crewSize: 3,
          inclusions: 'Complete rewiring',
          exclusions: 'Civil work',
          expectedDurationMinutes: 120,
          lines: [
            {
              lineType: FareLineType.LABOR,
              description: 'Wiring labor',
              amountMinor: 350000,
            },
          ],
        },
        mockProviderUserId,
      );

      expect(result.crewSize).toBe(3);
      expect(result.status).toBe(QuoteStatus.SENT);
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0]?.amountMinor).toBe(350000);
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BookingStatus.QUOTE_PENDING }),
        }),
      );
    });
  });

  describe('Acceptance Criterion 2: Unapproved line never payable (BP §58.2, FARE-012, PRICE-007)', () => {
    it('[FARE-012][PRICE-007] excludes PROPOSED and REJECTED lines from totalPayableMinor', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.IN_PROGRESS,
      });

      const now = new Date();
      mockPrisma.fareLine.findMany.mockResolvedValue([
        // Line 1: Approved initial labor
        {
          id: 'line-1',
          lineType: FareLineType.LABOR,
          description: 'Initial Labor',
          amountMinor: BigInt(200000), // Rs. 2,000
          state: FareLineState.APPROVED,
          quantity: null,
          unit: null,
          proposedByRole: ActorRole.PROVIDER,
          proposedByUserId: mockProviderUserId,
          materialsClass: null,
          isDeductible: null,
          notes: null,
          evidenceMediaIds: [],
          applicableRule: null,
          isEmergencyException: false,
          decidedByUserId: mockCustomerUserId,
          decidedAt: now,
          createdAt: now,
          updatedAt: now,
          version: 1,
        },
        // Line 2: Proposed extra parts (UNAPPROVED - must be excluded!)
        {
          id: 'line-2',
          lineType: FareLineType.PARTS,
          description: 'Extra Breaker',
          amountMinor: BigInt(150000), // Rs. 1,500
          state: FareLineState.PROPOSED,
          quantity: null,
          unit: null,
          proposedByRole: ActorRole.PROVIDER,
          proposedByUserId: mockProviderUserId,
          materialsClass: MaterialsClass.CUSTOMER_APPROVED_EXTRA,
          isDeductible: null,
          notes: null,
          evidenceMediaIds: [],
          applicableRule: null,
          isEmergencyException: false,
          decidedByUserId: null,
          decidedAt: null,
          createdAt: now,
          updatedAt: now,
          version: 1,
        },
        // Line 3: Rejected extra tools (UNAPPROVED - must be excluded!)
        {
          id: 'line-3',
          lineType: FareLineType.TOOLS,
          description: 'Special ladder rental',
          amountMinor: BigInt(50000), // Rs. 500
          state: FareLineState.REJECTED,
          quantity: null,
          unit: null,
          proposedByRole: ActorRole.PROVIDER,
          proposedByUserId: mockProviderUserId,
          materialsClass: null,
          isDeductible: null,
          notes: null,
          evidenceMediaIds: [],
          applicableRule: null,
          isEmergencyException: false,
          decidedByUserId: mockCustomerUserId,
          decidedAt: now,
          createdAt: now,
          updatedAt: now,
          version: 1,
        },
        // Line 4: Final visit fee (APPROVED/FINAL - included!)
        {
          id: 'line-4',
          lineType: FareLineType.VISIT,
          description: 'Call-out fee',
          amountMinor: BigInt(30000), // Rs. 300
          state: FareLineState.FINAL,
          quantity: null,
          unit: null,
          proposedByRole: ActorRole.PROVIDER,
          proposedByUserId: mockProviderUserId,
          materialsClass: null,
          isDeductible: null,
          notes: null,
          evidenceMediaIds: [],
          applicableRule: null,
          isEmergencyException: false,
          decidedByUserId: mockCustomerUserId,
          decidedAt: now,
          createdAt: now,
          updatedAt: now,
          version: 1,
        },
      ]);

      const summary = await service.getPayableSummary(mockBookingId);

      // Payable amount = 200,000 (Line 1) + 30,000 (Line 4) = 230,000 paisa (Rs. 2,300)
      // Unapproved Line 2 (150,000) and Line 3 (50,000) are NEVER in totalPayableMinor!
      expect(summary.totalPayableMinor).toBe(230000);
      expect(summary.approvedLinesCount).toBe(2);
      expect(summary.unapprovedLinesCount).toBe(2);

      // Commissionable labour base = only Line 1 (Labor) = 200,000
      expect(summary.commissionableLabourMinor).toBe(200000);

      // Verify breakdown items
      expect(summary.breakdown[0]?.isPayable).toBe(true); // Line 1
      expect(summary.breakdown[1]?.isPayable).toBe(false); // Line 2 PROPOSED
      expect(summary.breakdown[2]?.isPayable).toBe(false); // Line 3 REJECTED
      expect(summary.breakdown[3]?.isPayable).toBe(true); // Line 4 FINAL
    });
  });

  describe('Acceptance Criterion 3: Crew-size change creates approval request (ARCH §5.6, QUOTE-008)', () => {
    it('[QUOTE-008][ARCH §5.6] moves booking to AWAITING_APPROVAL upon crew size change proposal', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.IN_PROGRESS,
        crewSize: 2,
      });

      const result = await service.proposeCrewSizeChange(
        mockBookingId,
        { proposedCrewSize: 4, reason: 'Extra heavy machinery needs 2 additional workers' },
        mockProviderUserId,
      );

      expect(result.status).toBe(BookingStatus.AWAITING_APPROVAL);
      expect(result.proposedCrewSize).toBe(4);

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BookingStatus.AWAITING_APPROVAL }),
        }),
      );

      expect(mockPrisma.jobEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREW_SIZE_CHANGE_PROPOSED',
            fromStatus: BookingStatus.IN_PROGRESS,
            toStatus: BookingStatus.AWAITING_APPROVAL,
          }),
        }),
      );
    });

    it('[QUOTE-008][D-018] customer approval updates crewSize and restores booking status without price impact', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.AWAITING_APPROVAL,
        crewSize: 2,
      });

      mockPrisma.jobEvent.findFirst.mockResolvedValue({
        id: 'event-1',
        action: 'CREW_SIZE_CHANGE_PROPOSED',
        sourceMetadata: {
          previousCrewSize: 2,
          proposedCrewSize: 4,
          previousStatus: BookingStatus.IN_PROGRESS,
        },
      });

      const result = await service.decideCrewSizeChange(
        mockBookingId,
        { approved: true, reason: 'Approved extra team members' },
        mockCustomerUserId,
      );

      expect(result.crewSize).toBe(4);
      expect(result.status).toBe(BookingStatus.IN_PROGRESS);

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            crewSize: 4,
            status: BookingStatus.IN_PROGRESS,
          }),
        }),
      );

      expect(mockPrisma.jobEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREW_SIZE_CHANGE_APPROVED',
            fromStatus: BookingStatus.AWAITING_APPROVAL,
            toStatus: BookingStatus.IN_PROGRESS,
          }),
        }),
      );
    });

    it('[QUOTE-008] customer rejection keeps original crewSize and restores booking status', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.AWAITING_APPROVAL,
        crewSize: 2,
      });

      mockPrisma.jobEvent.findFirst.mockResolvedValue({
        id: 'event-1',
        action: 'CREW_SIZE_CHANGE_PROPOSED',
        sourceMetadata: {
          previousCrewSize: 2,
          proposedCrewSize: 4,
          previousStatus: BookingStatus.IN_PROGRESS,
        },
      });

      const result = await service.decideCrewSizeChange(
        mockBookingId,
        { approved: false, reason: 'Too many workers for small apartment' },
        mockCustomerUserId,
      );

      expect(result.crewSize).toBe(2); // Retained original crewSize
      expect(result.status).toBe(BookingStatus.IN_PROGRESS);

      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: BookingStatus.IN_PROGRESS,
          }),
        }),
      );

      expect(mockPrisma.jobEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'CREW_SIZE_CHANGE_REJECTED',
          }),
        }),
      );
    });
  });

  describe('Business Rule Guards (FARE-004, FARE-006, FARE-009, FARE-013, QUOTE-004)', () => {
    it('[FARE-004] rejects TOOLS line type without reason', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.IN_PROGRESS,
      });

      await expect(
        service.proposeFareLine(
          mockBookingId,
          {
            lineType: FareLineType.TOOLS,
            description: '   ', // Empty reason
            amountMinor: 50000,
          },
          mockProviderUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('[FARE-006][PRICE-005] rejects PARTS line type without materialsClass', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.IN_PROGRESS,
      });

      await expect(
        service.proposeFareLine(
          mockBookingId,
          {
            lineType: FareLineType.PARTS,
            description: 'Copper pipe',
            amountMinor: 75000,
          },
          mockProviderUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('[FARE-009][D-025] rejects PLATFORM_FEE line type at launch', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.IN_PROGRESS,
      });

      await expect(
        service.proposeFareLine(
          mockBookingId,
          {
            lineType: FareLineType.PLATFORM_FEE,
            description: 'Customer service fee',
            amountMinor: 10000,
          },
          mockProviderUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('[FARE-013][K-10] rejects emergency exception when feature flag is disabled', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.IN_PROGRESS,
      });

      await expect(
        service.proposeFareLine(
          mockBookingId,
          {
            lineType: FareLineType.LABOR,
            description: 'Night repair',
            amountMinor: 100000,
            isEmergencyException: true,
          },
          mockProviderUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[QUOTE-004] rejects acceptance of an expired quote', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue({
        id: mockQuoteId,
        bookingId: mockBookingId,
        status: QuoteStatus.SENT,
        validUntil: new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago
        lines: [],
      });

      await expect(service.acceptQuote(mockQuoteId, mockCustomerUserId)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.quote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: QuoteStatus.EXPIRED }),
        }),
      );
    });

    it('[QUOTE-007][QUOTE-009] accepting a quote copies crewSize and lines, sets ACCEPTED, and auto-declines competitors', async () => {
      const now = new Date();
      mockPrisma.quote.findUnique.mockResolvedValue({
        id: mockQuoteId,
        bookingId: mockBookingId,
        providerProfileId: mockProviderProfileId,
        status: QuoteStatus.SENT,
        validUntil: new Date(Date.now() + 24 * 3600 * 1000),
        crewSize: 3,
        lines: [
          {
            id: 'quote-line-1',
            lineType: FareLineType.LABOR,
            description: 'Installation',
            amountMinor: BigInt(250000),
            proposedByRole: ActorRole.PROVIDER,
            proposedByUserId: mockProviderUserId,
            materialsClass: null,
            isDeductible: null,
            notes: null,
            evidenceMediaIds: [],
            applicableRule: null,
            isEmergencyException: false,
          },
        ],
      });

      mockPrisma.quote.update.mockResolvedValue({
        id: mockQuoteId,
        bookingId: mockBookingId,
        providerProfileId: mockProviderProfileId,
        status: QuoteStatus.ACCEPTED,
        crewSize: 3,
        customerResponse: QuoteCustomerResponse.ACCEPTED,
        createdAt: now,
        updatedAt: now,
        version: 2,
      });

      mockPrisma.fareLine.create.mockResolvedValue({
        id: 'booking-line-1',
        quoteId: mockQuoteId,
        bookingId: mockBookingId,
        lineType: FareLineType.LABOR,
        description: 'Installation',
        amountMinor: BigInt(250000),
        proposedByRole: ActorRole.PROVIDER,
        proposedByUserId: mockProviderUserId,
        state: FareLineState.APPROVED,
        materialsClass: null,
        isDeductible: null,
        notes: null,
        evidenceMediaIds: [],
        applicableRule: null,
        isEmergencyException: false,
        decidedByUserId: mockCustomerUserId,
        decidedAt: now,
        createdAt: now,
        updatedAt: now,
        version: 1,
      });

      const result = await service.acceptQuote(mockQuoteId, mockCustomerUserId);

      expect(result.status).toBe(QuoteStatus.ACCEPTED);
      expect(result.customerResponse).toBe(QuoteCustomerResponse.ACCEPTED);

      // Booking status updated to ACCEPTED with crew_size
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: BookingStatus.ACCEPTED,
            crewSize: 3,
            providerProfileId: mockProviderProfileId,
          }),
        }),
      );

      // Competing offers auto-declined
      expect(mockPrisma.quote.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bookingId: mockBookingId,
            id: { not: mockQuoteId },
            status: QuoteStatus.SENT,
          }),
          data: expect.objectContaining({
            status: QuoteStatus.DECLINED,
          }),
        }),
      );
    });
  });

  describe('Fare Lines Approval Lifecycle (FARE-012)', () => {
    it('[FARE-012] approving a proposed line transitions to APPROVED and restores IN_PROGRESS when no pending remain', async () => {
      mockPrisma.fareLine.findUnique.mockResolvedValue({
        id: mockFareLineId,
        bookingId: mockBookingId,
        state: FareLineState.PROPOSED,
      });

      mockPrisma.fareLine.update.mockResolvedValue({
        id: mockFareLineId,
        bookingId: mockBookingId,
        lineType: FareLineType.PARTS,
        description: 'Capacitor',
        amountMinor: BigInt(60000),
        proposedByRole: ActorRole.PROVIDER,
        proposedByUserId: mockProviderUserId,
        state: FareLineState.APPROVED,
        materialsClass: MaterialsClass.CUSTOMER_APPROVED_EXTRA,
        isDeductible: null,
        notes: null,
        evidenceMediaIds: [],
        applicableRule: null,
        isEmergencyException: false,
        decidedByUserId: mockCustomerUserId,
        decidedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
      });

      // No other pending proposed lines
      mockPrisma.fareLine.findFirst.mockResolvedValue(null);
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.AWAITING_APPROVAL,
      });

      const result = await service.approveFareLine(mockFareLineId, mockCustomerUserId);

      expect(result.state).toBe(FareLineState.APPROVED);
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BookingStatus.IN_PROGRESS }),
        }),
      );
    });

    it('[FARE-012] rejecting a proposed line transitions to REJECTED and restores IN_PROGRESS', async () => {
      mockPrisma.fareLine.findUnique.mockResolvedValue({
        id: mockFareLineId,
        bookingId: mockBookingId,
        state: FareLineState.PROPOSED,
      });

      mockPrisma.fareLine.update.mockResolvedValue({
        id: mockFareLineId,
        bookingId: mockBookingId,
        lineType: FareLineType.PARTS,
        description: 'Capacitor',
        amountMinor: BigInt(60000),
        proposedByRole: ActorRole.PROVIDER,
        proposedByUserId: mockProviderUserId,
        state: FareLineState.REJECTED,
        materialsClass: MaterialsClass.CUSTOMER_APPROVED_EXTRA,
        isDeductible: null,
        notes: null,
        evidenceMediaIds: [],
        applicableRule: null,
        isEmergencyException: false,
        decidedByUserId: mockCustomerUserId,
        decidedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
      });

      mockPrisma.fareLine.findFirst.mockResolvedValue(null);
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: mockBookingId,
        status: BookingStatus.AWAITING_APPROVAL,
      });

      const result = await service.rejectFareLine(mockFareLineId, mockCustomerUserId, 'Not needed');

      expect(result.state).toBe(FareLineState.REJECTED);
      expect(mockPrisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: BookingStatus.IN_PROGRESS }),
        }),
      );
    });
  });
});

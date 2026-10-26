/**
 * QuotesService — Commercial offers, structured fare lines, crew size & approval workflows (T3.5; owner A04).
 * Requirement IDs: QUOTE-001..009, FARE-001..013, PRICE-001..007, BOOK-STATUS-010, COMM-003.
 * ARCH §4 M10, §5.6, §6.3, §6.6; BP §17, §18, §53, §58; D-004, D-015, D-018, D-025, D-028, D-029.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CONFIG_SERVICE, type ConfigService } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  QuoteStatus,
  QuoteCustomerResponse,
  FareLineType,
  FareLineState,
  MaterialsClass,
  ActorRole,
  BookingStatus,
  type CreateQuoteDto,
  type CreateFareLineItemDto,
  type ProposeFareLineDto,
  type ProposeCrewSizeChangeDto,
  type DecideCrewSizeChangeDto,
  type QuoteResponseDto,
  type FareLineResponseDto,
  type PayableSummaryDto,
  type PayableLineBreakdownItem,
} from './quotes.types.js';

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(CONFIG_SERVICE)
    private readonly configService?: ConfigService,
  ) {}

  /**
   * Helper to format Prisma FareLine to FareLineResponseDto
   */
  private formatFareLine(line: {
    id: string;
    quoteId: string | null;
    bookingId: string | null;
    lineType: FareLineType;
    description: string;
    quantity: Prisma.Decimal | null;
    unit: string | null;
    amountMinor: bigint;
    proposedByRole: ActorRole;
    proposedByUserId: string | null;
    state: FareLineState;
    materialsClass: MaterialsClass | null;
    isDeductible: boolean | null;
    notes: string | null;
    evidenceMediaIds: string[];
    applicableRule: string | null;
    isEmergencyException: boolean;
    decidedByUserId: string | null;
    decidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  }): FareLineResponseDto {
    return {
      id: line.id,
      quoteId: line.quoteId,
      bookingId: line.bookingId,
      lineType: line.lineType,
      description: line.description,
      quantity: line.quantity ? Number(line.quantity) : null,
      unit: line.unit,
      amountMinor: Number(line.amountMinor),
      proposedByRole: line.proposedByRole,
      proposedByUserId: line.proposedByUserId,
      state: line.state,
      materialsClass: line.materialsClass,
      isDeductible: line.isDeductible,
      notes: line.notes,
      evidenceMediaIds: line.evidenceMediaIds,
      applicableRule: line.applicableRule,
      isEmergencyException: line.isEmergencyException,
      decidedByUserId: line.decidedByUserId,
      decidedAt: line.decidedAt,
      createdAt: line.createdAt,
      updatedAt: line.updatedAt,
      version: line.version,
    };
  }

  /**
   * Validates fare line business rules (FARE-001..013, PRICE-003..007, D-025)
   */
  private validateFareLineItem(item: CreateFareLineItemDto | ProposeFareLineDto): void {
    // 1. Amount non-negative
    const amount =
      typeof item.amountMinor === 'bigint' ? Number(item.amountMinor) : item.amountMinor;
    if (amount < 0) {
      throw new BadRequestException({
        code: 'INVALID_FARE_AMOUNT',
        message: 'Line amount in minor units must be non-negative (BP §58.1, §26)',
      });
    }

    // 2. FARE-004: Tools/Equipment must have a reason/description
    if (item.lineType === FareLineType.TOOLS) {
      if (!item.description || item.description.trim().length === 0) {
        throw new BadRequestException({
          code: 'TOOLS_REASON_REQUIRED',
          message:
            'Line type Tools/Equipment usage must state a reason; cannot be empty (BP §58.1; FARE-004)',
        });
      }
    }

    // 3. FARE-006 & PRICE-005: Parts/New materials must specify materialsClass
    if (item.lineType === FareLineType.PARTS && !item.materialsClass) {
      throw new BadRequestException({
        code: 'PARTS_MATERIALS_CLASS_REQUIRED',
        message:
          'Line type Parts/New materials must classify materials (INCLUDED, EXCLUDED, CUSTOMER_APPROVED_EXTRA) (BP §17; PRICE-005)',
      });
    }

    // 4. FARE-009 & D-025: Customer platform fee disabled at launch
    if (item.lineType === FareLineType.PLATFORM_FEE) {
      throw new BadRequestException({
        code: 'CUSTOMER_PLATFORM_FEE_DISABLED',
        message: 'Customer platform fee is not charged at launch (BP §58.1, §41; D-025; FARE-009)',
      });
    }

    // 5. FARE-013 & K-10: Emergency exception flag check
    if (item.isEmergencyException) {
      // Feature flag fare.emergency_exception_enabled is false at launch
      const emergencyEnabled =
        this.configService?.get('fare.emergency_exception_enabled', () => false) ?? false;
      if (!emergencyEnabled) {
        throw new ForbiddenException({
          code: 'EMERGENCY_EXCEPTION_DISABLED',
          message:
            'Emergency exception for charges is disabled at launch (BP §58.3; FARE-013; K-10)',
        });
      }
    }
  }

  /**
   * Submit a quote or commercial offer for a booking (QUOTE-001..005).
   * Acceptance Criterion: "Offer without crew size rejected (test)" (D-004, PROV-CREW-001).
   */
  async createQuote(
    dto: CreateQuoteDto,
    providerUserId: string,
    providerProfileIdOverride?: string,
  ): Promise<QuoteResponseDto> {
    // 1. Acceptance Criterion: Provider states crew size (how many workers will come) on every offer/booking (D-004, ARCH §5.6).
    if (
      dto.crewSize === undefined ||
      dto.crewSize === null ||
      typeof dto.crewSize !== 'number' ||
      !Number.isInteger(dto.crewSize) ||
      dto.crewSize < 1
    ) {
      throw new BadRequestException({
        code: 'CREW_SIZE_REQUIRED',
        message:
          'Provider must state crew size (integer >= 1) on every quote/offer (D-004; PROV-CREW-001)',
      });
    }

    // 2. Fetch booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking ${dto.bookingId} not found`,
      });
    }

    // 3. Booking must be in a quotable state: REQUESTED or QUOTE_PENDING
    if (
      booking.status !== BookingStatus.REQUESTED &&
      booking.status !== BookingStatus.QUOTE_PENDING
    ) {
      throw new ConflictException({
        code: 'BOOKING_NOT_QUOTABLE',
        message: `Booking is in status ${booking.status}; quotes can only be submitted for REQUESTED or QUOTE_PENDING bookings (BP §15, §18)`,
      });
    }

    // 4. Resolve providerProfileId
    let providerProfileId = providerProfileIdOverride;
    if (!providerProfileId) {
      const providerProfile = await this.prisma.providerProfile.findFirst({
        where: { userId: providerUserId },
      });
      if (providerProfile) {
        providerProfileId = providerProfile.id;
      } else {
        providerProfileId = booking.providerProfileId ?? providerUserId;
      }
    }

    // 4b. Guard against unpaid commission (D-020, LEDGER-NEG-002)
    let maxNegativeBalance = 0;
    if (this.configService) {
      const limit = await this.configService.get<number>('ledger.max_negative_balance', (val) =>
        typeof val === 'number' ? val : undefined,
      );
      if (typeof limit === 'number') maxNegativeBalance = limit;
    }
    const entries = this.prisma.providerLedgerEntry
      ? await this.prisma.providerLedgerEntry.findMany({
          where: { providerProfileId },
          select: { direction: true, amountMinor: true },
        })
      : [];
    let balance = 0;
    for (const e of entries) {
      const amt = Number(e.amountMinor);
      if (e.direction === 'CREDIT') balance += amt;
      else if (e.direction === 'DEBIT') balance -= amt;
    }
    if (balance < 0 && -balance > maxNegativeBalance) {
      throw new ConflictException({
        code: 'UNPAID_COMMISSION',
        message:
          'Provider has outstanding unpaid commission and cannot send quotes (D-020, LEDGER-NEG-002)',
      });
    }

    // 5. Validate fare line items
    const lines = dto.lines ?? [];
    for (const line of lines) {
      this.validateFareLineItem(line);
    }

    // 6. Validity date: default to 48 hours if not provided
    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : new Date(Date.now() + 48 * 3600 * 1000);

    // 7. Atomic quote creation
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quote.create({
        data: {
          bookingId: booking.id,
          providerProfileId,
          requestId: dto.requestId ?? null,
          status: QuoteStatus.SENT,
          validUntil,
          crewSize: dto.crewSize,
          inclusions: dto.inclusions ?? null,
          exclusions: dto.exclusions ?? null,
          expectedDurationMinutes: dto.expectedDurationMinutes ?? null,
          sentAt: new Date(),
        },
      });

      // Insert line items
      const createdLines = [];
      for (const line of lines) {
        const created = await tx.fareLine.create({
          data: {
            quoteId: quote.id,
            lineType: line.lineType,
            description: line.description,
            quantity: line.quantity ? new Prisma.Decimal(line.quantity) : null,
            unit: line.unit ?? null,
            amountMinor: BigInt(line.amountMinor),
            proposedByRole: ActorRole.PROVIDER,
            proposedByUserId: providerUserId,
            state: FareLineState.PROPOSED,
            materialsClass: line.materialsClass ?? null,
            isDeductible: line.isDeductible ?? null,
            notes: line.notes ?? null,
            evidenceMediaIds: line.evidenceMediaIds ?? [],
            applicableRule: line.applicableRule ?? null,
            isEmergencyException: line.isEmergencyException ?? false,
          },
        });
        createdLines.push(this.formatFareLine(created));
      }

      // If booking was REQUESTED on a quote/inspection job, advance to QUOTE_PENDING
      if (booking.status === BookingStatus.REQUESTED) {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.QUOTE_PENDING,
            version: { increment: 1 },
          },
        });
      }

      return {
        id: quote.id,
        bookingId: quote.bookingId,
        providerProfileId: quote.providerProfileId,
        requestId: quote.requestId,
        status: quote.status,
        validUntil: quote.validUntil,
        crewSize: quote.crewSize,
        inclusions: quote.inclusions,
        exclusions: quote.exclusions,
        expectedDurationMinutes: quote.expectedDurationMinutes,
        customerResponse: quote.customerResponse,
        respondedAt: quote.respondedAt,
        sentAt: quote.sentAt,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
        version: quote.version,
        lines: createdLines,
      };
    });
  }

  /**
   * Retrieve quote details with structured fare lines (QUOTE-005, PRICE-006).
   */
  async getQuote(quoteId: string): Promise<QuoteResponseDto> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { lines: true },
    });
    if (!quote) {
      throw new NotFoundException({
        code: 'QUOTE_NOT_FOUND',
        message: `Quote ${quoteId} not found`,
      });
    }

    return {
      id: quote.id,
      bookingId: quote.bookingId,
      providerProfileId: quote.providerProfileId,
      requestId: quote.requestId,
      status: quote.status,
      validUntil: quote.validUntil,
      crewSize: quote.crewSize,
      inclusions: quote.inclusions,
      exclusions: quote.exclusions,
      expectedDurationMinutes: quote.expectedDurationMinutes,
      customerResponse: quote.customerResponse,
      respondedAt: quote.respondedAt,
      sentAt: quote.sentAt,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
      version: quote.version,
      lines: quote.lines.map((l) => this.formatFareLine(l)),
    };
  }

  /**
   * Compare multi-supplier quotes for a booking (QUOTE-009, BP §53).
   */
  async getBookingQuotes(bookingId: string): Promise<QuoteResponseDto[]> {
    const quotes = await this.prisma.quote.findMany({
      where: { bookingId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });

    return quotes.map((q) => ({
      id: q.id,
      bookingId: q.bookingId,
      providerProfileId: q.providerProfileId,
      requestId: q.requestId,
      status: q.status,
      validUntil: q.validUntil,
      crewSize: q.crewSize,
      inclusions: q.inclusions,
      exclusions: q.exclusions,
      expectedDurationMinutes: q.expectedDurationMinutes,
      customerResponse: q.customerResponse,
      respondedAt: q.respondedAt,
      sentAt: q.sentAt,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      version: q.version,
      lines: q.lines.map((l) => this.formatFareLine(l)),
    }));
  }

  /**
   * Customer accepts a quote (QUOTE-004, QUOTE-006, QUOTE-007, QUOTE-009).
   * Copies crew_size and fare lines to booking; advances booking to ACCEPTED.
   * Auto-declines other open quotes for the booking.
   */
  async acceptQuote(quoteId: string, customerUserId: string): Promise<QuoteResponseDto> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { lines: true },
    });
    if (!quote) {
      throw new NotFoundException({
        code: 'QUOTE_NOT_FOUND',
        message: `Quote ${quoteId} not found`,
      });
    }

    if (quote.status !== QuoteStatus.SENT) {
      throw new ConflictException({
        code: 'QUOTE_NOT_ACCEPTABLE',
        message: `Quote is in status ${quote.status}; only SENT quotes can be accepted`,
      });
    }

    // Check validity expiration (QUOTE-004)
    if (quote.validUntil && quote.validUntil.getTime() < Date.now()) {
      await this.prisma.quote.update({
        where: { id: quote.id },
        data: { status: QuoteStatus.EXPIRED },
      });
      throw new ConflictException({
        code: 'QUOTE_EXPIRED',
        message: 'Quote has expired and cannot be accepted (QUOTE-004; BP §18)',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Mark quote ACCEPTED
      const updatedQuote = await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: QuoteStatus.ACCEPTED,
          customerResponse: QuoteCustomerResponse.ACCEPTED,
          respondedAt: new Date(),
          version: { increment: 1 },
        },
      });

      // 2. Copy quote lines to booking fare lines with state APPROVED (QUOTE-007)
      const approvedBookingLines = [];
      for (const line of quote.lines) {
        const bookingLine = await tx.fareLine.create({
          data: {
            quoteId: quote.id,
            bookingId: quote.bookingId,
            lineType: line.lineType,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            amountMinor: line.amountMinor,
            proposedByRole: line.proposedByRole,
            proposedByUserId: line.proposedByUserId,
            state: FareLineState.APPROVED, // Accepted quote lines become approved commercial basis
            materialsClass: line.materialsClass,
            isDeductible: line.isDeductible,
            notes: line.notes,
            evidenceMediaIds: line.evidenceMediaIds,
            applicableRule: line.applicableRule,
            isEmergencyException: line.isEmergencyException,
            decidedByUserId: customerUserId,
            decidedAt: new Date(),
          },
        });
        approvedBookingLines.push(this.formatFareLine(bookingLine));
      }

      // 3. Update booking: copy crew_size (D-004), set providerProfileId, advance to ACCEPTED
      await tx.booking.update({
        where: { id: quote.bookingId },
        data: {
          status: BookingStatus.ACCEPTED,
          providerProfileId: quote.providerProfileId,
          crewSize: quote.crewSize, // Copied from accepted quote (D-004, ARCH §5.6)
          version: { increment: 1 },
        },
      });

      // 4. Log Job Event
      await tx.jobEvent.create({
        data: {
          bookingId: quote.bookingId,
          fromStatus: BookingStatus.QUOTE_PENDING,
          toStatus: BookingStatus.ACCEPTED,
          action: 'QUOTE_ACCEPTED',
          actorRole: ActorRole.CUSTOMER,
          actorUserId: customerUserId,
          reason: `Quote ${quote.id} accepted by customer; crew size set to ${quote.crewSize}`,
          sourceMetadata: {
            quoteId: quote.id,
            crewSize: quote.crewSize,
            linesCount: quote.lines.length,
          },
        },
      });

      // 5. Close / decline other open offers for this booking (QUOTE-009)
      await tx.quote.updateMany({
        where: {
          bookingId: quote.bookingId,
          id: { not: quote.id },
          status: QuoteStatus.SENT,
        },
        data: {
          status: QuoteStatus.DECLINED,
          customerResponse: QuoteCustomerResponse.DECLINED,
          respondedAt: new Date(),
        },
      });

      return {
        id: updatedQuote.id,
        bookingId: updatedQuote.bookingId,
        providerProfileId: updatedQuote.providerProfileId,
        requestId: updatedQuote.requestId,
        status: updatedQuote.status,
        validUntil: updatedQuote.validUntil,
        crewSize: updatedQuote.crewSize,
        inclusions: updatedQuote.inclusions,
        exclusions: updatedQuote.exclusions,
        expectedDurationMinutes: updatedQuote.expectedDurationMinutes,
        customerResponse: updatedQuote.customerResponse,
        respondedAt: updatedQuote.respondedAt,
        sentAt: updatedQuote.sentAt,
        createdAt: updatedQuote.createdAt,
        updatedAt: updatedQuote.updatedAt,
        version: updatedQuote.version,
        lines: approvedBookingLines,
      };
    });
  }

  /**
   * Customer declines a quote (QUOTE-006, ARCH §6.6).
   */
  async declineQuote(
    quoteId: string,
    customerUserId: string,
    reason?: string,
  ): Promise<QuoteResponseDto> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { lines: true },
    });
    if (!quote) {
      throw new NotFoundException({
        code: 'QUOTE_NOT_FOUND',
        message: `Quote ${quoteId} not found`,
      });
    }

    if (quote.status !== QuoteStatus.SENT) {
      throw new ConflictException({
        code: 'QUOTE_NOT_DECLINABLE',
        message: `Quote is in status ${quote.status}; only SENT quotes can be declined`,
      });
    }

    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: QuoteStatus.DECLINED,
        customerResponse: QuoteCustomerResponse.DECLINED,
        respondedAt: new Date(),
        version: { increment: 1 },
      },
    });

    // Write job event noting quote decline
    await this.prisma.jobEvent.create({
      data: {
        bookingId: quote.bookingId,
        action: 'QUOTE_DECLINED',
        actorRole: ActorRole.CUSTOMER,
        actorUserId: customerUserId,
        reason: reason ?? `Quote ${quote.id} declined by customer`,
        sourceMetadata: { quoteId: quote.id },
      },
    });

    return {
      id: updated.id,
      bookingId: updated.bookingId,
      providerProfileId: updated.providerProfileId,
      requestId: updated.requestId,
      status: updated.status,
      validUntil: updated.validUntil,
      crewSize: updated.crewSize,
      inclusions: updated.inclusions,
      exclusions: updated.exclusions,
      expectedDurationMinutes: updated.expectedDurationMinutes,
      customerResponse: updated.customerResponse,
      respondedAt: updated.respondedAt,
      sentAt: updated.sentAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      version: updated.version,
      lines: quote.lines.map((l) => this.formatFareLine(l)),
    };
  }

  /**
   * Customer requests clarification on a quote (QUOTE-006).
   */
  async requestClarification(
    quoteId: string,
    customerUserId: string,
    message: string,
  ): Promise<QuoteResponseDto> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { lines: true },
    });
    if (!quote) {
      throw new NotFoundException({
        code: 'QUOTE_NOT_FOUND',
        message: `Quote ${quoteId} not found`,
      });
    }

    const updated = await this.prisma.quote.update({
      where: { id: quote.id },
      data: {
        customerResponse: QuoteCustomerResponse.CLARIFICATION_REQUESTED,
        respondedAt: new Date(),
        version: { increment: 1 },
      },
    });

    await this.prisma.jobEvent.create({
      data: {
        bookingId: quote.bookingId,
        action: 'QUOTE_CLARIFICATION_REQUESTED',
        actorRole: ActorRole.CUSTOMER,
        actorUserId: customerUserId,
        reason: message,
        sourceMetadata: { quoteId: quote.id, clarificationMessage: message },
      },
    });

    return {
      id: updated.id,
      bookingId: updated.bookingId,
      providerProfileId: updated.providerProfileId,
      requestId: updated.requestId,
      status: updated.status,
      validUntil: updated.validUntil,
      crewSize: updated.crewSize,
      inclusions: updated.inclusions,
      exclusions: updated.exclusions,
      expectedDurationMinutes: updated.expectedDurationMinutes,
      customerResponse: updated.customerResponse,
      respondedAt: updated.respondedAt,
      sentAt: updated.sentAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      version: updated.version,
      lines: quote.lines.map((l) => this.formatFareLine(l)),
    };
  }

  /**
   * Propose an extra charge / fare line during job execution (FARE-001..013, BOOK-STATUS-010).
   * Automatically moves booking to AWAITING_APPROVAL.
   */
  async proposeFareLine(
    bookingId: string,
    dto: ProposeFareLineDto,
    proposerUserId?: string,
    proposerRole: ActorRole = ActorRole.PROVIDER,
  ): Promise<FareLineResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking ${bookingId} not found`,
      });
    }

    // Extras can be proposed during active execution (ARRIVED, IN_PROGRESS, AWAITING_APPROVAL)
    if (
      booking.status !== BookingStatus.IN_PROGRESS &&
      booking.status !== BookingStatus.ARRIVED &&
      booking.status !== BookingStatus.AWAITING_APPROVAL
    ) {
      throw new ConflictException({
        code: 'EXTRA_CHARGES_NOT_ALLOWED',
        message: `Extra charges cannot be proposed in booking status ${booking.status}; must be ARRIVED, IN_PROGRESS, or AWAITING_APPROVAL (BP §58.2)`,
      });
    }

    this.validateFareLineItem(dto);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create fare line in PROPOSED state
      const fareLine = await tx.fareLine.create({
        data: {
          bookingId: booking.id,
          lineType: dto.lineType,
          description: dto.description,
          quantity: dto.quantity ? new Prisma.Decimal(dto.quantity) : null,
          unit: dto.unit ?? null,
          amountMinor: BigInt(dto.amountMinor),
          proposedByRole: proposerRole,
          proposedByUserId: proposerUserId ?? null,
          state: FareLineState.PROPOSED,
          materialsClass: dto.materialsClass ?? null,
          isDeductible: dto.isDeductible ?? null,
          notes: dto.notes ?? null,
          evidenceMediaIds: dto.evidenceMediaIds ?? [],
          applicableRule: dto.applicableRule ?? null,
          isEmergencyException: dto.isEmergencyException ?? false,
        },
      });

      // 2. Automatically advance booking to AWAITING_APPROVAL (BOOK-STATUS-010, FARE-012)
      if (booking.status !== BookingStatus.AWAITING_APPROVAL) {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.AWAITING_APPROVAL,
            version: { increment: 1 },
          },
        });
      }

      // 3. Write Job Event
      await tx.jobEvent.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: BookingStatus.AWAITING_APPROVAL,
          action: 'EXTRA_CHARGE_PROPOSED',
          actorRole: proposerRole,
          actorUserId: proposerUserId ?? null,
          reason: `Extra charge proposed: ${dto.lineType} - ${dto.description}`,
          sourceMetadata: {
            fareLineId: fareLine.id,
            lineType: dto.lineType,
            amountMinor: Number(dto.amountMinor),
          },
        },
      });

      return this.formatFareLine(fareLine);
    });
  }

  /**
   * Customer approves a proposed fare line (FARE-012, PRICE-007).
   */
  async approveFareLine(fareLineId: string, customerUserId: string): Promise<FareLineResponseDto> {
    const line = await this.prisma.fareLine.findUnique({
      where: { id: fareLineId },
    });
    if (!line) {
      throw new NotFoundException({
        code: 'FARE_LINE_NOT_FOUND',
        message: `Fare line ${fareLineId} not found`,
      });
    }

    if (line.state !== FareLineState.PROPOSED) {
      throw new ConflictException({
        code: 'FARE_LINE_NOT_PROPOSED',
        message: `Fare line is in state ${line.state}; only PROPOSED lines can be approved (FARE-012)`,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update line state to APPROVED
      const updated = await tx.fareLine.update({
        where: { id: line.id },
        data: {
          state: FareLineState.APPROVED,
          decidedByUserId: customerUserId,
          decidedAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (line.bookingId) {
        // 2. Check if any other proposed lines remain
        const otherPending = await tx.fareLine.findFirst({
          where: {
            bookingId: line.bookingId,
            state: FareLineState.PROPOSED,
            id: { not: line.id },
          },
        });

        // 3. If no other pending proposed lines, move booking back to IN_PROGRESS
        if (!otherPending) {
          const booking = await tx.booking.findUnique({ where: { id: line.bookingId } });
          if (booking && booking.status === BookingStatus.AWAITING_APPROVAL) {
            await tx.booking.update({
              where: { id: booking.id },
              data: {
                status: BookingStatus.IN_PROGRESS,
                version: { increment: 1 },
              },
            });

            await tx.jobEvent.create({
              data: {
                bookingId: booking.id,
                fromStatus: BookingStatus.AWAITING_APPROVAL,
                toStatus: BookingStatus.IN_PROGRESS,
                action: 'EXTRA_CHARGE_APPROVED',
                actorRole: ActorRole.CUSTOMER,
                actorUserId: customerUserId,
                reason: `Fare line ${line.id} approved; returning to IN_PROGRESS`,
              },
            });
          }
        }
      }

      return this.formatFareLine(updated);
    });
  }

  /**
   * Customer rejects a proposed fare line (FARE-012).
   */
  async rejectFareLine(
    fareLineId: string,
    customerUserId: string,
    reason?: string,
  ): Promise<FareLineResponseDto> {
    const line = await this.prisma.fareLine.findUnique({
      where: { id: fareLineId },
    });
    if (!line) {
      throw new NotFoundException({
        code: 'FARE_LINE_NOT_FOUND',
        message: `Fare line ${fareLineId} not found`,
      });
    }

    if (line.state !== FareLineState.PROPOSED) {
      throw new ConflictException({
        code: 'FARE_LINE_NOT_PROPOSED',
        message: `Fare line is in state ${line.state}; only PROPOSED lines can be rejected (FARE-012)`,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update line state to REJECTED
      const updated = await tx.fareLine.update({
        where: { id: line.id },
        data: {
          state: FareLineState.REJECTED,
          decidedByUserId: customerUserId,
          decidedAt: new Date(),
          version: { increment: 1 },
        },
      });

      if (line.bookingId) {
        // 2. Check if any other proposed lines remain
        const otherPending = await tx.fareLine.findFirst({
          where: {
            bookingId: line.bookingId,
            state: FareLineState.PROPOSED,
            id: { not: line.id },
          },
        });

        // 3. If no other pending proposed lines, move booking back to IN_PROGRESS
        if (!otherPending) {
          const booking = await tx.booking.findUnique({ where: { id: line.bookingId } });
          if (booking && booking.status === BookingStatus.AWAITING_APPROVAL) {
            await tx.booking.update({
              where: { id: booking.id },
              data: {
                status: BookingStatus.IN_PROGRESS,
                version: { increment: 1 },
              },
            });

            await tx.jobEvent.create({
              data: {
                bookingId: booking.id,
                fromStatus: BookingStatus.AWAITING_APPROVAL,
                toStatus: BookingStatus.IN_PROGRESS,
                action: 'EXTRA_CHARGE_REJECTED',
                actorRole: ActorRole.CUSTOMER,
                actorUserId: customerUserId,
                reason: reason ?? `Fare line ${line.id} rejected by customer`,
              },
            });
          }
        }
      }

      return this.formatFareLine(updated);
    });
  }

  /**
   * Retrieve all fare lines for a booking (both quote lines and extra charges).
   */
  async getBookingFareLines(bookingId: string): Promise<FareLineResponseDto[]> {
    const lines = await this.prisma.fareLine.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
    return lines.map((l) => this.formatFareLine(l));
  }

  /**
   * Propose a crew size change after booking acceptance (ARCH §5.6, QUOTE-008).
   * Acceptance Criterion: "Crew-size change after acceptance creates an approval request (test)" (D-004, D-018).
   */
  async proposeCrewSizeChange(
    bookingId: string,
    dto: ProposeCrewSizeChangeDto,
    providerUserId: string,
  ): Promise<{ bookingId: string; proposedCrewSize: number; status: BookingStatus }> {
    if (
      !dto.proposedCrewSize ||
      typeof dto.proposedCrewSize !== 'number' ||
      !Number.isInteger(dto.proposedCrewSize) ||
      dto.proposedCrewSize < 1
    ) {
      throw new BadRequestException({
        code: 'INVALID_CREW_SIZE',
        message: 'Proposed crew size must be an integer >= 1 (D-004; PROV-CREW-001)',
      });
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking ${bookingId} not found`,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Move booking to AWAITING_APPROVAL (QUOTE-008, BOOK-STATUS-010)
      const previousStatus = booking.status;
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.AWAITING_APPROVAL,
          version: { increment: 1 },
        },
      });

      // Write Job Event with pending crew size proposal
      await tx.jobEvent.create({
        data: {
          bookingId: booking.id,
          fromStatus: previousStatus,
          toStatus: BookingStatus.AWAITING_APPROVAL,
          action: 'CREW_SIZE_CHANGE_PROPOSED',
          actorRole: ActorRole.PROVIDER,
          actorUserId: providerUserId,
          reason:
            dto.reason ??
            `Crew size change proposed from ${booking.crewSize ?? 1} to ${dto.proposedCrewSize}`,
          sourceMetadata: {
            previousCrewSize: booking.crewSize ?? 1,
            proposedCrewSize: dto.proposedCrewSize,
            previousStatus,
            reason: dto.reason ?? null,
          },
        },
      });

      return {
        bookingId: booking.id,
        proposedCrewSize: dto.proposedCrewSize,
        status: BookingStatus.AWAITING_APPROVAL,
      };
    });
  }

  /**
   * Customer decides (approves or rejects) a proposed crew size change (ARCH §5.6, QUOTE-008).
   */
  async decideCrewSizeChange(
    bookingId: string,
    dto: DecideCrewSizeChangeDto,
    customerUserId: string,
  ): Promise<{ bookingId: string; crewSize: number; status: BookingStatus }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking ${bookingId} not found`,
      });
    }

    // Find the latest crew size proposal event
    const latestProposalEvent = await this.prisma.jobEvent.findFirst({
      where: {
        bookingId: booking.id,
        action: 'CREW_SIZE_CHANGE_PROPOSED',
      },
      orderBy: { occurredAt: 'desc' },
    });

    if (!latestProposalEvent || !latestProposalEvent.sourceMetadata) {
      throw new NotFoundException({
        code: 'NO_PENDING_CREW_CHANGE',
        message: 'No pending crew size change proposal found for this booking',
      });
    }

    const metadata = latestProposalEvent.sourceMetadata as Record<string, unknown>;
    const proposedCrewSize = Number(metadata.proposedCrewSize);
    const returnStatus = (metadata.previousStatus as BookingStatus) ?? BookingStatus.IN_PROGRESS;

    return this.prisma.$transaction(async (tx) => {
      let finalCrewSize = booking.crewSize ?? 1;

      if (dto.approved) {
        finalCrewSize = proposedCrewSize;
        // Crew size never changes price (D-018)
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            crewSize: finalCrewSize,
            status: returnStatus,
            version: { increment: 1 },
          },
        });

        await tx.jobEvent.create({
          data: {
            bookingId: booking.id,
            fromStatus: BookingStatus.AWAITING_APPROVAL,
            toStatus: returnStatus,
            action: 'CREW_SIZE_CHANGE_APPROVED',
            actorRole: ActorRole.CUSTOMER,
            actorUserId: customerUserId,
            reason: dto.reason ?? `Crew size change to ${finalCrewSize} approved by customer`,
            sourceMetadata: {
              crewSize: finalCrewSize,
              returnStatus,
            },
          },
        });
      } else {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: returnStatus,
            version: { increment: 1 },
          },
        });

        await tx.jobEvent.create({
          data: {
            bookingId: booking.id,
            fromStatus: BookingStatus.AWAITING_APPROVAL,
            toStatus: returnStatus,
            action: 'CREW_SIZE_CHANGE_REJECTED',
            actorRole: ActorRole.CUSTOMER,
            actorUserId: customerUserId,
            reason: dto.reason ?? `Crew size change to ${proposedCrewSize} rejected by customer`,
            sourceMetadata: {
              retainedCrewSize: finalCrewSize,
              returnStatus,
            },
          },
        });
      }

      return {
        bookingId: booking.id,
        crewSize: finalCrewSize,
        status: returnStatus,
      };
    });
  }

  /**
   * Calculate payable amount and commissionable base (BP §58.2; FARE-012; PRICE-007; COMM-003).
   * Acceptance Criterion: "Unapproved line never payable (test)".
   * - Only APPROVED and FINAL lines are summed into totalPayableMinor.
   * - PROPOSED lines are strictly excluded from totalPayableMinor!
   * - Commissionable labour is calculated strictly on approved/final lines of type LABOR (D-015).
   */
  async getPayableSummary(bookingId: string): Promise<PayableSummaryDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking ${bookingId} not found`,
      });
    }

    const lines = await this.prisma.fareLine.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });

    let totalPayableMinor = 0;
    let approvedLinesCount = 0;
    let unapprovedLinesCount = 0;
    let commissionableLabourMinor = 0;

    const breakdown: PayableLineBreakdownItem[] = [];

    for (const line of lines) {
      const amount = Number(line.amountMinor);
      const isApprovedOrFinal =
        line.state === FareLineState.APPROVED || line.state === FareLineState.FINAL;

      const isCommissionable = isApprovedOrFinal && line.lineType === FareLineType.LABOR;

      if (isApprovedOrFinal) {
        approvedLinesCount++;
        if (line.lineType === FareLineType.DISCOUNT) {
          totalPayableMinor -= amount;
        } else {
          totalPayableMinor += amount;
        }

        if (isCommissionable) {
          commissionableLabourMinor += amount;
        }
      } else {
        // Unapproved line (PROPOSED or REJECTED) is NEVER payable (FARE-012, PRICE-007)
        unapprovedLinesCount++;
      }

      breakdown.push({
        id: line.id,
        lineType: line.lineType,
        description: line.description,
        amountMinor: amount,
        state: line.state,
        isPayable: isApprovedOrFinal,
        isCommissionable,
      });
    }

    // Ensure non-negative total payable
    if (totalPayableMinor < 0) {
      totalPayableMinor = 0;
    }

    return {
      bookingId: booking.id,
      totalPayableMinor,
      approvedLinesCount,
      unapprovedLinesCount,
      commissionableLabourMinor,
      breakdown,
    };
  }
}

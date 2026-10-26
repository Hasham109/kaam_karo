/**
 * BookingService — State machine execution & lifecycle management (T3.4; owner A04).
 * Requirement IDs: BOOK-STATUS-001..017, BOOK-CANCEL-001..006, DATA-002, DATA-004.
 * BP §15, §16, §21, §25; ARCH §4 M9, §6.1; D-003, D-004, D-018, D-021, D-028.
 */
import { randomUUID } from 'node:crypto';
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
import { type Booking, type Prisma } from '../../generated/prisma/client.js';
import {
  BookingStatus,
  ActorRole,
  NoShowParty,
  type CreateBookingDto,
  type RequestTransitionDto,
  type CancelBookingDto,
  type RecordNoShowDto,
  type SafetyStopDto,
  type BookingResponseDto,
  type JobEventResponseDto,
} from './booking.types.js';
import {
  getTransitionDefinition,
  isTransitionDefined,
  isTransitionAllowedForRole,
  getAllowedNextActions,
} from './transition-table.js';

function generateShortBookingNumber(): string {
  return randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
}

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(CONFIG_SERVICE)
    private readonly configService?: ConfigService,
  ) {}

  /**
   * Creates a new booking.
   * Client-sent `status` is strictly forbidden or ignored (BOOK-STATUS-016, SEC-BASE-007).
   */
  async createBooking(
    dto: CreateBookingDto,
    callerUserId?: string,
    callerRole: ActorRole = ActorRole.CUSTOMER,
  ): Promise<BookingResponseDto> {
    // 1. Guard against client-sent status tampering (BOOK-STATUS-016, SEC-BASE-007)
    if ('status' in dto && (dto as unknown as Record<string, unknown>).status !== undefined) {
      throw new BadRequestException({
        code: 'CLIENT_STATUS_FORBIDDEN',
        message:
          'The server is the only source of status; client-sent status is forbidden (BOOK-STATUS-016, SEC-BASE-007)',
      });
    }

    // 2. Check service quote_required flag from catalog if service exists
    let initialStatus: BookingStatus = BookingStatus.DRAFT;
    if (dto.submitImmediately) {
      // Check if service requires quote or inspection
      let quoteRequired = false;
      const service = await this.prisma.service.findUnique({
        where: { id: dto.serviceId },
      });
      if (service && service.quoteRequired) {
        quoteRequired = true;
      }
      initialStatus = quoteRequired ? BookingStatus.QUOTE_PENDING : BookingStatus.REQUESTED;
    }

    // Check unpaid commission if provider profile is pre-specified (e.g. Favorite rebook) (D-020, LEDGER-NEG-002)
    if (dto.providerProfileId) {
      let maxNegativeBalance = 0;
      if (this.configService) {
        const limit = await this.configService.get<number>('ledger.max_negative_balance', (val) =>
          typeof val === 'number' ? val : undefined,
        );
        if (typeof limit === 'number') maxNegativeBalance = limit;
      }
      const entries = this.prisma.providerLedgerEntry
        ? await this.prisma.providerLedgerEntry.findMany({
            where: { providerProfileId: dto.providerProfileId },
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
            'Provider has outstanding unpaid commission and cannot be booked or rebooked (D-020, LEDGER-NEG-002)',
        });
      }
    }

    const bookingNumber = generateShortBookingNumber();
    const scheduledAtDate = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const inspectionVisitAtDate = dto.inspectionVisitAt ? new Date(dto.inspectionVisitAt) : null;

    return await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          customerProfileId: dto.customerProfileId,
          serviceId: dto.serviceId,
          sellingMode: dto.sellingMode,
          providerProfileId: dto.providerProfileId ?? null,
          requestId: dto.requestId ?? null,
          locationSnapshotId: dto.locationSnapshotId ?? null,
          scheduledAt: scheduledAtDate,
          inspectionVisitAt: inspectionVisitAtDate,
          crewSize: dto.crewSize ?? null,
          isEmergency: dto.isEmergency ?? false,
          status: initialStatus,
          statusChangedAt: new Date(),
          version: 1,
        },
      });

      // Write immutable initial JobEvent (DATA-002, DATA-004)
      await tx.jobEvent.create({
        data: {
          bookingId: booking.id,
          actorUserId: callerUserId ?? null,
          actorRole: callerRole,
          action: dto.submitImmediately ? 'SUBMIT' : 'CREATE_DRAFT',
          fromStatus: null,
          toStatus: initialStatus,
          reason: 'Initial booking creation',
        },
      });

      return this.mapBookingToDto(booking, callerRole);
    });
  }

  /**
   * Retrieves a booking by ID and computes server-given allowed actions (BOOK-STATUS-016).
   */
  async getBookingById(
    bookingId: string,
    callerRole: ActorRole = ActorRole.CUSTOMER,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking with ID ${bookingId} not found`,
      });
    }
    return this.mapBookingToDto(booking, callerRole);
  }

  /**
   * Requests a state transition through the ARCH §6.1 canonical transition table.
   * Atomically records the state update and writes a Job Event (BOOK-STATUS-001..017, DATA-002).
   */
  async requestTransition(
    bookingId: string,
    dto: RequestTransitionDto,
    callerUserId?: string,
    callerRole: ActorRole = ActorRole.CUSTOMER,
  ): Promise<BookingResponseDto> {
    return await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new NotFoundException({
          code: 'BOOKING_NOT_FOUND',
          message: `Booking with ID ${bookingId} not found`,
        });
      }

      // Check transition is defined in transition table
      if (!isTransitionDefined(booking.status, dto.toStatus)) {
        throw new ConflictException({
          code: 'TRANSITION_NOT_ALLOWED',
          message: `Transition from ${booking.status} to ${dto.toStatus} is not allowed (BOOK-STATUS-001..015)`,
        });
      }

      // Check transition is permitted for caller role
      if (!isTransitionAllowedForRole(booking.status, dto.toStatus, callerRole)) {
        throw new ForbiddenException({
          code: 'TRANSITION_ROLE_NOT_PERMITTED',
          message: `Role ${callerRole} is not permitted to perform transition ${booking.status} -> ${dto.toStatus}`,
        });
      }

      const transitionDef = getTransitionDefinition(booking.status, dto.toStatus)!;

      // Unpaid commission check for provider transitions (BOOK-STATUS-006, BOOK-STATUS-008, LEDGER-NEG-002, LEDGER-NEG-005, D-020, D-021)
      let providerUnpaidBalance = 0;
      let maxNegativeBalance = 0;
      if (booking.providerProfileId) {
        // Look up provider negative balance or standing if configured
        if (this.configService) {
          const limit = await this.configService.get<number>(
            'ledger.max_negative_balance',
            (val) => (typeof val === 'number' ? val : undefined),
          );
          if (typeof limit === 'number') maxNegativeBalance = limit;
        }
        const entries = tx.providerLedgerEntry
          ? await tx.providerLedgerEntry.findMany({
              where: { providerProfileId: booking.providerProfileId },
              select: { direction: true, amountMinor: true },
            })
          : [];
        let balance = 0;
        for (const e of entries) {
          const amt = Number(e.amountMinor);
          if (e.direction === 'CREDIT') balance += amt;
          else if (e.direction === 'DEBIT') balance -= amt;
        }
        if (balance < 0) {
          providerUnpaidBalance = -balance;
        }
      }

      // Run guard if definition has one
      if (transitionDef.guard) {
        const guardResult = transitionDef.guard({
          booking: {
            id: booking.id,
            status: booking.status,
            providerProfileId: booking.providerProfileId,
            customerProfileId: booking.customerProfileId,
            scheduledAt: booking.scheduledAt,
            version: booking.version,
            crewSize: booking.crewSize,
          },
          callerUserId,
          callerRole,
          requestedAction: dto.action,
          crewSize: dto.crewSize,
          noShowParty: dto.noShowParty,
          cancelReasonCode: dto.reason,
          providerUnpaidBalanceOwed: providerUnpaidBalance,
          providerMaxNegativeBalance: maxNegativeBalance,
        });

        if (!guardResult.allowed) {
          throw new ConflictException({
            code: guardResult.errorCode ?? 'GUARD_CHECK_FAILED',
            message: guardResult.errorMessage ?? 'Transition guard check failed',
          });
        }
      }

      // Prepare updated booking data
      const updateData: {
        status: BookingStatus;
        statusChangedAt: Date;
        version: number;
        crewSize?: number;
        noShowParty?: NoShowParty;
        cancelledByRole?: ActorRole;
        cancelReasonCode?: string;
      } = {
        status: dto.toStatus,
        statusChangedAt: new Date(),
        version: booking.version + 1,
      };

      if (dto.crewSize && dto.crewSize >= 1) {
        updateData.crewSize = dto.crewSize;
      }
      if (dto.noShowParty) {
        updateData.noShowParty = dto.noShowParty;
      }
      if (dto.toStatus === BookingStatus.CANCELLED) {
        updateData.cancelledByRole = callerRole;
        updateData.cancelReasonCode = dto.reason ?? 'UNSPECIFIED';
      }

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: updateData,
      });

      // Write immutable Job Event (DATA-002, DATA-004)
      await tx.jobEvent.create({
        data: {
          bookingId: booking.id,
          actorUserId: callerUserId ?? null,
          actorRole: callerRole,
          action: dto.action,
          fromStatus: booking.status,
          toStatus: dto.toStatus,
          reason: dto.reason ?? null,
          sourceMetadata: (dto.sourceMetadata as Prisma.InputJsonValue) ?? undefined,
        },
      });

      return this.mapBookingToDto(updatedBooking, callerRole);
    });
  }

  /**
   * Cancels a booking according to cancellation policy rules (BOOK-CANCEL-001..003, BOOK-STATUS-013).
   */
  async cancelBooking(
    bookingId: string,
    dto: CancelBookingDto,
    callerUserId?: string,
    callerRole: ActorRole = ActorRole.CUSTOMER,
  ): Promise<BookingResponseDto> {
    return this.requestTransition(
      bookingId,
      {
        action: 'CANCEL',
        toStatus: BookingStatus.CANCELLED,
        reason: dto.reasonCode,
        sourceMetadata: dto.notes ? { notes: dto.notes } : undefined,
      },
      callerUserId,
      callerRole,
    );
  }

  /**
   * Records a no-show with mandatory party (BOOK-CANCEL-004, BOOK-CANCEL-005, BOOK-STATUS-017).
   */
  async recordNoShow(
    bookingId: string,
    dto: RecordNoShowDto,
    callerUserId?: string,
    callerRole: ActorRole = ActorRole.CUSTOMER,
  ): Promise<BookingResponseDto> {
    if (!dto.party) {
      throw new BadRequestException({
        code: 'NO_SHOW_PARTY_REQUIRED',
        message: 'No-show report requires party CUSTOMER or PROVIDER (BOOK-STATUS-017)',
      });
    }

    return this.requestTransition(
      bookingId,
      {
        action: 'REPORT_NO_SHOW',
        toStatus: BookingStatus.NO_SHOW,
        noShowParty: dto.party,
        reason: dto.reason ?? `No-show reported by ${callerRole} for party ${dto.party}`,
      },
      callerUserId,
      callerRole,
    );
  }

  /**
   * Emergency / unsafe situation stop (BOOK-CANCEL-006).
   * Arrived -> Cancelled; In Progress -> Disputed. Both create safety case audit.
   */
  async safetyStop(
    bookingId: string,
    dto: SafetyStopDto,
    callerUserId?: string,
    callerRole: ActorRole = ActorRole.CUSTOMER,
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking with ID ${bookingId} not found`,
      });
    }

    if (booking.status === BookingStatus.ARRIVED) {
      return this.requestTransition(
        bookingId,
        {
          action: 'STOP_SAFETY',
          toStatus: BookingStatus.CANCELLED,
          reason: `SAFETY_STOP: ${dto.reason}`,
          sourceMetadata: { isSafetyStop: true, notes: dto.notes },
        },
        callerUserId,
        callerRole,
      );
    }

    if (
      booking.status === BookingStatus.IN_PROGRESS ||
      booking.status === BookingStatus.AWAITING_APPROVAL
    ) {
      return this.requestTransition(
        bookingId,
        {
          action: 'STOP_SAFETY',
          toStatus: BookingStatus.DISPUTED,
          reason: `SAFETY_STOP: ${dto.reason}`,
          sourceMetadata: { isSafetyStop: true, notes: dto.notes },
        },
        callerUserId,
        callerRole,
      );
    }

    throw new ConflictException({
      code: 'SAFETY_STOP_NOT_ALLOWED',
      message: `Emergency safety stop is only permitted from ARRIVED or IN_PROGRESS/AWAITING_APPROVAL (current status: ${booking.status}) (BOOK-CANCEL-006)`,
    });
  }

  /**
   * Retrieves append-only Job Events for a booking (DATA-002, DATA-004).
   */
  async getBookingEvents(bookingId: string): Promise<JobEventResponseDto[]> {
    const events = await this.prisma.jobEvent.findMany({
      where: { bookingId },
      orderBy: { occurredAt: 'asc' },
    });

    return events.map((e) => ({
      id: e.id,
      bookingId: e.bookingId,
      actorUserId: e.actorUserId,
      actorRole: e.actorRole,
      action: e.action,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      reason: e.reason,
      sourceMetadata: (e.sourceMetadata as Record<string, unknown>) ?? null,
      occurredAt: e.occurredAt.toISOString(),
    }));
  }

  /**
   * Maps Prisma Booking entity to response DTO carrying allowedNextActions (BOOK-STATUS-016).
   */
  private mapBookingToDto(booking: Booking, callerRole: ActorRole): BookingResponseDto {
    const allowedNextActions = getAllowedNextActions(booking.status, callerRole);

    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      customerProfileId: booking.customerProfileId,
      serviceId: booking.serviceId,
      providerProfileId: booking.providerProfileId,
      requestId: booking.requestId,
      sellingMode: booking.sellingMode,
      status: booking.status,
      statusChangedAt: booking.statusChangedAt.toISOString(),
      locationSnapshotId: booking.locationSnapshotId,
      scheduledAt: booking.scheduledAt ? booking.scheduledAt.toISOString() : null,
      inspectionVisitAt: booking.inspectionVisitAt ? booking.inspectionVisitAt.toISOString() : null,
      crewSize: booking.crewSize,
      acceptedQuoteId: booking.acceptedQuoteId,
      isEmergency: booking.isEmergency,
      cancelledByRole: booking.cancelledByRole,
      cancelReasonCode: booking.cancelReasonCode,
      cancellationFee: 0, // Zero cancellation fee at launch (D-023, BOOK-CANCEL-002)
      noShowParty: booking.noShowParty,
      reviewSubmittedAt: booking.reviewSubmittedAt ? booking.reviewSubmittedAt.toISOString() : null,
      version: booking.version,
      allowedNextActions,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }
}

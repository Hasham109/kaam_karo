/**
 * Unit tests for BookingService (T3.4; owner A04).
 * Requirement IDs: BOOK-STATUS-001..017, BOOK-CANCEL-001..006, DATA-002, DATA-004, SEC-BASE-007.
 * BP §15, §16, §21, §25; ARCH §4 M9, §6.1; D-003, D-004, D-018, D-021, D-028.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingService } from '../booking.service.js';
import { BookingStatus, ActorRole, NoShowParty, SellingMode } from '../booking.types.js';
import type { PrismaService } from '../../../platform/index.js';

interface MockBooking {
  id: string;
  bookingNumber: string;
  customerProfileId: string;
  serviceId: string;
  providerProfileId: string | null;
  requestId: string | null;
  sellingMode: SellingMode;
  status: BookingStatus;
  statusChangedAt: Date;
  locationSnapshotId: string | null;
  scheduledAt: Date | null;
  inspectionVisitAt: Date | null;
  crewSize: number | null;
  acceptedQuoteId: string | null;
  isEmergency: boolean;
  cancelledByRole: ActorRole | null;
  cancelReasonCode: string | null;
  noShowParty: NoShowParty | null;
  reviewSubmittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

interface MockJobEvent {
  id: string;
  bookingId: string;
  actorUserId: string | null;
  actorRole: ActorRole;
  action: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus | null;
  reason: string | null;
  sourceMetadata: Record<string, unknown> | null;
  occurredAt: Date;
}

interface MockService {
  id: string;
  quoteRequired: boolean;
}

class MockPrismaService {
  public bookings = new Map<string, MockBooking>();
  public events: MockJobEvent[] = [];
  public services = new Map<string, MockService>();

  service = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.services.get(where.id) ?? null;
    },
  };

  booking = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.bookings.get(where.id) ?? null;
    },
    create: async ({
      data,
    }: {
      data: Partial<MockBooking> & {
        customerProfileId: string;
        serviceId: string;
        sellingMode: SellingMode;
      };
    }) => {
      const id = data.id ?? `booking-${this.bookings.size + 1}`;
      const booking: MockBooking = {
        id,
        bookingNumber: data.bookingNumber ?? 'ABC1234567',
        customerProfileId: data.customerProfileId,
        serviceId: data.serviceId,
        providerProfileId: data.providerProfileId ?? null,
        requestId: data.requestId ?? null,
        sellingMode: data.sellingMode,
        status: data.status ?? BookingStatus.DRAFT,
        statusChangedAt: data.statusChangedAt ?? new Date(),
        locationSnapshotId: data.locationSnapshotId ?? null,
        scheduledAt: data.scheduledAt ?? null,
        inspectionVisitAt: data.inspectionVisitAt ?? null,
        crewSize: data.crewSize ?? null,
        acceptedQuoteId: data.acceptedQuoteId ?? null,
        isEmergency: data.isEmergency ?? false,
        cancelledByRole: data.cancelledByRole ?? null,
        cancelReasonCode: data.cancelReasonCode ?? null,
        noShowParty: data.noShowParty ?? null,
        reviewSubmittedAt: data.reviewSubmittedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: data.version ?? 1,
      };
      this.bookings.set(id, booking);
      return booking;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<MockBooking> }) => {
      const existing = this.bookings.get(where.id);
      if (!existing) throw new Error('Booking not found');
      const updated: MockBooking = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      };
      this.bookings.set(where.id, updated);
      return updated;
    },
  };

  jobEvent = {
    create: async ({ data }: { data: Omit<MockJobEvent, 'id' | 'occurredAt'> }) => {
      const event: MockJobEvent = {
        id: `event-${this.events.length + 1}`,
        bookingId: data.bookingId,
        actorUserId: data.actorUserId ?? null,
        actorRole: data.actorRole,
        action: data.action,
        fromStatus: data.fromStatus ?? null,
        toStatus: data.toStatus ?? null,
        reason: data.reason ?? null,
        sourceMetadata: data.sourceMetadata ?? null,
        occurredAt: new Date(),
      };
      this.events.push(event);
      return event;
    },
    findMany: async ({
      where,
      orderBy,
    }: {
      where: { bookingId: string };
      orderBy?: { occurredAt: 'asc' | 'desc' };
    }) => {
      let filtered = this.events.filter((e) => e.bookingId === where.bookingId);
      if (orderBy?.occurredAt === 'asc') {
        filtered = filtered.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
      }
      return filtered;
    },
  };

  $transaction = async <T>(fn: (tx: MockPrismaService) => Promise<T>): Promise<T> => {
    return fn(this);
  };
}

describe('BookingService (T3.4; BOOK-STATUS-001..017, BOOK-CANCEL-001..006)', () => {
  let service: BookingService;
  let mockPrisma: MockPrismaService;

  const customerId = 'cust-uuid-1111';
  const serviceId = 'svc-uuid-3333';
  const quoteRequiredServiceId = 'svc-quote-4444';

  beforeEach(() => {
    mockPrisma = new MockPrismaService();
    mockPrisma.services.set(serviceId, { id: serviceId, quoteRequired: false });
    mockPrisma.services.set(quoteRequiredServiceId, {
      id: quoteRequiredServiceId,
      quoteRequired: true,
    });

    service = new BookingService(mockPrisma as unknown as PrismaService);
  });

  describe('createBooking (BOOK-STATUS-001..003, SEC-BASE-007)', () => {
    it('creates draft booking when submitImmediately is false and logs initial Job Event', async () => {
      const res = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
      });

      expect(res.id).toBeDefined();
      expect(res.bookingNumber).toHaveLength(10);
      expect(res.status).toBe(BookingStatus.DRAFT);
      expect(res.version).toBe(1);
      expect(res.allowedNextActions.map((a) => a.action)).toContain('SUBMIT');

      // Check JobEvent written
      expect(mockPrisma.events.length).toBe(1);
      expect(mockPrisma.events[0]!.action).toBe('CREATE_DRAFT');
      expect(mockPrisma.events[0]!.toStatus).toBe(BookingStatus.DRAFT);
    });

    it('creates REQUESTED booking when submitImmediately is true for regular catalog service', async () => {
      const res = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.INSTANT,
        submitImmediately: true,
      });

      expect(res.status).toBe(BookingStatus.REQUESTED);
      expect(mockPrisma.events[0]!.action).toBe('SUBMIT');
      expect(mockPrisma.events[0]!.toStatus).toBe(BookingStatus.REQUESTED);
    });

    it('creates QUOTE_PENDING booking when submitImmediately is true for quote-required service (CAT-SVC-003, D-028)', async () => {
      const res = await service.createBooking({
        customerProfileId: customerId,
        serviceId: quoteRequiredServiceId,
        sellingMode: SellingMode.REQUEST_QUOTES,
        submitImmediately: true,
      });

      expect(res.status).toBe(BookingStatus.QUOTE_PENDING);
      expect(mockPrisma.events[0]!.action).toBe('SUBMIT');
      expect(mockPrisma.events[0]!.toStatus).toBe(BookingStatus.QUOTE_PENDING);
    });

    it('strictly forbids and rejects client-sent status field (BOOK-STATUS-016, SEC-BASE-007)', async () => {
      await expect(
        service.createBooking({
          customerProfileId: customerId,
          serviceId,
          sellingMode: SellingMode.INSTANT,
          // @ts-expect-error client attempting to tamper with status
          status: BookingStatus.COMPLETED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBookingById (BOOK-STATUS-016)', () => {
    it('returns booking with server-given allowed actions for requested role', async () => {
      const created = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
      });

      const customerView = await service.getBookingById(created.id, ActorRole.CUSTOMER);
      expect(customerView.allowedNextActions.map((a) => a.action)).toContain('SUBMIT');

      const providerView = await service.getBookingById(created.id, ActorRole.PROVIDER);
      expect(providerView.allowedNextActions.length).toBe(0);
    });

    it('throws NotFoundException for non-existent booking', async () => {
      await expect(service.getBookingById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestTransition (BOOK-STATUS-001..017)', () => {
    it('executes valid transition, increments version, and writes immutable Job Event', async () => {
      const booking = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
      });

      const updated = await service.requestTransition(
        booking.id,
        {
          action: 'SUBMIT',
          toStatus: BookingStatus.REQUESTED,
          reason: 'Customer submitted form',
        },
        'user-cust-1',
        ActorRole.CUSTOMER,
      );

      expect(updated.status).toBe(BookingStatus.REQUESTED);
      expect(updated.version).toBe(2);

      // Verify Job Event
      const events = await service.getBookingEvents(booking.id);
      expect(events.length).toBe(2);
      expect(events[1]!.fromStatus).toBe(BookingStatus.DRAFT);
      expect(events[1]!.toStatus).toBe(BookingStatus.REQUESTED);
      expect(events[1]!.action).toBe('SUBMIT');
      expect(events[1]!.reason).toBe('Customer submitted form');
    });

    it('rejects unlisted transition pair with ConflictException (409 TRANSITION_NOT_ALLOWED)', async () => {
      const booking = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
      });

      await expect(
        service.requestTransition(
          booking.id,
          {
            action: 'COMPLETE',
            toStatus: BookingStatus.COMPLETED,
          },
          'user-1',
          ActorRole.CUSTOMER,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects transition attempted by unauthorized actor role', async () => {
      const booking = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
      });

      // Provider cannot submit draft
      await expect(
        service.requestTransition(
          booking.id,
          {
            action: 'SUBMIT',
            toStatus: BookingStatus.REQUESTED,
          },
          'user-prov-1',
          ActorRole.PROVIDER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('requires crewSize when provider accepts requested booking (D-004)', async () => {
      const booking = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
        submitImmediately: true,
      });

      // Provider tries to accept without crewSize
      await expect(
        service.requestTransition(
          booking.id,
          {
            action: 'ACCEPT',
            toStatus: BookingStatus.ACCEPTED,
          },
          'user-prov-1',
          ActorRole.PROVIDER,
        ),
      ).rejects.toThrow(ConflictException);

      // Provider accepts with crewSize = 2
      const accepted = await service.requestTransition(
        booking.id,
        {
          action: 'ACCEPT',
          toStatus: BookingStatus.ACCEPTED,
          crewSize: 2,
        },
        'user-prov-1',
        ActorRole.PROVIDER,
      );

      expect(accepted.status).toBe(BookingStatus.ACCEPTED);
      expect(accepted.crewSize).toBe(2);
    });
  });

  describe('cancelBooking (BOOK-CANCEL-001..003, BOOK-STATUS-013)', () => {
    it('cancels requested booking with reason code and fee 0', async () => {
      const booking = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
        submitImmediately: true,
      });

      const cancelled = await service.cancelBooking(
        booking.id,
        {
          reasonCode: 'CHANGE_OF_PLANS',
          notes: 'Customer changed plans',
        },
        'user-cust-1',
        ActorRole.CUSTOMER,
      );

      expect(cancelled.status).toBe(BookingStatus.CANCELLED);
      expect(cancelled.cancelledByRole).toBe(ActorRole.CUSTOMER);
      expect(cancelled.cancelReasonCode).toBe('CHANGE_OF_PLANS');
      expect(cancelled.cancellationFee).toBe(0);
    });
  });

  describe('recordNoShow (BOOK-CANCEL-004, BOOK-CANCEL-005, BOOK-STATUS-017)', () => {
    it('records provider no-show reported by customer from SCHEDULED status', async () => {
      const booking = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
        submitImmediately: true,
      });
      // Move to ACCEPTED then SCHEDULED
      await service.requestTransition(
        booking.id,
        { action: 'ACCEPT', toStatus: BookingStatus.ACCEPTED, crewSize: 1 },
        'user-prov-1',
        ActorRole.PROVIDER,
      );
      await service.requestTransition(
        booking.id,
        { action: 'CONFIRM_SCHEDULE', toStatus: BookingStatus.SCHEDULED },
        'user-prov-1',
        ActorRole.PROVIDER,
      );

      const noShow = await service.recordNoShow(
        booking.id,
        {
          party: NoShowParty.PROVIDER,
          reason: "Provider didn't show up after 1 hour",
        },
        'user-cust-1',
        ActorRole.CUSTOMER,
      );

      expect(noShow.status).toBe(BookingStatus.NO_SHOW);
      expect(noShow.noShowParty).toBe(NoShowParty.PROVIDER);
    });
  });

  describe('safetyStop (BOOK-CANCEL-006)', () => {
    it('transitions ARRIVED to CANCELLED with safety stop reason', async () => {
      const booking = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
        submitImmediately: true,
      });
      await service.requestTransition(
        booking.id,
        { action: 'ACCEPT', toStatus: BookingStatus.ACCEPTED, crewSize: 1 },
        'user-prov-1',
        ActorRole.PROVIDER,
      );
      await service.requestTransition(
        booking.id,
        { action: 'CONFIRM_SCHEDULE', toStatus: BookingStatus.SCHEDULED },
        'user-prov-1',
        ActorRole.PROVIDER,
      );
      await service.requestTransition(
        booking.id,
        { action: 'START_TRIP', toStatus: BookingStatus.PROVIDER_EN_ROUTE },
        'user-prov-1',
        ActorRole.PROVIDER,
      );
      await service.requestTransition(
        booking.id,
        { action: 'ARRIVE', toStatus: BookingStatus.ARRIVED },
        'user-prov-1',
        ActorRole.PROVIDER,
      );

      const stopped = await service.safetyStop(
        booking.id,
        {
          reason: 'Hostile customer environment',
          notes: 'Provider felt unsafe entering property',
        },
        'user-prov-1',
        ActorRole.PROVIDER,
      );

      expect(stopped.status).toBe(BookingStatus.CANCELLED);
      expect(stopped.cancelReasonCode).toContain('SAFETY_STOP');
    });

    it('transitions IN_PROGRESS to DISPUTED with safety stop reason', async () => {
      const booking = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
        submitImmediately: true,
      });
      await service.requestTransition(
        booking.id,
        { action: 'ACCEPT', toStatus: BookingStatus.ACCEPTED, crewSize: 1 },
        'user-prov-1',
        ActorRole.PROVIDER,
      );
      await service.requestTransition(
        booking.id,
        { action: 'CONFIRM_SCHEDULE', toStatus: BookingStatus.SCHEDULED },
        'user-prov-1',
        ActorRole.PROVIDER,
      );
      await service.requestTransition(
        booking.id,
        { action: 'START_TRIP', toStatus: BookingStatus.PROVIDER_EN_ROUTE },
        'user-prov-1',
        ActorRole.PROVIDER,
      );
      await service.requestTransition(
        booking.id,
        { action: 'ARRIVE', toStatus: BookingStatus.ARRIVED },
        'user-prov-1',
        ActorRole.PROVIDER,
      );
      await service.requestTransition(
        booking.id,
        { action: 'START_WORK', toStatus: BookingStatus.IN_PROGRESS },
        'user-prov-1',
        ActorRole.PROVIDER,
      );

      const disputed = await service.safetyStop(
        booking.id,
        {
          reason: 'Dangerous electrical wiring hazard discovered',
        },
        'user-prov-1',
        ActorRole.PROVIDER,
      );

      expect(disputed.status).toBe(BookingStatus.DISPUTED);
    });

    it('rejects safety stop from non-active status such as DRAFT', async () => {
      const booking = await service.createBooking({
        customerProfileId: customerId,
        serviceId,
        sellingMode: SellingMode.CHOOSE_SUPPLIER,
      });

      await expect(
        service.safetyStop(booking.id, { reason: 'Test' }, 'user-1', ActorRole.CUSTOMER),
      ).rejects.toThrow(ConflictException);
    });
  });
});

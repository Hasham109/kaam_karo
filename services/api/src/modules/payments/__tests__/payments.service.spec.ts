/**
 * Unit tests for PaymentsService (Module M11, T6.1; owner A09).
 * Requirement IDs: PAY-001..003, PAY-008, PAY-TIMING-001, LEDGER-001..002.
 * ARCH §4 M11, §6.8; BP §17, §25, §26, §31.2; D-003, D-006, D-008, D-015, D-016, D-030.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from '../payments.service.js';
import { FakePaymentGateway } from '../fake-payment-gateway.js';
import { BookingStatus, ActorRole, PaymentMethod, PaymentStatus } from '../payments.types.js';
import type { PrismaService } from '../../../platform/index.js';

interface MockBooking {
  id: string;
  bookingNumber: string;
  customerProfileId: string;
  providerProfileId: string | null;
  status: BookingStatus;
}

interface MockFareLine {
  id: string;
  bookingId: string;
  lineType: string;
  description: string;
  amountMinor: bigint;
  state: string;
}

interface MockPayment {
  id: string;
  paymentRef: string;
  bookingId: string;
  customerProfileId: string;
  providerProfileId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountMinor: bigint;
  gatewayRef: string | null;
  actorUserId: string | null;
  occurredAt: Date;
}

interface MockPaymentMethodRecord {
  id: string;
  bookingId: string;
  method: PaymentMethod;
  recordedByUserId: string;
  recordedAt: Date;
}

class MockPrismaService {
  public bookings = new Map<string, MockBooking>();
  public fareLines: MockFareLine[] = [];
  public payments: MockPayment[] = [];
  public paymentMethodRecords = new Map<string, MockPaymentMethodRecord>();

  $transaction = async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(this as unknown);

  booking = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.bookings.get(where.id) ?? null;
    },
  };

  fareLine = {
    findMany: async ({ where }: { where: { bookingId: string } }) => {
      return this.fareLines.filter((l) => l.bookingId === where.bookingId);
    },
  };

  payment = {
    findFirst: async ({
      where,
      orderBy,
    }: {
      where: {
        bookingId?: string;
        paymentRef?: string;
        status?: PaymentStatus | { in: PaymentStatus[] };
      };
      orderBy?: { occurredAt?: 'asc' | 'desc' };
    }) => {
      let filtered = [...this.payments];
      if (where.bookingId) {
        filtered = filtered.filter((p) => p.bookingId === where.bookingId);
      }
      if (where.paymentRef) {
        filtered = filtered.filter((p) => p.paymentRef === where.paymentRef);
      }
      if (where.status) {
        if (typeof where.status === 'object' && 'in' in where.status) {
          const list = where.status.in;
          filtered = filtered.filter((p) => list.includes(p.status));
        } else {
          filtered = filtered.filter((p) => p.status === where.status);
        }
      }
      if (orderBy?.occurredAt === 'desc') {
        filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
      } else {
        filtered.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
      }
      return filtered[0] ?? null;
    },
    findMany: async ({
      where,
      orderBy,
    }: {
      where: { bookingId: string };
      orderBy?: { occurredAt: 'asc' | 'desc' };
    }) => {
      const list = this.payments.filter((p) => p.bookingId === where.bookingId);
      if (orderBy?.occurredAt === 'asc') {
        list.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
      }
      return list;
    },
    create: async ({ data }: { data: Omit<MockPayment, 'id' | 'occurredAt'> }) => {
      const record: MockPayment = {
        id: `pay-${this.payments.length + 1}`,
        occurredAt: new Date(),
        ...data,
      };
      this.payments.push(record);
      return record;
    },
  };

  paymentMethodRecord = {
    findUnique: async ({ where }: { where: { bookingId: string } }) => {
      return this.paymentMethodRecords.get(where.bookingId) ?? null;
    },
    create: async ({ data }: { data: Omit<MockPaymentMethodRecord, 'id' | 'recordedAt'> }) => {
      const record: MockPaymentMethodRecord = {
        id: `pmr-${this.paymentMethodRecords.size + 1}`,
        recordedAt: new Date(),
        ...data,
      };
      this.paymentMethodRecords.set(data.bookingId, record);
      return record;
    },
  };
}

describe('PaymentsService (T6.1, Module M11)', () => {
  let prisma: MockPrismaService;
  let gateway: FakePaymentGateway;
  let service: PaymentsService;

  beforeEach(() => {
    prisma = new MockPrismaService();
    gateway = new FakePaymentGateway();
    service = new PaymentsService(prisma as unknown as PrismaService, gateway);
  });

  describe('Post-Completion Payment Timing Gating (D-003, PAY-TIMING-001)', () => {
    it.each([
      BookingStatus.DRAFT,
      BookingStatus.REQUESTED,
      BookingStatus.QUOTE_PENDING,
      BookingStatus.QUOTED,
      BookingStatus.ACCEPTED,
      BookingStatus.SCHEDULED,
      BookingStatus.PROVIDER_EN_ROUTE,
      BookingStatus.ARRIVED,
      BookingStatus.IN_PROGRESS,
      BookingStatus.AWAITING_APPROVAL,
      BookingStatus.DISPUTED,
      BookingStatus.CANCELLED,
      BookingStatus.EXPIRED,
      BookingStatus.REJECTED,
      BookingStatus.NO_SHOW,
    ])(
      'strictly rejects payment initiation when booking is in %s state with 409',
      async (status) => {
        const bookingId = `book-${status}`;
        prisma.bookings.set(bookingId, {
          id: bookingId,
          bookingNumber: 'BKG12345',
          customerProfileId: 'cust-1',
          providerProfileId: 'prov-1',
          status,
        });

        await expect(
          service.initiatePayment({
            bookingId,
            method: PaymentMethod.DIGITAL,
          }),
        ).rejects.toThrow(ConflictException);

        await expect(
          service.initiatePayment({
            bookingId,
            method: PaymentMethod.DIGITAL,
          }),
        ).rejects.toMatchObject({
          response: { code: 'PAYMENT_NOT_ALLOWED_BEFORE_COMPLETION' },
        });
      },
    );

    it('strictly rejects cash recording when booking is not Completed with 409', async () => {
      const bookingId = 'book-in-progress';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-1',
        status: BookingStatus.IN_PROGRESS,
      });

      await expect(
        service.recordCashPayment({ bookingId, amountMinor: 250000 }, 'prov-user-1'),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.recordCashPayment({ bookingId, amountMinor: 250000 }, 'prov-user-1'),
      ).rejects.toMatchObject({
        response: { code: 'PAYMENT_NOT_ALLOWED_BEFORE_COMPLETION' },
      });
    });

    it('successfully initiates payment when booking is in COMPLETED state', async () => {
      const bookingId = 'book-completed';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-1',
        status: BookingStatus.COMPLETED,
      });

      // Add approved fare lines
      prisma.fareLines.push({
        id: 'line-1',
        bookingId,
        lineType: 'LABOR',
        description: 'AC Gas Refill',
        amountMinor: 200000n,
        state: 'APPROVED',
      });

      const result = await service.initiatePayment({
        bookingId,
        method: PaymentMethod.DIGITAL,
      });

      expect(result).toBeDefined();
      expect(result.bookingId).toBe(bookingId);
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.method).toBe(PaymentMethod.DIGITAL);
      expect(result.amountMinor).toBe(200000);
      expect(result.gatewayRef).toMatch(/^fake_gw_/);
      expect(result.checkoutUrl).toContain('checkout.sandbox.fakegateway.local');
      expect(result.isSettled).toBe(false);
    });
  });

  describe('Double-Tap Idempotency Protection (PAY-002, REL-008)', () => {
    it('returns identical payment response and creates exactly one DB row on double-tap with idempotencyKey', async () => {
      const bookingId = 'book-idempotent';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-1',
        status: BookingStatus.COMPLETED,
      });

      const idempotencyKey = 'client-tap-uuid-1234';

      // First tap
      const tap1 = await service.initiatePayment({
        bookingId,
        method: PaymentMethod.DIGITAL,
        idempotencyKey,
      });

      // Second tap (immediate double-click)
      const tap2 = await service.initiatePayment({
        bookingId,
        method: PaymentMethod.DIGITAL,
        idempotencyKey,
      });

      expect(tap1.paymentRef).toBe(tap2.paymentRef);
      expect(tap1.gatewayRef).toBe(tap2.gatewayRef);
      expect(tap1.amountMinor).toBe(tap2.amountMinor);

      // Verify exactly one payment row was written to the database
      expect(prisma.payments.length).toBe(1);
    });

    it('returns existing pending payment on repeated tap without idempotency key to prevent duplicate pending transactions', async () => {
      const bookingId = 'book-pending-dup';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-1',
        status: BookingStatus.COMPLETED,
      });

      const tap1 = await service.initiatePayment({
        bookingId,
        method: PaymentMethod.DIGITAL,
      });

      const tap2 = await service.initiatePayment({
        bookingId,
        method: PaymentMethod.DIGITAL,
      });

      expect(tap1.paymentRef).toBe(tap2.paymentRef);
      expect(prisma.payments.length).toBe(1);
    });
  });

  describe('Digital Gateway Flow & Confirmation (PAY-001, PAY-003, PAY-008)', () => {
    it('confirms digital payment and appends immutable SUCCEEDED row', async () => {
      const bookingId = 'book-digital-confirm';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-1',
        status: BookingStatus.COMPLETED,
      });

      const initiated = await service.initiatePayment({
        bookingId,
        method: PaymentMethod.DIGITAL,
        amountMinor: 350000,
      });

      expect(prisma.payments.length).toBe(1);
      expect(prisma.payments[0]!.status).toBe(PaymentStatus.PENDING);

      // Gateway confirmation webhook
      const confirmed = await service.confirmDigitalPayment({
        paymentRef: initiated.paymentRef,
        gatewayRef: initiated.gatewayRef!,
        success: true,
      });

      expect(confirmed.status).toBe(PaymentStatus.SUCCEEDED);
      expect(confirmed.isSettled).toBe(true);

      // Verify append-only invariant (BP §26): original row is preserved, new row added
      expect(prisma.payments.length).toBe(2);
      expect(prisma.payments[0]!.status).toBe(PaymentStatus.PENDING);
      expect(prisma.payments[1]!.status).toBe(PaymentStatus.SUCCEEDED);
    });

    it('records FAILED row when digital payment fails', async () => {
      const bookingId = 'book-digital-failed';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-1',
        status: BookingStatus.COMPLETED,
      });

      const initiated = await service.initiatePayment({
        bookingId,
        method: PaymentMethod.DIGITAL,
      });

      const failed = await service.confirmDigitalPayment({
        paymentRef: initiated.paymentRef,
        gatewayRef: initiated.gatewayRef!,
        success: false,
        failureReason: 'INSUFFICIENT_FUNDS',
      });

      expect(failed.status).toBe(PaymentStatus.FAILED);
      expect(failed.isSettled).toBe(false);
      expect(prisma.payments.length).toBe(2);
      expect(prisma.payments[1]!.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('Provider Cash Recording & Invariants (D-016, D-030, LEDGER-001..002)', () => {
    it('allows provider to record cash payment on Completed booking', async () => {
      const bookingId = 'book-cash-ok';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-profile-1',
        status: BookingStatus.COMPLETED,
      });

      const result = await service.recordCashPayment(
        { bookingId, amountMinor: 150000 },
        'prov-user-1',
      );

      expect(result.status).toBe(PaymentStatus.CASH_RECORDED);
      expect(result.method).toBe(PaymentMethod.CASH);
      expect(result.isSettled).toBe(true);

      // Verify PaymentMethodRecord created
      const pmr = prisma.paymentMethodRecords.get(bookingId);
      expect(pmr).toBeDefined();
      expect(pmr?.method).toBe(PaymentMethod.CASH);
      expect(pmr?.recordedByUserId).toBe('prov-user-1');
    });

    it('refuses customer from recording cash via initiate endpoint (D-030)', async () => {
      const bookingId = 'book-cust-cash';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-profile-1',
        status: BookingStatus.COMPLETED,
      });

      await expect(
        service.initiatePayment(
          { bookingId, method: PaymentMethod.CASH },
          'cust-user-1',
          ActorRole.CUSTOMER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses cash recording if digital payment has already SUCCEEDED (LEDGER-002)', async () => {
      const bookingId = 'book-digital-succeeded';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-profile-1',
        status: BookingStatus.COMPLETED,
      });

      // Digital payment already succeeded
      prisma.payments.push({
        id: 'pay-1',
        paymentRef: 'ref-1',
        bookingId,
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-profile-1',
        method: PaymentMethod.DIGITAL,
        status: PaymentStatus.SUCCEEDED,
        amountMinor: 300000n,
        gatewayRef: 'gw-1',
        actorUserId: null,
        occurredAt: new Date(),
      });

      await expect(service.recordCashPayment({ bookingId }, 'prov-user-1')).rejects.toThrow(
        ConflictException,
      );

      await expect(service.recordCashPayment({ bookingId }, 'prov-user-1')).rejects.toMatchObject({
        response: { code: 'DIGITAL_PAYMENT_ALREADY_SUCCEEDED' },
      });
    });

    it('refuses cash recording if already recorded once (LEDGER-002)', async () => {
      const bookingId = 'book-cash-twice';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-profile-1',
        status: BookingStatus.COMPLETED,
      });

      await service.recordCashPayment({ bookingId }, 'prov-user-1');

      await expect(service.recordCashPayment({ bookingId }, 'prov-user-1')).rejects.toThrow(
        ConflictException,
      );

      await expect(service.recordCashPayment({ bookingId }, 'prov-user-1')).rejects.toMatchObject({
        response: { code: 'PAYMENT_ALREADY_RECORDED' },
      });
    });
  });

  describe('Payment Status Query (getBookingPaymentStatus, D-030)', () => {
    it('returns hasPayment=false for unpaid booking', async () => {
      const bookingId = 'book-unpaid';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-1',
        status: BookingStatus.COMPLETED,
      });

      const status = await service.getBookingPaymentStatus(bookingId);
      expect(status.hasPayment).toBe(false);
      expect(status.isSettled).toBe(false);
      expect(status.history.length).toBe(0);
    });

    it('returns "Cash to Provider" label when cash was recorded (D-030)', async () => {
      const bookingId = 'book-paid-cash';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-1',
        status: BookingStatus.COMPLETED,
      });

      await service.recordCashPayment({ bookingId, amountMinor: 250000 }, 'prov-user');

      const status = await service.getBookingPaymentStatus(bookingId);
      expect(status.hasPayment).toBe(true);
      expect(status.isSettled).toBe(true);
      expect(status.currentStatus).toBe(PaymentStatus.CASH_RECORDED);
      expect(status.method).toBe(PaymentMethod.CASH);
      expect(status.paidByLabel).toBe('Cash to Provider');
    });

    it('returns "Digital via Gateway" label when digital payment succeeded', async () => {
      const bookingId = 'book-paid-digital';
      prisma.bookings.set(bookingId, {
        id: bookingId,
        bookingNumber: 'BKG12345',
        customerProfileId: 'cust-1',
        providerProfileId: 'prov-1',
        status: BookingStatus.COMPLETED,
      });

      const initiated = await service.initiatePayment({
        bookingId,
        method: PaymentMethod.DIGITAL,
      });

      await service.confirmDigitalPayment({
        paymentRef: initiated.paymentRef,
        gatewayRef: initiated.gatewayRef!,
        success: true,
      });

      const status = await service.getBookingPaymentStatus(bookingId);
      expect(status.hasPayment).toBe(true);
      expect(status.isSettled).toBe(true);
      expect(status.currentStatus).toBe(PaymentStatus.SUCCEEDED);
      expect(status.method).toBe(PaymentMethod.DIGITAL);
      expect(status.paidByLabel).toBe('Digital via Gateway');
    });
  });
});

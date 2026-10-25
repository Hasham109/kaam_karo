/**
 * Unit tests for LedgerService (Module M11, T6.6; owner A09 + A12 + A13 + A11).
 * Requirement IDs: LEDGER-001..007, PAY-003..004, D-016, D-020, D-021, D-030; ARCH §6.8; BP §17, §25, §26.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- loosely typed Prisma mock payloads */
import { describe, expect, it, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LedgerService } from '../ledger.service.js';
import { CommissionService } from '../commission.service.js';
import { PaymentsService } from '../payments.service.js';
import { FakePaymentGateway } from '../fake-payment-gateway.js';
import {
  BookingStatus,
  LedgerDirection,
  LedgerEntryType,
  PaymentMethod,
  PaymentStatus,
} from '../payments.types.js';
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
  createdAt: Date;
}

interface MockLedgerEntry {
  id: string;
  providerProfileId: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amountMinor: bigint;
  bookingId: string | null;
  paymentId: string | null;
  commissionPaymentSubmissionId: string | null;
  settlementId: string | null;
  reversesEntryId: string | null;
  billTotalMinor: bigint | null;
  commissionableMinor: bigint | null;
  commissionMinor: bigint | null;
  commissionRate: any;
  reason: string | null;
  actorUserId: string | null;
  idempotencyKey: string;
  createdAt: Date;
}

interface MockConfigRule {
  id: string;
  key: string;
  scope: string;
  value: unknown;
  effectiveFrom: Date;
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

class MockPrismaService {
  public bookings = new Map<string, MockBooking>();
  public fareLines: MockFareLine[] = [];
  public ledgerEntries: MockLedgerEntry[] = [];
  public configRules: MockConfigRule[] = [];
  public payments: MockPayment[] = [];
  public paymentMethodRecords = new Map<string, any>();

  $transaction = async <T>(fn: (tx: any) => Promise<T>): Promise<T> => fn(this);

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

  paymentMethodRecord = {
    findUnique: async ({ where }: { where: { bookingId: string } }) => {
      return this.paymentMethodRecords.get(where.bookingId) ?? null;
    },
    create: async ({ data }: { data: any }) => {
      const rec = {
        id: `pmr-${this.paymentMethodRecords.size + 1}`,
        ...data,
        recordedAt: new Date(),
      };
      this.paymentMethodRecords.set(data.bookingId, rec);
      return rec;
    },
  };

  payment = {
    findFirst: async ({ where, orderBy }: { where: any; orderBy?: any }) => {
      let matches = this.payments.filter((p) => {
        if (where.paymentRef && p.paymentRef !== where.paymentRef) return false;
        if (where.bookingId && p.bookingId !== where.bookingId) return false;
        if (where.status?.in && !where.status.in.includes(p.status)) return false;
        if (where.status && typeof where.status === 'string' && p.status !== where.status)
          return false;
        return true;
      });
      if (orderBy?.occurredAt === 'desc') {
        matches = [...matches].reverse();
      }
      return matches[0] ?? null;
    },
    findMany: async ({ where }: { where: { bookingId: string } }) => {
      return this.payments.filter((p) => p.bookingId === where.bookingId);
    },
    create: async ({ data }: { data: any }) => {
      const p: MockPayment = {
        id: `pay-${this.payments.length + 1}`,
        paymentRef: data.paymentRef,
        bookingId: data.bookingId,
        customerProfileId: data.customerProfileId,
        providerProfileId: data.providerProfileId,
        method: data.method,
        status: data.status,
        amountMinor: BigInt(data.amountMinor),
        gatewayRef: data.gatewayRef ?? null,
        actorUserId: data.actorUserId ?? null,
        occurredAt: new Date(),
      };
      this.payments.push(p);
      return p;
    },
  };

  configRule = {
    findFirst: async ({ where }: { where: { key: string; scope?: string } }) => {
      return this.configRules.find((r) => r.key === where.key) ?? null;
    },
  };

  providerLedgerEntry = {
    findFirst: async ({
      where,
    }: {
      where: {
        bookingId?: string;
        entryType?: { in: LedgerEntryType[] };
        providerProfileId?: string;
      };
    }) => {
      return (
        this.ledgerEntries.find((e) => {
          if (where.bookingId && e.bookingId !== where.bookingId) return false;
          if (where.entryType?.in && !where.entryType.in.includes(e.entryType)) return false;
          if (where.providerProfileId && e.providerProfileId !== where.providerProfileId)
            return false;
          return true;
        }) ?? null
      );
    },
    findMany: async ({
      where,
      orderBy,
      take,
    }: {
      where: { providerProfileId: string };
      orderBy?: { createdAt: 'asc' | 'desc' };
      take?: number;
      select?: any;
    }) => {
      let results = this.ledgerEntries.filter(
        (e) => e.providerProfileId === where.providerProfileId,
      );
      if (orderBy?.createdAt === 'desc') {
        results = [...results].reverse();
      }
      if (take !== undefined) {
        results = results.slice(0, take);
      }
      return results;
    },
    create: async ({ data }: { data: any }) => {
      const entry: MockLedgerEntry = {
        id: `entry-${this.ledgerEntries.length + 1}`,
        providerProfileId: data.providerProfileId,
        entryType: data.entryType,
        direction: data.direction,
        amountMinor: BigInt(data.amountMinor),
        bookingId: data.bookingId ?? null,
        paymentId: data.paymentId ?? null,
        commissionPaymentSubmissionId: data.commissionPaymentSubmissionId ?? null,
        settlementId: data.settlementId ?? null,
        reversesEntryId: data.reversesEntryId ?? null,
        billTotalMinor: data.billTotalMinor ? BigInt(data.billTotalMinor) : null,
        commissionableMinor: data.commissionableMinor ? BigInt(data.commissionableMinor) : null,
        commissionMinor: data.commissionMinor ? BigInt(data.commissionMinor) : null,
        commissionRate: data.commissionRate ?? null,
        reason: data.reason ?? null,
        actorUserId: data.actorUserId ?? null,
        idempotencyKey: data.idempotencyKey,
        createdAt: new Date(),
      };
      this.ledgerEntries.push(entry);
      return entry;
    },
  };
}

describe('LedgerService (T6.6)', () => {
  let prisma: MockPrismaService;
  let commissionService: CommissionService;
  let ledgerService: LedgerService;

  const providerId = 'provider-profile-101';
  const customerId = 'customer-profile-202';
  const bookingId = 'booking-worked-example-608';

  beforeEach(() => {
    prisma = new MockPrismaService();
    prisma.configRules = [
      {
        id: 'cfg-rate',
        key: 'commission.rate',
        scope: 'GLOBAL',
        value: 0.3,
        effectiveFrom: new Date(),
      },
      {
        id: 'cfg-base',
        key: 'commission.base_line_types',
        scope: 'GLOBAL',
        value: ['LABOR'],
        effectiveFrom: new Date(),
      },
    ];

    commissionService = new CommissionService(prisma as unknown as PrismaService);
    ledgerService = new LedgerService(prisma as unknown as PrismaService, commissionService);

    // Setup ARCH §6.8 worked example booking:
    // Labour: 2,000 (200,000 paisa), Parts: 1,500 (150,000 paisa), Visit: 300 (30,000 paisa)
    // Bill total: 3,800 (380,000 paisa)
    // Commission: 600 (60,000 paisa)
    // Provider share: 3,200 (320,000 paisa)
    prisma.bookings.set(bookingId, {
      id: bookingId,
      bookingNumber: 'KB-2026-608',
      customerProfileId: customerId,
      providerProfileId: providerId,
      status: BookingStatus.COMPLETED,
    });

    prisma.fareLines = [
      {
        id: 'fl-1',
        bookingId,
        lineType: 'LABOR',
        description: 'AC compressor repair labour',
        amountMinor: BigInt(200_000),
        state: 'APPROVED',
        createdAt: new Date(),
      },
      {
        id: 'fl-2',
        bookingId,
        lineType: 'PARTS',
        description: 'Capacitor',
        amountMinor: BigInt(150_000),
        state: 'APPROVED',
        createdAt: new Date(),
      },
      {
        id: 'fl-3',
        bookingId,
        lineType: 'VISIT',
        description: 'Visit fee',
        amountMinor: BigInt(30_000),
        state: 'APPROVED',
        createdAt: new Date(),
      },
    ];
  });

  describe('Cash Job Settlement (ARCH §6.8, D-016)', () => {
    it('debits 30% of labour from provider balance when job is paid in CASH', async () => {
      const entry = await ledgerService.recordJobSettlement({
        bookingId,
        paymentId: 'pay-cash-1',
        method: PaymentMethod.CASH,
        actorUserId: 'provider-user-1',
      });

      expect(entry.entryType).toBe(LedgerEntryType.COMMISSION_DEBIT);
      expect(entry.direction).toBe(LedgerDirection.DEBIT);
      // 30% of 200,000 paisa labour = 60,000 paisa (Rs. 600)
      expect(entry.amountMinor).toBe(60_000);
      expect(entry.netImpactMinor).toBe(-60_000);
      expect(entry.billTotalMinor).toBe(380_000);
      expect(entry.commissionableMinor).toBe(200_000);
      expect(entry.commissionMinor).toBe(60_000);
      expect(entry.bookingId).toBe(bookingId);

      // Verify balance becomes negative if provider started with 0 (unpaid commission liability, D-020)
      const balance = await ledgerService.getProviderBalance(providerId);
      expect(balance.balanceMinor).toBe(-60_000);
      expect(balance.isNegative).toBe(true);
      expect(balance.totalDebitsMinor).toBe(60_000);
      expect(balance.totalCreditsMinor).toBe(0);
    });
  });

  describe('Digital Job Settlement (ARCH §6.8, D-016)', () => {
    it('credits bill total minus platform commission to provider balance when job is DIGITAL', async () => {
      const entry = await ledgerService.recordJobSettlement({
        bookingId,
        paymentId: 'pay-digital-1',
        method: PaymentMethod.DIGITAL,
      });

      expect(entry.entryType).toBe(LedgerEntryType.JOB_CREDIT);
      expect(entry.direction).toBe(LedgerDirection.CREDIT);
      // Provider keeps: 380,000 bill - 60,000 commission = 320,000 paisa (Rs. 3,200)
      expect(entry.amountMinor).toBe(320_000);
      expect(entry.netImpactMinor).toBe(320_000);
      expect(entry.billTotalMinor).toBe(380_000);
      expect(entry.commissionableMinor).toBe(200_000);
      expect(entry.commissionMinor).toBe(60_000);
      expect(entry.bookingId).toBe(bookingId);

      // Verify balance increases
      const balance = await ledgerService.getProviderBalance(providerId);
      expect(balance.balanceMinor).toBe(320_000);
      expect(balance.isNegative).toBe(false);
      expect(balance.totalCreditsMinor).toBe(320_000);
      expect(balance.totalDebitsMinor).toBe(0);
    });
  });

  describe('Idempotency & Duplicate Settlement Prevention (LEDGER-002, REL-008)', () => {
    it('returns existing ledger entry without writing duplicate rows on double execution', async () => {
      const first = await ledgerService.recordJobSettlement({
        bookingId,
        method: PaymentMethod.CASH,
      });

      const second = await ledgerService.recordJobSettlement({
        bookingId,
        method: PaymentMethod.CASH,
      });

      expect(second.id).toBe(first.id);
      expect(prisma.ledgerEntries).toHaveLength(1);
    });
  });

  describe('Balance Multi-Transaction Accounting (ARCH §6.8, BP §26)', () => {
    it('accurately computes balance across sequential digital and cash jobs', async () => {
      // 1. Digital job 1: +320,000
      await ledgerService.recordJobSettlement({
        bookingId,
        method: PaymentMethod.DIGITAL,
      });

      // 2. Cash job 2: -60,000
      const booking2Id = 'booking-2';
      prisma.bookings.set(booking2Id, {
        id: booking2Id,
        bookingNumber: 'KB-2026-002',
        customerProfileId: customerId,
        providerProfileId: providerId,
        status: BookingStatus.COMPLETED,
      });
      prisma.fareLines.push({
        id: 'fl-4',
        bookingId: booking2Id,
        lineType: 'LABOR',
        description: 'Plumbing',
        amountMinor: BigInt(200_000),
        state: 'APPROVED',
        createdAt: new Date(),
      });

      await ledgerService.recordJobSettlement({
        bookingId: booking2Id,
        method: PaymentMethod.CASH,
      });

      // Net balance: +320,000 - 60,000 = +260,000 paisa
      const balance = await ledgerService.getProviderBalance(providerId);
      expect(balance.balanceMinor).toBe(260_000);
      expect(balance.totalCreditsMinor).toBe(320_000);
      expect(balance.totalDebitsMinor).toBe(60_000);
      expect(balance.isNegative).toBe(false);
      expect(balance.entryCount).toBe(2);

      // Check history format (P15)
      const history = await ledgerService.getProviderLedgerHistory(providerId);
      expect(history).toHaveLength(2);
      expect(history[0]?.netImpactMinor).toBe(-60_000);
      expect(history[1]?.netImpactMinor).toBe(320_000);
    });
  });

  describe('Validation & Edge Cases', () => {
    it('throws NotFoundException when booking does not exist', async () => {
      await expect(
        ledgerService.recordJobSettlement({
          bookingId: 'non-existent-booking',
          method: PaymentMethod.CASH,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when booking has no assigned provider', async () => {
      const unassignedBookingId = 'unassigned-booking';
      prisma.bookings.set(unassignedBookingId, {
        id: unassignedBookingId,
        bookingNumber: 'KB-UNASSIGNED',
        customerProfileId: customerId,
        providerProfileId: null,
        status: BookingStatus.COMPLETED,
      });

      await expect(
        ledgerService.recordJobSettlement({
          bookingId: unassignedBookingId,
          method: PaymentMethod.CASH,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PaymentsService Integration (P14/P15 & Billing)', () => {
    let paymentsService: PaymentsService;
    let gateway: FakePaymentGateway;

    beforeEach(() => {
      gateway = new FakePaymentGateway();
      paymentsService = new PaymentsService(
        prisma as unknown as PrismaService,
        gateway,
        undefined,
        ledgerService,
      );
    });

    it('automatically writes COMMISSION_DEBIT ledger entry when provider records cash payment', async () => {
      const res = await paymentsService.recordCashPayment({ bookingId }, 'provider-user-1');

      expect(res.status).toBe(PaymentStatus.CASH_RECORDED);

      // Verify ledger entry was created
      expect(prisma.ledgerEntries).toHaveLength(1);
      const entry = prisma.ledgerEntries[0]!;
      expect(entry.entryType).toBe(LedgerEntryType.COMMISSION_DEBIT);
      expect(entry.direction).toBe(LedgerDirection.DEBIT);
      expect(entry.amountMinor).toBe(BigInt(60_000));

      const balance = await ledgerService.getProviderBalance(providerId);
      expect(balance.balanceMinor).toBe(-60_000);
      expect(balance.isNegative).toBe(true);
    });

    it('automatically writes JOB_CREDIT ledger entry when digital payment succeeds', async () => {
      // 1. Initiate digital payment
      const initiated = await paymentsService.initiatePayment(
        { bookingId, method: PaymentMethod.DIGITAL },
        customerId,
      );

      expect(initiated.status).toBe(PaymentStatus.PENDING);
      expect(prisma.ledgerEntries).toHaveLength(0); // No ledger entry while pending

      // 2. Gateway confirms digital payment SUCCEEDED
      const confirmed = await paymentsService.confirmDigitalPayment({
        paymentRef: initiated.paymentRef,
        gatewayRef: 'gw-ref-123',
        success: true,
      });

      expect(confirmed.status).toBe(PaymentStatus.SUCCEEDED);

      // Verify ledger entry was created with net provider earnings
      expect(prisma.ledgerEntries).toHaveLength(1);
      const entry = prisma.ledgerEntries[0]!;
      expect(entry.entryType).toBe(LedgerEntryType.JOB_CREDIT);
      expect(entry.direction).toBe(LedgerDirection.CREDIT);
      expect(entry.amountMinor).toBe(BigInt(320_000));

      const balance = await ledgerService.getProviderBalance(providerId);
      expect(balance.balanceMinor).toBe(320_000);
      expect(balance.isNegative).toBe(false);
    });
  });
});

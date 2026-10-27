/**
 * Unit tests for Refunds, Settlements, Ledger Corrections, and Reconciliation (Module M11, T6.3; owner A09).
 * Requirement IDs: PAY-004..007, LEDGER-005, LEDGER-007, SUP-004, ROLE-003, ADMIN-ROLE-004, REL-003.
 * ARCH §6.8; BP §13, §17, §25, §26; D-008, D-016, D-020, D-021.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FakePaymentGateway } from '../fake-payment-gateway.js';
import { FakePayoutProvider } from '../fake-payout-provider.js';
import { LedgerAdjustmentService } from '../ledger-adjustment.service.js';
import { RefundService } from '../refund.service.js';
import { SettlementService } from '../settlement.service.js';
import { ReconciliationService } from '../reconciliation.service.js';
import { LedgerService } from '../ledger.service.js';
import { CommissionService } from '../commission.service.js';
import {
  BookingStatus,
  LedgerDirection,
  LedgerEntryType,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  SettlementStatus,
} from '../payments.types.js';

interface MockBooking {
  id: string;
  bookingNumber: string;
  customerProfileId: string;
  providerProfileId: string | null;
  status: BookingStatus;
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

interface MockRefund {
  id: string;
  refundRef: string;
  paymentId: string;
  bookingId: string;
  disputeId: string | null;
  amountMinor: bigint;
  status: RefundStatus;
  reason: string | null;
  gatewayRef: string | null;
  actorUserId: string | null;
  occurredAt: Date;
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

interface MockSettlement {
  id: string;
  providerProfileId: string;
  amountMinor: bigint;
  status: SettlementStatus;
  payoutMethodId: string | null;
  payoutRef: string | null;
  reason: string | null;
  createdByUserId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

interface MockPayoutMethod {
  id: string;
  providerProfileId: string;
  methodType: string;
  accountTitle: string;
  institutionCode: string;
  maskedNumber: string;
  payoutProviderRef: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
}

class MockPrismaService {
  public bookings = new Map<string, MockBooking>();
  public payments: MockPayment[] = [];
  public refunds: MockRefund[] = [];
  public ledgerEntries: MockLedgerEntry[] = [];
  public settlements: MockSettlement[] = [];
  public payoutMethods: MockPayoutMethod[] = [];
  public paymentMethodRecords: any[] = [];
  public auditLogs: any[] = [];

  $transaction = async <T>(fn: (tx: any) => Promise<T>): Promise<T> => fn(this);

  $executeRaw = async (): Promise<number> => 1;

  booking = {
    findUnique: async ({ where }: { where: { id: string } }) => this.bookings.get(where.id) ?? null,
  };

  payment = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.payments.find((p) => p.id === where.id) ?? null,
    findFirst: async ({ where }: { where: any }) => {
      return (
        this.payments.find((p) => {
          if (where.id && p.id !== where.id) return false;
          if (where.bookingId && p.bookingId !== where.bookingId) return false;
          if (where.method && p.method !== where.method) return false;
          if (where.status && p.status !== where.status) return false;
          return true;
        }) ?? null
      );
    },
    findMany: async ({ where }: { where?: any } = {}) => {
      let result = [...this.payments];
      if (where?.method) result = result.filter((p) => p.method === where.method);
      if (where?.gatewayRef?.not === null) result = result.filter((p) => p.gatewayRef !== null);
      return result;
    },
  };

  refund = {
    create: async ({ data }: { data: any }) => {
      const row: MockRefund = {
        id: randomUUID(),
        refundRef: data.refundRef,
        paymentId: data.paymentId,
        bookingId: data.bookingId,
        disputeId: data.disputeId ?? null,
        amountMinor: BigInt(data.amountMinor),
        status: data.status,
        reason: data.reason ?? null,
        gatewayRef: data.gatewayRef ?? null,
        actorUserId: data.actorUserId ?? null,
        occurredAt: new Date(),
      };
      this.refunds.push(row);
      return row;
    },
    findMany: async ({ where }: { where?: any } = {}) => {
      let result = [...this.refunds];
      if (where?.refundRef) {
        if (typeof where.refundRef === 'string') {
          result = result.filter((r) => r.refundRef === where.refundRef);
        } else if (where.refundRef.in) {
          result = result.filter((r) => where.refundRef.in.includes(r.refundRef));
        }
      }
      if (where?.paymentId) result = result.filter((r) => r.paymentId === where.paymentId);
      if (where?.bookingId) result = result.filter((r) => r.bookingId === where.bookingId);
      if (where?.status) {
        if (typeof where.status === 'string') {
          result = result.filter((r) => r.status === where.status);
        } else if (where.status.in) {
          result = result.filter((r) => where.status.in.includes(r.status));
        }
      }
      return result;
    },
  };

  providerLedgerEntry = {
    create: async ({ data }: { data: any }) => {
      const row: MockLedgerEntry = {
        id: randomUUID(),
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
      this.ledgerEntries.push(row);
      return row;
    },
    findUnique: async ({ where }: { where: { id?: string; idempotencyKey?: string } }) => {
      if (where.id) return this.ledgerEntries.find((e) => e.id === where.id) ?? null;
      if (where.idempotencyKey) {
        return this.ledgerEntries.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null;
      }
      return null;
    },
    findFirst: async ({ where }: { where: any }) => {
      return (
        this.ledgerEntries.find((e) => {
          if (where.bookingId && e.bookingId !== where.bookingId) return false;
          if (where.entryType && e.entryType !== where.entryType) return false;
          if (where.settlementId && e.settlementId !== where.settlementId) return false;
          if (where.reversesEntryId) {
            if (where.reversesEntryId.not === null && e.reversesEntryId === null) return false;
            if (
              typeof where.reversesEntryId === 'string' &&
              e.reversesEntryId !== where.reversesEntryId
            )
              return false;
          }
          return true;
        }) ?? null
      );
    },
    findMany: async ({ where }: { where?: any } = {}) => {
      let result = [...this.ledgerEntries];
      if (where?.providerProfileId) {
        result = result.filter((e) => e.providerProfileId === where.providerProfileId);
      }
      if (where?.entryType) {
        result = result.filter((e) => e.entryType === where.entryType);
      }
      if (where?.reversesEntryId) {
        result = result.filter((e) => e.reversesEntryId === where.reversesEntryId);
      }
      return result;
    },

    groupBy: async (_args?: any) => {
      const map = new Map<string, bigint>();
      for (const e of this.ledgerEntries) {
        const key = `${e.providerProfileId}:${e.direction}`;
        map.set(key, (map.get(key) ?? 0n) + e.amountMinor);
      }
      const groups: any[] = [];
      for (const [key, sum] of map.entries()) {
        const [providerProfileId, direction] = key.split(':');
        groups.push({
          providerProfileId,
          direction,
          _sum: { amountMinor: sum },
        });
      }
      return groups;
    },
  };

  settlement = {
    create: async ({ data }: { data: any }) => {
      const row: MockSettlement = {
        id: randomUUID(),
        providerProfileId: data.providerProfileId,
        amountMinor: BigInt(data.amountMinor),
        status: data.status,
        payoutMethodId: data.payoutMethodId ?? null,
        payoutRef: data.payoutRef ?? null,
        reason: data.reason ?? null,
        createdByUserId: data.createdByUserId ?? null,
        paidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      this.settlements.push(row);
      return row;
    },
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.settlements.find((s) => s.id === where.id) ?? null,
    findMany: async ({ where }: { where?: any } = {}) => {
      let result = [...this.settlements];
      if (where?.providerProfileId) {
        result = result.filter((s) => s.providerProfileId === where.providerProfileId);
      }
      if (where?.status) {
        result = result.filter((s) => s.status === where.status);
      }
      return result;
    },
    update: async ({ where, data }: { where: { id: string }; data: any }) => {
      const s = this.settlements.find((x) => x.id === where.id);
      if (!s) throw new Error('Not found');
      if (data.status) s.status = data.status;
      if (data.payoutRef !== undefined) s.payoutRef = data.payoutRef;
      if (data.paidAt !== undefined) s.paidAt = data.paidAt;
      if (data.version?.increment) s.version += 1;
      s.updatedAt = new Date();
      return s;
    },
  };

  payoutMethod = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.payoutMethods.find((p) => p.id === where.id) ?? null,
  };

  paymentMethodRecord = {
    findMany: async ({ where }: { where?: any } = {}) => {
      let result = [...this.paymentMethodRecords];
      if (where?.method) result = result.filter((r) => r.method === where.method);
      return result;
    },
  };

  auditLog = {
    create: async ({ data }: { data: any }) => {
      const entry = { id: randomUUID(), ...data };
      this.auditLogs.push(entry);
      return entry;
    },
  };
}

describe('T6.3: Refunds, Settlements, Ledger Corrections & Reconciliation', () => {
  let prisma: MockPrismaService;
  let gateway: FakePaymentGateway;
  let payoutProvider: FakePayoutProvider;
  let ledgerService: LedgerService;
  let adjustmentsService: LedgerAdjustmentService;
  let refundService: RefundService;
  let settlementService: SettlementService;
  let reconciliationService: ReconciliationService;
  let outboxWriterMock: { append: ReturnType<typeof vi.fn> };
  let auditWriterMock: { write: ReturnType<typeof vi.fn> };

  const providerId = 'prov-profile-100';
  const customerId = 'cust-profile-200';
  const bookingId = 'booking-300';
  const staffActor = { userId: 'staff-fin-1', subRoles: ['FINANCE'] };

  beforeEach(() => {
    prisma = new MockPrismaService();
    gateway = new FakePaymentGateway();
    payoutProvider = new FakePayoutProvider();

    outboxWriterMock = { append: vi.fn().mockResolvedValue('outbox-1') };
    auditWriterMock = { write: vi.fn().mockResolvedValue('audit-1') };

    const commissionService = new CommissionService(prisma as any);
    ledgerService = new LedgerService(
      prisma as any,
      commissionService,
      undefined,
      outboxWriterMock as any,
    );
    adjustmentsService = new LedgerAdjustmentService(
      prisma as any,
      ledgerService,
      outboxWriterMock as any,
      auditWriterMock as any,
    );
    refundService = new RefundService(
      prisma as any,
      adjustmentsService,
      gateway,
      outboxWriterMock as any,
      auditWriterMock as any,
    );
    settlementService = new SettlementService(
      prisma as any,
      adjustmentsService,
      payoutProvider,
      auditWriterMock as any,
    );
    reconciliationService = new ReconciliationService(
      prisma as any,
      gateway,
      undefined,
      auditWriterMock as any,
    );

    // Setup initial booking
    prisma.bookings.set(bookingId, {
      id: bookingId,
      bookingNumber: 'BK-100',
      customerProfileId: customerId,
      providerProfileId: providerId,
      status: BookingStatus.COMPLETED,
    });
  });

  // =========================================================================
  // 1. REFUNDS (PAY-004, PAY-006, SUP-004, LEDGER-005)
  // =========================================================================
  describe('RefundService (PAY-004, PAY-006, SUP-004)', () => {
    const paymentId = 'pay-digital-1';
    const gatewayRef = 'gw_tx_123';

    beforeEach(async () => {
      // Create confirmed digital payment for 100,000 paisas (Rs. 1,000)
      const payment: MockPayment = {
        id: paymentId,
        paymentRef: randomUUID(),
        bookingId,
        customerProfileId: customerId,
        providerProfileId: providerId,
        method: PaymentMethod.DIGITAL,
        status: PaymentStatus.SUCCEEDED,
        amountMinor: 100000n,
        gatewayRef,
        actorUserId: customerId,
        occurredAt: new Date(),
      };
      prisma.payments.push(payment);

      // Provider was credited for digital job (e.g. 70,000 paisas = Rs. 700 net after commission)
      await prisma.providerLedgerEntry.create({
        data: {
          providerProfileId: providerId,
          entryType: LedgerEntryType.JOB_CREDIT,
          direction: LedgerDirection.CREDIT,
          amountMinor: 70000n,
          bookingId,
          paymentId,
          reason: 'Job credit',
          idempotencyKey: `ledger:job-credit:${bookingId}`,
        },
      });
    });

    it('issues a full refund, calls gateway, confirms SUCCEEDED, and creates proportional ledger reversal', async () => {
      const res = await refundService.createRefund(
        {
          bookingId,
          reason: 'Customer complaint resolved in dispute',
          disputeId: randomUUID(),
          idempotencyKey: 'refund-key-1',
        },
        staffActor,
      );

      expect(res.status).toBe(RefundStatus.SUCCEEDED);
      expect(res.amountMinor).toBe(100000);
      expect(res.bookingId).toBe(bookingId);
      expect(res.reason).toBe('Customer complaint resolved in dispute');

      // Check append-only refund rows: ISSUED row followed by SUCCEEDED row
      const refundRows = await prisma.refund.findMany({ where: { bookingId } });
      expect(refundRows.length).toBe(2);
      expect(refundRows[0]!.status).toBe(RefundStatus.ISSUED);
      expect(refundRows[1]!.status).toBe(RefundStatus.SUCCEEDED);
      // Both share the exact same refundRef
      expect(refundRows[0]!.refundRef).toBe(res.refundRef);
      expect(refundRows[1]!.refundRef).toBe(res.refundRef);

      // Original payment row remains UNCHANGED (financial rows never updated in place)
      const p = await prisma.payment.findUnique({ where: { id: paymentId } });
      expect(p?.status).toBe(PaymentStatus.SUCCEEDED);
      expect(p?.amountMinor).toBe(100000n);

      // Ledger check: a REVERSAL DEBIT of 70,000 paisas was created
      const reversals = await prisma.providerLedgerEntry.findMany({
        where: { providerProfileId: providerId, entryType: LedgerEntryType.REVERSAL },
      });
      expect(reversals.length).toBe(1);
      expect(reversals[0]!.direction).toBe(LedgerDirection.DEBIT);
      expect(reversals[0]!.amountMinor).toBe(70000n);
      expect(reversals[0]!.idempotencyKey).toBe(`ledger:refund-reversal:${res.refundRef}`);

      // Outbox and audit
      expect(outboxWriterMock.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ eventType: 'refund.issued' }),
      );
      expect(auditWriterMock.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REFUND_ISSUED' }),
        expect.anything(),
      );
    });

    it('supports partial refunds up to the paid amount (OQ-058)', async () => {
      // Partial refund of 40,000 paisas (40%)
      const res1 = await refundService.createRefund(
        {
          bookingId,
          amountMinor: 40000,
          reason: 'Partial discount agreed',
          idempotencyKey: 'partial-key-1',
        },
        staffActor,
      );
      expect(res1.status).toBe(RefundStatus.SUCCEEDED);
      expect(res1.amountMinor).toBe(40000);

      // Reversal should be 40% of 70,000 = 28,000 paisas
      const rev1 = await prisma.providerLedgerEntry.findFirst({
        where: { reversesEntryId: { not: null } },
      });
      expect(rev1?.amountMinor).toBe(28000n);

      // Check refundable remaining: 100,000 - 40,000 = 60,000
      const refStatus = await refundService.getRefundableAmount(bookingId);
      expect(refStatus.paidMinor).toBe(100000);
      expect(refStatus.refundedMinor).toBe(40000);
      expect(refStatus.refundableMinor).toBe(60000);

      // Over-refund attempt: trying to refund 70,000 when only 60,000 is left throws 409
      await expect(
        refundService.createRefund(
          {
            bookingId,
            amountMinor: 70000,
            reason: 'Too much',
            idempotencyKey: 'partial-key-2',
          },
          staffActor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      // Valid second partial refund: remaining 60,000
      const res2 = await refundService.createRefund(
        {
          bookingId,
          amountMinor: 60000,
          reason: 'Remaining refund',
          idempotencyKey: 'partial-key-3',
        },
        staffActor,
      );
      expect(res2.status).toBe(RefundStatus.SUCCEEDED);

      // Now refundable is 0
      const finalRef = await refundService.getRefundableAmount(bookingId);
      expect(finalRef.refundableMinor).toBe(0);

      // Any further refund attempt throws 409 NOTHING_REFUNDABLE
      await expect(
        refundService.createRefund(
          {
            bookingId,
            amountMinor: 1000,
            reason: 'Cannot refund after zero',
            idempotencyKey: 'partial-key-4',
          },
          staffActor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects refund if reason is missing or empty (ROLE-003, 422)', async () => {
      await expect(
        refundService.createRefund(
          {
            bookingId,
            reason: '   ',
            idempotencyKey: 'no-reason-key',
          },
          staffActor,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects refund on cash payment booking (409 NOTHING_REFUNDABLE)', async () => {
      const cashBookingId = 'booking-cash-999';
      prisma.bookings.set(cashBookingId, {
        id: cashBookingId,
        bookingNumber: 'BK-CASH',
        customerProfileId: customerId,
        providerProfileId: providerId,
        status: BookingStatus.COMPLETED,
      });
      prisma.payments.push({
        id: 'pay-cash-1',
        paymentRef: randomUUID(),
        bookingId: cashBookingId,
        customerProfileId: customerId,
        providerProfileId: providerId,
        method: PaymentMethod.CASH,
        status: PaymentStatus.CASH_RECORDED,
        amountMinor: 50000n,
        gatewayRef: null,
        actorUserId: providerId,
        occurredAt: new Date(),
      });

      await expect(
        refundService.createRefund(
          {
            bookingId: cashBookingId,
            reason: 'Cash refund request',
            idempotencyKey: 'cash-ref-key',
          },
          staffActor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('is strictly idempotent on replaying identical idempotencyKey', async () => {
      const first = await refundService.createRefund(
        {
          bookingId,
          amountMinor: 50000,
          reason: 'Double tap test',
          idempotencyKey: 'double-tap-key',
        },
        staffActor,
      );

      const second = await refundService.createRefund(
        {
          bookingId,
          amountMinor: 50000,
          reason: 'Double tap test',
          idempotencyKey: 'double-tap-key',
        },
        staffActor,
      );

      expect(first.refundRef).toBe(second.refundRef);
      expect(first.amountMinor).toBe(second.amountMinor);

      // No duplicate refund rows
      const allRows = await prisma.refund.findMany({ where: { refundRef: first.refundRef } });
      expect(allRows.length).toBe(2); // ISSUED + SUCCEEDED
    });

    it('leaves refund ISSUED if gateway throws, and does not create ledger reversal', async () => {
      gateway.failNextRefundCall();

      const res = await refundService.createRefund(
        {
          bookingId,
          amountMinor: 30000,
          reason: 'Temporary gateway failure',
          idempotencyKey: 'gw-down-key',
        },
        staffActor,
      );

      expect(res.status).toBe(RefundStatus.ISSUED);

      // No ledger reversal yet while pending/issued
      const reversals = await prisma.providerLedgerEntry.findMany({
        where: { entryType: LedgerEntryType.REVERSAL },
      });
      expect(reversals.length).toBe(0);

      // Once gateway outcome is resolved to SUCCEEDED:
      const resolved = await refundService.applyRefundOutcome(res.refundRef, {
        success: true,
        gatewayRef: 'gw_rf_resolved',
      });
      expect(resolved.status).toBe(RefundStatus.SUCCEEDED);

      const resolvedReversals = await prisma.providerLedgerEntry.findMany({
        where: { entryType: LedgerEntryType.REVERSAL },
      });
      expect(resolvedReversals.length).toBe(1);
    });

    it('frees refundable cap and writes no reversal when refund FAILED at gateway', async () => {
      gateway.setNextRefundStatus(RefundStatus.FAILED);

      const res = await refundService.createRefund(
        {
          bookingId,
          amountMinor: 30000,
          reason: 'Will fail at gateway',
          idempotencyKey: 'will-fail-key',
        },
        staffActor,
      );

      expect(res.status).toBe(RefundStatus.FAILED);

      // No reversal
      const reversals = await prisma.providerLedgerEntry.findMany({
        where: { entryType: LedgerEntryType.REVERSAL },
      });
      expect(reversals.length).toBe(0);

      // Amount is STILL completely refundable (failed refunds do not consume cap)
      const refStatus = await refundService.getRefundableAmount(bookingId);
      expect(refStatus.refundableMinor).toBe(100000);
    });
  });

  // =========================================================================
  // 2. SETTLEMENTS (PAY-007, LEDGER-005, LEDGER-007)
  // =========================================================================
  describe('SettlementService (PAY-007, LEDGER-005, LEDGER-007)', () => {
    beforeEach(async () => {
      // Credit provider balance with 50,000 paisas (Rs. 500)
      await prisma.providerLedgerEntry.create({
        data: {
          providerProfileId: providerId,
          entryType: LedgerEntryType.JOB_CREDIT,
          direction: LedgerDirection.CREDIT,
          amountMinor: 50000n,
          reason: 'Earnings credit',
          idempotencyKey: 'prov-earnings-1',
        },
      });
    });

    it('creates manual settlement, deducts balance via SETTLEMENT_DEBIT, and marks PAID immediately', async () => {
      const res = await settlementService.createSettlement(
        {
          providerProfileId: providerId,
          amountMinor: 30000,
          mode: 'MANUAL',
          reference: 'MBL-PKR-987654',
          reason: 'Weekly payout via JazzCash',
          idempotencyKey: 'settle-key-1',
        },
        staffActor,
      );

      expect(res.status).toBe(SettlementStatus.PAID);
      expect(res.amountMinor).toBe(30000);
      expect(res.payoutRef).toBe('MBL-PKR-987654');

      // Check ledger: SETTLEMENT_DEBIT row was created
      const debit = await prisma.providerLedgerEntry.findFirst({
        where: {
          providerProfileId: providerId,
          entryType: LedgerEntryType.SETTLEMENT_DEBIT,
        },
      });
      expect(debit).toBeDefined();
      expect(debit?.direction).toBe(LedgerDirection.DEBIT);
      expect(debit?.amountMinor).toBe(30000n);

      // Remaining balance = 50,000 - 30,000 = 20,000
      const bal = await ledgerService.getProviderBalance(providerId);
      expect(bal.balanceMinor).toBe(20000);
    });

    it('requires a reference for MANUAL settlements (422)', async () => {
      await expect(
        settlementService.createSettlement(
          {
            providerProfileId: providerId,
            amountMinor: 10000,
            mode: 'MANUAL',
            reference: '   ',
            reason: 'Manual transfer',
            idempotencyKey: 'manual-no-ref',
          },
          staffActor,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('creates PAYOUT_PROVIDER settlement and completes automatically with fake provider', async () => {
      const res = await settlementService.createSettlement(
        {
          providerProfileId: providerId,
          amountMinor: 25000,
          mode: 'PAYOUT_PROVIDER',
          reason: 'Automated bank payout',
          idempotencyKey: 'provider-payout-1',
        },
        staffActor,
      );

      expect(res.status).toBe(SettlementStatus.PAID);
      expect(res.payoutRef).toMatch(/^fake_po_/);

      const bal = await ledgerService.getProviderBalance(providerId);
      expect(bal.balanceMinor).toBe(25000);
    });

    it('restores provider balance via REVERSAL credit if payout provider fails', async () => {
      payoutProvider.setNextStatus('FAILED');

      const res = await settlementService.createSettlement(
        {
          providerProfileId: providerId,
          amountMinor: 40000,
          mode: 'PAYOUT_PROVIDER',
          reason: 'Will fail at bank',
          idempotencyKey: 'failing-payout-key',
        },
        staffActor,
      );

      expect(res.status).toBe(SettlementStatus.FAILED);

      // Ledger check: SETTLEMENT_DEBIT followed by REVERSAL CREDIT
      const debit = await prisma.providerLedgerEntry.findFirst({
        where: { entryType: LedgerEntryType.SETTLEMENT_DEBIT },
      });
      expect(debit?.amountMinor).toBe(40000n);

      const reversal = await prisma.providerLedgerEntry.findFirst({
        where: { entryType: LedgerEntryType.REVERSAL },
      });
      expect(reversal).toBeDefined();
      expect(reversal?.direction).toBe(LedgerDirection.CREDIT);
      expect(reversal?.amountMinor).toBe(40000n);
      expect(reversal?.reversesEntryId).toBe(debit?.id);

      // Balance is back to 50,000
      const bal = await ledgerService.getProviderBalance(providerId);
      expect(bal.balanceMinor).toBe(50000);
    });

    it('refuses settlement when provider balance is negative or zero (409 BALANCE_NOT_POSITIVE)', async () => {
      const brokeProviderId = 'broke-provider-1';
      await expect(
        settlementService.createSettlement(
          {
            providerProfileId: brokeProviderId,
            amountMinor: 5000,
            mode: 'PAYOUT_PROVIDER',
            reason: 'Cannot settle 0 balance',
            idempotencyKey: 'broke-key',
          },
          staffActor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses settlement exceeding available balance (409 AMOUNT_EXCEEDS_BALANCE)', async () => {
      await expect(
        settlementService.createSettlement(
          {
            providerProfileId: providerId,
            amountMinor: 999999,
            mode: 'PAYOUT_PROVIDER',
            reason: 'Too much money',
            idempotencyKey: 'exceed-balance-key',
          },
          staffActor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('lists providers ready to settle (positive balances only)', async () => {
      // Add a second provider with negative balance (debt)
      await prisma.providerLedgerEntry.create({
        data: {
          providerProfileId: 'in-debt-prov',
          entryType: LedgerEntryType.COMMISSION_DEBIT,
          direction: LedgerDirection.DEBIT,
          amountMinor: 20000n,
          reason: 'Commission debt',
          idempotencyKey: 'debt-entry-1',
        },
      });

      const ready = await settlementService.listReadyToSettle();
      expect(ready.length).toBe(1);
      expect(ready[0]!.providerProfileId).toBe(providerId);
      expect(ready[0]!.balanceMinor).toBe(50000);
    });
  });

  // =========================================================================
  // 3. LEDGER CORRECTIONS (PAY-004, LEDGER-005)
  // =========================================================================
  describe('LedgerAdjustmentService (PAY-004, LEDGER-005)', () => {
    let originalCreditId: string;

    beforeEach(async () => {
      const entry = await prisma.providerLedgerEntry.create({
        data: {
          providerProfileId: providerId,
          entryType: LedgerEntryType.COMPANY_PAYMENT_CREDIT,
          direction: LedgerDirection.CREDIT,
          amountMinor: 80000n,
          reason: 'Over-credited company payment',
          idempotencyKey: 'orig-credit-key',
        },
      });
      originalCreditId = entry.id;
    });

    it('creates a REVERSAL row in the opposite direction without mutating original row', async () => {
      const res = await adjustmentsService.createCorrection(
        {
          originalEntryId: originalCreditId,
          amountMinor: 30000,
          reason: 'Bank duplicate credit adjustment',
          idempotencyKey: 'correction-key-1',
        },
        staffActor,
      );

      expect(res.entryType).toBe(LedgerEntryType.REVERSAL);
      expect(res.direction).toBe(LedgerDirection.DEBIT);
      expect(res.amountMinor).toBe(30000);
      expect(res.reversesEntryId).toBe(originalCreditId);

      // Original entry is unmodified
      const original = await prisma.providerLedgerEntry.findUnique({
        where: { id: originalCreditId },
      });
      expect(original?.amountMinor).toBe(80000n);
      expect(original?.direction).toBe(LedgerDirection.CREDIT);

      // Audit row was written
      expect(auditWriterMock.write).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LEDGER_CORRECTION_CREATED' }),
        expect.anything(),
      );
    });

    it('refuses correction exceeding unreversed amount (422)', async () => {
      // First reversal takes 50,000
      await adjustmentsService.createCorrection(
        {
          originalEntryId: originalCreditId,
          amountMinor: 50000,
          reason: 'First reversal',
          idempotencyKey: 'rev-chunk-1',
        },
        staffActor,
      );

      // Second reversal tries to take 40,000 (50,000 + 40,000 > 80,000) -> 422
      await expect(
        adjustmentsService.createCorrection(
          {
            originalEntryId: originalCreditId,
            amountMinor: 40000,
            reason: 'Too much reversal',
            idempotencyKey: 'rev-chunk-2',
          },
          staffActor,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('cannot reverse a reversal row (422)', async () => {
      const rev = await adjustmentsService.createCorrection(
        {
          originalEntryId: originalCreditId,
          amountMinor: 20000,
          reason: 'Initial reversal',
          idempotencyKey: 'rev-first',
        },
        staffActor,
      );

      await expect(
        adjustmentsService.createCorrection(
          {
            originalEntryId: rev.id,
            amountMinor: 10000,
            reason: 'Reversing a reversal',
            idempotencyKey: 'rev-of-rev',
          },
          staffActor,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  // =========================================================================
  // 4. RECONCILIATION & EXCEPTIONS (PAY-005, A09 Exceptions)
  // =========================================================================
  describe('ReconciliationService (PAY-005)', () => {
    it('detects MISSING_AT_GATEWAY anomaly', async () => {
      // Payment recorded as digital with a gatewayRef, but fake gateway doesn't know it
      prisma.payments.push({
        id: 'pay-missing-1',
        paymentRef: randomUUID(),
        bookingId,
        customerProfileId: customerId,
        providerProfileId: providerId,
        method: PaymentMethod.DIGITAL,
        status: PaymentStatus.SUCCEEDED,
        amountMinor: 50000n,
        gatewayRef: 'unknown_gw_ref_999',
        actorUserId: customerId,
        occurredAt: new Date(),
      });

      const report = await reconciliationService.runReconciliation(staffActor);
      const ex = report.exceptions.find((e) => e.type === 'MISSING_AT_GATEWAY');
      expect(ex).toBeDefined();
      expect(ex?.bookingId).toBe(bookingId);
    });

    it('detects STATUS_MISMATCH anomaly', async () => {
      // Gateway has transaction as FAILED, but internal DB says SUCCEEDED
      const gwRef = 'gw_status_mismatch';
      gateway.setTransaction(gwRef, {
        status: PaymentStatus.FAILED,
        amountMinor: 50000n,
      });

      prisma.payments.push({
        id: 'pay-mismatch-1',
        paymentRef: randomUUID(),
        bookingId,
        customerProfileId: customerId,
        providerProfileId: providerId,
        method: PaymentMethod.DIGITAL,
        status: PaymentStatus.SUCCEEDED,
        amountMinor: 50000n,
        gatewayRef: gwRef,
        actorUserId: customerId,
        occurredAt: new Date(),
      });

      const report = await reconciliationService.runReconciliation(staffActor);
      const ex = report.exceptions.find((e) => e.type === 'STATUS_MISMATCH');
      expect(ex).toBeDefined();
      expect(ex?.internalStatus).toBe(PaymentStatus.SUCCEEDED);
      expect(ex?.gatewayStatus).toBe(PaymentStatus.FAILED);
    });

    it('detects AMOUNT_MISMATCH anomaly', async () => {
      const gwRef = 'gw_amount_mismatch';
      gateway.setTransaction(gwRef, {
        status: PaymentStatus.SUCCEEDED,
        amountMinor: 40000n,
      });

      // Internal DB says payment was 50,000 paisas
      prisma.payments.push({
        id: 'pay-amt-mismatch',
        paymentRef: randomUUID(),
        bookingId,
        customerProfileId: customerId,
        providerProfileId: providerId,
        method: PaymentMethod.DIGITAL,
        status: PaymentStatus.SUCCEEDED,
        amountMinor: 50000n,
        gatewayRef: gwRef,
        actorUserId: customerId,
        occurredAt: new Date(),
      });

      const report = await reconciliationService.runReconciliation(staffActor);
      const ex = report.exceptions.find((e) => e.type === 'AMOUNT_MISMATCH');
      expect(ex).toBeDefined();
      expect(ex?.internalAmountMinor).toBe(50000);
      expect(ex?.gatewayAmountMinor).toBe(40000);
    });

    it('detects DIGITAL_UNCONFIRMED anomaly (recorded method DIGITAL without confirmed payment)', async () => {
      prisma.paymentMethodRecords.push({
        id: 'rec-1',
        bookingId,
        method: PaymentMethod.DIGITAL,
        recordedByUserId: providerId,
        recordedAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      });

      const report = await reconciliationService.runReconciliation(staffActor);
      const ex = report.exceptions.find((e) => e.type === 'DIGITAL_UNCONFIRMED');
      expect(ex).toBeDefined();
      expect(ex?.bookingId).toBe(bookingId);
      expect(ex?.waitingMinutes).toBeGreaterThanOrEqual(59);
    });
  });
});

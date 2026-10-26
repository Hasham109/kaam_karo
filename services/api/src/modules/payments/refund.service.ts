/**
 * RefundService — Finance refunds as append-only reversal rows (Module M11, T6.3; owner A09).
 * Requirement IDs: PAY-004, PAY-006, SUP-004, ROLE-003, ADMIN-ROLE-004, REL-003, LEDGER-005;
 * OQ-058 (partial refunds / refunds of cash payments are still open).
 * ARCH §6.8; BP §25, §26; docs/screens/admin.md A09 "Issue refund".
 *
 * Rules:
 *  - only a gateway-confirmed DIGITAL payment can be refunded (cash has nothing to refund here);
 *  - the original payment row is never touched; a refund is new `refund` rows
 *    (ISSUED → SUCCEEDED | FAILED) sharing one refund_ref;
 *  - the total of non-failed refunds can never exceed what was paid (also enforced by a DB trigger);
 *  - the provider's share of the job credit is reversed with a REVERSAL ledger row once the
 *    gateway confirms the refund, so ledger and gateway stay in step;
 *  - same idempotency key = same refund, never a second one.
 */
import { createHash } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../platform/prisma.service.js';
import { AuditWriter } from '../../platform/audit.writer.js';
import { OutboxWriter } from '../../platform/outbox.writer.js';
import { LedgerAdjustmentService } from './ledger-adjustment.service.js';
import {
  PAYMENT_GATEWAY,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  type CreateRefundDto,
  type PaymentGateway,
  type RefundResponseDto,
  type RefundableAmountDto,
  type StaffActor,
} from './payments.types.js';

interface RefundRow {
  refundRef: string;
  paymentId: string;
  bookingId: string;
  disputeId: string | null;
  amountMinor: bigint;
  status: RefundStatus;
  reason: string | null;
  gatewayRef: string | null;
  occurredAt: Date;
}

interface RefundState {
  refundRef: string;
  paymentId: string;
  bookingId: string;
  disputeId: string | null;
  amountMinor: bigint;
  status: RefundStatus;
  reason: string | null;
  gatewayRef: string | null;
  occurredAt: Date;
}

/** Collapses append-only rows into one state per refund_ref (terminal rows win over ISSUED). */
export function foldRefundRows(rows: readonly RefundRow[]): RefundState[] {
  const byRef = new Map<string, RefundState>();
  for (const row of rows) {
    const current = byRef.get(row.refundRef);
    if (!current) {
      byRef.set(row.refundRef, { ...row });
      continue;
    }
    const rowIsTerminal = row.status !== RefundStatus.ISSUED;
    const currentIsTerminal = current.status !== RefundStatus.ISSUED;
    if (rowIsTerminal || !currentIsTerminal) {
      byRef.set(row.refundRef, {
        ...current,
        status: rowIsTerminal ? row.status : current.status,
        gatewayRef: row.gatewayRef ?? current.gatewayRef,
        occurredAt: row.occurredAt,
      });
    }
  }
  return [...byRef.values()];
}

/** Deterministic UUID so a replayed request maps to the same refund_ref (REL-003). */
function deriveRefundRef(bookingId: string, idempotencyKey: string): string {
  const h = createHash('sha256').update(`refund:${bookingId}:${idempotencyKey}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adjustments: LedgerAdjustmentService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Optional() private readonly outboxWriter?: OutboxWriter,
    @Optional() private readonly auditWriter?: AuditWriter,
  ) {}

  async createRefund(dto: CreateRefundDto, actor: StaffActor): Promise<RefundResponseDto> {
    if (!dto.reason || dto.reason.trim() === '') {
      throw new UnprocessableEntityException({
        code: 'REASON_REQUIRED',
        message: 'Reason is required',
      });
    }
    if (!dto.idempotencyKey || dto.idempotencyKey.trim() === '') {
      throw new UnprocessableEntityException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'An idempotency key is required',
      });
    }
    if (
      dto.amountMinor !== undefined &&
      (!Number.isSafeInteger(dto.amountMinor) || dto.amountMinor <= 0)
    ) {
      throw new UnprocessableEntityException({
        code: 'INVALID_AMOUNT',
        message: 'Refund amount must be a whole number above zero',
      });
    }
    const reason = dto.reason.trim();
    const refundRef = deriveRefundRef(dto.bookingId, dto.idempotencyKey.trim());

    const created = await this.prisma.$transaction(async (tx) => {
      const replay = await tx.refund.findMany({
        where: { refundRef },
        orderBy: { occurredAt: 'asc' },
      });
      if (replay.length > 0)
        return { state: foldRefundRows(replay)[0]!, fresh: false, gatewayRef: null };

      const payment = await tx.payment.findFirst({
        where: {
          bookingId: dto.bookingId,
          method: PaymentMethod.DIGITAL,
          status: PaymentStatus.SUCCEEDED,
        },
      });
      if (!payment) {
        throw new ConflictException({
          code: 'NOTHING_REFUNDABLE',
          message: 'Nothing refundable on this booking',
        });
      }
      await this.adjustments.lockProvider(tx, payment.providerProfileId);

      const existing = await tx.refund.findMany({
        where: { paymentId: payment.id },
        orderBy: { occurredAt: 'asc' },
      });
      const refundable = this.summarise(payment.amountMinor, existing).refundableMinor;
      const amount = dto.amountMinor === undefined ? refundable : BigInt(dto.amountMinor);
      if (refundable <= 0n) {
        throw new ConflictException({
          code: 'NOTHING_REFUNDABLE',
          message: 'Nothing refundable on this booking',
        });
      }
      if (amount > refundable) {
        throw new ConflictException({
          code: 'REFUND_EXCEEDS_REFUNDABLE',
          message: 'Refund is more than what is still refundable',
          refundableMinor: Number(refundable),
        });
      }

      const row = await tx.refund.create({
        data: {
          refundRef,
          paymentId: payment.id,
          bookingId: payment.bookingId,
          disputeId: dto.disputeId ?? null,
          amountMinor: amount,
          status: RefundStatus.ISSUED,
          reason,
          gatewayRef: payment.gatewayRef ?? null,
          actorUserId: actor.userId,
        },
      });

      await this.outboxWriter?.append(tx, {
        eventType: 'refund.issued',
        schemaVersion: 1,
        aggregateType: 'refund',
        aggregateId: refundRef,
        payload: {
          refundRef,
          paymentId: payment.id,
          bookingId: payment.bookingId,
          disputeId: dto.disputeId ?? null,
          amountMinor: Number(amount),
          issuedByUserId: actor.userId,
          occurredAt: row.occurredAt.toISOString(),
        },
      });
      await this.auditWriter?.write(
        {
          actor: { userId: actor.userId, role: 'ADMIN', subRoles: actor.subRoles },
          action: 'REFUND_ISSUED',
          object: { type: 'refund', id: refundRef },
          after: {
            paymentId: payment.id,
            bookingId: payment.bookingId,
            amountMinor: Number(amount),
            disputeId: dto.disputeId ?? null,
          },
          reason,
        },
        tx,
      );
      return {
        state: foldRefundRows([row])[0]!,
        fresh: true,
        gatewayRef: payment.gatewayRef ?? '',
      };
    });

    if (!created.fresh) return this.toDto(created.state);

    // Gateway call happens outside the DB transaction; if it fails the refund stays ISSUED and
    // shows up in reconciliation instead of being lost.
    try {
      const result = await this.gateway.refund({
        refundRef,
        gatewayRef: created.gatewayRef ?? '',
        amountMinor: created.state.amountMinor,
      });
      if (result.status !== RefundStatus.ISSUED) {
        return this.applyRefundOutcome(refundRef, {
          success: result.status === RefundStatus.SUCCEEDED,
          gatewayRef: result.gatewayRef,
        });
      }
    } catch {
      // intentionally left ISSUED
    }
    return this.getRefund(refundRef);
  }

  /**
   * Records the gateway's final answer for a refund (also the entry point for a real webhook, T6.5).
   * Idempotent: a refund that already has a terminal row is returned unchanged.
   */
  async applyRefundOutcome(
    refundRef: string,
    outcome: { success: boolean; gatewayRef?: string | undefined },
  ): Promise<RefundResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.refund.findMany({
        where: { refundRef },
        orderBy: { occurredAt: 'asc' },
      });
      if (rows.length === 0) {
        throw new NotFoundException({ code: 'REFUND_NOT_FOUND', message: 'Refund not found' });
      }
      const state = foldRefundRows(rows)[0]!;
      if (state.status !== RefundStatus.ISSUED) return this.toDto(state);

      const payment = await tx.payment.findUnique({ where: { id: state.paymentId } });
      if (!payment) {
        throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' });
      }
      await this.adjustments.lockProvider(tx, payment.providerProfileId);

      const status = outcome.success ? RefundStatus.SUCCEEDED : RefundStatus.FAILED;
      const row = await tx.refund.create({
        data: {
          refundRef,
          paymentId: state.paymentId,
          bookingId: state.bookingId,
          disputeId: state.disputeId,
          amountMinor: state.amountMinor,
          status,
          reason: null,
          gatewayRef: outcome.gatewayRef ?? state.gatewayRef,
          actorUserId: null,
        },
      });

      if (outcome.success) {
        const all = await tx.refund.findMany({
          where: { paymentId: state.paymentId },
          orderBy: { occurredAt: 'asc' },
        });
        const cumulative = foldRefundRows(all)
          .filter((r) => r.status === RefundStatus.SUCCEEDED)
          .reduce((acc, r) => acc + r.amountMinor, 0n);
        await this.adjustments.reverseJobCreditForRefund(tx, {
          bookingId: state.bookingId,
          paymentId: state.paymentId,
          paymentAmountMinor: payment.amountMinor,
          cumulativeRefundedMinor: cumulative,
          refundRef,
          actorUserId: null,
        });
      }

      await this.auditWriter?.write(
        {
          actor: { userId: null, role: 'SYSTEM' },
          action: outcome.success ? 'REFUND_SUCCEEDED' : 'REFUND_FAILED',
          object: { type: 'refund', id: refundRef },
          after: { amountMinor: Number(state.amountMinor), bookingId: state.bookingId },
        },
        tx,
      );
      return this.toDto(foldRefundRows([...rows, row])[0]!);
    });
  }

  async getRefund(refundRef: string): Promise<RefundResponseDto> {
    const rows = await this.prisma.refund.findMany({
      where: { refundRef },
      orderBy: { occurredAt: 'asc' },
    });
    if (rows.length === 0) {
      throw new NotFoundException({ code: 'REFUND_NOT_FOUND', message: 'Refund not found' });
    }
    return this.toDto(foldRefundRows(rows)[0]!);
  }

  async listBookingRefunds(bookingId: string): Promise<RefundResponseDto[]> {
    const rows = await this.prisma.refund.findMany({
      where: { bookingId },
      orderBy: { occurredAt: 'asc' },
    });
    return foldRefundRows(rows).map((r) => this.toDto(r));
  }

  async getRefundableAmount(bookingId: string): Promise<RefundableAmountDto> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        bookingId,
        method: PaymentMethod.DIGITAL,
        status: PaymentStatus.SUCCEEDED,
      },
    });
    if (!payment) {
      return { bookingId, paidMinor: 0, refundedMinor: 0, pendingMinor: 0, refundableMinor: 0 };
    }
    const rows = await this.prisma.refund.findMany({
      where: { paymentId: payment.id },
      orderBy: { occurredAt: 'asc' },
    });
    const s = this.summarise(payment.amountMinor, rows);
    return {
      bookingId,
      paidMinor: Number(payment.amountMinor),
      refundedMinor: Number(s.refundedMinor),
      pendingMinor: Number(s.pendingMinor),
      refundableMinor: Number(s.refundableMinor),
    };
  }

  private summarise(paid: bigint, rows: readonly RefundRow[]) {
    let refundedMinor = 0n;
    let pendingMinor = 0n;
    for (const r of foldRefundRows(rows)) {
      if (r.status === RefundStatus.SUCCEEDED) refundedMinor += r.amountMinor;
      else if (r.status === RefundStatus.ISSUED) pendingMinor += r.amountMinor;
    }
    const left = paid - refundedMinor - pendingMinor;
    return { refundedMinor, pendingMinor, refundableMinor: left > 0n ? left : 0n };
  }

  private toDto(s: RefundState): RefundResponseDto {
    return {
      refundRef: s.refundRef,
      paymentId: s.paymentId,
      bookingId: s.bookingId,
      disputeId: s.disputeId,
      amountMinor: Number(s.amountMinor),
      status: s.status,
      reason: s.reason,
      gatewayRef: s.gatewayRef,
      occurredAt: s.occurredAt.toISOString(),
    };
  }
}

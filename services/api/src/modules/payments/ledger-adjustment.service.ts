/**
 * LedgerAdjustmentService — reversal rows on the append-only provider ledger (Module M11, T6.3;
 * owner A09). Requirement IDs: PAY-004, PAY-006, LEDGER-005, LEDGER-007, ROLE-003, ADMIN-ROLE-004.
 * ARCH §6.8; BP §26.
 *
 * Money rows are NEVER updated or deleted (DB grants + triggers). A correction is a new REVERSAL
 * row linked to exactly one original row, in the opposite direction, never above what is still
 * un-reversed, and always carrying a reason.
 */
import {
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService, type TxClient } from '../../platform/prisma.service.js';
import { AuditWriter } from '../../platform/audit.writer.js';
import { OutboxWriter } from '../../platform/outbox.writer.js';
import { LedgerService } from './ledger.service.js';
import {
  LedgerDirection,
  LedgerEntryType,
  type CreateLedgerCorrectionDto,
  type ProviderLedgerEntryDtoLike,
  type StaffActor,
} from './payments.types.js';

export interface RefundReversalParams {
  bookingId: string;
  paymentId: string;
  paymentAmountMinor: bigint;
  /** Total of all SUCCEEDED refunds of this payment, including the one being applied. */
  cumulativeRefundedMinor: bigint;
  refundRef: string;
  actorUserId: string | null;
}

@Injectable()
export class LedgerAdjustmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    @Optional() private readonly outboxWriter?: OutboxWriter,
    @Optional() private readonly auditWriter?: AuditWriter,
  ) {}

  /** Serialises money writes per provider so a balance check cannot race another write. */
  async lockProvider(tx: TxClient, providerProfileId: string): Promise<void> {
    if (typeof (tx as { $executeRaw?: unknown }).$executeRaw === 'function') {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`ledger:${providerProfileId}`}, 0))`;
    }
  }

  async computeBalanceMinor(db: TxClient, providerProfileId: string): Promise<number> {
    const entries = await db.providerLedgerEntry.findMany({
      where: { providerProfileId },
      select: { direction: true, amountMinor: true },
    });
    let balance = 0;
    for (const e of entries) {
      const amt = Number(e.amountMinor);
      balance += e.direction === LedgerDirection.CREDIT ? amt : -amt;
    }
    return balance;
  }

  /** Emits provider.balance_negative when a debit pushed the provider below the limit (D-020). */
  async emitBalanceNegativeIfNeeded(
    tx: TxClient,
    providerProfileId: string,
    bookingId: string | null,
  ): Promise<void> {
    if (!this.outboxWriter) return;
    const balance = await this.computeBalanceMinor(tx, providerProfileId);
    const maxNeg = await this.ledger.getMaxNegativeBalanceLimit();
    if (balance >= -maxNeg) return;
    await this.outboxWriter.append(tx, {
      eventType: 'provider.balance_negative',
      schemaVersion: 1,
      aggregateType: 'provider_profile',
      aggregateId: providerProfileId,
      payload: {
        providerProfileId,
        bookingId,
        balanceMinor: balance,
        amountOwedMinor: Math.abs(balance),
        occurredAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Takes back the provider's share of a DIGITAL job credit in proportion to the refunded part of
   * the payment (PAY-006: refund = reversal rows). Idempotent per refundRef. Returns the new
   * REVERSAL row id, or null when nothing needs reversing (cash job, no credit, already done).
   */
  async reverseJobCreditForRefund(
    tx: TxClient,
    params: RefundReversalParams,
  ): Promise<string | null> {
    const idempotencyKey = `ledger:refund-reversal:${params.refundRef}`;
    const existing = await tx.providerLedgerEntry.findUnique({ where: { idempotencyKey } });
    if (existing) return existing.id;

    const credit = await tx.providerLedgerEntry.findFirst({
      where: { bookingId: params.bookingId, entryType: LedgerEntryType.JOB_CREDIT },
    });
    if (!credit) return null;

    await this.lockProvider(tx, credit.providerProfileId);

    const target =
      (params.cumulativeRefundedMinor * credit.amountMinor) / params.paymentAmountMinor;
    const already = await this.sumReversals(tx, credit.id);
    let delta = target - already;
    const remaining = credit.amountMinor - already;
    if (delta > remaining) delta = remaining;
    if (delta <= 0n) return null;

    const row = await tx.providerLedgerEntry.create({
      data: {
        providerProfileId: credit.providerProfileId,
        entryType: LedgerEntryType.REVERSAL,
        direction: LedgerDirection.DEBIT,
        amountMinor: delta,
        bookingId: params.bookingId,
        paymentId: params.paymentId,
        reversesEntryId: credit.id,
        reason: `Refund ${params.refundRef}: provider share reversed`,
        actorUserId: params.actorUserId,
        idempotencyKey,
      },
    });
    await this.emitBalanceNegativeIfNeeded(tx, credit.providerProfileId, params.bookingId);
    return row.id;
  }

  /**
   * Finance correction of ONE ledger row: a reversal row in the opposite direction (PAY-004,
   * LEDGER-005). The original row never changes; there is no free-standing credit.
   */
  async createCorrection(
    dto: CreateLedgerCorrectionDto,
    actor: StaffActor,
  ): Promise<ProviderLedgerEntryDtoLike> {
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
    const idempotencyKey = `ledger:correction:${dto.originalEntryId}:${dto.idempotencyKey.trim()}`;

    return this.prisma.$transaction(async (tx) => {
      const replay = await tx.providerLedgerEntry.findUnique({ where: { idempotencyKey } });
      if (replay) return this.toDto(replay);

      const original = await tx.providerLedgerEntry.findUnique({
        where: { id: dto.originalEntryId },
      });
      if (!original) {
        throw new NotFoundException({
          code: 'LEDGER_ENTRY_NOT_FOUND',
          message: 'Ledger entry not found',
        });
      }
      if (original.entryType === LedgerEntryType.REVERSAL) {
        throw new UnprocessableEntityException({
          code: 'CANNOT_REVERSE_A_REVERSAL',
          message: 'A reversal row cannot be reversed again',
        });
      }

      await this.lockProvider(tx, original.providerProfileId);
      const already = await this.sumReversals(tx, original.id);
      const remaining = original.amountMinor - already;
      const amount = dto.amountMinor === undefined ? remaining : BigInt(dto.amountMinor);
      if (!Number.isInteger(Number(amount)) || amount <= 0n || amount > remaining) {
        throw new UnprocessableEntityException({
          code: 'AMOUNT_EXCEEDS_UNREVERSED',
          message: 'Amount must be above zero and not more than the not-yet-reversed amount',
          remainingMinor: Number(remaining),
        });
      }

      const direction =
        original.direction === LedgerDirection.CREDIT
          ? LedgerDirection.DEBIT
          : LedgerDirection.CREDIT;
      const row = await tx.providerLedgerEntry.create({
        data: {
          providerProfileId: original.providerProfileId,
          entryType: LedgerEntryType.REVERSAL,
          direction,
          amountMinor: amount,
          bookingId: original.bookingId,
          paymentId: original.paymentId,
          settlementId: original.settlementId,
          reversesEntryId: original.id,
          reason: dto.reason.trim(),
          actorUserId: actor.userId,
          idempotencyKey,
        },
      });

      await this.auditWriter?.write(
        {
          actor: { userId: actor.userId, role: 'ADMIN', subRoles: actor.subRoles },
          action: 'LEDGER_CORRECTION_CREATED',
          object: { type: 'provider_ledger_entry', id: row.id },
          after: {
            reversesEntryId: original.id,
            amountMinor: Number(amount),
            direction,
            providerProfileId: original.providerProfileId,
          },
          reason: dto.reason.trim(),
        },
        tx,
      );
      if (direction === LedgerDirection.DEBIT) {
        await this.emitBalanceNegativeIfNeeded(tx, original.providerProfileId, original.bookingId);
      }
      return this.toDto(row);
    });
  }

  private async sumReversals(tx: TxClient, originalEntryId: string): Promise<bigint> {
    const rows = await tx.providerLedgerEntry.findMany({
      where: { reversesEntryId: originalEntryId },
      select: { amountMinor: true },
    });
    return rows.reduce((acc, r) => acc + r.amountMinor, 0n);
  }

  private toDto(row: {
    id: string;
    providerProfileId: string;
    entryType: LedgerEntryType;
    direction: LedgerDirection;
    amountMinor: bigint;
    reversesEntryId?: string | null;
    reason?: string | null;
  }): ProviderLedgerEntryDtoLike {
    return {
      id: row.id,
      providerProfileId: row.providerProfileId,
      entryType: row.entryType,
      direction: row.direction,
      amountMinor: Number(row.amountMinor),
      reversesEntryId: row.reversesEntryId ?? null,
      reason: row.reason ?? null,
    };
  }
}

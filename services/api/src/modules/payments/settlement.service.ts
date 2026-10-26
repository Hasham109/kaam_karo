/**
 * SettlementService — payout of a positive provider balance (Module M11, T6.3; owner A09).
 * Requirement IDs: PAY-007, LEDGER-005, LEDGER-007, ROLE-003, ADMIN-ROLE-004, REL-003, REL-008.
 * ARCH §6.8; BP §13 P15, §25, §26; docs/screens/admin.md A10 "Record manual settlement".
 *
 * Rules:
 *  - only a POSITIVE balance can be settled, and never more than the balance (negative balances
 *    are collected through "Pay company", D-021, not paid out);
 *  - the money effect is an append-only SETTLEMENT_DEBIT ledger row, never an edit of old rows;
 *  - a payout that fails gives the money back with a REVERSAL credit linked to the debit;
 *  - mode MANUAL needs a bank/wallet reference; mode PAYOUT_PROVIDER goes through the
 *    PayoutProvider interface (fake until D-008);
 *  - same idempotency key = same settlement.
 */
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
import { LedgerAdjustmentService } from './ledger-adjustment.service.js';
import {
  LedgerDirection,
  LedgerEntryType,
  PAYOUT_PROVIDER,
  SettlementStatus,
  type CreateSettlementDto,
  type PayoutProvider,
  type ReadyToSettleDto,
  type SettlementResponseDto,
  type StaffActor,
} from './payments.types.js';

interface SettlementRow {
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
}

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adjustments: LedgerAdjustmentService,
    @Inject(PAYOUT_PROVIDER) private readonly payoutProvider: PayoutProvider,
    @Optional() private readonly auditWriter?: AuditWriter,
  ) {}

  async createSettlement(
    dto: CreateSettlementDto,
    actor: StaffActor,
  ): Promise<SettlementResponseDto> {
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
    if (!Number.isSafeInteger(dto.amountMinor) || dto.amountMinor <= 0) {
      throw new UnprocessableEntityException({
        code: 'INVALID_AMOUNT',
        message: 'Settlement amount must be a whole number above zero',
      });
    }
    const reference = dto.reference?.trim();
    if (dto.mode === 'MANUAL' && !reference) {
      throw new UnprocessableEntityException({
        code: 'REFERENCE_REQUIRED',
        message: 'A transfer reference is required for a manual settlement',
      });
    }
    const reason = dto.reason.trim();
    const amount = BigInt(dto.amountMinor);
    const debitKey = `ledger:settlement-debit:${dto.providerProfileId}:${dto.idempotencyKey.trim()}`;

    const created = await this.prisma.$transaction(async (tx) => {
      const replay = await tx.providerLedgerEntry.findUnique({
        where: { idempotencyKey: debitKey },
      });
      if (replay?.settlementId) {
        const existing = await tx.settlement.findUnique({ where: { id: replay.settlementId } });
        if (existing) return { settlement: existing, fresh: false };
      }

      await this.adjustments.lockProvider(tx, dto.providerProfileId);
      const balance = await this.adjustments.computeBalanceMinor(tx, dto.providerProfileId);
      if (balance <= 0) {
        throw new ConflictException({
          code: 'BALANCE_NOT_POSITIVE',
          message: 'Balance is not positive',
        });
      }
      if (amount > BigInt(balance)) {
        throw new ConflictException({
          code: 'AMOUNT_EXCEEDS_BALANCE',
          message: 'Amount is more than the available balance',
          availableMinor: balance,
        });
      }
      if (dto.payoutMethodId) {
        const method = await tx.payoutMethod.findUnique({ where: { id: dto.payoutMethodId } });
        if (!method || method.providerProfileId !== dto.providerProfileId || method.deletedAt) {
          throw new UnprocessableEntityException({
            code: 'PAYOUT_METHOD_INVALID',
            message: 'Payout method does not belong to this provider',
          });
        }
      }

      const settlement = await tx.settlement.create({
        data: {
          providerProfileId: dto.providerProfileId,
          amountMinor: amount,
          status: SettlementStatus.PENDING,
          payoutMethodId: dto.payoutMethodId ?? null,
          reason,
          createdByUserId: actor.userId,
        },
      });
      await tx.providerLedgerEntry.create({
        data: {
          providerProfileId: dto.providerProfileId,
          entryType: LedgerEntryType.SETTLEMENT_DEBIT,
          direction: LedgerDirection.DEBIT,
          amountMinor: amount,
          settlementId: settlement.id,
          reason,
          actorUserId: actor.userId,
          idempotencyKey: debitKey,
        },
      });
      await this.audit(
        actor,
        'SETTLEMENT_CREATED',
        settlement.id,
        {
          providerProfileId: dto.providerProfileId,
          amountMinor: dto.amountMinor,
          mode: dto.mode,
        },
        reason,
        tx,
      );

      if (dto.mode === 'MANUAL') {
        const paid = await this.markPaid(tx, settlement.id, reference!, actor);
        return { settlement: paid, fresh: false };
      }
      return { settlement, fresh: true };
    });

    if (!created.fresh) return this.toDto(created.settlement);

    // PayoutProvider call is outside the DB transaction; a failure leaves the settlement PENDING.
    try {
      const method = created.settlement.payoutMethodId
        ? await this.prisma.payoutMethod.findUnique({
            where: { id: created.settlement.payoutMethodId },
          })
        : null;
      const result = await this.payoutProvider.payout({
        settlementId: created.settlement.id,
        providerProfileId: created.settlement.providerProfileId,
        amountMinor: created.settlement.amountMinor,
        payoutProviderRef: method?.payoutProviderRef ?? null,
      });
      if (result.status !== 'PENDING') {
        return this.completeSettlement(created.settlement.id, {
          status: result.status,
          payoutRef: result.payoutRef,
        });
      }
    } catch {
      // intentionally left PENDING
    }
    return this.toDto(created.settlement);
  }

  /**
   * Final outcome of a payout (provider answer or webhook). Idempotent: a settlement that is
   * no longer PENDING is returned unchanged. FAILED returns the money with a REVERSAL credit.
   */
  async completeSettlement(
    settlementId: string,
    outcome: { status: 'PAID' | 'FAILED'; payoutRef?: string | undefined },
  ): Promise<SettlementResponseDto> {
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.findUnique({ where: { id: settlementId } });
      if (!settlement) {
        throw new NotFoundException({
          code: 'SETTLEMENT_NOT_FOUND',
          message: 'Settlement not found',
        });
      }
      if (settlement.status !== SettlementStatus.PENDING) return this.toDto(settlement);
      await this.adjustments.lockProvider(tx, settlement.providerProfileId);

      if (outcome.status === 'PAID') {
        const paid = await this.markPaid(tx, settlementId, outcome.payoutRef ?? '', null);
        return this.toDto(paid);
      }

      const debit = await tx.providerLedgerEntry.findFirst({
        where: { settlementId, entryType: LedgerEntryType.SETTLEMENT_DEBIT },
      });
      const failed = await tx.settlement.update({
        where: { id: settlementId },
        data: {
          status: SettlementStatus.FAILED,
          payoutRef: outcome.payoutRef ?? settlement.payoutRef,
          version: { increment: 1 },
        },
      });
      if (debit) {
        await tx.providerLedgerEntry.create({
          data: {
            providerProfileId: settlement.providerProfileId,
            entryType: LedgerEntryType.REVERSAL,
            direction: LedgerDirection.CREDIT,
            amountMinor: debit.amountMinor,
            settlementId,
            reversesEntryId: debit.id,
            reason: `Payout failed for settlement ${settlementId}: amount returned to balance`,
            actorUserId: null,
            idempotencyKey: `ledger:settlement-reversal:${settlementId}`,
          },
        });
      }
      await this.audit(
        null,
        'SETTLEMENT_FAILED',
        settlementId,
        { amountMinor: Number(settlement.amountMinor) },
        null,
        tx,
      );
      return this.toDto(failed);
    });
  }

  /** Providers with a positive balance: the "ready to settle" list in A10. */
  async listReadyToSettle(): Promise<ReadyToSettleDto[]> {
    const groups = await this.prisma.providerLedgerEntry.groupBy({
      by: ['providerProfileId', 'direction'],
      _sum: { amountMinor: true },
    });
    const balances = new Map<string, number>();
    for (const g of groups) {
      const amt = Number(g._sum.amountMinor ?? 0n);
      const sign = g.direction === LedgerDirection.CREDIT ? 1 : -1;
      balances.set(g.providerProfileId, (balances.get(g.providerProfileId) ?? 0) + sign * amt);
    }
    return [...balances.entries()]
      .filter(([, balance]) => balance > 0)
      .map(([providerProfileId, balanceMinor]) => ({ providerProfileId, balanceMinor }))
      .sort((a, b) => b.balanceMinor - a.balanceMinor);
  }

  async listSettlements(filter: {
    providerProfileId?: string | undefined;
    status?: SettlementStatus | undefined;
  }): Promise<SettlementResponseDto[]> {
    const rows = await this.prisma.settlement.findMany({
      where: {
        ...(filter.providerProfileId ? { providerProfileId: filter.providerProfileId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((r) => this.toDto(r));
  }

  private async markPaid(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    settlementId: string,
    payoutRef: string,
    actor: StaffActor | null,
  ): Promise<SettlementRow> {
    const paid = await tx.settlement.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.PAID,
        payoutRef: payoutRef === '' ? null : payoutRef,
        paidAt: new Date(),
        version: { increment: 1 },
      },
    });
    await this.audit(
      actor,
      'SETTLEMENT_PAID',
      settlementId,
      { amountMinor: Number(paid.amountMinor), payoutRef: paid.payoutRef },
      null,
      tx,
    );
    return paid;
  }

  private async audit(
    actor: StaffActor | null,
    action: string,
    id: string,
    after: Record<string, unknown>,
    reason: string | null,
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<void> {
    await this.auditWriter?.write(
      {
        actor: actor
          ? { userId: actor.userId, role: 'ADMIN', subRoles: actor.subRoles }
          : { userId: null, role: 'SYSTEM' },
        action,
        object: { type: 'settlement', id },
        after,
        reason,
      },
      tx,
    );
  }

  private toDto(s: SettlementRow): SettlementResponseDto {
    return {
      id: s.id,
      providerProfileId: s.providerProfileId,
      amountMinor: Number(s.amountMinor),
      status: s.status,
      payoutMethodId: s.payoutMethodId,
      payoutRef: s.payoutRef,
      reason: s.reason,
      createdByUserId: s.createdByUserId,
      paidAt: s.paidAt ? s.paidAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
    };
  }
}

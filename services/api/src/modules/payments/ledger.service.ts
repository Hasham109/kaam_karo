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
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService, type DbClient, type TxClient } from '../../platform/prisma.service.js';
import { OutboxWriter } from '../../platform/outbox.writer.js';

import { CommissionService } from './commission.service.js';
import {
  CommissionPaymentStatus,
  LedgerDirection,
  LedgerEntryType,
  PaymentMethod,
  type CommissionPaymentSubmissionDto,
  type DecideCommissionPaymentDto,
  type ProviderHiringBlockDto,
  type SubmitCommissionPaymentDto,
} from './payments.types.js';

export interface ProviderBalanceSummaryDto {
  providerProfileId: string;
  balanceMinor: number;
  isNegative: boolean;
  totalCreditsMinor: number;
  totalDebitsMinor: number;
  entryCount: number;
}

export interface ProviderLedgerEntryDto {
  id: string;
  providerProfileId: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amountMinor: number;
  netImpactMinor: number; // positive for credit, negative for debit
  bookingId?: string | null;
  paymentId?: string | null;
  commissionPaymentSubmissionId?: string | null;
  billTotalMinor?: number | null;
  commissionableMinor?: number | null;
  commissionMinor?: number | null;
  commissionRate?: number | null;
  reason?: string | null;
  createdAt: string;
}

export interface RecordJobSettlementParams {
  bookingId: string;
  paymentId?: string;
  method: PaymentMethod;
  actorUserId?: string;
}

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: CommissionService,
    @Optional()
    @Inject(CONFIG_SERVICE)
    private readonly configService?: ConfigService,
    @Optional()
    private readonly outboxWriter?: OutboxWriter,
  ) {}

  /**
   * Records provider earnings ledger entry when a job is billed (P14/P15, D-016).
   *
   * ARCH §6.8 Invariants:
   * 1. CASH Job:
   *    - Provider already holds full customer payment in cash.
   *    - Debit entry: 30% of labour (COMMISSION_DEBIT) deducted from provider balance.
   * 2. DIGITAL Job:
   *    - Platform collected full customer payment via gateway.
   *    - Credit entry: bill total − commission (JOB_CREDIT) added to provider balance.
   * 3. Idempotent / Single Job Entry per Booking (LEDGER-002, REL-008):
   *    - Exactly one job settlement entry allowed per booking.
   */
  async recordJobSettlement(params: RecordJobSettlementParams, dbClient?: DbClient) {
    const db = dbClient ?? this.prisma;
    const booking = await db.booking.findUnique({
      where: { id: params.bookingId },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking ${params.bookingId} not found`,
      });
    }

    if (!booking.providerProfileId) {
      throw new BadRequestException({
        code: 'BOOKING_HAS_NO_PROVIDER',
        message: `Booking ${params.bookingId} does not have an assigned provider profile`,
      });
    }

    // Check if an entry already exists for this booking (LEDGER-002)
    const existingEntry = await db.providerLedgerEntry.findFirst({
      where: {
        bookingId: booking.id,
        entryType: {
          in: [LedgerEntryType.COMMISSION_DEBIT, LedgerEntryType.JOB_CREDIT],
        },
      },
    });

    if (existingEntry) {
      // Idempotent return without duplicate insertion
      return this.formatEntry(existingEntry);
    }

    // Calculate exact commission split per ARCH §6.8
    const split = await this.commissionService.calculateSplit({
      bookingId: booking.id,
    });

    let entryType: LedgerEntryType;
    let direction: LedgerDirection;
    let amountMinor: number;
    let reason: string;
    let idempotencyKey: string;

    const bookingRef = booking.bookingNumber ?? booking.id;

    if (params.method === PaymentMethod.CASH) {
      // Cash job: Debit commission (30% of labour) from provider balance (D-016)
      entryType = LedgerEntryType.COMMISSION_DEBIT;
      direction = LedgerDirection.DEBIT;
      amountMinor = split.platformCommissionMinor;
      reason = `Platform commission deduction for Cash Booking #${bookingRef}`;
      idempotencyKey = `ledger:job-commission-debit:${booking.id}`;
    } else {
      // Digital job: Credit provider net earnings (total − commission) to provider balance (D-016)
      entryType = LedgerEntryType.JOB_CREDIT;
      direction = LedgerDirection.CREDIT;
      amountMinor = split.providerShareMinor;
      reason = `Net earnings credit for Digital Booking #${bookingRef}`;
      idempotencyKey = `ledger:job-credit:${booking.id}`;
    }

    // Append-only write to provider_ledger_entry
    const entry = await db.providerLedgerEntry.create({
      data: {
        providerProfileId: booking.providerProfileId,
        entryType,
        direction,
        amountMinor: BigInt(amountMinor),
        bookingId: booking.id,
        paymentId: params.paymentId ?? null,
        billTotalMinor: BigInt(split.totalBillMinor),
        commissionableMinor: BigInt(split.commissionableLabourMinor),
        commissionMinor: BigInt(split.platformCommissionMinor),
        commissionRate: new Prisma.Decimal(split.commissionRate),
        reason,
        actorUserId: params.actorUserId ?? null,
        idempotencyKey,
      },
    });

    // If cash debit caused provider balance to go below negative balance limit, emit provider.balance_negative (ARCH §7, D-020)
    if (params.method === PaymentMethod.CASH && this.outboxWriter) {
      const allEntries = await db.providerLedgerEntry.findMany({
        where: { providerProfileId: booking.providerProfileId },
        select: { direction: true, amountMinor: true },
      });
      let currentBal = 0;
      for (const e of allEntries) {
        const amt = Number(e.amountMinor);
        if (e.direction === LedgerDirection.CREDIT) currentBal += amt;
        else if (e.direction === LedgerDirection.DEBIT) currentBal -= amt;
      }
      const maxNeg = await this.getMaxNegativeBalanceLimit();
      if (currentBal < -maxNeg) {
        await this.outboxWriter.append(db as unknown as TxClient, {
          eventType: 'provider.balance_negative',
          schemaVersion: 1,
          aggregateType: 'provider_profile',
          aggregateId: booking.providerProfileId,
          payload: {
            providerProfileId: booking.providerProfileId,
            bookingId: booking.id,
            balanceMinor: currentBal,
            amountOwedMinor: Math.abs(currentBal),
            occurredAt: new Date().toISOString(),
          },
        });
      }
    }

    return this.formatEntry(entry);
  }

  /**
   * Refuses access unless the profile belongs to the calling user (BP §29: own data only).
   */
  async assertProviderOwnsProfile(userId: string, providerProfileId: string): Promise<void> {
    const profile = await this.prisma.providerProfile.findUnique({ where: { userId } });
    if (!profile || profile.id !== providerProfileId) {
      throw new ForbiddenException({
        code: 'NOT_YOUR_LEDGER',
        message: 'You can only view your own earnings ledger',
      });
    }
  }

  /**
   * Calculates current provider balance from append-only ledger (ARCH §6.8).
   * Balance = SUM(credits) − SUM(debits).
   */
  async getProviderBalance(providerProfileId: string): Promise<ProviderBalanceSummaryDto> {
    const entries = await this.prisma.providerLedgerEntry.findMany({
      where: { providerProfileId },
      select: { direction: true, amountMinor: true },
    });

    let totalCreditsMinor = 0;
    let totalDebitsMinor = 0;

    for (const entry of entries) {
      const amt = Number(entry.amountMinor);
      if (entry.direction === LedgerDirection.CREDIT) {
        totalCreditsMinor += amt;
      } else if (entry.direction === LedgerDirection.DEBIT) {
        totalDebitsMinor += amt;
      }
    }

    const balanceMinor = totalCreditsMinor - totalDebitsMinor;

    return {
      providerProfileId,
      balanceMinor,
      isNegative: balanceMinor < 0,
      totalCreditsMinor,
      totalDebitsMinor,
      entryCount: entries.length,
    };
  }

  /**
   * Retrieves provider ledger entries for P15 (Partner wallet / earnings screen).
   */
  async getProviderLedgerHistory(
    providerProfileId: string,
    limit = 50,
  ): Promise<ProviderLedgerEntryDto[]> {
    const entries = await this.prisma.providerLedgerEntry.findMany({
      where: { providerProfileId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return entries.map((e) => this.formatEntry(e));
  }

  /**
   * Formats a database ProviderLedgerEntry row into an API DTO.
   */
  private formatEntry(entry: {
    id: string;
    providerProfileId: string;
    entryType: LedgerEntryType;
    direction: LedgerDirection;
    amountMinor: bigint | number;
    bookingId?: string | null;
    paymentId?: string | null;
    billTotalMinor?: bigint | number | null;
    commissionableMinor?: bigint | number | null;
    commissionMinor?: bigint | number | null;
    commissionRate?: Prisma.Decimal | number | null;
    reason?: string | null;
    createdAt: Date;
  }): ProviderLedgerEntryDto {
    const amount = Number(entry.amountMinor);
    const isCredit = entry.direction === LedgerDirection.CREDIT;
    const netImpactMinor = isCredit ? amount : -amount;

    return {
      id: entry.id,
      providerProfileId: entry.providerProfileId,
      entryType: entry.entryType,
      direction: entry.direction,
      amountMinor: amount,
      netImpactMinor,
      bookingId: entry.bookingId ?? null,
      paymentId: entry.paymentId ?? null,
      billTotalMinor:
        entry.billTotalMinor !== null && entry.billTotalMinor !== undefined
          ? Number(entry.billTotalMinor)
          : null,
      commissionableMinor:
        entry.commissionableMinor !== null && entry.commissionableMinor !== undefined
          ? Number(entry.commissionableMinor)
          : null,
      commissionMinor:
        entry.commissionMinor !== null && entry.commissionMinor !== undefined
          ? Number(entry.commissionMinor)
          : null,
      commissionRate:
        entry.commissionRate !== null && entry.commissionRate !== undefined
          ? Number(entry.commissionRate)
          : null,
      reason: entry.reason ?? null,
      createdAt: entry.createdAt.toISOString(),
    };
  }

  /**
   * Retrieves the dynamic negative balance threshold from configuration.
   * Default: 0 paisas (D-020).
   */
  async getMaxNegativeBalanceLimit(): Promise<number> {
    if (!this.configService) return 0;
    try {
      const res = await this.configService.get<number | null>(
        'ledger.max_negative_balance',
        (v: unknown) => (typeof v === 'number' ? v : null),
      );
      if (res.status === 'configured' && typeof res.value === 'number') {
        return res.value;
      }
    } catch {
      return 0;
    }
    return 0;
  }

  /**
   * Checks whether a provider is currently blocked from new hires or starting jobs (D-020, D-021; LEDGER-NEG-001..005).
   * Balance < -maxNegativeBalance triggers hiring block.
   */
  async isProviderHiringBlocked(providerProfileId: string): Promise<ProviderHiringBlockDto> {
    const summary = await this.getProviderBalance(providerProfileId);
    const maxNegativeBalanceMinor = await this.getMaxNegativeBalanceLimit();
    const amountOwedMinor = summary.balanceMinor < 0 ? Math.abs(summary.balanceMinor) : 0;
    const isBlocked = summary.balanceMinor < -maxNegativeBalanceMinor;
    const owedRs = Math.ceil(amountOwedMinor / 100);

    return {
      isBlocked,
      balanceMinor: summary.balanceMinor,
      amountOwedMinor,
      maxNegativeBalanceMinor,
      blockReasonEn: isBlocked
        ? `You owe Rs. ${owedRs}. You cannot get new jobs or start accepted jobs until it is paid.`
        : undefined,
      blockReasonUr: isBlocked
        ? `آپ پر ${owedRs} روپے واجب الادا ہیں۔ ادائیگی تک آپ نئے کام نہیں لے سکتے اور قبول شدہ کام شروع نہیں کر سکتے۔`
        : undefined,
    };
  }

  /**
   * Provider submits payment proof to pay company (P15 / D-020, D-021; LEDGER-PAY-002, LEDGER-PAY-003).
   * Invariant: A submitted-but-unverified payment does NOT unblock the provider.
   */
  async submitCommissionPayment(
    dto: SubmitCommissionPaymentDto,
    submittedByUserId: string,
  ): Promise<CommissionPaymentSubmissionDto> {
    if (!dto.amountMinor || dto.amountMinor <= 0) {
      throw new BadRequestException({
        code: 'INVALID_AMOUNT',
        message: 'Payment amount must be greater than 0',
      });
    }

    if (!dto.transactionRef || dto.transactionRef.trim() === '') {
      throw new BadRequestException({
        code: 'TRANSACTION_REF_REQUIRED',
        message: 'Transaction reference is required (LEDGER-PAY-002)',
      });
    }

    return await this.prisma.$transaction(async (tx) => {
      const submission = await tx.commissionPaymentSubmission.create({
        data: {
          providerProfileId: dto.providerProfileId,
          amountMinor: BigInt(dto.amountMinor),
          transactionRef: dto.transactionRef.trim(),
          submittedByUserId,
          screenshotMediaId: dto.screenshotMediaId ?? null,
          status: CommissionPaymentStatus.SUBMITTED,
        },
      });

      if (this.outboxWriter) {
        await this.outboxWriter.append(tx, {
          eventType: 'provider.commission_payment_submitted',
          schemaVersion: 1,
          aggregateType: 'provider_profile',
          aggregateId: dto.providerProfileId,
          payload: {
            submissionId: submission.id,
            providerProfileId: dto.providerProfileId,
            amountMinor: dto.amountMinor,
            transactionRef: dto.transactionRef.trim(),
            submittedByUserId,
            submittedAt: submission.submittedAt.toISOString(),
          },
        });
      }

      return this.formatSubmission(submission);
    });
  }

  /**
   * Finance approves or rejects a commission payment claim (A09 / ARCH §6.8, D-021; LEDGER-PAY-004..006).
   *
   * Invariants:
   * 1. Separation of duty (ABUSE-010): User who submitted cannot decide their own submission.
   * 2. Mandatory audit reason for both approve and reject (ROLE-003).
   * 3. Approval creates an audited COMPANY_PAYMENT_CREDIT ledger row.
   * 4. Auto-unblocks provider if balance >= -maxNegativeBalance, emitting provider.balance_cleared.
   */
  async decideCommissionPayment(
    submissionId: string,
    dto: DecideCommissionPaymentDto,
    decidedByUserId: string,
  ): Promise<CommissionPaymentSubmissionDto> {
    if (!dto.decisionReason || dto.decisionReason.trim() === '') {
      throw new BadRequestException({
        code: 'DECISION_REASON_REQUIRED',
        message: 'A mandatory audit reason is required to decide commission submissions (ROLE-003)',
      });
    }

    return await this.prisma.$transaction(async (tx) => {
      const submission = await tx.commissionPaymentSubmission.findUnique({
        where: { id: submissionId },
      });

      if (!submission) {
        throw new NotFoundException({
          code: 'SUBMISSION_NOT_FOUND',
          message: `Commission payment submission ${submissionId} not found`,
        });
      }

      if (submission.status !== CommissionPaymentStatus.SUBMITTED) {
        throw new ConflictException({
          code: 'SUBMISSION_ALREADY_DECIDED',
          message: `Submission has already been decided with status ${submission.status}`,
        });
      }

      // Separation of Duty enforcement (ABUSE-010, OQ-083)
      if (submission.submittedByUserId === decidedByUserId) {
        throw new ForbiddenException({
          code: 'CANNOT_DECIDE_OWN_SUBMISSION',
          message:
            'Staff or provider users cannot approve or reject their own commission payment submissions (ABUSE-010)',
        });
      }

      if (dto.action === 'REJECT') {
        const updated = await tx.commissionPaymentSubmission.update({
          where: { id: submissionId },
          data: {
            status: CommissionPaymentStatus.REJECTED,
            decidedByUserId,
            decidedAt: new Date(),
            decisionReason: dto.decisionReason.trim(),
            version: { increment: 1 },
          },
        });

        if (this.outboxWriter) {
          await this.outboxWriter.append(tx, {
            eventType: 'provider.commission_payment_rejected',
            schemaVersion: 1,
            aggregateType: 'provider_profile',
            aggregateId: submission.providerProfileId,
            payload: {
              submissionId: submission.id,
              providerProfileId: submission.providerProfileId,
              reason: dto.decisionReason.trim(),
              decidedByUserId,
              decidedAt: new Date().toISOString(),
            },
          });
        }

        return this.formatSubmission(updated);
      }

      // APPROVE: write audited COMPANY_PAYMENT_CREDIT to ledger (LEDGER-PAY-005)
      const updated = await tx.commissionPaymentSubmission.update({
        where: { id: submissionId },
        data: {
          status: CommissionPaymentStatus.APPROVED,
          decidedByUserId,
          decidedAt: new Date(),
          decisionReason: dto.decisionReason.trim(),
          version: { increment: 1 },
        },
      });

      await tx.providerLedgerEntry.create({
        data: {
          providerProfileId: submission.providerProfileId,
          entryType: LedgerEntryType.COMPANY_PAYMENT_CREDIT,
          direction: LedgerDirection.CREDIT,
          amountMinor: submission.amountMinor,
          commissionPaymentSubmissionId: submission.id,
          reason: `Commission payment verified (Ref: ${submission.transactionRef}) - ${dto.decisionReason.trim()}`,
          actorUserId: decidedByUserId,
          idempotencyKey: `ledger:commission-payment-credit:${submission.id}`,
        },
      });

      // Recalculate balance inside transaction
      const entries = await tx.providerLedgerEntry.findMany({
        where: { providerProfileId: submission.providerProfileId },
        select: { direction: true, amountMinor: true },
      });
      let balanceMinor = 0;
      for (const e of entries) {
        const amt = Number(e.amountMinor);
        if (e.direction === LedgerDirection.CREDIT) balanceMinor += amt;
        else if (e.direction === LedgerDirection.DEBIT) balanceMinor -= amt;
      }

      const maxNeg = await this.getMaxNegativeBalanceLimit();
      if (balanceMinor >= -maxNeg) {
        // Automatically clears the block (ARCH §6.8, D-020)
        if (this.outboxWriter) {
          await this.outboxWriter.append(tx, {
            eventType: 'provider.balance_cleared',
            schemaVersion: 1,
            aggregateType: 'provider_profile',
            aggregateId: submission.providerProfileId,
            payload: {
              providerProfileId: submission.providerProfileId,
              submissionId: submission.id,
              newBalanceMinor: balanceMinor,
              clearedAt: new Date().toISOString(),
            },
          });
        }
      }

      return this.formatSubmission(updated);
    });
  }

  /**
   * Retrieves pending commission payment submissions for Finance queue (A09).
   */
  async getPendingCommissionSubmissions(limit = 50): Promise<CommissionPaymentSubmissionDto[]> {
    const list = await this.prisma.commissionPaymentSubmission.findMany({
      where: { status: CommissionPaymentStatus.SUBMITTED },
      orderBy: { submittedAt: 'asc' },
      take: limit,
    });
    return list.map((sub) => this.formatSubmission(sub));
  }

  /**
   * Retrieves commission payment submissions for a specific provider.
   */
  async getProviderCommissionSubmissions(
    providerProfileId: string,
  ): Promise<CommissionPaymentSubmissionDto[]> {
    const list = await this.prisma.commissionPaymentSubmission.findMany({
      where: { providerProfileId },
      orderBy: { submittedAt: 'desc' },
    });
    return list.map((sub) => this.formatSubmission(sub));
  }

  /**
   * Formats a database CommissionPaymentSubmission row into an API DTO.
   */
  private formatSubmission(sub: {
    id: string;
    providerProfileId: string;
    amountMinor: bigint | number;
    transactionRef: string;
    submittedByUserId: string;
    screenshotMediaId: string | null;
    status: CommissionPaymentStatus;
    submittedAt: Date;
    decidedByUserId: string | null;
    decidedAt: Date | null;
    decisionReason: string | null;
    version: number;
  }): CommissionPaymentSubmissionDto {
    return {
      id: sub.id,
      providerProfileId: sub.providerProfileId,
      amountMinor: Number(sub.amountMinor),
      transactionRef: sub.transactionRef,
      submittedByUserId: sub.submittedByUserId,
      screenshotMediaId: sub.screenshotMediaId ?? null,
      status: sub.status,
      submittedAt: sub.submittedAt.toISOString(),
      decidedByUserId: sub.decidedByUserId ?? null,
      decidedAt: sub.decidedAt ? sub.decidedAt.toISOString() : null,
      decisionReason: sub.decisionReason ?? null,
      version: sub.version,
    };
  }
}

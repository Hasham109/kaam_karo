/**
 * LedgerService — Provider earnings ledger & double-entry balance accounting (T6.6; owner A09 + A12 + A13 + A11).
 * Requirement IDs: LEDGER-001..007, PAY-003..004, D-016, D-020, D-021, D-030; ARCH §6.8; BP §17, §25, §26.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService, type DbClient } from '../../platform/prisma.service.js';

import { CommissionService } from './commission.service.js';
import { LedgerDirection, LedgerEntryType, PaymentMethod } from './payments.types.js';

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
}

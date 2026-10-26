/**
 * ReconciliationService — gateway-vs-internal reconciliation & exception detection (Module M11, T6.3; owner A09).
 * Requirement IDs: PAY-005, ADMIN-ROLE-004.
 * ARCH §6.8; BP §25, §26; docs/screens/admin.md A09 "Exceptions" tab.
 *
 * Runs periodically or on-demand from the Finance admin portal.
 * Compares internal DB payment and refund states against the PaymentGateway.
 * Flags:
 *  - MISSING_AT_GATEWAY: payment row has gatewayRef but gateway has no matching record;
 *  - STATUS_MISMATCH: internal status != gateway status;
 *  - AMOUNT_MISMATCH: internal amountMinor != gateway amountMinor;
 *  - STUCK_PAYMENT: PENDING payment exceeds configured threshold;
 *  - STUCK_REFUND: ISSUED refund exceeds configured threshold;
 *  - DIGITAL_UNCONFIRMED: provider recorded method DIGITAL, but no SUCCEEDED payment exists.
 */
import { Inject, Injectable, Optional } from '@nestjs/common';
import { CONFIG_SERVICE, type ConfigService } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service.js';
import { AuditWriter } from '../../platform/audit.writer.js';
import {
  PAYMENT_GATEWAY,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  type PaymentGateway,
  type ReconciliationExceptionDto,
  type ReconciliationReportDto,
  type StaffActor,
} from './payments.types.js';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @Optional()
    @Inject(CONFIG_SERVICE)
    private readonly configService?: ConfigService,
    @Optional() private readonly auditWriter?: AuditWriter,
  ) {}

  /**
   * Runs reconciliation across active/recent payments, refunds, and unconfirmed digital records.
   */
  async runReconciliation(
    actor?: StaffActor | null,
    now = new Date(),
  ): Promise<ReconciliationReportDto> {
    const exceptions: ReconciliationExceptionDto[] = [];

    // 1. Check all DIGITAL payments with a gatewayRef
    const payments = await this.prisma.payment.findMany({
      where: {
        method: PaymentMethod.DIGITAL,
        gatewayRef: { not: null },
      },
      orderBy: { occurredAt: 'desc' },
      take: 500,
    });

    // Deduplicate to latest row per paymentRef
    const latestByPaymentRef = new Map<string, (typeof payments)[0]>();
    for (const p of payments) {
      if (!latestByPaymentRef.has(p.paymentRef)) {
        latestByPaymentRef.set(p.paymentRef, p);
      }
    }

    const stuckPaymentMinutes = await this.getConfigNumber('payments.pending_stuck_minutes');

    for (const p of latestByPaymentRef.values()) {
      if (!p.gatewayRef) continue;

      try {
        const gw = await this.gateway.query(p.gatewayRef);

        if (gw.found === false) {
          exceptions.push({
            type: 'MISSING_AT_GATEWAY',
            bookingId: p.bookingId,
            paymentRef: p.paymentRef,
            internalStatus: p.status,
            internalAmountMinor: Number(p.amountMinor),
            detail: `Payment ${p.paymentRef} with gateway ref ${p.gatewayRef} was not found at gateway`,
          });
          continue;
        }

        // Status comparison
        if (p.status === PaymentStatus.SUCCEEDED && gw.status !== PaymentStatus.SUCCEEDED) {
          exceptions.push({
            type: 'STATUS_MISMATCH',
            bookingId: p.bookingId,
            paymentRef: p.paymentRef,
            internalStatus: p.status,
            gatewayStatus: gw.status,
            internalAmountMinor: Number(p.amountMinor),
            gatewayAmountMinor: Number(gw.amountMinor),
            detail: `Payment ${p.paymentRef} internal status is ${p.status} but gateway status is ${gw.status}`,
          });
        } else if (p.status === PaymentStatus.FAILED && gw.status === PaymentStatus.SUCCEEDED) {
          exceptions.push({
            type: 'STATUS_MISMATCH',
            bookingId: p.bookingId,
            paymentRef: p.paymentRef,
            internalStatus: p.status,
            gatewayStatus: gw.status,
            internalAmountMinor: Number(p.amountMinor),
            gatewayAmountMinor: Number(gw.amountMinor),
            detail: `Payment ${p.paymentRef} internal status is FAILED but gateway reports SUCCEEDED`,
          });
        }

        // Amount comparison for SUCCEEDED payments
        if (p.status === PaymentStatus.SUCCEEDED && gw.amountMinor !== p.amountMinor) {
          exceptions.push({
            type: 'AMOUNT_MISMATCH',
            bookingId: p.bookingId,
            paymentRef: p.paymentRef,
            internalAmountMinor: Number(p.amountMinor),
            gatewayAmountMinor: Number(gw.amountMinor),
            detail: `Payment ${p.paymentRef} amount mismatch: internal ${p.amountMinor} != gateway ${gw.amountMinor}`,
          });
        }
      } catch (err) {
        // Gateway unreachable or error
        exceptions.push({
          type: 'MISSING_AT_GATEWAY',
          bookingId: p.bookingId,
          paymentRef: p.paymentRef,
          internalStatus: p.status,
          detail: `Gateway query failed for ref ${p.gatewayRef}: ${(err as Error).message}`,
        });
      }

      // Check stuck pending
      if (p.status === PaymentStatus.PENDING && stuckPaymentMinutes !== null) {
        const ageMinutes = (now.getTime() - p.occurredAt.getTime()) / (1000 * 60);
        if (ageMinutes > stuckPaymentMinutes) {
          exceptions.push({
            type: 'STUCK_PAYMENT',
            bookingId: p.bookingId,
            paymentRef: p.paymentRef,
            internalStatus: p.status,
            waitingMinutes: Math.round(ageMinutes),
            detail: `Payment ${p.paymentRef} has been PENDING for ${Math.round(ageMinutes)}m (threshold: ${stuckPaymentMinutes}m)`,
          });
        }
      }
    }

    // 2. Check stuck ISSUED refunds
    const stuckRefundMinutes = await this.getConfigNumber('payments.refund_stuck_minutes');
    if (stuckRefundMinutes !== null) {
      const refunds = await this.prisma.refund.findMany({
        where: { status: RefundStatus.ISSUED },
        orderBy: { occurredAt: 'asc' },
      });
      // Filter out any refundRef that has a later SUCCEEDED or FAILED row
      const terminalRefs = new Set(
        (
          await this.prisma.refund.findMany({
            where: {
              refundRef: { in: refunds.map((r) => r.refundRef) },
              status: { in: [RefundStatus.SUCCEEDED, RefundStatus.FAILED] },
            },
            select: { refundRef: true },
          })
        ).map((r) => r.refundRef),
      );

      for (const r of refunds) {
        if (terminalRefs.has(r.refundRef)) continue;
        const ageMinutes = (now.getTime() - r.occurredAt.getTime()) / (1000 * 60);
        if (ageMinutes > stuckRefundMinutes) {
          exceptions.push({
            type: 'STUCK_REFUND',
            bookingId: r.bookingId,
            refundRef: r.refundRef,
            internalStatus: r.status,
            waitingMinutes: Math.round(ageMinutes),
            detail: `Refund ${r.refundRef} has been ISSUED for ${Math.round(ageMinutes)}m (threshold: ${stuckRefundMinutes}m)`,
          });
        }
      }
    }

    // 3. Check DIGITAL recorded without gateway confirmation (A09 Exceptions)
    const digitalFlagHours = await this.getConfigNumber('ledger.digital_unconfirmed_flag_hours');
    const digitalRecords = await this.prisma.paymentMethodRecord.findMany({
      where: { method: PaymentMethod.DIGITAL },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });

    for (const rec of digitalRecords) {
      const succeededPayment = await this.prisma.payment.findFirst({
        where: {
          bookingId: rec.bookingId,
          method: PaymentMethod.DIGITAL,
          status: PaymentStatus.SUCCEEDED,
        },
      });

      if (!succeededPayment) {
        const ageHours = (now.getTime() - rec.recordedAt.getTime()) / (1000 * 60 * 60);
        const ageMinutes = Math.round(ageHours * 60);

        // If digitalFlagHours is configured, only flag if age exceeds it; otherwise list all unconfirmed
        if (digitalFlagHours === null || ageHours >= digitalFlagHours) {
          exceptions.push({
            type: 'DIGITAL_UNCONFIRMED',
            bookingId: rec.bookingId,
            waitingMinutes: ageMinutes,
            detail: `Provider recorded DIGITAL payment at ${rec.recordedAt.toISOString()}, but no confirmed payment was received (waiting ${ageMinutes}m)`,
          });
        }
      }
    }

    // Audit log the reconciliation run
    await this.auditWriter?.write({
      actor: actor
        ? { userId: actor.userId, role: 'ADMIN', subRoles: actor.subRoles }
        : { userId: null, role: 'SYSTEM' },
      action: 'RECONCILIATION_RUN',
      object: { type: 'reconciliation_report', id: null },
      after: {
        checkedPayments: latestByPaymentRef.size,
        exceptionCount: exceptions.length,
      },
    });

    return {
      ranAt: now.toISOString(),
      checkedPayments: latestByPaymentRef.size,
      exceptions,
    };
  }

  /**
   * Helper to retrieve numeric configuration value safely.
   */
  private async getConfigNumber(key: string): Promise<number | null> {
    if (!this.configService) return null;
    try {
      const res = await this.configService.get<number | null>(key, (v: unknown) =>
        typeof v === 'number' ? v : null,
      );
      if (res.status === 'configured' && typeof res.value === 'number') {
        return res.value;
      }
    } catch {
      return null;
    }
    return null;
  }
}

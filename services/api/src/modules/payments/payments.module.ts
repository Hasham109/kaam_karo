/**
 * PaymentsModule — NestJS module for Payments & Settlement (Module M11, T6.1; owner A09).
 * Requirement IDs: PAY-001..003, PAY-008, PAY-TIMING-001, LEDGER-001..002.
 * ARCH §4 M11, §6.8; BP §17, §25, §26, §31.2; D-003, D-006, D-008, D-015, D-016, D-030.
 */
import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { FakePaymentGateway } from './fake-payment-gateway.js';
import { FakePayoutProvider } from './fake-payout-provider.js';
import { CommissionService } from './commission.service.js';
import { LedgerService } from './ledger.service.js';
import { LedgerAdjustmentService } from './ledger-adjustment.service.js';
import { RefundService } from './refund.service.js';
import { SettlementService } from './settlement.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import { PAYMENT_GATEWAY, PAYOUT_PROVIDER } from './payments.types.js';

@Module({
  imports: [IdentityModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    CommissionService,
    LedgerService,
    LedgerAdjustmentService,
    RefundService,
    SettlementService,
    ReconciliationService,
    FakePaymentGateway,
    {
      provide: PAYMENT_GATEWAY,
      useExisting: FakePaymentGateway,
    },
    FakePayoutProvider,
    {
      provide: PAYOUT_PROVIDER,
      useExisting: FakePayoutProvider,
    },
  ],
  exports: [
    PaymentsService,
    CommissionService,
    LedgerService,
    LedgerAdjustmentService,
    RefundService,
    SettlementService,
    ReconciliationService,
    PAYMENT_GATEWAY,
    FakePaymentGateway,
    PAYOUT_PROVIDER,
    FakePayoutProvider,
  ],
})
export class PaymentsModule {}

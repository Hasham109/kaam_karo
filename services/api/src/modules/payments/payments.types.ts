/**
 * Types and DTOs for Payments & Settlement (Module M11, T6.1; owner A09).
 * Requirement IDs: PAY-001..003, PAY-008, PAY-TIMING-001, LEDGER-001..002;
 * T6.3: PAY-004..007, LEDGER-005, LEDGER-007, SUP-004.
 * ARCH §4 M11, §6.8; BP §17, §25, §26, §31.2; D-003, D-006, D-008, D-015, D-016, D-030.
 */
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  ActorRole,
  LedgerEntryType,
  LedgerDirection,
  CommissionPaymentStatus,
  RefundStatus,
  SettlementStatus,
} from '../../generated/prisma/client.js';

export {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  ActorRole,
  LedgerEntryType,
  LedgerDirection,
  CommissionPaymentStatus,
  RefundStatus,
  SettlementStatus,
};

export interface SubmitCommissionPaymentDto {
  providerProfileId: string;
  amountMinor: number;
  transactionRef: string;
  screenshotMediaId?: string;
}

export interface DecideCommissionPaymentDto {
  action: 'APPROVE' | 'REJECT';
  decisionReason: string;
}

export interface CommissionPaymentSubmissionDto {
  id: string;
  providerProfileId: string;
  amountMinor: number;
  transactionRef: string;
  submittedByUserId: string;
  screenshotMediaId?: string | null;
  status: CommissionPaymentStatus;
  submittedAt: string;
  decidedByUserId?: string | null;
  decidedAt?: string | null;
  decisionReason?: string | null;
  version: number;
}

export interface ProviderHiringBlockDto {
  isBlocked: boolean;
  balanceMinor: number;
  amountOwedMinor: number;
  maxNegativeBalanceMinor: number;
  blockReasonEn?: string | undefined;
  blockReasonUr?: string | undefined;
}

export interface InitiatePaymentDto {
  bookingId: string;
  method: PaymentMethod;
  amountMinor?: number | bigint;
  idempotencyKey?: string;
}

export interface ConfirmPaymentDto {
  paymentRef: string;
  gatewayRef: string;
  success: boolean;
  failureReason?: string;
}

export interface RecordCashPaymentDto {
  bookingId: string;
  amountMinor?: number | bigint;
  notes?: string;
}

export interface PaymentResponseDto {
  paymentRef: string;
  bookingId: string;
  customerProfileId: string;
  providerProfileId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amountMinor: number;
  gatewayRef?: string | null;
  checkoutUrl?: string | null;
  occurredAt: Date;
  isSettled: boolean;
}

export interface PaymentStatusResponseDto {
  bookingId: string;
  hasPayment: boolean;
  isSettled: boolean;
  currentStatus?: PaymentStatus | undefined;
  method?: PaymentMethod | undefined;
  amountMinor?: number | undefined;
  paidByLabel?: string | undefined;
  history: PaymentResponseDto[];
}

export interface GatewayInitiateParams {
  paymentRef: string;
  amountMinor: bigint;
  currency: string;
  bookingId: string;
  customerProfileId?: string;
}

export interface GatewayInitiateResult {
  gatewayRef: string;
  checkoutUrl: string;
  status: PaymentStatus;
}

export interface GatewayQueryResult {
  gatewayRef: string;
  status: PaymentStatus;
  amountMinor: bigint;
  /** false when the gateway has no record of this reference (reconciliation, PAY-005). */
  found?: boolean | undefined;
}

export interface GatewayRefundParams {
  refundRef: string;
  gatewayRef: string;
  amountMinor: bigint;
}

export interface GatewayRefundResult {
  gatewayRef: string;
  status: RefundStatus;
}

export interface PaymentGateway {
  initiate(params: GatewayInitiateParams): Promise<GatewayInitiateResult>;
  query(gatewayRef: string): Promise<GatewayQueryResult>;
  refund(params: GatewayRefundParams): Promise<GatewayRefundResult>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

/** PayoutProvider interface (EXT-001, D-008; PAY-007). Fake until a real provider is chosen. */
export interface PayoutParams {
  settlementId: string;
  providerProfileId: string;
  amountMinor: bigint;
  payoutProviderRef?: string | null | undefined;
}

export interface PayoutResult {
  payoutRef: string;
  status: 'PAID' | 'FAILED' | 'PENDING';
}

export interface PayoutProvider {
  payout(params: PayoutParams): Promise<PayoutResult>;
}

export const PAYOUT_PROVIDER = Symbol('PAYOUT_PROVIDER');

/** Authenticated Finance staff member performing a money action (ADMIN-ROLE-004). */
export interface StaffActor {
  userId: string;
  subRoles: readonly string[];
}

export interface CreateRefundDto {
  bookingId: string;
  /** Defaults to everything still refundable. Partial refunds are allowed (OQ-058 open). */
  amountMinor?: number | undefined;
  reason: string;
  disputeId?: string | undefined;
  idempotencyKey: string;
}

export interface RefundResponseDto {
  refundRef: string;
  paymentId: string;
  bookingId: string;
  disputeId: string | null;
  amountMinor: number;
  status: RefundStatus;
  reason: string | null;
  gatewayRef: string | null;
  occurredAt: string;
}

export interface RefundableAmountDto {
  bookingId: string;
  paidMinor: number;
  refundedMinor: number;
  pendingMinor: number;
  refundableMinor: number;
}

export interface CreateSettlementDto {
  providerProfileId: string;
  amountMinor: number;
  mode: 'PAYOUT_PROVIDER' | 'MANUAL';
  /** Required for MANUAL settlements: the bank/wallet transfer reference. */
  reference?: string | undefined;
  payoutMethodId?: string | undefined;
  reason: string;
  idempotencyKey: string;
}

export interface SettlementResponseDto {
  id: string;
  providerProfileId: string;
  amountMinor: number;
  status: SettlementStatus;
  payoutMethodId: string | null;
  payoutRef: string | null;
  reason: string | null;
  createdByUserId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface ReadyToSettleDto {
  providerProfileId: string;
  balanceMinor: number;
}

export interface CreateLedgerCorrectionDto {
  originalEntryId: string;
  /** Defaults to everything not yet reversed. */
  amountMinor?: number | undefined;
  reason: string;
  idempotencyKey: string;
}

export interface ProviderLedgerEntryDtoLike {
  id: string;
  providerProfileId: string;
  entryType: LedgerEntryType;
  direction: LedgerDirection;
  amountMinor: number;
  reversesEntryId: string | null;
  reason: string | null;
}

export type ReconciliationExceptionType =
  | 'MISSING_AT_GATEWAY'
  | 'STATUS_MISMATCH'
  | 'AMOUNT_MISMATCH'
  | 'STUCK_PAYMENT'
  | 'STUCK_REFUND'
  | 'DIGITAL_UNCONFIRMED';

export interface ReconciliationExceptionDto {
  type: ReconciliationExceptionType;
  bookingId: string;
  paymentRef?: string | undefined;
  refundRef?: string | undefined;
  internalStatus?: string | undefined;
  gatewayStatus?: string | undefined;
  internalAmountMinor?: number | undefined;
  gatewayAmountMinor?: number | undefined;
  waitingMinutes?: number | undefined;
  detail: string;
}

export interface ReconciliationReportDto {
  ranAt: string;
  checkedPayments: number;
  exceptions: ReconciliationExceptionDto[];
}

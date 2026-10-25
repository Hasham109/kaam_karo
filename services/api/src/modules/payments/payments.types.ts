/**
 * Types and DTOs for Payments & Settlement (Module M11, T6.1; owner A09).
 * Requirement IDs: PAY-001..003, PAY-008, PAY-TIMING-001, LEDGER-001..002.
 * ARCH §4 M11, §6.8; BP §17, §25, §26, §31.2; D-003, D-006, D-008, D-015, D-016, D-030.
 */
import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  ActorRole,
  LedgerEntryType,
  LedgerDirection,
} from '../../generated/prisma/client.js';

export { BookingStatus, PaymentMethod, PaymentStatus, ActorRole, LedgerEntryType, LedgerDirection };

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
}

export interface PaymentGateway {
  initiate(params: GatewayInitiateParams): Promise<GatewayInitiateResult>;
  query(gatewayRef: string): Promise<GatewayQueryResult>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');

/**
 * Fake Payment Gateway (Module M11, T6.1; owner A09).
 * Requirement IDs: PAY-001, PAY-008; BP §49, §69; D-008.
 * Simulates hosted checkout gateway without touching raw card data.
 */
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  type PaymentGateway,
  type GatewayInitiateParams,
  type GatewayInitiateResult,
  type GatewayQueryResult,
  type GatewayRefundParams,
  type GatewayRefundResult,
  PaymentStatus,
  RefundStatus,
} from './payments.types.js';

@Injectable()
export class FakePaymentGateway implements PaymentGateway {
  private readonly transactions = new Map<
    string,
    { status: PaymentStatus; amountMinor: bigint; paymentRef: string }
  >();

  async initiate(params: GatewayInitiateParams): Promise<GatewayInitiateResult> {
    const gatewayRef = `fake_gw_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const checkoutUrl = `https://checkout.sandbox.fakegateway.local/pay?ref=${gatewayRef}&payment_ref=${params.paymentRef}`;

    this.transactions.set(gatewayRef, {
      status: PaymentStatus.PENDING,
      amountMinor: params.amountMinor,
      paymentRef: params.paymentRef,
    });

    return {
      gatewayRef,
      checkoutUrl,
      status: PaymentStatus.PENDING,
    };
  }

  async query(gatewayRef: string): Promise<GatewayQueryResult> {
    const tx = this.transactions.get(gatewayRef);
    if (!tx) {
      return {
        gatewayRef,
        status: PaymentStatus.FAILED,
        amountMinor: 0n,
        found: false,
      };
    }

    return {
      gatewayRef,
      status: tx.status,
      amountMinor: tx.amountMinor,
      found: true,
    };
  }

  /** Reverses (part of) a gateway payment. Outcome defaults to SUCCEEDED (T6.3; PAY-006). */
  async refund(params: GatewayRefundParams): Promise<GatewayRefundResult> {
    const status = this.nextRefundStatus;
    this.nextRefundStatus = RefundStatus.SUCCEEDED;
    if (this.refundShouldThrow) {
      this.refundShouldThrow = false;
      throw new Error('fake gateway unreachable');
    }
    return { gatewayRef: `fake_rf_${params.refundRef.replace(/-/g, '').slice(0, 16)}`, status };
  }

  private nextRefundStatus: RefundStatus = RefundStatus.SUCCEEDED;
  private refundShouldThrow = false;

  // Helper for test fixtures to simulate gateway transition
  simulateGatewayCallback(gatewayRef: string, status: PaymentStatus, amountMinor = 50000n): void {
    const tx = this.transactions.get(gatewayRef);
    if (tx) {
      tx.status = status;
    } else {
      this.transactions.set(gatewayRef, {
        status,
        amountMinor,
        paymentRef: 'simulated-ref',
      });
    }
  }

  /** Test helper: set up a known transaction directly on the gateway */
  setTransaction(
    gatewayRef: string,
    data: { status: PaymentStatus; amountMinor: bigint; paymentRef?: string },
  ): void {
    this.transactions.set(gatewayRef, {
      status: data.status,
      amountMinor: data.amountMinor,
      paymentRef: data.paymentRef ?? 'test-pay-ref',
    });
  }

  /** Test helper: make the gateway report a different amount than we recorded. */
  simulateAmountMismatch(gatewayRef: string, amountMinor: bigint): void {
    const tx = this.transactions.get(gatewayRef);
    if (tx) {
      tx.amountMinor = amountMinor;
    }
  }

  /** Test helper: the next refund call returns this status (ISSUED = still processing). */
  setNextRefundStatus(status: RefundStatus): void {
    this.nextRefundStatus = status;
  }

  /** Test helper: the next refund call throws (gateway down). */
  failNextRefundCall(): void {
    this.refundShouldThrow = true;
  }
}

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
  PaymentStatus,
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
      };
    }

    return {
      gatewayRef,
      status: tx.status,
      amountMinor: tx.amountMinor,
    };
  }

  // Helper for test fixtures to simulate gateway transition
  simulateGatewayCallback(gatewayRef: string, status: PaymentStatus): void {
    const tx = this.transactions.get(gatewayRef);
    if (tx) {
      tx.status = status;
    }
  }
}

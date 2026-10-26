/**
 * Safepay Payment Gateway Adapter (Module M11, Task T6.5; owner A09).
 * Requirement IDs: PAY-001, PAY-008, EXT-001, SEC-BASE-009; BP §33, §69; D-008.
 *
 * Implements PaymentGateway interface for Safepay (Pakistan hosted checkout,
 * debit/credit cards, 1LINK/PayPak, mobile wallets).
 * ZERO raw card data enters the Kaam Karo platform (SEC-BASE-009, PAY-008).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { BadGatewayException, Injectable, Logger, Optional } from '@nestjs/common';
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

export interface SafepayGatewayConfig {
  apiKey?: string;
  webhookSecret?: string;
  environment?: 'sandbox' | 'production';
  baseUrl?: string;
  checkoutBaseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface SafepayOrderInitResponse {
  status?: {
    message?: string;
    errors?: string[];
  };
  data?: {
    token?: string;
  };
}

export interface SafepayOrderQueryResponse {
  status?: {
    message?: string;
  };
  data?: {
    token?: string;
    amount?: number;
    currency?: string;
    state?: string;
    status?: string;
  };
}

export interface SafepayRefundResponse {
  status?: {
    message?: string;
  };
  data?: {
    token?: string;
    status?: string;
  };
}

@Injectable()
export class SafepayPaymentGateway implements PaymentGateway {
  private readonly logger = new Logger(SafepayPaymentGateway.name);
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly environment: 'sandbox' | 'production';
  private readonly baseUrl: string;
  private readonly checkoutBaseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(@Optional() config?: Partial<SafepayGatewayConfig>) {
    this.environment =
      config?.environment ?? (process.env.SAFEPAY_ENV === 'production' ? 'production' : 'sandbox');

    this.baseUrl =
      config?.baseUrl ??
      (process.env.SAFEPAY_BASE_URL ||
        (this.environment === 'production'
          ? 'https://api.getsafepay.com'
          : 'https://sandbox.api.getsafepay.com'));

    this.checkoutBaseUrl =
      config?.checkoutBaseUrl ??
      (process.env.SAFEPAY_CHECKOUT_URL ||
        (this.environment === 'production'
          ? 'https://getsafepay.com/checkout/pay'
          : 'https://sandbox.api.getsafepay.com/checkout/pay'));

    this.apiKey =
      config?.apiKey ?? process.env.SAFEPAY_API_KEY ?? 'sec_sandbox_dummy_api_key_for_dev';

    this.webhookSecret =
      config?.webhookSecret ??
      process.env.SAFEPAY_WEBHOOK_SECRET ??
      'whsec_sandbox_dummy_webhook_secret_for_dev';

    this.fetchFn = config?.fetchFn ?? globalThis.fetch;
  }

  public getEnvironment(): 'sandbox' | 'production' {
    return this.environment;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getCheckoutBaseUrl(): string {
    return this.checkoutBaseUrl;
  }

  /**
   * Initiates payment on Safepay by creating an order tracker token.
   * Customer is then redirected to Safepay's hosted checkout (PAY-001, PAY-008).
   */
  async initiate(params: GatewayInitiateParams): Promise<GatewayInitiateResult> {
    const amountPkr = Number(params.amountMinor) / 100;
    const url = `${this.baseUrl}/order/v1/init`;

    const requestBody = {
      client: this.apiKey,
      amount: amountPkr,
      currency: params.currency || 'PKR',
      environment: this.environment,
      metadata: {
        paymentRef: params.paymentRef,
        bookingId: params.bookingId,
        ...(params.customerProfileId ? { customerProfileId: params.customerProfileId } : {}),
      },
    };

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-SFPY-MERCHANT-SECRET': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Safepay init failed (status ${response.status}): ${errorText.slice(0, 300)}`,
        );
        throw new BadGatewayException({
          code: 'GATEWAY_INIT_FAILED',
          message: `Safepay rejected payment order initiation (HTTP ${response.status})`,
        });
      }

      const data = (await response.json()) as SafepayOrderInitResponse;
      const trackerToken = data.data?.token;

      if (!trackerToken) {
        throw new BadGatewayException({
          code: 'GATEWAY_INIT_INVALID_RESPONSE',
          message: 'Safepay response missing tracker token',
        });
      }

      const checkoutUrl = `${this.checkoutBaseUrl}?beacon=${encodeURIComponent(trackerToken)}&source=custom`;

      return {
        gatewayRef: trackerToken,
        checkoutUrl,
        status: PaymentStatus.PENDING,
      };
    } catch (err: unknown) {
      if (err instanceof BadGatewayException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Network or fetch error connecting to Safepay: ${message}`);
      throw new BadGatewayException({
        code: 'GATEWAY_COMMUNICATION_ERROR',
        message: `Failed to connect to Safepay gateway: ${message}`,
      });
    }
  }

  /**
   * Queries Safepay for tracker status (PAY-005, reconciliation).
   */
  async query(gatewayRef: string): Promise<GatewayQueryResult> {
    const url = `${this.baseUrl}/order/v1/${encodeURIComponent(gatewayRef)}`;

    try {
      const response = await this.fetchFn(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-SFPY-MERCHANT-SECRET': this.apiKey,
        },
      });

      if (response.status === 404) {
        return {
          gatewayRef,
          status: PaymentStatus.FAILED,
          amountMinor: 0n,
          found: false,
        };
      }

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Safepay query failed (status ${response.status}): ${errorText.slice(0, 300)}`,
        );
        throw new BadGatewayException({
          code: 'GATEWAY_QUERY_FAILED',
          message: `Safepay query failed with status ${response.status}`,
        });
      }

      const resJson = (await response.json()) as SafepayOrderQueryResponse;
      const order = resJson.data;

      if (!order) {
        return {
          gatewayRef,
          status: PaymentStatus.FAILED,
          amountMinor: 0n,
          found: false,
        };
      }

      const rawStatus = (order.state || order.status || '').toUpperCase();
      let status: PaymentStatus;

      if (['PAID', 'COMPLETED', 'SETTLED'].includes(rawStatus)) {
        status = PaymentStatus.SUCCEEDED;
      } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(rawStatus)) {
        status = PaymentStatus.FAILED;
      } else {
        status = PaymentStatus.PENDING;
      }

      const amountMinor =
        order.amount !== null && order.amount !== undefined
          ? BigInt(Math.round(order.amount * 100))
          : 0n;

      return {
        gatewayRef,
        status,
        amountMinor,
        found: true,
      };
    } catch (err: unknown) {
      if (err instanceof BadGatewayException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Network error querying Safepay tracker: ${message}`);
      throw new BadGatewayException({
        code: 'GATEWAY_COMMUNICATION_ERROR',
        message: `Failed to query Safepay gateway: ${message}`,
      });
    }
  }

  /**
   * Dispatches a refund for an existing tracker/payment (PAY-004, PAY-006).
   */
  async refund(params: GatewayRefundParams): Promise<GatewayRefundResult> {
    const url = `${this.baseUrl}/order/v1/${encodeURIComponent(params.gatewayRef)}/refund`;
    const refundAmountPkr = Number(params.amountMinor) / 100;

    try {
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-SFPY-MERCHANT-SECRET': this.apiKey,
        },
        body: JSON.stringify({
          amount: refundAmountPkr,
          refund_ref: params.refundRef,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Safepay refund failed (status ${response.status}): ${errorText.slice(0, 300)}`,
        );
        return {
          gatewayRef: params.gatewayRef,
          status: RefundStatus.FAILED,
        };
      }

      const resJson = (await response.json()) as SafepayRefundResponse;
      const statusStr = (resJson.data?.status || '').toUpperCase();

      let status: RefundStatus;
      if (['SUCCEEDED', 'COMPLETED', 'PROCESSED'].includes(statusStr)) {
        status = RefundStatus.SUCCEEDED;
      } else if (['FAILED', 'REJECTED'].includes(statusStr)) {
        status = RefundStatus.FAILED;
      } else {
        status = RefundStatus.ISSUED;
      }

      return {
        gatewayRef: params.gatewayRef,
        status,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Network error requesting Safepay refund: ${message}`);
      return {
        gatewayRef: params.gatewayRef,
        status: RefundStatus.FAILED,
      };
    }
  }

  /**
   * Verifies the authenticity of a Safepay webhook signature (SEC-AUTH-005, SEC-BASE-009).
   * Safepay sends an HMAC-SHA256 signature in the x-sfpy-signature header.
   */
  public verifyWebhookSignature(
    payload: string | Buffer | object,
    signature: string | undefined | null,
    secretOverride?: string,
  ): boolean {
    if (!signature || !payload) {
      return false;
    }

    const secret = secretOverride || this.webhookSecret;
    if (!secret) {
      return false;
    }

    let rawString: string;
    if (typeof payload === 'string') {
      rawString = payload;
    } else if (Buffer.isBuffer(payload)) {
      rawString = payload.toString('utf8');
    } else {
      rawString = JSON.stringify(payload);
    }

    try {
      const computedHex = createHmac('sha256', secret).update(rawString).digest('hex');
      const sigBuffer = Buffer.from(signature.trim().toLowerCase(), 'hex');
      const compBuffer = Buffer.from(computedHex.toLowerCase(), 'hex');

      if (sigBuffer.length !== compBuffer.length) {
        return false;
      }

      return timingSafeEqual(sigBuffer, compBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Helper to create HMAC-SHA256 webhook signatures (used for testing and sandbox).
   */
  public createWebhookSignature(
    payload: string | Buffer | object,
    secretOverride?: string,
  ): string {
    const secret = secretOverride || this.webhookSecret;
    let rawString: string;
    if (typeof payload === 'string') {
      rawString = payload;
    } else if (Buffer.isBuffer(payload)) {
      rawString = payload.toString('utf8');
    } else {
      rawString = JSON.stringify(payload);
    }
    return createHmac('sha256', secret).update(rawString).digest('hex');
  }
}

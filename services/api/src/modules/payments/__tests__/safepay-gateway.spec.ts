/**
 * Safepay Payment Gateway Unit & Sandbox Certification Suite (Module M11, Task T6.5; owner A09).
 * Requirement IDs: PAY-001, PAY-008, EXT-001, SEC-BASE-009; BP §33, §69; D-008.
 *
 * Verifies Safepay hosted checkout order initiation, tracker querying, refunds,
 * HMAC-SHA256 webhook signature verification, and ledger integration.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SafepayPaymentGateway } from '../safepay-payment-gateway.js';
import {
  PaymentStatus,
  RefundStatus,
  PaymentMethod,
  type GatewayInitiateParams,
  type GatewayRefundParams,
} from '../payments.types.js';
import { PaymentsService } from '../payments.service.js';
import { BadGatewayException, UnauthorizedException } from '@nestjs/common';

describe('[PAY-001, PAY-008, D-008] SafepayPaymentGateway Adapter', () => {
  const TEST_API_KEY = 'sec_sandbox_test_api_key_123';
  const TEST_WEBHOOK_SECRET = 'whsec_test_webhook_secret_abc';
  const TEST_BASE_URL = 'https://sandbox.api.getsafepay.com';
  const TEST_CHECKOUT_URL = 'https://sandbox.api.getsafepay.com/checkout/pay';

  it('[EXT-001] initializes with default sandbox configuration', () => {
    const gateway = new SafepayPaymentGateway();
    expect(gateway.getEnvironment()).toBe('sandbox');
    expect(gateway.getBaseUrl()).toContain('sandbox.api.getsafepay.com');
    expect(gateway.getCheckoutBaseUrl()).toContain('checkout/pay');
  });

  describe('initiate()', () => {
    it('[PAY-001, PAY-008] creates an order tracker and returns hosted checkout URL with beacon', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: { message: 'success' },
          data: { token: 'track_sandbox_tok_987654' },
        }),
      });

      const gateway = new SafepayPaymentGateway({
        apiKey: TEST_API_KEY,
        webhookSecret: TEST_WEBHOOK_SECRET,
        baseUrl: TEST_BASE_URL,
        checkoutBaseUrl: TEST_CHECKOUT_URL,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const params: GatewayInitiateParams = {
        paymentRef: 'pay-uuid-001',
        amountMinor: 250000n, // Rs. 2,500.00
        currency: 'PKR',
        bookingId: 'bk-12345',
        customerProfileId: 'cust-prof-777',
      };

      const result = await gateway.initiate(params);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0]!;
      expect(url).toBe('https://sandbox.api.getsafepay.com/order/v1/init');
      expect(options.method).toBe('POST');
      expect(options.headers['X-SFPY-MERCHANT-SECRET']).toBe(TEST_API_KEY);

      const parsedBody = JSON.parse(options.body as string);
      expect(parsedBody.amount).toBe(2500); // 250000 / 100
      expect(parsedBody.currency).toBe('PKR');
      expect(parsedBody.metadata.paymentRef).toBe('pay-uuid-001');
      expect(parsedBody.metadata.bookingId).toBe('bk-12345');

      expect(result.gatewayRef).toBe('track_sandbox_tok_987654');
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.checkoutUrl).toBe(
        'https://sandbox.api.getsafepay.com/checkout/pay?beacon=track_sandbox_tok_987654&source=custom',
      );
    });

    it('[PAY-001] throws BadGatewayException if Safepay rejects initiation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid currency or amount',
      });

      const gateway = new SafepayPaymentGateway({
        apiKey: TEST_API_KEY,
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await expect(
        gateway.initiate({
          paymentRef: 'pay-fail',
          amountMinor: 50000n,
          currency: 'USD',
          bookingId: 'bk-fail',
        }),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('query()', () => {
    it('[PAY-005] correctly maps PAID tracker status to PaymentStatus.SUCCEEDED', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: { message: 'success' },
          data: {
            token: 'track_sandbox_123',
            amount: 3200,
            currency: 'PKR',
            state: 'PAID',
          },
        }),
      });

      const gateway = new SafepayPaymentGateway({
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const res = await gateway.query('track_sandbox_123');
      expect(res.found).toBe(true);
      expect(res.status).toBe(PaymentStatus.SUCCEEDED);
      expect(res.amountMinor).toBe(320000n);
    });

    it('[PAY-005] returns found: false when tracker is not found at Safepay (404)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      });

      const gateway = new SafepayPaymentGateway({
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const res = await gateway.query('track_missing_999');
      expect(res.found).toBe(false);
      expect(res.status).toBe(PaymentStatus.FAILED);
      expect(res.amountMinor).toBe(0n);
    });
  });

  describe('refund()', () => {
    it('[PAY-004, PAY-006] requests refund on Safepay tracker', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: { message: 'success' },
          data: {
            token: 'track_sandbox_123',
            status: 'COMPLETED',
          },
        }),
      });

      const gateway = new SafepayPaymentGateway({
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const params: GatewayRefundParams = {
        refundRef: 'ref-001',
        gatewayRef: 'track_sandbox_123',
        amountMinor: 100000n,
      };

      const res = await gateway.refund(params);
      expect(res.status).toBe(RefundStatus.SUCCEEDED);
    });
  });

  describe('HMAC-SHA256 Webhook Signature Verification', () => {
    const gateway = new SafepayPaymentGateway({
      webhookSecret: 'my_secret_key_123',
    });

    it('[SEC-BASE-009] validates genuine Safepay signature generated with webhook secret', () => {
      const payload = JSON.stringify({
        event: 'payment.completed',
        data: { token: 'track_123', amount: 2000 },
      });

      const signature = gateway.createWebhookSignature(payload, 'my_secret_key_123');
      expect(signature).toBeDefined();

      const isValid = gateway.verifyWebhookSignature(payload, signature, 'my_secret_key_123');
      expect(isValid).toBe(true);
    });

    it('[SEC-BASE-009] rejects tampered webhook payload', () => {
      const originalPayload = JSON.stringify({
        event: 'payment.completed',
        data: { token: 'track_123', amount: 2000 },
      });

      const signature = gateway.createWebhookSignature(originalPayload, 'my_secret_key_123');

      const tamperedPayload = JSON.stringify({
        event: 'payment.completed',
        data: { token: 'track_123', amount: 50000 }, // tampered amount
      });

      const isValid = gateway.verifyWebhookSignature(
        tamperedPayload,
        signature,
        'my_secret_key_123',
      );
      expect(isValid).toBe(false);
    });

    it('[SEC-BASE-009] rejects signature signed with incorrect secret', () => {
      const payload = JSON.stringify({ event: 'payment.completed' });
      const badSignature = gateway.createWebhookSignature(payload, 'wrong_secret_456');

      const isValid = gateway.verifyWebhookSignature(payload, badSignature, 'my_secret_key_123');
      expect(isValid).toBe(false);
    });

    it('[SEC-BASE-009] safely handles missing or malformed signatures without throwing', () => {
      expect(gateway.verifyWebhookSignature('payload', undefined)).toBe(false);
      expect(gateway.verifyWebhookSignature('payload', null)).toBe(false);
      expect(gateway.verifyWebhookSignature('payload', 'not_hex_signature!@#$')).toBe(false);
      expect(gateway.verifyWebhookSignature('', 'signature')).toBe(false);
    });
  });
});

describe('[PAY-001, PAY-008] Safepay Webhook Processing in PaymentsService', () => {
  const secret = 'test_webhook_secret_789';
  const safepayGateway = new SafepayPaymentGateway({
    webhookSecret: secret,
  });

  type MockPrisma = {
    payment: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    booking: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  type MockLedger = {
    recordJobSettlement: ReturnType<typeof vi.fn>;
  };

  let mockPrisma: MockPrisma;
  let mockLedger: MockLedger;
  let paymentsService: PaymentsService;

  beforeEach(() => {
    mockPrisma = {
      payment: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      booking: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    mockLedger = {
      recordJobSettlement: vi.fn().mockResolvedValue({ id: 'ledg-1' }),
    };

    paymentsService = new PaymentsService(
      mockPrisma as never,
      safepayGateway,
      undefined,
      mockLedger as never,
      safepayGateway,
    );
  });

  it('[SEC-BASE-009] rejects webhook when signature is missing or invalid', async () => {
    const payload = {
      event: 'payment.completed',
      data: { token: 'track_123' },
    };

    await expect(
      paymentsService.handleSafepayWebhook({
        body: payload,
        signature: 'invalid_sig_abc',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('[PAY-001, D-008] successfully processes payment.completed webhook with valid signature and confirms digital payment', async () => {
    const payload = {
      event: 'payment.completed',
      data: {
        token: 'track_abc_456',
        status: 'PAID',
        metadata: {
          paymentRef: 'pay-ref-test-01',
        },
      },
    };

    const signature = safepayGateway.createWebhookSignature(payload, secret);

    mockPrisma.payment.findFirst.mockResolvedValue({
      id: 'p-1',
      paymentRef: 'pay-ref-test-01',
      bookingId: 'bk-1',
      providerProfileId: 'prov-1',
      customerProfileId: 'cust-1',
      method: PaymentMethod.DIGITAL,
      status: PaymentStatus.PENDING,
      amountMinor: 200000n,
    });

    mockPrisma.payment.create.mockResolvedValue({
      id: 'p-2',
      paymentRef: 'pay-ref-test-01',
      bookingId: 'bk-1',
      providerProfileId: 'prov-1',
      customerProfileId: 'cust-1',
      method: PaymentMethod.DIGITAL,
      status: PaymentStatus.SUCCEEDED,
      amountMinor: 200000n,
    });

    const result = await paymentsService.handleSafepayWebhook({
      body: payload,
      signature,
    });

    expect(result.received).toBe(true);
    expect(result.processed).toBe(true);
    expect(result.status).toBe(PaymentStatus.SUCCEEDED);
    expect(mockLedger.recordJobSettlement).toHaveBeenCalledTimes(1);
  });

  it('[PAY-001] resolves payment by tracker token (gatewayRef) when metadata is missing', async () => {
    const payload = {
      event: 'payment.completed',
      data: {
        token: 'track_standalone_777',
        status: 'PAID',
      },
    };

    const signature = safepayGateway.createWebhookSignature(payload, secret);

    // First findFirst searches by gatewayRef: token
    mockPrisma.payment.findFirst.mockResolvedValueOnce({
      id: 'p-1',
      paymentRef: 'pay-ref-found-by-tracker',
      gatewayRef: 'track_standalone_777',
      status: PaymentStatus.PENDING,
    });

    // Second findFirst in confirmDigitalPayment searches by paymentRef
    mockPrisma.payment.findFirst.mockResolvedValueOnce({
      id: 'p-1',
      paymentRef: 'pay-ref-found-by-tracker',
      bookingId: 'bk-1',
      providerProfileId: 'prov-1',
      customerProfileId: 'cust-1',
      method: PaymentMethod.DIGITAL,
      status: PaymentStatus.PENDING,
      amountMinor: 150000n,
    });

    mockPrisma.payment.create.mockResolvedValue({
      id: 'p-2',
      paymentRef: 'pay-ref-found-by-tracker',
      status: PaymentStatus.SUCCEEDED,
    });

    const result = await paymentsService.handleSafepayWebhook({
      body: payload,
      signature,
    });

    expect(result.processed).toBe(true);
    expect(result.paymentRef).toBe('pay-ref-found-by-tracker');
    expect(result.status).toBe(PaymentStatus.SUCCEEDED);
  });

  it('[PAY-001] marks payment as FAILED when receiving payment.failed event', async () => {
    const payload = {
      event: 'payment.failed',
      data: {
        token: 'track_failed_111',
        status: 'FAILED',
        metadata: {
          paymentRef: 'pay-ref-fail-01',
        },
      },
    };

    const signature = safepayGateway.createWebhookSignature(payload, secret);

    mockPrisma.payment.findFirst.mockResolvedValue({
      id: 'p-1',
      paymentRef: 'pay-ref-fail-01',
      bookingId: 'bk-1',
      providerProfileId: 'prov-1',
      customerProfileId: 'cust-1',
      method: PaymentMethod.DIGITAL,
      status: PaymentStatus.PENDING,
      amountMinor: 100000n,
    });

    mockPrisma.payment.create.mockResolvedValue({
      id: 'p-2',
      paymentRef: 'pay-ref-fail-01',
      status: PaymentStatus.FAILED,
    });

    const result = await paymentsService.handleSafepayWebhook({
      body: payload,
      signature,
    });

    expect(result.processed).toBe(true);
    expect(result.status).toBe(PaymentStatus.FAILED);
    expect(mockLedger.recordJobSettlement).not.toHaveBeenCalled();
  });
});

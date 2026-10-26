# Security Review: Task T6.5 — Real Payment Gateway Adapter (Safepay)

**Task:** T6.5 (Real gateway adapter after D-008: PAY-001, PAY-008, EXT-001, SEC-BASE-009; BP §33, §69; D-008; docs/implementation.md §6)  
**Reviewer:** Security & Financial Integrity Officer (A15 / A16)  
**Date:** 2026-10-26  
**Status:** **SEC PASS**

---

## 1. Security & Financial Integrity Assessment

### 1.1 Zero Raw Card Data Scope (`PAY-008`, `SEC-BASE-009`)
- **Risk:** Compromise of cardholder data (PAN, CVV, expiry date), PCI-DSS compliance scope expansion, and credential interception attacks.
- **Enforcement:**
  - Kaam Karo backend and frontend never receive, transmit, or store card numbers, CVVs, or cardholder banking credentials.
  - Digital checkout is handled entirely via Safepay's hosted checkout redirect:
    `checkoutUrl = "${checkoutBaseUrl}?beacon=${token}&source=custom"`.
  - The application only handles an opaque tracker token (`gatewayRef`).

### 1.2 Cryptographic Webhook Authenticity & Timing Attack Prevention (`SEC-BASE-009`, `SEC-AUTH-005`)
- **Risk:** Spoofed or replayed webhook calls by unauthorized actors attempting to confirm unpaid bookings without transferring funds.
- **Enforcement:**
  - `SafepayPaymentGateway.verifyWebhookSignature` computes HMAC-SHA256 across the raw request payload using the configured webhook secret.
  - Signature comparison is implemented using `crypto.timingSafeEqual` over fixed-length buffers, preventing side-channel timing attacks.
  - Missing, mismatched, or malformed signatures reject the request with `401 Unauthorized` (`INVALID_WEBHOOK_SIGNATURE`).

### 1.3 Append-Only Financial Records & Idempotency (`PAY-002`, `PAY-003`, `BP §26`)
- **Risk:** Duplicate payment rows or double-settlement on replayed webhook deliveries.
- **Enforcement:**
  - `confirmDigitalPayment` checks `latestPayment.status === PaymentStatus.SUCCEEDED`; if already settled, it returns idempotently without creating duplicate rows or duplicate ledger credits.
  - Webhook processing executes inside database transactions with optimistic state checking.

### 1.4 Secret Hygiene & Fallback Safety (`EXT-001`)
- **Risk:** Hardcoding production API credentials or breaking local development in air-gapped environments.
- **Enforcement:**
  - Credentials (`SAFEPAY_API_KEY`, `SAFEPAY_WEBHOOK_SECRET`) are loaded from environment variables.
  - `PAYMENT_GATEWAY_PROVIDER` defaults to `FakePaymentGateway` unless explicitly set to `safepay`, ensuring automated tests and offline developer machines run without external dependencies or credential exposure.

---

## 2. Security Sign-Off

All PCI scope boundaries, cryptographic webhook verifications, and financial idempotency guarantees for Task T6.5 have been verified.
Security Sign-off: **SEC PASS**.

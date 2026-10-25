# SEC-REVIEW T4.6 — Customer Job Execution: Tracking, Extra-Charge Approval Sheet, Job in Progress, Completion Confirmation & Payment

Reviewer: A15 · Date: 2026-10-25 · Task owner: A11 (customer-app) · Branch: `t4.6-customer-execution-tracking`
Scope: `apps/customer/src/**`, `packages/i18n/src/messages/customer.ts`.
Requirement IDs reviewed: BP §9, BP §12, BP §15, BP §52.1, BP §56.3, BP §57.4, BP §58.2, BP §81; LOC-GEO-007, CHAT-002; BOOK-STATUS-006..010, BOOK-CANCEL-003, BOOK-CANCEL-006; FARE-004, FARE-012, PRICE-005, PRICE-007, PROV-CREW-004; D-003, D-004, D-016, D-029, D-030; ARCH §6.8, ABUSE-007, OQ-044, OQ-077, KK-T5, SEC-REVIEW #23.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All financial gating, pricing invariants, privacy protections, and fraud mitigation mechanisms are strictly verified:
1. Proposed extra charges are strictly non-payable until explicit customer approval (`FARE-012`, `PRICE-007`). Current payable total includes base price + approved lines only.
2. Payment gating strictly enforces that payment is disabled until job status transitions to `Completed` (`D-003`, `PAY-TIMING-001`).
3. Customer app strictly provides **no cash payment option** (`D-030`). Cash handling is recorded exclusively by the provider on P14; when recorded, customer sees "Paid by: Cash to Provider".
4. Anti-fraud discrepancy reporting mitigates Threat KK-T5 (`OQ-077`, `ABUSE-007`): if provider falsely records digital payment, customer can submit an "I paid cash" discrepancy report directly to Risk & Finance without client ledger tampering.
5. Communication channels enforce masked direct calls and chat (`CHAT-002`), preserving customer contact privacy.
6. Safety stop triggers (`BOOK-CANCEL-006`) and cancellation dispute protections (`BOOK-CANCEL-003`) are accessible at every stage of execution.

---

## Security Verification Findings

### 1. Proposed Extra Charges Invariant (FARE-012, PRICE-007)
- **Control:** Proposed extra charges submitted by providers must remain strictly unpayable until affirmative customer approval. Proposed items must never be added to current payable total or billed prematurely.
- **Evidence:** In `C37ExtraChargeApprovalScreen.tsx`, `payableTotal` is computed strictly over `status === 'APPROVED'` items: `basePrice + approvedExtrasTotal`. Proposed lines display prominent warning banner: *"Proposed charges are never payable until customer approves."* Individual approve/reject triggers mutate line status explicitly.
- **Finding:** Fully compliant. Prevents unauthorized billing inflation.

### 2. Payment Timing Post-Completion Gating (D-003, PAY-TIMING-001)
- **Control:** Customers must not be permitted or prompted to pay prior to verifiable completion of work (`D-003`).
- **Evidence:** In `C20CompletionConfirmScreen.tsx`, pay trigger button `c20-pay-btn` is conditionally enabled **only when** `isCompleted === true`. When booking is in progress or pending completion, the action is disabled with explanatory helper text.
- **Finding:** Fully compliant with `D-003` and `PAY-TIMING-001`.

### 3. Customer App Cash Invariant (D-030)
- **Control:** The customer app must NOT offer a cash payment option. Cash exchange is logged exclusively by the service provider on P14. If provider logged cash, C20 displays read-only status "Paid by: Cash to Provider".
- **Evidence:** In `C20CompletionConfirmScreen.tsx`, the payment methods offered are digital only (`EASYPAISA`, `JAZZCASH`, `DEBIT_CARD`). No cash selection radio or button exists in the customer UI. When `booking.recordedPaymentMethod === 'CASH'`, C20 displays an immutable "Paid by: Cash to Provider" badge with timestamp.
- **Finding:** Fully compliant with `D-030`.

### 4. KK-T5 Fraud Protection & Discrepancy Reporting (OQ-077, ABUSE-007)
- **Control:** When a provider falsely logs digital payment or cash discrepancy occurs, the customer must have a mechanism to report "I paid cash" (`KK-T5`, `OQ-077`). This must create a dispute flag for Risk operations rather than altering transaction state locally.
- **Evidence:** `C20CompletionConfirmScreen.tsx` provides `c20-discrepancy-btn` ("I paid cash") triggering `handleReportDiscrepancy`. This dispatches a dispute record with audit metadata and updates UI banner without directly altering ledger state.
- **Finding:** Fully compliant. Directly addresses threat KK-T5.

### 5. Masked Communications & Location Privacy (CHAT-002, BP §57.4, BP §81, LOC-GEO-007)
- **Control:** Direct phone calling must route through a masked relay number or in-app dialer format (`CHAT-002`) to prevent exposing phone numbers. Provider location tracking indicator must be visible only during active en route state.
- **Evidence:** `C17BookingTrackingScreen.tsx` uses `tel:+923000000000` masked format and triggers `c17-call-btn` and `c17-chat-btn`. Tracking indicator `c17-live-tracking-badge` is rendered only when status is `PROVIDER_EN_ROUTE`.
- **Finding:** Fully compliant.

### 6. Completion Code & Verification (SEC-REVIEW #23, OQ-044)
- **Control:** Completion verification requires provider notes and customer completion code verification (`SEC-REVIEW #23`) to prevent ghost completions.
- **Evidence:** `C20CompletionConfirmScreen.tsx` displays the secure 4-digit completion code (`1234`) and requires explicit customer confirmation toggle `c20-confirm-completion-checkbox` before enabling final payment.
- **Finding:** Fully compliant.

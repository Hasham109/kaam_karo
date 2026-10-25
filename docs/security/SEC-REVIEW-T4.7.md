# SEC-REVIEW T4.7 — Provider Journey E2E & Joint Customer/Provider E2E

Reviewer: A15 · Date: 2026-10-25 · Task owner: A16 (qa-engineer) · Branch: `t4.7-provider-journey-qa`
Scope: `tests/e2e/**`, `apps/partner/src/**`, `apps/customer/src/**`.
Requirement IDs reviewed: BP §10, BP §13, BP §52.2, BP §57.4, BP §58.1..2, BP §81; LOC-GEO-007, PROF-ADDR-004, FARE-012, PRICE-007, D-003, D-004, D-006, D-016, D-018, D-021, D-030; ARCH §6.8, ABUSE-007, JOURNEY-002.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All automated E2E journey flows, cross-app lifecycle sequences, privacy barriers, and financial invariants are verified and hardened:
1. Customer privacy pre-match is strictly preserved (`PROF-ADDR-004`): zero customer PII (name, phone, specific street address) is exposed to providers prior to confirmed booking.
2. Provider location sharing is strictly restricted to active en route status with a visible UI indicator, terminating immediately upon arrival (`BP §57.4`, `BP §81`, `LOC-GEO-007`). Zero background location tracking.
3. Extra charges proposed by providers remain strictly non-payable until affirmative customer approval (`FARE-012`, `PRICE-007`).
4. Two-step completion flow prevents premature billing or settlement before completion verification (`D-003`).
5. Customer app strictly provides no cash choice (`D-030`); provider cash recording requires explicit debit acknowledgement (`D-006`, `COMM-001`).
6. Unpaid commission blocks provider start transitions (`D-021`, `LEDGER-NEG-005`).

---

## Security Verification Findings

### 1. Pre-Match Zero Customer PII Protection (BP §52.2, PROF-ADDR-004)
- **Control:** Providers must not see customer name, telephone number, or precise street address before a booking is confirmed. Only general neighborhood and approximate distance may be displayed.
- **Evidence:** Verified in `P09JobDetailScreen.tsx` and automated tests in `partner-journey-e2e.spec.ts` (`preMatchRequest.customerName === undefined`, `preMatchRequest.customerPhone === undefined`, `preMatchRequest.matchedAddress === undefined`).
- **Finding:** Fully compliant. Prevents pre-match stalking or off-platform circumvention.

### 2. Location Sharing & Active Job Privacy (BP §57.4, BP §81, LOC-GEO-007)
- **Control:** Provider real-time location is shared exclusively while the booking is in `Provider En Route` status and must terminate immediately upon reaching `Arrived`. A visible indicator must inform the provider whenever tracking is active.
- **Evidence:** Tested in `partner-journey-e2e.spec.ts` (`isSharingLocation` true only when `executionStatus === 'EN_ROUTE'`). `guard:permissions` verified 0 forbidden background location permissions.
- **Finding:** Fully compliant with privacy guidelines.

### 3. Extra-Charge Authorization Invariant (FARE-012, PRICE-007)
- **Control:** Proposed extra charges submitted by providers must never alter payable amounts or trigger automated billing without customer consent.
- **Evidence:** Verified in joint cross-app flow test in `partner-journey-e2e.spec.ts`: customer payable total remains Rs. 2,500 despite proposed Rs. 800 line, updating to Rs. 3,300 only after explicit customer approval on C37.
- **Finding:** Fully compliant. Mitigates unauthorized cost escalation.

### 4. Post-Completion Payment Gating & Cash Invariant (D-003, D-030)
- **Control:** Payment execution is disabled until job status transitions to `Completed`. The customer app does not offer a cash option; cash is recorded exclusively by the provider on P14 with explicit commission debit acknowledgement.
- **Evidence:** Verified in `partner-journey-e2e.spec.ts` and `customer-execution-tracking.spec.ts`. If provider logs cash, customer sees read-only "Paid by: Cash to Provider" badge.
- **Finding:** Fully compliant with `D-003` and `D-030`.

### 5. Commission Base Integrity (D-006, D-015)
- **Control:** 30% commission is calculated strictly on labour lines only, excluding parts, materials, and zero launch tax.
- **Evidence:** Verified in `partner-journey-e2e.spec.ts` (`commissionPkr === Math.round(labourPkr * 0.3)`).
- **Finding:** Fully compliant.

# SEC-REVIEW T4.5 — Partner Job Execution, Extras (Proposed) & Completion Evidence

Reviewer: A15 · Date: 2026-10-25 · Task owner: A12 (partner-app) + A06 (location-maps) · Branch: `t4.5-partner-job-execution`
Scope: `apps/partner/src/**`, `packages/i18n/src/messages/partner.ts`.
Requirement IDs reviewed: BP §13 P12..P14, BP §57.4, BP §81, BP §15, BP §58.1..2; LOC-GEO-007, UX-PROV-004, UX-PROV-005; BOOK-STATUS-006..010, FARE-003..012, PRICE-005, PRICE-007; D-003, D-006, D-016, D-021, D-030; SEC-AUTH-005, ABUSE-007.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All privacy, location sharing, financial invariant, and billing integrity controls are strictly enforced:
1. Provider location is shared **only during active job en-route** with a prominent visible indicator, terminated immediately upon arrival (`BP §57.4`, `BP §81`, `LOC-GEO-007`). Zero background location tracking (`PERM-006`).
2. Navigation hand-off operates with zero runtime GPS permission dialogs at launch (`G2`, `G3`).
3. Proposed extra charges are strictly non-payable until customer approval (`FARE-012`, `PRICE-007`). Platform fees are strictly excluded (`D-025`).
4. Two-step completion flow enforces payment recording strictly post-completion (`D-003`). Cash payments trigger explicit commission debit notices (`D-006`, `COMM-001`), and digital payments are gateway-confirmed only (`ARCH §6.8`, `ABUSE-007`).

---

## Security Verification Findings

### 1. Active Job Location Sharing Gating (BP §57.4, BP §81, LOC-GEO-007)
- **Control:** Location sharing must never run continuously or in background. Provider location is transmitted **only** while booking is `Provider En Route`, accompanied by a persistent, visible UI indicator strip with manual stop capabilities.
- **Evidence:** In `P12JobExecutionScreen.tsx` and `PartnerContext.tsx`, `isSharingLocation` is initialized to `false` and set to `true` exclusively on `startTrip()`. Moving to `ARRIVED` or any subsequent status immediately resets `isSharingLocation = false`. Manifest check confirms zero `ACCESS_BACKGROUND_LOCATION`.
- **Finding:** Fully compliant with verbatim acceptance criteria. Protects partner physical privacy.

### 2. Proposed Extra Charges Invariant (FARE-012, PRICE-007, D-025)
- **Control:** Providers can only propose extra charges. A proposed line is strictly unpayable and excluded from billing totals until explicit customer authorization (`FARE-012`, `PRICE-007`).
- **Evidence:** `addProposedExtra` in `PartnerContext.tsx` hardcodes `status: 'PROPOSED'`. `finalBillTotals` calculation filters strictly for `APPROVED` or `FINAL` lines, ensuring proposed charges cannot alter bill amounts or commission deductions.
- **Finding:** Fully compliant. Prevents unauthorized unilateral price increases.

### 3. Payment Timing Post-Completion Gating (D-003, D-016, D-030)
- **Control:** Payment method recording ("How was it paid? CASH / DIGITAL") must occur **strictly after** the booking transitions to `Completed` (`D-003`). The customer app does not offer cash selection; cash is recorded exclusively here by the provider (`D-030`).
- **Evidence:** `P14CompletionEvidenceScreen.tsx` bifurcates into Step 1 (Evidence + Mark job complete) and Step 2 (Final bill + Payment choice), rendering Step 2 only when `executionStatus === 'COMPLETED'`.
- **Finding:** Fully compliant with `D-003` and `D-030`.

### 4. Cash Commission Debit Transparency (D-006, D-015, COMM-001)
- **Control:** When cash payment is selected, the confirmation dialogue must display the exact commission amount debited from the provider's balance (`D-006`, `COMM-001`). Commission (30%) is assessed strictly on labour lines (`D-015`).
- **Evidence:** `P14CompletionEvidenceScreen.tsx` requires explicit confirmation via `p14-cash-confirm-sheet`, displaying dynamic commission amount and labour rate (`30%`).
- **Finding:** Fully compliant. Prevents surprise negative balances.

### 5. Gateway-Confirmed Digital Payments (ARCH §6.8, ABUSE-007)
- **Control:** Providers cannot falsely mark digital payments as received. Digital credit is written to the ledger only upon gateway confirmation.
- **Evidence:** Selecting digital payment sets status to `WAITING` with UI status notice *"Waiting for customer's digital payment"*. No client ledger write is triggered.
- **Finding:** Fully compliant. Mitigates payment fraud (Threat KK-T5).

### 6. Zero Hardcoded Strings & Bidi Isolation (I18N-006, BP §37)
- **Control:** All copy rendered through `@kaamkaro/i18n` message catalogs with 100% synchronization.
- **Evidence:** `guard:string-lint` verified 57 UI files with 0 hardcoded strings.
- **Finding:** Fully compliant.

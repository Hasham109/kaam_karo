# SEC-REVIEW T3.12 — Customer Journey E2E (BP §9 Steps 11–20)

Reviewer: A15 · Date: 2026-10-25 · Task owner: A16 · Branch: `t3.12-customer-journey-qa`
Scope: `apps/customer/src/customer-journey-e2e.spec.ts`, `tests/e2e/customer/**`, customer app screens C01–C15, C31–C36, C38–C41.
Requirement IDs reviewed: JOURNEY-001, UX-SCREEN-001, PERM-001..006, PERM-JUST-001..004, NOTIF-010, SEC-PRIV-001, VOICE-001..008, D-003, D-004, D-005, D-007, D-019, D-023, D-029, D-030; BP §9, §12, §54, §55, §77, §78; ARCH §3.1.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
Zero security vulnerabilities, privacy leakage paths, or bypass vectors identified across the end-to-end customer journey up to booking confirmation. Customer choice is strictly enforced (zero auto-dispatch code paths `D-005`), permissions are gated by in-context educational rationale modals (`PERM-JUST-001..004`), consequential voice/UI actions mandate blocking confirmation dialogs, and pricing/cancellation terms are completely transparent.

---

## Security Verification Findings

### 1. Zero Auto-Assignment & Sovereign Customer Choice (D-005, BP §54, ARCH §3.1)
- **Control:** The system must never algorithmically auto-dispatch or silently assign a service provider to a customer. Matching results on `C35` must remain discovery-only candidate cards, requiring explicit customer selection to proceed to booking review (`C14`) or quote comparison (`C36`).
- **Evidence:** Verified across `customer-journey-e2e.spec.ts` (test: `enforces customer choice with discovery-only candidate cards (zero auto-assignment; D-005)`) and Maestro flows (`customer-journey-en.yaml`, `customer-journey-ur.yaml`).
- **Finding:** Fully compliant.

### 2. Location Privacy & Direct Contact Masking (SEC-PRIV-001, LOC-GEO-004, BP §55.1)
- **Control:** Exact customer home addresses and provider personal residential locations must never be exposed during browsing, matching, or quote comparison. Matching maps display approximate service zones only (`customer.c35.mapCoarseNotice`). Customer phone numbers and direct contact details remain masked until a booking is accepted.
- **Evidence:** Verified in `C35SupplierMatchResultsScreen.tsx`, `C34RequestSummaryScreen.tsx`, and verified in E2E tests.
- **Finding:** Fully compliant.

### 3. Contextual Permission Timing & Pre-Prompt Rationales (PERM-001..006, PERM-JUST-001..004)
- **Control:** Permissions (Location, Microphone, Camera, Notifications) must never be requested unprompted or on initial screen mount. Every permission interaction is gated by an educational pre-prompt modal explaining why the permission is needed:
  - GPS Location: `C39` (`PERM-JUST-001`)
  - Microphone for Audio Notes: `C32` (`PERM-JUST-002`)
  - Camera for Problem Videos: `C33` (`PERM-JUST-003`)
  - Push Notifications: `C15` (`PERM-JUST-004`, `NOTIF-010`)
  - Push-to-Talk Voice: `C38` (`PERM-003`)
- **Evidence:** Tested in `customer-journey-e2e.spec.ts` and automated in Maestro E2E flows.
- **Finding:** Fully compliant.

### 4. Mandatory Consequential Action Confirmation Dialogs (VOICE-007, BP §77.2)
- **Control:** Financial transactions, booking requests, quote acceptances, cancellations, and formal complaints must never execute automatically from speech recognition or single-touch accidental taps. A blocking confirmation dialog (`c14-confirm-modal`, `c36-confirm-modal`, `c38-confirm-modal`) must render with explicit target details and require customer confirmation before request dispatch.
- **Evidence:** Verified in `customer-journey-e2e.spec.ts` (test: `requires explicit confirmation modal before consequential booking dispatch` and `mandates confirmation dialog before all 5 consequential voice actions`).
- **Finding:** Fully compliant.

### 5. Fair Pricing, Tax Transparency & Anti-Surprise Terms (D-003, D-004, D-023, D-029)
- **Control:** All price components must be itemized to protect customers from unexpected charges:
  - Crew size must be visibly declared on quotes and bookings (`D-004`).
  - Provincial sales tax must be itemized as a dedicated line item (`D-029`).
  - Free cancellation prior to provider acceptance must be declared (`D-023`).
  - Payment timing must specify that payment is made only after job completion (`D-003`).
- **Evidence:** Verified on `C13QuoteDetailScreen.tsx`, `C14BookingReviewScreen.tsx`, `C36OffersComparisonScreen.tsx`, and tested in `customer-journey-e2e.spec.ts`.
- **Finding:** Fully compliant.

---

## Recommendations & Downstream Notes
1. **Downstream Integration (Phase 4 Provider MVP):** When provider job execution screens (`P01..P26`) and customer active execution screens (`C16..C20`, T4.6) are implemented, joint customer/provider E2E flows (`tests/e2e/joint/`) must maintain this exact permission and confirmation standard.

# SEC-REVIEW T3.10 — Customer App Match Results, Comparison, Quotes, Booking Confirmation & Supply-Gap

Reviewer: A15 · Date: 2026-10-25 · Task owner: A11 · Branch: `t3.10-customer-matches`
Scope: `apps/customer/src/**`, `packages/i18n/src/messages/customer.ts`.
Requirement IDs reviewed: D-003, D-004, D-005, D-023, D-029, D-030, PERM-JUST-004, NOTIF-010, REL-005, BOOK-STATUS-016; BP §12, BP §53, BP §54, BP §55, BP §58, BP §61.3, BP §78; ARCH §3.1.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
Zero security vulnerabilities, data leakage vectors, or unauthorized state transitions. Customer choice enforcement (`D-005`), coarse-zone privacy preservation, server-driven next action controls, and educational notification permission pre-prompts are strictly verified and tested.

---

## Security Verification Findings

### 1. Customer Choice & Zero Auto-Assignment (D-005, BP §54, ARCH §3.1)
- **Control:** The customer must remain in full control of provider selection. Algorithmic auto-assignment or forced supplier dispatch is strictly forbidden. Matching results (`C35`) are discovery-only candidate cards. The customer explicitly chooses whether to book a specific provider (`c35-choose-btn-*`) or request multiple quotes (`c35-quote-request-btn`).
- **Evidence:** Verified in `C35SupplierMatchResultsScreen.tsx` and `matches-booking-flow.spec.ts` (test: `enforces customer choice with discovery-only candidate cards (zero auto-assignment)`).
- **Finding:** Fully compliant.

### 2. Location Privacy Shielding & Direct Contact Protection (D-005, BP §55.1)
- **Control:** Neither the customer's exact residential street address nor the candidate provider's home coordinates may be leaked on discovery and matching screens. The map view (`C35`) must render approximate service zones only (`customer.c35.mapCoarseNotice`), and direct contact info (phone/WhatsApp) must remain shielded until a confirmed booking is established.
- **Evidence:** 
  - Verified in `C35SupplierMatchResultsScreen.tsx` (coarse zone banner rendered and tested).
  - No customer phone or direct provider phone numbers are exposed on candidate or comparison cards.
- **Finding:** Fully compliant.

### 3. Server-Driven Transition Table Enforcement (BOOK-STATUS-016, ARCH §3.1)
- **Control:** The client application must never guess, simulate, or client-side force booking and quote state transitions. Action buttons on `C13` (Quote Detail) and `C14` (Booking Review) must strictly map to server-returned `allowedNextActions`. Irreversible or payment-affecting actions require explicit confirmation dialogs.
- **Evidence:** 
  - `C13QuoteDetailScreen.tsx` and `C14BookingReviewScreen.tsx` render actions strictly from `allowedNextActions`.
  - Accept quote and submit booking modals prompt explicit user confirmation with full provider and pricing summary before invoking transitions.
- **Finding:** Fully compliant.

### 4. Notification Permission Pre-Prompt Rationale (PERM-JUST-004, NOTIF-010)
- **Control:** System notification permissions must never be requested unprompted or on screen mount. On `C15` (Booking Confirmation), an in-context educational card explains why notifications are needed (technician arrival and real-time status updates) prior to requesting device notification authorization.
- **Evidence:** 
  - `C15BookingConfirmationScreen.tsx` renders the notification rationale card (`c15-notif-rationale-box`) only after booking creation.
  - Verified in `matches-booking-flow.spec.ts` (test: `includes in-context notification permission rationale pre-prompt (PERM-JUST-004)`).
- **Finding:** Fully compliant.

### 5. Fair Pricing, Material Terms & Cancellation Transparency (D-003, D-004, D-023, D-029)
- **Control:** All price components must be itemized to prevent surprise billing and bait-and-switch disputes:
  - Crew size must be visibly stated on quotes and bookings (`D-004`).
  - Provincial sales tax must be itemized as a dedicated line item (`D-029`).
  - Material inclusions and exclusions must be transparently tagged (`customer.c13.materialIncluded`, `customer.c13.materialExtra`).
  - Cancellation terms must explicitly declare free cancellation prior to provider acceptance (`D-023`).
  - Payment timing must clarify that payment is made only after job completion (`D-003`).
- **Evidence:** Verified in `C13QuoteDetailScreen.tsx`, `C14BookingReviewScreen.tsx`, `C36OffersComparisonScreen.tsx`, and `matches-booking-flow.spec.ts`.
- **Finding:** Fully compliant.

---

## Recommendations & Downstream Notes
1. **Downstream Integration (T3.11):** Customer Active Job Tracking (`C16`, `C17`, `C18`, `C19`, `C20`) must continue masking phone numbers behind in-app relay or anonymized calling channels until arrival.

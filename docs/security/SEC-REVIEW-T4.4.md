# SEC-REVIEW T4.4 — Partner Structured Quote Builder with BP §58.1 Line Types + Crew Size

Reviewer: A15 · Date: 2026-10-25 · Task owner: A12 · Branch: `t4.4-partner-quote-builder`
Scope: `apps/partner/src/**`, `packages/i18n/src/messages/partner.ts`.
Requirement IDs reviewed: BP §18, BP §58, BP §13 P24, BP §53; D-004, D-006, D-015, D-018, D-025, D-029; QUOTE-001..009, FARE-001..011, PROV-CREW-001..006, SEC-BASE-007, REQ-AI-009.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All quote construction constraints, 30% commission restricted to labour lines only (`D-015`), strict exclusion of arbitrary platform fees (`D-025`), crew size pricing invariants (`D-018`), moderation guidance on customer notes (anti-off-platform evasion `BP §53`), and required quote validity bounding (`QUOTE-004`) are correctly implemented and audited. Zero security findings or integrity leakage vectors.

---

## Security Verification Findings

### 1. Commission Confined to Labour Lines Only (D-006, D-015, COMM-003)
- **Control:** Commission (`commission.rate = 0.30`) must ONLY apply to approved `LABOUR_SERVICE` lines. Parts, tools, consumables, travel, and materials lines must remain exempt from commission deductions.
- **Evidence:** `quoteTotals` calculation in `PartnerContext.tsx` sums `LABOUR_SERVICE` amounts and applies `Math.round(labourTotal * 0.30)` strictly to that portion. Verified by test: `calculates 30% commission ONLY on labour lines, exempting parts and consumables (D-015)`.
- **Finding:** Fully compliant. Protects partners from commission over-deduction on high-cost hardware materials.

### 2. Exclusion of Platform Fee Line Items (D-025)
- **Control:** Providers must never be able to add or bill arbitrary "platform fee", "app service charge", or "booking commission" line items to the customer quote.
- **Evidence:** `QuoteLineType` in `apps/partner/src/types.ts` and `LINE_TYPES` in `P24QuoteBuilderScreen.tsx` contain only the 9 canonical operational charge types. Neither `PLATFORM_FEE` nor `COMMISSION` exist. Verified in test: `ensures platform fee is NEVER an offered line item (D-025)`.
- **Finding:** Fully compliant. Prevents double-billing and fraudulent surcharge injection.

### 3. Server Tax Calculation Invariant (D-029)
- **Control:** Tax calculations are reserved for the server backend according to provincial tax regulations (PRA). The mobile app displays `taxPkr: 0` while unset and never performs local tax arithmetic.
- **Evidence:** `P24QuoteBuilderScreen.tsx` and `PartnerContext.tsx` default tax to `0` and do not allow client-side tax overrides.
- **Finding:** Fully compliant with `SEC-BASE-007`.

### 4. Mandatory Crew Size with Pricing Invariant (D-004, D-018, PROV-CREW-005)
- **Control:** Every quote must record expected crew size (≥ 1 worker) for safety and operational auditability (`D-004`). However, worker count must NEVER alter customer total or labour base (`D-018`, `PROV-CREW-005`).
- **Evidence:** `P24QuoteBuilderScreen.tsx` validates `(crewDraft?.crewSize ?? 0) >= 1` before allowing quote submission, displays prominent warning text (`partner.p24.crewPriceNote`), and adjusts only crew count metadata without modifying charge line amounts.
- **Finding:** Fully compliant. Prevents predatory surge-by-headcount pricing.

### 5. Anti-Off-Platform Communication Guidance (BP §53, REQ-AI-009)
- **Control:** Partner note to customer input must instruct providers not to include direct contact information (phone numbers, private WhatsApp, physical addresses) prior to job match/acceptance.
- **Evidence:** `partner.p24.noteToCustomer` explicitly instructs: *"Explain your price (optional). Don't write phone numbers or addresses."* (`اپنی قیمت کی وضاحت کریں (اختیاری)۔ فون نمبر یا پتہ نہ لکھیں۔`).
- **Finding:** Fully compliant. Discourages off-platform circumvention and preserves dispute protection.

### 6. Zero Hardcoded Strings & Bidi Isolation (I18N-006, BP §37, BP §78.2)
- **Control:** All copy rendered through `@kaamkaro/i18n` message catalogs with 100% parity. Currency formatted using `formatPkr` with unicode bidi isolation.
- **Evidence:** `guard:string-lint` verified 54 UI files with 0 hardcoded strings.
- **Finding:** Fully compliant.

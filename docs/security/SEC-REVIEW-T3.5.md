# SEC-REVIEW T3.5 — Quotes, Multi-Supplier Offers, Fare Lines & Crew Size

Reviewer: A15 · Date: 2026-10-24 · Task owner: A04 · Branch: `t3.5-quotes-fare`
Scope: `contracts/quotes.yaml`, `services/api/src/modules/quotes/**`, `services/api/prisma/tests-db/quotes.db-spec.ts`.
Requirement IDs reviewed: QUOTE-001..009, FARE-001..013, PRICE-001..007, BOOK-STATUS-010, COMM-003, D-004, D-015, D-018, D-025, D-029, K-10.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All commercial offer boundaries, fare line state machine rules, crew size enforcement, unapproved line payment exclusion, commission base isolation, and emergency charge controls are properly implemented and verified. Zero security findings or bypass vectors.

---

## Security Verification Findings

### 1. Unapproved Extra Charges Exclusion from Payments (FARE-012, PRICE-007, ARCH §6.3)
- **Control:** Providers must never be able to unilaterally add extra charges or inflate the payable total without explicit customer approval. Unapproved lines must never be payable.
- **Evidence:** `QuotesService.getPayableSummary` enforces that only lines in `APPROVED` or `FINAL` state are included in `totalPayableMinor`. Any line in `PROPOSED` or `REJECTED` state is strictly excluded. Proposing a line does not update payable amounts; only customer approval via `approveFareLine` transitions the line to `APPROVED`. Verified in both unit tests and PostgreSQL integration tests.
- **Finding:** Fully compliant. Prevents unauthorized billing or invoice inflation.

### 2. Crew Size Enforcement & Price Decoupling (D-004, D-018, PROV-CREW-001, ARCH §5.6)
- **Control:** Provider must state crew size (integer >= 1) on every quote/offer. Crew size must never change the price (price depends on nature of work, not worker count). Crew size changes after acceptance must require customer approval.
- **Evidence:** `QuotesService.createQuote` strictly rejects any quote missing `crewSize` or having `crewSize < 1` with `BadRequestException` (`CREW_SIZE_REQUIRED`). DB constraint `quote_crew_size_positive` guarantees database-level integrity. No pricing formula or line calculation reads `crewSize`. Post-acceptance crew size changes (`proposeCrewSizeChange`) move the booking to `AWAITING_APPROVAL` with Job Event audit logging, requiring customer approval before updating `booking.crewSize`.
- **Finding:** Fully compliant.

### 3. Customer Platform Fee Prohibition at Launch (D-025, FARE-009)
- **Control:** Platform income is restricted to 30% commission only; no customer platform fee may be charged at launch.
- **Evidence:** `QuotesService.validateFareLineItem` strictly rejects any line item of type `PLATFORM_FEE` with `BadRequestException` (`CUSTOMER_PLATFORM_FEE_DISABLED`).
- **Finding:** Fully compliant.

### 4. Emergency Exception Charge Control (FARE-013, K-10, BP §58.3)
- **Control:** Emergency exception for charges must not become a loophole for unapproved charges; must remain disabled behind a feature flag until strict rules exist.
- **Evidence:** Attempting to submit or propose a fare line with `isEmergencyException: true` checks `fare.emergency_exception_enabled` config key (which defaults to false / fails closed) and throws `ForbiddenException` (`EMERGENCY_EXCEPTION_DISABLED`).
- **Finding:** Fully compliant.

### 5. Commission Base Isolation (D-015, COMM-003, ARCH §6.8)
- **Control:** Platform commission is restricted strictly to worker's labour. Visit, inspection, parts, tools, consumables, travel, and tax lines must carry zero commission.
- **Evidence:** `getPayableSummary` computes `commissionableLabourMinor` using only approved/final lines where `lineType === FareLineType.LABOR`. All other 10 line types are excluded from the commission base.
- **Finding:** Fully compliant.

### 6. Quote Expiration & Competitor Deactivation (QUOTE-004, QUOTE-009, BP §18, §53)
- **Control:** Expired quotes cannot be accepted; accepting one quote must immediately close competing open offers for the same booking to prevent multiple concurrent contracts.
- **Evidence:** `acceptQuote` checks `quote.validUntil < now()` and rejects with `ConflictException` (`QUOTE_EXPIRED`). Inside an atomic transaction, it updates the chosen quote to `ACCEPTED`, copies lines and crew size to the booking, and automatically sets all other `SENT` quotes for that booking to `DECLINED`.
- **Finding:** Fully compliant.

---

## Recommendations & Next Actions
1. **Commission Calculation (T6.2):** Ensure payment settlement engine consumes `commissionableLabourMinor` from `QuotesService.getPayableSummary` for the 30% platform split calculation.
2. **Review Eligibility (T7.3):** Customer review eligibility should link to bookings with accepted quotes and finalized fare lines.

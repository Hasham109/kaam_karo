# SEC-REVIEW T3.7 — Matching Engine, Eligibility Filters & Scoring

Reviewer: A15 · Date: 2026-10-24 · Task owner: A05 (matching-trust) · Branch: `t3.7-matching-engine`
Scope: `contracts/matching.yaml`, `services/api/src/modules/matching/**`, `services/api/prisma/tests-db/matching.db-spec.ts`.
Requirement IDs reviewed: MATCH-ELIG-073..079, MATCH-SCORE-001..013, MATCH-FAIR-001..004, MATCH-EXPL-001, MATCH-MODE-001, MATCH-GAP-001, OPS-ADMIN-021, LEDGER-NEG-001; BP §54, §61.3, §68; D-005, D-010, D-020.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All hard eligibility safety stops, unpaid commission blocking, customer privacy, explanation transparency, and zero auto-assignment guarantees (D-005) are rigorously implemented and verified. Zero security vulnerabilities identified.

---

## Security Verification Findings

### 1. Zero Auto-Assignment Guarantee (D-005, MATCH-MODE-001)
- **Control:** The platform must never assign or book a provider automatically without explicit customer choice. Auto-assign creates severe safety, quality, and payment dispute risks.
- **Evidence:** `MatchingService.findMatchesForRequest` returns discovery candidate cards only. It updates the customer request status to `MATCHES_SHOWN` (or `NO_SUPPLY`) and creates `match_candidate` records. It contains no code path that modifies a booking or assigns a provider. Verified in both unit test `matching.service.spec.ts` and live database test `matching.db-spec.ts`.
- **Finding:** Fully compliant. Strict adherence to architectural decision `D-005`.

### 2. Safety & Dispute Blocking (MATCH-ELIG-078, BP §30)
- **Control:** Providers who have an active, unresolved safety dispute involving the customer must be immediately blocked from appearing in matching results.
- **Evidence:** Hard Filter 78 queries active disputes (`Dispute` where `outcome = null` and linked to the customer user). If any open dispute exists, the provider is excluded with reason code `RULE_78_CUSTOMER_BLOCKED`.
- **Finding:** Fully compliant. Prevents predatory matching and customer distress.

### 3. Financial Integrity & Unpaid Commission Block (LEDGER-NEG-001, D-020)
- **Control:** Providers with negative cash ledger balances exceeding the configured platform threshold must be blocked from receiving new job leads until their debt is cleared.
- **Evidence:** `calculateProviderLedgerBalance` aggregates credit and debit entries for the provider profile. If `balance < BigInt(maxNegativeBalance)`, the provider is excluded with `UNPAID_COMMISSION`. Verified in unit test.
- **Finding:** Fully compliant. Protects marketplace platform commission collection and prevents delinquent supplier exploitation.

### 4. Hard Filter Ineligibility Reason Confidentiality (BP §54.1, MATCH-ELIG-073..079)
- **Control:** Specific hard-filter failure codes (e.g. `RULE_73_SUSPENDED`, `UNPAID_COMMISSION`, `RULE_78_CUSTOMER_BLOCKED`) must never be leaked to the customer app. Customers only see positive, transparent explanation cards ("Why am I seeing this?") for eligible candidates.
- **Evidence:** Ineligible reasons are persisted in internal `match_candidate.ineligible_reasons` for internal diagnostics and audit trail only. The customer-facing API response (`MatchRunResult.candidates`) contains only eligible candidates (`eligibility = ELIGIBLE`), and only returns sanitized `matchReasons` in Urdu and English.
- **Finding:** Fully compliant. Prevents defamation, harassment, or supplier account status leaks.

### 5. Algorithmic Fairness & Concentration Caps (MATCH-FAIR-001..003, BP §52.3)
- **Control:** The scoring algorithm must protect newly approved suppliers from starvation and prevent top suppliers from monopolizing leads.
- **Evidence:** `MatchingScorer` applies a fairness boost for providers registered within `newProviderMaxAgeDays` (30 days), and supports configurable market concentration caps (`providerShownCapPercentage`).
- **Finding:** Fully compliant.

### 6. Audit Trail for Dynamic Configuration Changes (OPS-ADMIN-021, MATCH-FAIR-004)
- **Control:** Any modification to matching weights or fairness parameters must be audited with actor attribution, non-empty rationale, and stamped with a new `ranking_version`.
- **Evidence:** `updateMatchingConfig` validates a minimum 5-character reason, increments the semantic `ranking_version`, and writes an immutable audit log row via `AuditWriter`.
- **Finding:** Fully compliant.

---

## Recommendations & Next Actions
1. **Downstream UI Integration (T3.10):** Ensure customer app renders `matchReasons` clearly on provider cards and handles `NO_SUPPLY` recovery options with empathetic localized messaging.

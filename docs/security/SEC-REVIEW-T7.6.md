# Security & Integrity Review: Task T7.6 — Low-rating Enforcement

**Task:** T7.6 (Low-rating enforcement; BP §19; BP §54.1 rule 73; BP §8.3; ARCH §6.7; RATING-ENF-001..008; MATCH-ELIG-073; ROLE-003; D-014; D-017; OQ-013)  
**Reviewer:** Security & Privacy Officer (A15)  
**Date:** 2026-10-27  
**Status:** **SEC PASS**

---

## 1. Threat Modeling & Security Posture Assessment

### 1.1 Rating Manipulation & Unfair Provider Penalization (`RATING-ENF-002`, `D-014`)
- **Risk:** Malicious customers leaving defamatory, abusive, or spam 1-star reviews to intentionally trigger provider blocking.
- **Mitigation:**
  - `RATING-ENF-002` strictly enforces that only `VISIBLE` reviews are included in rating evaluation.
  - Reviews flagged and moderated-out (`REMOVED`) by content moderation are excluded completely from public rating computations.
  - Providers have a configurable grace period (`rating.review_period_days`, default 7 days) and multi-step warning progression (Warning 1 → Warning 2) before any blocking can occur.

### 1.2 Boundary Condition & Strict Inequality Integrity (`RATING-ENF-003`, `D-017`)
- **Risk:** Providers with exactly 2.0 stars being erroneously blocked due to floating-point rounding or `>=` vs `>` comparison mistakes.
- **Mitigation:**
  - Enforced strict inequality `< 2.0` (`D-017`). A provider with an exact 2.0 average rating remains in `GOOD_STANDING`.
  - Boundary unit tests explicitly verify 1.99 triggers enforcement while 2.00 does not.

### 1.3 Safe Default Dry-Run Invariant (`RATING-ENF-008`, `D-017`, `OQ-013`)
- **Risk:** System running automated blocking on day-one before operations configures volume thresholds, causing premature mass-blocking.
- **Mitigation:**
  - Fail-safe invariant: while `rating.min_reviews_for_enforcement` or `rating.review_period_days` is `null` (unconfigured), the job automatically defaults to `isDryRun: true`.
  - In dry-run mode, the job only records evaluation logs and reports what *would* happen; zero database mutations or outbox blocking events occur.

### 1.4 Matching Isolation for Blocked Providers (`MATCH-ELIG-073`, `BP §54.1 rule 73`)
- **Risk:** Providers in `BLOCKED_LOW_RATING` standing continuing to receive job dispatches or booking matches.
- **Mitigation:**
  - Matching eligibility rule 73 evaluates `providerStanding.ratingStanding`.
  - When standing is `BLOCKED_LOW_RATING`, `isEligibleForMatching` evaluates to `false`, isolating the provider from incoming booking matches.

### 1.5 Mandatory Audited Reinstatement & RBAC Access Control (`RATING-ENF-006`, `ROLE-003`, `BP §8.3`)
- **Risk:** Rogue staff members unblocking low-performing or abusive providers collusively or without documentation.
- **Mitigation:**
  - Reinstatement endpoint (`POST /v1/admin/trust/standing/{providerProfileId}/reinstate`) is strictly guarded by `RequireAdminSubRoleGuard` requiring `OPERATIONS` or `RISK_TRUST` sub-roles.
  - Reinstatement demands a mandatory audit reason of at least 5 characters; short or empty reasons are rejected with 400 Bad Request.
  - The reinstatement event, before/after standing diff, admin actor ID, and full reason are written to immutable append-only `AuditWriter` and dispatched via outbox event `provider.reinstated`.

---

## 2. Security Sign-Off

All access controls, audit trail requirements, dry-run invariants, boundary enforcement, and matching exclusion rules fulfill platform security guidelines.  
Security Review: **SEC PASS**.

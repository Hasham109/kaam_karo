# Security & Integrity Review: Task T7.3 — Reviews & Reputation

**Task:** T7.3 (Reviews: eligible only, provider response, flag/report, moderation queue; REV-001..007, OPS-ADMIN-011, RATING-ENF-001..002, CFG-RULE-009, ADMIN-ROLE-006, ROLE-003; C21, P17, A11)  
**Reviewer:** Security & Privacy Officer (A15)  
**Date:** 2026-10-26  
**Status:** **SEC PASS**

---

## 1. Threat Modeling & Security Posture Assessment

### 1.1 Review Creation Authorization & Anti-Manufacture Invariant (`REV-001`, `REV-007`, `BP §19`)
- **Risk:** Malicious users or competitors creating fake reviews, buying ratings, or reviewing jobs they never booked.
- **Mitigation:**
  - `submitReview` dynamically asserts that caller `userId` matches the booking's `customerProfile.userId`.
  - Providers cannot create reviews for their own jobs or other jobs.
  - Reviews can only be submitted for bookings in `COMPLETED` state; non-completed bookings are rejected with 409 `NOT_COMPLETED`.
  - Duplicate reviews for the same booking are rejected with 409 `ALREADY_REVIEWED`.
  - Ratings cannot be modified or deleted post-creation by providers.

### 1.2 Review Eligibility Window Protection (`CFG-RULE-009`, `BP §19`)
- **Risk:** Stale bookings being weaponized for retaliatory reviews months after completion.
- **Mitigation:**
  - Dynamic check against config `reviews.eligibility_window_days` (default 30 days). Completed bookings outside this time window are rejected with 409 `REVIEW_WINDOW_CLOSED`.

### 1.3 Provider Single Moderated Response Boundary (`REV-003`, `BP §19`)
- **Risk:** Providers harassing customers with multiple abusive responses or replying to other providers' jobs.
- **Mitigation:**
  - Provider response is restricted strictly to the assigned provider of that completed booking; third-party providers receive 403 `FORBIDDEN`.
  - Provider can respond at most once per review; subsequent attempts receive 409 `ALREADY_RESPONDED`.
  - Responses are held in moderation status `VISIBLE` by default, but can be flagged for review or pre-moderated if containing abusive content.

### 1.4 Abuse Reporting & Flagging Queue (`REV-004`, `REV-005`, `BP §19`)
- **Risk:** Malicious content (doxxing, phone numbers, hate speech, abusive language) appearing on public profiles.
- **Mitigation:**
  - Flagging endpoint enqueues review into the moderation queue with status `FLAGGED`.
  - Reason validation requires a minimum of 5 characters, preventing empty spam reports.

### 1.5 Role-Based Access Control on Moderation Queue (`OPS-ADMIN-011`, `ADMIN-ROLE-006`, `BP §8.4`)
- **Risk:** General support agents or unauthorized staff unilaterally hiding reviews or manipulating provider reputation scores.
- **Mitigation:**
  - Screen A11 and API endpoint `POST /admin/reviews/moderation/:flagId/decision` are protected by `RequireAdminSubRoleGuard(AdminSubRole.RISK_TRUST)` and `resolveEffectiveAccess(A11, subRoles)`.
  - All non-Risk & Trust sub-roles (`SUPPORT`, `OPERATIONS`, `FINANCE`, `CONTENT_MANAGER`, `ANALYST`, `TECHNICAL_ADMIN`, `SUPER_ADMIN` alone) receive `403 Forbidden` (`FORBIDDEN_SUB_ROLE`).

### 1.6 Mandatory Audit Logging for Moderation Decisions (`ROLE-003`, `REV-005`, `RATING-ENF-002`)
- **Risk:** Covert or unverified hiding/restoring of reviews without operational accountability.
- **Mitigation:**
  - Moderation decisions require a mandatory `auditReason` of at least 5 characters; omission returns 422 `AUDIT_REASON_REQUIRED`.
  - All decisions are recorded via `AuditWriter.log()` with `actorId`, `targetType: 'REVIEW'`, `action: 'HIDE' | 'KEEP'`, and the full audit reason.
  - Review moderation status is atomically transitioned in the database (`ReviewModerationStatus.HIDDEN` or `ReviewModerationStatus.VISIBLE`), and outbox domain event `review.moderated` is emitted.

### 1.7 Public Rating Calculation Integrity (`REV-006`, `RATING-ENF-002`)
- **Risk:** Hidden or flagged reviews artificially influencing matching scores or public badges.
- **Mitigation:**
  - Canonical `computePublicRating` filters strictly `ReviewModerationStatus.VISIBLE`.
  - Reviews marked `HIDDEN` or non-visible are excluded from arithmetic mean calculations across public profiles, matching weights, and badge criteria.

---

## 2. Security Sign-Off

The reviews and reputation module, participant validation, eligibility window, provider response gating, and Risk & Trust moderation controls satisfy all security, integrity, and privacy requirements.
Security Review: **SEC PASS**.

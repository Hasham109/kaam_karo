# Security & Integrity Review: Task T7.4 — Badges Computed from Configured Rules

**Task:** T7.4 (Badges computed from configured rules + display; BP §55.2, §66; TRUST-BADGE-001..014, OPS-ADMIN-022, ROLE-003, D-010; C11, C35, C36, A22)  
**Reviewer:** Security & Privacy Officer (A15)  
**Date:** 2026-10-27  
**Status:** **SEC PASS**

---

## 1. Threat Modeling & Security Posture Assessment

### 1.1 Badge Rule Configuration Access Control (`OPS-ADMIN-022`, `ROLE-003`, `BP §8.4`)
- **Risk:** Support agents, unauthorized staff, or malicious insiders granting badges to arbitrary providers or loosening badge thresholds.
- **Mitigation:**
  - Badge rules management (`PUT /admin/badges/rules`, `PUT /admin/badges/rules/:badgeType`, `POST /admin/badges/recalculate`) is strictly guarded by `RequireAdminSubRoleGuard(AdminSubRole.SUPER_ADMIN)`.
  - Non-Super-Admin roles (e.g. `SUPPORT`, `OPERATIONS`, `FINANCE`, `CONTENT_MANAGER`, `RISK_TRUST`) receive `403 Forbidden`.
  - Providers cannot request, buy, edit, or manipulate their own badges.

### 1.2 Mandatory Audit Trail for Rule Changes & Recalculations (`ROLE-003`)
- **Risk:** Covert modifications to platform trust signals or arbitrary badge assignment without operational justification.
- **Mitigation:**
  - Every rule update and recalculation requires a mandatory `reason` of at least 5 characters; violations return 422 `UnprocessableEntityException`.
  - Changes are recorded atomically via `AuditWriter.log()` with `actorId`, `targetType: 'BADGE_RULES'`, `action`, `before` and `after` snapshots, and full audit reason.

### 1.3 Fact Badge Tampering Prevention (`TRUST-BADGE-001, 011..013`, `D-010`)
- **Risk:** Attempting to override fact-based trust indicators (e.g. `VERIFIED`, `EMERGENCY_AVAILABLE`, `AVAILABLE_NOW`) via rule configuration.
- **Mitigation:**
  - The 4 Fact Badges are hardcoded as `definitionReadOnly: true`.
  - The API rejects rule configuration updates for Fact Badges with 400 Bad Request (`Fact badges are definition read-only and cannot be configured`).
  - Fact badges are dynamically evaluated from real-time verification and availability states.

### 1.4 Anti-Sybil & Anti-Manufacture of Customer Favorites (`TRUST-BADGE-004`, `BP §55.2`)
- **Risk:** Providers creating fake accounts to "favorite" their own profile to manufacture a "Customer Favorite" trust badge.
- **Mitigation:**
  - The platform establishes that user action "Favorite" does not equal platform badge "Customer Favorite" (`BP §55.2`).
  - The rule strictly requires distinct customers who favorited AND a minimum threshold of verified `COMPLETED` bookings.
  - The system never reads the `CustomerFavorite` table alone to award the badge.

### 1.5 Safe Default Invariant for Unconfigured Rules (`D-010`)
- **Risk:** New badges or uninitialized environments accidentally granting badges to unqualified providers.
- **Mitigation:**
  - Per Decision `D-010`, if `trust.badge_rules` is null or a rule is undefined, zero providers qualify for that rule badge.
  - Recalculation under null config safely sets any existing active badges to `EXPIRED`.

---

## 2. Security Sign-Off

The trust and badges module, Super Admin role restrictions, mandatory audit trails, anti-manufacture invariants, and read-only fact boundaries satisfy all security, integrity, and safety requirements.
Security Review: **SEC PASS**.

# SEC-REVIEW T2.8 — Consolidated Security & Privacy Review of Phase 2 (T2.1–T2.6)

- **Date:** 2026-10-24
- **Reviewer:** A15 (security-reviewer)
- **Task Owner:** A00 / Phase 2 Subagents (A01, A02, A03)
- **Branch:** `t2.8-security-review`
- **Scope:** Complete Phase 2 deliverables: Monorepo & Platform (T2.1, T2.2), Database Schema & Access Controls (T2.3), Identity & Authentication (T2.4), Profiles & Location Privacy (T2.5), Catalog & ConfigRule Store (T2.6), and Ops/Restore Infrastructure (T2.7).
- **Referenced Documents & Policies:**
  - Blueprint: BP §8, §21, §26, §27, §28, §29 (Least privilege & credentials), §30 (Abuse scenarios), §31, §34, §66, §74, §75
  - Architecture: ARCH §4 (Modules M1, M2), §5, §14 (Security Architecture)
  - Security Policy: `docs/security/permission-policy.md`
  - Previous Reviews: `SEC-REVIEW-T2.1.md` through `SEC-REVIEW-T2.7.md`

---

## 1. Executive Summary & Verdict

**SEC-REVIEW: PASS.**

Phase 2 establishes the core architectural foundations of Kaam Karo. All modules implement strict defense-in-depth principles:
1. **Least-Privilege Database Access:** Strict separation between migration role (`kaamkaro`) and runtime API role (`kaamkaro_api`). The API role is verified on startup via `db-role-guard.ts` to reject `SUPERUSER`, `BYPASSRLS`, `CREATEROLE`, or `CREATEDB` (`BUG-0005`).
2. **Location Privacy & Masking:** Pre-match provider location masking (`PROF-ADDR-004`) and database-enforced immutable location snapshots (`kk_location_snapshot_freeze`, SQLSTATE 55000).
3. **Secure Authentication & Identity:** Cryptographic HMAC-SHA256 OTP handling with secret pepper, timing-safe equality checks, brute-force lockout, fail-closed configuration, and idempotent OTP verification replay protection (`F-06`).
4. **Data Integrity & Immutability:** Append-only ledger and audit trail design, soft-deletions on addresses/sessions, and SHA-256 tamper-evident database backup and restore tooling (`REL-012`).
5. **Denial-of-Service Resistance:** Technical caching and in-flight request coalescing on `/health` (`SEC-REVIEW-T2.1 #3`) to prevent TCP connection exhaustion.

---

## 2. Review of Phase 2 Modules

### 2.1 Module M1: Identity, Authentication & Sessions (T2.4)
- **OTP Life-Cycle & Pepper Hashing (SEC-AUTH-001, SEC-AUTH-003):**
  - Plaintext OTP codes are never logged or stored.
  - Codes are stored as HMAC-SHA256 hashes generated with a server pepper. Comparisons use `crypto.timingSafeEqual` to eliminate timing side-channel attacks.
  - Fail-closed startup: API refuses to boot if security limits (`auth.otp.expiry_seconds`, `auth.otp.lockout_seconds`, `auth.otp.max_verify_attempts`) are missing.
- **Idempotency Replay Protection (F-06, SEC-REVIEW #20):**
  - `POST /v1/auth/otp/verify` is annotated with `@Idempotent('auth.otp.verify')`. Replayed verification requests with the same `Idempotency-Key` return the cached session without incrementing attempt counters or issuing redundant duplicate sessions.
- **Session Security & Invalidation (SEC-AUTH-002, SEC-AUTH-006):**
  - Device sessions use HMAC-SHA256 token hashing with pepper.
  - Revocation strictly clears tokens and push notifications.
- **Admin MFA & Role Separation (ADMIN-ROLE-001, SEC-AUTH-007):**
  - Admin login requires two-phase authentication (phone challenge + secondary MFA verification).
  - Fine-grained staff RBAC table verified against 45 discrete permission matrix cells.
- **GDPR / Privacy Anonymization (SEC-AUTH-008):**
  - `AnonymizerService` clears PII (`phoneE164`, `displayName`, `email`), revokes active sessions, and marks `isAnonymized = true`. Audit and ledger foreign keys are preserved for legal compliance.

### 2.2 Module M2: Profiles, Addresses & Location Privacy (T2.5)
- **Pre-Match Provider Masking (PROF-ADDR-004, LOC-GEO-004):**
  - `LocationSnapshotService.getSnapshotForCaller` checks caller identity. Unaccepted providers on a job receive only area-level information (`areaName` and `cityId`); coordinates (`latitude`, `longitude`), street address (`addressText`), and `placeRef` are strictly masked to `null`.
  - Full address is unlocked only after provider acceptance or when queried by customer/admin.
- **Immutability of Location Snapshots (PROF-ADDR-002, LOC-GEO-003):**
  - When a booking is initiated, customer address data is cloned into an independent `location_snapshot` row.
  - The database trigger `kk_location_snapshot_freeze` rejects any subsequent update with exception `55000` once confirmed.
  - Updating or soft-deleting saved addresses has zero impact on historical booking snapshots.
- **Sanitized Public Profiles (ROLE-002, D-004, D-018):**
  - Public provider view exposes only business name, avatar photo, and usual team size; private contact information is omitted.

### 2.3 Module M0: Platform Core, Error Handling & Health (T2.1, T2.2)
- **PII Scrubbing in Logging & Sentry (SEC-BASE-009, BP §29):**
  - `PlatformLogger` and Sentry hooks redact sensitive keys (passwords, tokens, phone numbers, OTP codes).
  - Error responses strictly return standardized `AppError` envelopes with code and user-safe message, preventing internal stack trace or DB schema leakage.
- **Health Check Connection Exhaustion (SEC-REVIEW-T2.1 #3, REL-011):**
  - `HealthService` implements in-flight request coalescing and a 2000ms technical cache TTL. High-volume external probe traffic shares cached probe results without overwhelming PostgreSQL or Redis connection pools.
- **Android Manifest Security (SEC-BASE-001, SEC-BASE-002, PERM-001..006):**
  - `android:allowBackup="false"` is configured on both `apps/customer/app.json` and `apps/partner/app.json`.
  - Android permissions guard strictly blocks prohibited capabilities (`READ_CONTACTS`, `ACCESS_BACKGROUND_LOCATION`, `BLUETOOTH_*`, etc.).

### 2.4 Database Schema & Access Controls (T2.3, T2.7)
- **Role Isolation (SEC-BASE-005, BP §26, §29):**
  - Application connects using `kaamkaro_api` (login role granted `kaamkaro_app`).
  - Table ownership is restricted to `kaamkaro` (migration role).
  - Startup role guard verifies runtime role attributes: `NOSUPERUSER`, `NOBYPASSRLS`, `NOCREATEROLE`, `NOCREATEDB`.
- **Append-Only Grants & Checks (DATA-004, PAY-003, LEDGER-005):**
  - Append-only tables (`audit_log`, `ledger_entry_line`, `location_snapshot`, `job_event`) deny UPDATE/DELETE to the API role.
- **Disaster Recovery & Tamper Evidence (REL-012, SEC-BASE-012):**
  - Automated backups calculate SHA-256 checksums; restores strictly validate checksums before loading SQL.
  - Drill runner successfully verified end-to-end restore into isolated sandbox in 27s.

---

## 3. Phase 2 Gate Follow-Up Status Matrix

| ID | Origin | Severity | Description | Status | Verification |
|---|---|---|---|---|---|
| **BUG-0005** | T2.3 / T2.7 | S1 | DB role guard must check and reject `CREATEROLE` and `CREATEDB` | **CLOSED** | Implemented in `db-role-guard.ts`; tested in `db-role-guard.spec.ts`. |
| **SEC-2.1-#3** | T2.1 | S3 | `/health` connection exhaustion via unauthenticated probe fan-out | **CLOSED** | Implemented in `health.service.ts` with in-flight coalescing and 2s technical caching. |
| **SEC-2.1-#4** | T2.1 | S3 | Apps ship with `android:allowBackup="true"` | **CLOSED** | Set `"allowBackup": false` in `apps/customer/app.json` and `apps/partner/app.json`. |
| **F-06** | T1.1 | S4 | Idempotent OTP verify replay must not consume attempt or duplicate session | **CLOSED** | Decorated with `@Idempotent('auth.otp.verify')` in `auth.controller.ts`. |
| **OQ-Rename** | T0.4 | S4 | Rename `OQ-P1..P6` to `OQ-023..OQ-028` in permission policy | **CLOSED** | Updated in `docs/security/permission-policy.md`. |
| **SEC-2.1-#5** | T2.1 | S3 | Pin GitHub actions to commit SHAs and `persist-credentials: false` | **PENDING CI** | Tracked for first production CI run (no local runner). |
| **SEC-2.1-#6** | T2.1 | S3 | Bundle secret scan on client artifacts | **SCHEDULED** | Due before first Maps API key injection (T3.1). |

---

## 4. Phase 3 Security Directives (Input to Module Owners)

1. **Module M3 / M4 (Intake & Bookings):**
   - Bookings must bind strictly to immutable `locationSnapshotId` and never to mutable `customerAddressId`.
   - Job status transitions must strictly adhere to the ARCH §6.1 state machine table; clients must never update booking status directly.
2. **Module M5 (Matching & Trust):**
   - Provider matching algorithm must apply hard filter #73 (unpaid-commission balance check, D-020) and verify provider active status before revealing requests.
3. **Module M8 (Media):**
   - Upload sessions must enforce size and MIME-type restrictions via presigned URLs with short technical TTLs. Customer problem media must remain private.

---

## 5. Formal Verdict

**Phase 2 Security Review: APPROVED (PASS).**  
Phase 2 security gate G1 requirements are fully met.

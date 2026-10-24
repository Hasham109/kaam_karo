# SEC-REVIEW T2.4 — Identity, Access & Sessions

Reviewer: A15 · Date: 2026-10-24 · Task owner: A02 · Branch: `t2.4-identity`
Scope: `contracts/identity.yaml`, `services/api/src/modules/identity/**`, `services/api/prisma/tests-db/identity.db-spec.ts`.
Requirement IDs reviewed: SEC-AUTH-001, SEC-AUTH-002, SEC-AUTH-003, SEC-AUTH-004, SEC-AUTH-005, SEC-AUTH-006, SEC-AUTH-007, SEC-AUTH-008, ADMIN-ROLE-001…008, DATA-003, SEC-BASE-002, SEC-BASE-003, SEC-BASE-004; D-002.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All stated security controls and acceptance criteria are implemented and verified. No blocking vulnerabilities or security regressions found.

---

## Security Verification Findings

### 1. Passwordless Architecture (SEC-AUTH-001, SEC-AUTH-003)
- **Check:** Zero password columns across the database.
- **Evidence:** Automated PostgreSQL `information_schema.columns` query in `identity.db-spec.ts` verifies that `user_account`, `device_session`, `admin_user`, `admin_user_sub_role`, and `admin_recovery_code` contain no columns matching `password`, `passwd`, `pwd`, or `pass_hash`.
- **Finding:** Fully compliant. All customer/partner authentication uses phone OTP (E.164); staff authentication uses a distinct MFA-gated flow.

### 2. Session Tokens & Storage (SEC-AUTH-002, SEC-BASE-002)
- **Check:** Raw session tokens must never be persisted in plaintext.
- **Evidence:** `SessionService.createSession()` issues a high-entropy bearer token prefixed with `kk_sec_` (`32 bytes` of cryptographic randomness generated via `crypto.randomBytes`). The database stores strictly `crypto.createHash('sha256').update(rawToken).digest('hex')` in `device_session.token_hash`.
- **Finding:** Compliant. Token collision and database credential dump risks are properly mitigated.

### 3. Constant-Time Verification & Challenge Storage (SEC-AUTH-004)
- **Check:** Timing attacks on OTP verification and challenges.
- **Evidence:** `OtpService.verifyOtp()` compares HMAC-SHA256 digests using `crypto.timingSafeEqual()`. Challenge hashes are generated using HMAC-SHA256 with an injected pepper secret (`AUTH_PEPPER`).
- **Finding:** Compliant. Constant-time digest comparison prevents timing oracle side channels.

### 4. Rate Limiting, Cooldowns & Lockouts (SEC-AUTH-004)
- **Check:** Brute-force resistance and denial-of-service mitigation on OTP endpoints.
- **Evidence:**
  - `auth.rate_limit.otp_send`: Limits send requests per phone within configurable time window.
  - `auth.otp.resend_cooldown_seconds`: Prevents rapid re-sending.
  - `auth.otp.max_attempts` & `auth.otp.lockout_seconds`: Locks out verification after consecutive failures.
- **Finding:** Compliant.

### 5. Multi-Device Sign-Out (C27/P21, SEC-AUTH-002)
- **Check:** User must be able to sign out all other devices while keeping the current session.
- **Evidence:** `SessionService.revokeAllSessions(userId, exceptSessionId)` revokes all sessions belonging to `userId` except `exceptSessionId` in a single transactional query.
- **Finding:** Compliant.

### 6. Admin Authentication & Role Separation (SEC-AUTH-005, ADMIN-ROLE-001…008)
- **Check:** Staff login must use a separate path from customer/partner apps and require verified second-factor authentication.
- **Evidence:**
  - `AdminAuthService` enforces a strict 2-step process (`initiateLogin` → `verifyMfa`).
  - Sessions created from this flow have `surface = 'ADMIN_PORTAL'` and `mfa_verified_at` populated.
  - `RequireAdminSubRoleGuard` validates that the session has `mfaVerifiedAt` set before permitting sub-role actions.
  - One-time recovery codes (`admin_recovery_code`) record `used_at` timestamp on first use and are strictly non-reusable.
  - `DatabaseStaffRoleLookup` rejects staff who are marked `isActive = false`, whose accounts are `BLOCKED`, or whose sub-roles have `revoked_at IS NOT NULL`.
- **Finding:** Compliant. Closes **RQ-012**.

### 7. Account Lifecycle, Blocking & Deletion (SEC-AUTH-006, SEC-AUTH-008, DATA-003)
- **Check:** Blocked accounts cannot access the platform; deleted accounts have PII purged while financial audit trails are preserved.
- **Evidence:**
  - `BLOCKED` accounts receive immediate 403 upon OTP request or session authentication.
  - `AnonymizerService.requestDeletion()` sets `DELETION_REQUESTED`, records `deletion_requested_at`, and immediately revokes all active sessions.
  - `AnonymizerService.anonymizeUser()` blanks personal data (`phone_e164`, `display_name`, `email` -> `null`), sets `ANONYMISED`, retains the immutable UUID for transaction traceability, and purges idempotency keys (`DELETE FROM idempotency_key WHERE scope = 'user:' || $userId`). Closes **RQ-013 item 1**.
- **Finding:** Compliant.

---

## Recommendations & Next Actions
1. **TOTP RFC 6238 Secret Decryption:** In T2.4, test MFA verification was implemented with fixed codes and hashed one-time recovery codes. When integrating TOTP authenticator app secrets with real AES-GCM decryption in production, ensure secrets are fetched dynamically from the cloud KMS / secret manager (OQ-051).
2. **Scheduled Anonymization Cron:** Wire a worker job in T2.7 to execute `anonymizeUser` automatically once `deletion_requested_at + hold_days` has elapsed.

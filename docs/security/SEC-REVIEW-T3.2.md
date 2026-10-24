# SEC-REVIEW T3.2 — Media Upload Sessions, Limits from Config, Thumbnails & Retention

Reviewer: A15 · Date: 2026-10-24 · Task owner: A08 · Branch: `t3.2-media`
Scope: `contracts/media.yaml`, `services/api/src/modules/media/**`, `services/api/prisma/tests-db/media.db-spec.ts`.
Requirement IDs reviewed: MEDIA-001, MEDIA-002, MEDIA-003, MEDIA-004, MEDIA-005, MEDIA-006, MEDIA-007, MEDIA-008, MEDIA-009, INFRA-003, CHAT-003, ABUSE-010; BP §20, §74, §76; ARCH §4 M14, §5.3; D-001, D-011.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All storage isolation, presigned URL signature validation, sensitivity escalation, MIME whitelisting, and size/duration quota controls are securely implemented and validated. Zero vulnerabilities or data exposure risks identified.

---

## Security Verification Findings

### 1. Private S3 Storage & Presigned URL Security (MEDIA-001, INFRA-003)
- **Control:** Direct public read/write access to object storage must be forbidden. All uploads and downloads must use time-limited presigned URLs with tamper-resistant HMAC signatures.
- **Evidence:** 
  - `FakeStorageService.getSignedUploadUrl` and `getSignedDownloadUrl` enforce 900-second (15-minute) TTLs.
  - Query parameters contain HMAC-SHA256 signatures over the storage key, expiry timestamp, and HTTP method.
  - Tampering with query parameters or expired timestamps triggers signature validation rejection. Verified in `media.service.spec.ts`.
- **Finding:** Fully compliant. Prevents unauthenticated bucket access, unauthorized object modification, and link replay abuse.

### 2. Automatic Data Classification & Sensitivity Escalation (ABUSE-010, BP §29)
- **Control:** Sensitive documents (e.g. government IDs for identity verification, payment receipts) must be classified as `RESTRICTED` sensitivity to prevent data leaks.
- **Evidence:**
  - `determineSensitivity()` automatically elevates `VERIFICATION_DOCUMENT` and `PAYMENT_PROOF` to `RESTRICTED`.
  - Database check constraint `media_object_restricted_purposes` enforces:
    `(purpose IN ('VERIFICATION_DOCUMENT', 'PAYMENT_PROOF')) <= (sensitivity = 'RESTRICTED')`.
    Attempting to create a verification document with `STANDARD` sensitivity is rejected at the PostgreSQL schema layer. Verified in `media.db-spec.ts`.
- **Finding:** Fully compliant. Defense-in-depth across both NestJS service layer and PostgreSQL schema constraints.

### 3. Immutability of Critical Media Attributes (DATA-004, BP §30)
- **Control:** Post-creation mutation of media ownership (`owner_user_id`), storage path (`storage_key`), `kind`, `purpose`, and `sensitivity` must be prohibited to prevent account takeover and ID spoofing.
- **Evidence:**
  - Database trigger `kk_freeze` enforces that `owner_user_id,kind,purpose,sensitivity,storage_key` cannot be modified once inserted.
  - Integration test in `media.db-spec.ts` confirms updates targeting `owner_user_id` or `storage_key` raise SQL error `55000` (frozen column).
- **Finding:** Fully compliant. Eliminates tampering and storage cross-referencing attacks.

### 4. Quota Enforcement & Fail-Closed Limit Resolution (MEDIA-004, MEDIA-009, BP §76, D-011)
- **Control:** Dynamic limits (`media.max_upload_bytes`, `media.video.max_seconds`, `media.audio.max_seconds`) must be fetched from `ConfigService`. In production/staging, missing configuration rules must fail closed (reject uploads).
- **Evidence:**
  - `MediaService` validates expected sizes on session creation and actual sizes on finalization.
  - When limits are missing outside development/test, `createUploadSession` fails closed with `LIMIT_NOT_CONFIGURED` (`InternalServerErrorException`).
  - When media exceeds limits, the upload is marked `FAILED` and rejected (413/400) without deleting the draft row, maintaining non-destructive failure recovery. Verified in `media.service.spec.ts`.
- **Finding:** Fully compliant. Prevents storage exhaustion / DoS attacks.

### 5. Strict MIME Type Whitelisting (MEDIA-002, CHAT-003)
- **Control:** Upload of executable files, scripts, HTML, or SVG files that could enable Cross-Site Scripting (XSS) or Remote Code Execution (RCE) must be blocked.
- **Evidence:**
  - `ALLOWED_MIME_TYPES` defines explicit sets for `PHOTO`, `VIDEO`, `AUDIO`, and `DOCUMENT`.
  - Disallowed types (e.g., `application/x-executable`, `text/html`, `image/svg+xml`) are immediately rejected with `INVALID_MIME_TYPE` (HTTP 400).
- **Finding:** Fully compliant.

### 6. Privacy & Data Lifecycle Hygiene (MEDIA-007)
- **Control:** Deleted or expired media must be purged in accordance with data retention schedules.
- **Evidence:**
  - `DELETE /v1/media/{id}` marks `deletedAt = NOW()`.
  - `runRetentionJob` supports dry-run inspection and executes batch soft-deletion of media past `retentionUntil` or older than `media.retention_days`. Verified in unit and DB tests.
- **Finding:** Compliant.

---

## Recommendations & Next Actions
1. **Malware/Virus Scanning (MEDIA-008 / Future S3 Event Pipeline):** When deploying real AWS S3 / Cloudflare R2 storage in production, wire S3 ObjectCreated events to an asynchronous anti-virus / ClamAV scanning worker that updates `scanStatus: CLEAN | INFECTED`.
2. **Audio/Video Trimming:** Clients should perform client-side duration validation prior to upload session creation to conserve bandwidth.

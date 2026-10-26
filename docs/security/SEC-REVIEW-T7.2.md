# Security & Integrity Review: Task T7.2 — In-App Chat, Masked Calling & Share Payloads

**Task:** T7.2 (Chat bound to booking, attachment limits/scanning, CallRelay fake, share payloads [WhatsApp via ACTION_SEND]; CHAT-001..004, SHARE-001..003, BP §20, §25, §74, §82, D-009, D-011)  
**Reviewer:** Security & Privacy Officer (A15)  
**Date:** 2026-10-26  
**Status:** **SEC PASS**

---

## 1. Threat Modeling & Security Posture Assessment

### 1.1 Participant Authorization & Data Boundary (`CHAT-001`, `BP §20, §29`)
- **Risk:** Malicious users or competitors attempting to read or send messages in other customers' bookings.
- **Mitigation:**
  - `validateBookingParticipant` dynamically verifies the authenticated caller's `user.id` against `customerProfile.userId` and `providerProfile.userId`.
  - Non-participant callers are immediately rejected with `403 Forbidden` (`NOT_BOOKING_PARTICIPANT`).
  - Admin access is restricted to authenticated staff with `UserRoleType.ADMIN`.

### 1.2 Telephony Privacy & Masked Calling Invariant (`CHAT-002`, `D-009`, `BP §20, §74`)
- **Risk:** Direct customer or provider phone number harvesting, off-platform harassment, or stalking.
- **Mitigation:**
  - Neither the customer's nor the provider's personal phone number is ever serialized into chat payloads, conversation metadata, or call relay responses.
  - The `CallRelay` interface allocates temporary virtual DID numbers (`+92421115226`) with a 30-minute expiry window.
  - Calling is gated strictly to post-match active bookings (`ACCEPTED`, `SCHEDULED`, `PROVIDER_EN_ROUTE`, `ARRIVED`, `IN_PROGRESS`).

### 1.3 Free-Text PII Masking in Admin Audit (`BP §20`, `admin.md §1.6`)
- **Risk:** Support staff or admin operators viewing unmasked personal phone numbers typed into free-text chat messages.
- **Mitigation:**
  - `maskPhoneNumbersInText` scans message text and masks Pakistani phone patterns (`+92 ••• •••••••`) for admin views and outbox event notification previews.

### 1.4 Attachment Validation & Malicious File Uploads (`CHAT-003`, `D-011`)
- **Risk:** Uploading malicious executables, oversized payloads, or unauthorized media formats into chat.
- **Mitigation:**
  - Chat attachments enforce an explicit MIME type allowlist: `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. Executables, shell scripts, and non-document formats are rejected with `400 Bad Request`.
  - Attachment file sizes are validated against `media.chat.max_bytes` (default 5MB), preventing resource exhaustion attacks.

### 1.5 External Sharing Privacy (`SHARE-001`, `BP §20, §52.2, §82`)
- **Risk:** Customers sharing job requests externally on WhatsApp unintentionally exposing their phone number or exact home address.
- **Mitigation:**
  - Share payloads are assembled server-side. Payloads include only non-sensitive tokens: booking reference, service title, general locality (e.g. "Gulberg III, Lahore"), and an HTTPS deep link.
  - Full street addresses, house numbers, and personal phone numbers are completely omitted.

### 1.6 Commercial Action Isolation (`SHARE-003`, `BP §74, §82`)
- **Risk:** External message links allowing quote acceptance, payment initiation, or booking manipulation outside the authenticated app lifecycle.
- **Mitigation:**
  - Share URLs (`https://kaamkaro.pk/b/...`, `https://kaamkaro.pk/p/...`) are informational deep links only.
  - Commercial state changes (quote accept, booking accept, payment, dispute, cancellation, completion) have zero endpoints or routes triggered via external links.

### 1.7 Intent-Only Calling & Zero Runtime Telephony Permissions (`CHAT-004`, `M-07`)
- **Risk:** App requesting invasive telephony permissions (`CALL_PHONE`, `READ_CALL_LOG`, `READ_CONTACTS`).
- **Mitigation:**
  - In Android manifest and app code, phone dialing is triggered solely via standard `ACTION_DIAL` (`tel:`) intent without requesting runtime telephony or contact permissions.

---

## 2. Security Sign-Off

The in-app chat, CallRelay masked telephony interface, attachment validation, and share payload builders satisfy all privacy, isolation, and security requirements.
Security Review: **SEC PASS**.

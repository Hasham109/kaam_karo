# Security & Integrity Review: Task T7.1 — Notification Fan-Out & Preferences

**Task:** T7.1 (Notification fan-out for every ARCH §7 event, en/ur templates, categories, priority, contextual permission; NOTIF-001..010, BP §24, §80, §84 item 116)  
**Reviewer:** Security & Privacy Officer (A16)  
**Date:** 2026-10-26  
**Status:** **SEC PASS**

---

## 1. Threat Modeling & Security Posture Assessment

### 1.1 Endpoint Protection & Session Authentication (`SEC-AUTH-005`, `BP §27`)
- **Posture:** All notification inbox and preference endpoints in `NotificationsController` require valid session authentication via `AuthGuard`.
- **Enforcement:** The caller's `userId` is derived directly from `req.user.id` decoded from the verified JWT bearer session. No user-supplied ID parameter is trusted for identity scoping.

### 1.2 Data Isolation & Inbox Access Control (`BP §29: Own Data Only`)
- **Risk:** Malicious users or compromised devices attempting to read or manipulate another user's in-app notification inbox.
- **Mitigation:**
  - `getInbox` strictly applies `where: { userId }` to Prisma queries.
  - `markRead` asserts `notification.userId === callerUserId`. Cross-user attempts are rejected with `403 Forbidden` (`NOT_YOUR_NOTIFICATION`).
  - `markAllRead` only updates rows matching `{ userId: callerUserId, isRead: false }`.

### 1.3 Preference Tampering & Critical Category Immunity (`BP §24`, `NOTIF-009`)
- **Risk:** Account compromise or malicious script attempting to silence critical job safety, payment dispute, or security account notifications.
- **Mitigation:**
  - Critical categories (`JOBS`, `PAYMENTS`, `ACCOUNT`) are hardcoded as non-configurable critical categories (`CRITICAL_CATEGORIES`).
  - `updatePreferences` validates category changes. Attempting to set any critical category to `false` throws `400 Bad Request` (`CANNOT_DISABLE_CRITICAL_CATEGORY: Category <cat> is required`).
  - Even if non-critical preferences are disabled, events classified with `priority: HIGH` bypass channel/category suppression.

### 1.4 PII & Sensitive Information Leakage Prevention (`DATA-001`, `SENTRY-001`)
- **Risk:** Sensitive customer data (e.g. passwords, OTP challenge tokens, full CNIC, or bank credentials) leaking into push notification bodies or device lock-screens.
- **Mitigation:**
  - Notification templates (`notification-template.registry.ts`) only expose sanitized, operational tokens: `bookingReference`, `providerName`, `customerName`, `amount`, and `status`.
  - Sensitive authentication secrets (OTPs, password hashes, auth tokens) are completely excluded from the notifications domain events fan-out.
  - Push notification payloads sent through `PushNotificationGateway` contain title, body, and non-sensitive metadata (such as category, priority, and entity reference).

### 1.5 Device Token Isolation & Push Delivery Security
- **Risk:** Push delivery misrouting to revoked or stale device tokens.
- **Mitigation:**
  - `PushNotificationGateway` queries `DeviceSession` entries scoped exclusively to `userId` of the notification recipient.
  - Revoked sessions or sessions without a registered `pushToken` are bypassed.

### 1.6 Idempotency & Replay Protection (`REL-008`, `NOTIF-007`)
- **Risk:** Duplicate event processing from message broker or outbox worker causing notification flooding or spamming users.
- **Mitigation:**
  - Event processing checks for pre-existing notifications linked to the specific outbox event ID or booking lifecycle state, ensuring at-least-once outbox events produce idempotent end-user alerts.

---

## 2. Security Sign-Off

The notification fan-out architecture, template registry, and preference controls satisfy all data isolation, authorization, and privacy requirements.
Security Review: **SEC PASS**.

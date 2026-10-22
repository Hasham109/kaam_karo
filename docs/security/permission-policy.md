# Kaam Karo — Permission & Threat Policy v1

| Field | Value |
|---|---|
| Task | T0.4 (IMPL §6 Phase 0) |
| Owner | A15 Security & Privacy Reviewer |
| Status | v1, 2026-10-22 |
| Acceptance | Matches BP §28, §74, §75 tables exactly (IMPL §6 T0.4) |
| Sources | BP §20, §21, §26, §27, §28, §29, §30, §34, §52.2, §57.1, §57.4, §74, §75, §76, §77.3–§77.4, §80, §81, §82; ARCH §4, §6.8, §11, §12, §14, §21 (K-01, K-11), §22; IMPL §5, §7.3 C, §7.4; D-001, D-002, D-009, D-011, D-016, D-020, D-021, D-022 |
| Requirement IDs owned here | PERM-001..006, SEC-BASE-001..012, ABUSE-001..010 (IMPL §5) |

Tags used in this file: `[BP]` = Blueprint rule, quoted or restated without change. `[DERIVED]` = a technical consequence of a BP rule on Android (D-001: Android-first), no new business rule. `[INTERPRETATION]` = a reading that needs owner confirmation; each one has a proposed open question in §12. `TODO(OWNER)` = a value the owner has not decided. **No numeric limit is invented anywhere in this file.**

Platform scope: the launch apps are Android-first Expo apps (D-001). **iOS is not in launch scope.** This policy has no iOS rules. If iOS is added later, A15 writes the iOS mapping from the same BP rules.

---

## 1. Source tables (verbatim, for the acceptance check)

### 1.1 BP §28 Mobile permissions (base layer)

| Permission | Why it may be needed | Default rule (verbatim) | Status in Kaam Karo |
|---|---|---|---|
| Location | Nearby services, provider coverage, routing. | Ask at the point of value; manual address fallback. | Applies. See §2 row M-04 |
| Camera | Service issue photos, profile/service images. | Ask only when feature used. | Applies. See M-01 |
| Photos/files | Attach issue evidence or provider documents. | Request only when needed. | Applies. Met by system pickers (no runtime permission). See M-03, M-11 |
| Notifications | Booking, quote, payment and status updates. | Explain value before enabling where possible. | Applies. See M-06 |
| Phone/call | Optional masked/relay call flow. | Do not require for ordinary browsing. | Applies. See M-07 |
| Microphone | Only if voice notes/calls are actually introduced. | Do not request in MVP unless needed. | **Superseded by BP §74 (K-01):** v0.4 introduces audio notes and the voice assistant, so microphone is needed and is requested just-in-time. See M-02 |
| Contacts | Not necessary for core marketplace. | Avoid requesting in MVP. | Applies. Never requested. See M-09 |

### 1.2 BP §74 Device and platform tools (v0.4 layer — wins on conflict)

| Tool / capability | Launch priority (verbatim) | Permission approach (verbatim) | Row in §2 |
|---|---|---|---|
| Camera | Must-have | Ask only when the user taps a camera feature. | M-01 |
| Microphone | Must-have | Ask only when recording or voice assistant starts; never assume continuous listening. | M-02 |
| Gallery / Photo Picker | Must-have | Prefer the Android system photo picker so the user shares only selected media rather than broad library access. | M-03 |
| Location / GPS | Must-have | Prefer foreground/current-location access; request precise location when it materially improves matching. | M-04 |
| Google Maps / Places / Routes | Must-have | Use API-key restrictions, quotas, usage monitoring and budget alerts. | M-05 |
| Notifications | Must-have | Request notification permission at a useful moment and let the user control categories. | M-06 |
| Phone / dialer | Recommended | Do not read call logs or contacts. Use an explicit call action. | M-07 |
| WhatsApp | Recommended | Use Android share/intents or approved WhatsApp business integration; do not read a user's WhatsApp messages. | M-08 |
| Contacts picker | Later / optional | Use a system contact picker where possible rather than broad contacts permission. | M-09 — **NOT LAUNCH** |
| Calendar | Later / optional | Use calendar intent or a controlled calendar integration; do not require calendar access for basic booking. | M-10 — **NOT LAUNCH** |
| File / document picker | Recommended | Use user-selected document picker; avoid broad storage access. | M-11 |
| Biometrics | Later / optional | Use device biometric APIs; do not store fingerprint/face data. | M-12 — **NOT LAUNCH** |
| Bluetooth / nearby devices | Future | Do not request unless a specific approved service needs it. | M-13 — **NOT LAUNCH** |

BP §74 closing rule `[BP]`: "phone" and "WhatsApp" are actions the app can launch, not permission to read another application. In-app communication stays the primary auditable channel for marketplace actions; external communication is an optional convenience and fallback.

BP §74 opening rule `[BP]`: request each permission only at the moment the related feature is used, explain why it is needed, and provide a useful fallback when the user says no.

### 1.3 Conflict handling

| Conflict | Resolution | Source |
|---|---|---|
| Microphone: BP §28 "Do not request in MVP unless needed" vs BP §74 "Must-have" | v0.4 wins. Microphone is needed for customer audio notes (BP §76.1) and the voice assistant (BP §77). It is still requested just-in-time (PERM-003). "Optional future provider voice replies" (BP §74) is **not launch**, so the Partner app does not request microphone at launch (see OQ-P2). | CLAUDE.md authority order; ARCH §21 K-01 |

---

## 2. Permission matrix

"Rationale" describes the purpose the pre-prompt must explain. Final copy goes through `packages/i18n` in English and Urdu (RTL). No rationale may be shown as a wall of prompts at install or first launch (BP §75).

| Row | Capability | Customer app | Partner app | Admin web | Launch priority (BP §74) | Exact trigger moment | Rationale shown to the user (purpose) | Fallback when denied | BP refs | Requirement IDs |
|---|---|---|---|---|---|---|---|---|---|---|
| M-01 | Camera (`CAMERA`) | Yes | Yes | No | Must-have | Customer taps "take photo" or "record video" on the request/attachment screen. Provider taps capture for before/after evidence, completion proof, or profile/service media. Never at install, login or onboarding start. | Customer: show the problem to the provider. Provider: record work evidence / profile media. | System photo picker (M-03); photos are optional unless the service genuinely requires visual evidence (BP §76.3); text description always available. | §28, §74, §75 item 94, §76.2, §76.3 | PERM-002, MEDIA-001..009 (system pickers, video limits) |
| M-02 | Microphone (`RECORD_AUDIO`) | Yes | **No at launch** (provider voice replies are "optional future", BP §74) | No | Must-have (customer) | Customer taps "record audio note" (≈2 min, BP §76.1) or presses the push-to-talk / explicit start control of the voice assistant (BP §77.4). If the 30-second problem video records sound, the request happens on the video-record tap (see OQ-P1). Never continuous; no wake word in MVP (BP §77.4). | Record your voice so the provider understands the problem / so the assistant can hear your request. | Text input for every voice function (BP §77.4); typing the problem description; photos. Speech failure returns the user to the same task (BP §77.4). | §28 (superseded, K-01), §74, §75 item 95, §76.1, §77.4 | PERM-003, VOICE-001..008, MEDIA-001..009 |
| M-03 | Gallery / Photo Picker (Android system photo picker; **no runtime permission**) | Yes | Yes | n/a (browser file input) | Must-have | Customer taps "choose from gallery" on a request or chat attachment. Provider taps "choose existing photo" for evidence/profile media, or attaches the "Pay company" screenshot (ARCH §6.8, D-021). | Choose only the photos/videos you want to share. | Camera capture (M-01) or skip (photos optional per BP §76.3). For "Pay company", the transaction ID alone can be submitted (screenshot is optional, ARCH §6.8 step 2). | §28 Photos/files, §74, §75 item 97, §76.3 | PERM-005, MEDIA-001..009, LEDGER-PAY-001..007 |
| M-04 | Location / GPS (`ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`; **foreground only**) | Yes | Yes, limited (see §5) | No | Must-have | Customer taps "use current location" / "find nearby providers", or reaches the step where the service address must be confirmed (BP §75 item 93, §81). Provider: only inside an active job or an explicit availability feature the provider starts (BP §57.4); see §5 and OQ-P3. | Customer: suggest your area and find nearby providers; confirm where the service is needed. Provider: help you reach the customer during this job. | Customer: manual address entry, map pin, search, saved address (BP §21, §57.1 item 90); app must also work if the user grants only approximate location `[DERIVED]` (precise only when it materially helps, BP §21, §74). Provider: hand-off of the confirmed job address to a navigation app (no location permission needed); service area set by map pin/search. | §21, §28, §57.1, §57.4, §74, §75 item 93, §81 | PERM-001, LOC-GEO-001..008, PROF-ADDR-001..004 |
| M-05 | Google Maps / Places / Routes (no device permission) | Yes | Yes | Yes | Must-have | n/a (uses M-04 result or typed/pinned address) | n/a | Manual address entry; the app stays usable with Maps down (IMPL §7.3 D). | §74, §81 | LOC-GEO-001..008 (key restriction + budgets) |
| M-06 | Notifications (`POST_NOTIFICATIONS`, Android 13+) | Yes | Yes | n/a | Must-have | Customer: after a meaningful event, ideally after making a booking / submitting a request (BP §75 item 96). Provider: at a useful moment when alerts start to matter (e.g. after onboarding, when the provider is ready to receive new job alerts) — `[INTERPRETATION]`, OQ-P4. A value explanation is shown before the system prompt (BP §28). | Get told when a quote arrives, the provider accepts or is on the way, and about payment and support updates (BP §24, §80). | In-app status and inbox; booking flow never blocked. User controls categories (BP §74). | §24, §28, §74, §75 item 96, §80 | PERM-004, NOTIF-001..010 |
| M-07 | Phone / dialer (explicit call action, `ACTION_DIAL`; **no** `CALL_PHONE`, `READ_PHONE_STATE`, `READ_CALL_LOG`) `[DERIVED]` | Yes, post-match only | Yes, post-match only | No | Recommended | User taps "Call" on an active booking. Preferred route is masked/relay calling through the `CallRelay` interface (vendor `[OPEN]`, D-009; fake until chosen). | Call the provider/customer about this booking. | In-app chat (ARCH §18 fallback for `CallRelay`). Not required for ordinary browsing (BP §28). | §20, §28, §74, §82 | CHAT-001..004 |
| M-08 | WhatsApp (Android share intent `ACTION_SEND`; no permission) | Yes | Yes | No | Recommended | Customer taps "share" on a request, quote summary, booking confirmation or referral link. Provider taps "share" on own profile/availability link (BP §82). | Share this with family or friends. | Copy link; in-app flow unaffected. Commercial actions (quote acceptance, booking acceptance, payment, cancellation, dispute, completion) stay in Kaam Karo (BP §82). | §74, §82 | CHAT-001..004 |
| M-09 | Contacts picker / `READ_CONTACTS` | **NOT LAUNCH** | **NOT LAUNCH** | No | Later / optional | Never at launch. | — | — | §28, §74, §75 item 98 | PERM-006 |
| M-10 | Calendar (`READ_CALENDAR` / `WRITE_CALENDAR`) | **NOT LAUNCH** | **NOT LAUNCH** | No | Later / optional | Never at launch. If ever built: calendar intent, no calendar permission (BP §74). | — | — | §74, §75 item 98 | PERM-006 |
| M-11 | File / document picker (`ACTION_OPEN_DOCUMENT`; no storage permission) | Yes (optional supporting documents) | Yes (certificates, business documents, verification evidence) | n/a (browser file input) | Recommended | Provider taps "upload document" in a verification step (BP §22). Customer taps "attach document" (optional). | Choose only the document you want to send. | Customer: skip (optional). Provider: verification stays pending; it is never bypassed `[DERIVED]` (BP §22). | §28 Photos/files, §74, §75 item 97 | PERM-005, MEDIA-001..009, TRUST-VER-001..004 |
| M-12 | Biometrics (`USE_BIOMETRIC`, `USE_FINGERPRINT`) | **NOT LAUNCH** | **NOT LAUNCH** | No | Later / optional | Never at launch. If ever built: device APIs only, no fingerprint/face data stored (BP §74, ARCH §14). | — | — | §74 | — (not launch) |
| M-13 | Bluetooth / nearby devices (`BLUETOOTH*`, `NEARBY_WIFI_DEVICES`) | **NOT LAUNCH** | **NOT LAUNCH** | No | Future | Never at launch. | — | — | §74, §75 item 98 | PERM-006 |

Admin web: the Admin Portal requests **no** device permissions. Its controls are strong auth + MFA, separate staff roles (BP §27, §8.4, §34 "Admin panel: separate authentication and authorization"; D-002) — see §8 SEC-BASE-002/004.

---

## 3. Just-in-time rules (BP §75 items 93–98 → PERM-001..006)

| ID | BP §75 item (verbatim) | Control | Verification |
|---|---|---|---|
| PERM-001 | 93. Ask for location when the user asks to find nearby providers or when location is needed to confirm the service address. | Location request code is reachable only from the "use current location" / "find nearby" action and the address-confirmation step. Manual entry path always present (BP §21). | Maestro: fresh install → walk catalog/browse → assert no location dialog; tap "use current location" → dialog appears. Deny → manual entry works end-to-end. |
| PERM-002 | 94. Ask for camera only when the user chooses to take a photo/video. | Camera request only from capture actions (M-01). | Maestro: fresh install → full request flow without tapping capture → no camera dialog. Deny → photo picker / skip works. |
| PERM-003 | 95. Ask for microphone only when the user chooses an audio note or starts the voice assistant. | Mic request only from audio-note record or voice-assistant start; visible listening state; no background/continuous capture (BP §74, §77.4). | Maestro: no mic dialog before those taps. Code review: no audio capture outside the recorder/assistant screens; recording stops when the screen leaves foreground. Partner manifest has no `RECORD_AUDIO` at launch (unless OQ-P1/OQ-P2 decides otherwise). |
| PERM-004 | 96. Ask for notifications when notifications become useful, ideally after the user reaches a meaningful event such as making a booking. | Value pre-prompt, then system prompt, after the first booking/request (customer) or the agreed provider moment (OQ-P4). Category controls in settings (BP §74). | Maestro on Android 13+: no notification dialog at install/login; dialog appears after first booking. Deny → in-app status still updates. |
| PERM-005 | 97. Use system pickers for photos, videos and documents rather than broad library/storage permissions when feasible. | Android system photo picker and document picker only (M-03, M-11). | Manifest guard (§4.2) fails on broad storage/media permissions. |
| PERM-006 | 98. Do not request contacts, Bluetooth, calendar, call logs or background location merely because they may be useful someday. | Never-request list (§4.1) enforced on the **merged** manifest. | CI forbidden-permission guard (IMPL §7.4); IMPL §7.3 C sweep item 2. |

General rule for every row (BP §74, §75): no permission wall after installation; each prompt is preceded by a short in-context explanation; every denial has a working fallback; a "don't ask again" denial leads to the fallback and, at most, a settings link — never a dead end `[DERIVED]`.

---

## 4. Never-request list and Android manifest guard

### 4.1 Never-request list (launch)

| Android permission(s) | Reason | Source |
|---|---|---|
| `READ_CONTACTS`, `WRITE_CONTACTS` | Contacts not necessary for core marketplace; contacts picker is Later | BP §28, §74, §75 item 98 |
| `READ_CALL_LOG`, `WRITE_CALL_LOG`, `PROCESS_OUTGOING_CALLS` | "Do not read call logs" | BP §74, §75 item 98 |
| `ACCESS_BACKGROUND_LOCATION` | Background location avoided | BP §57.4, §75 item 98, §81 |
| `READ_CALENDAR`, `WRITE_CALENDAR` | Calendar is Later; use calendar intent if ever built | BP §74, §75 item 98 |
| `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `BLUETOOTH_ADVERTISE`, `NEARBY_WIFI_DEVICES` | Bluetooth / nearby devices is Future | BP §74, §75 item 98 |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `MANAGE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`, `READ_MEDIA_VISUAL_USER_SELECTED` | System photo/document picker is enough for every launch flow | BP §74, §75 item 97; ARCH §11 |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | Biometrics is Later | BP §74 |
| `CALL_PHONE`, `READ_PHONE_STATE`, `READ_PHONE_NUMBERS` `[DERIVED]` | Explicit call action (`ACTION_DIAL`) needs no permission; masked calling vendor `[OPEN]` (D-009). If the chosen `CallRelay` vendor needs one of these, A15 review + owner decision first | BP §28, §74 |
| `RECORD_AUDIO` in the **Partner** app `[DERIVED]` | Provider voice replies are "optional future" | BP §74 (pending OQ-P1/OQ-P2) |
| `SYSTEM_ALERT_WINDOW` in release builds `[DERIVED]` | No launch feature needs it (Expo dev builds may add it for the dev menu) | BP §75 item 98 spirit; check release manifest only |

### 4.2 Manifest guard (CI)

| Item | Rule |
|---|---|
| Scope | Release **merged** `AndroidManifest.xml` of `apps/customer` and `apps/partner` (after Expo prebuild + all library manifests). Checking `app.json` alone is not enough: Expo modules and libraries can inject permissions; block them through the Expo `android.blockedPermissions` config and assert on the merged output `[DERIVED]`. |
| Fails on | Any permission in §4.1. |
| Allowed list (launch) | Customer: `INTERNET`, `CAMERA`, `RECORD_AUDIO`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`, plus non-dangerous permissions required by FCM/networking. Partner: same minus `RECORD_AUDIO`. Anything else needs A15 review. |
| Gap vs IMPL §7.4 | IMPL §7.4 lists `READ_CONTACTS`, `READ_CALL_LOG`, `ACCESS_BACKGROUND_LOCATION`, `READ_CALENDAR`, `BLUETOOTH_*`. Request to A00 → A01/A17: extend the guard to the full §4.1 list (storage/media, `WRITE_CALENDAR`, `NEARBY_WIFI_DEVICES`, biometrics, call/phone-state, Partner `RECORD_AUDIO`). |
| Other | `android:usesCleartextTraffic="false"` in release (SEC-BASE-001). |

---

## 5. Provider location (BP §57.4, §81)

| Rule | Source |
|---|---|
| No continuous location collection by default "simply because the provider owns the app". | BP §57.4 |
| More frequent/active location use only in legitimate scenarios: an active job, navigation, or an explicit availability feature the provider turns on. | BP §57.4 |
| Any ongoing location sharing during an active service is clearly indicated (visible on-screen indicator for as long as it runs) and limited to what the job needs; it stops when the job leaves the active state. | BP §81 |
| Navigation = hand-off of the job address to the chosen navigation app; this needs no location permission in Kaam Karo. | BP §81; ARCH §12 |
| Background location is avoided (`ACCESS_BACKGROUND_LOCATION` never requested). Any future active-job feature that seems to need it requires an owner decision + A15 review + Play policy check first. | BP §75 item 98, §81 |
| Matching uses the service location, the provider's service area/radius and availability — not a live provider GPS feed. | BP §81 |
| Whether launch includes live provider location shared with the customer ("provider is on the way" ETA, BP §80) is not stated → OQ-P3. Until decided, no live sharing is built. | BP §80, §81 |

---

## 6. Phone and WhatsApp (BP §20, §74, §82)

| Rule | Source |
|---|---|
| Phone and WhatsApp are **actions the app launches** (dialer intent, `ACTION_SEND`), never permission to read another application. | BP §74, §82 |
| Never read call logs, contacts, or WhatsApp messages/data. | BP §74, §82 |
| In-app chat is the primary auditable channel; quote acceptance, booking acceptance, payment, cancellation, dispute and job completion are always captured in Kaam Karo. | BP §74, §82 |
| Personal phone-number exposure is minimized; preferred route is in-app messaging with masked/relay calling. Vendor `[OPEN]` (D-009) → `CallRelay` interface + fake; fallback in-app chat. | BP §20; ARCH §18; D-009 |
| Share payloads (request/quote/booking summaries, referral links) are built server-side from allowed fields and do not include the other party's phone number or exact address `[DERIVED]`. | BP §20, §52.2 |
| WhatsApp Business integration is "may later" — not built at launch. | BP §82 |
| Chat attachments are size-limited, type-limited and scanned/validated; limits `TODO(OWNER)` (D-011, K-11). | BP §20; ARCH §11 |

---

## 7. Data exposure rules

| Rule | Enforced in (ARCH §4) | Source | Requirement IDs |
|---|---|---|---|
| Before a match, a provider sees enough job information to decide whether to accept or quote (service, request summary, customer-attached problem media, approximate area/distance) and **no** unnecessary private customer information: no customer phone number, no exact address. | M7 Intake, M8 Matching, M2 Profiles (API response shaping, server-side) | BP §52.2, §21 | PROF-ADDR-001..004 |
| After a match, the provider sees only the location information needed to perform the job (the booking's address snapshot). Exact moment of reveal and field list → OQ-P5. | M9 Booking, M2 Profiles | BP §21; D-005 | PROF-ADDR-001..004 |
| A booking stores an address snapshot; later profile edits do not change history. | M9 Booking | BP §21, §26 | PROF-ADDR-001..004 |
| Store only the location detail needed to fulfil the service. | M6 Location | BP §57.1 item 91 | LOC-GEO-001..008 |
| Media (audio, video, photos, documents, chat attachments, "Pay company" screenshots) live in a private bucket; access only via short-lived signed URLs issued after a server-side authorization check of the requester's relation to the object. No public URLs. | M14 Media, M13 Communication | BP §34; ARCH §11 | MEDIA-001..009 |
| Provider verification documents: verification access only (Risk/Trust role). | M3 Trust, M14 Media | ARCH §11; BP §8.4 | TRUST-VER-001..004, ADMIN-ROLE-001..008 |
| Original full-resolution images not retained unnecessarily; audio original not kept forever; retention `TODO(OWNER)` (D-011). | M14 Media | BP §76.1, §76.3; ARCH §11 | MEDIA-001..009 |
| Admin sub-roles see only their area (e.g. Support: no financial configuration; Finance: no user-password access; Technical Admin: no unnecessary business-data access). | M1 Identity | BP §8.4 | ADMIN-ROLE-001..008 |
| No OTP codes, session tokens, full phone numbers or AI prompts in logs or analytics `[DERIVED]`. | packages/platform logger, M1, M7, M19 | BP §29 | SEC-AUTH-001..008, SEC-BASE-002 |

---

## 8. Security baseline (BP §29 → SEC-BASE-001..012)

| ID | BP §29 bullet (verbatim) | Control | How it is verified |
|---|---|---|---|
| SEC-BASE-001 | Use encrypted network communication for all app/API traffic. | HTTPS only (BP §34). Release Android builds disallow cleartext; API not served on plain HTTP; admin with HSTS. | Manifest check (`usesCleartextTraffic=false`); infra check that HTTP is refused/redirected; A15 review. |
| SEC-BASE-002 | Use secure authentication and session storage. | Phone OTP for customers/providers via `AuthProvider`/`OtpSender` (D-002); no passwords stored. Mobile tokens in OS-backed secure storage (Android Keystore-backed), never plain app storage. Admin session cookie `HttpOnly`, `Secure`, `SameSite`. Sessions expire and are revocable (BP §27). Admin strong auth + MFA (D-002). | Unit/API tests: expired/revoked token → 401; admin login without MFA refused. Code review of token storage. Log scan: no OTP/token values. |
| SEC-BASE-003 | Enforce server-side authorization for every protected action. | Deny-by-default guard on every controller; ownership checks (customer owns booking, provider assigned to booking). | API tests per endpoint × role (customer, other customer, provider, other provider, each admin sub-role); unauthenticated → 401, wrong actor → 403/404. |
| SEC-BASE-004 | Apply least privilege to admin and provider roles. | Eight admin sub-roles (BP §8.4) with the permission matrix in M1; providers act only on their own offers/bookings/ledger. | RBAC matrix test (each sub-role × each admin action); Playwright admin tests for hidden + server-refused actions. |
| SEC-BASE-005 | Validate all inputs on the server. | Request schemas generated from `contracts/`; closed schemas (unknown fields rejected); server-side type/size/duration validation of media at finalize (ARCH §11). | Contract tests; fuzz/negative API tests; upload with wrong type/oversize rejected. |
| SEC-BASE-006 | Rate-limit login, OTP, messaging and abuse-prone endpoints. | Rate limits on OTP send/resend, OTP verify attempts, login, chat send, request creation, review creation, "Pay company" submissions. All limit values from config, `TODO(OWNER)` (§11). | API tests that exceed a configured test limit → 429; config keys exist and are null-seeded in production config. |
| SEC-BASE-007 | Do not trust prices, permissions or booking status sent by the mobile app. | Server computes price, amount, commission, status, role, verified flag and ledger rows; clients only *request* transitions (BP §15.1). A provider can record `CASH` only for a booking with no confirmed digital payment (ARCH §6.8). | IMPL §7.3 A items 1, 2, 14; API tests sending `status`, `price`, `amount`, `role`, `verified`, ledger fields → rejected/ignored. |
| SEC-BASE-008 | Use secure secrets management; never embed private API keys in the app. | Secret manager / env (BP §34); only `.env.example` with fake values in git. Mobile Google Maps key restricted to the app package + signing certificate and to the needed APIs; server-only keys (Routes/Geocoding when called server-side, SMS, LLM, gateway) never shipped in a bundle; admin web key restricted by HTTP referrer (BP §74 "API-key restrictions"). AI prompts stay server-side. | CI secret scanner (IMPL §7.4); bundle scan for key patterns and prompt text; IMPL §7.3 C item 5. |
| SEC-BASE-009 | Protect payment data through the chosen payment provider; do not handle raw card data unnecessarily. | Gateway is `[OPEN]` (D-008) → interface + fake. No card number / CVV fields in any contract or table. | Contract/schema grep; A15 review of M11 contracts. |
| SEC-BASE-010 | Keep audit logs for important admin and financial actions. | M18 append-only audit (actor/action/object/before/after); ledger rows append-only, corrections as reversals (BP §26); DB role used by the app has no `UPDATE`/`DELETE` on audit and ledger tables `[DERIVED]`. | IMPL §7.3 B item 2; migration review; test that update/delete on these tables fails. |
| SEC-BASE-011 | Separate development, testing and production environments. | dev / staging / prod with separate databases, buckets, keys and secrets (BP §34; ARCH §16). | Infra review; no prod secrets in dev/staging config. |
| SEC-BASE-012 | Have a documented backup and recovery plan. | Automated backups + tested restoration (BP §34). RPO/RTO `TODO(OWNER)` (D-012). | Restore drill evidence before pilot gate. |

---

## 9. Threat model v1

### 9.1 BP §30 table (→ ABUSE-001..010, table order)

| ID | Risk | BP basic protection (verbatim) | Enforced in (ARCH §4) | How it will be tested |
|---|---|---|---|---|
| ABUSE-001 | Fake provider | Verification, moderation, review history, complaints. | M3 Trust (verification levels, risk-proportional checks; only team leader verified, D-018), M12 Reviews, M16 Support | Unverified provider cannot be matched for a category whose `verification required` flag is set; verification state changes only by Risk/Trust role, audited; complaint links to provider record. |
| ABUSE-002 | Fake customer | Phone/email verification, rate limits, abuse monitoring. | M1 Identity (phone OTP, D-002), rate limits (SEC-BASE-006), M19 Analytics/M17 health views | Request creation without verified phone → refused; rate-limit test; abuse signals visible to Risk/Trust. |
| ABUSE-003 | Spam requests | Request limits and behavior rules. | M7 Intake, M1 rate limits; values from config `TODO(OWNER)` | API test above configured limit → 429; config keys exist. |
| ABUSE-004 | Fake review | Review tied to completed job. | M12 Reviews (only from completed eligible bookings, BP §19) | IMPL §7.3 A item 4: review without completed eligible booking → refused; second review for same booking → refused. Moderated/deleted reviews excluded from rating enforcement (D-014). |
| ABUSE-005 | Price manipulation | Server-side quote and approval states; audit history. | M10 Quotes & Fare (proposed/approved/rejected/final), M11 Payments, M18 Audit | IMPL §7.3 A items 1 and 3: client-sent price ignored; `Proposed` line cannot reach payment; every fare change audited; crew size never read by pricing (D-018). |
| ABUSE-006 | Off-platform leakage | Controlled contact, terms and reporting; do not over-restrict legitimate communication. | M13 Communication (masked/relay calling via `CallRelay`, in-app chat), M7/M8 response shaping (no PII pre-match), M16 Support | API test: pre-match provider views contain no customer phone/exact address (IMPL §7.3 C item 3); report action exists in chat. |
| ABUSE-007 | Payment fraud | Payment-provider checks, transaction reconciliation, risk flags. | M11 Payments & Settlement (gateway interface + fake, reconciliation, idempotent initiation), M18 Audit | Double-submit → one payment (IMPL §7.3 B item 1); digital payment confirmed only by gateway callback, never by client; reconciliation mismatch raises a risk flag. See also KK-T1, KK-T2. |
| ABUSE-008 | Harassment | Block/report tools, moderation and support escalation. | M13 Communication, M12 Reviews (flag/report), M16 Support (L1–L5 escalation) | Block stops messages both ways; report creates a ticket visible to Support/Risk; reported content preserved for review. |
| ABUSE-009 | Account takeover | Strong authentication, suspicious-login detection, session revocation. | M1 Identity (OTP attempt + resend limits, session list + revoke, admin MFA) | OTP brute-force test hits attempt limit; revoke-all logs out other devices; admin without MFA refused. See KK-T3. |
| ABUSE-010 | Admin abuse | Role separation, logs, limited permissions and review of sensitive changes. | M1 Identity (eight sub-roles, BP §8.4), M17 Admin Ops & Config (audited config), M18 Audit | RBAC matrix test; every config/financial/verification change produces an audit row; matching override without audit impossible (IMPL §7.3 A item 15). |

### 9.2 Kaam Karo-specific threats created by owner decisions

These are threat labels, not requirement IDs. They map to existing requirement IDs from IMPL §5.

| Label | Threat | Created by | Control | Enforced in | Test | Requirement IDs |
|---|---|---|---|---|---|---|
| KK-T1 | Provider records `CASH` falsely (on a booking the customer paid digitally), records a payment twice, or records CASH when the customer paid nothing | D-016 | `CASH` allowed only if no confirmed digital payment; payment method recorded once per booking; each cash job debited exactly once; customer completion screen shows "Paid by" so a wrong entry can be disputed (ARCH §6.8 `[INTERPRETATION]`, D-022). | M11 Payments, M9 Booking | IMPL §7.3 A item 14: record CASH after gateway-confirmed payment → refused; record twice → refused; exactly one debit row per cash job. | LEDGER-001..007 |
| KK-T2 | Fake "Pay company" transaction ID or doctored screenshot to clear the unpaid-commission block | D-020, D-021 | The worker's own claim never clears the block; only a Finance-approved (audited, with reason) or gateway-confirmed credit clears it. Screenshot private, signed-URL access by Finance only. Finance verifies against the company account. Duplicate transaction IDs flagged `[DERIVED]`. | M11 Payments, M17/M13 admin A09 queue, M14 Media, M18 Audit | Submission alone leaves balance < 0 and provider still blocked; only Finance-role approval writes the credit; Support role cannot approve; reject requires reason. | LEDGER-PAY-001..007, LEDGER-NEG-001..006 |
| KK-T3 | OTP brute force / SIM-swap-style account takeover via phone-only login | D-002 | OTP rate limits, resend limits, verify-attempt limits, expiry; session revocation; controlled account recovery with abuse protection (BP §27); suspicious-login detection (BP §30). All values `TODO(OWNER)`. OTP never logged. | M1 Identity, `OtpSender` (fake, D-009) | Exceed attempts → locked per config; expired OTP refused; log scan shows no OTP; new-device login visible in session list and revocable. | SEC-AUTH-001..008 |
| KK-T4 | Blocked (unpaid-commission) provider bypasses the block via another path (Favorites rebook, voice assistant, admin override, starting an already-accepted job) | D-020, D-021 | Eligibility checked server-side on match, accept, quote, rebook and start transitions (`UNPAID_COMMISSION`). | M8 Matching, M9 Booking, M11 | IMPL §7.3 A item 15; transitions `Scheduled → Provider En Route` and `Arrived → In Progress` refused while balance < 0. | LEDGER-NEG-001..006 |

AI-related guards (closed schema, catalog-ID validation, no prices, no committing actions, moderation hook — BP §67, §77.3; REQ-AI-001..012, VOICE-001..008) are reviewed by A15 under §10 but are not threats in the BP §30 table; they are listed here only as a review trigger.

---

## 10. Review triggers (A15 review required)

| Change touches | Examples |
|---|---|
| Auth / OTP / sessions | `AuthProvider`, `OtpSender`, login, MFA, session expiry/revocation, recovery, blocked accounts (SEC-AUTH-*) |
| Money / ledger | Payments, refunds, settlements, commission, CASH/DIGITAL recording, "Pay company", Finance approval (PAY-*, COMM-*, LEDGER-*) |
| PII exposure | Any API response that includes phone, address, name, location, or pre-match job data; share payloads; analytics/logging fields |
| Permissions | Any change to `app.json`/`app.config`, Expo plugins, native modules, or the merged manifest; any new prompt or trigger point |
| Authorization / roles | Guards, RBAC matrix, admin sub-roles, overrides |
| AI / voice | Prompts, output schemas, catalog-ID validation, moderation hook, any assistant action |
| Media | Upload sessions, signed URLs, bucket policy, retention, attachment validation |
| Secrets / keys | New env vars, API keys, key restrictions, CI secret-scan config |
| Audit | Audit/ledger table migrations or DB grants |

---

## 11. Open items (no guessed values)

| Item | Status | Reference |
|---|---|---|
| Attachment / media size, type, bitrate, duration maxima and retention | `TODO(OWNER)` | D-011, ARCH K-11, OQ-004 |
| OTP rate limit, resend limit, verify-attempt limit, OTP expiry, lockout duration | `TODO(OWNER)` | D-002, BP §29; proposed OQ-P6 |
| Request, chat and review rate limits | `TODO(OWNER)` | BP §29, §30; proposed OQ-P6 |
| Masked/relay calling vendor | `[OPEN]` → `CallRelay` + fake | D-009, OQ-002 |
| SMS/OTP vendor | `[OPEN]` → `OtpSender` + fake | D-009, OQ-002 |
| Payment gateway / payout | `[OPEN]` → interface + fake | D-008, OQ-001 |
| Finance verification time limit for "Pay company" | `TODO(OWNER)` | D-022, OQ-007 |
| Whether the customer confirms the recorded payment method | `TODO(OWNER)` | D-022, OQ-007 |
| RPO / RTO | `TODO(OWNER)` | D-012, OQ-005 |
| Problem-video audio, partner microphone, live provider location, partner notification moment, post-match reveal | Proposed OQ-P1..P5 (§12) | — |

---

## 12. Proposed open questions (for A00 to add to `coordination/OPEN_QUESTIONS.md`)

| Proposed | Question | Default until answered |
|---|---|---|
| OQ-P1 | Does the customer's 30-second problem video (BP §76.2) record sound (e.g. "noisy appliance")? If yes, microphone is requested at the video-record tap. | Request mic at the video-record tap only if sound is recorded; video without sound otherwise. |
| OQ-P2 | Does the Partner app need microphone at launch (provider evidence videos with sound)? BP §74 lists provider voice replies as "optional future". | No `RECORD_AUDIO` in the Partner app. |
| OQ-P3 | Is live provider location shared with the customer while "on the way" (BP §80) at launch, or only status + ETA from the navigation hand-off? | No live sharing; no foreground-service location. |
| OQ-P4 | When does the Partner app ask for notification permission (e.g. after onboarding / when going available)? BP §75 item 96 gives only the customer example. | After the provider finishes onboarding and before going available, with a value pre-prompt. |
| OQ-P5 | Exact moment the provider receives the customer's exact address and contact route (customer chooses provider = D-005, or booking confirmed), the pre-match location granularity, and whether access ends after completion. | Reveal only after the customer chooses the provider and the booking is confirmed; pre-match = area + distance only. |
| OQ-P6 | OTP and abuse rate-limit values (send, resend, verify attempts, expiry, lockout; request/chat/review limits). | Config keys seeded `null` + `TODO(OWNER)`. |

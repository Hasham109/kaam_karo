# Customer App — Screen specs C01–C42

> Task **T1.1** (owner A11 + A00). Spec only — no code. Version 1, 2026-10-23.
> Acceptance (IMPL §6 Phase 1): every screen has all 5 states defined. Requirement: UX-SCREEN-001, UX-SCREEN-003.

## 0. Sources used

| Source | Used for |
|---|---|
| `coordination/DECISIONS.md` (highest authority) | D-002 OTP login, D-003/D-023 pay at end only, D-004/D-018 crew size, D-005 customer chooses, D-006/D-015/D-016 commission + "Paid by", D-007/D-019 Lahore, D-024 service families, D-025 no customer platform fee, D-028 Quote Pending, D-029 separate tax line |
| `docs/BLUEPRINT.md` | §9 journey, §12 C01–C30, §15–§24, §27–§31, §37–§38, §45; v0.3 §52–§62, §64, §67; v0.4 §74–§82, §85, §86. Later layers win |
| `docs/architecture.md` | §3.1 (derived screens C31–C42, K-06), §5.5, §5.6, §6.1–§6.3, §6.6, §6.8, §7, §8, §10–§13, §15 |
| `docs/requirements/REQUIREMENTS.md` | Requirement IDs (none created here) |
| `docs/security/permission-policy.md` (T0.4) | Permission rows M-01…M-11, just-in-time rules |
| `coordination/OPEN_QUESTIONS.md` | Existing OQ-006…OQ-038; new OQ-039…OQ-050 raised by this task |

Screen IDs and names: C01–C30 exactly as BP §12 (C03/C04 adjusted by D-002, ARCH §3.1). C31–C42 exactly as ARCH §3.1 (derived from BP §55–§79, conflict K-06). No other screen is defined.

## 1. Legend

### 1.1 The 5 states (BP §45, §31.1; UX-SCREEN-003)

| Code | State | Meaning in this file |
|---|---|---|
| **L** | Loading | First fetch or an action in flight. Skeleton or spinner plus honest text. Buttons that would repeat the action are disabled (REL-003). |
| **E** | Empty | The server answered successfully with nothing to show. Always explains why and offers a next step (BP §61.3 spirit; A11Y-005). |
| **S** | Success | The server answered and confirmed. Success copy for an action is shown **only after the server confirms** (REL-005, BP §31.1). |
| **X** | Error | The server refused or the call failed with a known result. Shows what to do next (A11Y-005); never a blank screen (REL-001). |
| **P** | Pending / unknown | A request was sent but the result is not known (timeout, connection lost after sending, gateway still processing). The app never guesses: it shows a pending state, blocks repeating the action, and reconciles with the server (REL-006, ARCH §8 rule 6). |

### 1.2 Column conventions

- **Source** column: `BP §n`, `D-xxx`, `ARCH §n`, requirement ID, or `OQ-nnn`. An element without a source is not in this file.
- **"Requests from server"**: what the app sends. The app sends intent only (`serviceId`, `quoteId`, `transition`); the server computes status, amounts and permissions (BP §15.1, §29; ARCH §8 rule 2; SEC-BASE-007).
- **UR labels are DRAFT.** All Urdu text in this file is a working draft by A11. It must be reviewed by A14 and a native reviewer in T1.4 before use. Final strings live only in `packages/i18n` (I18N-006); this file does not define i18n keys.
- `configurable (TODO(OWNER))` = the value lives in config and the owner has not decided it. The app reads it from the server.
- Shared copy is referenced by code, e.g. `G-NET`. See §2.10.

## 2. Global patterns (apply to every screen; screens only list exceptions)

### 2.1 Server-driven status and actions (BP §15.1, §29; BOOK-STATUS-016, SEC-BASE-007)
- The app never sets or infers a booking, request, quote, fare-line or payment status. It shows the latest status returned by the server.
- Booking action buttons are rendered **only** from the booking's `allowedNextActions` returned by the server. If an action is not in the list, its button is not shown.
- The app never computes a price, total, tax, discount, commission or fee. Every amount and every total is displayed exactly as the server returns it (PRICE-007, COMM-004).
- A `409 TRANSITION_NOT_ALLOWED` (status changed meanwhile) → reload the object and show `G-CHANGED`.

### 2.2 Network: timeout, retry, offline (BP §31.1, §38, §62.3; REL-001…007, PERF-006, A11Y-007)
- Every network call has a timeout. The timeout values are performance budgets: configurable (TODO(OWNER)), D-012 / OQ-005.
- **Reads** (GET) may retry automatically a limited number of times, then show **X** with a Retry button (REL-002, REL-007).
- **Writes** (create booking, submit request, accept quote, approve charge, initiate payment, and every state transition) carry an idempotency key (REL-008, ARCH §8 rule 3). They are **never** auto-retried unless the endpoint is idempotent; a manual retry reuses the same key so a repeated tap returns the original result (REL-003).
- **Offline banner**: when the device has no connection, a non-blocking banner (`G-OFFLINE`) shows on top of the current screen; already loaded content stays visible with `G-STALE`; write buttons are disabled with a short reason.
- **Pending/unknown (P)**: when a write times out or the connection drops after sending: show `G-PENDING` with a "Check again" button; the app re-reads the object (same idempotency key) until the server gives a final answer; the original button stays disabled meanwhile. Final answer success → **S**; final answer failure → `G-NOT-DONE` + Retry.
- Heavy images and maps load progressively; text first (PERF-005).
- No AI, map, media or third-party call may freeze a screen; each has a fallback (PERF-006): AI → normal form C12 (REQ-AI-012); Maps → manual address (LOC-GEO-006); speech → text input (VOICE-005); media upload → draft kept + retry (MEDIA-009).

### 2.3 Drafts (BP §31.1, §76.2; REL-004, MEDIA-009)
- Important forms (C12, C31–C34, C21, C28, C29) save a safe local draft. If the app is killed or upload fails, the draft is restored on reopen.
- A local draft is never shown as "submitted". Only a server-confirmed submit changes the label.

### 2.4 Session and account errors (BP §27; SEC-AUTH-002, SEC-AUTH-006)
- `401` (session expired/revoked) → go to C03 with `G-SESSION`; the draft is kept and restored after login.
- `ACCOUNT_BLOCKED` → `G-BLOCKED`; no protected action is possible.
- `429` (rate limit) → `G-RATE` (SEC-BASE-006). Limits are configurable (TODO(OWNER)), OQ-028.
- `LIMIT_REACHED` (customer open-request limit) → `G-LIMIT`. Limit configurable (TODO(OWNER)), OQ-017, CFG-RULE-008.
- **Reason codes, never server text (SEC-REVIEW #11; COMM-004, MATCH-ELIG-078, BP §17, §29).** Whenever a screen explains a refusal or a situation, it shows only copy mapped in `packages/i18n` from an **allow-listed reason code** in the contract. Free text from the server is never rendered. An unknown or missing code shows the screen's generic copy. Provider-standing codes (`UNPAID_COMMISSION`, `LOW_RATING`, safety/dispute blocks) must never reach the customer API; the customer contract returns the generic `PROVIDER_UNAVAILABLE` instead (request to contract owners: RQ-004 item 5). The code names listed per screen below are proposals for the contract owners; final names come from `contracts/`.

### 2.5 Permission on tap (BP §28, §74, §75 items 93–98; PERM-001…006; permission-policy §2–§3)
- **No permission prompt at install, splash, welcome, login or onboarding.**
- Sequence for every permission: user taps the feature → short in-context explanation (pre-prompt) with "Continue" and "Not now" → Android system prompt → on grant, the feature runs → on denial, the fallback opens immediately → on "don't ask again", the fallback plus at most an "Open settings" link, never a dead end.

| Permission | Asked only when (trigger) | Pre-prompt copy | Fallback | Source |
|---|---|---|---|---|
| Location (foreground; coarse or fine) | Only on a tap of "Use current location" (C39, also reachable from C06). Never on simply opening C39 or any other screen (tap-only, SEC-REVIEW #19) | `G-PERM-LOC` | Search, map pin, saved address, manual entry (C39) | §57.1, §75 item 93; M-04; PERM-001, LOC-GEO-001 |
| Camera | Tap "Take photo" (C31) or "Record video" (C33) | `G-PERM-CAM` | System photo picker; skip (photos optional) | §75 item 94, §76.3; M-01; PERM-002 |
| Microphone | Tap "Record audio note" (C32) or the push-to-talk button (C38). Video sound: OQ-023 | `G-PERM-MIC-NOTE` / `G-PERM-MIC-VOICE` | Typing; photos | §75 item 95, §77.4; M-02; PERM-003 |
| Photos/videos | Tap "Choose from gallery" — Android **system photo picker**, no runtime permission | — | Camera or skip | §75 item 97; M-03; PERM-005, MEDIA-008 |
| Documents | Tap "Attach document" (optional) — system document picker | — | Skip | §74; M-11; PERM-005 |
| Notifications (Android 13+) | After the first booking/request is server-confirmed (C15), never before | `G-PERM-NOTIF` | In-app status (C17, C22, C26) still updates | §75 item 96, §80; M-06; PERM-004, NOTIF-010 |
| Phone call | Tap "Call" on an active booking (C17/C18/C19); masked relay via `CallRelay` (fake until D-009); dialer intent only | — | In-app chat (C18) | §20, §74; M-07; CHAT-002, CHAT-004 |
| Share | Tap "Share" — Android `ACTION_SEND`, no permission | — | — | §82; M-08; SHARE-001 |

Never requested: contacts, call logs, calendar, Bluetooth, background location, broad storage/media (BP §75 item 98; PERM-006).

### 2.6 RTL mirroring and Urdu typography (BP §78.2; I18N-001…008)
- In `ur`, the whole layout mirrors: text alignment, icons with direction (back/forward arrows, chevrons), order of controls in rows, bottom sheets, progress/timelines, tab order, swipe direction (I18N-003).
- Not mirrored: media playback controls' time direction, phone numbers, amounts' digits, map content.
- Urdu font: Noto Nastaliq Urdu (candidate, final after T0.6 / T1.4); generous line height; no clipped marks; tested on small screens (I18N-004, I18N-008; D-027 + emulator E-MIN, OQ-034).
- No careless mixing of Urdu and English in one label (I18N-005). Service and category names come from the backend in the user's language (I18N-006, CAT-SVC-012).
- Language follows C41 / device language; changing it applies immediately without restart (I18N-002).

### 2.7 Money, dates and numbers (BP §37; I18N-007)
- Amounts are PKR. The server sends every amount; the app formats only (formatter in `packages/i18n`, owner A14). Example display: EN `Rs. 3,800`; UR DRAFT `3,800 روپے`. Digit style and symbol position in Urdu: A14 decides in T1.4.
- Price-model labels (CAT-SVC-001, BP §4.1, §17): FIXED → EN `Rs. {amount}` / UR `{amount} روپے`; FROM → EN `From Rs. {amount}` / UR `{amount} روپے سے شروع`; INSPECTION_QUOTE → EN `Price after inspection` / UR `قیمت معائنے کے بعد`.
- Pricing unit (CAT-SVC-009): EN `per {unit}` / UR `فی {unit}`; unit names come from the server.
- Dates/times: local Pakistan conventions, formatted by `packages/i18n`.
- **Customer bill lines** (BP §58.1; FARE-001…012): each line shows type, description, quantity/unit where given, amount and state (Proposed / Approved / Rejected / Final) exactly as the server returns. A **separate tax line** is always shown on the bill (D-029, FARE-010; type/rate open OQ-035 — while not set the server returns it as Rs. 0). **No customer platform-fee line** ever (D-025, FARE-009). No commission is shown to the customer (COMM-004).

### 2.8 Booking status labels (BP §15; ARCH §6.1; A11Y-003)
Status chips always have text (and an icon), never colour alone.

| Server status | EN label | UR label (DRAFT) |
|---|---|---|
| Draft | Draft | مسودہ |
| Requested | Request sent | درخواست بھیج دی گئی |
| Quote Pending | Waiting for price | قیمت کا انتظار |
| Quoted | Price received | قیمت موصول ہو گئی |
| Accepted | Accepted | قبول ہو گئی |
| Scheduled | Scheduled | وقت طے ہو گیا |
| Provider En Route | Provider on the way | کاریگر راستے میں ہے |
| Arrived | Provider has arrived | کاریگر پہنچ گیا ہے |
| In Progress | Work in progress | کام جاری ہے |
| Awaiting Approval | Your approval needed | آپ کی منظوری درکار ہے |
| Completed | Completed | کام مکمل ہو گیا |
| Disputed | Issue under review | شکایت زیرِ غور ہے |
| Cancelled | Cancelled | منسوخ |
| Expired | Expired | میعاد ختم |
| Closed | Closed | بند |
| Rejected (ARCH §6.1 note 2) | Not accepted | قبول نہیں ہوئی |
| No-show (ARCH §6.1 note 2) | No-show | حاضر نہیں ہوا |

### 2.9 Voice, confirmation and sharing (BP §56.3, §77, §82)
- The voice overlay C38 can be opened from C06, C07, C08, C09, C31, C34, C35 and C17 (BP §77.3 actions: navigate, search, draft, location, preferences, read summaries, explain, open support).
- **Confirmation dialog** (VOICE-007; BP §56.3, §77.3): placing a booking, accepting a quote, paying, cancelling a job and submitting a complaint always show a confirm dialog with the exact object and amount from the server — whether started by tap or voice. Nothing is sent before "Confirm".
- **Share** (SHARE-001): the share text is built by the server from allowed fields and contains no phone number or exact address (permission-policy §6). Commercial actions never happen through a shared link (SHARE-003).

### 2.10 Shared copy (DRAFT Urdu)

| Code | EN | UR (DRAFT) |
|---|---|---|
| G-LOADING | Loading… | لوڈ ہو رہا ہے… |
| G-SENDING | Sending… | بھیجا جا رہا ہے… |
| G-OFFLINE | No internet connection. Showing what was loaded before. | انٹرنیٹ کنکشن نہیں ہے۔ پہلے سے لوڈ شدہ معلومات دکھائی جا رہی ہیں۔ |
| G-STALE | Couldn't refresh. Showing details from {time}. | تازہ نہیں ہو سکا۔ {time} کی معلومات دکھائی جا رہی ہیں۔ |
| G-NET | Couldn't connect. Check your internet and try again. | رابطہ نہیں ہو سکا۔ اپنا انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔ |
| G-TIMEOUT | This is taking too long. Please try again. | اس میں بہت دیر لگ رہی ہے۔ براہِ کرم دوبارہ کوشش کریں۔ |
| G-SERVER | Something went wrong on our side. Please try again in a moment. | ہماری طرف سے کوئی مسئلہ ہو گیا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔ |
| G-PENDING | We're checking whether this went through. Please don't repeat it. | ہم چیک کر رہے ہیں کہ یہ مکمل ہوا یا نہیں۔ براہِ کرم اسے دوبارہ نہ کریں۔ |
| G-NOT-DONE | It didn't go through. Nothing was changed. You can try again. | یہ مکمل نہیں ہوا۔ کچھ تبدیل نہیں ہوا۔ آپ دوبارہ کوشش کر سکتے ہیں۔ |
| G-CHANGED | This has changed in the meantime. We've loaded the latest details. | اس دوران تبدیلی ہو چکی ہے۔ ہم نے تازہ ترین تفصیلات دکھا دی ہیں۔ |
| G-SESSION | Please log in again. Your unsent details are saved. | براہِ کرم دوبارہ لاگ اِن کریں۔ آپ کی نہ بھیجی گئی معلومات محفوظ ہیں۔ |
| G-BLOCKED | Your account can't be used right now. Please contact Kaam Karo support. | آپ کا اکاؤنٹ ابھی استعمال نہیں ہو سکتا۔ براہِ کرم کام کرو سپورٹ سے رابطہ کریں۔ |
| G-RATE | Too many tries. Please wait a little and try again. | بہت زیادہ کوششیں ہو گئیں۔ تھوڑا انتظار کر کے دوبارہ کوشش کریں۔ |
| G-LIMIT | You have reached the limit of open requests. Finish or cancel one first. | آپ کی کھلی درخواستوں کی حد پوری ہو گئی ہے۔ پہلے کوئی ایک مکمل یا منسوخ کریں۔ |
| G-AI-DOWN | Smart help isn't available right now. You can use the simple form. | خودکار مدد ابھی دستیاب نہیں۔ آپ سادہ فارم استعمال کر سکتے ہیں۔ |
| G-MAPS-DOWN | The map isn't loading. Please type your address instead. | نقشہ نہیں کھل رہا۔ براہِ کرم اپنا پتہ لکھ دیں۔ |
| G-PERM-LOC | Allow location to suggest your area and find providers near you. You can also type your address. | اپنا علاقہ معلوم کرنے اور قریبی کاریگر ڈھونڈنے کے لیے لوکیشن کی اجازت دیں۔ آپ اپنا پتہ خود بھی لکھ سکتے ہیں۔ |
| G-PERM-CAM | Allow the camera so you can show the problem to the provider. | کیمرے کی اجازت دیں تاکہ آپ کاریگر کو مسئلہ دکھا سکیں۔ |
| G-PERM-MIC-NOTE | Allow the microphone to record your voice, so the provider understands the problem. | مائیکروفون کی اجازت دیں تاکہ آپ کی آواز ریکارڈ ہو اور کاریگر مسئلہ سمجھ سکے۔ |
| G-PERM-MIC-VOICE | Allow the microphone so the assistant can hear you. It listens only after you tap the mic. | مائیکروفون کی اجازت دیں تاکہ اسسٹنٹ آپ کی بات سن سکے۔ یہ صرف مائیک دبانے کے بعد سنتا ہے۔ |
| G-PERM-NOTIF | Turn on notifications to know when a price arrives, the provider accepts or is on the way, and about payments. | نوٹیفکیشن آن کریں تاکہ آپ کو پتا چلے کب قیمت آئی، کاریگر نے قبول کیا یا راستے میں ہے، اور ادائیگی کی خبر ملے۔ |
| G-PERM-DENIED | Permission is off. You can continue another way, or turn it on in Settings. | اجازت بند ہے۔ آپ دوسرے طریقے سے جاری رکھ سکتے ہیں، یا سیٹنگز میں جا کر آن کریں۔ |
| G-PAY-AT-END | You pay only after the job is completed. | آپ ادائیگی صرف کام مکمل ہونے کے بعد کریں گے۔ |
| G-LOGIN-NEEDED | Please log in to send your request. Your details are saved. | درخواست بھیجنے کے لیے لاگ اِن کریں۔ آپ کی معلومات محفوظ ہیں۔ |

| Button | EN | UR (DRAFT) |
|---|---|---|
| B-RETRY | Try again | دوبارہ کوشش کریں |
| B-CHECK | Check again | دوبارہ چیک کریں |
| B-CANCEL | Cancel | منسوخ کریں |
| B-CONFIRM | Confirm | تصدیق کریں |
| B-CONTINUE | Continue | جاری رکھیں |
| B-NOTNOW | Not now | ابھی نہیں |
| B-SETTINGS | Open settings | سیٹنگز کھولیں |
| B-BACK | Back | واپس |
| B-SAVE | Save | محفوظ کریں |
| B-CLOSE | Close | بند کریں |
| B-HELP | Get help | مدد حاصل کریں |

### 2.11 Accessibility (BP §38; A11Y-001…008)
- Every interactive element has an accessible label in en and ur and a stable `testID` (RQ-002 item 4) so one Maestro flow runs in both languages.
- Large tap targets and minimum text sizes from the UI kit (`packages/ui`, A14). Contrast from design tokens.
- Status never by colour alone (A11Y-003). Error messages always say what to do next (A11Y-005).
- Common fixed-price services can be booked from Home through C34/C14 without extra mandatory screens (A11Y-008, PERF-002).

### 2.12 Analytics hooks (BP §35, §45)
Screens that start a funnel step send an event through `AnalyticsSink` (ARCH §18): first open (C01), signup completed (C05), first search (C07), first service view (C10), first request (C34/C12 submit) — ANALYTICS-001, ANALYTICS-002. Events carry no phone number, OTP or address (permission-policy §7).

### 2.13 Guest browsing (BP §8.1, §12 C02; UX-SCREEN-005; OQ-008 default)
A guest may open C06–C11 and C41. Any submit (C12, C34), favorite (C11) or booking action opens C03 with `G-LOGIN-NEEDED`; the draft is kept.

---

## C01 Splash / app start

- **Purpose:** brand and loading; no business action (BP §12).
- **Entry:** app launch. **Exits:** C41 (first launch, no language chosen yet), C02 (no session), C06 (valid session).
- **Requirement IDs:** UX-SCREEN-001, UX-SCREEN-003, I18N-002, PERF-001, ANALYTICS-001.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| App name / logo | display | — | — | Kaam Karo | کام کرو | BP §12 C01; `app.customer.name` (T2.1) |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| (automatic) session check | — | — | Validate stored session (no business data) | BP §27; SEC-AUTH-002 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Logo + small progress indicator | — | — |
| E | Not applicable as data: no stored session → go to C02 (or C41 on first launch) | — | — |
| S | Session valid → C06 | — | — |
| X | Session check failed (network) → continue to C06 in offline mode with `G-OFFLINE` if a session token exists; else C02 | `G-OFFLINE` | `G-OFFLINE` |
| P | Session check timed out → same as X; app does not block on the splash (PERF-001) | `G-TIMEOUT` (banner on next screen) | `G-TIMEOUT` |

**Notes:** no permission requested (BP §75). No business action. A11y: the splash never blocks on network (PERF-001).

---

## C02 Welcome

- **Purpose:** value proposition + sign in / register / continue as guest (BP §12).
- **Entry:** C01, C41 (onboarding), sign-out. **Exits:** C03, C04, C06 (guest).
- **Requirement IDs:** UX-SCREEN-001, UX-SCREEN-005 (OQ-008), SEC-AUTH-001.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Value proposition | display text | — | — | Tell us what's wrong — talk, show or type. We'll find trusted help near you. | بتائیں کیا مسئلہ ہے — بول کر، دکھا کر یا لکھ کر۔ ہم آپ کے قریب بھروسے والی مدد ڈھونڈیں گے۔ | BP §12 C02, §52.1, §85 (copy final by A14/owner) |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Log in | Log in | لاگ اِن کریں | none (navigates to C03) | BP §12 C02; D-002 |
| Register | Create account | اکاؤنٹ بنائیں | none (navigates to C03: the same phone + OTP entry; details are asked in C04 after verification, SEC-REVIEW #9) | BP §12 C02; D-002 |
| Continue as guest | Continue as guest | بطور مہمان جاری رکھیں | none (C06 in guest mode) | BP §12 C02; UX-SCREEN-005 (OQ-008) |
| Change language | Language | زبان | none (opens C41) | BP §78.1 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Not applicable: static screen, no network call | — | — |
| E | Not applicable: content bundled | — | — |
| S | Screen shown with three buttons | as above | as above |
| X | Not applicable: no network call; offline banner shown if no connection (login will need network) | `G-OFFLINE` | `G-OFFLINE` |
| P | Not applicable: no write action | — | — |

**Notes:** no permission. No business action.

---

## C03 Login

- **Purpose:** the single entry for login **and** sign-up: phone number → OTP (D-002; ARCH §3.1). No password anywhere (UX-SCREEN-004). The screen never reveals whether a number is registered (SEC-REVIEW-T1.1-1.3 #9). Registration details are asked only **after** the OTP is verified (C04).
- **Entry:** C02 ("Log in" and "Create account" both open this screen), any `401` (§2.4), guest submit (§2.13). **Exits:** C05 (after the server accepts the send request), C02 (back).
- **Requirement IDs:** SEC-AUTH-001, SEC-AUTH-004, SEC-AUTH-006, UX-SCREEN-004, ABUSE-002, ABUSE-009.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Country code | display | "+92" shown (OQ-040) | — | +92 | +92 | D-002; OQ-040 |
| Mobile number | phone (numeric keypad, LTR even in `ur`) | non-empty, digits only on device; real format check by server (OQ-040) | Y | Mobile number | موبائل نمبر | BP §12 C03; D-002 |
| Heading | display (same for new and existing users) | — | — | Enter your mobile number to continue | جاری رکھنے کے لیے اپنا موبائل نمبر لکھیں | D-002; SEC-REVIEW #9 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Send code | Send code | کوڈ بھیجیں | Request OTP for this number. The server answers the same way for registered and unregistered numbers (rate-limited server-side; resend cooldown from server) | D-002; SEC-AUTH-001, SEC-AUTH-004; ABUSE-009; SEC-REVIEW #9 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Button spinner, field locked | `G-SENDING` | `G-SENDING` |
| E | Empty field: Send disabled | Enter your mobile number. | اپنا موبائل نمبر لکھیں۔ |
| S | Server accepts the request → C05. The same message for every valid number, registered or not | We sent a code to {number}. | ہم نے {number} پر کوڈ بھیج دیا ہے۔ |
| X | Invalid number format (422) / 429 only. No "not registered", "already registered" or "blocked" message here, because each would reveal the account | Invalid: "This number doesn't look right. Please check it." 429: `G-RATE` | غلط: "یہ نمبر درست نہیں لگتا۔ براہِ کرم چیک کریں۔" / `G-RATE` |
| P | Request timed out: do not say "sent"; show B-CHECK and allow going to C05 only after the server confirms or the cooldown ends | We're not sure the code was sent. Wait a moment, then try again. | ہمیں یقین نہیں کہ کوڈ بھیجا گیا۔ تھوڑا انتظار کریں، پھر دوبارہ کوشش کریں۔ |

**Notes:** no permission (SMS auto-read is not requested; the code is typed). No account state is revealed before the OTP is verified (A15 ruling, SEC-REVIEW #9). `ACCOUNT_BLOCKED` is shown only after verification (C05). OTP limits: OQ-028. Identity contract (A02, T2.4/T3.1): the send-OTP response must not differ by registration state.

---

## C04 Register

- **Purpose:** new-user details **after** OTP verification: name, city/area, terms (BP §12 C04 as changed by D-002, ARCH §3.1; SEC-REVIEW #9). The phone number is already verified and is shown read-only. Email is optional profile data only, if kept at all (OQ-012).
- **Entry:** only from C05, when the server's verify response says `isNewUser = true`. **Exits:** C06 (or the screen that required login, with the draft restored).
- **Requirement IDs:** SEC-AUTH-001, UX-SCREEN-004 (OQ-012), SCOPE-GEO-001, SCOPE-GEO-002, ABUSE-002, ANALYTICS-001.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Mobile number | display (verified) | — | — | Mobile number (verified) | موبائل نمبر (تصدیق شدہ) | BP §12 C04; D-002 |
| Full name | text | non-empty; length limit from server | Y | Your name | آپ کا نام | BP §12 C04 |
| City | single choice from server list of listed cities; inactive cities marked | must be a listed city | Y (OQ-040) | City | شہر | BP §12 C04, §57.2; SCOPE-GEO-001/002 |
| Area | text or place suggestion | optional (OQ-040) | N | Area (optional) | علاقہ (اختیاری) | BP §12 C04; OQ-040 |
| Email | email | format check; optional; never used for login | N | Email (optional) | ای میل (اختیاری) | BP §12 C04; ARCH §3.1; OQ-012 — **hidden until OQ-012 is answered** |
| Accept terms | checkbox + link | must be checked | Y | I agree to the Terms and Privacy Policy | میں شرائط اور پرائیویسی پالیسی سے متفق ہوں | BP §12 C04; OQ-039 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Create account | Create account | اکاؤنٹ بنائیں | Complete registration for the verified number (server validates every field and stores the accepted terms version). The account exists only after this call succeeds | BP §12 C04; D-002; SEC-BASE-005; SEC-REVIEW #9 |
| Open terms | Terms | شرائط | Opens `legal.terms_url` (config, TODO(OWNER)) | OQ-039 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | City list loading: skeleton; submit: button spinner | `G-LOADING` / `G-SENDING` | `G-LOADING` / `G-SENDING` |
| E | City list empty (should not happen; Lahore is seeded): show error with retry | We couldn't load cities. | شہروں کی فہرست لوڈ نہیں ہو سکی۔ + B-RETRY |
| S | Server confirms the account → C06; signup event (ANALYTICS-001) | Welcome to Kaam Karo! | کام کرو میں خوش آمدید! |
| X | Field errors (422) inline; verification session expired (401) → back to C03 with `G-SESSION` | Field message / `G-SESSION` | Field message / `G-SESSION` |
| P | Create timed out: B-CHECK (idempotent); no welcome message until the server confirms | `G-PENDING` | `G-PENDING` |

**Notes:** selecting an inactive (listed) city is allowed; the catalog will show "not active yet" (SCOPE-GEO-001). Copy for inactive city: EN "Kaam Karo is not active in {city} yet." / UR "کام کرو ابھی {city} میں فعال نہیں ہے۔". No location permission here (the city is chosen, not detected). An unverified number can never start a registration (SEC-REVIEW #9). Open: OQ-039, OQ-040, OQ-012.

---

## C05 OTP verification

- **Purpose:** code verification and retry controls (BP §12). Used in four modes, named in the heading: **login/sign-up** (from C03); **change number — current number** and **change number — new number** (C25, SEC-REVIEW #3); **confirm account deletion** (C30, SEC-REVIEW #10).
- **Entry:** C03, C25, C30. **Exits:** login mode → C04 when the server says `isNewUser = true`, else C06 (or the screen that required login, with the draft restored); change-number modes → next step / C25; deletion mode → C30 confirmation; C03 ("Change number" in login mode).
- **Requirement IDs:** SEC-AUTH-001, SEC-AUTH-002, SEC-AUTH-004, SEC-AUTH-006, SEC-AUTH-008, SEC-BASE-002, ABUSE-009.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Mode heading | display | — | — | Log in or sign up / Confirm it's you (current number) / Verify your new number / Confirm account deletion | لاگ اِن یا سائن اپ / تصدیق کریں کہ یہ آپ ہیں (موجودہ نمبر) / اپنے نئے نمبر کی تصدیق کریں / اکاؤنٹ حذف کرنے کی تصدیق کریں | D-002; SEC-REVIEW #3, #10 |
| Code | numeric code input (LTR) | digits only; length from server (OQ-040) | Y | Enter the code we sent to {number} | {number} پر بھیجا گیا کوڈ لکھیں | BP §12 C05; D-002 |
| Resend timer | display | seconds remaining from server (cooldown configurable, TODO(OWNER), OQ-028) | — | You can resend in {s} s | آپ {s} سیکنڈ بعد دوبارہ بھیج سکتے ہیں | BP §12 C05 ("retry controls"); SEC-AUTH-004 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Verify | Verify | تصدیق کریں | Verify the OTP for this mode. Login mode → the server returns a session (secure storage only, SEC-BASE-002) and `isNewUser`. Other modes → the server returns a short-lived proof for that one action | D-002; SEC-AUTH-001 |
| Resend code | Resend code | کوڈ دوبارہ بھیجیں | Request a new OTP (enabled only when the server cooldown ends) | BP §12 C05; SEC-AUTH-004 |
| Change number (login mode only) | Change number | نمبر تبدیل کریں | none (back to C03) | BP §12 C05 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Verifying: input locked, spinner | Checking the code… | کوڈ چیک ہو رہا ہے… |
| E | No code typed: Verify disabled | — | — |
| S | Server confirms → next screen for the mode (login: C04 if new user, else C06) | — (C04/C06 show the welcome) | — |
| X | Wrong code (attempts left from server) / code expired / attempts exhausted (code invalidated) / 429 / `ACCOUNT_BLOCKED` (login mode, shown only after a correct code) | Wrong: "That code is not correct. {n} tries left." Expired: "This code has expired. Send a new one." Exhausted: "Too many wrong tries. Please request a new code." Blocked: `G-BLOCKED` | غلط: "یہ کوڈ درست نہیں۔ {n} کوششیں باقی ہیں۔" میعاد ختم: "اس کوڈ کی میعاد ختم ہو گئی۔ نیا کوڈ منگوائیں۔" زیادہ کوششیں: "بہت زیادہ غلط کوششیں۔ نیا کوڈ منگوائیں۔" / `G-BLOCKED` |
| P | Verify timed out: do not log in. B-CHECK re-sends the **same** verify call with the **same** idempotency key. The replay must not use up another OTP attempt and must not create a second session; the server returns the original result (SEC-REVIEW #20, QA F-06) | `G-PENDING` | `G-PENDING` |

**Notes:** no SMS-read permission. OTP expiry, attempts, cooldown: configurable (TODO(OWNER)), OQ-028. The code is never logged (permission-policy §7). Contract note for A02 (T2.4/T2.8): an idempotent verify replay is not counted as an attempt, and the idempotency store keeps the issued session token no longer than the request's short technical TTL (SEC-REVIEW #20).

---

## C06 Home

- **Purpose:** location, search, categories, popular services, active job (BP §12); entry to "What do you need?" (BP §79 step 99).
- **Entry:** C05 (existing user), C04 (new user), C01, bottom navigation from any main screen. **Exits:** C39, C07, C09, C10, C17/C19 (active job), C31, C38, C22, C26, C25/C27.
- **Requirement IDs:** PERF-001, LOC-GEO-001, LOC-GEO-002, SCOPE-CAT-002, CAT-SVC-012, UX-SCREEN-005, PERF-002, VOICE-001.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Service location chip | display + tap | shows confirmed area or city; never silently locked | — | Service in: {area/city} · Change | سروس کی جگہ: {area/city} · تبدیل کریں | BP §12 C06, §57.3; LOC-GEO-002 |
| "What do you need?" entry | large button/field | — | — | What do you need? | آپ کو کیا کام ہے؟ | BP §79 step 99, §85 |
| Search field | text (tap opens C07) | — | — | Search a problem or service | مسئلہ یا سروس تلاش کریں | BP §12 C06/C07 |
| Voice button | icon button | — | — | Speak (accessible label: "Use voice assistant") | بول کر بتائیں | BP §77.4; C38 |
| Categories | grid of active families for the city (names/icons from server) | only active services (SCOPE-CAT-002) | — | Categories | زمرے | BP §12 C06; D-024; CAT-SVC-012 |
| Popular services | list | hidden while config `null` | — | Popular services | مقبول سروسز | BP §12 C06; OQ-041 |
| Active job card | card (status chip + provider + time) | shown only if the server returns an active booking | — | Your current job | آپ کا موجودہ کام | BP §12 C06 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Change location | Change | تبدیل کریں | none (opens C39) | BP §57.3 |
| Open "What do you need?" | What do you need? | آپ کو کیا کام ہے؟ | none (opens C31) | BP §79 |
| Open category | (category name) | (category name) | none (opens C09) | BP §12 C09 |
| Open active job | View | دیکھیں | none (opens C17 or C19 by server status) | BP §12 C06 |
| Voice | — | — | none (opens C38) | BP §77.4 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton for categories and active job; search and "What do you need?" usable at once (PERF-001) | — | — |
| E | City active but no categories returned / city not active (SCOPE-GEO-001) | Not active: "Kaam Karo is not active in {city} yet. Choose another city." + Change. No categories: "No services are available here right now." | "کام کرو ابھی {city} میں فعال نہیں ہے۔ دوسرا شہر منتخب کریں۔" / "یہاں ابھی کوئی سروس دستیاب نہیں۔" |
| S | Categories, optional popular services, active job card | — | — |
| X | Catalog load failed: search and "What do you need?" still usable; error card with retry in the categories area | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | Refresh timed out with older data on screen: `G-STALE` banner; active-job status shows "last updated {time}" and is not presented as current | `G-STALE` | `G-STALE` |

**Notes:** no permission at open. Location is asked only when the user taps "Use current location" inside C39 (PERM-001). With AI, Maps and media down, Home still renders categories and search (PERF-001). Guest mode: same screen without active job.

---

## C07 Search

- **Purpose:** search by problem, service or provider in everyday language (BP §12, §9 step 13).
- **Entry:** C06, C09, C38 ("search services", BP §77.3). **Exits:** C08, C31 (describe instead), C38.
- **Requirement IDs:** UX-SCREEN-001, ANALYTICS-002, REQ-AI-012, I18N-005.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Query | text (Urdu, English or mixed) | non-empty (trimmed) | Y | e.g. "AC not cooling" or a provider name | مثلاً "اے سی ٹھنڈا نہیں کر رہا" یا کاریگر کا نام | BP §12 C07, §9 step 13, §56.2 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Search | Search | تلاش کریں | Search services/providers in the selected city (read only) | BP §12 C07 |
| Describe the problem instead | Describe your problem | اپنا مسئلہ بتائیں | none (opens C31 with the query pre-filled) | BP §79, §85 |
| Voice | — | — | none (opens C38) | BP §77.3 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Spinner under the field after submit | Searching… | تلاش جاری ہے… |
| E | Field empty: hint text only | — | — |
| S | Results → C08 | — | — |
| X | Search failed | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | Search timed out: query kept; B-RETRY; "Describe your problem" still offered | `G-TIMEOUT` | `G-TIMEOUT` |

**Notes:** no permission. First search sends the activation analytics event (ANALYTICS-002).

---

## C08 Search results

- **Purpose:** services and providers with filters (BP §12).
- **Entry:** C07. **Exits:** C10, C11, C31, C07.
- **Requirement IDs:** UX-SCREEN-001, SCOPE-CAT-002, CAT-SVC-001, MATCH-EXPL-001, TRUST-BADGE-001…014, OQ-048.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Result tabs | segmented: Services / Providers | — | — | Services · Providers | سروسز · کاریگر | BP §12 C08 |
| Service row | name, category, price label by model | only active services | — | (server names) + §2.7 price label | (server names) | BP §12 C08; CAT-SVC-001 |
| Provider row | photo/logo, name, verification, rating + count, completed jobs, badges | — | — | {rating} ({count}) · {jobs} jobs done | {rating} ({count}) · {jobs} کام مکمل | BP §55.1, §55.2, §22.2 |
| Filters | chips (OQ-048 default: category for services; §55.1 factual filters for providers) | — | N | Filters | فلٹر | BP §12 C08, §55.1; OQ-048 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Open service | (row) | (row) | none (C10) | BP §12 |
| Open provider | (row) | (row) | none (C11) | BP §12 |
| Apply filter | (filter name) | (filter name) | Re-query with filter (read only) | BP §55.1; OQ-048 |
| Describe your problem | Describe your problem | اپنا مسئلہ بتائیں | none (C31) | BP §79 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton rows | — | — |
| E | No results | We couldn't find that. Try other words, or describe your problem and we'll find the right service. + "Describe your problem" | یہ نہیں ملا۔ دوسرے الفاظ آزمائیں، یا اپنا مسئلہ بتائیں، ہم درست سروس ڈھونڈ لیں گے۔ |
| S | Results list | — | — |
| X | Load failed | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | Filter refresh timed out: previous results stay with `G-STALE` | `G-STALE` | `G-STALE` |

**Notes:** no permission (distance only shown if a service location is already confirmed). Sponsored placement is not built (MATCH-FAIR-003). Open: OQ-048.

---

## C09 Category

- **Purpose:** subcategories and featured services (BP §12).
- **Entry:** C06, C08. **Exits:** C10, C31 (with category hint), C07.
- **Requirement IDs:** SCOPE-CAT-002, CAT-SVC-012, CFG-RULE-001, OQ-041.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Category title | display (server) | — | — | {category} | {category} | BP §12 C09; CAT-SVC-012 |
| Subcategories / services | list (server; active in city only) | — | — | — | — | BP §12 C09, §64 |
| Featured services | list; hidden while config `null` | — | — | Featured | نمایاں سروسز | BP §12 C09; OQ-041 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Open service | (name) | (name) | none (C10) | BP §12 |
| Not sure? Describe it | Not sure? Describe your problem | یقین نہیں؟ اپنا مسئلہ بتائیں | none (C31 with category hint) | BP §56.1, §79 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton list | — | — |
| E | Category has no active services in the city | No services in this category are available here yet. | اس زمرے کی کوئی سروس یہاں ابھی دستیاب نہیں۔ |
| S | List | — | — |
| X | Load failed | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | Refresh timed out over cached list | `G-STALE` | `G-STALE` |

**Notes:** no permission. Open: OQ-041.

---

## C10 Service detail

- **Purpose:** description, price model, duration, inclusions, reviews (BP §12); full listing anatomy (BP §4.2).
- **Entry:** C08, C09, C06 (popular). **Exits:** C12 (book/request with service preset), C31 (describe with service hint), C35 (see providers via request), C11.
- **Requirement IDs:** CAT-SVC-001, -003, -004, -008, -009, -010, -011, PRICE-001, PRICE-002, PRICE-003, PRICE-004, ANALYTICS-002, OQ-042.

**Fields** (all values from the server; a null field is not rendered — CAT-SVC-011)

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Name, category | display | — | — | — | — | BP §4.2 |
| Description | display | — | — | About this service | اس سروس کے بارے میں | BP §4.2, §12 C10 |
| Price | display by model (§2.7) + unit | — | — | Rs. X / From Rs. X / Price after inspection; per {unit} | §2.7 | BP §4.1, §17; CAT-SVC-001, -009 |
| Minimum visit / call-out charge | display if set | — | — | Visit charge: Rs. {x} | وزٹ چارج: {x} روپے | BP §4.2, §17; PRICE-004 |
| Inspection fee (+ deductible flag) | display if set | — | — | Inspection fee: Rs. {x} ({deducted from the repair / not deducted}) | معائنہ فیس: {x} روپے ({مرمت میں سے کٹے گی / نہیں کٹے گی}) | BP §17, §58.1; PRICE-003 |
| Quote/inspection needed | display flag | — | — | The provider will confirm the price after checking. | کاریگر چیک کرنے کے بعد قیمت بتائے گا۔ | BP §4.2, §64; CAT-SVC-003 |
| Emergency available | display flag | — | — | Emergency service available | ہنگامی سروس دستیاب ہے | BP §64; CAT-SVC-004 |
| Included / Not included | two lists | — | — | What's included · What's not included | کیا شامل ہے · کیا شامل نہیں | BP §4.2; CAT-SVC-008 |
| Estimated duration | display | — | — | Usually takes {duration} | عموماً {duration} لگتے ہیں | BP §4.2, §12 C10 |
| Availability hours | display | — | — | Available {hours} | دستیاب اوقات: {hours} | BP §4.2 |
| Materials policy | display | INCLUDED / CUSTOMER_PROVIDED / CHARGED_SEPARATELY | — | Materials: included / you provide / charged separately | سامان: شامل ہے / آپ دیں گے / الگ سے چارج ہوگا | BP §4.2, §17; CAT-SVC-010 |
| Warranty / rework policy | display if set | — | — | Warranty | وارنٹی | BP §4.2; CAT-SVC-010 |
| Info/photos needed from you | display | — | — | Please be ready to share: {list} | براہِ کرم یہ معلومات تیار رکھیں: {list} | BP §4.2 |
| Cancellation policy | link/text | — | — | Cancellation policy | منسوخی کی پالیسی | BP §4.2; BOOK-CANCEL-002 |
| Images/examples | gallery (progressive) | — | — | — | — | BP §4.2; PERF-005 |
| Reviews | list (read only; OQ-042) | — | — | Reviews | ریویوز | BP §12 C10; OQ-042 |
| Payment timing note | display | — | — | `G-PAY-AT-END` | `G-PAY-AT-END` | D-003 |

**Actions** (shown per the service's selling modes / price model returned by the server — CAT-SVC-002)

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Book (INSTANT / FIXED) | Book now | ابھی بک کریں | none (C12 with service preset) | BP §9 step 16, §53; CAT-SVC-002 |
| Request a quote (FROM / REQUEST_QUOTES) | Get a price | قیمت معلوم کریں | none (C12 / C31 with service preset) | BP §9 step 16, §53 |
| Request an inspection (INSPECTION_QUOTE) | Request an inspection visit | معائنے کے لیے بلائیں | none (C12 with service preset) | BP §9 step 16, §4.1; D-028 |
| Describe the problem | Describe your problem | اپنا مسئلہ بتائیں | none (C31 with service hint) | BP §79 |
| Report review | Report | رپورٹ کریں | Flag a review (REV-004) — logged-in only | BP §19; REV-004 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton; text before images | — | — |
| E | Service no longer active in city (server 404/inactive) | This service isn't available here right now. | یہ سروس یہاں ابھی دستیاب نہیں۔ + back to C09 |
| S | Full detail; first view analytics (ANALYTICS-002) | — | — |
| X | Load failed | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | Report review timed out | `G-PENDING` + B-CHECK | `G-PENDING` + B-CHECK |

**Notes:** no permission. No platform fee line (D-025). Prices are display only; the bookable amount comes from C14/quote (PRICE-002). Open: OQ-042, OQ-010 (price model vs selling mode).

---

## C11 Provider profile

- **Purpose:** identity, trust badge, rating, work count, service area, services (BP §12).
- **Entry:** C08, C35, C36, C42, C17. **Exits:** C12 (book this provider, with provider preset), C10, back.
- **Requirement IDs:** TRUST-VER-001…003, TRUST-BADGE-001…014, REV-001, REV-004, REV-006, PROF-FAV-001, PROV-CREW-006, MATCH-ELIG-078.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Photo/logo, name | display | — | — | — | — | BP §12 C11, §23 |
| Team leader (responsible person) | display | — | — | Team leader: {name} (verified) | ٹیم لیڈر: {name} (تصدیق شدہ) | D-018; ARCH §5.6; PROV-CREW-006 |
| Verification level | chip | Basic / Verified / Business Verified | — | Verified / Business verified | تصدیق شدہ / کاروبار تصدیق شدہ | BP §22.1; TRUST-VER-002/003 |
| Badges | chips with "What does this mean?" | only server-awarded badges | — | (badge names from server) | (server) | BP §55.2; TRUST-BADGE-* |
| Rating + count | display | REV-006 rule | — | {rating} from {count} ratings | {count} ریٹنگز میں سے {rating} | BP §19, §22.2 |
| Completed jobs | display | — | — | {n} jobs completed | {n} کام مکمل | BP §12 C11, §22.2 |
| Service area | display text (no map required) | — | — | Works in: {areas} | کام کا علاقہ: {areas} | BP §12 C11, §22.2 |
| Services offered | list with price labels | — | — | Services | سروسز | BP §12 C11 |
| Usual team size | display if set | — | — | Usually works with a team of {n} | عموماً {n} افراد کی ٹیم کے ساتھ کام کرتا ہے | ARCH §5.6 (optional display) |
| Reviews | list | — | — | Reviews | ریویوز | BP §19 |
| Favorite | toggle (heart) | logged-in only | — | Save to favorites / Saved | پسندیدہ میں محفوظ کریں / محفوظ ہے | BP §55.2; PROF-FAV-001 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Book this provider | Book this provider | اس کاریگر کو بک کریں | none (C12 with provider preset; eligibility checked by server at submit) | BP §53 (Choose from Suppliers); D-005 |
| Save / remove favorite | Save / Remove | محفوظ کریں / ہٹائیں | Create/delete Favorite (idempotent) | BP §55.2; PROF-FAV-001 |
| Report review | Report | رپورٹ کریں | Flag review | REV-004 |
| Explain badge | What does this mean? | اس کا کیا مطلب ہے؟ | none (text from server rule) | BP §77.3 ("explain badges"); §55.2 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton | — | — |
| E | Provider has no reviews yet: reviews area explains | No reviews yet. | ابھی کوئی ریویو نہیں۔ |
| S | Profile | Favorite saved (after server confirm): "Saved to favorites." | "پسندیدہ میں محفوظ ہو گیا۔" |
| X | Profile not available (suspended, blocked for this customer, removed) → generic message, no reason given | This provider isn't available right now. | یہ کاریگر ابھی دستیاب نہیں۔ |
| P | Favorite toggle timed out: heart shows a pending indicator, not the new state | `G-PENDING` (inline) | `G-PENDING` |

**Notes:** no permission. The customer never sees why a provider is unavailable (safety blocks, rating block, unpaid commission are not the customer's information — COMM-004, BP §17, MATCH-ELIG-078). "Favorite" (user action) and "Customer Favorite" (badge) are shown differently and never confused (BP §55.2). The provider's phone number is never shown (BP §20).

---

## C12 Request/booking

- **Purpose:** address, date/time, issue, photos, preferences (BP §12). This is the structured **normal form**: the non-AI path for every request (BP §62.1, §67; REQ-AI-006, REQ-AI-012) and the form used from C10/C11 with a service or provider preset.
- **Entry:** C10, C11, C42 (rebook), C31 (`G-AI-DOWN` or "Use the simple form"), C34 (edit). **Exits:** C39 (address), C32/C33 (media), C14 (when a provider is preset or the service is INSTANT), C35 (choose suppliers / request offers) or C40 after server matching, C03 (guest).
- **Requirement IDs:** REQ-AI-006, REQ-AI-012, PERF-002, PROF-ADDR-002, PROF-ADDR-003, LOC-GEO-003, MEDIA-003, MEDIA-008, MEDIA-009, MATCH-SCORE-004, CAT-SVC-006, REL-004, REL-008, CFG-RULE-008, UX-SCREEN-005.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Service | display (preset) or picker of active services | must be an active service in the city | Y | Service | سروس | BP §12 C12, §9 step 16 |
| Provider (if preset) | display | — | N | Provider: {name} | کاریگر: {name} | BP §53; D-005 |
| Service address | tap → C39; shows confirmed Location Snapshot | must be `CONFIRMED` by C39 | Y | Where is the work? | کام کہاں ہے؟ | BP §9 step 17, §21, §57.1; LOC-GEO-004 |
| When | choice: Now / Today / Later; Later → date + time window from server options; "Now" only where the server says it is supported | server validates | Y | When do you need it? · Now · Today · Later | کب چاہیے؟ · ابھی · آج · بعد میں | BP §9 step 17, §56.1 step 84 |
| Problem description | multiline text; privacy hint below (same copy as C31) | non-empty unless audio/video/photo attached; length limit from server | Y (one of text/audio/video/photo) | Describe the problem | مسئلہ بیان کریں | BP §9 step 18, §12 C12; BP §52.2; SEC-REVIEW #13 |
| Service questions | dynamic fields defined per service in admin | as configured | as configured | (from server) | (from server) | BP §64; CAT-SVC-006 |
| Photos | system photo picker / camera; compressed preview | count/size limits from config (D-011, TODO(OWNER)) | N unless the service requires photos (BP §4.2, §76.3) | Add photos (optional) | تصاویر شامل کریں (اختیاری) | BP §9 step 18, §76.3; MEDIA-003, MEDIA-008 |
| Audio note | → C32 | limits from config | N | Record a voice note | آواز میں بتائیں | BP §76.1 |
| Video | → C33 or picker | limits from config | N | Add a short video | مختصر ویڈیو شامل کریں | BP §76.2 |
| Document | system document picker | type/size from config | N | Attach a document (optional) | دستاویز لگائیں (اختیاری) | BP §74; M-11 |
| Preferences | chips: verified only, badges, price range, time (non-sensitive) | from server list | N | Preferences (optional) | ترجیحات (اختیاری) | BP §12 C12, §54.2, §77.2; MATCH-SCORE-004 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Continue | Continue | جاری رکھیں | Save draft request (server `Composing`/draft); upload media via upload sessions; then: provider preset or INSTANT → C14; otherwise submit for matching → C35/C40 (server decides selling mode) | BP §9 steps 17–20; ARCH §6.2, §11 |
| Retry upload | Try again | دوبارہ کوشش کریں | Re-upload the failed media (draft kept) | BP §76.2; MEDIA-009 |
| Remove attachment | Remove | ہٹائیں | Detach media from draft | BP §76.2 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Service questions/time options loading: skeleton; Continue: spinner; uploads: per-item progress | `G-LOADING`; Uploading {n}%… | اپ لوڈ ہو رہا ہے {n}%… |
| E | New form: only required fields marked; Continue disabled until address, time and one description input exist | Add a short description, a voice note, a photo or a video. | مختصر وضاحت، آواز، تصویر یا ویڈیو میں سے کچھ شامل کریں۔ |
| S | Server confirms draft/submit → next screen | — | — |
| X | Validation (422) inline; service not active; `LIMIT_REACHED` → `G-LIMIT`; upload failed (draft kept) | Upload failed: "This file didn't upload. Your request is saved. Try again." Too large: "This file is too large." (limit from server) | "یہ فائل اپ لوڈ نہیں ہوئی۔ آپ کی درخواست محفوظ ہے۔ دوبارہ کوشش کریں۔" / "یہ فائل بہت بڑی ہے۔" |
| P | Submit timed out: draft kept, `G-PENDING`, B-CHECK; no navigation until the server answers | `G-PENDING` | `G-PENDING` |

**Notes:** permissions only on tap (camera, mic via C32/C33, location via C39). Local draft (REL-004). Guest: Continue → C03 with `G-LOGIN-NEEDED`. Media limits: D-011 / OQ-004.

---

## C13 Quote

- **Purpose:** quote details, validity, inclusions, customer approval (BP §12, §18).
- **Entry:** notification `quote.received` (NOTIF-002), C17, C22, C36. **Exits:** C15 (accepted), C18 (ask a question), C36 (back to compare), C22.
- **Requirement IDs:** QUOTE-004, QUOTE-005, QUOTE-006, QUOTE-007, QUOTE-009, FARE-001…012, PRICE-003, PRICE-005, PRICE-006, PROV-CREW-001, PROV-CREW-003, PROV-CREW-005, BOOK-STATUS-004, VOICE-007, REL-003, REL-008, SHARE-001.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Provider + verification | display | — | — | — | — | BP §23 |
| Quote lines | list: type, description, qty/unit, amount, state (§2.7) — or a simple total | from server | — | Price breakdown | قیمت کی تفصیل | BP §18 step 57, §58.1; QUOTE-003 |
| Inspection line + deductible | display | — | — | Inspection fee — {deducted / not deducted} from the repair | معائنہ فیس — مرمت میں سے {کٹے گی / نہیں کٹے گی} | BP §58.1; FARE-002 |
| Materials classification | per line | included / excluded / customer-approved extra | — | Included · Not included · Extra (needs your approval) | شامل · شامل نہیں · اضافی (آپ کی منظوری سے) | BP §17; PRICE-005 |
| Tax line | display | always shown (D-029) | — | Tax | ٹیکس | D-029; FARE-010 |
| Total | display (server) | — | — | Total | کل رقم | BP §58 |
| Crew size | display | ≥ 1 | — | {n} workers will come | {n} افراد آئیں گے | D-004; PROV-CREW-001/003 |
| Inclusions / exclusions | lists | — | — | What's included · What's not included | کیا شامل ہے · کیا شامل نہیں | BP §18 step 59; QUOTE-005 |
| Expected duration | display | — | — | Expected time: {duration} | متوقع وقت: {duration} | BP §18 step 59 |
| Valid until | display date/time | — | — | Valid until {date time} | {date time} تک قابلِ قبول | BP §18 step 58; QUOTE-004 |
| Payment timing note | display | — | — | `G-PAY-AT-END` | `G-PAY-AT-END` | D-003 |

**Actions** (from `allowedNextActions`)

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Accept quote | Accept this price | یہ قیمت قبول کریں | Confirm dialog (amount from server) → accept quote (idempotent key) | BP §18 step 60; QUOTE-006; VOICE-007; REL-008 |
| Decline | Decline | رد کریں | Confirm dialog → decline (server records `DECLINED`; booking result per BOOK-STATUS-004) | BP §18 step 60; BOOK-STATUS-004 |
| Ask a question | Ask a question | سوال پوچھیں | none (opens C18 thread for this booking) | BP §18 step 60; QUOTE-006 |
| Share quote summary | Share | شیئر کریں | Get server-built share text → `ACTION_SEND` | BP §82; SHARE-001 |

Confirm dialog (accept): EN "Accept {provider}'s price of Rs. {total}? You pay only after the job is completed." / UR "{provider} کی {total} روپے کی قیمت قبول کریں؟ آپ ادائیگی کام مکمل ہونے کے بعد کریں گے۔" + B-CONFIRM / B-CANCEL.

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton; accept/decline: button spinner, both buttons disabled | `G-SENDING` | `G-SENDING` |
| E | Quote has no lines (simple total only): breakdown section shows "The provider gave a total price only." | The provider gave a total price only. | کاریگر نے صرف کل قیمت بتائی ہے۔ |
| S | Server confirms acceptance → C15; decline confirmed → back with message | Accepted: (C15). Declined: "You declined this price." | "آپ نے یہ قیمت رد کر دی۔" |
| X | `QUOTE_EXPIRED` / quote withdrawn / `TRANSITION_NOT_ALLOWED` / provider no longer eligible (generic) | Expired: "This price has expired. Ask the provider for a new one or choose another." Other: `G-CHANGED` | "اس قیمت کی میعاد ختم ہو گئی ہے۔ کاریگر سے نئی قیمت مانگیں یا کوئی اور منتخب کریں۔" |
| P | Accept timed out: "Checking your acceptance…" — not "accepted"; B-CHECK; accept button stays disabled | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. Crew size never changes price (D-018) — no per-worker amount is shown. Validity duration is configurable (TODO(OWNER)), D-013 / OQ-006. Inspection visit happens while the booking is Quote Pending (D-028); its time is shown on C17.

---

## C14 Booking review

- **Purpose:** final summary before confirmation (BP §12, §9 step 19).
- **Entry:** C12 (provider preset / INSTANT), C35 (provider chosen), C42 (rebook). **Exits:** C15 (confirmed), C12/C39 (edit), C35.
- **Requirement IDs:** PRICE-001, PRICE-004, PRICE-006, PRICE-007, FARE-001, FARE-002, FARE-007, FARE-009, FARE-010, BOOK-CANCEL-002, PROV-CREW-003, MATCH-MODE-001, BOOK-STATUS-001, BOOK-STATUS-003, VOICE-007, REL-003, REL-005, REL-008, A11Y-008, PAY-TIMING-001.

**Fields** (all values from the server's priced draft)

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Service + problem summary + media thumbnails | display | — | — | Your request | آپ کی درخواست | BP §9 step 19 |
| Provider (team leader, verification) | display | — | — | Provider | کاریگر | BP §23; D-018 |
| Crew size | display | OQ-045 default | — | {n} workers will come / Provider will confirm the number of workers | {n} افراد آئیں گے / کاریگر افراد کی تعداد بتائے گا | D-004; PROV-CREW-003; OQ-045 |
| Address (snapshot) | display | — | — | Address | پتہ | BP §21; PROF-ADDR-002 |
| Date/time | display | — | — | Time | وقت | BP §9 step 17 |
| Price lines | display (§2.7) | visit/call-out, inspection (deductible flag), emergency fee shown before confirm | — | Price | قیمت | BP §17, §58.1; FARE-001/002/007 |
| Tax line | display | always shown | — | Tax | ٹیکس | D-029; FARE-010 |
| Total / estimate | display | FIXED: total; FROM/INSPECTION: "estimate — final price after the provider's quote" | — | Total / Estimated | کل رقم / اندازاً | BP §17, §53 ("which numbers are estimates"); PRICE-001/002 |
| Payment timing | display | — | — | `G-PAY-AT-END` | `G-PAY-AT-END` | D-003 |
| Cancellation policy | display | no fee at launch (D-023) | — | Cancellation: free before the provider accepts. {policy text from server} | منسوخی: کاریگر کے قبول کرنے سے پہلے مفت۔ {policy} | BP §16; BOOK-CANCEL-001/002; D-023 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Send booking request | Send booking request | بکنگ کی درخواست بھیجیں | Confirm dialog → create the booking request (idempotent). Server sets status: Requested, or Quote Pending for quote/inspection services (D-028). It becomes a booking only when the provider accepts (Requested → Accepted, D-030) | BP §9 step 20, §15; D-005, D-028, D-030; REL-008 |
| Edit | Edit | ترمیم کریں | none (back to C12/C39) | BP §9 |

Confirm dialog: EN "Send this booking request to {provider} for {time}? {Total Rs. X | Estimate Rs. X}. It is booked once {provider} accepts. You pay after the job is completed." / UR "یہ بکنگ کی درخواست {provider} کو {time} کے لیے بھیجیں؟ {provider} کے قبول کرنے پر بکنگ ہو جائے گی۔ {کل رقم | اندازاً} {X} روپے۔ آپ ادائیگی کام مکمل ہونے کے بعد کریں گے۔"

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Pricing the draft: skeleton for price block (no client total); confirming: full-width spinner, button disabled | Getting the price… / Sending your request… | قیمت معلوم کی جا رہی ہے… / آپ کی درخواست بھیجی جا رہی ہے… |
| E | Not applicable: C14 is reached only with a draft; if the draft is gone, show X | — | — |
| S | Server returns booking with number and status → C15 | — | — |
| X | Provider no longer eligible/available (generic, no reason) → back to C35; price changed (`G-CHANGED`, show new price and ask again); `LIMIT_REACHED`; 422 | Not available: "This provider can't take this booking right now. Please choose another." | "یہ کاریگر ابھی یہ بکنگ نہیں لے سکتا۔ براہِ کرم کوئی اور منتخب کریں۔" |
| P | Send timed out. B-CHECK reuses the same key, so only one request is created (REL-003) | We're checking whether your request was sent. Please don't send it again. | ہم چیک کر رہے ہیں کہ آپ کی درخواست گئی یا نہیں۔ براہِ کرم دوبارہ نہ بھیجیں۔ |

**Notes:** no permission. No platform fee line (D-025). No payment step here (D-003, PAY-TIMING-001). Open: OQ-045.

---

## C15 Booking confirmation

- **Purpose:** booking number, provider, time, price/estimate (BP §12); shown only after the server confirms (REL-005). While the status is Requested / Quote Pending it is a **booking request**; it is called a booking only after the provider accepts (Requested → Accepted, D-030).
- **Entry:** C14, C13 (quote accepted), C36 (offer chosen). **Exits:** C17, C22, C06.
- **Requirement IDs:** REL-005, PROV-CREW-003, NOTIF-010, PERM-004, SHARE-001, BOOK-STATUS-016.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Booking number | display | — | — | Booking #{number} | بکنگ نمبر {number} | BP §12 C15 |
| Status chip | display (§2.8) | server status | — | e.g. Request sent | مثلاً درخواست بھیج دی گئی | BP §15.1 |
| Next step text | display by status | Requested: waiting for the provider to accept; Quote Pending: waiting for price/inspection visit; Accepted/Scheduled: confirmed time | — | Waiting for {provider} to accept. / Waiting for {provider}'s price. / Confirmed for {time}. | {provider} کے قبول کرنے کا انتظار ہے۔ / {provider} کی قیمت کا انتظار ہے۔ / {time} کے لیے طے ہے۔ | BP §15; D-028 |
| Provider, time, address | display | — | — | — | — | BP §12 C15 |
| Price / estimate | display (server) | — | — | Total / Estimated | کل رقم / اندازاً | BP §12 C15 |
| Crew size | display | — | — | {n} workers will come | {n} افراد آئیں گے | D-004; PROV-CREW-003 |
| Payment note | display | — | — | `G-PAY-AT-END` | `G-PAY-AT-END` | D-003 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Track booking | Track booking | بکنگ دیکھیں | none (C17) | BP §9 step 23 |
| Share | Share | شیئر کریں | Get server share text → `ACTION_SEND` | BP §82; SHARE-001 |
| Turn on notifications (first booking only, Android 13+) | Turn on notifications | نوٹیفکیشن آن کریں | none (pre-prompt `G-PERM-NOTIF` → system prompt) | BP §75 item 96; NOTIF-010 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Loading booking by id: skeleton | — | — |
| E | Not applicable: reached only with a confirmed booking id | — | — |
| S | Confirmation content; heading depends on status (a Requested booking is "sent", not "confirmed") | Requested: "Request sent!" Accepted/Scheduled: "Booking confirmed!" | "درخواست بھیج دی گئی!" / "بکنگ کی تصدیق ہو گئی!" |
| X | Booking fetch failed: show booking number (from the create response) + retry; never claim more than the create response said | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | Not used for writes here; if the status refresh times out: `G-STALE` | `G-STALE` | `G-STALE` |

**Notes:** the notification pre-prompt appears only once, here, after the first server-confirmed booking (PERM-004). Denial keeps in-app updates.

---

## C16 Payment

- **Purpose:** available payment methods and payment status (BP §12). Reachable **only** when the booking is `Completed` and the server lists a pay action (D-003, D-023; PAY-TIMING-001).
- **Entry:** C20, C22, notification `job.status_changed` (completed). **Exits:** C20 (paid), C24 (receipt), C21 (review).
- **Requirement IDs:** PAY-TIMING-001, PAY-001, PAY-002, PAY-008, PAY-009, PRICE-006, PRICE-007, FARE-009, FARE-010, FARE-012, LEDGER-006, VOICE-007, REL-003, REL-005, REL-006, REL-008; D-030.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Final bill lines | display (only Final/approved lines; §2.7) | server | — | Your bill | آپ کا بل | BP §58.2; PRICE-007, FARE-012 |
| Tax line | display | always shown | — | Tax | ٹیکس | D-029; FARE-010 |
| Total to pay | display (server) | — | — | Total to pay | کل ادائیگی | BP §12 C16 |
| Payment methods | list from server: digital methods offered by the `PaymentGateway` (fake until D-008); cash information row | — | Y (for digital) | How would you like to pay? | آپ کیسے ادائیگی کرنا چاہیں گے؟ | BP §12 C16; PAY-001; D-008 |
| Cash row | information only; the Customer app has no "choose cash" option (D-030) | — | — | Paying cash? Pay the provider directly. They will record it. | نقد ادائیگی؟ کاریگر کو براہِ راست دیں۔ وہ اسے درج کرے گا۔ | D-016, D-030 |
| Payment status | chip from server | — | — | Not paid / Processing / Paid / Failed | ادا نہیں ہوا / جاری ہے / ادا ہو گیا / ناکام | BP §12 C16 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Pay | Pay Rs. {total} | {total} روپے ادا کریں | Confirm dialog → initiate payment (idempotent) → gateway hosted flow (no card data in the app) → return → read payment status | D-003; PAY-001, PAY-002, PAY-008; VOICE-007 |
| View receipt | View receipt | رسید دیکھیں | none (C24) | PAY-009 |

Confirm dialog: EN "Pay Rs. {total} for booking #{number}?" / UR "بکنگ نمبر {number} کے لیے {total} روپے ادا کریں؟"

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Bill loading: skeleton; initiating: spinner, Pay disabled | `G-LOADING` / Starting payment… | ادائیگی شروع ہو رہی ہے… |
| E | Nothing to pay (already paid digitally, or cash recorded by provider) → show status + receipt link | Nothing to pay. This booking is already paid ({method}). | کچھ ادا کرنا باقی نہیں۔ یہ بکنگ پہلے ہی ادا ہو چکی ہے ({method})۔ |
| S | Only after the server confirms `payment.succeeded` | Payment received. Thank you! | ادائیگی موصول ہو گئی۔ شکریہ! |
| X | Payment failed (gateway said no) / booking not Completed (409) / method unavailable | Failed: "Payment didn't go through. No money was taken. Try again or choose another way." Not completed: "You can pay after the job is completed." | "ادائیگی نہیں ہو سکی۔ کوئی رقم نہیں کٹی۔ دوبارہ کوشش کریں یا کوئی اور طریقہ منتخب کریں۔" / "آپ کام مکمل ہونے کے بعد ادائیگی کر سکتے ہیں۔" |
| P | Returned from gateway without final result, or timeout: "Payment is processing. Don't pay again — we'll update this screen." B-CHECK; Pay stays disabled until the server gives a final status | Payment is processing. Please don't pay again — we'll update you. | ادائیگی جاری ہے۔ براہِ کرم دوبارہ ادائیگی نہ کریں — ہم آپ کو بتا دیں گے۔ |

**Notes:** no permission. "No money was taken" is shown only when the server's status says the payment failed without capture (gateway-confirmed). No platform fee (D-025). No commission shown (COMM-004). Cash is recorded only by the provider in the Partner app (P14; D-016, D-030). Open: D-008 (OQ-001).

---

## C17 Booking tracking

- **Purpose:** timeline, provider contact, help (BP §12). Used for statuses Requested → Provider En Route (C19 takes over from Arrived; derived split, see Notes).
- **Entry:** C15, C22, C06 active job, notifications (`booking.accepted`, `booking.reminder`, `provider.en_route`). **Exits:** C18, C19, C13, C28, C29, C37, C11.
- **Requirement IDs:** BOOK-STATUS-002…008, BOOK-STATUS-016, BOOK-CANCEL-001…004, BOOK-CANCEL-006, DATA-002, PROV-CREW-003, PROV-CREW-004, CHAT-001, CHAT-002, NOTIF-003, NOTIF-004, VOICE-007, SHARE-001, OQ-025, OQ-050.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Status chip | §2.8 | server | — | — | — | BP §15.1 |
| Timeline | list of Job Events (time + status label) | server | — | Timeline | ٹائم لائن | BP §12 C17, §15; DATA-002 |
| Provider card | name, team leader, verification, photo | — | — | Provider | کاریگر | BP §23; D-018 |
| Crew size | display | — | — | {n} workers will come | {n} افراد آئیں گے | D-004; PROV-CREW-003 |
| Appointment / inspection visit time | display | D-028 visit time when Quote Pending | — | Visit time: {time} | وزٹ کا وقت: {time} | BP §15; D-028 |
| ETA | display only if the server provides it (OQ-025 default: status + ETA, no live map) | — | — | Arriving in about {min} min | تقریباً {min} منٹ میں پہنچ رہا ہے | BP §24, §80; OQ-025 |
| Address (snapshot) | display | — | — | Address | پتہ | BP §21 |
| Pending change banner | shown when the server has a pending approval (crew-size change / proposed charge) | — | — | Your approval is needed | آپ کی منظوری درکار ہے | BP §18 step 62; PROV-CREW-004 |

**Actions** (only those in `allowedNextActions`; contact actions shown from acceptance on)

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Message | Message | پیغام | none (C18) | BP §12 C17, §20 |
| Call | Call | کال کریں | Request a masked call session (`CallRelay`, fake) → dialer intent | BP §20, §74; CHAT-002 |
| View quote | View price | قیمت دیکھیں | none (C13) | BP §18 |
| Review change | Review | دیکھیں | none (C37) | BP §18 step 62 |
| Cancel booking | Cancel booking | بکنگ منسوخ کریں | Confirm dialog (policy + fee from server; fee 0 at launch, D-023) + reason (OQ-050) → request transition Cancelled | BP §8.1, §16; BOOK-CANCEL-001/002; VOICE-007 |
| Provider didn't come | Provider didn't come | کاریگر نہیں آیا | Confirm → report provider no-show (server opens support case) | BP §16; BOOK-CANCEL-004 |
| Stop – safety | Stop for safety | حفاظت کے لیے روکیں | Confirm → safety stop + escalation | BP §16; BOOK-CANCEL-006 |
| Get help | Get help | مدد حاصل کریں | none (C28) | BP §12 C17 |
| Share | Share | شیئر کریں | server share text → `ACTION_SEND` | SHARE-001 |

Cancel dialog: EN "Cancel booking #{number}? {policy text from server}" / UR "بکنگ نمبر {number} منسوخ کریں؟ {policy}". Safety dialog: EN "Stop this job and contact Kaam Karo support now?" / UR "یہ کام روک کر ابھی کام کرو سپورٹ سے رابطہ کریں؟"

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton; action in flight: that button spinner, other actions disabled | `G-SENDING` | `G-SENDING` |
| E | Requested with no provider response yet: timeline has one event | Waiting for {provider} to respond. We'll notify you. | {provider} کے جواب کا انتظار ہے۔ ہم آپ کو بتا دیں گے۔ |
| S | Timeline + actions; after a server-confirmed cancel: "Booking cancelled." | Booking cancelled. | بکنگ منسوخ ہو گئی۔ |
| X | Transition refused (409) → `G-CHANGED`; load failed | `G-CHANGED` / `G-NET` | `G-CHANGED` / `G-NET` |
| P | Cancel/no-show/safety timed out: "Checking your cancellation…" B-CHECK; status chip keeps the last confirmed status | `G-PENDING` | `G-PENDING` |

**Notes:** phone permission is never requested; "Call" uses an intent (M-07). Provider cancellation: the customer sees the server-provided next step (re-match / other offers) — BOOK-CANCEL-003. Derived screen split: C17 renders Requested, Quote Pending, Quoted, Accepted, Scheduled, Provider En Route; C19 renders Arrived, In Progress, Awaiting Approval; C20 renders Completed (routing by server status only). Open: OQ-025, OQ-050.

---

## C18 Chat/contact

- **Purpose:** controlled messaging and call options (BP §12, §20).
- **Entry:** C17, C19, C13 ("Ask a question"), notification `message.new`. **Exits:** back.
- **Requirement IDs:** CHAT-001, CHAT-002, CHAT-003, CHAT-004, REQ-AI-009, ABUSE-006, ABUSE-008, NOTIF-007, MEDIA-008.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Message list | list (own/other, time, delivery state from server) | — | — | — | — | BP §20 |
| Message input | text | non-empty; length limit from server | Y to send | Type a message | پیغام لکھیں | BP §20 |
| Attachment | photo picker / camera / document picker | type + size limits from config (D-011, TODO(OWNER)) | N | Attach | منسلک کریں | BP §20; CHAT-003 |
| Held message notice | display when moderation holds content | — | — | This message is being checked. | اس پیغام کی جانچ ہو رہی ہے۔ | BP §67; REQ-AI-009 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Send | Send | بھیجیں | Post message (idempotent client id) | BP §20; CHAT-001 |
| Call | Call | کال کریں | Masked call session → dialer intent | BP §20; CHAT-002 |
| Report | Report | رپورٹ کریں | Report conversation/message | BP §30; ABUSE-006, ABUSE-008 |
| Block | Block | بلاک کریں | Confirm → block this provider (feeds MATCH-ELIG-078) | BP §30; ABUSE-008 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton bubbles; a sending message shows a clock icon (not "sent") | — | — |
| E | No messages yet | Send a message about this booking. | اس بکنگ کے بارے میں پیغام بھیجیں۔ |
| S | Message shows "sent" tick only after server confirms | — | — |
| X | Send failed: message stays with "Not sent — tap to retry"; attachment rejected (type/size) | Not sent. Tap to try again. / This file type or size isn't allowed. | نہیں بھیجا گیا۔ دوبارہ کوشش کے لیے دبائیں۔ / اس قسم یا سائز کی فائل کی اجازت نہیں۔ |
| P | Send timed out: clock icon + "Checking…"; re-check by client id, no duplicate | `G-PENDING` (inline) | `G-PENDING` |

**Notes:** chat exists only between the booking's participants (CHAT-001). No phone number is ever shown (BP §20). Camera permission only on tap. Commercial actions are never done in chat (SHARE-003).

---

## C19 Job in progress

- **Purpose:** status and actions while the provider is on site (BP §12). Statuses Arrived, In Progress, Awaiting Approval (derived split, see C17 Notes).
- **Entry:** C17, C06 active job, notification `job.status_changed`. **Exits:** C37, C18, C20, C29, C28.
- **Requirement IDs:** BOOK-STATUS-008, -009, -010, -016, BOOK-CANCEL-006, FARE-012, NOTIF-004, NOTIF-005, PROV-CREW-003.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Status chip + started time | display | server | — | Work started at {time} | کام {time} پر شروع ہوا | BP §15 |
| Provider + crew size | display | — | — | {n} workers on site | {n} افراد موجود ہیں | D-004 |
| Approved price lines so far | display (§2.7) | server | — | Agreed price | طے شدہ قیمت | BP §58.2 |
| Pending approvals | card per Proposed line / change | — | — | {n} items need your approval | {n} چیزوں کے لیے آپ کی منظوری درکار ہے | BP §58.2; FARE-012 |

**Actions** (from `allowedNextActions`)

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Review extra charges | Review | دیکھیں | none (C37) | BP §52.1, §58.2 |
| Message / Call | Message / Call | پیغام / کال | as C18 | BP §20 |
| Report a problem | Report a problem | مسئلہ رپورٹ کریں | none (C29; server moves to Disputed only on submit) | BP §9 step 24; SUP-003 |
| Stop – safety | Stop for safety | حفاظت کے لیے روکیں | Confirm → safety stop (Arrived → Cancelled, In Progress → Disputed per server) | BP §16; BOOK-CANCEL-006 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton / action spinner | — | — |
| E | No pending approvals: approvals area hidden; text | No extra charges so far. | ابھی تک کوئی اضافی چارج نہیں۔ |
| S | Live status from server (refresh on push / pull) | — | — |
| X | Load failed / transition refused | `G-NET` / `G-CHANGED` | `G-NET` / `G-CHANGED` |
| P | Safety stop timed out: B-CHECK; support contact shown at once (C28) regardless | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. The app shows Awaiting Approval only when the server says so (entered when a line is Proposed — BOOK-STATUS-010).

---

## C20 Completion

- **Purpose:** completion summary, extras, customer confirmation (BP §12, §9 step 24).
- **Entry:** C19, C22, notification `job.status_changed` (completed). **Exits:** C16 (pay), C21 (review), C24 (receipt), C29 (report).
- **Requirement IDs:** BOOK-STATUS-011, PAY-TIMING-001, LEDGER-006, FARE-010, FARE-012, PRICE-007, SUP-003, RATING-ENF-001, OQ-044; D-030.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Completion summary | display (provider notes, completion photos if any) | — | — | Job summary | کام کا خلاصہ | BP §12 C20, §10 step 40 |
| Extras | list: approved and rejected lines with state | server | — | Extra charges | اضافی چارجز | BP §12 C20, §58.2 |
| Final bill | lines + tax line + total (server) | — | — | Final bill | آخری بل | BP §58.2; D-029 |
| Paid by | display as recorded by the provider: Cash / Digital; when Digital is recorded but the gateway has not confirmed payment, it says so | server (as recorded + gateway status) | — | Paid by: Cash / Paid by: Digital / Paid by: Digital — not received yet | ادائیگی: نقد / ادائیگی: ڈیجیٹل / ادائیگی: ڈیجیٹل — ابھی موصول نہیں ہوئی | D-016; LEDGER-006 (INTERP, D-022); SEC-REVIEW #6 (KK-T5); OQ-077 |
| Payment status | chip | server | — | Not paid / Paid | ادا نہیں ہوا / ادا ہو گیا | D-003 |

**Actions** (from `allowedNextActions`)

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Confirm completion | Confirm job is done | کام مکمل ہونے کی تصدیق کریں | Record customer confirmation (OQ-044) | BP §9 step 24, §12 C20; OQ-044 |
| Report a problem | Report a problem | مسئلہ رپورٹ کریں | none (C29) | BP §9 step 24 |
| Pay | Pay now | ابھی ادائیگی کریں | none (C16) — shown only if Completed and pay action allowed | D-003; PAY-TIMING-001 |
| Rate the service | Rate | ریٹنگ دیں | none (C21) — only if eligible | BP §19; RATING-ENF-001 |
| View receipt | Receipt | رسید | none (C24) | PAY-009 |
| "Paid by" is wrong | Report wrong payment record | ادائیگی کا غلط اندراج رپورٹ کریں | none (C29 with type "wrong payment record" preset) | ARCH §6.8; LEDGER-006 |
| I paid cash (shown only when the record says Digital and no gateway payment is confirmed) | I paid cash | میں نے نقد ادائیگی کی | Confirm dialog → opens C29 with type "wrong payment record" and the statement "I paid cash" preset; the report goes to Finance/Risk (A09/A18). The app never changes the payment record itself | D-016; LEDGER-006; ABUSE-006, ABUSE-007; SEC-REVIEW #6 (KK-T5); OQ-077 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton / action spinner | — | — |
| E | Payment not yet recorded: "Paid by" row shows "Not recorded yet" | Not recorded yet | ابھی درج نہیں ہوا |
| S | Summary; after confirmed confirmation: "Thanks for confirming." | Thanks for confirming. | تصدیق کا شکریہ۔ |
| X | Load failed / 409 | `G-NET` / `G-CHANGED` | `G-NET` / `G-CHANGED` |
| P | Confirm timed out: B-CHECK; no "confirmed" label | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. KK-T5 (SEC-REVIEW #6): a provider can record DIGITAL and take cash; C20 therefore shows "Digital — not received yet" from the gateway status and offers "I paid cash". Whether the customer gets this action at launch and the flag time `ledger.digital_unconfirmed_flag_hours` (null, TODO(OWNER)) are open in **OQ-077**; until answered the action is built behind a config switch that is on by default per A15. "I paid cash" dialog: EN "Tell Kaam Karo you paid {provider} in cash for booking #{number}?" / UR "کام کرو کو بتائیں کہ آپ نے بکنگ نمبر {number} کے لیے {provider} کو نقد ادائیگی کی؟". "Paid by" is shown exactly as the provider recorded it (D-030). "I paid cash" is a report only; it never records a payment (cash is recorded only by the provider, D-016, D-030). Open: OQ-044 (who completes), OQ-007 (customer confirming recorded method, D-022), OQ-077.

---

## C21 Review

- **Purpose:** rating, tags, written review (BP §12, §19).
- **Entry:** C20, C22, notification. **Exits:** C20/C22.
- **Requirement IDs:** REV-001, REV-002, REV-007, RATING-ENF-001, CFG-RULE-009, OQ-043.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Rating | 1–5 stars (each star has a text label for screen readers) | integer 1–5 | Y | How was the service? | سروس کیسی رہی؟ | BP §19; REV-001 |
| Tags | chips; hidden while config `null` | from config | N | What went well? | کیا اچھا رہا؟ | BP §19; OQ-043 |
| Written review | multiline text | optional; length limit from config (OQ-043) | N | Write a review (optional) | ریویو لکھیں (اختیاری) | BP §19; REV-002 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Submit | Submit | جمع کرائیں | Create review for this booking (one per booking; idempotent) | BP §19; REV-001 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Eligibility check skeleton; submit spinner | `G-SENDING` | `G-SENDING` |
| E | No rating chosen: Submit disabled | Tap a star to rate. | ریٹنگ کے لیے ستارہ دبائیں۔ |
| S | Server confirms | Thanks for your review! | آپ کے ریویو کا شکریہ! |
| X | Not eligible (409) — copy only from allow-listed codes (§2.4): `NOT_COMPLETED`, `ALREADY_REVIEWED`, `REVIEW_WINDOW_CLOSED` (window configurable TODO(OWNER), CFG-RULE-009); any other code → generic. 422 inline | Not completed: "You can review after the job is completed." Already reviewed: "You have already reviewed this booking." Window closed: "The time to review this booking has ended." Generic: "You can't review this booking." | "کام مکمل ہونے کے بعد آپ ریویو دے سکتے ہیں۔" / "آپ اس بکنگ کا ریویو پہلے ہی دے چکے ہیں۔" / "اس بکنگ کا ریویو دینے کا وقت ختم ہو گیا ہے۔" / "آپ اس بکنگ کا ریویو نہیں دے سکتے۔" |
| P | Submit timed out: draft kept, B-CHECK | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. The review enters moderation (REV-005) server-side; the app does not promise it is public. Open: OQ-043.

---

## C22 My bookings

- **Purpose:** upcoming / active / past / cancelled (BP §12); history (BP §9 step 26).
- **Entry:** main navigation, C15. **Exits:** C17, C19, C20, C13, C21, C35/C36/C40 (open requests, OQ-046).
- **Requirement IDs:** BOOK-STATUS-016, PAY-009, UX-SCREEN-001, OQ-046.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Tabs | Upcoming · Active · Past · Cancelled; membership decided by the server query (`group` filter), not by client status logic | — | — | Upcoming · Active · Past · Cancelled | آنے والی · جاری · پرانی · منسوخ | BP §12 C22 |
| Booking row | service, provider, date, status chip (§2.8), amount/estimate from server | — | — | — | — | BP §12 C22, §15.1 |
| Open request row (OQ-046 default) | "Choosing a provider" / "Waiting for offers" / "No provider found yet" | — | — | Choosing a provider · Waiting for offers | کاریگر کا انتخاب باقی ہے · قیمتوں کا انتظار | ARCH §6.2; OQ-046 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Open row | (row) | (row) | none (screen chosen by server status) | BP §12 |
| Load more | — (infinite scroll) | — | Next page (read) | BP §62.1 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton rows | — | — |
| E | Tab empty | Upcoming/Active: "No bookings here. What do you need?" + C31 button. Past: "Your finished jobs will appear here." Cancelled: "No cancelled bookings." | "یہاں کوئی بکنگ نہیں۔ آپ کو کیا کام ہے؟" / "آپ کے مکمل شدہ کام یہاں نظر آئیں گے۔" / "کوئی منسوخ بکنگ نہیں۔" |
| S | List | — | — |
| X | Load failed | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | Refresh timed out over a cached list: `G-STALE`; status chips labelled "as of {time}" | `G-STALE` | `G-STALE` |

**Notes:** no permission. "Book again" from a past booking is **not** built (BP §83 "Book again" Proposed; §86). Rebooking a provider is only from C42 (BP §55.2). Open: OQ-046 (tab grouping contract also needed from A04).

---

## C23 Addresses

- **Purpose:** manage saved addresses (BP §12, §21).
- **Entry:** C25/C27, C39 ("Saved addresses" → manage). **Exits:** back, C39 (add with map pin).
- **Requirement IDs:** PROF-ADDR-001, PROF-ADDR-002, PROF-ADDR-003, LOC-GEO-003, LOC-GEO-004, SCOPE-GEO-001.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Label | choice Home / Work / custom text | non-empty | Y | Label · Home · Work · Other | نام · گھر · دفتر · دیگر | BP §21, §57.3 |
| Address | text (typed) or confirmed via C39 (map pin / search) | non-empty; inside Pakistan (server) | Y | Address | پتہ | BP §21, §57.1 |
| Map position | from C39 pin (optional when typed manually) | server validates | N | Set on map | نقشے پر لگائیں | BP §57.3; PROF-ADDR-003 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Add address | Add address | پتہ شامل کریں | Create saved address | BP §21; PROF-ADDR-001 |
| Edit | Edit | ترمیم کریں | Update (does not change past bookings — snapshot) | BP §21; PROF-ADDR-002 |
| Delete | Delete | حذف کریں | Confirm → delete | BP §21 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton; save spinner | — | — |
| E | No saved addresses | No saved addresses yet. Add Home or Work to book faster. | ابھی کوئی پتہ محفوظ نہیں۔ جلدی بکنگ کے لیے گھر یا دفتر کا پتہ شامل کریں۔ |
| S | List; after server confirm: "Address saved." / "Address deleted." | Address saved. / Address deleted. | پتہ محفوظ ہو گیا۔ / پتہ حذف ہو گیا۔ |
| X | 422 / `OUT_OF_SERVICE_COUNTRY` | This address is outside Pakistan. Kaam Karo works only in Pakistan. | یہ پتہ پاکستان سے باہر ہے۔ کام کرو صرف پاکستان میں کام کرتا ہے۔ |
| P | Save/delete timed out: row shows pending marker; B-CHECK | `G-PENDING` | `G-PENDING` |

**Notes:** typing an address needs no permission (PROF-ADDR-003). Editing never changes existing bookings (PROF-ADDR-002) — note under the edit form: EN "Changes apply to new bookings only." / UR "تبدیلی صرف نئی بکنگز پر لاگو ہو گی۔"

---

## C24 Payments/receipts

- **Purpose:** transaction history and receipts (BP §12, §23, §9 step 26).
- **Entry:** C25/C27, C16, C20, notification `payment.succeeded` / `refund.issued`. **Exits:** receipt detail (same screen, detail mode), C20.
- **Requirement IDs:** PAY-009, PAY-006, NOTIF-006, PRICE-006, FARE-010, LEDGER-006.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Transaction row | date, booking #, amount, method (Cash/Digital), status (Paid / Failed / Refunded) | server | — | — | — | BP §12 C24; PAY-009 |
| Receipt detail | bill lines, tax line, total, paid by, date, booking # | server | — | Receipt | رسید | BP §23; D-029 |
| Refund row | linked reversal with amount and date | server | — | Refund | رقم کی واپسی | BP §26; PAY-006 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Open receipt | View | دیکھیں | Read receipt | PAY-009 |
| Share receipt summary | Share | شیئر کریں | Server share text → `ACTION_SEND` | BP §82 (booking summary); SHARE-001 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton | — | — |
| E | No transactions | No payments yet. Receipts appear here after a completed job is paid. | ابھی کوئی ادائیگی نہیں۔ مکمل کام کی ادائیگی کے بعد رسیدیں یہاں نظر آئیں گی۔ |
| S | List / receipt | — | — |
| X | Load failed | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | A payment still processing appears as "Processing" (server status), never as Paid | Processing | جاری ہے |

**Notes:** no permission. No customer wallet/credits (BP §46 Later; K-15). No platform-fee line (D-025).

---

## C25 Profile

- **Purpose:** personal information (BP §12); manage contact information (BP §8.1).
- **Entry:** main navigation. **Exits:** C23, C24, C27, C42, C30 (via C27).
- **Requirement IDs:** ROLE-001, SEC-AUTH-001, UX-SCREEN-004, OQ-012.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Name | text | non-empty | Y | Name | نام | BP §12 C25 |
| Mobile number | display; change needs an OTP on the **current** number and then an OTP on the **new** number (C05) | server | Y | Mobile number | موبائل نمبر | BP §8.1 ("manage contact information"), §27, §30; D-002; SEC-REVIEW #3 |
| City | choice (listed cities) | listed city | Y | City | شہر | BP §12 C04/C25 |
| Email | email, optional — hidden until OQ-012 answered | format | N | Email (optional) | ای میل (اختیاری) | OQ-012 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Save | Save | محفوظ کریں | Update profile | BP §8.1 |
| Change number | Change number | نمبر تبدیل کریں | Step 1: OTP to the **current** number → verify (C05, mode "current number"). Step 2: enter the new number → OTP to the **new** number → verify (C05, mode "new number"). On success the server changes the number, revokes all other sessions and sends a notice to the old number | BP §8.1, §27, §30; D-002; SEC-AUTH-002; SEC-REVIEW #3 |
| Lost your old number? | I no longer have my old number | میرے پاس پرانا نمبر نہیں رہا | none (opens C28: support-assisted recovery; no self-service change without the current number) | BP §27 ("controlled recovery"); SEC-AUTH-007; SEC-REVIEW #3 |
| Favorites / Addresses / Payments / Settings | (labels) | پسندیدہ · پتے · ادائیگیاں · سیٹنگز | none | BP §12 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton; save spinner | — | — |
| E | Not applicable: a logged-in user always has a profile; guest sees "Log in to see your profile" + C03 | Log in to see your profile. | اپنی پروفائل دیکھنے کے لیے لاگ اِن کریں۔ |
| S | After server confirm: "Profile saved." / number changed | Profile saved. / Your number is changed. Other devices were signed out. | پروفائل محفوظ ہو گئی۔ / آپ کا نمبر تبدیل ہو گیا۔ دوسرے آلات سے لاگ آؤٹ کر دیا گیا۔ |
| X | 422 inline; number already used (allowed here: the user is authenticated and the change is OTP-gated, SEC-REVIEW #9); OTP errors as C05 | This number is already used by another account. | یہ نمبر پہلے ہی کسی اور اکاؤنٹ میں استعمال ہو رہا ہے۔ |
| P | Save or number change timed out: B-CHECK; the old number stays shown until the server confirms | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. No profile photo for customers (not in BP §12). Number change rule (SEC-REVIEW #3): OTP on the current number **and** on the new number; other sessions revoked; old number notified; lost old number → support-assisted recovery (C28). Server side: A02 (T2.4/T3.1).

---

## C26 Notifications

- **Purpose:** booking / payment / support messages (BP §12) — in-app inbox, also the fallback when push permission is denied (M-06).
- **Entry:** main navigation, push tap. **Exits:** the related screen (C13, C17, C19, C20, C37, C18, C24, C28/C29).
- **Requirement IDs:** NOTIF-001…007, NOTIF-009, PERM-004.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Notification row | title + body (server template in user's language), time, read/unread, priority marker | server | — | — | — | BP §24, §80; CFG-RULE-011 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Open | (row) | (row) | Mark read; open target | BP §24 |
| Turn on notifications (if off) | Turn on | آن کریں | none (pre-prompt / settings link) | BP §75 item 96 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton | — | — |
| E | No notifications | No notifications yet. Updates about your bookings will appear here. | ابھی کوئی نوٹیفکیشن نہیں۔ آپ کی بکنگز کی خبریں یہاں نظر آئیں گی۔ |
| S | List | — | — |
| X | Load failed | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | Refresh timed out: `G-STALE` | `G-STALE` | `G-STALE` |

**Notes:** the notification text is a message; the target screen always re-reads the current status from the server (BP §15.1). Promotion notifications are not built (BP §80; NOTIF-009).

---

## C27 Settings

- **Purpose:** notifications, privacy, security, language, help (BP §12).
- **Entry:** C25. **Exits:** C41, C28, C30, system settings.
- **Requirement IDs:** NOTIF-009, SEC-AUTH-002, I18N-002, SHARE-001, PERM-001…006, OQ-039.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Notification categories | toggles from server list; critical categories shown locked "always on" | server | — | Notifications | نوٹیفکیشنز | BP §74, §80, §84 item 116; NOTIF-009 |
| Language | row → C41 | — | — | Language | زبان | BP §78.1 |
| App permissions | read-only list of what is on/off + "Open settings" | — | — | Permissions | اجازتیں | BP §75; permission-policy §3 |
| Privacy policy | link (config `legal.privacy_url`, TODO(OWNER)) | — | — | Privacy policy | پرائیویسی پالیسی | BP §12 C27; OQ-039 |
| Devices signed in | list from server: device name/model, last active time, "This device" marker | server | — | Devices signed in | سائن اِن آلات | BP §27, §30 ("suspicious-login detection, session revocation"); SEC-AUTH-002, ABUSE-009; SEC-REVIEW #12 |
| Security: devices/sessions | row | — | — | Log out of other devices | دوسرے آلات سے لاگ آؤٹ کریں | BP §27; SEC-AUTH-002 |
| Help | row → C28 | — | — | Help | مدد | BP §12 C27 |
| Share Kaam Karo | row | — | — | Invite friends to Kaam Karo | دوستوں کو کام کرو کی دعوت دیں | BP §82 (referral link); SHARE-001 |
| Delete account | row → C30 | — | — | Delete account | اکاؤنٹ حذف کریں | BP §12 C30 |
| Log out | button | — | — | Log out | لاگ آؤٹ | BP §27 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Toggle category | (toggle) | (toggle) | Update notification preference | NOTIF-009 |
| Sign out one device | Sign out | سائن آؤٹ کریں | Confirm → revoke that session | SEC-AUTH-002; SEC-REVIEW #12 |
| Log out of other devices | Log out other devices | دوسرے آلات سے لاگ آؤٹ | Confirm → revoke other sessions | SEC-AUTH-002 |
| Log out | Log out | لاگ آؤٹ | Revoke this session; clear secure storage | BP §27 |
| Share | Invite | دعوت دیں | Server referral/share text → `ACTION_SEND` | SHARE-001 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Preferences loading: skeleton toggles | — | — |
| E | Not applicable: settings always have rows | — | — |
| S | After server confirm: toggle settles; "Logged out of other devices." | Logged out of other devices. | دوسرے آلات سے لاگ آؤٹ ہو گیا۔ |
| X | Save failed: toggle returns to previous value + message | Couldn't save this setting. Try again. | یہ سیٹنگ محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔ |
| P | Toggle timed out: toggle shows a pending marker, not the new value | `G-PENDING` | `G-PENDING` |

**Notes:** quiet hours are **not** built (BP §83 Proposed). Low-data mode not built (BP §83). New-device sign-in: the server sends a critical notification (category "account", cannot be turned off) and the device appears in "Devices signed in" (SEC-REVIEW #12; KK-T3). Device list empty state: only "This device" is shown. Open: OQ-039.

---

## C28 Support

- **Purpose:** FAQ (L1 self-help) + ticket creation (BP §12, §40).
- **Entry:** C27, C17, C19, C38 ("open support", BP §77.3). **Exits:** C29, ticket detail (same screen), back.
- **Requirement IDs:** SUP-001, SUP-002, REQ-AI-014, CFG-RULE-012, VOICE-007, NOTIF-007, OQ-018.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| FAQ | list (content from server, en/ur) | — | — | Common questions | عام سوالات | BP §40 L1; SUP-001 |
| My tickets | list with status from server | — | — | My requests for help | مدد کی میری درخواستیں | BP §40; SUP-002 |
| New ticket: category | choice from config (OQ-018); AI may suggest, customer confirms | from server | Y | What is it about? | یہ کس بارے میں ہے؟ | BP §40, §56.3; REQ-AI-014; OQ-018 |
| New ticket: booking | optional picker of own bookings | own bookings only | N | Related booking (optional) | متعلقہ بکنگ (اختیاری) | BP §40 |
| New ticket: description | text | non-empty | Y | Tell us what happened | بتائیں کیا ہوا | BP §40 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Report a problem with a booking | Report a problem with a booking | بکنگ کا مسئلہ رپورٹ کریں | none (C29) | BP §12 C29 |
| Submit ticket | Send | بھیجیں | Create ticket (idempotent); AI category is only a suggestion until submit | BP §40; SUP-001, REQ-AI-014 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton; submit spinner | — | — |
| E | No tickets | You haven't asked for help yet. | آپ نے ابھی مدد کی کوئی درخواست نہیں کی۔ |
| S | After server confirm: ticket number | We got your request (#{number}). We'll reply here. | ہمیں آپ کی درخواست مل گئی (#{number})۔ ہم یہیں جواب دیں گے۔ |
| X | 422 / load failed | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | Submit timed out: B-CHECK; draft kept | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. SLA targets are not shown to the customer (OQ-018 open). Open: OQ-018.

---

## C29 Dispute/report issue

- **Purpose:** structured complaint flow (BP §12): booking, issue type, description, optional evidence (SUP-005).
- **Entry:** C20, C19, C17 (provider no-show), C28, C38 (summarised by voice — confirm required). **Exits:** C28 (ticket detail), back.
- **Requirement IDs:** SUP-003, SUP-004, SUP-005, BOOK-STATUS-012, BOOK-CANCEL-004, LEDGER-006, VOICE-007, MEDIA-008, REQ-AI-014, OQ-018.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Booking | preset or picker (own bookings) | own booking | Y | Booking | بکنگ | SUP-005 |
| Issue type | choice from config (OQ-018), incl. "wrong payment record" (ARCH §6.8) | from server | Y | What went wrong? | کیا غلط ہوا؟ | BP §12 C29; SUP-005; OQ-018 |
| Description | text (or summary prepared by C38, editable) | non-empty | Y | Describe the issue | مسئلہ بیان کریں | SUP-005; BP §77.3 |
| Evidence | photo picker / camera / document picker | limits from config | N | Add photos or documents (optional) | تصاویر یا دستاویزات شامل کریں (اختیاری) | SUP-005; BP §75 item 97 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Submit complaint | Submit complaint | شکایت جمع کرائیں | Confirm dialog → open dispute/ticket (idempotent); server decides booking status (Disputed when applicable) | BP §12 C29, §77.3; SUP-003; VOICE-007 |

Confirm dialog: EN "Submit this complaint about booking #{number}? Our team will review it." / UR "بکنگ نمبر {number} کے بارے میں یہ شکایت جمع کرائیں؟ ہماری ٹیم اس کا جائزہ لے گی۔"

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Issue types loading; submit spinner; evidence upload progress | `G-SENDING` | `G-SENDING` |
| E | Issue types list empty (config `null`): a single "Other" path with description only is offered by the server; if none, show error | We couldn't load issue types. | مسئلے کی اقسام لوڈ نہیں ہو سکیں۔ + B-RETRY |
| S | After server confirm: case number | Complaint received (#{number}). We'll update you here and by notification. | شکایت موصول ہو گئی (#{number})۔ ہم آپ کو یہاں اور نوٹیفکیشن کے ذریعے بتائیں گے۔ |
| X | 409 (booking not eligible) — copy only from allow-listed codes (§2.4), e.g. `CASE_ALREADY_OPEN`; any other code → generic. Upload failed (draft kept) | Case open: "You already have an open complaint for this booking." Generic: "You can't report this booking now. Please contact support." | "اس بکنگ کی ایک شکایت پہلے سے کھلی ہے۔" / "آپ ابھی اس بکنگ کی شکایت نہیں کر سکتے۔ براہِ کرم سپورٹ سے رابطہ کریں۔" |
| P | Submit timed out: B-CHECK; no "received" message | `G-PENDING` | `G-PENDING` |

**Notes:** camera only on tap; picker needs no permission. Outcomes (Resolved / Refunded / Rework / Closed) are shown from the server's Dispute record (SUP-003); refunds appear in C24 (SUP-004). Open: OQ-018.

---

## C30 Account deletion

- **Purpose:** confirm deletion and explain consequences (BP §12, §27).
- **Entry:** C27. **Exits:** C05 (fresh OTP, mode "confirm account deletion"), C02 (after the server confirms the request), back.
- **Requirement IDs:** SEC-AUTH-002, SEC-AUTH-008, DATA-003, ROLE-001, ABUSE-009, OQ-047.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Consequences text | display (from server: hold period if set; what is kept for records) | — | — | Deleting your account removes your personal details. Records of past bookings and payments are kept without your personal details. | اکاؤنٹ حذف کرنے سے آپ کی ذاتی معلومات ہٹا دی جائیں گی۔ پچھلی بکنگز اور ادائیگیوں کا ریکارڈ آپ کی ذاتی معلومات کے بغیر رکھا جائے گا۔ | BP §26, §27; SEC-AUTH-008, DATA-003 |
| Hold period | display if set (configurable, TODO(OWNER)) | — | — | Your account will be deleted after {period}. You can't undo it after that. | آپ کا اکاؤنٹ {period} بعد حذف ہو جائے گا۔ اس کے بعد واپسی ممکن نہیں۔ | SEC-AUTH-008 |
| Confirmation | checkbox | must be checked | Y | I understand | میں سمجھ گیا/گئی ہوں | BP §12 C30 ("confirm") |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Request deletion | Delete my account | میرا اکاؤنٹ حذف کریں | Confirm dialog → **fresh OTP** on the account's number (C05, mode "confirm account deletion") → request deletion with the OTP proof. On success the server revokes all sessions and push tokens and notifies the user by SMS during the hold period, with a "cancel deletion" route through support. The server may refuse (OQ-047) | BP §27, §30; SEC-AUTH-002, SEC-AUTH-008; SEC-REVIEW #10 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Consequences loading; request spinner | — | — |
| E | Not applicable: content always present (fallback text bundled) | — | — |
| S | After server confirm: logged out → C02 with message | Your deletion request was received. | آپ کی حذف کرنے کی درخواست موصول ہو گئی۔ |
| X | Refused — copy only from allow-listed codes (§2.4; codes from the A02 contract once OQ-047 is answered, e.g. `OPEN_BOOKING`, `PAYMENT_DUE`); any other code → generic. OTP errors as C05 | Open booking: "Please finish or cancel your open bookings first." Payment due: "Please pay for your completed booking first." Generic: "We can't delete your account right now. Please contact support." | "براہِ کرم پہلے اپنی کھلی بکنگز مکمل یا منسوخ کریں۔" / "براہِ کرم پہلے اپنی مکمل شدہ بکنگ کی ادائیگی کریں۔" / "ہم ابھی آپ کا اکاؤنٹ حذف نہیں کر سکتے۔ براہِ کرم سپورٹ سے رابطہ کریں۔" |
| P | Timed out: stay logged in, B-CHECK; never log out before the server confirms | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. A fresh OTP is required before the request (A15 ruling, SEC-REVIEW #10; OQ-047 default updated). Open: OQ-047 (refusal rules), hold period TODO(OWNER).

---

## C31 "What do you need?" conversational request composer

- **Purpose:** talk, type, photo, video or a mix; AI identifies the likely service and asks only missing questions (BP §56.1, §79, §85; ARCH §3.1).
- **Entry:** C06, C07/C08/C09/C10 ("Describe your problem"), C38 ("create a draft request"). **Exits:** C32, C33, C38, C39, C34, C12 (non-AI fallback), C03 (guest at submit).
- **Requirement IDs:** REQ-AI-001…004, REQ-AI-006, REQ-AI-010, REQ-AI-011, REQ-AI-012, PERF-002, PERF-004, MEDIA-003, MEDIA-008, MEDIA-009, PERM-002, PERM-003, REL-004, SHARE-001.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Prompt | display | — | — | What do you need? Speak, type or show us. | آپ کو کیا کام ہے؟ بول کر، لکھ کر یا دکھا کر بتائیں۔ | BP §79 steps 99–100 |
| Privacy hint | display under the inputs | — | — | Don't include your phone number or address. We share those only with the provider you choose. | اپنا فون نمبر یا پتہ شامل نہ کریں۔ یہ ہم صرف آپ کے منتخب کردہ کاریگر کو دیتے ہیں۔ | BP §52.2; PROF-ADDR-004; SEC-REVIEW #13 |
| Text input | multiline text, Urdu/English/mixed | length limit from server | one of text / audio / photo / video | Type here… | یہاں لکھیں… | BP §56.1 step 80, §79 |
| Audio note | button → C32; attached item with duration | limits from config | N | Record voice note | آواز ریکارڈ کریں | BP §76.1, §79 |
| Photo | Take photo (camera) / Choose from gallery (system picker) | count/size from config | N | Take photo · Choose from gallery | تصویر کھینچیں · گیلری سے منتخب کریں | BP §56.1 step 82, §76.3 |
| Video | Record (→ C33) / Choose from gallery | limits from config | N | Record video · Choose video | ویڈیو بنائیں · ویڈیو منتخب کریں | BP §76.2 |
| Document | system document picker | limits from config | N | Attach document | دستاویز لگائیں | BP §74; M-11 |
| AI reply area | messages: "Looks like: {likely service}"; at most two clarifying questions with tap answers or free text | from server (closed schema) | answers Y when asked | Looks like you need: {service} | لگتا ہے آپ کو یہ چاہیے: {service} | BP §56.1 step 81, §56.3, §67; REQ-AI-003, REQ-AI-011 |
| Time hint | chips Now / Today / Later (+ AI-suggested time shown as an editable chip, never applied silently) | — | Y before C34 | When? | کب؟ | BP §56.1 step 84, §79 step 104; REQ-AI-004 |
| Location hint | chip → C39 | confirmed in C39 | Y before C34 | Where? | کہاں؟ | BP §56.1 step 83, §79 step 103 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Send / Next | Next | آگے | Save draft + call interpret (AI endpoints only write drafts, ARCH §10.2) | BP §79; REQ-AI-001/005 |
| Answer question | (chip text) | (chip text) | Update draft + re-interpret | REQ-AI-003 |
| Use the simple form | Use the simple form | سادہ فارم استعمال کریں | none (C12 with everything entered so far) | BP §62.1, §67; REQ-AI-012 |
| Remove attachment | Remove | ہٹائیں | Detach media | BP §76.2 |
| Share "Need help with this" | Share | شیئر کریں | Server share text → `ACTION_SEND` | BP §82; SHARE-001 |
| Voice assistant | — | — | none (C38) | BP §77 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Interpreting: typing-style indicator with honest text; partial text streamed where supported (PERF-004); upload progress per attachment | Understanding your request… | آپ کی درخواست سمجھی جا رہی ہے… |
| E | Fresh composer: prompt + four input buttons; Next disabled until any input | — | — |
| S | Likely service + any question shown; when service, location and time are known → C34 | — | — |
| X | AI error/timeout → `G-AI-DOWN` + "Use the simple form" (input kept); low confidence → question or simple form (REQ-AI-006); upload failed → draft kept + retry (MEDIA-009); service not available in city | AI down: `G-AI-DOWN`. Service not offered in the city: "We don't offer this service here yet. Try describing it differently, or use the simple form." | `G-AI-DOWN` / "یہ سروس یہاں ابھی دستیاب نہیں۔ کسی اور طرح بیان کریں، یا سادہ فارم استعمال کریں۔" |
| P | Draft save timed out: content stays on device (REL-004) with "Not saved yet" marker; B-RETRY | Not saved yet. | ابھی محفوظ نہیں ہوا۔ |

**Notes:** pre-match privacy (SEC-REVIEW #13): the hint above is shown here, on C32 and on the C12 description; the server (A07 intake) redacts phone-number and address patterns from transcripts and AI summaries before they reach provider-facing payloads before a match (BP §52.2; PROF-ADDR-004, REQ-AI-009). Raw audio cannot be redacted (accepted residual risk, reduced by the hint). Permissions only on tap: camera (Take photo / Record video), microphone (C32 / C38); gallery and documents use system pickers (no permission). The AI never shows prices, provider credentials or a diagnosis (REQ-AI-010, REQ-AI-011). The customer can always finish without AI (BP §62.1). Guest: Next → C03 with `G-LOGIN-NEEDED`, draft kept.

---

## C32 Audio note recorder

- **Purpose:** elapsed + remaining time, pause/stop, replay, delete, re-record; ≈ 2 min max (BP §76.1; ARCH §3.1).
- **Entry:** C31, C12. **Exits:** back to the caller with the note attached.
- **Requirement IDs:** MEDIA-001, MEDIA-003, MEDIA-004, MEDIA-006, MEDIA-009, PERM-003.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Elapsed time | display mm:ss (LTR digits) | — | — | {mm:ss} | {mm:ss} | BP §76.1 |
| Remaining time | display | max = config `media.audio.max_seconds` (configurable, TODO(OWNER); BP target ≈ 2 min, D-011) | — | {mm:ss} left | {mm:ss} باقی | BP §76.1; MEDIA-001 |
| Recording indicator | visible mic/listening state | — | — | Recording | ریکارڈنگ جاری ہے | BP §76.1, §77.4 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Record | Record | ریکارڈ کریں | none (mic permission on first tap, `G-PERM-MIC-NOTE`) | BP §75 item 95, §76.1 |
| Pause / Resume | Pause / Resume | روکیں / جاری رکھیں | none | BP §76.1 |
| Stop | Stop | بند کریں | none | BP §76.1 |
| Replay | Play | سنیں | none | BP §76.1 |
| Delete | Delete | حذف کریں | Delete uploaded object if already uploaded | BP §76.1 |
| Re-record | Record again | دوبارہ ریکارڈ کریں | none (replaces local recording) | BP §76.1 |
| Use this note | Attach | منسلک کریں | Compress (mono speech-quality) → upload session → finalize (server checks duration and size) | BP §76.1; MEDIA-003, MEDIA-004 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Uploading: progress bar; recording continues locally until stopped | Uploading {n}%… | اپ لوڈ ہو رہا ہے {n}%… |
| E | Nothing recorded yet: big Record button + hint + privacy hint (SEC-REVIEW #13) | Tap record and explain the problem in your own words. Don't say your phone number or address. | ریکارڈ دبائیں اور اپنے الفاظ میں مسئلہ بتائیں۔ اپنا فون نمبر یا پتہ نہ بتائیں۔ |
| S | Server finalize confirms → "Voice note attached." | Voice note attached. | آواز کا نوٹ منسلک ہو گیا۔ |
| X | Mic denied → `G-PERM-DENIED` + "Type instead" back to C31; max reached (auto stop) → info; finalize rejected (too long/large, from server); upload failed → keep local file + retry | Max: "Maximum length reached. Recording stopped." Upload: "Upload failed. Your recording is kept. Try again." | "زیادہ سے زیادہ وقت پورا ہو گیا۔ ریکارڈنگ بند ہو گئی۔" / "اپ لوڈ نہیں ہوا۔ آپ کی ریکارڈنگ محفوظ ہے۔ دوبارہ کوشش کریں۔" |
| P | Finalize timed out: "Checking your upload…" B-CHECK; not shown as attached | `G-PENDING` | `G-PENDING` |

**Notes:** microphone permission only on the Record tap (PERM-003); recording stops when the screen leaves the foreground (permission-policy §3). Transcript is server-side via `SpeechToText` fake (MEDIA-006); transcript failure leaves the audio usable. Media limits: OQ-004 / D-011.

---

## C33 Problem video recorder

- **Purpose:** ≈ 30 s max, estimated file size, pause/delete/re-record, thumbnail (BP §76.2; ARCH §3.1).
- **Entry:** C31, C12. **Exits:** back with video attached.
- **Requirement IDs:** MEDIA-002, MEDIA-003, MEDIA-004, MEDIA-005, MEDIA-009, PERM-002, PERM-003 (OQ-023).

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Camera preview | live view, 720p-class default | — | — | — | — | BP §76.2; MEDIA-002 |
| Timer | elapsed / max (config `media.video.max_seconds`, configurable TODO(OWNER); BP target ≈ 30 s, D-011) | — | — | {s} / {max} s | {s} / {max} سیکنڈ | BP §76.2 |
| Estimated file size | display after recording/compression | — | — | About {size} MB | تقریباً {size} MB | BP §76.2; MEDIA-003 |
| Thumbnail | display after stop | — | — | — | — | BP §76.2 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Record | Record | ریکارڈ کریں | none (camera permission on tap; microphone only if sound is recorded, OQ-023) | BP §75 items 94–95; OQ-023 |
| Pause / Resume | Pause / Resume | روکیں / جاری رکھیں | none | BP §76.2 |
| Delete | Delete | حذف کریں | none / delete uploaded object | BP §76.2 |
| Re-record | Record again | دوبارہ ریکارڈ کریں | none | BP §76.2 |
| Use this video | Attach | منسلک کریں | Compress on device → upload session → finalize (server checks duration and size; thumbnail generated) | BP §76.2; MEDIA-004, MEDIA-005 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Compressing / uploading progress | Preparing video… / Uploading {n}%… | ویڈیو تیار ہو رہی ہے… / اپ لوڈ ہو رہا ہے {n}%… |
| E | Nothing recorded: preview + hint | Show the problem in a short video. | مختصر ویڈیو میں مسئلہ دکھائیں۔ |
| S | Server finalize confirms → "Video attached." | Video attached. | ویڈیو منسلک ہو گئی۔ |
| X | Camera denied → `G-PERM-DENIED` + "Choose a video from gallery" (system picker); max reached → auto stop; finalize rejected (too long/large); upload failed → kept + retry | Upload failed. Your request and video are kept. Try again. | اپ لوڈ نہیں ہوا۔ آپ کی درخواست اور ویڈیو محفوظ ہیں۔ دوبارہ کوشش کریں۔ |
| P | Finalize timed out: B-CHECK; not shown as attached | `G-PENDING` | `G-PENDING` |

**Notes:** camera permission only on tap; microphone per OQ-023 default (only if sound is recorded). Low-end phones: compression must not freeze the UI (PERF-006). Open: OQ-023, OQ-004.

---

## C34 Request summary confirmation

- **Purpose:** AI interpretation visible and editable; customer reviews a short summary and submits (BP §56.1 step 85, §67, §79 steps 105–106; ARCH §3.1).
- **Entry:** C31, C38 (draft ready). **Exits:** C35 (matches), C40 (no supply), C39 (edit location), C31 (edit), C12 (simple form).
- **Requirement IDs:** REQ-AI-005, REQ-AI-006, REQ-AI-011 (state flow ARCH §6.2), PERF-002, PERF-003, A11Y-008, VOICE-007, REL-003, REL-008, LOC-GEO-004, CFG-RULE-008, ANALYTICS-002.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Summary | editable text, in app language; server has already redacted phone/address patterns (SEC-REVIEW #13) | non-empty | Y | Summary for the provider | کاریگر کے لیے خلاصہ | BP §56.3, §78.3; REQ-AI-005; BP §52.2 |
| Interpreted service | editable picker ("likely service" wording) of active services | must be active in city | Y | Likely service: {service} · Change | ممکنہ سروس: {service} · تبدیل کریں | BP §67; REQ-AI-005, REQ-AI-011 |
| Location | confirmed snapshot → C39 | `CONFIRMED` | Y | Where | کہاں | BP §56.1 step 83 |
| Time | Now / Today / Later + window | — | Y | When | کب | BP §56.1 step 84 |
| Attachments | thumbnails (audio, photos, video) | — | — | Attachments | منسلکات | BP §79 |
| Preferences | non-sensitive chips | — | N | Preferences | ترجیحات | BP §77.3; MATCH-SCORE-004 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Find providers | Find providers | کاریگر تلاش کریں | Explicit customer submit → request `Submitted` → `Matching` (idempotent). Only this call submits; AI cannot (REQ-AI-005) | BP §79 step 106, §67; ARCH §6.2 |
| Edit (each field) | Change | تبدیل کریں | Update draft | BP §67 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Submitting → matching progress shown within the first frame (PERF-003) | Finding the right providers near you… | آپ کے قریب درست کاریگر ڈھونڈے جا رہے ہیں… |
| E | A required field missing (e.g. location not confirmed): field highlighted; Find disabled | Please confirm where the work is. / Please choose when. | براہِ کرم کام کی جگہ کی تصدیق کریں۔ / براہِ کرم وقت منتخب کریں۔ |
| S | Server returns `MatchesShown` → C35, or `NoSupply` → C40 | — | — |
| X | Service not active (edit service), `LIMIT_REACHED` (`G-LIMIT`), 422 | `G-LIMIT` / field message | `G-LIMIT` |
| P | Submit timed out: "We're checking if your request was sent." B-CHECK reuses the key — one request only | We're checking whether your request was sent. Please don't send it again. | ہم چیک کر رہے ہیں کہ آپ کی درخواست گئی یا نہیں۔ براہِ کرم دوبارہ نہ بھیجیں۔ |

**Notes:** no permission here. While `ai.confidence_threshold` is `null` (D-010, TODO(OWNER)), every AI request goes through C34 with the service editable (REQ-AI-006). The AI summary is never hidden (BP §67).

---

## C35 Supplier match results

- **Purpose:** comparison controls, map/list toggle, "Why am I seeing this?" reasons (BP §54.3, §55.1; ARCH §3.1). The customer chooses (D-005).
- **Entry:** C34, C12 (choose supplier), C40 (after broadening). **Exits:** C11, C14 (provider chosen), C36 (offers requested), C40, C34.
- **Requirement IDs:** MATCH-EXPL-001, MATCH-MODE-001, MATCH-FAIR-003, LOC-GEO-005, TRUST-BADGE-001…014, PROV-CREW-003, QUOTE-001, QUOTE-009, PERF-003, PERF-005, MATCH-GAP-001, OQ-045.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Request summary (top) | display | — | — | Your request: {summary} | آپ کی درخواست: {summary} | BP §55.1 |
| Location + travel context | display | — | — | {area} | {area} | BP §55.1 |
| Time | display | — | — | {time} / As soon as possible | {time} / جتنی جلدی ہو سکے | BP §55.1 |
| Suggested matches | small set first (size from config, D-010) | server order | — | Best matches | بہترین انتخاب | BP §55.1 |
| Supplier card | photo/logo, name, verification, service match (exact/related), distance/ETA, rating + count, completed jobs, availability, pricing model, badges, crew size (OQ-045) | server | — | {km} km · about {min} min · {rating} ({count}) · {jobs} jobs | {km} کلومیٹر · تقریباً {min} منٹ · {rating} ({count}) · {jobs} کام | BP §55.1; LOC-GEO-005; PROV-CREW-003 |
| Reasons | "Why am I seeing this?" expandable, real data | ≥ 1 per card | — | Why am I seeing this? | یہ مجھے کیوں دکھایا گیا؟ | BP §54.3; MATCH-EXPL-001 |
| Comparison controls | sort/filter chips: price, nearest, fastest response, highest rated, verified, customer favorites, experienced (+ others the server supports) | — | N | Sort and filter | ترتیب اور فلٹر | BP §55.1 |
| Map/list toggle | toggle; map loads progressively. The map shows **only** the customer's confirmed service location and, per provider, at most the service-area **name or coarse zone**. Never a provider's area-centre point, start location or home location; distance/ETA stay numbers on the card | — | — | Map · List | نقشہ · فہرست | BP §55.1, §21, §29, §81; PERF-005; SEC-REVIEW #14 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Choose this provider | Choose | منتخب کریں | Select candidate → server prices draft → C14 | BP §52.1, §53; D-005 |
| View profile | Profile | پروفائل | none (C11) | BP §12 C11 |
| Request offers from several providers | Get prices from several providers | کئی کاریگروں سے قیمت منگوائیں | Multi-select → invite selected providers (idempotent) → C36. Shown only where quotes are allowed for the service | BP §55.1, §53; QUOTE-001, QUOTE-009 |
| Sort/filter | (chip) | (chip) | Re-rank/filter (read) | BP §55.1 |
| Explain reasons | Why am I seeing this? | یہ مجھے کیوں دکھایا گیا؟ | none (reasons in payload) | BP §54.3 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Progress state with steps; cards appear as soon as available (PERF-003); map tiles progressive | Finding the right providers near you… | آپ کے قریب درست کاریگر ڈھونڈے جا رہے ہیں… |
| E | Zero candidates after matching → C40 (never an empty list; MATCH-GAP-001). A filter that hides all cards: "No providers match these filters." + Clear filters | No providers match these filters. | ان فلٹرز کے مطابق کوئی کاریگر نہیں۔ + فلٹر ہٹائیں |
| S | Cards with reasons | — | — |
| X | Matching failed → `G-SERVER` + B-RETRY (request kept); Maps failed → list view only + `G-MAPS-DOWN` banner; chosen provider no longer available (generic) | This provider is no longer available. Please choose another. | یہ کاریگر اب دستیاب نہیں۔ براہِ کرم کوئی اور منتخب کریں۔ |
| P | Matching still running after the timeout: keep progress text "Still looking…" with B-CHECK; invite-offers timed out: B-CHECK, no navigation | Still looking… | ابھی تلاش جاری ہے… |

**Notes:** location permission is not asked here (location already confirmed in C39). No paid/promoted placement (MATCH-FAIR-003). Nothing is auto-assigned (MATCH-MODE-001). Open: OQ-045, D-010 (set size, weights).

---

## C36 Multi-supplier offers comparison

- **Purpose:** structured fare lines + crew size side by side; customer selects one (BP §53, §58; D-004, D-005; ARCH §3.1).
- **Entry:** C35 (offers requested), C22 (OQ-046), notification `quote.received`. **Exits:** C13 (offer detail), C15 (offer accepted), C11.
- **Requirement IDs:** QUOTE-004, QUOTE-005, QUOTE-006, QUOTE-009, FARE-001…012, PROV-CREW-001, PROV-CREW-003, PROV-CREW-005, BOOK-STATUS-004, VOICE-007, REL-003, REL-008, NOTIF-002, SHARE-001.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Invited providers | list with response status (waiting / offered / declined / expired) | server | — | Waiting · Offer received · Declined · Expired | انتظار · قیمت موصول · انکار · میعاد ختم | BP §53 |
| Offer column/card | provider, total, line items by type (§2.7), tax line, crew size, inclusions/exclusions, duration, valid until | server | — | {n} workers will come · Valid until {date} | {n} افراد آئیں گے · {date} تک قابلِ قبول | BP §18, §58.1; D-004, D-029 |
| Estimate vs committed marker | per amount | server flag | — | Estimate · Fixed | اندازاً · طے شدہ | BP §53 ("which numbers are estimates") |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Choose this offer | Choose this offer | یہ پیشکش منتخب کریں | Confirm dialog (amount from server) → accept quote (idempotent); server closes the other open offers | BP §53; QUOTE-009; D-005; VOICE-007 |
| See details | Details | تفصیل | none (C13) | BP §18 |
| Ask a question | Ask | پوچھیں | none (C18 thread) | QUOTE-006 |
| Decline an offer | Decline | رد کریں | Confirm → decline that offer | BP §18 step 60 |
| Share comparison summary | Share | شیئر کریں | Server share text → `ACTION_SEND` | BP §82; SHARE-001 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton; accept: spinner, all choose buttons disabled | — | — |
| E | No offers yet (all waiting) | We've asked {n} providers. Offers will appear here — we'll notify you. | ہم نے {n} کاریگروں سے پوچھا ہے۔ قیمتیں یہاں نظر آئیں گی — ہم آپ کو بتا دیں گے۔ |
| S | Offers side by side; after confirmed accept → C15 | — | — |
| X | Offer expired (`QUOTE_EXPIRED`) / withdrawn / all declined or expired → offer options from server (re-match → C35, C40) | All providers declined or their offers expired. You can look for other providers. | تمام کاریگروں نے انکار کیا یا قیمتوں کی میعاد ختم ہو گئی۔ آپ دوسرے کاریگر تلاش کر سکتے ہیں۔ |
| P | Accept timed out: B-CHECK; no "accepted" label; other choose buttons stay disabled | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. Crew size is shown but never changes price (D-018). Side-by-side layout mirrors in `ur` (column order right-to-left). Quote validity: D-013 / OQ-006.

---

## C37 Extra-charge approval sheet

- **Purpose:** proposed → approve/reject (BP §52.1, §58.2; ARCH §3.1). Also used for other customer-visible changes after acceptance: crew-size change (PROV-CREW-004, BP §18 step 62).
- **Entry:** C19, C17, notification `charge.proposed` (NOTIF-005). **Exits:** back to C19/C17.
- **Requirement IDs:** FARE-004, FARE-006, FARE-012, FARE-013, QUOTE-008, PROV-CREW-004, PRICE-005, PRICE-007, BOOK-STATUS-010, VOICE-007, REL-003, REL-008, REQ-AI-013, NOTIF-005.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Proposed item | per line: type, description, qty/unit, amount, reason (tools must have a reason). The reason is provider-written content that passes the server moderation hook before it is shown (REQ-AI-009; SEC-REVIEW #13c) | server | — | {type}: Rs. {amount} — {reason} | {type}: {amount} روپے — {reason} | BP §58.1, §58.2; FARE-004 |
| Crew-size change | old → new | server | — | Workers: {old} → {new} | افراد: {old} → {new} | PROV-CREW-004 |
| New total if approved | display (server) | — | — | New total if you approve: Rs. {total} | منظوری کی صورت میں نئی کل رقم: {total} روپے | BP §58.2 |
| Explain charges | read-only AI explanation of the stored lines | — | — | Explain this charge | یہ چارج سمجھائیں | BP §56.3; REQ-AI-013 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Approve | Approve | منظور کریں | Confirm dialog → approve line/change (idempotent) | BP §58.2; FARE-012; VOICE-007 |
| Reject | Reject | رد کریں | Confirm → reject line/change | BP §58.2 |
| Ask the provider | Ask | پوچھیں | none (C18) | BP §18 step 60 |

Confirm dialog: EN "Approve Rs. {amount} for {item}? The new total will be Rs. {total}." / UR "{item} کے لیے {amount} روپے منظور کریں؟ نئی کل رقم {total} روپے ہو گی۔"

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Sheet skeleton; decision spinner | — | — |
| E | Nothing pending (already decided or withdrawn) | Nothing needs your approval right now. | ابھی کسی چیز کے لیے آپ کی منظوری درکار نہیں۔ |
| S | After server confirm: item shows Approved / Rejected | Approved. / Rejected. | منظور ہو گیا۔ / رد ہو گیا۔ |
| X | 409 (item changed/withdrawn) → `G-CHANGED` | `G-CHANGED` | `G-CHANGED` |
| P | Decision timed out: item shows "Checking your decision…"; both buttons disabled; B-CHECK | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. A Proposed line is never shown inside the payable total (PRICE-007). Emergency exception is off (`fare.emergency_exception_enabled = false`, FARE-013, K-10) — no "already done" charges are shown as payable.

---

## C38 Voice assistant overlay

- **Purpose:** push-to-talk, listening state, recognised text, undo/cancel, text fallback; confirm dialogs for consequential actions (BP §77; ARCH §3.1, §10.3).
- **Entry:** C06, C07, C08, C09, C31, C34, C35, C17 (§2.9). **Exits:** stays on top; navigates per command; closes back to the same task.
- **Requirement IDs:** VOICE-001…008, PERM-003, REQ-AI-001, REQ-AI-004, REQ-AI-014, I18N-002.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Push-to-talk button | press-and-hold or tap start/stop | — | — | Tap to speak | بولنے کے لیے دبائیں | BP §77.4; VOICE-001 |
| Listening indicator | animated + text (not colour only) | visible for whole capture | — | Listening… | سن رہا ہے… | BP §77.4; VOICE-002 |
| Language chip | shows active language (follows app language; can switch) | en / ur | — | English · اردو | English · اردو | BP §77.1, §78.3; VOICE-006 |
| Recognised text | editable text shown before applying important commands | — | — | I heard: "{text}" | میں نے سنا: "{text}" | BP §77.4; VOICE-003 |
| Text fallback input | text field always available | — | — | Or type here | یا یہاں لکھیں | BP §77.4; VOICE-005 |
| Assistant reply | text (and read aloud where supported) | — | — | — | — | BP §77.3 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Speak | Tap to speak | بولنے کے لیے دبائیں | none until stop; mic permission on first tap (`G-PERM-MIC-VOICE`) | BP §75 item 95, §77.4 |
| Apply | Do it | کر دیں | Send recognised/typed command → intent parser (allowed actions only, VOICE-008) | BP §77.3 |
| Undo / cancel that | Undo | واپس کریں | Revert last voice change to the draft | BP §77.4; VOICE-004 |
| Close | Close | بند کریں | none (back to the same task, draft kept) | BP §77.4 |
| Consequential action (book, accept quote, pay, cancel, complaint) | — | — | Opens the same confirm dialog as the tap path; nothing is sent before Confirm | BP §77.3; VOICE-007 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Processing recognised speech / command | Working on it… | کام ہو رہا ہے… |
| E | Idle: hint examples from BP §77.2 | Try: "Mera AC thanda nahi kar raha" or "Only verified providers". | آزمائیں: "میرا اے سی ٹھنڈا نہیں کر رہا" یا "صرف تصدیق شدہ کاریگر"۔ |
| S | Command applied after server/app confirms; summary of what changed + Undo | Done: {what changed}. | ہو گیا: {what changed}۔ |
| X | Speech failed → text field focused, same task (VOICE-005); mic denied → text only; unsupported request → "not supported" (VOICE-008) | I couldn't hear that. Please try again or type. / I can't do that here. | میں سن نہیں سکا۔ دوبارہ کوشش کریں یا لکھیں۔ / میں یہ کام یہاں نہیں کر سکتا۔ |
| P | Command sent, result unknown (timeout) → nothing claimed; B-CHECK | `G-PENDING` | `G-PENDING` |

**Notes:** no wake word, no background capture; mic closes when the overlay closes (VOICE-001). STT vendor open (D-009) → `SpeechToText` fake. The assistant applies only non-sensitive preferences (BP §77.3).

---

## C39 Location confirm

- **Purpose:** detected address, map pin, search, saved address, manual entry (BP §57.1, §57.3; ARCH §3.1).
- **Entry:** C06, C12, C31, C34, C23 (add). **Exits:** back to the caller with a confirmed Location Snapshot.
- **Requirement IDs:** LOC-GEO-001…006, PROF-ADDR-001, PROF-ADDR-003, SCOPE-GEO-001, SCOPE-GEO-002, PERM-001, A11Y-006.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| City suggestion | display + change | must be a listed city; never silently locked | Y | We think you are in {city}. Change? | ہمارا خیال ہے آپ {city} میں ہیں۔ تبدیل کریں؟ | BP §57.3; LOC-GEO-002 |
| Use current location | button | permission on tap | N | Use current location | موجودہ لوکیشن استعمال کریں | BP §57.3; PERM-001 |
| Detected address | display (reverse geocoded by server) | — | — | Is this the right address? {address} | کیا یہ درست پتہ ہے؟ {address} | BP §57.1 steps 88–89 |
| Map pin | draggable pin (Google Maps) | inside Pakistan | N | Move the pin to the exact place | پن کو صحیح جگہ پر لے جائیں | BP §57.3 |
| Place search | text with suggestions (Places, via server) | — | N | Search for a place or address | جگہ یا پتہ تلاش کریں | BP §57.3 |
| Saved addresses | list (C23) | — | N | Saved addresses | محفوظ پتے | BP §57.3 |
| Manual entry | text (house, street, area) | non-empty | N | Type the address | پتہ لکھیں | BP §21, §57.1 step 90 |
| Service at another location | toggle/label | — | N | Service at another location | کسی اور جگہ سروس | BP §57.3 |
| Save as | optional label to save (Home/Work/other) | — | N | Save this address | یہ پتہ محفوظ کریں | BP §57.3 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Use current location | Use current location | موجودہ لوکیشن استعمال کریں | Pre-prompt `G-PERM-LOC` → system prompt → reverse geocode | BP §57.1 steps 86–88; PERM-001 |
| Confirm address | Confirm address | پتے کی تصدیق کریں | Create Location Snapshot `CONFIRMED` (server enforces Pakistan + city activity) | BP §57.1 steps 89, 92; LOC-GEO-004 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Getting GPS fix / geocoding: spinner on the detected-address card | Finding your location… | آپ کی لوکیشن معلوم کی جا رہی ہے… |
| E | No location yet (permission not asked): search, saved addresses and manual entry shown first; "Use current location" offered | Where should the work be done? | کام کہاں کرنا ہے؟ |
| S | Snapshot confirmed by server → back to caller | Address confirmed. | پتے کی تصدیق ہو گئی۔ |
| X | Permission denied → `G-PERM-DENIED`, manual/search focused; Maps down → `G-MAPS-DOWN`, manual entry (LOC-GEO-006); outside Pakistan (`OUT_OF_SERVICE_COUNTRY`); city not active yet | Outside: "Kaam Karo works only in Pakistan." Not active: "Kaam Karo is not active in {city} yet." | "کام کرو صرف پاکستان میں کام کرتا ہے۔" / "کام کرو ابھی {city} میں فعال نہیں ہے۔" |
| P | Confirm timed out: B-CHECK; caller does not receive an unconfirmed address | `G-PENDING` | `G-PENDING` |

**Notes:** location permission only on a tap of "Use current location" (LOC-GEO-001, PERM-001; tap-only per SEC-REVIEW #19); opening C39 never triggers a prompt; foreground only; approximate location must also work (M-04). Store only the needed location detail (BP §57.1 step 91). Maps keys are restricted (LOC-GEO-008, server/A06).

---

## C40 No-supply / supply-gap screen

- **Purpose:** explain and offer next actions: broaden radius, other time, callback, waitlist, related service (BP §61.3; ARCH §3.1).
- **Entry:** C34 / C35 (server `NoSupply`), C36 (all offers declined). **Exits:** C35 (after broaden/other time/related service), C22, C06.
- **Requirement IDs:** MATCH-GAP-001 (OQ-021), HEALTH-001.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Explanation | display; copy only from allow-listed codes (§2.4; proposed for the A05 contract: `NONE_AT_TIME`, `NONE_NEARBY`); unknown → the first sentence only | — | — | We couldn't find a provider for this right now. + `NONE_AT_TIME`: "No one is available at the time you chose." / `NONE_NEARBY`: "No one serves your area for this yet." | ہمیں ابھی اس کام کے لیے کوئی کاریگر نہیں ملا۔ + "آپ کے منتخب وقت پر کوئی دستیاب نہیں۔" / "ابھی آپ کے علاقے میں یہ سروس دینے والا کوئی نہیں۔" | BP §61.3; SEC-REVIEW #11 |
| Options | list of the configured options returned by the server | — | — | What would you like to do? | آپ کیا کرنا چاہیں گے؟ | BP §61.3; MATCH-GAP-001 |

**Actions** (only those the server returns)

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Search a wider area | Search a wider area | بڑے علاقے میں تلاش کریں | Re-match with broadened radius | BP §61.3 |
| Choose another time | Choose another time | کوئی اور وقت منتخب کریں | Update time → re-match | BP §61.3 |
| Request a callback — **depends on OQ-055; not built until a staff contact route exists** (staff `CallRelay` or an audited reveal for the ticket owner) | Ask Kaam Karo to call me | کام کرو مجھے کال کرے | Create callback (default: Operations ticket, OQ-021). Hidden while the server does not offer it | BP §61.3; OQ-021, OQ-055; SEC-REVIEW #18 |
| Join the waitlist | Join the waitlist | انتظار کی فہرست میں شامل ہوں | Store waitlist entry (default: health metrics only; no automatic "notify when available", BP §83) | BP §61.3; OQ-021 |
| Try a related service | Try {related service} | {related service} آزمائیں | Re-match with related service | BP §61.3 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Option action in flight: spinner on that option | `G-SENDING` | `G-SENDING` |
| E | Server returned no options (config empty): explanation + "Back to home" and C28 help — never a blank screen | You can try again later or ask us for help. | آپ بعد میں دوبارہ کوشش کر سکتے ہیں یا ہم سے مدد لیں۔ |
| S | Callback: "We'll call you." (after server confirm); Waitlist: "You're on the waitlist." Re-match → C35 | We'll call you. / You're on the waitlist. | ہم آپ کو کال کریں گے۔ / آپ انتظار کی فہرست میں شامل ہو گئے۔ |
| X | Action failed | `G-NET` + B-RETRY | `G-NET` + B-RETRY |
| P | Callback/waitlist timed out: B-CHECK; no success text | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. Callback (SEC-REVIEW #18): admin screens mask phone numbers (OQ-055 default "no reveal"), so staff could not call back; the option stays off until OQ-055 gives a contact route. Waitlist copy must not promise a notification (BP §83 "No-supply alert" is Proposed). Callback timing is not promised (no SLA, OQ-018). Open: OQ-021.

---

## C41 Language selection (onboarding + settings)

(Derived screen, ARCH §3.1. First onboarding step after C01.)

- **Purpose:** choose English or Urdu; changeable any time (BP §78.1).
- **Entry:** C01 (first launch), C27 (Settings → Language). **Exits:** C02 (onboarding) or back to C27.
- **Requirement IDs:** I18N-001, I18N-002, I18N-003, VOICE-006, UX-SCREEN-001.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Language | single choice (2 options, each shown in its own script) | one of `en`, `ur` | Y | Choose your language | اپنی زبان منتخب کریں | BP §78.1; I18N-002 |
| Option English | choice | — | — | English | English (shown in Latin script) | BP §78.1 |
| Option Urdu | choice | — | — | اردو (shown in Urdu script) | اردو | BP §78.1 |
| Pre-selected value | default | device language if `ur`, else `en` | — | — | — | BP §78.1 ("inferred from the device language") |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Continue / Save | Continue | جاری رکھیں | Logged-in user: save language preference on profile (used for notifications and summaries, BP §78.3). Guest: stored on device only | BP §78.1, §78.3; I18N-002 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Saving preference (logged in): button shows spinner; UI already switched locally | `G-SENDING` | `G-SENDING` |
| E | Not applicable: the two options are bundled in the app, never empty | — | — |
| S | Layout switches immediately (RTL for `ur`); onboarding continues / settings shows the new value | Language changed. | زبان تبدیل ہو گئی۔ |
| X | Server save failed: UI keeps the chosen language on this device; message offers retry so notifications also use it | Language changed on this phone. We couldn't save it to your account yet. | زبان اس فون پر تبدیل ہو گئی۔ ابھی آپ کے اکاؤنٹ میں محفوظ نہیں ہو سکی۔ + B-RETRY |
| P | Save timed out: same as X with B-CHECK | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. Voice assistant language follows this setting by default (BP §78.3; VOICE-006). Each option has an accessible label in its own language.

---

## C42 Favorites

- **Purpose:** saved suppliers, quick rebook (BP §55.2 "Favorite" user action; ARCH §3.1).
- **Entry:** C25, C11. **Exits:** C11, C12 (rebook with provider preset) → C14.
- **Requirement IDs:** PROF-FAV-001, LEDGER-NEG-002, MATCH-ELIG-073…079, COMM-004, HEALTH-008.

**Fields**

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Favorite row | provider photo/logo, name, verification, rating, services | server | — | — | — | BP §55.2 |
| Notes | optional text per favorite | length from server | N | Your note (optional) | آپ کا نوٹ (اختیاری) | PROF-FAV-001 (Favorite stores optional notes); BP §66 |

**Actions**

| Action | EN | UR | Requests from server | Source |
|---|---|---|---|---|
| Book again | Book again | دوبارہ بک کریں | none → C12 with provider preset; eligibility (all hard rules incl. unpaid commission) checked by the server at submit | BP §55.2; PROF-FAV-001; LEDGER-NEG-002 |
| Remove | Remove | ہٹائیں | Delete Favorite | BP §55.2 |
| Edit note | Edit note | نوٹ میں ترمیم | Update note | PROF-FAV-001 |
| Open profile | (row) | (row) | none (C11) | BP §12 C11 |

**States**

| State | What the user sees | EN copy | UR copy |
|---|---|---|---|
| L | Skeleton | — | — |
| E | No favorites | No favorites yet. Tap the heart on a provider's profile to save them. | ابھی کوئی پسندیدہ نہیں۔ محفوظ کرنے کے لیے کاریگر کی پروفائل پر دل کا نشان دبائیں۔ |
| S | List; removal confirmed by server | Removed from favorites. | پسندیدہ سے ہٹا دیا گیا۔ |
| X | Rebook refused (provider not eligible now — any reason) → generic message, offer C31/C35 | {provider} can't take new bookings right now. You can find another provider. | {provider} ابھی نئی بکنگ نہیں لے سکتا۔ آپ کوئی اور کاریگر تلاش کر سکتے ہیں۔ |
| P | Remove timed out: pending marker; B-CHECK | `G-PENDING` | `G-PENDING` |

**Notes:** no permission. The customer never sees *why* a provider is ineligible (unpaid commission, rating block, safety block are not the customer's information — COMM-004, BP §17). "Favorite" is not the "Customer Favorite" badge (BP §55.2). "Book again" from past bookings (BP §83) is not built — this is the BP §55.2 favorite rebook only.

---

## 3. Navigation summary (BP §9 journey → screens)

| BP §9 step | Screens |
|---|---|
| 11 Open app | C01 → C41 (first launch) → C02 → C03 → C05 → C04 (new users only, after OTP; SEC-REVIEW #9) → C06 |
| 12 Choose location / allow when needed | C06 → C39 |
| 13 Browse or search in everyday language | C06, C07, C08, C09, C31, C38 |
| 14 View and compare | C08, C11, C35 |
| 15 Service detail | C10 |
| 16 Fixed booking / quote / inspection | C10 → C12 or C31 → C34 |
| 17–18 Address, time, description, photos | C12 / C31–C33, C39 |
| 19 Review price/terms | C14 (or C13/C36 for quotes) |
| 20 Confirm | C14 / C13 / C36 → C15 |
| 21 Provider acceptance or quote | C17, C13, C36, C26 |
| 22 Payment (only after Completed, D-003) | C20 → C16 |
| 23 Track | C17, C19, C37, C18 |
| 24 Confirm completion or report | C20, C29 |
| 25 Rate/review | C21 |
| 26 Receipt and history | C24, C22 |

Supply gap: C34/C35 → C40. Support: C28, C29. Account: C25, C23, C27, C30, C41, C42.

## 4. Open items referenced in this file

| Ref | Topic | Screens |
|---|---|---|
| OQ-004 / D-011 | Media limits and retention | C12, C18, C31–C33 |
| OQ-005 / D-012 | Timeouts / performance budgets | all (§2.2) |
| OQ-006 / D-013 | Quote validity, cancellation windows | C13, C14, C17, C36 |
| OQ-007 / D-022 | Customer confirms recorded payment method | C20 |
| OQ-008 | Guest browsing | §2.13, C02 |
| OQ-010 | Price model vs selling mode | C10 |
| OQ-012 | Email at registration | C04, C25 |
| OQ-017 | Customer request limits | §2.4, C12, C34 |
| OQ-018 | Support categories and SLAs | C28, C29, C40 |
| OQ-021 | Supply-gap callback / waitlist | C40 |
| OQ-023 | Video sound | C33 |
| OQ-025 | Live location vs status + ETA | C17 |
| OQ-028 | OTP and session numbers | C03, C05 |
| OQ-035 | Tax type/rate | §2.7, C13, C14, C16, C20, C24 |
| D-008 / OQ-001 | Payment gateway | C16 |
| D-009 / OQ-002 | SMS, STT, masked calling vendors (fakes) | C03, C05, C17, C18, C32, C38 |
| D-010 / OQ-003 | Ranking weights, badges, AI confidence threshold | C34, C35 |
| **OQ-039** (new) | Terms and privacy documents | C04, C27 |
| **OQ-040** (new) | Phone format, OTP length, C04 required fields | C03, C04, C05 |
| **OQ-041** (new) | Popular / featured services rule | C06, C09 |
| **OQ-042** (new) | Reviews on service detail | C10 |
| **OQ-043** (new) | Review tags and text length | C21 |
| **OQ-044** (new) | Who moves a booking to Completed | C20 |
| **OQ-045** (new) | Crew size before the provider states it | C14, C35 |
| **OQ-046** (new) | Where submitted requests without a booking appear | C22, C36 |
| **OQ-047** (new) | Account deletion refusal rules (fresh OTP now required, SEC-REVIEW #10) | C30 |
| OQ-055 | Admin contact route / reveal (blocks C40 callback) | C40 |
| OQ-077 | DIGITAL recorded but not received; "I paid cash" | C20 |
| **OQ-048** (new) | Search result filters | C08 |
| D-030 (was OQ-049) | Cash recorded only by the provider; booking exists only after acceptance — answered | C14, C15, C16, C20 |
| **OQ-050** (new) | Customer cancellation reasons | C17 |

## 5. Not built (explicitly excluded, with source)

"Book again" from past bookings, smart request memory, no-supply alerts, quiet hours, low-data mode, family/shared household (BP §83, §86 Proposed); customer wallet/credits, subscriptions (BP §46 Later; K-15); promotions/coupons (BP §14 A14, CFG-RULE-010); contacts picker, calendar, biometrics, Bluetooth (BP §74, §75 item 98); customer platform fee (D-025); payment before completion, late-cancellation / no-show / declined-inspection fees (D-003, D-023); password login (D-002); auto-assignment (D-005); sponsored placement (BP §68, MATCH-FAIR-003); live provider map (default of OQ-025).

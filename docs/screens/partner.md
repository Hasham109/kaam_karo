# Kaam Karo — Partner App screen specs (P01–P26)

> Task **T1.2** (owner A12, with A00). Written 2026-10-23. Spec only: no code.
> Acceptance (IMPL §6 Phase 1): every screen has all 5 states defined. Requirements: UX-SCREEN-002, UX-SCREEN-003.

## 0. How to read this file

### 0.1 Sources used (authority order, CLAUDE.md)

1. `coordination/DECISIONS.md` — D-002, D-003, D-004, D-005, D-006, D-007, D-008, D-010, D-011, D-012, D-013, D-014, D-015, D-016, D-017, D-018, D-019, D-020, D-021, D-022, D-023, D-024, D-025, D-027, D-028, D-029.
2. `docs/BLUEPRINT.md` — base: §4.1, §4.2, §7, §8.2, §10, §13 (screen inventory P01–P21), §15, §15.1, §16, §17, §18, §19, §20, §21, §22, §24, §26, §27, §28, §29, §30, §31.1, §37, §38, §40. v0.3: §52.2, §53, §54.1, §55.1, §55.2, §56.3, §57.4, §58, §59, §60, §62.2, §62.3. v0.4: §74, §75, §76, §78, §80, §81, §82, §83, §85, §86. Later layers win.
3. `docs/architecture.md` — §3.2 (derived screens P22–P26, K-06), §5.5, §5.6, §6.1, §6.3–§6.8, §7, §8, §11, §12, §13, §15.
4. `docs/requirements/REQUIREMENTS.md` (requirement IDs), `docs/security/permission-policy.md` (rows M-01…M-11), `coordination/OPEN_QUESTIONS.md`.

Screen IDs and names are exactly BP §13 (P01–P21) and ARCH §3.2 (P22–P26, derived from BP §59.3, §59.2, §18/§58 + D-004, §76.1, §74). No other screen IDs are used. Where a needed screen has no ID, an open question is raised instead (OQ-063, chat).

### 0.2 Legend — the 5 states (UX-SCREEN-003; BP §45, §31.1)

| State | Meaning on every screen |
|---|---|
| **Loading** | First fetch or refresh is running. Show skeleton/progress, never a blank screen (REL-001, PERF-003). Text loads before images/maps (PERF-005). |
| **Empty** | Server answered successfully with no items/data. Always say what the provider can do next (A11Y-005). |
| **Success** | Server **confirmed** the data or the requested action. A success message is shown only after the server response (REL-005, BP §31.1). |
| **Error** | Server refused (4xx with an error code), failed (5xx), or the request timed out before it was sent. The message says what to do next (A11Y-005); safe actions offer Retry (REL-002). |
| **Pending/unknown** | A write was sent but the result is not known (network lost / timeout after sending). Show "not confirmed yet", block a second send of the same action, reconcile on reconnect (REL-006, REL-003). |

Other markers used in tables:

| Marker | Meaning |
|---|---|
| **Server-allowed** | The button is shown only if the server's `allowedNextActions` (or equivalent permission flag) for this object contains it (BOOK-STATUS-016, BP §15.1, §29). The app never decides status, price or permission. |
| `TODO(OWNER)` | The owner has not decided this value. The app reads it from server config; nothing is hard-coded (CLAUDE.md rule 2). |
| `OQ-nnn` | Open question in `coordination/OPEN_QUESTIONS.md`. The element is **not built** beyond the stated default until answered. |
| `Display` | Read-only value from the server. |
| `G1-…` | Copy key from the global section G below (same EN/UR text everywhere). |

### 0.3 Urdu labels are DRAFT

Every Urdu (UR) string in this file is a **draft** written by A12. It must be reviewed by A14 and a native reviewer in T1.4 before it goes into `packages/i18n`. Common provider trade words (AC, Wi-Fi, CCTV, ID, IBAN) may stay in English where natural (BP §78.2, I18N-005). All strings live in `packages/i18n`, never in code (I18N-006). Service and category names come from the backend (BP §37). In Urdu strings the brand is written "کام کرو" (same as customer.md; QA F-02); A14 confirms the final Urdu brand rendering in T1.4.

---

## G. Global patterns (written once; every screen refers to them)

### G1. Network: timeout, retry, offline banner (BP §31.1, §62.3; REL-001…007, PERF-006, A11Y-007)

| Rule | Detail | Source |
|---|---|---|
| Timeout | Every network call has a timeout. Values come from config (performance budgets are open, D-012 / OQ-005): `TODO(OWNER)`. | BP §62.3; D-012 |
| Safe retry | Reads may auto-retry with back-off. Writes are **never** auto-retried unless they carry an idempotency key (REL-007). Every write sends an idempotency key (REL-008, ARCH §8 rule 3) so a repeated tap returns the original result (REL-003). | BP §31.1, §31.2 |
| Double tap | After a write is sent, its button is disabled and shows progress until the server answers. | BP §31.1; REL-003 |
| Offline banner | When the device has no connection: a non-blocking top banner on every screen. Cached data stays visible with "last updated" time. Write buttons are disabled with the G1-offline-action text. | BP §31.1, §38; A11Y-007 |
| Pending/unknown | If a write was sent and the connection drops or times out: the screen shows its Pending/unknown copy, keeps the button locked, and asks the server for the object's current state on reconnect (same idempotency key). Never assume success or failure. | BP §31.1; REL-006 |
| Local draft | Long forms (P02 profile step, P05, P13, P14 notes, P15 Pay company, P20, P24) keep a local draft that survives an app kill (REL-004). Drafts never contain OTP codes or payout account numbers. | BP §31.1 |
| Error codes | The app maps server error codes to copy (table G6). Unknown codes use G1-generic-error. | ARCH §8 |

Global copy:

| Key | EN | UR (DRAFT) |
|---|---|---|
| G1-offline | You are offline. We will update when you are back online. | آپ آف لائن ہیں۔ انٹرنیٹ واپس آنے پر ہم معلومات اپ ڈیٹ کر دیں گے۔ |
| G1-offline-action | Connect to the internet to do this. | یہ کام کرنے کے لیے انٹرنیٹ سے جڑیں۔ |
| G1-timeout | This is taking too long. Check your internet and try again. | اس میں بہت دیر لگ رہی ہے۔ انٹرنیٹ چیک کریں اور دوبارہ کوشش کریں۔ |
| G1-generic-error | Something went wrong on our side. Please try again. | ہماری طرف سے کوئی خرابی ہوئی۔ براہ کرم دوبارہ کوشش کریں۔ |
| G1-retry | Try again | دوبارہ کوشش کریں |
| G1-pending | Not confirmed yet. We are checking with the server — please do not tap again. | ابھی تصدیق نہیں ہوئی۔ ہم سرور سے چیک کر رہے ہیں — براہ کرم دوبارہ نہ دبائیں۔ |
| G1-last-updated | Last updated {time} | آخری اپ ڈیٹ {time} |
| G1-loading | Loading… | لوڈ ہو رہا ہے… |

### G2. Permission on tap (BP §28, §74, §75 items 93–98; PERM-001…006; permission-policy §2)

| Capability | Partner app use | Asked only when | Fallback if denied | Source |
|---|---|---|---|---|
| Camera | P26 before/after evidence; P18 profile photo | The provider taps a camera action | System photo picker | BP §74, §75 item 94; M-01 |
| Photo picker (no permission) | P26, P18, P15 Pay company screenshot | Tap "Choose photo" | — (no permission needed) | BP §75 item 97; M-03 |
| Document picker (no permission) | P03 verification documents | Tap "Upload document" | Verification stays pending; never bypassed | BP §74; M-11 |
| Location (foreground only) | **Not requested at launch** until OQ-025 is answered. If the owner approves live ETA later: only while a booking is `Provider En Route`. P07 never uses GPS (map pin or place search) | Only if OQ-025 is approved: tap "I'm on my way" on P12 | Navigation hand-off of the job address (needs no permission); ETA computed by the server from the service address | BP §57.4, §75 item 93, §81; LOC-GEO-007; M-04; SEC-REVIEW-T1.1-1.3 #7 |
| Notifications (Android 13+) | New job alerts, reminders, account alerts | Default: after onboarding, before the provider first goes Online (P22), with a short value explanation | In-app P19 inbox and P08 list still work | BP §75 item 96, §80; NOTIF-010; OQ-026 |
| Microphone | **Not requested** at launch | — | — | BP §74 ("optional future"); OQ-024 |
| Never requested | Contacts, call logs, calendar, Bluetooth, background location, broad storage/media | — | — | BP §75 item 98; PERM-006 |

Every permission ask shows a one-line reason first (BP §74 "explain why it is needed"), then the system dialog. If the provider chooses "Don't allow", the screen shows the fallback, not an error loop.

| Key | EN | UR (DRAFT) |
|---|---|---|
| G2-camera-why | Kaam Karo needs the camera to take a photo of your work. | کام کی تصویر لینے کے لیے کام کرو کو کیمرہ چاہیے۔ |
| G2-location-why | Your location is used only during this job to help you reach the customer. | آپ کی لوکیشن صرف اس کام کے دوران گاہک تک پہنچنے کے لیے استعمال ہوگی۔ |
| G2-notif-why | Turn on notifications so you don't miss new jobs and payment updates. | نوٹیفیکیشن آن کریں تاکہ نئے کام اور ادائیگی کی اطلاعات نہ چھوٹیں۔ |
| G2-denied | Permission not given. You can still continue: {fallback}. | اجازت نہیں دی گئی۔ آپ پھر بھی آگے بڑھ سکتے ہیں: {fallback}۔ |
| G2-open-settings | Open phone settings | فون کی سیٹنگز کھولیں |

### G3. Live location indicator (BP §57.4, §81; LOC-GEO-007; SEC-REVIEW-T1.1-1.3 #7)

- **At launch the Partner app sends no provider location.** Navigation is a hand-off of the job address to the chosen navigation app (no permission needed), and the server computes the ETA from the service address (permission-policy §5). This holds until OQ-025 is answered.
- If the owner later approves live ETA (OQ-025): location is collected **only** while the booking is `Provider En Route`, stops on `Arrived` (or any other state), only in the foreground, never in the background (PERM-006), with a retention period from config `TODO(OWNER)`.
- In that case only, a persistent strip is shown at the top of every screen while location is sent: G3-strip. Tapping it opens P12 for that job. G3-stop stops sending (navigation keeps working) — sharing "limited to what the job actually needs" (BP §81).
- The customer never sees a live map until OQ-025 says so; status + ETA only.

| Key | EN | UR (DRAFT) |
|---|---|---|
| G3-strip | Sharing your location for job #{id} | جاب #{id} کے لیے آپ کی لوکیشن شیئر ہو رہی ہے |
| G3-stop | Stop sharing | شیئرنگ بند کریں |

### G4. RTL mirroring and Urdu typography (BP §78.2; I18N-001…008, A11Y-001…004)

- Language is chosen on P01 (or from the device language) and can be changed any time in P21; it applies immediately (I18N-002, BP §78.1).
- In Urdu the whole layout mirrors: text alignment, icons with direction (back/next arrows, chevrons), list row order, tab order, bottom sheets, step indicators (P12), sliders (P07 radius) (I18N-003).
- Do **not** mirror the content of: phone numbers, transaction IDs, account numbers, amounts, booking IDs, times, media player timelines (they stay left-to-right inside an RTL row).
- Urdu font: Noto Nastaliq Urdu candidate with generous line height (I18N-004). Rows, chips and buttons grow in height; no fixed-height text containers. Tested on the reference phone (D-027) and emulator E-MIN (OQ-034).
- Status is never shown by colour alone: every status chip has a text label (A11Y-003). Every icon button has an EN/UR accessibility label (A11Y-004). Tap targets follow the UI-kit minimum (A11Y-002).

### G5. Money, dates and numbers (BP §37; I18N-007)

- All amounts are PKR, formatted by the shared formatter (A14, T1.4), e.g. EN `Rs. 3,800`, UR `3,800 روپے`. Amounts always come from the server; the app never computes price, commission, tax or balance (SEC-BASE-007, BP §29).
- A negative balance is shown with the words "You owe" (not colour only): EN `You owe Rs. 600`; UR `آپ پر 600 روپے واجب الادا ہیں`.
- Dates/times use local conventions (Pakistan time) from the shared formatter.

### G6. Server-driven actions and account-level states (BP §15.1, §29; BOOK-STATUS-016, SEC-BASE-007)

- Buttons for status changes, accept/quote, record payment, start job etc. are rendered **only** from the server's allowed actions. If the server refuses an action anyway, the app shows the mapped error and re-fetches the object.
- Error code → copy:

| Code (server) | When | EN | UR (DRAFT) | Source |
|---|---|---|---|---|
| `UNPAID_COMMISSION` | Accept/quote/start refused because balance < limit | You owe Rs. {amount} to Kaam Karo. Pay the company to take or start jobs. [Pay company] | آپ پر کام کرو کے {amount} روپے واجب الادا ہیں۔ کام لینے یا شروع کرنے کے لیے کمپنی کو ادائیگی کریں۔ [کمپنی کو ادائیگی کریں] | D-020, D-021; LEDGER-NEG-002, -005 |
| `TRANSITION_NOT_ALLOWED` | Status changed meanwhile | This job has changed. We have refreshed it. | اس کام کی صورتحال بدل گئی ہے۔ ہم نے اسے تازہ کر دیا ہے۔ | BOOK-STATUS common rule |
| `QUOTE_EXPIRED` | Quote validity passed | This quote has expired. | اس کوٹیشن کی مدت ختم ہو گئی ہے۔ | QUOTE-004 |
| `ACCOUNT_BLOCKED` | Account blocked (reason code from the allow-list below) | Your account is blocked: {reason}. Contact support. | آپ کا اکاؤنٹ بند ہے: {reason}۔ مدد کے لیے رابطہ کریں۔ | SEC-AUTH-006; D-014 |
| `LIMIT_NOT_CONFIGURED` | Media limit not configured outside dev | Uploads are not available right now. Please try later. | اپ لوڈ ابھی دستیاب نہیں۔ براہ کرم بعد میں کوشش کریں۔ | MEDIA-004; D-011 |
| 401 | Session expired or revoked | Please log in again. | براہ کرم دوبارہ لاگ ان کریں۔ | SEC-AUTH-002 |
| 403 | Not allowed | You can't do this. | آپ یہ نہیں کر سکتے۔ | SEC-BASE-003 |
| 422 | Validation | Please check the highlighted fields. | براہ کرم نشان زدہ خانے چیک کریں۔ | SEC-BASE-005 |
| 429 | Rate limit | Too many tries. Please wait and try again. | بہت زیادہ کوششیں۔ تھوڑا انتظار کر کے دوبارہ کوشش کریں۔ | SEC-AUTH-004, SEC-BASE-006 |

- **Reason slots** (SEC-REVIEW-T1.1-1.3 #11): every `{server reason}` and `{reason}` in this file is copy looked up from an **allow-listed reason code** in `packages/i18n`. Unknown codes show G1-generic-error. Free text from the server is never rendered. Text the provider enters never reaches the customer raw: cancel reasons are codes (OQ-065) and notes/descriptions pass the moderation hook (G7).
- **Block reasons** (SEC-REVIEW #21): `ACCOUNT_BLOCKED` carries a provider-safe reason code only, never internal investigation notes. Allow-list at spec time: `LOW_RATING` → "Your average rating stayed below the required level" / "آپ کی اوسط ریٹنگ مقررہ حد سے کم رہی" (D-014); `ADMIN_SUSPENSION` → "Your account was suspended by Kaam Karo" / "کام کرو نے آپ کا اکاؤنٹ معطل کر دیا ہے" (BP §8.3); any other code → "Contact support for details" / "تفصیل کے لیے سپورٹ سے رابطہ کریں". New codes are added only through the A02 contract.

- **Account-level banners** (shown on P04 and on the screens named; content and amounts from the server):

| Banner | Shown when (server flag) | EN | UR (DRAFT) | Action | Source |
|---|---|---|---|---|---|
| Unpaid commission | Balance below `ledger.max_negative_balance` (seeded 0) | You owe Rs. {amount}. You cannot get new jobs or start accepted jobs until it is paid. | آپ پر {amount} روپے واجب الادا ہیں۔ ادائیگی تک آپ نئے کام نہیں لے سکتے اور قبول شدہ کام شروع نہیں کر سکتے۔ | Pay company (P15) | D-020, D-021; LEDGER-NEG-003 |
| Payment under review | A Pay-company submission is waiting for Finance | Payment of Rs. {amount} sent for checking. You can take jobs again once it is approved. | {amount} روپے کی ادائیگی جانچ کے لیے بھیج دی گئی ہے۔ منظوری کے بعد آپ دوبارہ کام لے سکیں گے۔ | View (P15) | D-021; LEDGER-PAY-006 |
| Rating warning | Server issued warning n (no warnings while enforcement is in dry-run, RATING-ENF-008) | Your average rating is below {threshold}. Warning {n} of {N}. | آپ کی اوسط ریٹنگ {threshold} سے کم ہے۔ وارننگ {n} از {N}۔ | View (P17) | D-014, D-017; RATING-ENF-004, -007 |
| Verification needed | Level is Basic (not eligible for normal jobs) | Complete verification to start getting jobs. | کام ملنا شروع ہونے کے لیے تصدیق مکمل کریں۔ | Open P03 | BP §22.1; TRUST-VER-001 |
| Account blocked | `ACCOUNT_BLOCKED` (incl. reason `LOW_RATING`) | Full-screen state, see P04 | — | Support route given by the server | SEC-AUTH-006; D-014; ARCH §7 |

The unpaid-commission block is **not** a suspension: earnings, support, profile and existing chats keep working (LEDGER-NEG-004).

### G7. Privacy before a match (BP §21, §52.2; PROF-ADDR-004, QUOTE-002)

Before the customer chooses this provider and the booking is accepted, the Partner app shows **area-level location + distance only**, never the customer's phone number or exact address. The app displays only what the server returns; the server must not send hidden private data for the app to "hide". Exact reveal moment: default per OQ-027.

Free text that crosses between the two sides goes through the server moderation/redaction hook (REQ-AI-009; SEC-REVIEW #13): the server redacts phone-number and address patterns from transcripts and AI summaries before they reach P08/P09/P25 before a match, and the P24 "note to customer" and P13 descriptions pass the same hook as chat. Raw audio cannot be redacted (accepted residual risk, A15).

### G8. Accessibility (BP §38)

Readable sizes and contrast from the UI kit (A11Y-001), large tap targets (A11Y-002), labels on icons (A11Y-004), errors that say what to do (A11Y-005), clear poor-network states (A11Y-007). Media in P25 has a text alternative where available (transcript, MEDIA-006).

Every interactive element (button, field, chip, toggle, list row, sheet action, banner action) has an accessible label in en and ur **and a stable `testID`** that does not change with the language (RQ-002 item 4; same rule as `docs/screens/customer.md` §2.11), so one Maestro flow runs in both languages (QA F-05).


### G9. Booking status labels — provider wording (BP §15; ARCH §6.1; A11Y-003; QA F-01)

Every booking-status chip (P04, P08, P09, P11, P12 stepper, P19 items) shows the label below for the server status, with an icon, never colour alone. The app never invents a status; an unknown status code shows "Status: updating" / "اسٹیٹس اپ ڈیٹ ہو رہا ہے" and re-fetches. Wording is the same as `docs/screens/customer.md` §2.8 wherever the meaning is the same for both sides; the column "Diff" records each intended audience difference.

| Server status | EN label | UR label (DRAFT) | Diff vs customer.md §2.8 |
|---|---|---|---|
| Draft | — (never shown to providers) | — | Providers never receive Draft bookings |
| Requested | New request | نئی درخواست | Intended: the provider receives the request (customer: "Request sent") |
| Quote Pending | Price needed | قیمت درکار ہے | Intended: the provider must price/inspect (customer: "Waiting for price") |
| Quoted | Quote sent | کوٹیشن بھیج دی گئی | Intended: the provider sent it (customer: "Price received") |
| Accepted | Accepted | قبول ہو گئی | Same |
| Scheduled | Scheduled | وقت طے ہو گیا | Same |
| Provider En Route | On the way | راستے میں | Intended: the provider is the subject (customer: "Provider on the way") |
| Arrived | Arrived | پہنچ گئے | Intended: the provider is the subject (customer: "Provider has arrived") |
| In Progress | Work in progress | کام جاری ہے | Same |
| Awaiting Approval | Waiting for customer approval | گاہک کی منظوری کا انتظار | Intended: the customer approves (customer: "Your approval needed") |
| Completed | Completed | کام مکمل ہو گیا | Same |
| Disputed | Issue under review | شکایت زیرِ غور ہے | Same |
| Cancelled | Cancelled | منسوخ | Same |
| Expired | Expired | میعاد ختم | Same |
| Closed | Closed | بند | Same |
| Rejected (ARCH §6.1 note 2) | Declined | انکار کر دیا گیا | Intended: Rejected follows the provider's Decline (customer: "Not accepted") |
| No-show (ARCH §6.1 note 2) | No-show — {party} | حاضر نہیں ہوا — {party} | Same base label; `{party}` from the server party code: CUSTOMER → "customer" / "گاہک", PROVIDER → "you" / "آپ" |

---

## 1. Onboarding and account

### P01 — Provider welcome

- **Purpose:** provider-specific onboarding (BP §13 P01): what the Partner app does for a provider (BP §52.2, §60) and the language choice (BP §78.1).
- **Requirement IDs:** UX-SCREEN-002, I18N-002, SEC-AUTH-006.
- **Entry:** app start with no valid session. **Exits:** P02 (Get started / Log in); P04 when a valid session exists; P03 when the session is valid but the level is still Basic (TRUST-VER-001).

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| App language | Choice: English / اردو | One of `en`, `ur` | Yes (default = device language) | Language | زبان | BP §78.1; I18N-002 |
| Value points | Display (3 bundled lines) | — | — | Get job requests near you · Set your own hours and area · Track your earnings | اپنے قریب کام کی درخواستیں پائیں · اپنے اوقات اور علاقہ خود طے کریں · اپنی آمدنی دیکھیں | BP §52.2, §60 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Choose language | English / اردو | English / اردو | None (stored on device; saved to profile after login, P21) | BP §78.1 |
| Get started | Get started | شروع کریں | None → P02 (new provider path) | BP §10 step 27 |
| Log in | I already have an account | میرا اکاؤنٹ پہلے سے ہے | None → P02 phone step (OQ-062) | D-002 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Checking a saved session | Opening Kaam Karo Partner… | کام کرو پارٹنر کھل رہا ہے… |
| Empty | No saved session (normal first view) | Welcome to Kaam Karo Partner | کام کرو پارٹنر میں خوش آمدید |
| Success | Server confirms the saved session | (no message) → P04 or P03 | (کوئی پیغام نہیں) → P04 یا P03 |
| Error | Session check failed / offline | We couldn't check your account. G1-offline · G1-retry | ہم آپ کا اکاؤنٹ چیک نہیں کر سکے۔ G1-offline · G1-retry |
| Pending/unknown | Session check timed out | Still checking your account… G1-retry | آپ کا اکاؤنٹ ابھی چیک ہو رہا ہے… G1-retry |

Notes: no permission is asked on this screen (BP §75). A blocked account (`ACCOUNT_BLOCKED`) shows the G6 blocked state, not P04.

### P02 — Provider registration

- **Purpose:** identity/contact/business info (BP §13 P02) with phone number + OTP and no password (D-002). Also used by returning providers to log in (default, OQ-062).
- **Requirement IDs:** SEC-AUTH-001, SEC-AUTH-004, UX-SCREEN-004, PROV-CREW-006, ABUSE-002.
- **Entry:** P01. **Exits:** returning provider → P04 (or P03 if Basic); new provider after the profile step → P05 (select services, BP §10 step 29), then P07, P06, P03 (BP §10 steps 29–32).
- Three steps on one screen: (a) phone, (b) OTP code, (c) profile (new providers only).

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Mobile number | Phone (+92 prefix shown, LTR) | Pakistan mobile number; final check by server (SEC-BASE-005) | Yes | Mobile number | موبائل نمبر | D-002; BP §27 |
| OTP code | Numeric code | Length from server; expiry, resend cooldown and attempt limit from config `TODO(OWNER)` (OQ-028) | Yes | Enter the code sent to {phone} | {phone} پر بھیجا گیا کوڈ درج کریں | D-002; SEC-AUTH-004 |
| Full name | Text | Not empty; server limits | Yes | Your full name | آپ کا پورا نام | BP §13 P02 ("identity") |
| Provider type | Choice: Individual worker / Team or company | One value | Yes | How do you work? | آپ کیسے کام کرتے ہیں؟ | BP §7, §22.1; D-004 |
| — option | Individual worker | — | — | I work alone | میں اکیلا کام کرتا ہوں | D-004 |
| — option | Team or company | — | — | I have a team / company | میری ٹیم / کمپنی ہے | D-004; BP §22.1 |
| Business name | Text | Server limits | Only if Team or company | Business name | کاروبار کا نام | BP §13 P02 ("business info"), §22.1 |
| Usual team size | Integer | ≥ 1 | No (optional display) | Usual number of workers in your team | آپ کی ٹیم میں عام طور پر کتنے کاریگر ہوتے ہیں | D-004; ARCH §5.6 |
| Team leader note | Display | — | — | Only you, the team leader, are verified. Team members are not added to the app. | صرف آپ (ٹیم لیڈر) کی تصدیق ہوگی۔ ٹیم ممبرز ایپ میں شامل نہیں کیے جاتے۔ | D-018; PROV-CREW-006 |
| City | Display: Lahore | Server: active city only | — | City: Lahore | شہر: لاہور | D-007, D-019 |
| Email | Email | Valid format | No — only if OQ-012 confirms collection; never used for login | Email (optional) | ای میل (اختیاری) | OQ-012; UX-SCREEN-004 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Send code | Send code | کوڈ بھیجیں | Request OTP for the number (rate-limited; 429 handled) | D-002; SEC-AUTH-004 |
| Verify | Verify | تصدیق کریں | Verify OTP → session (+ "new provider" flag) | D-002; SEC-AUTH-001 |
| Resend code | Resend code (in {s}s) | کوڈ دوبارہ بھیجیں ({s} سیکنڈ میں) | Request OTP again; countdown value from server config (OQ-028) | SEC-AUTH-004 |
| Change number | Change number | نمبر تبدیل کریں | None (back to step a) | D-002 |
| Save and continue | Save and continue | محفوظ کریں اور آگے بڑھیں | Create/update provider profile (server sets level = Basic) | BP §10 step 28, §22.1 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Sending code / verifying / saving | Sending code… / Checking code… / Saving… | کوڈ بھیجا جا رہا ہے… / کوڈ چیک ہو رہا ہے… / محفوظ ہو رہا ہے… |
| Empty | Step a with no number entered | Enter your mobile number to continue. | آگے بڑھنے کے لیے اپنا موبائل نمبر درج کریں۔ |
| Success | Server confirmed OTP / saved profile | Number verified. / Profile saved. | نمبر کی تصدیق ہو گئی۔ / پروفائل محفوظ ہو گئی۔ |
| Error | Wrong/expired code; 429; validation | That code is not correct or has expired. Request a new code. / G6 429 / G6 422 | یہ کوڈ درست نہیں یا اس کی مدت ختم ہو گئی ہے۔ نیا کوڈ منگوائیں۔ / G6 429 / G6 422 |
| Pending/unknown | Verify or save sent, no answer | G1-pending. We will check again when you are online. | G1-pending۔ آن لائن ہونے پر ہم دوبارہ چیک کریں گے۔ |

Notes: no password field anywhere (UX-SCREEN-004). The OTP code is never stored in the local draft (G1). Whether providers must accept terms at registration (BP §12 C04 lists "terms" for customers only) is part of OQ-062; keep aligned with the customer answer to OQ-039. Number format and code length follow the customer default of OQ-040. SMS auto-read is not specified → not built.

### P03 — Verification

- **Purpose:** submit documents/details based on service risk (BP §13 P03, §22); only the team leader is verified (D-018). Upload uses the system document picker (BP §74; M-11).
- **Requirement IDs:** TRUST-VER-001, TRUST-VER-002, TRUST-VER-003, PROV-CREW-006, MEDIA-008, PERM-005, ABUSE-001.
- **Entry:** end of onboarding; P04 "Verification needed" banner; P21. **Exits:** P04.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Current level | Display chip: Basic / Verified / Business Verified | — | — | Your level: {level} | آپ کا درجہ: {level} | BP §22.1 |
| Level names | Display | — | — | Basic · Verified · Business Verified | بنیادی · تصدیق شدہ · تصدیق شدہ کاروبار | BP §22.1 |
| Required items | List from server (per category/risk config) | Item list comes only from server config (OQ-015, `TODO(OWNER)`) | As marked by server | Documents needed for your services | آپ کی سروسز کے لیے ضروری دستاویزات | BP §22, §42; OQ-015 |
| Item file | Document from the system picker | File type and size limits from config (D-011, OQ-004) | Per item | Upload document | دستاویز اپ لوڈ کریں | BP §74; M-11 |
| Item status | Display chip from server: Not uploaded / Uploaded / Under review / Accepted / Needs action | — | — | (chip text as listed) | اپ لوڈ نہیں ہوئی / اپ لوڈ ہو گئی / جانچ جاری ہے / منظور / کارروائی درکار | BP §10 step 32 |
| Reviewer note | Display (server text) | — | — | Note from Kaam Karo: {text} | کام کرو کا نوٹ: {text} | OQ-064 (default: shown when the server sends it) |
| Team leader note | Display | — | — | Only you, the team leader, are verified. | صرف آپ (ٹیم لیڈر) کی تصدیق ہوتی ہے۔ | D-018 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Upload document | Upload document | دستاویز اپ لوڈ کریں | Create upload session → upload → finalize (ARCH §11) | BP §74; M-11 |
| Replace | Replace | تبدیل کریں | Same, for an item in "Needs action" (server-allowed; OQ-064, related admin side OQ-057 b) | OQ-064 |
| Submit for review | Submit for review | جانچ کے لیے جمع کریں | Submit verification request; the server sets the status | BP §10 step 32 |
| Retry upload | Retry upload | دوبارہ اپ لوڈ کریں | Resume/restart the upload session | MEDIA-009 (pattern) |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching level and items / uploading | Loading your verification… / Uploading {p}% | آپ کی تصدیق لوڈ ہو رہی ہے… / اپ لوڈ {p}% |
| Empty | Server returns no required items yet (config not set) | No documents are needed yet. We will tell you if something is required. | ابھی کوئی دستاویز درکار نہیں۔ ضرورت ہونے پر ہم آپ کو بتائیں گے۔ |
| Success | Server confirmed submission / level changed | Sent for review. We will notify you of the result. / You are now {level}. | جانچ کے لیے بھیج دیا گیا۔ نتیجے کی اطلاع دی جائے گی۔ / اب آپ کا درجہ {level} ہے۔ |
| Error | Upload/submit refused or failed | Upload failed. Your other documents are safe. G1-retry | اپ لوڈ ناکام ہوا۔ آپ کی باقی دستاویزات محفوظ ہیں۔ G1-retry |
| Pending/unknown | Submit sent, no answer | G1-pending. Your documents are saved. | G1-pending۔ آپ کی دستاویزات محفوظ ہیں۔ |

Notes: no camera or storage permission; document picker only (PERM-005, PERM-006). Documents are private (verification access only, permission-policy §7). The app never sets the level; only Risk/Trust in A04 does (TRUST-VER-002). Specialized Verified is not built (TRUST-VER-004, Not launch).

---

## 2. Home and setup

### P04 — Provider home

- **Purpose:** today's jobs, pending requests, earnings snapshot (BP §13 P04), plus the status entry (P22) and account banners (G6).
- **Requirement IDs:** UX-SCREEN-002, LEDGER-NEG-003, LEDGER-NEG-004, RATING-ENF-007, TRUST-VER-001, AVAIL-007, COMM-004, SEC-AUTH-006.
- **Entry:** after login; bottom navigation. **Exits:** P08, P09/P12 (job tap), P11, P15, P22, P03, P17, P19.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Live status | Display chip + tap → P22 (availability status with P22 labels — not a booking status) | — | — | Status: {availability label} | اسٹیٹس: {availability label} | BP §59.3 |
| Account banners | Display (G6) | — | — | (G6) | (G6) | D-014, D-020, D-021; BP §22.1 |
| Today's jobs | List: time, service name (from server), area, status chip (G9 label), crew size | — | — | Today's jobs | آج کے کام | BP §13 P04; D-004; G9 |
| Pending requests | Count + first items (P08 card format) | — | — | New requests ({n}) | نئی درخواستیں ({n}) | BP §13 P04 |
| Earnings snapshot | Display: pending, available, paid, balance (G5) | — | — | Pending · Available · Paid · Balance | زیرِ التوا · دستیاب · ادا شدہ · بیلنس | BP §13 P04, P15; OQ-070 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Change status | Change | تبدیل کریں | None → P22 | BP §59.3 |
| See all requests | See all | سب دیکھیں | None → P08 | BP §13 |
| Open job | (row tap) | (row tap) | None → P09 or P12 by server status | BP §13 |
| Pay company | Pay company | کمپنی کو ادائیگی کریں | None → P15 Pay company | D-021 |
| Refresh | Pull to refresh | تازہ کرنے کے لیے نیچے کھینچیں | Re-fetch the home summary | BP §31.1 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching summary | G1-loading (skeleton cards) | G1-loading |
| Empty | No jobs today and no requests | No jobs today. Keep your status Online to get new requests. | آج کوئی کام نہیں۔ نئی درخواستیں پانے کے لیے اپنا اسٹیٹس آن لائن رکھیں۔ |
| Success | Summary loaded | (content) | (مواد) |
| Error | Fetch failed | We couldn't load your home screen. G1-retry | ہوم اسکرین لوڈ نہیں ہو سکی۔ G1-retry |
| Pending/unknown | Offline with cached data | G1-offline · G1-last-updated | G1-offline · G1-last-updated |

Blocked account (full-screen, replaces content; `{reason}` = allow-listed block-reason copy, G6): EN "Your account is blocked. Reason: {reason}. {support route}" — UR "آپ کا اکاؤنٹ بند کر دیا گیا ہے۔ وجہ: {reason}۔ {support route}" (SEC-AUTH-006, D-014, ARCH §7 `provider.blocked_low_rating`).

Notes: amounts come from the server (G5). Notification permission is not asked here (asked on first Online, P22, OQ-026).

### P05 — Service setup

- **Purpose:** create/edit services and pricing (BP §13 P05; BP §8.2 "define services, prices"; BP §10 steps 29 and 33).
- **Requirement IDs:** ROLE-002, MATCH-ELIG-074, MATCH-ELIG-077, PRICE-001…005, FARE-001, FARE-002, I18N-006, PROV-CREW-005.
- **Entry:** onboarding (after P02); P04/P21 menu. **Exits:** P07 (onboarding next), back.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Category | Choice from server (active families only) | Must be active in Lahore | Yes | Category | کیٹیگری | D-024; BP §37 |
| Service | Choice from server (services of the category) | Must be active | Yes | Service | سروس | BP §10 step 29; D-024 |
| Price model | Display from catalog: Fixed / From / Inspection–quote | — | — | Pricing type: {model} | قیمت کی قسم: {model} | BP §4.1; ARCH §5.5 |
| Selling models | Display from catalog: Instant / Choose supplier / Request quotes | — | — | How customers book: {modes} | گاہک کیسے بک کرتے ہیں: {modes} | BP §53; ARCH §5.5 |
| Pricing unit | Display from catalog (job, hour, room…) | — | — | Per {unit} | فی {unit} | BP §4.2 |
| Price amount (Fixed) | Money (PKR) | > 0; bounds per OQ-072 | If model = Fixed | Your fixed price | آپ کی مقررہ قیمت | BP §4.1, §8.2, §17; OQ-072 |
| Starting price (From) | Money (PKR) | > 0; bounds per OQ-072 | If model = From | Starting from | کم از کم قیمت سے شروع | BP §4.1, §17; OQ-072 |
| Visit / call-out fee | Money (PKR) | ≥ 0 | No | Visit fee | وزٹ فیس | BP §4.2, §58.1; FARE-001 |
| Inspection fee | Money (PKR) | ≥ 0 | No (Inspection–quote services) | Inspection fee | معائنہ فیس | BP §58.1; FARE-002 |
| Inspection fee deductible | Yes/No | — | If inspection fee > 0 | Deduct the inspection fee from the final repair price? | کیا معائنہ فیس آخری مرمت کی قیمت میں سے کم ہوگی؟ | BP §58.1; PRICE-003 |
| Verification needed | Display from server | — | — | Needs {level} verification | {level} تصدیق درکار ہے | BP §54.1 rule 77; MATCH-ELIG-077 |
| Published | Display chip: Published / Not published | — | — | Published / Not published | شائع شدہ / شائع نہیں | BP §10 step 33 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Add service | Add service | سروس شامل کریں | None → form | BP §10 step 29 |
| Save | Save | محفوظ کریں | Create/update provider service + prices (server validates) | BP §8.2 |
| Publish / Stop offering | Publish / Stop offering | شائع کریں / پیشکش بند کریں | Request publish state; server-allowed only when eligible (verification) | BP §10 step 33; MATCH-ELIG-077 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching catalog / my services; saving | G1-loading / Saving… | G1-loading / محفوظ ہو رہا ہے… |
| Empty | No services yet | Add the services you offer so customers can find you. | وہ سروسز شامل کریں جو آپ دیتے ہیں تاکہ گاہک آپ کو ڈھونڈ سکیں۔ |
| Success | Server saved | Service saved. | سروس محفوظ ہو گئی۔ |
| Error | Save refused / failed | We couldn't save this service. {server reason} G1-retry | یہ سروس محفوظ نہیں ہو سکی۔ {server reason} G1-retry |
| Pending/unknown | Save sent, no answer | G1-pending. Your changes are kept on this phone. | G1-pending۔ آپ کی تبدیلیاں اس فون پر محفوظ ہیں۔ |

Notes: service names, descriptions, inclusions/exclusions and units come from the backend catalog (BP §37, I18N-006). Which price fields the provider may set and any min/max bounds → OQ-072; until then the provider sets only the amounts listed above and the server validates. Crew size is never a price input (D-018, PROV-CREW-005). Deleting a service is not specified (BP §13 says "create/edit") → only "Stop offering".

### P06 — Availability

- **Purpose:** working hours and blocked dates (BP §13 P06) using the standard schedule of BP §59.1. Date-specific changes open P23; live status opens P22.
- **Requirement IDs:** AVAIL-001, AVAIL-002, AVAIL-004, AVAIL-006, MATCH-ELIG-076, MATCH-ELIG-079.
- **Entry:** onboarding; P04/P21. **Exits:** P23, P22, back.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Day (Mon–Sun) | Toggle per day | — | Yes (each day on/off) | {day}: Working / Off | {day}: کام / چھٹی | BP §59.1 |
| Start time / End time | Time per day | End after start | If the day is on | From / To | سے / تک | BP §59.1; AVAIL-001 |
| Break | Time range per day (0..n) | Inside working hours; no overlap | No | Break | وقفہ | BP §59.1; AVAIL-002 |
| Emergency availability | Toggle (+ time range per day if on) | Shown only if the provider has a service with `emergency_allowed` (server flag) | No | Available for emergency jobs | ایمرجنسی کاموں کے لیے دستیاب | BP §59.1, §59.3; AVAIL-004 |
| Maximum active jobs | Integer | ≥ 1, or empty = no limit | No | Maximum jobs at the same time | ایک وقت میں زیادہ سے زیادہ کام | BP §59.1; AVAIL-006 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Save hours | Save | محفوظ کریں | Update the weekly schedule | BP §59.1 |
| Change specific dates | Change specific dates | مخصوص تاریخیں تبدیل کریں | None → P23 | BP §59.2 |
| Live status | Change status | اسٹیٹس تبدیل کریں | None → P22 | BP §59.3 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching / saving | G1-loading / Saving… | G1-loading / محفوظ ہو رہا ہے… |
| Empty | No hours set yet | Set your working hours so we only send jobs you can do. | اپنے کام کے اوقات طے کریں تاکہ ہم صرف وہی کام بھیجیں جو آپ کر سکیں۔ |
| Success | Server saved | Working hours saved. | کام کے اوقات محفوظ ہو گئے۔ |
| Error | Save refused / failed | We couldn't save your hours. {server reason} G1-retry | آپ کے اوقات محفوظ نہیں ہو سکے۔ {server reason} G1-retry |
| Pending/unknown | Save sent, no answer | G1-pending. Your hours are kept on this phone. | G1-pending۔ آپ کے اوقات اس فون پر محفوظ ہیں۔ |

Notes: "Busy" may be set by the server when the maximum is reached (AVAIL-006); the app only displays it. The device calendar is not used (BP §74 calendar = Later).

### P07 — Service area

- **Purpose:** neighbourhoods / radius / service zones (BP §13 P07; BP §59.1; BP §10 step 30). Whole Lahore is the active zone (D-019).
- **Requirement IDs:** AVAIL-005, MATCH-ELIG-075, LOC-GEO-003, LOC-GEO-006, LOC-GEO-008.
- **Entry:** onboarding; P21. **Exits:** P06 (onboarding next), back.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Area centre | Map pin or place search (Google Maps Places) | Inside an active zone (server; Pakistan boundary) | Yes (if radius used) | Where do you start from? | آپ کہاں سے کام شروع کرتے ہیں؟ | BP §59.1, §74; AVAIL-005 |
| Radius | Slider + number (km) | Min/max from config `TODO(OWNER)`; server validates | Radius or zones | Service radius: {km} km | سروس کا دائرہ: {km} کلومیٹر | BP §59.1; AVAIL-005 |
| Zones | Multi-select from the server list of active zones (launch: Lahore) | Active zones only | Radius or zones | Areas you serve | وہ علاقے جہاں آپ کام کرتے ہیں | BP §59.1; D-019 |
| Coverage preview | Map overlay (display) | — | — | Your coverage | آپ کی کوریج | BP §74 (service-area visualisation) |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Search place | Search area or place | علاقہ یا جگہ تلاش کریں | Places search (through `GeoService` rules) | BP §74; LOC-GEO-003 |
| Save area | Save | محفوظ کریں | Update the provider service area | AVAIL-005 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching area / map loading | G1-loading (the map loads after the form, PERF-005) | G1-loading |
| Empty | No area set yet | Choose where you work. You will only get jobs inside this area. | منتخب کریں کہ آپ کہاں کام کرتے ہیں۔ آپ کو صرف اسی علاقے کے کام ملیں گے۔ |
| Success | Server saved | Service area saved. | سروس کا علاقہ محفوظ ہو گیا۔ |
| Error | Outside active zone / save failed / map failed | This place is outside the area we serve. / The map is not available — search by name instead. G1-retry | یہ جگہ ہماری سروس کے علاقے سے باہر ہے۔ / نقشہ دستیاب نہیں — نام سے تلاش کریں۔ G1-retry |
| Pending/unknown | Save sent, no answer | G1-pending. | G1-pending۔ |

Notes: no GPS permission on this screen (G2). If Google Maps is down, place search by name/list still works (LOC-GEO-006). The radius slider mirrors in RTL (G4).

---

## 3. Requests and jobs

### P08 — Job requests

- **Purpose:** incoming jobs/leads (BP §13 P08). "See, decide, act": each card shows the short summary, location/area, media/voice note, commercial model and time window, and Accept / Quote / Ask / Decline are reachable in one or two taps (BP §85, §62.2).
- **Requirement IDs:** UX-PROV-001, UX-PROV-002, UX-PROV-003, QUOTE-002, PROF-ADDR-004, BOOK-STATUS-002, BOOK-STATUS-003, BOOK-STATUS-016, BOOK-STATUS-017, LEDGER-NEG-002, NOTIF-002, TRUST-VER-001.
- **Entry:** bottom navigation; P04; push "New job alert" (BP §24, §80). **Exits:** P09 (card tap), P10 (action), P24 (Quote), P25 (media tap).
- Shows bookings in `Requested` or `Quote Pending` for which this provider is the chosen/invited supplier (BP §15; D-005, D-028).

Fields (per request card)

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Service | Display (name from server) | — | — | {service} | {service} | BP §37 |
| Short summary | Display (supplier-ready summary in the app language) | — | — | {summary} | {summary} | BP §56.3, §85; REQ-AI-005 |
| Area + distance | Display: area name + distance (no exact address, no phone) | — | — | {area} · {km} km away | {area} · {km} کلومیٹر دور | BP §52.2, §62.2; PROF-ADDR-004 |
| Media | Icons with counts: voice note, video, photos → P25 | — | — | Voice note · Video · {n} photos | وائس نوٹ · ویڈیو · {n} تصاویر | BP §76.1, §85 |
| Commercial model | Display chip: Book now / Chosen by customer / Quote requested | — | — | Book now · Chosen by customer · Quote requested | فوری بکنگ · گاہک نے آپ کو چنا · کوٹیشن مانگی گئی | BP §53, §85 |
| Price info | Display: fixed price, "from" price, visit/inspection fee (from server) | — | — | Price: {amount} / From {amount} / Visit fee {amount} | قیمت: {amount} / {amount} سے شروع / وزٹ فیس {amount} | BP §4.1, §62.2; UX-PROV-003 |
| Time window | Display: ASAP / date + window | — | — | When: {window} | کب: {window} | BP §55.1, §85 |
| Response time left | Display, only if the server sends an expiry (config, D-013) | — | — | Respond within {time} | {time} میں جواب دیں | BP §15 (Expired); D-013 |

Actions (per card; only server-allowed ones shown)

| Action | EN | UR (DRAFT) | Server request | Taps | Source |
|---|---|---|---|---|---|
| Accept | Accept | قبول کریں | Opens the crew-size sheet (P10) → Confirm sends Accept + `crew_size` | 2 | BP §62.2, §85; D-004; PROV-CREW-002 |
| Quote | Send quote | کوٹیشن بھیجیں | Opens P24 (Requested → Quote Pending is done by the server when the provider chooses Quote, D-028) | 1 to open | BP §85; D-028 |
| Ask | Ask a question | سوال پوچھیں | Opens the booking conversation (screen ID: OQ-063) | 1 | BP §85; QUOTE-006 |
| Decline | Decline | انکار کریں | Confirm sheet → Decline (→ Rejected) | 2 | BP §15, §85; BOOK-STATUS-017 |
| Open | (card tap) | (card tap) | None → P09 | 1 | BP §13 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching requests | Looking for new requests… | نئی درخواستیں دیکھی جا رہی ہیں… |
| Empty | No open requests | No new requests right now. Requests come when you are Online and inside your hours and area. | ابھی کوئی نئی درخواست نہیں۔ درخواستیں تب آتی ہیں جب آپ آن لائن ہوں اور اپنے اوقات اور علاقے میں ہوں۔ |
| Success | List loaded / action confirmed | Accepted. The customer has been told. / Declined. | قبول کر لیا گیا۔ گاہک کو بتا دیا گیا ہے۔ / انکار کر دیا گیا۔ |
| Error | Fetch or action failed; `UNPAID_COMMISSION`; `TRANSITION_NOT_ALLOWED` (request taken/expired) | We couldn't load requests. G1-retry / G6 copy for the code | درخواستیں لوڈ نہیں ہو سکیں۔ G1-retry / کوڈ کے مطابق G6 |
| Pending/unknown | Accept/Decline sent, no answer | G1-pending. The request stays locked until we know. | G1-pending۔ تصدیق تک درخواست لاک رہے گی۔ |

Notes: while the unpaid-commission banner is active the server does not allow Accept/Quote, so the card shows "Pay company" instead (D-020, LEDGER-NEG-002). While the level is Basic, the list is empty with the "Verification needed" banner (TRUST-VER-001). Voice notes play in P25 without leaving the flow (BP §76.1).

### P09 — Job detail

- **Purpose:** the customer's request and constraints (BP §13 P09): everything needed to decide before committing, and the booking record after a match.
- **Requirement IDs:** QUOTE-002, UX-PROV-001, UX-PROV-003, PROF-ADDR-002, PROF-ADDR-004, PROV-CREW-002, PROV-CREW-006, BOOK-STATUS-016, DATA-002, FARE-012, CHAT-001, CHAT-002, CHAT-004, BOOK-CANCEL-003.
- **Entry:** P08, P04, P11, P19 (notification tap). **Exits:** P10, P24, P25, P12, P13, P14, P20.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Booking ID | Display (LTR) | — | — | Job #{id} | جاب #{id} | BP §15 |
| Status | Display chip with the G9 label of the server status | — | — | Status: {G9 label} | اسٹیٹس: {G9 label} | BP §15, §15.1; A11Y-003; G9 |
| Service + summary | Display | — | — | {service} — {summary} | {service} — {summary} | BP §85; REQ-AI-005 |
| Media | Inline P25 player | — | — | Customer's voice note / video / photos | گاہک کا وائس نوٹ / ویڈیو / تصاویر | BP §76.1 |
| Location (before match) | Display: area + distance only | — | — | {area} · {km} km away | {area} · {km} کلومیٹر دور | BP §52.2; PROF-ADDR-004 |
| Address (after match) | Display: booking address snapshot | — | — | Address: {address} | پتہ: {address} | BP §21; PROF-ADDR-002; OQ-027 |
| Time | Display: requested window / scheduled time / inspection visit time (D-028) | — | — | Requested: {window} · Scheduled: {time} · Inspection visit: {time} | مطلوبہ وقت: {window} · طے شدہ وقت: {time} · معائنہ: {time} | BP §15; D-028 |
| Commercial model + price | Display: model, fixed/from price, fees | — | — | {model} · {price} | {model} · {price} | BP §53, §62.2; UX-PROV-003 |
| Crew size | Display (after accept/quote) | — | — | {n} workers will come | {n} کاریگر آئیں گے | D-004; PROV-CREW-002 |
| Responsible person | Display: the verified team leader (the provider) | — | — | Responsible: {name} (team leader) | ذمہ دار: {name} (ٹیم لیڈر) | D-018; PROV-CREW-006 |
| Quote | Display: quote status (Sent / Accepted / Declined / Expired — quote states, ARCH §6.6; not a booking status), total, validity | — | — | Your quote: {quote status} · {total} · valid until {date} | آپ کی کوٹیشن: {quote status} · {total} · {date} تک درست | BP §18; QUOTE-004 |
| Charges | Display: lines with state (Proposed / Approved / Rejected / Final) | — | — | Charges | چارجز | BP §58.2; FARE-012 |
| History | Display: job events (time, from → to, actor) | — | — | Job history | کام کی ہسٹری | BP §15; DATA-002 |

Actions (server-allowed only)

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Accept / Quote / Ask / Decline | (as P08) | (as P08) | As P08, via P10 | BP §85 |
| Go to job | Go to job | کام پر جائیں | None → P12 | BP §13 P12 |
| Message | Message | پیغام | Opens the booking conversation (OQ-063) | BP §20; CHAT-001 |
| Call customer | Call | کال کریں | Request a masked call through `CallRelay` (post-match only); opens the dialer with the relay number | BP §20, §74; CHAT-002, CHAT-004 |
| Cancel job | Cancel this job | یہ کام منسوخ کریں | Confirm sheet + reason → provider cancellation | BP §16; BOOK-CANCEL-003 |
| Get help | Get help | مدد لیں | None → P20 with this booking linked | BP §40 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching booking | G1-loading | G1-loading |
| Empty | Booking no longer visible to this provider (chosen another, expired, cancelled pre-match) | This request is no longer available. | یہ درخواست اب دستیاب نہیں۔ |
| Success | Booking loaded / action confirmed | (content) / Job cancelled. | (مواد) / کام منسوخ ہو گیا۔ |
| Error | Fetch or action failed | We couldn't load this job. G1-retry | یہ کام لوڈ نہیں ہو سکا۔ G1-retry |
| Pending/unknown | Action sent, no answer | G1-pending. | G1-pending۔ |

Cancel sheet: EN "Cancel this job? The customer will be offered another provider, and cancellations affect your reliability." UR "کیا یہ کام منسوخ کرنا ہے؟ گاہک کو دوسرا کاریگر پیش کیا جائے گا، اور منسوخی آپ کی ساکھ پر اثر ڈالتی ہے۔" Reason: picked from a server list only when config provides one (OQ-065, aligned with the customer default of OQ-050: while `null`, no reason is asked and the server records `UNSPECIFIED`). The server records the party (BOOK-STATUS-013; BP §16).

Notes: before a match there is no phone, exact address or customer name (G7). Phone/WhatsApp are intents only (CHAT-004).

### P10 — Accept/reject/quote

- **Purpose:** action center for one job (BP §13 P10). Shown as a bottom sheet from P08/P09 so every decision takes ≤ 2 taps (BP §62.2, §85).
- **Requirement IDs:** UX-PROV-002, PROV-CREW-001, PROV-CREW-002, PROV-CREW-005, BOOK-STATUS-002, BOOK-STATUS-003, BOOK-STATUS-016, BOOK-STATUS-017, LEDGER-NEG-002, MATCH-MODE-001, REL-003.
- **Entry:** P08 card action, P09. **Exits:** P24 (Quote), conversation (Ask, OQ-063), P15 (Pay company), back to P08/P09.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Crew size (on Accept) | Stepper, prefilled with the provider's usual team size, else 1; the value is always visible before Confirm | Integer ≥ 1 | Yes | How many workers will come? | کتنے کاریگر آئیں گے؟ | D-004; PROV-CREW-002; ARCH §5.6 |
| Crew price note | Display | — | — | The number of workers does not change the price. | کاریگروں کی تعداد سے قیمت نہیں بدلتی۔ | D-018; PROV-CREW-005 |
| Decline reason | — | — | Not collected until OQ-065 is answered | — | — | OQ-065 |
| Inspection visit time (Quote Pending, inspection services) | Date + time | Server checks | Only if OQ-066 confirms the provider proposes it | Proposed inspection visit | معائنہ کا مجوزہ وقت | D-028; BP §4.1; OQ-066 |

Actions (server-allowed only)

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Confirm accept | Accept with {n} workers | {n} کاریگروں کے ساتھ قبول کریں | Transition request ACCEPT + `crew_size` (idempotency key); the server decides the resulting status | BP §15.1; D-004 |
| Send quote | Send quote | کوٹیشن بھیجیں | None → P24 | BP §18 |
| Ask a question | Ask a question | سوال پوچھیں | Opens the conversation (OQ-063) | BP §85; QUOTE-006 |
| Confirm decline | Yes, decline | ہاں، انکار کریں | Transition request DECLINE (→ Rejected) | BP §15; BOOK-STATUS-017 |
| Propose inspection visit | Propose visit time | معائنہ کا وقت تجویز کریں | Set the inspection visit time on the booking (Quote Pending) — only after OQ-066 | D-028; OQ-066 |
| Pay company (when blocked) | Pay company | کمپنی کو ادائیگی کریں | None → P15 Pay company | D-020, D-021 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching allowed actions | G1-loading | G1-loading |
| Empty | Server allows no action (e.g. already decided) | Nothing to do on this job right now. | اس کام پر ابھی کوئی کارروائی نہیں۔ |
| Success | Server confirmed | Accepted with {n} workers. / Declined. | {n} کاریگروں کے ساتھ قبول کر لیا گیا۔ / انکار کر دیا گیا۔ |
| Error | Refused (`UNPAID_COMMISSION`, `TRANSITION_NOT_ALLOWED`, 403) or failed | G6 copy for the code; else G1-generic-error · G1-retry | کوڈ کے مطابق G6؛ ورنہ G1-generic-error · G1-retry |
| Pending/unknown | Sent, no answer | G1-pending. Do not accept this job again. | G1-pending۔ یہ کام دوبارہ قبول نہ کریں۔ |

Notes: the app never auto-accepts (D-005, MATCH-MODE-001). Tap count from the card: Accept → Confirm = 2; Decline → Yes = 2; Quote = 1 to open the builder; Ask = 1 (UX-PROV-002). The prefilled crew size is a convenience; the provider still confirms the visible number (D-004).

### P11 — Schedule

- **Purpose:** appointments and calendar (BP §13 P11): the provider's accepted/scheduled jobs and inspection visits by day.
- **Requirement IDs:** BOOK-STATUS-005, BOOK-STATUS-006, AVAIL-003, NOTIF-003.
- **Entry:** bottom navigation; P04. **Exits:** P09/P12 (job tap), P23 (date).

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| View | Toggle Day / Week | — | — | Day · Week | دن · ہفتہ | BP §13 P11 ("calendar") |
| Date | In-app date picker (no device calendar) | — | — | Date | تاریخ | BP §13 P11; BP §74 (calendar Later) |
| Job rows | Display: time, service, area, status chip (G9 label), crew size; inspection visits marked | — | — | {time} · {service} · {area} · {G9 label} | {time} · {service} · {area} · {G9 label} | BP §15; D-004, D-028 |
| Day override marker | Display chip from P23 (Closed / Limited / Fully booked / Special hours) | — | — | {override} | {override} | BP §59.2 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Open job | (row tap) | (row tap) | None → P09 or P12 | BP §13 |
| Change this date | Change availability for this date | اس تاریخ کی دستیابی تبدیل کریں | None → P23 | BP §59.2 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching schedule | G1-loading | G1-loading |
| Empty | No jobs in range | No jobs on this day. | اس دن کوئی کام نہیں۔ |
| Success | Loaded | (content) | (مواد) |
| Error | Fetch failed | We couldn't load your schedule. G1-retry | آپ کا شیڈول لوڈ نہیں ہو سکا۔ G1-retry |
| Pending/unknown | Offline with cached schedule | G1-offline · G1-last-updated | G1-offline · G1-last-updated |

Notes: "Add to calendar" is not built (BP §74, §86: calendar is Later/Proposed). Reminders come from `booking.reminder` (NOTIF-003).

### P12 — Job execution

- **Purpose:** arrived / start / in progress / completed (BP §13 P12) with navigation hand-off (BP §81) and the active-job location indicator (G3).
- **Requirement IDs:** BOOK-STATUS-006, BOOK-STATUS-007, BOOK-STATUS-008, BOOK-STATUS-009, BOOK-STATUS-010, BOOK-STATUS-016, LEDGER-NEG-005, LOC-GEO-007, UX-PROV-004, BOOK-CANCEL-003, BOOK-CANCEL-005, BOOK-CANCEL-006, CHAT-002, NOTIF-004, PERM-001.
- **Entry:** P09 "Go to job", P04/P11 job tap, notification. **Exits:** P13, P14, P15, P20, navigation app (external), conversation (OQ-063).

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Status stepper | Display: Scheduled → Provider En Route → Arrived → In Progress → Completed, each step labelled with its G9 label (current step marked with text, not colour) | — | — | Scheduled · On the way · Arrived · Work in progress · Completed | وقت طے ہو گیا · راستے میں · پہنچ گئے · کام جاری ہے · کام مکمل ہو گیا | BP §15; A11Y-003; G9 |
| Awaiting approval | Display when status = Awaiting Approval | — | — | Waiting for the customer to approve a charge. | گاہک کی طرف سے چارج کی منظوری کا انتظار ہے۔ | BP §15, §58.2; BOOK-STATUS-010 |
| Address | Display: booking address snapshot | — | — | {address} | {address} | BP §21; PROF-ADDR-002 |
| Scheduled time | Display | — | — | {time} | {time} | BP §15 |
| Crew size | Display | — | — | {n} workers | {n} کاریگر | D-004 |
| Location indicator | G3 strip — **only if OQ-025 approves live ETA**, and only while `Provider En Route` | — | — | G3-strip | G3-strip | BP §57.4, §81; OQ-025 |
| Unpaid block | Display when the server refuses a start | — | — | Pay Rs. {amount} to start this job. | یہ کام شروع کرنے کے لیے {amount} روپے ادا کریں۔ | D-021; LEDGER-NEG-005 |

Actions (server-allowed only)

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Start trip | I'm on my way | میں راستے میں ہوں | Transition Scheduled → Provider En Route (refused with `UNPAID_COMMISSION` while owed). No location permission ask at launch (G2, G3) | BP §15; D-021; PERM-001 |
| Navigate | Navigate | راستہ دیکھیں | None: opens the chosen navigation app with the job address (one tap) | BP §62.2, §81; UX-PROV-004 |
| I've arrived | I've arrived | میں پہنچ گیا ہوں | Transition En Route → Arrived | BP §15 |
| Start work | Start work | کام شروع کریں | Transition Arrived → In Progress (refused with `UNPAID_COMMISSION` while owed) | BP §15; D-021 |
| Add extra charge | Add extra charge | اضافی چارج شامل کریں | None → P13 | BP §13 P13 |
| Finish job | Finish job | کام مکمل کریں | None → P14 (evidence, then completion request) | BP §10 step 40 |
| Message / Call | Message / Call | پیغام / کال | Conversation (OQ-063) / masked call (`CallRelay`) | BP §20; CHAT-002 |
| Customer not here | Customer is not here | گاہک موجود نہیں | Report customer no-show; refused before the configured wait period (D-013, `TODO(OWNER)`); while the period is `null` it goes to support for manual review | BP §16; BOOK-CANCEL-005 |
| Stop for safety | Stop — safety problem | رکیں — حفاظتی مسئلہ | Safety stop (Arrived → Cancelled, In Progress → Disputed) + safety-flagged support ticket | BP §16, §40; BOOK-CANCEL-006 |
| Cancel job | Cancel this job | یہ کام منسوخ کریں | As P09 cancel (only where the server allows) | BP §16; BOOK-CANCEL-003 |
| Pay company | Pay company | کمپنی کو ادائیگی کریں | None → P15 Pay company | D-021 |
| Stop sharing location | G3-stop | G3-stop | Only if OQ-025 approves live ETA: stops sending location (job status unchanged) | BP §81; OQ-025 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching job / sending a transition | G1-loading / Updating… | G1-loading / اپ ڈیٹ ہو رہا ہے… |
| Empty | No active job | You have no job to start right now. | ابھی شروع کرنے کے لیے آپ کے پاس کوئی کام نہیں۔ |
| Success | Server confirmed the new status | Status updated: {G9 label}. The customer has been told. | اسٹیٹس اپ ڈیٹ ہو گیا: {G9 label}۔ گاہک کو بتا دیا گیا ہے۔ |
| Error | Refused (`UNPAID_COMMISSION`, `TRANSITION_NOT_ALLOWED`) or failed | G6 copy for the code; else G1-generic-error · G1-retry | کوڈ کے مطابق G6؛ ورنہ G1-generic-error · G1-retry |
| Pending/unknown | Transition sent, no answer | G1-pending. Your status will update when we hear back. | G1-pending۔ جواب ملنے پر آپ کا اسٹیٹس اپ ڈیٹ ہو جائے گا۔ |

Safety sheet: EN "Stop this job for safety? Support will contact you." UR "کیا حفاظت کی وجہ سے یہ کام روکنا ہے؟ سپورٹ ٹیم آپ سے رابطہ کرے گی۔" (BOOK-CANCEL-006).

Notes: at launch P12 sends no location and asks no location permission; Navigate hands the address to the navigation app (G2, G3; SEC-REVIEW #7). If OQ-025 later approves live ETA, location is sent only during `Provider En Route` and stops on `Arrived` (LOC-GEO-007). No background location (PERM-006). No live map for the customer until OQ-025.

### P13 — Extras/materials

- **Purpose:** add customer-visible extras that need approval where policy says so (BP §13 P13; BP §58.1, §58.2; BP §8.2 "add approved extra charges/materials"). A provider can only **propose** (FARE-012).
- **Requirement IDs:** FARE-003…008, FARE-011, FARE-012, FARE-013, QUOTE-008, PROV-CREW-004, PRICE-005, PRICE-007, BOOK-STATUS-010, NOTIF-005, ABUSE-005.
- **Entry:** P12 "Add extra charge"; P09 (after acceptance). **Exits:** P12.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Line type | Choice: Labour / service · Tools / equipment · Consumables · Parts / new materials · Emergency / after-hours (only if the service has `emergency_allowed`) · Travel / distance (only with a configured rule; disabled while `null`) · Discount | Platform fee and Tax are **never** provider choices (D-025; D-029, server computes) | Yes | Type of charge | چارج کی قسم | BP §58.1; FARE-003…011 |
| Description | Text; passes the moderation hook (G7) | Not empty | Yes | What is it for? | یہ کس لیے ہے؟ | BP §58; REQ-AI-009 |
| Reason | Text | Required for Tools / equipment | Tools: yes | Why is this needed? | اس کی ضرورت کیوں ہے؟ | BP §58.1; FARE-004 |
| Quantity + unit | Number + unit (Labour) | Quantity > 0 | Labour: where practical | Quantity / Unit | مقدار / اکائی | BP §58.1; FARE-003 |
| Amount | Money (PKR) | > 0 (Discount: amount to subtract) | Yes | Amount | رقم | BP §58.1 |
| Materials class | Choice: Included · Not included · Extra (needs approval) | One value | Parts / materials: yes | Materials: Included / Not included / Extra (needs approval) | سامان: شامل / شامل نہیں / اضافی (منظوری درکار) | BP §17; PRICE-005 |
| New crew size | Integer ≥ 1 | Differs from current | Only for a crew change | Change number of workers to | کاریگروں کی تعداد تبدیل کریں | D-004; PROV-CREW-004 |
| Line state | Display chip: Proposed / Approved / Rejected / Final | — | — | Waiting for approval · Approved · Rejected · Final | منظوری کا انتظار · منظور · مسترد · حتمی | BP §58.2; FARE-012 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Send for approval | Send to customer for approval | منظوری کے لیے گاہک کو بھیجیں | Propose a fare line (state Proposed; the server moves the booking to Awaiting Approval) | BP §58.2; FARE-012; BOOK-STATUS-010 |
| Request crew change | Send crew change for approval | کاریگروں کی تبدیلی منظوری کے لیے بھیجیں | Propose a crew-size change (old value stays until approved) | PROV-CREW-004 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching lines / sending | G1-loading / Sending… | G1-loading / بھیجا جا رہا ہے… |
| Empty | No extra charges on this job | No extra charges. Add one only if the customer needs to approve something new. | کوئی اضافی چارج نہیں۔ صرف تب شامل کریں جب گاہک کو کسی نئی چیز کی منظوری دینی ہو۔ |
| Success | Server stored the proposal | Sent. The customer must approve before it can be charged. | بھیج دیا گیا۔ چارج ہونے سے پہلے گاہک کی منظوری ضروری ہے۔ |
| Error | Refused / failed | We couldn't send this charge. {server reason} G1-retry | یہ چارج نہیں بھیجا جا سکا۔ {server reason} G1-retry |
| Pending/unknown | Sent, no answer | G1-pending. Do not add this charge again. | G1-pending۔ یہ چارج دوبارہ شامل نہ کریں۔ |

Notes: a Proposed line is never payable; only the customer can approve (FARE-012, PRICE-007). The emergency exception is off (`fare.emergency_exception_enabled = false`, FARE-013, BP §58.3): no line skips approval. Whether a discount reduces labour before commission is open (D-022, OQ-007). Totals are computed by the server.

### P14 — Completion evidence

- **Purpose:** notes / photos / signature / OTP "only where needed" (BP §13 P14), then the completion request, then billing: "How was it paid?" CASH / DIGITAL (D-016, D-030; ARCH §6.8 "Provider opens final bill (P14/P15)").
- **Requirement IDs:** UX-PROV-005, BOOK-STATUS-009, BOOK-STATUS-011, LEDGER-001, LEDGER-002, LEDGER-003, COMM-001, COMM-004, FARE-010, PAY-TIMING-001, PRICE-006, NOTIF-004, REL-003, REL-005, ABUSE-007.
- **Entry:** P12 "Finish job"; P15 (billing not recorded). **Exits:** P26 (capture), P15, P04.
- Two steps: (a) evidence + "Mark job complete"; (b) after the server confirms `Completed`: final bill and "How was it paid?" (D-003: payment only after Completed).

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Work notes | Multiline text | Server limits | No | Notes about the work | کام کے بارے میں نوٹس | BP §13 P14 |
| Photos | Thumbnails from P26 (before / after) | Limits from config (D-011) | Only if the service requires it (server flag) | Before / after photos | کام سے پہلے / بعد کی تصاویر | BP §13 P14, §74, §76.3 |
| Customer signature | Signature pad | — | Only where the server says so (OQ-069; default not required) | Customer signature | گاہک کے دستخط | BP §13 P14; OQ-069 |
| Completion code | Numeric code given by the customer | Server checks; wrong attempts limited by config `booking.completion_code_max_attempts` = `null`, `TODO(OWNER)` (OQ-069); after the limit the code is invalidated (SEC-REVIEW #23) | Only where the server says so (OQ-069; default not required) | Code from the customer | گاہک سے ملا کوڈ | BP §13 P14; OQ-069 |
| Final bill lines | Display: approved/final lines incl. a separate Tax line (Rs. 0 while tax rules are not set) | — | — | Final bill | حتمی بل | BP §58.1; D-029; FARE-010 |
| Your share | Display: commission on labour and your share for this job | — | — | Kaam Karo commission {amount} · Your share {amount} | کام کرو کمیشن {amount} · آپ کا حصہ {amount} | D-006, D-015; COMM-004 |
| How was it paid? | Choice: Cash / Digital | Recorded once; Cash not offered if a confirmed digital payment exists (server flag) | Yes, to close billing | How was it paid? | ادائیگی کیسے ہوئی؟ | D-016, D-030; LEDGER-001, LEDGER-002 |
| — option | Cash (recorded only here by the provider; the Customer app has no cash choice, D-030) | — | — | Cash — the customer paid me | نقد — گاہک نے مجھے ادائیگی کی | D-016, D-030 |
| — option | Digital | — | — | Digital — paid through Kaam Karo | ڈیجیٹل — کام کرو کے ذریعے ادائیگی | D-016, D-030 |
| Digital status | Display: Waiting for payment / Paid (gateway-confirmed only) / Not received yet | — | — | Waiting for the customer's payment / Paid / Digital payment not received yet — Kaam Karo is checking | گاہک کی ادائیگی کا انتظار / ادا ہو گیا / ڈیجیٹل ادائیگی ابھی موصول نہیں ہوئی — کام کرو چیک کر رہا ہے | ARCH §6.8; D-008; OQ-077 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Add photos | Add photo | تصویر شامل کریں | None → P26 | BP §74 |
| Mark job complete | Mark job complete | کام مکمل قرار دیں | Completion request with evidence references; the server decides the resulting status (Completed now, or after the customer confirms — OQ-044) | BP §10 step 40, §15.1; OQ-044 |
| Record cash | Confirm cash payment | نقد ادائیگی کی تصدیق کریں | Record payment method CASH (idempotent). The confirm sheet shows the commission that will be debited | D-016, D-030; LEDGER-001…003 |
| Record digital | Customer will pay digitally | گاہک ڈیجیٹل ادائیگی کرے گا | Record payment method DIGITAL; the credit happens only on gateway confirmation | D-016, D-030; ARCH §6.8 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Uploading evidence / sending / fetching the bill | Uploading {p}% / Sending… / Preparing the bill… | اپ لوڈ {p}% / بھیجا جا رہا ہے… / بل تیار ہو رہا ہے… |
| Empty | No evidence added yet (and not required) | Add notes or photos if useful, then mark the job complete. | ضرورت ہو تو نوٹس یا تصاویر شامل کریں، پھر کام مکمل قرار دیں۔ |
| Success | Server confirmed Completed / payment method recorded | Job completed. / Cash recorded. Rs. {commission} commission was taken from your balance. / Digital recorded. You will be credited when the payment is confirmed. | کام مکمل ہو گیا۔ / نقد ادائیگی درج ہو گئی۔ {commission} روپے کمیشن آپ کے بیلنس سے کاٹ لیا گیا۔ / ڈیجیٹل درج ہو گیا۔ ادائیگی کی تصدیق پر رقم آپ کے اکاؤنٹ میں آ جائے گی۔ |
| Error | Refused (Cash after a digital payment, or already recorded → 409) / failed | This payment was already recorded or paid digitally. / G1-generic-error · G1-retry | یہ ادائیگی پہلے ہی درج ہو چکی ہے یا ڈیجیٹل طور پر ادا ہو چکی ہے۔ / G1-generic-error · G1-retry |
| Pending/unknown | Completion or payment record sent, no answer | G1-pending. Do not record the payment again. | G1-pending۔ ادائیگی دوبارہ درج نہ کریں۔ |

Cash confirm sheet: EN "Confirm the customer paid Rs. {total} in cash? Rs. {commission} ({rate} of labour) will be taken from your Kaam Karo balance." UR "کیا گاہک نے {total} روپے نقد ادا کیے؟ {commission} روپے (مزدوری کا {rate}) آپ کے کام کرو بیلنس سے کاٹ لیے جائیں گے۔" — `{rate}` comes from config `commission.rate` (D-006, COMM-001), never hard-coded.

Notes: evidence uploads survive network loss and retry (MEDIA-009 pattern). A digital payment is confirmed by the gateway, never by the provider (ARCH §6.8; ABUSE-007). Threat KK-T5 (SEC-REVIEW #6): if a booking recorded as DIGITAL gets no gateway confirmation within config `ledger.digital_unconfirmed_flag_hours` (OQ-077, `null`, `TODO(OWNER)`), the server raises a payment-fraud risk flag (A18) and an A09 Exceptions row, and P14/P15 show "Not received yet"; no ledger credit is written. While the value is `null`, no automatic flag is raised. Completion-code errors (SEC-REVIEW #23): EN "That code is not correct. {n} tries left." / UR "یہ کوڈ درست نہیں۔ {n} کوششیں باقی ہیں۔"; after the limit: EN "Too many wrong codes. Ask the customer for a new code or contact support." / UR "بہت زیادہ غلط کوڈ۔ گاہک سے نیا کوڈ لیں یا سپورٹ سے رابطہ کریں۔"

---

## 4. Money, reputation and profile

### P15 — Earnings

- **Purpose:** pending / available / paid amounts (BP §13 P15) as the provider earnings account (ARCH §6.8, K-15): balance, full ledger history, per-job commission and share, settlement status, and the **Pay company** section when the balance is below the limit (D-020, D-021; IMPL T6.7 "Pay company screen in P15").
- **Requirement IDs:** LEDGER-001, LEDGER-003, LEDGER-004, LEDGER-005, LEDGER-006, LEDGER-007, LEDGER-NEG-003, LEDGER-NEG-004, LEDGER-PAY-001, LEDGER-PAY-002, LEDGER-PAY-006, COMM-004, PAY-007, NOTIF-008, ABUSE-007.
- **Entry:** bottom navigation; P04 snapshot / unpaid banner; P10/P12 "Pay company"; notifications `provider.commission_debited`, `provider.balance_negative`, `provider.commission_payment_rejected`, `provider.balance_cleared` (ARCH §7). **Exits:** P14 (record payment for a completed job), P16, P09 (row tap).

Fields — summary and history

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Balance | Display (G5; negative shown as "You owe") | — | — | Balance: {amount} / You owe {amount} | بیلنس: {amount} / آپ پر {amount} واجب الادا ہیں | D-016, D-020; LEDGER-006 |
| Pending / Available / Paid | Display (server buckets; meaning per OQ-070) | — | — | Pending · Available · Paid | زیرِ التوا · دستیاب · ادا شدہ | BP §13 P15; OQ-070 |
| Billing to record | List of Completed jobs with no payment method recorded | — | — | Record how these jobs were paid | ان کاموں کی ادائیگی کا طریقہ درج کریں | D-016; LEDGER-001 |
| History rows | Display: date, job #, type, amount (+/−) | Read-only; rows are never edited (corrections appear as reversal rows) | — | Earnings history | آمدنی کی ہسٹری | BP §26; LEDGER-005, LEDGER-006 |
| Row type: commission debit | Display | — | — | Commission for job #{id} (cash) | جاب #{id} کا کمیشن (نقد) | D-016; LEDGER-003 |
| Row type: job credit | Display | — | — | Earnings for job #{id} (digital) | جاب #{id} کی آمدنی (ڈیجیٹل) | D-016; LEDGER-004 |
| Row type: payment to company | Display | — | — | Your payment to Kaam Karo (approved) | کام کرو کو آپ کی ادائیگی (منظور شدہ) | D-021; LEDGER-PAY-005 |
| Row type: settlement | Display | — | — | Paid out to you | آپ کو ادا کیا گیا | BP §13 P15; PAY-007 |
| Row type: reversal | Display | — | — | Correction for {row} | {row} کی درستگی | BP §26; PAY-004 |
| Job breakdown (row tap) | Display: bill total, commissionable labour, commission, your share | — | — | Bill {a} · Labour {b} · Commission {c} · Your share {d} | بل {a} · مزدوری {b} · کمیشن {c} · آپ کا حصہ {d} | D-006, D-015; COMM-004 |
| Settlement status | Display (server code mapped to copy; unknown → "Being processed" / "کارروائی جاری ہے") | — | — | Payout status: {settlement label} | ادائیگی کی صورتحال: {settlement label} | BP §13 P15; PAY-007 |

Fields — Pay company (visible while the server says the balance is below the limit)

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Amount owed | Display | — | — | Amount to pay: {amount} | ادا کرنے کی رقم: {amount} | D-020; LEDGER-NEG-003 |
| Company account details | Display from config (set by Finance) | — | — | Send the money to this account from any bank or mobile wallet | یہ رقم کسی بھی بینک یا موبائل والیٹ سے اس اکاؤنٹ میں بھیجیں | D-021; LEDGER-PAY-001 |
| Transaction ID | Text (LTR) | Not empty; server checks format/duplicates | Yes | Transaction ID | ٹرانزیکشن آئی ڈی | D-021; LEDGER-PAY-002 |
| Amount paid | Money (PKR), prefilled with the amount owed | > 0; partial/over-payment handling per OQ-059 | Yes | Amount you paid | آپ نے کتنی رقم ادا کی | D-021; LEDGER-PAY-003 ("amount, ID and screenshot"); OQ-059 |
| Screenshot | Image from the system photo picker | Limits from config (D-011) | No | Add screenshot (optional) | اسکرین شاٹ شامل کریں (اختیاری) | D-021; BP §75 item 97; M-03 |
| Submissions | Display list: date, amount, transaction ID, status Waiting for check / Approved / Rejected + reason | — | — | Your payments | آپ کی ادائیگیاں | D-021; LEDGER-PAY-004 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Record payment | Record payment | ادائیگی درج کریں | None → P14 step b | D-016 |
| Copy account details | Copy | کاپی کریں | None (clipboard) — the payment step must be fast on a phone | D-021; ARCH §6.8 practical note |
| Choose screenshot | Choose screenshot | اسکرین شاٹ منتخب کریں | Upload session (photo picker; no permission) | BP §75 item 97 |
| Submit payment | Submit for checking | جانچ کے لیے جمع کریں | Create commission-payment submission (idempotent). Does **not** change the balance | D-021; LEDGER-PAY-002, LEDGER-PAY-006 |
| Payout methods | Payout methods | ادائیگی وصول کرنے کے طریقے | None → P16 | BP §13 P16 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching balance/history; submitting | G1-loading / Submitting… | G1-loading / جمع ہو رہا ہے… |
| Empty | No ledger rows yet | No earnings yet. Completed jobs will show here. | ابھی کوئی آمدنی نہیں۔ مکمل شدہ کام یہاں نظر آئیں گے۔ |
| Success | Loaded / submission stored | Payment sent for checking. You can take jobs again after Kaam Karo approves it. | ادائیگی جانچ کے لیے بھیج دی گئی۔ کام کرو کی منظوری کے بعد آپ دوبارہ کام لے سکیں گے۔ |
| Error | Fetch failed / submission refused (422 missing ID, duplicate) | We couldn't load your earnings. G1-retry / Please enter the transaction ID. / This transaction ID was already submitted. | آپ کی آمدنی لوڈ نہیں ہو سکی۔ G1-retry / براہ کرم ٹرانزیکشن آئی ڈی درج کریں۔ / یہ ٹرانزیکشن آئی ڈی پہلے ہی جمع ہو چکی ہے۔ |
| Pending/unknown | Submission sent, no answer; or offline with cache | G1-pending. Do not submit the same payment again. / G1-offline · G1-last-updated | G1-pending۔ وہی ادائیگی دوبارہ جمع نہ کریں۔ / G1-offline · G1-last-updated |

Rejected copy (from `provider.commission_payment_rejected`): EN "Your payment could not be verified: {reason}. Please check and submit again." UR "آپ کی ادائیگی کی تصدیق نہیں ہو سکی: {reason}۔ براہ کرم چیک کر کے دوبارہ جمع کریں۔" (D-021, ARCH §7).

Notes: the provider's claim never clears the block; only a Finance-approved or gateway-confirmed credit does (LEDGER-PAY-006). Finance verification time is open (D-022, OQ-007): no promised time is shown. The block is not a suspension (LEDGER-NEG-004). No "request payout" button until OQ-070.

### P16 — Payout methods

- **Purpose:** bank/wallet details through a compliant provider (BP §13 P16). The payout vendor is open (D-008): `PayoutProvider` interface with a fake (EXT-001).
- **Requirement IDs:** PAY-007, LEDGER-007, EXT-001, SEC-BASE-002, SEC-BASE-010.
- **Entry:** P15, P21. **Exits:** back.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Method type | Choice: Bank account / Mobile wallet | One value | Yes | Bank account / Mobile wallet | بینک اکاؤنٹ / موبائل والیٹ | BP §13 P16 |
| Account title | Text | Not empty | Yes | Account holder name | اکاؤنٹ ہولڈر کا نام | BP §13 P16 |
| Bank | Choice from server list | Server list (no hard-coded banks) | Bank: yes | Bank | بینک | BP §13 P16; EXT-001 |
| Account number / IBAN | Text (LTR, masked after save) | Format checked by server | Bank: yes | Account number or IBAN | اکاؤنٹ نمبر یا IBAN | BP §13 P16; SEC-BASE-005 |
| Wallet | Choice from server list | Server list | Wallet: yes | Wallet | والیٹ | BP §13 P16 |
| Wallet number | Phone (LTR, masked after save) | Format checked by server | Wallet: yes | Wallet number | والیٹ نمبر | BP §13 P16 |
| Fresh OTP | Numeric code sent to the account phone (same `OtpSender` flow as P02) | Server checks; attempt limits per OQ-028 | Yes, for every add or remove | Enter the code sent to {phone} to confirm this change | اس تبدیلی کی تصدیق کے لیے {phone} پر بھیجا گیا کوڈ درج کریں | BP §27, §30 (account takeover); SEC-REVIEW #2 |
| Method status | Display: Not checked / Verified / Failed (from `PayoutProvider`) | — | — | Status: Not checked / Verified / Failed | اسٹیٹس: چیک نہیں ہوا / تصدیق شدہ / ناکام | BP §13 P16 ("compliant provider"); D-008 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Add method | Add payout method | ادائیگی کا طریقہ شامل کریں | Request OTP → create payout method with the fresh OTP (server validates; audited; sends a critical, non-disableable notification) | BP §13 P16; SEC-BASE-010; SEC-REVIEW #2 |
| Remove | Remove | ہٹائیں | Request OTP → delete payout method with the fresh OTP (server may refuse during a settlement; same critical notification) | BP §13 P16; SEC-REVIEW #2 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching / saving | G1-loading / Saving… | G1-loading / محفوظ ہو رہا ہے… |
| Empty | No method saved | Add a bank account or mobile wallet to receive your earnings. | اپنی آمدنی وصول کرنے کے لیے بینک اکاؤنٹ یا موبائل والیٹ شامل کریں۔ |
| Success | Server saved | Payout method saved. | ادائیگی کا طریقہ محفوظ ہو گیا۔ |
| Error | Refused / failed | We couldn't save these details. {server reason} G1-retry | یہ تفصیلات محفوظ نہیں ہو سکیں۔ {server reason} G1-retry |
| Pending/unknown | Save sent, no answer | G1-pending. | G1-pending۔ |

Notes: full account numbers are never shown again after saving (masked). Every add/remove needs a fresh OTP and triggers the critical notification EN "Your payout details were changed. If this wasn't you, contact support now." / UR "آپ کی ادائیگی وصول کرنے کی تفصیلات تبدیل ہوئی ہیں۔ اگر یہ آپ نے نہیں کیا تو فوراً سپورٹ سے رابطہ کریں۔" (SEC-REVIEW #2). Any waiting period before a new method can be used for a settlement is an owner value (OQ-070, `TODO(OWNER)`). Biometrics are Later (BP §74). Payout details and OTP codes are never in the local draft.

### P17 — Reviews

- **Purpose:** ratings received (BP §13 P17), the provider's rating standing and warnings (D-014, D-017), response and flag tools (BP §19).
- **Requirement IDs:** REV-001, REV-003, REV-004, REV-006, REV-007, RATING-ENF-003, RATING-ENF-004, RATING-ENF-005, RATING-ENF-007, RATING-ENF-008.
- **Entry:** bottom navigation/menu; P04 rating banner; notification `provider.rating_warning`. **Exits:** P09 (review's job), P20.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Average rating + count | Display (one shared rule) | — | — | {avg} from {n} ratings | {n} ریٹنگز سے {avg} | BP §19; REV-006 |
| Standing | Display chip: Good standing / Warning {n} of {N} / Blocked | — | — | Good standing · Warning {n} of {N} · Blocked | اچھی حالت · وارننگ {n} از {N} · بند | D-014; RATING-ENF-004 |
| Threshold note | Display (value from config `rating.block_threshold`) | — | — | Keep your average at {threshold} or above to avoid warnings. | وارننگ سے بچنے کے لیے اپنی اوسط {threshold} یا اس سے زیادہ رکھیں۔ | D-017; RATING-ENF-003 |
| Review rows | Display: stars (with number text), tags, text, date, job # | — | — | (content) | (مواد) | BP §19; REV-001, REV-002 |
| Response | Text | Server limits; moderated | No | Your reply | آپ کا جواب | BP §19; REV-003 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Reply | Reply | جواب دیں | Create review response (own bookings only; moderated) | BP §19; REV-003 |
| Report review | Report | رپورٹ کریں | Flag review → moderation queue | BP §19; REV-004 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching | G1-loading | G1-loading |
| Empty | No ratings yet | No ratings yet. Ratings appear after completed jobs. | ابھی کوئی ریٹنگ نہیں۔ مکمل کاموں کے بعد ریٹنگ نظر آئے گی۔ |
| Success | Loaded / reply or report stored | Reply sent for review. / Report sent. | جواب جانچ کے لیے بھیج دیا گیا۔ / رپورٹ بھیج دی گئی۔ |
| Error | Failed / refused | We couldn't load your reviews. G1-retry | آپ کے ریویوز لوڈ نہیں ہو سکے۔ G1-retry |
| Pending/unknown | Reply/report sent, no answer | G1-pending. | G1-pending۔ |

Warning copy (from `provider.rating_warning`): EN "Your average rating is below {threshold}. This is warning {n} of {N}. If it stays low, your account may be blocked." UR "آپ کی اوسط ریٹنگ {threshold} سے کم ہے۔ یہ وارننگ {n} از {N} ہے۔ اگر ریٹنگ کم رہی تو آپ کا اکاؤنٹ بند ہو سکتا ہے۔" (D-014, ARCH §7).

Notes: providers cannot edit or delete ratings (REV-007). While enforcement is in dry-run (RATING-ENF-008), the server issues no warnings, so none are shown. Appeal flow is open (D-017, OQ-013): only the support route is shown.

### P18 — Provider profile

- **Purpose:** public profile preview (BP §13 P18): what customers see (BP §55.1 supplier card, §22.2 quality signals), plus profile photo and share link (BP §74, §82).
- **Requirement IDs:** TRUST-BADGE-001…014 (display only), PROV-CREW-006, SHARE-002, CHAT-004, PERM-002, PERM-005.
- **Entry:** menu; P21. **Exits:** P02 profile fields, P05, P07, P03, share sheet (external).

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Photo / logo | Image (camera or photo picker) | Limits from config (D-011) | No | Profile photo | پروفائل تصویر | BP §55.1, §74 |
| Name / business name | Display (edit per OQ-064) | — | — | {name} | {name} | BP §55.1; OQ-064 |
| Team leader | Display | — | — | Team leader: {name} (verified) | ٹیم لیڈر: {name} (تصدیق شدہ) | D-018 |
| Usual team size | Display (optional) | — | — | Usually {n} workers | عام طور پر {n} کاریگر | D-004; ARCH §5.6 |
| Verification | Display badge | — | — | {level} | {level} | BP §22.1; TRUST-BADGE-001 |
| Badges | Display (server-computed; none while rules are `null`) | — | — | {badges} | {badges} | BP §55.2; D-010 |
| Rating + completed jobs | Display | — | — | {avg} · {n} jobs completed | {avg} · {n} کام مکمل | BP §22.2, §55.1 |
| Services and area | Display | — | — | Services · Area | سروسز · علاقہ | BP §55.1 |
| Customer preview note | Display | — | — | This is how customers see you. | گاہک آپ کو ایسے دیکھتے ہیں۔ | BP §13 P18 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Take photo | Take photo | تصویر لیں | Camera (asked on tap) → upload session | BP §74, §75 item 94 |
| Choose photo | Choose photo | تصویر منتخب کریں | Photo picker → upload session | BP §75 item 97 |
| Share profile | Share my profile | اپنی پروفائل شیئر کریں | Server returns the public link; Android share sheet (`ACTION_SEND`); link has no phone number | BP §82; SHARE-002, CHAT-004 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching / uploading photo | G1-loading / Uploading {p}% | G1-loading / اپ لوڈ {p}% |
| Empty | Profile has no services yet | Your profile is not visible to customers yet. Add services and finish verification. | آپ کی پروفائل ابھی گاہکوں کو نظر نہیں آتی۔ سروسز شامل کریں اور تصدیق مکمل کریں۔ |
| Success | Loaded / photo saved | Photo updated. | تصویر اپ ڈیٹ ہو گئی۔ |
| Error | Failed | We couldn't load your profile. G1-retry | آپ کی پروفائل لوڈ نہیں ہو سکی۔ G1-retry |
| Pending/unknown | Photo upload sent, no answer | G1-pending. | G1-pending۔ |

Notes: badges and rating are never set by the app (BP §55.2, §19). "Years of experience" is not shown: BP §22.2 allows it only if supported, and no source defines the evidence.

### P19 — Notifications

- **Purpose:** jobs / payment / support notifications (BP §13 P19) and important account alerts (BP §74) as an in-app inbox; works even if push permission is denied.
- **Requirement IDs:** NOTIF-001…010, RATING-ENF-007, LEDGER-PAY-007.
- **Entry:** bell icon; push tap. **Exits:** the linked screen (P08, P09, P12, P15, P17, P20), P21 (categories).

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Category filter | Tabs: All · Jobs · Payments · Support · Account | — | — | All · Jobs · Payments · Support · Account | سب · کام · ادائیگیاں · سپورٹ · اکاؤنٹ | BP §13 P19, §74 |
| Item | Display: title, body (server template en/ur), time, read state, priority label for high priority | — | — | (template) | (template) | BP §24, §80; NOTIF-001 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Open item | (tap) | (tap) | Mark read; open linked screen | BP §80 |
| Notification settings | Settings | سیٹنگز | None → P21 | NOTIF-009 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching | G1-loading | G1-loading |
| Empty | No notifications | No notifications yet. | ابھی کوئی اطلاع نہیں۔ |
| Success | Loaded | (content) | (مواد) |
| Error | Failed | We couldn't load notifications. G1-retry | اطلاعات لوڈ نہیں ہو سکیں۔ G1-retry |
| Pending/unknown | Offline with cache | G1-offline · G1-last-updated | G1-offline · G1-last-updated |

Notes: notification text comes from server templates (NOTIF-001), not screen code. Promotion notifications are not built (BP §80 Low; Not launch).

### P20 — Support

- **Purpose:** provider cases and help (BP §13 P20): FAQ (L1 self-help), create a ticket, follow tickets and dispute case updates (BP §40), "respond to support cases" (BP §8.2).
- **Requirement IDs:** SUP-001, SUP-002, SUP-003, NOTIF-007, BOOK-CANCEL-006.
- **Entry:** menu; P09/P12 "Get help"; P17; blocked state support route. **Exits:** back.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| FAQ | Display list (en/ur content from server; editing per OQ-056) | — | — | Help articles | مدد کے مضامین | BP §40 (L1); SUP-001; OQ-056 |
| Category | Choice from server list (OQ-018) | One value | Yes | What is it about? | یہ کس بارے میں ہے؟ | BP §40; OQ-018 |
| Linked job | Choice of the provider's bookings (prefilled when opened from a job) | Own bookings only | No | Which job? | کون سا کام؟ | BP §40 |
| Description | Multiline text | Not empty | Yes | Tell us what happened | ہمیں بتائیں کیا ہوا | BP §40 |
| My cases | Display list: case #, status, level, last update | — | — | My cases | میرے کیسز | BP §40; SUP-002 |
| Case reply | Text | Not empty | Yes (to send) | Your reply | آپ کا جواب | BP §8.2 ("respond to support cases") |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Create case | Send to support | سپورٹ کو بھیجیں | Create ticket (idempotent) | BP §40; SUP-001 |
| Reply to case | Send reply | جواب بھیجیں | Add message to the case | BP §8.2 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching / sending | G1-loading / Sending… | G1-loading / بھیجا جا رہا ہے… |
| Empty | No cases | You have no support cases. | آپ کا کوئی سپورٹ کیس نہیں۔ |
| Success | Case created / reply stored | Case #{id} created. We will reply here. | کیس #{id} بن گیا۔ ہم یہیں جواب دیں گے۔ |
| Error | Failed | We couldn't send this. Your text is saved. G1-retry | یہ نہیں بھیجا جا سکا۔ آپ کی تحریر محفوظ ہے۔ G1-retry |
| Pending/unknown | Sent, no answer | G1-pending. Do not send it again. | G1-pending۔ اسے دوبارہ نہ بھیجیں۔ |

Notes: SLA targets are open (OQ-018): no response time is promised. Attachments on provider cases are not specified → not built.

### P21 — Settings

- **Purpose:** security, notifications, availability (BP §13 P21) plus language (BP §78.1) and account deletion (BP §27).
- **Requirement IDs:** I18N-002, NOTIF-009, NOTIF-010, SEC-AUTH-002, SEC-AUTH-008, PERM-004.
- **Entry:** menu. **Exits:** P06, P22, P23, P07, P16, P03, P18, P20, P01 (after log out).

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Language | Choice: English / اردو | — | Yes | Language | زبان | BP §78.1; I18N-002 |
| Notification categories | Toggles per category; critical job/payment/account messages cannot be turned off | — | — | Notifications: Jobs · Payments · Support · Messages | اطلاعات: کام · ادائیگیاں · سپورٹ · پیغامات | BP §74, §84 item 116; NOTIF-009 |
| Phone notifications | Display: On / Off + "Open phone settings" | — | — | Phone notifications: {on/off} | فون کی اطلاعات: {on/off} | BP §80; NOTIF-010 |
| Signed-in devices | Display list from server | — | — | Devices signed in | سائن ان ڈیوائسز | BP §27; SEC-AUTH-002 |
| Deletion OTP | Numeric code sent to the account phone | Server checks; limits per OQ-028 | Yes, to request deletion | Enter the code sent to {phone} to confirm deletion | اکاؤنٹ ختم کرنے کی تصدیق کے لیے {phone} پر بھیجا گیا کوڈ درج کریں | BP §27, §30; SEC-REVIEW #10 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Change language | (choice) | (choice) | Save preference to profile; UI switches immediately | BP §78.1 |
| Save categories | (toggle) | (toggle) | Update notification preferences | NOTIF-009 |
| Sign out other devices | Sign out other devices | دوسری ڈیوائسز سے سائن آؤٹ کریں | Revoke other sessions | SEC-AUTH-002 |
| Log out | Log out | لاگ آؤٹ | Revoke this session; clear local data | BP §27 |
| Availability / Status / Dates / Area / Payout / Verification / Profile / Help | (links) | (links) | None → P06 / P22 / P23 / P07 / P16 / P03 / P18 / P20 | BP §13 P21 |
| Delete account | Delete my account | میرا اکاؤنٹ ختم کریں | Request OTP → deletion request with the fresh OTP (hold period config `TODO(OWNER)`); on success the server revokes all sessions and push tokens and notifies the user by SMS during the hold, with a "cancel deletion" route through support; the server may refuse with an allow-listed reason code (open jobs, amount owed) | BP §27; SEC-AUTH-008; SEC-REVIEW #10 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching / saving | G1-loading / Saving… | G1-loading / محفوظ ہو رہا ہے… |
| Empty | No other signed-in devices | Only this phone is signed in. | صرف یہ فون سائن ان ہے۔ |
| Success | Saved / deletion requested | Saved. / Deletion requested. We will confirm in the app. | محفوظ ہو گیا۔ / اکاؤنٹ ختم کرنے کی درخواست موصول ہو گئی۔ ہم ایپ میں تصدیق کریں گے۔ |
| Error | Failed / refused | We couldn't save this. {server reason} G1-retry | یہ محفوظ نہیں ہو سکا۔ {server reason} G1-retry |
| Pending/unknown | Sent, no answer | G1-pending. | G1-pending۔ |

Deletion sheet copy: EN "Delete your account? Your job and payment records are kept as the law and our rules require, but your personal details will be removed." UR "کیا آپ اپنا اکاؤنٹ ختم کرنا چاہتے ہیں؟ آپ کے کاموں اور ادائیگیوں کا ریکارڈ ضرورت کے مطابق رکھا جائے گا، لیکن آپ کی ذاتی معلومات ہٹا دی جائیں گی۔" (BP §26, §27; SEC-AUTH-008).

Notes: biometric lock is Later (BP §74). No password settings exist (D-002).

---

## 5. Derived screens P22–P26 (ARCH §3.2, K-06)

### P22 — Availability status switch

- **Purpose:** one live status: Online / Available, Busy, Offline, Scheduled Only, Emergency Available (BP §59.3; ARCH §6.5).
- **Requirement IDs:** AVAIL-007, AVAIL-006, AVAIL-004, MATCH-ELIG-076, MATCH-ELIG-079, LEDGER-NEG-001, TRUST-VER-001, NOTIF-010, PERM-004.
- **Entry:** P04 status chip; P06; P21. **Exits:** back.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Online / Available | Option + meaning | — | One option | Online — I can take new jobs | آن لائن — میں نئے کام لے سکتا ہوں | BP §59.3 |
| Busy | Option + meaning (may be set by server at capacity) | — | — | Busy — working or full | مصروف — کام جاری ہے یا گنجائش پوری ہے | BP §59.3; AVAIL-006 |
| Offline | Option + meaning | — | — | Offline — no new requests | آف لائن — کوئی نئی درخواست نہیں | BP §59.3 |
| Scheduled only | Option + meaning | — | — | Scheduled only — only requests for my future free times | صرف شیڈول — صرف میرے آئندہ خالی اوقات کی درخواستیں | BP §59.3 |
| Emergency available | Option + meaning; offered only if the server says the provider is eligible | — | — | Emergency available — I can take emergency jobs | ایمرجنسی کے لیے دستیاب — میں ایمرجنسی کام لے سکتا ہوں | BP §59.3; AVAIL-004 |
| Eligibility note | Display from server (Basic level / unpaid commission) | — | — | You are Online, but you won't get new jobs until {reason}. | آپ آن لائن ہیں، لیکن {reason} تک آپ کو نئے کام نہیں ملیں گے۔ | TRUST-VER-001; LEDGER-NEG-001 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Set status | (option tap) | (option tap) | Request status change; server returns the effective status | BP §59.3; AVAIL-007 |
| Turn on notifications (first Online) | Turn on | آن کریں | None → G2 notification pre-prompt, then system dialog (OQ-026 default) | BP §75 item 96; NOTIF-010 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching / sending | G1-loading / Updating… | G1-loading / اپ ڈیٹ ہو رہا ہے… |
| Empty | Server returns no current status (new account) | Choose your status to start. | شروع کرنے کے لیے اپنا اسٹیٹس منتخب کریں۔ |
| Success | Server confirmed | You are now {availability label}. | اب آپ {availability label} ہیں۔ |
| Error | Refused / failed | We couldn't change your status. {server reason} G1-retry | آپ کا اسٹیٹس تبدیل نہیں ہو سکا۔ {server reason} G1-retry |
| Pending/unknown | Sent, no answer | G1-pending. Your status is still shown as {old}. | G1-pending۔ آپ کا اسٹیٹس ابھی {old} دکھایا جا رہا ہے۔ |

Notes: going Online does **not** start location tracking (BP §57.4; G3). "Provider available now" alerts from BP §83 are Proposed and not built.

### P23 — Date-specific availability overrides

- **Purpose:** override the normal schedule for specific dates: open, closed, limited, fully booked, special hours (BP §59.2) — e.g. "available Saturday 2–6 PM only".
- **Requirement IDs:** AVAIL-003, MATCH-ELIG-076.
- **Entry:** P06, P11 (date), P21. **Exits:** back.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Date | Date picker | Today or later | Yes | Date | تاریخ | BP §59.2 |
| Override type | Choice: Open · Closed · Limited · Fully booked · Special hours | One value | Yes | Open · Closed · Limited · Fully booked · Special hours | کھلا · بند · محدود · مکمل بک · خاص اوقات | BP §59.2; AVAIL-003 |
| Hours | Time range(s) | End after start | Open / Special hours: yes | From / To | سے / تک | BP §59.2 |
| Limited detail | Per OQ-071 (default: maximum jobs that day, integer ≥ 1) | ≥ 1 | Limited: yes | Maximum jobs that day | اس دن زیادہ سے زیادہ کام | BP §59.2; OQ-071 |
| Upcoming overrides | Display list | — | — | Your date changes | آپ کی تاریخوں کی تبدیلیاں | BP §59.2 |
| Affected jobs warning | Display from server when the date already has jobs | — | — | You have {n} jobs on this date. They are not cancelled automatically. | اس تاریخ پر آپ کے {n} کام ہیں۔ یہ خود بخود منسوخ نہیں ہوں گے۔ | OQ-071 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Save override | Save | محفوظ کریں | Create/update date override | AVAIL-003 |
| Remove override | Remove | ہٹائیں | Delete override (normal schedule applies again) | BP §59.2 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching / saving | G1-loading / Saving… | G1-loading / محفوظ ہو رہا ہے… |
| Empty | No overrides | No date changes. Your weekly hours apply. | تاریخوں میں کوئی تبدیلی نہیں۔ آپ کے ہفتہ وار اوقات لاگو ہیں۔ |
| Success | Saved | Saved for {date}. | {date} کے لیے محفوظ ہو گیا۔ |
| Error | Refused / failed | We couldn't save this date. {server reason} G1-retry | یہ تاریخ محفوظ نہیں ہو سکی۔ {server reason} G1-retry |
| Pending/unknown | Sent, no answer | G1-pending. | G1-pending۔ |

### P24 — Structured quote builder

- **Purpose:** build and send a quote/offer: line items per BP §58.1 (or a simple total, BP §18 step 57 — OQ-067), validity, inclusions/exclusions, expected duration and **crew size (required)** (ARCH §3.2; BP §18, §58; D-004).
- **Requirement IDs:** QUOTE-003, QUOTE-004, QUOTE-005, QUOTE-007, QUOTE-009, FARE-001…011, PROV-CREW-001, PROV-CREW-005, PRICE-003, PRICE-005, PRICE-006, COMM-004, LEDGER-NEG-002, BOOK-STATUS-003, REL-003, REL-004, ABUSE-005.
- **Entry:** P08/P09/P10 "Send quote". **Exits:** P09 (after send).

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Line type | Choice: Visit / call-out · Inspection / diagnosis · Labour / service · Tools / equipment · Consumables · Parts / new materials · Emergency / after-hours (only `emergency_allowed`) · Travel / distance (only with a configured rule) · Discount | Platform fee never (D-025); Tax computed by server (D-029) | ≥ 1 line (simple total: OQ-067) | Type of charge | چارج کی قسم | BP §58.1; FARE-001…011 |
| Line description | Text | Not empty | Yes | Description | تفصیل | BP §58 |
| Quantity + unit | Number + unit | Quantity > 0 | Labour: where practical | Quantity / Unit | مقدار / اکائی | FARE-003 |
| Amount | Money (PKR) | > 0 | Yes | Amount | رقم | BP §58.1 |
| Reason (tools) | Text | Not empty | Tools: yes | Why is this needed? | اس کی ضرورت کیوں ہے؟ | FARE-004 |
| Deductible (inspection) | Yes/No | — | Inspection line: yes | Deduct from the final repair price? | آخری مرمت کی قیمت میں سے کم ہوگی؟ | FARE-002; PRICE-003 |
| Materials class | Included · Not included · Extra (needs approval) | — | Parts/materials: yes | Materials | سامان | PRICE-005 |
| Valid until | Date/time | Required; default and maximum from config (D-013, `TODO(OWNER)`, OQ-006) | Yes | Quote valid until | کوٹیشن کب تک درست ہے | BP §18 step 58; QUOTE-004 |
| What is included | Text list | — | Yes (may be one line) | What is included | کیا شامل ہے | BP §18 step 59; QUOTE-005 |
| What is not included | Text list | — | Yes (may be "Nothing") | What is not included | کیا شامل نہیں | BP §18 step 59; QUOTE-005 |
| Expected duration | Number + unit (hours / days) | > 0 | Yes | How long will the work take? | کام میں کتنا وقت لگے گا؟ | BP §18 step 59; QUOTE-005 |
| Crew size | Integer stepper | ≥ 1 | **Yes** | How many workers will come? | کتنے کاریگر آئیں گے؟ | D-004; PROV-CREW-001 |
| Crew price note | Display | — | — | The number of workers does not change the price. | کاریگروں کی تعداد سے قیمت نہیں بدلتی۔ | D-018 |
| Note to customer | Text; passes the server moderation/redaction hook before the customer sees it | Server limits; held if flagged | No | Explain your price (optional). Don't write phone numbers or addresses. | اپنی قیمت کی وضاحت کریں (اختیاری)۔ فون نمبر یا پتہ نہ لکھیں۔ | BP §53 ("explain the expected cost"); REQ-AI-009; SEC-REVIEW #13 |
| Totals preview | Display from server: lines, Tax line (Rs. 0 while unset), customer total; your commission and share | — | — | Customer pays {total} · Commission {c} · Your share {s} | گاہک ادا کرے گا {total} · کمیشن {c} · آپ کا حصہ {s} | D-006, D-015, D-029; COMM-004 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Add line | Add charge | چارج شامل کریں | None (form) | BP §58.1 |
| Remove line | Remove | ہٹائیں | None (form) | BP §58.1 |
| Preview totals | (automatic, debounced) | (خودکار) | Request a price preview; server computes | BP §29; SEC-BASE-007 |
| Send quote | Send quote | کوٹیشن بھیجیں | Create + send quote (idempotent; refused with `UNPAID_COMMISSION` while owed) | BP §18; LEDGER-NEG-002 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Preview / sending | Calculating… / Sending… | حساب ہو رہا ہے… / بھیجا جا رہا ہے… |
| Empty | No lines yet | Add at least one charge to build your quote. | کوٹیشن بنانے کے لیے کم از کم ایک چارج شامل کریں۔ |
| Success | Server stored and sent | Quote sent. The customer will compare and decide. | کوٹیشن بھیج دی گئی۔ گاہک موازنہ کر کے فیصلہ کرے گا۔ |
| Error | Refused (422, `UNPAID_COMMISSION`, `TRANSITION_NOT_ALLOWED`) / failed | We couldn't send your quote. {server reason} Your quote is saved on this phone. | آپ کی کوٹیشن نہیں بھیجی جا سکی۔ {server reason} آپ کی کوٹیشن اس فون پر محفوظ ہے۔ |
| Pending/unknown | Sent, no answer | G1-pending. Do not send this quote again. | G1-pending۔ یہ کوٹیشن دوبارہ نہ بھیجیں۔ |

Notes: the draft is saved locally until the server confirms (REL-004). The app never computes totals, tax or commission (SEC-BASE-007). Withdraw or revise after sending is not built (OQ-068). After acceptance, changes go through P13 as Proposed lines (QUOTE-008).

### P25 — Request media player

- **Purpose:** play the customer's audio note, video (with thumbnail) and photos inside the job flow (BP §76.1 "play it without leaving the job flow"; ARCH §3.2).
- **Requirement IDs:** MEDIA-005, MEDIA-006, UX-PROV-001, INFRA-003, PERF-005.
- **Entry:** P08 media icons; P09 inline. **Exits:** back to the same job (no navigation away).

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Audio player | Play/pause, seek bar (LTR), elapsed / total | — | — | Customer's voice note | گاہک کا وائس نوٹ | BP §76.1 |
| Transcript | Display text if the server has one | — | — | Text of the voice note | وائس نوٹ کا متن | BP §76.1; MEDIA-006 |
| Video | Thumbnail → in-app player with play/pause | — | — | Customer's video | گاہک کی ویڈیو | BP §76.2; MEDIA-005 |
| Photos | Gallery with swipe and zoom; "{i} of {n}" | — | — | Photo {i} of {n} | تصویر {i} از {n} | BP §76.3 |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Play / Pause | Play / Pause | چلائیں / روکیں | Fetch media via signed URL | BP §76.1; INFRA-003 |
| Close | Back to job | کام پر واپس | None | BP §76.1 |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Fetching signed URL / buffering | Loading media… | میڈیا لوڈ ہو رہا ہے… |
| Empty | Request has no media | The customer did not add a voice note, video or photo. | گاہک نے کوئی وائس نوٹ، ویڈیو یا تصویر شامل نہیں کی۔ |
| Success | Media ready | (player) | (پلیئر) |
| Error | Media expired / failed / removed by retention | This file can't be played. It may have been removed. G1-retry | یہ فائل نہیں چل سکتی۔ ہو سکتا ہے اسے ہٹا دیا گیا ہو۔ G1-retry |
| Pending/unknown | Offline / signed URL timed out | Media needs internet. We will load it when you are online. | میڈیا کے لیے انٹرنیٹ ضروری ہے۔ آن لائن ہونے پر لوڈ ہو جائے گا۔ |

Notes: audio may be in the customer's spoken language (BP §78.3). Media is not downloaded to the device gallery (privacy, BP §21). Retention removes originals after the configured period (MEDIA-007, D-011).

### P26 — Before/after evidence capture

- **Purpose:** capture before/after work evidence and completion proof with the camera (BP §74 Camera row; ARCH §3.2), or choose existing photos with the system photo picker.
- **Requirement IDs:** PERM-002, PERM-005, MEDIA-003, MEDIA-004, MEDIA-008, UX-PROV-005.
- **Entry:** P14 "Add photo"; P12. **Exits:** back to P14 with the photo attached.

Fields

| Field | Type | Validation | Required | EN label | UR label (DRAFT) | Source |
|---|---|---|---|---|---|---|
| Tag | Choice: Before / After | One value | Yes | Before work · After work | کام سے پہلے · کام کے بعد | BP §74 |
| Photo | Camera capture or photo picker; compressed preview | Size/count limits from config (D-011, OQ-004) | Per service (server flag) | Photo | تصویر | BP §74, §76.3; MEDIA-003 |
| Upload progress | Display per photo | — | — | Uploading {p}% / Uploaded / Failed | اپ لوڈ {p}% / اپ لوڈ ہو گئی / ناکام | BP §76.2 (retry pattern) |

Actions

| Action | EN | UR (DRAFT) | Server request | Source |
|---|---|---|---|---|
| Take photo | Take photo | تصویر لیں | Camera permission asked on this tap (G2) | BP §75 item 94 |
| Choose photo | Choose from gallery | گیلری سے منتخب کریں | Photo picker (no permission) | BP §75 item 97 |
| Retake / Delete | Retake / Delete | دوبارہ لیں / حذف کریں | Delete pending upload | BP §76.2 (pattern) |
| Retry upload | Retry | دوبارہ کوشش کریں | Resume/restart upload session | MEDIA-009 (pattern) |

States

| State | When | EN | UR (DRAFT) |
|---|---|---|---|
| Loading | Camera opening / compressing / uploading | Preparing photo… / Uploading {p}% | تصویر تیار ہو رہی ہے… / اپ لوڈ {p}% |
| Empty | No photo yet | Take a photo of the work before and after. | کام سے پہلے اور بعد کی تصویر لیں۔ |
| Success | Server finalized the upload | Photo saved. | تصویر محفوظ ہو گئی۔ |
| Error | Upload refused (limit) / failed / permission denied | Photo too large or upload failed. Your other photos are safe. G1-retry / G2-denied | تصویر بہت بڑی ہے یا اپ لوڈ ناکام ہوا۔ آپ کی باقی تصاویر محفوظ ہیں۔ G1-retry / G2-denied |
| Pending/unknown | Upload sent, finalize not confirmed | G1-pending. The photo stays on this phone until it is saved. | G1-pending۔ محفوظ ہونے تک تصویر اس فون پر رہے گی۔ |

Notes: video evidence is not built at launch (would need microphone, OQ-024). Full-resolution originals are not kept (BP §76.3).

---

## 6. Coverage checklist (acceptance: every screen has all 5 states)

| Screen | Name | Loading | Empty | Success | Error | Pending/unknown | Main requirement IDs |
|---|---|---|---|---|---|---|---|
| P01 | Provider welcome | ✓ | ✓ | ✓ | ✓ | ✓ | UX-SCREEN-002, I18N-002 |
| P02 | Provider registration | ✓ | ✓ | ✓ | ✓ | ✓ | SEC-AUTH-001, SEC-AUTH-004, UX-SCREEN-004 |
| P03 | Verification | ✓ | ✓ | ✓ | ✓ | ✓ | TRUST-VER-001…003, MEDIA-008 |
| P04 | Provider home | ✓ | ✓ | ✓ | ✓ | ✓ | LEDGER-NEG-003, RATING-ENF-007 |
| P05 | Service setup | ✓ | ✓ | ✓ | ✓ | ✓ | ROLE-002, MATCH-ELIG-074 |
| P06 | Availability | ✓ | ✓ | ✓ | ✓ | ✓ | AVAIL-001, -002, -004, -006 |
| P07 | Service area | ✓ | ✓ | ✓ | ✓ | ✓ | AVAIL-005, LOC-GEO-006 |
| P08 | Job requests | ✓ | ✓ | ✓ | ✓ | ✓ | UX-PROV-001, UX-PROV-002, QUOTE-002 |
| P09 | Job detail | ✓ | ✓ | ✓ | ✓ | ✓ | QUOTE-002, UX-PROV-003, PROF-ADDR-004 |
| P10 | Accept/reject/quote | ✓ | ✓ | ✓ | ✓ | ✓ | UX-PROV-002, PROV-CREW-002 |
| P11 | Schedule | ✓ | ✓ | ✓ | ✓ | ✓ | BOOK-STATUS-005/006 |
| P12 | Job execution | ✓ | ✓ | ✓ | ✓ | ✓ | LEDGER-NEG-005, LOC-GEO-007, UX-PROV-004 |
| P13 | Extras/materials | ✓ | ✓ | ✓ | ✓ | ✓ | FARE-012, PROV-CREW-004 |
| P14 | Completion evidence | ✓ | ✓ | ✓ | ✓ | ✓ | LEDGER-001, LEDGER-002, UX-PROV-005 |
| P15 | Earnings | ✓ | ✓ | ✓ | ✓ | ✓ | LEDGER-006, LEDGER-NEG-003, LEDGER-PAY-001/002 |
| P16 | Payout methods | ✓ | ✓ | ✓ | ✓ | ✓ | PAY-007, EXT-001 |
| P17 | Reviews | ✓ | ✓ | ✓ | ✓ | ✓ | REV-003, RATING-ENF-004 |
| P18 | Provider profile | ✓ | ✓ | ✓ | ✓ | ✓ | SHARE-002, TRUST-BADGE-001 |
| P19 | Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | NOTIF-001, NOTIF-009 |
| P20 | Support | ✓ | ✓ | ✓ | ✓ | ✓ | SUP-001…003 |
| P21 | Settings | ✓ | ✓ | ✓ | ✓ | ✓ | I18N-002, SEC-AUTH-002, SEC-AUTH-008 |
| P22 | Availability status switch | ✓ | ✓ | ✓ | ✓ | ✓ | AVAIL-007 |
| P23 | Date-specific availability overrides | ✓ | ✓ | ✓ | ✓ | ✓ | AVAIL-003 |
| P24 | Structured quote builder | ✓ | ✓ | ✓ | ✓ | ✓ | QUOTE-003…005, PROV-CREW-001 |
| P25 | Request media player | ✓ | ✓ | ✓ | ✓ | ✓ | MEDIA-005, MEDIA-006 |
| P26 | Before/after evidence capture | ✓ | ✓ | ✓ | ✓ | ✓ | PERM-002, MEDIA-008 |

## 7. Open items referenced in this file

| OQ | Topic | Screens | Default used in this spec |
|---|---|---|---|
| OQ-004 | Media limits & retention (D-011) | P03, P14, P15, P18, P25, P26 | Limits read from config; `LIMIT_NOT_CONFIGURED` handled |
| OQ-005 | Performance budgets / timeouts (D-012) | Global G1 | Timeouts from config `TODO(OWNER)` |
| OQ-006 | Quote validity (D-013) | P24 | Validity required; default/max from config |
| OQ-007 | D-022 follow-ups (Finance time, grace, discount) | P13, P15 | No promised verification time |
| OQ-012 | Email at registration | P02 | Optional, not for login |
| OQ-013 | Rating numbers / appeal (D-017) | P17 | Dry-run; support route only |
| OQ-015 | Verification items per category | P03 | Item list from server config |
| OQ-018 | Support categories / SLA | P20 | Category list from server; no SLA shown |
| OQ-024 | Partner microphone | P26, G2 | No microphone; no video evidence |
| OQ-025 | Live provider location to customer | P12, G2, G3 | No provider location sent at all; address hand-off + server ETA; if approved later, `Provider En Route` only |
| OQ-026 | Partner notification permission moment | P22, G2 | First Online, after onboarding |
| OQ-027 | Exact address/contact reveal moment | P09, P12, G7 | After customer choice + Accepted |
| OQ-028 | OTP/session numbers | P02, P21 | Values from config |
| OQ-039, OQ-040 | Customer terms / phone format (A11) | P02 | Provider copies the customer defaults |
| OQ-044 | When a booking becomes Completed (A11) | P14 | Server decides; app shows server status |
| OQ-050 | Cancel reasons (A11) | P09 | No reason asked while config is `null` |
| OQ-056 | FAQ editing (A13) | P20 | FAQ content from server |
| OQ-057 | Verification "request more information" (A13) | P03 | Approve/reject only |
| OQ-059 | Pay-company amount differences (A13) | P15 | Submitted amount approved or rejected as is |
| OQ-077 | DIGITAL recorded but no gateway confirmation (A00, from A15 #6) | P14, P15 | Risk flag after `ledger.digital_unconfirmed_flag_hours`; `null` → no automatic flag |
| OQ-062 | Provider login placement; provider terms acceptance | P01, P02 | Login = P02 phone/OTP step; no terms checkbox |
| OQ-063 | Partner chat screen has no ID | P08, P09, P10, P12 | Booking conversation opened without a P-ID |
| OQ-064 | Verification refusal reason / resubmission; editing identity after verification | P03, P18 | Show server note; re-upload only where server allows; identity fields read-only after submission |
| OQ-065 | Decline reason and provider cancel reason | P08, P09, P10 | No decline reason; cancel reason only from a config list |
| OQ-066 | Who proposes the inspection visit time (D-028) | P09, P10 | Provider action not built until answered; visit time displayed if set |
| OQ-067 | "Simple total" quote vs commission on labour only | P24 | Typed lines required |
| OQ-068 | Withdraw / revise a sent quote | P24 | Not built |
| OQ-069 | Which services need a customer signature / completion code; completion-code attempt limit | P14 | Not required (flags `null`); attempt limit config `null` |
| OQ-070 | Earnings buckets, payout initiation, waiting period after a payout-method change | P04, P15, P16 | Server buckets shown as given; no payout request button; fresh OTP + critical notification on every payout-method change (SEC-REVIEW #2); waiting period `TODO(OWNER)` |
| OQ-071 | Meaning of "Limited" date override; effect on existing jobs | P23 | Limited = max jobs that day; existing jobs untouched + warning |
| OQ-072 | Which price fields the provider sets; min/max bounds | P05 | Provider sets amounts for the catalog price model; server validates |

# Kaam Karo — Device, Network and Language Matrix v1

> Task **T0.5** (owner A16). Written 2026-10-22. Companion to `docs/qa/test-strategy.md`.
> Sources: BP §38, §49 ("Release build tested on representative Android devices"), §74, §75 items 93–98, §76, §78.1, §78.2 ("Test Urdu on small screens and low-cost Android devices"), §80 (Android 13+ notification permission), §84 items 109 and 120; ARCH §13, §17 (Android-first, Expo dev builds; T0.6 condition of D-001); IMPL §6 T0.5, T0.6, T3.12, T4.7, T8.3, T8.4; `docs/security/permission-policy.md` M-03, M-06, §3, §4.
> Requirement IDs served: I18N-001…004, I18N-008, A11Y-001…008, PERM-001…006, NOTIF-010, MEDIA-008, MEDIA-009, REL-004…006, PERF-001…007, JOURNEY-001…003, UX-PROV-005.

**How to read the numbers in this file.** Screen sizes, RAM classes, dp widths, emulator presets and font scales below are **test-selection settings** chosen by QA to make the matrix concrete. They are not product budgets, limits or business values. Any specific phone model or market claim is marked **"example, owner to confirm"**.

---

## 1. Device profiles (Android, mobile apps)

The launch is Android-first (BP §49, §74; D-001). iOS is not in the launch matrix (see §7, OQ-032).

| Profile | Role | Screen class | RAM class | Density / resolution class | Android version | Physical or emulator | Why |
|---|---|---|---|---|---|---|---|
| **D-REF — Low-cost small (T0.6 reference device)** | The **cheapest phone in the matrix**. Used for T0.6 Urdu Nastaliq smoke test, every Urdu typography check, performance measurement (T8.3) and the release gate | Small: about 5.0"–6.0" diagonal, logical width **≤ 360 dp** | Low: about 2–3 GB; an Android Go edition device is acceptable | HD / HD+ class (720 px wide), roughly hdpi–xhdpi | Whatever the selected device ships with; recorded in the run log. Preferably Android 13+ (so the matrix has a cheap device that shows the notification prompt) | **Physical required** | BP §78.2, §49; T0.6; PERF-007 |
| **D-OLD — Older low-cost** | Covers Android **below 13** (no runtime notification permission; photo picker via backport or document-picker fallback) and old WebView/system fonts | Small or normal | Low | HD class | **Android 12 or lower**, but not below the minimum supported version (OQ-030) | Physical preferred (borrowed/second-hand is fine); emulator `E-OLD` as backup | BP §80, §75 item 97; NOTIF-010, MEDIA-008 |
| **D-MID — Mid-range current** | Main full-E2E device; "normal" user | Normal: about 6.1"–6.6", width about 360–412 dp | Mid: about 4–8 GB | FHD+ class, xxhdpi | Current Android (14 or newer at the time of the run) | **Physical required** for release gate; emulator `E-MID` for nightly | BP §49 "representative"; JOURNEY-001/002 |
| **D-TALL — Large / tall screen** | Layout on tall 20:9-class and large screens: bottom sheets, long lists, RTL alignment at width | Large: ≥ 6.5", width about 411–480 dp | Any | FHD+ class | Current Android | Emulator `E-TALL` is enough; physical optional | I18N-003 (sheets mirrored), UX-SCREEN-003 |
| **E-MIN — Minimum-layout stress (emulator only)** | Worst-case layout: narrowest width + largest font | Width **320 dp** class (test setting) | n/a | mdpi/hdpi class | Same as E-REF | Emulator only | A11Y-001 readable sizes; I18N-004 clipped marks at large font |

Example devices for D-REF / D-OLD / D-MID (**example, owner to confirm**): entry-level models from brands commonly sold in Pakistan such as Tecno, Infinix, itel, Xiaomi Redmi A-series, Samsung Galaxy A0x-series; for D-MID a current mid-range model from the same brands. A16 has not verified prices or availability; the owner chooses (OQ-029).

### 1.1 Emulator equivalents (CI)

| AVD | Mirrors | Settings (test settings) |
|---|---|---|
| `E-REF` | D-REF | 720 × 1440 class, xhdpi, width ≤ 360 dp, low RAM AVD option on, same Android version as D-REF |
| `E-OLD` | D-OLD | Android 12 or lower (≥ minimum supported, OQ-030), Google Play system image (for the photo-picker backport) |
| `E-MID` | D-MID | 1080 × 2400 class, current Android |
| `E-TALL` | D-TALL | Tall/large screen preset, current Android |
| `E-MIN` | stress | 320 dp width class, font scale = largest system setting |

An emulator never replaces a physical run for: T0.6, Urdu typography sign-off (I18N-004), performance (PERF-007) and the BP §49 release gate.

### 1.2 Device conditions to apply on D-REF (and D-OLD where possible)

| Condition | What to check | IDs |
|---|---|---|
| System font size = largest | Urdu marks not clipped; buttons still usable; no text overlap | I18N-004, A11Y-001, A11Y-002 |
| Display size = largest | Same | A11Y-001 |
| Low free storage (device almost full) | Media capture/compress fails gracefully; draft kept | MEDIA-003, MEDIA-009, REL-004 |
| OEM battery optimisation on (default on many low-cost phones) | App killed in background → draft restored; push still received or in-app inbox shows it | REL-004, NOTIF-001 |
| App killed mid-request | Draft restored on reopen | REL-004 |
| Permission "deny" and "don't ask again" | Fallback works, never a dead end (permission-policy §3 general rule) | PERM-001…005 |
| Approximate location only | App still works (permission-policy M-04) | PERM-001, LOC-GEO-001 |

---

## 2. Android version coverage (behaviour that changes by version)

The matrix must contain **at least one device below Android 13 and at least one device on Android 13 or newer** at every UI phase gate and at the release gate. Version facts below are Android platform behaviour (BP §80 states the Android 13 notification rule; BP §75 item 97 / §87 reference the Photo Picker); A16 re-verifies them against the Expo SDK that A01 pins at T2.1.

| Android version class | Behaviour that matters | Test | Profiles | IDs |
|---|---|---|---|---|
| Below 13 | Notifications do not need a runtime permission | No notification dialog ever appears; category controls in settings still work; booking flow unaffected | D-OLD / E-OLD | NOTIF-009, NOTIF-010, PERM-004 |
| Below 13 | System photo picker may be provided by a backport, otherwise the library falls back to the document picker | Picking a photo works **without** any storage/media permission in the merged manifest | D-OLD / E-OLD | MEDIA-008, PERM-005 |
| 13 and newer | `POST_NOTIFICATIONS` is a runtime permission (BP §80) | No prompt at install/login/onboarding; value pre-prompt then system prompt after the first booking (customer) / agreed provider moment (OQ-026); deny → in-app status still updates | D-REF, D-MID / E-REF, E-MID | NOTIF-010, PERM-004 |
| 13 and newer | System photo picker available natively | Picker opens with no media permission requested | D-REF, D-MID | MEDIA-008, PERM-005 |
| 14 and newer | Partial media access (`READ_MEDIA_VISUAL_USER_SELECTED`) exists but is on the never-request list | No partial-access dialog ever appears; picker still works | D-MID / E-MID | PERM-005 (permission-policy §4.1) |
| All | Foreground location only; no background location | No background-location prompt; provider location only during active job with indicator | All | LOC-GEO-007, PERM-006 |

Minimum supported Android version: not decided. A01 proposes it from the pinned Expo SDK at T2.1; the owner confirms (OQ-030). Devices below that floor are out of the matrix.

---

## 3. Network profiles

Defined by the **behaviour to emulate**. Emulator values are suggested test settings, not product budgets.

| Profile | Behaviour to emulate | Emulator setting (test setting) | Physical method | What must hold | IDs |
|---|---|---|---|---|---|
| **N1 Good 4G** | Normal mobile data | `-netspeed lte -netdelay none` (or `full`) | Real 4G / Wi-Fi | Baseline; all suites pass | — |
| **N2 Slow / unstable 3G-class** | Low bandwidth, high latency | `-netspeed edge` or `umts`, `-netdelay edge` or `umts` | Phone set to 3G/2G-only network mode where available | Loading and progress states visible; text before images/maps; matching shows progress; nothing freezes; no premature success | A11Y-007, PERF-003, PERF-005, PERF-006, REL-005 |
| **N3 Offline from start** | No connection when the screen opens | Airplane mode | Airplane mode | Useful error + retry, never blank; drafts kept | REL-001, REL-002, REL-004 |
| **N4 Drop mid-request** | Request leaves the device, connection is cut before the response arrives | Server-side delay (test-only, test-strategy §6.1) on the target endpoint + airplane mode on during the delay, off after | Same, on device | UI shows **pending/unknown**, never success; on reconnect it reconciles through the idempotency key; exactly one server record | REL-005, REL-006, REL-003, REL-008 |
| **N5 Flapping during upload** | Connection toggles while media uploads | Airplane mode toggled during upload | Same | Draft and other inputs survive; retry succeeds later | MEDIA-009, REL-004 |
| **N6 Slow server, good network** | Server confirmation delayed | Test-only server delay | Same | Pending shown until confirmed | REL-005 |

Mid-request actions that **must** be run under N4: create booking, submit request, accept quote, approve charge, initiate payment, record CASH/DIGITAL, "Pay company" submission (ARCH §8 rule 3; LEDGER-001, LEDGER-PAY-002).

---

## 4. Language and locale profiles (BP §78.1)

| Profile | Device language | App language | Expected | IDs |
|---|---|---|---|---|
| **L-EN** | English | en | LTR layout | I18N-001 |
| **L-UR** | Urdu | ur | Full RTL mirroring (alignment, icons, arrows, control order, sheets); Urdu font with generous line height | I18N-001, I18N-003, I18N-004 |
| **L-UR-DEV-EN-APP** | Urdu | en (user chose English) | App follows the **app** language: LTR English UI; the default at first launch may be inferred from the device (ur) and the user changes it | I18N-002 |
| **L-EN-DEV-UR-APP** | English | ur (user chose Urdu) | App is RTL Urdu even though the device is LTR | I18N-002, I18N-003 |
| **L-SWITCH** | any | en → ur → en at runtime from C41/settings | Applies at once, no reinstall; no mixed-direction leftovers on the current screen | I18N-002 |
| **L-VOICE** | any | en and ur | Voice language chip follows the app language; summaries in the app language | VOICE-006 |

Admin portal: English only until OQ-022 is answered.

---

## 5. Which suites run on which profile

Legend: **R** = required for the gate/run shown, **N** = nightly on emulator, **—** = not run.

| Suite | D-REF (physical) | D-OLD (physical) | D-MID (physical) | D-TALL | E-REF | E-OLD | E-MID | E-TALL | E-MIN |
|---|---|---|---|---|---|---|---|---|---|
| PR smoke (customer + partner, en + ur) | — | — | — | — | R (every app PR) | — | — | — | — |
| Smoke (launch, login, home, one request) en + ur | R gate | R gate | R gate | optional | N | N | N | N | N |
| Full customer journey (JOURNEY-001) en + ur | R gate | — | R gate | — | N | — | N | — | — |
| Full provider journey (JOURNEY-002) en + ur | R gate | — | R gate | — | N | — | N | — | — |
| Joint customer + provider (two devices) | R release | — | R release | — | — | — | N (API counterpart) | — | — |
| Permission timing + deny fallbacks (PERM-001…005, NOTIF-010) | R gate | R gate | R gate | — | N | N | N | — | — |
| Manifest guard (merged release manifest) | — (CI check, not a device run; every PR) | — | — | — | — | — | — | — | — |
| Network profiles N2–N6 | R gate (N2, N4) | — | R gate (all) | — | N (all) | — | N (all) | — | — |
| Fault injection (test-strategy §6) | — | — | R gate | — | N | — | N | — | — |
| RTL screenshot set (every screen, L-UR) | R gate | — | R gate | R gate (emulator ok) | N | — | N | N | N |
| **Urdu typography check** (manual, default + largest font) | **R** (T0.6, T1.4, every UI gate, T8.4) | optional | optional | — | — | — | — | — | N (screenshots only) |
| Language combinations L-UR-DEV-EN-APP, L-EN-DEV-UR-APP, L-SWITCH | R gate | — | — | — | N | — | N | — | — |
| Device conditions §1.2 | R gate | optional | — | — | — | — | — | — | — |
| Performance (T8.3, once D-012 is set) | **R** | — | optional (comparison) | — | — | — | — | — | — |
| Field usability: complete a job in the field on a small device (UX-PROV-005) | R gate (Phase 4, release) | — | — | — | — | — | — | — | — |

"R gate" = at the phase gates where the suite's IDs are due (test-strategy §3.2, §8) and at the release gate. Every R run is recorded in `docs/qa/device-runs/<date>-<profile>.md` with: device model, Android version, app build, locale, network profile, results per ID, screenshot links.

### 5.1 Admin portal (Playwright)

| Profile | Browser engine | Viewport (test setting) | Runs |
|---|---|---|---|
| **A-CHROMIUM** | Chromium | 1366 × 768 and 1920 × 1080 | PR smoke (admin changes), nightly full, release gate |
| **A-FIREFOX** | Firefox | 1366 × 768 | Nightly, release gate |
| **A-WEBKIT** | WebKit | 1366 × 768 | Nightly |

Which browsers the operations team actually uses is an owner question (OQ-031). Until answered, Chromium is the gate browser. The admin portal requests no device permissions (permission-policy §2).

---

## 6. T0.6 reference device — definition

| Item | Value |
|---|---|
| Profile | **D-REF** (physical) |
| Selection rule | The **cheapest** phone in this matrix that still meets the minimum supported Android version (OQ-030) |
| What T0.6 runs on it | One Expo dev-build screen with Noto Nastaliq Urdu, RTL layout, a mixed Urdu/English label, a list, a bottom sheet and a text input (IMPL T0.6) |
| Settings for the run | L-UR; system font size default **and** largest; N1 |
| Pass criteria (IMPL T0.6) | No clipped marks; readable line height; correct RTL mirroring; smooth scroll |
| Evidence | Screenshots in `docs/qa/urdu-smoke/` + a run record naming model, Android version, RAM, screen size, font scale |
| On FAIL | A00 reopens D-001 (ARCH §17 acceptance condition) |
| Until a physical device is chosen | T0.6 **cannot pass**. `E-REF` screenshots may be taken as a preview but are not evidence for D-001 |

---

## 7. Open questions raised by this matrix

Recorded by A00 in `coordination/OPEN_QUESTIONS.md` as OQ-029…OQ-033 (2026-10-22).

| OQ | Question | Blocks | Default until answered |
|---|---|---|---|
| OQ-029 | Which physical phones will we buy or borrow for **D-REF** (cheapest, small screen, low RAM), **D-OLD** (Android 12 or lower) and **D-MID** (current mid-range)? Owner names models and budget. | T0.6 (and therefore D-001 condition and Phase 3 UI work), every gate's physical runs, BP §49 release gate | None — T0.6 cannot pass without D-REF |
| OQ-030 | Minimum supported Android version for both apps (A01 proposes from the pinned Expo SDK at T2.1; owner accepts). | D-OLD selection; store listing | Expo SDK default floor, recorded by A01 |
| OQ-031 | Which browser(s) will the admin/operations team use? (and admin language — existing OQ-022) | Admin release gate browser list | Chromium is the gate browser |
| OQ-032 | Confirm that iOS is **not** in the launch/pilot test matrix (Android-first, D-001, BP §49). | Matrix scope | Android only |
| OQ-033 | May QA use a paid cloud device farm later, or physical devices only? (A vendor choice — not decided; IMPL §0 rule 4.) | Scale of nightly physical runs | Physical devices + emulators only |

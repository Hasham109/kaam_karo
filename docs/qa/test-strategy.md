# Kaam Karo — Test Strategy v1

> Task **T0.5** (owner A16, QA & Test). Written 2026-10-22. Depends on T0.2 (`docs/requirements/REQUIREMENTS.md`, 417 IDs).
> Companion file: `docs/qa/device-matrix.md` (device, network and language profiles).
> Sources: BP §9–§11, §15, §19, §26, §29–§31, §38, §43 rules 68 & 72, §44, §45, §49, §54.1, §58, §62, §67, §75, §76, §77, §78, §80, §84 item 120; ARCH §6.1, §6.7, §6.8, §8, §10, §13, §15, §17, §18; IMPL §0, §4, §6, §7, §8; D-001, D-003, D-005, D-006, D-012, D-014–D-021; `docs/security/permission-policy.md` (T0.4).
> No business value in this file is new. Where a value is open, the test checks the **mechanism** and the **safe behaviour while the value is `null`** (REQUIREMENTS §0.2).

---

## 1. Principles

| # | Principle | Source |
|---|---|---|
| P1 | Every critical business rule has an automated test: state transitions, money, eligibility, permissions, AI guards. | BP §43 rule 68; IMPL §0 rule 9; CLAUDE.md golden rule 8 |
| P2 | Every test cites at least one requirement ID. No ID, no test; no test, no "Done". | IMPL §0 rule 2, §8; BP §48 |
| P3 | Build, lint, typecheck and tests run before any feature is called complete. | BP §43 rule 72; IMPL §0 rule 8 |
| P4 | A test is never weakened, skipped or deleted to make it pass. A wrong expectation is changed only after A00 confirms it against the Blueprint. | IMPL §7.2 items 2 and "Forbidden fixes" |
| P5 | The server is the source of truth: tests assert server behaviour first; UI tests assert that the UI only shows what the server allows. | BP §15.1, §29; BOOK-STATUS-016 |
| P6 | Only fake vendors in tests (except Google Maps Platform, used live only in staging smoke). | IMPL §0 rule 4; ARCH §18; D-008, D-009 |
| P7 | Every mobile E2E runs in **en** and **ur**. | BP §78; IMPL §8; I18N-001 |
| P8 | Low-cost, small-screen Android and slow network are first-class test targets, not an afterthought. | BP §38, §49, §78.2; IMPL §2.2 A16 card |
| P9 | Only the D-001 stack is used for testing. A new test library needs a handoff entry (IMPL §0 rule 15); a new framework needs a `DECISIONS.md` entry. | D-001; ARCH §17 |

---

## 2. Test levels and tools (D-001 stack only)

| Level | What it proves | Tool (D-001 / ARCH §17) | Location (owner) | Runs on |
|---|---|---|---|---|
| L1 Unit | Pure rules: transition table, commission/ledger math, eligibility filters, scoring, rating enforcement, formatters, AI output validator | Jest or Vitest — the runner A01 pins per package at T2.1 | Next to the code, `**/*.spec.ts` (module owner) | Every PR |
| L2 API / integration | Endpoint behaviour, authZ, validation, idempotency, DB grants, outbox events, against a real PostgreSQL + PostGIS + Redis | Supertest on the NestJS app | `services/api/src/modules/<m>/**/*.e2e-spec.ts` (module owner) | Every PR |
| L3 Contract | Producer output matches `contracts/` (OpenAPI + event JSON schemas); consumers compile against generated types and only use published fields | Same runner as L1 + a JSON-schema validator (small library, listed in the handoff per IMPL §0 rule 15; A01 confirms at T2.1) | `contracts/__tests__/**` (A16) | Every PR |
| L4 Guards (static) | Forbidden manifest permissions, hard-coded business values, string-lint, secret scan, citation guard, skipped-test guard, traceability | CI scripts set up by A01, rules owned by A17 (IMPL §7.4) + A16 (traceability) | CI config (A01); traceability tool under `tests/e2e/tools/` (A16) | Every PR |
| L5 Admin E2E | BP §11 admin journey and admin role matrix in a real browser | Playwright | `tests/e2e/admin/**` (A16) | Nightly + release gate; PR when `apps/admin/**` changes (smoke subset) |
| L6 Mobile E2E | BP §9 and §10 journeys, permissions timing, offline/pending states, en/ur, on emulator and physical profiles | Maestro (D-001; CLAUDE.md stack) | `tests/e2e/customer/**`, `tests/e2e/partner/**`, `tests/e2e/joint/**` (A16) | Smoke on PR when `apps/customer|partner/**`, `packages/ui|i18n/**` change; full nightly; physical devices at release gate |
| L7 Fault injection | Behaviour when Maps, AI, STT, push, media, OTP, payment fake, queue are down/slow; network loss mid-action | Fake vendors with test-only failure modes (§6) + L2/L6 tools | Same as L2/L6 | Nightly + phase gates |
| L8 Manual device checks | What automation cannot judge: Nastaliq rendering, RTL visual mirroring, readability, tap comfort, field usability on a cheap phone | Checklist run by A16 (+ A14 for typography) | Records in `docs/qa/device-runs/` and `docs/qa/urdu-smoke/` (A16 / A14) | Phase gates + release gate |
| L9 Performance | Budgets for AI, map, media and notification operations on the low-end device | Method in §11; Sentry + Android tooling inside the stack | `docs/qa/perf/` (A16 with A01) | T8.3 and release gate, once D-012 values exist |

Notes:
- ARCH §17 says "Maestro or Detox". The project decision summary (CLAUDE.md, D-001) names **Maestro**. This strategy uses Maestro only. A00 may align the ARCH wording.
- Mobile E2E selectors use stable `testID`s, never visible text, so the same flow runs in en and ur. Request to A14/A11/A12 (via `REQUESTS.md`): every interactive UI-kit component exposes a `testID` and an accessibility label (also needed for A11Y-004).
- Mobile E2E runs against a **release-variant build** pointed at the `e2e` environment, not only a dev build, because BP §49 requires the release build to be tested.

### 2.1 Where each level runs

| Trigger | Must pass | Blocks merge? |
|---|---|---|
| Every PR | `pnpm turbo run build lint typecheck test`; L2 API; L3 contract; L4 guards; traceability report (§3.3) | Yes |
| PR touching `apps/customer`, `apps/partner`, `packages/ui`, `packages/i18n` | Maestro smoke on the reference emulator profile (device-matrix `E-REF`) in **ur** and **en** | Yes |
| PR touching `apps/admin` | Playwright smoke (Chromium) | Yes |
| Nightly | Full L5 + L6 on the emulator profiles (device-matrix §5), L7 fault-injection suite, slow-network suite | No, but a red nightly opens a bug (IMPL §7.1) within the next work session |
| Phase gate | Everything above + the gate evidence in §8 | Gate cannot close |
| Release gate (Phase 8, BP §49) | Full L6 on **physical** profiles, L8 manual checks, L9 performance (needs D-012), restore drill evidence (T8.5) | Release cannot ship |

---

## 3. Requirement traceability

### 3.1 Naming convention

Every test names the requirement ID(s) it proves, in square brackets, at the start of the test or suite title. IDs must exist in `docs/requirements/REQUIREMENTS.md`.

| Level | Convention | Example |
|---|---|---|
| L1/L2/L3 | `describe('[ID] …')` or `it('[ID][ID2] …')` | `it('[BOOK-STATUS-006][LEDGER-NEG-005] Scheduled → En Route is refused with UNPAID_COMMISSION while balance < limit')` |
| L5 Playwright | Test title `[ID] …` | `test('[ADMIN-ROLE-003] Support gets 403 on A13 Fees')` |
| L6 Maestro | Flow file `tests/e2e/<app>/<ID-lowercase>__<slug>.yaml`; the flow header lists `tags:` with every cited ID and the profile tags (`smoke`, `full`, `device-only`) | `tests/e2e/customer/perm-002__no-camera-before-tap.yaml` with `tags: [PERM-002, smoke]` |
| L8 manual | One row per check in the run record, first column = ID | `| I18N-004 | C10 service detail | PASS | screenshot link |` |
| Regression (A17) | `**/__regression__/BUG-NNNN.spec.ts`, title also cites the violated ID | `it('[BOOK-CANCEL-002] BUG-0042 …')` |

Rules:
- A test that cites an unknown ID fails CI (same rule as the IMPL §7.4 citation guard).
- `.skip`, `.only`, `xit`, `xdescribe`, `test.fixme` and Maestro flows disabled by tag are reported. `.only` fails CI. A skipped test counts as **missing** in the traceability report (P4). Request to A01/A17: add a lint rule for this.

### 3.2 ID → phase map

The traceability tool needs to know in which phase each ID becomes due. A16 keeps the map (`tests/e2e/traceability/phase-map.json`, A16 lane). Initial group-level defaults, taken from the IMPL §6 task that implements the group; A16 refines per ID when tasks are split:

| Phase (IMPL §6) | ID groups due |
|---|---|
| 2 | SEC-AUTH, ROLE, ADMIN-ROLE (API part), PROF-ADDR, SCOPE-GEO, SCOPE-CAT, CAT-SVC, CFG-RULE (mechanism), PLAT, DATA, INFRA, EXT, SEC-BASE, REL-007…REL-014 |
| 3 | LOC-GEO (except -007), MEDIA, REQ-AI, VOICE, BOOK-STATUS, BOOK-CANCEL, PRICE, QUOTE, FARE, PROV-CREW, AVAIL, TRUST-VER, MATCH-ELIG, MATCH-SCORE, MATCH-FAIR, MATCH-MODE, MATCH-EXPL, MATCH-GAP, PROF-FAV, PERM-001…006 (customer), I18N, A11Y, UX-SCREEN-001/003/004/005, PERF-001…006, REL-001…006 (customer), JOURNEY-001 steps 11–20 |
| 4 | UX-PROV, UX-SCREEN-002, LOC-GEO-007, PERM (partner), REL-001…006 (partner), JOURNEY-002 (job flow) |
| 5 | OPS-ADMIN, ADMIN-ROLE (UI part), HEALTH, ANALYTICS, JOURNEY-003 |
| 6 | PAY, PAY-TIMING, COMM, LEDGER, LEDGER-NEG, LEDGER-PAY |
| 7 | NOTIF, CHAT, SHARE, REV, TRUST-BADGE, RATING-ENF, SUP, JOURNEY-001 full (steps 11–26), JOURNEY-002 full |
| 8 | ABUSE (complete set), PERF-007, REL-015, REL-016; every remaining Launch ID |
| — | `Not launch` IDs (CFG-RULE-010, TRUST-VER-004, OPS-ADMIN-014): no test required; any test or code that builds them is flagged to A00 (BP §72, §86) |

### 3.3 Traceability report and gate rule

The tool (A16, `tests/e2e/tools/traceability/`; CI wiring requested from A01) parses the IDs with the REQUIREMENTS §34 count pattern, scans all test titles/tags and manual run records, and writes a report artifact: `ID | status | due phase | tests (file, level) | last result`.

| Rule | Effect |
|---|---|
| T-1 | An ID whose due phase is **not yet closed** and has no test → listed as "not yet covered" (warning). |
| T-2 | From the moment phase *P* is closed by A00, every `Launch`, `Launch · INTERP` and `Launch · TODO(OWNER)` ID due in phase ≤ *P* must have at least one **passing, non-skipped** test at the level its acceptance criterion names (unit / API / E2E / manual device check). Otherwise **CI fails** on every PR. This also catches a test that is later deleted or skipped. |
| T-3 | A phase gate (§8) cannot close while any ID due in that phase breaks T-2. |
| T-4 | A `Launch · TODO(OWNER)` ID is covered only when its test asserts the **safe behaviour while the value is `null`** stated in its criterion (e.g. RATING-ENF-008 dry run, MEDIA-004 `LIMIT_NOT_CONFIGURED`, CFG-RULE-004 fee 0). When the owner sets the value, a second test with the decided value is added. |
| T-5 | A `Launch · INTERP` ID's test asserts the documented default reading and names the OQ/K item in its title, so it is easy to find if the owner changes the reading. |

No coverage percentage is used as a gate. The gate is "every due ID has a passing test".

---

## 4. Mandatory critical-rule suites (golden rule 8)

Each suite is mandatory before the phase in brackets closes. Owner = module owner writes L1/L2; A16 writes L3/L5/L6 and reviews that the listed cases exist.

### 4.1 Booking transition table — generated, every pair (Phase 3, T3.4)

| Case | Expected | IDs |
|---|---|---|
| Oracle | A test fixture `booking-transitions.oracle` (A16) encodes ARCH §6.1 plus the K-05 default readings in BOOK-STATUS-001…017 (Quote Pending entries, Rejected/No-show terminal, Disputed → In Progress for Rework, Completed → Closed by lifecycle job). A00 reviews it against BP §15. The code table is compared to the oracle **both ways**: the test never uses the code table as its own oracle. | BOOK-STATUS-001…017 |
| Every allowed pair | For each (from, to, actor role) in the oracle: 200, one Job Event (actor, from, to, time, reason) | BOOK-STATUS-001…015 |
| Every other pair | For each of the (statuses × statuses) pairs not in the oracle, and for each wrong actor role: 409 `TRANSITION_NOT_ALLOWED`, no Job Event, status unchanged | BOOK-STATUS common acceptance |
| Closed | No transition out of Closed | BOOK-STATUS-015 |
| Client-sent status | Payload containing `status` is ignored/refused; responses carry `allowedNextActions`; apps render only those (L6 check) | BOOK-STATUS-016, SEC-BASE-007 |
| Unpaid-commission guards | Scheduled → En Route and Arrived → In Progress refused with `UNPAID_COMMISSION` while balance < `ledger.max_negative_balance` | BOOK-STATUS-006, -008, LEDGER-NEG-005 |
| No-show party | No-show without party refused | BOOK-STATUS-017 |
| Expiry while `null` | Nothing expires automatically | BOOK-STATUS-014 |
| Unapproved fare line | A Proposed line is never in the payable total; only the customer can approve | FARE-012, FARE-013 |

### 4.2 Money (Phase 6, T6.1–T6.7)

Worked example = ARCH §6.8 exactly (amounts are illustration inputs from ARCH, not business values):

| Case | Input | Expected | IDs |
|---|---|---|---|
| Commission base | Labour 2,000 + parts 1,500 + visit 300 (bill 3,800) | Commission 600; provider share 3,200 (1,400 + 1,500 + 300) | COMM-003, COMM-002 |
| Cash recorded | Same bill, CASH | One ledger **debit 600** | LEDGER-003 |
| Digital recorded | Same bill, fake gateway confirmed | One ledger **credit 3,200** | LEDGER-004 |
| Non-labour lines | Each BP §58.1 line type other than LABOR, alone | Commission 0 | COMM-003, D-015 |
| No paisa lost | Table-driven set of labour amounts including values that do not divide evenly (test inputs only) | platform share + provider share = commissionable amount **exactly**, using the rounding rule A09 documents (COMM-002) | COMM-002 |
| No literal rate | Grep test | No commission-rate literal (`0.30`, `0.3`, `30%`) outside the config seed; changing `commission.rate` changes the next calculation | COMM-001, CFG-RULE-003 |
| Crew size is not money | Same quote with crew 1 and crew 5 | Same totals; no pricing/commission/fare code reads `crew_size` (grep) | PROV-CREW-005, D-018 |
| Pay only after Completed | Initiate payment in every status before Completed | 409 | PAY-TIMING-001, D-003 |
| CASH vs digital | CASH on a digitally paid booking; second record | 409; 409 | LEDGER-002 |
| Atomicity | Fail mid-way through ledger/payment write | No partial rows | REL-010 |
| Refund / correction | Refund from a dispute; correction | New linked reversal row; original unchanged; balances reconcile | PAY-004, PAY-006 |
| Reconciliation | Fake gateway data with a mismatch | Mismatch in A09 exceptions | PAY-005 |
| Settlement | Positive vs negative balance | Positive can settle; negative cannot | LEDGER-007, PAY-007 |

### 4.3 Unpaid-commission block (Phase 6, T6.7)

| Case | Expected | IDs |
|---|---|---|
| After a cash job with Rs. 600 owed (worked example) | Provider absent from candidates; accept/quote → 409 `UNPAID_COMMISSION`; rebook from Favorites (C42) refused; same through the voice path | LEDGER-NEG-001, -002, PROF-FAV-001, VOICE-008 |
| Already-accepted job | Cannot start (see 4.1); P12 shows "Pay Rs. X to start this job" (L6) | LEDGER-NEG-005 |
| Submitted, not verified | Still blocked | LEDGER-PAY-006 |
| Finance rejects without reason | 422 | LEDGER-PAY-004 |
| Finance approves Rs. 600 | One credit row of 600; provider eligible again automatically; `provider.balance_cleared` emitted | LEDGER-PAY-005, LEDGER-NEG-004, LEDGER-PAY-007 |
| Not a suspension | Earnings, support, profile, existing chats keep working while blocked | LEDGER-NEG-004 |
| Limit from config | No literal `0` limit outside the config seed | LEDGER-NEG-001, D-020 |
| Grace time `null` | Booking flagged to Operations, not auto-cancelled | LEDGER-NEG-006 (T-4) |

### 4.4 Eligibility and matching (Phase 3, T3.7)

| Case | Expected | IDs |
|---|---|---|
| One test per hard rule 73–79 | A provider who passes every rule except the one under test is absent; the eligibility result names that rule | MATCH-ELIG-073…079 |
| Extra hard rule | Negative balance excluded (4.3) | LEDGER-NEG-001 |
| Low-rating block | `LOW_RATING` provider excluded by rule 73 | MATCH-ELIG-073, RATING-ENF-005 |
| Ranking cannot bypass eligibility | No ranking input runs before hard filters; promoted placement not built | MATCH-FAIR-003 |
| No auto-assign | No endpoint, job or voice path creates an Accepted booking without a customer choice action | MATCH-MODE-001, D-005 |
| Weights from config | Weight change in A21 reorders candidates without deploy; while a weight is `null`, the null behaviour stated in that MATCH-SCORE criterion applies | MATCH-SCORE-*, D-010 (T-4) |
| Supply gap | Zero candidates → C40 with next actions, never an empty screen | MATCH-GAP-001 |
| Pre-match privacy | Provider responses before match contain area only, no phone/exact address | PROF-ADDR-004 |

### 4.5 Permissions and role matrix (Phase 2 API, Phase 5 UI)

| Case | Expected | IDs |
|---|---|---|
| Generated matrix | Every endpoint × {anonymous, customer, other customer, provider, other provider, each of the 8 admin sub-roles}; expected result read from the role matrix source (T1.3 output + BP §8) | ROLE-001…003, ADMIN-ROLE-001…008, SEC-BASE-003, -004 |
| Endpoint without guard | CI fails | SEC-BASE-003 |
| Admin path | Customer/provider token → 401/403 on every admin API; login without MFA refused | SEC-AUTH-005 |
| Reason required | Suspend/restrict/reinstate without reason → 422; with reason → audit row | ROLE-003, RATING-ENF-006 |
| Mobile permissions (device) | Maestro checks from permission-policy §3: no location/camera/mic/notification dialog before the related tap; deny → fallback works end to end; Android 13+ notification prompt only after first booking | PERM-001…005, LOC-GEO-001, NOTIF-010 |
| Manifest guard | Fails on any permission in permission-policy §4.1 on the **merged release** manifest of both apps; Partner app has no `RECORD_AUDIO` | PERM-005, PERM-006, LOC-GEO-007 |

### 4.6 AI and voice guards (Phase 3, T3.3, T3.11)

Driven by a scripted fake `IntakeAI` / `SpeechToText` that can return adversarial output.

| Case | Expected | IDs |
|---|---|---|
| Golden examples | BP examples ("Mera AC thanda nahi kar raha", "Kal shaam electrician chahiye", geyser leak DHA Phase 4) → expected family as candidate | REQ-AI-001, REQ-AI-004 |
| Closed schema | Unknown fields dropped | REQ-AI-007 |
| Hallucinated service | `serviceId` not in catalog (or inactive in city) discarded | REQ-AI-007, REQ-AI-002 |
| No prices / credentials / diagnosis | Output schema has no such fields; injected price text never reaches price fields | REQ-AI-010, REQ-AI-011 |
| AI never commits | AI endpoints write drafts only; request reaches `Submitted` only through an explicit customer confirm call | REQ-AI-005, ARCH §10.2 |
| Low confidence / threshold `null` | Question or normal form; while `null`, every request goes through C34 with service editable | REQ-AI-006 (T-4) |
| AI down / timeout | Customer completes the request through the normal form | REQ-AI-012 |
| Voice consequential actions | Booking, quote accept, pay, cancel, complaint by voice → confirm step; without confirm nothing is sent | VOICE-007 |
| Voice scope | Out-of-list intents answered "not supported" | VOICE-008 |
| Logging | Each AI call stores model/service version and latency | REQ-AI-008 |

### 4.7 Idempotency (Phase 2 platform, then each consumer)

| Case | Expected | IDs |
|---|---|---|
| Same key twice (sequential and concurrent) | One row; second call returns the original result | REL-008, T2.2 |
| Every listed endpoint | Create booking, submit request, initiate payment, accept quote, approve charge: double tap → one record | REL-003, PAY-002, ARCH §8 rule 3 |
| Retry policy | Non-idempotent calls never auto-retried | REL-007 |

### 4.8 Append-only data (Phase 2 audit, Phase 6 money)

| Case | Expected | IDs |
|---|---|---|
| DB grant test, connected as the application role | `UPDATE` / `DELETE` on audit, payment, refund, settlement and ledger rows → permission denied at DB level | T2.2, PAY-003, LEDGER-005, T6.3 |
| Address snapshot | Editing/deleting a saved address does not change existing bookings | PROF-ADDR-002 |
| Deletion lifecycle | Anonymised user keeps bookings/payments linked | SEC-AUTH-008 |

### 4.9 Rating enforcement (Phase 7, T7.6)

| Case | Expected | IDs |
|---|---|---|
| Boundary | `rating.block_threshold = 2.0` (seeded, D-017): average **1.99 triggers**, exactly **2.0 does not** | RATING-ENF-003 |
| Sequence | Below threshold → warning 1 → (still below after review period) → warning 2 → block `LOW_RATING`, audited | RATING-ENF-004, -005 |
| Reset | Recovery to ≥ threshold resets to good standing (INTERP, OQ-013) | RATING-ENF-004 (T-5) |
| Eligible ratings only | Moderated-out ratings excluded | RATING-ENF-002 |
| Dry run | While `rating.min_reviews_for_enforcement` **or** `rating.review_period_days` is `null`: job only logs, blocks nobody | RATING-ENF-008 (T-4) |
| Blocked never matched | Fails MATCH-ELIG-073 | RATING-ENF-005 |
| Notifications | Warning/block events reach provider (en/ur) and Risk/Trust queue | RATING-ENF-007, NOTIF-008 |

### 4.10 Contract tests (IMPL §4 pairs; A16, `contracts/__tests__/**`)

| Producer → consumers | Contract checked |
|---|---|
| A02 → A03, A04, A05, A09, A10, A13 | Auth guard behaviour, role claims, user ID shape |
| A03 → A04, A05, A07, A11, A12, A13 | Catalog + `ConfigService` read API |
| A06 → A05, A07, A11, A12 | `GeoService`, Location Snapshot (incl. `confirmation_status`) |
| A08 → A07, A10, A11, A12 | Media upload session, refs, transcript |
| A07 → A05 | Confirmed Customer Request |
| A05 → A04, A11 | Match Candidates + reasons + supply-gap result |
| A04 → A09, A10, A11, A12, A13 | Booking/quote/charge endpoints + events (`allowedNextActions`) |
| A09 → A10, A11, A12, A13 | Payment/settlement/ledger endpoints + events |
| A10 → A11, A12, A13 | Notification, chat, review, support contracts |

Each pair: (a) every producer response/event in L2 tests validates against the published schema; (b) a fixture per schema is validated both ways; (c) consumer code compiles against generated types (CI "types up to date" check, IMPL §7.3-F); (d) every ARCH §7 event has a schema and at least one producer test emitting it through the outbox.

---

## 5. Journey E2E (BP §9–§11)

| Suite | Scope | Tool | Phase / task | IDs |
|---|---|---|---|---|
| Customer journey | BP §9 steps 11–20 (T3.12), then 21–26 when Phases 4, 6 and 7 land | Maestro | T3.12, then T4.7, Phase 6/7 | JOURNEY-001, UX-SCREEN-001, PERF-002, A11Y-008 |
| Provider journey | BP §10 steps 27–42 | Maestro | T4.7 | JOURNEY-002, UX-PROV-001…005 |
| Joint customer + provider | One booking end to end with both apps. Nightly: one app driven by Maestro, the counterpart driven through the API by a test helper. Release gate: two physical devices | Maestro + API helper | T4.7 onward | JOURNEY-001, JOURNEY-002 |
| Admin journey | BP §11 steps 43–54 except "controlled promotions" | Playwright | Phase 5 | JOURNEY-003 |

Every customer/partner journey runs in `en` and `ur` on the profiles in device-matrix §5.

---

## 6. Resilience and fault injection (BP §31.1, §62.3)

### 6.1 Mechanism

| Item | Rule |
|---|---|
| Vendor faults | Every fake (`IntakeAI`, `SpeechToText`, `GeoService` Maps adapter, `PushSender`, `ObjectStore`, `OtpSender`, `PaymentGateway`, `CallRelay`) supports test-only modes: `ok`, `slow`, `timeout`, `error`. Modes are switchable only in the `test` / `e2e` environment; the switch must not exist in staging or production builds. A15 reviews this switch. Request to A01 (platform) and each interface owner. |
| Server delay | A test-only delay on a chosen endpoint, same environment restriction, to test "pending until confirmed". |
| Network | Device-matrix §3 profiles (emulator presets, airplane mode, real slow network). |
| Infrastructure | Redis/queue stopped in the API test environment. |

### 6.2 Cases

| Fault | Expected behaviour | IDs |
|---|---|---|
| Maps down | Typed address + straight-line distance; request created and matched | LOC-GEO-006, PERF-006 |
| AI down / slow | Normal form; honest loading/partial UI, never frozen | REQ-AI-012, PERF-004 |
| STT down | User stays on same screen with text input; draft kept; audio still usable | VOICE-005, MEDIA-006 |
| Push down | In-app status/inbox still updates (ARCH §18 fallback) | NOTIF-001, PERF-006 |
| Media storage down / upload fails | Draft and other inputs survive; retry later succeeds | MEDIA-009, REL-004 |
| OTP sender down | Clear error, resend within rate limits, no crash | SEC-AUTH-001, -004, REL-001 |
| Payment fake down / unknown | Pending/unknown shown; no duplicate on retry | REL-006, PAY-002, T6.4 |
| Queue down | API call does not wait for notification sending; no business data lost on Redis flush | REL-009, REL-013 |
| Everything third-party stalled | Home still renders categories and search | PERF-001 |
| Slow network | Loading/retry states, text before images/maps, progress state on matching | A11Y-007, PERF-003, PERF-005 |
| Offline mid-action (request sent, response lost) | UI shows **pending/unknown**, never success; on reconnect it reconciles through the idempotency key; exactly one server record | REL-005, REL-006, REL-003 |
| Delayed server confirm | UI stays pending until the confirmed response | REL-005 |
| App killed mid-request | Draft restored on reopen | REL-004 |
| Any screen, injected error | Useful error state with next step, never blank | REL-001, A11Y-005, UX-SCREEN-003 |

---

## 7. Localization and accessibility checks (BP §37, §38, §78)

| Check | How | When | IDs |
|---|---|---|---|
| en + ur runs | Every Maestro flow takes `LOCALE` = `en` / `ur`; both must pass | Every L6 run | I18N-001 |
| Language change | Switch on C41/settings applies at once, no reinstall; device-language vs app-language combinations (device-matrix §4) | Nightly | I18N-002 |
| RTL screenshots | Maestro screenshots at fixed checkpoints per screen, per locale, per profile; A16 + A14 review against IMPL §7.3-E (alignment, icons, arrows, control order, sheets) | Phase gates, T8.4 | I18N-003 |
| Urdu typography | Manual L8 on the T0.6 reference device: no clipped marks, readable line height, at default and largest system font size | T0.6, T1.4, every UI phase gate, T8.4 | I18N-004, I18N-008 |
| Mixed-script labels | String review of the ur catalogue | Phase gates | I18N-005 |
| Hard-coded strings | String-lint in CI (A14 rule) | Every PR | I18N-006 |
| PKR / dates | Formatter unit tests en + ur | Every PR | I18N-007 |
| Accessibility | Contrast on tokens; minimum tap target in UI kit; status never colour-only; icon labels in en/ur (accessibility scan); errors say next step | Every PR (kit tests) + T8.4 audit | A11Y-001…008 |
| Admin language | en only until OQ-022 is answered; if ur is added, Playwright runs both | Phase 5 | I18N-001 |

The full IMPL §7.3-E checklist is run at every UI phase gate (3, 4, 5, 7) and at T8.4. It is referenced here, not copied.

---

## 8. Phase gates — what A16 must prove

A phase closes only when A16 proves its exit condition and A00 records it (IMPL §6). Evidence = links to CI runs, report artifacts, run records and screenshots.

| Gate | Exit condition (BP §44 / IMPL §6) | A16 evidence |
|---|---|---|
| G0 / Phase 0 | No major unresolved MVP ambiguity; D-001 condition | This strategy + device matrix exist (T0.5). T0.6 screenshots in `docs/qa/urdu-smoke/` checked by A16 on the reference device against the T0.6 criteria; on FAIL, report to A00 (D-001 reopens). |
| Phase 1 | All launch screens mapped | Each screen spec (T1.1–T1.3) lists the 5 states as testable items (UX-SCREEN-003) and planned `testID`s; T1.4 sample screen in `ur` on the reference profile (L8 record). |
| Phase 2 | Secure login and data model working | CI green with all L4 guards active (manifest, hard-coded value, string-lint, secret scan, citation, skipped-test, traceability); idempotency + audit-grant tests (T2.2); SEC-AUTH / ROLE / ADMIN-ROLE API matrix incl. OTP brute-force test (T2.4); snapshot test (T2.5); seed counts (T2.6); restore timestamp (T2.7); T-2 holds for Phase 2 IDs. |
| Phase 3 | Customer can request a real job | Generated transition table (4.1); matching (4.4); AI guards (4.6); fault cases for Maps/AI/STT/media (§6); permission E2E PERM-001…005; JOURNEY-001 steps 11–20 pass on the device matrix in en and ur (T3.12); §7.3-E checklist; T-2 for Phase 3 IDs. |
| Phase 4 | Provider can accept and complete a real job | JOURNEY-002 + joint E2E (T4.7); no customer PII pre-match (T4.3); UX-PROV tap counts ≤ 2; location only during active job with indicator (T4.5); partner manifest guard. |
| Phase 5 | Admin runs marketplace without DB edits | JOURNEY-003 Playwright; admin role matrix incl. "Support cannot open Fees" (T5.1); config edits audited. |
| Phase 6 | Happy path + failure/refund scenarios tested | Money suite (4.2), unpaid block (4.3), append-only grants (4.8), idempotent payment, pending/unknown on network loss (T6.4). |
| Phase 7 | Operational flows complete | NOTIF event tests; Android 13+ and pre-13 notification-permission behaviour (device-matrix §2); no raw phone numbers in chat/call payloads (CHAT-002); review eligibility (REV-*); rating enforcement (4.9); full JOURNEY-001/002. |
| Phase 8 (release gate) | Release gate passed | Full regression on **physical** profiles in en and ur (BP §49 "release build tested on representative Android devices"); 0 open S1/S2 (A17, T8.1); A15 abuse coverage (T8.2); T8.3 performance measured on the low-end device — **blocked until D-012 values exist**; T8.4 audit; restore drill (T8.5); REL-015 satisfied; T-2 holds for **every** Launch ID. |
| Phase 9/10 | Pilot / launch (BP §49) | A16 reports status of the agent-checkable BP §49 items only (app/console completeness, monitoring, backups, security review, release build on devices). Business items are owner tasks. |

### 8.1 QA verdict format (for handoffs and gates)

```
QA: PASS | QA: FAIL
Task/Gate: T3.4 (or G3)
Commands run:  <exact commands>  → <result>
Acceptance criteria (IMPL §6 row, one by one):
  - <criterion text> — PASS | FAIL — evidence: <test name / file:line / CI link / screenshot>
Requirement IDs checked: <IDs> — traceability report: <link>
Profiles run (device-matrix): <profile × locale × network>
Failing tests: <names + log excerpt>
New bugs: BUG-NNNN … (IMPL §7.1 format, handed to A17)
```

A verdict is PASS only when every criterion is PASS. "Not run" counts as FAIL.

---

## 9. Bug flow with A17

A16 does not duplicate IMPL §7.1–§7.2. In short:

| Step | Who | Reference |
|---|---|---|
| A16 finds a failure in QA → records it in the IMPL §7.1 format (requirement ID, BP §, repro, failing test) | A16 → A17 | IMPL §7.1 |
| Reproduce, failing regression test in `**/__regression__/`, assign owner | A17 | IMPL §7.2 items 1, 3 |
| Fix without editing the test's expectation | Module owner | IMPL §7.2 item 2 |
| Re-run regression + related suites (same profiles that failed) | **A16 verifies** | IMPL §7.2 item 4 |
| `VERIFIED` → `CLOSED` | A17 → A00 | IMPL §7.2 item 4 |

Severity follows the IMPL §7.1 table. A flaky test is a bug, not a skip: it is logged and fixed; a pass on an automatic E2E retry is reported as "flaky" in the run report.

---

## 10. Test data rules

| Rule | Source |
|---|---|
| Only fake vendor implementations in unit/API/E2E (`OtpSender`, `IntakeAI`, `SpeechToText`, `PaymentGateway`, `PayoutProvider`, `CallRelay`, `PushSender`, `MailSender`, `AnalyticsSink`). Google Maps is faked in CI; live Maps only in staging smoke with a restricted key from the secret manager. | IMPL §0 rule 4; ARCH §18; LOC-GEO-008 |
| No real phone numbers, names, addresses, CNICs, faces or voices in fixtures. Phone numbers come from a test pattern agreed with A02 that the fake `OtpSender` accepts; it never sends SMS. | BP §29; D-002 |
| No secrets in git: only `.env.example` with fake values; CI secrets live in the CI secret store. | BP §43 rule 69; SEC-BASE-008 |
| Seed data: catalog from the T2.6 seed (BP §63, all inactive), Lahore active zone (D-007, D-019). Synthetic customers/providers in en and ur. | SCOPE-*, CAT-SVC-* |
| Config values in tests: a `TODO(OWNER)` key may be set to a **test-only value** to exercise the mechanism. Such values are named `TEST_ONLY_*` in fixtures and never appear in seeds or config defaults. Decided values (0.30 D-006, 2.0 D-017, 2 warnings D-014, limit 0 D-020) are read from the seed, not retyped. | IMPL §0 rule 3; CLAUDE.md golden rule 2 |
| Money amounts: only the ARCH §6.8 worked example or clearly labelled test inputs. | ARCH §6.8 |
| Media fixtures: small synthetic audio/video/photo files; size/duration limit tests use the config value under test (T-4). | MEDIA-004; D-011 |
| Each test creates and cleans its own data; no test depends on another test's order. | — (test hygiene) |

---

## 11. Performance (BP §62, §84 item 120; D-012 open)

The budget **values** are `TODO(OWNER)` (D-012, OQ-005). No number is set here. The gate rule is: T8.3 and the release gate cannot pass until D-012 is recorded (PERF-007, REL-015).

How each budget will be measured once set:

| Operation (BP §84 item 120) | What is measured | How | Where |
|---|---|---|---|
| App start / Home (PERF-001) | Cold start to Home interactive | Release build, fixed repeat count, Android tooling (e.g. `adb shell am start -W`) + Sentry performance traces | T0.6 reference device, network profiles N1 and N2 |
| AI | Time from submit to first partial/loading UI; end-to-end interpret latency | `latency` field in AI Interaction rows (REQ-AI-008) + UI timing | Reference device, N1/N2, fake AI with fixed latency and later the chosen vendor |
| Map | Time to first usable map/address suggestion; fallback switch time when Maps fails | UI timing + fault mode `slow` | Reference device, N1/N2 |
| Media | On-device compression time and upload time for max-length audio/video (D-011 limits) | UI timing | Reference device, N1/N2 |
| Notifications | Event commit (outbox) to device delivery | Outbox timestamp vs device receipt log | Reference device |

Reporting: median and worst run of a fixed repeat count, per profile, recorded in `docs/qa/perf/<date>.md`. A result is compared only against the owner's D-012 value.

---

## 12. Open items for this strategy

| Item | Status |
|---|---|
| Physical devices for the matrix | Proposed OQ (device-matrix §7) |
| Minimum supported Android version | Proposed OQ (device-matrix §7); A01 proposes from the pinned Expo SDK at T2.1 |
| Admin staff browsers; admin language | Proposed OQ (device-matrix §7); OQ-022 |
| Performance budgets, RPO/RTO | D-012 / OQ-005 |
| Test-only fault switch design | Request to A01 + A15 review (§6.1) |
| `testID` + accessibility label on every UI-kit component | Request to A14/A11/A12 (§2) |
| Skipped-test lint + extended manifest guard | Request to A01/A17 (§3.1; permission-policy §4.2) |

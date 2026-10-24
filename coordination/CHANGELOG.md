# CHANGELOG — Kaam Karo

## 2026-10-25 — T3.9 Customer App Intake Flow & Media/Location (A11) — DONE
- Screens: Implemented Customer App Intake and Media/Location screens C12, C31, C32, C33, C34, C39 in English and Urdu (`apps/customer/src/screens/`):
  - C12 Request / Simple Form: Direct non-AI structured booking entry, service picker, provider preset badge when entering from C11, address preview & change tap, when chip picker, problem description textarea, attachments preview, validation error banner, submission to C34 (`REQ-SIMPLE-001`, `REQ-AI-009`, `D-004`).
  - C31 "What do you need?" Composer: Multimodal request intake with typing, audio note shortcut, photo picker, video note shortcut, AI interpretation preview card, clarifying question chips, when chips, location chip, explicit standard form fallback button, continue CTA (`REQ-COMPOSER-001`, `REQ-AI-001..004`, `REQ-AI-006`).
  - C32 Audio Note Recorder: Voice recording, pre-prompt educational rationale dialog (`PERM-JUST-002`), record start, pause/resume, stop, replay preview, discard/delete, attach action, elapsed/countdown timer display, typing fallback when permission denied (`AUDIO-REC-001`, `AUDIO-REC-002`).
  - C33 Problem Video Recorder: Video capture interface, pre-prompt educational rationale dialog (`PERM-JUST-003`), viewfinder simulation, recording indicator pill, elapsed timer up to 30s, thumbnail preview, attach action, estimated file size hint, gallery file fallback (`VIDEO-REC-001`, `VIDEO-REC-002`).
  - C34 Request Summary Confirmation: Final pre-submission review, editable AI summary description, service picker with change action, location snapshot summary with edit action, schedule/when chip, attachment preview, privacy reminder banner (`SEC-PRIV-001`), "Find providers" submit CTA (`REQ-CONFIRM-001`, `REQ-AI-011`).
  - C39 Location Confirm: Address selection & confirmation, educational GPS rationale dialog (`PERM-JUST-001`), "Use current location" button, simulated map pin preview with detected address, search input, saved addresses quick select, manual address entry fallback, confirm address CTA (`LOC-CONFIRM-001`, `LOC-GEO-003`).
- Permission Policies & Fallbacks (IMPL §6 T3.9 Acceptance Criteria):
  - Permissions requested strictly on tap with pre-prompt educational rationale modal (`PermissionModal`; `PERM-JUST-001..003`).
  - Robust operational fallbacks on every input: AI down → C12 standard form; mic denied → typing; camera denied → gallery file picker; GPS denied → manual address text entry & saved addresses.
- Design System, i18n & Accessibility:
  - 100% localized in English and Urdu (`packages/i18n/src/messages/customer.ts`).
  - 0 hardcoded user-facing strings; `guard:string-lint` verified across 32 UI files.
  - RTL mirroring and Noto Nastaliq Urdu typography with 2.5× line-height ratio in Urdu (`getAppMirroring()`, `textTokens()`; BP §78; I18N-001..004).
  - 48×48 dp minimum tap targets on all interactive touchables (`minTapTargetStyle()`; A11Y-002).
  - Stable test IDs and accessibility labels on all interactive controls (`interactiveProps()`; A11Y-004).
- Tests & Quality Verification:
  - 17/17 tests pass in `apps/customer/src/intake-flow.spec.ts`.
  - 42/42 total unit & flow tests pass in `@kaamkaro/customer`.
  - 21/21 tests pass in `@kaamkaro/i18n`.
  - 5/5 repository quality guards pass (`guard:arch`, `guard:contracts`, `guard:values`, `guard:string-lint`, `guard:transition-table`, `guard:traceability`).
  - 0 TypeScript errors (`tsc -p tsconfig.json --noEmit`), 0 ESLint warnings (`eslint .`).

## 2026-10-24 — T3.8 Customer App Core UI (A11) — DONE
- Screens: Implemented Customer App Core screens C01–C11 + C41 in English and Urdu (`apps/customer/src/screens/`):
  - C01 Splash: Brand identity, Urdu/English tagline, automatic session check & routing (`APP-START-001`, `BRAND-001`).
  - C02 Welcome: Value proposition, Log in, Create account, Continue as guest, Language toggle (`ONBOARD-001`, `D-004`).
  - C03 Login: Mobile number input with +92 prefix, validation, zero-account-reveal flow (`AUTH-OTP-001`, `AUTH-PRIV-001`).
  - C04 Register: Full name, active/inactive city picker (Lahore active, Karachi/Islamabad inactive warning banner), optional area, terms acceptance (`REG-NAME-001`, `LAUNCH-CITY-001`).
  - C05 OTP Verification: 6-digit code entry, 60s cooldown countdown, resend action, verified session creation (`AUTH-OTP-002`, `AUTH-OTP-003`).
  - C06 Home: Service location chip, "What do you need?" intake banner, search entry & mic trigger, categories grid, popular services, active booking card, guest mode prompt banner (`HOME-DISC-001`, `INTAKE-001`).
  - C07 Search & Intake Entry: Search query input with clear, voice search button, recent searches with clear, "Describe problem" CTA (`SEARCH-INPUT-001`, `VOICE-001`).
  - C08 Search Results: Segmented Services / Providers tabs, category filters, service price model representations, provider cards with verification badge, rating, distance, completed jobs (`SEARCH-RES-001`, `TRUST-VER-001`).
  - C09 Category View: Category banner, subcategory tabs, service cards with price model badges, "Not sure? Describe it" CTA (`CAT-VIEW-001`, `CAT-SVC-001`).
  - C10 Service Detail: Service title, Urdu/English description, what is included vs excluded, pricing models [FIXED, FROM, INSPECTION_QUOTE], visit/inspection fee breakdown, reviews, "Book now" CTA (`SVC-DETAIL-001`, `PRICE-MODEL-001`).
  - C11 Provider Profile: Business name, avatar, verification badge (`BASIC`, `VERIFIED`, `BUSINESS_VERIFIED`), rating summary, completed jobs, bio, services offered, reviews, favorite button toggle (`TRUST-VER-001`, `PROF-FAV-001`).
  - C41 Language Selection: English vs اردو cards, immediate live RTL layout and text flip without app restart (`I18N-001`, `I18N-002`, `I18N-003`).
- Design System & Accessibility:
  - 48×48 dp minimum tap targets on all interactive elements (`minTapTargetStyle()`; A11Y-002).
  - RTL mirroring in Urdu: row-reverse, right text alignment, directional icon flipping, Noto Nastaliq Urdu typography with 2.5× line height ratio preventing diacritic clipping (`getAppMirroring()`, `textTokens()`; BP §78; I18N-001..004).
  - 5-state handling (Loading, Empty, Success, Error, Pending) in `StateView`.
  - Status indicators enforce text + icon, never color alone (A11Y-003).
  - All interactive elements use `interactiveProps()` enforcing stable `testID` and `accessibilityLabel` (A11Y-004).
- Privacy & Security:
  - Zero permissions requested at install, splash, or onboarding (PERM-JUST-001..003).
  - Zero-account-reveal login flow (AUTH-PRIV-001).
  - Safe guest browsing across C06–C11 without authentication (D-004).
- Tests & Guards:
  - 25/25 unit tests pass in `@kaamkaro/customer` (`customer-core.spec.ts`).
  - 0 hardcoded strings in 25 UI files scanned by `guard:string-lint`; catalogs 100% synchronized.
  - 5/5 CI guards pass (`guard:permissions`, `guard:hardcoded`, `guard:string-lint`, `guard:transition-table`, `guard:traceability`).
  - 0 TypeScript errors, 0 ESLint warnings.

## 2026-10-24 — T3.7 Matching Engine, Hard Filters 73–79, Configurable Scoring & Fairness (A05) — DONE
- MATCH-ELIG-073..079, BP §54.1: Evaluated suppliers against 7 hard eligibility filters (Account active and not suspended, requested service skill mapping, service area radius/zone coverage, live slot availability, minimum verification level, no active safety dispute, active job capacity limit) and unpaid commission block (`LEDGER-NEG-001`, `D-020`). Failure codes stamped in `match_candidate.ineligible_reasons`.
- MATCH-SCORE-001..013, BP §54.2, D-010: 13 normalized scoring signals computed via `MatchingScorer.computeScore` (Distance/ETA, window availability, exact service match, preferences, verification level, rating volume & quality, completed jobs count, response speed, cancellation rate, repeat customer rate, price competitiveness, reliability standing, and new provider boost).
- MATCH-SCORE-006: Bayesian smoothing for provider ratings ensuring higher volume (4.8 with 240 ratings) outranks low volume (5.0 with 1 rating).
- MATCH-SCORE-010: Repeat customer rate evaluated with sample size guard (rate is 0.0 if total jobs < 10).
- MATCH-FAIR-001..004, BP §52.3, BP §68: Algorithmic fairness preventing provider starvation (new provider boost within 30 days) and lead concentration caps (`providerShownCapPercentage`).
- MATCH-EXPL-001, BP §54.3: Bilingual human-readable explanations ("Why am I seeing this?") generated in Urdu and English on discovery candidate cards.
- MATCH-GAP-001, BP §61.3: Supply gap recovery. Request transitioned to `NO_SUPPLY` on 0 eligible matches, returning structured recovery actions (broaden radius, reschedule, priority callback, waitlist, related service) in Urdu and English.
- MATCH-MODE-001, D-005 (Verbatim Criterion): Strictly discovery-only matching mode. Request transitioned to `MATCHES_SHOWN` (or `NO_SUPPLY`); zero auto-assignment code paths; customer chooses provider.
- OPS-ADMIN-021: Audited dynamic configuration updates (`updateMatchingConfig`) enabling runtime weight changes without code deployment. Stamped semantic `ranking_version` on every evaluation run with append-only audit trail logging via `AuditWriter`.
- Contracts: `contracts/matching.yaml` OpenAPI 3.1.0 v0.1.0 registered and validated (41/41 contract tests).
- Tests: 20/20 unit tests pass in `matching.service.spec.ts` (317 total unit tests in `@kaamkaro/api`); 5/5 live DB integration tests pass in `matching.db-spec.ts` (155 total DB tests); 5/5 CI guards pass; 23/23 turbo build/lint/typecheck tasks pass.

## 2026-10-24 — T3.3 AI Request Intake, Confidence Fallback, PII Scrubbing & AI Logs (A07) — DONE
- REQ-AI-001..004, REQ-AI-006, ARCH §4 M7, ARCH §10, BP §56: Natural language text and voice transcript interpretation (`IntakeService.interpret`, `FakeIntakeAiClient`). Structured extraction into closed schema (`ClosedAiInterpretation`). Golden test evaluations for Blueprint examples (AC repair Urdu transcript, electrical short circuit English prompt, geyser leak with location and time window).
- REQ-AI-003, REQ-AI-006, BP §79: Ambiguity and low-confidence fallback. Prompts with confidence < 0.60 or ambiguous intent degrade confidence (0.40) and generate at most 2 targeted clarifying questions in requested language (`AppLanguage.EN` / `AppLanguage.UR`).
- REQ-AI-007, CAT-SVC-004, CAT-SVC-007: Catalog validation against active database services via `CatalogService`. Unknown or hallucinated service suggestions are rejected with `serviceId = null`, degraded confidence (0.35), and re-selection guidance.
- REQ-AI-008, SEC-PRIV-001, BP §66: Privacy preservation and PII scrubbing (`scrubPii`). Automatically redacts Pakistani phone numbers (`03xx-xxxxxxx`, `+923xxxxxxxxx`), CNICs (`XXXXX-XXXXXXX-X`), and emails from prompts before inserting into `ai_interaction.promptScrubbed` audit logs.
- REQ-AI-010, ARCH §6.2: Anti-hallucination guard. Strictly closed schema omitting pricing, provider assignment, arrival ETA, or phone contact fields. AI never directly books jobs.
- REQ-AI-005, REQ-AI-011, REQ-AI-012: Request lifecycle state machine (`COMPOSING` -> `AWAITING_CONFIRMATION` -> `SUBMITTED`). Only authenticated customers may confirm. Immutable `request_snapshot` locked upon confirmation. Emergency requests validated against `service.emergencyAllowed = true`. Direct non-AI catalog selection fallback supported (`REQ-AI-009`).
- BP §67: Content moderation filter (`checkContentModeration`) intercepting offensive or out-of-scope requests with `safetyState = BLOCKED` and zero confidence.
- Contracts: `contracts/intake.yaml` OpenAPI 3.1.0 v0.1.0 registered and validated (39/39 tests).
- Tests: 15/15 unit tests pass in `intake.service.spec.ts` (297 total unit tests in `@kaamkaro/api`); 5/5 live DB integration tests pass in `intake.db-spec.ts` (150 total DB tests in `@kaamkaro/api`); 5/5 CI guards pass; 36/36 turbo tasks pass.

## 2026-10-24 — T3.5 Quotes, Multi-Supplier Offers, Fare Lines & Crew Size (A04) — DONE
- QUOTE-001..009, ARCH §4 M10, ARCH §5.6: Quotes lifecycle management (`QuotesService`). Direct request (`createDirectQuote`) and multi-supplier request dispatch (`dispatchMultiSupplierRequest`). Provider quote submission (`submitQuote`) enforcing positive validity window (`QUOTE-004`), optional note/description (`QUOTE-005`), and automatic competitor rejection (`QUOTE-009`) when a customer accepts an offer (`acceptQuote`).
- D-004, PROV-CREW-001 (Acceptance Criterion 2): Mandatory crew size enforcement. Provider quote submission strictly rejects missing, zero, negative, or fractional `crew_size` (`CREW_SIZE_REQUIRED`), backed by DB check constraint `quote_crew_size_positive`. Quote acceptance copies `crew_size` to booking.
- FARE-001..013, PRICE-001..007: Granular fare breakdown by line type (`LABOR`, `PARTS`, `TOOLS`, `TRANSPORT`, `ADDITIONAL_SERVICE`, `DISCOUNT`, `EMERGENCY`). Type-specific validation: `PARTS` requires `materialsClass` (`PRICE-005`); `TOOLS` requires non-empty description/reason (`FARE-004`); `PLATFORM_FEE` rejected at launch (`D-025`); `EMERGENCY` fails closed (`FARE_EMERGENCY_DISABLED`, `K-10`) when `fare.emergency_exception_enabled = false`.
- FARE-012, PRICE-007 (Acceptance Criterion 1): Payable summary calculation (`getPayableSummary`). Sums only line items in `APPROVED` or `FINAL` state. Lines in `PROPOSED` or `REJECTED` state are strictly excluded from `totalPayableMinor`.
- D-015, COMM-003, D-018: Commission base isolation (`commissionableLabourMinor`). Calculates commission base strictly from `APPROVED` or `FINAL` line items of type `LABOR`. Parts, materials, tools, transport, and crew size do not alter commission base or fee multipliers.
- ARCH §5.6, QUOTE-008 (Acceptance Criterion 3): Mid-job crew size change workflow (`proposeCrewSizeChange`, `decideCrewSizeChange`). Crew size modification after quote acceptance transitions booking to `AWAITING_APPROVAL` with immutable `CREW_SIZE_CHANGE_PROPOSED` job event audit trail. Resumes active status upon customer decision (`CREW_SIZE_CHANGE_DECIDED`).
- Contracts: `contracts/quotes.yaml` OpenAPI 3.1.0 v0.1.0 registered and validated.
- Tests: 14/14 unit tests pass in `quotes.service.spec.ts` (282 total unit tests in `@kaamkaro/api`); 7/7 DB integration tests pass in `quotes.db-spec.ts` (133 total DB tests in `@kaamkaro/api`); 5/5 CI guards pass; 36/36 turbo tasks pass.

## 2026-10-24 — T3.4 Booking State Machine, Job Events & Cancellation Rules (A04) — DONE
- BOOK-STATUS-001..017, ARCH §6.1, BP §15, §16: Canonical transition table (`transition-table.ts`) defining 17 statuses and 38 valid transitions with actor authorization (`CUSTOMER`, `PROVIDER`, `ADMIN`, `SYSTEM`), bilingual labels (English and Urdu), and business rule guards.
- BOOK-STATUS-016, SEC-BASE-007: Client status refusal rule (`CLIENT_STATUS_FORBIDDEN`) rejecting any client payload attempting to specify or manipulate `status`. Server-driven allowed actions computed dynamically via `getAllowedNextActions(status, role)`.
- D-004, BOOK-STATUS-004: Crew size guard (`crewSizeGuard`) enforcing `crew_size >= 1` upon provider acceptance, reinforced by PostgreSQL check constraint `booking_crew_size_positive`.
- LEDGER-NEG-005, D-021: Unpaid commission guard (`unpaidCommissionGuard`) blocking provider from accepting bookings if unpaid commission exceeds negative balance limit.
- BOOK-STATUS-017: Mandatory no-show attribution guard (`noShowGuard`) enforcing `noShowParty` (`CUSTOMER` | `PROVIDER`), reinforced by PostgreSQL check constraint `booking_no_show_has_party`.
- DATA-002, DATA-004, BP §26: Immutable `JobEvent` audit logging recording actor, role, from/to status, reason, and PII-sanitized metadata on every transition.
- BOOK-CANCEL-001..006, D-023: Cancellation service logic (`cancelBooking`) supporting both customer and provider cancellations. Launch policy enforces zero cancellation fee (`cancellationFee = 0`, D-023) with refund flow triggered when payments exist.
- Safety stops (`safetyStop`): `ARRIVED -> CANCELLED` and `IN_PROGRESS -> DISPUTED` with mandatory audit reason logging.
- Optimistic concurrency control: State transitions execute atomically via Prisma interactive transactions with version checking (`version = currentVersion + 1`), throwing 409 Conflict upon race condition.
- CI Hook: `tools/check-transition-table.ts` verifying all 289 Cartesian pairs (17 × 17) against ARCH §6.1, wired into CI guards (`pnpm run guard:transition-table`).
- Contracts: `contracts/booking.yaml` OpenAPI 3.1.0 v0.1.0 registered and validated.
- Tests: 268 unit tests pass in `@kaamkaro/api` (including 21 transition table unit tests and 15 booking service unit tests); 126/126 DB integration tests pass (+ 12 seed DB tests = 138 total); 5/5 guards pass; 36/36 turbo tasks pass.

## 2026-10-24 — T3.6 Availability, Service Areas, Verification Levels (A05) — DONE
- AVAIL-001, AVAIL-002, AVAIL-004: Weekly recurring schedule and daily break periods (`AvailabilityService.setWeeklySchedule`). Enforces interval validation (`startTime < endTime`), breaks within working hours, and atomic replacement via Prisma transactions.
- AVAIL-003: Calendar date overrides (`setDateOverride`) supporting `OFF` (leave/holiday) and `CUSTOM_HOURS`, taking precedence over weekly schedules.
- AVAIL-005, LOC-PAK-001: Service areas supporting radius mode (with coordinates strictly bounded inside Pakistan via `isInsidePakistan` and positive radius) and zone mode (referencing `service_zone_id`). Enforced in application and PostgreSQL check constraint `service_area_shape`.
- AVAIL-006, AVAIL-007: Provider live status switch with 4 operational states (`ONLINE_AVAILABLE`, `ONLINE_BUSY`, `OFFLINE_MANUAL`, `OFFLINE_OUT_OF_SCHEDULE`). Positive capacity limit `max_active_jobs >= 1` (`provider_max_active_jobs_positive`) with automatic BUSY transition upon meeting/exceeding capacity.
- TRUST-VER-001, TRUST-VER-002, TRUST-VER-003, TRUST-VER-004: Provider standing defaults to `BASIC` verification level and `GOOD_STANDING`. Verification submissions record `documentMediaIds` with `PENDING_REVIEW` status. Staff-audited decisions (`APPROVED`, `REJECTED`) require non-empty audit `decisionReason` and elevate verification level (`VERIFIED`, `BUSINESS_VERIFIED`). Suspended/banned providers and unverified providers excluded from matching dispatches.
- MATCH-ELIG-075..079: Slot availability evaluation logic (`checkSlotAvailability`) computing slot overlap against weekly hours, breaks, date overrides, capacity limits, and standing eligibility.
- Contracts: `contracts/availability.yaml` OpenAPI 3.1.0 v0.1.0 registered and validated.
- Tests: 232 unit tests pass in `@kaamkaro/api` (including 17 availability tests and 7 trust tests); 120/120 DB integration tests pass (including 7 availability DB tests); 5/5 guards pass; 36/36 turbo tasks pass.

## 2026-10-24 — T3.2 Media Upload Sessions, Limits from Config, Thumbnails & Retention (A08) — DONE
- MEDIA-001, INFRA-003, D-001: Object storage abstraction (`ObjectStorage`) with HMAC-SHA256 presigned URLs (`FakeStorageService`) for direct-to-storage uploads with short 900s TTL. Zero external AWS/S3 npm dependencies.
- MEDIA-002, CHAT-003: Strict MIME whitelist (`ALLOWED_MIME_TYPES`) per kind (PHOTO, VIDEO, AUDIO, DOCUMENT). Voice notes restricted to audio types with 120s max duration limit.
- MEDIA-003, ABUSE-010, BP §29: Key isolation (`generateStorageKey`). Automatic sensitivity escalation: `VERIFICATION_DOCUMENT` and `PAYMENT_PROOF` forced to `RESTRICTED` sensitivity, validated by PostgreSQL check constraint `media_object_restricted_purposes`.
- MEDIA-004, BP §76, D-011: Dynamic limits resolved from `ConfigService`: `media.max_upload_bytes` (25 MiB), `media.video.max_seconds` (30s), `media.audio.max_seconds` (120s), `media.retention_days` (30d). Fails closed (`LIMIT_NOT_CONFIGURED`) when limits missing outside dev.
- MEDIA-005: Video thumbnail generation (`ThumbnailService`). Automatically saves JPEG thumbnail to storage and links `thumbnailMediaId` on parent `MediaObject`.
- MEDIA-006: Audio speech-to-text transcription (`SpeechToText` / `FakeSpeechToTextService`). Graceful failure fallback leaves the audio file fully playable and finalized without aborting finalization.
- MEDIA-007: Soft delete (`DELETE /v1/media/{id}`) and retention cleanup job (`runRetentionJob`) supporting dry-run inspection and bulk soft-deletion of expired media.
- MEDIA-008: Storage health probe integration (`checkStorageHealth`) for Kubernetes readiness checks.
- MEDIA-009 (Acceptance Criterion): Oversize (>25 MiB) or overlong (>30s video, >120s audio) media rejected during finalization; updates `uploadStatus = FAILED` without deleting the database record so client draft survives failure.
- Contracts: `contracts/media.yaml` OpenAPI 3.1.0 v0.1.0 registered and validated.
- Tests: 208 unit tests pass in `@kaamkaro/api` (including 16 media tests in `media.service.spec.ts`); 113/113 DB integration tests pass (including 8 media tests in `media.db-spec.ts`); 5/5 guards pass; 36/36 turbo tasks pass.

## 2026-10-24 — T1.4 i18n, RTL, Urdu Typography Kit & String-lint Rule (A14) — DONE
- I18N-001, I18N-006 (BP §37, BP §78): Modularized message catalogs into typed namespaces (`app`, `common`, `customer`, `partner`, `status`) under `packages/i18n/src/messages/`. Complete key parity between English and Urdu with placeholder alignment. Quarantined dev-only smoke strings in `@kaamkaro/i18n/dev-smoke`.
- I18N-003, I18N-004 (BP §38; ARCH §17): RTL layout and text direction helpers (`packages/ui/src/rtl.ts`). Directional icon mirroring rule (`DIRECTIONAL_ICONS`, `shouldMirrorIcon`) mirrors navigation icons while keeping media/clock/phone unmirrored. Typography metrics and minimum 1.5x line heights preventing Nastaliq clipping.
- I18N-005, I18N-007 (BP §78): Unicode bidirectional isolation (`LRI`, `RLI`, `FSI`, `PDI`) protecting dynamic parameters and amounts against bidi reordering / Trojan Source issues. PKT (UTC+05:00) date, 12-hour clock time, and relative time formatting (`formatDateTime`, `formatRelativeTime`).
- A11Y-001..008: WCAG 2.1 AA compliant contrast colors; status visual helper (`getStatusVisual`) ensuring status is never conveyed by color alone; minimum 48×48 dp interactive touch targets (`minTapTargetStyle`, `interactiveProps`); mandatory `testID` and `accessibilityLabel`.
- Sample screen model (`packages/ui/src/sample-screen.ts`) verified in unit tests rendering in Urdu on a 360×640 dp small device.
- CI Hook: `packages/i18n/tools/string-lint.ts` AST scanner enforcing 0 hard-coded UI strings and 100% catalog parity, wired into CI guards (`pnpm run guards`).
- Tests: 21 unit tests in `@kaamkaro/i18n` and 17 unit tests in `@kaamkaro/ui` pass; all 5 CI guards pass; 36/36 turbo tasks pass.

## 2026-10-24 — T3.1 GeoService, Pakistan Boundary, Location Snapshot & Fallback (A06) — DONE
- LOC-GEO-001, LOC-GEO-002, LOC-GEO-003, LOC-GEO-008: Server-side proxy for Google Maps Platform (`GoogleMapsClient` + `GeoService`). Places autocomplete biased to Pakistan and Lahore center. Geocoding and reverse geocoding with server-only API keys (zero exposure to client bundles).
- SCOPE-GEO-001, SCOPE-GEO-002 (BP §57, §81; D-007, D-019): Pakistan geographic boundary bounding box enforced server-side ([23.5..37.2°N, 60.5..78.0°E]). Coordinates outside Pakistan throw `OUT_OF_SERVICE_AREA` (HTTP 400). Lahore active launch city, other Pakistan cities listed as inactive with `canChangeCity: true`.
- LOC-GEO-005, LOC-GEO-006: Offline/Maps-disabled fallback tested. Straight-line distance via WGS84 spherical Haversine formula and urban transit duration estimator (25 km/h + 180s street navigation buffer) with `isFallback: true` flag. Autocomplete falls back to database catalog cities.
- LOC-GEO-004: Location snapshot immutable binding with PostGIS distance calculation, verified against `kk_location_snapshot_freeze` trigger.
- Contracts: `contracts/location.yaml` OpenAPI 3.1.0 v0.1.0 registered and validated.
- Tests: 192 unit tests in `@kaamkaro/api` pass (including 17 geo tests, 5 boundary tests, 5 haversine tests); 120/120 DB integration tests pass (`location.db-spec.ts` 8/8 tests pass); 5/5 guards pass; 36/36 turbo tasks pass.

## 2026-10-24 — T2.2 review fixes (A01) — SEC-REVIEW-T2.2 #1–#16, QA-T22-01…06, SEC-REVIEW-T2.6 #1 (A01 part), #2, #3, #8, RQ-008, RQ-011
- DATA-003, DATA-004 (BP §26, §29): the PII masker catches phones in Urdu / Arabic-Indic / full-width digits with any separators, landlines, IPv6 `::`, CNIC in any digits, secrets in text and URLs (OTP/token query values, signed-URL signatures, Bearer, JWT, IBAN); a wider key deny-list runs before the ID exemption; masking happens before truncation and is idempotent; `sha256:` fingerprints are kept. A Prisma query extension masks every create on append-only tables, and ESLint allows writes to audit/marketplace/outbox rows only in the platform folder (config_rule only in the config module).
- REL-008, REL-002 (BP §31.1, §31.2): heartbeat lease, bounded retry of the stored result, then an "outcome unknown" marker → 409 IDEMPOTENCY_OUTCOME_UNKNOWN, never a re-run (forced re-run tests on the real DB); a replay returns the original status; responses above 16 KiB are not stored (409 IDEMPOTENCY_REPLAY_UNAVAILABLE). New env HTTP_REQUEST_TIMEOUT_MS (server deadline) ≤ IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS. Contract common.yaml 1.1.0.
- SEC-AUTH-004, CFG-RULE-001…012 (golden rule 2): `get()` throws for fail-closed keys (prefixes + registry predicate); `inspect()` for readiness; `positiveInteger` / `positiveIntegerUpTo`; start-up check refuses staging/production without security limits.
- SEC-BASE-001/002: staging/production require TLS (`rediss://` with password, `sslmode`); Sentry exception values masked; security headers and a server-generated request ID also on body-parser 400/413 errors; BullMQ failure text masked without stacks; retention keys OUTBOX_RETENTION_DAYS / DEAD_LETTER_RETENTION_DAYS (empty = keep, TODO(OWNER) OQ-080).
- New migration 20261024000000_config_policy_zone_code: owner-maintained `config_key_policy` + `kk_config_rule_guard` trigger (unknown key, scope, kind, decided, two-person, actor, null security limit; created_at := now(); no back-dating slack), `service_zone.code` unique per city. `db:seed` = policy tool + T2.6 seed; `test:db` also runs the seed tests; CI seeds before the DB tests.
- AppModule now imports CatalogModule and ConfigRulesModule (RQ-008).

## 2026-10-24 — T2.6 review fixes (A03) — SEC-REVIEW-T2.6 #1–#11, QA-T2.6-01/02, L-1–L-3 — IN_REVIEW
- SEC-AUTH-004, SEC-BASE-006, ABUSE-003, MEDIA-004:
  - Security and abuse limits fail closed in every environment. Rate-limit keys have closed schemas (exact fields, bounded positive integers); integer keys have technical unit ceilings (owner bounds: OQ-088).
  - `setRule` refuses null on a limit. Readiness uses `inspect` with registry parsers; the environment switch is removed.
  - `rate_limit.messaging` / `rate_limit.requests` / `chat.attachment_limits` are now fail-closed.
  - Dev/test databases get explicit test values through `run.ts --dev-test-limits` (refused outside development/test).
- ADMIN-ROLE-001…008, SEC-AUTH-005:
  - Sub-roles come from a server-side `StaffRoleLookup`; it denies all until A02 binds it (RQ-012). Caller-supplied sub-roles are removed.
  - Every key has an edit group (Finance + Super Admin for financial keys, Super Admin otherwise; OQ-052 cells denied); reads and history use the same filter.
  - Contracts declare `staffSession` security and `x-admin-sub-roles`.
- SEC-BASE-010: seed audit rows (SYSTEM_SEED) for config and activations; limit audit values survive the masker; the company account is audited as a digit-free fingerprint + last 4 digits.
- CFG-RULE-001/003:
  - The seed writes `config_key_policy` from the registry (A01 tool + trigger).
  - Only `modules/config` may write `config_rule` (test).
  - Scheduling is limited by `config.max_schedule_ahead_hours` (null → none); `listKeys` shows pending versions.
  - Malformed IDs → 422, concurrent writes → 409.
- SCOPE-GEO-002: the zone is seeded with the stable code `lahore-whole-city` and never re-created after a rename.
- OQ-087 / QA-T2.6-01: activating a service inside an inactive family → 409 FAMILY_INACTIVE.
- Contracts 0.2.0 `x-status: draft` with ErrorEnvelope refs and every error code. New OQ-088; RQ-011 (A01), RQ-012 (A02).

## 2026-10-24 — T2.6 Catalog seed, launch families, ConfigRule store, cities (A03) — IN_REVIEW
- SCOPE-CAT-001 (BP §1.4, §63, §65): the full BP §63 tree is seeded: 22 families and 351 services, one line per BP item with its family comment. An item that BP lists under two families is seeded per family. A test parses BLUEPRINT.md §63 and fails on any drift; excluded areas are asserted absent. No API can create a family or service.
- SCOPE-CAT-002, CFG-RULE-001 (BP §6, §64; D-024): exactly the 10 BP §6 / D-024 families are active in Lahore (catalog_activation, 10 on / 12 off); there are no service-level rows. Activation per city, family or service is done by CatalogService without a release, needs an actor and a reason, and is audited in the same transaction.
- SCOPE-GEO-001/002 (BP §57.2; D-007, D-019): Lahore is listed and active, with one active whole-city zone (area NULL; no invented polygon). BP names no other city, so none is seeded (OQ-084, boundary OQ-086).
- CAT-SVC-001…003 (OQ-085): every service is seeded quote-only (INSPECTION_QUOTE, REQUEST_QUOTES, quote required, emergency off); the other listing fields are null + TODO(OWNER). No catalog price exists.
- CFG-RULE-001…012 (ARCH §5.3, §19):
  - Registry of 71 keys; `PrismaConfigRuleStore` behind A01's ConfigRuleSource; `ConfigAdminService` (owner-decided keys read-only, two-person key refused, typed values, scope check, no back-dating, audit + cache invalidation); global `ConfigRulesModule`.
  - Seeds: commission.rate 0.3 (D-006), commission.base_line_types ["LABOR"] (D-015), fees.customer_platform_fee disabled (D-025), tax.line_shown true (D-029), ledger.max_negative_balance 0 (D-020), rating.block_threshold 2.0 / warnings_before_block 2 (D-014/D-017); the D-023 fees null; 58 undecided keys null + TODO(OWNER).
  - OTP, login-limit and media-limit keys fail closed (`missingFailClosedKeys`).
- Contracts `catalog.yaml` and `config.yaml` 0.1.0 DRAFT (RQ-009). Requests: RQ-008 (A01 wiring, typecheck, db:seed, CI), RQ-010 (A14 Urdu review).
- Tests: 46 unit + 9 DB tests. Fresh DB `kaamkaro_t26_verify`: seed is idempotent; seed DB tests 9/9 and T2.2/T2.3 `test:db` 58/58 through the kaamkaro_api login.

## 2026-10-24 — T2.2 Platform lib (A01)
 — IN_REVIEW
- REL-008, REL-002, REL-006 (BP §31.1, §31.2; ARCH §8 rule 3): `@Idempotent('<op>')` + global interceptor over the `idempotency_key` table. Same key twice → one row and the original response (`Idempotent-Replayed: true`); different body → 409 IDEMPOTENCY_KEY_REUSED; still running → 409 IDEMPOTENCY_REQUEST_IN_PROGRESS (retryable); missing key → 428; 5xx releases the key.
- REL-001, SEC-BASE-005 (BP §29, §31.1): one error envelope `{error:{code,message,requestId,retryable,details?}}` (new contract `contracts/common.yaml` v1.0.0) via a global filter; unknown errors → 500 INTERNAL_ERROR with nothing internal; only unexpected 5xx go to Sentry. Config null + `require` → 503 CONFIG_NOT_SET (fail closed).
- DATA-004, SEC-BASE-010, DATA-002, ROLE-003 (BP §26, §29, §66): `AuditWriter` / `MarketplaceEventWriter` (INSERT only, admin reason required). The DB test proves that audit UPDATE/DELETE/TRUNCATE are denied through the real `kaamkaro_api` login.
- SEC-REVIEW-T2.3 #10 (BP §26, §29; DATA-003): mandatory PII masker (deny-list keys, phone/email/CNIC/IP in free text, IP /24 or /48) before every audit/event/outbox write and in all logs.
- REL-009, REL-007, REL-010, REL-013, NOTIF-001 (BP §24, §31.2; D-001): transactional outbox writer (`outbox.append(tx, …)`) + worker process (`dist/worker.js`): relay with FOR UPDATE SKIP LOCKED, exponential backoff, FAILED = dead-letter; BullMQ fan-out per consumer, consumer retries + `outbox.dead-letter` queue. At-least-once delivery: consumers dedupe on the event ID.
- CFG-RULE-001…012 (BP §42, §64): `ConfigService` interface + cached, effective-dated, scope-aware reader (SERVICE → CATEGORY → CITY → GLOBAL; null = not configured). The backing store is A03 (RQ-006).
- INFRA-005: structured JSON logger with request IDs. SEC-REVIEW-T2.1 #10 closed: no X-Powered-By, security headers, HSTS in staging/production. `/health` queue probe is now real.
- Deps: bullmq 6.4.0, ioredis 6.0.0 (catalog, D-001). CI `db-schema` job gets a Redis service and builds workspace deps before `test:db`. New technical env keys in `.env.example`.

## 2026-10-23 — T2.3 review fixes (A01) — SEC-REVIEW-T2.3 #1–#9, #11–#17, #19 + QA BUG-QA-T2.3-02/03/04
- DATA-004, LEDGER-005, PAY-003 (BP §26, §29): the API login (DATABASE_URL) is separated from the migration owner (MIGRATION_DATABASE_URL). The start-up guard refuses superuser, BYPASSRLS, owner membership, or a login outside kaamkaro_app. infra/db/bootstrap.sql adds the roles and runs on docker first start. CI tests through the real non-owner login.
- Privileges are default deny: UPDATE everywhere except append-only tables; DELETE only on an allow-list; default privileges grant SELECT/INSERT only. config_rule is now append-only and cannot be back-dated.
- LEDGER-PAY-006, ABUSE-007: ledger insert guard. Credits and debits must match their CASH record, SUCCEEDED DIGITAL payment, APPROVED submission or settlement. Payment and refund consistency triggers added, including a refund cap at the paid amount.
- Decision records are final after the decision (generic kk_freeze_after_decision): submission, settlement, verification, dispute, review flag, admin sub-role (soft revoke) and media. Confirmed or booking-used location snapshots are frozen.
- New columns:
  - media purpose/sensitivity;
  - admin MFA secret as ciphertext + key id, and a hashed recovery-code table;
  - masked_number CHECK;
  - submitted_by_user_id;
  - booking_number (BP §12 C15, random 10-hex, unique).
- Every kk_* function pins search_path; PUBLIC CREATE/TEMP revoked. New DB tests cover every rule. Unit tests: 22 schema tests plus the platform guard tests.
- First real DB run: on Docker postgis 18-3.6 (fresh DB kaamkaro_t23_verify), test:db passed 49/49 through the non-owner kaamkaro_api login. The API refuses to start with the owner login.

## 2026-10-23 — T2.3 DB schema v1 + first migration (A01) — IN_REVIEW (DB run pending: Docker daemon down)
- DATA-001: Prisma 7.10.1 (pinned in the catalog) multi-file schema in services/api/prisma/schema, one file per ARCH §4 module (18 files, 52 models, 59 enums). Promotion not built (BP §25 "later"). Every model/field/enum has a `///` citation (BP §/D-xxx/requirement ID, all IDs verified against the registries); the same text is written to Postgres as 718 `COMMENT ON` statements, generated by prisma/tools so they cannot drift (unit test).
- DATA-004, LEDGER-005, PAY-003, PAY-004 (BP §26): role `kaamkaro_app` has SELECT/INSERT only on audit_log, marketplace_event, job_event, provider_ledger_entry, payment, payment_method_record, refund; triggers refuse UPDATE/DELETE/TRUNCATE for every role; ledger reversal guard (same provider, opposite direction, never above the original). Payment/refund status changes are new rows.
- PostGIS geography columns + GiST indexes (address, location_snapshot, service_area, service_zone); CHECKs for crew size ≥ 1 (D-004), NO_SHOW party (BOOK-STATUS-017), money ≥ 0, rating 1–5 etc.; partial unique indexes for "recorded once" (LEDGER-002, LEDGER-PAY-005).
- Migration 20261023000000_init generated offline (`prisma migrate diff --from-empty`); CI job `db-schema` applies it to postgis/postgis:18-3.6 and runs `test:db`. New OQ-080, OQ-081.

## 2026-10-23 — T0.6 Urdu Nastaliq smoke test (A14) — BLOCKED-DEVICE (PENDING-DEVICE)
- I18N-001…004, 006, 007, 008; A11Y-001, 002, 004: dev-only smoke screen in apps/customer (Nastaliq paragraph, RTL layout, mixed label, PKR, input, FlatList, Modal bottom sheet, en↔ur toggle). Noto Nastaliq Urdu v4.000 (OFL) bundled in packages/ui and embedded by the expo-font config plugin.
- packages/i18n: en/ur catalogs with compile-time parity, interpolation, `formatPkr`, `isolateLtr`, `otherLocale`. packages/ui: typography tokens (Urdu line height 2.5 from the font metrics), WCAG contrast, 48 dp tap target, `mirroring()` RTL helper.
- Maestro flow apps/customer/.maestro/urdu-smoke.yaml; checklist + owner instructions in docs/qa/urdu-smoke/README.md. No device/emulator/JDK 17 on the A14 machine → no screenshots, no APK; not a PASS. New OQ-079, RQ-005.
- QA S4 fix: smoke screen loaded via `__DEV__`-guarded require; `smoke.*` strings moved to dev-only catalog `@kaamkaro/i18n/dev-smoke`. Release .hbc contains no smoke code/strings (grep 0; dev control > 0). README notes the Maestro dev-launcher question.

## 2026-10-23 — D-030 owner decision (A00)
- OQ-049 answered: booking exists only after the provider accepts the request; cash payment is recorded only by the provider (P14, D-016); the Customer app has no cash choice (C16 information only, C20 "Paid by"). Recorded in DECISIONS.md, ARCH §22, CLAUDE.md.

## 2026-10-23 — T1.5 Flow maps (A00) — IN_REVIEW
- JOURNEY-001…003: new `docs/screens/flows.md` — nine flows (request → match, booking → job → completion, quote/inspection, payment + ledger + Pay company, supply gap, cancellation/no-show, dispute, provider verification, low-rating dry-run). Every arrow cites an ARCH §6 transition, the screen ID, server guards and the ARCH §7 event.
- New open questions OQ-073 (Completed → Closed), OQ-074 (exits from NoSupply), OQ-075 (verification-decision event). Spec only; no behaviour/code change.

## 2026-10-23 — T1.3 Admin screen specs A01–A26 + access matrix (A13) — IN_REVIEW
- OPS-ADMIN-001…026, ADMIN-ROLE-001…008, ROLE-003, UX-SCREEN-003: new `docs/screens/admin.md` — access matrix (26 screens × 8 BP §8.4 sub-roles, 208 cells: 147 decided, 16 by rule, 45 `OQ` = `none` until answered), global rules (separate admin auth + MFA, audit + reason on every write, server-enforced permissions, PII masking, pending/unknown handling), and one section per screen with fields, actions (allowed sub-roles, server module, audit, reason/confirm), the 5 states and open items. English-only admin UI (D-026); en+ur fields for user-facing content.
- Covers D-021 Finance verification queue (A09), D-014/D-017 reinstatement + dry-run (A03/A18), D-006/D-015/D-020/D-022/D-023/D-025/D-029 financial config (A13), D-019/D-024 activation (A23).
- New open questions OQ-051…OQ-061. Spec only; no behaviour/code change.

## 2026-10-23 — T1.2 Partner screen specs P01–P26 (A12) — IN_REVIEW
- UX-SCREEN-002/-003: new `docs/screens/partner.md` — 26 screens (BP §13 P01–P21 + ARCH §3.2 P22–P26), each with fields, server-requested actions, the 5 states (loading/empty/success/error/pending-unknown) and EN + DRAFT UR copy; global patterns G1–G8 written once (network/offline/pending, permission-on-tap, active-job location indicator, RTL, PKR, server-driven actions + error codes, pre-match privacy).
- Covers D-002, D-004/D-018 (crew size on Accept/Quote), D-016 (CASH/DIGITAL on P14), D-020/D-021 (unpaid banner, Pay company in P15, start block on P12), D-014/D-017 (rating warnings), D-028, D-029.
- New open questions OQ-062…OQ-072. Spec only; no behaviour/code change.

## 2026-10-23 — T1.1 Customer screen specs C01–C42 (A11) — IN_REVIEW
- UX-SCREEN-001/-003/-004/-005: new `docs/screens/customer.md` — 42 screens (BP §12 C01–C30 + ARCH §3.1 C31–C42), each with fields, server-requested actions, the 5 states (loading/empty/success/error/pending-unknown) and EN + DRAFT UR copy; global patterns written once (network/offline/pending, permission-on-tap, RTL, PKR, server-driven actions).
- New open questions OQ-039…OQ-050; RQ-004 (contract fields needed by the customer screens) to A04/A05/A07/A09/A10.
- Spec only; no behaviour/code change.

## 2026-10-23 — T2.1 security fix round (A01) — SEC-REVIEW CHANGES-REQUIRED → fixes in, re-check requested
- SEC-BASE-002 / INFRA-005 (SEC #1, S2): Sentry deny-all dataCollection + beforeSend/beforeSendTransaction scrubbers, typed satisfies NodeOptions; fake-transport API test proves no body, auth header, cookie, query or IP is sent.
- SEC-BASE-008 (SEC #2): CI audit gate = pnpm audit --audit-level high; only waivers are EX-001/EX-002 in auditConfig.ignoreGhsas (docs/security/dependency-exceptions.md).
- SEC #5: GitHub Actions pinned to commit SHAs, persist-credentials false, dependabot for github-actions. SEC #4: allowBackup false in both apps + guard check (SEC-BASE-002). SEC #8: manifest parser accepts single quotes, fails closed. SEC #13: .gitignore *.env, .envrc, *.secret*.
- INFRA-005 (QA F-03): staging/production refuse to boot without SENTRY_DSN.
- Deferred with owners (handoff T-2.1): SEC #3, #6, #7, #9–#12; QA F-04–F-06.

## 2026-10-23 — T2.1 Monorepo, CI, envs, secrets, Sentry, health (A01) — IN_REVIEW
- PLAT-001: pnpm + Turborepo monorepo (D-001), TS 6 strict, shared ESLint/Prettier, Expo SDK 58 dev-build shells for apps/customer + apps/partner, Next.js admin shell, NestJS API shell.
- REL-011 / INFRA-005: GET /health (contracts/health.yaml v1.0.0) with database/redis/queue/storage status; Sentry from SENTRY_DSN only (off by default).
- SEC-BASE-008 / SEC-BASE-011: env loader refuses unknown APP_ENV, missing DB/Redis and .env.example placeholders in staging/production; .env.example fake values; gitleaks in CI.
- IMPL §7.4 guards: forbidden Android permissions (PERM-006, full policy §4.1 list + merged release manifest job, RQ-001), hard-coded values, PR citations, baseline string-lint (I18N-006), transition-table and traceability hooks, no .only/.skip lint (RQ-002 item 2), INFRA-001 cross-module import lint rule.
- i18n skeleton gains textDirection() + translate() with two app-name keys (A14 to review). OQ-036…OQ-038 added; OQ-030 proposal API 24.

## 2026-10-22 — Owner decisions D-027 (model), D-028, D-029
- D-027: test phone = Infinix Note 40 → T0.6 unblocked (needs T2.1 dev build); RQ-003 to A16; OQ-034 (small-screen/low-RAM gap).
- D-028: Quote Pending entry + inspection inside Quote Pending confirmed (K-16 resolved) → BOOK-STATUS-003, ARCH §6.1 note ³.
- D-029: customer bill shows a separate tax line; tax type/rate open (OQ-035) → FARE-010.

## 2026-10-22 — Owner decisions D-023…D-027
- D-023: no fees on jobs that never reach Completed (K-17 resolved) → BOOK-CANCEL-002/-005 updated; sweep check added (IMPL §7.3).
- D-024: all 10 BP §6 families active in Lahore on day one → SCOPE-CAT-002, IMPL §5, T2.6 acceptance.
- D-025: no customer platform fee → FARE-009; sweep check added.
- D-026: Admin portal English only → I18N-001, ARCH §13.
- D-027: reference test phone = cheapest, lowest-spec Android (model open) → T0.6 still blocked (OQ-029).
- ARCH §21 gets K-16/K-17; ARCH §22 and CLAUDE.md decision table updated. No code exists, so no BUGS entries.

## 2026-10-22 — Phase 0 (T0.1–T0.5)
- T0.1 (A00): coordination templates completed (BUGS template, handoffs/_TEMPLATE.md, REQUESTS templates, full TASKS titles).
- T0.2 (A00): `docs/requirements/REQUIREMENTS.md` v1 — 417 requirements, one acceptance criterion each; BP §1–§87 coverage matrix (73 mapped, 14 informational).
- T0.3 (A00): DECISIONS.md status column (14 Accepted, D-017 partly, 7 Proposed); CONFLICTS.md new K-16 (Quote Pending entry) and K-17 (fees on non-completed jobs vs D-003); OPEN_QUESTIONS OQ-014…OQ-033.
- T0.4 (A15): `docs/security/permission-policy.md` v1 (PERM, SEC-BASE, ABUSE).
- T0.5 (A16): `docs/qa/test-strategy.md`, `docs/qa/device-matrix.md` (T0.6 reference device D-REF).
- No behaviour/code change (documents only).

## 2026-10-22
- Project docs created: BLUEPRINT.md, architecture.md, implementation.md, CLAUDE.md, agents, commands. Owner decisions D-001…D-007, D-014…D-016, D-018…D-021 accepted.

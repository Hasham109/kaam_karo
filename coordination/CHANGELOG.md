# CHANGELOG — Kaam Karo

Newest first. Every behaviour change, with task ID and requirement IDs.

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

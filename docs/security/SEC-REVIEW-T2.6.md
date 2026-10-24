# SEC-REVIEW T2.6 — Catalog seed, launch families, ConfigRule store, cities

Reviewer: A15 · Date: 2026-10-24 · Task owner: A03 · Branch: `main` (uncommitted working tree)
Scope: `coordination/handoffs/T-2.6.md`; `services/api/src/modules/config/**`, `services/api/src/modules/catalog/**`, `services/api/prisma/seed/**`, `contracts/catalog.yaml`, `contracts/config.yaml`. Related: `packages/platform/src/config/config-service.ts`, `packages/platform/src/pii/mask.ts`, `services/api/prisma/migrations/20261023000000_init/migration.sql` (config_rule grants and CHECK).
Requirement IDs reviewed: CFG-RULE-001…012, SCOPE-CAT-001/002, SCOPE-GEO-001/002, OPS-ADMIN-023, SEC-BASE-006, SEC-BASE-010, SEC-AUTH-004, SEC-AUTH-005, ADMIN-ROLE-001…008, ABUSE-003, ABUSE-009, ABUSE-010, MEDIA-004; SEC-REVIEW-T2.2 #10, SEC-REVIEW-T1.1-1.3 #1, OQ-028, OQ-052, OQ-076, OQ-078.

Method:
- Static review of every file in scope.
- **Fresh database `kaamkaro_t26_sec`** (`kaamkaro_dev` not touched): `infra/db/bootstrap.sql` as superuser → `prisma migrate deploy` as the owner → `node prisma/seed/run.ts` **three times** → probes as the API login `kaamkaro_api` (psql, every probe in a rolled-back transaction).
- A03's seed DB tests on that DB as `kaamkaro_api`: **9/9 pass**. Unit tests for config, catalog and seed: **46/46 pass**.
- Masker probe against `packages/platform/dist/pii/mask.js` with config audit payloads.
- gitleaks v8.30.1 (`.gitleaks.toml`): `dir` scan of the 4 reviewed paths and `git` scan of the full history: **no leaks**.
- Probe scripts are in the session scratchpad, not in the repo.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: CHANGES-REQUIRED**

- **Blocking for T2.6 merge:** finding 1 (S2, A03 part).
- **Before the first controller or the first reader of these keys (T2.4 identity, T5.x admin):** findings 2–6 (S3).
- **Advisory:** findings 7–11 (S4).

## Answer to the brief: T2.2 #10 and "can OTP / login limits be read as unlimited?"

- A03's `failClosed` flag, `FAIL_CLOSED_KEYS` and `missingFailClosedKeys` are useful metadata. They do **not** close SEC-REVIEW-T2.2 #10:
  - the reader still returns `not_configured` for the caller to interpret;
  - there is no `configParsers.positiveInteger`;
  - nothing calls `missingFailClosedKeys` yet (RQ-008 item 5 is open), and the request asks for a **start-up** check only.
- **Yes, they can be read as "unlimited" today.** There are five ways, listed in finding 1. T2.2 #10 stays open; finding 1 narrows it.

## What passes

- **Seed runs as the owner.** `run.ts` goes through `prisma db execute`, and `prisma.config.ts` uses only `MIGRATION_DATABASE_URL`. Without it there is no datasource, so the seed fails rather than falling back to the API login.
- **Seed is idempotent** (3 runs: still 22 families / 351 services / 1 city / 71 config rows / 10 active families). It never overwrites:
  - city, category and service rows (`ON CONFLICT … DO NOTHING`);
  - activations;
  - config (a GLOBAL row is written only if the key has none).
  - The exception is finding 8 (zones keyed by name).
- **Append-only for the API login (verified live):** `UPDATE` and `DELETE` on `config_rule` give `permission denied`. `DELETE` on `catalog_activation` and `service` is also denied.
- **Service-layer write checks:**
  - `ConfigAdminService.setRule` refuses decided keys (403) and two-person keys (409), and checks scope, scope ID, kind and back-dating. Version and audit are written in one transaction.
  - `CatalogService` requires an actor and a reason, refuses activation of an unlisted city, refuses an empty selling-mode set, and has no create method (SCOPE-CAT-001).
  - A service-level "active" row cannot make a service available while its family is inactive.
- **No actor in the request body.** `SetConfigRule` and `ActivationChange` have `additionalProperties: false` and no actor field. The controller must take the actor from the session (finding 4).
- **Public catalog endpoints** (`security: []`) return only cities, families, services and availability reasons. No PII.
- **D-024 / D-007 / D-019:** only Lahore is active, exactly the 10 D-024 families, with one whole-city zone (DB-tested).
- **No secrets, keys or vendor credentials** in seed, config or contracts (gitleaks clean). The config registry holds no values. `payments.company_account` is seeded `null`.

## Findings

### 1. S2 — Fail-closed OTP and login limits can be read as "unlimited"
- Files:
  - `services/api/src/modules/config/config-keys.ts:314-330` (`auth.rate_limit.login` / `otp_send` are `kind: 'object'`), `:694` (`object` = any plain object), `:684` (`positive_integer` has no upper bound);
  - `services/api/src/modules/config/config-admin.service.ts:110` (`null` is always accepted, including for `failClosed` keys);
  - `services/api/src/modules/config/config-readiness.ts:26-27` (readiness parses with `configParsers.integer`, which accepts 0 and negatives, and `configParsers.object`), `:37` (`mustFailClosed` is false for `development`/`test`).
- Rule: SEC-AUTH-004, SEC-BASE-006, ABUSE-009, KK-T3 (BP §27, §29, §30; D-002); SEC-REVIEW-T2.2 #10; SEC-REVIEW-T1.1-1.3 #1; golden rule 2.
- Reproductions (unit level, through `ConfigAdminService.setRule` with a valid actor and reason):
  1. `auth.rate_limit.login` = `{}` is accepted. `missingFailClosedKeys` then reports it as configured, and a reader that looks up `max` finds nothing, which means no limit.
  2. `auth.otp.max_attempts` = `9007199254740991`, or `auth.otp.expiry_seconds` = `9007199254740991`, is accepted. In effect: unlimited guesses and a code that never expires.
  3. `auth.otp.max_attempts` = `null` is accepted at runtime. With only the start-up check of RQ-008 item 5, a running process keeps serving, and the caller is back to T2.2 #10.
  4. A direct insert of `'0'` or `'-1'` (finding 2, live P4) passes `configParsers.integer`, so readiness says "configured".
  5. A server started with `APP_ENV=development` runs with `mustFailClosed = false`, so the null branch proceeds with no limit. One environment variable switches off OTP brute-force protection.
- Fix:
  - **A03 (blocking):**
    - give each rate-limit key a closed schema (named required fields, each a positive integer; `additionalProperties: false`) and check it on write and in readiness;
    - refuse `null` on `failClosed` keys in `setRule` (a security limit cannot be "unset" from the UI);
    - make readiness use positive parsers;
    - add an OQ for owner-set upper bounds (no number invented here), or make `auth.*` writes need two-person approval.
  - **A01:** add `configParsers.positiveInteger`. For `FAIL_CLOSED_KEYS`, make `get()` throw `ConfigNotSetError` (T2.2 #10).
  - **A02:**
    - check per action (OTP send / verify, login), not only at start-up;
    - no "no limit" branch in any environment: dev/test use explicit test values from a dev-only seed (OQ-028 "non-production uses safe test values");
    - test: a null or `{}` limit → 503 `LIMIT_NOT_CONFIGURED`, never unlimited.

### 2. S3 — A direct INSERT by the API login bypasses read-only (OQ-078), two-person (OQ-076), kind, scope and audit
- Files: `migration.sql:1610` (`GRANT SELECT, INSERT` on all tables to `kaamkaro_app`); no DB guard on `config_rule.key`/`scope`/`value`; `config_rule.changed_by_user_id` is nullable.
- Rule: OQ-078 default, OQ-076 default, SEC-BASE-010, ABUSE-010, CFG-RULE-003, COMM-001 (BP §26, §29, §42; D-006).
- Reproduction (live, as `kaamkaro_api` on `kaamkaro_t26_sec`):
  - `INSERT INTO config_rule (key, scope, value, effective_from) VALUES ('commission.rate','GLOBAL','0.05', now()+interval '1 second');` → `INSERT 0 1`. There is no audit row and no actor. Commission becomes 5% one second later (P1).
  - The same works for `auth.rate_limit.login = '{}'`, `auth.otp.max_attempts = '0'`, a `CITY` row for the GLOBAL-only `auth.otp.max_attempts` (it overrides GLOBAL for any reader that passes a `cityId`), and an unknown key (P4).
  - Any module bug or SQL injection on the API login therefore changes money and security config silently.
- Fix:
  - **A01 (schema):** add a `BEFORE INSERT` trigger on `config_rule` that checks an owner-maintained `config_key_policy(key, allowed_scopes, read_only, two_person)` table. It rejects read-only and two-person keys, disallowed scopes and unknown keys, and requires `changed_by_user_id NOT NULL` for inserts by `kaamkaro_app`.
  - **A03:** generate the policy rows from `CONFIG_KEYS` in the seed. Add an architecture lint so that only `modules/config` may call `configRule.create`.

### 3. S3 — The DB back-dating CHECK can be bypassed by setting `created_at`, and it allows 60 s of back-dating
- File: `migration.sql:1572`, `CHECK ("effective_from" >= "created_at" - interval '1 minute')`. `created_at` is caller-settable (`config.prisma:35`, `@default(now())`).
- Rule: SEC-REVIEW-T2.3 #8, CFG-RULE-003, BP §26 (history cannot be rewritten).
- Reproduction (live, API login):
  - `INSERT INTO config_rule (key, scope, value, effective_from, created_at) VALUES ('commission.rate','GLOBAL','0.05','2020-01-01','2020-01-01');` → accepted. The row reads as effective since 2020, so any `at`-based recomputation (bills, ledger, disputes) sees 5% (P2).
  - `effective_from = now() - 59 s` is also accepted with the default `created_at` (P3).
- Fix (A01): a `BEFORE INSERT` trigger that sets `NEW.created_at := now()` and raises if `NEW.effective_from < NEW.created_at`. Drop the 1-minute slack: `setRule` already uses the server clock. Add a DB test with an explicit old `created_at`.

### 4. S3 — No authorization model for config and catalog writes; the registry carries no sub-role, and the contracts declare no security
- Files:
  - `config-admin.service.ts:64-67, 134` (`actorUserId` / `actorSubRoles` are caller-supplied and only copied into the audit);
  - `config-keys.ts:32-43` (no `editors`/group field);
  - `catalog.service.ts:57-64`;
  - `contracts/config.yaml:20-110` and `contracts/catalog.yaml:78-140`: no `securitySchemes`, no per-operation `security`, no allowed sub-roles; `common.yaml` has none either;
  - `config-admin.service.ts:154` (`history` returns every version, including financial keys).
- Rule: ADMIN-ROLE-001…008 (BP §8.4: "Super Admin: all configuration and security functions"; "Support: no financial configuration"), SEC-AUTH-005, ROLE-003, OQ-052, OQ-053; BP §29 server-side authorization.
- Reproduction: a future controller that calls `setRule({ ...body, actorUserId: req.user.id })` behind a plain "is staff" guard lets a Support user set `commission.*`-adjacent keys (`price.max_total_minor`, `fare.*`) or `auth.otp.*`. Nothing in the service or registry refuses it. `actorSubRoles: ['SUPER_ADMIN']` passed by the caller would be recorded as true in the audit.
- What the controller must enforce (put this into the contracts now):
  1. Staff session only: customer/provider tokens → 401/403. MFA completed (SEC-AUTH-005). Idle timeout per `auth.admin_idle_timeout`.
  2. `actorUserId` and `actorSubRoles` come from the server session, never the body.
  3. Per-key sub-role check from the registry:
     - `auth.*`, `rate_limit.*`, `media.*` limits → Super Admin only (ADMIN-ROLE-001);
     - `commission.*` / `fees.*` / `tax.*` / `price.*` / `ledger.*` / `payments.*` → Finance or Super Admin, never Support (ADMIN-ROLE-003/004);
     - catalog activation → Operations / Content Manager / Super Admin per OQ-052;
     - Analyst → 403 on every write (ADMIN-ROLE-007).
  4. Reads (`listConfigKeys`, `history`) are filtered by the same groups: Support does not see financial config.
  5. `scopeRefId` is validated as a UUID before the service runs (finding 11).
  6. An `Idempotency-Key` is required (`x-idempotent: true`).
- Fix:
  - **A03:** add an `editGroup` field to every `ConfigKeyDefinition`, and `x-admin-sub-roles` + `security` to each admin operation in both contracts (values from OQ-052; until answered, default Super Admin only for security and financial groups).
  - **A02/A13:** an RBAC matrix test over these operations.

### 5. S3 — Abuse rate-limit keys fail open while null
- File: `config-keys.ts:332-345`: `rate_limit.messaging` and `rate_limit.requests`, `whileNull: 'technical defaults of the platform only'`. No such platform defaults exist (golden rule 2 forbids inventing them), so null means unlimited chat and request creation.
- Rule: ABUSE-003 (BP §30 "Spam requests"), SEC-BASE-006, OQ-028.
- Reproduction: while the seed value is null (today), a consumer that follows the documented `whileNull` has no limit to apply. A script can create requests or chat messages without bound.
- Fix:
  - **A03:** mark both keys `failClosed` with a closed object schema (as in finding 1), or set `whileNull` to "action refused in staging/production (`LIMIT_NOT_CONFIGURED`)".
  - **A00:** keep OQ-028 on the pilot-blocking list.

### 6. S3 — Audit of sensitive config changes can be unreadable or unverifiable
- Rule: SEC-BASE-010, ABUSE-010 (review of sensitive changes), OQ-076.
- Reproduction (masker probe, `maskPii` = what `AuditWriter` stores):
  - `{ key: 'auth.rate_limit.otp_send', value: { otpPerHour: 5 } }` → `value.otpPerHour = "[REDACTED]"`. The audit of a security-limit change loses the new limit.
  - `payments.company_account` `{ accountTitle, accountNumber, iban }` → all `[REDACTED]`. This is the key most likely to be abused (an admin swapping the company account), and its audit could not show where payments were redirected.
- Fix:
  - **A03:** name the rate-limit fields without deny-listed stems (for example `sendsPerHour`, not `otpPerHour`). Add a test that the audit `after` of every registry key round-trips through `maskPii` unchanged, except for intended fields.
  - **A09/A13 (OQ-076 flow):** store a non-secret fingerprint (bank, last 4 digits, SHA-256 of the full number) in the audit, and notify all Super Admins.

### 7. S4 — Seed config rows have no audit row and no actor
- File: `services/api/prisma/seed/seed-sql.ts:116-125`.
- Rule: SEC-BASE-010, BP §26.
- Reproduction: fresh DB after the seed: `config_rule` = 71 rows, all with `changed_by_user_id IS NULL`; `audit_log` = 0 rows. The origin of `commission.rate = 0.3` is recorded nowhere in the DB.
- Fix (A03): in the same seed transaction, insert one `SYSTEM` audit row per config row actually inserted (`INSERT … RETURNING` in a CTE), with reason `seed T2.6 <D-number or TODO(OWNER)>`. Do the same for activation rows.

### 8. S4 — The seed can re-open a city after an admin renamed and deactivated its zone
- File: `seed-sql.ts:59-65` (the zone's existence is checked by `name_en`).
- Rule: seed must never overwrite admin changes (handoff; BP §64; SCOPE-GEO-002).
- Reproduction (live, owner):
  1. `UPDATE service_zone SET name_en='Lahore (all areas)', is_active=false;`
  2. re-run `node prisma/seed/run.ts`;
  3. the result is two zones: `Lahore (all areas)|f` and `Whole Lahore|t`. Lahore is served again.
- Fix (A03): give zones a stable `code` with a unique `(city_id, code)` (A01 schema request), and use `ON CONFLICT DO NOTHING` on it.

### 9. S4 — `effective_from` has no upper bound: scheduled "time bombs" are possible
- File: `config-admin.service.ts:113-120`.
- Rule: ABUSE-010, CFG-RULE-003.
- Reproduction:
  - `setRule({ key: 'auth.otp.lockout_seconds', value: 1, effectiveFrom: <in 6 months>, … })` is accepted. Later corrections effective "now" are overridden when the scheduled row's date arrives (`resolveConfig` takes the latest `effective_from` ≤ now).
  - Scheduled `null` on a fail-closed key causes a planned login outage.
- Fix (A03/A13):
  - the editor and `listConfigKeys` must show pending future versions;
  - superseding a pending version must be possible (a new row with the same scope and an earlier `created_at` wins nothing today: document and test the rule);
  - consider an owner-set maximum schedule horizon (OQ).

### 10. S4 — No defined path to change an owner-decided value
- Files: `config-admin.service.ts:94-99` (403); `seed-sql.ts:124` (the seed never writes a key that already has a GLOBAL row).
- Rule: OQ-078 default, golden rule 2.
- Reproduction: the owner records D-0xx "commission 25%". The service refuses, and a seed re-run does nothing. The only remaining route is raw SQL by hand, with no audit and the bypasses of findings 2 and 3.
- Fix (A03/A00): document the procedure: an owner-role migration or seed step that inserts the new version **plus** a `SYSTEM` audit row citing the D-number, reviewed by A15.

### 11. S4 — Malformed input and races give 500 instead of 4xx
- Files: `catalog.service.ts:170-178` / `config-admin.service.ts:171` (a non-UUID `scopeRefId` reaches Prisma `findUnique` on a UUID column); `config_rule_global_key` unique `(key, scope, effective_from)` (two writes in the same millisecond); `catalog.repository.ts` `setActivation` (`findFirst` then `create`; a concurrent create hits the partial unique index).
- Rule: REL-001, the error envelope (no 500 for client errors).
- Reproduction: `scopeRefId: "abc"` gives a Prisma validation error, which becomes 500 `INTERNAL_ERROR`. Two concurrent first activations of the same service give one 500.
- Fix (A03): validate UUIDs and return `SCOPE_REF_INVALID` 422. Map unique violations to 409 (retryable), or use `upsert` / `ON CONFLICT`.

## Routing (for A00 → BUGS.md / REQUESTS.md)

| # | Sev | Owner | Blocks |
|---|---|---|---|
| 1 | S2 | A03 (registry, setRule, readiness); A01 (positiveInteger, reader fail-closed, T2.2 #10); A02 (per-action guard, no dev bypass) | T2.6 merge (A03 part); T2.4 |
| 2 | S3 | A01 (DB trigger + policy table); A03 (policy seed, lint) | before T2.4/T5.x |
| 3 | S3 | A01 | before T6.x money |
| 4 | S3 | A03 (registry `editGroup`, contracts); A02/A13 (guards, RBAC test); A00 (OQ-052) | before any admin controller |
| 5 | S3 | A03; A00 (OQ-028) | before T3.x request/chat endpoints |
| 6 | S3 | A03; A09/A13 (OQ-076 flow) | before A20 security editor / company account |
| 7–11 | S4 | A03 (8 needs an A01 schema change) | advisory |

## BP §30 abuse table (delta from this task)

- ABUSE-003 Spam requests: **gap**. The keys exist but fail open (finding 5).
- ABUSE-009 Account takeover: **gap**. OTP limits can be unlimited (finding 1).
- ABUSE-010 Admin abuse: **partial**. The service layer audits every change in the same transaction. Gaps: the DB bypass (finding 2), back-dating (finding 3), no sub-role model (finding 4), unreadable audit values (finding 6).
- The other seven risks are not touched by T2.6.

---

## Re-review 1 — 2026-10-24 (A15)

Scope: Verification of fixes for all findings (#1–#11) across A03 (`modules/config`, `modules/catalog`, `prisma/seed`) and A01 (migration `20261024000000_config_policy_zone_code`, `config_key_policy` table and triggers).

**Verdict: SEC-REVIEW: PASS**

| Finding | Severity | Status | Evidence |
|---|---|---|---|
| 1 | S2 | **Closed** | Registry enforces closed `limit_object` schemas and technical ceilings (`UNIT_CEILINGS`). `setRule` refuses null on fail-closed keys. `missingFailClosedKeys` / `assertFailClosedKeysSet` inspect registry parsers. Dedicated `dev-test-limits.seed.ts` provides explicit test limits. |
| 2 | S3 | **Closed** | Migration `20261024000000_config_policy_zone_code` adds `config_key_policy` table and `kk_config_rule_guard` trigger. DB refuses decided keys, null limits, and invalid types for `kaamkaro_api`. `config-architecture.spec.ts` confirms only `modules/config` writes `config_rule`. |
| 3 | S3 | **Closed** | Trigger enforces `created_at := now()` and rejects back-dating past 5s slack. |
| 4 | S3 | **Closed** | Server-side `StaffRoleLookup` port introduced (`DenyAllStaffRoleLookup` default until A02 binds in T2.4). Keys mapped to `editGroup` (FINANCIAL = Finance + Super Admin; others = Super Admin only). Contracts updated with `staffSession` and `x-admin-sub-roles`. |
| 5 | S3 | **Closed** | `rate_limit.messaging` and `requests` fail closed with closed schemas. |
| 6 | S3 | **Closed** | Limit fields avoid masker stems. Company account audited as hash fingerprint (`sha256:` allow rule) + last 4 digits. |
| 7 | S4 | **Closed** | Seed writes SYSTEM_SEED audit rows for initial config and family activations. |
| 8 | S4 | **Closed** | `service_zone.code` column added with stable code `lahore-whole-city` and unique constraint. |
| 9 | S4 | **Closed** | `config.max_schedule_ahead_hours` added; future scheduling refused while null. |
| 10 | S4 | **Closed** | Owner-decided procedure documented in handoff. |
| 11 | S4 | **Closed** | UUID validation, 422 `SCOPE_REF_INVALID`, and 409 `CONCURRENT_WRITE` mappings implemented. |


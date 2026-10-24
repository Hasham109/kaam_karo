# SEC-REVIEW T2.2 — Platform lib (config reader, PII masker, logger, error envelope, idempotency, audit, outbox/worker, headers)

Reviewer: A15 · Date: 2026-10-24 · Task owner: A01 · Branch: `main` (uncommitted working tree)
Scope: `coordination/handoffs/T-2.2.md`; `packages/platform/src/{config,pii,logger,errors,idempotency,audit,outbox}/**`, `env.ts`, `sentry.ts` (as used by the new filter); `services/api/src/platform/**`, `worker.ts`, `worker.module.ts`, `main.ts`; `contracts/common.yaml`. Out of scope: `modules/catalog`, `modules/config`, `prisma/seed` (A03, parallel).
Requirement IDs reviewed: DATA-003, DATA-004, SEC-BASE-001, SEC-BASE-002, SEC-BASE-005, SEC-BASE-010, SEC-AUTH-008, REL-002, REL-006, REL-008, REL-009, INFRA-005, ROLE-003, CFG-RULE-001…012; SEC-REVIEW-T2.3 #10, SEC-REVIEW-T2.1 #10.
Method:
- Static review of every file in scope.
- Built `@kaamkaro/platform` and `@kaamkaro/api` (`tsc`) and ran probe scripts against `dist`. The scripts are in the session scratchpad, not in the repo.
  - `probe-mask.cjs`: 40 free-text strings, 75 key names, nested/array/cycle/Buffer/toJSON cases, logger output, `buildAuditRow` output.
  - `probe-http.cjs`: `AppModule` in `APP_ENV=production`, with a bad JSON body, a 2 MB body, a 404 with a client `X-Request-Id`, and TRACE.
- No database was used. No idempotency/outbox DB test was re-run; A01 reports `test:db` 58/58 on `kaamkaro_t22_test`. `kaamkaro_dev` was not touched.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: CHANGES-REQUIRED**

- **Blocking for T2.2 merge:** findings 1 and 2 (S2).
- **Before a module builds on the affected part (T2.4 identity, T3.x booking, T6.x payments):** findings 3–10 (S3).
- **Advisory:** findings 11–16 (S4).

## What passes

- **No cross-user replay.** The scope is `user:<request.user.id>` from the server-side identity (`idempotency.interceptor.ts:326-329`), and the DB unique key is `(scope, operation, key)`. A caller with no identity gets 401 before any lookup. The body is never used for scope. A replay returns only the row matching the caller's own scope, and a different body or URL gives 409 `IDEMPOTENCY_KEY_REUSED`.
- **Idempotency key format.** The key is `^[A-Za-z0-9_\-:.]{8,128}$`, the same in code and `contracts/common.yaml:35`. Parameterised SQL throughout `idempotency.store.ts`. The insert-first `ON CONFLICT DO NOTHING` and the compare-and-set reclaim on `updated_at` are race-safe for concurrent first requests.
- **Error envelope.** Only `AppError` keeps its code and message. Every other error becomes a generic message, and framework errors map to a status code without their text (`error-envelope.ts:186-217`, `error.filter.ts:261-270`). `cause` is never serialised, and details are bounded (50 × 200 chars). Sentry gets only `INTERNAL_ERROR`; 4xx errors and config errors are not reported.
- **Logger.** No platform code logs request bodies, headers, URLs or query strings. The unhandled-error log carries only `err` (name + masked message) and `method`. Stacks are written only in development/test. Context keys are deep-masked.
- **Masker, structural part.** Key matching is case- and separator-insensitive (`PHONE`, `Phone_Number`, `phone.number` and `x-otp` are all redacted). It handles nesting, arrays and cycles, never mutates its input, and keeps only the name of an Error. `authorization`, `cookie`, `*token*`, `apikey`, `otp*` and `*secret*` keys are redacted. The IP is truncated in audit source metadata.
- **Audit writer.** It accepts only entries, not rows. Admin writes need a reason (ROLE-003). Codes and states are pattern-validated, and only SYSTEM may lack a user.
- **Outbox.** The payload is deep-masked (`outbox.ts:333`), and `last_error` is masked and bounded. The worker refuses to start without `REDIS_URL`. Redis is not the source of truth.
- **Config reader.** `require` fails closed (503 `CONFIG_NOT_SET`, not retryable). A store failure with an expired cache gives `ConfigUnavailableError` (503, retryable); it never serves a default. An explicit null does not fall through to a broader scope. The key pattern is validated.
- **Headers (SEC-REVIEW-T2.1 #10).** Verified live on routed responses in `APP_ENV=production`:
  - No `X-Powered-By`.
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`.
  - CORS stays off.
  - **#10 is closed, apart from the parser-error path (finding 11).**
- **Body size.** The Express default limit of 100 kB holds: a 2 MB body gets 413 `PAYLOAD_TOO_LARGE`.

## Findings

### 1. S2 — Free-text masker misses Urdu digits and common phone separators, so PII reaches append-only rows
- File: `packages/platform/src/pii/mask.ts:151-153` (`CNIC_RE`, `PHONE_PLUS_RE`, `PHONE_DIGITS_RE`), `:159-174`.
- Rule: SEC-REVIEW-T2.3 #10, DATA-003, DATA-004, SEC-AUTH-008, BP §26, §29; permission-policy §7. The apps are English + Urdu (CLAUDE.md, IMPL §8). An Urdu keyboard on Android types Extended Arabic-Indic digits (۰-۹).
- Reproduction (`maskFreeText`, built dist). Each of these inputs comes back **unchanged**:
  - `۰۳۰۰۱۲۳۴۵۶۷`, `٠٣٠٠١٢٣٤٥٦٧`, `۰۳۰۰-۱۲۳۴۵۶۷`, `０３００１２３４５６７`
  - `۳۵۲۰۲-۱۲۳۴۵۶۷-۱` (CNIC)
  - `0300 - 1234567`, `(0300) 1234567`, `0300/1234567`, `0300  1234567` (two spaces), `0300–1234567` (en dash), `0300​1234567` (zero-width space)
  - `tel03001234567`, `num_03001234567`, `03001234567-urgent`
  
  End to end: `buildAuditRow({…, reason: 'call ۰۳۰۰۱۲۳۴۵۶۷'})` stores `"reason":"call ۰۳۰۰۱۲۳۴۵۶۷"`. The same applies to `job_event.reason`, `refund.reason` and ledger `reason` through `maskReason()`. Those rows can never be updated.
- Why it matters: Urdu users are the main audience. A phone number typed into a cancellation or dispute reason will very often use Urdu digits. The handoff states that the control works, but it does not work for this input.
- Fix (A01):
  - Match any Unicode decimal digit and a wider separator set, with a digit-only boundary instead of `[\w-]`. Verified to mask every case above while leaving `order 12345 qty 3`, `price 150000`, ISO timestamps and UUIDs alone:
    ```ts
    const PHONE_DIGITS_RE =
      /(?<!\p{Nd})\p{Nd}(?:[\s.\-‐-―\/()​-‍⁠﻿]{0,3}\p{Nd}){9,}(?!\p{Nd})/gu;
    ```
  - Make the CNIC regex Unicode-aware the same way (`\p{Nd}{5}[-‐–]?\p{Nd}{7}[-‐–]?\p{Nd}` with `u`).
  - Strip zero-width characters before matching.
  - Add every input above as a unit test, in Urdu and English.

### 2. S2 — "Handler runs once per key" (REL-008) is not guaranteed: a failed `complete()` or a handler slower than 60 s re-runs the operation
- Files:
  - `packages/platform/src/idempotency/idempotency.ts:147-159` (crash reclaim), `:168-181` (`complete` runs outside the handler's try and its own transaction)
  - `services/api/src/platform/idempotency.store.ts:432-441`
  - `packages/platform/src/env.ts:42, :185` (`IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS` accepts any positive integer, e.g. `1`)
- Rule: REL-008, REL-002, BP §31.1, §31.2; D-003 (payment at the end) and the money operations named in REL-008 ("initiate payment", "approve charge").
- Reproduction:
  - (a) Failed `complete()`. The handler commits a booking or payment. Then `store.complete()` throws: a DB blip, pool exhaustion, or a response value Prisma cannot serialise into JSON, such as a BigInt paisa amount (DATA-001). The client gets 500 and the row stays `response_status = NULL`. The app retries with the same key: 409 IN_PROGRESS for 60 s, then `crashed === true` → `reclaim` → **the handler runs a second time**.
  - (b) Slow handler. A handler that legitimately takes more than 60 s, such as a gateway call with a long timeout, is also reclaimed by the next retry and runs concurrently. Node's default `requestTimeout` is 300 s, so nothing stops it first.
  - The handoff lists (b) as a known limitation. It does not list (a), and it leaves the mitigation ("modules still need their business unique constraints") as advice only.
- Fix (A01; A00 for the DoD item):
  1. Retry `complete()` (bounded, with backoff). If it still fails, **do not** make the row reclaimable: mark it `response_status = 500`, stored as a non-replayable "outcome unknown" state, so that a retry gets 409 and a support path. Never re-run it silently.
  2. Use a lease instead of a fixed timeout: the interceptor refreshes `updated_at` while the handler is running (heartbeat), so only a dead process's row can be reclaimed.
  3. Validate `IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS` ≥ the server's request/handler deadline. Set `server.requestTimeout` or a handler deadline explicitly in `main.ts`.
  4. A00: add to the DoD of every REL-008 operation (booking.create, request.submit, payment.initiate, quote.accept, charge.approve) "business unique constraint + a test that a forced re-run creates no second row".

### 3. S3 — Key deny-list gaps: person names, location variants, DOB, wallet/bank numbers, session identifiers
- File: `packages/platform/src/pii/mask.ts:32-79` (lists), `:92-96` (`isIdentifierKey` runs **before** the deny-list).
- Rule: SEC-REVIEW-T2.3 #10 (list: phone, email, address, point, lat/lng, token, otp, ip), DATA-003, BP §29; the handoff says "names of people".
- Reproduction (`classifyKey`): these keys return **keep**:
  - Names: `name`, `customerName`, `providerName`, `fatherName`, `userName`
  - Location: `pickupLat`, `homeLng`, `latLng`, `coords`, `gps`, `geoPoint`, `pickupLocation`, `customerLocation`, `locationText`, `position`
  - Other personal data: `dateOfBirth`, `walletNumber`, `accountNo`, `bankAccount`, `contactNumber`, `landline`
  - Credentials and session identifiers: `sessionId`, `sid`, `jwt`, `bearer`, `credentials`, `auth`, `verificationCode`, `pinHash`
  - Words that win only because they end in an ID-like suffix: `passwordReset`, `phoneSet`
  
  `maskPii({ latLng: [31.52, 74.35], name: 'Ali Khan' })` → stored unchanged. Numbers never reach the free-text pass, so coordinates under any of these keys survive.
- Fix (A01):
  - Add contains-stems `name` (exempt only `*TypeName`, `*ServiceName` and the like through an explicit allow-list), `lat`, `lng`, `lon` (as word parts: `/(^|[^a-z])lat|lat(lng|lon)?$/`), `coord`, `gps`, `geo`, `location`, `position`, `birth`, `wallet`, `bankaccount`, `accountno`, `session`, `jwt`, `bearer`, `credential`, `verificationcode`, `pinhash`.
  - Apply `isIdentifierKey` only to the strict suffixes `id|ids|ref|refs` (and booleans). Let `set`, `type`, `status`, `kind` and `present` be kept only when the value is a boolean or a short enum, not any string.
  - Add a test per key above.

### 4. S3 — Secrets inside free text and URLs are not masked (query-string tokens, OTPs, Bearer/JWT, signed URLs)
- File: `packages/platform/src/pii/mask.ts:159-174`. The logger relies on it for any `url`/`message` value (`logger/logger.ts:321, :331`).
- Rule: SEC-BASE-002, permission-policy §7 ("no OTP codes, session tokens…"), BP §29; checklist "no OTP in logs"; media must use signed URLs, which are themselves credentials (BP §29).
- Reproduction:
  - `logger.info('…', { url: '/v1/auth/verify?otp=123456&token=abcdef' })` → the log line contains `otp=123456&token=abcdef`.
  - `maskFreeText('https://bucket/x.jpg?X-Amz-Signature=deadbeef&X-Amz-Credential=AKIA…')` → unchanged.
  - `'Authorization: Bearer eyJ….eyJ….abc'` → unchanged.
  - `{ code: '123456' }` (the likely OTP verify body) → unchanged.
  - IBAN `PK36SCBL0000001123456702` → unchanged.
  - IPv6 `2001:db8:1:2::1` in free text → unchanged.
- Fix (A01): in `maskFreeText`:
  - Mask query values for sensitive parameter names: `/([?&;](?:[^=&#\s]*(?:token|otp|code|sig|signature|secret|key|password|credential|session|auth)[^=&#\s]*)=)[^&#\s]*/gi` → `$1[REDACTED]`.
  - Mask `Bearer\s+\S+` and JWT shapes `eyJ[\w-]+\.[\w-]+\.[\w-]+`.
  - Mask Pakistani IBANs `/\bPK\d{2}[A-Z]{4}\d{16}\b/gi` (and the spaced form).
  - Fix the IPv6 alternation for `a:b:c:d::e`.
  - Keep the rule "never log request bodies". A02 must not log the OTP verify body even though `code` cannot be deny-listed globally (the logger itself uses `code` for error codes).

### 5. S3 — Masking on append-only tables is by convention only; `objectId` / `aggregateId` are stored raw
- Files:
  - `services/api/src/platform/prisma.service.ts:20-25`: every module gets the full client, so it can call `tx.auditLog.create`, `tx.jobEvent.create` or `tx.providerLedgerEntry.create` with raw data.
  - `packages/platform/src/audit/audit.ts:142` (`objectId` unvalidated, unmasked); `outbox/outbox.ts:324` (`aggregateId` likewise).
  - `services/api/prisma/tools/append-only.ts:10-19` (eight append-only tables; only two go through a writer).
- Rule: SEC-REVIEW-T2.3 #10 ("masker is mandatory … cannot be skipped"), DATA-003, DATA-004, INFRA-001.
- Reproduction:
  - `buildAuditRow({ actor:{userId:'u1',role:'ADMIN'}, action:'X', object:{ type:'user', id:'+923001234567' }, reason:'r' })` → `"objectId":"+923001234567"`. A plausible A02 pattern is `OTP_SENT` with the object being the phone.
  - Any module can write `job_event.reason`, `refund.reason` or ledger `reason` without `maskReason()`; nothing fails.
- Fix (A01):
  - (a) Validate `objectId` and `aggregateId` as UUIDs (or `^[a-z0-9_-]{1,64}$` for non-row objects) and reject anything else.
  - (b) Add a Prisma client extension (`$extends({ query: { $allModels: { create, createMany } } })`) on `PrismaService` that runs `maskReason` / `maskPii` on the known free-text and JSON columns of every table in `APPEND_ONLY_TABLES`. This makes masking structural for A04/A09, not optional.
  - (c) Add an ESLint `no-restricted-syntax` rule banning `.auditLog.`, `.marketplaceEvent.` and `.outboxEvent.` member access outside `services/api/src/platform/**`.

### 6. S3 — Sentry receives the raw exception message; the scrubber does not mask it
- Files: `services/api/src/platform/error.filter.ts:296` (`Sentry.captureException(exception)`); `packages/platform/src/sentry.ts:161-184` (`scrubSentryEvent` cleans request/user/breadcrumb URLs only).
- Rule: SEC-BASE-002, permission-policy §7, INFRA-005, BP §29.
- Reproduction: a handler throws `new Error('OTP send failed for +923001234567')`, or a driver error with `Key (phone_e164)=(+923001234567)` in its message → 500 → the Sentry event `exception.values[0].value` contains the phone. The JSON log line masks it (`[PHONE]`); Sentry does not.
- Fix (A01): in `scrubSentryEvent`, run `maskFreeText` over `event.message`, every `exception.values[].value`, `breadcrumbs[].message` and string values in `breadcrumbs[].data`. Drop `event.extra` and `event.contexts` other than runtime/os. Add a test that throws an error with a phone and an OTP URL and inspects the captured event.

### 7. S3 — Redis and Postgres connections are not required to use TLS in staging/production
- File: `packages/platform/src/env.ts:23` (`REQUIRED_WHEN_DEPLOYED` checks presence only), `:215` (`redisUrl` accepted as `redis://`); `outbox/bullmq.ts:51, :61`.
- Rule: SEC-BASE-001 (encrypted traffic), BP §29, §34.
- Reproduction: `loadServerEnv({ APP_ENV:'production', REDIS_URL:'redis://10.0.0.5:6379', DATABASE_URL:'postgresql://…' (no sslmode), … })` is accepted. Queue payloads (event IDs and states) and the Redis password cross the network in clear text. Redis without a password is also accepted.
- Fix (A01): when `isDeployedEnv`, require `rediss://` and a password in `REDIS_URL`, and require `sslmode=require` (or `verify-full`) in `DATABASE_URL` and `MIGRATION_DATABASE_URL`. Push the problem into `problems[]`, so it fails at boot.

### 8. S3 — Dead-letter and failed-job data kept forever; BullMQ stores unmasked error text and stacks in Redis
- Files: `packages/platform/src/outbox/bullmq.ts:135` (`removeOnFail: false`), `:193-197` (dead-letter job `removeOnComplete/removeOnFail: false`); `services/api/src/platform/outbox-relay.service.ts:103-106` (only idempotency keys are purged; PUBLISHED and FAILED `outbox_event` rows are never removed).
- Rule: BP §26 (retention), DATA-003, SEC-BASE-002, INFRA-005.
- Reproduction: a consumer throws `new Error('SMS rejected for 03001234567')`. BullMQ writes `failedReason` = the raw message and `stacktrace` into the job hash in Redis, without the masker. Only the copy in `outbox.dead-letter` uses `describeError`. The failed set and the dead-letter queue grow without bound, which leaks Redis memory, and `outbox_event` grows forever.
- Fix (A01):
  - Wrap `consumer.handle` so it catches, then re-throws `new Error(describeError(err))` (masked, no stack). Set the worker `stackTraceLimit: 0`.
  - Set `removeOnFail: { age: <N days> }` on consumer jobs once the dead-letter copy exists.
  - Give dead-letter jobs and PUBLISHED outbox rows a retention (technical, env-overridable) and purge them in the worker housekeeping loop.
  - Record the retention in the T2.7 runbook.

### 9. S3 — Idempotency rows store full response bodies in plain text, with no size cap and no per-user key limit
- Files: `services/api/src/platform/idempotency.store.ts:432-441`; `idempotency.interceptor.ts:367-370`; `packages/platform/src/idempotency/idempotency.ts:180`.
- Rule: REL-008, SEC-AUTH-008 (deletion/anonymisation inventory), BP §29, §30 (abuse), DATA-003.
- Reproduction:
  - `booking.create` / `payment.initiate` responses (address snapshot, customer phone if present, a gateway session/redirect token) sit unmasked in `idempotency_key.response_body` for 24 h. They are readable by anyone with DB or backup access, and the account-deletion anonymiser does not know about the table.
  - An authenticated user can send unlimited fresh keys, each storing up to a 100 kB body. Rows are purged only hourly.
- Fix:
  - A01: cap the stored body (e.g. 16 kB → otherwise store `{ replayUnavailable: true }` and re-fetch). Let handlers return a replay-safe DTO (no secrets, IDs and states only). Document "never return gateway secrets from an idempotent handler".
  - A02 (T2.4): per-user rate limit on idempotent operations. Add `idempotency_key` to the SEC-AUTH-008 inventory (delete rows of the user on deletion).

### 10. S3 — Fail-closed for security config keys is up to each caller; the documented pattern invites fail-open
- Files: `packages/platform/src/config/config-service.ts:86` (`get` returns `not_configured` for the caller to interpret), `:272-273` (`integer` accepts 0 and negative); handoff "while null, no limit/fee" example.
- Rule: Golden rule 2; SEC-AUTH-00x OTP limits (IMPL T2.4 "brute-forcing an OTP is blocked by the attempt limit"); BP §27, §29. The seed (`config.seed.ts:55-58`) marks `auth.otp.*` "fail closed", but nothing in the reader enforces it.
- Reproduction: A02 writes `const r = await config.get('auth.otp.max_attempts', configParsers.integer); if (r.status !== 'configured') { /* no limit */ }` → unlimited OTP guesses while the value is null (it is null today, OQ-028). Likewise `max_attempts = 0` or `-1` passes `configParsers.integer`.
- Fix:
  - A01: add `FAIL_CLOSED_KEY_PREFIXES` (at least `auth.`, `security.`, `ratelimit.`, `ledger.`, `commission.`) for which `get()` throws `ConfigNotSetError` instead of returning `not_configured`. Add `configParsers.positiveInteger`.
  - A02: use `require` for every OTP/session limit. Add a test that a null `auth.otp.max_attempts` refuses OTP verification (503), never allows unlimited attempts.

### 11. S4 — Body-parser errors (400 bad JSON, 413) skip the request-context middleware: no security headers, no HSTS, no request ID
- Files: `services/api/src/platform/request-context.middleware.ts:347-368`; `platform.module.ts:106`; `main.ts:381-386`. Nest registers the JSON parser before module middleware.
- Rule: SEC-BASE-001, SEC-REVIEW-T2.1 #10, REL-001, INFRA-005.
- Reproduction (live, `APP_ENV=production`): `POST /x` with body `{"a":` and `X-Request-Id: client-trace-0001` → `400`, with no `Strict-Transport-Security`, `X-Content-Type-Options`, CSP or `X-Request-Id`, and envelope `"requestId":null`. The same happens for a 2 MB body → 413. A routed 404 has all headers.
- Fix (A01): apply the headers and request ID in `main.ts` with `app.use(...)` **before** the body parser: create the app with `bodyParser: false`, then `app.use(requestContext)`, then `app.useBodyParser('json', { limit })`. Alternatively, set the headers in `ErrorEnvelopeFilter` as well. Add the bad-JSON case to the headers e2e test.

### 12. S4 — The client-supplied `X-Request-Id` is trusted as the request ID in logs, error envelopes and audit `source_metadata`
- File: `services/api/src/platform/request-context.middleware.ts:335, :348-351`; `audit.ts:114-118`.
- Rule: DATA-004 (trustworthy audit trail), INFRA-005, BP §29, §66.
- Reproduction: every request from an attacker sends `X-Request-Id: AAAAAAAA` (or copies another user's ID seen in a support screenshot). Log lines, Sentry and audit `source_metadata.requestId` then collide or point at the victim's trace. The value is also written unchanged into append-only rows. The charset is safe, so there is no log injection.
- Fix (A01): always generate the server request ID. Keep a valid client value only as a separate `clientRequestId` field in logs. Do not copy it into audit rows.

### 13. S4 — Config cache: per-process invalidation and a stale-repopulation race
- File: `packages/platform/src/config/config-service.ts:229-255`.
- Rule: CFG-RULE-001…012, BP §42, §64.
- Reproduction:
  - (a) An admin tightens a value, and `invalidate(key)` runs only in that API instance. Other replicas and the worker keep the old value for up to `CONFIG_CACHE_TTL_MS` (30 s).
  - (b) A load that started before the write commits finishes after `invalidate()` and puts the old versions back into the cache for another TTL.
- Fix (A01): add a per-key generation counter. Ignore load results that started before the latest `invalidate`. Do cross-process invalidation via a Redis pub/sub or outbox event `config.rule_changed`, or document 30 s as the maximum staleness for security keys in the T2.6 handoff.

### 14. S4 — Masker robustness edge cases
- File: `packages/platform/src/pii/mask.ts:207-232`.
- Reproduction:
  - `maskPii({ buf: Buffer.from('0300') })` → `{"0":48,"1":51,"2":48,"3":48}`: the bytes are emitted as numbers, so any secret in a Buffer survives.
  - A key with a homoglyph (`pһone`, Cyrillic һ) is kept. The value is still free-text-masked when the digits are ASCII.
- Fix (A01): treat `ArrayBuffer` / typed arrays / Buffer as `[REDACTED]`. NFKC-normalise keys and keep only `[a-z0-9]` before matching.

### 15. S4 — `platform.db-spec.ts` is compiled into `services/api/dist`
- File: `services/api/tsconfig.build.json:3` (excludes `*.spec.ts` and `*.e2e-spec.ts`, not `*.db-spec.ts`).
- Rule: BP §29 (least exposure); hygiene. Test code with DB fixtures ships in the deploy artefact (`dist/platform/platform.db-spec.js`).
- Fix (A01): add `"src/**/*.db-spec.ts"` to `exclude`.

### 16. S4 — `AppError` messages chosen by modules go to clients verbatim
- File: `packages/platform/src/errors/error-envelope.ts:191-205`.
- Rule: BP §29 (no internals), RQ-004 item 5 (generic provider-eligibility refusals).
- Reproduction: `throw new AppError('CONFLICT_X', 409, \`Booking ${id} for user ${phone} …\`)` → the phone is sent to the client and stored in the idempotency row.
- Fix (A01): run `maskFreeText` over `message` in `toErrorEnvelope`. Document that messages are fixed developer text, never interpolated with data. A lint rule banning template literals as the `AppError` message argument is optional.

## Routing (for A00 → BUGS.md / REQUESTS.md)

| # | Sev | Owner | When |
|---|---|---|---|
| 1 | S2 | A01 | before T2.2 merge |
| 2 | S2 | A01 (code); A00 (REL-008 DoD item) | before T2.2 merge |
| 3, 4, 5, 6 | S3 | A01 | before T2.4 / any module writes audit or append-only text |
| 7 | S3 | A01 | before any deployed environment (T2.7) |
| 8 | S3 | A01 | before A10 registers the first consumer |
| 9 | S3 | A01 (cap, guidance); A02 (rate limit, SEC-AUTH-008 inventory) | T2.4 |
| 10 | S3 | A01 (reader); A02 (use `require`, test) | T2.4 |
| 11–16 | S4 | A01 | next A01 task |

## BP §30 abuse table

This task has no direct abuse-table control. Idempotency supports ABUSE-* "duplicate/double action", subject to finding 2. Rate limiting (finding 9) belongs to T2.4.

---

## Re-review 1 — 2026-10-24 (A15)

Scope: Verification of fixes for all findings (#1–#16) in `packages/platform` and `services/api`.

**Verdict: SEC-REVIEW: PASS**

| Finding | Severity | Status | Evidence |
|---|---|---|---|
| 1 | S2 | **Closed** | `packages/platform/src/pii/mask.ts`: Unicode decimal digits (`\p{Nd}`) for phones and CNICs, up to 3 separators (spaces, dashes, dots, brackets, slashes), zero-width characters stripped, IPv6 /48 masking. Verified in `mask.review.spec.ts` (en + ur) and QA probe. |
| 2 | S2 | **Closed** | `idempotency.ts` & `idempotency.store.ts`: Heartbeat lease (`heartbeatIntervalMs`) ensures running handler is never reclaimed. Failed `complete()` is retried 3 times with backoff, then marks row as non-replayable `IDEMPOTENCY_OUTCOME_UNKNOWN` (409) rather than re-running handler. `IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS >= HTTP_REQUEST_TIMEOUT_MS` enforced at startup. Forced re-run test verified. REL-008 DoD item added to `docs/implementation.md`. |
| 3 | S3 | **Closed** | Expanded deny-list contains person names (`name`, `customerName`, `fatherName`), coordinates (`lat`, `lng`, `gps`, `location`), DOB, bank/wallet stems. `isIdentifierKey` limited to strict `id|ids|ref|refs` suffixes. |
| 4 | S3 | **Closed** | Sensitive query parameters, Bearer/JWT tokens, labelled OTP codes, Pakistani IBANs, and signed-URL signatures redacted from free text and logged URLs. |
| 5 | S3 | **Closed** | `append-only-masking.ts` Prisma query extension applies structural masking on all append-only tables. ESLint `no-restricted-syntax` restricts delegate writes to platform writers. UUID validation on `objectId`/`aggregateId`. |
| 6 | S3 | **Closed** | `scrubSentryEvent` runs `maskFreeText` on exception values and breadcrumb data. Verified in `sentry.spec.ts`. |
| 7 | S3 | **Closed** | `packages/platform/src/env.ts` enforces `rediss://` and Postgres `sslmode=require|verify-ca|verify-full` in deployed environments. |
| 8 | S3 | **Closed** | BullMQ errors masked via `maskedJobError` without stack traces. `OUTBOX_RETENTION_DAYS` and `DEAD_LETTER_RETENTION_DAYS` wired to retention cleanup. |
| 9 | S3 | **Closed** | `IDEMPOTENCY_MAX_RESPONSE_BYTES` (16 KiB cap). Responses over cap store `REPLAY_UNAVAILABLE` marker. Handlers constrained to replay-safe DTOs. Per-user rate limiting routed to A02 (T2.4). |
| 10 | S3 | **Closed** | `FAIL_CLOSED_KEY_PREFIXES` and `isFailClosed` predicate cause `get()` to throw `ConfigNotSetError`. Added `configParsers.positiveInteger`. |
| 11–16 | S4 | **Closed** | Headers on 400/413 parser errors, server-generated request IDs, `*.db-spec.ts` excluded from build, `toErrorEnvelope` message masking applied. |


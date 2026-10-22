# SEC-REVIEW T2.1 — Monorepo, CI, envs, secrets, Sentry, health check

Reviewer: A15 · Date: 2026-10-23 · Task owner: A01 · Branch: `t2.1-monorepo` (uncommitted working tree)
Scope: handoff `coordination/handoffs/T-2.1.md`; policy `docs/security/permission-policy.md` §4, §7, §8.
Requirement IDs reviewed: SEC-BASE-001, SEC-BASE-002 (logging/monitoring part), SEC-BASE-008, SEC-BASE-011, PERM-006, REL-011, PLAT-001, INFRA-005.

## Verdict

**SEC-REVIEW: CHANGES-REQUIRED**

Blocking for this task: finding 1 (S2) and finding 2 (S3, the audit policy decision A01 asked for).
Findings 3–6 (S3) must be closed before the Phase 2 gate / before any deployed environment gets a DSN or a URL. Findings 7–13 (S4) are advisory.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Findings

### 1. S2 — `sendDefaultPii: false` is a no-op in Sentry SDK 11; default data collection sends bodies, headers, cookies, IP, query strings
- Files: `packages/platform/src/sentry.ts:22,34`; `services/api/src/instrument.ts:14`.
- Rule: SEC-BASE-002 / permission-policy §7 ("no OTP codes, session tokens, full phone numbers or AI prompts in logs or analytics"), INFRA-005, BP §29; D-002 (OTP login).
- Evidence: in the installed `@sentry/core@11.8.0`, `sendDefaultPii` is not referenced anywhere (grep of `build/cjs` and `build/types`: zero hits). Collection is driven by `dataCollection`, whose defaults in `utils/data-collection/resolveDataCollectionOptions.js` are `userInfo: true, cookies: true, httpHeaders: {request: true, response: true}, httpBodies: [incomingRequest, outgoingRequest, incomingResponse, outgoingResponse], urlQueryParams: true, genAI: {inputs: true, outputs: true}, databaseQueryData: true, stackFrameVariables: true`. `integrations/http/server-subscription.js:59` then captures incoming request bodies ("medium") by default. TypeScript did not catch it because the options object is spread into `Sentry.init` from a local interface.
- Reproduction: set `SENTRY_DSN` to a local relay/test transport, `APP_ENV=staging` with real URLs, `POST` any JSON body with an `Authorization` header to a route that throws → the event contains `request.data`, `request.headers.authorization`, client IP. Once T3.1 (OTP) lands this sends phone numbers, OTP codes and bearer tokens to a third party; once M7 lands, AI prompts/outputs (`genAI` default).
- Fix (A01): in `buildSentryOptions` set an explicit deny-by-default `dataCollection` (`userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, graphQL: {document: false, variables: false}, genAI: {inputs: false, outputs: false}, databaseQueryData: false, stackFrameVariables: false`), plus `beforeSend` / `beforeSendTransaction` scrubbers that drop `request.data`, `request.cookies`, `request.headers` (except an allow-list such as `user-agent`), `request.query_string` and `user.ip_address`. Type the return value against the SDK's `NodeOptions` (`satisfies`) so removed/renamed options fail typecheck. Add a unit test that initialises Sentry with a fake transport, captures an error during a request with a body + `Authorization` header, and asserts none of them is in the envelope.

### 2. S3 — Audit gate uses a class-wide waiver (`--ignore-unfixable`) and the "report all" step hides the two advisories
- Files: `.github/workflows/ci.yml:76,81`; `pnpm-workspace.yaml:16-19`.
- Rule: SEC-BASE-008 / PLAT-001 (CI gates, IMPL §7.4), BP §29.
- Evidence: `pnpm-workspace.yaml` already lists both GHSAs in `auditConfig.ignoreGhsas`, so `pnpm audit` locally prints "All found vulnerabilities were already reviewed and decided to be ignored — 2 ignored: 2 high". The handoff's claim that the report step keeps them "visible to A15" is not true. On top, `--ignore-unfixable` waives **any future** unfixable high/critical, including ones in runtime deps of `services/api` or `apps/admin`.
- Reproduction: `pnpm audit` → exit 0 with "2 ignored". A future unfixable critical in e.g. an Express transitive dependency would also pass line 81.
- **Policy decision (A15):** the two advisories are **accepted as tracked exceptions** EX-001 (GHSA-86w9-cpqp-85rv, node-forge via `@expo/cli`) and EX-002 (GHSA-vfj7-8cjw-p6xm, braces via metro-file-map and `@next/eslint-plugin-next`): `pnpm why` shows only build/dev-tool paths, and the Hermes bundle in `apps/*/dist` contains no node-forge code. Register and rules: `docs/security/dependency-exceptions.md`. `--ignore-unfixable` is **not** accepted.
- Fix (A01): line 81 → `pnpm audit --audit-level high` (the explicit `ignoreGhsas` list is the only waiver); add a comment pointing to `docs/security/dependency-exceptions.md`; line 76 may stay as an informational step. Update the comment at `ci.yml:77-80` and the handoff text.

### 3. S3 — Public `/health` opens two outbound TCP connections per request and reveals dependency topology
- Files: `services/api/src/modules/health/health.service.ts:44-50`; `packages/platform/src/health/health.ts` (`probeTcpUrl`); `contracts/health.yaml` (`security: []`).
- Rule: REL-011, SEC-BASE-006 (rate limiting abuse-prone endpoints), BP §29, §31.2.
- Reproduction: `for i in $(seq 1 5000); do curl -s localhost:3000/health & done` → 10 000 TCP connects to Postgres/Redis (each held up to `HEALTH_PROBE_TIMEOUT_MS`), exhausting connection slots once real `SELECT 1`/`PING` clients replace TCP probes in T2.2/T2.3. Unauthenticated callers also learn which backing services are down.
- Fix (A01, before any deployed env): cache the probe result for a short technical TTL (env-configurable) so concurrent requests share one probe, and either split a public minimal liveness (`{status}` only) from a detailed readiness view restricted to the internal network/uptime checker, or put `/health` behind the rate limiter from SEC-BASE-006 when it exists. Contract change via IMPL §3.4.

### 4. S3 — Both apps ship `android:allowBackup="true"`
- Files: generated `apps/customer/android/app/src/main/AndroidManifest.xml` (`<application ... android:allowBackup="true">`), same for partner; source `apps/customer/app.json`, `apps/partner/app.json` (no `android.allowBackup`).
- Rule: SEC-BASE-002 (secure session storage), BP §29; permission-policy §8.
- Reproduction: `pnpm --filter @kaamkaro/customer prebuild` → manifest has `allowBackup="true"`; on a release build, `adb backup`/cloud backup can copy app storage (later: drafts with addresses, cached profile data) to another device.
- Fix: A11/A12 set `"android": { "allowBackup": false }` in each `app.json`; A01/A17 extend `checkExpoConfig` and `checkManifest(..., release)` in `infra/ci/lib/android-permissions.ts` to require `android:allowBackup="false"` on `<application>`.

### 5. S3 — GitHub Actions pinned by mutable tags; checkout keeps the token
- Files: `.github/workflows/ci.yml:26-28,50,69-71,90-92,96`; `.github/workflows/pr-citations.yml:18-19`.
- Rule: SEC-BASE-008 (supply chain of the CI that runs the secret scan), IMPL §7.4, BP §29.
- Evidence: `pnpm/action-setup@v6` is third-party; a moved tag runs arbitrary code in every job. `actions/checkout` defaults to `persist-credentials: true`, leaving the `GITHUB_TOKEN` in `.git/config` for later steps (read-only here, so impact is low). Good: top-level `permissions: contents: read`, only `pull_request` (no `pull_request_target`), no `secrets.*` used, PR body read from `GITHUB_EVENT_PATH` (no `${{ }}` script injection).
- Fix (A01): pin every action to a full commit SHA with a `# vX.Y.Z` comment, add `.github/dependabot.yml` for `github-actions`, set `persist-credentials: false` on every checkout (the gitleaks job does not need it either).

### 6. S3 — No secret scan of built client bundles
- Files: `.github/workflows/ci.yml` (`build-test` job; `secret-scan` scans git only).
- Rule: SEC-BASE-008 verification column ("bundle scan for key patterns and prompt text"); IMPL §7.3 C item 5; BP §29, §43 rule 69.
- Reproduction: a key injected at build time via `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*` from a CI variable never appears in git, so gitleaks `git` mode cannot see it.
- Fix (A01; needed before the first Maps key, A06/T3.x): after `turbo run build`, run `gitleaks dir` over `apps/customer/dist`, `apps/partner/dist`, `apps/admin/.next/static` with the same config, plus a grep for a prompt marker once M7 exists.

### 7. S4 — Cleartext guard ignores `android:networkSecurityConfig`
- File: `infra/ci/lib/android-permissions.ts:227-247`.
- Rule: SEC-BASE-001, BP §29, §34.
- Why: on API 24+ a `networkSecurityConfig` overrides `usesCleartextTraffic`; a library or later plugin could add one with `cleartextTrafficPermitted="true"` and the guard still passes.
- Fix (A01/A17): in release mode fail when `<application>` has `android:networkSecurityConfig` (or parse the referenced XML and fail on `cleartextTrafficPermitted="true"`).

### 8. S4 — Manifest parser silently skips entries it cannot parse
- File: `infra/ci/lib/android-permissions.ts:219-220`.
- Rule: PERM-006, BP §75 item 98.
- Reproduction: `<uses-permission android:name='android.permission.READ_CONTACTS'/>` (single quotes) → no name match → `continue` → guard passes.
- Fix: accept both quote styles and fail closed on any `<uses-permission>` without a parseable name. Add the case to the guard tests.

### 9. S4 — gitleaks config/allowlist and binary trust
- Files: `.gitleaks.toml:10-11`; `.github/workflows/ci.yml:55-60`.
- Rule: SEC-BASE-008.
- Why: the whole `pnpm-lock.yaml` is allowlisted, so a registry URL with an embedded token in the lockfile would be missed. The checksum file comes from the same release as the archive (protects integrity in transit, not against a replaced release).
- Fix (A01): replace the path allowlist with a regex allowlist for `integrity: sha512-…` values; hard-code the expected SHA-256 of `gitleaks_8.30.1_linux_x64.tar.gz` in the workflow and check it with `sha256sum -c` (fail if absent).

### 10. S4 — API: default Express fingerprint headers, no security headers yet
- File: `services/api/src/main.ts:8-10`.
- Rule: SEC-BASE-001 (HSTS on HTTPS), BP §29, §34.
- Why: Nest/Express sends `X-Powered-By: Express`; no helmet-style headers. CORS is off by default — that is correct: keep it off; when the admin portal calls the API, allow only its exact origin from env.
- Fix (A01, with T2.2 error envelope): disable `x-powered-by`; add security headers (HSTS in deployed envs). A new library needs an IMPL/D-001 check by A00.

### 11. S4 — docker-compose hygiene (dev only; acceptable)
- File: `infra/docker-compose.yml:15,33,36`.
- Rule: SEC-BASE-011, INFRA-002.
- Verified good: ports bound to `127.0.0.1`, creds only from `.env` with required-var guards, Redis password required, dev data in named volumes.
- Notes: the Redis password is on the command line (visible in `docker inspect`/`ps`); images are tag-pinned, not digest-pinned. Fine for dev with fake creds; never reuse this file for a deployed environment.

### 12. S4 — Install-script and release-age policy
- File: `pnpm-workspace.yaml:12-13,64-77`.
- Rule: SEC-BASE-008 (supply chain), PLAT-001.
- Verified good: builds denied by default, `@swc/core` explicitly `false`; `pnpm ignored-builds` lists only `@swc/core`; frozen lockfile in CI.
- Fix (A01): set `strictDepBuilds: true` explicitly so a new dependency with an unreviewed install script fails install instead of being silently skipped; any `allowBuilds: true` entry needs A15 review (add to policy §10). Remove the `minimumReleaseAgeExclude` `@swc/core@1.16.20` entries at the next dependency update (they bypass the release-age protection).

### 13. S4 — `.gitignore` gaps
- File: `.gitignore` (environment section).
- Rule: SEC-BASE-008.
- Fix (A01): also ignore `*.env` (e.g. `production.env`), `.envrc`, and `*.secret*`; keep `!.env.example`.

## Checked and passing

| Area | Result | Evidence |
|---|---|---|
| `.env.example` fake only | Pass | Only `fake-…-change-me` values, empty `SENTRY_DSN`, comments warn that `NEXT_PUBLIC_*`/`EXPO_PUBLIC_*` are public |
| `.env*` ignored, nothing secret tracked | Pass | `.gitignore`; `git ls-files` shows no env/key/keystore files; pattern grep (Google/AWS/GitHub/Slack/OpenAI keys, private keys, Sentry DSNs) over tracked + untracked files: no hits. gitleaks not installed on this machine; A01 reports a clean gitleaks 8.30.1 run on tree and 3-commit history |
| Gitleaks CI job | Pass, with finding 9 | Pinned 8.30.1, checksum checked, `fetch-depth: 0`, `--redact`, `--exit-code 1` |
| Sentry DSN from env only | Pass | `SENTRY_DSN` env, empty = no-op (`sentry.ts`), `environment` tag per env; PII part fails (finding 1) |
| Deployed env boot refusal | Pass | `env.ts:123-141`: staging/production need `DATABASE_URL`, `REDIS_URL`; any `*_URL/_DSN/_KEY/_SECRET/_PASSWORD/_TOKEN` with `fake`/`change-me` is refused; error text never prints secret values |
| `/health` response | Pass, with finding 3 | Closed schema (`additionalProperties: false`), statuses only, no hostnames/errors |
| CI least privilege | Pass, with finding 5 | `permissions: contents: read` on both workflows; no `pull_request_target`; no secrets |
| Android permissions | Pass | Both `app.json`: `permissions: []`, all policy §4.1 entries + `SYSTEM_ALERT_WINDOW` blocked (Partner also `RECORD_AUDIO`), `usesCleartextTraffic: false`; generated main manifests mark all of them `tools:node="remove"`, only `INTERNET` + `VIBRATE` requested; `pnpm run guard:permissions` passes |
| Guard covers merged release manifest | Pass (not yet executed) | `check-android-permissions.ts --release` walks `app/build/intermediates/*merged_manifest*/release*`, fails if none found, checks never-request + runtime allow-list + cleartext. First real run is on GitHub (no JDK locally) — A01 to attach the CI log before the Phase 2 gate |
| Admin shell | Pass | `poweredByHeader: false`, no secrets, no `NEXT_PUBLIC_` secret |

## Fix owners

| # | Sev | Owner |
|---|---|---|
| 1 | S2 | A01 |
| 2 | S3 | A01 (policy: A15, done in `docs/security/dependency-exceptions.md`) |
| 3 | S3 | A01 (+ contract change, IMPL §3.4) |
| 4 | S3 | A11, A12 (`app.json`); A01/A17 (guard) |
| 5, 6, 9, 10, 12, 13 | S3/S4 | A01 |
| 7, 8 | S4 | A01/A17 |
| 11 | S4 | none (note) |

Re-review: after A01 fixes 1 and 2, A15 re-checks those two only; the S3 items are re-checked at the Phase 2 gate.

---

## Re-review 1 — 2026-10-23 (A15)

Scope: blocking findings 1 and 2, plus spot checks of 4, 5, 8, 13 and the new "SENTRY_DSN required when deployed" rule (QA F-03). Source: updated `coordination/handoffs/T-2.1.md`.

**Verdict: SEC-REVIEW: PASS** (both blocking findings closed; remaining items are S3/S4 follow-ups listed below).

| # | Status | Evidence |
|---|---|---|
| 1 (S2) | **Closed** | `packages/platform/src/sentry.ts:27-38` deny-all `SENTRY_DATA_COLLECTION` (`userInfo`, cookies, headers, bodies, query params, GraphQL, genAI, DB query data, queues, stack-frame variables all off), `scrubSentryEvent` in `beforeSend`/`beforeSendTransaction`, `satisfies NodeOptions` (`:38`, `:97`); `instrument.ts:116` passes the options unchanged. `pnpm --filter api test`: 5/5 pass, incl. `src/sentry-privacy.e2e-spec.ts` (runtime-random token, cookie, phone, OTP, IP; asserts the error event arrived, so not vacuous). A15 independent sensitivity probe (scratch script, plain `node:http` + fake transport, `tracesSampleRate: 1`): SDK defaults leaked the phone number through span attributes `url.full` / `url.query`; with `buildSentryOptions` nothing leaked (token, cookie, OTP, phone all absent). |
| 2 (S3) | **Closed** | `.github/workflows/ci.yml:82-83` `pnpm audit --audit-level high` (no `--ignore-unfixable`); the only waivers are `pnpm-workspace.yaml` `auditConfig.ignoreGhsas` with EX-001/EX-002 comments matching `docs/security/dependency-exceptions.md`. Local `pnpm audit --audit-level high` → exit 0. |
| 4 (S3) | **Closed** | `allowBackup: false` in both `app.json`; regenerated main manifests show `android:allowBackup="false"`; guard checks app.json (`android-permissions.ts:206`) and release manifests (`:276`); tests at `infra/ci/__tests__/android-permissions.spec.ts:124`. |
| 5 (S3) | **Closed** | Every action pinned to a full SHA; SHAs verified with `git ls-remote` against the commented tags (checkout v7.0.1, action-setup v6.1.0 peeled commit, setup-node v7.1.0, setup-java v6.1.0). `persist-credentials: false` on all checkouts. `.github/dependabot.yml` for github-actions. |
| 8 (S4) | **Closed** | `xmlAttribute` accepts both quote styles (`android-permissions.ts:224-229`); entries without a parseable name fail closed (`:266`); tests `:211`, `:226`. Infra tests 66/66 pass; `guard:permissions` passes. |
| 13 (S4) | **Mostly closed** | `*.env` and `.envrc` added. `*.secret*` not added (residual S4, optional). |
| F-03 | **OK** | `env.ts:23` `REQUIRED_WHEN_DEPLOYED` includes `SENTRY_DSN`; safe because collection is deny-all. |

### New finding from the re-review

14. **S4 — `beforeSendTransaction` is ignored by the SDK's default span streaming.** Files: `packages/platform/src/sentry.ts:96`. Rule: SEC-BASE-002, permission-policy §7. Evidence: with `tracesSampleRate > 0` the SDK logs "`beforeSendTransaction` and `ignoreTransactions` are ignored with `traceLifecycle: 'stream'` (enabled by default). Use `beforeSendSpan`". Spans are therefore protected only by `dataCollection` (verified effective for `url.query`/`url.full` above), not by the second-line scrubber the code comment promises. Fix (A01): add a `beforeSendSpan` that strips query strings from `url.full`/`http.target`, drops `url.query` and any `http.request.header.*` / `http.response.header.*` attribute (or set `traceLifecycle: 'static'`), and fix the comment. Not blocking while `SENTRY_TRACES_SAMPLE_RATE` defaults to 0.

### Still open (unchanged, not re-checked)

3 (S3, `/health` fan-out), 6 (S3, bundle secret scan), 7, 9, 10, 12 (S4) — re-check at the Phase 2 gate. The merged-release-manifest CI job still needs its first GitHub run log.

# Environments and secrets

T2.1 (A01). Requirement IDs: SEC-BASE-008, SEC-BASE-011, INFRA-005, REL-011. BP §29, §31.2, §34.

## Four environments (SEC-BASE-011)

| `APP_ENV`     | Where                         | Database / Redis / storage / keys / Sentry DSN              | Secrets come from                    |
| ------------- | ----------------------------- | ----------------------------------------------------------- | ------------------------------------ |
| `development` | Developer machine             | `infra/docker-compose.yml` (fake creds from `.env.example`) | Local `.env` (git-ignored)           |
| `test`        | CI and local test runs        | None by default (health reports `not_configured`); fakes    | CI job env, no real secrets          |
| `staging`     | Hosted, internal testers only | Own database, Redis, bucket, keys, Sentry DSN               | Hosting secret manager (vendor open) |
| `production`  | Hosted, real users            | Own database, Redis, bucket, keys, Sentry DSN               | Hosting secret manager (vendor open) |

Rules enforced in code (`packages/platform/src/env.ts`, tests in `env.spec.ts`):

- The API refuses to boot without a known `APP_ENV`.
- `staging` and `production` refuse to boot without their own `DATABASE_URL`, `REDIS_URL` and
  `SENTRY_DSN` (INFRA-005: monitoring is never silently off in a deployed environment).
- `staging` and `production` refuse to boot when any `*_URL`, `*_DSN`, `*_KEY`, `*_SECRET`,
  `*_PASSWORD` or `*_TOKEN` value still contains an `.env.example` placeholder (`fake`, `change-me`).
- No environment shares a database, Redis, bucket, key or Sentry DSN with another one.

## Secrets (SEC-BASE-008)

- Only `.env.example` (fake values) is committed. `.env` and `.env.*` are git-ignored.
- CI runs gitleaks (`.gitleaks.toml`) on every push and pull request; a finding fails the build.
- Mobile apps: only `EXPO_PUBLIC_*` values are bundled, and they are public by definition. Never
  put a private key, secret or AI prompt there (BP §29, §67). Admin: same for `NEXT_PUBLIC_*`.
- The hosting platform and its secret manager are not chosen yet (BP §33 hosting is open).
  `TODO(OWNER)`: pick hosting; A01 then documents how staging/production secrets are injected.

## Monitoring (INFRA-005)

- Sentry (D-001) starts only when `SENTRY_DSN` is set (required in staging/production); each
  environment has its own DSN, and events carry `environment = APP_ENV`.
- Privacy (SEC-BASE-002, permission-policy §7): every SDK `dataCollection` source is off and
  `beforeSend`/`beforeSendTransaction` strip bodies, cookies, query strings, headers (except
  `user-agent`) and user details except the internal id (`packages/platform/src/sentry.ts`).
- `GET /health` (contract `contracts/health.yaml`, REL-011) is the uptime-check target.

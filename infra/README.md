# infra/ (owner A01)

| Path                         | What                                                                                 | Requirement IDs                       |
| ---------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
| `docker-compose.yml`         | Local development PostgreSQL + PostGIS and Redis (fake creds from `.env`)            | SEC-BASE-011                          |
| `env/README.md`              | Environment separation, secrets, monitoring                                          | SEC-BASE-008, SEC-BASE-011, INFRA-005 |
| `eslint/kaamkaro-plugin.mjs` | ESLint rule `kaamkaro/no-cross-module-import` (used by the root `eslint.config.mjs`) | INFRA-001                             |
| `ci/*.ts`                    | CI guards (IMPL §7.4), run with Node 24 type stripping                               | see below                             |

## CI guards (IMPL §7.4)

| Command (repo root)           | Script                            | Rule owner      | Fails when                                                                                                                                                                                                 |
| ----------------------------- | --------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm guard:permissions`      | `ci/check-android-permissions.ts` | A17 (list: A15) | `apps/*/app.json` requests a never-request or unreviewed runtime permission, does not block the full permission-policy §4.1 list, or allows cleartext; same on prebuild manifests (PERM-006, SEC-BASE-001) |
| `… --release` (CI job)        | same                              | A17             | The **merged release** manifest contains a forbidden permission, `SYSTEM_ALERT_WINDOW`, or lacks `usesCleartextTraffic="false"` (RQ-001)                                                                   |
| `pnpm guard:hardcoded`        | `ci/check-hardcoded-values.ts`    | A17             | Numeric literal other than 0/1 in `pricing`/`cancel`/`matching`/`badge`/`media-limits` code outside seeds and tests (golden rule 2, CFG-RULE common acceptance)                                            |
| `pnpm guard:string-lint`      | `ci/run-hook.ts string-lint`      | A14             | Hard-coded user-facing text in app/UI `.tsx` (baseline now; A14's rule from T1.4 also runs) (I18N-006)                                                                                                     |
| `pnpm guard:transition-table` | `ci/run-hook.ts transition-table` | A04             | A04's generator fails, or the booking module exists without it                                                                                                                                             |
| `pnpm guard:traceability`     | `ci/run-hook.ts traceability`     | A16             | A16's traceability tool fails, or its phase map exists without the tool                                                                                                                                    |
| `pnpm guard:citations`        | `ci/check-pr-citations.ts`        | A17             | PR description lacks known requirement IDs or a BP/D/ARCH citation (runs in `.github/workflows/pr-citations.yml`)                                                                                          |
| Secret scan (CI job)          | gitleaks + `.gitleaks.toml`       | A15             | Any secret in git history (SEC-BASE-008)                                                                                                                                                                   |
| Dependency audit (CI job)     | `pnpm audit --audit-level high`   | A15             | A high/critical advisory in the dependency tree                                                                                                                                                            |

`pnpm run guards` runs every guard except citations (which needs a PR description).
The guard logic lives in `ci/lib/*.ts`; tests in `ci/__tests__/` and `eslint/*.spec.ts`.

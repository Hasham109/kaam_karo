# apps/partner — SKELETON

Created by A01 in T2.1 (bootstrap grant) so the monorepo, CI and an Expo **dev build** exist
from day one (D-001; T0.6 Urdu smoke test on the Infinix Note 40, D-027). Owner from now on:
**A12** (IMPL §2.3). Nothing here is a product decision.

What it contains:

- `index.ts` + `src/App.tsx`: one placeholder screen; text comes from `@kaamkaro/i18n`
  (English + Urdu line, each with its own writing direction).
- `app.json`: `android.permissions: []`, every never-request permission of
  `docs/security/permission-policy.md` §4.1 in `android.blockedPermissions`, and
  `usesCleartextTraffic: false` via `expo-build-properties` (PERM-006, SEC-BASE-001), and
  `allowBackup: false` (SEC-BASE-002; set by A01 in the T2.1 security fix, A00-approved).
  CI checks this with `pnpm guard:permissions` and the merged release manifest job.
- `android.package` is a placeholder (`TODO(OWNER)`: final application ID before the first
  store upload; it can never change afterwards).

Commands (from the repo root):

```
pnpm --filter @kaamkaro/partner prebuild   # generate android/ (git-ignored)
pnpm --filter @kaamkaro/partner android    # build + install the dev build (needs Android SDK + the JDK required by Expo SDK 58)
pnpm --filter @kaamkaro/partner start      # Metro for the dev client
pnpm --filter @kaamkaro/partner build      # JS bundle smoke check (expo export, android)
```

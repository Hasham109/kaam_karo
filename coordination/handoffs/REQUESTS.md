# CROSS-AGENT REQUESTS

Format: docs/implementation.md §3.5. Contract changes: §3.4 (producer posts CONTRACT CHANGE, consumers reply ACK or CONCERN, A00 approves).

Status values: `OPEN` → `ACCEPTED` → `DONE` (or `DECLINED` with reason). Newest first.

## Templates

```markdown
## RQ-NNN  FROM A0x → TO A0y   (status: OPEN)
Need: …
Why: BP §n / D-xxx / requirement ID
Blocking: T-x.y
Reply: …
```

```markdown
## RQ-NNN  CONTRACT CHANGE  FROM A0x   (status: OPEN)
Contract: contracts/<module>.yaml vX.Y → vX.Z (breaking: yes/no)
Change: …
Consumers (IMPL §4): A0a, A0b
- A0a: ACK | CONCERN: …
- A0b: ACK | CONCERN: …
Migration note (if breaking): …
A00 approval: —
```

---

## RQ-005  FROM A14 → TO A01   (status: OPEN)
Need: move `expo-font` into the `pnpm-workspace.yaml` catalog as `expo-font: 58.0.9` (the Expo SDK 58 bundled version, already a dependency of `expo` itself) and switch `apps/customer/package.json` from the exact pin `"expo-font": "58.0.9"` to `"catalog:"`. A14 pinned it exactly in apps/customer for T0.6 because the catalog file is in the A01 lane. No other new dependency was added.
Why: D-001 (one pinned version per tool, Expo-bundled packages only); I18N-004 (BP §78.2) — the expo-font config plugin embeds Noto Nastaliq Urdu at build time.
Blocking: nothing (T0.6 works with the exact pin)
Reply: …

## RQ-004  FROM A11 → TO A04, A05, A07, A09, A10   (status: OPEN)
Need: when you write the contracts for T3.4–T3.7, T6.1 and T7.x, please include these fields so the customer screens in docs/screens/customer.md never compute status, price or permissions on the device:
1. A04: every booking response carries `allowedNextActions` (incl. customer cancel, report provider no-show, safety stop, confirm completion, pay, review) and the booking list supports a server-side `group` filter (upcoming / active / past / cancelled) for C22; quote/offer responses carry lines with state, `deductible`, materials class, `crew_size`, `valid_until`, inclusions/exclusions/duration and an estimate-vs-committed flag (C13, C14, C36, C37).
2. A04/A09: a priced booking draft for C14 (all lines incl. the D-029 tax line and the total, computed by the server) and a final bill for C16/C20 with "Paid by" (CASH/DIGITAL as recorded).
3. A05/A07: request status (ARCH §6.2) and match payload with reasons, distance/ETA, badges, crew size or usual team size (OQ-045), and the supply-gap options list (C40).
4. A10: server-built share text (no phone/exact address) for request, quote, booking and referral; notification categories with a `critical` flag (C27).
5. All: errors as stable codes (e.g. `TRANSITION_NOT_ALLOWED`, `QUOTE_EXPIRED`, `LIMIT_REACHED`, `ACCOUNT_BLOCKED`, `OUT_OF_SERVICE_COUNTRY`); a provider-eligibility refusal returned to the customer must not reveal the reason (e.g. `UNPAID_COMMISSION` → generic "provider not available").
Why: BP §15.1, §17, §29, §31.1; D-003, D-004, D-016, D-029; BOOK-STATUS-016, SEC-BASE-007, PROV-CREW-003, LEDGER-006, SHARE-001, COMM-004
Blocking: T3.8–T3.10, T4.6, T6.4 (not T1.1)
Reply: …

## RQ-003  FROM A00 → TO A16   (status: OPEN)
Need: update docs/qa/device-matrix.md: D-REF physical device = Infinix Note 40 (owner D-027). Record that it does not meet the small-screen/low-RAM profile (verify against the real phone's specs), so small-screen and low-RAM checks also run on E-MIN until OQ-034 is answered.
Why: D-027; BP §78.2, §49
Blocking: T0.6
Reply: …

## RQ-002  FROM A16 → TO A01, A17, A14, A11, A12, A15   (status: OPEN)
Need:
1. A01: CI wiring for the requirement-traceability tool (lives in `tests/e2e/tools/`, A16 lane) — test citing an unknown ID fails; Launch IDs due in a closed phase without a passing test fail (docs/qa/test-strategy.md §3).
2. A01 + A17: lint rule against skipped tests and `.only`.
3. A01 + each interface owner: a test-only fault switch on every fake (exists only in test/e2e env). A15 reviews it.
4. A14 (+ A11, A12): `testID` and accessibility label on every UI-kit component so one Maestro flow runs in en and ur.
Why: IMPL §7.4, §8; BP §31, §38, §62.3; REQ UX-SCREEN-003, PERF-006, A11Y-004
Blocking: T2.1, T1.4
Reply: A01 (T2.1, 2026-10-23): item 1 DONE as a CI hook — `pnpm guard:traceability` runs `tests/e2e/tools/traceability/index.ts` when present and fails once `tests/e2e/traceability/phase-map.json` exists without the tool (infra/ci/lib/hooks.ts). Item 2 DONE — `vitest/no-focused-tests` + `vitest/no-disabled-tests` errors on all test files and `allowOnly: false` in every vitest config (A17 owns the rule). Item 3 open for T2.2 (fakes do not exist yet).

## RQ-001  FROM A15 → TO A01   (status: OPEN)
Need: extend the CI forbidden-permission guard (IMPL §7.4) to the full never-request list in `docs/security/permission-policy.md` §4, run it on the **merged release manifest** (Expo libraries can add permissions; `app.json` alone is not enough), and add a release check for `usesCleartextTraffic=false`.
Why: BP §75 item 98, §29 (encrypted traffic); REQ PERM-006, SEC-BASE-001
Blocking: T2.1 (CI setup)
Reply: A01 (T2.1, 2026-10-23): DONE — full §4.1 list (+ Partner RECORD_AUDIO, release SYSTEM_ALERT_WINDOW) in infra/ci/lib/android-permissions.ts; app.json must block all of them; CI job `android-manifest` runs prebuild + Gradle processReleaseMainManifest and the guard in --release mode, which also requires usesCleartextTraffic="false". Gradle job not yet exercised (no JDK locally); see handoffs/T-2.1.md.

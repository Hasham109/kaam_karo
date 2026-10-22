# Dependency vulnerability exception register

Owner: A15 (Security & Privacy Reviewer). Requirement IDs: SEC-BASE-008, PLAT-001. Refs: BP §29, §34; ARCH §14; IMPL §7.4.

## Policy (decided in SEC-REVIEW T2.1, 2026-10-23)

1. CI fails on **every** high or critical advisory (`pnpm audit --audit-level high`).
2. The only way to let one through is an **explicit, per-advisory** entry in `pnpm-workspace.yaml` `auditConfig.ignoreGhsas` **and** a row in the table below. Class-wide waivers are not allowed: no `--ignore-unfixable`, no `--audit-level critical` downgrades, no `|| true` on the gating step.
3. An exception is allowed only when all of these hold:
   - no patched version exists (or the patched version cannot be adopted without breaking the stack in D-001);
   - the vulnerable package is **not** in any runtime artifact (API process, admin browser bundle, mobile Hermes bundle / APK) — build or developer tooling only;
   - the attack needs attacker-controlled input to that tool on a developer/CI machine.
4. Every exception has a re-review date (at most 90 days) and is re-checked on every Expo/Next/Nest upgrade. If a fix ships, the entry is removed in the same PR that upgrades.
5. Any advisory in a runtime dependency is never an exception; it is a BUGS.md item (S1/S2 by CVSS and reachability).

## Register

| ID | Advisory | Package / version | Path | Runtime reachable? | Why accepted | Accepted | Re-review by |
|---|---|---|---|---|---|---|---|
| EX-001 | GHSA-86w9-cpqp-85rv (high) | node-forge 1.4.0 | `expo` → `@expo/cli` | No. `@expo/cli` is the dev/build CLI; node-forge is used for dev-server TLS certificates. Not in the Hermes bundle (`apps/*/dist` checked: no node-forge code) and not in the API | No patched version at T2.1. Dev tooling only | 2026-10-23 (A15) | 2027-01-21 or next Expo SDK upgrade |
| EX-002 | GHSA-vfj7-8cjw-p6xm (high) | braces 3.0.3 | `micromatch` ← `metro-file-map` (Expo/Metro bundler) and ← `fast-glob` ← `@next/eslint-plugin-next` (lint) | No. Build-time file globbing only; globs come from repo config, not users | No patched version at T2.1. Build/lint tooling only | 2026-10-23 (A15) | 2027-01-21 or next Expo/Next upgrade |

Both exceptions become **invalid** if `pnpm why node-forge` / `pnpm why braces` ever shows a path from `services/api`, `apps/admin` runtime `dependencies`, or a mobile runtime module.

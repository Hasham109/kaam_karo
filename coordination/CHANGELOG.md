# CHANGELOG — Kaam Karo

Newest first. Every behaviour change, with task ID and requirement IDs.

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

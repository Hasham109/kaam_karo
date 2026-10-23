# CHANGELOG — Kaam Karo

Newest first. Every behaviour change, with task ID and requirement IDs.

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

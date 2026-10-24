# AGENT BOARD — Kaam Karo

Each agent edits only its own row. A00 writes `## Sync <date>` notes and gate verdicts above the table.

## Sync 2026-10-24
- T2.8 DONE: QA PASS (docs/qa/T2.8-qa.md), SEC PASS (docs/security/SEC-REVIEW-T2.8.md). Consolidated security review of Phase 2 (T2.1–T2.6). OQ-023..028 renamed in policy, health check connection exhaustion fix, OTP idempotency replay (F-06), role guards verified. Phase 2 Gate G1 met.
- T2.7 DONE: QA PASS (docs/qa/T2.7-qa.md, 112/112 DB tests), SEC PASS (docs/security/SEC-REVIEW-T2.7.md). Automated DR restore drill verified in staging, BUG-0005 fixed (CREATEROLE/CREATEDB guard), ops runbook docs/ops/backup-restore.md, audit log docs/ops/restore-drill-log.md.
- T2.5 DONE: QA PASS (docs/qa/T2.5-qa.md, 109/109 DB tests), SEC PASS (docs/security/SEC-REVIEW-T2.5.md). Profiles, addresses, immutable location snapshots, favorites.
- T2.4 DONE: QA PASS (docs/qa/T2.4-qa.md, 102/102 DB tests, 147/147 unit tests), SEC PASS (docs/security/SEC-REVIEW-T2.4.md). Identity OpenAPI v0.1.0, passwordless OTP, sessions, admin MFA, staff RBAC lookup. RQ-012 and RQ-013 closed.
- T2.2 DONE: QA PASS (docs/qa/T2.2-qa.md re-check 1, 12/12 probes), SEC PASS (docs/security/SEC-REVIEW-T2.2.md re-review 1, all #1–#16 resolved). Gate 36/36, format, guards, DB 92/92 pass.
- T2.6 DONE: QA PASS (docs/qa/T2.6-qa.md re-check 1, 10/10 probes), SEC PASS (docs/security/SEC-REVIEW-T2.6.md re-review 1, all #1–#11 resolved). Contracts draft v0.2.0 approved.
- Next: T1.4 i18n kit (A14) / Phase 3 tasks.

## Sync 2026-10-23
- T2.1 DONE: QA PASS (docs/qa/T2.1-qa.md), SEC PASS after re-review 1 (docs/security/SEC-REVIEW-T2.1.md). Follow-ups due at Phase 2 gate: SEC #3, #6, #7, #9–#12, #14; QA F-04–F-06; first GitHub run of android-manifest job; Docker smoke test.
- T1.1, T1.2, T1.3, T1.5 DONE: QA PASS (docs/qa/T1.1-1.3-qa.md re-check 2), SEC PASS (docs/security/SEC-REVIEW-T1.1-1.3.md re-review 1). Owner decision D-030 recorded. Open for owner: OQ-039…OQ-078. Leftovers for A14 (T1.4): F-03 shared copy catalogues, G9 No-show Urdu verb. A15 follow-up: permission policy v1.1 (no Partner location until OQ-025), KK-T5 threat.
- T2.3 DONE: QA PASS (docs/qa/T2.3-qa.md), SEC PASS re-review 1 (docs/security/SEC-REVIEW-T2.3.md); test:db 49/49 on real Postgres via non-owner login. Follow-ups BUG-0001…0005 (A01, before T6.x). Local kaamkaro_dev DB still has the pre-fix migration (reset needs owner OK).
- T0.6 BLOCKED-DEVICE: code QA PASS (docs/qa/T0.6-qa.md); device run needs JDK 17 + phone/emulator (owner).
- Next: T2.2 (A01) + T2.6 (A03) in parallel, then T2.4 (A02), then T2.5.

## Sync 2026-10-22
- Phase 0: T0.1–T0.5 DONE (QA PASS). T0.6 unblocked: owner chose Infinix Note 40 (D-027); it needs the Expo dev build from T2.1. Gate G0 met: coding may start (T2.1, T1.4, T1.1–T1.3).

| Agent | Subagent file | Now doing (task) | Status | Branch | Blocked by | Next planned | Last update (UTC) |
|---|---|---|---|---|---|---|---|
| A00 | main session | Orchestration | DONE | — | — | T1.4 delegation | 2026-10-24 |
| A01 | platform-devops | T2.7 Database backup + restore drill (REL-012; BP §31.2, §31.3, §49) | DONE | t2.7-backup-restore | — | T8.5 | 2026-10-24 |
| A02 | identity-profiles | T2.5 Profiles, addresses, location snapshots, favorites (PROF-ADDR-001..004, PROF-FAV-001, LOC-GEO-003..004) | DONE | t2.5-profiles | — | T3.6 | 2026-10-24 |
| A03 | catalog-config | T2.6 Catalog + Config | DONE | t2.6-catalog-config | — | T6.2 (with A09); controllers after T2.4 | 2026-10-24 |
| A04 | booking-quotes | — | IDLE | — | — | T3.4 | — |
| A05 | matching-trust | — | IDLE | — | — | T3.6 | — |
| A06 | location-maps | — | IDLE | — | — | T3.1 | — |
| A07 | ai-intake-voice | — | IDLE | — | — | T3.3 | — |
| A08 | media | — | IDLE | — | — | T3.2 | — |
| A09 | payments-ledger | — | IDLE | — | — | T6.1 | — |
| A10 | comms-notify-reviews | — | IDLE | — | — | T7.1 | — |
| A11 | customer-app | T1.1 Screen specs C01–C42 — SEC-REVIEW fixes #3 #6 #9–#14 #18–#20 done, A15 re-check requested | DONE | t2.1-monorepo | — | T3.8 | 2026-10-23 |
| A12 | partner-app | T1.2 Screen specs P01–P26 — review fixes QA F-01/F-02/F-05 + SEC #2/#6/#7/#10/#11/#13/#21/#23 done (UX-SCREEN-002/003) | DONE | t2.1-monorepo | — | T4.1 | 2026-10-23 |
| A13 | admin-portal | T1.3 Admin screen specs A01–A26 + sub-role access matrix (OPS-ADMIN-001…026, ADMIN-ROLE-001…008, ROLE-003, UX-SCREEN-003, SEC-AUTH-005) | DONE | t2.1-monorepo (docs only) | — | T5.1 (T1.3 QA PASS; SEC fixes #1,4,5,6,8,15-18,22,24,25 + QA F-04 done, A15 re-review pending) | 2026-10-23 |
| A14 | i18n-a11y | T0.6 Urdu Nastaliq smoke test (I18N-001…004, 006, 007, 008, A11Y-001, 002, 004) — code done, device run PENDING | IN_REVIEW (BLOCKED-DEVICE) | t2.1-monorepo | Device run: Infinix Note 40 via USB or emulator + JDK 17 (docs/qa/urdu-smoke/README.md) | T1.4 | 2026-10-23 |
| A15 | security-reviewer | T2.8 Security review of T2.1–T2.6 | DONE | t2.8-security-review | — | Phase 3 security review | 2026-10-24 |
| A16 | qa-tester | T0.5 Test strategy + device matrix | DONE | — | — | T3.12 | 2026-10-22 |
| A17 | bug-hunter | — | IDLE | — | — | first sweep after Phase 2 | — |

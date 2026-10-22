# AGENT BOARD — Kaam Karo

Each agent edits only its own row. A00 writes `## Sync <date>` notes and gate verdicts above the table.

## Sync 2026-10-23
- T2.1 DONE: QA PASS (docs/qa/T2.1-qa.md), SEC PASS after re-review 1 (docs/security/SEC-REVIEW-T2.1.md). Follow-ups due at Phase 2 gate: SEC #3, #6, #7, #9–#12, #14; QA F-04–F-06; first GitHub run of android-manifest job; Docker smoke test.
- T1.1–T1.3 running in parallel (A11, A12, A13); T1.5 (A00) after them.

## Sync 2026-10-22
- Phase 0: T0.1–T0.5 DONE (QA PASS). T0.6 unblocked: owner chose Infinix Note 40 (D-027); it needs the Expo dev build from T2.1. Gate G0 met: coding may start (T2.1, T1.4, T1.1–T1.3).

| Agent | Subagent file | Now doing (task) | Status | Branch | Blocked by | Next planned | Last update (UTC) |
|---|---|---|---|---|---|---|---|
| A00 | main session | Phase 0 T0.1–T0.3 | DONE | — | — | Owner answers (OQ-014…033), then T1.x / T2.1 | 2026-10-22 |
| A01 | platform-devops | T2.1 Monorepo, CI, envs (PLAT-001, INFRA-001, INFRA-005, REL-011, SEC-BASE-001/008/011, PERM-006) | DONE | t2.1-monorepo | — | T2.2 | 2026-10-23 |
| A02 | identity-profiles | — | IDLE | — | — | T2.4 | — |
| A03 | catalog-config | — | IDLE | — | — | T2.6 | — |
| A04 | booking-quotes | — | IDLE | — | — | T3.4 | — |
| A05 | matching-trust | — | IDLE | — | — | T3.6 | — |
| A06 | location-maps | — | IDLE | — | — | T3.1 | — |
| A07 | ai-intake-voice | — | IDLE | — | — | T3.3 | — |
| A08 | media | — | IDLE | — | — | T3.2 | — |
| A09 | payments-ledger | — | IDLE | — | — | T6.1 | — |
| A10 | comms-notify-reviews | — | IDLE | — | — | T7.1 | — |
| A11 | customer-app | T1.1 Screen specs C01–C42 (UX-SCREEN-*, plus IDs per screen in docs/screens/customer.md) | IN_PROGRESS | t2.1-monorepo | — | T3.8 | 2026-10-23 |
| A12 | partner-app | T1.2 Screen specs P01–P26 (UX-SCREEN-002, UX-SCREEN-003, UX-PROV-001..005; spec only) | IN_PROGRESS | t2.1-monorepo | — | T4.1 | 2026-10-23 |
| A13 | admin-portal | — | IDLE | — | — | T1.3 | — |
| A14 | i18n-a11y | — | IDLE | — | — | T0.6 (on Infinix Note 40, after T2.1) | 2026-10-22 |
| A15 | security-reviewer | T0.4 Permission & threat policy | DONE | — | — | Rename OQ-P1…P6 → OQ-023…028 in policy; T2.8 | 2026-10-22 |
| A16 | qa-tester | T0.5 Test strategy + device matrix | DONE | — | — | T3.12 | 2026-10-22 |
| A17 | bug-hunter | — | IDLE | — | — | first sweep after Phase 2 | — |

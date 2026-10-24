# AGENT BOARD — Kaam Karo

Each agent edits only its own row. A00 writes `## Sync <date>` notes and gate verdicts above the table.

## Gate G1 (Phase 2): PASS (2026-10-24)
- Phase 2 (Backend foundation — BP §44 Phase 2) exit condition met: "secure login and data model working".
- All 8 tasks T2.1–T2.8 DONE with handoffs, QA PASS, and SEC PASS.
- Bug sweep `/bug-sweep 2` complete: 0 open S1/S2 bugs (`docs/qa/bug-sweep-phase2.md`).
- Verification passes: 36/36 turbo tasks, 112/112 DB tests, 22/22 QA E2E probes, 5/5 guards, format check.
- Verdict: PASS. Phase 2 closed; Phase 3 unblocked.

## Sync 2026-10-24
- T3.7 DONE: QA PASS (docs/qa/T3.7-qa.md, 20 unit tests, 5 DB tests, 155/155 total DB tests pass), SEC PASS (docs/security/SEC-REVIEW-T3.7.md). Supplier matching engine (Module M8, ARCH §4 M8, BP §54, §61.3, §68; D-005, D-010, D-020). Hard filters 73-79 & unpaid commission, 13 configurable scoring signals with Bayesian smoothing, algorithmic fairness (new provider boost & concentration caps), bilingual explanations ("Why am I seeing this?"), supply gap recovery options, zero auto-assignment guarantee (D-005), and OpenAPI 3.1.0 contract contracts/matching.yaml.
- T3.3 DONE: QA PASS (docs/qa/T3.3-qa.md, 15 unit tests, 5 DB tests, 150/150 total DB tests pass), SEC PASS (docs/security/SEC-REVIEW-T3.3.md). IntakeAI fake, closed schema, catalog validation, confidence fallback (< 0.60 to clarify questions), PII scrubbing (phone, CNIC, email redacted from logs), anti-hallucination, emergency service check, customer-only confirmation lifecycle (REQ-AI-001..012, ARCH §6.2, BP §56, §66, §67). Intake contract contracts/intake.yaml (OpenAPI 3.1.0).
- T3.5 DONE: QA PASS (docs/qa/T3.5-qa.md, 14 unit tests, 7 DB tests, 133/133 total DB tests pass), SEC PASS (docs/security/SEC-REVIEW-T3.5.md). Quotes, multi-supplier offers, fare lines, crew size & dynamic fare breakdown (QUOTE-001..009, FARE-001..013, PRICE-001..007, BOOK-STATUS-010, COMM-003, D-004, D-015, D-018, D-025, D-028, D-029, K-10). Verbatim criteria verified: unapproved line never payable (FARE-012, PRICE-007), offer without crew size rejected (CREW_SIZE_REQUIRED, D-004), crew size change after acceptance creates approval request (AWAITING_APPROVAL, ARCH §5.6). Commissionable base restricted to approved labor (D-015, COMM-003). Quotes contract contracts/quotes.yaml (OpenAPI 3.1.0).
- T3.4 DONE: QA PASS (docs/qa/T3.4-qa.md, 36 unit tests, 6 DB tests, 126/126 total DB tests pass), SEC PASS (docs/security/SEC-REVIEW-T3.4.md). Booking state machine with canonical transition table (17 statuses, 38 transitions, ARCH §6.1, BP §15), client status tampering refusal (BOOK-STATUS-016), crew size guard (D-004), unpaid commission guard (LEDGER-NEG-005, D-021), no-show guard (BOOK-STATUS-017), optimistic concurrency locking, immutable JobEvent logging (DATA-002, DATA-004), cancellation rules with zero fee at launch (D-023, BOOK-CANCEL-001..006), safety stops, allowedNextActions computation, CI guard script guard:transition-table, booking contract contracts/booking.yaml (OpenAPI 3.1.0).
- T3.2 DONE: QA PASS (docs/qa/T3.2-qa.md, 16 unit tests, 8 DB tests, 113/113 total DB tests pass), SEC PASS (docs/security/SEC-REVIEW-T3.2.md). Media upload sessions, private S3 storage signed URLs (INFRA-003, D-001), dynamic limits via ConfigService (media.max_upload_bytes, video/audio limits, BP §76), acceptance criterion tested (oversize/overlong rejected, draft survives failure in FAILED status, MEDIA-009), video thumbnail generation (MEDIA-005), speech-to-text with graceful failure fallback (MEDIA-006), retention cleanup job (MEDIA-007), media contract contracts/media.yaml (OpenAPI 3.1.0).
- T1.4 DONE: QA PASS (docs/qa/T1.4-qa.md, 21 i18n tests, 17 UI tests), SEC PASS (docs/security/SEC-REVIEW-T1.4.md). Modular message catalog (messages/ namespace split), bidi Unicode isolation (LRI/RLI/FSI/PDI), PKT date/time & relative time formatting, status visuals with contrast & icons (A11Y-003), min 48dp tap targets (A11Y-002), mandatory testID & accessibilityLabel (A11Y-004), directional icon mirroring (A11Y-007), small device sample screen (360x640 dp), string-lint CI guard passing 100% (I18N-006).
- T3.6 DONE: QA PASS (docs/qa/T3.6-qa.md, 120/120 DB tests, 232 unit tests), SEC PASS (docs/security/SEC-REVIEW-T3.6.md). Availability schedules, daily breaks, date overrides, radius/zone service areas with Pakistan boundary check, live status toggle (4 states), capacity limits (auto-BUSY), trust standing (BASIC default, PENDING_REVIEW submissions, audited decisions for VERIFIED/BUSINESS_VERIFIED), matching slot evaluation (MATCH-ELIG-075..079). OpenAPI contract contracts/availability.yaml (0.1.0).
- T3.1 DONE: QA PASS (docs/qa/T3.1-qa.md, 120/120 DB tests, 192 unit tests, Maps fallback tested), SEC PASS (docs/security/SEC-REVIEW-T3.1.md). GeoService, Pakistan boundary, Google Maps server client, straight-line Haversine + urban duration fallback, location contract contracts/location.yaml (OpenAPI 3.1.0).
- Gate G1 (Phase 2) PASSED. Exit condition "secure login and data model working" met with 0 open S1/S2 bugs, 112 DB tests, 22 QA E2E probes, 36/36 turbo tasks. Phase 2 formally closed.
- Bug Sweep Phase 2: PASS (docs/qa/bug-sweep-phase2.md), 0 S1/S2 bugs open.
- T2.8 DONE: QA PASS (docs/qa/T2.8-qa.md), SEC PASS (docs/security/SEC-REVIEW-T2.8.md). Consolidated security review of Phase 2 (T2.1–T2.6). OQ-023..028 renamed in policy, health check connection exhaustion fix, OTP idempotency replay (F-06), role guards verified.
- T2.7 DONE: QA PASS (docs/qa/T2.7-qa.md, 112/112 DB tests), SEC PASS (docs/security/SEC-REVIEW-T2.7.md). Automated DR restore drill verified in staging, BUG-0005 fixed (CREATEROLE/CREATEDB guard), ops runbook docs/ops/backup-restore.md, audit log docs/ops/restore-drill-log.md.
- T2.5 DONE: QA PASS (docs/qa/T2.5-qa.md, 109/109 DB tests), SEC PASS (docs/security/SEC-REVIEW-T2.5.md). Profiles, addresses, immutable location snapshots, favorites.
- T2.4 DONE: QA PASS (docs/qa/T2.4-qa.md, 102/102 DB tests, 147/147 unit tests), SEC PASS (docs/security/SEC-REVIEW-T2.4.md). Identity OpenAPI v0.1.0, passwordless OTP, sessions, admin MFA, staff RBAC lookup. RQ-012 and RQ-013 closed.
- T2.2 DONE: QA PASS (docs/qa/T2.2-qa.md re-check 1, 12/12 probes), SEC PASS (docs/security/SEC-REVIEW-T2.2.md re-review 1, all #1–#16 resolved). Gate 36/36, format, guards, DB 92/92 pass.
- T2.6 DONE: QA PASS (docs/qa/T2.6-qa.md re-check 1, 10/10 probes), SEC PASS (docs/security/SEC-REVIEW-T2.6.md re-review 1, all #1–#11 resolved). Contracts draft v0.2.0 approved.
- Next: T1.4 i18n kit (A14) / Phase 3 tasks (T3.1 GeoService by A06).

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
| A04 | booking-quotes | T3.5 Quotes + multi-supplier offers + fare lines + crew size (QUOTE-001..009, FARE-001..013, PRICE-001..007) | DONE | t3.5-quotes-fare | — | T3.7 | 2026-10-24 |
| A05 | matching-trust | T3.7 Matching: hard filters 73–79, configurable scoring, fairness, reasons, ranking_version, supply gap (MATCH-ELIG-073..079, MATCH-SCORE-001..013, MATCH-EXPL-001, MATCH-GAP-001, MATCH-MODE-001) | DONE | t3.7-matching-engine | — | T3.7 handoff | 2026-10-24 |
| A06 | location-maps | T3.1 GeoService + Pakistan boundary + Location Snapshot + fallback (LOC-GEO-001..006, 008, SCOPE-GEO-001..002) | DONE | t3.1-location-maps | — | T4.5 (with A12) | 2026-10-24 |
| A07 | ai-intake-voice | T3.3 IntakeAI fake + closed schema + catalog validation + confidence fallback + AI logs (REQ-AI-001..012) | DONE | t3.3-ai-intake | — | T3.11 | 2026-10-24 |
| A08 | media | T3.2 Media upload sessions, limits from config, thumbnails, retention job | DONE | t3.2-media | — | T4.3 (with A12) | 2026-10-24 |
| A09 | payments-ledger | — | IDLE | — | — | T6.1 | — |
| A10 | comms-notify-reviews | — | IDLE | — | — | T7.1 | — |
| A11 | customer-app | T1.1 Screen specs C01–C42 — SEC-REVIEW fixes #3 #6 #9–#14 #18–#20 done, A15 re-check requested | DONE | t2.1-monorepo | — | T3.8 | 2026-10-23 |
| A12 | partner-app | T1.2 Screen specs P01–P26 — review fixes QA F-01/F-02/F-05 + SEC #2/#6/#7/#10/#11/#13/#21/#23 done (UX-SCREEN-002/003) | DONE | t2.1-monorepo | — | T4.1 | 2026-10-23 |
| A13 | admin-portal | T1.3 Admin screen specs A01–A26 + sub-role access matrix (OPS-ADMIN-001…026, ADMIN-ROLE-001…008, ROLE-003, UX-SCREEN-003, SEC-AUTH-005) | DONE | t2.1-monorepo (docs only) | — | T5.1 (T1.3 QA PASS; SEC fixes #1,4,5,6,8,15-18,22,24,25 + QA F-04 done, A15 re-review pending) | 2026-10-23 |
| A14 | i18n-a11y | T1.4 i18n + RTL + Urdu typography kit; string-lint rule (I18N-001..008, A11Y-001..008) | DONE | work/parallel-t1.4-t3.2 | — | T3.8 / T3.9 | 2026-10-24 |
| A15 | security-reviewer | T2.8 Security review of T2.1–T2.6 | DONE | t2.8-security-review | — | Phase 3 security review | 2026-10-24 |
| A16 | qa-tester | T0.5 Test strategy + device matrix | DONE | — | — | T3.12 | 2026-10-22 |
| A17 | bug-hunter | Phase 2 bug sweep (docs/qa/bug-sweep-phase2.md, 0 S1/S2) | DONE | — | — | Phase 3 bug sweep | 2026-10-24 |

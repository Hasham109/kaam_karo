# CHANGELOG — Kaam Karo

Newest first. Every behaviour change, with task ID and requirement IDs.

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

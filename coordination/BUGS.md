# BUGS — Kaam Karo

Format and severities: docs/implementation.md §7.1. Every bug needs a failing regression test before it is assigned. Flow: A17 finds → failing test → owner fixes → A16 verifies → A17 `VERIFIED` → A00 `CLOSED` (IMPL §7.2).

Status values: `OPEN` → `IN_FIX` → `FIXED` → `VERIFIED` → `CLOSED` (or `WONT_FIX` with A00 reason).

| Sev | Meaning | Fix deadline |
|---|---|---|
| S1 | Money, security, data loss/corruption, privacy leak, crash on a core path | Stop the line; fix before any other work in that module |
| S2 | Core journey broken or a Blueprint rule violated | Within the current task cycle |
| S3 | Wrong but with a workaround | Before the phase gate |
| S4 | Cosmetic | Backlog |

## Template (copy below the line, newest first)

```markdown
## BUG-NNNN  [S?]  status: OPEN  owner: A0x  found by: A17  phase: N
Title: …
Requirement violated: AREA-TOPIC-NNN   Blueprint: §n
Repro:
 1. …
Expected: …
Actual: …
Failing test: services/api/src/modules/<module>/__regression__/BUG-NNNN.spec.ts
Root cause (S1/S2 mandatory): test gap | contract gap | spec gap
Fix PR: —      Verified by: —
```

---

## BUG-0005  [S4]  status: OPEN  owner: A01 (review A09)  found by: A15 (SEC-REVIEW-T2.3 re-review 1, R5)  phase: 2
Title: DB start-up role guard does not refuse a login with CREATEROLE
Requirement violated: PERM/INFRA-001   Blueprint: §29
Repro:
 1. Point DATABASE_URL at a login with CREATEROLE; start the API
Expected: Start refused
Actual: API starts
Where: packages/platform/src/db-role-guard.ts:16-26. Fix deadline: Before T2.7 / first deployed env
Failing test: TODO(A17) — add to services/api/prisma/tests-db/ before the fix
Root cause: test gap
Fix PR: —      Verified by: —

## BUG-0004  [S4]  status: OPEN  owner: A01 (review A09)  found by: A15 (SEC-REVIEW-T2.3 re-review 1, R4)  phase: 2
Title: CASH payment_method_record accepted after a SUCCEEDED DIGITAL payment on the same booking
Requirement violated: PAY-003, D-030   Blueprint: §26
Repro:
 1. As kaamkaro_api: insert SUCCEEDED DIGITAL payment, then a CASH payment_method_record for the same booking
Expected: Insert refused
Actual: Accepted (ledger still protected by one-entry-per-booking index)
Where: services/api/prisma/sql/30_integrity.sql. Fix deadline: With BUG-0001…0003
Failing test: TODO(A17) — add to services/api/prisma/tests-db/ before the fix
Root cause: test gap
Fix PR: —      Verified by: —

## BUG-0003  [S3]  status: OPEN  owner: A01 (review A09)  found by: A15 (SEC-REVIEW-T2.3 re-review 1, R3)  phase: 2
Title: One settlement can get two SETTLEMENT_DEBIT rows; debit accepted for a FAILED settlement
Requirement violated: PAY-007   Blueprint: §26
Repro:
 1. As kaamkaro_api: two SETTLEMENT_DEBIT inserts for one settlement; or one for a FAILED settlement
Expected: Second debit and FAILED-settlement debit refused
Actual: Both accepted
Where: services/api/prisma/sql/30_integrity.sql:72-76. Fix deadline: Before T6.4 settlement
Failing test: TODO(A17) — add to services/api/prisma/tests-db/ before the fix
Root cause: test gap
Fix PR: —      Verified by: —

## BUG-0002  [S3]  status: OPEN  owner: A01 (review A09)  found by: A15 (SEC-REVIEW-T2.3 re-review 1, R2)  phase: 2
Title: Refund cap bypass: ref1 ISSUED 100 → FAILED, ref2 ISSUED 100, then ref1 → SUCCEEDED refunds 200 of a 100 payment
Requirement violated: PAY-006   Blueprint: §26
Repro:
 1. As kaamkaro_api, in that order
Expected: ref1 cannot leave FAILED; refunds never exceed the paid amount
Actual: Total refunded 200
Where: services/api/prisma/sql/30_integrity.sql:149-168. Fix deadline: Before T6.x refunds
Failing test: TODO(A17) — add to services/api/prisma/tests-db/ before the fix
Root cause: test gap
Fix PR: —      Verified by: —

## BUG-0001  [S3]  status: OPEN  owner: A01 (review A09)  found by: A15 (SEC-REVIEW-T2.3 re-review 1, R1)  phase: 2
Title: Finance queue skippable: commission_payment_submission (and verification_record, dispute outcome, review flag) can be inserted already decided; approver may equal submitter
Requirement violated: LEDGER-PAY-006, D-021, OQ-083   Blueprint: §26
Repro:
 1. As kaamkaro_api: insert a submission with status APPROVED and decided_by = submitter, then a COMPANY_PAYMENT_CREDIT
Expected: Insert must start SUBMITTED with no decision fields; decided_by_user_id ≠ submitted_by_user_id
Actual: Accepted; block cleared without Finance
Where: services/api/prisma/sql/30_integrity.sql:214. Fix deadline: Before T6.x Pay company / verification work
Failing test: TODO(A17) — add to services/api/prisma/tests-db/ before the fix
Root cause: test gap
Fix PR: —      Verified by: —

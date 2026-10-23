# SEC-REVIEW T2.3 — DB schema v1 + init migration

Reviewer: A15 · Date: 2026-10-23 · Task owner: A01 · Branch: `t1-screen-specs` (uncommitted working tree)
Scope: `coordination/handoffs/T-2.3.md`; `services/api/prisma/**` (schema/, sql/, migrations/20261023000000_init/migration.sql, tools/, tests-db/); `services/api/prisma.config.ts`; CI job `db-schema` (`.github/workflows/ci.yml:47-82`).
Requirement IDs reviewed: DATA-001, DATA-003, DATA-004, LEDGER-002, LEDGER-005, LEDGER-007, LEDGER-PAY-004, LEDGER-PAY-006, PAY-003, PAY-004, PAY-006, PAY-007, SEC-AUTH-005, SEC-AUTH-008, SEC-BASE-002, ABUSE-007, ABUSE-010, INFRA-001.
Method: static review of the SQL and Prisma schema only. Docker was down, so `db:deploy` and `test:db` have **not** run. Every behaviour claim below about Postgres is from the documented semantics, not from a run.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: CHANGES-REQUIRED**

- **Blocking for T2.3 merge:** findings 1, 2 and 3 (S2).
- **Before the owning module builds on the table (T2.2 / T2.4 / T6.x):** findings 4–13 (S3).
- **Advisory:** findings 14–19 (S4).

## What passes (verified statically)

- The append-only list is consistent everywhere: `tools/append-only.ts:8-16` = the REVOKE list in `sql/20_append_only.sql:24-32` = the 14 triggers at `:56-69`. The unit test enforces this.
- The triggers are `BEFORE UPDATE OR DELETE … FOR EACH ROW` and `BEFORE TRUNCATE … FOR EACH STATEMENT`. They raise for every role, including a `TRUNCATE <parent> CASCADE`, because statement triggers fire on the cascaded tables too.
- No `SECURITY DEFINER` functions. Both `kk_*` functions are trigger-only, so the default PUBLIC EXECUTE on them is harmless (Postgres refuses a direct call of a trigger function).
- Grants:
  - No grants to PUBLIC.
  - No `TRUNCATE`, `REFERENCES` or `TRIGGER` privilege for `kaamkaro_app` on any table.
  - `_prisma_migrations` is fully revoked; `spatial_ref_sys` is read-only.
- No sequences (UUID keys only), so there is no missing sequence grant and no sequence-reset path.
- No `ON DELETE CASCADE` or `SET NULL` anywhere: every FK is `ON DELETE RESTRICT` (migration.sql:1374-1458).
- Money is `BigInt` paisa with no Float (test-enforced). The amount CHECKs (`sql/10_constraints.sql:14-16,32,37`) and the type↔direction↔link CHECKs (`:17-30`) are correct.
- The reversal trigger (`sql/20_append_only.sql:74-108`) does what my SEC-REVIEW-T1.1-1.3 #5 asked for:
  - same provider, opposite direction, cumulative cap at the original amount, `reason` required (`10_constraints.sql:28`);
  - the advisory lock plus a fresh per-statement snapshot under READ COMMITTED serialises concurrent reversals (see #15 for the REPEATABLE READ caveat).
- Identity:
  - no password column;
  - session token stored as `tokenHash` only (`identity.prisma:120`);
  - revocation (`revokedAt`) and expiry (`expiresAt`) fields exist;
  - admin `mfaVerifiedAt` is stored per session;
  - the account lifecycle `ACTIVE/BLOCKED/DELETION_REQUESTED/ANONYMISED` has timestamps (`identity.prisma:18-25,70-77`).
- Admin sub-roles are a join table with `@@unique([adminUserId, subRole])` (OQ-053 default: union). The actor's sub-roles are snapshotted into `audit_log.actor_sub_roles`.
- PayoutMethod stores only `maskedNumber` + `payoutProviderRef` (`payments.prisma:318-320`).
- AI: `ai_interaction` stores no raw prompt and no hidden reasoning, only `outputSummary`, versions and the safety/approval state.
- Media: only a private `storageKey`, never a URL.
- No secrets in the new files. The CI DB password `ci-only-not-a-secret` is a throwaway service-container value. The repo does not have gitleaks locally; the CI `secret-scan` job covers it.

## Findings

### S2

**1. S2: the API and the migrations share one `DATABASE_URL`, so in practice the app runs as the table owner (a superuser locally). The grant layer is void and the owner can switch the triggers off**
- Files:
  - `services/api/prisma.config.ts:15`
  - `packages/platform/src/env.ts:23,150` (the API's `databaseUrl` comes from the same `DATABASE_URL`)
  - `.env.example:14`
  - `services/api/prisma/README.md:41-46`
  - `.github/workflows/ci.yml:65`
- Rule: BP §26, §29 (least privilege); DATA-004, LEDGER-005, PAY-003; ABUSE-010.
- Reproduction:
  1. Copy `.env.example` → `.env` and start the API (T2.2 PrismaService reads `env.databaseUrl`).
  2. The API connects as `kaamkaro`, the compose superuser and table owner.
  3. That user passes every `has_table_privilege` check. Any code path or SQL injection can run `ALTER TABLE provider_ledger_entry DISABLE TRIGGER kk_append_only_row; UPDATE provider_ledger_entry SET amount_minor = 1 …`, or `SET session_replication_role = replica`, which needs superuser.
  4. Nothing in code makes the "member of kaamkaro_app, not the owner" rule real. It exists only as README prose, and the DB test simulates it with `SET LOCAL ROLE` from the superuser.
- Fix (A01, before T2.2 wires PrismaService):
  - (a) Split the variables:
    - `MIGRATION_DATABASE_URL`, read only by `prisma.config.ts` and the CI migrate step;
    - `DATABASE_URL`, read by the API, pointing to a LOGIN role that is a member of `kaamkaro_app`.
  - (b) Add `.env.example` lines for both, plus a dev bootstrap SQL in `infra/` that creates `kaamkaro_api LOGIN IN ROLE kaamkaro_app` with a fake password.
  - (c) API startup guard in all envs except `test`: query `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user` and `pg_has_role(current_user, (SELECT tableowner FROM pg_tables WHERE tablename = 'provider_ledger_entry'), 'MEMBER')`. If any is true, refuse to start. Unit-test the guard.
  - (d) The CI `db-schema` job runs `test:db` through a real non-owner login, not `SET ROLE` from the superuser.

**2. S2: "no free-standing ledger credit" can be bypassed. COMPANY_PAYMENT_CREDIT and JOB_CREDIT are linked but never checked against what they link to**
- Files: `sql/10_constraints.sql:24-29`; `schema/payments.prisma:226-228`; `sql/20_append_only.sql:74-108` (the only insert trigger checks reversals only).
- Rule: D-020, D-021; LEDGER-PAY-006 ("only Finance-approved or gateway-confirmed credits clear the block"); ABUSE-007; BP §30 payment fraud (KK-T4); handoff self-check #4.
- Reproduction (as `kaamkaro_app`; equally an A09 bug or a compromised Finance path):
  1. `INSERT commission_payment_submission (provider X, amount 100, status SUBMITTED)`.
  2. `INSERT provider_ledger_entry (entry_type 'COMPANY_PAYMENT_CREDIT', direction 'CREDIT', provider_profile_id = Y, commission_payment_submission_id = <that id>, amount_minor = 5000000, …)` → accepted.
  3. The submission is still SUBMITTED (or REJECTED), it belongs to another provider, and the amount is 50 000× larger.
  4. Likewise `JOB_CREDIT` needs only `booking_id`. Any booking ID, including a CASH booking or another provider's booking, gets a credit with no SUCCEEDED payment behind it.
  5. Provider Y's balance goes ≥ 0 and the D-020 block clears.
- Fix (A01 writes the DB trigger; A09 reviews):
  - Extend the BEFORE INSERT trigger on `provider_ledger_entry`:
    - `COMPANY_PAYMENT_CREDIT` → the submission exists, `status = 'APPROVED'`, same `provider_profile_id`, `amount_minor = submission.amount_minor`.
    - `JOB_CREDIT` → `payment_id IS NOT NULL` (add this to the CHECK), the payment row has `status = 'SUCCEEDED'`, `method = 'DIGITAL'`, same `booking_id` and `provider_profile_id`, and `amount_minor ≤ payment.amount_minor`.
    - `COMMISSION_DEBIT` → a `payment_method_record` with `method = 'CASH'` exists for the booking. This also closes the KK-T5 inverse.
    - `SETTLEMENT_DEBIT` → same provider as the settlement, and `amount_minor = settlement.amount_minor`.
  - Add a DB test for each refusal.

**3. S2: `commission_payment_submission` is fully mutable and deletable by the app role. The Finance decision can be flipped, and evidence can be edited after approval**
- Files: `schema/payments.prisma:234-268`; `sql/20_append_only.sql:20` (blanket DML grant); `sql/10_constraints.sql:33-36` (the CHECK covers completeness only, not finality).
- Rule: D-021; LEDGER-PAY-004 (decision with reason, audited); LEDGER-PAY-006; BP §26 (corrections are new records, not edits); ABUSE-007, ABUSE-010.
- Reproduction:
  1. Finance approves submission S. The credit row is written.
  2. `UPDATE commission_payment_submission SET transaction_ref = 'other', amount_minor = 999, screenshot_media_id = NULL` → accepted. The evidence behind an approved credit is rewritten.
  3. `UPDATE … SET status = 'REJECTED', decided_by_user_id = <someone else>` → accepted. The append-only credit is now orphaned from its justification.
  4. A REJECTED submission (evidence of a fake-claim attempt, KK-T4) can be `DELETE`d, because no ledger FK holds it.
  5. `version` is only an app-side optimistic lock.
- Fix (A01 writes the trigger; A09 owns the semantics):
  - BEFORE UPDATE trigger:
    - `provider_profile_id`, `amount_minor`, `transaction_ref`, `screenshot_media_id`, `submitted_at` are immutable;
    - once `OLD.status <> 'SUBMITTED'`, no column may change.
  - REVOKE DELETE on this table from `kaamkaro_app`.
  - Add `submitted_by_user_id` so the server can refuse self-approval (see #12).
  - DB tests: decision flip refused, evidence edit refused, delete refused.

### S3

**4. S3: `kaamkaro_app` can hard-DELETE core entities. With no cross-module FKs, deleting them silently orphans financial and event history**
- Files: `sql/20_append_only.sql:20-21`; the cross-module refs are plain UUIDs (handoff "Module rule"), e.g. `payments.prisma:110-139` → `booking_id`, `provider_profile_id`.
- Rule: DATA-003 (records stay traceable; anonymise, never delete); SEC-AUTH-008; BP §26.
- Reproduction: `DELETE FROM booking WHERE id = B` succeeds once B has no `job_event` (for example a booking created and billed through a bug path). The same works for `user_account`, `provider_profile`, `customer_profile`, `settlement` (when it has no ledger row), `verification_record`, `dispute`, `review`, `quote`, `media_object`, `location_snapshot` and `config_rule`. `payment` and `provider_ledger_entry` then point at nothing. The handoff relies on "users are anonymised, never deleted", but only as a convention.
- Fix (A01):
  - Replace the blanket grant with an explicit allow-list for DELETE. Operational tables that may lose rows:
    - `outbox_event`, `idempotency_key` (purge jobs)
    - `device_session`, `favorite`, `notification_preference`, `availability_rule`, `match_candidate`, `user_role`
  - Every other table gets SELECT/INSERT/UPDATE only. Soft delete (`deleted_at`) is already modelled where it is needed.
  - Add a DB test: DELETE on `user_account`/`booking`/`provider_profile` as the app role → permission denied.

**5. S3: payment and ledger consistency per booking is not enforced across types (D-030 "one method per booking")**
- Files: `payments.prisma:94-139` (Payment and PaymentMethodRecord), `:226-227` (ledger partial indexes).
- Rule: D-016, D-030; LEDGER-002; PAY-003; ABUSE-007 (KK-T1/KK-T5).
- Reproduction:
  1. Same booking: insert `payment (status CASH_RECORDED, method CASH)` and `payment (status SUCCEEDED, method DIGITAL)`. Both are accepted, because each partial index covers only one status.
  2. Then both a `COMMISSION_DEBIT` and a `JOB_CREDIT` for that booking are accepted.
  3. A `payment` row with `method = 'CASH', status = 'SUCCEEDED'`, or `method = 'DIGITAL', status = 'CASH_RECORDED'`, is accepted.
  4. A `payment.method` that differs from `payment_method_record.method` is accepted.
  5. Rows of one `payment_ref` may carry different `booking_id`, `amount_minor` or `method`.
- Fix (A01 + A09):
  - CHECK `(method = 'CASH') = (status = 'CASH_RECORDED')`.
  - Replace the two payment partial indexes with one: `UNIQUE (booking_id) WHERE status IN ('CASH_RECORDED','SUCCEEDED')`.
  - Ledger: `UNIQUE (booking_id) WHERE entry_type IN ('COMMISSION_DEBIT','JOB_CREDIT')`.
  - Insert trigger on `payment`:
    - `method` equals the `payment_method_record.method` of the booking (when one exists);
    - rows of the same `payment_ref` keep `booking_id`, `method`, `amount_minor`, `provider_profile_id` and `customer_profile_id`.
  - Open item for A09 / the owner (route to OPEN_QUESTIONS): the unique COMMISSION_DEBIT per booking plus the reversal cap mean an **under-charged** cash commission can never be corrected upward. Decide whether a corrected re-debit is allowed: for example, a REVERSAL of the original and a new COMMISSION_DEBIT with `reverses`-chain metadata, with the unique index made partial on "not fully reversed". Do not decide this silently in code.

**6. S3: refunds have no cap and no target check (the reversal cap from T1.1-1.3 #5 exists for the ledger, not for refunds)**
- Files: `payments.prisma:146-175`; `sql/10_constraints.sql:15`.
- Rule: PAY-004, PAY-006; BP §26, §30 payment fraud / admin abuse; ABUSE-010.
- Reproduction:
  1. Payment P has `amount_minor = 10000`.
  2. Insert `refund (payment_id = P, amount 10000, ISSUED)` twice with different `refund_ref` → both accepted. 20 000 is refunded against 10 000.
  3. A refund against a `CASH_RECORDED` or `FAILED` payment row is also accepted.
  4. A later row of the same `refund_ref` may change `amount_minor` or `payment_id`.
- Fix (A01 trigger; A09 semantics):
  - BEFORE INSERT on `refund`, with an advisory lock on `payment_id`:
    - the target row is `status = 'SUCCEEDED'` and `method = 'DIGITAL'`;
    - for a new `refund_ref` (`ISSUED`): the Σ of ISSUED amounts over refund_refs whose latest row is not `FAILED`, plus `NEW.amount_minor`, must be ≤ `payment.amount_minor`;
    - later rows of a `refund_ref` must keep `payment_id`, `booking_id` and `amount_minor`;
    - `reason IS NOT NULL` when `status = 'ISSUED'` (the doc says required, but no CHECK exists).
  - Add DB tests.

**7. S3: other decision records are mutable after the decision (settlement, verification, dispute, review flag)**
- Files:
  - `payments.prisma:271-304` (Settlement `status`, `amountMinor`, `paidAt`)
  - `trust.prisma:65-97` (VerificationRecord `status`, `decidedByUserId`)
  - `support.prisma:93-137` (Dispute `outcome`, `decidedByUserId`)
  - `reviews.prisma:64-90` (ReviewFlag)
- Rule: BP §26 (corrections are new records), BP §8.3 (sensitive actions logged); ROLE-003; ABUSE-010; PAY-007.
- Reproduction:
  - `UPDATE settlement SET amount_minor = 1, status = 'PENDING'` after the `SETTLEMENT_DEBIT` → accepted. Ledger and settlement now disagree.
  - `UPDATE verification_record SET status = 'APPROVED', decided_by_user_id = <other>` on a rejected CNIC check → accepted. The audit row remains, but the record of truth was rewritten.
  - The same works for `dispute.outcome`.
- Fix (A01 triggers; owners A09/A05/A10 confirm the final states):
  - A generic `kk_decision_final` trigger: once the decision columns are set (or the status is terminal), they and the evidence columns are immutable.
  - Settlement: `amount_minor` and `provider_profile_id` are immutable once a `SETTLEMENT_DEBIT` references the row. Status may move only `PENDING → PAID | FAILED`.

**8. S3: `config_rule` is designed as versioned history but is not append-only. Commission-rate history can be rewritten or deleted**
- Files: `schema/config.prisma` (ConfigRule; "a change is a new row"); migration.sql:417.
- Rule: BP §26, §42, §64; D-006 (commission.rate); CFG-RULE-001; ABUSE-010 ("sensitive config changes listed in A17").
- Reproduction:
  - `UPDATE config_rule SET value = '0.10' WHERE key = 'commission.rate'` in place → accepted. No new version and no `changed_by`.
  - `DELETE` a future-dated row → accepted.
  - `provider_ledger_entry.commission_rate` snapshots the rate for past bookings, but the rule history itself (and company account details, if they live here, OQ-076) is not tamper-evident.
  - Inserts may also set `effective_from` in the past.
- Fix (A01 with A03):
  - Add `config_rule` to `APPEND_ONLY_TABLES` (REVOKE UPDATE/DELETE + both triggers).
  - CHECK or trigger: `effective_from >= created_at - interval '1 minute'` (no back-dating); a deliberate back-fill requires an owner-role migration.
  - If OQ-076 (two-person rule) is accepted, add `proposed_by_user_id`, `approved_by_user_id`, `approved_at`, plus a CHECK `approved_by_user_id <> proposed_by_user_id`. The value is not effective until it is approved. Flag this to A03 now so T2.6 does not need a breaking change.

**9. S3: `location_snapshot` is mutable after a booking references it (the rule exists only in a doc comment)**
- Files: `schema/location.prisma:27-59` (comment at :54); migration.sql:548.
- Rule: BP §21 (a booking stores a snapshot of the location), §57; LOC-GEO-002/004; BP §30 (fake job / provider safety).
- Reproduction: after the provider accepts booking B (snapshot L), `UPDATE location_snapshot SET address_text = …, point = … WHERE id = L` → accepted. The provider travels to an address the customer never confirmed, and the dispute evidence changes too.
- Fix (A01 trigger; A06 owner): BEFORE UPDATE trigger. Once `OLD.confirmation_status = 'CONFIRMED'`, every column is immutable; a change is a new snapshot. REVOKE DELETE (see #4).

**10. S3: personal data inside append-only rows can never be removed (OQ-080). The "mask before write" control is prose only**
- Files:
  - `platform.prisma:45-52` (`before`, `after`, `reason`, `sourceMetadata`, where the doc example is "client and IP"), `:81`
  - `booking.prisma:108-111` (`job_event.reason`, `source_metadata`)
  - `payments.prisma` `refund.reason`, `provider_ledger_entry.reason`
- Rule: BP §26 ("subject to applicable law and retention requirements"), BP §29; SEC-AUTH-008; SEC-BASE-002; permission-policy §7; OQ-080.
- Reproduction: an admin writes "customer 0300-1234567 says…" in a cancel or refund reason, or the audit writer stores the raw IP and the full phone in `after`. The rows can never be updated, so after account deletion that data survives forever, against SEC-AUTH-008.
- Fix:
  - **A01 in T2.2:** `packages/platform` audit/event writers run a mandatory masker: drop keys on a deny-list (`phone*`, `email`, `address*`, `point`, `lat`/`lng`, `token*`, `otp*`, `ip`); mask phone patterns in free text; store the IP only truncated (/24 IPv4, /48 IPv6) or as a keyed hash. Add a unit test that writes a payload with a phone, an IP and a token and asserts the stored JSON has none of them.
  - **A13/A09/A04:** free-text `reason` fields show the hint "do not enter phone numbers or addresses"; the API applies the same phone-pattern masking before insert.
  - **Inventory of mutable PII that the SEC-AUTH-008 anonymiser (A02, T2.4/T2.5) must clear or replace:**
    - `user_account.phone_e164`, `display_name`, `email`
    - `address.*` text and point
    - `location_snapshot.address_text`, `address_label`, `point`. Booking-linked: keep the area name and drop the house-level text and point after the retention period (OQ-080)
    - `provider_profile.business_name`
    - `payout_method.account_title`
    - `message.body`, `review.text`, `case_update.text`
    - `customer_request.intent_text`, `description`, `supplier_summary`
    - `ai_interaction.output_summary`
    - `media_object` files (voice recordings, photos, CNIC documents)
    - `device_session.push_token`, `device_label`

**11. S3: `media_object` has no purpose or sensitivity class. Finance-only screenshots and CNIC documents look the same as chat photos**
- Files: `schema/media.prisma` (MediaObject; only `ownerUserId` and `kind`); the references are `trust.prisma:75` (`documentMediaIds`), `payments.prisma` `screenshotMediaId`, and `support.prisma` evidence.
- Rule: BP §29 (least privilege), §75 item 97 (screenshot Finance-only, read-audited); INFRA-003; ADMIN-ROLE-004/006; permission-policy §7.
- Reproduction: the signed-URL endpoint (A08) gets a media ID. With nothing on the row to say "verification document, Risk/Trust only" or "payment proof, Finance only", A08 must either trust the calling module's check or apply owner-only access, which then breaks the admin read. One missed check in one consumer exposes CNIC images to any role that can see the referencing object.
- Fix (A08 owns the schema change; A01 migration):
  - Add `purpose` (enum: `CHAT`, `REQUEST_ATTACHMENT`, `VOICE_RECORDING`, `VERIFICATION_DOCUMENT`, `PAYMENT_PROOF`, `DISPUTE_EVIDENCE`, `PROFILE_PHOTO`, `FARE_EVIDENCE`), set at upload and immutable.
  - Signed-URL issuance checks the purpose → role matrix and writes the read audit for `VERIFICATION_DOCUMENT` and `PAYMENT_PROOF`.
  - Retention per purpose comes from config (D-011, `TODO(OWNER)`).

**12. S3: admin MFA secret and recovery codes are not modelled, and one user can be both a PROVIDER and a Finance admin (self-approval)**
- Files: `identity.prisma:145-187` (AdminUser has `mfaEnrolledAt` only), `:95-109` (UserRole allows ADMIN + PROVIDER on one user); `payments.prisma:234-268` (no `submitted_by_user_id`).
- Rule: D-002; SEC-AUTH-005; BP §27, §30 admin abuse; ABUSE-010; OQ-051, OQ-053.
- Reproduction:
  - **Self-approval:** a staff member who also works as a provider (one `user_account`, roles PROVIDER + ADMIN/FINANCE) submits "Pay company" and approves it, or decides a dispute on a booking of their own. Nothing in the schema can detect this.
  - **MFA secret:** T2.4/T5.1 must add a column for the second-factor secret, and a plain `text` column would be the path of least resistance.
- Fix:
  - **(a) A02 in T5.1:** when the factor is TOTP-like, the secret is stored encrypted at the app layer (AES-256-GCM, data key from the secret manager, OQ-038) and never logged or returned after enrolment. Recovery codes are stored only as slow hashes (argon2id/bcrypt). Second-factor reset only by a Super Admin with a reason (OQ-051 default).
  - **(b) A00 raises an OQ (owner):** may a staff account also hold a CUSTOMER/PROVIDER role? Proposed default: no. Admin accounts are separate identities (a separate phone/login per OQ-051), enforced by a DB trigger on `user_role`/`admin_user`.
  - **(c) In any case,** A09/A10/A05 refuse a decision where `decided_by_user_id` equals the user behind the subject provider or customer profile (server check plus test). `commission_payment_submission` gets `submitted_by_user_id` (see #3).

**13. S3: where the full payout account number lives (A15 decision requested in the handoff)**
- Files: `payments.prisma:306-334`.
- Rule: BP §13 P16, §29; PAY-007; SEC-BASE-002; D-008 (open).
- **A15 decision:**
  - The full IBAN, account or wallet number is **never stored in a Kaam Karo table in clear and never sent back to any client** after saving.
  - The preferred design is tokenisation by the `PayoutProvider` (`payoutProviderRef`), with no full number in our DB.
  - Until D-008 is decided, the fake PayoutProvider keeps the number only in its fake store, which exists only in test/dev.
  - If the chosen gateway cannot tokenise, A09 adds `account_number_enc bytea` (AES-256-GCM, a separate key from the secret manager, key ID stored alongside). It is decrypted only inside the settlement job, and a manual Finance reveal is audited.
  - `masked_number` shows the last 4 digits at most. Add a CHECK that it matches `^[•*X\s-]*[0-9]{0,4}$`, so a full number cannot be stored there by mistake.
  - The P16 OTP step-up and the critical notification (SEC-REVIEW-T1.1-1.3 #2) still apply.

### S4

**14. S4: the default privileges grant UPDATE/DELETE on every future table, so a new append-only table is mutable until someone remembers the REVOKE**
- File: `sql/20_append_only.sql:21`.
- Rule: BP §26; DATA-004.
- Fix (A01): either a default of `SELECT, INSERT` only with explicit per-table UPDATE/DELETE grants, or a unit test that every model documented as "APPEND-ONLY" (model doc text) appears in `APPEND_ONLY_TABLES`. Keep this consistent with #4.

**15. S4: the reversal cap can race under REPEATABLE READ**
- File: `sql/20_append_only.sql:85-101`.
- Rule: PAY-004.
- Reproduction: two transactions at REPEATABLE READ both take their snapshot before the lock. The second one, after it gets the lock, still does not see the first one's reversal, and both commit. READ COMMITTED (the default) and SERIALIZABLE are safe.
- Fix: in the trigger, `IF current_setting('transaction_isolation') = 'repeatable read' THEN RAISE …`, or document and test that ledger writes use READ COMMITTED or SERIALIZABLE.

**16. S4: the migration needs superuser rights and the functions have no fixed `search_path`**
- Files: migration.sql:7 (`CREATE EXTENSION postgis`, not a trusted extension), :1549 (`CREATE ROLE`).
- Rule: BP §29 least privilege; OQ-038.
- Fix (A01, T2.7 ops):
  - Move the extension and role creation into an ops bootstrap run once by a DBA role, so the migration owner in staging/prod does not need superuser.
  - Add `SET search_path = pg_catalog, public` to both `kk_*` functions.
  - Run `REVOKE CREATE ON SCHEMA public FROM PUBLIC` and `REVOKE TEMP ON DATABASE … FROM PUBLIC` explicitly: Postgres < 15 still grants CREATE on `public` to PUBLIC, and the production version is not fixed (OQ-038).

**17. S4: grant history of admin sub-roles is lost on revoke**
- File: `identity.prisma:171-187`.
- Rule: ADMIN-ROLE-001; ABUSE-010.
- Fix (A02): add `revoked_at`/`revoked_by_user_id` (soft revoke) instead of DELETE. The audit row stays the primary record. Also add a DB CHECK that a SUPER_ADMIN grant has a non-null `granted_by_user_id`, except for the bootstrap account.

**18. S4: token/OTP hashing requirements for T2.4 (recorded here because the schema leaves it open)**
- `device_session.token_hash`: HMAC-SHA-256 with a server pepper from the secret manager, not a bare SHA. Revoking a session also clears `push_token`.
- OTP storage (Redis or a table, A02 decides): only an HMAC of the code; expiry; attempt counter; never logged. Production fails closed while the limits are `null` (SEC-REVIEW-T1.1-1.3 #1).
- A "sign out everywhere" action must also invalidate any stateless access token. Either check the session row on every request, or keep the access-token TTL short and document it.

**19. S4: the DB-level tests are missing for the new rules above, and `test:db` has not run at all**
- File: `tests-db/schema.db-spec.ts`.
- Fix (A01; A16 confirms):
  - Run `db:deploy` + `test:db` once Docker is up, and attach the output to the handoff. The DB-level claims in this review are unverified until then.
  - Add tests for #1(c), #2, #3, #4, #5, #6, #7, #8 and #9.

## Routing (for A00 → BUGS.md / REQUESTS.md)

| # | Sev | Owner | When |
|---|---|---|---|
| 1 | S2 | A01 | Before T2.3 merge / before T2.2 PrismaService |
| 2 | S2 | A01 (A09 review) | Before T2.3 merge |
| 3 | S2 | A01 (A09 review) | Before T2.3 merge |
| 4 | S3 | A01 | Before T2.4 |
| 5 | S3 | A01 + A09; A00 raises an OQ for the under-charge correction | Before T6.x |
| 6 | S3 | A01 + A09 | Before T6.x |
| 7 | S3 | A01; A09/A05/A10 confirm | Before the owning module's task |
| 8 | S3 | A01 + A03 | Before T2.6 seeds |
| 9 | S3 | A01 + A06 | Before T3.x location |
| 10 | S3 | A01 (T2.2 masker); A02 (anonymiser) | T2.2 / T2.4 |
| 11 | S3 | A08 | Before T-media upload API |
| 12 | S3 | A02; A00 raises an OQ (role exclusivity) | T5.1 / T6.x |
| 13 | S3 | A09 (decision recorded here) | Before T6.4 |
| 14–19 | S4 | A01 / A02 | Advisory; 19 before the Phase 2 gate |

---

## Re-review 1 (2026-10-23)

Scope: the "Review fixes" section and DB-run notes in `coordination/handoffs/T-2.3.md`; `services/api/prisma/sql/10_constraints.sql`, `20_privileges.sql`, `30_integrity.sql`; `infra/db/bootstrap.sql`, `infra/db/init/10-bootstrap.sh`; `packages/platform/src/db-role-guard.ts`, `packages/platform/src/env.ts:144-156`; `services/api/src/db/verify-db-role.ts`, `services/api/src/main.ts:8-13`; CI `db-schema` (`ci.yml:66-67`).

**Verdict: SEC-REVIEW: PASS** for T2.3 merge.
- All three S2 findings are closed, and I verified each one live.
- Four new S3 residuals (R1–R4 below) are **not blocking for T2.3**. They must be fixed before T6.x, the payments, refunds and settlement build, by A01 with A09.

### How I verified (live, not static)
1. **Fresh database.** I created `kaamkaro_a15_verify` in the running container and did not touch `kaamkaro_dev`.
   - I ran the bootstrap steps: PostGIS; the roles already exist cluster-wide (`kaamkaro_api`: NOSUPERUSER, NOBYPASSRLS, NOCREATEROLE, member of `kaamkaro_app`); `REVOKE CREATE ON SCHEMA public` and `REVOKE TEMPORARY` from PUBLIC.
   - Then `prisma migrate deploy` as the owner.
2. **`test:db` with `DATABASE_URL` = the real `kaamkaro_api` login:** 49/49 passed. This matches A01's result.
3. **Role guard.** I ran `DB_ROLE_FACTS_SQL` + `dbRoleProblems` against both logins:
   - `kaamkaro_api` → `[]`;
   - owner `kaamkaro` → superuser, BYPASSRLS and table owner.
   - `main.ts:10` runs the guard before `NestFactory.create`.
4. **37 bypass attempts as `kaamkaro_api`.** Each ran in a rolled-back transaction (script kept in the session scratchpad, not in the repo). Results are below.
5. I dropped the temporary database afterwards.

### Status of the original findings
| # | Status | Evidence (live attempt as `kaamkaro_api`) |
|---|---|---|
| 1 S2 | **Closed** | All refused:<br>• `ALTER TABLE provider_ledger_entry DISABLE TRIGGER ALL` → "must be owner"<br>• `DROP TRIGGER` → "must be owner"<br>• `SET session_replication_role = replica` → permission denied<br>• `SET ROLE kaamkaro` → permission denied<br>• `CREATE FUNCTION public.x` → permission denied for schema public<br>• `CREATE TEMP TABLE` → permission denied<br>• `UPDATE provider_ledger_entry` → permission denied<br>`GRANT UPDATE … TO kaamkaro_api` returns "no privileges were granted", and `has_table_privilege` stays false.<br>The env split (`MIGRATION_DATABASE_URL` vs `DATABASE_URL`, refused when equal outside `test`), the start-up guard and the CI two-login run are all present. |
| 2 S2 | **Closed** (residual R1) | Refused:<br>• credit on a SUBMITTED submission;<br>• credit to another provider;<br>• a second credit for one submission (unique index);<br>• JOB_CREDIT against a CASH_RECORDED payment;<br>• reversal under REPEATABLE READ (`kk_isolation`). |
| 3 S2 | **Closed** (residual R1) | Refused:<br>• flipping an APPROVED submission → `kk_decision_final`;<br>• editing `amount_minor` while SUBMITTED → `kk_immutable_column`;<br>• DELETE → permission denied.<br>`submitted_by_user_id` is NOT NULL. |
| 4 | Closed | DELETE on `user_account`, `location_snapshot`, `commission_payment_submission` and `config_rule` → permission denied. The allow-list (`20_privileges.sql:66-77`) is reasonable. The default is now `SELECT, INSERT` (`:94`). |
| 5 | Closed (residual R4) | CHECK on method/status; `payment_one_settled_per_booking`; `ledger_one_job_entry_per_booking`; `kk_payment_check_insert`. The upward commission correction is routed to OQ-082 as I asked. |
| 6 | Partly closed (R2) | The cap works (refund 101 on a 100 payment → refused). The cap can be bypassed through a FAILED → SUCCEEDED row sequence (R2). |
| 7 | Closed (residuals R3, R4) | Settlement `amount_minor` change refused; PAID → PENDING refused; sub-role un-revoke refused. |
| 8 | Closed | `UPDATE config_rule` → permission denied. A back-dated insert is refused by `config_rule_not_backdated`. OQ-076 columns deferred (acceptable while the OQ is open). |
| 9 | Closed | Editing a CONFIRMED snapshot → `kk_decision_final`. DELETE → permission denied. |
| 10 | Handed on | To T2.2 (A01 masker) and T2.4/T2.5 (A02 anonymiser). Tracked; not part of this review. |
| 11 | Closed | PAYMENT_PROOF with STANDARD sensitivity is refused by `media_object_restricted_purposes`. A `purpose` change is refused by `kk_immutable_column`. |
| 12 | Closed for the schema | An MFA ciphertext without a key ID is refused by `admin_user_mfa_secret_has_key`. `admin_recovery_code.code_hash` is present. Self-decision prevention goes to OQ-083 and the services (but see R1, which is a cheap DB guard). |
| 13 | Closed | A full IBAN and an 11-digit wallet number are both refused by `payout_method_masked_number`. Vault vs encrypted column goes to A09 in T6.4. |
| 14 | Closed | Default privileges are SELECT/INSERT. The append-only doc ↔ list test exists. |
| 15 | Closed | `kk_isolation` fires for ledger reversals and refunds. |
| 16 | Closed | Every `kk_*` function pins `search_path`. The PUBLIC CREATE/TEMP revokes were verified live. The bootstrap is separated from the migration. |
| 17 | Closed | `revoked_at`/`revoked_by_user_id`, a partial unique key, and revoked rows frozen. |
| 18 | Handed on | To A02 in T2.4 (tracked). |
| 19 | Closed | `test:db` 49/49, reproduced by A15. |

### New residuals (found by live attempts)

**R1. S3: a commission-payment submission can be inserted already APPROVED, and the approver can be the submitter**
- Files: `sql/30_integrity.sql:214` (the freeze trigger is UPDATE-only); `sql/10_constraints.sql` (`commission_payment_decision_complete` checks completeness only).
- Rule: D-021; LEDGER-PAY-006 ("the provider's claim never clears the block"); ABUSE-007, ABUSE-010; OQ-083.
- Reproduction (live, as `kaamkaro_api`, both ACCEPTED):
  - (a) `INSERT INTO commission_payment_submission (…, status, decided_by_user_id, decided_at, decision_reason) VALUES (…, 'APPROVED', <any uuid>, now(), 'ok')`, followed by a `COMPANY_PAYMENT_CREDIT` for it. The Finance queue is skipped in one request. A mass-assignment bug on the provider's "Pay company" endpoint, which is the one place that inserts these rows, would let a provider clear their own D-020 block.
  - (b) `UPDATE … SET status = 'APPROVED', decided_by_user_id = submitted_by_user_id`. This is self-approval.
- Fix (A01; A09 reviews):
  - BEFORE INSERT on `commission_payment_submission`: `NEW.status = 'SUBMITTED'` and all decision columns are NULL.
  - CHECK `decided_by_user_id IS DISTINCT FROM submitted_by_user_id`.
  - Apply the same insert-open rule to `verification_record` (live: inserting APPROVED is accepted), `dispute.outcome` and `review_flag`.
  - Add DB tests.

**R2. S3: the refund cap can be bypassed with a FAILED → SUCCEEDED sequence on one `refund_ref`**
- File: `sql/30_integrity.sql:149-168`.
- Rule: PAY-004, PAY-006; BP §26, §30 payment fraud.
- Reproduction (live, all ACCEPTED). Payment of 100 SUCCEEDED/DIGITAL:
  1. refund ref1 ISSUED 100;
  2. ref1 FAILED, so ref1 no longer counts toward the cap;
  3. ref2 ISSUED 100;
  4. ref1 SUCCEEDED.

  Under "the latest row per ref is current", 200 is refunded against 100.
- Fix: refund state moves only `ISSUED → SUCCEEDED | FAILED`. Once a ref has a SUCCEEDED or FAILED row, refuse any further row for that ref. Add a DB test.

**R3. S3: settlement debits are not unique per settlement and can be written for a FAILED settlement**
- File: `sql/30_integrity.sql:72-76`.
- Rule: PAY-007, LEDGER-007; BP §30 (provider fairness: a double debit takes the provider's money).
- Reproduction (live, ACCEPTED):
  - two `SETTLEMENT_DEBIT` rows (different idempotency keys) for one settlement of 500 → the provider is debited 1000;
  - a `SETTLEMENT_DEBIT` for a settlement inserted as `FAILED`.
- Fix:
  - Partial unique index on `provider_ledger_entry(settlement_id) WHERE entry_type = 'SETTLEMENT_DEBIT'`.
  - The trigger requires `settlement.status <> 'FAILED'`.
  - Define with A09 whether the debit is written at PENDING or at PAID. Then a settlement that becomes FAILED needs a REVERSAL. Add a DB test.

**R4. S4: a CASH `payment_method_record` is accepted after a SUCCEEDED DIGITAL payment for the same booking**
- File: `sql/30_integrity.sql:107-130` (checks run on `payment` insert only).
- Rule: D-016, D-030; LEDGER-002.
- Reproduction (live, ACCEPTED): first a DIGITAL SUCCEEDED payment, then `payment_method_record (CASH)`. The record and the payment now disagree. The ledger is still protected: a COMMISSION_DEBIT plus a JOB_CREDIT pair is blocked by `ledger_one_job_entry_per_booking`.
- Fix: BEFORE INSERT on `payment_method_record`: refuse when a payment row of another method exists for the booking.

**R5. S4: the role guard does not check CREATEROLE**
- File: `packages/platform/src/db-role-guard.ts:16-26`.
- Rule: BP §29 least privilege.
- Why it matters: a login with CREATEROLE on Postgres < 16 can grant itself the owner role. The bootstrap creates `NOCREATEROLE` (verified live), but a hand-made production login might not.
- Fix: add `rolcreaterole` to `DB_ROLE_FACTS_SQL` and treat it as a problem. Optionally also `rolreplication`.

### Routing
| # | Sev | Owner | When |
|---|---|---|---|
| R1 | S3 | A01 (A09, A05, A10 review) | Before T6.x "Pay company" / T5.x verification |
| R2 | S3 | A01 + A09 | Before T6.x refunds |
| R3 | S3 | A01 + A09 | Before T6.4 settlement |
| R4 | S4 | A01 | With R1–R3 |
| R5 | S4 | A01 | Before T2.7 / first deployed environment |

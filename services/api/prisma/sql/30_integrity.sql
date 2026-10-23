-- kk:section integrity triggers (T2.3; BP §21, §26, §30; ARCH §5.4, §6.8; DATA-004, LEDGER-002, LEDGER-005,
-- LEDGER-PAY-004, LEDGER-PAY-006, PAY-003, PAY-004, PAY-006; SEC-REVIEW-T2.3 #2, #3, #5–#9, #15, #16).
-- These run for EVERY role, including the table owner. All functions pin search_path.
-- Errors: kk_append_only (42501), kk_ledger_* / kk_payment / kk_refund (23514), kk_decision_final /
-- kk_immutable_column (55000), kk_isolation (25001).

-- 1. Append-only tables: no UPDATE, DELETE or TRUNCATE (BP §26).
CREATE OR REPLACE FUNCTION kk_forbid_append_only_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION 'kk_append_only: % on table % is not allowed; write a new (reversal) row instead (BP §26)',
    TG_OP, TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$;
COMMENT ON FUNCTION kk_forbid_append_only_change() IS 'Raises on UPDATE/DELETE/TRUNCATE of append-only tables for every role (BP §26; DATA-004; LEDGER-005; PAY-003).';

-- kk:append-only-triggers (one pair per table in APPEND_ONLY_TABLES)
CREATE TRIGGER kk_append_only_row BEFORE UPDATE OR DELETE ON "audit_log" FOR EACH ROW EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_truncate BEFORE TRUNCATE ON "audit_log" FOR EACH STATEMENT EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_row BEFORE UPDATE OR DELETE ON "marketplace_event" FOR EACH ROW EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_truncate BEFORE TRUNCATE ON "marketplace_event" FOR EACH STATEMENT EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_row BEFORE UPDATE OR DELETE ON "job_event" FOR EACH ROW EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_truncate BEFORE TRUNCATE ON "job_event" FOR EACH STATEMENT EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_row BEFORE UPDATE OR DELETE ON "provider_ledger_entry" FOR EACH ROW EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_truncate BEFORE TRUNCATE ON "provider_ledger_entry" FOR EACH STATEMENT EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_row BEFORE UPDATE OR DELETE ON "payment" FOR EACH ROW EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_truncate BEFORE TRUNCATE ON "payment" FOR EACH STATEMENT EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_row BEFORE UPDATE OR DELETE ON "payment_method_record" FOR EACH ROW EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_truncate BEFORE TRUNCATE ON "payment_method_record" FOR EACH STATEMENT EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_row BEFORE UPDATE OR DELETE ON "refund" FOR EACH ROW EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_truncate BEFORE TRUNCATE ON "refund" FOR EACH STATEMENT EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_row BEFORE UPDATE OR DELETE ON "config_rule" FOR EACH ROW EXECUTE FUNCTION kk_forbid_append_only_change();
CREATE TRIGGER kk_append_only_truncate BEFORE TRUNCATE ON "config_rule" FOR EACH STATEMENT EXECUTE FUNCTION kk_forbid_append_only_change();

-- 2. Ledger inserts: every row must match what it points at (D-016, D-020, D-021; LEDGER-PAY-006;
--    ABUSE-007). A credit can never be free-standing; a reversal is capped (PAY-004).
CREATE OR REPLACE FUNCTION kk_ledger_check_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  r record;
  already_reversed bigint;
BEGIN
  IF NEW.entry_type = 'COMMISSION_DEBIT' THEN
    PERFORM 1 FROM payment_method_record WHERE booking_id = NEW.booking_id AND method = 'CASH';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'kk_ledger_link: COMMISSION_DEBIT needs a CASH payment record for booking %', NEW.booking_id USING ERRCODE = '23514';
    END IF;
    IF NEW.payment_id IS NOT NULL THEN
      SELECT * INTO r FROM payment WHERE id = NEW.payment_id;
      IF NOT FOUND OR r.status <> 'CASH_RECORDED' OR r.booking_id <> NEW.booking_id
         OR r.provider_profile_id <> NEW.provider_profile_id THEN
        RAISE EXCEPTION 'kk_ledger_link: COMMISSION_DEBIT payment must be the CASH_RECORDED row of the same booking and provider' USING ERRCODE = '23514';
      END IF;
    END IF;

  ELSIF NEW.entry_type = 'JOB_CREDIT' THEN
    SELECT * INTO r FROM payment WHERE id = NEW.payment_id;
    IF NOT FOUND OR r.status <> 'SUCCEEDED' OR r.method <> 'DIGITAL'
       OR r.booking_id IS DISTINCT FROM NEW.booking_id OR r.provider_profile_id <> NEW.provider_profile_id
       OR NEW.amount_minor > r.amount_minor THEN
      RAISE EXCEPTION 'kk_ledger_link: JOB_CREDIT needs a SUCCEEDED DIGITAL payment of the same booking and provider, amount <= payment' USING ERRCODE = '23514';
    END IF;

  ELSIF NEW.entry_type = 'COMPANY_PAYMENT_CREDIT' THEN
    SELECT * INTO r FROM commission_payment_submission WHERE id = NEW.commission_payment_submission_id;
    IF NOT FOUND OR r.status <> 'APPROVED' OR r.provider_profile_id <> NEW.provider_profile_id
       OR r.amount_minor <> NEW.amount_minor THEN
      RAISE EXCEPTION 'kk_ledger_link: COMPANY_PAYMENT_CREDIT needs an APPROVED submission of the same provider with the same amount' USING ERRCODE = '23514';
    END IF;

  ELSIF NEW.entry_type = 'SETTLEMENT_DEBIT' THEN
    SELECT * INTO r FROM settlement WHERE id = NEW.settlement_id;
    IF NOT FOUND OR r.provider_profile_id <> NEW.provider_profile_id OR r.amount_minor <> NEW.amount_minor THEN
      RAISE EXCEPTION 'kk_ledger_link: SETTLEMENT_DEBIT must match its settlement (provider and amount)' USING ERRCODE = '23514';
    END IF;

  ELSIF NEW.entry_type = 'REVERSAL' THEN
    -- Under REPEATABLE READ the snapshot predates the lock, so the cap could race (SEC-REVIEW-T2.3 #15).
    IF current_setting('transaction_isolation') = 'repeatable read' THEN
      RAISE EXCEPTION 'kk_isolation: ledger reversals must run under READ COMMITTED or SERIALIZABLE' USING ERRCODE = '25001';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('ledger:' || NEW.reverses_entry_id::text, 0));
    SELECT * INTO r FROM provider_ledger_entry WHERE id = NEW.reverses_entry_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'kk_ledger_reversal: original entry % not found', NEW.reverses_entry_id USING ERRCODE = '23503';
    END IF;
    IF r.provider_profile_id <> NEW.provider_profile_id THEN
      RAISE EXCEPTION 'kk_ledger_reversal: reversal must belong to the same provider' USING ERRCODE = '23514';
    END IF;
    IF r.direction = NEW.direction THEN
      RAISE EXCEPTION 'kk_ledger_reversal: reversal must have the opposite direction' USING ERRCODE = '23514';
    END IF;
    SELECT COALESCE(SUM(amount_minor), 0) INTO already_reversed
      FROM provider_ledger_entry WHERE reverses_entry_id = NEW.reverses_entry_id;
    IF already_reversed + NEW.amount_minor > r.amount_minor THEN
      RAISE EXCEPTION 'kk_ledger_reversal: reversal exceeds the not-yet-reversed amount' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION kk_ledger_check_insert() IS 'Ledger insert guard: debits/credits match their CASH record, SUCCEEDED DIGITAL payment, APPROVED submission or settlement; reversals same provider, opposite direction, capped (BP §26; D-016, D-021; LEDGER-PAY-006; PAY-004).';
CREATE TRIGGER kk_ledger_check_insert BEFORE INSERT ON "provider_ledger_entry" FOR EACH ROW EXECUTE FUNCTION kk_ledger_check_insert();

-- 3. Payment rows: method agrees with the provider's record; one payment_ref keeps its facts (D-016, D-030; LEDGER-002).
CREATE OR REPLACE FUNCTION kk_payment_check_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  recorded payment_method;
  r record;
BEGIN
  SELECT method INTO recorded FROM payment_method_record WHERE booking_id = NEW.booking_id;
  IF FOUND AND recorded <> NEW.method THEN
    RAISE EXCEPTION 'kk_payment: method % differs from the recorded payment method % of the booking', NEW.method, recorded USING ERRCODE = '23514';
  END IF;
  IF NEW.method = 'CASH' AND recorded IS NULL THEN
    RAISE EXCEPTION 'kk_payment: a CASH payment needs the provider''s CASH payment record first (D-030)' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('payment:' || NEW.payment_ref::text, 0));
  SELECT * INTO r FROM payment WHERE payment_ref = NEW.payment_ref LIMIT 1;
  IF FOUND AND (r.booking_id, r.method, r.amount_minor, r.provider_profile_id, r.customer_profile_id)
     IS DISTINCT FROM (NEW.booking_id, NEW.method, NEW.amount_minor, NEW.provider_profile_id, NEW.customer_profile_id) THEN
    RAISE EXCEPTION 'kk_payment: rows of one payment_ref must keep booking, method, amount and parties' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION kk_payment_check_insert() IS 'Payment insert guard: method equals the recorded method; CASH needs the CASH record; one payment_ref keeps booking, method, amount, parties (D-016, D-030; LEDGER-002; PAY-003).';
CREATE TRIGGER kk_payment_check_insert BEFORE INSERT ON "payment" FOR EACH ROW EXECUTE FUNCTION kk_payment_check_insert();

-- 4. Refund rows: only against a SUCCEEDED DIGITAL payment, capped at the paid amount (PAY-006; OQ-058).
--    A refund_ref counts toward the cap unless it has a FAILED row.
CREATE OR REPLACE FUNCTION kk_refund_check_insert() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p record;
  first_row record;
  refunded bigint;
BEGIN
  IF current_setting('transaction_isolation') = 'repeatable read' THEN
    RAISE EXCEPTION 'kk_isolation: refunds must run under READ COMMITTED or SERIALIZABLE' USING ERRCODE = '25001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('refund:' || NEW.payment_id::text, 0));
  SELECT * INTO p FROM payment WHERE id = NEW.payment_id;
  IF NOT FOUND OR p.status <> 'SUCCEEDED' OR p.method <> 'DIGITAL' OR p.booking_id <> NEW.booking_id THEN
    RAISE EXCEPTION 'kk_refund: target must be a SUCCEEDED DIGITAL payment of the same booking' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO first_row FROM refund WHERE refund_ref = NEW.refund_ref AND status = 'ISSUED' LIMIT 1;
  IF FOUND THEN
    IF NEW.status = 'ISSUED' THEN
      RAISE EXCEPTION 'kk_refund: refund % is already issued', NEW.refund_ref USING ERRCODE = '23514';
    END IF;
    IF (first_row.payment_id, first_row.booking_id, first_row.amount_minor)
       IS DISTINCT FROM (NEW.payment_id, NEW.booking_id, NEW.amount_minor) THEN
      RAISE EXCEPTION 'kk_refund: rows of one refund_ref must keep payment, booking and amount' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.status <> 'ISSUED' THEN
      RAISE EXCEPTION 'kk_refund: the first row of a refund must be ISSUED' USING ERRCODE = '23514';
    END IF;
    SELECT COALESCE(SUM(i.amount_minor), 0) INTO refunded
      FROM refund i
     WHERE i.payment_id = NEW.payment_id AND i.status = 'ISSUED'
       AND NOT EXISTS (SELECT 1 FROM refund f WHERE f.refund_ref = i.refund_ref AND f.status = 'FAILED');
    IF refunded + NEW.amount_minor > p.amount_minor THEN
      RAISE EXCEPTION 'kk_refund: refunds would exceed the payment amount' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION kk_refund_check_insert() IS 'Refund insert guard: SUCCEEDED DIGITAL target, cap at the paid amount, one refund_ref keeps payment/booking/amount (BP §26; PAY-004, PAY-006).';
CREATE TRIGGER kk_refund_check_insert BEFORE INSERT ON "refund" FOR EACH ROW EXECUTE FUNCTION kk_refund_check_insert();

-- 5. Decisions are final; evidence columns never change (BP §8.3, §26; ROLE-003; LEDGER-PAY-004; PAY-007; ABUSE-010).
--    Arguments: decision column ('' = none), open value ('NULL' = open while null), always-immutable columns (CSV).
--    Must match FROZEN_TABLES in prisma/tools/append-only.ts.
CREATE OR REPLACE FUNCTION kk_freeze_after_decision() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb := to_jsonb(NEW);
  changed text[];
  immutable_cols text[] := string_to_array(NULLIF(TG_ARGV[2], ''), ',');
  decided boolean := false;
BEGIN
  SELECT COALESCE(array_agg(n.key), '{}') INTO changed
    FROM jsonb_each(new_row) AS n
   WHERE n.value IS DISTINCT FROM old_row -> n.key AND n.key NOT IN ('updated_at', 'version');
  IF cardinality(changed) = 0 THEN
    RETURN NEW;
  END IF;
  IF TG_ARGV[0] <> '' THEN
    IF TG_ARGV[1] = 'NULL' THEN
      decided := (old_row ->> TG_ARGV[0]) IS NOT NULL;
    ELSE
      decided := (old_row ->> TG_ARGV[0]) IS DISTINCT FROM TG_ARGV[1];
    END IF;
  END IF;
  IF decided THEN
    RAISE EXCEPTION 'kk_decision_final: % row % is already decided; % cannot change (BP §26)',
      TG_TABLE_NAME, old_row ->> 'id', changed USING ERRCODE = '55000';
  END IF;
  IF immutable_cols IS NOT NULL AND changed && immutable_cols THEN
    RAISE EXCEPTION 'kk_immutable_column: % columns % never change (BP §26)', TG_TABLE_NAME, changed USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION kk_freeze_after_decision() IS 'Freezes a row once its decision column left the open value, and always freezes listed evidence columns (BP §26; ROLE-003; LEDGER-PAY-004; PAY-007; ABUSE-010).';

-- kk:frozen-triggers
CREATE TRIGGER kk_freeze BEFORE UPDATE ON "commission_payment_submission" FOR EACH ROW EXECUTE FUNCTION kk_freeze_after_decision('status', 'SUBMITTED', 'provider_profile_id,amount_minor,transaction_ref,screenshot_media_id,submitted_at,submitted_by_user_id');
CREATE TRIGGER kk_freeze BEFORE UPDATE ON "settlement" FOR EACH ROW EXECUTE FUNCTION kk_freeze_after_decision('status', 'PENDING', 'provider_profile_id,amount_minor');
CREATE TRIGGER kk_freeze BEFORE UPDATE ON "verification_record" FOR EACH ROW EXECUTE FUNCTION kk_freeze_after_decision('status', 'SUBMITTED', 'provider_profile_id,requested_level,category_id,document_media_ids,submitted_at');
CREATE TRIGGER kk_freeze BEFORE UPDATE ON "dispute" FOR EACH ROW EXECUTE FUNCTION kk_freeze_after_decision('outcome', 'NULL', 'booking_id,opened_by_user_id,opened_by_role,description,evidence_media_ids,is_safety');
CREATE TRIGGER kk_freeze BEFORE UPDATE ON "review_flag" FOR EACH ROW EXECUTE FUNCTION kk_freeze_after_decision('status', 'OPEN', 'review_id,flagged_by_user_id,reason');
CREATE TRIGGER kk_freeze BEFORE UPDATE ON "admin_user_sub_role" FOR EACH ROW EXECUTE FUNCTION kk_freeze_after_decision('revoked_at', 'NULL', 'admin_user_id,sub_role,granted_by_user_id,created_at');
CREATE TRIGGER kk_freeze BEFORE UPDATE ON "media_object" FOR EACH ROW EXECUTE FUNCTION kk_freeze_after_decision('', '', 'owner_user_id,kind,purpose,sensitivity,storage_key');

-- 6. Location snapshots are frozen once confirmed or once a booking uses them (BP §21; PROF-ADDR-002; LOC-GEO-004).
CREATE OR REPLACE FUNCTION kk_location_snapshot_freeze() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.confirmation_status = 'CONFIRMED' THEN
    RAISE EXCEPTION 'kk_decision_final: location snapshot % is confirmed; create a new snapshot (BP §21)', OLD.id USING ERRCODE = '55000';
  END IF;
  PERFORM 1 FROM booking WHERE location_snapshot_id = OLD.id LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'kk_decision_final: location snapshot % is used by a booking; create a new snapshot (BP §21)', OLD.id USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
COMMENT ON FUNCTION kk_location_snapshot_freeze() IS 'Location snapshot cannot change once confirmed or used by a booking (BP §21; PROF-ADDR-002; LOC-GEO-004).';
CREATE TRIGGER kk_location_snapshot_freeze BEFORE UPDATE ON "location_snapshot" FOR EACH ROW EXECUTE FUNCTION kk_location_snapshot_freeze();

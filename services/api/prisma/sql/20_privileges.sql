-- kk:section privileges (T2.3; BP §26, §29 least privilege; DATA-003, DATA-004, LEDGER-005, PAY-003;
-- SEC-REVIEW-T2.3 #1, #4, #14, #16). Lists must match prisma/tools/append-only.ts (unit test).
--
-- Roles:
--   * migration owner = MIGRATION_DATABASE_URL (owns every table; runs `prisma migrate`).
--   * kaamkaro_app    = NOLOGIN group role with the API's privileges (created here if missing).
--   * the API logs in with DATABASE_URL as a LOGIN role that is a member of kaamkaro_app and is
--     NOT the owner, not a superuser and has no BYPASSRLS (checked at API start-up).
-- In staging/production a DBA runs infra/db/bootstrap.sql once (extension + roles) so the
-- migration owner needs no superuser rights; the IF NOT EXISTS guards make this file a no-op then.

-- Role and PUBLIC hardening need CREATEROLE / schema and database ownership: done here only when the
-- migration login has those rights (local docker, CI superuser); otherwise bootstrap.sql did it already.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kaamkaro_app') THEN
    CREATE ROLE kaamkaro_app NOLOGIN;
    COMMENT ON ROLE kaamkaro_app IS 'Kaam Karo API role: SELECT/INSERT everywhere, UPDATE except append-only tables, DELETE only on the allow-list (BP §26, §29; DATA-004; LEDGER-005; PAY-003).';
  END IF;
  -- Nobody but the owner creates objects in public; no temp tables for PUBLIC (SEC-REVIEW-T2.3 #16).
  IF pg_has_role(current_user, (SELECT nspowner FROM pg_namespace WHERE nspname = 'public'), 'MEMBER') THEN
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
  END IF;
  IF pg_has_role(current_user, (SELECT datdba FROM pg_database WHERE datname = current_database()), 'MEMBER') THEN
    EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO kaamkaro_app;

-- Start from zero, then grant explicitly (default deny).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM kaamkaro_app;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO kaamkaro_app;

-- UPDATE on every table except the append-only and non-app tables.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename NOT IN (
         -- kk:append-only
         'audit_log',
         'marketplace_event',
         'job_event',
         'provider_ledger_entry',
         'payment',
         'payment_method_record',
         'refund',
         'config_rule',
         -- kk:non-app
         '_prisma_migrations',
         'spatial_ref_sys'
       )
  LOOP
    EXECUTE format('GRANT UPDATE ON TABLE public.%I TO kaamkaro_app', t);
  END LOOP;
END
$$;

-- DELETE only where rows may really go away (purges, user-removable settings). Everything else is
-- soft-deleted or anonymised (DATA-003; SEC-AUTH-008).
GRANT DELETE ON TABLE
  "outbox_event",
  "idempotency_key",
  "device_session",
  "favorite",
  "notification_preference",
  "availability_rule",
  "service_area",
  "match_candidate",
  "user_role",
  "admin_recovery_code"
TO kaamkaro_app;

-- Not application data.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public._prisma_migrations FROM kaamkaro_app;
  END IF;
  IF to_regclass('public.spatial_ref_sys') IS NOT NULL THEN
    REVOKE ALL ON TABLE public.spatial_ref_sys FROM kaamkaro_app;
    GRANT SELECT ON TABLE public.spatial_ref_sys TO kaamkaro_app;
  END IF;
END
$$;

-- Future tables: SELECT/INSERT only. A migration that adds a mutable table must GRANT UPDATE (and
-- DELETE only if it joins the allow-list) explicitly (SEC-REVIEW-T2.3 #14).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT ON TABLES TO kaamkaro_app;

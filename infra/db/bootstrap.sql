-- One-time database bootstrap, run by a DBA/superuser BEFORE `prisma migrate deploy`
-- (T2.3; BP §26, §29 least privilege; SEC-REVIEW-T2.3 #1, #16; ops follow-up in T2.7 / OQ-038).
--
--   psql "<superuser url>/<database>" -v ON_ERROR_STOP=1 \
--        -v app_login=kaamkaro_api -v app_password="<from the secret manager>" -f infra/db/bootstrap.sql
--
-- Creates: the PostGIS extension, the NOLOGIN group role kaamkaro_app (privileges are granted by the
-- migration), and the API login role (member of kaamkaro_app; NOT the table owner, NOT superuser,
-- NOBYPASSRLS). The migration owner is the role in MIGRATION_DATABASE_URL; the API uses DATABASE_URL.
-- Local docker runs this automatically on first start (infra/db/init/10-bootstrap.sh).

CREATE EXTENSION IF NOT EXISTS postgis;

SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kaamkaro_app') AS need_app_role \gset
\if :need_app_role
  CREATE ROLE kaamkaro_app NOLOGIN;
\endif
COMMENT ON ROLE kaamkaro_app IS 'Kaam Karo API role: SELECT/INSERT everywhere, UPDATE except append-only tables, DELETE only on the allow-list (BP §26, §29; DATA-004; LEDGER-005; PAY-003).';

SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_login') AS need_login \gset
\if :need_login
  CREATE ROLE :"app_login" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD :'app_password' IN ROLE kaamkaro_app;
\else
  ALTER ROLE :"app_login" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD :'app_password';
  GRANT kaamkaro_app TO :"app_login";
\endif

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database()) \gexec

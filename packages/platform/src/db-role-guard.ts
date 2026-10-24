/**
 * Start-up guard for the API's database login (T2.3; BP §26, §29 least privilege; DATA-004,
 * LEDGER-005, PAY-003; SEC-REVIEW-T2.3 #1).
 *
 * The append-only grants only protect history when the API is NOT the table owner, NOT a superuser
 * and has no BYPASSRLS: those roles can drop triggers or skip grants. The API therefore checks its
 * own login before it serves traffic and refuses to start otherwise. `test` runs are exempt (unit
 * tests have no database); the DB tests check the real login separately.
 */
import type { AppEnv } from './env';

/** Name of the application group role created by the init migration / infra/db/bootstrap.sql. */
export const APP_DB_ROLE = 'kaamkaro_app';

/** One row; `table_owner` is null when the schema has not been migrated yet. */
export const DB_ROLE_FACTS_SQL = `
SELECT r.rolname AS login,
       r.rolsuper AS is_superuser,
       r.rolbypassrls AS bypasses_rls,
       r.rolcreaterole AS can_create_role,
       r.rolcreatedb AS can_create_db,
       t.tableowner AS table_owner,
       CASE WHEN t.tableowner IS NULL THEN false ELSE pg_has_role(current_user, t.tableowner, 'MEMBER') END AS is_owner_member,
       CASE WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_DB_ROLE}')
            THEN pg_has_role(current_user, '${APP_DB_ROLE}', 'MEMBER') ELSE false END AS is_app_member
  FROM pg_roles r
  LEFT JOIN pg_tables t ON t.schemaname = 'public' AND t.tablename = 'provider_ledger_entry'
 WHERE r.rolname = current_user`;

export interface DbRoleFacts {
  login: string;
  is_superuser: boolean;
  bypasses_rls: boolean;
  can_create_role: boolean;
  can_create_db: boolean;
  table_owner: string | null;
  is_owner_member: boolean;
  is_app_member: boolean;
}

export class DbRoleError extends Error {
  constructor(public readonly problems: readonly string[]) {
    super(`Unsafe database login for the API:\n- ${problems.join('\n- ')}`);
    this.name = 'DbRoleError';
  }
}

/** Every reason why this login must not run the API (empty = safe). */
export function dbRoleProblems(facts: DbRoleFacts | undefined): string[] {
  if (facts === undefined) return ['could not read the role of the current database login'];
  const problems: string[] = [];
  if (facts.is_superuser) problems.push(`login "${facts.login}" is a superuser`);
  if (facts.bypasses_rls) problems.push(`login "${facts.login}" has BYPASSRLS`);
  if (facts.can_create_role) problems.push(`login "${facts.login}" has CREATEROLE`);
  if (facts.can_create_db) problems.push(`login "${facts.login}" has CREATEDB`);
  if (facts.table_owner === null)
    problems.push('schema not migrated (provider_ledger_entry missing)');
  else if (facts.is_owner_member)
    problems.push(`login "${facts.login}" is (a member of) the table owner "${facts.table_owner}"`);
  if (!facts.is_app_member)
    problems.push(`login "${facts.login}" is not a member of ${APP_DB_ROLE}`);
  return problems;
}

export type DbQuery = (sql: string) => Promise<readonly DbRoleFacts[]>;

/**
 * Throws {@link DbRoleError} when the login is unsafe. Skipped only for APP_ENV=test.
 * Connection failures propagate: callers decide (deployed envs must refuse to start).
 */
export async function assertAppDbRole(appEnv: AppEnv, query: DbQuery): Promise<void> {
  if (appEnv === 'test') return;
  const rows = await query(DB_ROLE_FACTS_SQL);
  const problems = dbRoleProblems(rows[0]);
  if (problems.length > 0) throw new DbRoleError(problems);
}

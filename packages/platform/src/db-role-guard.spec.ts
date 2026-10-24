import { describe, expect, it } from 'vitest';
import {
  DB_ROLE_FACTS_SQL,
  DbRoleError,
  assertAppDbRole,
  dbRoleProblems,
  type DbRoleFacts,
} from './db-role-guard';

const SAFE: DbRoleFacts = {
  login: 'kaamkaro_api',
  is_superuser: false,
  bypasses_rls: false,
  can_create_role: false,
  can_create_db: false,
  table_owner: 'kaamkaro',
  is_owner_member: false,
  is_app_member: true,
};

describe('[DATA-004] API database login guard (BP §26, §29; SEC-REVIEW-T2.3 #1)', () => {
  it('[DATA-004] a non-owner member of kaamkaro_app is accepted', () => {
    expect(dbRoleProblems(SAFE)).toEqual([]);
  });

  it.each([
    ['superuser', { is_superuser: true }, /superuser/],
    ['BYPASSRLS', { bypasses_rls: true }, /BYPASSRLS/],
    ['CREATEROLE (BUG-0005)', { can_create_role: true }, /CREATEROLE/],
    ['CREATEDB', { can_create_db: true }, /CREATEDB/],
    ['table owner', { is_owner_member: true }, /table owner/],
    ['not in kaamkaro_app', { is_app_member: false }, /not a member of kaamkaro_app/],
    ['schema not migrated', { table_owner: null }, /not migrated/],
  ] as const)('[LEDGER-005] refuses a login that is %s', (_name, patch, message) => {
    expect(dbRoleProblems({ ...SAFE, ...patch }).join('\n')).toMatch(message);
  });

  it('[PAY-003] refuses when the facts cannot be read', () => {
    expect(dbRoleProblems(undefined)).toEqual([
      'could not read the role of the current database login',
    ]);
  });

  it.each(['development', 'staging', 'production'] as const)(
    '[DATA-004] %s refuses to start as a superuser owner',
    async (appEnv) => {
      const query = async () => [{ ...SAFE, is_superuser: true, is_owner_member: true }];
      await expect(assertAppDbRole(appEnv, query)).rejects.toBeInstanceOf(DbRoleError);
    },
  );

  it('[DATA-004] runs the facts query and passes a safe login; test env skips the check', async () => {
    const seen: string[] = [];
    await assertAppDbRole('production', async (sql) => {
      seen.push(sql);
      return [SAFE];
    });
    expect(seen).toEqual([DB_ROLE_FACTS_SQL]);
    await expect(
      assertAppDbRole('test', async () => {
        throw new Error('must not query');
      }),
    ).resolves.toBeUndefined();
  });
});

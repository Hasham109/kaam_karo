/**
 * Database-level tests for schema v1 (T2.3; SEC-REVIEW-T2.3 #1–#9, #11, #13, #17, #19; QA BUG-QA-T2.3-03).
 * Needs a migrated PostgreSQL + PostGIS and TWO logins (see .env.example):
 *   MIGRATION_DATABASE_URL = table owner (runs migrations; owner-level trigger tests)
 *   DATABASE_URL           = the API login: member of kaamkaro_app, NOT owner/superuser
 *   pnpm --filter @kaamkaro/api db:deploy && pnpm --filter @kaamkaro/api test:db
 * Every test runs in a transaction that is rolled back.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { DB_ROLE_FACTS_SQL, dbRoleProblems, type DbRoleFacts } from '@kaamkaro/platform';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  APP_ROLE,
  APPEND_ONLY_TABLES,
  DELETE_ALLOWED_TABLES,
  NON_APP_TABLES,
} from '../tools/append-only.ts';
import { buildCommentStatements } from '../tools/comments.ts';
import { API_ROOT, SCHEMA_DIR } from '../tools/db-schema.ts';
import { readSchemaDir } from '../tools/schema-model.ts';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl)
  throw new Error('test:db needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL (owner)');
if (appUrl === ownerUrl)
  throw new Error('DATABASE_URL must be the non-owner API login, not the owner');
const app = new PrismaClient({ adapter: new PrismaPg({ connectionString: appUrl }) });
const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: ownerUrl }) });
afterAll(async () => {
  await app.$disconnect();
  await owner.$disconnect();
});

const schema = readSchemaDir(SCHEMA_DIR);
class Rollback extends Error {}

/** Runs setup statements then `attempt` as `who` in one rolled-back transaction; returns the attempt's error text. */
async function attempt(
  who: 'app' | 'owner',
  setup: string[],
  sql: string,
): Promise<string | undefined> {
  const client = who === 'app' ? app : owner;
  let failure: string | undefined;
  let setupError: string | undefined;
  await expect(
    client.$transaction(async (tx) => {
      for (const statement of setup) {
        try {
          await tx.$executeRawUnsafe(statement);
        } catch (error) {
          setupError = `setup failed: ${statement}
${String(error)}`;
          throw new Rollback('rollback');
        }
      }
      try {
        await tx.$executeRawUnsafe(sql);
      } catch (error) {
        failure = String(error);
      }
      throw new Rollback('rollback');
    }),
  ).rejects.toBeInstanceOf(Rollback);
  if (setupError !== undefined) throw new Error(setupError);
  return failure;
}

const GRANT_DENIED = /permission denied for table/;

// ---- fixtures (fixed UUIDs; everything is rolled back) -----------------------------------------
const B = '00000000-0000-4000-8000-000000000b01';
const PROV = '00000000-0000-4000-8000-000000000a01';
const OTHER_PROV = '00000000-0000-4000-8000-000000000a02';
const CUST = '00000000-0000-4000-8000-000000000c01';
const USER = '00000000-0000-4000-8000-000000000d01';
const PAY_CASH = '00000000-0000-4000-8000-000000000e01';
const PAY_DIG = '00000000-0000-4000-8000-000000000e02';
const SUB = '00000000-0000-4000-8000-000000000f01';
const SETTLE = '00000000-0000-4000-8000-000000000f02';
const LEDGER = '00000000-0000-4000-8000-000000000f03';

const booking = `INSERT INTO booking (id, customer_profile_id, service_id, selling_mode) VALUES ('${B}', '${CUST}', gen_random_uuid(), 'INSTANT')`;
const cashRecord = `INSERT INTO payment_method_record (booking_id, method, recorded_by_user_id) VALUES ('${B}', 'CASH', '${USER}')`;
const digitalRecord = `INSERT INTO payment_method_record (booking_id, method, recorded_by_user_id) VALUES ('${B}', 'DIGITAL', '${USER}')`;
const payment = (
  id: string,
  ref: string,
  method: string,
  status: string,
  amount = 380000,
  bookingId = B,
) =>
  `INSERT INTO payment (id, payment_ref, booking_id, customer_profile_id, provider_profile_id, method, status, amount_minor)
   VALUES ('${id}', '${ref}', '${bookingId}', '${CUST}', '${PROV}', '${method}', '${status}', ${amount})`;
const REF_CASH = '00000000-0000-4000-8000-000000000101';
const REF_DIG = '00000000-0000-4000-8000-000000000102';
const CASH = [booking, cashRecord, payment(PAY_CASH, REF_CASH, 'CASH', 'CASH_RECORDED')];
const DIGITAL = [booking, digitalRecord, payment(PAY_DIG, REF_DIG, 'DIGITAL', 'SUCCEEDED')];
const ledger = (cols: Record<string, string | number>) => {
  const all: Record<string, string | number> = {
    provider_profile_id: PROV,
    idempotency_key: `k-${Math.random()}`,
    ...cols,
  };
  const values = Object.values(all).map((v) =>
    typeof v === 'number' ? String(v) : v === 'NULL' ? 'NULL' : `'${v}'`,
  );
  return `INSERT INTO provider_ledger_entry (${Object.keys(all).join(', ')}) VALUES (${values.join(', ')})`;
};
const commissionDebit = ledger({
  id: LEDGER,
  entry_type: 'COMMISSION_DEBIT',
  direction: 'DEBIT',
  amount_minor: 60000,
  booking_id: B,
  payment_id: PAY_CASH,
});
const submission = (status = 'SUBMITTED') =>
  `INSERT INTO commission_payment_submission (id, provider_profile_id, amount_minor, transaction_ref, submitted_by_user_id, status${status === 'SUBMITTED' ? '' : ', decided_by_user_id, decided_at, decision_reason'})
   VALUES ('${SUB}', '${PROV}', 60000, 'TX-1', '${USER}', '${status}'${status === 'SUBMITTED' ? '' : `, gen_random_uuid(), now(), 'checked'`})`;
const settlement = `INSERT INTO settlement (id, provider_profile_id, amount_minor) VALUES ('${SETTLE}', '${PROV}', 5000)`;

/** One valid row per append-only table, inserted by the API login. */
const APPEND_ONLY_FIXTURES: Record<(typeof APPEND_ONLY_TABLES)[number], string[]> = {
  audit_log: [
    `INSERT INTO audit_log (actor_role, action, object_type) VALUES ('SYSTEM', 'TEST', 'test')`,
  ],
  marketplace_event: [
    `INSERT INTO marketplace_event (actor_role, action, object_type, object_id) VALUES ('SYSTEM', 'TEST', 'test', 'x')`,
  ],
  job_event: [
    booking,
    `INSERT INTO job_event (booking_id, actor_role, action) VALUES ('${B}', 'SYSTEM', 'TEST')`,
  ],
  provider_ledger_entry: [...CASH, commissionDebit],
  payment: CASH,
  payment_method_record: [booking, cashRecord],
  refund: [
    ...DIGITAL,
    `INSERT INTO refund (refund_ref, payment_id, booking_id, amount_minor, status, reason) VALUES (gen_random_uuid(), '${PAY_DIG}', '${B}', 1000, 'ISSUED', 'test')`,
  ],
  config_rule: [
    `INSERT INTO config_rule (key, scope, value, effective_from) VALUES ('test.key', 'GLOBAL', NULL, now())`,
  ],
};

describe('database login separation (SEC-REVIEW-T2.3 #1)', () => {
  it('[DATA-004] DATABASE_URL is a safe non-owner member of kaamkaro_app; the owner login is refused by the guard', async () => {
    const [appFacts] = await app.$queryRawUnsafe<DbRoleFacts[]>(DB_ROLE_FACTS_SQL);
    expect(dbRoleProblems(appFacts)).toEqual([]);
    const [ownerFacts] = await owner.$queryRawUnsafe<DbRoleFacts[]>(DB_ROLE_FACTS_SQL);
    expect(dbRoleProblems(ownerFacts).length).toBeGreaterThan(0);
  });
});

describe('PostGIS, comments, drift', () => {
  it('[DATA-001] the postgis extension is installed', async () => {
    const rows = await owner.$queryRawUnsafe<{ extname: string }[]>(
      `SELECT extname FROM pg_extension WHERE extname = 'postgis'`,
    );
    expect(rows).toHaveLength(1);
  });

  it('[DATA-001] every table, column and enum type carries its generated BP/D/requirement comment', async () => {
    const rows = await owner.$queryRawUnsafe<{ key: string; text: string | null }[]>(`
      SELECT 'TABLE ' || c.relname AS key, obj_description(c.oid, 'pg_class') AS text
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
      UNION ALL
      SELECT 'COLUMN ' || c.relname || '.' || a.attname, col_description(c.oid, a.attnum)
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
       WHERE n.nspname = 'public' AND c.relkind = 'r'
      UNION ALL
      SELECT 'TYPE ' || t.typname, obj_description(t.oid, 'pg_type')
        FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public' AND t.typtype = 'e'`);
    const actual = new Map(rows.map((r) => [r.key, r.text]));
    const notOurs = (key: string) =>
      /^(TABLE|COLUMN) (_prisma_migrations|spatial_ref_sys)\b/.test(key);
    expect(rows.filter((r) => !notOurs(r.key) && !r.text).map((r) => r.key)).toEqual([]);
    for (const s of buildCommentStatements(schema)) expect(actual.get(s.key), s.key).toBe(s.text);
  });

  it('[DATA-001] the migrated database matches prisma/schema (no drift)', () => {
    const cli = createRequire(join(API_ROOT, 'package.json')).resolve('prisma/build/index.js');
    const result = spawnSync(
      process.execPath,
      [
        cli,
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema',
        '--exit-code',
      ],
      { cwd: API_ROOT, encoding: 'utf8', env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' } },
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
  });
});

describe('privilege matrix of kaamkaro_app (BP §26, §29; SEC-REVIEW-T2.3 #4, #14)', () => {
  it('[DATA-003] every table: SELECT/INSERT yes; UPDATE unless append-only; DELETE only on the allow-list; never TRUNCATE', async () => {
    const appendOnly = new Set<string>(APPEND_ONLY_TABLES);
    const deletable = new Set<string>(DELETE_ALLOWED_TABLES);
    for (const model of schema.models) {
      const t = `public.${model.table}`;
      const [row] = await owner.$queryRawUnsafe<Record<string, boolean>[]>(
        `SELECT has_table_privilege($1, $2, 'SELECT') AS s, has_table_privilege($1, $2, 'INSERT') AS i,
                has_table_privilege($1, $2, 'UPDATE') AS u, has_table_privilege($1, $2, 'DELETE') AS d,
                has_table_privilege($1, $2, 'TRUNCATE') AS t`,
        APP_ROLE,
        t,
      );
      expect(row, model.table).toEqual({
        s: true,
        i: true,
        u: !appendOnly.has(model.table),
        d: deletable.has(model.table),
        t: false,
      });
    }
    for (const table of NON_APP_TABLES) {
      const [row] = await owner.$queryRawUnsafe<{ i: boolean }[]>(
        `SELECT has_table_privilege($1, $2, 'INSERT') AS i`,
        APP_ROLE,
        `public.${table}`,
      );
      expect(row?.i, table).toBe(false);
    }
  });

  it.each([
    'user_account',
    'booking',
    'provider_profile',
    'settlement',
    'commission_payment_submission',
  ])('[DATA-003] the API login cannot DELETE from %s', async (table) => {
    expect(await attempt('app', [], `DELETE FROM ${table}`)).toMatch(GRANT_DENIED);
  });
});

describe('append-only tables (BP §26)', () => {
  for (const table of APPEND_ONLY_TABLES) {
    const setup = APPEND_ONLY_FIXTURES[table];

    it(`[LEDGER-005] [PAY-003] API login: INSERT into ${table} works; UPDATE/DELETE are refused by the grant (not the trigger)`, async () => {
      expect(await attempt('app', setup, 'SELECT 1')).toBeUndefined();
      for (const sql of [`UPDATE ${table} SET id = id`, `DELETE FROM ${table}`]) {
        const error = await attempt('app', setup, sql);
        expect(error, sql).toMatch(GRANT_DENIED);
        expect(error, sql).not.toMatch(/kk_append_only/);
      }
    });

    it(`[DATA-004] trigger: even the owner cannot UPDATE, DELETE or TRUNCATE ${table}`, async () => {
      for (const sql of [
        `UPDATE ${table} SET id = id`,
        `DELETE FROM ${table}`,
        `TRUNCATE ${table} CASCADE`,
      ]) {
        expect(await attempt('owner', setup, sql), sql).toMatch(/kk_append_only/);
      }
    });
  }
});

describe('ledger insert guard (SEC-REVIEW-T2.3 #2; PAY-004)', () => {
  it('[LEDGER-003] COMMISSION_DEBIT needs a CASH record; it is refused on a DIGITAL booking', async () => {
    expect(await attempt('app', CASH, commissionDebit)).toBeUndefined();
    const debit = ledger({
      entry_type: 'COMMISSION_DEBIT',
      direction: 'DEBIT',
      amount_minor: 60000,
      booking_id: B,
    });
    expect(await attempt('app', DIGITAL, debit)).toMatch(
      /kk_ledger_link: COMMISSION_DEBIT needs a CASH/,
    );
  });

  it('[LEDGER-004] JOB_CREDIT needs a SUCCEEDED DIGITAL payment of the same booking/provider and amount <= payment', async () => {
    const credit = (cols: Record<string, string | number>) =>
      ledger({
        entry_type: 'JOB_CREDIT',
        direction: 'CREDIT',
        booking_id: B,
        payment_id: PAY_DIG,
        amount_minor: 320000,
        ...cols,
      });
    expect(await attempt('app', DIGITAL, credit({}))).toBeUndefined();
    expect(await attempt('app', DIGITAL, credit({ amount_minor: 380001 }))).toMatch(
      /kk_ledger_link: JOB_CREDIT/,
    );
    expect(await attempt('app', DIGITAL, credit({ provider_profile_id: OTHER_PROV }))).toMatch(
      /kk_ledger_link: JOB_CREDIT/,
    );
    expect(await attempt('app', CASH, credit({ payment_id: PAY_CASH }))).toMatch(
      /kk_ledger_link: JOB_CREDIT/,
    );
    expect(
      await attempt(
        'app',
        DIGITAL,
        ledger({ entry_type: 'JOB_CREDIT', direction: 'CREDIT', booking_id: B, amount_minor: 1 }),
      ),
    ).toMatch(/ledger_job_credit_has_payment|kk_ledger_link: JOB_CREDIT/);
  });

  it('[LEDGER-PAY-006] COMPANY_PAYMENT_CREDIT needs an APPROVED submission of the same provider and amount', async () => {
    const credit = (cols: Record<string, string | number> = {}) =>
      ledger({
        entry_type: 'COMPANY_PAYMENT_CREDIT',
        direction: 'CREDIT',
        commission_payment_submission_id: SUB,
        amount_minor: 60000,
        ...cols,
      });
    expect(await attempt('app', [submission('APPROVED')], credit())).toBeUndefined();
    expect(await attempt('app', [submission('SUBMITTED')], credit())).toMatch(
      /kk_ledger_link: COMPANY_PAYMENT_CREDIT/,
    );
    expect(await attempt('app', [submission('REJECTED')], credit())).toMatch(
      /kk_ledger_link: COMPANY_PAYMENT_CREDIT/,
    );
    expect(
      await attempt('app', [submission('APPROVED')], credit({ amount_minor: 5000000 })),
    ).toMatch(/kk_ledger_link/);
    expect(
      await attempt('app', [submission('APPROVED')], credit({ provider_profile_id: OTHER_PROV })),
    ).toMatch(/kk_ledger_link/);
    expect(
      await attempt(
        'app',
        [],
        ledger({ entry_type: 'COMPANY_PAYMENT_CREDIT', direction: 'CREDIT', amount_minor: 100 }),
      ),
    ).toMatch(/ledger_links_match_type|kk_ledger_link: COMPANY_PAYMENT_CREDIT/);
  });

  it('[LEDGER-PAY-005] one credit per approved submission (unique index)', async () => {
    const credit = (key: string) =>
      ledger({
        entry_type: 'COMPANY_PAYMENT_CREDIT',
        direction: 'CREDIT',
        commission_payment_submission_id: SUB,
        amount_minor: 60000,
        idempotency_key: key,
      });
    expect(await attempt('app', [submission('APPROVED'), credit('a')], credit('b'))).toMatch(
      /ledger_one_credit_per_submission|Unique constraint/,
    );
  });

  it('[PAY-007] SETTLEMENT_DEBIT must match its settlement', async () => {
    const debit = (amount: number) =>
      ledger({
        entry_type: 'SETTLEMENT_DEBIT',
        direction: 'DEBIT',
        settlement_id: SETTLE,
        amount_minor: amount,
      });
    expect(await attempt('app', [settlement], debit(5000))).toBeUndefined();
    expect(await attempt('app', [settlement], debit(4999))).toMatch(
      /kk_ledger_link: SETTLEMENT_DEBIT/,
    );
  });

  it('[LEDGER-002] one COMMISSION_DEBIT or JOB_CREDIT per booking (unique index)', async () => {
    const second = ledger({
      entry_type: 'COMMISSION_DEBIT',
      direction: 'DEBIT',
      amount_minor: 1,
      booking_id: B,
    });
    expect(await attempt('app', [...CASH, commissionDebit], second)).toMatch(
      /ledger_one_job_entry_per_booking|Unique constraint/,
    );
  });

  const reversal = (amount: number, direction: string, provider = PROV) =>
    ledger({
      entry_type: 'REVERSAL',
      direction,
      amount_minor: amount,
      reverses_entry_id: LEDGER,
      reason: 'test',
      provider_profile_id: provider,
    });

  it('[PAY-004] partial reversals up to the original amount are allowed; more is refused', async () => {
    expect(
      await attempt(
        'app',
        [...CASH, commissionDebit, reversal(40000, 'CREDIT')],
        reversal(20000, 'CREDIT'),
      ),
    ).toBeUndefined();
    expect(
      await attempt(
        'app',
        [...CASH, commissionDebit, reversal(40000, 'CREDIT')],
        reversal(20001, 'CREDIT'),
      ),
    ).toMatch(/kk_ledger_reversal: reversal exceeds/);
  });

  it('[PAY-004] a reversal must go the opposite direction and belong to the same provider', async () => {
    expect(await attempt('app', [...CASH, commissionDebit], reversal(100, 'DEBIT'))).toMatch(
      /opposite direction/,
    );
    expect(
      await attempt('app', [...CASH, commissionDebit], reversal(100, 'CREDIT', OTHER_PROV)),
    ).toMatch(/same provider/);
  });
});

describe('payment and refund consistency (SEC-REVIEW-T2.3 #5, #6)', () => {
  it('[LEDGER-002] a booking cannot have both CASH_RECORDED and SUCCEEDED, nor two of either', async () => {
    expect(await attempt('app', CASH, payment(PAY_DIG, REF_DIG, 'DIGITAL', 'SUCCEEDED'))).toMatch(
      /kk_payment|payment_one_settled_per_booking|Unique/,
    );
    expect(await attempt('app', CASH, payment(PAY_DIG, REF_DIG, 'CASH', 'CASH_RECORDED'))).toMatch(
      /payment_one_settled_per_booking|Unique/,
    );
    expect(
      await attempt('app', [booking], payment(PAY_DIG, REF_DIG, 'DIGITAL', 'PENDING')),
    ).toBeUndefined();
  });

  it('[D-030] method/status pairs, the recorded method and payment_ref facts are enforced', async () => {
    expect(
      await attempt('app', [booking, cashRecord], payment(PAY_CASH, REF_CASH, 'CASH', 'SUCCEEDED')),
    ).toMatch(/payment_method_matches_status/);
    expect(
      await attempt('app', [booking, cashRecord], payment(PAY_DIG, REF_DIG, 'DIGITAL', 'PENDING')),
    ).toMatch(/kk_payment: method/);
    expect(
      await attempt('app', [booking], payment(PAY_CASH, REF_CASH, 'CASH', 'CASH_RECORDED')),
    ).toMatch(/kk_payment: a CASH payment needs/);
    expect(
      await attempt(
        'app',
        [booking, payment(PAY_DIG, REF_DIG, 'DIGITAL', 'PENDING')],
        payment(PAY_CASH, REF_DIG, 'DIGITAL', 'FAILED', 1),
      ),
    ).toMatch(/kk_payment: rows of one payment_ref/);
    expect(await attempt('app', [booking, cashRecord], digitalRecord)).toMatch(
      /Unique constraint|payment_method_record_booking_id_key/,
    );
  });

  const refund = (
    amount: number,
    ref = 'gen_random_uuid()',
    status = 'ISSUED',
    target = PAY_DIG,
    reason: string | null = 'r',
  ) =>
    `INSERT INTO refund (refund_ref, payment_id, booking_id, amount_minor, status, reason)
     VALUES (${ref}, '${target}', '${B}', ${amount}, '${status}', ${reason === null ? 'NULL' : `'${reason}'`})`;

  it('[PAY-006] refunds are capped at the paid amount and only target SUCCEEDED DIGITAL payments', async () => {
    expect(await attempt('app', [...DIGITAL, refund(300000)], refund(80000))).toBeUndefined();
    expect(await attempt('app', [...DIGITAL, refund(300000)], refund(80001))).toMatch(
      /kk_refund: refunds would exceed/,
    );
    expect(await attempt('app', CASH, refund(1, 'gen_random_uuid()', 'ISSUED', PAY_CASH))).toMatch(
      /kk_refund: target must be/,
    );
    expect(
      await attempt('app', DIGITAL, refund(1, 'gen_random_uuid()', 'ISSUED', PAY_DIG, null)),
    ).toMatch(/refund_issued_has_reason/);
  });

  it('[PAY-006] a FAILED refund frees the cap; one refund_ref keeps its amount and starts ISSUED', async () => {
    const ref = `'00000000-0000-4000-8000-000000000301'`;
    expect(
      await attempt(
        'app',
        [...DIGITAL, refund(380000, ref), refund(380000, ref, 'FAILED')],
        refund(380000),
      ),
    ).toBeUndefined();
    expect(
      await attempt('app', [...DIGITAL, refund(1000, ref)], refund(2000, ref, 'SUCCEEDED')),
    ).toMatch(/kk_refund: rows of one refund_ref/);
    expect(await attempt('app', DIGITAL, refund(1000, ref, 'SUCCEEDED'))).toMatch(
      /kk_refund: the first row/,
    );
  });
});

describe('decisions are final (SEC-REVIEW-T2.3 #3, #7, #17)', () => {
  it('[LEDGER-PAY-004] a decided submission cannot be flipped; its evidence never changes', async () => {
    expect(
      await attempt(
        'app',
        [submission('APPROVED')],
        `UPDATE commission_payment_submission SET status = 'REJECTED' WHERE id = '${SUB}'`,
      ),
    ).toMatch(/kk_decision_final/);
    expect(
      await attempt(
        'app',
        [submission()],
        `UPDATE commission_payment_submission SET transaction_ref = 'other' WHERE id = '${SUB}'`,
      ),
    ).toMatch(/kk_immutable_column/);
    expect(
      await attempt(
        'app',
        [submission()],
        `UPDATE commission_payment_submission SET status = 'APPROVED', decided_by_user_id = gen_random_uuid(), decided_at = now(), decision_reason = 'ok' WHERE id = '${SUB}'`,
      ),
    ).toBeUndefined();
    expect(
      await attempt('app', [submission()], `DELETE FROM commission_payment_submission`),
    ).toMatch(GRANT_DENIED);
  });

  it('[PAY-007] settlement amount is frozen; PAID/FAILED is final', async () => {
    expect(
      await attempt(
        'app',
        [settlement],
        `UPDATE settlement SET amount_minor = 1 WHERE id = '${SETTLE}'`,
      ),
    ).toMatch(/kk_immutable_column/);
    const paid = `UPDATE settlement SET status = 'PAID', paid_at = now() WHERE id = '${SETTLE}'`;
    expect(await attempt('app', [settlement], paid)).toBeUndefined();
    expect(
      await attempt(
        'app',
        [settlement, paid],
        `UPDATE settlement SET status = 'PENDING' WHERE id = '${SETTLE}'`,
      ),
    ).toMatch(/kk_decision_final/);
  });

  it('[ROLE-003] verification, dispute outcome and review flag decisions are final', async () => {
    const v = `INSERT INTO verification_record (id, provider_profile_id, requested_level, status, decided_by_user_id, decided_at, decision_reason)
               VALUES ('${SUB}', '${PROV}', 'VERIFIED', 'REJECTED', gen_random_uuid(), now(), 'bad document')`;
    expect(
      await attempt(
        'app',
        [v],
        `UPDATE verification_record SET status = 'APPROVED' WHERE id = '${SUB}'`,
      ),
    ).toMatch(/kk_decision_final/);
    const d = `INSERT INTO dispute (id, booking_id, opened_by_user_id, opened_by_role, level, description, outcome, outcome_reason, decided_by_user_id, decided_at)
               VALUES ('${SUB}', '${B}', '${USER}', 'CUSTOMER', 'L3', 'x', 'RESOLVED', 'ok', gen_random_uuid(), now())`;
    expect(
      await attempt('app', [d], `UPDATE dispute SET outcome = 'REFUNDED' WHERE id = '${SUB}'`),
    ).toMatch(/kk_decision_final/);
    const r = `INSERT INTO review (id, booking_id, provider_profile_id, customer_profile_id, rating) VALUES ('${SETTLE}', '${B}', '${PROV}', '${CUST}', 4)`;
    const f = `INSERT INTO review_flag (id, review_id, flagged_by_user_id, reason, status, decided_by_user_id, decided_at, decision_reason)
               VALUES ('${SUB}', '${SETTLE}', '${USER}', 'spam', 'UPHELD', gen_random_uuid(), now(), 'ok')`;
    expect(
      await attempt(
        'app',
        [r, f],
        `UPDATE review_flag SET status = 'DISMISSED' WHERE id = '${SUB}'`,
      ),
    ).toMatch(/kk_decision_final/);
  });

  it('[ADMIN-ROLE-001] a revoked admin sub-role stays revoked and cannot be deleted; re-granting adds a new row', async () => {
    const user = `INSERT INTO user_account (id) VALUES ('${USER}')`;
    const adminRow = `INSERT INTO admin_user (id, user_id) VALUES ('${SUB}', '${USER}')`;
    const grant = `INSERT INTO admin_user_sub_role (id, admin_user_id, sub_role) VALUES ('${SETTLE}', '${SUB}', 'FINANCE')`;
    const revoke = `UPDATE admin_user_sub_role SET revoked_at = now(), revoked_by_user_id = gen_random_uuid() WHERE id = '${SETTLE}'`;
    expect(await attempt('app', [user, adminRow, grant], revoke)).toBeUndefined();
    expect(
      await attempt(
        'app',
        [user, adminRow, grant, revoke],
        `UPDATE admin_user_sub_role SET revoked_at = NULL WHERE id = '${SETTLE}'`,
      ),
    ).toMatch(/kk_decision_final/);
    expect(
      await attempt('app', [user, adminRow, grant], `DELETE FROM admin_user_sub_role`),
    ).toMatch(GRANT_DENIED);
    expect(
      await attempt(
        'app',
        [user, adminRow, grant, revoke],
        `INSERT INTO admin_user_sub_role (admin_user_id, sub_role) VALUES ('${SUB}', 'FINANCE')`,
      ),
    ).toBeUndefined();
    expect(
      await attempt(
        'app',
        [user, adminRow, grant],
        `INSERT INTO admin_user_sub_role (admin_user_id, sub_role) VALUES ('${SUB}', 'FINANCE')`,
      ),
    ).toMatch(/admin_user_sub_role_active_key|Unique/);
  });
});

describe('config, location, media, payout, booking number (SEC-REVIEW-T2.3 #8, #9, #11, #13; QA BUG-QA-T2.3-02)', () => {
  it('[CFG-RULE-003] config_rule rows are never back-dated', async () => {
    expect(
      await attempt(
        'app',
        [],
        `INSERT INTO config_rule (key, scope, value, effective_from) VALUES ('commission.rate', 'GLOBAL', '0.1', now() - interval '1 day')`,
      ),
    ).toMatch(/config_rule_not_backdated/);
  });

  it('[PROF-ADDR-002] a confirmed or booking-referenced location snapshot cannot change', async () => {
    const snap = (status: string) =>
      `INSERT INTO location_snapshot (id, address_text, source, confirmation_status, city_id) VALUES ('${SUB}', 'House 1', 'MANUAL_ENTRY', '${status}', gen_random_uuid())`;
    const edit = `UPDATE location_snapshot SET address_text = 'Elsewhere' WHERE id = '${SUB}'`;
    expect(await attempt('app', [snap('SUGGESTED')], edit)).toBeUndefined();
    expect(await attempt('app', [snap('CONFIRMED')], edit)).toMatch(/kk_decision_final/);
    const used = `INSERT INTO booking (customer_profile_id, service_id, selling_mode, location_snapshot_id) VALUES ('${CUST}', gen_random_uuid(), 'INSTANT', '${SUB}')`;
    expect(await attempt('app', [snap('SUGGESTED'), used], edit)).toMatch(/used by a booking/);
  });

  it('[INFRA-003] media purpose/sensitivity are fixed at upload; restricted purposes must be RESTRICTED', async () => {
    const media = (purpose: string, sensitivity: string) =>
      `INSERT INTO media_object (id, owner_user_id, kind, purpose, sensitivity, mime_type, storage_key) VALUES ('${SUB}', '${USER}', 'PHOTO', '${purpose}', '${sensitivity}', 'image/jpeg', 'k/${Math.random()}')`;
    expect(await attempt('app', [], media('PAYMENT_PROOF', 'STANDARD'))).toMatch(
      /media_object_restricted_purposes/,
    );
    expect(
      await attempt(
        'app',
        [media('CHAT', 'STANDARD')],
        `UPDATE media_object SET purpose = 'PROFILE_PHOTO' WHERE id = '${SUB}'`,
      ),
    ).toMatch(/kk_immutable_column/);
    expect(
      await attempt(
        'app',
        [media('CHAT', 'STANDARD')],
        `UPDATE media_object SET scan_status = 'CLEAN' WHERE id = '${SUB}'`,
      ),
    ).toBeUndefined();
  });

  it('[PAY-007] payout masked_number holds at most the last 4 digits', async () => {
    const method = (masked: string) =>
      `INSERT INTO payout_method (provider_profile_id, method_type, account_title, institution_code, masked_number) VALUES ('${PROV}', 'BANK_ACCOUNT', 'A', 'X', '${masked}')`;
    expect(await attempt('app', [], method('•••• 1234'))).toBeUndefined();
    expect(await attempt('app', [], method('PK36SCBL0000001123456702'))).toMatch(
      /payout_method_masked_number/,
    );
  });

  it('[UX-SCREEN-001] bookings get a unique 10-character booking number by default', async () => {
    let numbers: { booking_number: string }[] = [];
    await expect(
      app.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(booking);
        await tx.$executeRawUnsafe(booking.replace(B, '00000000-0000-4000-8000-000000000b02'));
        numbers = await tx.$queryRawUnsafe(
          `SELECT booking_number FROM booking WHERE customer_profile_id = '${CUST}'`,
        );
        throw new Rollback('rollback');
      }),
    ).rejects.toBeInstanceOf(Rollback);
    expect(numbers).toHaveLength(2);
    for (const n of numbers) expect(n.booking_number).toMatch(/^[0-9A-F]{10}$/);
    expect(numbers[0]?.booking_number).not.toBe(numbers[1]?.booking_number);
  });
});

describe('CHECK constraints', () => {
  it('[PROV-CREW-001] a quote with crew_size 0 is refused', async () => {
    expect(
      await attempt(
        'app',
        [],
        `INSERT INTO quote (booking_id, provider_profile_id, crew_size) VALUES (gen_random_uuid(), gen_random_uuid(), 0)`,
      ),
    ).toMatch(/quote_crew_size_positive/);
  });

  it('[BOOK-STATUS-017] a NO_SHOW booking without a party is refused', async () => {
    expect(
      await attempt(
        'app',
        [],
        `INSERT INTO booking (customer_profile_id, service_id, selling_mode, status) VALUES (gen_random_uuid(), gen_random_uuid(), 'INSTANT', 'NO_SHOW')`,
      ),
    ).toMatch(/booking_no_show_has_party/);
  });
});

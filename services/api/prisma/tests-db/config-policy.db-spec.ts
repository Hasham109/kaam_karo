/**
 * SEC-REVIEW-T2.6 #2, #3, #8 (T2.2 review fixes, A01) on a migrated AND seeded database
 * (`db:deploy` then `db:seed`): config_key_policy + the config_rule guard trigger, created_at set by
 * the server, no back-dating, and the stable service_zone.code.
 * BP §26, §29, §42, §57.2, §64; CFG-RULE-001…012; SEC-BASE-010; SEC-AUTH-004; SCOPE-GEO-002.
 *   DATABASE_URL = kaamkaro_api (non-owner), MIGRATION_DATABASE_URL = the table owner.
 * Every write runs in a transaction that is rolled back, so the shared test DB stays unchanged.
 */
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { CONFIG_KEYS } from '../../src/modules/config/config-keys.ts';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl)
  throw new Error('needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL');

const app = new PrismaClient({ adapter: new PrismaPg({ connectionString: appUrl }) });
const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: ownerUrl }) });

afterAll(async () => {
  await app.$disconnect();
  await owner.$disconnect();
});

class Rollback extends Error {}

/** Run SQL in a transaction that is always rolled back; returns the result or the DB error. */
async function attempt<T>(
  client: PrismaClient,
  fn: (tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]) => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; message: string }> {
  let value: T | undefined;
  try {
    await client.$transaction(async (tx) => {
      value = await fn(tx);
      throw new Rollback();
    });
  } catch (error) {
    if (error instanceof Rollback) return { ok: true, value: value as T };
    return { ok: false, message: (error as Error).message };
  }
  return { ok: true, value: value as T };
}

const actor = randomUUID();
const key = (k: string) => CONFIG_KEYS.find((d) => d.key === k);
const pick = (f: (d: (typeof CONFIG_KEYS)[number]) => boolean, what: string) => {
  const d = CONFIG_KEYS.find(f);
  if (!d) throw new Error(`registry has no ${what}`);
  return d;
};
const decided = pick(
  (d) => d.decidedBy !== undefined && d.scopes.includes('GLOBAL'),
  'decided key',
);
const failClosedInt = pick(
  (d) => d.failClosed === true && d.kind === 'positive_integer' && d.approval !== 'TWO_PERSON',
  'fail-closed positive_integer key',
);
const editable = pick(
  (d) =>
    d.decidedBy === undefined &&
    d.approval !== 'TWO_PERSON' &&
    d.kind === 'non_negative_integer' &&
    d.scopes.includes('GLOBAL'),
  'editable non_negative_integer key',
);
const globalOnly = pick(
  (d) => d.decidedBy === undefined && d.approval !== 'TWO_PERSON' && d.scopes.length === 1,
  'GLOBAL-only editable key',
);

function insert(
  k: string,
  value: string | null,
  opts: {
    scope?: string;
    scopeRef?: string | null;
    by?: string | null;
    from?: string;
    created?: string;
  } = {},
) {
  const scope = opts.scope ?? 'GLOBAL';
  const ref = opts.scopeRef ?? null;
  const by = opts.by === undefined ? actor : opts.by;
  const from = opts.from ?? "now() + interval '1 hour'";
  const created = opts.created ? `, '${opts.created}'::timestamptz` : '';
  return `INSERT INTO config_rule (key, scope, scope_ref_id, value, effective_from, changed_by_user_id${opts.created ? ', created_at' : ''})
          VALUES ('${k}', '${scope}', ${ref ? `'${ref}'::uuid` : 'NULL'}, ${value === null ? 'NULL' : `'${value}'::jsonb`}, ${from}, ${by ? `'${by}'::uuid` : 'NULL'}${created})
          RETURNING created_at, effective_from`;
}

describe('[CFG-RULE-003] config_key_policy + config_rule guard (SEC-REVIEW-T2.6 #2)', () => {
  it('[CFG-RULE-003] every registry key has a policy row; the API login can only read the policy', async () => {
    const rows = await app.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM config_key_policy`;
    expect(Number(rows[0]?.n)).toBe(CONFIG_KEYS.length);
    const write = await attempt(app, (tx) =>
      tx.$executeRawUnsafe(
        `UPDATE config_key_policy SET read_only = false WHERE key = '${decided.key}'`,
      ),
    );
    expect(write).toMatchObject({ ok: false, message: expect.stringMatching(/permission denied/) });
    const ins = await attempt(app, (tx) =>
      tx.$executeRawUnsafe(
        `INSERT INTO config_key_policy (key, kind, allowed_scopes) VALUES ('x.y', 'json', ARRAY['GLOBAL']::config_scope[])`,
      ),
    );
    expect(ins).toMatchObject({ ok: false, message: expect.stringMatching(/permission denied/) });
  });

  it.each([
    ['unknown key', () => insert('nobody.invented_this', '1'), /kk_config_unknown_key/],
    [
      'owner-decided key (e.g. commission.rate = 0.05)',
      () => insert(decided.key, decided.kind === 'ratio' ? '0.05' : 'true'),
      /kk_config_read_only/,
    ],
    ['null security limit', () => insert(failClosedInt.key, null), /kk_config_fail_closed_null/],
    ['zero security limit', () => insert(failClosedInt.key, '0'), /kk_config_value/],
    [
      'limit above the unit ceiling',
      () => insert(failClosedInt.key, '9007199254740991'),
      /kk_config_value/,
    ],
    ['wrong type', () => insert(editable.key, '"many"'), /kk_config_value/],
    [
      'scope not allowed',
      () => insert(globalOnly.key, '1', { scope: 'CITY', scopeRef: randomUUID() }),
      /kk_config_scope/,
    ],
    ['no actor', () => insert(editable.key, '1', { by: null }), /kk_config_actor_required/],
  ])('[SEC-BASE-010] the API login cannot insert: %s', async (_label, sql, message) => {
    const r = await attempt(app, (tx) => tx.$queryRawUnsafe(sql()));
    expect(r.ok).toBe(false);
    expect(r.ok ? '' : r.message).toMatch(message);
  });

  it('[CFG-RULE-003] a valid, non-decided value with an actor is accepted for the API login', async () => {
    const r = await attempt(app, (tx) => tx.$queryRawUnsafe(insert(editable.key, '1000')));
    expect(r.ok).toBe(true);
  });

  it('[CFG-RULE-003] the table owner (seed) may write decided keys, but not unknown keys or wrong types', async () => {
    // commission.rate is owner-decided (D-006): the owner (seed / owner migration) may write it.
    expect(key('commission.rate')?.decidedBy).toBe('D-006');
    const ownerWrite = await attempt(owner, (tx) =>
      tx.$queryRawUnsafe(insert('commission.rate', '0.3', { by: null })),
    );
    expect(ownerWrite.ok).toBe(true);
    const wrongType = await attempt(owner, (tx) =>
      tx.$queryRawUnsafe(insert('commission.rate', '"thirty"', { by: null })),
    );
    expect(wrongType).toMatchObject({
      ok: false,
      message: expect.stringMatching(/kk_config_value/),
    });
    const unknown = await attempt(owner, (tx) =>
      tx.$queryRawUnsafe(insert('nobody.invented_this', '1', { by: null })),
    );
    expect(unknown).toMatchObject({
      ok: false,
      message: expect.stringMatching(/kk_config_unknown_key/),
    });
  });
});

describe('[CFG-RULE-003] no back-dating; created_at is the server clock (SEC-REVIEW-T2.6 #3)', () => {
  it('[CFG-RULE-003] an explicit old created_at + effective_from is refused', async () => {
    const r = await attempt(app, (tx) =>
      tx.$queryRawUnsafe(
        insert(editable.key, '1000', { from: "'2020-01-01'::timestamptz", created: '2020-01-01' }),
      ),
    );
    expect(r).toMatchObject({ ok: false, message: expect.stringMatching(/kk_config_backdated/) });
  });

  it('[CFG-RULE-003] created_at is forced to now(); "now" from the app clock is stored as created_at, never earlier', async () => {
    const r = await attempt(app, (tx) =>
      tx.$queryRawUnsafe<{ created_at: Date; effective_from: Date }[]>(
        insert(editable.key, '1000', {
          from: "now() - interval '1 second'",
          created: '2020-01-01',
        }),
      ),
    );
    expect(r.ok).toBe(true);
    const row = r.ok ? r.value[0] : undefined;
    expect(row?.created_at.getUTCFullYear()).toBeGreaterThanOrEqual(2026);
    expect(row!.effective_from.getTime()).toBeGreaterThanOrEqual(row!.created_at.getTime());
  });

  it('[CFG-RULE-003] the 1-minute slack is gone: effective_from 59 s in the past is refused', async () => {
    const r = await attempt(app, (tx) =>
      tx.$queryRawUnsafe(insert(editable.key, '1000', { from: "now() - interval '59 seconds'" })),
    );
    expect(r).toMatchObject({ ok: false, message: expect.stringMatching(/kk_config_backdated/) });
  });
});

describe('[SCOPE-GEO-002] stable service_zone.code (SEC-REVIEW-T2.6 #8)', () => {
  it('[SCOPE-GEO-002] every zone has a code; (city, code) is unique', async () => {
    const zones = await owner.$queryRaw<
      { city_id: string; code: string }[]
    >`SELECT city_id, code FROM service_zone`;
    expect(zones.length).toBeGreaterThan(0);
    for (const z of zones) expect(z.code).toMatch(/^[a-z0-9-]+$/);
    const z = zones[0]!;
    const dup = await attempt(owner, (tx) =>
      tx.$executeRawUnsafe(
        `INSERT INTO service_zone (city_id, code, name_en, name_ur) VALUES ('${z.city_id}'::uuid, '${z.code}', 'dup', 'dup')`,
      ),
    );
    expect(dup).toMatchObject({
      ok: false,
      message: expect.stringMatching(/service_zone_city_code_key|unique/),
    });
    const generated = await attempt(owner, (tx) =>
      tx.$queryRawUnsafe<{ code: string }[]>(
        `INSERT INTO service_zone (city_id, name_en, name_ur) VALUES ('${z.city_id}'::uuid, 'gen', 'gen') RETURNING code`,
      ),
    );
    expect(generated.ok && generated.value[0]?.code).toMatch(/^zone-[0-9a-f]{12}$/);
    expect(key(decided.key)).toBeDefined();
  });
});

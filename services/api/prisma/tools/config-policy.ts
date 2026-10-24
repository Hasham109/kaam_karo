/**
 * Generates / applies `config_key_policy` from the config registry (T2.2 review fixes; A01).
 * SEC-REVIEW-T2.6 #2 (BP §26, §29, §42; CFG-RULE-001…012; SEC-BASE-010; SEC-AUTH-004).
 *
 *   node prisma/tools/config-policy.ts          apply (as the table owner, MIGRATION_DATABASE_URL)
 *   node prisma/tools/config-policy.ts --print  print the SQL only
 *
 * The registry is A03's `src/modules/config/config-keys.ts` (RQ-011: it stays loadable by Node
 * type stripping: type-only imports). One row per key: kind, allowed scopes, unit ceiling,
 * limit-object field ceilings, decided (read-only), two-person and fail-closed flags. Rows are
 * upserted, so a registry change is applied on the next run. Runs BEFORE the T2.6 seed, because
 * the config_rule guard trigger refuses keys without a policy row.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONFIG_KEYS,
  type ConfigKeyDefinition,
  UNIT_CEILINGS,
} from '../../src/modules/config/config-keys.ts';

const API_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const INTEGER_KINDS = new Set(['non_negative_integer', 'positive_integer']);

function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export interface PolicyRow {
  readonly key: string;
  readonly kind: string;
  readonly allowedScopes: readonly string[];
  readonly maxValue: number | null;
  readonly limitFields: Readonly<Record<string, number>> | null;
  readonly readOnly: boolean;
  readonly twoPerson: boolean;
  readonly failClosed: boolean;
}

export function policyRow(def: ConfigKeyDefinition): PolicyRow {
  const limitFields =
    def.kind === 'limit_object' && def.fields
      ? Object.fromEntries(Object.entries(def.fields).map(([f, unit]) => [f, UNIT_CEILINGS[unit]]))
      : null;
  return {
    key: def.key,
    kind: def.kind,
    allowedScopes: [...def.scopes],
    maxValue: INTEGER_KINDS.has(def.kind) ? UNIT_CEILINGS[def.unit ?? 'count'] : null,
    limitFields,
    readOnly: def.decidedBy !== undefined,
    twoPerson: def.approval === 'TWO_PERSON',
    failClosed: def.failClosed === true,
  };
}

export function buildPolicySql(defs: readonly ConfigKeyDefinition[] = CONFIG_KEYS): string {
  const values = defs
    .map(policyRow)
    .map(
      (r) =>
        `  (${lit(r.key)}, ${lit(r.kind)}, ARRAY[${r.allowedScopes.map(lit).join(', ')}]::"config_scope"[], ` +
        `${r.maxValue === null ? 'NULL' : String(r.maxValue)}, ` +
        `${r.limitFields === null ? 'NULL' : `${lit(JSON.stringify(r.limitFields))}::jsonb`}, ` +
        `${r.readOnly}, ${r.twoPerson}, ${r.failClosed}, now())`,
    );
  return (
    `-- config_key_policy from the config registry (SEC-REVIEW-T2.6 #2), ${defs.length} keys\n` +
    `INSERT INTO "config_key_policy" ("key", "kind", "allowed_scopes", "max_value", "limit_fields", ` +
    `"read_only", "two_person", "fail_closed", "updated_at") VALUES\n${values.join(',\n')}\n` +
    `ON CONFLICT ("key") DO UPDATE SET "kind" = EXCLUDED."kind", "allowed_scopes" = EXCLUDED."allowed_scopes", ` +
    `"max_value" = EXCLUDED."max_value", "limit_fields" = EXCLUDED."limit_fields", "read_only" = EXCLUDED."read_only", ` +
    `"two_person" = EXCLUDED."two_person", "fail_closed" = EXCLUDED."fail_closed", "updated_at" = now();\n`
  );
}

function main(): void {
  const sql = buildPolicySql();
  if (process.argv.includes('--print')) {
    process.stdout.write(sql);
    return;
  }
  const cli = createRequire(join(API_ROOT, 'package.json')).resolve('prisma/build/index.js');
  const result = spawnSync(process.execPath, [cli, 'db', 'execute', '--stdin'], {
    cwd: API_ROOT,
    input: sql,
    encoding: 'utf8',
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
  });
  if (result.status !== 0) {
    console.error(`config_key_policy failed:\n${result.stderr}${result.stdout}`);
    process.exit(1);
  }
  console.log(`config_key_policy applied: ${CONFIG_KEYS.length} keys.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();

/**
 * T2.6 config seed checks (no database). CFG-RULE-001…012 (BP §42, §64; ARCH §19); owner values
 * D-006, D-014, D-015, D-017, D-020, D-023, D-025, D-029; golden rule 2 (undecided = null).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CONFIG_KEYS,
  FAIL_CLOSED_KEYS,
  isValidValueFor,
  UNIT_CEILINGS,
} from '../../../src/modules/config/index.ts';
import { CONFIG_SEEDS } from '../config.seed.ts';
import { DEV_TEST_ENVS, DEV_TEST_LIMITS } from '../dev-test-limits.seed.ts';
import { buildDevTestLimitsSql, buildKeyPolicySql, buildSeedSql } from '../seed-sql.ts';

const repoFile = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../../../../${rel}`, import.meta.url)), 'utf8');

const seedByKey = new Map(CONFIG_SEEDS.map((s) => [s.key, s.value]));

/** Non-null values that are not owner values: each is stated by a requirement, BP or an OQ default. */
const REQUIREMENT_DEFAULTS = new Map<string, string>([
  ['fare.emergency_exception_enabled', 'FARE-013, K-10'],
  ['payments.customer_cash_claim_enabled', 'OQ-077'],
  ['catalog.pricing_units', 'BP §4.2'],
]);

describe('Config seed', () => {
  it('[CFG-RULE-001] seeds exactly the registered keys, once each', () => {
    const keys = CONFIG_SEEDS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual(CONFIG_KEYS.map((d) => d.key).sort());
  });

  it('[CFG-RULE-003] owner-decided values are seeded exactly (D-006, D-015, D-020, D-025, D-029, D-014/D-017)', () => {
    expect(seedByKey.get('commission.rate')).toBe(0.3);
    expect(seedByKey.get('commission.base_line_types')).toEqual(['LABOR']);
    expect(seedByKey.get('ledger.max_negative_balance')).toBe(0);
    expect(seedByKey.get('rating.block_threshold')).toBe(2);
    expect(seedByKey.get('rating.warnings_before_block')).toBe(2);
    expect(seedByKey.get('fees.customer_platform_fee')).toEqual({ enabled: false, amountMinor: 0 });
    expect(seedByKey.get('tax.line_shown')).toBe(true);
    expect(seedByKey.get('tax.rules')).toBeNull(); // OQ-035
  });

  it('[CFG-RULE-004] D-023 fees are null = not charged', () => {
    for (const key of [
      'fees.late_cancellation_fee_minor',
      'fees.customer_no_show_fee_minor',
      'fees.declined_quote_inspection_fee_minor',
    ]) {
      expect(seedByKey.get(key), key).toBeNull();
    }
  });

  it('[CFG-RULE-001] every undecided key is null (TODO(OWNER)), except requirement defaults', () => {
    const nonNull = CONFIG_KEYS.filter((d) => !d.decidedBy && seedByKey.get(d.key) !== null).map(
      (d) => d.key,
    );
    expect(nonNull.sort(), 'must be null + TODO(OWNER)').toEqual(
      [...REQUIREMENT_DEFAULTS.keys()].sort(),
    );
  });

  it('[SEC-AUTH-004] fail-closed keys (OTP, login limits, media limits) are seeded null', () => {
    const failClosed = CONFIG_KEYS.filter((d) => d.failClosed);
    expect(failClosed.length).toBeGreaterThan(0);
    expect(failClosed.filter((d) => seedByKey.get(d.key) !== null).map((d) => d.key)).toEqual([]);
  });

  it('[CFG-RULE-001] every non-null seed value passes its key kind', () => {
    const invalid = CONFIG_KEYS.filter((d) => {
      const value = seedByKey.get(d.key);
      return value !== null && value !== undefined && !isValidValueFor(d, value);
    }).map((d) => d.key);
    expect(invalid).toEqual([]);
  });

  it('[CFG-RULE-001] every seed line cites a D-number, TODO(OWNER) or a requirement/BP source', () => {
    const lines = repoFile('services/api/prisma/seed/config.seed.ts')
      .split('\n')
      .filter((l) => /^\s+\{ key: '/.test(l));
    expect(lines).toHaveLength(CONFIG_SEEDS.length);
    const cited = /\/\/ .*(D-\d{3}|TODO\(OWNER\)|[A-Z]+(-[A-Z]+)*-\d{3}|BP §\d+)/;
    expect(lines.filter((l) => !cited.test(l))).toEqual([]);
    const nullOk = /TODO\(OWNER\)|D-023|not launch/;
    expect(lines.filter((l) => /value: null/.test(l) && !nullOk.test(l))).toEqual([]);
  });

  it('[CFG-RULE-001] every registry citation exists (REQUIREMENTS, DECISIONS, OPEN_QUESTIONS)', () => {
    const requirements = repoFile('docs/requirements/REQUIREMENTS.md');
    const decisions = repoFile('coordination/DECISIONS.md');
    const questions = repoFile('coordination/OPEN_QUESTIONS.md');
    const problems: string[] = [];
    for (const def of CONFIG_KEYS) {
      if (def.requirementIds.length === 0) problems.push(`${def.key}: no requirement ID`);
      for (const id of def.requirementIds) {
        if (!requirements.includes(`| ${id} |`)) problems.push(`${def.key}: ${id}`);
      }
      for (const src of [...def.sources, ...(def.decidedBy ? [def.decidedBy] : [])]) {
        const file = src.startsWith('D-') ? decisions : src.startsWith('OQ-') ? questions : null;
        if (file !== null && !file.includes(`| ${src} |`)) problems.push(`${def.key}: ${src}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('[SEC-BASE-010] every seed line has a citation source for its audit row (SEC-REVIEW-T2.6 #7)', () => {
    const cited = /D-\d{3}|OQ-\d{3}|TODO\(OWNER\)|BP §[\d.]+|[A-Z]+(-[A-Z]+)*-\d{3}|not launch/;
    expect(CONFIG_SEEDS.filter((c) => !cited.test(c.source)).map((c) => c.key)).toEqual([]);
    const nullWithoutTodo = CONFIG_SEEDS.filter(
      (c) => c.value === null && !/TODO\(OWNER\)|D-023|not launch/.test(c.source),
    );
    expect(nullWithoutTodo.map((c) => c.key)).toEqual([]);
  });

  it('[SEC-BASE-010] the seed writes one SYSTEM_SEED audit row per inserted config and activation row', () => {
    const sql = buildSeedSql();
    expect(sql).toMatch(
      /INSERT INTO "config_rule"[\s\S]*RETURNING[\s\S]*INSERT INTO "audit_log"[\s\S]*'CONFIG_RULE_SEEDED'/,
    );
    expect(sql).toMatch(
      /INSERT INTO "catalog_activation"[\s\S]*RETURNING[\s\S]*INSERT INTO "audit_log"[\s\S]*'FAMILY_ACTIVATION_SEEDED'/,
    );
    expect(sql).toContain('"actor":"SYSTEM_SEED"');
    expect(sql).not.toContain('CONFIG_RULE_DEV_TEST_SEEDED');
  });

  it('[CFG-RULE-003] key policy rows are generated from the registry for every key (SEC-REVIEW-T2.6 #2)', () => {
    const policy = buildKeyPolicySql();
    const missing = CONFIG_KEYS.filter((d) => !policy.includes(`('${d.key}', '${d.kind}', ARRAY[`));
    expect(missing.map((d) => d.key)).toEqual([]);
    expect(policy).toContain(
      `'{"maxAttempts":${UNIT_CEILINGS.count},"windowSeconds":${UNIT_CEILINGS.seconds}}'::jsonb`,
    );
  });
});

describe('Dev/test limits (SEC-REVIEW-T2.6 #1)', () => {
  it('[SEC-AUTH-004] the dev seed covers exactly the fail-closed keys with valid, bounded values', () => {
    expect(DEV_TEST_LIMITS.map((l) => l.key).sort()).toEqual([...FAIL_CLOSED_KEYS].sort());
    const invalid = DEV_TEST_LIMITS.filter((l) => {
      const def = CONFIG_KEYS.find((d) => d.key === l.key);
      return !def || l.value === null || !isValidValueFor(def, l.value);
    }).map((l) => l.key);
    expect(invalid).toEqual([]);
  });

  it('[SEC-AUTH-004] dev limits only fill a null latest version and are never part of the default seed', () => {
    expect(DEV_TEST_ENVS).toEqual(['development', 'test']);
    const sql = buildDevTestLimitsSql();
    expect(sql).toContain('ORDER BY r."effective_from" DESC LIMIT 1) IS NULL');
    expect(sql).toContain("'CONFIG_RULE_DEV_TEST_SEEDED'");
    expect(buildSeedSql()).not.toContain('dev/test value');
  });
});

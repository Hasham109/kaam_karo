/**
 * SEC-REVIEW-T2.6 #2 (application side): only the config module writes config_rule, so every
 * write passes ConfigAdminService (sub-role, read-only, two-person, kind, scope, audit). The DB
 * side (config_key_policy trigger) is A01's (RQ-011). INFRA-001 (BP §32); CFG-RULE-003.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// Vitest runs from services/api (vitest.config.ts); src is compiled as CommonJS, so no import.meta.
const SRC = join(process.cwd(), 'src');
const ALLOWED_DIR = join('modules', 'config');
const WRITE_PATTERNS = [
  /configRule\s*\.\s*(create|createMany|upsert|update|updateMany|delete|deleteMany)\b/,
  /INSERT\s+INTO\s+"?config_rule"?/i,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'generated' ? [] : sourceFiles(path);
    return /\.ts$/.test(name) && !/\.(spec|e2e-spec|db-spec)\.ts$/.test(name) ? [path] : [];
  });
}

describe('config_rule writers', () => {
  it('[CFG-RULE-003] no module outside modules/config writes config_rule', () => {
    const offenders = sourceFiles(SRC)
      .filter((file) => !relative(SRC, file).startsWith(ALLOWED_DIR + sep))
      .filter((file) => WRITE_PATTERNS.some((re) => re.test(readFileSync(file, 'utf8'))))
      .map((file) => relative(SRC, file));
    expect(offenders).toEqual([]);
  });
});

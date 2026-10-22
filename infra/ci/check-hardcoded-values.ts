/**
 * CI guard: hard-coded business values (T2.1; IMPL §7.4; CLAUDE.md golden rule 2; BP §42).
 * Scans product code in services/, apps/ and packages/ — see lib/hardcoded-values.ts.
 *
 * Usage: node infra/ci/check-hardcoded-values.ts
 */
import { join } from 'node:path';
import { findNumericLiterals, isGuardedPath } from './lib/hardcoded-values.ts';
import { GENERATED_DIRS, REPO_ROOT, readText, walkFiles } from './lib/repo.ts';

const SCANNED_ROOTS = ['services', 'apps', 'packages'];
const skipDirs = new Set([...GENERATED_DIRS, 'android', 'ios']);

const files = SCANNED_ROOTS.flatMap((root) =>
  walkFiles(join(REPO_ROOT, root), { skipDirs, accept: isGuardedPath }),
);

const violations: string[] = [];
const allowances: string[] = [];
for (const file of files) {
  for (const finding of findNumericLiterals(file, readText(file))) {
    const where = `${file}:${finding.line}:${finding.column} literal ${finding.text}`;
    if (finding.allowedBy) allowances.push(`${where} (kk-allow-literal: ${finding.allowedBy})`);
    else violations.push(where);
  }
}

if (allowances.length > 0) {
  console.log(`Allowed technical literals (review these):`);
  for (const line of allowances) console.log(`  - ${line}`);
}
if (violations.length > 0) {
  console.error(
    `Hard-coded value guard FAILED: ${violations.length} numeric literal(s) in guarded code.\n` +
      `Move business values to the ConfigRule store (BP §42, golden rule 2) or a config seed.`,
  );
  for (const line of violations) console.error(`  - ${line}`);
  process.exit(1);
}
console.log(`Hard-coded value guard passed (${files.length} guarded file(s) scanned).`);

/**
 * Applies the T2.6 seed (owner A03): `node prisma/seed/run.ts` from services/api.
 *   --print             only print the SQL (no database needed)
 *   --dev-test-limits   ALSO apply explicit test values for the fail-closed limit keys; refused
 *                       unless APP_ENV is development or test (SEC-REVIEW-T2.6 #1)
 * The script goes through `prisma db execute --stdin`, which uses the datasource of
 * prisma.config.ts (MIGRATION_DATABASE_URL, the table owner, like migrations; BP §26, §29).
 * The API itself never seeds. Re-running is safe (seed-sql.ts: existing rows are kept).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEV_TEST_ENVS } from './dev-test-limits.seed.ts';
import { buildDevTestLimitsSql, buildSeedSql, seedSummary } from './seed-sql.ts';

const API_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const withDevLimits = process.argv.includes('--dev-test-limits');

if (withDevLimits) {
  // Same root .env as prisma.config.ts; a variable already set in the environment wins.
  const rootEnv = join(API_ROOT, '..', '..', '.env');
  try {
    process.loadEnvFile(rootEnv);
  } catch {
    // No .env file: APP_ENV must come from the environment.
  }
  const appEnv = process.env['APP_ENV'] ?? '';
  if (!DEV_TEST_ENVS.includes(appEnv)) {
    console.error(
      `--dev-test-limits refused: APP_ENV is "${appEnv}". Test limits exist only for ${DEV_TEST_ENVS.join(' / ')}; ` +
        'staging and production limits come from the owner (OQ-028, D-011).',
    );
    process.exit(1);
  }
}

const scripts = [buildSeedSql(), ...(withDevLimits ? [buildDevTestLimitsSql()] : [])];

if (process.argv.includes('--print')) {
  process.stdout.write(scripts.join('\n'));
} else {
  const cli = createRequire(join(API_ROOT, 'package.json')).resolve('prisma/build/index.js');
  for (const sql of scripts) {
    const result = spawnSync(process.execPath, [cli, 'db', 'execute', '--stdin'], {
      cwd: API_ROOT,
      input: sql,
      encoding: 'utf8',
      env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: '1' },
    });
    if (result.status !== 0) {
      console.error(`Seed failed:\n${result.stderr}${result.stdout}`);
      process.exit(1);
    }
  }
  const s = seedSummary();
  console.log(
    `Seed applied: ${s.families} families, ${s.services} services, ${s.cities} cities, ${s.configKeys} config keys` +
      `${withDevLimits ? ', dev/test limits' : ''} (existing rows kept).`,
  );
}

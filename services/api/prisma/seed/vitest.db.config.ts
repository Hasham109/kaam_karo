// T2.6 (A03): seed database tests. Needs a migrated AND seeded database:
//   pnpm --filter @kaamkaro/api db:deploy && node prisma/seed/run.ts
//   npx vitest run --config prisma/seed/vitest.db.config.ts      (from services/api)
// DATABASE_URL must be the non-owner API login (kaamkaro_api). RQ-008 asks A01 to fold this
// into `test:db` / the CI db-schema job.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const apiRoot = fileURLToPath(new URL('../..', import.meta.url));
const rootEnv = fileURLToPath(new URL('../../../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  root: apiRoot,
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['prisma/seed/**/*.db-spec.ts'],
    allowOnly: false,
    passWithNoTests: false,
    fileParallelism: false,
    testTimeout: 30_000,
  },
});

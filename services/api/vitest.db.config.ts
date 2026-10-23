import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// T2.3: database tests (PostGIS, comments, append-only grants/triggers, CHECKs). They need a
// migrated database (DATABASE_URL) and run with `pnpm test:db`, not with the default `test` task.
// Local runs read the git-ignored root .env (both logins); CI sets the variables itself.
const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['prisma/tests-db/**/*.db-spec.ts'],
    allowOnly: false,
    passWithNoTests: false,
    fileParallelism: false,
    testTimeout: 30_000,
  },
});

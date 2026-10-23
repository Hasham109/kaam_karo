/**
 * Prisma CLI configuration (T2.3; D-001 PostgreSQL + PostGIS with Prisma migrations).
 * Prisma 7 does not read `.env` itself: the repo-root `.env` (git-ignored, SEC-BASE-008) is loaded
 * here when it exists. Variables already set in the environment (CI, staging secrets) win.
 * Prisma uses MIGRATION_DATABASE_URL (the table owner). The API never sees it: it connects with
 * DATABASE_URL as a non-owner login in the `kaamkaro_app` role (prisma/README.md; BP §26, §29).
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const url = process.env['MIGRATION_DATABASE_URL'];

export default defineConfig({
  schema: 'prisma/schema',
  migrations: { path: 'prisma/migrations' },
  ...(url ? { datasource: { url } } : {}),
});

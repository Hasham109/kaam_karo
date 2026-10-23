/**
 * Refuses to start the API with an unsafe database login (T2.3; BP §26, §29; DATA-004;
 * SEC-REVIEW-T2.3 #1). See @kaamkaro/platform db-role-guard for the rules.
 * - Unsafe login (superuser, BYPASSRLS, table owner, not in kaamkaro_app) → always refuse.
 * - Database unreachable → refuse in staging/production; warn in development (health reports it).
 */
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DbRoleError,
  assertAppDbRole,
  isDeployedEnv,
  type DbRoleFacts,
  type ServerEnv,
} from '@kaamkaro/platform';
import { PrismaClient } from '../generated/prisma/client.js';

export async function verifyDatabaseRole(env: ServerEnv): Promise<void> {
  if (env.databaseUrl === null || env.appEnv === 'test') return;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.databaseUrl }) });
  try {
    await assertAppDbRole(env.appEnv, (sql) => prisma.$queryRawUnsafe<DbRoleFacts[]>(sql));
  } catch (error) {
    if (error instanceof DbRoleError || isDeployedEnv(env.appEnv)) throw error;
    console.warn(
      `Database login could not be checked (${(error as Error).message}); continuing in ${env.appEnv}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

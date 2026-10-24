// Must be the first import (INFRA-005: Sentry instruments modules loaded after it).
import { serverEnv } from './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestJsonLogger, createAppLogger } from './platform';
import { verifyDatabaseRole } from './db/verify-db-role';
import { WorkerModule } from './worker.module';

/** Background worker: outbox relay + queue consumers (T2.2; REL-009; BP §31.2). */
async function bootstrap(): Promise<void> {
  // Same DB login rules as the API (T2.3 / SEC-REVIEW-T2.3 #1; BP §26).
  await verifyDatabaseRole(serverEnv);
  const app = await NestFactory.createApplicationContext(WorkerModule.forRoot(serverEnv), {
    logger: new NestJsonLogger(createAppLogger(serverEnv, 'worker')),
  });
  app.enableShutdownHooks();
}

void bootstrap();

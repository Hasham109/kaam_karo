// Must be the first import (INFRA-005: Sentry instruments modules loaded after it).
import { serverEnv } from './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { verifyDatabaseRole } from './db/verify-db-role';

async function bootstrap(): Promise<void> {
  // T2.3 / SEC-REVIEW-T2.3 #1: never serve traffic as the table owner or a superuser (BP §26).
  await verifyDatabaseRole(serverEnv);
  const app = await NestFactory.create(AppModule.forRoot(serverEnv));
  app.enableShutdownHooks();
  await app.listen(serverEnv.port);
}

void bootstrap();

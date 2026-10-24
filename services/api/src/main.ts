// Must be the first import (INFRA-005: Sentry instruments modules loaded after it).
import { serverEnv } from './instrument';
import 'reflect-metadata';
import type { Server } from 'node:http';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { verifyDatabaseRole } from './db/verify-db-role';
import { NestJsonLogger, createAppLogger } from './platform';

async function bootstrap(): Promise<void> {
  // T2.3 / SEC-REVIEW-T2.3 #1: never serve traffic as the table owner or a superuser (BP §26).
  await verifyDatabaseRole(serverEnv);
  const app = await NestFactory.create(AppModule.forRoot(serverEnv), {
    // T2.2 (INFRA-005; BP §34): Nest's own logs as PII-redacted JSON lines.
    logger: new NestJsonLogger(createAppLogger(serverEnv)),
  });
  // SEC-REVIEW-T2.1 #10 (BP §29): do not advertise the framework.
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.enableShutdownHooks();
  // SEC-REVIEW-T2.2 #2 (REL-008): explicit server deadlines. A request that has not finished within
  // HTTP_REQUEST_TIMEOUT_MS is cut off; env validation guarantees the idempotency lease is longer.
  const server = app.getHttpServer() as Server;
  server.requestTimeout = serverEnv.httpRequestTimeoutMs;
  server.setTimeout(serverEnv.httpRequestTimeoutMs);
  await app.listen(serverEnv.port);
}

void bootstrap();

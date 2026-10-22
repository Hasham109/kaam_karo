// Must be the first import (INFRA-005: Sentry instruments modules loaded after it).
import { serverEnv } from './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule.forRoot(serverEnv));
  app.enableShutdownHooks();
  await app.listen(serverEnv.port);
}

void bootstrap();

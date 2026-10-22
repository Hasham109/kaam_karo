/**
 * Root module of the modular monolith (INFRA-001, BP §32; D-001).
 * Every business module lives in `src/modules/<module>` and is imported here.
 */
import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import type { ServerEnv } from '@kaamkaro/platform';
import { ServerEnvModule } from './config/server-env.module';
import { HealthModule } from './modules/health';

@Module({})
export class AppModule {
  static forRoot(env: ServerEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        // INFRA-005: reports unhandled errors to Sentry (no-op when SENTRY_DSN is unset).
        SentryModule.forRoot(),
        ServerEnvModule.forRoot(env),
        HealthModule,
      ],
      providers: [{ provide: APP_FILTER, useClass: SentryGlobalFilter }],
    };
  }
}

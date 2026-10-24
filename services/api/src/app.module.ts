/**
 * Root module of the modular monolith (INFRA-001, BP §32; D-001).
 * Every business module lives in `src/modules/<module>` and is imported here.
 */
import { type DynamicModule, Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import type { ServerEnv } from '@kaamkaro/platform';
import { FailClosedStartupCheck } from './config/fail-closed-startup';
import { ServerEnvModule } from './config/server-env.module';
import { CatalogModule } from './modules/catalog';
import { ConfigRulesModule } from './modules/config';
import { HealthModule } from './modules/health';
import { IdentityModule } from './modules/identity';
import { ProfilesModule } from './modules/profiles';
import { PlatformModule } from './platform';

@Module({})
export class AppModule {
  static forRoot(env: ServerEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        // INFRA-005: reports unhandled errors to Sentry (no-op when SENTRY_DSN is unset).
        SentryModule.forRoot(),
        ServerEnvModule.forRoot(env),
        // T2.2: logger, error envelope (global filter, reports 5xx to Sentry), idempotency,
        // audit, outbox (ARCH §7, §8; BP §26, §31).
        PlatformModule,
        // RQ-008 item 1 (A03, T2.6): catalog + config store; ConfigRulesModule is global and
        // provides CONFIG_SERVICE / CONFIG_RULE_SOURCE (RQ-006).
        IdentityModule,
        ProfilesModule,
        CatalogModule,
        ConfigRulesModule,
        HealthModule,
      ],
      // RQ-008 item 5: refuse to start in staging/production without the security limits.
      providers: [FailClosedStartupCheck],
    };
  }
}

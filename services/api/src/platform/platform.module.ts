/**
 * Global platform wiring (T2.2, owner A01): every module gets logging, the error envelope,
 * idempotency, audit, marketplace events and the transactional outbox without extra setup
 * (IMPL §2.2 A01 "Done when").
 *
 * Provides: PrismaService, APP_LOGGER, AuditWriter, MarketplaceEventWriter, OutboxWriter,
 * OutboxConsumerRegistry (consumers register in onModuleInit; only the worker runs them),
 * IDEMPOTENCY_STORE, IDEMPOTENCY_SCOPE_RESOLVER; global ErrorEnvelopeFilter (APP_FILTER) and
 * IdempotencyInterceptor (APP_INTERCEPTOR); RequestContextMiddleware on every route.
 * The config reader (CONFIG_SERVICE) is registered by A03's ConfigModule (RQ-006).
 */
import { Global, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { OutboxConsumerRegistry, type ServerEnv } from '@kaamkaro/platform';
import { SERVER_ENV } from '../config/server-env.module';
import { AuditWriter, MarketplaceEventWriter } from './audit.writer';
import { ErrorEnvelopeFilter } from './error.filter';
import {
  IDEMPOTENCY_SCOPE_RESOLVER,
  IDEMPOTENCY_STORE,
  IdempotencyInterceptor,
  defaultScopeResolver,
} from './idempotency.interceptor';
import { PrismaIdempotencyStore } from './idempotency.store';
import { APP_LOGGER, createAppLogger } from './logger';
import { OutboxWriter } from './outbox.writer';
import { PrismaService } from './prisma.service';
import { RequestContextMiddleware } from './request-context.middleware';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: APP_LOGGER,
      useFactory: (env: ServerEnv) => createAppLogger(env),
      inject: [SERVER_ENV],
    },
    AuditWriter,
    MarketplaceEventWriter,
    OutboxWriter,
    OutboxConsumerRegistry,
    PrismaIdempotencyStore,
    { provide: IDEMPOTENCY_STORE, useExisting: PrismaIdempotencyStore },
    { provide: IDEMPOTENCY_SCOPE_RESOLVER, useValue: defaultScopeResolver },
    { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
  exports: [
    PrismaService,
    APP_LOGGER,
    AuditWriter,
    MarketplaceEventWriter,
    OutboxWriter,
    OutboxConsumerRegistry,
    PrismaIdempotencyStore,
    IDEMPOTENCY_STORE,
    IDEMPOTENCY_SCOPE_RESOLVER,
  ],
})
export class PlatformModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}

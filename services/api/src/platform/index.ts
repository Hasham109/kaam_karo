// Public API of the API-side platform wiring (T2.2, owner A01). Modules import from here only.
export { PlatformModule } from './platform.module';
export { PrismaService, type TxClient, type DbClient } from './prisma.service';
export { AuditWriter, MarketplaceEventWriter } from './audit.writer';
export { OutboxWriter } from './outbox.writer';
export {
  Idempotent,
  IDEMPOTENCY_STORE,
  IDEMPOTENCY_SCOPE_RESOLVER,
  type IdempotencyScopeResolver,
} from './idempotency.interceptor';
export { APP_LOGGER, NestJsonLogger, createAppLogger } from './logger';
export { REQUEST_ID_HEADER, requestIdOf } from './request-context.middleware';

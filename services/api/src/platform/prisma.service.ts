/**
 * Shared Prisma client for the API and the worker (T2.2; D-001 PostgreSQL + Prisma; T2.3 handoff).
 * Connects with DATABASE_URL = the API login (member of kaamkaro_app, never the owner; BP §26,
 * DATA-004), so append-only grants apply to every write made through it.
 * Modules use their OWN tables only (INFRA-001); platform tables are written only through the
 * platform writers (AuditWriter, MarketplaceEventWriter, OutboxWriter, idempotency) — enforced by
 * ESLint (SEC-REVIEW-T2.2 #5(c)).
 *
 * SEC-REVIEW-T2.2 #5(b): the instance is a Prisma client EXTENDED with a query hook that masks the
 * free-text and JSON columns of append-only tables on every create (append-only-masking.ts), in
 * plain calls and inside interactive transactions alike.
 */
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import type { ServerEnv } from '@kaamkaro/platform';
import { SERVER_ENV } from '../config/server-env.module';
import { type Prisma, PrismaClient } from '../generated/prisma/client.js';
import { maskCreateArgs } from './append-only-masking';

/** A Prisma interactive-transaction client (`prisma.$transaction(async (tx) => …)`). */
export type TxClient = Prisma.TransactionClient;
/** Either the root client or a transaction client. */
export type DbClient = PrismaClient | TxClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(SERVER_ENV) env: ServerEnv) {
    // No DATABASE_URL (development/test without DB): the pool is created lazily and any query
    // fails, which the callers report as an error (health reports the database separately).
    super({ adapter: new PrismaPg({ connectionString: env.databaseUrl ?? undefined }) });
    const extended = this.$extends({
      name: 'kaamkaro-append-only-masking',
      query: {
        $allModels: {
          $allOperations({ model, operation, args, query }) {
            return query(maskCreateArgs(model, operation, args) as typeof args);
          },
        },
      },
    });
    // The query extension does not change model types, so the extended client is exposed under
    // the PrismaService type; lifecycle methods below still reach the base client.
    return extended as unknown as PrismaService;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

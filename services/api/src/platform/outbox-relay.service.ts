/**
 * Outbox relay + consumer workers, run ONLY in the worker process (`dist/worker.js`), never in an
 * API request (T2.2; REL-009 "an API call does not wait for it"; ARCH §7; BP §24, §31.2; D-001).
 * - Polls `outbox_event` every OUTBOX_POLL_INTERVAL_MS; a full batch polls again at once.
 * - Publishes to BullMQ with backoff; dead-letters after OUTBOX_MAX_ATTEMPTS (REL-007).
 * - Starts one BullMQ worker per registered consumer (OutboxConsumerRegistry).
 * - Housekeeping: purges expired idempotency keys (REL-008 retention).
 */
import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import {
  type BackoffPolicy,
  BullMqOutboxPublisher,
  type Logger,
  OutboxConsumerRegistry,
  type ServerEnv,
  createProducerConnection,
  isDeployedEnv,
  purgeDeadLetterQueue,
  relayOnce,
  startConsumerWorkers,
} from '@kaamkaro/platform';
import { SERVER_ENV } from '../config/server-env.module';
import { PrismaIdempotencyStore } from './idempotency.store';
import { APP_LOGGER } from './logger';
import { PrismaOutboxRelayStore } from './outbox-relay.store';

/** How often housekeeping runs: expired idempotency keys, outbox/dead-letter retention (technical). */
const HOUSEKEEPING_INTERVAL_MS = 3_600_000;

@Injectable()
export class OutboxRelayService implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer: NodeJS.Timeout | undefined;
  private stopped = false;
  private running: Promise<void> | undefined;
  private lastPurge = 0;
  private publisher: BullMqOutboxPublisher | undefined;
  private consumers: { close(): Promise<void> } | undefined;
  private connection: ReturnType<typeof createProducerConnection> | undefined;
  private readonly logger: Logger;

  constructor(
    @Inject(SERVER_ENV) private readonly env: ServerEnv,
    @Inject(APP_LOGGER) logger: Logger,
    private readonly store: PrismaOutboxRelayStore,
    private readonly idempotency: PrismaIdempotencyStore,
    private readonly registry: OutboxConsumerRegistry,
  ) {
    this.logger = logger.child('outbox-relay');
  }

  private get backoff(): BackoffPolicy {
    return {
      maxAttempts: this.env.outboxMaxAttempts,
      baseMs: this.env.outboxBackoffBaseMs,
      maxMs: this.env.outboxBackoffMaxMs,
    };
  }

  onApplicationBootstrap(): void {
    if (this.env.redisUrl === null) {
      throw new Error('REDIS_URL is required to run the outbox worker');
    }
    this.connection = createProducerConnection(this.env.redisUrl, (error) =>
      this.logger.warn('redis connection error', { err: error }),
    );
    this.publisher = new BullMqOutboxPublisher(
      this.connection,
      this.registry,
      this.backoff,
      this.env.deadLetterRetentionDays,
    );
    if (
      isDeployedEnv(this.env.appEnv) &&
      (this.env.outboxRetentionDays === null || this.env.deadLetterRetentionDays === null)
    ) {
      // TODO(OWNER) OQ-080: retention not decided; rows and dead letters are kept (masked).
      this.logger.warn('outbox/dead-letter retention not configured (OQ-080): keeping all rows');
    }
    this.consumers = startConsumerWorkers({
      redisUrl: this.env.redisUrl,
      registry: this.registry,
      logger: this.logger,
    });
    this.logger.info('outbox worker started', {
      consumers: this.registry.all().map((c) => c.name),
    });
    this.schedule(0);
  }

  private schedule(delayMs: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.running = this.tick().finally(() => {
        this.running = undefined;
      });
    }, delayMs);
  }

  /** One relay pass; exposed for tests. Returns the number of events handled. */
  async relayNow(): Promise<number> {
    if (!this.publisher) throw new Error('relay not started');
    return relayOnce(this.store, this.publisher, {
      batchSize: this.env.outboxBatchSize,
      backoff: this.backoff,
    });
  }

  private async tick(): Promise<void> {
    let handled = 0;
    try {
      handled = await this.relayNow();
      if (Date.now() - this.lastPurge >= HOUSEKEEPING_INTERVAL_MS) {
        this.lastPurge = Date.now();
        await this.housekeeping(new Date());
      }
    } catch (error) {
      this.logger.error('outbox relay pass failed', { err: error });
    }
    this.schedule(handled >= this.env.outboxBatchSize ? 0 : this.env.outboxPollIntervalMs);
  }

  /** REL-008 key purge + SEC-REVIEW-T2.2 #8 retention (null = keep, OQ-080). Exposed for tests. */
  async housekeeping(now: Date): Promise<void> {
    const keys = await this.idempotency.purgeExpired(now);
    const rows = await this.store.purge(
      now,
      this.env.outboxRetentionDays,
      this.env.deadLetterRetentionDays,
    );
    const dead = this.connection
      ? await purgeDeadLetterQueue(this.connection, this.env.deadLetterRetentionDays)
      : 0;
    if (keys + rows + dead > 0) {
      this.logger.info('housekeeping', {
        idempotencyKeys: keys,
        outboxRows: rows,
        deadLetters: dead,
      });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    await this.running;
    await this.consumers?.close();
    await this.publisher?.close();
    await this.connection?.quit().catch(() => undefined);
  }
}

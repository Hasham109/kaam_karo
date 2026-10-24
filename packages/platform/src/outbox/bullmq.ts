/**
 * BullMQ adapter for the outbox (T2.2; D-001 Redis + BullMQ; ARCH §7; BP §24, §31.2).
 *
 * - Fan-out: the relay adds one job per subscribed consumer to the queue `outbox.<consumer>`,
 *   with `jobId = event id`, so a re-publish after a relay crash does not create a second job
 *   while the first is retained (REL-007 safe retry). Consumers still de-duplicate (at-least-once).
 * - Consumer jobs retry with exponential backoff; after the last attempt the job is copied to the
 *   dead-letter queue `outbox.dead-letter` and kept in the failed set (never silently dropped).
 * - Redis holds only queue state; business truth stays in PostgreSQL (REL-013): flushing Redis
 *   loses no business data, because unpublished events are still PENDING in `outbox_event`, and
 *   published ones can be re-published by an operator by setting them back to PENDING.
 */
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import type { Logger } from '../logger/logger';
import {
  type BackoffPolicy,
  type OutboxConsumerRegistry,
  type OutboxMessage,
  type OutboxPublisher,
  describeError,
} from './outbox';

/** BullMQ key prefix for all Kaam Karo queues. */
export const QUEUE_PREFIX = 'kk';
export const DEAD_LETTER_QUEUE = 'outbox.dead-letter';
/** Completed consumer jobs are kept this long so a re-publish is de-duplicated (technical). */
export const COMPLETED_RETENTION_SECONDS = 24 * 60 * 60;

/** Dead-letter job ID (BullMQ custom IDs must not contain ':'). */
export function deadLetterJobId(consumer: string, eventId: string): string {
  return `${consumer}--${eventId}`;
}

export function consumerQueueName(consumer: string): string {
  return `outbox.${consumer}`;
}

/** Connection errors are reported, never thrown as unhandled 'error' events. */
export type RedisErrorHandler = (error: Error) => void;
const ignore: RedisErrorHandler = () => undefined;

/**
 * Producer-side connection: connects and reconnects in the background, but every command fails
 * fast while Redis is unreachable (no offline queue), so the relay backs off instead of hanging.
 */
export function createProducerConnection(
  redisUrl: string,
  onError: RedisErrorHandler = ignore,
): Redis {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
  connection.on('error', onError);
  return connection;
}

/** Worker-side connection: BullMQ requires `maxRetriesPerRequest: null` for blocking commands. */
export function createWorkerConnection(
  redisUrl: string,
  onError: RedisErrorHandler = ignore,
): Redis {
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  connection.on('error', onError);
  return connection;
}

export class RedisNotReadyError extends Error {
  constructor(status: string) {
    super(`Redis connection is not ready (${status})`);
    this.name = 'RedisNotReadyError';
  }
}

/**
 * REL-011 queue health: `up` when the queue connection answers PING within the timeout.
 * Never throws; a connection that is not ready reports `down` at once (no hanging probe).
 */
export async function probeQueueConnection(
  connection: Redis,
  timeoutMs: number,
): Promise<'up' | 'down'> {
  if (connection.status !== 'ready') return 'down';
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), timeoutMs);
    });
    const reply = await Promise.race([connection.ping(), timeout]);
    return reply === 'PONG' ? 'up' : 'down';
  } catch {
    return 'down';
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const DAY_SECONDS = 86_400;

/**
 * SEC-REVIEW-T2.2 #8: BullMQ stores `failedReason` and the stack in Redis. The consumer's error is
 * replaced by a masked, bounded message without a stack before BullMQ sees it.
 */
export function maskedJobError(error: unknown): Error {
  const masked = new Error(describeError(error));
  masked.name = 'ConsumerError';
  masked.stack = masked.message;
  return masked;
}

/** Remove dead-letter jobs older than `days` (null = keep, OQ-080). Returns how many. */
export async function purgeDeadLetterQueue(
  connection: Redis,
  days: number | null,
): Promise<number> {
  if (days === null) return 0;
  const queue = new Queue(DEAD_LETTER_QUEUE, {
    connection,
    prefix: QUEUE_PREFIX,
    skipWaitingForReady: true,
  });
  try {
    const removed = await queue.clean(days * DAY_SECONDS * 1000, 1000, 'wait');
    return removed.length;
  } finally {
    await queue.close();
  }
}

export interface DeadLetterJob {
  readonly consumer: string;
  readonly message: OutboxMessage;
  readonly attemptsMade: number;
  readonly error: string;
  readonly failedAt: string;
}

export class BullMqOutboxPublisher implements OutboxPublisher {
  private readonly queues = new Map<string, Queue>();

  constructor(
    private readonly connection: Redis,
    private readonly registry: OutboxConsumerRegistry,
    private readonly backoff: BackoffPolicy,
    /** Failed-job retention in days; null = keep (TODO(OWNER), OQ-080; SEC-REVIEW-T2.2 #8). */
    private readonly failedRetentionDays: number | null = null,
  ) {}

  private queue(name: string): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, {
        connection: this.connection,
        prefix: QUEUE_PREFIX,
        // Fail fast while Redis is down; the relay schedules the retry (REL-007).
        skipWaitingForReady: true,
      });
      this.queues.set(name, q);
    }
    return q;
  }

  async publish(message: OutboxMessage): Promise<void> {
    if (this.connection.status !== 'ready') throw new RedisNotReadyError(this.connection.status);
    for (const consumer of this.registry.subscribersOf(message.eventType)) {
      await this.queue(consumerQueueName(consumer.name)).add(message.eventType, message, {
        jobId: message.id,
        attempts: this.backoff.maxAttempts,
        backoff: { type: 'exponential', delay: this.backoff.baseMs },
        removeOnComplete: { age: COMPLETED_RETENTION_SECONDS },
        removeOnFail:
          this.failedRetentionDays === null
            ? false
            : { age: this.failedRetentionDays * DAY_SECONDS },
        // SEC-REVIEW-T2.2 #8: no stack traces in Redis (the error text is masked by the worker).
        stackTraceLimit: 0,
      });
    }
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}

/** Starts one BullMQ worker per registered consumer, plus dead-letter copying. */
export function startConsumerWorkers(options: {
  readonly redisUrl: string;
  readonly registry: OutboxConsumerRegistry;
  readonly logger: Logger;
  readonly concurrency?: number;
}): { readonly workers: readonly Worker[]; close(): Promise<void> } {
  const onError: RedisErrorHandler = (error) =>
    options.logger.warn('redis connection error', { err: error });
  // Offline queue enabled: a dead-letter copy written during a short outage is sent on reconnect.
  const deadLetterConnection = createWorkerConnection(options.redisUrl, onError);
  const deadLetter = new Queue<DeadLetterJob>(DEAD_LETTER_QUEUE, {
    connection: deadLetterConnection,
    prefix: QUEUE_PREFIX,
  });
  const connections: Redis[] = [];
  const workers = options.registry.all().map((consumer) => {
    const connection = createWorkerConnection(options.redisUrl, onError);
    connections.push(connection);
    const worker = new Worker<OutboxMessage>(
      consumerQueueName(consumer.name),
      async (job: Job<OutboxMessage>) => {
        try {
          await consumer.handle(job.data);
        } catch (error) {
          throw maskedJobError(error);
        }
      },
      { connection, prefix: QUEUE_PREFIX, concurrency: options.concurrency ?? 1 },
    );
    worker.on('failed', (job, error) => {
      if (!job) return;
      const final = job.attemptsMade >= (job.opts.attempts ?? 1);
      const log = {
        consumer: consumer.name,
        eventId: job.data.id,
        attempts: job.attemptsMade,
        err: error,
      };
      if (!final) {
        options.logger.warn('outbox consumer attempt failed', log);
        return;
      }
      options.logger.error('outbox consumer dead-lettered', log);
      void deadLetter
        .add(
          `${consumer.name}:${job.data.eventType}`,
          {
            consumer: consumer.name,
            message: job.data,
            attemptsMade: job.attemptsMade,
            error: describeError(error),
            failedAt: new Date().toISOString(),
          },
          {
            jobId: deadLetterJobId(consumer.name, job.data.id),
            removeOnComplete: false,
            removeOnFail: false,
          },
        )
        .catch((dlqError: unknown) =>
          options.logger.error('dead-letter write failed', {
            consumer: consumer.name,
            err: dlqError,
          }),
        );
    });
    worker.on('error', (error) =>
      options.logger.error('outbox worker error', { consumer: consumer.name, err: error }),
    );
    return worker;
  });
  return {
    workers,
    async close() {
      await Promise.all(workers.map((w) => w.close()));
      await deadLetter.close();
      await Promise.all(connections.map((c) => c.quit().catch(() => undefined)));
      await deadLetterConnection.quit().catch(() => undefined);
    },
  };
}

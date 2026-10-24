/**
 * Transactional outbox core (T2.2; ARCH §7; BP §24, §31.2; D-001 "Redis + BullMQ with a
 * transactional outbox").
 *
 * - NOTIF-001 / REL-009: a module writes its domain event to `outbox_event` IN THE SAME DB
 *   TRANSACTION as the state change (rollback → no event; commit → event is never lost).
 * - The relay (worker process, not the API request) publishes due rows to BullMQ with exponential
 *   backoff (REL-007: publishing is a safe, idempotent operation keyed by the event ID). After
 *   `maxAttempts` the row is FAILED = dead-lettered in the database, visible to system health.
 * - Delivery is AT-LEAST-ONCE. Consumers must de-duplicate on `event.id` (see handoff T-2.2).
 */
import { isSafeObjectId } from '../audit/audit';
import { maskFreeText, maskPii, type MaskedJson } from '../pii/mask';

/** `<module>.<event>` from ARCH §7, e.g. `booking.accepted`, `payment.succeeded`. */
export const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+$/;
export const AGGREGATE_TYPE_PATTERN = /^[a-z][a-z0-9_]*$/;

export interface OutboxEventInput {
  readonly eventType: string;
  /** Version of contracts/events/<eventType>.json the payload follows (contract-first, ARCH §8). */
  readonly schemaVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  /** IDs and states only; personal data is masked anyway (SEC-REVIEW-T2.3 #10). */
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface OutboxRow {
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: MaskedJson;
}

/** What a consumer receives (BullMQ job data). `id` is the de-duplication key. */
export interface OutboxMessage {
  readonly id: string;
  readonly eventType: string;
  readonly schemaVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: MaskedJson;
  readonly occurredAt: string;
}

export interface OutboxDueEvent extends OutboxMessage {
  /** Publish attempts made before this one. */
  readonly attempts: number;
}

export class OutboxValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutboxValidationError';
  }
}

export function buildOutboxRow(input: OutboxEventInput): OutboxRow {
  if (!EVENT_TYPE_PATTERN.test(input.eventType)) {
    throw new OutboxValidationError(`Invalid event type "${input.eventType}"`);
  }
  if (!Number.isSafeInteger(input.schemaVersion) || input.schemaVersion < 1) {
    throw new OutboxValidationError('schemaVersion must be a positive integer');
  }
  if (!AGGREGATE_TYPE_PATTERN.test(input.aggregateType)) {
    throw new OutboxValidationError(`Invalid aggregate type "${input.aggregateType}"`);
  }
  if (!input.aggregateId) throw new OutboxValidationError('aggregateId is required');
  // SEC-REVIEW-T2.2 #5(a): stored unmasked, so only UUIDs / short keys (never a phone).
  if (!isSafeObjectId(input.aggregateId)) {
    throw new OutboxValidationError('aggregateId must be a UUID or a short lower-case key');
  }
  if (typeof input.payload !== 'object' || input.payload === null || Array.isArray(input.payload)) {
    throw new OutboxValidationError('payload must be an object');
  }
  return {
    eventType: input.eventType,
    schemaVersion: input.schemaVersion,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    payload: maskPii(input.payload),
  };
}

export interface BackoffPolicy {
  readonly maxAttempts: number;
  readonly baseMs: number;
  readonly maxMs: number;
}

/** Delay before attempt `attempt + 1`, where `attempt` ≥ 1 attempts have failed. */
export function backoffDelayMs(attempt: number, policy: BackoffPolicy): number {
  const exp = policy.baseMs * 2 ** Math.max(attempt - 1, 0);
  return Math.min(exp, policy.maxMs);
}

export type OutboxDeliveryOutcome =
  | { readonly id: string; readonly ok: true }
  | {
      readonly id: string;
      readonly ok: false;
      readonly attempts: number;
      /** null = dead-lettered (status FAILED). */
      readonly nextAttemptAt: Date | null;
      readonly error: string;
    };

/** Relay storage, implemented by the API over `outbox_event`. */
export interface OutboxRelayStore {
  /**
   * In ONE transaction: lock up to `limit` PENDING rows with next_attempt_at ≤ now
   * (FOR UPDATE SKIP LOCKED, so several relays never take the same row), call `deliver`,
   * then persist each outcome. Returns the number of rows handled.
   */
  withDueBatch(
    limit: number,
    now: Date,
    deliver: (events: readonly OutboxDueEvent[]) => Promise<readonly OutboxDeliveryOutcome[]>,
  ): Promise<number>;
}

/** Hands one event to the queue. Must be idempotent per `message.id`. */
export interface OutboxPublisher {
  publish(message: OutboxMessage): Promise<void>;
}

/** Error text for `last_error`: name + masked message, bounded (no personal data, INFRA-005). */
export function describeError(error: unknown): string {
  const text =
    error instanceof Error ? `${error.name}: ${error.message}` : `Error: ${String(error)}`;
  return maskFreeText(text).slice(0, 500);
}

export async function relayOnce(
  store: OutboxRelayStore,
  publisher: OutboxPublisher,
  options: {
    readonly batchSize: number;
    readonly backoff: BackoffPolicy;
    readonly now?: () => Date;
  },
): Promise<number> {
  const now = options.now ?? (() => new Date());
  return store.withDueBatch(options.batchSize, now(), async (events) => {
    const outcomes: OutboxDeliveryOutcome[] = [];
    for (const event of events) {
      const { attempts: previous, ...message } = event;
      try {
        await publisher.publish(message);
        outcomes.push({ id: event.id, ok: true });
      } catch (error) {
        const attempts = previous + 1;
        const dead = attempts >= options.backoff.maxAttempts;
        outcomes.push({
          id: event.id,
          ok: false,
          attempts,
          nextAttemptAt: dead
            ? null
            : new Date(now().getTime() + backoffDelayMs(attempts, options.backoff)),
          error: describeError(error),
        });
      }
    }
    return outcomes;
  });
}

/** A consumer of outbox events (e.g. A10 notifications, A01 analytics sink). */
export interface OutboxConsumer {
  /** Queue-safe name, e.g. `notifications`. */
  readonly name: string;
  /** Event types this consumer receives. */
  readonly eventTypes: readonly string[];
  /** Must be idempotent: the same `message.id` may arrive more than once. */
  handle(message: OutboxMessage): Promise<void>;
}

export const CONSUMER_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Registry shared by the relay (fan-out) and the consumer workers. */
export class OutboxConsumerRegistry {
  private readonly consumers = new Map<string, OutboxConsumer>();

  register(consumer: OutboxConsumer): void {
    if (!CONSUMER_NAME_PATTERN.test(consumer.name)) {
      throw new OutboxValidationError(`Invalid consumer name "${consumer.name}"`);
    }
    if (this.consumers.has(consumer.name)) {
      throw new OutboxValidationError(`Consumer "${consumer.name}" is already registered`);
    }
    for (const t of consumer.eventTypes) {
      if (!EVENT_TYPE_PATTERN.test(t)) throw new OutboxValidationError(`Invalid event type "${t}"`);
    }
    this.consumers.set(consumer.name, consumer);
  }

  all(): readonly OutboxConsumer[] {
    return [...this.consumers.values()];
  }

  get(name: string): OutboxConsumer | undefined {
    return this.consumers.get(name);
  }

  subscribersOf(eventType: string): readonly OutboxConsumer[] {
    return this.all().filter((c) => c.eventTypes.includes(eventType));
  }
}

import { describe, expect, it } from 'vitest';
import {
  type BackoffPolicy,
  type OutboxDeliveryOutcome,
  type OutboxDueEvent,
  type OutboxMessage,
  type OutboxRelayStore,
  OutboxConsumerRegistry,
  OutboxValidationError,
  backoffDelayMs,
  buildOutboxRow,
  relayOnce,
} from './outbox';

const POLICY: BackoffPolicy = { maxAttempts: 3, baseMs: 1000, maxMs: 5000 };
const NOW = new Date('2026-10-23T10:00:00.000Z');

function due(id: string, attempts = 0): OutboxDueEvent {
  return {
    id,
    eventType: 'booking.accepted',
    schemaVersion: 1,
    aggregateType: 'booking',
    aggregateId: 'b-1',
    payload: { bookingId: 'b-1' },
    occurredAt: NOW.toISOString(),
    attempts,
  };
}

class FakeStore implements OutboxRelayStore {
  outcomes: OutboxDeliveryOutcome[] = [];
  constructor(private readonly events: OutboxDueEvent[]) {}
  async withDueBatch(
    limit: number,
    _now: Date,
    deliver: (e: readonly OutboxDueEvent[]) => Promise<readonly OutboxDeliveryOutcome[]>,
  ) {
    const batch = this.events.slice(0, limit);
    this.outcomes = [...(await deliver(batch))];
    return batch.length;
  }
}

// NOTIF-001, REL-009, REL-007 (BP §24, §31.2; ARCH §7; D-001).
describe('[REL-009] outbox core', () => {
  it('[REL-009] builds a validated row and masks personal data in the payload', () => {
    const row = buildOutboxRow({
      eventType: 'booking.accepted',
      schemaVersion: 1,
      aggregateType: 'booking',
      aggregateId: 'b-1',
      payload: { bookingId: 'b-1', customerPhone: '+923001234567' },
    });
    expect(row.payload).toEqual({ bookingId: 'b-1', customerPhone: '[REDACTED]' });
  });

  it.each([
    [{ eventType: 'Booking Accepted' }, /event type/],
    [{ schemaVersion: 0 }, /schemaVersion/],
    [{ aggregateType: 'Booking' }, /aggregate type/],
    [{ aggregateId: '' }, /aggregateId/],
  ])('[REL-009] refuses an invalid event %o', (patch, message) => {
    expect(() =>
      buildOutboxRow({
        eventType: 'booking.accepted',
        schemaVersion: 1,
        aggregateType: 'booking',
        aggregateId: 'b-1',
        payload: {},
        ...patch,
      }),
    ).toThrow(message);
  });

  it('[REL-007] exponential backoff is capped', () => {
    expect([1, 2, 3, 4, 5].map((a) => backoffDelayMs(a, POLICY))).toEqual([
      1000, 2000, 4000, 5000, 5000,
    ]);
  });

  it('[REL-009] relay publishes due events and reports success', async () => {
    const published: OutboxMessage[] = [];
    const store = new FakeStore([due('e1'), due('e2')]);
    const n = await relayOnce(
      store,
      { publish: async (m) => void published.push(m) },
      {
        batchSize: 10,
        backoff: POLICY,
        now: () => NOW,
      },
    );
    expect(n).toBe(2);
    expect(published.map((m) => m.id)).toEqual(['e1', 'e2']);
    expect(published[0]).not.toHaveProperty('attempts');
    expect(store.outcomes).toEqual([
      { id: 'e1', ok: true },
      { id: 'e2', ok: true },
    ]);
  });

  it('[REL-007] a failed publish is retried later; the last attempt dead-letters', async () => {
    const store = new FakeStore([due('e1', 0), due('e2', 2)]);
    await relayOnce(
      store,
      { publish: () => Promise.reject(new Error('redis down for 03001234567')) },
      { batchSize: 10, backoff: POLICY, now: () => NOW },
    );
    expect(store.outcomes).toEqual([
      {
        id: 'e1',
        ok: false,
        attempts: 1,
        nextAttemptAt: new Date(NOW.getTime() + 1000),
        error: 'Error: redis down for [PHONE]',
      },
      {
        id: 'e2',
        ok: false,
        attempts: 3,
        nextAttemptAt: null,
        error: 'Error: redis down for [PHONE]',
      },
    ]);
  });

  it('[NOTIF-001] registry fans out by event type and refuses bad or duplicate consumers', () => {
    const registry = new OutboxConsumerRegistry();
    const handle = () => Promise.resolve();
    registry.register({ name: 'notifications', eventTypes: ['booking.accepted'], handle });
    registry.register({
      name: 'analytics',
      eventTypes: ['booking.accepted', 'quote.received'],
      handle,
    });
    expect(registry.subscribersOf('booking.accepted').map((c) => c.name)).toEqual([
      'notifications',
      'analytics',
    ]);
    expect(registry.subscribersOf('quote.received').map((c) => c.name)).toEqual(['analytics']);
    expect(() => registry.register({ name: 'analytics', eventTypes: [], handle })).toThrow(
      OutboxValidationError,
    );
    expect(() => registry.register({ name: 'Bad Name', eventTypes: [], handle })).toThrow(
      OutboxValidationError,
    );
  });
});

describe('[REL-009] review fixes (SEC-REVIEW-T2.2 #5a)', () => {
  it('[DATA-004] aggregateId must be a UUID or a short key, never a phone', () => {
    const event = {
      eventType: 'booking.accepted',
      schemaVersion: 1,
      aggregateType: 'booking',
      payload: {},
    };
    expect(() => buildOutboxRow({ ...event, aggregateId: '+923001234567' })).toThrow(
      OutboxValidationError,
    );
    expect(buildOutboxRow({ ...event, aggregateId: 'run-1' }).aggregateId).toBe('run-1');
  });
});

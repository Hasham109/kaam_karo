import { describe, expect, it } from 'vitest';
import { AppError } from '../errors/error-envelope';
import {
  InMemoryIdempotencyStore,
  type RunIdempotentOptions,
  canonicalJson,
  hashRequest,
  parseIdempotencyKey,
  runIdempotent,
  storableBody,
} from './idempotency';

const HOUR = 3_600_000;

function setup() {
  let t = new Date('2026-10-23T10:00:00.000Z').getTime();
  const now = () => new Date(t);
  const advance = (ms: number) => {
    t += ms;
  };
  const store = new InMemoryIdempotencyStore(now);
  const opts = (key: string, body: unknown): RunIdempotentOptions => ({
    scope: 'user-1',
    operation: 'booking.create',
    key,
    requestHash: hashRequest('POST', '/bookings', body),
    ttlMs: 24 * HOUR,
    inFlightTimeoutMs: 60_000,
    requestId: 'req-1',
    maxResponseBytes: 16_384,
    sleep: () => Promise.resolve(),
    now,
  });
  return { store, opts, advance };
}

// REL-008, REL-002, REL-006 (BP §31.1, §31.2; ARCH §8 rule 3).
describe('[REL-008] idempotency core', () => {
  it('[REL-008] same key twice → handler runs once, one row, original response replayed', async () => {
    const { store, opts } = setup();
    let runs = 0;
    const handler = () => {
      runs += 1;
      return Promise.resolve({ status: 201, body: { bookingId: `b-${runs}` } });
    };
    const first = await runIdempotent(store, opts('key-00000001', { serviceId: 's1' }), handler);
    const second = await runIdempotent(store, opts('key-00000001', { serviceId: 's1' }), handler);
    expect(runs).toBe(1);
    expect(store.size).toBe(1);
    expect(first).toEqual({ replayed: false, status: 201, body: { bookingId: 'b-1' } });
    expect(second).toEqual({ replayed: true, status: 201, body: { bookingId: 'b-1' } });
  });

  it('[REL-008] same key with a different body → IDEMPOTENCY_KEY_REUSED (409)', async () => {
    const { store, opts } = setup();
    const ok = () => Promise.resolve({ status: 201, body: {} });
    await runIdempotent(store, opts('key-00000002', { serviceId: 's1' }), ok);
    await expect(
      runIdempotent(store, opts('key-00000002', { serviceId: 's2' }), ok),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED', status: 409 });
  });

  it('[REL-006] a repeat while the first is still running → IN_PROGRESS (retryable)', async () => {
    const { store, opts } = setup();
    let release!: () => void;
    const slow = new Promise<void>((r) => {
      release = r;
    });
    const first = runIdempotent(store, opts('key-00000003', {}), async () => {
      await slow;
      return { status: 201, body: { id: 1 } };
    });
    await expect(
      runIdempotent(store, opts('key-00000003', {}), () =>
        Promise.resolve({ status: 201, body: {} }),
      ),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS', retryable: true });
    release();
    await expect(first).resolves.toMatchObject({ replayed: false });
  });

  it('[REL-002] a 4xx business refusal is stored and replayed without re-running', async () => {
    const { store, opts } = setup();
    let runs = 0;
    const refuse = () => {
      runs += 1;
      return Promise.reject(new AppError('QUOTE_EXPIRED', 409, 'Quote expired.'));
    };
    await expect(runIdempotent(store, opts('key-00000004', {}), refuse)).rejects.toBeInstanceOf(
      AppError,
    );
    const replay = await runIdempotent(store, opts('key-00000004', {}), refuse);
    expect(runs).toBe(1);
    expect(replay).toMatchObject({
      replayed: true,
      status: 409,
      body: { error: { code: 'QUOTE_EXPIRED', requestId: 'req-1' } },
    });
  });

  it('[REL-007] an unexpected failure releases the key so a retry runs again', async () => {
    const { store, opts } = setup();
    await expect(
      runIdempotent(store, opts('key-00000005', {}), () => Promise.reject(new Error('db down'))),
    ).rejects.toThrow('db down');
    expect(store.size).toBe(0);
    const retry = await runIdempotent(store, opts('key-00000005', {}), () =>
      Promise.resolve({ status: 201, body: { ok: true } }),
    );
    expect(retry.replayed).toBe(false);
  });

  it('[REL-008] a crashed in-flight key is reclaimed after the timeout (same body only)', async () => {
    const { store, opts, advance } = setup();
    await store.tryInsert(
      { scope: 'user-1', operation: 'booking.create', key: 'key-00000006' },
      opts('key-00000006', { a: 1 }).requestHash,
      new Date(Date.parse('2026-10-24T10:00:00.000Z')),
    );
    const ok = () => Promise.resolve({ status: 201, body: { ok: true } });
    await expect(runIdempotent(store, opts('key-00000006', { a: 1 }), ok)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
    });
    advance(60_000);
    await expect(runIdempotent(store, opts('key-00000006', { a: 2 }), ok)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REUSED',
    });
    await expect(runIdempotent(store, opts('key-00000006', { a: 1 }), ok)).resolves.toMatchObject({
      replayed: false,
      status: 201,
    });
  });

  it('[REL-008] after the retention period the key is new again; purge removes it', async () => {
    const { store, opts, advance } = setup();
    const ok = () => Promise.resolve({ status: 201, body: {} });
    await runIdempotent(store, opts('key-00000007', {}), ok);
    advance(24 * HOUR);
    expect((await runIdempotent(store, opts('key-00000007', { other: 1 }), ok)).replayed).toBe(
      false,
    );
    advance(24 * HOUR);
    expect(await store.purgeExpired(new Date(Date.parse('2026-10-26T00:00:00.000Z')))).toBe(1);
  });

  it('[REL-008] different callers (scope) never collide', async () => {
    const { store, opts } = setup();
    const ok = () => Promise.resolve({ status: 201, body: {} });
    await runIdempotent(store, opts('key-00000008', {}), ok);
    const other = await runIdempotent(store, { ...opts('key-00000008', {}), scope: 'user-2' }, ok);
    expect(other.replayed).toBe(false);
    expect(store.size).toBe(2);
  });

  it('[REL-008] header validation: missing → 428, malformed → 400', () => {
    expect(() => parseIdempotencyKey(undefined)).toThrow(
      expect.objectContaining({ code: 'IDEMPOTENCY_KEY_REQUIRED', status: 428 }),
    );
    expect(() => parseIdempotencyKey('short')).toThrow(
      expect.objectContaining({ code: 'IDEMPOTENCY_KEY_INVALID' }),
    );
    expect(() => parseIdempotencyKey(['a', 'b'])).toThrow(
      expect.objectContaining({ code: 'IDEMPOTENCY_KEY_INVALID' }),
    );
    expect(parseIdempotencyKey('0b6f1d9e-3c1a-4b8e-9f00-123456789012')).toBe(
      '0b6f1d9e-3c1a-4b8e-9f00-123456789012',
    );
  });

  it('[REL-008] the request hash ignores key order but not values, method or route', () => {
    expect(canonicalJson({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe('{"a":[2,{"c":4,"d":3}],"b":1}');
    const h = hashRequest('POST', '/bookings', { a: 1, b: 2 });
    expect(hashRequest('post', '/bookings', { b: 2, a: 1 })).toBe(h);
    expect(hashRequest('POST', '/bookings', { a: 1, b: 3 })).not.toBe(h);
    expect(hashRequest('POST', '/quotes', { a: 1, b: 2 })).not.toBe(h);
  });
});

class FlakyStore extends InMemoryIdempotencyStore {
  failCompletes = 0;
  override complete(id: string, status: number, body: unknown) {
    if (this.failCompletes > 0) {
      this.failCompletes -= 1;
      return Promise.reject(new Error('db blip'));
    }
    return super.complete(id, status, body);
  }
}

// SEC-REVIEW-T2.2 #2, #9 (REL-008; BP §31.1, §31.2; D-003 money operations).
describe('[REL-008] review fixes: never a second run for one key', () => {
  function flaky() {
    let t = Date.parse('2026-10-23T10:00:00.000Z');
    const now = () => new Date(t);
    const store = new FlakyStore(now);
    const opts = (key: string): RunIdempotentOptions => ({
      scope: 'user-1',
      operation: 'payment.initiate',
      key,
      requestHash: hashRequest('POST', '/payments', { bookingId: 'b1' }),
      ttlMs: 24 * HOUR,
      inFlightTimeoutMs: 60_000,
      requestId: 'req-1',
      maxResponseBytes: 64,
      sleep: () => Promise.resolve(),
      now,
    });
    return { store, opts, advance: (ms: number) => void (t += ms) };
  }

  it('[REL-008] FORCED RE-RUN: complete() keeps failing → OUTCOME_UNKNOWN; retries never re-run', async () => {
    const { store, opts, advance } = flaky();
    let runs = 0;
    const handler = () => {
      runs += 1;
      return Promise.resolve({ status: 201, body: { paymentId: 'p1' } });
    };
    store.failCompletes = 3; // every attempt to store the real result fails; the marker succeeds
    const first = await runIdempotent(store, opts('key-unknown-1'), handler);
    expect(first.replayed).toBe(false);
    for (const wait of [0, 61_000, 10 * 60_000]) {
      advance(wait);
      await expect(runIdempotent(store, opts('key-unknown-1'), handler)).rejects.toMatchObject({
        code: 'IDEMPOTENCY_OUTCOME_UNKNOWN',
        status: 409,
        retryable: false,
      });
    }
    expect(runs).toBe(1);
  });

  it('[REL-008] a transient complete() failure is retried and the real result is replayed', async () => {
    const { store, opts } = flaky();
    store.failCompletes = 2;
    await runIdempotent(store, opts('key-retry-01'), () =>
      Promise.resolve({ status: 202, body: { ok: 1 } }),
    );
    await expect(
      runIdempotent(store, opts('key-retry-01'), () => Promise.resolve({ status: 500, body: {} })),
    ).resolves.toEqual({ replayed: true, status: 202, body: { ok: 1 } });
  });

  it('[REL-008] heartbeat lease: a handler slower than the lease is NOT reclaimed by a retry', async () => {
    const { store, opts, advance } = flaky();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let runs = 0;
    const slow = runIdempotent(
      store,
      { ...opts('key-lease-001'), heartbeatIntervalMs: 5 },
      async () => {
        runs += 1;
        await gate;
        return { status: 201, body: { id: 1 } };
      },
    );
    for (let i = 0; i < 3; i += 1) {
      advance(50_000); // 150 s total, far past the 60 s lease…
      await new Promise((r) => setTimeout(r, 20)); // …but heartbeats keep refreshing it
      await expect(
        runIdempotent(store, opts('key-lease-001'), () => {
          runs += 1;
          return Promise.resolve({ status: 201, body: {} });
        }),
      ).rejects.toMatchObject({ code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS' });
    }
    release();
    await slow;
    expect(runs).toBe(1);
  });

  it('[REL-008] SEC #9: an oversized response is not stored; replay says REPLAY_UNAVAILABLE', async () => {
    const { store, opts } = flaky();
    let runs = 0;
    const big = () => {
      runs += 1;
      return Promise.resolve({ status: 201, body: { blob: 'x'.repeat(500) } });
    };
    await runIdempotent(store, opts('key-bigbody1'), big);
    await expect(runIdempotent(store, opts('key-bigbody1'), big)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_REPLAY_UNAVAILABLE',
    });
    expect(runs).toBe(1);
    expect(storableBody({ n: 10n }, 1000)).toEqual({ kkIdempotency: 'REPLAY_UNAVAILABLE' });
  });
});

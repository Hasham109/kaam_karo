/**
 * Idempotency core (T2.2; ARCH §8 rule 3, §5.3 IdempotencyKey; BP §31.1, §31.2).
 *
 * - REL-008: create booking, submit request, initiate payment, accept quote and approve charge
 *   require an `Idempotency-Key`. The same key + same request returns the ORIGINAL response and the
 *   handler runs once ("same key twice → one row").
 * - REL-002: a retry of an idempotent action returns the original result.
 * - REL-006: while the first request is still running, a repeat gets
 *   IDEMPOTENCY_REQUEST_IN_PROGRESS (retryable) — the app shows "pending", never "success".
 * - Same key + different body → IDEMPOTENCY_KEY_REUSED (409).
 * - Keys are scoped by caller (`scope`, e.g. the user ID) and `operation`, so callers never collide.
 *
 * Outcome storage: success and 4xx business refusals are stored and replayed with their original
 * status. Unexpected errors thrown by the handler (5xx) RELEASE the key so the client may retry
 * safely (REL-007): the handler did not complete.
 *
 * SEC-REVIEW-T2.2 #2 (the handler never runs twice for one key):
 * - Lease: while the handler runs, the row's `updated_at` is refreshed every `heartbeatIntervalMs`
 *   (default lease / 3). Only a row whose owner stopped heart-beating for `inFlightTimeoutMs`
 *   (a dead process) can be reclaimed, and only by the SAME request hash.
 * - `inFlightTimeoutMs` must be ≥ the server's handler deadline (env validation, HTTP_REQUEST_TIMEOUT_MS).
 * - After the handler SUCCEEDED, storing the result is retried; if it still fails the row is marked
 *   "outcome unknown" and every retry gets 409 IDEMPOTENCY_OUTCOME_UNKNOWN — never a re-run.
 * - Remaining gap: if the database is unreachable for both the result and the marker, the lease
 *   eventually expires. REL-008 operations therefore also need a business unique constraint.
 *
 * SEC-REVIEW-T2.2 #9: responses are stored in plain JSON for the retention period. Idempotent
 * handlers must return a replay-safe DTO (IDs and states; NEVER gateway secrets, redirect tokens,
 * OTPs or personal data). Bodies larger than `maxResponseBytes` are not stored; a replay then gets
 * 409 IDEMPOTENCY_REPLAY_UNAVAILABLE ("already done, read the resource").
 */
import { createHash } from 'node:crypto';
import { AppError, toErrorEnvelope } from '../errors/error-envelope';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const IDEMPOTENT_REPLAY_HEADER = 'idempotent-replayed';
/** UUIDs or similar opaque client tokens. */
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_\-:.]{8,128}$/;

export interface IdempotencyRecord {
  readonly id: string;
  readonly requestHash: string;
  /** null while the first request is still running. */
  readonly responseStatus: number | null;
  readonly responseBody: unknown;
  readonly updatedAt: Date;
  readonly expiresAt: Date;
}

export interface IdempotencyKeyRef {
  readonly scope: string;
  readonly operation: string;
  readonly key: string;
}

/** Storage contract; the API implements it over the `idempotency_key` table. */
export interface IdempotencyStore {
  /** Insert an in-flight row. Returns it, or null when (scope, operation, key) already exists. */
  tryInsert(
    ref: IdempotencyKeyRef,
    requestHash: string,
    expiresAt: Date,
  ): Promise<IdempotencyRecord | null>;
  find(ref: IdempotencyKeyRef): Promise<IdempotencyRecord | null>;
  /** Store the outcome of the run that owns the row. */
  complete(id: string, status: number, body: unknown): Promise<void>;
  /** Delete the owner's in-flight row (unexpected failure → client may retry). */
  release(id: string): Promise<void>;
  /**
   * Compare-and-set takeover of an expired or crashed row: only succeeds if the row still has
   * `expectedUpdatedAt`; resets it to in-flight with the new hash/expiry. Returns the new row.
   */
  reclaim(
    id: string,
    expectedUpdatedAt: Date,
    requestHash: string,
    expiresAt: Date,
  ): Promise<IdempotencyRecord | null>;
  /** Lease heartbeat: refresh `updated_at` of the owner's still-running row (no-op otherwise). */
  heartbeat(id: string): Promise<void>;
  /** Remove rows whose expiry passed; returns the number removed. */
  purgeExpired(now: Date): Promise<number>;
}

/** Marker bodies stored instead of a response (never sent to clients as-is). */
export const IDEMPOTENCY_MARKER_KEY = 'kkIdempotency';
export const OUTCOME_UNKNOWN_BODY = { [IDEMPOTENCY_MARKER_KEY]: 'OUTCOME_UNKNOWN' } as const;
export const REPLAY_UNAVAILABLE_BODY = { [IDEMPOTENCY_MARKER_KEY]: 'REPLAY_UNAVAILABLE' } as const;
export const OUTCOME_UNKNOWN_STATUS = 500;

function markerOf(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const v = (body as Record<string, unknown>)[IDEMPOTENCY_MARKER_KEY];
  return typeof v === 'string' ? v : null;
}

export interface StoredResponse {
  readonly status: number;
  readonly body: unknown;
}

export type IdempotentResult =
  | { readonly replayed: false; readonly status: number; readonly body: unknown }
  | { readonly replayed: true; readonly status: number; readonly body: unknown };

export interface RunIdempotentOptions extends IdempotencyKeyRef {
  readonly requestHash: string;
  readonly ttlMs: number;
  readonly inFlightTimeoutMs: number;
  readonly requestId: string | null;
  /** Lease refresh interval; default inFlightTimeoutMs / 3. */
  readonly heartbeatIntervalMs?: number;
  /** Largest response body (UTF-8 JSON bytes) that is stored for replay. */
  readonly maxResponseBytes: number;
  /** Attempts to store the result after a successful handler (default 3). */
  readonly completeAttempts?: number;
  readonly now?: () => Date;
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Validate the raw header; throws the platform error codes. */
export function parseIdempotencyKey(raw: string | readonly string[] | undefined): string {
  if (raw === undefined || raw === '') throw AppError.of('IDEMPOTENCY_KEY_REQUIRED');
  if (typeof raw !== 'string' || !IDEMPOTENCY_KEY_PATTERN.test(raw)) {
    throw AppError.of('IDEMPOTENCY_KEY_INVALID');
  }
  return raw;
}

/** Stable JSON: object keys sorted, so `{a,b}` and `{b,a}` hash the same. */
export function canonicalJson(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') {
    return typeof value === 'bigint' ? JSON.stringify(value.toString()) : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/** SHA-256 over method + route + canonical body. */
export function hashRequest(method: string, route: string, body: unknown): string {
  return createHash('sha256')
    .update(`${method.toUpperCase()} ${route}\n${canonicalJson(body)}`)
    .digest('hex');
}

function replayOrRefuse(record: IdempotencyRecord, requestHash: string): IdempotentResult {
  if (record.requestHash !== requestHash) throw AppError.of('IDEMPOTENCY_KEY_REUSED');
  if (record.responseStatus === null) throw AppError.of('IDEMPOTENCY_REQUEST_IN_PROGRESS');
  const marker = markerOf(record.responseBody);
  if (marker === 'OUTCOME_UNKNOWN') throw AppError.of('IDEMPOTENCY_OUTCOME_UNKNOWN');
  if (marker === 'REPLAY_UNAVAILABLE') throw AppError.of('IDEMPOTENCY_REPLAY_UNAVAILABLE');
  return { replayed: true, status: record.responseStatus, body: record.responseBody };
}

/** Body to store: the response, or the REPLAY_UNAVAILABLE marker when too large / not JSON. */
export function storableBody(body: unknown, maxResponseBytes: number): unknown {
  let json: string;
  try {
    json = JSON.stringify(body ?? null);
  } catch {
    return REPLAY_UNAVAILABLE_BODY;
  }
  return Buffer.byteLength(json, 'utf8') > maxResponseBytes ? REPLAY_UNAVAILABLE_BODY : body;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms).unref?.();
  });
/** Backoff between attempts to store a result (technical). */
const COMPLETE_BACKOFF_MS = 100;

/**
 * Run `handler` at most once per (scope, operation, key) while the key is retained.
 * `handler` returns the success response; a thrown {@link AppError} with status < 500 is stored
 * as the outcome (and re-thrown); anything else releases the key and is re-thrown.
 */
export async function runIdempotent(
  store: IdempotencyStore,
  options: RunIdempotentOptions,
  handler: () => Promise<StoredResponse>,
): Promise<IdempotentResult> {
  const now = options.now ?? (() => new Date());
  const ref: IdempotencyKeyRef = {
    scope: options.scope,
    operation: options.operation,
    key: options.key,
  };
  const expiresAt = (): Date => new Date(now().getTime() + options.ttlMs);

  let owned = await store.tryInsert(ref, options.requestHash, expiresAt());
  if (!owned) {
    const existing = await store.find(ref);
    if (!existing) {
      // Purged between insert and read: one more insert attempt, otherwise ask the client to retry.
      owned = await store.tryInsert(ref, options.requestHash, expiresAt());
      if (!owned) throw AppError.of('IDEMPOTENCY_REQUEST_IN_PROGRESS');
    } else {
      const t = now().getTime();
      const expired = existing.expiresAt.getTime() <= t;
      const crashed =
        existing.responseStatus === null &&
        existing.requestHash === options.requestHash &&
        t - existing.updatedAt.getTime() >= options.inFlightTimeoutMs;
      if (!expired && !crashed) return replayOrRefuse(existing, options.requestHash);
      owned = await store.reclaim(
        existing.id,
        existing.updatedAt,
        options.requestHash,
        expiresAt(),
      );
      if (!owned) {
        const latest = await store.find(ref);
        if (!latest) throw AppError.of('IDEMPOTENCY_REQUEST_IN_PROGRESS');
        return replayOrRefuse(latest, options.requestHash);
      }
    }
  }

  const ownedId = owned.id;
  const sleep = options.sleep ?? defaultSleep;
  const heartbeatMs =
    options.heartbeatIntervalMs ?? Math.max(1, Math.floor(options.inFlightTimeoutMs / 3));
  const timer = setInterval(() => {
    store.heartbeat(ownedId).catch(() => undefined);
  }, heartbeatMs);
  timer.unref?.();

  let response: StoredResponse;
  try {
    response = await handler();
  } catch (error) {
    clearInterval(timer);
    if (error instanceof AppError && error.status < 500) {
      const envelope = toErrorEnvelope(error, options.requestId);
      await storeOutcome(store, ownedId, envelope.status, envelope.body, options, sleep);
    } else {
      await store.release(ownedId).catch(() => undefined);
    }
    throw error;
  }
  clearInterval(timer);
  const body = storableBody(response.body, options.maxResponseBytes);
  await storeOutcome(store, ownedId, response.status, body, options, sleep);
  return { replayed: false, status: response.status, body: response.body };
}

/**
 * Store the outcome of a handler that has FINISHED (its side effects may be committed).
 * Retries; then falls back to the OUTCOME_UNKNOWN marker. Never releases the key.
 */
async function storeOutcome(
  store: IdempotencyStore,
  id: string,
  status: number,
  body: unknown,
  options: RunIdempotentOptions,
  sleep: (ms: number) => Promise<void>,
): Promise<void> {
  const attempts = Math.max(1, options.completeAttempts ?? 3);
  for (let i = 0; i < attempts; i += 1) {
    try {
      await store.complete(id, status, body);
      return;
    } catch {
      if (i < attempts - 1) await sleep(COMPLETE_BACKOFF_MS * 2 ** i);
    }
  }
  for (let i = 0; i < attempts; i += 1) {
    try {
      await store.complete(id, OUTCOME_UNKNOWN_STATUS, OUTCOME_UNKNOWN_BODY);
      return;
    } catch {
      if (i < attempts - 1) await sleep(COMPLETE_BACKOFF_MS * 2 ** i);
    }
  }
  // Database unreachable: the row stays in-flight without heartbeat; see the module doc.
}

/** In-memory store for unit tests and module tests without a database. */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly rows = new Map<string, IdempotencyRecord & IdempotencyKeyRef>();
  private seq = 0;

  constructor(private readonly now: () => Date = () => new Date()) {}

  private static k(ref: IdempotencyKeyRef): string {
    return JSON.stringify([ref.scope, ref.operation, ref.key]);
  }

  get size(): number {
    return this.rows.size;
  }

  tryInsert(ref: IdempotencyKeyRef, requestHash: string, expiresAt: Date) {
    const k = InMemoryIdempotencyStore.k(ref);
    if (this.rows.has(k)) return Promise.resolve(null);
    this.seq += 1;
    const row = {
      ...ref,
      id: `idem-${this.seq}`,
      requestHash,
      responseStatus: null,
      responseBody: null,
      updatedAt: this.now(),
      expiresAt,
    };
    this.rows.set(k, row);
    return Promise.resolve(row);
  }

  find(ref: IdempotencyKeyRef) {
    return Promise.resolve(this.rows.get(InMemoryIdempotencyStore.k(ref)) ?? null);
  }

  private byId(id: string): [string, IdempotencyRecord & IdempotencyKeyRef] | undefined {
    return [...this.rows.entries()].find(([, r]) => r.id === id);
  }

  complete(id: string, status: number, body: unknown) {
    const hit = this.byId(id);
    if (hit) {
      this.rows.set(hit[0], {
        ...hit[1],
        responseStatus: status,
        responseBody: body,
        updatedAt: this.now(),
      });
    }
    return Promise.resolve();
  }

  release(id: string) {
    const hit = this.byId(id);
    if (hit && hit[1].responseStatus === null) this.rows.delete(hit[0]);
    return Promise.resolve();
  }

  reclaim(id: string, expectedUpdatedAt: Date, requestHash: string, expiresAt: Date) {
    const hit = this.byId(id);
    if (!hit || hit[1].updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      return Promise.resolve(null);
    }
    const row = {
      ...hit[1],
      requestHash,
      responseStatus: null,
      responseBody: null,
      updatedAt: this.now(),
      expiresAt,
    };
    this.rows.set(hit[0], row);
    return Promise.resolve(row);
  }

  heartbeat(id: string) {
    const hit = this.byId(id);
    if (hit && hit[1].responseStatus === null) {
      this.rows.set(hit[0], { ...hit[1], updatedAt: this.now() });
    }
    return Promise.resolve();
  }

  purgeExpired(now: Date) {
    let n = 0;
    for (const [k, r] of this.rows) {
      if (r.expiresAt.getTime() <= now.getTime()) {
        this.rows.delete(k);
        n += 1;
      }
    }
    return Promise.resolve(n);
  }
}

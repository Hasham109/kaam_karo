/**
 * A16 QA probes for T2.2 (platform lib) on real PostgreSQL + Redis, run as the non-owner API login.
 * Complements services/api/src/platform/platform.db-spec.ts (A01). Covers the idempotency edge
 * cases, outbox relay concurrency/backoff and the masker on the real append-only write path.
 *
 * Requirements: REL-002, REL-003, REL-006, REL-007, REL-008, REL-009, DATA-004,
 * SEC-REVIEW-T2.3 #10 (BP §26, §29, §31.1, §31.2; ARCH §7, §8).
 *
 * Run (not part of the turbo pipeline; tests/e2e has no runner yet):
 *   DATABASE_URL=<kaamkaro_api on a fresh, migrated DB> REDIS_URL=<redis> \
 *   pnpm --dir services/api exec vitest run --config <repo>/tests/e2e/api/vitest.qa-db.config.ts
 */
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Body, Controller, type INestApplication, Post, Res } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AppError,
  type OutboxMessage,
  type OutboxPublisher,
  loadServerEnv,
  relayOnce,
} from '@kaamkaro/platform';
import { AppModule } from '../../../services/api/src/app.module';
import { AuditWriter } from '../../../services/api/src/platform/audit.writer';
import type { HttpRequest } from '../../../services/api/src/platform/http-types';
import {
  IDEMPOTENCY_SCOPE_RESOLVER,
  Idempotent,
} from '../../../services/api/src/platform/idempotency.interceptor';
import { PrismaIdempotencyStore } from '../../../services/api/src/platform/idempotency.store';
import { OutboxWriter } from '../../../services/api/src/platform/outbox.writer';
import { PrismaOutboxRelayStore } from '../../../services/api/src/platform/outbox-relay.store';
import { PrismaService } from '../../../services/api/src/platform/prisma.service';

const appUrl = process.env['DATABASE_URL'];
const redisUrl = process.env['REDIS_URL'];
if (!appUrl || !redisUrl) throw new Error('needs DATABASE_URL (API login) and REDIS_URL');

const env = loadServerEnv({
  APP_ENV: 'test',
  DATABASE_URL: appUrl,
  REDIS_URL: redisUrl,
  LOG_LEVEL: 'error',
});
const run = randomUUID().slice(0, 8);
const counts = { create: 0, crash: 0, refuse: 0, accepted: 0 };
let crashOnce = true;

@Controller('qa')
class QaController {
  @Post('create')
  @Idempotent('booking.create')
  async create(@Body() body: { serviceId: string }): Promise<{ ref: string }> {
    counts.create += 1;
    await new Promise((r) => setTimeout(r, 100));
    return { ref: `${body.serviceId}-${counts.create}` };
  }

  @Post('crash')
  @Idempotent('payment.initiate')
  async crash(): Promise<{ ok: true }> {
    counts.crash += 1;
    if (crashOnce) {
      crashOnce = false;
      throw new Error('gateway timeout');
    }
    return Promise.resolve({ ok: true });
  }

  @Post('refuse')
  @Idempotent('quote.accept')
  refuse(): never {
    counts.refuse += 1;
    throw new AppError('QUOTE_EXPIRED', 409, 'Quote expired.');
  }

  @Post('accepted')
  @Idempotent('charge.approve')
  accepted(@Res({ passthrough: true }) res: { status(code: number): unknown }): { queued: true } {
    counts.accepted += 1;
    res.status(202);
    return { queued: true };
  }
}

describe('[REL-008][REL-009][DATA-004] A16 QA probes for T2.2 on real PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const user = `qa-${run}`;
  const post = (path: string, key: string | null, body: object) => {
    const r = request(app.getHttpServer()).post(path).set('x-test-user', user);
    return (key === null ? r : r.set('Idempotency-Key', key)).send(body);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
      controllers: [QaController],
    })
      .overrideProvider(IDEMPOTENCY_SCOPE_RESOLVER)
      .useValue((req: HttpRequest) => {
        const u = req.headers['x-test-user'];
        return typeof u === 'string' ? `user:${u}` : null;
      })
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('[REL-008] same key + different body → 409 IDEMPOTENCY_KEY_REUSED; original row unchanged', async () => {
    const key = `qa-${run}-reuse`;
    const first = await post('/qa/create', key, { serviceId: 'a' }).expect(201);
    const before = counts.create;
    const second = await post('/qa/create', key, { serviceId: 'b' }).expect(409);
    expect(second.body.error).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED', retryable: false });
    expect(counts.create).toBe(before);
    const rows = await prisma.idempotencyKey.findMany({ where: { key } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.responseBody).toEqual(first.body);
  });

  it('[REL-003][REL-008] two concurrent first requests, same key, DIFFERENT bodies → one run, one row', async () => {
    const key = `qa-${run}-race`;
    const before = counts.create;
    const [a, b] = await Promise.all([
      post('/qa/create', key, { serviceId: 'x' }),
      post('/qa/create', key, { serviceId: 'y' }),
    ]);
    expect(counts.create - before).toBe(1);
    expect(await prisma.idempotencyKey.count({ where: { key } })).toBe(1);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    const loser = a.status === 409 ? a : b;
    expect(['IDEMPOTENCY_KEY_REUSED', 'IDEMPOTENCY_REQUEST_IN_PROGRESS']).toContain(
      loser.body.error.code,
    );
  });

  it('[REL-006] in-flight → 409 IDEMPOTENCY_REQUEST_IN_PROGRESS retryable; then the retry replays', async () => {
    const key = `qa-${run}-inflight`;
    const slow = post('/qa/create', key, { serviceId: 'z' });
    const slowDone = slow.then((r) => r);
    await new Promise((r) => setTimeout(r, 30));
    const during = await post('/qa/create', key, { serviceId: 'z' });
    const first = await slowDone;
    expect(first.status).toBe(201);
    expect(during.status).toBe(409);
    expect(during.body.error).toMatchObject({
      code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS',
      retryable: true,
    });
    const retry = await post('/qa/create', key, { serviceId: 'z' }).expect(201);
    expect(retry.body).toEqual(first.body);
    expect(retry.headers['idempotent-replayed']).toBe('true');
  });

  it('[REL-008] missing key → 428 envelope and no row; bad key → 400', async () => {
    const r = await post('/qa/create', null, { serviceId: 'n' }).expect(428);
    expect(r.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    const bad = await post('/qa/create', 'short', { serviceId: 'n' }).expect(400);
    expect(bad.body.error.code).toBe('IDEMPOTENCY_KEY_INVALID');
  });

  it('[REL-007] a 5xx frees the key in the DB; the retry with the same key runs and succeeds', async () => {
    const key = `qa-${run}-crash`;
    const before = counts.crash;
    const failed = await post('/qa/crash', key, { amount: 1 }).expect(500);
    expect(failed.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(failed.body)).not.toContain('gateway timeout');
    expect(await prisma.idempotencyKey.count({ where: { key } })).toBe(0);
    await post('/qa/crash', key, { amount: 1 }).expect(201);
    expect(counts.crash - before).toBe(2);
    expect(await prisma.idempotencyKey.count({ where: { key } })).toBe(1);
  });

  it('[REL-002] a stored 4xx business refusal is replayed from the DB, handler not re-run', async () => {
    const key = `qa-${run}-refuse`;
    const before = counts.refuse;
    const first = await post('/qa/refuse', key, {}).expect(409);
    const again = await post('/qa/refuse', key, {}).expect(409);
    expect(counts.refuse - before).toBe(1);
    expect(again.body).toEqual(first.body);
    expect(again.headers['idempotent-replayed']).toBe('true');
  });

  it('[REL-002] replay keeps the ORIGINAL success status (handler set 202)', async () => {
    const key = `qa-${run}-202`;
    await post('/qa/accepted', key, {}).expect(202);
    const replay = await post('/qa/accepted', key, {});
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(replay.status).toBe(202);
  });

  it('[REL-007] a crashed in-flight row (older than the timeout) is reclaimed by the same request', async () => {
    const key = `qa-${run}-reclaim`;
    const store = new PrismaIdempotencyStore(prisma);
    const ref = { scope: `user:${user}`, operation: 'booking.create', key };
    // Simulate a process crash: an in-flight row whose owner never completed.
    const inserted = await store.tryInsert(
      ref,
      'will-be-overwritten',
      new Date(Date.now() + 3_600_000),
    );
    expect(inserted).not.toBeNull();
    // Directly through the store: compare-and-set with the value read back from the DB.
    const found = await store.find(ref);
    const reclaimed = await store.reclaim(
      found!.id,
      found!.updatedAt,
      'new-hash',
      new Date(Date.now() + 3_600_000),
    );
    expect(reclaimed?.requestHash).toBe('new-hash');

    // Through HTTP: backdate updated_at beyond IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS, same body.
    const key2 = `qa-${run}-reclaim2`;
    await post('/qa/create', key2, { serviceId: 'r' }).expect(201);
    await prisma.$executeRaw`
      UPDATE idempotency_key SET response_status = NULL, response_body = NULL,
             updated_at = now() - interval '10 minutes'
       WHERE key = ${key2}`;
    const before = counts.create;
    await post('/qa/create', key2, { serviceId: 'r' }).expect(201);
    expect(counts.create - before).toBe(1);
    // A different body may never take over a crashed key.
    await prisma.$executeRaw`
      UPDATE idempotency_key SET response_status = NULL, response_body = NULL,
             updated_at = now() - interval '10 minutes'
       WHERE key = ${key2}`;
    const other = await post('/qa/create', key2, { serviceId: 'other' }).expect(409);
    expect(other.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('[REL-008] an expired key starts a new run (new body allowed)', async () => {
    const key = `qa-${run}-expired`;
    await post('/qa/create', key, { serviceId: 'old' }).expect(201);
    await prisma.$executeRaw`
      UPDATE idempotency_key SET expires_at = now() - interval '1 minute' WHERE key = ${key}`;
    const before = counts.create;
    const fresh = await post('/qa/create', key, { serviceId: 'new' }).expect(201);
    expect(counts.create - before).toBe(1);
    expect(fresh.headers['idempotent-replayed']).toBeUndefined();
    expect(await prisma.idempotencyKey.count({ where: { key } })).toBe(1);
  });

  it('[REL-009] two relays at once never hand the same outbox row to the publisher twice', async () => {
    const outbox = app.get(OutboxWriter);
    const eventType = `qa_${run}.relay_race`;
    const ids: string[] = [];
    for (let i = 0; i < 20; i += 1) {
      ids.push(
        await prisma.$transaction((tx) =>
          outbox.append(tx, {
            eventType,
            schemaVersion: 1,
            aggregateType: 'qa',
            aggregateId: `${run}-${i}`,
            payload: { i },
          }),
        ),
      );
    }
    const seen: string[] = [];
    const publisher: OutboxPublisher = {
      async publish(m: OutboxMessage) {
        if (m.eventType !== eventType) return;
        seen.push(m.id);
        await new Promise((r) => setTimeout(r, 5));
      },
    };
    const store = new PrismaOutboxRelayStore(prisma);
    const policy = { maxAttempts: 3, baseMs: 10, maxMs: 50 };
    await Promise.all([
      relayOnce(store, publisher, { batchSize: 7, backoff: policy }),
      relayOnce(store, publisher, { batchSize: 7, backoff: policy }),
      relayOnce(store, publisher, { batchSize: 7, backoff: policy }),
    ]);
    while ((await relayOnce(store, publisher, { batchSize: 7, backoff: policy })) > 0) {
      /* drain */
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.sort()).toEqual([...ids].sort());
    expect(
      await prisma.outboxEvent.count({ where: { id: { in: ids }, status: 'PUBLISHED' } }),
    ).toBe(20);
  });

  it('[REL-007] a failed publish is not retried before its backoff time; attempts and next_attempt_at recorded', async () => {
    const outbox = app.get(OutboxWriter);
    const eventType = `qa_${run}.backoff`;
    const id = await prisma.$transaction((tx) =>
      outbox.append(tx, {
        eventType,
        schemaVersion: 1,
        aggregateType: 'qa',
        aggregateId: run,
        payload: {},
      }),
    );
    let calls = 0;
    const publisher: OutboxPublisher = {
      publish(m) {
        if (m.id !== id) return Promise.resolve();
        calls += 1;
        return Promise.reject(new Error('redis refused for 0300-1234567'));
      },
    };
    const store = new PrismaOutboxRelayStore(prisma);
    const policy = { maxAttempts: 5, baseMs: 60_000, maxMs: 60_000 };
    const t0 = Date.now();
    await relayOnce(store, publisher, { batchSize: 100, backoff: policy });
    await relayOnce(store, publisher, { batchSize: 100, backoff: policy });
    expect(calls).toBe(1);
    const row = await prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe('PENDING');
    expect(row.attempts).toBe(1);
    expect(row.nextAttemptAt.getTime()).toBeGreaterThanOrEqual(t0 + 59_000);
    expect(row.lastError).not.toContain('1234567');
  });

  it('[DATA-004][SEC-REVIEW-T2.3 #10] audit row through the real writer: PK phone variants and IPv6 never stored', async () => {
    const audit = app.get(AuditWriter);
    const reason = [
      'customer said call (0300) 1234567',
      'or 0300 - 1234567',
      'or landline (042) 35761234',
      'Urdu digits ۰۳۰۰۱۲۳۴۵۶۷',
      'from 2001:db8:85a3::8a2e:370:7334',
    ].join('; ');
    const id = await audit.write({
      actor: { userId: randomUUID(), role: 'ADMIN', subRoles: ['SUPPORT'] },
      action: 'QA_PROBE',
      object: { type: 'qa', id: randomUUID() },
      reason,
      source: { ip: '2001:db8:85a3:1234::1', client: 'admin-portal' },
    });
    const row = await prisma.auditLog.findUniqueOrThrow({ where: { id } });
    const stored = JSON.stringify(row);
    for (const leak of ['1234567', '35761234', '۱۲۳۴۵۶۷', '8a2e:370:7334']) {
      expect(stored, `stored audit row leaks "${leak}"`).not.toContain(leak);
    }
    expect(row.sourceMetadata).toMatchObject({ ip: '2001:db8:85a3::/48' });
  });
});

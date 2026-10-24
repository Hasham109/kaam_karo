/**
 * T2.2 review fixes on real PostgreSQL + Redis (SEC-REVIEW-T2.2 #2, #5, #8; QA-T22-01, -02, -06).
 * Same environment as platform.db-spec.ts (DATABASE_URL = kaamkaro_api, REDIS_URL = local Redis);
 * the config_key_policy-seeded DB is not needed here.
 */
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Controller, type INestApplication, Post, Res } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BullMqOutboxPublisher,
  OutboxConsumerRegistry,
  QUEUE_PREFIX,
  consumerQueueName,
  createLogger,
  createProducerConnection,
  loadServerEnv,
  startConsumerWorkers,
} from '@kaamkaro/platform';
import { AppModule } from '../app.module';
import { FailClosedStartupCheck } from '../config/fail-closed-startup';
import type { HttpRequest } from './http-types';
import {
  IDEMPOTENCY_SCOPE_RESOLVER,
  IDEMPOTENCY_STORE,
  Idempotent,
} from './idempotency.interceptor';
import { PrismaIdempotencyStore } from './idempotency.store';
import { OutboxWriter } from './outbox.writer';
import { PrismaOutboxRelayStore } from './outbox-relay.store';
import { PrismaService } from './prisma.service';

const appUrl = process.env['DATABASE_URL'];
const redisUrl = process.env['REDIS_URL'];
if (!appUrl || !redisUrl) throw new Error('test:db needs DATABASE_URL (API login) and REDIS_URL');

const env = loadServerEnv({
  APP_ENV: 'test',
  DATABASE_URL: appUrl,
  REDIS_URL: redisUrl,
  LOG_LEVEL: 'error',
});
const logger = createLogger({ level: 'error', writer: () => undefined });
const run = randomUUID().slice(0, 8);
const runs = { pay: 0, approve: 0 };

/** Real DB store whose complete() fails a set number of times (forced "DB blip" after commit). */
class FlakyPrismaStore extends PrismaIdempotencyStore {
  failCompletes = 0;
  override async complete(id: string, status: number, body: unknown): Promise<void> {
    if (this.failCompletes > 0) {
      this.failCompletes -= 1;
      throw new Error('db blip');
    }
    await super.complete(id, status, body);
  }
}

@Controller('review')
class ReviewController {
  @Post('pay')
  @Idempotent('payment.initiate')
  pay(): { paymentRef: string } {
    runs.pay += 1;
    return { paymentRef: `p-${runs.pay}` };
  }

  @Post('approve')
  @Idempotent('charge.approve')
  approve(@Res({ passthrough: true }) res: { status(code: number): unknown }): { ok: true } {
    runs.approve += 1;
    res.status(202);
    return { ok: true };
  }
}

describe('[REL-008][DATA-004] T2.2 review fixes on real PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let store: FlakyPrismaStore;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
      controllers: [ReviewController],
    })
      .overrideProvider(FailClosedStartupCheck)
      .useValue({ onApplicationBootstrap: () => undefined })
      .overrideProvider(IDEMPOTENCY_SCOPE_RESOLVER)
      .useValue((req: HttpRequest) => `user:${String(req.headers['x-test-user'])}`)
      .compile();
    prisma = moduleRef.get(PrismaService);
    store = new FlakyPrismaStore(prisma);
    const withStore = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
      controllers: [ReviewController],
    })
      .overrideProvider(FailClosedStartupCheck)
      .useValue({ onApplicationBootstrap: () => undefined })
      .overrideProvider(IDEMPOTENCY_SCOPE_RESOLVER)
      .useValue((req: HttpRequest) => `user:${String(req.headers['x-test-user'])}`)
      .overrideProvider(IDEMPOTENCY_STORE)
      .useValue(store)
      .compile();
    await moduleRef.close();
    app = withStore.createNestApplication({ logger: false });
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (path: string, key: string) =>
    request(app.getHttpServer())
      .post(path)
      .set('Idempotency-Key', key)
      .set('x-test-user', run)
      .send({});

  it('[REL-008] FORCED RE-RUN: the result cannot be stored → OUTCOME_UNKNOWN; retries never re-run (SEC #2)', async () => {
    const key = `rv-${run}-unknown`;
    store.failCompletes = 3; // all attempts to store the real result fail; the marker is stored
    const before = runs.pay;
    await post('/review/pay', key).expect(201);
    for (let i = 0; i < 3; i += 1) {
      const retry = await post('/review/pay', key).expect(409);
      expect(retry.body.error).toMatchObject({
        code: 'IDEMPOTENCY_OUTCOME_UNKNOWN',
        retryable: false,
      });
    }
    // Even with the row made to look "crashed" long ago, a marked row is never reclaimed.
    await prisma.$executeRaw`UPDATE idempotency_key SET updated_at = now() - interval '1 hour' WHERE key = ${key}`;
    await post('/review/pay', key).expect(409);
    expect(runs.pay - before).toBe(1);
    const row = await prisma.idempotencyKey.findFirstOrThrow({ where: { key } });
    expect(row.responseStatus).toBe(500);
    expect(row.responseBody).toEqual({ kkIdempotency: 'OUTCOME_UNKNOWN' });
  });

  it('[REL-002] QA-T22-02: replay keeps the original 202 status on the real store', async () => {
    const key = `rv-${run}-202`;
    await post('/review/approve', key).expect(202);
    const replay = await post('/review/approve', key);
    expect(replay.status).toBe(202);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    expect(runs.approve).toBe(1);
  });

  it('[REL-008] heartbeat refreshes only a running row (lease, SEC #2)', async () => {
    const ref = { scope: `user:${run}`, operation: 'booking.create', key: `rv-${run}-hb` };
    const row = await store.tryInsert(ref, 'h', new Date(Date.now() + 3_600_000));
    await prisma.$executeRaw`UPDATE idempotency_key SET updated_at = now() - interval '10 minutes' WHERE id = ${row!.id}::uuid`;
    await store.heartbeat(row!.id);
    const fresh = await store.find(ref);
    expect(Date.now() - fresh!.updatedAt.getTime()).toBeLessThan(60_000);
    await store.complete(row!.id, 201, {});
    await prisma.$executeRaw`UPDATE idempotency_key SET updated_at = now() - interval '10 minutes' WHERE id = ${row!.id}::uuid`;
    await store.heartbeat(row!.id);
    expect(Date.now() - (await store.find(ref))!.updatedAt.getTime()).toBeGreaterThan(5 * 60_000);
  });

  it('[DATA-004] SEC #5(b): the Prisma hook masks a direct create on an append-only table', async () => {
    // Direct client call (allowed in services/api/src/platform only, by lint) — still masked.
    const row = await prisma.auditLog.create({
      data: {
        actorRole: 'SYSTEM',
        action: 'HOOK_PROBE',
        objectType: 'probe',
        reason: 'call ۰۳۰۰۱۲۳۴۵۶۷ or (042) 35761234 from 2001:db8:85a3::8a2e:370:7334',
        after: { phone: '+923001234567', note: 'otp=123456' },
        sourceMetadata: { ip: '203.0.113.77' },
      },
    });
    const stored = JSON.stringify(row);
    for (const leak of [
      '۱۲۳۴۵۶۷',
      '35761234',
      '8a2e:370:7334',
      '923001234567',
      '123456',
      '203.0.113.77',
    ]) {
      expect(stored, leak).not.toContain(leak);
    }
  });

  it('[DATA-004] SEC #5(a): an outbox aggregateId that is a phone is refused', async () => {
    const outbox = app.get(OutboxWriter);
    await expect(
      prisma.$transaction((tx) =>
        outbox.append(tx, {
          eventType: 'booking.accepted',
          schemaVersion: 1,
          aggregateType: 'booking',
          aggregateId: '+923001234567',
          payload: {},
        }),
      ),
    ).rejects.toThrow(/aggregateId/);
  });

  it('[DATA-003] SEC #8: outbox retention purges old PUBLISHED / FAILED rows only when configured', async () => {
    const relayStore = new PrismaOutboxRelayStore(prisma);
    const outbox = app.get(OutboxWriter);
    const id = await prisma.$transaction((tx) =>
      outbox.append(tx, {
        eventType: `rv_${run}.old`,
        schemaVersion: 1,
        aggregateType: 'probe',
        aggregateId: run,
        payload: {},
      }),
    );
    await prisma.outboxEvent.updateMany({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date(Date.now() - 40 * 86_400_000) },
    });
    expect(await relayStore.purge(new Date(), null, null)).toBe(0); // OQ-080: null = keep
    expect(await prisma.outboxEvent.count({ where: { id } })).toBe(1);
    expect(await relayStore.purge(new Date(), 30, null)).toBeGreaterThanOrEqual(1);
    expect(await prisma.outboxEvent.count({ where: { id } })).toBe(0);
  });

  it('[SEC-BASE-002] SEC #8: a failing consumer leaves only a masked failedReason and no stack in Redis', async () => {
    const consumerName = `mask-${run}`;
    const eventType = `mask_${run}.happened`;
    const registry = new OutboxConsumerRegistry();
    registry.register({
      name: consumerName,
      eventTypes: [eventType],
      handle: () => Promise.reject(new Error('SMS rejected for 03001234567')),
    });
    const connection = createProducerConnection(redisUrl);
    await new Promise<void>((r) => connection.once('ready', () => r()));
    const publisher = new BullMqOutboxPublisher(connection, registry, {
      maxAttempts: 1,
      baseMs: 10,
      maxMs: 10,
    });
    const workers = startConsumerWorkers({ redisUrl, registry, logger });
    const queue = new Queue(consumerQueueName(consumerName), { connection, prefix: QUEUE_PREFIX });
    const id = randomUUID();
    try {
      await publisher.publish({
        id,
        eventType,
        schemaVersion: 1,
        aggregateType: 'probe',
        aggregateId: run,
        payload: {},
        occurredAt: new Date().toISOString(),
      });
      let job = await queue.getJob(id);
      for (let i = 0; i < 100 && !job?.failedReason; i += 1) {
        await new Promise((r) => setTimeout(r, 50));
        job = await queue.getJob(id);
      }
      expect(job?.failedReason).toBe('Error: SMS rejected for [PHONE]');
      expect(JSON.stringify(job?.stacktrace ?? [])).not.toContain('03001234567');
      expect(JSON.stringify(job?.stacktrace ?? [])).not.toContain(' at ');
    } finally {
      await workers.close();
      await queue.obliterate({ force: true });
      await queue.close();
      await publisher.close();
      await connection.quit();
    }
  });
});

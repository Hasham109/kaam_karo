/**
 * T2.2 acceptance on real PostgreSQL + Redis (IMPL §6 T2.2: "Idempotency test: same key twice →
 * one row; audit UPDATE denied at DB level"). Runs with `pnpm --filter @kaamkaro/api test:db`:
 *   DATABASE_URL = the API login kaamkaro_api (member of kaamkaro_app, NOT owner/superuser)
 *   REDIS_URL    = local Redis (infra/docker-compose.yml)
 * Covers REL-008, DATA-004, SEC-BASE-010, DATA-002, REL-009, REL-007, REL-010, REL-013,
 * SEC-REVIEW-T2.3 #10.
 */
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Body, Controller, type INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  BullMqOutboxPublisher,
  DEAD_LETTER_QUEUE,
  type OutboxMessage,
  OutboxConsumerRegistry,
  QUEUE_PREFIX,
  consumerQueueName,
  createLogger,
  deadLetterJobId,
  createProducerConnection,
  loadServerEnv,
  relayOnce,
  startConsumerWorkers,
} from '@kaamkaro/platform';
import { AppModule } from '../app.module';
import { AuditWriter, MarketplaceEventWriter } from './audit.writer';
import type { HttpRequest } from './http-types';
import { IDEMPOTENCY_SCOPE_RESOLVER, Idempotent } from './idempotency.interceptor';
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
const SYSTEM = { userId: null, role: 'SYSTEM' as const };
const run = randomUUID().slice(0, 8);

let handlerRuns = 0;

@Controller('db-probe')
class DbProbeController {
  @Post('bookings')
  @Idempotent('booking.create')
  async create(@Body() body: { serviceId: string }): Promise<{ bookingRef: string }> {
    handlerRuns += 1;
    await new Promise((r) => setTimeout(r, 50));
    return { bookingRef: `${body.serviceId}-${handlerRuns}` };
  }
}

const PERMISSION_DENIED = /permission denied for table/;

describe('[REL-008][DATA-004] platform on real PostgreSQL via the kaamkaro_api login', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
      controllers: [DbProbeController],
    })
      .overrideProvider(IDEMPOTENCY_SCOPE_RESOLVER)
      .useValue((req: HttpRequest) => {
        const user = req.headers['x-test-user'];
        return typeof user === 'string' ? `user:${user}` : null;
      })
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('[DATA-004] the test really runs as the non-owner API login', async () => {
    const [facts] = await prisma.$queryRaw<{ login: string; owner: boolean; superuser: boolean }[]>`
      SELECT current_user AS login,
             pg_has_role(current_user, (SELECT tableowner FROM pg_tables WHERE tablename = 'audit_log'), 'MEMBER') AS owner,
             (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser`;
    expect(facts).toEqual({ login: 'kaamkaro_api', owner: false, superuser: false });
  });

  it('[REL-008] same key twice → one idempotency_key row, handler once, original response', async () => {
    const key = `key-${run}-seq`;
    const send = () =>
      request(app.getHttpServer())
        .post('/db-probe/bookings')
        .set('Idempotency-Key', key)
        .set('x-test-user', `u-${run}`)
        .send({ serviceId: 'svc' });
    const before = handlerRuns;
    const first = await send().expect(201);
    const second = await send().expect(201);
    expect(handlerRuns - before).toBe(1);
    expect(second.body).toEqual(first.body);
    expect(second.headers['idempotent-replayed']).toBe('true');
    const rows = await prisma.idempotencyKey.findMany({ where: { key } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      operation: 'booking.create',
      responseStatus: 201,
      responseBody: first.body,
    });
  });

  it('[REL-003] five concurrent taps with one key → one row, handler once, no second success body', async () => {
    const key = `key-${run}-par`;
    const before = handlerRuns;
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/db-probe/bookings')
          .set('Idempotency-Key', key)
          .set('x-test-user', `u-${run}`)
          .send({ serviceId: 'svc' }),
      ),
    );
    expect(handlerRuns - before).toBe(1);
    expect(await prisma.idempotencyKey.count({ where: { key } })).toBe(1);
    const ok = responses.filter((r) => r.status === 201);
    const pending = responses.filter((r) => r.status === 409);
    expect(ok.length + pending.length).toBe(5);
    for (const r of pending) expect(r.body.error.code).toBe('IDEMPOTENCY_REQUEST_IN_PROGRESS');
    expect(new Set(ok.map((r) => JSON.stringify(r.body))).size).toBe(1);
  });

  it('[DATA-004][SEC-BASE-010] audit INSERT works; UPDATE and DELETE are denied by the database', async () => {
    const audit = app.get(AuditWriter);
    const id = await audit.write({
      actor: { userId: randomUUID(), role: 'ADMIN', subRoles: ['FINANCE'] },
      action: 'CONFIG_RULE_CHANGED',
      object: { type: 'config_rule', id: randomUUID() },
      before: { value: null },
      after: { value: 0.3, contactPhone: '+923001234567' },
      reason: 'owner decision D-006; caller 0300-1234567',
      source: { ip: '203.0.113.77', client: 'admin-portal' },
    });
    const row = await prisma.auditLog.findUniqueOrThrow({ where: { id } });
    const stored = JSON.stringify(row);
    expect(stored).not.toContain('923001234567');
    expect(stored).not.toContain('0300-1234567');
    expect(stored).not.toContain('203.0.113.77');
    expect(row.sourceMetadata).toEqual({ client: 'admin-portal', ip: '203.0.113.0/24' });

    await expect(
      prisma.auditLog.update({ where: { id }, data: { reason: 'rewritten' } }),
    ).rejects.toThrow(PERMISSION_DENIED);
    await expect(
      prisma.$executeRaw`UPDATE audit_log SET reason = 'x' WHERE id = ${id}::uuid`,
    ).rejects.toThrow(PERMISSION_DENIED);
    await expect(prisma.auditLog.delete({ where: { id } })).rejects.toThrow(PERMISSION_DENIED);
    await expect(prisma.$executeRaw`TRUNCATE audit_log`).rejects.toThrow(PERMISSION_DENIED);
    const after = await prisma.auditLog.findUniqueOrThrow({ where: { id } });
    expect(after.reason).toBe(row.reason);
  });

  it('[DATA-002] marketplace_event INSERT works; UPDATE is denied by the database', async () => {
    const events = app.get(MarketplaceEventWriter);
    const id = await events.write({
      actor: { userId: randomUUID(), role: 'PROVIDER' },
      action: 'QUOTE_SUBMITTED',
      object: { type: 'quote', id: randomUUID() },
      previousState: 'DRAFT',
      newState: 'SUBMITTED',
    });
    await expect(
      prisma.marketplaceEvent.update({ where: { id }, data: { newState: 'ACCEPTED' } }),
    ).rejects.toThrow(PERMISSION_DENIED);
  });

  it('[REL-010][REL-009] outbox + audit commit or roll back together with the state change', async () => {
    const outbox = app.get(OutboxWriter);
    const audit = app.get(AuditWriter);
    const aggregateId = randomUUID();
    await expect(
      prisma.$transaction(async (tx) => {
        await outbox.append(tx, {
          eventType: 'booking.accepted',
          schemaVersion: 1,
          aggregateType: 'booking',
          aggregateId,
          payload: { bookingId: aggregateId },
        });
        await audit.write(
          { actor: SYSTEM, action: 'PROBE', object: { type: 'booking', id: aggregateId } },
          tx,
        );
        throw new Error('state change failed');
      }),
    ).rejects.toThrow('state change failed');
    expect(await prisma.outboxEvent.count({ where: { aggregateId } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { objectId: aggregateId } })).toBe(0);

    const eventId = await prisma.$transaction((tx) =>
      outbox.append(tx, {
        eventType: 'booking.accepted',
        schemaVersion: 1,
        aggregateType: 'booking',
        aggregateId,
        payload: { bookingId: aggregateId, customerPhone: '+923001234567' },
      }),
    );
    const row = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: eventId } });
    expect(row).toMatchObject({ status: 'PENDING', attempts: 0 });
    expect(row.payload).toEqual({ bookingId: aggregateId, customerPhone: '[REDACTED]' });
  });

  it('[REL-009][NOTIF-001] relay publishes to BullMQ; the consumer gets the event; row PUBLISHED', async () => {
    const consumerName = `probe-${run}`;
    const eventType = `probe_${run}.happened`;
    const received: OutboxMessage[] = [];
    const registry = new OutboxConsumerRegistry();
    let done!: () => void;
    const gotIt = new Promise<void>((r) => {
      done = r;
    });
    registry.register({
      name: consumerName,
      eventTypes: [eventType],
      handle: (m) => {
        received.push(m);
        done();
        return Promise.resolve();
      },
    });
    const outbox = app.get(OutboxWriter);
    const eventId = await prisma.$transaction((tx) =>
      outbox.append(tx, {
        eventType,
        schemaVersion: 1,
        aggregateType: 'probe',
        aggregateId: run,
        payload: { n: 1 },
      }),
    );
    const connection = createProducerConnection(redisUrl);
    await new Promise<void>((r) => connection.once('ready', () => r()));
    const publisher = new BullMqOutboxPublisher(connection, registry, {
      maxAttempts: 3,
      baseMs: 10,
      maxMs: 50,
    });
    const workers = startConsumerWorkers({ redisUrl, registry, logger });
    try {
      const store = new PrismaOutboxRelayStore(prisma);
      await relayOnce(store, publisher, {
        batchSize: 500,
        backoff: { maxAttempts: 3, baseMs: 10, maxMs: 50 },
      });
      await gotIt;
      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({ id: eventId, eventType, payload: { n: 1 } });
      expect(await prisma.outboxEvent.findUniqueOrThrow({ where: { id: eventId } })).toMatchObject({
        status: 'PUBLISHED',
      });
      // Re-publishing the same event (relay crash before commit) does not create a second job.
      await publisher.publish(received[0] as OutboxMessage);
      const q = new Queue(consumerQueueName(consumerName), { connection, prefix: QUEUE_PREFIX });
      const counts = await q.getJobCounts('completed', 'waiting', 'active', 'delayed');
      expect(
        counts['completed']! + counts['waiting']! + counts['active']! + counts['delayed']!,
      ).toBe(1);
      await q.obliterate({ force: true });
      await q.close();
    } finally {
      await workers.close();
      await publisher.close();
      await connection.quit();
    }
  });

  it('[REL-007][REL-013] Redis down: event stays in PostgreSQL, retried with backoff, then dead-lettered', async () => {
    const registry = new OutboxConsumerRegistry();
    const eventType = `down_${run}.happened`;
    registry.register({
      name: `down-${run}`,
      eventTypes: [eventType],
      handle: () => Promise.resolve(),
    });
    const outbox = app.get(OutboxWriter);
    const eventId = await prisma.$transaction((tx) =>
      outbox.append(tx, {
        eventType,
        schemaVersion: 1,
        aggregateType: 'probe',
        aggregateId: run,
        payload: {},
      }),
    );
    // Port 1: nothing listens → every publish fails fast.
    const dead = createProducerConnection('redis://127.0.0.1:1');
    const publisher = new BullMqOutboxPublisher(dead, registry, {
      maxAttempts: 2,
      baseMs: 1,
      maxMs: 1,
    });
    const store = new PrismaOutboxRelayStore(prisma);
    const policy = { maxAttempts: 2, baseMs: 1, maxMs: 1 };
    try {
      await relayOnce(store, publisher, { batchSize: 500, backoff: policy });
      const afterFirst = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: eventId } });
      expect(afterFirst).toMatchObject({ status: 'PENDING', attempts: 1 });
      expect(afterFirst.lastError).toBeTruthy();
      await new Promise((r) => setTimeout(r, 5));
      await relayOnce(store, publisher, { batchSize: 500, backoff: policy });
      expect(await prisma.outboxEvent.findUniqueOrThrow({ where: { id: eventId } })).toMatchObject({
        status: 'FAILED',
        attempts: 2,
      });
    } finally {
      await publisher.close().catch(() => undefined);
      dead.disconnect();
    }
  });

  it('[REL-007] a consumer that keeps failing is retried, then copied to the dead-letter queue', async () => {
    const consumerName = `fail-${run}`;
    const eventType = `fail_${run}.happened`;
    const registry = new OutboxConsumerRegistry();
    let attempts = 0;
    registry.register({
      name: consumerName,
      eventTypes: [eventType],
      handle: () => {
        attempts += 1;
        return Promise.reject(new Error('handler broke'));
      },
    });
    const connection = createProducerConnection(redisUrl);
    await new Promise<void>((r) => connection.once('ready', () => r()));
    const publisher = new BullMqOutboxPublisher(connection, registry, {
      maxAttempts: 2,
      baseMs: 10,
      maxMs: 10,
    });
    const workers = startConsumerWorkers({ redisUrl, registry, logger });
    const dlq = new Queue(DEAD_LETTER_QUEUE, { connection, prefix: QUEUE_PREFIX });
    const message: OutboxMessage = {
      id: randomUUID(),
      eventType,
      schemaVersion: 1,
      aggregateType: 'probe',
      aggregateId: run,
      payload: {},
      occurredAt: new Date().toISOString(),
    };
    try {
      await publisher.publish(message);
      let job = null;
      for (let i = 0; i < 100 && !job; i += 1) {
        await new Promise((r) => setTimeout(r, 50));
        job = await dlq.getJob(deadLetterJobId(consumerName, message.id));
      }
      expect(attempts).toBe(2);
      expect(job?.data).toMatchObject({
        consumer: consumerName,
        attemptsMade: 2,
        message: { id: message.id },
      });
      await job?.remove();
    } finally {
      await workers.close();
      const q = new Queue(consumerQueueName(consumerName), { connection, prefix: QUEUE_PREFIX });
      await q.obliterate({ force: true });
      await q.close();
      await dlq.close();
      await publisher.close();
      await connection.quit();
    }
  });
});

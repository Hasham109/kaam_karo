/**
 * API tests for the platform wiring (T2.2): error envelope (contracts/common.yaml), security
 * headers, request ID and the idempotency interceptor. No database: the idempotency store is the
 * in-memory one; the real table is covered by src/platform/platform.db-spec.ts (test:db).
 */
import 'reflect-metadata';
import { Body, Controller, Get, type INestApplication, Post, Res } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Ajv2020 } from 'ajv/dist/2020';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { componentJsonSchema, loadOpenApi } from '@kaamkaro/contracts';
import {
  AppError,
  ConfigNotSetError,
  InMemoryIdempotencyStore,
  loadServerEnv,
} from '@kaamkaro/platform';
import { AppModule } from '../app.module';
import type { HttpRequest } from './http-types';
import { IDEMPOTENCY_SCOPE_RESOLVER, IDEMPOTENCY_STORE, Idempotent } from './index';

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateEnvelope = ajv.compile(componentJsonSchema(loadOpenApi('common'), 'ErrorEnvelope'));

const counters = { bookings: 0, refusals: 0 };
const SECRET = 'relation "user_account" at db.internal:5432 for 03001234567';

@Controller('probe')
class ProbeController {
  @Get('boom')
  boom(): never {
    throw new Error(SECRET);
  }

  @Get('refuse')
  refuse(): never {
    throw new AppError('QUOTE_EXPIRED', 409, 'Quote expired.');
  }

  @Get('config')
  config(): never {
    throw new ConfigNotSetError('cancel.window_minutes', 'VALUE_NULL');
  }

  @Post('bookings')
  @Idempotent('booking.create')
  create(@Body() body: { serviceId?: string }): { bookingId: string; serviceId?: string } {
    counters.bookings += 1;
    return {
      bookingId: `b-${counters.bookings}`,
      ...(body.serviceId ? { serviceId: body.serviceId } : {}),
    };
  }

  @Post('queued')
  @Idempotent('charge.approve')
  queued(@Res({ passthrough: true }) res: { status(code: number): unknown }): { queued: true } {
    counters.bookings += 1;
    res.status(202);
    return { queued: true };
  }

  @Post('accept')
  @Idempotent('quote.accept')
  accept(): never {
    counters.refusals += 1;
    throw new AppError('QUOTE_EXPIRED', 409, 'Quote expired.');
  }

  @Post('crash')
  @Idempotent('payment.initiate')
  crash(): never {
    throw new Error('gateway timeout');
  }
}

describe('[REL-001][REL-008] platform wiring over HTTP', () => {
  let app: INestApplication;
  let store: InMemoryIdempotencyStore;

  beforeAll(async () => {
    store = new InMemoryIdempotencyStore();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(loadServerEnv({ APP_ENV: 'test', LOG_LEVEL: 'error' }))],
      controllers: [ProbeController],
    })
      .overrideProvider(IDEMPOTENCY_STORE)
      .useValue(store)
      .overrideProvider(IDEMPOTENCY_SCOPE_RESOLVER)
      .useValue((req: HttpRequest) => {
        const user = req.headers['x-test-user'];
        return typeof user === 'string' ? `user:${user}` : null;
      })
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    counters.bookings = 0;
    counters.refusals = 0;
  });

  const http = () => request(app.getHttpServer());

  it('[REL-001] an unexpected error → 500 INTERNAL_ERROR envelope, nothing internal leaks', async () => {
    const res = await http().get('/probe/boom').expect(500);
    expect(validateEnvelope(res.body), JSON.stringify(validateEnvelope.errors)).toBe(true);
    expect(res.body.error).toMatchObject({ code: 'INTERNAL_ERROR', retryable: false });
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
    for (const leak of ['user_account', 'db.internal', '5432', '03001234567', 'stack']) {
      expect(JSON.stringify(res.body)).not.toContain(leak);
    }
  });

  it('[REL-001] an AppError keeps its stable code; unknown routes are NOT_FOUND', async () => {
    const refused = await http().get('/probe/refuse').expect(409);
    expect(refused.body.error.code).toBe('QUOTE_EXPIRED');
    const missing = await http().get('/no/such/route').expect(404);
    expect(validateEnvelope(missing.body)).toBe(true);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect(JSON.stringify(missing.body)).not.toContain('/no/such/route');
  });

  it('[SEC-BASE-005] malformed JSON → 400 BAD_REQUEST envelope', async () => {
    const res = await http()
      .post('/probe/bookings')
      .set('Content-Type', 'application/json')
      .set('Idempotency-Key', 'key-json-0001')
      .set('x-test-user', 'u1')
      .send('{"serviceId": ')
      .expect(400);
    expect(validateEnvelope(res.body)).toBe(true);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('[CFG-RULE-004] a required config value that is null fails closed with 503 CONFIG_NOT_SET', async () => {
    const res = await http().get('/probe/config').expect(503);
    expect(res.body.error).toMatchObject({ code: 'CONFIG_NOT_SET', retryable: false });
    expect(JSON.stringify(res.body)).not.toContain('cancel.window_minutes');
  });

  it('[SEC-BASE-001] security headers; no X-Powered-By; safe client request IDs only', async () => {
    const res = await http().get('/health').set('X-Request-Id', 'client-trace-0001');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['cache-control']).toBe('no-store');
    // SEC-REVIEW-T2.2 #12: the request ID is always server-generated.
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['x-request-id']).not.toBe('client-trace-0001');
    const bad = await http().get('/health').set('X-Request-Id', '<script>');
    expect(bad.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('[REL-008] same key twice → handler runs once, one key row, original body replayed', async () => {
    const send = () =>
      http()
        .post('/probe/bookings')
        .set('Idempotency-Key', 'key-same-0001')
        .set('x-test-user', 'u1')
        .send({ serviceId: 's1' });
    const sizeBefore = store.size;
    const first = await send().expect(201);
    const second = await send().expect(201);
    expect(counters.bookings).toBe(1);
    expect(store.size).toBe(sizeBefore + 1);
    expect(second.body).toEqual(first.body);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(first.headers['idempotent-replayed']).toBeUndefined();
  });

  it('[REL-008] same key with a different body → 409 IDEMPOTENCY_KEY_REUSED', async () => {
    const base = () =>
      http()
        .post('/probe/bookings')
        .set('Idempotency-Key', 'key-diff-0001')
        .set('x-test-user', 'u1');
    await base().send({ serviceId: 's1' }).expect(201);
    const res = await base().send({ serviceId: 's2' }).expect(409);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(counters.bookings).toBe(1);
  });

  it('[REL-008] missing key → 428; malformed key → 400; anonymous caller → 401', async () => {
    const noKey = await http()
      .post('/probe/bookings')
      .set('x-test-user', 'u1')
      .send({})
      .expect(428);
    expect(noKey.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    const badKey = await http()
      .post('/probe/bookings')
      .set('Idempotency-Key', 'x')
      .set('x-test-user', 'u1')
      .send({})
      .expect(400);
    expect(badKey.body.error.code).toBe('IDEMPOTENCY_KEY_INVALID');
    const anon = await http()
      .post('/probe/bookings')
      .set('Idempotency-Key', 'key-anon-0001')
      .send({});
    expect(anon.status).toBe(401);
    expect(anon.body.error.code).toBe('UNAUTHENTICATED');
    expect(counters.bookings).toBe(0);
  });

  it('[REL-002] a stored business refusal is replayed with its original status, not re-run', async () => {
    const send = () =>
      http()
        .post('/probe/accept')
        .set('Idempotency-Key', 'key-refuse-01')
        .set('x-test-user', 'u1')
        .send({});
    const first = await send().expect(409);
    const second = await send().expect(409);
    expect(counters.refusals).toBe(1);
    expect(second.body).toEqual(first.body);
    expect(second.headers['idempotent-replayed']).toBe('true');
  });

  it('[REL-007] an unexpected failure releases the key (a retry may run again)', async () => {
    const sizeBefore = store.size;
    await http()
      .post('/probe/crash')
      .set('Idempotency-Key', 'key-crash-001')
      .set('x-test-user', 'u1')
      .send({})
      .expect(500);
    expect(store.size).toBe(sizeBefore);
  });

  it('[REL-008] keys of different callers never collide', async () => {
    const send = (user: string) =>
      http()
        .post('/probe/bookings')
        .set('Idempotency-Key', 'key-users-001')
        .set('x-test-user', user)
        .send({});
    await send('u1').expect(201);
    await send('u2').expect(201);
    expect(counters.bookings).toBe(2);
  });
});

describe('[REL-002][SEC-BASE-001] review fixes over HTTP (QA-T22-02, SEC-REVIEW-T2.2 #11)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(loadServerEnv({ APP_ENV: 'test', LOG_LEVEL: 'error' }))],
      controllers: [ProbeController],
    })
      .overrideProvider(IDEMPOTENCY_STORE)
      .useValue(new InMemoryIdempotencyStore())
      .overrideProvider(IDEMPOTENCY_SCOPE_RESOLVER)
      .useValue(() => 'user:review')
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('[REL-002] QA-T22-02: a replay returns the ORIGINAL success status (202), not the route default', async () => {
    const send = () =>
      request(app.getHttpServer())
        .post('/probe/queued')
        .set('Idempotency-Key', 'key-202-0001')
        .send({});
    await send().expect(202);
    const replay = await send();
    expect(replay.status).toBe(202);
    expect(replay.body).toEqual({ queued: true });
    expect(replay.headers['idempotent-replayed']).toBe('true');
  });

  it('[SEC-BASE-001] SEC #11: a body-parser 400 still carries security headers and a request ID', async () => {
    const res = await request(app.getHttpServer())
      .post('/probe/bookings')
      .set('Content-Type', 'application/json')
      .set('X-Request-Id', 'client-trace-0002')
      .send('{"a":')
      .expect(400);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('[SEC-BASE-001] SEC #11: a 413 (body too large) carries the headers too', async () => {
    const res = await request(app.getHttpServer())
      .post('/probe/bookings')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ big: 'x'.repeat(200_000) }))
      .expect(413);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

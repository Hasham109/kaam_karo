/**
 * SEC-BASE-002 / INFRA-005 (BP §29, §34; permission-policy §7; SEC-REVIEW T2.1 finding 1):
 * an error thrown while handling a request with a body, an Authorization header, a cookie and
 * a client IP reaches Sentry WITHOUT any of them. Sentry is initialised with the production
 * options from `buildSentryOptions` and a fake in-memory transport (nothing leaves the process).
 */
import 'reflect-metadata';
import { randomInt, randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/nestjs';
import { Controller, type INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildSentryOptions, loadServerEnv } from '@kaamkaro/platform';
import { AppModule } from './app.module';

const sent: string[] = [];

function fakeTransport(options: Parameters<typeof Sentry.createTransport>[0]) {
  return Sentry.createTransport(options, (req) => {
    sent.push(typeof req.body === 'string' ? req.body : Buffer.from(req.body).toString('utf8'));
    return Promise.resolve({ statusCode: 200 });
  });
}

@Controller('sentry-probe')
class SentryProbeController {
  @Post()
  fail(): never {
    throw new Error('sentry-probe-failure');
  }
}

// Built at runtime so the values never appear in source code (stack-frame context lines).
const SECRETS = {
  token: `Bearer ${randomUUID()}`,
  cookie: `session=${randomUUID()}`,
  phone: `0300${randomInt(1_000_000, 9_999_999)}`,
  otp: String(randomInt(100_000, 999_999)),
  ip: `203.0.113.${randomInt(2, 254)}`,
};

describe('[SEC-BASE-002][INFRA-005] Sentry events carry no PII (fake transport)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const env = loadServerEnv({ APP_ENV: 'test' });
    const options = buildSentryOptions({
      appEnv: 'staging',
      sentryDsn: 'https://publickey@sentry.example.invalid/1',
      sentryTracesSampleRate: 1,
    });
    if (!options) throw new Error('expected Sentry options');
    Sentry.init({ ...options, transport: fakeTransport });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(env)],
      controllers: [SentryProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await Sentry.close();
  });

  it('[SEC-BASE-002] the error is reported, but without body, auth header, cookie, query or IP', async () => {
    await request(app.getHttpServer())
      .post(`/sentry-probe?phone=${SECRETS.phone}`)
      .set('Authorization', SECRETS.token)
      .set('Cookie', SECRETS.cookie)
      .set('X-Forwarded-For', SECRETS.ip)
      .send({ phone: SECRETS.phone, otp: SECRETS.otp })
      .expect(500);
    await Sentry.flush(5000);

    const payload = sent.join('\n');
    // The fake transport really received the error event (the test is not vacuous).
    expect(payload).toContain('sentry-probe-failure');
    for (const secret of Object.values(SECRETS)) {
      expect(payload, `leaked: ${secret}`).not.toContain(secret);
    }
    expect(payload).not.toMatch(/"ip_address"|"cookies"|"query_string"/i);
    expect(payload).not.toMatch(/"authorization"|"cookie"\s*:/i);
  });
});

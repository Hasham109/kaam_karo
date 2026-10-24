/**
 * API tests for GET /health (REL-011, BP §31.2, §34) + producer-side contract check
 * against contracts/health.yaml. No database or Redis is needed: probes are stubbed or
 * report `not_configured` when the env has no URL.
 */
import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Ajv2020 } from 'ajv/dist/2020';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { loadOpenApi, responseJsonSchema } from '@kaamkaro/contracts';
import { type DependencyStatus, type ServerEnv, loadServerEnv } from '@kaamkaro/platform';
import { AppModule } from '../../app.module';
import { FailClosedStartupCheck } from '../../config/fail-closed-startup';
import { HEALTH_PROBES, type HealthProbes } from './index';

const contract = loadOpenApi('health');
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate200 = ajv.compile(responseJsonSchema(contract, '/health', 'get', '200'));
const validate503 = ajv.compile(responseJsonSchema(contract, '/health', 'get', '503'));

function stubProbes(statuses: Record<keyof HealthProbes, DependencyStatus>): HealthProbes {
  return {
    database: () => Promise.resolve(statuses.database),
    redis: () => Promise.resolve(statuses.redis),
    queue: () => Promise.resolve(statuses.queue),
    storage: () => Promise.resolve(statuses.storage),
  };
}

async function startApp(env: ServerEnv, probes?: HealthProbes): Promise<INestApplication> {
  // The start-up security-limit check (RQ-008 item 5) has its own test; health is tested alone here.
  let builder = Test.createTestingModule({ imports: [AppModule.forRoot(env)] })
    .overrideProvider(FailClosedStartupCheck)
    .useValue({ onApplicationBootstrap: () => undefined });
  if (probes) builder = builder.overrideProvider(HEALTH_PROBES).useValue(probes);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return app;
}

describe('[REL-011] GET /health', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('[REL-011][INFRA-001] empty module set boots; nothing configured → 200 with not_configured', async () => {
    app = await startApp(loadServerEnv({ APP_ENV: 'development' }));
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({
      status: 'ok',
      checks: {
        database: { status: 'not_configured' },
        redis: { status: 'not_configured' },
        queue: { status: 'not_configured' },
        storage: { status: 'not_configured' },
      },
    });
    expect(validate200(res.body), JSON.stringify(validate200.errors)).toBe(true);
  });

  it('[REL-011] a dependency that is down → 503 matching the contract', async () => {
    app = await startApp(
      loadServerEnv({ APP_ENV: 'test' }),
      stubProbes({ database: 'up', redis: 'down', queue: 'not_configured', storage: 'up' }),
    );
    const res = await request(app.getHttpServer()).get('/health').expect(503);
    expect(res.body.status).toBe('error');
    expect(res.body.checks.redis).toEqual({ status: 'down' });
    expect(validate503(res.body), JSON.stringify(validate503.errors)).toBe(true);
  });

  it('[REL-011][SEC-BASE-011] staging with all dependencies up → 200', async () => {
    const env: ServerEnv = {
      ...loadServerEnv({ APP_ENV: 'test' }),
      appEnv: 'staging',
    };
    app = await startApp(
      env,
      stubProbes({
        database: 'up',
        redis: 'up',
        queue: 'not_configured',
        storage: 'not_configured',
      }),
    );
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(validate200(res.body), JSON.stringify(validate200.errors)).toBe(true);
  });

  it('[REL-011] response carries no hostnames or connection strings', async () => {
    app = await startApp(
      loadServerEnv({
        APP_ENV: 'development',
        DATABASE_URL: 'postgresql://user:pw@db.example.invalid:5432/x',
      }),
      stubProbes({ database: 'down', redis: 'up', queue: 'up', storage: 'up' }),
    );
    const res = await request(app.getHttpServer()).get('/health').expect(503);
    expect(JSON.stringify(res.body)).not.toMatch(/example\.invalid|postgresql|pw/);
  });
});

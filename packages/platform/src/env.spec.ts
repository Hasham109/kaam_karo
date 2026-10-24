import { describe, expect, it } from 'vitest';
import { EnvConfigError, TECHNICAL_DEFAULTS, loadServerEnv } from './env';

const REAL_DB = 'postgresql://app:Zq8tR2vXk@db.internal:5432/kaamkaro?sslmode=verify-full';
const REAL_REDIS = 'rediss://:Lm4pW9sQ@redis.internal:6379';
const REAL_DSN = 'https://publickey@sentry.example.invalid/1';

function captureError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('[SEC-BASE-011] server environment separation', () => {
  it('[SEC-BASE-011] refuses to start without a known APP_ENV', () => {
    expect(() => loadServerEnv({})).toThrow(EnvConfigError);
    expect(() => loadServerEnv({ APP_ENV: 'prod' })).toThrow(/APP_ENV must be one of/);
  });

  it('[SEC-BASE-011][REL-011] development runs without DB/Redis configured (health reports not_configured)', () => {
    const env = loadServerEnv({ APP_ENV: 'development' });
    expect(env).toEqual({
      appEnv: 'development',
      port: TECHNICAL_DEFAULTS.PORT,
      databaseUrl: null,
      redisUrl: null,
      sentryDsn: null,
      sentryTracesSampleRate: TECHNICAL_DEFAULTS.SENTRY_TRACES_SAMPLE_RATE,
      healthProbeTimeoutMs: TECHNICAL_DEFAULTS.HEALTH_PROBE_TIMEOUT_MS,
      configCacheTtlMs: TECHNICAL_DEFAULTS.CONFIG_CACHE_TTL_MS,
      idempotencyKeyTtlHours: TECHNICAL_DEFAULTS.IDEMPOTENCY_KEY_TTL_HOURS,
      idempotencyInFlightTimeoutMs: TECHNICAL_DEFAULTS.IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS,
      idempotencyMaxResponseBytes: TECHNICAL_DEFAULTS.IDEMPOTENCY_MAX_RESPONSE_BYTES,
      httpRequestTimeoutMs: TECHNICAL_DEFAULTS.HTTP_REQUEST_TIMEOUT_MS,
      outboxRetentionDays: null,
      deadLetterRetentionDays: null,
      outboxPollIntervalMs: TECHNICAL_DEFAULTS.OUTBOX_POLL_INTERVAL_MS,
      outboxBatchSize: TECHNICAL_DEFAULTS.OUTBOX_BATCH_SIZE,
      outboxMaxAttempts: TECHNICAL_DEFAULTS.OUTBOX_MAX_ATTEMPTS,
      outboxBackoffBaseMs: TECHNICAL_DEFAULTS.OUTBOX_BACKOFF_BASE_MS,
      outboxBackoffMaxMs: TECHNICAL_DEFAULTS.OUTBOX_BACKOFF_MAX_MS,
      logLevel: TECHNICAL_DEFAULTS.LOG_LEVEL,
    });
  });

  it.each(['staging', 'production'])(
    '[SEC-BASE-011] %s requires its own DATABASE_URL and REDIS_URL',
    (appEnv) => {
      expect(() => loadServerEnv({ APP_ENV: appEnv })).toThrow(/DATABASE_URL is required/);
      expect(() => loadServerEnv({ APP_ENV: appEnv, DATABASE_URL: REAL_DB })).toThrow(
        /REDIS_URL is required/,
      );
      expect(
        loadServerEnv({
          APP_ENV: appEnv,
          DATABASE_URL: REAL_DB,
          REDIS_URL: REAL_REDIS,
          SENTRY_DSN: REAL_DSN,
        }).appEnv,
      ).toBe(appEnv);
    },
  );

  it.each(['staging', 'production'])(
    '[INFRA-005] %s refuses to boot with Sentry monitoring off (empty SENTRY_DSN)',
    (appEnv) => {
      for (const dsn of [undefined, '', '   ']) {
        expect(() =>
          loadServerEnv({
            APP_ENV: appEnv,
            DATABASE_URL: REAL_DB,
            REDIS_URL: REAL_REDIS,
            SENTRY_DSN: dsn,
          }),
        ).toThrow(/SENTRY_DSN is required/);
      }
    },
  );

  it('[INFRA-005] development and test may run without a Sentry DSN (no-op)', () => {
    expect(loadServerEnv({ APP_ENV: 'test' }).sentryDsn).toBeNull();
  });

  it.each(['staging', 'production'])(
    '[SEC-BASE-008] %s refuses example (fake) secrets copied from .env.example',
    (appEnv) => {
      expect(() =>
        loadServerEnv({
          APP_ENV: appEnv,
          DATABASE_URL: 'postgresql://kaamkaro:fake-dev-password-change-me@localhost:5432/x',
          REDIS_URL: REAL_REDIS,
          SENTRY_DSN: REAL_DSN,
        }),
      ).toThrow(/DATABASE_URL contains an example placeholder/);
    },
  );

  it('[SEC-BASE-008] development accepts the .env.example placeholders', () => {
    expect(
      loadServerEnv({ APP_ENV: 'development', DATABASE_URL: 'postgresql://u:fake@localhost/x' })
        .databaseUrl,
    ).toBe('postgresql://u:fake@localhost/x');
  });

  it('[SEC-BASE-011] rejects malformed technical settings and lists every problem', () => {
    const error = captureError(() =>
      loadServerEnv({
        APP_ENV: 'test',
        PORT: '70000',
        HEALTH_PROBE_TIMEOUT_MS: '-1',
        SENTRY_TRACES_SAMPLE_RATE: '2',
      }),
    );
    expect(error).toBeInstanceOf(EnvConfigError);
    expect((error as EnvConfigError).problems).toHaveLength(3);
  });
});

describe('[DATA-004] API vs migration database login (T2.3; SEC-REVIEW-T2.3 #1)', () => {
  it.each(['development', 'staging', 'production'])(
    '[DATA-004] %s refuses DATABASE_URL equal to MIGRATION_DATABASE_URL',
    (appEnv) => {
      expect(() =>
        loadServerEnv({
          APP_ENV: appEnv,
          DATABASE_URL: REAL_DB,
          MIGRATION_DATABASE_URL: REAL_DB,
          REDIS_URL: REAL_REDIS,
          SENTRY_DSN: REAL_DSN,
        }),
      ).toThrow(/not the migration owner/);
    },
  );

  it('[DATA-004] separate logins are accepted', () => {
    const env = loadServerEnv({
      APP_ENV: 'production',
      DATABASE_URL: REAL_DB,
      MIGRATION_DATABASE_URL:
        'postgresql://owner:Pq7wK3zR@db.internal:5432/kaamkaro?sslmode=verify-full',
      REDIS_URL: REAL_REDIS,
      SENTRY_DSN: REAL_DSN,
    });
    expect(env.databaseUrl).toBe(REAL_DB);
  });
});

describe('[REL-008][REL-009] T2.2 technical settings', () => {
  it('[REL-009] overrides are read from env', () => {
    const env = loadServerEnv({
      APP_ENV: 'development',
      LOG_LEVEL: 'debug',
      CONFIG_CACHE_TTL_MS: '0',
      IDEMPOTENCY_KEY_TTL_HOURS: '48',
      OUTBOX_MAX_ATTEMPTS: '3',
    });
    expect(env).toMatchObject({
      logLevel: 'debug',
      configCacheTtlMs: 0,
      idempotencyKeyTtlHours: 48,
      outboxMaxAttempts: 3,
    });
  });

  it.each([
    ['LOG_LEVEL', 'verbose'],
    ['CONFIG_CACHE_TTL_MS', '-1'],
    ['IDEMPOTENCY_KEY_TTL_HOURS', '0'],
    ['OUTBOX_BATCH_SIZE', '1.5'],
    ['OUTBOX_MAX_ATTEMPTS', 'many'],
  ])('[REL-007] refuses %s=%s', (key, value) => {
    expect(() => loadServerEnv({ APP_ENV: 'development', [key]: value })).toThrow(EnvConfigError);
  });
});

// SEC-REVIEW-T2.2 #2, #7, #8 (BP §26, §29, §31.2, §34; SEC-BASE-001; REL-008; OQ-080).
describe('[SEC-BASE-001] review fixes: deadlines, TLS, retention', () => {
  it('[REL-008] the idempotency lease must be >= the handler deadline; no 1 ms deadlines', () => {
    expect(() =>
      loadServerEnv({ APP_ENV: 'development', IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS: '1' }),
    ).toThrow(/IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS must be >= HTTP_REQUEST_TIMEOUT_MS/);
    expect(() => loadServerEnv({ APP_ENV: 'development', HTTP_REQUEST_TIMEOUT_MS: '1' })).toThrow(
      /at least 1000/,
    );
    expect(
      loadServerEnv({
        APP_ENV: 'development',
        HTTP_REQUEST_TIMEOUT_MS: '20000',
        IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS: '20000',
      }).httpRequestTimeoutMs,
    ).toBe(20000);
  });

  it.each([
    [{ REDIS_URL: 'redis://:Lm4pW9sQ@redis.internal:6379' }, /rediss/],
    [{ REDIS_URL: 'rediss://redis.internal:6379' }, /password/],
    [{ DATABASE_URL: 'postgresql://app:Zq8tR2vXk@db.internal:5432/kaamkaro' }, /sslmode/],
    [
      { DATABASE_URL: 'postgresql://app:Zq8tR2vXk@db.internal:5432/kaamkaro?sslmode=prefer' },
      /sslmode/,
    ],
  ])(
    '[SEC-BASE-001] production refuses an unencrypted or unauthenticated connection %o',
    (patch, msg) => {
      expect(() =>
        loadServerEnv({
          APP_ENV: 'production',
          DATABASE_URL: REAL_DB,
          REDIS_URL: REAL_REDIS,
          SENTRY_DSN: REAL_DSN,
          ...patch,
        }),
      ).toThrow(msg);
    },
  );

  it('[SEC-BASE-001] development still accepts local redis:// and no sslmode', () => {
    expect(
      loadServerEnv({
        APP_ENV: 'development',
        DATABASE_URL: 'postgresql://a:b@localhost:5432/x',
        REDIS_URL: 'redis://localhost:6379',
      }).redisUrl,
    ).toBe('redis://localhost:6379');
  });

  it('[DATA-003] retention is null (keep, OQ-080) until set; invalid values refused', () => {
    expect(loadServerEnv({ APP_ENV: 'development' }).outboxRetentionDays).toBeNull();
    expect(
      loadServerEnv({ APP_ENV: 'development', DEAD_LETTER_RETENTION_DAYS: '30' })
        .deadLetterRetentionDays,
    ).toBe(30);
    expect(() => loadServerEnv({ APP_ENV: 'development', OUTBOX_RETENTION_DAYS: '0' })).toThrow(
      EnvConfigError,
    );
  });
});

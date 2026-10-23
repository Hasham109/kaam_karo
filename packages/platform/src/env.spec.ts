import { describe, expect, it } from 'vitest';
import { EnvConfigError, TECHNICAL_DEFAULTS, loadServerEnv } from './env';

const REAL_DB = 'postgresql://app:Zq8tR2vXk@db.internal:5432/kaamkaro';
const REAL_REDIS = 'redis://:Lm4pW9sQ@redis.internal:6379';
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
      MIGRATION_DATABASE_URL: 'postgresql://owner:Pq7wK3zR@db.internal:5432/kaamkaro',
      REDIS_URL: REAL_REDIS,
      SENTRY_DSN: REAL_DSN,
    });
    expect(env.databaseUrl).toBe(REAL_DB);
  });
});

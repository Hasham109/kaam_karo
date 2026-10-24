/**
 * Server environment loader (T2.1).
 *
 * - SEC-BASE-011 (BP §29, §34): development, test, staging and production are separate
 *   environments; each gets its own database, Redis, keys and Sentry DSN from its own env.
 * - SEC-BASE-008 (BP §29, §34, §43 rule 69): secrets come only from the process environment,
 *   which staging/production fill from the hosting secret manager. Nothing is read from git.
 *
 * Business values never live here (golden rule 2); only technical settings.
 */

export const APP_ENVS = ['development', 'test', 'staging', 'production'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** Environments that run on shared infrastructure and must use real secrets. */
export const DEPLOYED_ENVS: readonly AppEnv[] = ['staging', 'production'];

/**
 * Keys that must be present in deployed environments: DB + Redis (REL-011 dependencies) and
 * the Sentry DSN (INFRA-005, BP §34, §31.2; D-001: monitoring must be configured — a deployed
 * environment never runs with error monitoring silently off; QA T2.1 F-03).
 */
export const REQUIRED_WHEN_DEPLOYED = ['DATABASE_URL', 'REDIS_URL', 'SENTRY_DSN'] as const;

/** Marker words used in `.env.example`; a deployed env must never contain them (SEC-BASE-008). */
export const FAKE_VALUE_MARKERS = ['fake', 'change-me'] as const;

/** Env keys that carry connection strings or secrets and are checked for fake markers. */
export const SECRET_KEY_PATTERN = /(_URL|_DSN|_KEY|_SECRET|_PASSWORD|_TOKEN)$/;

/** Technical defaults (not business values). Each can be overridden by its env key. */
export const TECHNICAL_DEFAULTS = {
  PORT: 3000,
  HEALTH_PROBE_TIMEOUT_MS: 2000,
  SENTRY_TRACES_SAMPLE_RATE: 0,
  // T2.2 technical settings (not business values; golden rule 2 covers business values only).
  /** Config reader cache (CFG-RULE-001 "without a deploy": changes are seen within this time). */
  CONFIG_CACHE_TTL_MS: 30_000,
  /** How long a stored idempotent result is replayed (REL-008; ARCH §5.3 IdempotencyKey). */
  IDEMPOTENCY_KEY_TTL_HOURS: 24,
  /**
   * Idempotency lease: a running request refreshes its key; a key not refreshed for this long
   * belongs to a dead process (SEC-REVIEW-T2.2 #2). Must be >= HTTP_REQUEST_TIMEOUT_MS.
   */
  IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS: 60_000,
  /** Largest stored idempotent response (SEC-REVIEW-T2.2 #9); larger ones are not replayed. */
  IDEMPOTENCY_MAX_RESPONSE_BYTES: 16_384,
  /** Server handler deadline: Node `server.requestTimeout` (SEC-REVIEW-T2.2 #2). */
  HTTP_REQUEST_TIMEOUT_MS: 30_000,
  /** Outbox relay polling (REL-009; ARCH §7). */
  OUTBOX_POLL_INTERVAL_MS: 1000,
  OUTBOX_BATCH_SIZE: 100,
  /** Delivery attempts before an event / job is dead-lettered (REL-007 safe retries). */
  OUTBOX_MAX_ATTEMPTS: 10,
  /** Exponential backoff: base * 2^(attempt-1), capped at max (REL-007). */
  OUTBOX_BACKOFF_BASE_MS: 1000,
  OUTBOX_BACKOFF_MAX_MS: 300_000,
  LOG_LEVEL: 'info',
} as const;

/** Smallest accepted handler deadline (a 1 ms deadline would make every lease meaningless). */
export const MIN_HTTP_REQUEST_TIMEOUT_MS = 1000;

/** Postgres sslmode values that encrypt the connection (SEC-REVIEW-T2.2 #7; SEC-BASE-001). */
export const TLS_SSLMODES = ['require', 'verify-ca', 'verify-full'] as const;

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export interface ServerEnv {
  readonly appEnv: AppEnv;
  readonly port: number;
  readonly databaseUrl: string | null;
  readonly redisUrl: string | null;
  readonly sentryDsn: string | null;
  readonly sentryTracesSampleRate: number;
  readonly healthProbeTimeoutMs: number;
  readonly configCacheTtlMs: number;
  readonly idempotencyKeyTtlHours: number;
  readonly idempotencyInFlightTimeoutMs: number;
  readonly idempotencyMaxResponseBytes: number;
  readonly httpRequestTimeoutMs: number;
  /**
   * Retention in days of PUBLISHED outbox rows (outboxRetentionDays) and of FAILED/dead-lettered
   * rows plus failed and dead-letter queue jobs (deadLetterRetentionDays).
   * null = keep: the owner has not decided (TODO(OWNER), OQ-080).
   */
  readonly outboxRetentionDays: number | null;
  readonly deadLetterRetentionDays: number | null;
  readonly outboxPollIntervalMs: number;
  readonly outboxBatchSize: number;
  readonly outboxMaxAttempts: number;
  readonly outboxBackoffBaseMs: number;
  readonly outboxBackoffMaxMs: number;
  readonly logLevel: LogLevel;
}

export type EnvSource = Readonly<Record<string, string | undefined>>;

export class EnvConfigError extends Error {
  constructor(public readonly problems: readonly string[]) {
    super(`Invalid environment configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'EnvConfigError';
  }
}

export function isAppEnv(value: string | undefined): value is AppEnv {
  return value !== undefined && (APP_ENVS as readonly string[]).includes(value);
}

export function isDeployedEnv(appEnv: AppEnv): boolean {
  return DEPLOYED_ENVS.includes(appEnv);
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseNumber(
  source: EnvSource,
  key: string,
  fallback: number,
  check: (n: number) => boolean,
  rule: string,
  problems: string[],
): number {
  const raw = emptyToNull(source[key]);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || !check(value)) {
    problems.push(`${key} must be ${rule} (got "${raw}")`);
    return fallback;
  }
  return value;
}

/**
 * Reads and validates the server environment. Throws {@link EnvConfigError} listing every
 * problem at once so a misconfigured deployment fails fast at boot (BP §31.2).
 */
export function loadServerEnv(source: EnvSource): ServerEnv {
  const problems: string[] = [];

  const rawAppEnv = emptyToNull(source['APP_ENV']) ?? undefined;
  if (!isAppEnv(rawAppEnv)) {
    problems.push(`APP_ENV must be one of ${APP_ENVS.join(', ')} (got "${rawAppEnv ?? ''}")`);
    throw new EnvConfigError(problems);
  }
  const appEnv = rawAppEnv;

  const port = parseNumber(
    source,
    'PORT',
    TECHNICAL_DEFAULTS.PORT,
    (n) => Number.isInteger(n) && n > 0 && n <= 65535,
    'an integer between 1 and 65535',
    problems,
  );
  const healthProbeTimeoutMs = parseNumber(
    source,
    'HEALTH_PROBE_TIMEOUT_MS',
    TECHNICAL_DEFAULTS.HEALTH_PROBE_TIMEOUT_MS,
    (n) => Number.isInteger(n) && n > 0,
    'a positive integer',
    problems,
  );
  const sentryTracesSampleRate = parseNumber(
    source,
    'SENTRY_TRACES_SAMPLE_RATE',
    TECHNICAL_DEFAULTS.SENTRY_TRACES_SAMPLE_RATE,
    (n) => n >= 0 && n <= 1,
    'a number between 0 and 1',
    problems,
  );

  if (isDeployedEnv(appEnv)) {
    // SEC-BASE-011: deployed environments must point at their own infrastructure.
    for (const key of REQUIRED_WHEN_DEPLOYED) {
      if (emptyToNull(source[key]) === null)
        problems.push(`${key} is required when APP_ENV=${appEnv}`);
    }
    // SEC-REVIEW-T2.2 #7 (SEC-BASE-001; BP §29, §34): encrypted, authenticated connections.
    problems.push(...deployedConnectionProblems(source));
    // SEC-BASE-008: example (fake) values must never reach staging or production.
    for (const [key, value] of Object.entries(source)) {
      if (!SECRET_KEY_PATTERN.test(key)) continue;
      const lower = value?.toLowerCase() ?? '';
      if (FAKE_VALUE_MARKERS.some((marker) => lower.includes(marker))) {
        problems.push(
          `${key} contains an example placeholder value; set a real secret for ${appEnv}`,
        );
      }
    }
  }

  // T2.2 technical settings (REL-007, REL-008, REL-009; CFG-RULE-001).
  const positiveInt = (key: keyof typeof TECHNICAL_DEFAULTS, allowZero = false): number =>
    parseNumber(
      source,
      key,
      TECHNICAL_DEFAULTS[key] as number,
      (n) => Number.isInteger(n) && (allowZero ? n >= 0 : n > 0),
      allowZero ? 'a non-negative integer' : 'a positive integer',
      problems,
    );
  const configCacheTtlMs = positiveInt('CONFIG_CACHE_TTL_MS', true);
  const idempotencyKeyTtlHours = positiveInt('IDEMPOTENCY_KEY_TTL_HOURS');
  const idempotencyInFlightTimeoutMs = positiveInt('IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS');
  const idempotencyMaxResponseBytes = positiveInt('IDEMPOTENCY_MAX_RESPONSE_BYTES');
  const httpRequestTimeoutMs = positiveInt('HTTP_REQUEST_TIMEOUT_MS');
  if (httpRequestTimeoutMs < MIN_HTTP_REQUEST_TIMEOUT_MS) {
    problems.push(`HTTP_REQUEST_TIMEOUT_MS must be at least ${MIN_HTTP_REQUEST_TIMEOUT_MS}`);
  }
  if (idempotencyInFlightTimeoutMs < httpRequestTimeoutMs) {
    problems.push(
      'IDEMPOTENCY_IN_FLIGHT_TIMEOUT_MS must be >= HTTP_REQUEST_TIMEOUT_MS (a running request must never look crashed)',
    );
  }
  // TODO(OWNER) OQ-080: retention not decided -> null = keep, no purge.
  const optionalDays = (key: string): number | null => {
    const raw = emptyToNull(source[key]);
    if (raw === null) return null;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1) {
      problems.push(`${key} must be a positive integer number of days or empty (got "${raw}")`);
      return null;
    }
    return n;
  };
  const outboxRetentionDays = optionalDays('OUTBOX_RETENTION_DAYS');
  const deadLetterRetentionDays = optionalDays('DEAD_LETTER_RETENTION_DAYS');
  const outboxPollIntervalMs = positiveInt('OUTBOX_POLL_INTERVAL_MS');
  const outboxBatchSize = positiveInt('OUTBOX_BATCH_SIZE');
  const outboxMaxAttempts = positiveInt('OUTBOX_MAX_ATTEMPTS');
  const outboxBackoffBaseMs = positiveInt('OUTBOX_BACKOFF_BASE_MS');
  const outboxBackoffMaxMs = positiveInt('OUTBOX_BACKOFF_MAX_MS');
  const rawLogLevel = emptyToNull(source['LOG_LEVEL']) ?? TECHNICAL_DEFAULTS.LOG_LEVEL;
  let logLevel: LogLevel = TECHNICAL_DEFAULTS.LOG_LEVEL;
  if ((LOG_LEVELS as readonly string[]).includes(rawLogLevel)) logLevel = rawLogLevel as LogLevel;
  else problems.push(`LOG_LEVEL must be one of ${LOG_LEVELS.join(', ')} (got "${rawLogLevel}")`);

  // T2.3 (BP §26, §29; SEC-REVIEW-T2.3 #1): the API must not use the migration owner's login.
  // MIGRATION_DATABASE_URL is read only by Prisma; the API reads DATABASE_URL.
  const apiDbUrl = emptyToNull(source['DATABASE_URL']);
  if (
    appEnv !== 'test' &&
    apiDbUrl !== null &&
    apiDbUrl === emptyToNull(source['MIGRATION_DATABASE_URL'])
  ) {
    problems.push(
      'DATABASE_URL must be the API login (member of kaamkaro_app), not the migration owner in MIGRATION_DATABASE_URL',
    );
  }

  if (problems.length > 0) throw new EnvConfigError(problems);

  return {
    appEnv,
    port,
    databaseUrl: emptyToNull(source['DATABASE_URL']),
    redisUrl: emptyToNull(source['REDIS_URL']),
    sentryDsn: emptyToNull(source['SENTRY_DSN']),
    sentryTracesSampleRate,
    healthProbeTimeoutMs,
    configCacheTtlMs,
    idempotencyKeyTtlHours,
    idempotencyInFlightTimeoutMs,
    idempotencyMaxResponseBytes,
    httpRequestTimeoutMs,
    outboxRetentionDays,
    deadLetterRetentionDays,
    outboxPollIntervalMs,
    outboxBatchSize,
    outboxMaxAttempts,
    outboxBackoffBaseMs,
    outboxBackoffMaxMs,
    logLevel,
  };
}

/** TLS + auth rules for deployed connection strings (SEC-REVIEW-T2.2 #7). Exported for tests. */
export function deployedConnectionProblems(source: EnvSource): string[] {
  const problems: string[] = [];
  const redis = emptyToNull(source['REDIS_URL']);
  if (redis !== null) {
    let url: URL | null = null;
    try {
      url = new URL(redis);
    } catch {
      problems.push('REDIS_URL is not a valid URL');
    }
    if (url) {
      if (url.protocol !== 'rediss:') {
        problems.push('REDIS_URL must use TLS (rediss://) when deployed');
      }
      if (!url.password) problems.push('REDIS_URL must include a password when deployed');
    }
  }
  for (const key of ['DATABASE_URL', 'MIGRATION_DATABASE_URL']) {
    const value = emptyToNull(source[key]);
    if (value === null) continue;
    let mode: string | null;
    try {
      mode = new URL(value).searchParams.get('sslmode');
    } catch {
      problems.push(`${key} is not a valid URL`);
      continue;
    }
    if (!mode || !(TLS_SSLMODES as readonly string[]).includes(mode)) {
      problems.push(`${key} must set sslmode=${TLS_SSLMODES.join('|')} when deployed`);
    }
  }
  return problems;
}

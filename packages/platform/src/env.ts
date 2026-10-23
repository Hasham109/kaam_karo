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
} as const;

export interface ServerEnv {
  readonly appEnv: AppEnv;
  readonly port: number;
  readonly databaseUrl: string | null;
  readonly redisUrl: string | null;
  readonly sentryDsn: string | null;
  readonly sentryTracesSampleRate: number;
  readonly healthProbeTimeoutMs: number;
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
  };
}

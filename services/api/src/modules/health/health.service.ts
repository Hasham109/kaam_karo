/**
 * REL-011 (BP §31.2, §34): health of the API and its dependencies.
 * Contract: contracts/health.yaml v1.0.0.
 */
import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import {
  type DependencyStatus,
  createProducerConnection,
  probeQueueConnection,
  type HealthDependency,
  type HealthReport,
  type ServerEnv,
  probeTcpUrl,
  summarizeHealth,
} from '@kaamkaro/platform';
import { SERVER_ENV } from '../../config/server-env.module';

export type HealthProbe = () => Promise<DependencyStatus>;
export type HealthProbes = Readonly<Record<HealthDependency, HealthProbe>>;

export const HEALTH_PROBES = Symbol('HEALTH_PROBES');

/** Protocol default ports, used only when the URL omits the port. */
const POSTGRES_DEFAULT_PORT = 5432;
const REDIS_DEFAULT_PORT = 6379;

/** Probes plus a close hook for the lazily opened queue connection. */
export type ClosableHealthProbes = HealthProbes & { close?: () => Promise<void> };

export function defaultHealthProbes(env: ServerEnv): ClosableHealthProbes {
  const timeoutMs = env.healthProbeTimeoutMs;
  // T2.2: one shared BullMQ-style Redis connection, opened on the first queue probe only.
  let queueConnection: ReturnType<typeof createProducerConnection> | undefined;
  // QA-T22-05: every concurrent probe waits for the same first connect; the timer is cleared.
  let ready: Promise<void> | undefined;
  return {
    database: () => probeTcpUrl(env.databaseUrl, { defaultPort: POSTGRES_DEFAULT_PORT, timeoutMs }),
    redis: () => probeTcpUrl(env.redisUrl, { defaultPort: REDIS_DEFAULT_PORT, timeoutMs }),
    // T2.2 (REL-011, REL-009): the queue answers PING on the connection type the outbox uses.
    queue: async () => {
      if (env.redisUrl === null) return 'not_configured';
      if (!queueConnection) {
        const connection = createProducerConnection(env.redisUrl);
        queueConnection = connection;
        ready = new Promise<void>((resolve) => {
          const timer = setTimeout(done, timeoutMs);
          function done(): void {
            clearTimeout(timer);
            connection.off('ready', done);
            resolve();
          }
          connection.once('ready', done);
        });
      }
      await ready;
      return probeQueueConnection(queueConnection, timeoutMs);
    },
    close: async () => {
      await queueConnection?.quit().catch(() => undefined);
      queueConnection?.disconnect();
    },
    // TODO(A01 + A08, T3.2): report the S3-compatible bucket once storage is wired.
    storage: () => Promise.resolve('not_configured'),
  };
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private cachedReport: { report: HealthReport; expiresAt: number } | null = null;
  private inFlightCheck: Promise<HealthReport> | null = null;

  constructor(
    @Inject(SERVER_ENV) private readonly env: ServerEnv,
    @Inject(HEALTH_PROBES) private readonly probes: ClosableHealthProbes,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.probes.close?.();
  }

  async check(): Promise<HealthReport> {
    const now = Date.now();
    if (this.cachedReport && now < this.cachedReport.expiresAt) {
      return this.cachedReport.report;
    }
    if (this.inFlightCheck) {
      return this.inFlightCheck;
    }

    this.inFlightCheck = (async () => {
      try {
        const [database, redis, queue, storage] = await Promise.all([
          this.probes.database(),
          this.probes.redis(),
          this.probes.queue(),
          this.probes.storage(),
        ]);
        const report = summarizeHealth(this.env.appEnv, { database, redis, queue, storage });
        // Technical cache TTL: 2000ms (SEC-REVIEW-T2.1 #3; protects dependencies against connection exhaustion)
        this.cachedReport = { report, expiresAt: Date.now() + 2000 };
        return report;
      } finally {
        this.inFlightCheck = null;
      }
    })();

    return this.inFlightCheck;
  }
}

/**
 * REL-011 (BP §31.2, §34): health of the API and its dependencies.
 * Contract: contracts/health.yaml v1.0.0.
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  type DependencyStatus,
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

export function defaultHealthProbes(env: ServerEnv): HealthProbes {
  const timeoutMs = env.healthProbeTimeoutMs;
  return {
    database: () => probeTcpUrl(env.databaseUrl, { defaultPort: POSTGRES_DEFAULT_PORT, timeoutMs }),
    redis: () => probeTcpUrl(env.redisUrl, { defaultPort: REDIS_DEFAULT_PORT, timeoutMs }),
    // TODO(A01, T2.2): report the BullMQ queue once the outbox worker exists.
    queue: () => Promise.resolve('not_configured'),
    // TODO(A01 + A08, T3.2): report the S3-compatible bucket once storage is wired.
    storage: () => Promise.resolve('not_configured'),
  };
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(SERVER_ENV) private readonly env: ServerEnv,
    @Inject(HEALTH_PROBES) private readonly probes: HealthProbes,
  ) {}

  async check(): Promise<HealthReport> {
    const [database, redis, queue, storage] = await Promise.all([
      this.probes.database(),
      this.probes.redis(),
      this.probes.queue(),
      this.probes.storage(),
    ]);
    return summarizeHealth(this.env.appEnv, { database, redis, queue, storage });
  }
}

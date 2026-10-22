/**
 * Health model and probes (T2.1).
 *
 * REL-011 (BP §31.2, §34): `/health` reports database, Redis, queue and storage status.
 * A dependency whose env key is missing reports `not_configured` instead of failing,
 * except in deployed environments where DB and Redis are required (SEC-BASE-011).
 */
import { Socket } from 'node:net';
import { type AppEnv, isDeployedEnv } from '../env';

export type DependencyStatus = 'up' | 'down' | 'not_configured';
export type OverallStatus = 'ok' | 'error';

export const HEALTH_DEPENDENCIES = ['database', 'redis', 'queue', 'storage'] as const;
export type HealthDependency = (typeof HEALTH_DEPENDENCIES)[number];

/** Dependencies that must be configured outside development/test. */
export const REQUIRED_IN_DEPLOYED_ENVS: readonly HealthDependency[] = ['database', 'redis'];

export interface HealthReport {
  readonly status: OverallStatus;
  readonly checks: Readonly<Record<HealthDependency, { readonly status: DependencyStatus }>>;
}

/**
 * Combines dependency results. `error` when any dependency is `down`, or when a required
 * dependency is `not_configured` in staging/production.
 */
export function summarizeHealth(
  appEnv: AppEnv,
  results: Readonly<Record<HealthDependency, DependencyStatus>>,
): HealthReport {
  const deployed = isDeployedEnv(appEnv);
  const failed = HEALTH_DEPENDENCIES.some((dep) => {
    const status = results[dep];
    if (status === 'down') return true;
    return deployed && status === 'not_configured' && REQUIRED_IN_DEPLOYED_ENVS.includes(dep);
  });
  const checks = Object.fromEntries(
    HEALTH_DEPENDENCIES.map((dep) => [dep, { status: results[dep] }]),
  ) as Record<HealthDependency, { status: DependencyStatus }>;
  return { status: failed ? 'error' : 'ok', checks };
}

export interface TcpProbeOptions {
  /** Used when the URL has no explicit port. */
  readonly defaultPort: number;
  /** Network timeout (BP §62.3: no call may hang). */
  readonly timeoutMs: number;
}

/**
 * Reachability probe: opens a TCP connection to the host/port in `url`.
 * `null` URL → `not_configured`; bad URL, refused, or timed out → `down`.
 *
 * TODO(A01, T2.2/T2.3): replace with real checks once the clients exist
 * (Prisma `SELECT 1` for the database, Redis `PING` via the BullMQ connection).
 */
export async function probeTcpUrl(
  url: string | null,
  options: TcpProbeOptions,
): Promise<DependencyStatus> {
  if (url === null) return 'not_configured';
  let host: string;
  let port: number;
  try {
    const parsed = new URL(url);
    host = parsed.hostname.replace(/^\[|\]$/g, '');
    port = parsed.port ? Number(parsed.port) : options.defaultPort;
    if (!host) return 'down';
  } catch {
    return 'down';
  }

  return new Promise<DependencyStatus>((resolve) => {
    const socket = new Socket();
    let settled = false;
    const finish = (status: DependencyStatus): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(status);
    };
    socket.setTimeout(options.timeoutMs);
    socket.once('connect', () => finish('up'));
    socket.once('timeout', () => finish('down'));
    socket.once('error', () => finish('down'));
    socket.connect(port, host);
  });
}

/**
 * Contract test: platform health model (producer, packages/platform) <-> contracts/health.yaml.
 * Owner A16 (QA, T2.1 review). REL-011 (BP §31.2, §34); SEC-BASE-008 (BP §29: the public
 * health response must not be able to carry hostnames, secrets or error details).
 *
 * The API-level test in services/api validates real responses with Ajv. This file guards the
 * other direction: the contract and the shared health model cannot drift apart silently
 * (new dependency, new status value, or an open schema that could leak extra fields).
 */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { CONTRACTS_DIR, type JsonSchema, loadOpenApi } from '../src/index';

// The producer model is loaded from source at run time: `contracts` must not take a package
// dependency on `@kaamkaro/platform` (ownership: A01), and its tsconfig rootDir is `contracts/`.
type DependencyStatus = 'up' | 'down' | 'not_configured';
interface PlatformHealth {
  readonly HEALTH_DEPENDENCIES: readonly string[];
  summarizeHealth(
    appEnv: string,
    results: Readonly<Record<string, DependencyStatus>>,
  ): { status: string; checks: Record<string, { status: string }> };
}
const PLATFORM_SRC = join(CONTRACTS_DIR, '..', 'packages', 'platform', 'src');
let HEALTH_DEPENDENCIES: readonly string[] = [];
let APP_ENVS: readonly string[] = [];
let summarizeHealth: PlatformHealth['summarizeHealth'];

beforeAll(async () => {
  const health = (await import(
    pathToFileURL(join(PLATFORM_SRC, 'health', 'health.ts')).href
  )) as PlatformHealth;
  const env = (await import(pathToFileURL(join(PLATFORM_SRC, 'env.ts')).href)) as {
    APP_ENVS: readonly string[];
  };
  HEALTH_DEPENDENCIES = health.HEALTH_DEPENDENCIES;
  summarizeHealth = health.summarizeHealth.bind(health);
  APP_ENVS = env.APP_ENVS;
});

const doc = loadOpenApi('health');
const schemas = (doc.components?.schemas ?? {}) as Record<string, JsonSchema>;
const report = schemas['HealthReport'] as JsonSchema & {
  properties: {
    status: { enum: string[] };
    checks: { required: string[]; properties: Record<string, unknown> };
  };
};
const dependencyStatusEnum = (schemas['DependencyStatus'] as { enum: string[] }).enum;
const STATUSES: readonly DependencyStatus[] = ['up', 'down', 'not_configured'];

/** Every combination of dependency statuses (3^4 = 81). */
function allCombinations(): Record<string, DependencyStatus>[] {
  let combos: Record<string, DependencyStatus>[] = [{}];
  for (const dep of HEALTH_DEPENDENCIES) {
    combos = combos.flatMap((c) => STATUSES.map((s) => ({ ...c, [dep]: s })));
  }
  return combos;
}

/** Collects every object schema reachable from `node`, following local component refs. */
function objectSchemas(node: unknown, seen = new Set<unknown>()): Record<string, unknown>[] {
  if (typeof node !== 'object' || node === null || seen.has(node)) return [];
  seen.add(node);
  const record = node as Record<string, unknown>;
  const ref = record['$ref'];
  if (typeof ref === 'string') {
    const name = ref.replace('#/components/schemas/', '');
    return objectSchemas(schemas[name], seen);
  }
  const own = record['type'] === 'object' ? [record] : [];
  return [...own, ...Object.values(record).flatMap((child) => objectSchemas(child, seen))];
}

describe('[REL-011] health contract <-> platform health model', () => {
  it('[REL-011] contract lists exactly the dependencies the platform reports', () => {
    expect([...report.properties.checks.required].sort()).toEqual([...HEALTH_DEPENDENCIES].sort());
    expect(Object.keys(report.properties.checks.properties).sort()).toEqual(
      [...HEALTH_DEPENDENCIES].sort(),
    );
  });

  it('[REL-011] every summarizeHealth output in every environment fits the contract', () => {
    const combos = allCombinations();
    expect(combos).toHaveLength(81);
    for (const appEnv of APP_ENVS) {
      for (const results of combos) {
        const out = summarizeHealth(appEnv, results);
        const where = `${appEnv} ${JSON.stringify(results)}`;
        expect(Object.keys(out).sort(), where).toEqual(['checks', 'status']);
        expect(report.properties.status.enum, where).toContain(out.status);
        expect(Object.keys(out.checks).sort(), where).toEqual([...HEALTH_DEPENDENCIES].sort());
        for (const check of Object.values(out.checks)) {
          expect(Object.keys(check), where).toEqual(['status']);
          expect(dependencyStatusEnum, where).toContain(check.status);
        }
      }
    }
  });

  it('[REL-011] a down dependency is always reported as error (maps to the 503 response)', () => {
    for (const appEnv of APP_ENVS) {
      const withDown = allCombinations().filter((r) => Object.values(r).includes('down'));
      expect(withDown).toHaveLength(81 - 16); // 3^4 minus the 2^4 combos without `down`
      for (const results of withDown) {
        expect(summarizeHealth(appEnv, results).status, `${appEnv}`).toBe('error');
      }
    }
    for (const code of ['200', '503']) {
      const media = doc.paths['/health']?.['get']?.responses?.[code]?.content?.['application/json'];
      expect(media?.schema, `response ${code}`).toEqual({
        $ref: '#/components/schemas/HealthReport',
      });
    }
  });

  it('[REL-011][SEC-BASE-008] every object in the public health schema is closed (no extra fields can leak)', () => {
    const objects = objectSchemas(report);
    expect(objects.length).toBeGreaterThanOrEqual(3);
    for (const object of objects) {
      expect(object['additionalProperties'], JSON.stringify(object)).toBe(false);
    }
    const op = doc.paths['/health']?.['get'] as Record<string, unknown> | undefined;
    expect(op?.['security'], 'health must be declared public explicitly').toEqual([]);
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTRACTS_DIR,
  HTTP_METHODS,
  listOpenApiContracts,
  loadOpenApi,
  responseJsonSchema,
} from '../src/index';

// Registry ID pattern from docs/requirements/REQUIREMENTS.md §34.
const REGISTRY = readFileSync(
  join(CONTRACTS_DIR, '..', 'docs', 'requirements', 'REQUIREMENTS.md'),
  'utf8',
);
const KNOWN_IDS = new Set(
  [...REGISTRY.matchAll(/^\| ([A-Z0-9-]+-[0-9]{3}) /gm)]
    .map((m) => m[1] ?? '')
    .filter((id) => !id.startsWith('OQ-')),
);

describe('[PLAT-001] contract folder structure (ARCH §8 rules 7–8)', () => {
  const modules = listOpenApiContracts();

  it('[REL-011] the health contract is published', () => {
    expect(modules).toContain('health');
  });

  it.each(modules)('[PLAT-001] %s.yaml is OpenAPI 3.1 with a semver version', (module) => {
    const doc = loadOpenApi(module);
    expect(doc.openapi).toMatch(/^3\.1\.\d+$/);
    expect(doc.info.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it.each(modules)(
    '[PLAT-001] every operation in %s.yaml has an operationId and known requirement IDs',
    (module) => {
      const doc = loadOpenApi(module);
      for (const [path, item] of Object.entries(doc.paths)) {
        for (const [method, op] of Object.entries(item)) {
          if (!HTTP_METHODS.includes(method)) continue;
          expect(op.operationId, `${method} ${path}`).toBeTruthy();
          const ids = op['x-requirement-ids'] ?? [];
          expect(ids.length, `${method} ${path} x-requirement-ids`).toBeGreaterThan(0);
          for (const id of ids) {
            expect(KNOWN_IDS.has(id), `unknown requirement ID ${id}`).toBe(true);
          }
        }
      }
    },
  );

  it('[REL-011] response schemas resolve to standalone JSON Schema', () => {
    const schema = responseJsonSchema(loadOpenApi('health'), '/health', 'get', '200');
    expect(JSON.stringify(schema)).not.toContain('#/components/');
    expect(schema['$defs']).toHaveProperty('HealthReport');
  });
});

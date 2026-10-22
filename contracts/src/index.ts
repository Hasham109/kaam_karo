/**
 * Contract loader (T2.1, A01). Lets producers and consumers read the published contracts
 * (IMPL §3.4, ARCH §8 rule 7) in tests without copying schemas.
 * TODO(A01, T2.2+): generate TS types from these files (generator listed in that handoff).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

/** Root of the `contracts/` folder (works from `src/` and from compiled `dist/`). */
export const CONTRACTS_DIR = join(__dirname, '..');

export type JsonSchema = Record<string, unknown>;

export interface OpenApiOperation {
  readonly operationId?: string;
  readonly 'x-requirement-ids'?: readonly string[];
  readonly responses?: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
}

export interface OpenApiDocument {
  readonly openapi: string;
  readonly info: { readonly title: string; readonly version: string };
  readonly paths: Record<string, Record<string, OpenApiOperation>>;
  readonly components?: { readonly schemas?: Record<string, JsonSchema> };
}

export const HTTP_METHODS: readonly string[] = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
];

/** Module names that have an OpenAPI contract (`contracts/<module>.yaml`). */
export function listOpenApiContracts(): string[] {
  return readdirSync(CONTRACTS_DIR)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => file.slice(0, -'.yaml'.length))
    .sort();
}

export function loadOpenApi(module: string): OpenApiDocument {
  return parse(readFileSync(join(CONTRACTS_DIR, `${module}.yaml`), 'utf8')) as OpenApiDocument;
}

const COMPONENT_REF = '"#/components/schemas/';
const DEFS_REF = '"#/$defs/';

function rewriteRefs(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value).split(COMPONENT_REF).join(DEFS_REF)) as unknown;
}

/**
 * Returns a standalone JSON Schema (draft 2020-12, as used by OpenAPI 3.1) for one response,
 * with `#/components/schemas/*` references rewritten to `#/$defs/*`.
 */
export function responseJsonSchema(
  doc: OpenApiDocument,
  path: string,
  method: string,
  status: string,
  mediaType = 'application/json',
): JsonSchema {
  const schema = doc.paths[path]?.[method]?.responses?.[status]?.content?.[mediaType]?.schema;
  if (!schema) {
    throw new Error(`No ${mediaType} schema for ${method.toUpperCase()} ${path} ${status}`);
  }
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    ...(rewriteRefs(schema) as JsonSchema),
    $defs: rewriteRefs(doc.components?.schemas ?? {}),
  };
}

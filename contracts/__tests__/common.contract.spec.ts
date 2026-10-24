/**
 * Contract test: platform error envelope + idempotency headers (producer: packages/platform and
 * services/api/src/platform, owner A01) <-> contracts/common.yaml (consumers: every module
 * contract and both apps). Owner A16 (QA, T2.2 review).
 * REL-001, REL-002, REL-006, REL-008 (BP §31.1, §31.2); SEC-BASE-005 (BP §29: no internals leak).
 *
 * The API test in services/api validates a few real responses with Ajv. This file checks the
 * other direction for EVERY platform code: the code table, statuses, retry hints and header
 * patterns in the contract cannot drift from the producer, and no envelope the producer can build
 * falls outside the published schema.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { CONTRACTS_DIR, type JsonSchema, componentJsonSchema, loadOpenApi } from '../src/index';

// Producer loaded from source at run time (no package dependency on @kaamkaro/platform; A01 owns it).
interface ErrorDef {
  readonly status: number;
  readonly retryable: boolean;
  readonly message: string;
}
interface EnvelopeModule {
  PLATFORM_ERRORS: Record<string, ErrorDef>;
  ERROR_CODE_PATTERN: RegExp;
  AppError: {
    new (
      code: string,
      status: number,
      message: string,
      options?: { details?: { field?: string; issue: string }[] },
    ): Error;
    of(code: string): Error;
  };
  toErrorEnvelope(
    error: unknown,
    requestId: string | null,
    frameworkStatus?: number,
  ): { status: number; body: unknown; unexpected: boolean };
}
interface IdempotencyModule {
  IDEMPOTENCY_KEY_PATTERN: RegExp;
  IDEMPOTENCY_HEADER: string;
  IDEMPOTENT_REPLAY_HEADER: string;
}

const ROOT = join(CONTRACTS_DIR, '..');
const PLATFORM_SRC = join(ROOT, 'packages', 'platform', 'src');
let E: EnvelopeModule;
let I: IdempotencyModule;

beforeAll(async () => {
  E = (await import(
    pathToFileURL(join(PLATFORM_SRC, 'errors', 'error-envelope.ts')).href
  )) as EnvelopeModule;
  I = (await import(
    pathToFileURL(join(PLATFORM_SRC, 'idempotency', 'idempotency.ts')).href
  )) as IdempotencyModule;
});

const doc = loadOpenApi('common');
const envelopeSchema = componentJsonSchema(doc, 'ErrorEnvelope');
const components = doc.components as unknown as {
  parameters: Record<string, { name: string; in: string; required: boolean; schema: JsonSchema }>;
};

/** Minimal JSON Schema checker for the keywords used by ErrorEnvelope (closed objects). */
function violations(schema: JsonSchema, value: unknown, path = '$'): string[] {
  const s = schema as Record<string, unknown>;
  if (typeof s['$ref'] === 'string') {
    const name = s['$ref'].split('/').pop() as string;
    const defs = envelopeSchema['$defs'] as Record<string, JsonSchema>;
    return violations(defs[name] as JsonSchema, value, path);
  }
  const out: string[] = [];
  const types = ([] as unknown[]).concat(s['type'] ?? []) as string[];
  const actual =
    value === null ? 'null' : Array.isArray(value) ? 'array' : (typeof value as string);
  if (types.length > 0 && !types.includes(actual)) return [`${path}: ${actual} not ${types}`];
  if (actual === 'object') {
    const obj = value as Record<string, unknown>;
    const props = (s['properties'] ?? {}) as Record<string, JsonSchema>;
    for (const r of (s['required'] ?? []) as string[]) {
      if (!(r in obj)) out.push(`${path}.${r}: missing`);
    }
    for (const [k, v] of Object.entries(obj)) {
      if (props[k]) out.push(...violations(props[k], v, `${path}.${k}`));
      else if (s['additionalProperties'] === false) out.push(`${path}.${k}: not allowed`);
    }
  }
  if (actual === 'string') {
    const str = value as string;
    if (typeof s['pattern'] === 'string' && !new RegExp(s['pattern']).test(str)) {
      out.push(`${path}: pattern`);
    }
    if (typeof s['maxLength'] === 'number' && str.length > s['maxLength']) {
      out.push(`${path}: maxLength`);
    }
  }
  if (actual === 'array') {
    const arr = value as unknown[];
    if (typeof s['maxItems'] === 'number' && arr.length > s['maxItems']) {
      out.push(`${path}: maxItems`);
    }
    if (s['items'])
      arr.forEach((v, i) => out.push(...violations(s['items'] as JsonSchema, v, `${path}[${i}]`)));
  }
  return out;
}

/** "CODE 409" / "CODE 409 (retryable)" entries from the contract description. */
function contractCodeTable(): Map<string, { status: number; retryable: boolean }> {
  const text = (doc as unknown as { info: { description: string } }).info.description;
  const section = text.slice(text.indexOf('Platform error codes:'));
  const table = new Map<string, { status: number; retryable: boolean }>();
  for (const m of section.matchAll(/\b([A-Z][A-Z0-9_]+) (\d{3})( \(retryable\))?/g)) {
    table.set(m[1] as string, { status: Number(m[2]), retryable: m[3] !== undefined });
  }
  return table;
}

describe('[REL-001][SEC-BASE-005] common contract <-> platform error envelope', () => {
  it('[REL-001] the contract lists exactly the platform codes, with the same status and retry hint', () => {
    const table = contractCodeTable();
    const producer = Object.entries(E.PLATFORM_ERRORS).map(([code, d]) => [
      code,
      { status: d.status, retryable: d.retryable },
    ]);
    expect(Object.fromEntries(table)).toEqual(Object.fromEntries(producer));
  });

  it('[REL-001] the envelope for every platform code fits the published schema', () => {
    for (const code of Object.keys(E.PLATFORM_ERRORS)) {
      for (const requestId of ['3f2a1c9e-1b2c-4d5e-8f90-a1b2c3d4e5f6', null]) {
        const { body, status } = E.toErrorEnvelope(E.AppError.of(code), requestId);
        expect(status, code).toBe(E.PLATFORM_ERRORS[code]?.status);
        expect(violations(envelopeSchema, body), code).toEqual([]);
      }
    }
  });

  it('[REL-001] framework statuses 400–599 map to an envelope that fits the schema', () => {
    for (let s = 400; s <= 599; s += 1) {
      const { body } = E.toErrorEnvelope(new Error('framework'), 'req-12345678', s);
      expect(violations(envelopeSchema, body), String(s)).toEqual([]);
    }
  });

  it('[REL-001] oversized module details are cut to the contract limits (maxItems 50, maxLength 200)', () => {
    const details = Array.from({ length: 80 }, (_, i) => ({
      field: `/body/${'f'.repeat(300)}${i}`,
      issue: 'x'.repeat(300),
    }));
    const err = new E.AppError('QUOTE_EXPIRED', 409, 'Quote expired.', { details });
    const { body } = E.toErrorEnvelope(err, null);
    expect(violations(envelopeSchema, body)).toEqual([]);
  });

  it('[SEC-BASE-005] an unexpected error never leaks its message, stack, SQL or hostnames', () => {
    const secret =
      'duplicate key violates "user_account_phone_key" at db.internal:5432 03001234567';
    const err = new Error(secret);
    const { body, status, unexpected } = E.toErrorEnvelope(err, 'req-12345678');
    const text = JSON.stringify(body);
    expect(status).toBe(500);
    expect(unexpected).toBe(true);
    for (const leak of ['duplicate key', 'db.internal', '5432', '03001234567', 'at ', '.ts:']) {
      expect(text, leak).not.toContain(leak);
    }
    expect(violations(envelopeSchema, body)).toEqual([]);
  });
});

describe('[REL-008][REL-006] common contract <-> idempotency headers', () => {
  it('[REL-008] Idempotency-Key parameter: required header with the producer pattern', () => {
    const p = components.parameters['IdempotencyKey'];
    expect(p?.in).toBe('header');
    expect(p?.required).toBe(true);
    expect(p?.name.toLowerCase()).toBe(I.IDEMPOTENCY_HEADER);
    expect((p?.schema as { pattern: string }).pattern).toBe(I.IDEMPOTENCY_KEY_PATTERN.source);
  });

  it('[REL-008] the replay header named in the contract is the one the API sends', () => {
    const text = (doc as unknown as { info: { description: string } }).info.description;
    const named = /original response with `([A-Za-z-]+): true`/.exec(text)?.[1];
    expect(named?.toLowerCase()).toBe(I.IDEMPOTENT_REPLAY_HEADER);
  });

  it('[REL-001] X-Request-Id parameter pattern equals the API middleware filter', () => {
    const p = components.parameters['RequestId'];
    const src = readFileSync(
      join(ROOT, 'services', 'api', 'src', 'platform', 'request-context.middleware.ts'),
      'utf8',
    );
    const literal = /const SAFE_REQUEST_ID = \/(.+)\/;/.exec(src)?.[1];
    expect(p?.name.toLowerCase()).toBe('x-request-id');
    expect((p?.schema as { pattern: string }).pattern).toBe(literal);
  });
});

/**
 * Structural PII masking for append-only tables (T2.2; SEC-REVIEW-T2.2 #5(b), QA-T22-06;
 * SEC-REVIEW-T2.3 #10; BP §26, §29; DATA-003, DATA-004).
 *
 * Rows in these tables can never be edited or anonymised, so the masker runs on EVERY create
 * through the shared PrismaService (a Prisma query extension), not only through the platform
 * writers. Module code (A04 job_event, A09 refund/ledger) cannot skip it.
 */
import { maskPii, maskReason } from '@kaamkaro/platform';

export interface MaskedColumns {
  /** Database table (matches prisma/tools/append-only.ts). */
  readonly table: string;
  /** Free-text columns → maskReason (phones, emails, CNIC, IPs, secrets; bounded). */
  readonly text: readonly string[];
  /** JSON columns → maskPii (deny-list keys + free text). */
  readonly json: readonly string[];
}

/** Prisma model name → masked columns. */
export const APPEND_ONLY_MASKING: Readonly<Record<string, MaskedColumns>> = {
  auditLog: { table: 'audit_log', text: ['reason'], json: ['before', 'after', 'sourceMetadata'] },
  marketplaceEvent: { table: 'marketplace_event', text: [], json: ['sourceMetadata'] },
  jobEvent: { table: 'job_event', text: ['reason'], json: ['sourceMetadata'] },
  providerLedgerEntry: { table: 'provider_ledger_entry', text: ['reason'], json: [] },
  refund: { table: 'refund', text: ['reason'], json: [] },
  // Not append-only, but its payload is copied to Redis and every consumer (REL-009).
  outboxEvent: { table: 'outbox_event', text: [], json: ['payload'] },
};

/**
 * Append-only tables with nothing to mask, and why. A unit test checks that every table in
 * APPEND_ONLY_TABLES is either masked above or listed here.
 */
export const MASKING_EXEMPT_TABLES: Readonly<Record<string, string>> = {
  payment: 'IDs, refs, enums and amounts only; no free-text or JSON column',
  payment_method_record: 'IDs and the CASH/DIGITAL enum only',
  config_rule: 'business configuration values (CFG-RULE-001…012), never personal data',
};

const CREATE_OPERATIONS = ['create', 'createMany', 'createManyAndReturn', 'upsert'] as const;

function isPlainJson(value: unknown): boolean {
  if (typeof value === 'string') return true;
  if (Array.isArray(value)) return true;
  // Prisma.DbNull / JsonNull are class instances: leave them untouched.
  return (
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

function maskRow(row: unknown, columns: MaskedColumns): unknown {
  if (typeof row !== 'object' || row === null) return row;
  const out: Record<string, unknown> = { ...(row as Record<string, unknown>) };
  for (const col of columns.text) {
    const v = out[col];
    if (typeof v === 'string') out[col] = maskReason(v);
  }
  for (const col of columns.json) {
    const v = out[col];
    if (v !== undefined && v !== null && isPlainJson(v)) out[col] = maskPii(v);
  }
  return out;
}

/** Pure transform of the query args (exported for unit tests). */
export function maskCreateArgs(
  model: string | undefined,
  operation: string,
  args: unknown,
): unknown {
  // Prisma passes the schema model name (`AuditLog`); the map uses delegate names (`auditLog`).
  const delegate = model ? model.charAt(0).toLowerCase() + model.slice(1) : undefined;
  const columns = delegate ? APPEND_ONLY_MASKING[delegate] : undefined;
  if (!columns || !(CREATE_OPERATIONS as readonly string[]).includes(operation)) return args;
  if (typeof args !== 'object' || args === null) return args;
  const a = { ...(args as Record<string, unknown>) };
  if (operation === 'upsert') {
    a['create'] = maskRow(a['create'], columns);
    return a;
  }
  const data = a['data'];
  a['data'] = Array.isArray(data) ? data.map((r) => maskRow(r, columns)) : maskRow(data, columns);
  return a;
}

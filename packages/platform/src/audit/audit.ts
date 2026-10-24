/**
 * Append-only audit + marketplace-event row builders (T2.2; M18 Audit & Events, ARCH §4).
 *
 * - DATA-004, SEC-BASE-010 (BP §26, §29): important admin and financial actions write an
 *   audit_log row: actor, action, object, before/after, reason, source metadata. Rows are never
 *   updated or deleted — the DB role has no UPDATE/DELETE and triggers refuse it (T2.3).
 * - DATA-002 (BP §15, §66): state changes outside the booking write a marketplace_event row.
 * - SEC-REVIEW-T2.3 #10 (BP §26, §29; DATA-003): every row passes the mandatory PII masker
 *   BEFORE it is written; there is no way to skip it — the API writers only accept rows built here.
 * - ROLE-003 (BP §8.3, §11): every admin write carries a reason.
 */
import { type MaskedJson, maskAndBound, maskFreeText, maskPii, truncateIp } from '../pii/mask';

/** Same names as the Prisma enum `ActorRole` (BP §15.1, §66). */
export const ACTOR_ROLES = ['CUSTOMER', 'PROVIDER', 'ADMIN', 'SYSTEM'] as const;
export type ActorRoleName = (typeof ACTOR_ROLES)[number];

export interface AuditActor {
  /** null only for SYSTEM jobs. */
  readonly userId: string | null;
  readonly role: ActorRoleName;
  /** Admin sub-roles at the time (Prisma enum `AdminSubRole` values). */
  readonly subRoles?: readonly string[];
}

/**
 * Request/device facts. The IP is always truncated; nothing else is copied implicitly.
 * `requestId` must be the SERVER-generated request ID (SEC-REVIEW-T2.2 #12); a client-sent trace
 * ID may only be passed as `clientRequestId`, which is stored masked and bounded as a hint.
 */
export interface AuditSource {
  readonly requestId?: string | null;
  readonly clientRequestId?: string | null;
  readonly ip?: string | null;
  readonly userAgent?: string | null;
  /** e.g. `customer-app`, `partner-app`, `admin-portal`, `worker`. */
  readonly client?: string | null;
  readonly [extra: string]: unknown;
}

export interface AuditEntry {
  readonly actor: AuditActor;
  /** UPPER_SNAKE action code, e.g. CONFIG_RULE_CHANGED, READ_PAYMENT_SCREENSHOT. */
  readonly action: string;
  readonly object: { readonly type: string; readonly id?: string | null };
  readonly before?: unknown;
  readonly after?: unknown;
  readonly reason?: string | null;
  readonly source?: AuditSource | null;
}

/** Column values for audit_log (after masking). */
export interface AuditRow {
  readonly actorUserId: string | null;
  readonly actorRole: ActorRoleName;
  readonly actorSubRoles: readonly string[];
  readonly action: string;
  readonly objectType: string;
  readonly objectId: string | null;
  readonly before: MaskedJson | null;
  readonly after: MaskedJson | null;
  readonly reason: string | null;
  readonly sourceMetadata: MaskedJson | null;
}

export interface MarketplaceEventEntry {
  readonly actor: AuditActor;
  readonly action: string;
  readonly object: { readonly type: string; readonly id: string };
  readonly previousState?: string | null;
  readonly newState?: string | null;
  readonly source?: AuditSource | null;
}

export interface MarketplaceEventRow {
  readonly actorUserId: string | null;
  readonly actorRole: ActorRoleName;
  readonly action: string;
  readonly objectType: string;
  readonly objectId: string;
  readonly previousState: string | null;
  readonly newState: string | null;
  readonly sourceMetadata: MaskedJson | null;
}

export class AuditValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditValidationError';
  }
}

export const ACTION_PATTERN = /^[A-Z][A-Z0-9_]*$/;
export const OBJECT_TYPE_PATTERN = /^[a-z][a-z0-9_]*$/;
export const STATE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
/** Bounded free text (technical limit against log flooding). */
const MAX_REASON_LENGTH = 2000;
const MAX_USER_AGENT_LENGTH = 256;
const MAX_CLIENT_REQUEST_ID_LENGTH = 64;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Non-row object keys, e.g. a config key `commission.rate` or a short code (no personal data). */
const OBJECT_KEY_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;

/**
 * SEC-REVIEW-T2.2 #5(a): object / aggregate IDs are stored unmasked in append-only rows, so only
 * UUIDs or short lower-case keys are accepted, and nothing the masker would change (a phone
 * number written as an "ID" is refused).
 */
export function isSafeObjectId(id: string): boolean {
  if (UUID_PATTERN.test(id)) return true;
  if (!OBJECT_KEY_PATTERN.test(id)) return false;
  const masked = maskFreeText(id);
  if (masked === id) return true;
  // Emails, CNICs, IBANs, secrets and IPs are never IDs.
  if (/\[(?:EMAIL|CNIC|IBAN|SECRET|IP|REDACTED)\]|\/(?:24|48)\b/.test(masked)) return false;
  // A long digit run is refused only when it is phone-shaped (+, 0 or 92 prefix), so random
  // numeric parts of keys (e.g. `20394857-12`) stay valid (QA probe IDs; SEC-REVIEW-T2.2 #5a).
  for (const run of id.match(/\d(?:[._:-]?\d){9,}/g) ?? []) {
    const digits = run.replace(/\D/g, '');
    if (digits.startsWith('0') || digits.startsWith('92')) return false;
  }
  return true;
}

function checkActor(actor: AuditActor): void {
  if (!(ACTOR_ROLES as readonly string[]).includes(actor.role)) {
    throw new AuditValidationError(`Unknown actor role "${actor.role}"`);
  }
  if (actor.role !== 'SYSTEM' && !actor.userId) {
    throw new AuditValidationError('Only SYSTEM actions may have no actor user');
  }
}

function checkCodes(action: string, objectType: string, objectId?: string | null): void {
  if (!ACTION_PATTERN.test(action)) throw new AuditValidationError(`Invalid action "${action}"`);
  if (!OBJECT_TYPE_PATTERN.test(objectType)) {
    throw new AuditValidationError(`Invalid object type "${objectType}"`);
  }
  if (objectId !== undefined && objectId !== null && !isSafeObjectId(objectId)) {
    throw new AuditValidationError('Object ID must be a UUID or a short lower-case key');
  }
}

/** Masked source metadata: IP truncated, user agent bounded, extras deep-masked. */
export function maskSource(source: AuditSource | null | undefined): MaskedJson | null {
  if (!source) return null;
  const { ip, userAgent, requestId, clientRequestId, ...rest } = source;
  const out = maskPii(rest) as { [key: string]: MaskedJson };
  if (ip) out['ip'] = truncateIp(ip);
  if (userAgent) out['userAgent'] = maskAndBound(userAgent, MAX_USER_AGENT_LENGTH);
  if (requestId) {
    if (!UUID_PATTERN.test(requestId)) {
      throw new AuditValidationError('source.requestId must be the server-generated UUID');
    }
    out['requestId'] = requestId;
  }
  if (clientRequestId) {
    out['clientRequestId'] = maskAndBound(clientRequestId, MAX_CLIENT_REQUEST_ID_LENGTH);
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Mask a free-text reason (phones, emails, CNIC, IPs, secrets), THEN bound its length (QA-T22-04). */
export function maskReason(reason: string | null | undefined): string | null {
  const trimmed = reason?.trim();
  if (!trimmed) return null;
  return maskAndBound(trimmed, MAX_REASON_LENGTH);
}

export function buildAuditRow(entry: AuditEntry): AuditRow {
  checkActor(entry.actor);
  checkCodes(entry.action, entry.object.type, entry.object.id);
  const reason = maskReason(entry.reason);
  // ROLE-003 (BP §8.3, §11): admin writes need a reason.
  if (entry.actor.role === 'ADMIN' && reason === null) {
    throw new AuditValidationError('Admin actions require a reason (ROLE-003)');
  }
  return {
    actorUserId: entry.actor.userId,
    actorRole: entry.actor.role,
    actorSubRoles: [...(entry.actor.subRoles ?? [])],
    action: entry.action,
    objectType: entry.object.type,
    objectId: entry.object.id ?? null,
    before: entry.before === undefined ? null : maskPii(entry.before),
    after: entry.after === undefined ? null : maskPii(entry.after),
    reason,
    sourceMetadata: maskSource(entry.source),
  };
}

export function buildMarketplaceEventRow(entry: MarketplaceEventEntry): MarketplaceEventRow {
  checkActor(entry.actor);
  if (!entry.object.id) throw new AuditValidationError('Marketplace events need an object ID');
  checkCodes(entry.action, entry.object.type, entry.object.id);
  for (const state of [entry.previousState, entry.newState]) {
    if (state !== null && state !== undefined && !STATE_PATTERN.test(state)) {
      throw new AuditValidationError(`Invalid state "${state}"`);
    }
  }
  return {
    actorUserId: entry.actor.userId,
    actorRole: entry.actor.role,
    action: entry.action,
    objectType: entry.object.type,
    objectId: entry.object.id,
    previousState: entry.previousState ?? null,
    newState: entry.newState ?? null,
    sourceMetadata: maskSource(entry.source),
  };
}

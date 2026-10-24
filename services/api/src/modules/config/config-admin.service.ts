/**
 * Writes and lists ConfigRule versions (T2.6, owner A03) for the admin config editors
 * A13/A20–A24 (contracts/config.yaml). The server is the source of truth: every rule below is
 * checked here, whatever the client sends (BP §29; golden rule 4).
 * - CFG-RULE-001…012 (BP §42, §64): only registered keys, allowed scopes, values that pass the
 *   registry check (closed schemas, bounded integers).
 * - SEC-REVIEW-T2.6 #4 (ADMIN-ROLE-001…008, SEC-AUTH-005): the actor's sub-roles are looked up on
 *   the server (StaffRoleLookup, A02); writes AND reads are limited to the key's edit group.
 * - SEC-REVIEW-T2.6 #1: a fail-closed key can never be set to null.
 * - OQ-078 default: owner-decided keys are read-only (403). OQ-076 default: TWO_PERSON keys need
 *   the approval flow (409).
 * - BP §26; SEC-REVIEW-T2.3 #8, T2.6 #9: append-only; effective_from never in the past and never
 *   later than `config.max_schedule_ahead_hours` (null → no scheduling at all).
 * - SEC-BASE-010, ROLE-003 (BP §11, §26): actor and reason required; the audit row is written in
 *   the same transaction; sensitive values are fingerprinted (SEC-REVIEW-T2.6 #6); the reader
 *   cache is invalidated after commit (RQ-006 item 3).
 * - SEC-REVIEW-T2.6 #11: malformed IDs → 422, concurrent writes → 409 (never 500).
 */
import { createHash } from 'node:crypto';
import {
  CONFIG_KEY_PATTERN,
  type ConfigRuleVersion,
  type ConfigScope,
  type ConfigService,
  configParsers,
  type JsonValue,
  resolveConfig,
} from '@kaamkaro/platform';
import { isUniqueViolation, isUuid, type StaffRoleLookup } from '../catalog';
import {
  CONFIG_KEYS,
  canAccessKey,
  type ConfigKeyDefinition,
  configKeyDefinition,
  isValidValueFor,
  UNIT_CEILINGS,
} from './config-keys';
import type { ConfigRuleStore } from './config-rule.store';

export type ConfigWriteErrorCode =
  | 'UNKNOWN_CONFIG_KEY'
  | 'FORBIDDEN_FOR_SUB_ROLE'
  | 'SCOPE_NOT_ALLOWED'
  | 'SCOPE_REF_INVALID'
  | 'OWNER_DECIDED_READ_ONLY'
  | 'APPROVAL_FLOW_REQUIRED'
  | 'VALUE_REQUIRED'
  | 'INVALID_VALUE'
  | 'BACKDATED_EFFECTIVE_FROM'
  | 'SCHEDULE_NOT_ALLOWED'
  | 'CONCURRENT_WRITE'
  | 'REASON_REQUIRED'
  | 'ACTOR_REQUIRED';

/** HTTP status per code (contracts/config.yaml). */
export const CONFIG_WRITE_HTTP_STATUS: Readonly<Record<ConfigWriteErrorCode, number>> = {
  UNKNOWN_CONFIG_KEY: 404, // kk-allow-literal: technical — HTTP status
  FORBIDDEN_FOR_SUB_ROLE: 403, // kk-allow-literal: technical — HTTP status
  SCOPE_NOT_ALLOWED: 422, // kk-allow-literal: technical — HTTP status
  SCOPE_REF_INVALID: 422, // kk-allow-literal: technical — HTTP status
  OWNER_DECIDED_READ_ONLY: 403, // kk-allow-literal: technical — HTTP status
  APPROVAL_FLOW_REQUIRED: 409, // kk-allow-literal: technical — HTTP status
  VALUE_REQUIRED: 422, // kk-allow-literal: technical — HTTP status
  INVALID_VALUE: 422, // kk-allow-literal: technical — HTTP status
  BACKDATED_EFFECTIVE_FROM: 422, // kk-allow-literal: technical — HTTP status
  SCHEDULE_NOT_ALLOWED: 422, // kk-allow-literal: technical — HTTP status
  CONCURRENT_WRITE: 409, // kk-allow-literal: technical — HTTP status (retryable)
  REASON_REQUIRED: 422, // kk-allow-literal: technical — HTTP status
  ACTOR_REQUIRED: 401, // kk-allow-literal: technical — HTTP status
};

export class ConfigWriteError extends Error {
  readonly httpStatus: number;
  readonly code: ConfigWriteErrorCode;
  constructor(code: ConfigWriteErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ConfigWriteError';
    this.httpStatus = CONFIG_WRITE_HTTP_STATUS[code];
  }
}

/** Checks that a CITY/CATEGORY/SERVICE scope ID exists (implemented by the catalog module). */
export interface ScopeRefCheck {
  exists(scope: Exclude<ConfigScope, 'GLOBAL'>, id: string): Promise<boolean>;
}
export const CONFIG_SCOPE_REF_CHECK = Symbol.for('kaamkaro.config.ScopeRefCheck');

/**
 * `actorUserId` is the authenticated staff user from the server session (A02 guard, T2.4),
 * never a request-body field. Sub-roles are NOT part of the command: they are looked up.
 */
export interface SetConfigRuleCommand {
  readonly key: string;
  readonly scope: ConfigScope;
  readonly scopeRefId: string | null;
  readonly value: JsonValue | null;
  /** Default: now. Never earlier than now; later only within config.max_schedule_ahead_hours. */
  readonly effectiveFrom?: Date;
  readonly actorUserId: string;
  readonly reason: string;
}

export interface ConfigKeyView {
  readonly definition: ConfigKeyDefinition;
  readonly readOnly: boolean;
  /** Current GLOBAL value (null = TODO(OWNER) or no row); fingerprinted for FINGERPRINT keys. */
  readonly value: JsonValue | null;
  /** Versions in any scope that are not effective yet (SEC-REVIEW-T2.6 #9). */
  readonly pendingVersions: readonly ConfigRuleVersion[];
}

const SCHEDULE_KEY = 'config.max_schedule_ahead_hours';
const MS_PER_HOUR = 3_600_000; // kk-allow-literal: technical — unit conversion

/**
 * Fingerprint for audit and list views of sensitive values (SEC-REVIEW-T2.6 #6, OQ-076):
 * SHA-256 of the JSON value, written as hex with the digits 0–9 replaced by the letters g–p
 * (`sha256x:`). The digit-free form cannot be mistaken for a phone number by the platform
 * masker, which would otherwise corrupt about one hash in five (RQ-011 asks A01 for an explicit
 * allow rule). To verify: sha256 hex of the value, then map 0→g … 9→p.
 */
export function fingerprintValue(value: JsonValue): { fingerprint: string; last4: string | null } {
  const text = JSON.stringify(value);
  const digitRuns = text.match(/\d+/g) ?? [];
  const longest = digitRuns.reduce((a, b) => (b.length > a.length ? b : a), '');
  const hex = createHash('sha256').update(text).digest('hex');
  const digitFree = hex.replace(/[0-9]/g, (d) =>
    String.fromCharCode('g'.charCodeAt(0) + Number(d)),
  );
  return {
    fingerprint: `sha256x:${digitFree}`,
    last4: longest.length >= 4 ? longest.slice(-4) : null, // kk-allow-literal: technical — last 4 digits
  };
}

/** Value as it may appear in audit rows and admin lists. */
export function presentableValue(
  def: ConfigKeyDefinition,
  value: JsonValue | null,
): JsonValue | null {
  if (value === null || def.auditFormat !== 'FINGERPRINT') return value;
  return fingerprintValue(value);
}

export class ConfigAdminService {
  private readonly store: ConfigRuleStore;
  private readonly reader: Pick<ConfigService, 'invalidate' | 'inspect'>;
  private readonly scopeRefs: ScopeRefCheck;
  private readonly staff: StaffRoleLookup;
  private readonly now: () => Date;

  constructor(
    store: ConfigRuleStore,
    reader: Pick<ConfigService, 'invalidate' | 'inspect'>,
    scopeRefs: ScopeRefCheck,
    staff: StaffRoleLookup,
    now: () => Date = () => new Date(),
  ) {
    this.store = store;
    this.reader = reader;
    this.scopeRefs = scopeRefs;
    this.staff = staff;
    this.now = now;
  }

  async setRule(cmd: SetConfigRuleCommand): Promise<ConfigRuleVersion> {
    if (!cmd.actorUserId) throw new ConfigWriteError('ACTOR_REQUIRED', 'Actor is required');
    if (!cmd.reason || cmd.reason.trim().length === 0) {
      throw new ConfigWriteError('REASON_REQUIRED', 'A reason is required for every config change');
    }
    const def = this.definition(cmd.key);
    const subRoles = await this.staff.subRolesOf(cmd.actorUserId);
    if (!canAccessKey(def, subRoles)) {
      throw new ConfigWriteError('FORBIDDEN_FOR_SUB_ROLE', `Not allowed to change ${cmd.key}`);
    }
    if (def.decidedBy) {
      throw new ConfigWriteError(
        'OWNER_DECIDED_READ_ONLY',
        `${cmd.key} is fixed by owner decision ${def.decidedBy} (OQ-078)`,
      );
    }
    if (def.approval === 'TWO_PERSON') {
      throw new ConfigWriteError(
        'APPROVAL_FLOW_REQUIRED',
        `${cmd.key} needs the two-person approval flow (OQ-076)`,
      );
    }
    if (!def.scopes.includes(cmd.scope)) {
      throw new ConfigWriteError('SCOPE_NOT_ALLOWED', `${cmd.key} cannot be set at ${cmd.scope}`);
    }
    await this.checkScopeRef(cmd.scope, cmd.scopeRefId);
    if (cmd.value === null && def.failClosed) {
      throw new ConfigWriteError(
        'VALUE_REQUIRED',
        `${cmd.key} is a security limit and cannot be unset`,
      );
    }
    if (cmd.value !== null && !isValidValueFor(def, cmd.value)) {
      throw new ConfigWriteError(
        'INVALID_VALUE',
        `Value is not valid for ${cmd.key} (${def.kind})`,
      );
    }
    const now = this.now();
    const effectiveFrom = cmd.effectiveFrom ?? now;
    if (effectiveFrom.getTime() < now.getTime()) {
      throw new ConfigWriteError(
        'BACKDATED_EFFECTIVE_FROM',
        'effective_from cannot be in the past',
      );
    }
    if (effectiveFrom.getTime() > now.getTime()) await this.checkSchedule(effectiveFrom, now);

    const before = await this.currentValue(cmd.key, cmd.scope, cmd.scopeRefId, now);
    let stored: ConfigRuleVersion;
    try {
      stored = await this.store.append(
        {
          key: cmd.key,
          scope: cmd.scope,
          scopeRefId: cmd.scopeRefId,
          value: cmd.value,
          effectiveFrom,
          changedByUserId: cmd.actorUserId,
        },
        {
          actorUserId: cmd.actorUserId,
          actorSubRoles: subRoles,
          action: 'CONFIG_RULE_SET',
          objectType: 'config_rule',
          objectId: null,
          before: {
            key: cmd.key,
            scope: cmd.scope,
            scopeRefId: cmd.scopeRefId,
            value: presentableValue(def, before),
          },
          after: {
            key: cmd.key,
            scope: cmd.scope,
            scopeRefId: cmd.scopeRefId,
            value: presentableValue(def, cmd.value),
            effectiveFrom: effectiveFrom.toISOString(),
          },
          reason: cmd.reason.trim(),
        },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConfigWriteError(
          'CONCURRENT_WRITE',
          'Another change was saved at the same time; retry',
        );
      }
      throw error;
    }
    this.reader.invalidate(cmd.key);
    return stored;
  }

  /** Keys this staff user may see, with current GLOBAL value and pending versions. */
  async listKeys(actorUserId: string): Promise<readonly ConfigKeyView[]> {
    const subRoles = await this.staff.subRolesOf(actorUserId);
    const now = this.now();
    const views: ConfigKeyView[] = [];
    for (const def of CONFIG_KEYS.filter((d) => canAccessKey(d, subRoles))) {
      const versions = await this.store.listVersions(def.key);
      const global = resolveConfig(def.key, versions, (v) => v, {}, now);
      views.push({
        definition: def,
        readOnly: def.decidedBy !== undefined || def.approval === 'TWO_PERSON',
        value: presentableValue(def, global.status === 'configured' ? global.value : null),
        pendingVersions: versions
          .filter((v) => v.effectiveFrom.getTime() > now.getTime())
          .map((v) => ({ ...v, value: presentableValue(def, v.value) })),
      });
    }
    return views;
  }

  /** Change history of a key (A13/A20 "History"), newest first; same access rule as writes. */
  async history(key: string, actorUserId: string): Promise<readonly ConfigRuleVersion[]> {
    const def = this.definition(key);
    if (!canAccessKey(def, await this.staff.subRolesOf(actorUserId))) {
      throw new ConfigWriteError('FORBIDDEN_FOR_SUB_ROLE', `Not allowed to read ${key}`);
    }
    const versions = await this.store.listVersions(key);
    return [...versions]
      .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())
      .map((v) => ({ ...v, value: presentableValue(def, v.value) }));
  }

  private definition(key: string): ConfigKeyDefinition {
    const def = CONFIG_KEY_PATTERN.test(key) ? configKeyDefinition(key) : undefined;
    if (!def) throw new ConfigWriteError('UNKNOWN_CONFIG_KEY', `Unknown config key ${key}`);
    return def;
  }

  private async checkScopeRef(scope: ConfigScope, ref: string | null): Promise<void> {
    if (scope === 'GLOBAL') {
      if (ref !== null) throw new ConfigWriteError('SCOPE_REF_INVALID', 'GLOBAL takes no scope ID');
      return;
    }
    if (!isUuid(ref) || !(await this.scopeRefs.exists(scope, ref))) {
      throw new ConfigWriteError('SCOPE_REF_INVALID', `${scope} ${String(ref)} does not exist`);
    }
  }

  /** SEC-REVIEW-T2.6 #9: scheduling only within the owner-set horizon; while null, not at all. */
  private async checkSchedule(effectiveFrom: Date, now: Date): Promise<void> {
    const horizon = await this.reader.inspect(SCHEDULE_KEY, configParsers.positiveInteger);
    const maxHours =
      horizon.status === 'configured' ? Math.min(horizon.value, UNIT_CEILINGS.hours) : null;
    if (maxHours === null || effectiveFrom.getTime() - now.getTime() > maxHours * MS_PER_HOUR) {
      throw new ConfigWriteError(
        'SCHEDULE_NOT_ALLOWED',
        maxHours === null
          ? `Scheduled changes are off until ${SCHEDULE_KEY} is set (OQ-088)`
          : `effective_from is more than ${maxHours} hours ahead`,
      );
    }
  }

  /** Value currently effective at exactly this scope (for the audit "before"). */
  private async currentValue(
    key: string,
    scope: ConfigScope,
    ref: string | null,
    at: Date,
  ): Promise<JsonValue | null> {
    const versions = (await this.store.listVersions(key)).filter(
      (v) => v.scope === scope && v.scopeRefId === ref,
    );
    const context =
      scope === 'SERVICE'
        ? { serviceId: ref }
        : scope === 'CATEGORY'
          ? { categoryId: ref }
          : scope === 'CITY'
            ? { cityId: ref }
            : {};
    const result = resolveConfig(key, versions, (v) => v, context, at);
    return result.status === 'configured' ? result.value : null;
  }
}

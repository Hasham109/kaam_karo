/**
 * T2.6 ConfigRule store + admin writes (CFG-RULE-001…012; BP §26, §42, §64; ARCH §5.3, §19;
 * SEC-BASE-010; SEC-REVIEW-T2.3 #8; SEC-REVIEW-T2.6 #1, #4, #5, #6, #9, #11; QA-T2.6-02).
 * Uses an in-memory store that behaves like config_rule (append-only, no back-dating); the
 * DB-level behaviour is covered by prisma/seed/__tests__/seed.db-spec.ts.
 */
import {
  CachedConfigService,
  type ConfigRuleVersion,
  configParsers,
  type JsonValue,
  maskPii,
} from '@kaamkaro/platform';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AdminSubRoleName, StaffRoleLookup } from '../catalog';
import {
  ConfigAdminService,
  ConfigWriteError,
  presentableValue,
  type SetConfigRuleCommand,
} from './config-admin.service';
import { CONFIG_KEYS, FAIL_CLOSED_KEYS, isValidValueFor, UNIT_CEILINGS } from './config-keys';
import { assertFailClosedKeysSet, missingFailClosedKeys } from './config-readiness';
import type { AuditEntryInput, ConfigRuleStore, NewConfigRuleVersion } from './config-rule.store';

const CITY_LHR = '00000000-0000-4000-8000-0000000c0001';
const CITY_OTHER = '00000000-0000-4000-8000-0000000c0002';
const SUPER = '00000000-0000-4000-8000-00000000a001';
const FINANCE = '00000000-0000-4000-8000-00000000a002';
const SUPPORT = '00000000-0000-4000-8000-00000000a003';
const ANALYST = '00000000-0000-4000-8000-00000000a004';
const T0 = new Date('2026-11-01T10:00:00.000Z');
const HOUR = 3_600_000;

class MemoryStore implements ConfigRuleStore {
  readonly rows: ConfigRuleVersion[] = [];
  readonly audits: AuditEntryInput[] = [];
  private seq = 0;
  failNextWith: unknown = null;
  private readonly clock: () => Date;
  constructor(clock: () => Date) {
    this.clock = clock;
  }

  seed(key: string, value: JsonValue | null, effectiveFrom = new Date(T0.getTime() - HOUR)): void {
    this.rows.push({
      id: `seed-${key}`,
      key,
      scope: 'GLOBAL',
      scopeRefId: null,
      value,
      effectiveFrom,
    });
  }

  listVersions(key: string): Promise<readonly ConfigRuleVersion[]> {
    return Promise.resolve(this.rows.filter((r) => r.key === key));
  }

  append(v: NewConfigRuleVersion, audit: AuditEntryInput): Promise<ConfigRuleVersion> {
    if (this.failNextWith) return Promise.reject(this.failNextWith);
    // Mirrors the DB CHECK config_rule_not_backdated.
    if (v.effectiveFrom.getTime() < this.clock().getTime()) {
      return Promise.reject(new Error('config_rule_not_backdated'));
    }
    const row: ConfigRuleVersion = {
      id: `row-${++this.seq}`,
      key: v.key,
      scope: v.scope,
      scopeRefId: v.scopeRefId,
      value: v.value,
      effectiveFrom: v.effectiveFrom,
    };
    this.rows.push(row);
    this.audits.push({ ...audit, objectId: row.id });
    return Promise.resolve(row);
  }
}

/** Server-side sub-roles (A02 lookup stand-in). The caller can never add roles. */
const ROLES: Record<string, readonly AdminSubRoleName[]> = {
  [SUPER]: ['SUPER_ADMIN'],
  [FINANCE]: ['FINANCE'],
  [SUPPORT]: ['SUPPORT'],
  [ANALYST]: ['ANALYST'],
};
const staff: StaffRoleLookup = { subRolesOf: (id) => Promise.resolve(ROLES[id] ?? []) };

let now: Date;
let store: MemoryStore;
let reader: CachedConfigService;
let admin: ConfigAdminService;
const knownRefs = new Set([CITY_LHR, CITY_OTHER]);

beforeEach(() => {
  now = T0;
  store = new MemoryStore(() => now);
  // Long TTL on purpose: only invalidate() can make a new value visible immediately.
  reader = new CachedConfigService(store, { cacheTtlMs: HOUR, now: () => now });
  admin = new ConfigAdminService(
    store,
    reader,
    { exists: (_scope, id) => Promise.resolve(knownRefs.has(id)) },
    staff,
    () => now,
  );
});

const base = { actorUserId: SUPER, reason: 'test change' } as const;
const set = (cmd: Partial<SetConfigRuleCommand> & Pick<SetConfigRuleCommand, 'key' | 'value'>) =>
  admin.setRule({ scope: 'GLOBAL', scopeRefId: null, ...base, ...cmd });
const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => 'OK',
    (e: unknown) => (e instanceof ConfigWriteError ? e.code : String(e)),
  );

describe('ConfigRule get by scope and effective date', () => {
  it('[CFG-RULE-006] a CITY row overrides GLOBAL only for that city', async () => {
    store.seed('availability.max_service_radius_m', null);
    await set({
      key: 'availability.max_service_radius_m',
      scope: 'CITY',
      scopeRefId: CITY_LHR,
      value: 5000,
    });
    const parse = configParsers.integer;
    const lhr = await reader.get('availability.max_service_radius_m', parse, { cityId: CITY_LHR });
    expect(lhr).toMatchObject({ status: 'configured', value: 5000, scope: 'CITY' });
    const other = await reader.get('availability.max_service_radius_m', parse, {
      cityId: CITY_OTHER,
    });
    expect(other).toMatchObject({
      status: 'not_configured',
      reason: 'VALUE_NULL',
      scope: 'GLOBAL',
    });
  });

  it('[CFG-RULE-004] a future version takes effect at effective_from, within the schedule horizon', async () => {
    store.seed('config.max_schedule_ahead_hours', 24);
    store.seed('booking.cancellation_window_minutes', null);
    const from = new Date(T0.getTime() + 2 * HOUR);
    await set({ key: 'booking.cancellation_window_minutes', value: 30, effectiveFrom: from });
    const parse = configParsers.integer;
    const before = await reader.get('booking.cancellation_window_minutes', parse, {
      at: new Date(from.getTime() - 1),
    });
    expect(before.status).toBe('not_configured');
    const after = await reader.get('booking.cancellation_window_minutes', parse, { at: from });
    expect(after).toMatchObject({ status: 'configured', value: 30 });
    const [view] = (await admin.listKeys(SUPER)).filter(
      (v) => v.definition.key === 'booking.cancellation_window_minutes',
    );
    expect(view?.pendingVersions.map((p) => p.value)).toEqual([30]);
  });

  it('[CFG-RULE-003] a change is a new version; history keeps every version (append-only, BP §26)', async () => {
    store.seed('price.max_total_minor', null);
    await set({ key: 'price.max_total_minor', value: 100 });
    now = new Date(T0.getTime() + HOUR);
    await set({ key: 'price.max_total_minor', value: 200 });
    const history = await admin.history('price.max_total_minor', SUPER);
    expect(history.map((h) => h.value)).toEqual([200, 100, null]);
    const current = await reader.get('price.max_total_minor', configParsers.integer);
    expect(current).toMatchObject({ status: 'configured', value: 200 });
  });
});

describe('ConfigRule writes are guarded by the server', () => {
  it('[CFG-RULE-003] no back-dating: effective_from in the past is refused (SEC-REVIEW-T2.3 #8)', async () => {
    const code = await codeOf(
      set({ key: 'price.min_total_minor', value: 0, effectiveFrom: new Date(T0.getTime() - 1) }),
    );
    expect(code).toBe('BACKDATED_EFFECTIVE_FROM');
    expect(store.rows).toHaveLength(0);
  });

  it('[CFG-RULE-003] scheduling is off while config.max_schedule_ahead_hours is null and capped when set (SEC-REVIEW-T2.6 #9)', async () => {
    store.seed('config.max_schedule_ahead_hours', null);
    const soon = new Date(T0.getTime() + HOUR);
    expect(await codeOf(set({ key: 'price.min_total_minor', value: 1, effectiveFrom: soon }))).toBe(
      'SCHEDULE_NOT_ALLOWED',
    );
    store.seed('config.max_schedule_ahead_hours', 2, new Date(T0.getTime() - 1));
    reader.invalidate();
    expect(await codeOf(set({ key: 'price.min_total_minor', value: 1, effectiveFrom: soon }))).toBe(
      'OK',
    );
    const far = new Date(T0.getTime() + 3 * HOUR);
    expect(await codeOf(set({ key: 'price.min_total_minor', value: 2, effectiveFrom: far }))).toBe(
      'SCHEDULE_NOT_ALLOWED',
    );
  });

  it('[CFG-RULE-003] owner-decided keys are read-only (D-006, D-015, D-020, D-025; OQ-078)', async () => {
    const codes = await Promise.all(
      CONFIG_KEYS.filter((d) => d.decidedBy).map((d) => codeOf(set({ key: d.key, value: null }))),
    );
    expect(new Set(codes)).toEqual(new Set(['OWNER_DECIDED_READ_ONLY']));
  });

  it('[LEDGER-PAY-001] the company account cannot be set without the two-person flow (OQ-076)', async () => {
    expect(await codeOf(set({ key: 'payments.company_account', value: {} }))).toBe(
      'APPROVAL_FLOW_REQUIRED',
    );
  });

  it('[SEC-AUTH-004] fail-closed limits: null, {}, extra fields, 0, negatives and 2^53 are refused (SEC-REVIEW-T2.6 #1)', async () => {
    const cases: Array<[string, JsonValue | null, string]> = [
      ['auth.otp.max_attempts', null, 'VALUE_REQUIRED'],
      ['auth.otp.max_attempts', 0, 'INVALID_VALUE'],
      ['auth.otp.max_attempts', -1, 'INVALID_VALUE'],
      ['auth.otp.max_attempts', Number.MAX_SAFE_INTEGER, 'INVALID_VALUE'],
      ['auth.otp.expiry_seconds', UNIT_CEILINGS.seconds + 1, 'INVALID_VALUE'],
      ['auth.rate_limit.login', {}, 'INVALID_VALUE'],
      ['auth.rate_limit.login', { maxAttempts: 5 }, 'INVALID_VALUE'],
      [
        'auth.rate_limit.login',
        { maxAttempts: 5, windowSeconds: 60, unlimited: 1 },
        'INVALID_VALUE',
      ],
      ['auth.rate_limit.login', { maxAttempts: 0, windowSeconds: 60 }, 'INVALID_VALUE'],
      [
        'auth.rate_limit.otp_send',
        { maxSends: 5, windowSeconds: 9_007_199_254_740_991 },
        'INVALID_VALUE',
      ],
      ['rate_limit.messaging', null, 'VALUE_REQUIRED'],
      ['rate_limit.requests', {}, 'INVALID_VALUE'],
      ['media.max_upload_bytes', null, 'VALUE_REQUIRED'],
      ['chat.attachment_limits', { maxAttachments: 1 }, 'INVALID_VALUE'],
    ];
    const got = await Promise.all(cases.map(([key, value]) => codeOf(set({ key, value }))));
    expect(got).toEqual(cases.map(([, , code]) => code));
    expect(
      await codeOf(
        set({ key: 'auth.rate_limit.login', value: { maxAttempts: 5, windowSeconds: 600 } }),
      ),
    ).toBe('OK');
    expect(store.rows).toHaveLength(1);
  });

  it('[CFG-RULE-001] unknown keys, wrong scopes, malformed or unknown scope IDs and bad values are refused', async () => {
    const cases: Array<[SetConfigRuleCommand, string]> = [
      [
        { ...base, key: 'made.up_key', scope: 'GLOBAL', scopeRefId: null, value: 1 },
        'UNKNOWN_CONFIG_KEY',
      ],
      [
        { ...base, key: 'NOT A KEY', scope: 'GLOBAL', scopeRefId: null, value: 1 },
        'UNKNOWN_CONFIG_KEY',
      ],
      [
        { ...base, key: 'auth.otp.max_attempts', scope: 'CITY', scopeRefId: CITY_LHR, value: 3 },
        'SCOPE_NOT_ALLOWED',
      ],
      [
        { ...base, key: 'price.min_total_minor', scope: 'CITY', scopeRefId: null, value: 1 },
        'SCOPE_REF_INVALID',
      ],
      [
        { ...base, key: 'price.min_total_minor', scope: 'CITY', scopeRefId: 'abc', value: 1 },
        'SCOPE_REF_INVALID',
      ],
      [
        {
          ...base,
          key: 'price.min_total_minor',
          scope: 'CITY',
          scopeRefId: '00000000-0000-4000-8000-0000000000ff',
          value: 1,
        },
        'SCOPE_REF_INVALID',
      ],
      [
        { ...base, key: 'price.min_total_minor', scope: 'GLOBAL', scopeRefId: CITY_LHR, value: 1 },
        'SCOPE_REF_INVALID',
      ],
      [
        { ...base, key: 'price.min_total_minor', scope: 'GLOBAL', scopeRefId: null, value: -1 },
        'INVALID_VALUE',
      ],
      [
        { ...base, key: 'price.min_total_minor', scope: 'GLOBAL', scopeRefId: null, value: 1.5 },
        'INVALID_VALUE',
      ],
      [
        {
          ...base,
          key: 'ai.confidence_threshold',
          scope: 'GLOBAL',
          scopeRefId: null,
          value: 'high',
        },
        'INVALID_VALUE',
      ],
      [
        { ...base, key: 'legal.terms_url', scope: 'GLOBAL', scopeRefId: null, value: 'http://x' },
        'INVALID_VALUE',
      ],
      [
        {
          ...base,
          reason: '  ',
          key: 'price.min_total_minor',
          scope: 'GLOBAL',
          scopeRefId: null,
          value: 1,
        },
        'REASON_REQUIRED',
      ],
      [
        {
          ...base,
          actorUserId: '',
          key: 'price.min_total_minor',
          scope: 'GLOBAL',
          scopeRefId: null,
          value: 1,
        },
        'ACTOR_REQUIRED',
      ],
    ];
    const got = await Promise.all(cases.map(([cmd]) => codeOf(admin.setRule(cmd))));
    expect(got).toEqual(cases.map(([, code]) => code));
    expect(store.rows).toHaveLength(0);
    expect(store.audits).toHaveLength(0);
  });

  it('[SEC-BASE-005] a concurrent write (unique violation) is a 409, not a 500 (SEC-REVIEW-T2.6 #11)', async () => {
    store.failNextWith = { code: 'P2002' };
    const error = await set({ key: 'reviews.tags', value: ['On time'] }).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'CONCURRENT_WRITE', httpStatus: 409 });
  });

  it('[SEC-BASE-010] every change is audited with server-looked-up sub-roles, reason, before and after', async () => {
    store.seed('reviews.tags', null);
    await set({ key: 'reviews.tags', value: ['On time'] });
    expect(store.audits).toEqual([
      expect.objectContaining({
        actorUserId: SUPER,
        actorSubRoles: ['SUPER_ADMIN'],
        action: 'CONFIG_RULE_SET',
        objectType: 'config_rule',
        objectId: 'row-1',
        reason: 'test change',
        before: expect.objectContaining({ key: 'reviews.tags', value: null }),
        after: expect.objectContaining({ key: 'reviews.tags', value: ['On time'] }),
      }),
    ]);
  });

  it('[CFG-RULE-001] a new value is visible at once (reader cache invalidated, RQ-006 item 3)', async () => {
    store.seed('reviews.max_text_length', null);
    expect((await reader.get('reviews.max_text_length', configParsers.integer)).status).toBe(
      'not_configured',
    );
    await set({ key: 'reviews.max_text_length', value: 500 });
    const after = await reader.get('reviews.max_text_length', configParsers.integer);
    expect(after).toMatchObject({ status: 'configured', value: 500 });
  });
});

describe('Sub-role access (SEC-REVIEW-T2.6 #4; ADMIN-ROLE-001…008)', () => {
  it('[ADMIN-ROLE-003] Finance may change financial keys but not security limits; Support and Analyst nothing', async () => {
    const as = (actorUserId: string, key: string, value: JsonValue) =>
      codeOf(set({ actorUserId, key, value }));
    expect(await as(FINANCE, 'price.max_total_minor', 100)).toBe('OK');
    expect(await as(FINANCE, 'auth.otp.max_attempts', 5)).toBe('FORBIDDEN_FOR_SUB_ROLE');
    expect(await as(SUPPORT, 'price.max_total_minor', 100)).toBe('FORBIDDEN_FOR_SUB_ROLE');
    expect(await as(ANALYST, 'reviews.tags', ['x'])).toBe('FORBIDDEN_FOR_SUB_ROLE');
    expect(await as(SUPER, 'auth.otp.max_attempts', 5)).toBe('OK');
    const nobody = '00000000-0000-4000-8000-00000000a0ff';
    expect(await as(nobody, 'reviews.tags', ['x'])).toBe('FORBIDDEN_FOR_SUB_ROLE');
  });

  it('[ADMIN-ROLE-003] reads are filtered by the same groups: Support sees no financial config', async () => {
    const supportKeys = (await admin.listKeys(SUPPORT)).map((v) => v.definition.key);
    expect(supportKeys).toEqual([]);
    const financeKeys = (await admin.listKeys(FINANCE)).map((v) => v.definition.editGroup);
    expect(new Set(financeKeys)).toEqual(new Set(['FINANCIAL']));
    expect((await admin.listKeys(SUPER)).length).toBe(CONFIG_KEYS.length);
    expect(await codeOf(admin.history('commission.rate', SUPPORT))).toBe('FORBIDDEN_FOR_SUB_ROLE');
  });
});

describe('Readable, masker-safe audit values (SEC-REVIEW-T2.6 #6)', () => {
  const def = () => {
    const d = CONFIG_KEYS.find((k) => k.key === 'payments.company_account');
    if (!d) throw new Error('missing key');
    return d;
  };
  /** A valid sample value per key, built from the registry. */
  const sample = (key: string): JsonValue => {
    const def = CONFIG_KEYS.find((d) => d.key === key);
    if (!def) throw new Error(key);
    if (def.kind === 'limit_object')
      return Object.fromEntries(Object.keys(def.fields ?? {}).map((f) => [f, 3]));
    const byKind: Record<string, JsonValue> = {
      ratio: 0.5,
      non_negative_number: 2,
      non_negative_integer: 3,
      positive_integer: 3,
      boolean: true,
      string: 'VERIFIED',
      url: 'https://kaamkaro.example/terms',
      string_array: ['job'],
      object: { enabled: true },
      json: { rule: 'x' },
    };
    return byKind[def.kind] ?? null;
  };

  it('[SEC-BASE-010] limit values in the audit survive the platform masker unchanged', () => {
    const changed = CONFIG_KEYS.filter((d) => d.auditFormat !== 'FINGERPRINT')
      .map((d) => ({ key: d.key, scope: 'GLOBAL', scopeRefId: null, value: sample(d.key) }))
      .filter((after) => JSON.stringify(maskPii(after)) !== JSON.stringify(after))
      .map((after) => after.key);
    expect(changed).toEqual([]);
  });

  it('[LEDGER-PAY-001] the company account is audited as a fingerprint with the last 4 digits (OQ-076)', async () => {
    const shown = presentableValue(def(), {
      accountTitle: 'Kaam Karo Pvt',
      accountNumber: '0012345678901234',
    });
    expect(shown).toMatchObject({
      last4: '1234',
      fingerprint: expect.stringMatching(/^sha256x:[a-p]{64}$/),
    });
    expect(JSON.stringify(shown)).not.toContain('0012345678901234');
    expect(maskPii(shown)).toEqual(shown);
  });

  it('[SEC-BASE-010] fingerprints survive the masker for any value (no digit runs)', () => {
    const changed = Array.from({ length: 500 }, (_, i) =>
      presentableValue(def(), { accountNumber: `03${i}4567890${i}` }),
    ).filter((shown) => JSON.stringify(maskPii(shown)) !== JSON.stringify(shown));
    expect(changed).toEqual([]);
  });
});

describe('Fail-closed readiness (SEC-AUTH-004, SEC-BASE-006, MEDIA-004; QA-T2.6-02)', () => {
  it('[SEC-AUTH-004] every limit is missing while null; no environment switch exists', async () => {
    for (const key of FAIL_CLOSED_KEYS) store.seed(key, null);
    expect(await missingFailClosedKeys(reader)).toEqual(FAIL_CLOSED_KEYS);
    await expect(assertFailClosedKeysSet(reader)).rejects.toMatchObject({
      code: 'LIMIT_NOT_CONFIGURED',
    });
    expect(FAIL_CLOSED_KEYS).toEqual(
      expect.arrayContaining([
        'auth.otp.max_attempts',
        'auth.rate_limit.login',
        'rate_limit.messaging',
        'rate_limit.requests',
        'media.audio.max_seconds',
      ]),
    );
  });

  it('[SEC-BASE-006] invalid stored limits ({}, 0, -1, 2^53) count as missing (positive parsers)', async () => {
    const bad: Record<string, JsonValue> = {
      'auth.otp.max_attempts': 0,
      'auth.otp.expiry_seconds': -1,
      'auth.otp.lockout_seconds': Number.MAX_SAFE_INTEGER,
      'auth.rate_limit.login': {},
    };
    for (const key of FAIL_CLOSED_KEYS) store.seed(key, bad[key] ?? sample3(key));
    expect([...(await missingFailClosedKeys(reader))].sort()).toEqual(Object.keys(bad).sort());
  });
});

function sample3(key: string): JsonValue {
  const def = CONFIG_KEYS.find((d) => d.key === key);
  if (def?.kind === 'limit_object')
    return Object.fromEntries(Object.keys(def.fields ?? {}).map((f) => [f, 3]));
  return 3;
}

describe('Registry value checks', () => {
  it('[CFG-RULE-001] value kinds accept and refuse the right shapes', () => {
    const def = (key: string) => {
      const d = CONFIG_KEYS.find((k) => k.key === key);
      if (!d) throw new Error(key);
      return d;
    };
    expect(isValidValueFor(def('ai.confidence_threshold'), 0.5)).toBe(true);
    expect(isValidValueFor(def('ai.confidence_threshold'), 1)).toBe(false);
    expect(isValidValueFor(def('auth.otp.max_attempts'), 0)).toBe(false);
    expect(isValidValueFor(def('catalog.pricing_units'), ['job'])).toBe(true);
    expect(isValidValueFor(def('catalog.pricing_units'), [''])).toBe(false);
    expect(isValidValueFor(def('booking.status_expiry'), [])).toBe(false);
    expect(isValidValueFor(def('legal.terms_url'), 'https://kaamkaro.example/terms')).toBe(true);
    expect(isValidValueFor(def('price.max_total_minor'), UNIT_CEILINGS.paisa)).toBe(true);
    expect(isValidValueFor(def('price.max_total_minor'), Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it('[SEC-AUTH-004] every integer key and every limit field has a unit (bounded)', () => {
    const unbounded = CONFIG_KEYS.filter(
      (d) =>
        ((d.kind === 'positive_integer' || d.kind === 'non_negative_integer') && !d.unit) ||
        (d.kind === 'limit_object' && Object.keys(d.fields ?? {}).length === 0),
    ).map((d) => d.key);
    expect(unbounded).toEqual([]);
    expect(
      CONFIG_KEYS.filter(
        (d) => d.failClosed && d.kind !== 'positive_integer' && d.kind !== 'limit_object',
      ),
    ).toEqual([]);
  });
});

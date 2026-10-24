import { describe, expect, it } from 'vitest';
import {
  CachedConfigService,
  ConfigNotSetError,
  type ConfigRuleSource,
  type ConfigRuleVersion,
  ConfigUnavailableError,
  FAIL_CLOSED_KEY_PREFIXES,
  configParsers,
  isFailClosedKey,
  oneOf,
  positiveIntegerUpTo,
} from './config-service';

const T0 = new Date('2026-10-01T00:00:00.000Z');
const T1 = new Date('2026-11-01T00:00:00.000Z');
const LAHORE = 'city-lhr';
const PLUMBING = 'cat-plumb';
const LEAK_FIX = 'svc-leak';

function v(p: Partial<ConfigRuleVersion> & Pick<ConfigRuleVersion, 'id'>): ConfigRuleVersion {
  return {
    key: 'commission.rate',
    scope: 'GLOBAL',
    scopeRefId: null,
    value: 0.3,
    effectiveFrom: T0,
    ...p,
  };
}

function source(rows: ConfigRuleVersion[]) {
  const calls: string[] = [];
  const src: ConfigRuleSource & { calls: string[]; fail: boolean } = {
    calls,
    fail: false,
    listVersions(key) {
      calls.push(key);
      if (src.fail) return Promise.reject(new Error('db down'));
      return Promise.resolve(rows.filter((r) => r.key === key));
    },
  };
  return src;
}

// CFG-RULE-001…012 (BP §42, §64; ARCH §5.3, §19); golden rule 2 (null = TODO(OWNER)).
describe('[CFG-RULE-003] config reader', () => {
  it('[CFG-RULE-003] reads a global value (commission.rate seeded 0.30 per D-006)', async () => {
    const cfg = new CachedConfigService(source([v({ id: 'r1' })]), {
      cacheTtlMs: 0,
      now: () => T1,
    });
    await expect(cfg.require('commission.rate', configParsers.ratio)).resolves.toBe(0.3);
  });

  it('[CFG-RULE-001] most specific scope wins: service → category → city → global', async () => {
    const rows = [
      v({ id: 'g', key: 'x.limit', value: 1 }),
      v({ id: 'c', key: 'x.limit', scope: 'CITY', scopeRefId: LAHORE, value: 2 }),
      v({ id: 'k', key: 'x.limit', scope: 'CATEGORY', scopeRefId: PLUMBING, value: 3 }),
      v({ id: 's', key: 'x.limit', scope: 'SERVICE', scopeRefId: LEAK_FIX, value: 4 }),
    ];
    const cfg = new CachedConfigService(source(rows), { cacheTtlMs: 60_000, now: () => T1 });
    const get = (ctx: object) => cfg.require('x.limit', configParsers.integer, ctx);
    await expect(get({})).resolves.toBe(1);
    await expect(get({ cityId: LAHORE })).resolves.toBe(2);
    await expect(get({ cityId: LAHORE, categoryId: PLUMBING })).resolves.toBe(3);
    await expect(get({ cityId: LAHORE, categoryId: PLUMBING, serviceId: LEAK_FIX })).resolves.toBe(
      4,
    );
    await expect(get({ cityId: 'other-city' })).resolves.toBe(1);
  });

  it('[CFG-RULE-004] null = TODO(OWNER): get returns not_configured, require fails closed', async () => {
    const rows = [v({ id: 'n', key: 'cancel.window_minutes', value: null })];
    const cfg = new CachedConfigService(source(rows), { cacheTtlMs: 0, now: () => T1 });
    await expect(cfg.get('cancel.window_minutes', configParsers.integer)).resolves.toEqual({
      status: 'not_configured',
      key: 'cancel.window_minutes',
      reason: 'VALUE_NULL',
      scope: 'GLOBAL',
      ruleId: 'n',
    });
    await expect(
      cfg.require('cancel.window_minutes', configParsers.integer),
    ).rejects.toBeInstanceOf(ConfigNotSetError);
  });

  it('[CFG-RULE-001] an explicit null at a narrower scope does not fall through', async () => {
    const rows = [
      v({ id: 'g', key: 'x.flag', value: true }),
      v({ id: 'c', key: 'x.flag', scope: 'CITY', scopeRefId: LAHORE, value: null }),
    ];
    const cfg = new CachedConfigService(source(rows), { cacheTtlMs: 0, now: () => T1 });
    const r = await cfg.get('x.flag', configParsers.boolean, { cityId: LAHORE });
    expect(r).toMatchObject({ status: 'not_configured', reason: 'VALUE_NULL', scope: 'CITY' });
  });

  it('[CFG-RULE-001] effective dating: the latest version with effective_from ≤ at wins', async () => {
    const rows = [
      v({ id: 'old', value: 0.3, effectiveFrom: T0 }),
      v({ id: 'new', value: 0.25, effectiveFrom: T1 }),
    ];
    const cfg = new CachedConfigService(source(rows), { cacheTtlMs: 60_000, now: () => T0 });
    await expect(cfg.require('commission.rate', configParsers.ratio)).resolves.toBe(0.3);
    await expect(cfg.require('commission.rate', configParsers.ratio, { at: T1 })).resolves.toBe(
      0.25,
    );
    await expect(
      cfg.get('commission.rate', configParsers.ratio, { at: new Date('2026-09-01T00:00:00Z') }),
    ).resolves.toMatchObject({ status: 'not_configured', reason: 'NO_RULE' });
  });

  it('[CFG-RULE-003] a wrongly typed value is INVALID_VALUE, never coerced', async () => {
    const cfg = new CachedConfigService(source([v({ id: 'bad', value: '0.30' })]), {
      cacheTtlMs: 0,
      now: () => T1,
    });
    await expect(cfg.get('commission.rate', configParsers.ratio)).resolves.toMatchObject({
      status: 'not_configured',
      reason: 'INVALID_VALUE',
    });
    const mode = oneOf(['DRY_RUN', 'ENFORCE'] as const);
    expect(mode('DRY_RUN')).toBe('DRY_RUN');
    expect(mode('OTHER')).toBeUndefined();
    expect(configParsers.ratio(1.5)).toBeUndefined();
    expect(configParsers.stringArray(['LABOR'])).toEqual(['LABOR']);
  });

  it('[CFG-RULE-001] caches per key for the TTL, invalidate() forces a reload', async () => {
    let now = T0.getTime();
    const src = source([v({ id: 'r1' })]);
    const cfg = new CachedConfigService(src, { cacheTtlMs: 1000, now: () => new Date(now) });
    await Promise.all([
      cfg.get('commission.rate', configParsers.ratio),
      cfg.get('commission.rate', configParsers.ratio),
    ]);
    expect(src.calls).toHaveLength(1);
    now += 999;
    await cfg.get('commission.rate', configParsers.ratio);
    expect(src.calls).toHaveLength(1);
    now += 1;
    await cfg.get('commission.rate', configParsers.ratio);
    expect(src.calls).toHaveLength(2);
    cfg.invalidate('commission.rate');
    await cfg.get('commission.rate', configParsers.ratio);
    expect(src.calls).toHaveLength(3);
  });

  it('[CFG-RULE-001] store failure → ConfigUnavailableError (fail closed); bad keys refused', async () => {
    const src = source([]);
    src.fail = true;
    const cfg = new CachedConfigService(src, { cacheTtlMs: 0 });
    await expect(cfg.get('commission.rate', configParsers.ratio)).rejects.toBeInstanceOf(
      ConfigUnavailableError,
    );
    await expect(cfg.get('Commission Rate', configParsers.ratio)).rejects.toBeInstanceOf(TypeError);
    expect(() => new CachedConfigService(src, { cacheTtlMs: -1 })).toThrow(RangeError);
  });
});

// SEC-REVIEW-T2.2 #10, #13 (golden rule 2; BP §27, §29; SEC-AUTH-004; CFG-RULE-001).
describe('[SEC-AUTH-004] fail-closed keys and cache races', () => {
  it('[SEC-AUTH-004] get() throws for a null auth./otp./login. key; inspect() reports it', async () => {
    const rows = [
      v({ id: 'a', key: 'auth.otp.max_attempts', value: null }),
      v({ id: 'b', key: 'otp.resend_cooldown_seconds', value: null }),
      v({ id: 'c', key: 'login.rate_limit', value: null }),
    ];
    const cfg = new CachedConfigService(source(rows), { cacheTtlMs: 0, now: () => T1 });
    for (const key of [
      'auth.otp.max_attempts',
      'otp.resend_cooldown_seconds',
      'login.rate_limit',
    ]) {
      await expect(cfg.get(key, configParsers.positiveInteger)).rejects.toBeInstanceOf(
        ConfigNotSetError,
      );
      await expect(cfg.inspect(key, configParsers.positiveInteger)).resolves.toMatchObject({
        status: 'not_configured',
        reason: 'VALUE_NULL',
      });
    }
    await expect(cfg.get('auth.unknown_key', configParsers.integer)).rejects.toMatchObject({
      reason: 'NO_RULE',
    });
    expect(isFailClosedKey('booking.cancellation_window_minutes')).toBe(false);
  });

  it('[SEC-AUTH-004] positiveInteger refuses 0, negatives and fractions', () => {
    expect(configParsers.positiveInteger(5)).toBe(5);
    for (const bad of [0, -1, 1.5, '5']) expect(configParsers.positiveInteger(bad)).toBeUndefined();
    expect(FAIL_CLOSED_KEY_PREFIXES).toEqual(expect.arrayContaining(['auth.', 'otp.', 'login.']));
  });

  it('[CFG-RULE-001] a load that started before invalidate() never refills the cache with old data', async () => {
    let value: number = 1;
    let release!: () => void;
    let first = true;
    const src: ConfigRuleSource = {
      async listVersions(key) {
        const snapshot = value;
        if (first) {
          first = false;
          await new Promise<void>((r) => {
            release = r;
          });
        }
        return [v({ id: `r${snapshot}`, key, value: snapshot })];
      },
    };
    const cfg = new CachedConfigService(src, { cacheTtlMs: 60_000, now: () => T1 });
    const stale = cfg.require('x.limit', configParsers.integer);
    value = 2;
    cfg.invalidate('x.limit');
    release();
    await expect(stale).resolves.toBe(1);
    await expect(cfg.require('x.limit', configParsers.integer)).resolves.toBe(2);
  });
});

// SEC-REVIEW-T2.6 #1 (SEC-AUTH-004, SEC-BASE-006; MEDIA-004): exact fail-closed keys from the registry.
describe('[SEC-AUTH-004] exact fail-closed keys (SEC-REVIEW-T2.6 #1)', () => {
  it('[SEC-BASE-006] rate_limit.* and registry-listed keys can never read as "no limit"', async () => {
    const rows = [
      v({ id: 'r', key: 'rate_limit.messaging', value: null }),
      v({ id: 'm', key: 'media.max_upload_bytes', value: null }),
      v({ id: 'z', key: 'media.max_upload_bytes_zero', value: 0 }),
    ];
    const cfg = new CachedConfigService(source(rows), {
      cacheTtlMs: 0,
      now: () => T1,
      failClosedKeys: ['media.max_upload_bytes', 'media.max_upload_bytes_zero'],
    });
    await expect(cfg.get('rate_limit.messaging', configParsers.object)).rejects.toBeInstanceOf(
      ConfigNotSetError,
    );
    await expect(
      cfg.get('media.max_upload_bytes', configParsers.positiveInteger),
    ).rejects.toBeInstanceOf(ConfigNotSetError);
    // 0 does not pass positiveInteger -> INVALID_VALUE -> also refused, never "unlimited".
    await expect(
      cfg.get('media.max_upload_bytes_zero', configParsers.positiveInteger),
    ).rejects.toMatchObject({ reason: 'INVALID_VALUE' });
    expect(cfg.isFailClosed('booking.cancellation_window_minutes')).toBe(false);
  });

  it('[SEC-AUTH-004] RQ-011: a registry predicate makes media.* / chat.* keys fail closed', async () => {
    const registry = new Set(['media.video.max_seconds', 'chat.attachment_limits']);
    const rows = [
      v({ id: 'a', key: 'media.video.max_seconds', value: null }),
      v({ id: 'b', key: 'chat.attachment_limits', value: null }),
      v({ id: 'c', key: 'reviews.max_text_length', value: null }),
    ];
    const cfg = new CachedConfigService(source(rows), {
      cacheTtlMs: 0,
      now: () => T1,
      isFailClosed: (k) => registry.has(k),
    });
    for (const key of registry) {
      await expect(cfg.get(key, configParsers.object)).rejects.toBeInstanceOf(ConfigNotSetError);
    }
    await expect(cfg.get('reviews.max_text_length', configParsers.integer)).resolves.toMatchObject({
      status: 'not_configured',
    });
  });

  it('[SEC-AUTH-004] positiveIntegerUpTo enforces an upper bound (unit ceiling)', () => {
    const p = positiveIntegerUpTo(86_400);
    expect(p(30)).toBe(30);
    expect(p(86_401)).toBeUndefined();
    expect(p(0)).toBeUndefined();
    expect(() => positiveIntegerUpTo(0)).toThrow(RangeError);
  });
});

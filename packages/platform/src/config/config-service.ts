/**
 * Config loader interface + cached reader (T2.2, owner A01). The BACKING STORE (config_rule
 * repository, seeds, admin edits) is owned by A03 (catalog-config, T2.6) and implements
 * {@link ConfigRuleSource}. Agreed in coordination/handoffs/REQUESTS.md RQ-006.
 *
 * - CFG-RULE-001…012 (BP §42, §64; ARCH §5.3, §19): business values are read from config, never
 *   hard-coded. A value is looked up by key + scope (global / city / category / service) and is
 *   effective-dated (a change is a new append-only row with a later effective_from).
 * - Golden rule 2: a stored `null` means the owner has not decided yet (TODO(OWNER)). The reader
 *   NEVER invents a default: it returns `not_configured` and the caller applies the safe
 *   behaviour its requirement names (e.g. CFG-RULE-004 "while null, no cancellation fee"), or calls
 *   {@link ConfigService.require}, which fails closed with {@link ConfigNotSetError}.
 */

/** Scope kinds, same names as the Prisma enum `ConfigScope` (ARCH §5.3; BP §64). */
export const CONFIG_SCOPES = ['GLOBAL', 'CITY', 'CATEGORY', 'SERVICE'] as const;
export type ConfigScope = (typeof CONFIG_SCOPES)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** One stored, append-only version of a rule, as returned by the backing store (A03). */
export interface ConfigRuleVersion {
  readonly id: string;
  readonly key: string;
  readonly scope: ConfigScope;
  /** City / category / service ID; null for GLOBAL. */
  readonly scopeRefId: string | null;
  /** DB NULL and JSON null both mean "not decided by the owner yet" (TODO(OWNER)). */
  readonly value: JsonValue | null;
  readonly effectiveFrom: Date;
}

/**
 * Backing store contract, implemented by A03 in services/api/src/modules/config (T2.6).
 * Must return EVERY version of `key` in every scope (past, current and future effective_from);
 * the reader picks the effective one. Must throw (not return []) when the store is unreachable.
 */
export interface ConfigRuleSource {
  listVersions(key: string): Promise<readonly ConfigRuleVersion[]>;
}

/** Where and when the value is needed. Omitted IDs simply skip that scope. */
export interface ConfigContext {
  readonly serviceId?: string | null;
  readonly categoryId?: string | null;
  readonly cityId?: string | null;
  /** Evaluation time; default "now". */
  readonly at?: Date;
}

/** Why a key has no usable value. */
export type NotConfiguredReason =
  /** No row for this key in any matching scope (seed missing). */
  | 'NO_RULE'
  /** The most specific effective row holds null: TODO(OWNER). */
  | 'VALUE_NULL'
  /** The stored value does not pass the caller's parser (wrong type/range). */
  | 'INVALID_VALUE';

export type ConfigResult<T> =
  | {
      readonly status: 'configured';
      readonly key: string;
      readonly value: T;
      readonly scope: ConfigScope;
      readonly scopeRefId: string | null;
      readonly effectiveFrom: Date;
      readonly ruleId: string;
    }
  | {
      readonly status: 'not_configured';
      readonly key: string;
      readonly reason: NotConfiguredReason;
      readonly scope: ConfigScope | null;
      readonly ruleId: string | null;
    };

/** Converts a stored JSON value to T; return `undefined` when the value is not acceptable. */
export type ConfigParser<T> = (value: JsonValue) => T | undefined;

/**
 * SEC-REVIEW-T2.2 #10 (golden rule 2; BP §27, §29; SEC-AUTH-004): keys under these prefixes are
 * security limits (OTP attempts, login rate limits…). For them `get()` never returns
 * `not_configured`: it throws {@link ConfigNotSetError}, so a caller cannot read "null" as
 * "no limit". Readiness checks and admin previews use {@link ConfigService.inspect}.
 */
export const FAIL_CLOSED_KEY_PREFIXES: readonly string[] = [
  'auth.',
  'otp.',
  'login.',
  'security.',
  'ratelimit.',
  'rate_limit.',
];

export function isFailClosedKey(key: string): boolean {
  return FAIL_CLOSED_KEY_PREFIXES.some((p) => key.startsWith(p));
}

/** Reader used by every module. Inject with the {@link CONFIG_SERVICE} token. */
export interface ConfigService {
  /**
   * Effective value or `not_configured`; the caller decides the safe behaviour named by its
   * requirement. For fail-closed keys ({@link FAIL_CLOSED_KEY_PREFIXES}) a missing value throws.
   */
  get<T>(key: string, parse: ConfigParser<T>, context?: ConfigContext): Promise<ConfigResult<T>>;
  /**
   * Like `get` but never throws for a missing value, for ANY key. Only for readiness checks,
   * admin previews and health reports — never to decide whether a limit applies.
   */
  inspect<T>(
    key: string,
    parse: ConfigParser<T>,
    context?: ConfigContext,
  ): Promise<ConfigResult<T>>;
  /** Effective value, or throws {@link ConfigNotSetError} (fail closed). */
  require<T>(key: string, parse: ConfigParser<T>, context?: ConfigContext): Promise<T>;
  /** Drop cached versions (one key or all); call after writing a new rule version. */
  invalidate(key?: string): void;
}

/** Nest DI tokens (Symbol.for so that every copy of the package resolves the same token). */
export const CONFIG_SERVICE = Symbol.for('kaamkaro.platform.ConfigService');
export const CONFIG_RULE_SOURCE = Symbol.for('kaamkaro.platform.ConfigRuleSource');

/** Thrown by `require` when a key is null/missing/invalid: the action must not proceed. */
export class ConfigNotSetError extends Error {
  constructor(
    public readonly key: string,
    public readonly reason: NotConfiguredReason,
  ) {
    super(`Config "${key}" is not configured (${reason})`);
    this.name = 'ConfigNotSetError';
  }
}

/** Thrown when the backing store cannot be read and no fresh cache exists (fail closed). */
export class ConfigUnavailableError extends Error {
  constructor(
    public readonly key: string,
    cause: unknown,
  ) {
    super(`Config "${key}" could not be loaded`, { cause });
    this.name = 'ConfigUnavailableError';
  }
}

/** Keys look like `commission.rate`, `ledger.max_negative_balance` (ARCH §19). */
export const CONFIG_KEY_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+$/;

/** Most specific scope first (a service rule overrides its category, city, then global). */
const SCOPE_PRECEDENCE: readonly ConfigScope[] = ['SERVICE', 'CATEGORY', 'CITY', 'GLOBAL'];

function scopeRef(scope: ConfigScope, context: ConfigContext): string | null | undefined {
  switch (scope) {
    case 'SERVICE':
      return context.serviceId ?? undefined;
    case 'CATEGORY':
      return context.categoryId ?? undefined;
    case 'CITY':
      return context.cityId ?? undefined;
    case 'GLOBAL':
      return null;
  }
}

/**
 * Pure resolution (exported for tests and for A03's admin preview):
 * 1. Walk scopes SERVICE → CATEGORY → CITY → GLOBAL, skipping scopes whose ID is not given.
 * 2. In the first scope that has a version with effective_from ≤ at, the latest such version wins.
 * 3. Its value null → `not_configured / VALUE_NULL` (an explicit null is NOT skipped: the owner
 *    has not decided for that scope). Otherwise the parser decides `configured` or `INVALID_VALUE`.
 */
export function resolveConfig<T>(
  key: string,
  versions: readonly ConfigRuleVersion[],
  parse: ConfigParser<T>,
  context: ConfigContext,
  at: Date,
): ConfigResult<T> {
  for (const scope of SCOPE_PRECEDENCE) {
    const ref = scopeRef(scope, context);
    if (ref === undefined) continue;
    let winner: ConfigRuleVersion | undefined;
    for (const v of versions) {
      if (v.key !== key || v.scope !== scope || v.scopeRefId !== ref) continue;
      if (v.effectiveFrom.getTime() > at.getTime()) continue;
      if (!winner || v.effectiveFrom.getTime() > winner.effectiveFrom.getTime()) winner = v;
    }
    if (!winner) continue;
    if (winner.value === null) {
      return { status: 'not_configured', key, reason: 'VALUE_NULL', scope, ruleId: winner.id };
    }
    const parsed = parse(winner.value);
    if (parsed === undefined) {
      return { status: 'not_configured', key, reason: 'INVALID_VALUE', scope, ruleId: winner.id };
    }
    return {
      status: 'configured',
      key,
      value: parsed,
      scope,
      scopeRefId: winner.scopeRefId,
      effectiveFrom: winner.effectiveFrom,
      ruleId: winner.id,
    };
  }
  return { status: 'not_configured', key, reason: 'NO_RULE', scope: null, ruleId: null };
}

export interface CachedConfigOptions {
  /** How long versions of a key are reused before re-reading the store (technical setting). */
  readonly cacheTtlMs: number;
  /**
   * Exact keys that are also fail-closed (beyond FAIL_CLOSED_KEY_PREFIXES), e.g. media and
   * attachment limits (SEC-REVIEW-T2.6 #1).
   */
  readonly failClosedKeys?: Iterable<string>;
  /**
   * Registry predicate (RQ-011 item 1): A03's ConfigRulesModule passes `isFailClosedConfigKey`, so
   * the reader fails closed for exactly the registry's FAIL_CLOSED_KEYS (rate_limit.*, media.*,
   * chat.*), in addition to the prefixes.
   */
  readonly isFailClosed?: (key: string) => boolean;
  readonly now?: () => Date;
}

interface CacheEntry {
  readonly versions: readonly ConfigRuleVersion[];
  readonly loadedAt: number;
}

/**
 * Cache staleness: per process, at most `cacheTtlMs` (CONFIG_CACHE_TTL_MS, default 30 s) after a
 * change made in ANOTHER process (other API replica or the worker). The process that writes calls
 * `invalidate`; a load that started before an `invalidate` is never put back into the cache
 * (SEC-REVIEW-T2.2 #13). Cross-process invalidation is not built (documented in T-2.2.md).
 */

/**
 * Cached reader over a {@link ConfigRuleSource}. Caches all versions of a key (so effective-dated
 * switches happen on time without a reload), de-duplicates concurrent loads and fails closed
 * with {@link ConfigUnavailableError} when the store is unreachable and the cache has expired.
 */
export class CachedConfigService implements ConfigService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly loading = new Map<string, Promise<readonly ConfigRuleVersion[]>>();
  private readonly generation = new Map<string, number>();
  private readonly failClosedKeys: ReadonlySet<string>;
  private globalGeneration = 0;
  private readonly now: () => Date;

  constructor(
    private readonly source: ConfigRuleSource,
    private readonly options: CachedConfigOptions,
  ) {
    if (!Number.isFinite(options.cacheTtlMs) || options.cacheTtlMs < 0) {
      throw new RangeError('cacheTtlMs must be a non-negative number');
    }
    this.now = options.now ?? (() => new Date());
    this.failClosedKeys = new Set(options.failClosedKeys ?? []);
  }

  async get<T>(
    key: string,
    parse: ConfigParser<T>,
    context: ConfigContext = {},
  ): Promise<ConfigResult<T>> {
    const result = await this.inspect(key, parse, context);
    if (result.status === 'not_configured' && this.isFailClosed(key)) {
      throw new ConfigNotSetError(key, result.reason);
    }
    return result;
  }

  async inspect<T>(
    key: string,
    parse: ConfigParser<T>,
    context: ConfigContext = {},
  ): Promise<ConfigResult<T>> {
    if (!CONFIG_KEY_PATTERN.test(key)) throw new TypeError(`Invalid config key "${key}"`);
    const versions = await this.versions(key);
    return resolveConfig(key, versions, parse, context, context.at ?? this.now());
  }

  async require<T>(key: string, parse: ConfigParser<T>, context: ConfigContext = {}): Promise<T> {
    const result = await this.get(key, parse, context);
    if (result.status === 'configured') return result.value;
    throw new ConfigNotSetError(key, result.reason);
  }

  /** Prefix rule or one of the exact fail-closed keys given at construction. */
  isFailClosed(key: string): boolean {
    return (
      isFailClosedKey(key) ||
      this.failClosedKeys.has(key) ||
      (this.options.isFailClosed?.(key) ?? false)
    );
  }

  invalidate(key?: string): void {
    if (key === undefined) {
      this.globalGeneration += 1;
      this.cache.clear();
      this.loading.clear();
    } else {
      this.generation.set(key, (this.generation.get(key) ?? 0) + 1);
      this.cache.delete(key);
      this.loading.delete(key);
    }
  }

  private gen(key: string): string {
    return `${this.globalGeneration}:${this.generation.get(key) ?? 0}`;
  }

  private async versions(key: string): Promise<readonly ConfigRuleVersion[]> {
    const nowMs = this.now().getTime();
    const hit = this.cache.get(key);
    if (hit && nowMs - hit.loadedAt < this.options.cacheTtlMs) return hit.versions;

    const pending = this.loading.get(key);
    if (pending) return pending;

    const startedGen = this.gen(key);
    const load = (async () => {
      try {
        const versions = await this.source.listVersions(key);
        // A load that started before invalidate() must not refill the cache with old data.
        if (this.gen(key) === startedGen) {
          this.cache.set(key, { versions, loadedAt: this.now().getTime() });
        }
        return versions;
      } catch (error) {
        throw new ConfigUnavailableError(key, error);
      } finally {
        // After invalidate() the map may already hold a newer load: leave that one alone.
        if (this.gen(key) === startedGen) this.loading.delete(key);
      }
    })();
    this.loading.set(key, load);
    return load;
  }
}

function isPlainObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Basic parsers. They only check the JSON type/shape; the meaning of the value stays with the
 * owning module and its requirement ID. Money must not be stored as a float rate here without
 * the owning module (A09) converting it exactly (DATA-001: money is integer paisa).
 */
export const configParsers = {
  number: ((v) =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined) as ConfigParser<number>,
  nonNegativeNumber: ((v) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined) as ConfigParser<number>,
  integer: ((v) =>
    typeof v === 'number' && Number.isSafeInteger(v) ? v : undefined) as ConfigParser<number>,
  /** ≥ 1: attempt limits, rate limits, sizes (SEC-REVIEW-T2.2 #10: 0 / -1 are not limits). */
  positiveInteger: ((v) =>
    typeof v === 'number' && Number.isSafeInteger(v) && v >= 1
      ? v
      : undefined) as ConfigParser<number>,
  /** A ratio in [0, 1], e.g. commission.rate (D-006). */
  ratio: ((v) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
      ? v
      : undefined) as ConfigParser<number>,
  boolean: ((v) => (typeof v === 'boolean' ? v : undefined)) as ConfigParser<boolean>,
  string: ((v) => (typeof v === 'string' ? v : undefined)) as ConfigParser<string>,
  stringArray: ((v) =>
    Array.isArray(v) && v.every((x) => typeof x === 'string')
      ? (v as readonly string[])
      : undefined) as ConfigParser<readonly string[]>,
  object: ((v) => (isPlainObject(v) ? v : undefined)) as ConfigParser<{
    readonly [key: string]: JsonValue;
  }>,
} as const;

/** Narrow a string to one of the allowed values (for enum-like config). */
export function oneOf<const T extends string>(allowed: readonly T[]): ConfigParser<T> {
  return (v) =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

/**
 * Positive integer with an upper bound (SEC-REVIEW-T2.6 #1): limits such as OTP attempts or upload
 * size must be ≥ 1 and ≤ the unit ceiling given by the owning module (A03's UNIT_CEILINGS).
 */
export function positiveIntegerUpTo(max: number): ConfigParser<number> {
  if (!Number.isSafeInteger(max) || max < 1) throw new RangeError('max must be a positive integer');
  return (v) =>
    typeof v === 'number' && Number.isSafeInteger(v) && v >= 1 && v <= max ? v : undefined;
}

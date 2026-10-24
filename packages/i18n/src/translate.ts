/**
 * translate() / translatePlural() — I18N-001, I18N-003, I18N-005, I18N-006 (BP §37, §78).
 *
 * Safe interpolation (no string concatenation in app code):
 *  - The parameters a key needs are read from its English template at compile time, so a
 *    missing or misspelled parameter is a type error; at run time a missing one throws.
 *  - Numbers and bigints are formatted for the locale (grouping, digits; OQ-079 switch) and
 *    isolated as a left-to-right run on Urdu screens, so "3 منٹ پہلے" keeps its order.
 *  - Text values are wrapped in a first-strong isolate on Urdu screens (and on English screens
 *    when they contain Urdu), so a provider name or an English term cannot reorder the
 *    sentence. Values that are already isolated (formatted amounts, phones) are left alone.
 *    Pass booking IDs and phone numbers as strings (they must not be grouped).
 */
import { isolateAuto, isolateLtr } from './bidi.js';
import { fillTemplate, messageTemplate } from './catalog.js';
import type { Locale } from './locale.js';
import type { EN_MESSAGES, MessageKey } from './messages.js';
import { formatInteger, formatNumber } from './numbers.js';
import { pluralCategory } from './plural.js';

export { fillTemplate, messageKeys, messageTemplate, type MessageParams } from './catalog.js';

/** A value that may be passed into a placeholder. */
export type ParamValue = string | number | bigint;

/** Placeholder names in a template literal type: 'Hi {a} and {b}' → 'a' | 'b'. */
export type PlaceholderNames<S extends string> = S extends `${string}{${infer Name}}${infer Rest}`
  ? Name | PlaceholderNames<Rest>
  : never;

type TemplateOf<K extends MessageKey> = (typeof EN_MESSAGES)[K];

/** Parameters required by a key (an empty tuple when the key has no placeholder). */
export type ParamsArgs<K extends MessageKey> = [PlaceholderNames<TemplateOf<K>>] extends [never]
  ? []
  : [params: Readonly<Record<PlaceholderNames<TemplateOf<K>>, ParamValue>>];

/** Formats one parameter value for the locale (see the file comment). */
export function formatParam(locale: Locale, value: ParamValue): string {
  if (typeof value === 'number') return isolateLtr(locale, formatNumber(locale, value));
  if (typeof value === 'bigint') return isolateLtr(locale, formatInteger(locale, value));
  return isolateAuto(locale, value);
}

function formatParams(
  locale: Locale,
  params: Readonly<Record<string, ParamValue>> | undefined,
): Record<string, string> | undefined {
  if (params === undefined) return undefined;
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(params)) out[name] = formatParam(locale, value);
  return out;
}

export function translate<K extends MessageKey>(
  locale: Locale,
  key: K,
  ...args: ParamsArgs<K>
): string {
  const params = args[0] as Readonly<Record<string, ParamValue>> | undefined;
  return fillTemplate(
    messageTemplate(locale, key),
    formatParams(locale, params),
    `key "${key}" (${locale})`,
  );
}

/** Base keys that have both a `.one` and an `.other` form. */
export type PluralBase = {
  [K in MessageKey]: K extends `${infer Base}.other`
    ? `${Base}.one` extends MessageKey
      ? Base
      : never
    : never;
}[MessageKey];

type PluralOtherKey<B extends PluralBase> = `${B}.other` & MessageKey;

/** Parameters of a plural message other than `{count}` (which translatePlural fills). */
export type PluralParamsArgs<B extends PluralBase> = [
  Exclude<PlaceholderNames<TemplateOf<PluralOtherKey<B>>>, 'count'>,
] extends [never]
  ? []
  : [
      params: Readonly<
        Record<Exclude<PlaceholderNames<TemplateOf<PluralOtherKey<B>>>, 'count'>, ParamValue>
      >,
    ];

/**
 * Picks the plural form for `count` and fills `{count}` (formatted, isolated in Urdu).
 * Example: translatePlural('ur', 'common.time.minutesAgo', 5) → "5 منٹ پہلے".
 */
export function translatePlural<B extends PluralBase>(
  locale: Locale,
  base: B,
  count: number | bigint,
  ...args: PluralParamsArgs<B>
): string {
  const key = `${base}.${pluralCategory(locale, count)}` as MessageKey;
  const extra = args[0] as Readonly<Record<string, ParamValue>> | undefined;
  return fillTemplate(
    messageTemplate(locale, key),
    formatParams(locale, { ...extra, count }),
    `plural key "${key}" (${locale})`,
  );
}

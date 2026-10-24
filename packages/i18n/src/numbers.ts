/**
 * Number formatting — I18N-007 (BP §37: local conventions).
 *
 * Written by hand instead of `Intl.NumberFormat` so the output is identical in Node tests and in
 * Hermes on every Android phone (Hermes' Intl support differs between versions). Digit style
 * and grouping come from NUMBER_DISPLAY (config.ts, OQ-079 TODO(OWNER)).
 *
 * The results are NOT bidi-isolated; `translate` and the money/date formatters isolate them when
 * they are placed in Urdu text.
 */
import { NUMBER_DISPLAY, type DigitGrouping, type NumberDisplayConfig } from './config.js';
import { type Locale } from './locale.js';

/** Extended Arabic-Indic digits used for Urdu (U+06F0 … U+06F9). */
const URDU_ZERO = 0x06f0;
/** CLDR `arabext` separators: U+066C ARABIC THOUSANDS SEPARATOR, U+066B DECIMAL SEPARATOR. */
const URDU_GROUP_SEPARATOR = String.fromCodePoint(0x066c);
const URDU_DECIMAL_SEPARATOR = String.fromCodePoint(0x066b);

function usesUrduDigits(locale: Locale, config: NumberDisplayConfig): boolean {
  return locale === 'ur' && config.urduDigits === 'urdu';
}

/** Groups a string of digits: 1234567 → 1,234,567 (thousands) or 12,34,567 (lakh). */
export function groupDigits(digits: string, grouping: DigitGrouping, separator = ','): string {
  if (grouping === 'thousands' || digits.length <= 3) {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  }
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, separator)}${separator}${tail}`;
}

/** Replaces Latin digits and separators with the configured digits for the locale. */
export function localizeDigits(
  locale: Locale,
  text: string,
  config: NumberDisplayConfig = NUMBER_DISPLAY,
): string {
  if (!usesUrduDigits(locale, config)) return text;
  return text.replace(/[0-9.,]/g, (ch) => {
    if (ch === ',') return URDU_GROUP_SEPARATOR;
    if (ch === '.') return URDU_DECIMAL_SEPARATOR;
    return String.fromCodePoint(URDU_ZERO + Number(ch));
  });
}

/** Formats a whole number with grouping, e.g. 1234567 → "1,234,567". */
export function formatInteger(
  locale: Locale,
  value: number | bigint,
  config: NumberDisplayConfig = NUMBER_DISPLAY,
): string {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new RangeError(`formatInteger: expected a safe whole number, got ${value}`);
  }
  const negative = value < 0;
  const digits = (negative ? -BigInt(value) : BigInt(value)).toString();
  return localizeDigits(
    locale,
    `${negative ? '-' : ''}${groupDigits(digits, config.grouping)}`,
    config,
  );
}

/**
 * Formats a finite number (for example an average rating, 4.5). Integers are grouped; the
 * fraction is kept as JavaScript prints it, up to `maxFractionDigits` (rounded).
 */
export function formatNumber(
  locale: Locale,
  value: number,
  maxFractionDigits = 2,
  config: NumberDisplayConfig = NUMBER_DISPLAY,
): string {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(`formatNumber: expected a finite number, got ${value}`);
  }
  if (Number.isInteger(value)) return formatInteger(locale, value, config);
  const fixed = Math.abs(value)
    .toFixed(maxFractionDigits)
    .replace(/\.?0+$/, '');
  const [whole = '0', fraction] = fixed.split('.');
  const sign = value < 0 && fixed !== '0' ? '-' : '';
  const grouped = groupDigits(whole, config.grouping);
  return localizeDigits(
    locale,
    `${sign}${grouped}${fraction === undefined ? '' : `.${fraction}`}`,
    config,
  );
}

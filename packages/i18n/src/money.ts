/**
 * PKR amount formatting — I18N-007 (BP §37: local currency conventions).
 *
 * The server stores money as BigInt paisa (`*_minor` columns, T2.3; 100 paisa = 1 rupee) and
 * computes every amount (BP §15.1, §29). The app only formats what the server returns:
 * `formatPkrMinor` takes the paisa value (a bigint, or the decimal-integer string a JSON body
 * carries) so no screen ever divides by 100 by hand or goes through a floating-point number.
 *
 * Format (OQ-079 TODO(OWNER), switch in config.ts): default CLDR en-PK / ur-PK, "Rs 2,500".
 * Whole rupees show no decimals; a paisa remainder shows two decimals ("Rs 2,500.50").
 * In Urdu the result is wrapped in bidi isolates so it keeps its order inside an RTL sentence
 * (I18N-003).
 */
import { NUMBER_DISPLAY, type NumberDisplayConfig } from './config.js';
import { isolateLtr } from './bidi.js';
import { type Locale } from './locale.js';
import { messageTemplate } from './translate.js';
import { formatInteger, localizeDigits } from './numbers.js';

const PAISA_PER_RUPEE = 100n;
const MINOR_UNITS = /^-?\d+$/;

/** Parses a paisa amount from a bigint or a decimal-integer string (JSON-safe form). */
export function parseMinorUnits(paisa: bigint | string): bigint {
  if (typeof paisa === 'bigint') return paisa;
  if (!MINOR_UNITS.test(paisa)) {
    throw new RangeError(`formatPkrMinor: expected whole paisa as digits, got "${paisa}"`);
  }
  return BigInt(paisa);
}

function assemble(
  locale: Locale,
  negative: boolean,
  number: string,
  config: NumberDisplayConfig,
): string {
  const sign = negative ? '-' : '';
  if (locale === 'ur' && config.urduCurrency === 'word-after') {
    const word = messageTemplate('ur', 'common.money.rupeesWord');
    return `${isolateLtr(locale, `${sign}${number}`)} ${word}`;
  }
  return isolateLtr(locale, `${sign}${config.currencySymbol} ${number}`);
}

/** Formats an amount in paisa, e.g. 380000n → "Rs 3,800"; 250050n → "Rs 2,500.50". */
export function formatPkrMinor(
  locale: Locale,
  paisa: bigint | string,
  config: NumberDisplayConfig = NUMBER_DISPLAY,
): string {
  const value = parseMinorUnits(paisa);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const rupees = formatInteger(locale, abs / PAISA_PER_RUPEE, config);
  const rest = abs % PAISA_PER_RUPEE;
  const number =
    rest === 0n
      ? rupees
      : `${rupees}${localizeDigits(locale, `.${rest.toString().padStart(2, '0')}`, config)}`;
  return assemble(locale, negative, number, config);
}

/**
 * Formats a whole-rupee amount (T0.6 API, kept for display samples). Prefer `formatPkrMinor`
 * for anything that comes from the server.
 */
export function formatPkr(
  locale: Locale,
  rupees: number,
  config: NumberDisplayConfig = NUMBER_DISPLAY,
): string {
  if (!Number.isSafeInteger(rupees)) {
    throw new RangeError(`formatPkr: expected a whole number of rupees, got ${rupees}`);
  }
  return assemble(locale, rupees < 0, formatInteger(locale, Math.abs(rupees), config), config);
}

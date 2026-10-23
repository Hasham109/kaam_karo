/**
 * PKR amount formatting — I18N-007 (BP §37: local currency conventions).
 *
 * Format follows CLDR for en-PK and ur-PK (both: symbol "Rs", a space, Latin digits, groups of
 * three, no decimals for whole rupees), e.g. `Rs 2,500`. It is written by hand rather than with
 * `Intl.NumberFormat` so the output is identical in Node tests and in Hermes on any Android
 * device. Whether Urdu screens should say "روپے" or use South Asian (lakh) grouping is open:
 * OQ-079 (TODO(OWNER)); this function is the single place to change it.
 *
 * Amounts here are display-only. The server computes every price (BP §15.1, §29).
 */
import { isolateLtr, type Locale } from './locale.js';

const PKR_SYMBOL = 'Rs';

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats a whole-rupee amount. In Urdu the result is wrapped in bidi isolates so it keeps its
 * order inside an RTL sentence (I18N-003).
 */
export function formatPkr(locale: Locale, rupees: number): string {
  if (!Number.isSafeInteger(rupees)) {
    throw new RangeError(`formatPkr: expected a whole number of rupees, got ${rupees}`);
  }
  const sign = rupees < 0 ? '-' : '';
  const text = `${sign}${PKR_SYMBOL} ${groupThousands(String(Math.abs(rupees)))}`;
  return isolateLtr(locale, text);
}

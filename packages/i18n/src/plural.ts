/**
 * Plural categories — I18N-001 (BP §78.1: full Urdu support, no string concatenation).
 *
 * CLDR plural rules for both English and Urdu are the same: category `one` when the number is
 * exactly 1 with no visible fraction (i = 1 and v = 0), `other` for everything else (0, 2, 1.5).
 * Written by hand (no `Intl.PluralRules`) so Node tests and Hermes give the same answer.
 * A plural message is two catalog keys, `<base>.one` and `<base>.other`, with the same
 * placeholders; `translatePlural` picks one.
 */
import { type Locale } from './locale.js';

export type PluralCategory = 'one' | 'other';

export function pluralCategory(_locale: Locale, count: number | bigint): PluralCategory {
  if (typeof count === 'bigint') return count === 1n || count === -1n ? 'one' : 'other';
  if (!Number.isFinite(count)) throw new RangeError(`pluralCategory: not a number: ${count}`);
  return Math.abs(count) === 1 ? 'one' : 'other';
}

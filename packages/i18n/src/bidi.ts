/**
 * Bidirectional text helpers — I18N-003, I18N-005 (BP §78.2: RTL mirroring; no careless mixing).
 *
 * Urdu is right-to-left, but amounts, phone numbers, booking IDs, times and English names are
 * left-to-right runs inside it. Without isolation the Unicode bidi algorithm (UAX #9) can move
 * punctuation or reverse the order of the pieces ("Rs 2,500" next to Urdu words, "0300 1234567"
 * at the end of a sentence). We wrap such runs in Unicode isolates:
 *  - LRI … PDI  for content that is always left-to-right (numbers, phones, IDs, amounts),
 *  - FSI … PDI  for content whose direction we do not know (names, server-provided text).
 *
 * The control characters are built with String.fromCodePoint so that no invisible character is
 * ever pasted into the source (T0.6). Phone numbers, amounts and IDs are never mirrored
 * (customer.md §2.6, partner.md G4).
 */
import { type Locale, textDirection } from './locale.js';

export const LRI = String.fromCodePoint(0x2066);
export const RLI = String.fromCodePoint(0x2067);
export const FSI = String.fromCodePoint(0x2068);
export const PDI = String.fromCodePoint(0x2069);

const OPENERS = new Set([LRI, RLI, FSI]);
const BIDI_CONTROLS = /[‎‏‪-‮⁦-⁩]/g;
const RTL_SCRIPT = /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u;

/** True when the whole value is already one isolate (so it is not wrapped twice). */
export function isIsolated(value: string): boolean {
  return value.length >= 2 && OPENERS.has(value.charAt(0)) && value.endsWith(PDI);
}

/** True when the text contains right-to-left letters (Urdu, Arabic, …). */
export function hasRtlText(value: string): boolean {
  return RTL_SCRIPT.test(value);
}

/**
 * I18N-003: wrap an always-LTR value (amount, number, code) so it keeps its order inside an
 * Urdu sentence. English text needs no isolation.
 */
export function isolateLtr(locale: Locale, value: string): string {
  if (textDirection(locale) !== 'rtl' || value === '' || isIsolated(value)) return value;
  return `${LRI}${value}${PDI}`;
}

/** I18N-003: phone numbers stay left-to-right in every language (customer.md §2.6). */
export function isolatePhone(locale: Locale, phone: string): string {
  return isolateLtr(locale, phone);
}

/**
 * I18N-005: wrap text of unknown direction (a provider's name, a server value) with a
 * first-strong isolate, so it cannot disturb the sentence around it.
 * - Urdu screens: always isolated.
 * - English screens: isolated only when the value contains RTL letters.
 */
export function isolateAuto(locale: Locale, value: string): string {
  if (value === '' || isIsolated(value)) return value;
  if (textDirection(locale) === 'rtl' || hasRtlText(value)) return `${FSI}${value}${PDI}`;
  return value;
}

/** Removes bidi control characters (for tests, clipboard text and analytics-safe logs). */
export function stripBidiControls(value: string): string {
  return value.replace(BIDI_CONTROLS, '');
}

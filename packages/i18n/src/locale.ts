/**
 * Locales and writing direction.
 * I18N-001 (BP §78.1; D-026): the Customer and Partner apps support English and Urdu.
 * I18N-002 (BP §78.1): the language can be changed at any time (see `otherLocale`).
 * I18N-003 (BP §78.2): Urdu is written right-to-left and the layout is mirrored.
 */
export const SUPPORTED_LOCALES = ['en', 'ur'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type TextDirection = 'ltr' | 'rtl';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function textDirection(locale: Locale): TextDirection {
  return locale === 'ur' ? 'rtl' : 'ltr';
}

/** I18N-002: the language toggle switches between the two supported languages. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'ur' ? 'en' : 'ur';
}

/** Unicode bidi isolates (UAX #9): keep an LTR run (amount, code) intact inside RTL text. */
const LRI = String.fromCodePoint(0x2066);
const PDI = String.fromCodePoint(0x2069);

/**
 * I18N-003 / I18N-005 (BP §78.2): wrap a left-to-right value (an amount, a number) so it keeps
 * its order when it is placed inside an Urdu sentence. English text needs no isolation.
 */
export function isolateLtr(locale: Locale, value: string): string {
  return textDirection(locale) === 'rtl' ? `${LRI}${value}${PDI}` : value;
}

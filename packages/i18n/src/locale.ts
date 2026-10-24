/**
 * Locales and writing direction.
 * I18N-001 (BP §78.1; D-026): the Customer and Partner apps support English and Urdu. The Admin
 * Portal is English only (D-026) but still takes its text from this package.
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

/**
 * I18N-002 (BP §78.1 "inferred from the device language"; customer.md C41 pre-selected value,
 * partner.md P01): the first-run language is the device language if it is Urdu, else English.
 * `deviceTag` is the device's primary BCP 47 tag ("ur-PK", "en-US", …). The user can change
 * the language at any time afterwards.
 */
export function localeFromDevice(deviceTag: string | null | undefined): Locale {
  const language = (deviceTag ?? '').toLowerCase().split(/[-_]/)[0];
  return language === 'ur' ? 'ur' : 'en';
}

export {
  isolateLtr,
  isolatePhone,
  isolateAuto,
  isIsolated,
  hasRtlText,
  LRI,
  RLI,
  FSI,
  PDI,
} from './bidi.js';

/**
 * @kaamkaro/i18n — SKELETON (T2.1, created by A01 under the A00 bootstrap grant).
 * Owner: A14 (T1.4 builds the real kit: catalogs, RTL, Urdu typography, string-lint).
 *
 * I18N-001 (BP §78.1; D-026): the Customer and Partner apps support English and Urdu.
 * I18N-003 (BP §37, §78): Urdu is written right-to-left.
 * I18N-006 (BP §37): user-facing text lives here, not in app code.
 */
export const SUPPORTED_LOCALES = ['en', 'ur'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type TextDirection = 'ltr' | 'rtl';

export function textDirection(locale: Locale): TextDirection {
  return locale === 'ur' ? 'rtl' : 'ltr';
}

/**
 * Placeholder catalog: only the surface names from BP §60 so the app shells render something
 * through i18n. TODO(A14, T1.4): replace with the real catalogs and review the Urdu text.
 */
const MESSAGES = {
  en: {
    'app.customer.name': 'Kaam Karo',
    'app.partner.name': 'Kaam Karo Partner',
  },
  ur: {
    'app.customer.name': 'کام کرو',
    'app.partner.name': 'کام کرو پارٹنر',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof MESSAGES)['en'];

export function translate(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale][key];
}

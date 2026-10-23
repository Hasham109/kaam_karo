/**
 * Message catalogs (I18N-006, BP §37: user-facing text lives outside the app code).
 *
 * The English catalog defines the keys. The Urdu catalog is typed `Record<MessageKey, string>`,
 * so a key missing from Urdu, or an Urdu-only key, is a compile error (I18N-001, BP §78.1).
 *
 * Product strings only. Dev/test-only copy (the T0.6 smoke screen) lives in the separate
 * dev-only catalog `src/dev/smoke-messages.ts` (`@kaamkaro/i18n/dev-smoke`), so it never ships
 * in a release bundle.
 */
export const EN_MESSAGES = {
  'app.customer.name': 'Kaam Karo',
  'app.partner.name': 'Kaam Karo Partner',
} as const;

export type MessageKey = keyof typeof EN_MESSAGES;

export const UR_MESSAGES: Record<MessageKey, string> = {
  'app.customer.name': 'کام کرو',
  'app.partner.name': 'کام کرو پارٹنر',
};

/**
 * `app.*` — app names (brand). Kept from T2.1/T0.6 because both app shells use these keys.
 * The Urdu brand rendering is "کام کرو" everywhere (QA F-02, decided by A14 in T1.4).
 */
export const APP_EN = {
  'app.customer.name': 'Kaam Karo',
  'app.partner.name': 'Kaam Karo Partner',
} as const satisfies Readonly<Record<`app.${string}`, string>>;

export const APP_UR: Readonly<Record<keyof typeof APP_EN, string>> = {
  'app.customer.name': 'کام کرو',
  'app.partner.name': 'کام کرو پارٹنر',
};

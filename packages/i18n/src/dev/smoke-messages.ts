/**
 * DEV-ONLY catalog for the T0.6 Urdu Nastaliq smoke test (condition of D-001; BP §78.2;
 * I18N-004, I18N-008). Entry point `@kaamkaro/i18n/dev-smoke`; it is NOT exported from the main
 * `@kaamkaro/i18n` entry. Only code reached through a `__DEV__`-guarded `require` may import it,
 * so Metro drops it from release bundles (T0.6 QA S4 fix).
 *
 * Test copy, not product copy: `smoke.mixed` deliberately mixes Urdu and English to test bidi
 * rendering (product labels must not do this carelessly, BP §78.2, I18N-005).
 * `smoke.language.toggle` shows the target language in its own script on purpose.
 * Urdu copy is an A14 draft; the owner reads it during T0.6.
 * Same parity rule as the product catalog: a missing Urdu key is a compile error (I18N-001).
 */
import { type Locale } from '../locale.js';
import { type MessageParams, fillTemplate } from '../translate.js';

export const SMOKE_EN = {
  'smoke.open': 'Open Urdu display test',
  'smoke.title': 'Urdu display test',
  'smoke.back': 'Back',
  'smoke.language.toggle': 'اردو',
  'smoke.language.toggleA11y': 'Change the language to Urdu',
  'smoke.paragraph.heading': 'Paragraph',
  'smoke.paragraph':
    'Trusted workers for every home in Lahore: electrician, plumber and cleaning. This English paragraph is here to compare line height with the Urdu one.',
  'smoke.mixed.heading': 'Mixed label',
  'smoke.mixed': 'Kaam Karo — AC service',
  'smoke.amount': 'Example amount: {amount}',
  'smoke.digits': 'Digits: {digits}',
  'smoke.input.label': 'Type here',
  'smoke.input.placeholder': 'Type a few words in Urdu',
  'smoke.sheet.open': 'Open bottom sheet',
  'smoke.sheet.title': 'Details',
  'smoke.sheet.body':
    'This sheet opens from the bottom. In Urdu, the text and the close button are on the mirrored side.',
  'smoke.sheet.close': 'Close',
  'smoke.list.heading': 'Sample list',
  'smoke.list.item': 'Sample row {n}',
  'smoke.list.itemHint': 'Opens the bottom sheet',
} as const;

export type SmokeKey = keyof typeof SMOKE_EN;

export const SMOKE_UR: Record<SmokeKey, string> = {
  'smoke.open': 'اردو ڈسپلے ٹیسٹ کھولیں',
  'smoke.title': 'اردو ڈسپلے ٹیسٹ',
  'smoke.back': 'واپس',
  'smoke.language.toggle': 'English',
  'smoke.language.toggleA11y': 'زبان انگریزی میں بدلیں',
  'smoke.paragraph.heading': 'پیراگراف',
  'smoke.paragraph':
    'لاہور کے ہر گھر کے لیے بھروسے مند کاریگر: بجلی، پلمبنگ اور صفائی۔ اِعراب کی جانچ: مُستقبل، اِنتظار، گُلِ لالہ، ٹھیک ہے؟ یہ پیراگراف لائن کی اونچائی اور نقطوں کی جانچ کے لیے ہے۔',
  'smoke.mixed.heading': 'ملا جلا لیبل',
  'smoke.mixed': 'کام کرو — AC service',
  'smoke.amount': 'مثالی رقم: {amount}',
  'smoke.digits': 'ہندسے: {digits}',
  'smoke.input.label': 'یہاں لکھیں',
  'smoke.input.placeholder': 'اردو میں چند الفاظ لکھیں',
  'smoke.sheet.open': 'نیچے والی شیٹ کھولیں',
  'smoke.sheet.title': 'تفصیلات',
  'smoke.sheet.body':
    'یہ شیٹ نیچے سے کھلتی ہے۔ اردو میں متن اور بند کرنے کا بٹن الٹی طرف ہوتے ہیں۔',
  'smoke.sheet.close': 'بند کریں',
  'smoke.list.heading': 'نمونہ فہرست',
  'smoke.list.item': 'نمونہ قطار {n}',
  'smoke.list.itemHint': 'نیچے والی شیٹ کھولتا ہے',
};

const SMOKE_CATALOGS: Readonly<Record<Locale, Readonly<Record<SmokeKey, string>>>> = {
  en: SMOKE_EN,
  ur: SMOKE_UR,
};

export function translateSmoke(locale: Locale, key: SmokeKey, params?: MessageParams): string {
  return fillTemplate(SMOKE_CATALOGS[locale][key], params, `smoke key "${key}" (${locale})`);
}

export function smokeKeys(): SmokeKey[] {
  return Object.keys(SMOKE_EN) as SmokeKey[];
}

export function smokeTemplate(locale: Locale, key: SmokeKey): string {
  return SMOKE_CATALOGS[locale][key];
}

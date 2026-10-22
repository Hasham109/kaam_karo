/**
 * Placeholder screen model (T2.1 SKELETON; owner A11).
 * PLAT-001 (BP §60): separate app shell on the shared platform.
 * I18N-001 / I18N-003 / I18N-006 (BP §37, §78): text comes from @kaamkaro/i18n, one line per
 * supported language with its own writing direction, so a dev build can show Urdu (RTL)
 * rendering on the reference device for the T0.6 smoke test (D-027).
 */
import {
  type Locale,
  type TextDirection,
  SUPPORTED_LOCALES,
  textDirection,
  translate,
} from '@kaamkaro/i18n';

export interface PlaceholderLine {
  readonly locale: Locale;
  readonly text: string;
  readonly direction: TextDirection;
  readonly testID: string;
}

export function placeholderLines(): PlaceholderLine[] {
  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    text: translate(locale, 'app.customer.name'),
    direction: textDirection(locale),
    testID: `placeholder-title-${locale}`,
  }));
}

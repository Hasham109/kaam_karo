/**
 * Display switches for numbers and money — I18N-007 (BP §37: local currency conventions).
 *
 * The owner has NOT decided how Urdu screens show numbers and amounts (OQ-079):
 *  - Latin digits (0-9) or Urdu (Extended Arabic-Indic) digits (۰-۹) on Urdu screens,
 *  - Western grouping (1,234,567) or South Asian lakh grouping (12,34,567),
 *  - "Rs 2,500" (CLDR ur-PK) or "2,500 روپے" (the screen-spec draft, customer.md §2.7),
 *  - "Rs" (CLDR en-PK) or "Rs." (screen-spec draft) as the symbol.
 *
 * TODO(OWNER) OQ-079: every formatter in this package reads NUMBER_DISPLAY, so the answer is a
 * one-line change here. Until then the safe default is CLDR for en-PK / ur-PK: Latin digits,
 * groups of three, "Rs" before the amount. This keeps one format in both languages, matches
 * what Android and most Pakistani apps show, and needs no extra font glyphs.
 *
 * These are display settings only. The server computes every amount (BP §15.1, §29).
 */

/** Digits used on Urdu screens. English always uses Latin digits. */
export type UrduDigitStyle = 'latin' | 'urdu';
/** 'thousands' = 1,234,567; 'lakh' = 12,34,567 (both languages). */
export type DigitGrouping = 'thousands' | 'lakh';
/** 'symbol-before' = "Rs 2,500"; 'word-after' = "2,500 روپے" (Urdu screens only). */
export type UrduCurrencyStyle = 'symbol-before' | 'word-after';
export type CurrencySymbol = 'Rs' | 'Rs.';

export interface NumberDisplayConfig {
  readonly urduDigits: UrduDigitStyle;
  readonly grouping: DigitGrouping;
  readonly urduCurrency: UrduCurrencyStyle;
  readonly currencySymbol: CurrencySymbol;
}

/** TODO(OWNER) OQ-079: safe default (CLDR en-PK / ur-PK) until the owner decides. */
export const NUMBER_DISPLAY: NumberDisplayConfig = {
  urduDigits: 'latin',
  grouping: 'thousands',
  urduCurrency: 'symbol-before',
  currencySymbol: 'Rs',
};

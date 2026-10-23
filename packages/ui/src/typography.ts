/**
 * Typography tokens — I18N-004 (BP §78.2; D-001 condition T0.6), A11Y-001 (BP §38).
 *
 * Urdu uses Noto Nastaliq Urdu (the BP §78.2 candidate), bundled in `assets/fonts/` and embedded
 * by the expo-font config plugin. English uses the Android system font.
 *
 * Line height. Nastaliq needs much more vertical room than Latin text ("avoid compressed Urdu
 * line spacing", BP §78.2). The Urdu ratio is not a chosen number: it is the font's own line box
 * from its `hhea` table, (ascender + |descender|) / unitsPerEm = (1904 + 596) / 1000 = 2.5. A line
 * that tall can never clip the font's marks. T0.6 on the reference phone (D-027) checks whether
 * that is also comfortable to read; a smaller ratio may only be chosen from that evidence.
 * The Latin ratio 1.5 follows WCAG 2.2 SC 1.4.12 (line spacing at least 1.5 × font size).
 *
 * Font sizes are the Material Design 3 type scale (sp), so they follow the user's Android
 * font-size setting.
 */
import { type Locale } from '@kaamkaro/i18n';

/** Android font family = file name without extension (assets/fonts/NotoNastaliqUrdu-Regular.ttf). */
export const URDU_FONT_FAMILY = 'NotoNastaliqUrdu-Regular';
export const URDU_FONT_FILE = 'assets/fonts/NotoNastaliqUrdu-Regular.ttf';

/** `hhea` metrics of the bundled font; a unit test re-reads the file and compares. */
export const URDU_FONT_METRICS = {
  unitsPerEm: 1000,
  ascender: 1904,
  descender: -596,
} as const;

export const LINE_HEIGHT_RATIO = {
  urdu: (URDU_FONT_METRICS.ascender - URDU_FONT_METRICS.descender) / URDU_FONT_METRICS.unitsPerEm,
  latin: 1.5,
} as const;

/** Material Design 3 type scale, in sp. */
export const FONT_SIZE = {
  label: 14,
  body: 16,
  title: 22,
  headline: 24,
} as const;
export type FontSizeName = keyof typeof FONT_SIZE;

/** A11Y-001: the smallest text size the kit uses. */
export const MIN_FONT_SIZE = FONT_SIZE.label;

export interface TextTokens {
  readonly fontFamily: string | undefined;
  readonly fontSize: number;
  readonly lineHeight: number;
}

export function lineHeightFor(locale: Locale, fontSize: number): number {
  const ratio = locale === 'ur' ? LINE_HEIGHT_RATIO.urdu : LINE_HEIGHT_RATIO.latin;
  return Math.ceil(fontSize * ratio);
}

/** Text tokens for a locale and a size. `fontFamily: undefined` = system font. */
export function textTokens(locale: Locale, size: FontSizeName): TextTokens {
  const fontSize = FONT_SIZE[size];
  return {
    fontFamily: locale === 'ur' ? URDU_FONT_FAMILY : undefined,
    fontSize,
    lineHeight: lineHeightFor(locale, fontSize),
  };
}

/**
 * Colour tokens + WCAG contrast — A11Y-001 (BP §38: sufficient contrast).
 *
 * A neutral palette for the T0.6 smoke screen and the first kit components. Brand colours are
 * not decided (no BP rule); TODO(OWNER): replace with the brand palette, keeping the contrast
 * tests green (text ≥ 4.5:1, non-text UI such as borders ≥ 3:1, WCAG 2.2 SC 1.4.3 / 1.4.11).
 */
export const COLOR = {
  background: '#FFFFFF',
  surface: '#F3F4F6',
  text: '#1A1A1A',
  textMuted: '#4B5563',
  primary: '#0B5CAD',
  onPrimary: '#FFFFFF',
  border: '#767676',
  /** Dimmed backdrop behind a bottom sheet (decorative, no text on it). */
  backdrop: 'rgba(0, 0, 0, 0.5)',
} as const;

export const MIN_TEXT_CONTRAST = 4.5;
export const MIN_NON_TEXT_CONTRAST = 3;

/** Text/background pairs the kit uses; every pair must reach MIN_TEXT_CONTRAST. */
export const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  [COLOR.text, COLOR.background],
  [COLOR.text, COLOR.surface],
  [COLOR.textMuted, COLOR.background],
  [COLOR.textMuted, COLOR.surface],
  [COLOR.primary, COLOR.background],
  [COLOR.onPrimary, COLOR.primary],
];

function channel(hex: string, offset: number): number {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of a `#RRGGBB` colour. */
export function relativeLuminance(hex: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) throw new Error(`expected #RRGGBB, got ${hex}`);
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** WCAG 2.x contrast ratio, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
}

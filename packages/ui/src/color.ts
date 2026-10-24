/**
 * Colour tokens + WCAG contrast — A11Y-001, A11Y-003 (BP §38: sufficient contrast, status never colour-alone).
 *
 * A high-contrast palette for the mobile apps and shared UI kit.
 * Text contrast ≥ 4.5:1 (WCAG AA), non-text UI such as borders and icons ≥ 3:1.
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

/**
 * Status colors designed for AA accessibility.
 * Every text/background pair achieves ≥ 4.5:1 contrast.
 */
export const STATUS_THEME = {
  success: {
    text: '#0D6832',
    background: '#E6F4EA',
    border: '#137333',
    icon: 'check-circle',
  },
  info: {
    text: '#0B5CAD',
    background: '#E8F0FE',
    border: '#1A73E8',
    icon: 'info',
  },
  warning: {
    text: '#7A4100',
    background: '#FEF7E0',
    border: '#B06000',
    icon: 'alert-triangle',
  },
  danger: {
    text: '#9A1010',
    background: '#FCE8E6',
    border: '#C5221F',
    icon: 'alert-circle',
  },
  neutral: {
    text: '#374151',
    background: '#F3F4F6',
    border: '#767676',
    icon: 'clock',
  },
} as const;

export type StatusTone = keyof typeof STATUS_THEME;

export interface StatusVisual {
  readonly tone: StatusTone;
  readonly textColor: string;
  readonly backgroundColor: string;
  readonly borderColor: string;
  readonly iconName: string;
}

/**
 * Maps a booking or job status string to its accessible visual presentation.
 * Enforces A11Y-003: status is communicated through color, border, and an icon/text badge.
 */
export function getStatusVisual(status: string): StatusVisual {
  const norm = status.toLowerCase();
  if (['completed', 'approved', 'matched'].includes(norm)) {
    return {
      tone: 'success',
      textColor: STATUS_THEME.success.text,
      backgroundColor: STATUS_THEME.success.background,
      borderColor: STATUS_THEME.success.border,
      iconName: STATUS_THEME.success.icon,
    };
  }
  if (['en_route', 'arrived', 'in_progress', 'scheduled'].includes(norm)) {
    return {
      tone: 'info',
      textColor: STATUS_THEME.info.text,
      backgroundColor: STATUS_THEME.info.background,
      borderColor: STATUS_THEME.info.border,
      iconName: STATUS_THEME.info.icon,
    };
  }
  if (['quote_pending', 'pending_approval', 'paused', 'matching'].includes(norm)) {
    return {
      tone: 'warning',
      textColor: STATUS_THEME.warning.text,
      backgroundColor: STATUS_THEME.warning.background,
      borderColor: STATUS_THEME.warning.border,
      iconName: STATUS_THEME.warning.icon,
    };
  }
  if (['cancelled', 'rejected', 'expired', 'disputed', 'no_show'].includes(norm)) {
    return {
      tone: 'danger',
      textColor: STATUS_THEME.danger.text,
      backgroundColor: STATUS_THEME.danger.background,
      borderColor: STATUS_THEME.danger.border,
      iconName: STATUS_THEME.danger.icon,
    };
  }
  return {
    tone: 'neutral',
    textColor: STATUS_THEME.neutral.text,
    backgroundColor: STATUS_THEME.neutral.background,
    borderColor: STATUS_THEME.neutral.border,
    iconName: STATUS_THEME.neutral.icon,
  };
}

/** Text/background pairs the kit uses; every pair must reach MIN_TEXT_CONTRAST. */
export const TEXT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  [COLOR.text, COLOR.background],
  [COLOR.text, COLOR.surface],
  [COLOR.textMuted, COLOR.background],
  [COLOR.textMuted, COLOR.surface],
  [COLOR.primary, COLOR.background],
  [COLOR.onPrimary, COLOR.primary],
  [STATUS_THEME.success.text, STATUS_THEME.success.background],
  [STATUS_THEME.info.text, STATUS_THEME.info.background],
  [STATUS_THEME.warning.text, STATUS_THEME.warning.background],
  [STATUS_THEME.danger.text, STATUS_THEME.danger.background],
  [STATUS_THEME.neutral.text, STATUS_THEME.neutral.background],
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

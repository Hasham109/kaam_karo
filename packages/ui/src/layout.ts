/**
 * Layout tokens — A11Y-002 (BP §38: large tap targets).
 * MIN_TAP_TARGET_DP follows the Android accessibility guideline (touch targets at least 48 × 48 dp;
 * Material Design 3). Spacing is a 4 dp grid.
 */
export const MIN_TAP_TARGET_DP = 48;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  sheet: 16,
} as const;

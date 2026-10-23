/**
 * @kaamkaro/ui — owner A14 (IMPL §2.2). One UI kit shared by the Customer and Partner apps
 * (PLAT-001, BP §60). Design tokens and RTL helpers are plain TypeScript so they can be unit
 * tested without a device; React Native components come with T1.4 (RQ-002 item 4: every
 * interactive component gets a `testID` and an accessibility label).
 *
 * I18N-003, I18N-004 (BP §78.2); A11Y-001, A11Y-002 (BP §38).
 */
export const UI_PACKAGE_NAME = '@kaamkaro/ui';

export {
  FONT_SIZE,
  type FontSizeName,
  LINE_HEIGHT_RATIO,
  MIN_FONT_SIZE,
  type TextTokens,
  URDU_FONT_FAMILY,
  URDU_FONT_FILE,
  URDU_FONT_METRICS,
  lineHeightFor,
  textTokens,
} from './typography.js';
export {
  COLOR,
  MIN_NON_TEXT_CONTRAST,
  MIN_TEXT_CONTRAST,
  TEXT_PAIRS,
  contrastRatio,
  relativeLuminance,
} from './color.js';
export { MIN_TAP_TARGET_DP, RADIUS, SPACING } from './layout.js';
export {
  type FlexEdge,
  type FlexRow,
  type Mirroring,
  type TextAlignSide,
  mirroring,
} from './rtl.js';

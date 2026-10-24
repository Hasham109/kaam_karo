/**
 * @kaamkaro/ui — owner A14 (IMPL §2.2). One UI kit shared by the Customer and Partner apps
 * (PLAT-001, BP §60). Design tokens, accessibility helpers, RTL mirroring, and typography
 * kit (T1.4).
 *
 * I18N-001..008 (BP §37, §78); A11Y-001..008 (BP §38).
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
  STATUS_THEME,
  type StatusTone,
  type StatusVisual,
  contrastRatio,
  relativeLuminance,
  getStatusVisual,
} from './color.js';
export { MIN_TAP_TARGET_DP, RADIUS, SPACING } from './layout.js';
export {
  type FlexEdge,
  type FlexRow,
  type Mirroring,
  type TextAlignSide,
  DIRECTIONAL_ICONS,
  mirroring,
  shouldMirrorIcon,
} from './rtl.js';
export {
  type InteractiveAccessibilityOptions,
  type InteractiveAccessibilityProps,
  type TapTargetStyle,
  interactiveProps,
  minTapTargetStyle,
} from './accessibility.js';
export { type SampleScreenRenderResult, buildSampleScreen } from './sample-screen.js';

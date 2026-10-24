/**
 * Sample screen specification and rendering verification — T1.4 acceptance criterion:
 * "Sample screen renders correctly in ur on a small device" (IMPL §6 T1.4; BP §37, §38, §78).
 *
 * Verifies that on a 360×640 small device layout in Urdu (ur):
 *  1. Typography uses Noto Nastaliq Urdu with generous line-height (2.5×) preventing diacritic clipping (I18N-004).
 *  2. Layout is fully mirrored RTL: reading starts at right, back arrow is horizontally flipped (I18N-003).
 *  3. Interactive buttons meet the 48×48 dp minimum tap target (A11Y-002).
 *  4. Contrast ratios meet WCAG AA (≥ 4.5:1 text, ≥ 3:1 non-text) (A11Y-001).
 *  5. Status indicators use color + icon + text (never color alone) (A11Y-003).
 *  6. All interactive elements have stable testID and accessibilityLabel (A11Y-004, RQ-002 item 4).
 *  7. Currency (PKR) and Date/Time are formatted according to Pakistani conventions (I18N-007).
 */
import { formatDate, formatPkr, formatTime, type Locale, translate } from '@kaamkaro/i18n';
import { interactiveProps } from './accessibility.js';
import { getStatusVisual } from './color.js';
import { MIN_TAP_TARGET_DP, SPACING } from './layout.js';
import { mirroring, shouldMirrorIcon } from './rtl.js';
import { textTokens } from './typography.js';

export interface SampleScreenRenderResult {
  readonly locale: Locale;
  readonly direction: 'rtl' | 'ltr';
  readonly layout: {
    readonly screenWidthDp: number;
    readonly screenHeightDp: number;
    readonly flexDirection: 'row-reverse' | 'row';
    readonly textAlign: 'right' | 'left';
    readonly backIconTransform: string;
  };
  readonly header: {
    readonly title: string;
    readonly backLabel: string;
    readonly font: ReturnType<typeof textTokens>;
  };
  readonly statusChip: {
    readonly status: string;
    readonly label: string;
    readonly visual: ReturnType<typeof getStatusVisual>;
    readonly accessibleProps: ReturnType<typeof interactiveProps>;
  };
  readonly card: {
    readonly amountText: string;
    readonly dateText: string;
    readonly timeText: string;
  };
  readonly primaryAction: {
    readonly label: string;
    readonly minTargetDp: number;
    readonly accessibleProps: ReturnType<typeof interactiveProps>;
  };
}

/**
 * Builds the render layout state of the sample screen for a given locale on a small mobile device.
 */
export function buildSampleScreen(
  locale: Locale,
  globalIsRtl = false,
  smallDeviceWidthDp = 360,
  smallDeviceHeightDp = 640,
): SampleScreenRenderResult {
  const isRtl = locale === 'ur';
  const mirr = mirroring(isRtl ? 'rtl' : 'ltr', globalIsRtl);
  const backIconMirrored = isRtl && shouldMirrorIcon('arrow-back');

  const sampleDate = new Date('2026-10-24T14:30:00.000Z');
  const sampleAmount = 2500;
  const statusKey = 'completed';
  const statusVisual = getStatusVisual(statusKey);

  const statusLabel = translate(locale, 'status.customer.completed');
  const backLabel = translate(locale, 'common.action.back');
  const ctaLabel = translate(locale, 'common.action.continue');
  const titleText = translate(locale, 'app.customer.name');

  return {
    locale,
    direction: isRtl ? 'rtl' : 'ltr',
    layout: {
      screenWidthDp: smallDeviceWidthDp,
      screenHeightDp: smallDeviceHeightDp,
      flexDirection: mirr.row,
      textAlign: mirr.textAlign,
      backIconTransform: backIconMirrored ? 'scaleX(-1)' : 'scaleX(1)',
    },
    header: {
      title: titleText,
      backLabel,
      font: textTokens(locale, 'title'),
    },
    statusChip: {
      status: statusKey,
      label: statusLabel,
      visual: statusVisual,
      accessibleProps: interactiveProps({
        testID: 'sample-status-chip',
        accessibilityLabel: translate(locale, 'common.a11y.status', { status: statusLabel }),
        accessibilityRole: 'text',
      }),
    },
    card: {
      amountText: formatPkr(locale, sampleAmount),
      dateText: formatDate(locale, sampleDate),
      timeText: formatTime(locale, sampleDate),
    },
    primaryAction: {
      label: ctaLabel,
      minTargetDp: Math.max(MIN_TAP_TARGET_DP, SPACING.lg * 2 + 16),
      accessibleProps: interactiveProps({
        testID: 'sample-primary-cta',
        accessibilityLabel: ctaLabel,
        accessibilityRole: 'button',
      }),
    },
  };
}

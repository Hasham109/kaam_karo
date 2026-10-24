/**
 * RTL mirroring — I18N-002, I18N-003 (BP §78.1, §78.2: "text alignment, icons, arrows, order of
 * controls and sheets must be mirrored").
 *
 * Approach (tested in T0.6): mirroring is computed per screen from the selected app language,
 * so the language can change at any time without restarting the app (I18N-002). We do not call
 * `I18nManager.forceRTL`, which needs an app restart.
 *
 * React Native can still be globally RTL on its own when the phone's system language is RTL
 * (`I18nManager.isRTL`). In that case Yoga already lays rows out right-to-left and swaps
 * `textAlign: 'left'|'right'`. So every helper takes `globalIsRtl` and only flips what is still
 * needed: flip = (wanted direction is RTL) XOR (React Native is already RTL).
 *
 * Icons and arrows are drawn pointing "forward" in LTR (to the right) and mirrored with a
 * transform when the wanted direction is RTL. Transforms are not affected by Yoga direction, so
 * the icon rule depends only on the wanted direction.
 */
import { type TextDirection } from '@kaamkaro/i18n';

export type FlexRow = 'row' | 'row-reverse';
export type TextAlignSide = 'left' | 'right';
export type FlexEdge = 'flex-start' | 'flex-end';

export interface Mirroring {
  /** The wanted reading direction (from the app language). */
  readonly direction: TextDirection;
  /** flexDirection for a row of controls whose first child is at the reading start. */
  readonly row: FlexRow;
  /** textAlign that puts text at the reading start. */
  readonly textAlign: TextAlignSide;
  /** alignItems/alignSelf value for the reading start / end edge. */
  readonly alignStart: FlexEdge;
  readonly alignEnd: FlexEdge;
  /** writingDirection for Text (honoured on iOS; Android uses the text's own direction). */
  readonly writingDirection: TextDirection;
  /** Horizontal scale for directional icons and arrows (1 = as drawn, -1 = mirrored). */
  readonly iconScaleX: 1 | -1;
}

export function mirroring(direction: TextDirection, globalIsRtl: boolean): Mirroring {
  const flip = (direction === 'rtl') !== globalIsRtl;
  return {
    direction,
    row: flip ? 'row-reverse' : 'row',
    textAlign: flip ? 'right' : 'left',
    alignStart: flip ? 'flex-end' : 'flex-start',
    alignEnd: flip ? 'flex-start' : 'flex-end',
    writingDirection: direction,
    iconScaleX: direction === 'rtl' ? -1 : 1,
  };
}

/**
 * Directional icon names that indicate navigation forward/backward or progress.
 * In RTL layouts, these icons must be horizontally flipped (iconScaleX = -1).
 */
export const DIRECTIONAL_ICONS: ReadonlySet<string> = new Set([
  'arrow-back',
  'arrow-forward',
  'arrow-left',
  'arrow-right',
  'chevron-left',
  'chevron-right',
  'navigate-next',
  'navigate-before',
  'undo',
  'redo',
  'forward',
  'reply',
  'send',
]);

/**
 * Determines whether a given icon should be horizontally mirrored in RTL mode.
 * Directional icons (arrows, chevrons) mirror; media playback, clocks, checks, phones do NOT.
 */
export function shouldMirrorIcon(iconName: string): boolean {
  return DIRECTIONAL_ICONS.has(iconName.toLowerCase());
}

/**
 * Accessibility helpers — A11Y-001..004 (BP §38; RQ-002 item 4).
 *
 * Enforces:
 *  - Every interactive component receives a stable `testID` and `accessibilityLabel` (A11Y-004).
 *  - Tap targets meet the minimum dimensions of 48×48 dp (A11Y-002).
 *  - Status components communicate state with both text/icon and color (A11Y-003).
 */
import { MIN_TAP_TARGET_DP } from './layout.js';

export interface InteractiveAccessibilityOptions {
  /** Stable test identifier for Maestro automated E2E testing (RQ-002 item 4). */
  readonly testID: string;
  /** Descriptive label read aloud by screen readers (TalkBack / VoiceOver). */
  readonly accessibilityLabel: string;
  /** Optional accessibility role (button, header, link, image, etc.). */
  readonly accessibilityRole?:
    'button' | 'header' | 'link' | 'image' | 'text' | 'search' | undefined;
  /** Optional extra hint describing action outcome. */
  readonly accessibilityHint?: string | undefined;
  /** Optional state attributes (disabled, selected, checked, busy). */
  readonly accessibilityState?:
    | {
        readonly disabled?: boolean | undefined;
        readonly selected?: boolean | undefined;
        readonly checked?: boolean | 'mixed' | undefined;
        readonly busy?: boolean | undefined;
      }
    | undefined;
}

export interface InteractiveAccessibilityProps {
  readonly testID: string;
  readonly accessible: true;
  readonly accessibilityLabel: string;
  readonly accessibilityRole?: string | undefined;
  readonly accessibilityHint?: string | undefined;
  readonly accessibilityState?: Record<string, boolean | string | undefined> | undefined;
}

/**
 * Builds standard accessible props for any clickable or interactive UI element.
 */
export function interactiveProps(
  options: InteractiveAccessibilityOptions,
): InteractiveAccessibilityProps {
  if (!options.testID || !options.testID.trim()) {
    throw new Error('interactiveProps: testID is mandatory and cannot be empty (RQ-002 item 4).');
  }
  if (!options.accessibilityLabel || !options.accessibilityLabel.trim()) {
    throw new Error(
      `interactiveProps: accessibilityLabel is mandatory for testID "${options.testID}" (A11Y-004).`,
    );
  }

  return {
    testID: options.testID,
    accessible: true,
    accessibilityLabel: options.accessibilityLabel,
    accessibilityRole: options.accessibilityRole ?? 'button',
    accessibilityHint: options.accessibilityHint,
    accessibilityState: options.accessibilityState,
  };
}

export interface TapTargetStyle {
  readonly minWidth: number;
  readonly minHeight: number;
}

/**
 * Returns style constraints ensuring interactive elements meet the minimum 48×48 dp target size.
 */
export function minTapTargetStyle(): TapTargetStyle {
  return {
    minWidth: MIN_TAP_TARGET_DP,
    minHeight: MIN_TAP_TARGET_DP,
  };
}

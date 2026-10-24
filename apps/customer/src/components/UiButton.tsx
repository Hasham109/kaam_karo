/**
 * Accessible button meeting A11Y-002 (48x48dp minimum tap target).
 */
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import type { Locale } from '@kaamkaro/i18n';
import {
  COLOR,
  interactiveProps,
  minTapTargetStyle,
  RADIUS,
  SPACING,
  textTokens,
} from '@kaamkaro/ui';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text' | 'danger';

export interface UiButtonProps {
  readonly title: string;
  readonly onPress: () => void;
  readonly locale: Locale;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly testID: string;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly style?: ViewStyle;
}

export function UiButton({
  title,
  onPress,
  locale,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
  style,
}: UiButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  const a11y = interactiveProps({
    testID,
    accessibilityRole: 'button',
    accessibilityLabel: accessibilityLabel ?? title,
    accessibilityHint,
    accessibilityState: {
      disabled: isDisabled,
      busy: loading,
    },
  });

  return (
    <TouchableOpacity
      {...a11y}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        minTapTargetStyle(),
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? COLOR.onPrimary : COLOR.primary}
        />
      ) : (
        <Text
          style={[
            styles.text,
            textTokens(locale, 'label'),
            variantTextStyles[variant],
            isDisabled && styles.disabledText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: COLOR.textMuted,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: COLOR.primary,
  },
  secondary: {
    backgroundColor: COLOR.surface,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  text: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: '#9A1010',
  },
});

const variantTextStyles = StyleSheet.create({
  primary: {
    color: COLOR.onPrimary,
  },
  secondary: {
    color: COLOR.text,
  },
  outline: {
    color: COLOR.text,
  },
  text: {
    color: COLOR.primary,
  },
  danger: {
    color: '#FFFFFF',
  },
});

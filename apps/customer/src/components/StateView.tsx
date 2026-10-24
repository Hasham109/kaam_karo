/**
 * StateView — handles L (Loading), E (Empty), X (Error), P (Pending) states (BP §45, §31.1; UX-SCREEN-003).
 * Buttons that repeat the action are disabled during flight (REL-003).
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { type Locale, translate } from '@kaamkaro/i18n';
import { COLOR, SPACING, textTokens } from '@kaamkaro/ui';
import { UiButton } from './UiButton';

export interface StateViewProps {
  readonly state: 'L' | 'E' | 'X' | 'P';
  readonly locale: Locale;
  readonly message?: string;
  readonly onRetry?: () => void;
  readonly onCheckAgain?: () => void;
  readonly nextStepLabel?: string;
  readonly onNextStep?: () => void;
  readonly testID?: string;
}

export function StateView({
  state,
  locale,
  message,
  onRetry,
  onCheckAgain,
  nextStepLabel,
  onNextStep,
  testID,
}: StateViewProps): React.JSX.Element {
  if (state === 'L') {
    return (
      <View testID={testID ?? 'state-loading'} style={styles.container}>
        <ActivityIndicator size="large" color={COLOR.primary} />
        <Text style={[styles.text, textTokens(locale, 'body')]}>
          {message ?? translate(locale, 'common.state.loading')}
        </Text>
      </View>
    );
  }

  if (state === 'E') {
    return (
      <View testID={testID ?? 'state-empty'} style={styles.container}>
        <Text style={[styles.icon, { color: COLOR.textMuted }]}>∅</Text>
        <Text style={[styles.text, textTokens(locale, 'body')]}>
          {message ?? translate(locale, 'customer.c08.noResults')}
        </Text>
        {nextStepLabel && onNextStep ? (
          <UiButton
            testID="state-empty-next-action"
            title={nextStepLabel}
            onPress={onNextStep}
            locale={locale}
            variant="outline"
            style={styles.actionButton}
          />
        ) : null}
      </View>
    );
  }

  if (state === 'X') {
    return (
      <View testID={testID ?? 'state-error'} style={styles.container}>
        <Text style={[styles.icon, { color: '#9A1010' }]}>⚠</Text>
        <Text style={[styles.text, textTokens(locale, 'body')]}>
          {message ?? translate(locale, 'common.net.error')}
        </Text>
        {onRetry ? (
          <UiButton
            testID="state-error-retry-action"
            title={translate(locale, 'common.action.retry')}
            onPress={onRetry}
            locale={locale}
            variant="primary"
            style={styles.actionButton}
          />
        ) : null}
      </View>
    );
  }

  // State === 'P' (Pending / unknown)
  return (
    <View testID={testID ?? 'state-pending'} style={styles.container}>
      <ActivityIndicator size="small" color="#7A4100" />
      <Text style={[styles.text, textTokens(locale, 'body'), { color: '#7A4100' }]}>
        {message ?? translate(locale, 'common.write.pending')}
      </Text>
      {onCheckAgain ? (
        <UiButton
          testID="state-pending-check-action"
          title={translate(locale, 'common.action.checkAgain')}
          onPress={onCheckAgain}
          locale={locale}
          variant="outline"
          style={styles.actionButton}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    gap: SPACING.md,
  },
  icon: {
    fontSize: 36,
  },
  text: {
    textAlign: 'center',
    color: COLOR.text,
  },
  actionButton: {
    marginTop: SPACING.sm,
    minWidth: 160,
  },
});

/**
 * C02 Welcome Screen (BP §12, docs/screens/customer.md).
 * Purpose: value proposition + sign in / register / continue as guest.
 * Requirement IDs: UX-SCREEN-001, UX-SCREEN-005 (OQ-008), SEC-AUTH-001.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import { COLOR, SPACING, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { UiButton } from '../components/UiButton';
import { useCustomerApp } from '../state/CustomerContext';

export function C02WelcomeScreen(): React.JSX.Element {
  const { locale, navigate, setIsGuest } = useCustomerApp();

  const handleGuest = () => {
    setIsGuest(true);
    navigate('C06');
  };

  return (
    <ScreenContainer testID="c02-welcome-screen" showBackButton={false} showLanguageToggle={true}>
      <View style={styles.content}>
        <View style={styles.heroBox}>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>★</Text>
          </View>
          <Text style={[styles.appName, textTokens(locale, 'title')]}>
            {translate(locale, 'app.customer.name')}
          </Text>
          <Text testID="c02-value-prop" style={[styles.valueProp, textTokens(locale, 'body')]}>
            {translate(locale, 'customer.c02.valueProp')}
          </Text>
        </View>

        <View style={styles.actions}>
          <UiButton
            testID="c02-login-button"
            title={translate(locale, 'customer.c02.login')}
            onPress={() => navigate('C03')}
            locale={locale}
            variant="primary"
            style={styles.button}
          />
          <UiButton
            testID="c02-register-button"
            title={translate(locale, 'customer.c02.register')}
            onPress={() => navigate('C03')}
            locale={locale}
            variant="secondary"
            style={styles.button}
          />
          <UiButton
            testID="c02-guest-button"
            title={translate(locale, 'customer.c02.guest')}
            onPress={handleGuest}
            locale={locale}
            variant="outline"
            style={styles.button}
          />
          <UiButton
            testID="c02-language-button"
            title={translate(locale, 'customer.c02.language')}
            onPress={() => navigate('C41', { returnTo: 'C02' })}
            locale={locale}
            variant="text"
            style={styles.button}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
  },
  heroBox: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F0FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  badgeIcon: {
    fontSize: 32,
    color: COLOR.primary,
  },
  appName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLOR.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  valueProp: {
    color: COLOR.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  button: {
    width: '100%',
  },
});

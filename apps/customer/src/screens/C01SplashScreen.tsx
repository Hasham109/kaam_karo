/**
 * C01 Splash / App Start (BP §12, docs/screens/customer.md).
 * Purpose: brand and loading; no business action.
 * Exits: C41 (first launch), C02 (no session), C06 (valid session).
 * Requirement IDs: UX-SCREEN-001, UX-SCREEN-003, I18N-002, PERF-001, ANALYTICS-001.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import { COLOR, SPACING, textTokens } from '@kaamkaro/ui';
import { useCustomerApp } from '../state/CustomerContext';

export function C01SplashScreen(): React.JSX.Element {
  const { locale, navigate, user, isGuest } = useCustomerApp();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Session check simulation: never blocks splash (PERF-001)
    const timer = setTimeout(() => {
      setChecking(false);
      if (user || isGuest) {
        navigate('C06');
      } else {
        navigate('C02');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [user, isGuest, navigate]);

  return (
    <View testID="c01-splash-screen" style={styles.container}>
      <View style={styles.brandBox}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>⚒</Text>
        </View>
        <Text testID="c01-brand-title" style={[styles.title, textTokens(locale, 'title')]}>
          {translate(locale, 'app.customer.name')}
        </Text>
        <Text style={[styles.tagline, textTokens(locale, 'body')]}>
          {translate(locale, 'customer.c01.tagline')}
        </Text>
      </View>

      <View style={styles.footer}>
        {checking ? (
          <ActivityIndicator testID="c01-splash-loader" size="large" color={COLOR.primary} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  brandBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLOR.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  logoIcon: {
    fontSize: 40,
    color: COLOR.onPrimary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLOR.text,
    textAlign: 'center',
  },
  tagline: {
    marginTop: SPACING.sm,
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  footer: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/**
 * C05 OTP Verification Screen (BP §12, docs/screens/customer.md).
 * Purpose: code verification and retry controls.
 * Requirement IDs: SEC-AUTH-001, SEC-AUTH-002, SEC-AUTH-004, SEC-AUTH-006, ABUSE-009.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { UiButton } from '../components/UiButton';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';
import type { OtpMode } from '../types';

export function C05OtpScreen(): React.JSX.Element {
  const { locale, navigate, screenParams, setUser } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const params = screenParams as
    { phone?: string; mode?: OtpMode; isNewUser?: boolean; returnTo?: string } | undefined;

  const phone = params?.phone ?? '+92 300 1234567';
  const mode = params?.mode ?? 'login';
  const isNewUser = params?.isNewUser ?? false;

  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(30);
  const [loading, setLoading] = useState(false);
  const [triesLeft, setTriesLeft] = useState(3);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const getHeadingKey = () => {
    switch (mode) {
      case 'changeNumberCurrent':
        return 'customer.c05.modeCurrentNumber';
      case 'changeNumberNew':
        return 'customer.c05.modeNewNumber';
      case 'delete':
        return 'customer.c05.modeDelete';
      case 'login':
      default:
        return 'customer.c05.modeLogin';
    }
  };

  const handleVerify = () => {
    const cleaned = code.trim();
    if (cleaned.length < 4) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setLoading(false);
      // Valid OTP test rule: "123456" or any 6 digits for testing
      if (cleaned === '000000') {
        const remaining = triesLeft - 1;
        setTriesLeft(remaining);
        if (remaining <= 0) {
          setErrorMessage(translate(locale, 'customer.c05.codeExhausted'));
        } else {
          setErrorMessage(translate(locale, 'customer.c05.wrongCode', { n: remaining.toString() }));
        }
        return;
      }

      if (isNewUser) {
        navigate('C04', { phone });
      } else {
        setUser({
          id: 'user-verified-01',
          phone,
          name: 'Ahmed Tariq',
          city: 'Lahore',
          area: 'Gulberg III',
        });
        navigate('C06');
      }
    }, 450);
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    setCooldown(30);
    setCode('');
    setErrorMessage(null);
  };

  return (
    <ScreenContainer testID="c05-otp-screen" title={translate(locale, getHeadingKey())}>
      <View style={styles.content}>
        <Text
          testID="c05-mode-heading"
          style={[styles.heading, textTokens(locale, 'title'), { textAlign: mirror.textAlign }]}
        >
          {translate(locale, getHeadingKey())}
        </Text>

        <Text
          testID="c05-prompt-text"
          style={[styles.prompt, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
        >
          {translate(locale, 'customer.c05.codePrompt', { number: phone })}
        </Text>

        <View style={styles.form}>
          <TextInput
            testID="c05-code-input"
            value={code}
            onChangeText={(text) => {
              setCode(text);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="······"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!loading}
            style={[styles.codeInput, textTokens(locale, 'title')]}
            accessibilityLabel={translate(locale, 'customer.c05.codePrompt', { number: phone })}
          />

          {cooldown > 0 ? (
            <Text
              testID="c05-cooldown-timer"
              style={[
                styles.timerText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c05.resendTimer', { s: cooldown.toString() })}
            </Text>
          ) : null}

          {errorMessage ? (
            <Text
              testID="c05-error-text"
              style={[
                styles.errorText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {errorMessage}
            </Text>
          ) : null}

          <UiButton
            testID="c05-verify-button"
            title={
              loading
                ? translate(locale, 'customer.c05.checking')
                : translate(locale, 'customer.c05.verify')
            }
            onPress={handleVerify}
            locale={locale}
            variant="primary"
            loading={loading}
            disabled={loading || code.trim().length === 0}
            style={styles.verifyButton}
          />

          <View style={styles.secondaryActions}>
            <UiButton
              testID="c05-resend-button"
              title={translate(locale, 'customer.c05.resendCode')}
              onPress={handleResend}
              locale={locale}
              variant="outline"
              disabled={cooldown > 0 || loading}
              style={styles.secondaryButton}
            />

            <UiButton
              testID="c05-change-number-button"
              title={translate(locale, 'customer.c05.changeNumber')}
              onPress={() => navigate('C03')}
              locale={locale}
              variant="text"
              style={styles.secondaryButton}
            />
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: SPACING.md,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR.text,
    marginBottom: SPACING.xs,
  },
  prompt: {
    color: COLOR.textMuted,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  form: {
    gap: SPACING.md,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FAFAFA',
    paddingVertical: SPACING.md,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 10,
    color: COLOR.text,
    minHeight: 56,
  },
  timerText: {
    color: COLOR.textMuted,
  },
  errorText: {
    color: '#9A1010',
  },
  verifyButton: {
    marginTop: SPACING.sm,
  },
  secondaryActions: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  secondaryButton: {
    width: '100%',
  },
});

/**
 * C03 Login Screen (BP §12, D-002, ARCH §3.1, docs/screens/customer.md).
 * Single entry for login and sign-up: phone number -> OTP.
 * Never reveals account registration status (SEC-REVIEW #9).
 * Requirement IDs: SEC-AUTH-001, SEC-AUTH-004, SEC-AUTH-006, UX-SCREEN-004, ABUSE-002.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { isolatePhone, translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { UiButton } from '../components/UiButton';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';

export function C03LoginScreen(): React.JSX.Element {
  const { locale, navigate } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendCode = () => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (!cleaned) {
      setErrorMessage(translate(locale, 'customer.c03.emptyPhone'));
      return;
    }

    if (cleaned.length < 10) {
      setErrorMessage(translate(locale, 'customer.c03.invalidPhone'));
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    // Mock network call with OTP request
    setTimeout(() => {
      setLoading(false);
      // Determine if new user based on number for test flow (numbers starting with 300 are existing, others new)
      const isNewUser = !cleaned.startsWith('300');
      navigate('C05', {
        phone: isolatePhone(locale, `+92 ${cleaned}`),
        mode: 'login',
        isNewUser,
      });
    }, 450);
  };

  return (
    <ScreenContainer testID="c03-login-screen" title={translate(locale, 'customer.c02.login')}>
      <View style={styles.content}>
        <Text
          testID="c03-heading"
          style={[styles.heading, textTokens(locale, 'title'), { textAlign: mirror.textAlign }]}
        >
          {translate(locale, 'customer.c03.heading')}
        </Text>

        <View style={styles.form}>
          <Text
            style={[styles.label, textTokens(locale, 'label'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c03.phoneLabel')}
          </Text>

          <View style={[styles.inputRow, { flexDirection: 'row' }]}>
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryCodeText}>+92</Text>
            </View>

            <TextInput
              testID="c03-phone-input"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={translate(locale, 'customer.c03.phonePlaceholder')}
              keyboardType="number-pad"
              autoFocus
              editable={!loading}
              style={[styles.phoneInput, textTokens(locale, 'body')]}
              accessibilityLabel={translate(locale, 'customer.c03.phoneLabel')}
            />
          </View>

          {errorMessage ? (
            <Text
              testID="c03-error-text"
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
            testID="c03-send-code-button"
            title={
              loading
                ? translate(locale, 'common.state.sending')
                : translate(locale, 'customer.c03.sendCode')
            }
            onPress={handleSendCode}
            locale={locale}
            variant="primary"
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />
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
    marginBottom: SPACING.xl,
  },
  form: {
    gap: SPACING.sm,
  },
  label: {
    fontWeight: '600',
    color: COLOR.textMuted,
  },
  inputRow: {
    direction: 'ltr', // Phone numbers always stay LTR per BP §78.2
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FAFAFA',
    minHeight: 52,
  },
  countryCodeBadge: {
    paddingHorizontal: SPACING.md,
    borderRightWidth: 1,
    borderRightColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLOR.text,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    color: COLOR.text,
  },
  errorText: {
    color: '#9A1010',
    marginTop: SPACING.xs,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
});

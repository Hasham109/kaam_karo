/**
 * C04 Register Screen (BP §12, D-002, ARCH §3.1, docs/screens/customer.md).
 * Purpose: new-user details AFTER OTP verification: name, city, optional area, terms.
 * Requirement IDs: SEC-AUTH-001, UX-SCREEN-004, SCOPE-GEO-001, SCOPE-GEO-002.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { UiButton } from '../components/UiButton';
import { MOCK_CITIES } from '../data/mock-data';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';

export function C04RegisterScreen(): React.JSX.Element {
  const {
    locale,
    navigate,
    screenParams,
    setUser,
    setSelectedCity: setGlobalCity,
  } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const phone = (screenParams as { phone?: string })?.phone ?? '+92 300 1234567';

  const [name, setName] = useState('');
  const [cityId, setCityId] = useState('lahore');
  const [area, setArea] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fallbackCity = MOCK_CITIES[0] as (typeof MOCK_CITIES)[number];
  const selectedCityObj = MOCK_CITIES.find((c) => c.id === cityId) ?? fallbackCity;
  const isCityActive = selectedCityObj.isActive;

  const handleRegister = () => {
    if (!name.trim()) {
      setErrorMessage(translate(locale, 'customer.c04.nameRequired'));
      return;
    }

    if (!agreeTerms) {
      setErrorMessage(translate(locale, 'customer.c04.termsRequired'));
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const newUser = {
        id: `user-${Date.now()}`,
        phone,
        name: name.trim(),
        city: selectedCityObj.nameEn,
        area: area.trim() || undefined,
      };
      setGlobalCity(selectedCityObj.nameEn);
      setUser(newUser);
      navigate('C06');
    }, 450);
  };

  return (
    <ScreenContainer
      testID="c04-register-screen"
      title={translate(locale, 'customer.c02.register')}
    >
      <View style={styles.content}>
        {/* Verified Phone Banner */}
        <View style={styles.verifiedPhoneBanner}>
          <Text
            style={[
              styles.verifiedPhoneLabel,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c04.phoneVerified')}
          </Text>
          <Text testID="c04-verified-phone-display" style={styles.verifiedPhoneValue}>
            {phone}
          </Text>
        </View>

        <View style={styles.form}>
          {/* Full Name */}
          <Text
            style={[styles.label, textTokens(locale, 'label'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c04.nameLabel')}
          </Text>
          <TextInput
            testID="c04-name-input"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={translate(locale, 'customer.c04.namePlaceholder')}
            style={[styles.input, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
            accessibilityLabel={translate(locale, 'customer.c04.nameLabel')}
          />

          {/* City Selection */}
          <Text
            style={[styles.label, textTokens(locale, 'label'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c04.cityLabel')}
          </Text>
          <View style={[styles.cityRow, { flexDirection: mirror.row }]}>
            {MOCK_CITIES.map((c) => {
              const isSelected = c.id === cityId;
              const cityName = locale === 'ur' ? c.nameUr : c.nameEn;
              return (
                <TouchableOpacity
                  key={c.id}
                  testID={`c04-city-chip-${c.id}`}
                  onPress={() => setCityId(c.id)}
                  style={[
                    styles.cityChip,
                    isSelected ? styles.cityChipSelected : styles.cityChipUnselected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={cityName}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      textTokens(locale, 'body'),
                      isSelected ? styles.cityChipTextSelected : styles.cityChipTextUnselected,
                    ]}
                  >
                    {cityName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Inactive city notice */}
          {!isCityActive ? (
            <View testID="c04-inactive-city-warning" style={styles.inactiveWarning}>
              <Text style={[styles.inactiveWarningText, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c04.inactiveCity', {
                  city: locale === 'ur' ? selectedCityObj.nameUr : selectedCityObj.nameEn,
                })}
              </Text>
            </View>
          ) : null}

          {/* Area (Optional) */}
          <Text
            style={[styles.label, textTokens(locale, 'label'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c04.areaLabel')}
          </Text>
          <TextInput
            testID="c04-area-input"
            value={area}
            onChangeText={setArea}
            placeholder={translate(locale, 'customer.c04.areaPlaceholder')}
            style={[styles.input, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
            accessibilityLabel={translate(locale, 'customer.c04.areaLabel')}
          />

          {/* Terms Checkbox */}
          <TouchableOpacity
            testID="c04-terms-checkbox"
            onPress={() => setAgreeTerms(!agreeTerms)}
            style={[styles.termsRow, { flexDirection: mirror.row }]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreeTerms }}
            accessibilityLabel={translate(locale, 'customer.c04.termsCheckbox')}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
              {agreeTerms ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text
              style={[
                styles.termsText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c04.termsCheckbox')}
            </Text>
          </TouchableOpacity>

          {errorMessage ? (
            <Text
              testID="c04-error-text"
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
            testID="c04-create-account-button"
            title={
              loading
                ? translate(locale, 'common.state.sending')
                : translate(locale, 'customer.c04.createAccount')
            }
            onPress={handleRegister}
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
    paddingTop: SPACING.sm,
  },
  verifiedPhoneBanner: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#137333',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  verifiedPhoneLabel: {
    color: '#0D6832',
    fontWeight: 'bold',
  },
  verifiedPhoneValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D6832',
    direction: 'ltr',
    marginTop: SPACING.xs,
  },
  form: {
    gap: SPACING.sm,
  },
  label: {
    fontWeight: '600',
    color: COLOR.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 48,
    fontSize: 16,
    color: COLOR.text,
  },
  cityRow: {
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  cityChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityChipSelected: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  cityChipUnselected: {
    backgroundColor: COLOR.surface,
    borderColor: COLOR.border,
  },
  cityChipText: {
    fontWeight: '600',
  },
  cityChipTextSelected: {
    color: COLOR.onPrimary,
  },
  cityChipTextUnselected: {
    color: COLOR.text,
  },
  inactiveWarning: {
    backgroundColor: '#FEF7E0',
    borderWidth: 1,
    borderColor: '#B06000',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  inactiveWarningText: {
    color: '#7A4100',
  },
  termsRow: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLOR.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: COLOR.primary,
  },
  checkmark: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  termsText: {
    flex: 1,
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

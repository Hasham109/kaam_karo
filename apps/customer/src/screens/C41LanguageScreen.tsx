/**
 * C41 Language Selection Screen (BP §78.1, ARCH §3.1, docs/screens/customer.md).
 * Purpose: choose English or Urdu; changeable at any time with immediate layout flip.
 * Requirement IDs: I18N-001, I18N-002, I18N-003, VOICE-006, UX-SCREEN-001.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { type Locale, translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { UiButton } from '../components/UiButton';
import { useCustomerApp } from '../state/CustomerContext';
import type { ScreenId } from '../types';
import { getAppMirroring } from '../utils/rtl';

export function C41LanguageScreen(): React.JSX.Element {
  const { locale, setLocale, navigate, screenParams } = useCustomerApp();
  const [selected, setSelected] = useState<Locale>(locale);
  const mirror = getAppMirroring(selected);
  const returnTo = (screenParams as { returnTo?: ScreenId })?.returnTo;
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSelect = (newLoc: Locale) => {
    setSelected(newLoc);
    setLocale(newLoc); // Immediate switch per BP §78.1
    setSavedSuccess(true);
  };

  const handleContinue = () => {
    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate('C02');
    }
  };

  return (
    <ScreenContainer
      testID="c41-language-screen"
      title={translate(selected, 'customer.c41.title')}
      showLanguageToggle={false}
    >
      <View style={styles.content}>
        <Text
          testID="c41-heading"
          style={[styles.heading, textTokens(selected, 'title'), { textAlign: mirror.textAlign }]}
        >
          {translate(selected, 'customer.c41.title')}
        </Text>

        <View style={styles.optionsList}>
          {/* English Option */}
          <TouchableOpacity
            testID="c41-option-en"
            onPress={() => handleSelect('en')}
            style={[
              styles.optionCard,
              { flexDirection: 'row' },
              selected === 'en' && styles.optionCardActive,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === 'en' }}
            accessibilityLabel={translate('en', 'customer.c41.englishA11y')}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, textTokens('en', 'body')]}>
                {translate('en', 'customer.c41.english')}
              </Text>
              <Text style={[styles.optionSub, textTokens('en', 'label')]}>
                {translate('en', 'customer.c41.englishDesc')}
              </Text>
            </View>
            <View style={[styles.radioCircle, selected === 'en' && styles.radioCircleActive]}>
              {selected === 'en' ? <View style={styles.radioInner} /> : null}
            </View>
          </TouchableOpacity>

          {/* Urdu Option */}
          <TouchableOpacity
            testID="c41-option-ur"
            onPress={() => handleSelect('ur')}
            style={[
              styles.optionCard,
              { flexDirection: 'row-reverse' },
              selected === 'ur' && styles.optionCardActive,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === 'ur' }}
            accessibilityLabel={translate('ur', 'customer.c41.urduA11y')}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, textTokens('ur', 'body'), { textAlign: 'right' }]}>
                {translate('ur', 'customer.c41.urdu')}
              </Text>
              <Text style={[styles.optionSub, textTokens('ur', 'label'), { textAlign: 'right' }]}>
                {translate('ur', 'customer.c41.urduDesc')}
              </Text>
            </View>
            <View style={[styles.radioCircle, selected === 'ur' && styles.radioCircleActive]}>
              {selected === 'ur' ? <View style={styles.radioInner} /> : null}
            </View>
          </TouchableOpacity>
        </View>

        {savedSuccess ? (
          <View testID="c41-save-success-banner" style={styles.successBanner}>
            <Text style={[styles.successText, textTokens(selected, 'label')]}>
              ✓ {translate(selected, 'customer.c41.saveSuccess')}
            </Text>
          </View>
        ) : null}

        <UiButton
          testID="c41-continue-button"
          title={translate(selected, 'common.action.continue')}
          onPress={handleContinue}
          locale={selected}
          variant="primary"
          style={styles.continueButton}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: SPACING.md,
    gap: SPACING.lg,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLOR.text,
  },
  optionsList: {
    gap: SPACING.md,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardActive: {
    borderColor: COLOR.primary,
    backgroundColor: '#F0F7FF',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR.text,
  },
  optionSub: {
    color: COLOR.textMuted,
    marginTop: 2,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: COLOR.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLOR.primary,
  },
  successBanner: {
    backgroundColor: '#E6F4EA',
    borderWidth: 1,
    borderColor: '#137333',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  successText: {
    color: '#0D6832',
    fontWeight: 'bold',
  },
  continueButton: {
    marginTop: SPACING.md,
    width: '100%',
  },
});

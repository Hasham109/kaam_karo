/**
 * C40: No-Supply / Supply-Gap Screen (T3.10; BP §61.3; ARCH §3.1; MATCH-GAP-001).
 * Empathetic recovery options when zero eligible matches are found:
 * broaden radius, choose another time, join waitlist, request callback, related service.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  COLOR,
  RADIUS,
  SPACING,
  interactiveProps,
  minTapTargetStyle,
  textTokens,
} from '@kaamkaro/ui';
import { translate } from '@kaamkaro/i18n';
import { getAppMirroring } from '../utils/rtl';
import { ScreenContainer } from '../components/ScreenContainer';
import { useCustomerApp } from '../state/CustomerContext';
import type { SupplyGapRecoveryOptionItem } from '../types';

export const STANDARD_SUPPLY_OPTIONS: readonly SupplyGapRecoveryOptionItem[] = [
  {
    action: 'BROADEN_RADIUS',
    titleEn: 'Search a wider area',
    titleUr: 'بڑے علاقے میں تلاش کریں',
    descriptionEn: 'Expand search radius to nearby neighborhoods in Lahore',
    descriptionUr: 'لاہور کے قریبی علاقوں میں کاریگر تلاش کریں',
  },
  {
    action: 'CHOOSE_ANOTHER_TIME',
    titleEn: 'Choose another time',
    titleUr: 'کوئی اور وقت منتخب کریں',
    descriptionEn: 'Select a different slot or tomorrow morning',
    descriptionUr: 'کسی اور وقت یا کل صبح کا وقت منتخب کریں',
  },
  {
    action: 'JOIN_WAITLIST',
    titleEn: 'Join the waitlist',
    titleUr: 'انتظار کی فہرست میں شامل ہوں',
    descriptionEn: 'We prioritize expanding service supply in your area',
    descriptionUr: 'ہم آپ کے علاقے میں جلد سروس فراہم کریں گے',
  },
  {
    action: 'REQUEST_CALLBACK',
    titleEn: 'Ask Kaam Karo to call me',
    titleUr: 'کام کرو مجھے کال کرے',
    descriptionEn: 'Our support team will assist with custom matching',
    descriptionUr: 'ہماری سپورٹ ٹیم آپ کی رہنمائی کرے گی',
  },
];

export const C40SupplyGapScreen: React.FC = () => {
  const { locale, navigate, screenParams } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const params = screenParams as
    { reasonCode?: 'NONE_AT_TIME' | 'NONE_NEARBY' | 'NO_SUPPLY_GENERAL' } | undefined;
  const reasonCode = params?.reasonCode || 'NO_SUPPLY_GENERAL';

  const [completedAction, setCompletedAction] = useState<string | null>(null);

  const reasonElaboration =
    reasonCode === 'NONE_AT_TIME'
      ? translate(locale, 'customer.c40.reasonTime')
      : reasonCode === 'NONE_NEARBY'
        ? translate(locale, 'customer.c40.reasonNearby')
        : translate(locale, 'customer.c40.genericReason');

  const handleSelectOption = (action: string) => {
    if (action === 'BROADEN_RADIUS') {
      // Re-match with wider radius -> C35
      navigate('C35');
      return;
    }

    if (action === 'CHOOSE_ANOTHER_TIME') {
      // Re-open intake draft form C12 to change time
      navigate('C12');
      return;
    }

    if (action === 'JOIN_WAITLIST') {
      setCompletedAction('WAITLIST');
      return;
    }

    if (action === 'REQUEST_CALLBACK') {
      setCompletedAction('CALLBACK');
      return;
    }
  };

  return (
    <ScreenContainer testID="c40-supply-gap-screen" title={translate(locale, 'customer.c40.title')}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Empathetic Reason Banner */}
        <View style={styles.reasonCard} testID="c40-reason-banner">
          <Text style={styles.reasonIcon}>🔍</Text>
          <Text
            style={[
              styles.reasonTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c40.genericReason')}
          </Text>
          <Text
            style={[styles.reasonBody, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {reasonElaboration}
          </Text>
        </View>

        {/* Action Success Card (when waitlist or callback selected) */}
        {completedAction === 'WAITLIST' ? (
          <View style={styles.successCard} testID="c40-waitlist-success-banner">
            <Text style={styles.successIcon}>✓</Text>
            <Text
              style={[
                styles.successText,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c40.waitlistSuccess')}
            </Text>
          </View>
        ) : null}

        {completedAction === 'CALLBACK' ? (
          <View style={styles.successCard} testID="c40-callback-success-banner">
            <Text style={styles.successIcon}>📞</Text>
            <Text
              style={[
                styles.successText,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c40.callbackSuccess')}
            </Text>
          </View>
        ) : null}

        {/* Recovery Options Header */}
        <Text
          style={[
            styles.optionsHeader,
            textTokens(locale, 'title'),
            { textAlign: mirror.textAlign },
          ]}
        >
          {translate(locale, 'customer.c40.optionsHeader')}
        </Text>

        {/* Options List */}
        <View style={styles.optionsList}>
          {STANDARD_SUPPLY_OPTIONS.map((option) => {
            const title = locale === 'ur' ? option.titleUr : option.titleEn;
            const description = locale === 'ur' ? option.descriptionUr : option.descriptionEn;
            const testIdSlug = option.action.toLowerCase().replace(/_/g, '-');

            return (
              <TouchableOpacity
                key={option.action}
                onPress={() => handleSelectOption(option.action)}
                style={[styles.optionCard, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: `c40-${testIdSlug}-btn`,
                  accessibilityLabel: title,
                  accessibilityRole: 'button',
                })}
              >
                <View style={[styles.optionRow, { flexDirection: mirror.row }]}>
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionTitle,
                        textTokens(locale, 'title'),
                        { textAlign: mirror.textAlign },
                      ]}
                    >
                      {title}
                    </Text>
                    <Text
                      style={[
                        styles.optionDescription,
                        textTokens(locale, 'label'),
                        { textAlign: mirror.textAlign },
                      ]}
                    >
                      {description}
                    </Text>
                  </View>
                  <Text style={styles.optionArrow}>{locale === 'ur' ? '‹' : '›'}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Back to Home Button */}
        <TouchableOpacity
          onPress={() => navigate('C06')}
          style={[styles.homeBtn, minTapTargetStyle()]}
          {...interactiveProps({
            testID: 'c40-back-home-button',
            accessibilityLabel: translate(locale, 'customer.c15.backToHome'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.homeBtnText, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c15.backToHome')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: SPACING.md,
  },
  reasonCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.sheet,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  reasonIcon: {
    fontSize: 40,
    marginBottom: SPACING.xs,
  },
  reasonTitle: {
    color: COLOR.text,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  reasonBody: {
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  successCard: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  successIcon: {
    fontSize: 28,
    color: '#2E7D32',
    marginBottom: SPACING.xs,
  },
  successText: {
    color: '#1B5E20',
    fontWeight: '600',
    textAlign: 'center',
  },
  optionsHeader: {
    color: COLOR.text,
    marginBottom: SPACING.sm,
    fontWeight: '700',
  },
  optionsList: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  optionCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  optionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: COLOR.primary,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionDescription: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  optionArrow: {
    fontSize: 22,
    color: COLOR.textMuted,
    paddingHorizontal: SPACING.xs,
  },
  homeBtn: {
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  homeBtnText: {
    color: COLOR.text,
    fontWeight: '600',
  },
});

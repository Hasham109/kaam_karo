/**
 * P01 — Provider Welcome Screen (Task T4.1; BP §13 P01, §78.1; UX-SCREEN-002, I18N-002).
 */
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import {
  COLOR,
  RADIUS,
  SPACING,
  STATUS_THEME,
  URDU_FONT_FAMILY,
  interactiveProps,
  minTapTargetStyle,
  textTokens,
} from '@kaamkaro/ui';
import { usePartner } from '../state/PartnerContext';
import { getAppMirroring } from '../utils/rtl';

export function P01WelcomeScreen() {
  const { locale, setLocale, setCurrentScreen, setOnboardingMode, screenStates } = usePartner();
  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P01;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p01-loading-view">
        <Text style={[styles.loadingText, fontStyle, textTokens(locale, 'body')]}>
          {translate(locale, 'partner.p01.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'error') {
    return (
      <View style={styles.centerContainer} testID="p01-error-view">
        <Text style={[styles.errorText, fontStyle, textTokens(locale, 'body')]}>
          {translate(locale, 'partner.p01.error')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="p01-welcome-screen"
    >
      {/* Language Selector Header */}
      <View style={[styles.langBar, { flexDirection: mirroring.row }]} testID="p01-lang-selector">
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p01-lang-en',
            accessibilityLabel: translate(locale, 'partner.p01.langEnglishA11y'),
          })}
          style={[styles.langChip, minTapTargetStyle(), locale === 'en' && styles.langChipActive]}
          onPress={() => setLocale('en')}
        >
          <Text style={[styles.langChipText, locale === 'en' && styles.langChipTextActive]}>
            {translate(locale, 'partner.p01.langEnglish')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          {...interactiveProps({
            testID: 'p01-lang-ur',
            accessibilityLabel: translate(locale, 'partner.p01.langUrduA11y'),
          })}
          style={[styles.langChip, minTapTargetStyle(), locale === 'ur' && styles.langChipActive]}
          onPress={() => setLocale('ur')}
        >
          <Text
            style={[styles.langChipText, fontStyle, locale === 'ur' && styles.langChipTextActive]}
          >
            {translate(locale, 'partner.p01.langUrdu')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hero Brand & Titles */}
      <View style={styles.heroSection}>
        <View style={styles.badgePill} testID="p01-brand-badge">
          <Text style={styles.badgeText}>{translate(locale, 'partner.p01.brand')}</Text>
        </View>

        <Text
          style={[
            styles.mainTitle,
            fontStyle,
            textTokens(locale, 'headline'),
            { textAlign: mirroring.textAlign },
          ]}
          testID="p01-title"
        >
          {translate(locale, 'partner.p01.title')}
        </Text>

        <Text
          style={[
            styles.subtitle,
            fontStyle,
            textTokens(locale, 'body'),
            { textAlign: mirroring.textAlign },
          ]}
          testID="p01-subtitle"
        >
          {translate(locale, 'partner.p01.subtitle')}
        </Text>
      </View>

      {/* Value Proposition Points */}
      <View style={styles.valueSection} testID="p01-value-points">
        <View
          style={[styles.valueCard, { flexDirection: mirroring.row }]}
          testID="p01-value-card-1"
        >
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>📍</Text>
          </View>
          <Text
            style={[
              styles.valueText,
              fontStyle,
              textTokens(locale, 'body'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p01.valuePoint1')}
          </Text>
        </View>

        <View
          style={[styles.valueCard, { flexDirection: mirroring.row }]}
          testID="p01-value-card-2"
        >
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>⏱️</Text>
          </View>
          <Text
            style={[
              styles.valueText,
              fontStyle,
              textTokens(locale, 'body'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p01.valuePoint2')}
          </Text>
        </View>

        <View
          style={[styles.valueCard, { flexDirection: mirroring.row }]}
          testID="p01-value-card-3"
        >
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>💰</Text>
          </View>
          <Text
            style={[
              styles.valueText,
              fontStyle,
              textTokens(locale, 'body'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p01.valuePoint3')}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p01-get-started',
            accessibilityLabel: translate(locale, 'partner.p01.getStarted'),
          })}
          style={[styles.primaryBtn, minTapTargetStyle()]}
          onPress={() => {
            setOnboardingMode('register');
            setCurrentScreen('P02');
          }}
        >
          <Text style={[styles.primaryBtnText, fontStyle, textTokens(locale, 'label')]}>
            {translate(locale, 'partner.p01.getStarted')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          {...interactiveProps({
            testID: 'p01-login',
            accessibilityLabel: translate(locale, 'partner.p01.login'),
          })}
          style={[styles.secondaryBtn, minTapTargetStyle()]}
          onPress={() => {
            setOnboardingMode('login');
            setCurrentScreen('P02');
          }}
        >
          <Text style={[styles.secondaryBtnText, fontStyle, textTokens(locale, 'label')]}>
            {translate(locale, 'partner.p01.login')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLOR.background,
  },
  loadingText: {
    color: COLOR.textMuted,
  },
  errorText: {
    color: STATUS_THEME.danger.text,
    textAlign: 'center',
  },
  langBar: {
    justifyContent: 'flex-end',
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  langChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  langChipText: {
    fontSize: 14,
    color: COLOR.text,
    fontWeight: '600',
  },
  langChipTextActive: {
    color: '#ffffff',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  badgePill: {
    backgroundColor: STATUS_THEME.info.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: SPACING.sm,
  },
  badgeText: {
    color: COLOR.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mainTitle: {
    fontWeight: '800',
    color: COLOR.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    color: COLOR.textMuted,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  valueSection: {
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  valueCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: STATUS_THEME.info.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  valueText: {
    flex: 1,
    fontWeight: '500',
    color: COLOR.text,
  },
  actionSection: {
    gap: SPACING.sm,
  },
  primaryBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.primary,
  },
  secondaryBtnText: {
    color: COLOR.primary,
    fontWeight: '700',
  },
});

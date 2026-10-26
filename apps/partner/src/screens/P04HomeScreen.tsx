/**
 * P04 — Provider Home Screen Placeholder (Task T4.1; BP §13 P04).
 */
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import {
  COLOR,
  RADIUS,
  SPACING,
  STATUS_THEME,
  URDU_FONT_FAMILY,
  interactiveProps,
  minTapTargetStyle,
} from '@kaamkaro/ui';
import { usePartner } from '../state/PartnerContext';
import { getAppMirroring } from '../utils/rtl';

export function P04HomeScreen() {
  const { locale, profile, resetToStart, navigate } = usePartner();
  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;

  const providerTypeLabel =
    profile?.providerType === 'TEAM'
      ? translate(locale, 'partner.p04.team')
      : translate(locale, 'partner.p04.individual');

  return (
    <View style={styles.container} testID="p04-home-screen">
      <View style={styles.card} testID="p04-summary-card">
        <Text
          style={[styles.welcomeText, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p04-provider-name"
        >
          {profile?.fullName || ''}
        </Text>

        <Text
          style={[styles.cityText, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p04-provider-city"
        >
          {profile?.city || ''}
        </Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={[styles.badgeText, fontStyle]}>{providerTypeLabel}</Text>
          </View>

          <View style={styles.badgeSuccess}>
            <Text style={[styles.badgeTextSuccess, fontStyle]}>
              {profile?.verificationSubmitted
                ? translate(locale, 'partner.p03.statusUnderReview')
                : translate(locale, 'partner.p03.levelBasic')}
            </Text>
          </View>
        </View>

        <Text
          style={[styles.statusMsg, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p04-status-msg"
        >
          {profile?.verificationSubmitted
            ? translate(locale, 'partner.p03.submitSuccess')
            : translate(locale, 'partner.banner.verificationNeeded')}
        </Text>

        {/* Quick Menu to T4.2 and T4.3 Screens */}
        <View style={styles.menuGrid}>
          <TouchableOpacity
            {...interactiveProps({
              testID: 'p04-nav-p08-btn',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'partner.p08.title'),
            })}
            style={[styles.menuBtn, minTapTargetStyle()]}
            onPress={() => navigate('P08')}
          >
            <Text style={[styles.menuBtnText, fontStyle]}>
              {translate(locale, 'partner.p08.title')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            {...interactiveProps({
              testID: 'p04-nav-p05-btn',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'partner.p05.title'),
            })}
            style={[styles.menuBtn, minTapTargetStyle()]}
            onPress={() => navigate('P05')}
          >
            <Text style={[styles.menuBtnText, fontStyle]}>
              {translate(locale, 'partner.p05.title')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            {...interactiveProps({
              testID: 'p04-nav-p06-btn',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'partner.p06.title'),
            })}
            style={[styles.menuBtn, minTapTargetStyle()]}
            onPress={() => navigate('P06')}
          >
            <Text style={[styles.menuBtnText, fontStyle]}>
              {translate(locale, 'partner.p06.title')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            {...interactiveProps({
              testID: 'p04-nav-p07-btn',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'partner.p07.title'),
            })}
            style={[styles.menuBtn, minTapTargetStyle()]}
            onPress={() => navigate('P07')}
          >
            <Text style={[styles.menuBtnText, fontStyle]}>
              {translate(locale, 'partner.p07.title')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            {...interactiveProps({
              testID: 'p04-nav-p22-btn',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'partner.p22.title'),
            })}
            style={[styles.menuBtn, minTapTargetStyle()]}
            onPress={() => navigate('P22')}
          >
            <Text style={[styles.menuBtnText, fontStyle]}>
              {translate(locale, 'partner.p22.title')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            {...interactiveProps({
              testID: 'p04-nav-p23-btn',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'partner.p23.title'),
            })}
            style={[styles.menuBtn, minTapTargetStyle()]}
            onPress={() => navigate('P23')}
          >
            <Text style={[styles.menuBtnText, fontStyle]}>
              {translate(locale, 'partner.p23.title')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            {...interactiveProps({
              testID: 'p04-nav-p15-btn',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'partner.p15.title'),
            })}
            style={[styles.menuBtn, minTapTargetStyle()]}
            onPress={() => navigate('P15')}
          >
            <Text style={[styles.menuBtnText, fontStyle]}>
              {translate(locale, 'partner.p15.title')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          {...interactiveProps({
            testID: 'p04-reset-btn',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'partner.p04.startOverA11y'),
          })}
          style={[styles.resetBtn, minTapTargetStyle()]}
          onPress={resetToStart}
        >
          <Text style={[styles.resetBtnText, fontStyle]}>
            {translate(locale, 'partner.p04.startOver')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
    padding: SPACING.md,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLOR.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    gap: SPACING.md,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLOR.text,
  },
  cityText: {
    fontSize: 15,
    color: COLOR.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  badge: {
    backgroundColor: STATUS_THEME.info.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: COLOR.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeTextSuccess: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
  },
  statusMsg: {
    fontSize: 14,
    color: COLOR.textMuted,
    lineHeight: 20,
  },
  menuGrid: {
    width: '100%',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  menuBtn: {
    backgroundColor: STATUS_THEME.info.background,
    borderWidth: 1,
    borderColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnText: {
    color: COLOR.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  resetBtn: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.textMuted,
  },
});

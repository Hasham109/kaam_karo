/**
 * P02 — Provider Registration & Login Screen (Task T4.1; BP §13 P02, D-002, D-004, D-018; SEC-AUTH-001, UX-SCREEN-004).
 */
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { isolatePhone, translate } from '@kaamkaro/i18n';
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

export function P02RegistrationScreen() {
  const {
    locale,
    onboardingMode,
    regStep,
    setRegStep,
    phone,
    setPhone,
    otp,
    setOtp,
    fullName,
    setFullName,
    providerType,
    setProviderType,
    businessName,
    setBusinessName,
    teamSize,
    setTeamSize,
    email,
    setEmail,
    screenStates,
    sendOtp,
    verifyOtp,
    saveProfile,
  } = usePartner();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P02;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p02-loading-view">
        <Text style={[styles.loadingText, fontStyle, textTokens(locale, 'body')]}>
          {regStep === 'phone'
            ? translate(locale, 'partner.p02.sendingCode')
            : regStep === 'otp'
              ? translate(locale, 'partner.p02.checkingCode')
              : translate(locale, 'partner.p02.saving')}
        </Text>
      </View>
    );
  }

  const handleSendCode = async () => {
    setErrorMessage(null);
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setErrorMessage(translate(locale, 'partner.p02.invalidPhone'));
      return;
    }
    await sendOtp();
  };

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    const cleaned = otp.trim();
    if (cleaned.length < 4) {
      setErrorMessage(translate(locale, 'partner.p02.invalidOtp'));
      return;
    }
    await verifyOtp();
  };

  const handleSaveProfile = async () => {
    setErrorMessage(null);
    if (!fullName.trim()) {
      setErrorMessage(translate(locale, 'partner.p02.invalidName'));
      return;
    }
    if (providerType === 'TEAM' && !businessName.trim()) {
      setErrorMessage(translate(locale, 'partner.p02.invalidBusinessName'));
      return;
    }
    await saveProfile();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="p02-registration-screen"
    >
      {/* Title */}
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            fontStyle,
            textTokens(locale, 'headline'),
            { textAlign: mirroring.textAlign },
          ]}
          testID="p02-title"
        >
          {translate(
            locale,
            onboardingMode === 'register' ? 'partner.p02.titleRegister' : 'partner.p02.titleLogin',
          )}
        </Text>
      </View>

      {/* Error Banner */}
      {errorMessage && (
        <View style={styles.errorBanner} testID="p02-error-banner">
          <Text style={[styles.errorText, fontStyle, textTokens(locale, 'label')]}>
            {errorMessage}
          </Text>
        </View>
      )}

      {/* STEP A: Phone Number */}
      {regStep === 'phone' && (
        <View style={styles.stepContainer} testID="p02-step-phone">
          <Text
            style={[
              styles.label,
              fontStyle,
              textTokens(locale, 'label'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p02.phoneLabel')}
          </Text>

          <View style={[styles.phoneInputRow, { flexDirection: mirroring.row }]}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>+92</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.flex1, { textAlign: mirroring.textAlign }]}
              testID="p02-phone-input"
              keyboardType="phone-pad"
              placeholder={translate(locale, 'partner.p02.phonePlaceholder')}
              placeholderTextColor={COLOR.textMuted}
              value={phone}
              onChangeText={setPhone}
              maxLength={11}
            />
          </View>

          <Text
            style={[
              styles.hintText,
              fontStyle,
              textTokens(locale, 'label'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p02.phoneHint')}
          </Text>

          <TouchableOpacity
            {...interactiveProps({
              testID: 'p02-send-code',
              accessibilityLabel: translate(locale, 'partner.p02.sendCode'),
            })}
            style={[styles.primaryBtn, minTapTargetStyle(), styles.mtLg]}
            onPress={handleSendCode}
          >
            <Text style={[styles.primaryBtnText, fontStyle, textTokens(locale, 'label')]}>
              {translate(locale, 'partner.p02.sendCode')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP B: OTP Verification */}
      {regStep === 'otp' && (
        <View style={styles.stepContainer} testID="p02-step-otp">
          <Text
            style={[
              styles.otpHeading,
              fontStyle,
              textTokens(locale, 'title'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p02.otpHeading')}
          </Text>

          <Text
            style={[
              styles.otpSubheading,
              fontStyle,
              textTokens(locale, 'body'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p02.otpSubheading', {
              phone: isolatePhone(locale, phone),
            })}
          </Text>

          <TextInput
            style={[styles.otpInput, { textAlign: 'center' }]}
            testID="p02-otp-input"
            keyboardType="number-pad"
            placeholder={translate(locale, 'partner.p02.otpPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            value={otp}
            onChangeText={setOtp}
            maxLength={6}
          />

          <View style={styles.otpActionsRow}>
            <TouchableOpacity
              {...interactiveProps({
                testID: 'p02-change-number',
                accessibilityLabel: translate(locale, 'partner.p02.changeNumber'),
              })}
              style={[minTapTargetStyle(), styles.pyXs]}
              onPress={() => setRegStep('phone')}
            >
              <Text style={[styles.linkText, fontStyle, textTokens(locale, 'label')]}>
                {translate(locale, 'partner.p02.changeNumber')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              {...interactiveProps({
                testID: 'p02-resend-code',
                accessibilityLabel: translate(locale, 'partner.p02.resendNow'),
              })}
              style={[minTapTargetStyle(), styles.pyXs]}
              onPress={sendOtp}
            >
              <Text style={[styles.linkText, fontStyle, textTokens(locale, 'label')]}>
                {translate(locale, 'partner.p02.resendNow')}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            {...interactiveProps({
              testID: 'p02-verify-otp',
              accessibilityLabel: translate(locale, 'partner.p02.verify'),
            })}
            style={[styles.primaryBtn, minTapTargetStyle(), styles.mtLg]}
            onPress={handleVerifyOtp}
          >
            <Text style={[styles.primaryBtnText, fontStyle, textTokens(locale, 'label')]}>
              {translate(locale, 'partner.p02.verify')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* STEP C: Provider Profile */}
      {regStep === 'profile' && (
        <View style={styles.stepContainer} testID="p02-step-profile">
          <Text
            style={[
              styles.profileHeading,
              fontStyle,
              textTokens(locale, 'title'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p02.profileHeading')}
          </Text>

          {/* Full Name */}
          <Text
            style={[
              styles.label,
              fontStyle,
              textTokens(locale, 'label'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p02.nameLabel')}
          </Text>
          <TextInput
            style={[styles.textInput, { textAlign: mirroring.textAlign }]}
            testID="p02-name-input"
            placeholder={translate(locale, 'partner.p02.namePlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />

          {/* Provider Type (Solo vs Team) */}
          <Text
            style={[
              styles.label,
              styles.mtMd,
              fontStyle,
              textTokens(locale, 'label'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p02.providerTypeLabel')}
          </Text>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              {...interactiveProps({
                testID: 'p02-type-solo',
                accessibilityLabel: translate(locale, 'partner.p02.typeSolo'),
              })}
              style={[
                styles.typeCard,
                minTapTargetStyle(),
                providerType === 'SOLO' && styles.typeCardActive,
              ]}
              onPress={() => setProviderType('SOLO')}
            >
              <Text
                style={[
                  styles.typeCardTitle,
                  fontStyle,
                  textTokens(locale, 'body'),
                  providerType === 'SOLO' && styles.typeCardTextActive,
                ]}
              >
                {translate(locale, 'partner.p02.typeSolo')}
              </Text>
              <Text
                style={[
                  styles.typeCardDesc,
                  fontStyle,
                  textTokens(locale, 'label'),
                  providerType === 'SOLO' && styles.typeCardTextActive,
                ]}
              >
                {translate(locale, 'partner.p02.typeSoloDesc')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              {...interactiveProps({
                testID: 'p02-type-team',
                accessibilityLabel: translate(locale, 'partner.p02.typeTeam'),
              })}
              style={[
                styles.typeCard,
                minTapTargetStyle(),
                providerType === 'TEAM' && styles.typeCardActive,
              ]}
              onPress={() => setProviderType('TEAM')}
            >
              <Text
                style={[
                  styles.typeCardTitle,
                  fontStyle,
                  textTokens(locale, 'body'),
                  providerType === 'TEAM' && styles.typeCardTextActive,
                ]}
              >
                {translate(locale, 'partner.p02.typeTeam')}
              </Text>
              <Text
                style={[
                  styles.typeCardDesc,
                  fontStyle,
                  textTokens(locale, 'label'),
                  providerType === 'TEAM' && styles.typeCardTextActive,
                ]}
              >
                {translate(locale, 'partner.p02.typeTeamDesc')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Business Name (if Team) */}
          {providerType === 'TEAM' && (
            <View testID="p02-team-fields">
              <Text
                style={[
                  styles.label,
                  styles.mtMd,
                  fontStyle,
                  textTokens(locale, 'label'),
                  { textAlign: mirroring.textAlign },
                ]}
              >
                {translate(locale, 'partner.p02.businessNameLabel')}
              </Text>
              <TextInput
                style={[styles.textInput, { textAlign: mirroring.textAlign }]}
                testID="p02-business-name"
                placeholder={translate(locale, 'partner.p02.businessNamePlaceholder')}
                placeholderTextColor={COLOR.textMuted}
                value={businessName}
                onChangeText={setBusinessName}
              />

              <Text
                style={[
                  styles.label,
                  styles.mtMd,
                  fontStyle,
                  textTokens(locale, 'label'),
                  { textAlign: mirroring.textAlign },
                ]}
              >
                {translate(locale, 'partner.p02.teamSizeLabel')}
              </Text>
              <TextInput
                style={[styles.textInput, { textAlign: mirroring.textAlign }]}
                testID="p02-team-size"
                keyboardType="number-pad"
                value={String(teamSize)}
                onChangeText={(v) => setTeamSize(parseInt(v, 10) || 1)}
              />

              {/* Team Leader Note (D-018, PROV-CREW-006) */}
              <View style={styles.noteBanner} testID="p02-team-leader-note">
                <Text
                  style={[
                    styles.noteText,
                    fontStyle,
                    textTokens(locale, 'label'),
                    { textAlign: mirroring.textAlign },
                  ]}
                >
                  {translate(locale, 'partner.p02.teamLeaderNote')}
                </Text>
              </View>
            </View>
          )}

          {/* City Display (D-007, D-019: Lahore only active) */}
          <View style={styles.cityBadge} testID="p02-city-badge">
            <Text style={[styles.cityText, fontStyle, textTokens(locale, 'label')]}>
              {translate(locale, 'partner.p02.cityLabel')}
            </Text>
          </View>

          {/* Email (Optional) */}
          <Text
            style={[
              styles.label,
              styles.mtMd,
              fontStyle,
              textTokens(locale, 'label'),
              { textAlign: mirroring.textAlign },
            ]}
          >
            {translate(locale, 'partner.p02.emailLabel')}
          </Text>
          <TextInput
            style={[styles.textInput, { textAlign: mirroring.textAlign }]}
            testID="p02-email-input"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder={translate(locale, 'partner.p02.emailPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            value={email}
            onChangeText={setEmail}
          />

          <TouchableOpacity
            {...interactiveProps({
              testID: 'p02-save-profile',
              accessibilityLabel: translate(locale, 'partner.p02.saveAndContinue'),
            })}
            style={[styles.primaryBtn, minTapTargetStyle(), styles.mtLg]}
            onPress={handleSaveProfile}
          >
            <Text style={[styles.primaryBtnText, fontStyle, textTokens(locale, 'label')]}>
              {translate(locale, 'partner.p02.saveAndContinue')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontWeight: '800',
    color: COLOR.text,
  },
  stepContainer: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  label: {
    fontWeight: '600',
    color: COLOR.text,
    marginBottom: SPACING.xs,
  },
  phoneInputRow: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  prefixBox: {
    backgroundColor: STATUS_THEME.info.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
    height: 48,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.primary,
  },
  textInput: {
    backgroundColor: COLOR.background,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLOR.text,
    minHeight: 48,
  },
  flex1: {
    flex: 1,
  },
  hintText: {
    color: COLOR.textMuted,
    marginTop: SPACING.xs,
  },
  otpHeading: {
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.xs,
  },
  otpSubheading: {
    color: COLOR.textMuted,
    marginBottom: SPACING.md,
  },
  otpInput: {
    backgroundColor: COLOR.background,
    borderWidth: 1,
    borderColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    fontSize: 24,
    letterSpacing: 8,
    color: COLOR.text,
    height: 56,
    marginVertical: SPACING.md,
  },
  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  linkText: {
    color: COLOR.primary,
    fontWeight: '600',
  },
  profileHeading: {
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.md,
  },
  typeSelector: {
    gap: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  typeCard: {
    backgroundColor: COLOR.background,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLOR.border,
  },
  typeCardActive: {
    borderColor: COLOR.primary,
    backgroundColor: STATUS_THEME.info.background,
  },
  typeCardTitle: {
    fontWeight: '700',
    color: COLOR.text,
  },
  typeCardDesc: {
    color: COLOR.textMuted,
    marginTop: 2,
  },
  typeCardTextActive: {
    color: COLOR.primary,
  },
  noteBanner: {
    backgroundColor: STATUS_THEME.warning.background,
    borderColor: STATUS_THEME.warning.border,
    borderWidth: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  noteText: {
    color: STATUS_THEME.warning.text,
  },
  cityBadge: {
    backgroundColor: COLOR.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
  },
  cityText: {
    fontWeight: '600',
    color: COLOR.textMuted,
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
  errorBanner: {
    backgroundColor: STATUS_THEME.danger.background,
    borderWidth: 1,
    borderColor: STATUS_THEME.danger.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: STATUS_THEME.danger.text,
    textAlign: 'center',
  },
  mtMd: {
    marginTop: SPACING.md,
  },
  mtLg: {
    marginTop: SPACING.lg,
  },
  pyXs: {
    paddingVertical: SPACING.xs,
  },
});

/**
 * P22 — Availability Status Switch (Task T4.2; BP §59.3, ARCH §6.5, AVAIL-007, AVAIL-004, AVAIL-006, NOTIF-010, PERM-004, BP §57.4).
 */
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import type { LiveStatus } from '../types';
import { getAppMirroring } from '../utils/rtl';

const STATUS_OPTIONS: { id: LiveStatus; labelKey: `partner.p22.status${string}` }[] = [
  { id: 'ONLINE_AVAILABLE', labelKey: 'partner.p22.statusOnline' },
  { id: 'BUSY', labelKey: 'partner.p22.statusBusy' },
  { id: 'OFFLINE', labelKey: 'partner.p22.statusOffline' },
  { id: 'SCHEDULED_ONLY', labelKey: 'partner.p22.statusScheduledOnly' },
  { id: 'EMERGENCY_AVAILABLE', labelKey: 'partner.p22.statusEmergency' },
];

function getStatusLabel(locale: 'en' | 'ur', status: LiveStatus): string {
  switch (status) {
    case 'ONLINE_AVAILABLE':
      return translate(locale, 'partner.p22.statusOnline');
    case 'BUSY':
      return translate(locale, 'partner.p22.statusBusy');
    case 'OFFLINE':
      return translate(locale, 'partner.p22.statusOffline');
    case 'SCHEDULED_ONLY':
      return translate(locale, 'partner.p22.statusScheduledOnly');
    case 'EMERGENCY_AVAILABLE':
      return translate(locale, 'partner.p22.statusEmergency');
  }
}

export function P22LiveStatusScreen() {
  const {
    locale,
    liveStatus,
    setLiveStatusState,
    hasPromptedNotification,
    setHasPromptedNotification,
    profile,
    screenStates,
    goBack,
  } = usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P22;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  const [showPreprompt, setShowPreprompt] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<LiveStatus | null>(null);

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p22-loading-view">
        <Text style={[styles.centerText, fontStyle]}>
          {translate(locale, 'partner.p22.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'empty') {
    return (
      <View style={styles.centerContainer} testID="p22-empty-view">
        <Text style={[styles.centerText, fontStyle]}>{translate(locale, 'partner.p22.empty')}</Text>
      </View>
    );
  }

  const handleSelectStatus = async (status: LiveStatus) => {
    // If selecting Online or Emergency for the first time without notification prompt, show educational pre-prompt (OQ-026, NOTIF-010)
    if (
      (status === 'ONLINE_AVAILABLE' || status === 'EMERGENCY_AVAILABLE') &&
      !hasPromptedNotification
    ) {
      setPendingStatus(status);
      setShowPreprompt(true);
      return;
    }

    await setLiveStatusState(status);
  };

  const handlePrepromptAction = async (_granted: boolean) => {
    setHasPromptedNotification(true);
    setShowPreprompt(false);
    if (pendingStatus) {
      await setLiveStatusState(pendingStatus);
      setPendingStatus(null);
    }
  };

  const currentLabel = getStatusLabel(locale, liveStatus);

  const isBlockedFromInstant =
    (liveStatus === 'ONLINE_AVAILABLE' || liveStatus === 'EMERGENCY_AVAILABLE') &&
    profile?.verificationLevel === 'BASIC';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="p22-live-status-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[styles.title, headlineTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p22-title"
        >
          {translate(locale, 'partner.p22.title')}
        </Text>
        <Text
          style={[styles.subtitle, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
          testID="p22-subtitle"
        >
          {translate(locale, 'partner.p22.subtitle')}
        </Text>
      </View>

      {/* Success banner */}
      {currentState === 'success' && (
        <View style={styles.successBanner} testID="p22-success-banner">
          <Text style={[styles.successText, fontStyle]}>
            {translate(locale, 'partner.p22.saveSuccess', {
              status: currentLabel,
            })}
          </Text>
        </View>
      )}

      {/* Current Status Badge */}
      <View style={styles.currentStatusCard} testID="p22-current-status-card">
        <Text style={[styles.currentStatusText, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p22.currentStatus', {
            status: currentLabel,
          })}
        </Text>
      </View>

      {/* Eligibility Warning Banner if applicable */}
      {isBlockedFromInstant && (
        <View style={styles.warningBanner} testID="p22-blocked-warning">
          <Text style={[styles.warningText, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p22.blockedWarning')}
          </Text>
        </View>
      )}

      {/* Status Options */}
      <View style={styles.optionsList}>
        {STATUS_OPTIONS.map((opt) => {
          const isSelected = liveStatus === opt.id;
          const label = getStatusLabel(locale, opt.id);
          return (
            <TouchableOpacity
              key={opt.id}
              {...interactiveProps({
                testID: `p22-status-option-${opt.id.toLowerCase()}`,
                accessibilityRole: 'button',
                accessibilityLabel: label,
                accessibilityState: { selected: isSelected },
              })}
              style={[
                styles.optionCard,
                minTapTargetStyle(),
                isSelected && styles.optionCardSelected,
              ]}
              onPress={() => handleSelectStatus(opt.id)}
            >
              <View style={[styles.optionRow, { flexDirection: mirroring.row }]}>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.optionLabel,
                    fontStyle,
                    isSelected && styles.optionLabelSelected,
                    { textAlign: mirroring.textAlign },
                  ]}
                >
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notification Pre-Prompt Modal (OQ-026, NOTIF-010) */}
      <Modal
        visible={showPreprompt}
        transparent
        animationType="fade"
        testID="p22-notif-preprompt-modal"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} testID="p22-notif-modal-content">
            <Text
              style={[
                styles.modalTitle,
                headlineTokens,
                fontStyle,
                { textAlign: mirroring.textAlign },
              ]}
            >
              {translate(locale, 'partner.p22.notifPrepromptTitle')}
            </Text>
            <Text
              style={[styles.modalDesc, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
            >
              {translate(locale, 'partner.p22.notifPrepromptDesc')}
            </Text>

            <TouchableOpacity
              {...interactiveProps({
                testID: 'p22-notif-turn-on-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p22.notifTurnOn'),
              })}
              style={[styles.modalActionBtn, minTapTargetStyle()]}
              onPress={() => handlePrepromptAction(true)}
            >
              <Text style={[styles.modalActionBtnText, fontStyle]}>
                {translate(locale, 'partner.p22.notifTurnOn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              {...interactiveProps({
                testID: 'p22-notif-later-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p22.notifLater'),
              })}
              style={[styles.modalLaterBtn, minTapTargetStyle()]}
              onPress={() => handlePrepromptAction(false)}
            >
              <Text style={[styles.modalLaterBtnText, fontStyle]}>
                {translate(locale, 'partner.p22.notifLater')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Back button */}
      <TouchableOpacity
        {...interactiveProps({
          testID: 'p22-back-btn',
          accessibilityRole: 'button',
          accessibilityLabel: translate(locale, 'common.action.back'),
        })}
        style={[styles.backBtn, minTapTargetStyle()]}
        onPress={goBack}
      >
        <Text style={[styles.backBtnText, fontStyle]}>
          {translate(locale, 'common.action.back')}
        </Text>
      </TouchableOpacity>
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
  centerText: {
    fontSize: 15,
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    color: COLOR.text,
  },
  subtitle: {
    color: COLOR.textMuted,
    marginTop: 4,
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  successText: {
    color: '#15803d',
    fontSize: 14,
    textAlign: 'center',
  },
  currentStatusCard: {
    backgroundColor: STATUS_THEME.info.background,
    borderWidth: 1,
    borderColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  currentStatusText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.primary,
  },
  warningBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  warningText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  optionsList: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  optionCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  optionCardSelected: {
    borderColor: COLOR.primary,
    backgroundColor: STATUS_THEME.info.background,
  },
  optionRow: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: COLOR.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLOR.primary,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    color: COLOR.text,
  },
  optionLabelSelected: {
    color: COLOR.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalTitle: {
    color: COLOR.text,
  },
  modalDesc: {
    color: COLOR.textMuted,
  },
  modalActionBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalLaterBtn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLaterBtnText: {
    color: COLOR.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  backBtn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  backBtnText: {
    color: COLOR.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});

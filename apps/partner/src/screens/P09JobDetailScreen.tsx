/**
 * P09 — Job Detail Screen (Task T4.3; BP §13 P09, BP §85, PROF-ADDR-002, PROF-ADDR-004, PROV-CREW-002, PROV-CREW-006, BOOK-STATUS-016).
 */
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
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
import { P10ActionSheet } from './P10ActionSheet';

export function P09JobDetailScreen() {
  const { locale, selectedJob, screenStates, setActiveActionSheet, cancelJob, navigate, goBack } =
    usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P09;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  const [showCancelModal, setShowCancelModal] = useState(false);

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p09-loading-view">
        <Text style={[styles.centerText, fontStyle]}>
          {translate(locale, 'partner.p09.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'empty' || !selectedJob) {
    return (
      <View style={styles.centerContainer} testID="p09-empty-view">
        <Text style={[styles.centerText, fontStyle]}>{translate(locale, 'partner.p09.empty')}</Text>
      </View>
    );
  }

  const isAccepted = selectedJob.status === 'ACCEPTED';
  const isCancelled = selectedJob.status === 'CANCELLED';
  const isRejected = selectedJob.status === 'REJECTED';

  const handleOpenAccept = () => {
    setActiveActionSheet('ACCEPT');
  };

  const handleOpenDecline = () => {
    setActiveActionSheet('DECLINE');
  };

  const handleOpenMedia = () => {
    navigate('P25');
  };

  const handleConfirmCancel = async () => {
    setShowCancelModal(false);
    await cancelJob(selectedJob.id);
  };

  return (
    <View style={styles.container} testID="p09-job-detail-screen">
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with Booking ID & Status */}
        <View style={[styles.headerRow, { flexDirection: mirroring.row }]}>
          <Text style={[styles.bookingId, headlineTokens, fontStyle]} testID="p09-job-id">
            {translate(locale, 'partner.p09.jobId', { id: selectedJob.bookingId })}
          </Text>

          <View
            style={[
              styles.statusChip,
              isAccepted
                ? styles.statusChipSuccess
                : isCancelled || isRejected
                  ? styles.statusChipDanger
                  : styles.statusChipInfo,
            ]}
            testID="p09-status-chip"
          >
            <Text style={[styles.statusChipText, fontStyle]}>
              {translate(locale, 'partner.p09.statusLabel', {
                status: selectedJob.status,
              })}
            </Text>
          </View>
        </View>

        {/* Service & Short Summary */}
        <View style={styles.sectionCard}>
          <Text
            style={[styles.serviceTitle, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p09-service-title"
          >
            {selectedJob.serviceName}
          </Text>
          <Text
            style={[styles.summaryText, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p09-summary-text"
          >
            {selectedJob.shortSummary}
          </Text>
        </View>

        {/* Media Player Section / Launcher */}
        {selectedJob.media.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionHeading, fontStyle, { textAlign: mirroring.textAlign }]}>
              {translate(locale, 'partner.p09.customerMedia')}
            </Text>

            <TouchableOpacity
              {...interactiveProps({
                testID: 'p09-media-launcher-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p09.customerMedia'),
              })}
              style={[styles.mediaCardBtn, minTapTargetStyle()]}
              onPress={handleOpenMedia}
            >
              <Text style={[styles.mediaCardText, fontStyle]}>
                ▶ {translate(locale, 'partner.p25.title')} ({selectedJob.media.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Location Section */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionHeading, fontStyle, { textAlign: mirroring.textAlign }]}>
            {isAccepted
              ? translate(locale, 'partner.p09.address', { address: '' }).replace(/:\s*$/, '')
              : translate(locale, 'partner.p07.title')}
          </Text>

          {/* Before match: area + distance ONLY (BP §52.2, PROF-ADDR-004) */}
          {!isAccepted && (
            <>
              <Text
                style={[styles.areaDetailText, fontStyle, { textAlign: mirroring.textAlign }]}
                testID="p09-area-text"
              >
                {translate(locale, 'partner.p08.distanceAway', {
                  area: selectedJob.areaName,
                  km: selectedJob.distanceKm,
                })}
              </Text>
              <Text
                style={[styles.prematchNotice, fontStyle, { textAlign: mirroring.textAlign }]}
                testID="p09-prematch-notice"
              >
                {translate(locale, 'partner.p09.prematchLocationNotice')}
              </Text>
            </>
          )}

          {/* After match: full address snapshot (PROF-ADDR-002, OQ-027) */}
          {isAccepted && selectedJob.matchedAddress && (
            <Text
              style={[styles.fullAddressText, fontStyle, { textAlign: mirroring.textAlign }]}
              testID="p09-full-address"
            >
              {translate(locale, 'partner.p09.address', {
                address: selectedJob.matchedAddress,
              })}
            </Text>
          )}
        </View>

        {/* Commercial Model & Price Info */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionHeading, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p05.title')}
          </Text>
          <Text style={[styles.priceLarge, fontStyle, { textAlign: mirroring.textAlign }]}>
            {formatPkr(locale, selectedJob.pricePkr)}
          </Text>
          <Text
            style={[styles.timeDetailText, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p09-time-requested"
          >
            {translate(locale, 'partner.p09.timeRequested', {
              window: selectedJob.timeWindow,
            })}
          </Text>
        </View>

        {/* If Accepted: Show Crew Size & Responsible Team Leader (D-004, D-018, PROV-CREW-002, PROV-CREW-006) */}
        {isAccepted && (
          <View style={styles.sectionCard} testID="p09-accepted-crew-details">
            <Text style={[styles.sectionHeading, fontStyle, { textAlign: mirroring.textAlign }]}>
              {translate(locale, 'partner.p10.crewTitle')}
            </Text>
            {selectedJob.crewSize && (
              <Text
                style={[styles.crewDetailText, fontStyle, { textAlign: mirroring.textAlign }]}
                testID="p09-crew-size"
              >
                {translate(locale, 'partner.p09.crewSizeWorkers', {
                  count: selectedJob.crewSize,
                })}
              </Text>
            )}
            {selectedJob.responsibleName && (
              <Text
                style={[styles.crewDetailText, fontStyle, { textAlign: mirroring.textAlign }]}
                testID="p09-responsible-leader"
              >
                {translate(locale, 'partner.p09.responsiblePerson', {
                  name: selectedJob.responsibleName,
                })}
              </Text>
            )}
          </View>
        )}

        {/* Actions Section */}
        <View style={styles.actionSection}>
          {!isAccepted && !isCancelled && !isRejected && (
            <View style={[styles.actionRow, { flexDirection: mirroring.row }]}>
              {selectedJob.commercialModel === 'REQUEST_QUOTES' ? (
                <TouchableOpacity
                  {...interactiveProps({
                    testID: 'p09-quote-btn',
                    accessibilityRole: 'button',
                    accessibilityLabel: translate(locale, 'partner.p08.quoteBtn'),
                  })}
                  style={[styles.primaryActionBtn, minTapTargetStyle()]}
                  onPress={() => navigate('P24')}
                >
                  <Text style={[styles.primaryActionBtnText, fontStyle]}>
                    {translate(locale, 'partner.p08.quoteBtn')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  {...interactiveProps({
                    testID: 'p09-accept-btn',
                    accessibilityRole: 'button',
                    accessibilityLabel: translate(locale, 'partner.p08.acceptBtn'),
                  })}
                  style={[styles.primaryActionBtn, minTapTargetStyle()]}
                  onPress={handleOpenAccept}
                >
                  <Text style={[styles.primaryActionBtnText, fontStyle]}>
                    {translate(locale, 'partner.p08.acceptBtn')}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p09-decline-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p08.declineBtn'),
                })}
                style={[styles.dangerOutlineBtn, minTapTargetStyle()]}
                onPress={handleOpenDecline}
              >
                <Text style={[styles.dangerOutlineBtnText, fontStyle]}>
                  {translate(locale, 'partner.p08.declineBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isAccepted && (
            <View style={styles.postMatchActions}>
              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p09-go-to-job-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p09.goToJob'),
                })}
                style={[styles.primaryActionBtn, minTapTargetStyle()]}
                onPress={() => navigate('P04')}
              >
                <Text style={[styles.primaryActionBtnText, fontStyle]}>
                  {translate(locale, 'partner.p09.goToJob')}
                </Text>
              </TouchableOpacity>

              <View style={[styles.actionRow, { flexDirection: mirroring.row }]}>
                <TouchableOpacity
                  {...interactiveProps({
                    testID: 'p09-call-customer-btn',
                    accessibilityRole: 'button',
                    accessibilityLabel: translate(locale, 'partner.p09.callCustomer'),
                  })}
                  style={[styles.secondaryActionBtn, minTapTargetStyle()]}
                  onPress={() => {}}
                >
                  <Text style={[styles.secondaryActionBtnText, fontStyle]}>
                    📞 {translate(locale, 'partner.p09.callCustomer')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  {...interactiveProps({
                    testID: 'p09-message-customer-btn',
                    accessibilityRole: 'button',
                    accessibilityLabel: translate(locale, 'partner.p09.messageCustomer'),
                  })}
                  style={[styles.secondaryActionBtn, minTapTargetStyle()]}
                  onPress={() => {}}
                >
                  <Text style={[styles.secondaryActionBtnText, fontStyle]}>
                    💬 {translate(locale, 'partner.p09.messageCustomer')}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p09-cancel-job-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p09.cancelJob'),
                })}
                style={[styles.cancelJobBtn, minTapTargetStyle()]}
                onPress={() => setShowCancelModal(true)}
              >
                <Text style={[styles.cancelJobBtnText, fontStyle]}>
                  {translate(locale, 'partner.p09.cancelJob')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Back button */}
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p09-back-btn',
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

      {/* Cancel Job Confirmation Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} testID="p09-cancel-modal">
            <Text
              style={[
                styles.modalTitle,
                headlineTokens,
                fontStyle,
                { textAlign: mirroring.textAlign },
              ]}
            >
              {translate(locale, 'partner.p09.cancelJob')}
            </Text>
            <Text
              style={[styles.modalDesc, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
            >
              {translate(locale, 'partner.p09.cancelConfirmText')}
            </Text>

            <TouchableOpacity
              {...interactiveProps({
                testID: 'p09-confirm-cancel-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p09.cancelConfirmBtn'),
              })}
              style={[styles.modalDangerBtn, minTapTargetStyle()]}
              onPress={handleConfirmCancel}
            >
              <Text style={[styles.modalDangerBtnText, fontStyle]}>
                {translate(locale, 'partner.p09.cancelConfirmBtn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              {...interactiveProps({
                testID: 'p09-dismiss-cancel-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p09.cancelDismissBtn'),
              })}
              style={[styles.modalDismissBtn, minTapTargetStyle()]}
              onPress={() => setShowCancelModal(false)}
            >
              <Text style={[styles.modalDismissBtnText, fontStyle]}>
                {translate(locale, 'partner.p09.cancelDismissBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* P10 Bottom Action Sheet */}
      <P10ActionSheet />
    </View>
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
    gap: SPACING.md,
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
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingId: {
    color: COLOR.text,
  },
  statusChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusChipInfo: {
    backgroundColor: STATUS_THEME.info.background,
  },
  statusChipSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusChipDanger: {
    backgroundColor: '#fee2e2',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLOR.text,
  },
  sectionCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    gap: SPACING.xs,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLOR.text,
  },
  summaryText: {
    fontSize: 14,
    color: COLOR.textMuted,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: 2,
  },
  areaDetailText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.text,
  },
  prematchNotice: {
    fontSize: 12,
    color: COLOR.textMuted,
    fontStyle: 'italic',
  },
  fullAddressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.text,
    lineHeight: 20,
  },
  priceLarge: {
    fontSize: 20,
    fontWeight: '800',
    color: COLOR.primary,
  },
  timeDetailText: {
    fontSize: 13,
    color: COLOR.textMuted,
  },
  crewDetailText: {
    fontSize: 13,
    color: COLOR.text,
  },
  mediaCardBtn: {
    backgroundColor: STATUS_THEME.info.background,
    borderWidth: 1,
    borderColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
  },
  mediaCardText: {
    color: COLOR.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  actionSection: {
    marginTop: SPACING.sm,
  },
  actionRow: {
    gap: SPACING.sm,
  },
  postMatchActions: {
    gap: SPACING.sm,
  },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  dangerOutlineBtn: {
    paddingHorizontal: SPACING.lg,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: STATUS_THEME.danger.text,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerOutlineBtnText: {
    color: STATUS_THEME.danger.text,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionBtnText: {
    color: COLOR.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelJobBtn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  cancelJobBtnText: {
    color: STATUS_THEME.danger.text,
    fontSize: 13,
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
    lineHeight: 18,
  },
  modalDangerBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: STATUS_THEME.danger.text,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDangerBtnText: {
    color: STATUS_THEME.danger.text,
    fontSize: 15,
    fontWeight: '700',
  },
  modalDismissBtn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDismissBtnText: {
    color: COLOR.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});

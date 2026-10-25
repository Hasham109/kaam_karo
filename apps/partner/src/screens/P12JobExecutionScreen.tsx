/**
 * P12 — Job Execution Screen (Task T4.5; BP §13 P12, BP §15, BP §81, LOC-GEO-007, UX-PROV-004, BOOK-STATUS-006..010).
 * Owner: A12 (partner-app) + A06 (location-maps).
 */
import { useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export function P12JobExecutionScreen() {
  const {
    locale,
    selectedJob,
    executionStatus,
    isSharingLocation,
    toggleLocationSharing,
    startTrip,
    markArrived,
    startWork,
    finishJob,
    stopForSafety,
    reportCustomerNotHere,
    unpaidCommissionOwed,
    hasPendingApproval,
    screenStates,
    navigate,
    goBack,
  } = usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P12;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  const [showSafetyModal, setShowSafetyModal] = useState<boolean>(false);
  const [showNotHereModal, setShowNotHereModal] = useState<boolean>(false);

  // Address fallback for snapshot display
  const addressSnapshot =
    selectedJob?.matchedAddress || 'House 12-B, Street 4, Gulberg III, Lahore';
  const timeSnapshot = selectedJob?.timeWindow || 'Today, 2:00 PM – 4:00 PM';
  const crewSizeCount = selectedJob?.crewSize || 1;
  const bookingId = selectedJob?.bookingId || 'BK-2026-7841';

  // Navigation hand-off without runtime GPS prompt at launch (BP §81, UX-PROV-004, G2, G3)
  const handleNavigate = () => {
    const query = encodeURIComponent(addressSnapshot);
    const mapsUrl = `https://maps.google.com/?q=${query}`;
    void Linking.openURL(mapsUrl);
  };

  const handleConfirmSafetyStop = async () => {
    setShowSafetyModal(false);
    await stopForSafety();
  };

  const handleConfirmNotHere = async () => {
    setShowNotHereModal(false);
    await reportCustomerNotHere();
  };

  // Canonical Screen State Handlers
  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p12-state-loading">
        <Text style={[styles.stateText, bodyTokens, fontStyle]}>
          {translate(locale, 'partner.p12.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'empty' && !selectedJob) {
    return (
      <View style={styles.centerContainer} testID="p12-state-empty">
        <Text style={[styles.stateText, bodyTokens, fontStyle]}>
          {translate(locale, 'partner.p12.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="p12-job-execution-screen">
      {/* Header */}
      <View style={[styles.header, { flexDirection: mirroring.row }]}>
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p12-back-btn',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'partner.p10.cancelBtn'),
          })}
          style={[styles.backBtn, minTapTargetStyle()]}
          onPress={goBack}
        >
          <Text style={[styles.backBtnText, fontStyle]}>
            {translate(locale, 'partner.p10.cancelBtn')}
          </Text>
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text
            style={[styles.title, headlineTokens, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p12-title"
          >
            {translate(locale, 'partner.p12.title')}
          </Text>
          <Text
            style={[styles.subtitle, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p12-job-id"
          >
            {translate(locale, 'partner.p12.jobId', { id: bookingId })}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Canonical State Banners */}
        {currentState === 'success' && (
          <View style={[styles.banner, styles.bannerSuccess]} testID="p12-state-success">
            <Text style={[styles.bannerSuccessText, bodyTokens, fontStyle]}>
              {translate(locale, 'partner.p12.success', { status: executionStatus })}
            </Text>
          </View>
        )}

        {currentState === 'error' && (
          <View style={[styles.banner, styles.bannerError]} testID="p12-state-error">
            <Text style={[styles.bannerErrorText, bodyTokens, fontStyle]}>
              {translate(locale, 'partner.p12.error')}
            </Text>
          </View>
        )}

        {currentState === 'pending' && (
          <View style={[styles.banner, styles.bannerPending]} testID="p12-state-pending">
            <Text style={[styles.bannerPendingText, bodyTokens, fontStyle]}>
              {translate(locale, 'partner.p12.pending')}
            </Text>
          </View>
        )}

        {/* Unpaid Commission Notice (D-021, LEDGER-NEG-005) */}
        {unpaidCommissionOwed > 0 && (
          <View style={[styles.banner, styles.bannerWarning]} testID="p12-unpaid-block-banner">
            <Text style={[styles.bannerWarningText, bodyTokens, fontStyle]}>
              {translate(locale, 'partner.p12.unpaidBlock', {
                amount: unpaidCommissionOwed.toString(),
              })}
            </Text>
          </View>
        )}

        {/* Awaiting Customer Approval Banner (BP §15, §58.2; BOOK-STATUS-010) */}
        {hasPendingApproval && (
          <View style={[styles.banner, styles.bannerInfo]} testID="p12-awaiting-approval-banner">
            <Text style={[styles.bannerInfoText, bodyTokens, fontStyle]}>
              {translate(locale, 'partner.p12.awaitingApproval')}
            </Text>
          </View>
        )}

        {/* ACTIVE JOB LOCATION SHARING INDICATOR STRIP (BP §57.4, BP §81; LOC-GEO-007; Verbatim Acceptance Criteria)
            "Location only shared during active job, indicator visible"
            Visible ONLY while executionStatus === 'EN_ROUTE' */}
        {executionStatus === 'EN_ROUTE' && (
          <View
            style={[styles.locationStrip, { flexDirection: mirroring.row }]}
            testID="p12-location-indicator-strip"
          >
            <View style={styles.locationStatusContent}>
              <View
                style={[
                  styles.locationPulseDot,
                  !isSharingLocation && styles.locationPulseDotInactive,
                ]}
              />
              <Text
                style={[styles.locationStripText, fontStyle, { textAlign: mirroring.textAlign }]}
                testID="p12-location-indicator-text"
              >
                {isSharingLocation
                  ? translate(locale, 'partner.p12.locSharingIndicator')
                  : translate(locale, 'partner.p12.locSharingStopped')}
              </Text>
            </View>

            <TouchableOpacity
              {...interactiveProps({
                testID: isSharingLocation ? 'p12-stop-location-btn' : 'p12-resume-location-btn',
                accessibilityRole: 'button',
                accessibilityLabel: isSharingLocation
                  ? translate(locale, 'partner.p12.locStopSharingBtn')
                  : translate(locale, 'partner.p12.locStartSharingBtn'),
              })}
              style={[styles.locationActionBtn, minTapTargetStyle()]}
              onPress={() => toggleLocationSharing(!isSharingLocation)}
            >
              <Text style={[styles.locationActionBtnText, fontStyle]}>
                {isSharingLocation
                  ? translate(locale, 'partner.p12.locStopSharingBtn')
                  : translate(locale, 'partner.p12.locStartSharingBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Stepper with G9 labels (BP §15, A11Y-003, G9) */}
        <View style={styles.card} testID="p12-stepper-card">
          <Text
            style={[
              styles.currentStatusText,
              headlineTokens,
              fontStyle,
              { textAlign: mirroring.textAlign },
            ]}
            testID="p12-current-status-text"
          >
            {translate(locale, 'partner.p12.currentStepPrefix', {
              status: translate(
                locale,
                executionStatus === 'SCHEDULED'
                  ? 'partner.p12.stepScheduled'
                  : executionStatus === 'EN_ROUTE'
                    ? 'partner.p12.stepEnRoute'
                    : executionStatus === 'ARRIVED'
                      ? 'partner.p12.stepArrived'
                      : executionStatus === 'IN_PROGRESS'
                        ? 'partner.p12.stepInProgress'
                        : 'partner.p12.stepCompleted',
              ),
            })}
          </Text>

          <View style={[styles.stepperContainer, { flexDirection: mirroring.row }]}>
            {/* Step 1: Scheduled */}
            <View
              style={[styles.stepItem, executionStatus === 'SCHEDULED' && styles.stepItemActive]}
              testID="p12-status-scheduled"
            >
              <Text
                style={[
                  styles.stepNumber,
                  executionStatus === 'SCHEDULED' && styles.stepNumberActive,
                ]}
              >
                1
              </Text>
              <Text
                style={[
                  styles.stepLabel,
                  executionStatus === 'SCHEDULED' && styles.stepLabelActive,
                  fontStyle,
                ]}
              >
                {translate(locale, 'partner.p12.stepScheduled')}
              </Text>
            </View>

            {/* Step 2: En Route */}
            <View
              style={[styles.stepItem, executionStatus === 'EN_ROUTE' && styles.stepItemActive]}
              testID="p12-status-en-route"
            >
              <Text
                style={[
                  styles.stepNumber,
                  executionStatus === 'EN_ROUTE' && styles.stepNumberActive,
                ]}
              >
                2
              </Text>
              <Text
                style={[
                  styles.stepLabel,
                  executionStatus === 'EN_ROUTE' && styles.stepLabelActive,
                  fontStyle,
                ]}
              >
                {translate(locale, 'partner.p12.stepEnRoute')}
              </Text>
            </View>

            {/* Step 3: Arrived */}
            <View
              style={[styles.stepItem, executionStatus === 'ARRIVED' && styles.stepItemActive]}
              testID="p12-status-arrived"
            >
              <Text
                style={[
                  styles.stepNumber,
                  executionStatus === 'ARRIVED' && styles.stepNumberActive,
                ]}
              >
                3
              </Text>
              <Text
                style={[
                  styles.stepLabel,
                  executionStatus === 'ARRIVED' && styles.stepLabelActive,
                  fontStyle,
                ]}
              >
                {translate(locale, 'partner.p12.stepArrived')}
              </Text>
            </View>

            {/* Step 4: In Progress */}
            <View
              style={[styles.stepItem, executionStatus === 'IN_PROGRESS' && styles.stepItemActive]}
              testID="p12-status-in-progress"
            >
              <Text
                style={[
                  styles.stepNumber,
                  executionStatus === 'IN_PROGRESS' && styles.stepNumberActive,
                ]}
              >
                4
              </Text>
              <Text
                style={[
                  styles.stepLabel,
                  executionStatus === 'IN_PROGRESS' && styles.stepLabelActive,
                  fontStyle,
                ]}
              >
                {translate(locale, 'partner.p12.stepInProgress')}
              </Text>
            </View>

            {/* Step 5: Completed */}
            <View
              style={[styles.stepItem, executionStatus === 'COMPLETED' && styles.stepItemActive]}
              testID="p12-status-completed"
            >
              <Text
                style={[
                  styles.stepNumber,
                  executionStatus === 'COMPLETED' && styles.stepNumberActive,
                ]}
              >
                5
              </Text>
              <Text
                style={[
                  styles.stepLabel,
                  executionStatus === 'COMPLETED' && styles.stepLabelActive,
                  fontStyle,
                ]}
              >
                {translate(locale, 'partner.p12.stepCompleted')}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Address Snapshot & Details (PROF-ADDR-002, BP §21, D-004) */}
        <View style={styles.card}>
          <Text style={[styles.sectionHeading, fontStyle, { textAlign: mirroring.textAlign }]}>
            {translate(locale, 'partner.p12.addressLabel')}
          </Text>
          <Text
            style={[
              styles.addressText,
              headlineTokens,
              fontStyle,
              { textAlign: mirroring.textAlign },
            ]}
            testID="p12-address-snapshot"
          >
            {addressSnapshot}
          </Text>

          <View style={[styles.infoRow, { flexDirection: mirroring.row }]}>
            <Text style={[styles.metaText, bodyTokens, fontStyle]} testID="p12-scheduled-time">
              {translate(locale, 'partner.p12.scheduledTimeLabel', { time: timeSnapshot })}
            </Text>
            <Text style={[styles.metaText, bodyTokens, fontStyle]} testID="p12-crew-size">
              {translate(locale, 'partner.p12.crewSize', { count: crewSizeCount })}
            </Text>
          </View>

          {/* Quick Communication & Navigation Row */}
          <View style={[styles.actionGrid, { flexDirection: mirroring.row }]}>
            <TouchableOpacity
              {...interactiveProps({
                testID: 'p12-navigate-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p12.navigateBtn'),
              })}
              style={[styles.navBtn, minTapTargetStyle()]}
              onPress={handleNavigate}
            >
              <Text style={[styles.navBtnText, fontStyle]}>
                {translate(locale, 'partner.p12.navigateBtn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              {...interactiveProps({
                testID: 'p12-call-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p12.callCustomerBtn'),
              })}
              style={[styles.secondaryActionBtn, minTapTargetStyle()]}
              onPress={() => {
                if (selectedJob?.customerPhone) {
                  void Linking.openURL(`tel:${selectedJob.customerPhone}`);
                }
              }}
            >
              <Text style={[styles.secondaryActionBtnText, fontStyle]}>
                {translate(locale, 'partner.p12.callCustomerBtn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              {...interactiveProps({
                testID: 'p12-message-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p12.messageCustomerBtn'),
              })}
              style={[styles.secondaryActionBtn, minTapTargetStyle()]}
              onPress={() => {
                if (selectedJob?.customerPhone) {
                  void Linking.openURL(`sms:${selectedJob.customerPhone}`);
                }
              }}
            >
              <Text style={[styles.secondaryActionBtnText, fontStyle]}>
                {translate(locale, 'partner.p12.messageCustomerBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Execution Transitions (Server-Allowed Step CTAs) */}
        <View style={styles.primaryActionSection}>
          {executionStatus === 'SCHEDULED' && (
            <TouchableOpacity
              {...interactiveProps({
                testID: 'p12-start-trip-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p12.startTripBtn'),
              })}
              style={[styles.primaryActionBtn, minTapTargetStyle()]}
              onPress={() => void startTrip()}
            >
              <Text style={[styles.primaryActionBtnText, headlineTokens, fontStyle]}>
                {translate(locale, 'partner.p12.startTripBtn')}
              </Text>
            </TouchableOpacity>
          )}

          {executionStatus === 'EN_ROUTE' && (
            <TouchableOpacity
              {...interactiveProps({
                testID: 'p12-arrived-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p12.arrivedBtn'),
              })}
              style={[styles.primaryActionBtn, minTapTargetStyle()]}
              onPress={() => void markArrived()}
            >
              <Text style={[styles.primaryActionBtnText, headlineTokens, fontStyle]}>
                {translate(locale, 'partner.p12.arrivedBtn')}
              </Text>
            </TouchableOpacity>
          )}

          {executionStatus === 'ARRIVED' && (
            <View style={styles.stackActions}>
              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p12-start-work-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p12.startWorkBtn'),
                })}
                style={[styles.primaryActionBtn, minTapTargetStyle()]}
                onPress={() => void startWork()}
              >
                <Text style={[styles.primaryActionBtnText, headlineTokens, fontStyle]}>
                  {translate(locale, 'partner.p12.startWorkBtn')}
                </Text>
              </TouchableOpacity>

              <View style={[styles.cancelActionRow, { flexDirection: mirroring.row }]}>
                <TouchableOpacity
                  {...interactiveProps({
                    testID: 'p12-customer-not-here-btn',
                    accessibilityRole: 'button',
                    accessibilityLabel: translate(locale, 'partner.p12.customerNotHereBtn'),
                  })}
                  style={[styles.outlineWarningBtn, minTapTargetStyle()]}
                  onPress={() => setShowNotHereModal(true)}
                >
                  <Text style={[styles.outlineWarningBtnText, fontStyle]}>
                    {translate(locale, 'partner.p12.customerNotHereBtn')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  {...interactiveProps({
                    testID: 'p12-safety-stop-btn',
                    accessibilityRole: 'button',
                    accessibilityLabel: translate(locale, 'partner.p12.safetyStopBtn'),
                  })}
                  style={[styles.outlineDangerBtn, minTapTargetStyle()]}
                  onPress={() => setShowSafetyModal(true)}
                >
                  <Text style={[styles.outlineDangerBtnText, fontStyle]}>
                    {translate(locale, 'partner.p12.safetyStopBtn')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {executionStatus === 'IN_PROGRESS' && (
            <View style={styles.stackActions}>
              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p12-finish-job-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p12.finishJobBtn'),
                })}
                style={[styles.primaryActionBtn, minTapTargetStyle()]}
                onPress={() => void finishJob()}
              >
                <Text style={[styles.primaryActionBtnText, headlineTokens, fontStyle]}>
                  {translate(locale, 'partner.p12.finishJobBtn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p12-add-extras-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p12.addExtrasBtn'),
                })}
                style={[styles.secondaryPillBtn, minTapTargetStyle()]}
                onPress={() => navigate('P13')}
              >
                <Text style={[styles.secondaryPillBtnText, fontStyle]}>
                  {translate(locale, 'partner.p12.addExtrasBtn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p12-safety-stop-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p12.safetyStopBtn'),
                })}
                style={[styles.outlineDangerBtn, minTapTargetStyle()]}
                onPress={() => setShowSafetyModal(true)}
              >
                <Text style={[styles.outlineDangerBtnText, fontStyle]}>
                  {translate(locale, 'partner.p12.safetyStopBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {executionStatus === 'COMPLETED' && (
            <TouchableOpacity
              {...interactiveProps({
                testID: 'p12-view-bill-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p14.step2Title'),
              })}
              style={[styles.primaryActionBtn, minTapTargetStyle()]}
              onPress={() => navigate('P14')}
            >
              <Text style={[styles.primaryActionBtnText, headlineTokens, fontStyle]}>
                {translate(locale, 'partner.p14.step2Title')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Safety Stop Modal (BOOK-CANCEL-006) */}
      <Modal
        visible={showSafetyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSafetyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} testID="p12-safety-modal">
            <Text
              style={[
                styles.modalTitle,
                headlineTokens,
                fontStyle,
                { textAlign: mirroring.textAlign },
              ]}
            >
              {translate(locale, 'partner.p12.safetySheetTitle')}
            </Text>
            <Text
              style={[styles.modalBody, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
            >
              {translate(locale, 'partner.p12.safetySheetBody')}
            </Text>

            <View style={[styles.modalActions, { flexDirection: mirroring.row }]}>
              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p12-confirm-safety-stop-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p12.safetyConfirmBtn'),
                })}
                style={[styles.dangerModalBtn, minTapTargetStyle()]}
                onPress={() => void handleConfirmSafetyStop()}
              >
                <Text style={[styles.dangerModalBtnText, fontStyle]}>
                  {translate(locale, 'partner.p12.safetyConfirmBtn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p12-cancel-safety-modal-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p14.cancelModalBtn'),
                })}
                style={[styles.neutralModalBtn, minTapTargetStyle()]}
                onPress={() => setShowSafetyModal(false)}
              >
                <Text style={[styles.neutralModalBtnText, fontStyle]}>
                  {translate(locale, 'partner.p14.cancelModalBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Not Here Modal (BOOK-CANCEL-005) */}
      <Modal
        visible={showNotHereModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotHereModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} testID="p12-customer-not-here-modal">
            <Text
              style={[
                styles.modalTitle,
                headlineTokens,
                fontStyle,
                { textAlign: mirroring.textAlign },
              ]}
            >
              {translate(locale, 'partner.p12.customerNotHereBtn')}
            </Text>
            <Text
              style={[styles.modalBody, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
            >
              {translate(locale, 'partner.p12.customerNotHereConfirm')}
            </Text>

            <View style={[styles.modalActions, { flexDirection: mirroring.row }]}>
              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p12-confirm-customer-not-here-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p12.customerNotHereBtn'),
                })}
                style={[styles.warningModalBtn, minTapTargetStyle()]}
                onPress={() => void handleConfirmNotHere()}
              >
                <Text style={[styles.warningModalBtnText, fontStyle]}>
                  {translate(locale, 'partner.p12.customerNotHereBtn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p12-cancel-not-here-modal-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p14.cancelModalBtn'),
                })}
                style={[styles.neutralModalBtn, minTapTargetStyle()]}
                onPress={() => setShowNotHereModal(false)}
              >
                <Text style={[styles.neutralModalBtnText, fontStyle]}>
                  {translate(locale, 'partner.p14.cancelModalBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLOR.background,
  },
  stateText: {
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
    backgroundColor: COLOR.surface,
  },
  backBtn: {
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLOR.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  titleWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLOR.textMuted,
    marginTop: 2,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  banner: {
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  bannerSuccess: {
    backgroundColor: STATUS_THEME.success.background,
  },
  bannerSuccessText: {
    color: STATUS_THEME.success.text,
  },
  bannerError: {
    backgroundColor: STATUS_THEME.danger.background,
  },
  bannerErrorText: {
    color: STATUS_THEME.danger.text,
  },
  bannerPending: {
    backgroundColor: COLOR.surface,
  },
  bannerPendingText: {
    color: COLOR.textMuted,
  },
  bannerWarning: {
    backgroundColor: STATUS_THEME.warning.background,
    borderWidth: 1,
    borderColor: STATUS_THEME.warning.border,
  },
  bannerWarningText: {
    color: STATUS_THEME.warning.text,
    fontWeight: '600',
  },
  bannerInfo: {
    backgroundColor: STATUS_THEME.info.background,
    borderWidth: 1,
    borderColor: STATUS_THEME.info.border,
  },
  bannerInfoText: {
    color: STATUS_THEME.info.text,
    fontWeight: '600',
  },
  locationStrip: {
    backgroundColor: STATUS_THEME.success.background,
    borderWidth: 1.5,
    borderColor: STATUS_THEME.success.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: STATUS_THEME.success.text,
    marginRight: SPACING.sm,
  },
  locationPulseDotInactive: {
    backgroundColor: COLOR.border,
  },
  locationStripText: {
    fontSize: 13,
    color: STATUS_THEME.success.text,
    fontWeight: '700',
    flex: 1,
  },
  locationActionBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: STATUS_THEME.success.border,
    marginLeft: SPACING.sm,
  },
  locationActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: STATUS_THEME.success.text,
  },
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.md,
  },
  stepperContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    opacity: 0.45,
  },
  stepItemActive: {
    opacity: 1,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLOR.border,
    color: COLOR.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepNumberActive: {
    backgroundColor: COLOR.primary,
    color: COLOR.onPrimary,
  },
  stepLabel: {
    fontSize: 10,
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLOR.primary,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 12,
    color: COLOR.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  metaText: {
    fontSize: 13,
    color: COLOR.textMuted,
  },
  actionGrid: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  navBtn: {
    flex: 1.2,
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: COLOR.background,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  secondaryActionBtnText: {
    color: COLOR.text,
    fontWeight: '600',
    fontSize: 13,
  },
  primaryActionSection: {
    marginTop: SPACING.sm,
  },
  primaryActionBtn: {
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  stackActions: {
    gap: SPACING.md,
  },
  secondaryPillBtn: {
    backgroundColor: COLOR.background,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  secondaryPillBtnText: {
    color: COLOR.text,
    fontWeight: '600',
    fontSize: 15,
  },
  cancelActionRow: {
    gap: SPACING.sm,
  },
  outlineWarningBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: STATUS_THEME.warning.border,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineWarningBtnText: {
    color: STATUS_THEME.warning.text,
    fontWeight: '600',
    fontSize: 13,
  },
  outlineDangerBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: STATUS_THEME.danger.border,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineDangerBtnText: {
    color: STATUS_THEME.danger.text,
    fontWeight: '600',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLOR.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  modalBody: {
    fontSize: 14,
    color: COLOR.textMuted,
    marginBottom: SPACING.lg,
  },
  modalActions: {
    gap: SPACING.md,
    justifyContent: 'flex-end',
  },
  dangerModalBtn: {
    flex: 1,
    backgroundColor: STATUS_THEME.danger.border,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  dangerModalBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  warningModalBtn: {
    flex: 1,
    backgroundColor: STATUS_THEME.warning.border,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  warningModalBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  neutralModalBtn: {
    flex: 1,
    backgroundColor: COLOR.surface,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  neutralModalBtnText: {
    color: COLOR.text,
    fontWeight: '600',
    fontSize: 14,
  },
});

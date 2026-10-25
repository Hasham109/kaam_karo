/**
 * C17: Booking Tracking Screen (T4.6; BP §9, BP §15, BP §57.4, BP §81; LOC-GEO-007; BOOK-STATUS-006..010).
 * Features:
 * - 5-stage status stepper (Scheduled -> En Route -> Arrived -> In Progress -> Completed).
 * - Provider ETA and live tracking active indicator while en route.
 * - Provider profile card with crew size ("N workers will come", D-004, PROV-CREW-003).
 * - Masked direct call & chat triggers.
 * - Cancellation and Safety stop triggers (BOOK-CANCEL-003, BOOK-CANCEL-006).
 * - 5 canonical screen states (L, E, S, X, P).
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
import { MOCK_TRACKING_BOOKING } from '../data/mock-data';
import type { CustomerTrackingBooking, ScreenState } from '../types';

export interface C17BookingTrackingScreenProps {
  readonly initialBooking?: CustomerTrackingBooking;
  readonly initialState?: ScreenState;
}

export const C17BookingTrackingScreen: React.FC<C17BookingTrackingScreenProps> = ({
  initialBooking = MOCK_TRACKING_BOOKING,
  initialState = 'S',
}) => {
  const { locale, navigate } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [booking] = useState<CustomerTrackingBooking>(initialBooking);
  const [screenState, setScreenState] = useState<ScreenState>(initialState);

  // Stepper stages
  const STAGES = [
    { status: 'SCHEDULED' as const, label: translate(locale, 'customer.c17.stepperScheduled') },
    { status: 'EN_ROUTE' as const, label: translate(locale, 'customer.c17.stepperEnRoute') },
    { status: 'ARRIVED' as const, label: translate(locale, 'customer.c17.stepperArrived') },
    { status: 'IN_PROGRESS' as const, label: translate(locale, 'customer.c17.stepperInProgress') },
    { status: 'COMPLETED' as const, label: translate(locale, 'customer.c17.stepperCompleted') },
  ];

  const currentStageIndex = STAGES.findIndex((s) => s.status === booking.status);

  // Handlers
  const handleCall = () => {
    // Masked call intent
  };

  const handleMessage = () => {
    navigate('C06'); // Back or to chat
  };

  const handleShare = () => {
    // Share booking
  };

  const handleReviewPending = () => {
    navigate('C37', { bookingId: booking.id, initialTab: 'charges' });
  };

  const handleCancelBooking = () => {
    navigate('C37', { bookingId: booking.id, initialTab: 'dispute' });
  };

  const handleProviderNoShow = () => {
    navigate('C37', { bookingId: booking.id, initialTab: 'dispute' });
  };

  const handleSafetyStop = () => {
    navigate('C37', { bookingId: booking.id, initialTab: 'dispute' });
  };

  // 1. Loading State (L)
  if (screenState === 'L') {
    return (
      <ScreenContainer
        testID="c17-tracking-screen-loading"
        title={translate(locale, 'customer.c17.title')}
      >
        <View style={styles.stateCenterContainer} testID="c17-loading-state">
          <Text style={[styles.stateTitle, textTokens(locale, 'body')]}>
            {translate(locale, 'customer.c17.statePending')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 2. Error State (X)
  if (screenState === 'X') {
    return (
      <ScreenContainer
        testID="c17-tracking-screen-error"
        title={translate(locale, 'customer.c17.title')}
      >
        <View style={styles.stateCenterContainer} testID="c17-error-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c17.stateError')}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, minTapTargetStyle()]}
            onPress={() => setScreenState('S')}
            {...interactiveProps({
              testID: 'c17-retry-button',
              accessibilityLabel: translate(locale, 'customer.c17.stateError'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.btnTextPrimary, textTokens(locale, 'label')]}>
              {translate(locale, 'common.action.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // 3. Empty State (E)
  if (screenState === 'E') {
    return (
      <ScreenContainer
        testID="c17-tracking-screen-empty"
        title={translate(locale, 'customer.c17.title')}
      >
        <View style={styles.stateCenterContainer} testID="c17-empty-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c17.stateEmpty', { provider: booking.providerName })}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 4. Pending State (P)
  if (screenState === 'P') {
    return (
      <ScreenContainer
        testID="c17-tracking-screen-pending"
        title={translate(locale, 'customer.c17.title')}
      >
        <View style={styles.stateCenterContainer} testID="c17-pending-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c17.statePending')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 5. Success State (S)
  const isEnRoute = booking.status === 'EN_ROUTE';
  const hasPendingApproval =
    (booking.pendingChargesCount ?? 0) > 0 || booking.pendingCrewChange !== undefined;

  return (
    <ScreenContainer testID="c17-tracking-screen" title={translate(locale, 'customer.c17.title')}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Booking Reference & Service Header */}
        <View style={styles.card} testID="c17-header-card">
          <View style={[styles.headerRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.serviceTitle,
                textTokens(locale, 'headline'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {locale === 'ur' ? booking.serviceTitleUr : booking.serviceTitleEn}
            </Text>
            <View style={styles.bookingNumberBadge}>
              <Text style={styles.bookingNumberText}>{booking.bookingNumber}</Text>
            </View>
          </View>
          <Text
            style={[
              styles.scheduledTimeText,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            🕒 {booking.scheduledTime}
          </Text>
        </View>

        {/* 5-Stage Stepper */}
        <View style={styles.card} testID="c17-status-stepper-card">
          <View style={[styles.stepperContainer, { flexDirection: mirror.row }]}>
            {STAGES.map((stage, idx) => {
              const isPastOrCurrent = currentStageIndex >= 0 ? idx <= currentStageIndex : false;
              const isCurrent = idx === currentStageIndex;
              return (
                <View key={stage.status} style={styles.stepperStep}>
                  <View
                    style={[
                      styles.stepCircle,
                      isCurrent && styles.stepCircleCurrent,
                      isPastOrCurrent && !isCurrent && styles.stepCircleCompleted,
                    ]}
                  >
                    <Text style={styles.stepCircleText}>
                      {isPastOrCurrent && !isCurrent ? '✓' : idx + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      textTokens(locale, 'label'),
                      isCurrent && styles.stepLabelCurrent,
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    {stage.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Live En-Route Tracking Indicator & ETA (BP §57.4, BP §81, LOC-GEO-007, OQ-025) */}
        {isEnRoute ? (
          <View style={styles.liveTrackingCard} testID="c17-live-tracking-box">
            <View style={[styles.trackingRow, { flexDirection: mirror.row }]}>
              <Text style={styles.livePulseDot}>📍</Text>
              <View style={styles.trackingTextGroup}>
                <Text
                  style={[
                    styles.liveTrackingTitle,
                    textTokens(locale, 'label'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {translate(locale, 'customer.c17.liveTrackingActive')}
                </Text>
                {booking.etaMinutes ? (
                  <Text
                    style={[
                      styles.etaText,
                      textTokens(locale, 'headline'),
                      { textAlign: mirror.textAlign },
                    ]}
                    testID="c17-eta-text"
                  >
                    ⏱️ {translate(locale, 'customer.c17.etaText', { min: booking.etaMinutes })}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* Pending Approval Banner (BP §18 step 62, FARE-012, PROV-CREW-004) */}
        {hasPendingApproval ? (
          <View style={styles.pendingCard} testID="c17-pending-approval-banner">
            <View style={[styles.headerRow, { flexDirection: mirror.row }]}>
              <Text
                style={[
                  styles.pendingBannerText,
                  textTokens(locale, 'body'),
                  { textAlign: mirror.textAlign, flex: 1 },
                ]}
              >
                ⚠️ {translate(locale, 'customer.c17.pendingApprovalBanner')}
              </Text>
              <TouchableOpacity
                style={[styles.reviewBtn, minTapTargetStyle()]}
                onPress={handleReviewPending}
                {...interactiveProps({
                  testID: 'c17-review-pending-button',
                  accessibilityLabel: translate(locale, 'customer.c17.reviewChangeBtn'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.reviewBtnText, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.c17.reviewChangeBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Provider Profile Card (D-004, PROV-CREW-003, CHAT-002) */}
        <View style={styles.card} testID="c17-provider-card">
          <View style={[styles.headerRow, { flexDirection: mirror.row }]}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarIcon}>🛠️</Text>
            </View>
            <View style={styles.providerInfoGroup}>
              <Text
                style={[
                  styles.providerName,
                  textTokens(locale, 'title'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {booking.providerName}
              </Text>
              <View style={[styles.providerSubRow, { flexDirection: mirror.row }]}>
                <Text style={styles.ratingText}>
                  ⭐ {booking.providerRating} ({booking.providerReviewCount})
                </Text>
                {booking.isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>
                      ✓ {translate(locale, 'customer.c17.verifiedBadge')}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Crew Size Display (PROV-CREW-003, D-004) */}
          <View
            style={[styles.crewSizeRow, { flexDirection: mirror.row }]}
            testID="c17-crew-size-row"
          >
            <Text style={styles.crewIcon}>👥</Text>
            <Text
              style={[styles.crewText, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
            >
              {translate(locale, 'customer.c17.workersCount', { n: booking.crewSize })}
            </Text>
          </View>

          {/* Masked Contact Actions (CHAT-002) */}
          <View style={[styles.contactButtonsRow, { flexDirection: mirror.row }]}>
            <TouchableOpacity
              style={[styles.callBtn, minTapTargetStyle()]}
              onPress={handleCall}
              {...interactiveProps({
                testID: 'c17-call-button',
                accessibilityLabel: translate(locale, 'customer.c17.callBtn'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.callBtnText, textTokens(locale, 'label')]}>
                📞 {translate(locale, 'customer.c17.callBtn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.messageBtn, minTapTargetStyle()]}
              onPress={handleMessage}
              {...interactiveProps({
                testID: 'c17-message-button',
                accessibilityLabel: translate(locale, 'customer.c17.messageBtn'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.messageBtnText, textTokens(locale, 'label')]}>
                💬 {translate(locale, 'customer.c17.messageBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Snapshot */}
        <View style={styles.card} testID="c17-address-card">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c17.addressHeader')}
          </Text>
          <Text
            style={[
              styles.addressText,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          >
            📍 {booking.address}
          </Text>
        </View>

        {/* Timeline of Job Events (DATA-002, BP §15) */}
        <View style={styles.card} testID="c17-timeline-card">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c17.timelineHeader')}
          </Text>
          <View style={styles.eventsList}>
            {booking.events.map((ev, i) => (
              <View
                key={ev.id}
                style={[styles.eventRow, { flexDirection: mirror.row }]}
                testID={`c17-event-row-${i}`}
              >
                <View style={[styles.eventDot, ev.isCompleted && styles.eventDotCompleted]} />
                <View style={styles.eventContent}>
                  <Text
                    style={[
                      styles.eventLabel,
                      textTokens(locale, 'body'),
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    {locale === 'ur' ? ev.labelUr : ev.labelEn}
                  </Text>
                  <Text
                    style={[
                      styles.eventTime,
                      textTokens(locale, 'label'),
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    {ev.timestamp}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Secondary Safety & Cancellation Actions */}
        <View style={styles.card} testID="c17-actions-card">
          <TouchableOpacity
            style={[styles.actionBtn, minTapTargetStyle()]}
            onPress={handleShare}
            {...interactiveProps({
              testID: 'c17-share-button',
              accessibilityLabel: translate(locale, 'customer.c17.shareBtn'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.actionBtnText, textTokens(locale, 'body')]}>
              📤 {translate(locale, 'customer.c17.shareBtn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, minTapTargetStyle()]}
            onPress={handleProviderNoShow}
            {...interactiveProps({
              testID: 'c17-provider-noshow-button',
              accessibilityLabel: translate(locale, 'customer.c17.providerNoShowBtn'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.actionBtnText, textTokens(locale, 'body')]}>
              ⏳ {translate(locale, 'customer.c17.providerNoShowBtn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.safetyBtn, minTapTargetStyle()]}
            onPress={handleSafetyStop}
            {...interactiveProps({
              testID: 'c17-safety-stop-button',
              accessibilityLabel: translate(locale, 'customer.c17.safetyStopBtn'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.safetyBtnText, textTokens(locale, 'label')]}>
              🛑 {translate(locale, 'customer.c17.safetyStopBtn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, minTapTargetStyle()]}
            onPress={handleCancelBooking}
            {...interactiveProps({
              testID: 'c17-cancel-booking-button',
              accessibilityLabel: translate(locale, 'customer.c17.cancelBookingBtn'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.cancelBtnText, textTokens(locale, 'label')]}>
              ✕ {translate(locale, 'customer.c17.cancelBookingBtn')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTitle: {
    color: COLOR.text,
    flex: 1,
  },
  bookingNumberBadge: {
    backgroundColor: '#ECEFF1',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  bookingNumberText: {
    color: '#37474F',
    fontSize: 12,
    fontWeight: '700',
  },
  scheduledTimeText: {
    color: COLOR.textMuted,
    marginTop: SPACING.xs,
  },
  stepperContainer: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepperStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CFD8DC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  stepCircleCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepCircleCurrent: {
    backgroundColor: COLOR.primary,
  },
  stepCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepLabel: {
    color: COLOR.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  stepLabelCurrent: {
    color: COLOR.primary,
    fontWeight: '700',
  },
  liveTrackingCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.sheet,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  trackingRow: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  livePulseDot: {
    fontSize: 24,
  },
  trackingTextGroup: {
    flex: 1,
  },
  liveTrackingTitle: {
    color: '#1B5E20',
    fontWeight: '700',
  },
  etaText: {
    color: '#2E7D32',
    fontWeight: '800',
    marginTop: 2,
  },
  pendingCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: RADIUS.sheet,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  pendingBannerText: {
    color: '#795548',
    fontWeight: '600',
  },
  reviewBtn: {
    backgroundColor: '#FF8F00',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  avatarIcon: {
    fontSize: 22,
  },
  providerInfoGroup: {
    flex: 1,
  },
  providerName: {
    color: COLOR.text,
  },
  providerSubRow: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 2,
  },
  ratingText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  verifiedText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '700',
  },
  crewSizeRow: {
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#F5F5F5',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  crewIcon: {
    fontSize: 16,
  },
  crewText: {
    color: COLOR.text,
    fontWeight: '600',
  },
  contactButtonsRow: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  callBtn: {
    flex: 1,
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  callBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
  messageBtn: {
    flex: 1,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  messageBtnText: {
    color: COLOR.text,
    fontWeight: '600',
  },
  sectionTitle: {
    color: COLOR.textMuted,
    marginBottom: SPACING.xs,
    fontWeight: '700',
  },
  addressText: {
    color: COLOR.text,
  },
  eventsList: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  eventRow: {
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CFD8DC',
    marginTop: 5,
  },
  eventDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  eventContent: {
    flex: 1,
  },
  eventLabel: {
    color: COLOR.text,
  },
  eventTime: {
    color: COLOR.textMuted,
  },
  actionBtn: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: SPACING.sm,
    justifyContent: 'center',
  },
  actionBtnText: {
    color: COLOR.text,
  },
  safetyBtn: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  safetyBtnText: {
    color: '#C62828',
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    marginTop: SPACING.xs,
  },
  cancelBtnText: {
    color: COLOR.textMuted,
  },
  stateCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  stateTitle: {
    color: COLOR.text,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  btnTextPrimary: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
});

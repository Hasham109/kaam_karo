/**
 * C19: Job in Progress / Active On-Site Screen (T4.6; BP §9, BP §12, BP §58.2; FARE-012, PRICE-007; BOOK-STATUS-010).
 * Features:
 * - Live provider on-site status (ARRIVED, IN_PROGRESS, AWAITING_APPROVAL).
 * - Work started time display.
 * - Crew size on site ("N workers on site", D-004).
 * - Agreed price so far.
 * - Pending extra charges card with direct link to C37 approval sheet.
 * - Safety stop trigger (BOOK-CANCEL-006).
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
import { formatPkr, translate } from '@kaamkaro/i18n';
import { getAppMirroring } from '../utils/rtl';
import { ScreenContainer } from '../components/ScreenContainer';
import { useCustomerApp } from '../state/CustomerContext';
import { MOCK_TRACKING_BOOKING } from '../data/mock-data';
import type { CustomerTrackingBooking, ScreenState } from '../types';

export interface C19JobInProgressScreenProps {
  readonly initialBooking?: CustomerTrackingBooking;
  readonly initialState?: ScreenState;
  readonly startedTime?: string;
}

export const C19JobInProgressScreen: React.FC<C19JobInProgressScreenProps> = ({
  initialBooking = { ...MOCK_TRACKING_BOOKING, status: 'IN_PROGRESS' },
  initialState = 'S',
  startedTime = '2:45 PM',
}) => {
  const { locale, navigate } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [booking] = useState<CustomerTrackingBooking>(initialBooking);
  const [screenState, setScreenState] = useState<ScreenState>(initialState);

  const pendingCount = booking.pendingChargesCount ?? 0;
  const hasPendingApprovals = pendingCount > 0;

  const handleReviewExtras = () => {
    navigate('C37', { bookingId: booking.id, initialTab: 'charges' });
  };

  const handleReportProblem = () => {
    navigate('C37', { bookingId: booking.id, initialTab: 'dispute' });
  };

  const handleSafetyStop = () => {
    navigate('C37', { bookingId: booking.id, initialTab: 'dispute' });
  };

  const handleCall = () => {
    // Masked call
  };

  const handleMessage = () => {
    navigate('C06');
  };

  // 1. Loading State (L)
  if (screenState === 'L') {
    return (
      <ScreenContainer
        testID="c19-progress-screen-loading"
        title={translate(locale, 'customer.c19.title')}
      >
        <View style={styles.stateCenterContainer} testID="c19-loading-state">
          <Text style={[styles.stateTitle, textTokens(locale, 'body')]}>
            {translate(locale, 'customer.c19.statePending')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 2. Error State (X)
  if (screenState === 'X') {
    return (
      <ScreenContainer
        testID="c19-progress-screen-error"
        title={translate(locale, 'customer.c19.title')}
      >
        <View style={styles.stateCenterContainer} testID="c19-error-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c19.stateError')}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, minTapTargetStyle()]}
            onPress={() => setScreenState('S')}
            {...interactiveProps({
              testID: 'c19-retry-button',
              accessibilityLabel: translate(locale, 'customer.c19.stateError'),
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
        testID="c19-progress-screen-empty"
        title={translate(locale, 'customer.c19.title')}
      >
        <View style={styles.stateCenterContainer} testID="c19-empty-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c19.noPendingApprovals')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 4. Pending State (P)
  if (screenState === 'P') {
    return (
      <ScreenContainer
        testID="c19-progress-screen-pending"
        title={translate(locale, 'customer.c19.title')}
      >
        <View style={styles.stateCenterContainer} testID="c19-pending-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c19.statePending')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 5. Success State (S)
  return (
    <ScreenContainer testID="c19-progress-screen" title={translate(locale, 'customer.c19.title')}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* On-Site Status Banner */}
        <View style={styles.statusBanner} testID="c19-status-banner">
          <View style={[styles.rowBetween, { flexDirection: mirror.row }]}>
            <View>
              <Text
                style={[
                  styles.serviceTitle,
                  textTokens(locale, 'headline'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {locale === 'ur' ? booking.serviceTitleUr : booking.serviceTitleEn}
              </Text>
              <Text
                style={[
                  styles.startedTimeText,
                  textTokens(locale, 'body'),
                  { textAlign: mirror.textAlign },
                ]}
                testID="c19-started-time-text"
              >
                ⏱️ {translate(locale, 'customer.c19.workStartedAt', { time: startedTime })}
              </Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>
                {translate(locale, 'status.customer.inProgress')}
              </Text>
            </View>
          </View>
        </View>

        {/* Workers on Site Card (D-004, PROV-CREW-003) */}
        <View style={styles.card} testID="c19-crew-card">
          <View style={[styles.rowBetween, { flexDirection: mirror.row }]}>
            <View style={[styles.crewLeft, { flexDirection: mirror.row }]}>
              <Text style={styles.crewIcon}>👥</Text>
              <View>
                <Text
                  style={[
                    styles.crewLabel,
                    textTokens(locale, 'body'),
                    { textAlign: mirror.textAlign },
                  ]}
                  testID="c19-workers-count-text"
                >
                  {translate(locale, 'customer.c19.workersOnSite', { n: booking.crewSize })}
                </Text>
                <Text
                  style={[
                    styles.providerSubText,
                    textTokens(locale, 'label'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {booking.providerName} {translate(locale, 'customer.c19.teamLeadRole')}
                </Text>
              </View>
            </View>

            <View style={[styles.quickActions, { flexDirection: mirror.row }]}>
              <TouchableOpacity
                style={[styles.smallIconBtn, minTapTargetStyle()]}
                onPress={handleCall}
                {...interactiveProps({
                  testID: 'c19-quick-call-button',
                  accessibilityLabel: translate(locale, 'customer.c17.callBtn'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.smallIconText}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.smallIconBtn, minTapTargetStyle()]}
                onPress={handleMessage}
                {...interactiveProps({
                  testID: 'c19-quick-chat-button',
                  accessibilityLabel: translate(locale, 'customer.c17.messageBtn'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.smallIconText}>💬</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Agreed Price Card */}
        <View style={styles.card} testID="c19-price-card">
          <Text
            style={[styles.priceText, textTokens(locale, 'title'), { textAlign: mirror.textAlign }]}
          >
            💰{' '}
            {translate(locale, 'customer.c19.agreedPrice', {
              amount: formatPkr(locale, booking.agreedPricePkr),
            })}
          </Text>
        </View>

        {/* Pending Approvals Card (BP §58.2, FARE-012, PRICE-007) */}
        <View style={styles.card} testID="c19-pending-approvals-card">
          {hasPendingApprovals ? (
            <View style={styles.pendingContainer}>
              <Text
                style={[
                  styles.pendingNoticeTitle,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
                testID="c19-pending-items-count-text"
              >
                ⚠️ {translate(locale, 'customer.c19.pendingApprovalsNotice', { n: pendingCount })}
              </Text>
              <TouchableOpacity
                style={[styles.reviewExtrasBtn, minTapTargetStyle()]}
                onPress={handleReviewExtras}
                {...interactiveProps({
                  testID: 'c19-review-extras-button',
                  accessibilityLabel: translate(locale, 'customer.c19.reviewExtrasBtn'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.reviewExtrasBtnText, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.c19.reviewExtrasBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text
              style={[
                styles.noPendingText,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
              testID="c19-no-pending-text"
            >
              ✓ {translate(locale, 'customer.c19.noPendingApprovals')}
            </Text>
          )}
        </View>

        {/* Safety & Problem Escalation Actions */}
        <View style={styles.card} testID="c19-problem-card">
          <TouchableOpacity
            style={[styles.problemBtn, minTapTargetStyle()]}
            onPress={handleReportProblem}
            {...interactiveProps({
              testID: 'c19-report-problem-button',
              accessibilityLabel: translate(locale, 'customer.c19.reportProblemBtn'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.problemBtnText, textTokens(locale, 'body')]}>
              ⚠️ {translate(locale, 'customer.c19.reportProblemBtn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.safetyStopBtn, minTapTargetStyle()]}
            onPress={handleSafetyStop}
            {...interactiveProps({
              testID: 'c19-safety-stop-button',
              accessibilityLabel: translate(locale, 'customer.c19.safetyStopBtn'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.safetyStopBtnText, textTokens(locale, 'label')]}>
              🛑 {translate(locale, 'customer.c19.safetyStopBtn')}
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
  statusBanner: {
    backgroundColor: '#E0F2F1',
    borderRadius: RADIUS.sheet,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#80CBC4',
  },
  rowBetween: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTitle: {
    color: '#004D40',
    fontWeight: '800',
  },
  startedTimeText: {
    color: '#00796B',
    marginTop: 4,
    fontWeight: '600',
  },
  activePill: {
    backgroundColor: '#00796B',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  crewLeft: {
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  crewIcon: {
    fontSize: 24,
  },
  crewLabel: {
    color: COLOR.text,
    fontWeight: '700',
  },
  providerSubText: {
    color: COLOR.textMuted,
  },
  quickActions: {
    gap: SPACING.xs,
  },
  smallIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallIconText: {
    fontSize: 18,
  },
  priceText: {
    color: COLOR.text,
    fontWeight: '700',
  },
  pendingContainer: {
    gap: SPACING.sm,
  },
  pendingNoticeTitle: {
    color: '#D84315',
    fontWeight: '700',
  },
  reviewExtrasBtn: {
    backgroundColor: '#E65100',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewExtrasBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noPendingText: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  problemBtn: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  problemBtnText: {
    color: COLOR.text,
  },
  safetyStopBtn: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  safetyStopBtnText: {
    color: '#C62828',
    fontWeight: '700',
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

/**
 * C20: Job Completion & Payment Confirmation Screen (T4.6; BP §9, BP §12, BP §13 P14; D-003, D-016, D-030; ARCH §6.8; PAY-TIMING-001).
 * Features:
 * - Work completion evidence (provider notes, before/after photos, completion code).
 * - Customer completion confirmation action (OQ-044).
 * - Final bill breakdown: labour, approved extras, launch tax Rs. 0 (D-029), total.
 * - Payment Gating (D-003, PAY-TIMING-001): Payment enabled only after completion.
 * - Payment Invariant (D-030): No cash selection in customer app; cash is recorded exclusively by provider on P14.
 * - Digital payment checkout trigger & status display (ARCH §6.8, ABUSE-007).
 * - KK-T5 anti-fraud protection ("Paid by is wrong" / "I paid cash" report action, OQ-077).
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
import { MOCK_COMPLETION_DETAILS } from '../data/mock-data';
import type { CustomerCompletionDetails, ScreenState } from '../types';

export interface C20CompletionConfirmScreenProps {
  readonly initialDetails?: CustomerCompletionDetails;
  readonly initialState?: ScreenState;
  readonly isJobCompleted?: boolean;
}

export const C20CompletionConfirmScreen: React.FC<C20CompletionConfirmScreenProps> = ({
  initialDetails = MOCK_COMPLETION_DETAILS,
  initialState = 'S',
  isJobCompleted = true,
}) => {
  const { locale, navigate } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [details, setDetails] = useState<CustomerCompletionDetails>(initialDetails);
  const [screenState, setScreenState] = useState<ScreenState>(initialState);
  const [isDigitalPaid, setIsDigitalPaid] = useState<boolean>(
    details.digitalPaymentStatus === 'PAID',
  );
  const [cashReported, setCashReported] = useState<boolean>(false);

  const handleConfirmCompletion = () => {
    setDetails((prev) => ({ ...prev, isCustomerConfirmed: true }));
  };

  const handlePayDigital = () => {
    setIsDigitalPaid(true);
    setDetails((prev) => ({
      ...prev,
      recordedPaymentMethod: 'DIGITAL',
      digitalPaymentStatus: 'PAID',
    }));
  };

  const handleReportCashPayment = () => {
    setCashReported(true);
  };

  const handleReportProblem = () => {
    navigate('C37', { bookingId: details.bookingId, initialTab: 'dispute' });
  };

  // 1. Loading State (L)
  if (screenState === 'L') {
    return (
      <ScreenContainer
        testID="c20-completion-loading"
        title={translate(locale, 'customer.c20.title')}
      >
        <View style={styles.stateCenterContainer} testID="c20-loading-state">
          <Text style={[styles.stateTitle, textTokens(locale, 'body')]}>
            {translate(locale, 'customer.c20.statePending')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 2. Error State (X)
  if (screenState === 'X') {
    return (
      <ScreenContainer
        testID="c20-completion-error"
        title={translate(locale, 'customer.c20.title')}
      >
        <View style={styles.stateCenterContainer} testID="c20-error-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c20.stateError')}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, minTapTargetStyle()]}
            onPress={() => setScreenState('S')}
            {...interactiveProps({
              testID: 'c20-retry-button',
              accessibilityLabel: translate(locale, 'customer.c20.stateError'),
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
        testID="c20-completion-empty"
        title={translate(locale, 'customer.c20.title')}
      >
        <View style={styles.stateCenterContainer} testID="c20-empty-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c20.notRecordedYet')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 4. Pending State (P)
  if (screenState === 'P') {
    return (
      <ScreenContainer
        testID="c20-completion-pending"
        title={translate(locale, 'customer.c20.title')}
      >
        <View style={styles.stateCenterContainer} testID="c20-pending-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c20.statePending')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 5. Success State (S)
  const isPaidByCash = details.recordedPaymentMethod === 'CASH';
  const isPaidByDigital = isDigitalPaid || details.digitalPaymentStatus === 'PAID';
  const isDigitalWaiting =
    details.recordedPaymentMethod === 'DIGITAL' &&
    details.digitalPaymentStatus !== 'PAID' &&
    !isDigitalPaid;

  return (
    <ScreenContainer testID="c20-completion-screen" title={translate(locale, 'customer.c20.title')}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Work Completion Evidence Card */}
        <View style={styles.card} testID="c20-evidence-card">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c20.completionHeader')}
          </Text>

          {/* Provider Notes */}
          <View style={styles.notesBox} testID="c20-provider-notes-box">
            <Text
              style={[
                styles.notesLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              📝 {translate(locale, 'customer.c20.providerNotes')}:
            </Text>
            <Text
              style={[
                styles.notesContent,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {details.providerNotes}
            </Text>
          </View>

          {/* Completion Code Display (SEC-REVIEW #23) */}
          <View
            style={[styles.rowBetween, styles.codeBox, { flexDirection: mirror.row }]}
            testID="c20-completion-code-box"
          >
            <Text
              style={[
                styles.codeLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              🔑 {translate(locale, 'customer.c20.codeHeader')}:
            </Text>
            <View style={styles.codePill}>
              <Text style={styles.codeText} testID="c20-code-value">
                {details.completionCode}
              </Text>
            </View>
          </View>

          {/* Customer Confirmation Action (OQ-044) */}
          {!details.isCustomerConfirmed ? (
            <TouchableOpacity
              style={[styles.confirmJobBtn, minTapTargetStyle()]}
              onPress={handleConfirmCompletion}
              {...interactiveProps({
                testID: 'c20-confirm-completion-button',
                accessibilityLabel: translate(locale, 'customer.c20.confirmCompletionBtn'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.confirmJobBtnText, textTokens(locale, 'label')]}>
                ✓ {translate(locale, 'customer.c20.confirmCompletionBtn')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmedBanner} testID="c20-confirmed-banner">
              <Text
                style={[
                  styles.confirmedText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                ✓ {translate(locale, 'customer.c20.confirmCompletionThanks')}
              </Text>
            </View>
          )}
        </View>

        {/* Final Bill Breakdown Card */}
        <View style={styles.card} testID="c20-bill-card">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c20.billHeader')}
          </Text>

          <View style={[styles.billRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.billLabel,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c20.labourFee')}
            </Text>
            <Text style={[styles.billValue, textTokens(locale, 'body')]}>
              {formatPkr(locale, details.labourPkr)}
            </Text>
          </View>

          <View style={[styles.billRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.billLabel,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c20.approvedExtras')}
            </Text>
            <Text style={[styles.billValue, textTokens(locale, 'body')]}>
              {formatPkr(locale, details.extrasApprovedPkr)}
            </Text>
          </View>

          {/* Tax Line (0 at launch, D-029) */}
          <View style={[styles.billRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.billLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c20.taxZero')}
            </Text>
            <Text style={[styles.billValueMuted, textTokens(locale, 'label')]}>
              {formatPkr(locale, details.taxPkr)}
            </Text>
          </View>

          {/* Total Payable Row */}
          <View style={[styles.billRow, styles.totalRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.totalLabel,
                textTokens(locale, 'headline'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c20.totalPayable')}
            </Text>
            <Text
              style={[styles.totalAmount, textTokens(locale, 'headline')]}
              testID="c20-total-payable-amount"
            >
              {formatPkr(locale, details.totalPayablePkr)}
            </Text>
          </View>
        </View>

        {/* Payment Settlement Card (D-003, D-016, D-030, ARCH §6.8) */}
        <View style={styles.card} testID="c20-payment-card">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c20.paymentMethodHeader')}
          </Text>

          {/* Payment Gating Notice (D-003, PAY-TIMING-001) */}
          {!isJobCompleted ? (
            <View style={styles.gatingNoticeBox} testID="c20-gating-notice">
              <Text
                style={[
                  styles.gatingText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                🔒 {translate(locale, 'customer.c20.paymentGatingNotice')}
              </Text>
            </View>
          ) : null}

          {/* Cash Recorded by Provider (D-030: Customer App has NO CASH OPTION) */}
          {isPaidByCash ? (
            <View style={styles.cashNoticeBox} testID="c20-cash-recorded-box">
              <Text
                style={[
                  styles.cashNoticeText,
                  textTokens(locale, 'body'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                💵 {translate(locale, 'customer.c20.paidByCash')}
              </Text>
            </View>
          ) : isPaidByDigital ? (
            <View style={styles.paidSuccessBox} testID="c20-digital-paid-box">
              <Text
                style={[
                  styles.paidSuccessText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                ✓ {translate(locale, 'customer.c20.paidByDigital')}
              </Text>
            </View>
          ) : isDigitalWaiting ? (
            <View style={styles.waitingBox} testID="c20-digital-waiting-box">
              <Text
                style={[
                  styles.waitingText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                ⏳ {translate(locale, 'customer.c20.paidByDigitalWaiting')}
              </Text>
            </View>
          ) : (
            /* Digital Pay Checkout Trigger */
            <TouchableOpacity
              style={[styles.payNowBtn, minTapTargetStyle()]}
              onPress={handlePayDigital}
              disabled={!isJobCompleted}
              {...interactiveProps({
                testID: 'c20-pay-now-button',
                accessibilityLabel: translate(locale, 'customer.c20.payNowBtn'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.payNowBtnText, textTokens(locale, 'label')]}>
                💳 {translate(locale, 'customer.c20.payNowBtn')}
              </Text>
            </TouchableOpacity>
          )}

          {/* KK-T5 Fraud Discrepancy Action: "I paid cash" (OQ-077) */}
          {details.recordedPaymentMethod === 'DIGITAL' && !isPaidByCash && !cashReported ? (
            <TouchableOpacity
              style={[styles.reportCashBtn, minTapTargetStyle()]}
              onPress={handleReportCashPayment}
              {...interactiveProps({
                testID: 'c20-i-paid-cash-button',
                accessibilityLabel: translate(locale, 'customer.c20.iPaidCashBtn'),
                accessibilityRole: 'button',
              })}
            >
              <Text
                style={[
                  styles.reportCashBtnText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                ⚠️ {translate(locale, 'customer.c20.iPaidCashBtn')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {cashReported ? (
            <View style={styles.reportedNoticeBox} testID="c20-cash-reported-notice">
              <Text
                style={[
                  styles.reportedNoticeText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                ✓ {translate(locale, 'customer.c37.disputeSuccessNotice')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Secondary Actions: Problem & Rating */}
        <View style={styles.card} testID="c20-secondary-actions-card">
          {isJobCompleted ? (
            <TouchableOpacity
              style={[styles.rateServiceBtn, minTapTargetStyle()]}
              onPress={() =>
                navigate('C21', {
                  bookingId: details.bookingId,
                  providerName: details.providerName,
                })
              }
              {...interactiveProps({
                testID: 'c20-rate-service-button',
                accessibilityLabel: translate(locale, 'customer.c20.rateServiceBtn'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.rateServiceText, textTokens(locale, 'body')]}>
                ★ {translate(locale, 'customer.c20.rateServiceBtn')}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.secondaryActionBtn, minTapTargetStyle()]}
            onPress={handleReportProblem}
            {...interactiveProps({
              testID: 'c20-report-problem-button',
              accessibilityLabel: translate(locale, 'customer.c20.reportProblemBtn'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.secondaryActionText, textTokens(locale, 'body')]}>
              ⚠️ {translate(locale, 'customer.c20.reportProblemBtn')}
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
  sectionTitle: {
    color: COLOR.text,
    marginBottom: SPACING.sm,
    fontWeight: '700',
  },
  notesBox: {
    backgroundColor: '#F5F5F5',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  notesLabel: {
    color: COLOR.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  notesContent: {
    color: COLOR.text,
  },
  rowBetween: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeBox: {
    backgroundColor: '#E0F2F1',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  codeLabel: {
    color: '#00695C',
    fontWeight: '700',
  },
  codePill: {
    backgroundColor: '#004D40',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  codeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 2,
  },
  confirmJobBtn: {
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmJobBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
  confirmedBanner: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignItems: 'center',
  },
  confirmedText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  billRow: {
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billLabel: {
    color: COLOR.textMuted,
  },
  billValue: {
    color: COLOR.text,
    fontWeight: '600',
  },
  billValueMuted: {
    color: COLOR.textMuted,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
  },
  totalLabel: {
    color: COLOR.text,
    fontWeight: '700',
  },
  totalAmount: {
    color: COLOR.primary,
    fontWeight: '800',
  },
  gatingNoticeBox: {
    backgroundColor: '#FFF8E1',
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#FFE082',
    marginBottom: SPACING.sm,
  },
  gatingText: {
    color: '#795548',
  },
  cashNoticeBox: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  cashNoticeText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  paidSuccessBox: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignItems: 'center',
  },
  paidSuccessText: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  waitingBox: {
    backgroundColor: '#FFF3E0',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  waitingText: {
    color: '#E65100',
  },
  payNowBtn: {
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
  reportCashBtn: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  reportCashBtnText: {
    color: '#C62828',
    textDecorationLine: 'underline',
  },
  reportedNoticeBox: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  reportedNoticeText: {
    color: '#2E7D32',
  },
  rateServiceBtn: {
    backgroundColor: '#FEF3C7',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  rateServiceText: {
    color: '#B45309',
    fontWeight: '700',
  },
  secondaryActionBtn: {
    paddingVertical: SPACING.xs,
  },
  secondaryActionText: {
    color: COLOR.text,
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

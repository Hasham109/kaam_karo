/**
 * C16: Payment Screen (T6.4; BP §12 C16, D-003, D-008, D-025, D-029, D-030; PAY-TIMING-001, PAY-001, PAY-002, PAY-008, PAY-009).
 * Features:
 * - Final bill lines: Labour, Materials/extras, Tax line (D-029, launch Rs. 0).
 * - No platform fee (D-025); No commission visible to customer (COMM-004).
 * - Total to pay display.
 * - Payment gating: Pay enabled ONLY after job is Completed (D-003, PAY-TIMING-001).
 * - Payment Invariant (D-030): Cash info row only; no customer cash selection button.
 * - Digital hosted gateway trigger with confirmation modal.
 * - 5 canonical screen states (L, E, S, X, P).
 * - Pending state (P) shows G-PENDING copy with Pay disabled (BP §31.1).
 */
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { MOCK_PAYMENT_DETAILS } from '../data/mock-data';
import type { CustomerPaymentDetails, ScreenState } from '../types';

export interface C16PaymentScreenProps {
  readonly initialDetails?: CustomerPaymentDetails;
  readonly initialState?: ScreenState;
  readonly onPaymentSuccess?: (gatewayRef: string) => void;
}

export const C16PaymentScreen: React.FC<C16PaymentScreenProps> = ({
  initialDetails = MOCK_PAYMENT_DETAILS,
  initialState = 'S',
  onPaymentSuccess,
}) => {
  const { locale, navigate } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [details, setDetails] = useState<CustomerPaymentDetails>(initialDetails);
  const [screenState, setScreenState] = useState<ScreenState>(initialState);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // If already paid, screen behaves in Empty/Paid state
  const isPaid = details.status === 'PAID';
  const effectiveState: ScreenState = isPaid && screenState === 'S' ? 'E' : screenState;

  const handleOpenConfirm = () => {
    if (!details.isJobCompleted) {
      setScreenState('X');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmPay = () => {
    setShowConfirmModal(false);
    setIsProcessing(true);
    setScreenState('L');

    // Simulate gateway flow
    setTimeout(() => {
      const success = true;
      setIsProcessing(false);
      if (success) {
        const ref = `GW-${Date.now()}`;
        setDetails((prev) => ({
          ...prev,
          status: 'PAID',
          paidMethod: 'DIGITAL',
          paidAt: new Date().toISOString(),
          gatewayRef: ref,
        }));
        setScreenState('S');
        onPaymentSuccess?.(ref);
      } else {
        setScreenState('X');
      }
    }, 600);
  };

  const handleSimulateNetworkLoss = () => {
    setScreenState('P');
  };

  const handleViewReceipt = () => {
    navigate('C24', { bookingId: details.bookingId });
  };

  // 1. Loading State (L)
  if (effectiveState === 'L') {
    return (
      <ScreenContainer testID="c16-payment-loading" title={translate(locale, 'customer.c16.title')}>
        <View style={styles.stateCenterContainer} testID="c16-loading-state">
          <Text style={[styles.stateTitle, textTokens(locale, 'body')]}>
            {translate(locale, 'customer.c16.startingPayment')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 2. Error State (X)
  if (effectiveState === 'X') {
    return (
      <ScreenContainer testID="c16-payment-error" title={translate(locale, 'customer.c16.title')}>
        <View style={styles.stateCenterContainer} testID="c16-error-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {!details.isJobCompleted
              ? translate(locale, 'customer.c16.notCompleted')
              : translate(locale, 'customer.c16.paymentFailed')}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, minTapTargetStyle()]}
            onPress={() => setScreenState('S')}
            {...interactiveProps({
              testID: 'c16-retry-button',
              accessibilityLabel: translate(locale, 'common.action.retry'),
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

  // 3. Pending/Unknown State (P) — BP §31.1
  if (effectiveState === 'P') {
    return (
      <ScreenContainer testID="c16-payment-pending" title={translate(locale, 'customer.c16.title')}>
        <View style={styles.stateCenterContainer} testID="c16-pending-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c16.paymentProcessing')}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, minTapTargetStyle()]}
            onPress={() => setScreenState('S')}
            {...interactiveProps({
              testID: 'c16-check-status-button',
              accessibilityLabel: translate(locale, 'customer.c16.checkStatus'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.btnTextPrimary, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c16.checkStatus')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // 4. Empty State (E) — Nothing to pay (Already paid digitally or cash recorded)
  if (effectiveState === 'E') {
    const methodStr =
      details.paidMethod === 'CASH'
        ? translate(locale, 'customer.c24.methodCash')
        : translate(locale, 'customer.c24.methodDigital');

    return (
      <ScreenContainer testID="c16-payment-empty" title={translate(locale, 'customer.c16.title')}>
        <View style={styles.stateCenterContainer} testID="c16-empty-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c16.nothingToPay', { method: methodStr })}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, minTapTargetStyle()]}
            onPress={handleViewReceipt}
            {...interactiveProps({
              testID: 'c16-view-receipt-empty-button',
              accessibilityLabel: translate(locale, 'customer.c16.viewReceipt'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.btnTextPrimary, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c16.viewReceipt')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // 5. Success State (S) — Standard Payment Screen
  const totalFormatted = formatPkr(locale, details.totalMinor / 100);
  const labourFormatted = formatPkr(locale, details.labourMinor / 100);
  const materialsFormatted = formatPkr(locale, details.materialsMinor / 100);
  const taxFormatted = formatPkr(locale, details.taxMinor / 100);

  return (
    <ScreenContainer testID="c16-payment-screen" title={translate(locale, 'customer.c16.title')}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Bill Breakdown Card */}
        <View style={styles.card} testID="c16-bill-card">
          <Text
            style={[
              styles.cardHeader,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c16.billHeader')}
          </Text>

          <View style={[styles.billRow, { flexDirection: mirror.row }]}>
            <Text style={[styles.billLabel, textTokens(locale, 'body')]}>
              {translate(locale, 'customer.c16.labour')}
            </Text>
            <Text style={[styles.billValue, textTokens(locale, 'body')]}>{labourFormatted}</Text>
          </View>

          <View style={[styles.billRow, { flexDirection: mirror.row }]}>
            <Text style={[styles.billLabel, textTokens(locale, 'body')]}>
              {translate(locale, 'customer.c16.materials')}
            </Text>
            <Text style={[styles.billValue, textTokens(locale, 'body')]}>{materialsFormatted}</Text>
          </View>

          <View style={[styles.billRow, { flexDirection: mirror.row }]}>
            <Text style={[styles.billLabel, textTokens(locale, 'body')]}>
              {translate(locale, 'customer.c16.taxZero')}
            </Text>
            <Text style={[styles.billValue, textTokens(locale, 'body')]}>{taxFormatted}</Text>
          </View>

          <View style={styles.divider} />

          <View style={[styles.billRow, { flexDirection: mirror.row }]}>
            <Text style={[styles.totalLabel, textTokens(locale, 'title')]}>
              {translate(locale, 'customer.c16.totalToPay')}
            </Text>
            <Text style={[styles.totalValue, textTokens(locale, 'title')]}>{totalFormatted}</Text>
          </View>
        </View>

        {/* Status Chip */}
        <View style={[styles.statusContainer, { flexDirection: mirror.row }]}>
          <View
            style={[
              styles.statusChip,
              details.status === 'PAID'
                ? styles.statusPaid
                : details.status === 'PROCESSING'
                  ? styles.statusProcessing
                  : details.status === 'FAILED'
                    ? styles.statusFailed
                    : styles.statusNotPaid,
            ]}
            testID="c16-status-chip"
          >
            <Text style={[styles.statusChipText, textTokens(locale, 'label')]}>
              {details.status === 'PAID'
                ? translate(locale, 'customer.c16.statusPaid')
                : details.status === 'PROCESSING'
                  ? translate(locale, 'customer.c16.statusProcessing')
                  : details.status === 'FAILED'
                    ? translate(locale, 'customer.c16.statusFailed')
                    : translate(locale, 'customer.c16.statusNotPaid')}
            </Text>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.card} testID="c16-methods-card">
          <Text
            style={[
              styles.cardHeader,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c16.howToPay')}
          </Text>

          {/* Digital Option */}
          <View style={[styles.methodRow, { flexDirection: mirror.row }]}>
            <View style={styles.methodInfo}>
              <Text
                style={[
                  styles.methodTitle,
                  textTokens(locale, 'body'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {translate(locale, 'customer.c16.digitalMethod')}
              </Text>
            </View>
          </View>

          {/* D-030 Invariant: Cash Information Row (NO button or selection) */}
          <View style={styles.cashInfoBox} testID="c16-cash-info-row">
            <Text
              style={[
                styles.cashInfoText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c16.cashInfo')}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              minTapTargetStyle(),
              (!details.isJobCompleted || isProcessing) && styles.disabledBtn,
            ]}
            disabled={!details.isJobCompleted || isProcessing}
            onPress={handleOpenConfirm}
            {...interactiveProps({
              testID: 'c16-pay-button',
              accessibilityLabel: translate(locale, 'customer.c16.payBtn', {
                total: totalFormatted,
              }),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.btnTextPrimary, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c16.payBtn', { total: totalFormatted })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, minTapTargetStyle()]}
            onPress={handleViewReceipt}
            {...interactiveProps({
              testID: 'c16-view-receipt-button',
              accessibilityLabel: translate(locale, 'customer.c16.viewReceipt'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.btnTextSecondary, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c16.viewReceipt')}
            </Text>
          </TouchableOpacity>

          {/* Dev/QA test helper for BP §31.1 timeout simulation */}
          <TouchableOpacity
            style={[styles.ghostBtn, minTapTargetStyle()]}
            onPress={handleSimulateNetworkLoss}
            {...interactiveProps({
              testID: 'c16-simulate-network-loss',
              accessibilityLabel: translate(locale, 'customer.c16.paymentProcessing'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.btnTextGhost, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c16.paymentProcessing')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Dialog */}
      <Modal visible={showConfirmModal} transparent animationType="fade" testID="c16-confirm-modal">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text
              style={[
                styles.modalTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c16.confirmTitle')}
            </Text>
            <Text
              style={[
                styles.modalBody,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c16.confirmBody', {
                total: totalFormatted,
                number: details.bookingRef,
              })}
            </Text>

            <View style={[styles.modalActions, { flexDirection: mirror.row }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, minTapTargetStyle()]}
                onPress={() => setShowConfirmModal(false)}
                {...interactiveProps({
                  testID: 'c16-modal-cancel-button',
                  accessibilityLabel: translate(locale, 'customer.c16.cancelBtn'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.btnTextSecondary, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.c16.cancelBtn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, minTapTargetStyle()]}
                onPress={handleConfirmPay}
                {...interactiveProps({
                  testID: 'c16-modal-confirm-button',
                  accessibilityLabel: translate(locale, 'customer.c16.confirmBtn'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.btnTextPrimary, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.c16.confirmBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  cardHeader: {
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  billRow: {
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  billLabel: {
    color: COLOR.textMuted,
  },
  billValue: {
    color: COLOR.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLOR.border,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    color: COLOR.text,
  },
  totalValue: {
    color: COLOR.primary,
  },
  statusContainer: {
    marginVertical: SPACING.xs,
  },
  statusChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  statusPaid: {
    backgroundColor: '#E8F5E9',
  },
  statusProcessing: {
    backgroundColor: '#FFF8E1',
  },
  statusFailed: {
    backgroundColor: '#FFEBEE',
  },
  statusNotPaid: {
    backgroundColor: '#ECEFF1',
  },
  statusChipText: {
    color: COLOR.text,
    fontWeight: '600',
  },
  methodRow: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    color: COLOR.text,
    fontWeight: '600',
  },
  cashInfoBox: {
    backgroundColor: '#F5F5F5',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  cashInfoText: {
    color: COLOR.textMuted,
  },
  actionsContainer: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  primaryBtn: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  secondaryBtn: {
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  ghostBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  btnTextPrimary: {
    color: COLOR.onPrimary,
    fontWeight: '600',
  },
  btnTextSecondary: {
    color: COLOR.text,
    fontWeight: '600',
  },
  btnTextGhost: {
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
  },
  retryBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    gap: SPACING.md,
  },
  modalTitle: {
    color: COLOR.text,
  },
  modalBody: {
    color: COLOR.textMuted,
  },
  modalActions: {
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

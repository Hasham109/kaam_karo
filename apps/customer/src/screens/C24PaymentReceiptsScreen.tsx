/**
 * C24: Payments & Receipts Screen (T6.4; BP §12 C24, BP §23, BP §26, D-025, D-029, PAY-006, PAY-009).
 * Features:
 * - Transaction history list: date, booking #, amount, method (Cash/Digital), status (Paid / Failed / Refunded / Processing).
 * - Receipt detail view: bill lines, tax line (Rs. 0), total, paid by, date, booking #.
 * - Refund row: linked reversal with amount and date (PAY-006).
 * - Share receipt summary action (SHARE-001).
 * - 5 canonical screen states (L, E, S, X, P).
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
import { MOCK_CUSTOMER_RECEIPTS } from '../data/mock-data';
import type { CustomerReceiptItem, ScreenState } from '../types';

export interface C24PaymentReceiptsScreenProps {
  readonly initialReceipts?: CustomerReceiptItem[];
  readonly initialState?: ScreenState;
  readonly onShareReceipt?: (text: string) => void;
}

export const C24PaymentReceiptsScreen: React.FC<C24PaymentReceiptsScreenProps> = ({
  initialReceipts = MOCK_CUSTOMER_RECEIPTS,
  initialState = 'S',
  onShareReceipt,
}) => {
  const { locale } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [receipts] = useState<CustomerReceiptItem[]>(initialReceipts);
  const [screenState, setScreenState] = useState<ScreenState>(initialState);
  const [selectedReceipt, setSelectedReceipt] = useState<CustomerReceiptItem | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleOpenReceipt = (receipt: CustomerReceiptItem) => {
    setSelectedReceipt(receipt);
    setShareFeedback(null);
  };

  const handleCloseReceipt = () => {
    setSelectedReceipt(null);
    setShareFeedback(null);
  };

  const handleShare = () => {
    if (!selectedReceipt) return;
    const methodStr =
      selectedReceipt.method === 'CASH'
        ? translate(locale, 'customer.c24.methodCash')
        : translate(locale, 'customer.c24.methodDigital');

    const shareText = translate(locale, 'customer.c24.shareText', {
      number: selectedReceipt.bookingRef,
      amount: formatPkr(locale, selectedReceipt.amountMinor / 100),
      method: methodStr,
    });

    onShareReceipt?.(shareText);
    setShareFeedback(shareText);
  };

  // 1. Loading State (L)
  if (screenState === 'L') {
    return (
      <ScreenContainer
        testID="c24-receipts-loading"
        title={translate(locale, 'customer.c24.title')}
      >
        <View style={styles.stateCenterContainer} testID="c24-loading-state">
          <Text style={[styles.stateTitle, textTokens(locale, 'body')]}>
            {translate(locale, 'customer.c24.loading')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 2. Error State (X)
  if (screenState === 'X') {
    return (
      <ScreenContainer testID="c24-receipts-error" title={translate(locale, 'customer.c24.title')}>
        <View style={styles.stateCenterContainer} testID="c24-error-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c24.error')}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, minTapTargetStyle()]}
            onPress={() => setScreenState('S')}
            {...interactiveProps({
              testID: 'c24-retry-button',
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

  // 3. Empty State (E)
  if (screenState === 'E' || receipts.length === 0) {
    return (
      <ScreenContainer testID="c24-receipts-empty" title={translate(locale, 'customer.c24.title')}>
        <View style={styles.stateCenterContainer} testID="c24-empty-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c24.noTransactions')}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  // 4. Pending State (P) — Simulation of processing status
  if (screenState === 'P') {
    return (
      <ScreenContainer
        testID="c24-receipts-pending"
        title={translate(locale, 'customer.c24.title')}
      >
        <View style={styles.stateCenterContainer} testID="c24-pending-state">
          <Text
            style={[styles.stateTitle, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c24.statusProcessing')}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, minTapTargetStyle()]}
            onPress={() => setScreenState('S')}
            {...interactiveProps({
              testID: 'c24-pending-refresh-button',
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

  // 5. Success State (S) — Transaction History List
  return (
    <ScreenContainer testID="c24-receipts-screen" title={translate(locale, 'customer.c24.title')}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text
          style={[
            styles.sectionTitle,
            textTokens(locale, 'title'),
            { textAlign: mirror.textAlign },
          ]}
        >
          {translate(locale, 'customer.c24.historyHeader')}
        </Text>

        {receipts.map((item) => {
          const amountFormatted = formatPkr(locale, item.amountMinor / 100);
          const methodLabel =
            item.method === 'CASH'
              ? translate(locale, 'customer.c24.methodCash')
              : translate(locale, 'customer.c24.methodDigital');

          const statusLabel =
            item.status === 'PAID'
              ? translate(locale, 'customer.c24.statusPaid')
              : item.status === 'REFUNDED'
                ? translate(locale, 'customer.c24.statusRefunded')
                : item.status === 'PROCESSING'
                  ? translate(locale, 'customer.c24.statusProcessing')
                  : translate(locale, 'customer.c24.statusFailed');

          return (
            <View
              key={item.id}
              style={styles.transactionCard}
              testID={`c24-receipt-row-${item.id}`}
            >
              <View style={[styles.cardTopRow, { flexDirection: mirror.row }]}>
                <View style={styles.infoCol}>
                  <Text
                    style={[
                      styles.bookingRefText,
                      textTokens(locale, 'title'),
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    {translate(locale, 'customer.c24.bookingRef', { number: item.bookingRef })}
                  </Text>
                  <Text
                    style={[
                      styles.serviceTitleText,
                      textTokens(locale, 'body'),
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    {item.serviceTitle}
                  </Text>
                  <Text
                    style={[
                      styles.metaText,
                      textTokens(locale, 'label'),
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    {`${item.date} · ${methodLabel}`}
                  </Text>
                </View>

                <View style={styles.amountCol}>
                  <Text style={[styles.amountText, textTokens(locale, 'title')]}>
                    {amountFormatted}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'PAID'
                        ? styles.statusBadgePaid
                        : item.status === 'REFUNDED'
                          ? styles.statusBadgeRefunded
                          : item.status === 'PROCESSING'
                            ? styles.statusBadgeProcessing
                            : styles.statusBadgeFailed,
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, textTokens(locale, 'label')]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Linked Refund Row if present */}
              {item.refund && (
                <View style={[styles.refundRowBox, { flexDirection: mirror.row }]}>
                  <Text
                    style={[
                      styles.refundText,
                      textTokens(locale, 'label'),
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    {translate(locale, 'customer.c24.refundRow', {
                      amount: formatPkr(locale, item.refund.amountMinor / 100),
                      date: item.refund.date,
                    })}
                  </Text>
                </View>
              )}

              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={[styles.viewReceiptBtn, minTapTargetStyle()]}
                  onPress={() => handleOpenReceipt(item)}
                  {...interactiveProps({
                    testID: `c24-view-btn-${item.id}`,
                    accessibilityLabel: translate(locale, 'customer.c24.viewReceipt'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={[styles.btnTextSecondary, textTokens(locale, 'label')]}>
                    {translate(locale, 'customer.c24.viewReceipt')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Receipt Detail Modal */}
      <Modal
        visible={selectedReceipt !== null}
        transparent
        animationType="slide"
        testID="c24-receipt-modal"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {selectedReceipt && (
              <>
                <Text
                  style={[
                    styles.modalHeader,
                    textTokens(locale, 'title'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {translate(locale, 'customer.c24.receiptHeader')}
                </Text>

                <View style={styles.receiptBody}>
                  <View style={[styles.detailRow, { flexDirection: mirror.row }]}>
                    <Text style={[styles.detailLabel, textTokens(locale, 'body')]}>
                      {translate(locale, 'customer.c24.bookingRef', {
                        number: selectedReceipt.bookingRef,
                      })}
                    </Text>
                    <Text style={[styles.detailValue, textTokens(locale, 'body')]}>
                      {selectedReceipt.serviceTitle}
                    </Text>
                  </View>

                  <View style={[styles.detailRow, { flexDirection: mirror.row }]}>
                    <Text style={[styles.detailLabel, textTokens(locale, 'body')]}>
                      {translate(locale, 'customer.c24.paidBy', {
                        method:
                          selectedReceipt.method === 'CASH'
                            ? translate(locale, 'customer.c24.methodCash')
                            : translate(locale, 'customer.c24.methodDigital'),
                      })}
                    </Text>
                  </View>

                  <View style={[styles.detailRow, { flexDirection: mirror.row }]}>
                    <Text style={[styles.detailLabel, textTokens(locale, 'label')]}>
                      {translate(locale, 'customer.c24.paidOn', { date: selectedReceipt.date })}
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  {/* Bill Lines */}
                  {selectedReceipt.billLines.map((line, idx) => (
                    <View key={idx} style={[styles.detailRow, { flexDirection: mirror.row }]}>
                      <Text style={[styles.detailLabel, textTokens(locale, 'body')]}>
                        {translate(locale, line.titleKey as 'customer.c16.labour')}
                      </Text>
                      <Text style={[styles.detailValue, textTokens(locale, 'body')]}>
                        {formatPkr(locale, line.amountMinor / 100)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.divider} />

                  <View style={[styles.detailRow, { flexDirection: mirror.row }]}>
                    <Text style={[styles.totalLabel, textTokens(locale, 'title')]}>
                      {translate(locale, 'customer.c24.totalAmount', {
                        amount: formatPkr(locale, selectedReceipt.amountMinor / 100),
                      })}
                    </Text>
                  </View>

                  {/* Refund Row */}
                  {selectedReceipt.refund && (
                    <View style={[styles.refundDetailBox, { flexDirection: mirror.row }]}>
                      <Text style={[styles.refundText, textTokens(locale, 'body')]}>
                        {translate(locale, 'customer.c24.refundRow', {
                          amount: formatPkr(locale, selectedReceipt.refund.amountMinor / 100),
                          date: selectedReceipt.refund.date,
                        })}
                      </Text>
                    </View>
                  )}

                  {/* Share Feedback Toast */}
                  {shareFeedback && (
                    <View style={styles.shareFeedbackBox}>
                      <Text style={[styles.shareFeedbackText, textTokens(locale, 'label')]}>
                        {shareFeedback}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Modal Actions */}
                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.primaryBtn, minTapTargetStyle()]}
                    onPress={handleShare}
                    {...interactiveProps({
                      testID: 'c24-share-receipt-button',
                      accessibilityLabel: translate(locale, 'customer.c24.shareBtn'),
                      accessibilityRole: 'button',
                    })}
                  >
                    <Text style={[styles.btnTextPrimary, textTokens(locale, 'label')]}>
                      {translate(locale, 'customer.c24.shareBtn')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryBtn, minTapTargetStyle()]}
                    onPress={handleCloseReceipt}
                    {...interactiveProps({
                      testID: 'c24-close-receipt-button',
                      accessibilityLabel: translate(locale, 'customer.c24.closeReceipt'),
                      accessibilityRole: 'button',
                    })}
                  >
                    <Text style={[styles.btnTextSecondary, textTokens(locale, 'label')]}>
                      {translate(locale, 'customer.c24.closeReceipt')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  sectionTitle: {
    color: COLOR.text,
    marginBottom: SPACING.xs,
  },
  transactionCard: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLOR.border,
    gap: SPACING.sm,
  },
  cardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoCol: {
    flex: 1,
    gap: SPACING.xs,
  },
  bookingRefText: {
    color: COLOR.primary,
  },
  serviceTitleText: {
    color: COLOR.text,
  },
  metaText: {
    color: COLOR.textMuted,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  amountText: {
    color: COLOR.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusBadgePaid: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeRefunded: {
    backgroundColor: '#EDE7F6',
  },
  statusBadgeProcessing: {
    backgroundColor: '#FFF8E1',
  },
  statusBadgeFailed: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    color: COLOR.text,
    fontWeight: '600',
  },
  refundRowBox: {
    backgroundColor: '#F3E5F5',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  refundText: {
    color: '#6A1B9A',
    fontWeight: '600',
  },
  cardActionsRow: {
    alignItems: 'flex-end',
  },
  viewReceiptBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextSecondary: {
    color: COLOR.text,
    fontWeight: '600',
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
  btnTextPrimary: {
    color: COLOR.onPrimary,
    fontWeight: '600',
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
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLOR.surface,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    padding: SPACING.lg,
    maxHeight: '90%',
    gap: SPACING.md,
  },
  modalHeader: {
    color: COLOR.text,
  },
  receiptBody: {
    gap: SPACING.sm,
  },
  detailRow: {
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  detailLabel: {
    color: COLOR.textMuted,
  },
  detailValue: {
    color: COLOR.text,
  },
  totalLabel: {
    color: COLOR.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLOR.border,
    marginVertical: SPACING.xs,
  },
  refundDetailBox: {
    backgroundColor: '#F3E5F5',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  shareFeedbackBox: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  shareFeedbackText: {
    color: '#2E7D32',
  },
  modalButtonsContainer: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
});

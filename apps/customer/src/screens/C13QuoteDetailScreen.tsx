/**
 * C13: Quote Detail Screen (T3.10; BP §12, §18; D-003, D-004, D-029).
 * Granular fare lines, materials classification, inspection fee deductible flag,
 * crew size, validity timer, and server-driven accept/decline actions.
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
import type { QuoteOfferCard, ServerAllowedAction } from '../types';

export const MOCK_QUOTE_DETAIL: QuoteOfferCard & {
  allowedNextActions: readonly ServerAllowedAction[];
  isInspectionDeductible: boolean;
  inspectionFeePkr: number;
} = {
  id: 'quote-101',
  bookingId: 'book-881',
  providerProfileId: 'prov-1',
  providerName: 'Tariq Mehmood',
  businessName: 'Tariq AC Solutions',
  avatarMediaId: null,
  verificationLevel: 'BUSINESS_VERIFIED',
  ratingAverage: 4.9,
  totalAmountPkr: 3500,
  isEstimate: false,
  crewSize: 2,
  validUntil: '2026-10-25 18:00',
  status: 'OFFERED',
  isInspectionDeductible: true,
  inspectionFeePkr: 500,
  lines: [
    {
      id: 'l1',
      lineType: 'LABOR',
      description: 'AC General Service & Indoor/Outdoor Jet Coil Wash',
      amountPkr: 2500,
    },
    {
      id: 'l2',
      lineType: 'PARTS',
      description: 'High-durability replacement gasket',
      amountPkr: 600,
      materialsClass: 'INCLUDED',
    },
    {
      id: 'l3',
      lineType: 'TAX',
      description: 'Punjab Sales Tax on Services',
      amountPkr: 400,
    },
  ],
  inclusions: 'High pressure coil jet cleaning, gas pressure measurement, electrical wiring check',
  exclusions: 'Gas refill/top-up, compressor rebuild, PCB soldering',
  expectedDurationMinutes: 60,
  allowedNextActions: [
    {
      action: 'ACCEPT_QUOTE',
      targetStatus: 'ACCEPTED',
      labelEn: 'Accept this price',
      labelUr: 'یہ قیمت قبول کریں',
      requiresConfirmation: true,
    },
    {
      action: 'DECLINE_QUOTE',
      targetStatus: 'REQUESTED',
      labelEn: 'Decline',
      labelUr: 'رد کریں',
      destructive: true,
      requiresConfirmation: true,
    },
    {
      action: 'ASK_QUESTION',
      targetStatus: 'REQUESTED',
      labelEn: 'Ask a question',
      labelUr: 'سوال پوچھیں',
    },
  ],
};

export const C13QuoteDetailScreen: React.FC = () => {
  const { locale, navigate } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [quoteState, setQuoteState] = useState(MOCK_QUOTE_DETAIL);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [declinedNotice, setDeclinedNotice] = useState(false);

  const handleConfirmAccept = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowAcceptModal(false);
      // Navigate to C15 Booking Confirmation
      navigate('C15', { bookingId: quoteState.bookingId, status: 'ACCEPTED' });
    }, 350);
  };

  const handleConfirmDecline = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowDeclineModal(false);
      setDeclinedNotice(true);
      setQuoteState((prev) => ({ ...prev, status: 'DECLINED' as const }));
    }, 300);
  };

  return (
    <ScreenContainer testID="c13-quote-screen" title={translate(locale, 'customer.c13.title')}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Provider Header Card */}
        <View style={styles.providerCard} testID="c13-provider-header">
          <View style={[styles.providerRow, { flexDirection: mirror.row }]}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{quoteState.providerName.charAt(0)}</Text>
            </View>
            <View style={styles.providerInfo}>
              <Text
                style={[
                  styles.providerName,
                  textTokens(locale, 'title'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {quoteState.businessName || quoteState.providerName}
              </Text>
              <Text
                style={[
                  styles.providerBadge,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                🛡️ {quoteState.verificationLevel} · ⭐{' '}
                {quoteState.ratingAverage?.toFixed(1) || '5.0'}
              </Text>
            </View>
          </View>

          {/* Crew Size & Validity Strip */}
          <View style={[styles.metaStrip, { flexDirection: mirror.row }]}>
            <Text style={[styles.crewSizeText, textTokens(locale, 'label')]}>
              👥 {translate(locale, 'customer.c36.workersCount', { n: quoteState.crewSize })}
            </Text>
            <Text style={[styles.validityText, textTokens(locale, 'label')]}>
              ⏱️{' '}
              {translate(locale, 'customer.c13.validUntilFormat', {
                dateTime: quoteState.validUntil,
              })}
            </Text>
          </View>
        </View>

        {/* Declined Warning Banner */}
        {declinedNotice ? (
          <View testID="c13-declined-notice" style={styles.declinedNotice}>
            <Text
              style={[
                styles.declinedNoticeText,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c13.quoteDeclinedNotice')}
            </Text>
          </View>
        ) : null}

        {/* Fare Breakdown Card */}
        <View style={styles.card} testID="c13-price-breakdown-card">
          <Text
            style={[styles.cardTitle, textTokens(locale, 'title'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, 'customer.c13.priceBreakdown')}
          </Text>

          {quoteState.lines.map((line, idx) => (
            <View key={line.id || idx} style={[styles.fareLineRow, { flexDirection: mirror.row }]}>
              <View style={styles.fareLineLeft}>
                <Text
                  style={[
                    styles.lineDesc,
                    textTokens(locale, 'body'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {line.description}
                </Text>
                {line.materialsClass ? (
                  <Text style={[styles.materialTag, textTokens(locale, 'label')]}>
                    {line.materialsClass === 'INCLUDED'
                      ? translate(locale, 'customer.c13.materialIncluded')
                      : translate(locale, 'customer.c13.materialExtra')}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.linePrice, textTokens(locale, 'title')]}>
                {formatPkr(locale, line.amountPkr)}
              </Text>
            </View>
          ))}

          {/* Inspection Fee Deductible Note */}
          <View style={styles.inspectionFeeBox}>
            <Text
              style={[
                styles.inspectionFeeText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {quoteState.isInspectionDeductible
                ? translate(locale, 'customer.c13.inspectionDeducted')
                : translate(locale, 'customer.c13.inspectionNotDeducted')}
            </Text>
          </View>

          {/* Total Row */}
          <View style={[styles.totalRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.totalLabel,
                textTokens(locale, 'headline'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c13.totalLabel')}
            </Text>
            <Text style={[styles.totalAmount, textTokens(locale, 'headline')]}>
              {formatPkr(locale, quoteState.totalAmountPkr)}
            </Text>
          </View>
        </View>

        {/* Inclusions & Exclusions */}
        {quoteState.inclusions ? (
          <View style={styles.card} testID="c13-inclusions-card">
            <Text
              style={[
                styles.cardTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c13.inclusionsHeader')}
            </Text>
            <Text
              style={[
                styles.inclusionsBody,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              ✅ {quoteState.inclusions}
            </Text>
          </View>
        ) : null}

        {quoteState.exclusions ? (
          <View style={styles.card} testID="c13-exclusions-card">
            <Text
              style={[
                styles.cardTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c13.exclusionsHeader')}
            </Text>
            <Text
              style={[
                styles.exclusionsBody,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              ❌ {quoteState.exclusions}
            </Text>
          </View>
        ) : null}

        {/* Expected Duration */}
        {quoteState.expectedDurationMinutes ? (
          <View style={styles.durationCard}>
            <Text
              style={[
                styles.durationText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              ⏳{' '}
              {translate(locale, 'customer.c13.expectedDuration', {
                duration: `${quoteState.expectedDurationMinutes} min`,
              })}
            </Text>
          </View>
        ) : null}

        {/* Payment At End Policy Banner (D-003) */}
        <View style={styles.paymentNoticeBox} testID="c13-payment-notice">
          <Text
            style={[
              styles.paymentNoticeText,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            🛡️ {translate(locale, 'customer.payment.atEnd')}
          </Text>
        </View>

        {/* Server-Driven Allowed Actions (BOOK-STATUS-016, BP §15.1) */}
        {quoteState.status === 'OFFERED' ? (
          <View style={styles.actionsContainer} testID="c13-server-actions">
            {quoteState.allowedNextActions.map((item) => {
              if (item.action === 'ACCEPT_QUOTE') {
                return (
                  <TouchableOpacity
                    key={item.action}
                    onPress={() => setShowAcceptModal(true)}
                    style={[styles.acceptBtn, minTapTargetStyle()]}
                    {...interactiveProps({
                      testID: 'c13-accept-button',
                      accessibilityLabel: locale === 'ur' ? item.labelUr : item.labelEn,
                      accessibilityRole: 'button',
                    })}
                  >
                    <Text style={[styles.acceptBtnText, textTokens(locale, 'title')]}>
                      {locale === 'ur' ? item.labelUr : item.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              }

              if (item.action === 'DECLINE_QUOTE') {
                return (
                  <TouchableOpacity
                    key={item.action}
                    onPress={() => setShowDeclineModal(true)}
                    style={[styles.declineBtn, minTapTargetStyle()]}
                    {...interactiveProps({
                      testID: 'c13-decline-button',
                      accessibilityLabel: locale === 'ur' ? item.labelUr : item.labelEn,
                      accessibilityRole: 'button',
                    })}
                  >
                    <Text style={[styles.declineBtnText, textTokens(locale, 'label')]}>
                      {locale === 'ur' ? item.labelUr : item.labelEn}
                    </Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={item.action}
                  onPress={() => {}}
                  style={[styles.secondaryActionBtn, minTapTargetStyle()]}
                  {...interactiveProps({
                    testID: `c13-action-${item.action.toLowerCase()}`,
                    accessibilityLabel: locale === 'ur' ? item.labelUr : item.labelEn,
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={[styles.secondaryActionText, textTokens(locale, 'label')]}>
                    {locale === 'ur' ? item.labelUr : item.labelEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* Confirmation Modal for Accepting Quote */}
      <Modal visible={showAcceptModal} transparent={true} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="c13-accept-confirm-dialog">
            <Text
              style={[
                styles.modalTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c36.acceptConfirmTitle', {
                provider: quoteState.providerName,
                total: quoteState.totalAmountPkr,
              })}
            </Text>
            <Text
              style={[
                styles.modalBody,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c36.acceptConfirmBody')}
            </Text>

            <View style={[styles.modalButtonsRow, { flexDirection: mirror.row }]}>
              <TouchableOpacity
                onPress={() => setShowAcceptModal(false)}
                style={[styles.modalCancelBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c13-modal-cancel-button',
                  accessibilityLabel: translate(locale, 'common.action.cancel'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.modalCancelText, textTokens(locale, 'label')]}>
                  {translate(locale, 'common.action.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmAccept}
                disabled={isSubmitting}
                style={[styles.modalConfirmBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c13-modal-confirm-button',
                  accessibilityLabel: translate(locale, 'common.action.confirm'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.modalConfirmText, textTokens(locale, 'title')]}>
                  {isSubmitting
                    ? translate(locale, 'common.state.loading')
                    : translate(locale, 'common.action.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal for Declining Quote */}
      <Modal visible={showDeclineModal} transparent={true} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="c13-decline-confirm-dialog">
            <Text
              style={[
                styles.modalTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c13.declineQuote')}
            </Text>
            <Text
              style={[
                styles.modalBody,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c13.quoteDeclinedNotice')}
            </Text>

            <View style={[styles.modalButtonsRow, { flexDirection: mirror.row }]}>
              <TouchableOpacity
                onPress={() => setShowDeclineModal(false)}
                style={[styles.modalCancelBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c13-decline-cancel-button',
                  accessibilityLabel: translate(locale, 'common.action.cancel'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.modalCancelText, textTokens(locale, 'label')]}>
                  {translate(locale, 'common.action.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmDecline}
                disabled={isSubmitting}
                style={[styles.modalDeclineConfirmBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c13-decline-confirm-button',
                  accessibilityLabel: translate(locale, 'customer.c13.declineQuote'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.modalConfirmText, textTokens(locale, 'title')]}>
                  {isSubmitting
                    ? translate(locale, 'common.state.loading')
                    : translate(locale, 'customer.c13.declineQuote')}
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
  scrollContainer: {
    padding: SPACING.md,
  },
  providerCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  providerRow: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLOR.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
    fontSize: 20,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    color: COLOR.text,
    fontWeight: '700',
  },
  providerBadge: {
    color: COLOR.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  metaStrip: {
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOR.background,
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  crewSizeText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  validityText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  declinedNotice: {
    backgroundColor: '#FFEBEE',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#EF9A9A',
    marginBottom: SPACING.md,
  },
  declinedNoticeText: {
    color: '#C62828',
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    color: COLOR.text,
    marginBottom: SPACING.sm,
    fontWeight: '700',
  },
  fareLineRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderColor: COLOR.border,
  },
  fareLineLeft: {
    flex: 1,
  },
  lineDesc: {
    color: COLOR.text,
    fontSize: 13,
  },
  materialTag: {
    color: '#1E88E5',
    fontSize: 11,
    marginTop: 2,
  },
  linePrice: {
    color: COLOR.text,
    fontSize: 14,
    fontWeight: '600',
  },
  inspectionFeeBox: {
    backgroundColor: COLOR.background,
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginVertical: SPACING.sm,
  },
  inspectionFeeText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  totalRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  totalLabel: {
    color: COLOR.text,
    fontWeight: '800',
  },
  totalAmount: {
    color: COLOR.primary,
    fontWeight: '800',
  },
  inclusionsBody: {
    color: '#2E7D32',
    fontSize: 13,
  },
  exclusionsBody: {
    color: '#C62828',
    fontSize: 13,
  },
  durationCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  durationText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  paymentNoticeBox: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  paymentNoticeText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  acceptBtn: {
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
  declineBtn: {
    borderWidth: 1,
    borderColor: '#EF5350',
    backgroundColor: COLOR.surface,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    color: '#D32F2F',
    fontWeight: '600',
  },
  secondaryActionBtn: {
    borderWidth: 1,
    borderColor: COLOR.border,
    backgroundColor: COLOR.surface,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: COLOR.text,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.sheet,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  modalTitle: {
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  modalBody: {
    color: COLOR.textMuted,
    marginBottom: SPACING.lg,
  },
  modalButtonsRow: {
    gap: SPACING.sm,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  modalCancelText: {
    color: COLOR.text,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  modalDeclineConfirmBtn: {
    flex: 1,
    backgroundColor: '#D32F2F',
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  modalConfirmText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
});

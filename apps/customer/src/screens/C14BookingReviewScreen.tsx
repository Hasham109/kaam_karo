/**
 * C14: Booking Review Screen (T3.10; BP §12, §9 step 19; D-003, D-004, D-023; BOOK-STATUS-016).
 * Final summary review before booking confirmation. Shows priced draft, crew size,
 * address snapshot, cancellation terms, and confirmation modal before dispatch.
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
import type { BookingReviewData } from '../types';

export const MOCK_BOOKING_REVIEW: BookingReviewData = {
  bookingId: 'book-881',
  bookingNumber: 'KK-88102',
  serviceId: 'svc-ac-gen',
  serviceName: 'AC General Service',
  providerProfileId: 'prov-1',
  providerName: 'Tariq Mehmood',
  businessName: 'Tariq AC Solutions',
  verificationLevel: 'BUSINESS_VERIFIED',
  crewSize: 2,
  crewSizeConfirmed: true,
  addressSnapshot: 'House 14, Street 3, Block H, Gulberg III, Lahore',
  scheduledAt: 'Today, 2:00 PM - 4:00 PM',
  totalOrEstimatedPkr: 2500,
  isEstimate: false,
  status: 'REQUESTED',
  priceLines: [
    {
      id: 'pl-1',
      lineType: 'LABOR',
      description: 'AC General Cleaning & Jet Wash',
      amountPkr: 2000,
    },
    {
      id: 'pl-2',
      lineType: 'TAX',
      description: 'Punjab Sales Tax',
      amountPkr: 500,
    },
  ],
  allowedNextActions: [
    {
      action: 'SEND_BOOKING_REQUEST',
      targetStatus: 'REQUESTED',
      labelEn: 'Send booking request',
      labelUr: 'بکنگ کی درخواست بھیجیں',
      requiresConfirmation: true,
    },
    {
      action: 'EDIT_REQUEST',
      targetStatus: 'DRAFT',
      labelEn: 'Edit',
      labelUr: 'ترمیم کریں',
    },
  ],
};

export const C14BookingReviewScreen: React.FC = () => {
  const { locale, navigate, draft } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [bookingData] = useState<BookingReviewData>(MOCK_BOOKING_REVIEW);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const summaryText =
    draft.description || draft.aiSummary || translate(locale, 'customer.c06.whatDoYouNeed');

  const locationText = draft.location?.address || bookingData.addressSnapshot;

  const handleConfirmSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      // Navigate to C15 Booking Confirmation
      navigate('C15', { bookingId: bookingData.bookingId, status: 'REQUESTED' });
    }, 400);
  };

  return (
    <ScreenContainer
      testID="c14-booking-review-screen"
      title={translate(locale, 'customer.c14.title')}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Request Summary Card */}
        <View style={styles.card} testID="c14-request-summary-card">
          <View style={[styles.cardHeaderRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.cardHeaderTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign, flex: 1 },
              ]}
            >
              {translate(locale, 'customer.c14.requestHeader')}
            </Text>
            <TouchableOpacity
              onPress={() => navigate('C12')}
              style={minTapTargetStyle()}
              {...interactiveProps({
                testID: 'c14-edit-request-button',
                accessibilityLabel: translate(locale, 'customer.c14.editRequest'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.editLink, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c14.editRequest')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text
            style={[
              styles.serviceName,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {draft.serviceId || bookingData.serviceName}
          </Text>
          <Text
            style={[
              styles.problemDesc,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {summaryText}
          </Text>
        </View>

        {/* Provider Profile Card */}
        <View style={styles.card} testID="c14-provider-card">
          <Text
            style={[
              styles.cardHeaderTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c14.providerHeader')}
          </Text>
          <View style={[styles.providerRow, { flexDirection: mirror.row }]}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{bookingData.providerName.charAt(0)}</Text>
            </View>
            <View style={styles.providerInfo}>
              <Text
                style={[
                  styles.providerNameText,
                  textTokens(locale, 'title'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {bookingData.businessName || bookingData.providerName}
              </Text>
              <Text
                style={[
                  styles.badgeText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                🛡️ {bookingData.verificationLevel}
              </Text>
            </View>
          </View>

          {/* Crew Size (D-004, PROV-CREW-003, OQ-045) */}
          <View style={styles.crewSizeBox} testID="c14-crew-size-box">
            <Text
              style={[
                styles.crewSizeText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              👥{' '}
              {bookingData.crewSizeConfirmed
                ? translate(locale, 'customer.c14.crewSizeKnown', { n: bookingData.crewSize })
                : translate(locale, 'customer.c14.crewSizeUnconfirmed')}
            </Text>
          </View>
        </View>

        {/* Address & Time Card */}
        <View style={styles.card} testID="c14-location-time-card">
          <View style={styles.metaBlock}>
            <Text
              style={[
                styles.metaBlockLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              📍 {translate(locale, 'customer.c14.addressHeader')}
            </Text>
            <Text
              style={[
                styles.metaBlockValue,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {locationText}
            </Text>
          </View>

          <View style={styles.metaBlock}>
            <Text
              style={[
                styles.metaBlockLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              ⏰ {translate(locale, 'customer.c14.timeHeader')}
            </Text>
            <Text
              style={[
                styles.metaBlockValue,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {bookingData.scheduledAt}
            </Text>
          </View>
        </View>

        {/* Pricing Breakdown Card */}
        <View style={styles.card} testID="c14-pricing-card">
          <Text
            style={[
              styles.cardHeaderTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c14.pricingHeader')}
          </Text>

          {bookingData.priceLines.map((line, idx) => (
            <View
              key={line.id || idx}
              style={[styles.pricingLineRow, { flexDirection: mirror.row }]}
            >
              <Text
                style={[
                  styles.pricingLineDesc,
                  textTokens(locale, 'body'),
                  { textAlign: mirror.textAlign, flex: 1 },
                ]}
              >
                {line.description}
              </Text>
              <Text style={[styles.pricingLineAmount, textTokens(locale, 'title')]}>
                {formatPkr(locale, line.amountPkr)}
              </Text>
            </View>
          ))}

          {/* Total or Estimate Line */}
          <View style={[styles.totalRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.totalLabel,
                textTokens(locale, 'headline'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {bookingData.isEstimate
                ? translate(locale, 'customer.c14.totalEstimate', {
                    amount: formatPkr(locale, bookingData.totalOrEstimatedPkr),
                  })
                : translate(locale, 'customer.c14.totalFixed', {
                    amount: formatPkr(locale, bookingData.totalOrEstimatedPkr),
                  })}
            </Text>
          </View>
        </View>

        {/* Cancellation Policy Banner (D-023) */}
        <View style={styles.policyBox}>
          <Text
            style={[
              styles.policyText,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c14.cancellationFree')}
          </Text>
        </View>

        {/* Payment Timing Banner (D-003) */}
        <View style={styles.paymentNoticeBox}>
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

        {/* Action Button: Send Booking Request */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            onPress={() => setShowConfirmModal(true)}
            style={[styles.sendBookingBtn, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c14-send-booking-button',
              accessibilityLabel: translate(locale, 'customer.c14.sendBooking'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.sendBookingBtnText, textTokens(locale, 'title')]}>
              {translate(locale, 'customer.c14.sendBooking')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation Modal Before Creating Booking Request */}
      <Modal visible={showConfirmModal} transparent={true} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="c14-confirm-modal">
            <Text
              style={[
                styles.modalTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c14.confirmSendTitle')}
            </Text>
            <Text
              style={[
                styles.modalBody,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c14.confirmSendBody', {
                provider: bookingData.providerName,
                time: bookingData.scheduledAt,
              })}
            </Text>

            <View style={[styles.modalButtonsRow, { flexDirection: mirror.row }]}>
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                style={[styles.modalCancelBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c14-modal-cancel-button',
                  accessibilityLabel: translate(locale, 'common.action.cancel'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.modalCancelText, textTokens(locale, 'label')]}>
                  {translate(locale, 'common.action.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmSubmit}
                disabled={isSubmitting}
                style={[styles.modalConfirmBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c14-modal-confirm-button',
                  accessibilityLabel: translate(locale, 'common.action.confirm'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.modalConfirmText, textTokens(locale, 'title')]}>
                  {isSubmitting
                    ? translate(locale, 'customer.c14.sendingRequest')
                    : translate(locale, 'common.action.confirm')}
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
  card: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  cardHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardHeaderTitle: {
    color: COLOR.text,
    fontWeight: '700',
  },
  editLink: {
    color: COLOR.primary,
    fontWeight: '600',
  },
  serviceName: {
    color: COLOR.primary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  problemDesc: {
    color: COLOR.text,
    marginTop: SPACING.xs,
  },
  providerRow: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
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
  providerNameText: {
    color: COLOR.text,
    fontWeight: '700',
  },
  badgeText: {
    color: COLOR.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  crewSizeBox: {
    backgroundColor: COLOR.background,
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  crewSizeText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  metaBlock: {
    marginVertical: SPACING.xs,
  },
  metaBlockLabel: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  metaBlockValue: {
    color: COLOR.text,
    marginTop: 2,
  },
  pricingLineRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderColor: COLOR.border,
  },
  pricingLineDesc: {
    color: COLOR.text,
  },
  pricingLineAmount: {
    color: COLOR.text,
    fontWeight: '600',
  },
  totalRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  totalLabel: {
    color: COLOR.primary,
    fontWeight: '800',
  },
  policyBox: {
    backgroundColor: COLOR.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  policyText: {
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
  actionContainer: {
    marginBottom: SPACING.xl,
  },
  sendBookingBtn: {
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBookingBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
    fontSize: 16,
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
  modalConfirmText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
});

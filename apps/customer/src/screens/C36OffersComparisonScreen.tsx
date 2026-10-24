/**
 * C36: Multi-Supplier Offers Comparison Screen (T3.10; BP §53, §58; D-004, D-005; ARCH §3.1).
 * Compare incoming price quotes side-by-side, inspect crew size, fare lines,
 * valid-until dates, and accept or decline offers with confirmation.
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
import type { QuoteOfferCard } from '../types';

export const MOCK_OFFERS: readonly QuoteOfferCard[] = [
  {
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
    lines: [
      {
        id: 'l1',
        lineType: 'LABOR',
        description: 'AC General Service & Coil Wash',
        amountPkr: 2500,
      },
      {
        id: 'l2',
        lineType: 'PARTS',
        description: 'Filter replacement gasket',
        amountPkr: 600,
        materialsClass: 'INCLUDED',
      },
      { id: 'l3', lineType: 'TAX', description: 'Applicable Punjab Sales Tax', amountPkr: 400 },
    ],
    inclusions: 'High-pressure wash, gas pressure check, electrical terminal check',
    exclusions: 'Compressor replacement, copper piping alteration',
    expectedDurationMinutes: 60,
  },
  {
    id: 'quote-102',
    bookingId: 'book-881',
    providerProfileId: 'prov-2',
    providerName: 'Kashif Ali',
    businessName: 'Quick Cool Services',
    avatarMediaId: null,
    verificationLevel: 'VERIFIED',
    ratingAverage: 4.8,
    totalAmountPkr: 3200,
    isEstimate: true,
    crewSize: 1,
    validUntil: '2026-10-25 16:30',
    status: 'OFFERED',
    lines: [
      { id: 'l4', lineType: 'LABOR', description: 'Standard Inverter Service', amountPkr: 2800 },
      { id: 'l5', lineType: 'TAX', description: 'Sales Tax', amountPkr: 400 },
    ],
    inclusions: 'Outdoor coil cleaning, remote check',
    exclusions: 'Parts and gas top-up',
    expectedDurationMinutes: 45,
  },
  {
    id: 'quote-103',
    bookingId: 'book-881',
    providerProfileId: 'prov-3',
    providerName: 'Bilal Ahmad',
    businessName: 'Lahore Master Electrician & AC',
    avatarMediaId: null,
    verificationLevel: 'BASIC',
    ratingAverage: 4.7,
    totalAmountPkr: 0,
    isEstimate: true,
    crewSize: 1,
    validUntil: '2026-10-25 12:00',
    status: 'WAITING',
    lines: [],
  },
];

export const C36OffersComparisonScreen: React.FC = () => {
  const { locale, navigate } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [offersList, setOffersList] = useState<readonly QuoteOfferCard[]>(MOCK_OFFERS);
  const [selectedOfferToAccept, setSelectedOfferToAccept] = useState<QuoteOfferCard | null>(null);
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

  const availableOffers = offersList.filter((o) => o.status === 'OFFERED');
  const waitingCount = offersList.filter((o) => o.status === 'WAITING').length;

  const handleDeclineOffer = (offerId: string) => {
    setOffersList((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: 'DECLINED' as const } : o)),
    );
  };

  const handleConfirmAccept = () => {
    if (!selectedOfferToAccept) return;
    setIsSubmittingAccept(true);

    setTimeout(() => {
      setIsSubmittingAccept(false);
      const chosen = selectedOfferToAccept;
      setSelectedOfferToAccept(null);
      // Navigate to C15 Booking Confirmation
      navigate('C15', { bookingId: chosen.bookingId, status: 'ACCEPTED' });
    }, 350);
  };

  return (
    <ScreenContainer testID="c36-offers-screen" title={translate(locale, 'customer.c36.title')}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header subtitle */}
        <Text
          style={[styles.subtitle, textTokens(locale, 'label'), { textAlign: mirror.textAlign }]}
        >
          {translate(locale, 'customer.c36.subtitle')}
        </Text>

        {/* Invited Providers Status Ribbon */}
        <View style={styles.trackerCard} testID="c36-status-tracker">
          <View style={[styles.trackerRow, { flexDirection: mirror.row }]}>
            {offersList.map((offer, idx) => {
              const statusLabel =
                offer.status === 'OFFERED'
                  ? translate(locale, 'customer.c36.statusOffered')
                  : offer.status === 'WAITING'
                    ? translate(locale, 'customer.c36.statusWaiting')
                    : offer.status === 'DECLINED'
                      ? translate(locale, 'customer.c36.statusDeclined')
                      : translate(locale, 'customer.c36.statusExpired');

              const isSuccess = offer.status === 'OFFERED';
              const isWaiting = offer.status === 'WAITING';

              return (
                <View
                  key={offer.id || idx}
                  style={[
                    styles.trackerChip,
                    isSuccess && styles.trackerChipSuccess,
                    isWaiting && styles.trackerChipWaiting,
                  ]}
                >
                  <Text style={[styles.trackerChipText, textTokens(locale, 'label')]}>
                    {offer.providerName.split(' ')[0]}: {statusLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Waiting Note */}
        {waitingCount > 0 ? (
          <View style={styles.waitingNoticeBox} testID="c36-waiting-notice">
            <Text
              style={[
                styles.waitingNoticeText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c36.waitingForOffers', { n: waitingCount })}
            </Text>
          </View>
        ) : null}

        {/* All Declined or Expired State */}
        {availableOffers.length === 0 && waitingCount === 0 ? (
          <View style={styles.emptyCard} testID="c36-empty-offers-box">
            <Text style={styles.emptyIcon}>⏳</Text>
            <Text
              style={[
                styles.emptyText,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c36.allDeclinedOrExpired')}
            </Text>
            <TouchableOpacity
              onPress={() => navigate('C35')}
              style={[styles.rematchBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'c36-rematch-button',
                accessibilityLabel: translate(locale, 'customer.c35.title'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.rematchBtnText, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c35.title')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Offers Cards List */}
        {availableOffers.map((offer, idx) => (
          <View key={offer.id} testID={`c36-offer-card-${idx}`} style={styles.offerCard}>
            {/* Offer Header: Provider + Total Price */}
            <View style={[styles.cardHeaderRow, { flexDirection: mirror.row }]}>
              <View style={styles.providerInfo}>
                <Text
                  style={[
                    styles.providerName,
                    textTokens(locale, 'title'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {offer.businessName || offer.providerName}
                </Text>
                <Text
                  style={[
                    styles.ratingText,
                    textTokens(locale, 'label'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  ⭐ {offer.ratingAverage?.toFixed(1) || '5.0'} · 🛡️ {offer.verificationLevel}
                </Text>
              </View>

              <View style={styles.priceContainer}>
                <Text style={[styles.priceAmount, textTokens(locale, 'headline')]}>
                  {formatPkr(locale, offer.totalAmountPkr)}
                </Text>
                <View
                  style={[
                    styles.estimatePill,
                    offer.isEstimate ? styles.estimatePillWarn : styles.estimatePillFixed,
                  ]}
                >
                  <Text style={styles.estimatePillText}>
                    {offer.isEstimate
                      ? translate(locale, 'customer.c36.estimateBadge')
                      : translate(locale, 'customer.c36.fixedBadge')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Crew Size & Validity */}
            <View style={[styles.metaStrip, { flexDirection: mirror.row }]}>
              <Text style={[styles.crewSizeText, textTokens(locale, 'label')]}>
                👥 {translate(locale, 'customer.c36.workersCount', { n: offer.crewSize })}
              </Text>
              <Text style={[styles.validUntilText, textTokens(locale, 'label')]}>
                ⏱️ {translate(locale, 'customer.c36.validUntil', { date: offer.validUntil })}
              </Text>
            </View>

            {/* Fare Breakdown Preview */}
            <View style={styles.linesBreakdown}>
              {offer.lines.map((line, lIdx) => (
                <View
                  key={line.id || lIdx}
                  style={[styles.lineItemRow, { flexDirection: mirror.row }]}
                >
                  <Text
                    style={[
                      styles.lineDescription,
                      textTokens(locale, 'label'),
                      { textAlign: mirror.textAlign, flex: 1 },
                    ]}
                  >
                    • {line.description}
                  </Text>
                  <Text style={[styles.lineAmount, textTokens(locale, 'label')]}>
                    {formatPkr(locale, line.amountPkr)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Inclusions summary */}
            {offer.inclusions ? (
              <Text
                style={[
                  styles.inclusionsText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                ✅ {offer.inclusions}
              </Text>
            ) : null}

            {/* Card Action Buttons */}
            <View style={[styles.actionsRow, { flexDirection: mirror.row }]}>
              <TouchableOpacity
                onPress={() => navigate('C13', { quoteId: offer.id, bookingId: offer.bookingId })}
                style={[styles.detailsBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: `c36-see-details-${offer.id}`,
                  accessibilityLabel: translate(locale, 'customer.c36.seeDetails'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.detailsBtnText, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.c36.seeDetails')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDeclineOffer(offer.id)}
                style={[styles.declineBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: `c36-decline-offer-${offer.id}`,
                  accessibilityLabel: translate(locale, 'customer.c36.declineOffer'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.declineBtnText, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.c36.declineOffer')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedOfferToAccept(offer)}
                style={[styles.acceptBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: `c36-choose-offer-${offer.id}`,
                  accessibilityLabel: translate(locale, 'customer.c36.chooseOffer'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.acceptBtnText, textTokens(locale, 'title')]}>
                  {translate(locale, 'customer.c36.chooseOffer')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Confirmation Modal Before Accepting Offer (VOICE-007, D-003) */}
      <Modal visible={selectedOfferToAccept !== null} transparent={true} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="c36-accept-confirm-dialog">
            <Text
              style={[
                styles.modalTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {selectedOfferToAccept
                ? translate(locale, 'customer.c36.acceptConfirmTitle', {
                    provider: selectedOfferToAccept.providerName,
                    total: formatPkr(locale, selectedOfferToAccept.totalAmountPkr),
                  })
                : ''}
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
                onPress={() => setSelectedOfferToAccept(null)}
                style={[styles.modalCancelBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c36-modal-cancel-button',
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
                disabled={isSubmittingAccept}
                style={[styles.modalConfirmBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c36-modal-confirm-button',
                  accessibilityLabel: translate(locale, 'common.action.confirm'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.modalConfirmText, textTokens(locale, 'title')]}>
                  {isSubmittingAccept
                    ? translate(locale, 'common.state.loading')
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
  subtitle: {
    color: COLOR.textMuted,
    marginBottom: SPACING.sm,
  },
  trackerCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  trackerRow: {
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  trackerChip: {
    backgroundColor: COLOR.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  trackerChipSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
  },
  trackerChipWaiting: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
  },
  trackerChipText: {
    color: COLOR.text,
    fontSize: 12,
  },
  waitingNoticeBox: {
    backgroundColor: '#FFF9C4',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  waitingNoticeText: {
    color: '#F57F17',
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.xl,
    borderRadius: RADIUS.sheet,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLOR.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  rematchBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  rematchBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
  offerCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  cardHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    color: COLOR.text,
    fontWeight: '700',
  },
  ratingText: {
    color: COLOR.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    color: COLOR.primary,
    fontWeight: '800',
  },
  estimatePill: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 2,
  },
  estimatePillFixed: {
    backgroundColor: '#E8F5E9',
  },
  estimatePillWarn: {
    backgroundColor: '#FFF3E0',
  },
  estimatePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLOR.text,
  },
  metaStrip: {
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLOR.background,
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginVertical: SPACING.xs,
  },
  crewSizeText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  validUntilText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  linesBreakdown: {
    marginVertical: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLOR.border,
  },
  lineItemRow: {
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  lineDescription: {
    color: COLOR.text,
    fontSize: 12,
  },
  lineAmount: {
    color: COLOR.text,
    fontSize: 12,
    fontWeight: '600',
  },
  inclusionsText: {
    color: '#2E7D32',
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  actionsRow: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  detailsBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  detailsBtnText: {
    color: COLOR.text,
    fontSize: 12,
    fontWeight: '600',
  },
  declineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EF5350',
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  declineBtnText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600',
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  acceptBtnText: {
    color: COLOR.onPrimary,
    fontSize: 13,
    fontWeight: '700',
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

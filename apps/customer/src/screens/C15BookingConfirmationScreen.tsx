/**
 * C15: Booking Confirmation Screen (T3.10; BP §12, §15.1; REL-005; D-030).
 * Confirmed booking reference, status-driven next steps, crew size,
 * notification rationale pre-prompt (first booking only), and track action.
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
import type { BookingConfirmationInfo } from '../types';

export const MOCK_CONFIRMATION_INFO: BookingConfirmationInfo = {
  bookingId: 'book-881',
  bookingNumber: 'KK-88102',
  status: 'REQUESTED',
  providerName: 'Tariq Mehmood',
  serviceName: 'AC General Service',
  scheduledTime: 'Today, 2:00 PM - 4:00 PM',
  totalPkr: 2500,
  crewSize: 2,
  address: 'House 14, Street 3, Block H, Gulberg III, Lahore',
};

export const C15BookingConfirmationScreen: React.FC = () => {
  const { locale, navigate, draft, clearDraft } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [notifGranted, setNotifGranted] = useState(false);
  const [bookingInfo] = useState<BookingConfirmationInfo>(MOCK_CONFIRMATION_INFO);

  const statusChipLabel =
    bookingInfo.status === 'REQUESTED'
      ? translate(locale, 'customer.c15.statusRequested')
      : bookingInfo.status === 'QUOTE_PENDING'
        ? translate(locale, 'customer.c15.statusQuotePending')
        : translate(locale, 'customer.c15.statusAccepted');

  const nextStepExplanation =
    bookingInfo.status === 'REQUESTED'
      ? translate(locale, 'customer.c15.nextStepRequested', {
          provider: bookingInfo.providerName,
        })
      : bookingInfo.status === 'QUOTE_PENDING'
        ? translate(locale, 'customer.c15.nextStepQuotePending', {
            provider: bookingInfo.providerName,
          })
        : translate(locale, 'customer.c15.nextStepConfirmed', {
            time: bookingInfo.scheduledTime,
          });

  const handleTrackBooking = () => {
    // Clear draft on successful booking flow
    clearDraft();
    navigate('C17', { bookingId: bookingInfo.bookingId });
  };

  const handleTurnOnNotifs = () => {
    setNotifGranted(true);
  };

  return (
    <ScreenContainer
      testID="c15-confirmation-screen"
      title={translate(locale, 'customer.c15.title')}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Celebration / Confirmed Banner */}
        <View style={styles.headerCard} testID="c15-header-card">
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text
            style={[
              styles.bookingNumberText,
              textTokens(locale, 'headline'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c15.bookingNumber', {
              number: bookingInfo.bookingNumber,
            })}
          </Text>

          {/* Server-Driven Status Badge */}
          <View style={styles.statusPill}>
            <Text style={[styles.statusPillText, textTokens(locale, 'label')]}>
              {statusChipLabel}
            </Text>
          </View>

          {/* Next Steps Guidance */}
          <Text
            style={[
              styles.nextStepText,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {nextStepExplanation}
          </Text>
        </View>

        {/* Booking Details Card */}
        <View style={styles.card} testID="c15-details-card">
          <View style={[styles.detailRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.detailLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c12.serviceLabel')}
            </Text>
            <Text style={[styles.detailValue, textTokens(locale, 'body')]}>
              {draft.serviceId || bookingInfo.serviceName}
            </Text>
          </View>

          <View style={[styles.detailRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.detailLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c14.providerHeader')}
            </Text>
            <Text style={[styles.detailValue, textTokens(locale, 'body')]}>
              {bookingInfo.providerName}
            </Text>
          </View>

          <View style={[styles.detailRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.detailLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c14.timeHeader')}
            </Text>
            <Text style={[styles.detailValue, textTokens(locale, 'body')]}>
              {bookingInfo.scheduledTime}
            </Text>
          </View>

          <View style={[styles.detailRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.detailLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c14.addressHeader')}
            </Text>
            <Text
              style={[
                styles.detailValue,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign, flex: 1 },
              ]}
            >
              {draft.location?.address || bookingInfo.address}
            </Text>
          </View>

          <View style={[styles.detailRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.detailLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c36.workersCount', { n: bookingInfo.crewSize })}
            </Text>
            <Text style={[styles.detailValue, textTokens(locale, 'body')]}>
              👥 {bookingInfo.crewSize}
            </Text>
          </View>

          <View style={[styles.detailRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.detailLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c13.totalLabel')}
            </Text>
            <Text style={[styles.totalPrice, textTokens(locale, 'title')]}>
              {formatPkr(locale, bookingInfo.totalPkr)}
            </Text>
          </View>
        </View>

        {/* Notification Permission Pre-Prompt Rationale (PERM-JUST-004; NOTIF-010) */}
        {!notifGranted ? (
          <View style={styles.notifPromptCard} testID="c15-notif-rationale-box">
            <Text style={styles.notifIcon}>🔔</Text>
            <Text
              style={[
                styles.notifRationaleText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c15.notifRationale')}
            </Text>
            <TouchableOpacity
              onPress={handleTurnOnNotifs}
              style={[styles.turnOnNotifsBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'c15-turn-on-notifs-button',
                accessibilityLabel: translate(locale, 'customer.c15.turnOnNotifs'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.turnOnNotifsText, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c15.turnOnNotifs')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Payment Timing Banner */}
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

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={handleTrackBooking}
            style={[styles.trackBtn, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c15-track-booking-button',
              accessibilityLabel: translate(locale, 'customer.c15.trackBooking'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.trackBtnText, textTokens(locale, 'title')]}>
              {translate(locale, 'customer.c15.trackBooking')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTrackBooking}
            style={[styles.homeBtn, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c15-back-to-home-button',
              accessibilityLabel: translate(locale, 'customer.c15.backToHome'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.homeBtnText, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c15.backToHome')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: SPACING.md,
  },
  headerCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.sheet,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  checkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  checkIcon: {
    color: '#2E7D32',
    fontSize: 32,
    fontWeight: 'bold',
  },
  bookingNumberText: {
    color: COLOR.text,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  statusPill: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 50,
    marginBottom: SPACING.sm,
  },
  statusPillText: {
    color: '#1565C0',
    fontWeight: '700',
  },
  nextStepText: {
    color: COLOR.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  detailRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderColor: COLOR.border,
  },
  detailLabel: {
    color: COLOR.textMuted,
    fontSize: 13,
  },
  detailValue: {
    color: COLOR.text,
    fontWeight: '600',
  },
  totalPrice: {
    color: COLOR.primary,
    fontWeight: '800',
  },
  notifPromptCard: {
    backgroundColor: '#FFF8E1',
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: '#FFE082',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  notifIcon: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  notifRationaleText: {
    color: '#5D4037',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  turnOnNotifsBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  turnOnNotifsText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
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
  trackBtn: {
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
  homeBtn: {
    borderWidth: 1,
    borderColor: COLOR.border,
    backgroundColor: COLOR.surface,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtnText: {
    color: COLOR.text,
    fontWeight: '600',
  },
});

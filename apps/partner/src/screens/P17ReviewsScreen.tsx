/**
 * P17 Reviews Screen (BP §13 P17, BP §19; docs/screens/partner.md).
 * Purpose: Ratings received, rating standing & warnings, provider response, and flagging.
 * Requirements: REV-001, REV-003, REV-004, REV-006, REV-007, RATING-ENF-003..008.
 */
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, minTapTargetStyle, textTokens } from '@kaamkaro/ui';
import { usePartner } from '../state/PartnerContext';
import { getAppMirroring } from '../utils/rtl';

export interface PartnerReviewItem {
  id: string;
  bookingNumber: string;
  rating: number;
  tags: string[];
  text: string | null;
  date: string;
  providerResponse: string | null;
}

export function P17ReviewsScreen(): React.JSX.Element {
  const { locale, setScreen } = usePartner();
  const mirror = getAppMirroring(locale);

  // Initial mock review items
  const [reviews, setReviews] = useState<PartnerReviewItem[]>([
    {
      id: 'rev-1',
      bookingNumber: '1042',
      rating: 5,
      tags: ['Punctual', 'Clean work'],
      text: 'Plumber arrived on time and repaired the kitchen pipe cleanly.',
      date: '2026-10-24',
      providerResponse: null,
    },
    {
      id: 'rev-2',
      bookingNumber: '1038',
      rating: 4,
      tags: ['Fair price'],
      text: 'Good job overall, polite behaviour.',
      date: '2026-10-22',
      providerResponse: 'Thank you for your business! Glad to help.',
    },
  ]);

  const [standing] = useState<'GOOD' | 'WARNING' | 'BLOCKED'>('GOOD');
  const [warningNumber] = useState(1);
  const totalWarnings = 2;
  const blockThreshold = '2.0';

  // Reply Modal State
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Report Modal State
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Compute canonical rating
  const ratingCount = reviews.length;
  const ratingAverage =
    ratingCount > 0
      ? (
          Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / ratingCount) * 10) / 10
        ).toFixed(1)
      : null;

  const handleOpenReply = (id: string) => {
    setSelectedReviewId(id);
    setReplyText('');
    setReplyModalVisible(true);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedReviewId) return;

    setReviews((prev) =>
      prev.map((r) =>
        r.id === selectedReviewId ? { ...r, providerResponse: replyText.trim() } : r,
      ),
    );
    setReplyModalVisible(false);
    setFeedbackNotice(translate(locale, 'partner.p17.replySent'));
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const handleOpenReport = (id: string) => {
    setSelectedReviewId(id);
    setReportReason('');
    setReportModalVisible(true);
  };

  const handleSendReport = () => {
    if (!reportReason.trim() || !selectedReviewId) return;

    setReportModalVisible(false);
    setFeedbackNotice(translate(locale, 'partner.p17.reportSent'));
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  return (
    <ScrollView
      testID="p17-reviews-screen"
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header bar */}
      <View style={[styles.headerRow, { flexDirection: mirror.row }]}>
        <Text
          testID="p17-screen-title"
          style={[styles.titleText, textTokens(locale, 'title'), { textAlign: mirror.textAlign }]}
        >
          {translate(locale, 'partner.p17.title')}
        </Text>
        <TouchableOpacity
          onPress={() => setScreen('P04')}
          style={[styles.backBtn, minTapTargetStyle()]}
          accessibilityRole="button"
          accessibilityLabel={translate(locale, 'partner.p17.cancelBtn')}
        >
          <Text style={[styles.backBtnText, textTokens(locale, 'label')]}>
            {translate(locale, 'partner.p17.cancelBtn')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Temporary feedback banner */}
      {feedbackNotice ? (
        <View testID="p17-feedback-banner" style={styles.feedbackBanner}>
          <Text style={[styles.feedbackText, textTokens(locale, 'label')]}>✓ {feedbackNotice}</Text>
        </View>
      ) : null}

      {/* Rating & Standing Summary Card */}
      <View style={styles.summaryCard}>
        <View style={[styles.summaryTopRow, { flexDirection: mirror.row }]}>
          <View>
            <Text
              testID="p17-rating-summary"
              style={[
                styles.summaryText,
                textTokens(locale, 'headline'),
                { textAlign: mirror.textAlign },
              ]}
            >
              ★ {ratingAverage ?? '—'}
            </Text>
            <Text
              style={[
                styles.summarySubtext,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'partner.p17.summary', {
                avg: ratingAverage ?? '0.0',
                n: ratingCount.toString(),
              })}
            </Text>
          </View>

          {/* Standing Chip (D-014; RATING-ENF-004) */}
          <View
            testID="p17-standing-chip"
            style={[
              styles.standingChip,
              standing === 'GOOD'
                ? styles.standingGood
                : standing === 'WARNING'
                  ? styles.standingWarning
                  : styles.standingBlocked,
            ]}
          >
            <Text
              style={[
                styles.standingText,
                standing === 'GOOD'
                  ? styles.standingTextGood
                  : standing === 'WARNING'
                    ? styles.standingTextWarning
                    : styles.standingTextBlocked,
                textTokens(locale, 'label'),
              ]}
            >
              {standing === 'GOOD'
                ? translate(locale, 'partner.p17.standingGood')
                : standing === 'WARNING'
                  ? translate(locale, 'partner.p17.standingWarning', {
                      n: warningNumber.toString(),
                      N: totalWarnings.toString(),
                    })
                  : translate(locale, 'partner.p17.standingBlocked')}
            </Text>
          </View>
        </View>

        {/* Threshold notice (D-017; RATING-ENF-003) */}
        <View style={styles.thresholdBox} testID="p17-threshold-notice">
          <Text
            style={[
              styles.thresholdText,
              textTokens(locale, 'caption'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'partner.p17.thresholdNotice', {
              threshold: blockThreshold,
            })}
          </Text>
        </View>
      </View>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <View style={styles.emptyContainer} testID="p17-empty-view">
          <Text style={[styles.emptyText, textTokens(locale, 'body'), { textAlign: 'center' }]}>
            {translate(locale, 'partner.p17.empty')}
          </Text>
        </View>
      ) : (
        reviews.map((rev) => (
          <View key={rev.id} testID={`p17-review-item-${rev.id}`} style={styles.reviewCard}>
            <View style={[styles.reviewTopRow, { flexDirection: mirror.row }]}>
              <Text
                style={[
                  styles.bookingRef,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {translate(locale, 'partner.p17.bookingRef', {
                  number: rev.bookingNumber,
                })}
              </Text>
              <Text style={styles.starsText}>{'★'.repeat(rev.rating)}</Text>
            </View>

            {/* Tags */}
            {rev.tags.length > 0 ? (
              <View style={[styles.tagsRow, { flexDirection: mirror.row }]}>
                {rev.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagBadge}>
                    <Text style={[styles.tagBadgeText, textTokens(locale, 'caption')]}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Review text */}
            {rev.text ? (
              <Text
                style={[
                  styles.reviewBodyText,
                  textTokens(locale, 'body'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {rev.text}
              </Text>
            ) : null}

            {/* Provider reply if present */}
            {rev.providerResponse ? (
              <View style={styles.replyBox}>
                <Text
                  style={[
                    styles.replyHeader,
                    textTokens(locale, 'label'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {translate(locale, 'partner.p17.providerReplyHeader')}
                </Text>
                <Text
                  style={[
                    styles.replyText,
                    textTokens(locale, 'body'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {rev.providerResponse}
                </Text>
              </View>
            ) : null}

            {/* Actions: Reply and Report */}
            <View style={[styles.actionRow, { flexDirection: mirror.row }]}>
              {!rev.providerResponse ? (
                <TouchableOpacity
                  testID={`p17-reply-btn-${rev.id}`}
                  onPress={() => handleOpenReply(rev.id)}
                  style={[styles.replyBtn, minTapTargetStyle()]}
                  accessibilityRole="button"
                  accessibilityLabel={translate(locale, 'partner.p17.replyBtn')}
                >
                  <Text style={[styles.replyBtnText, textTokens(locale, 'label')]}>
                    💬 {translate(locale, 'partner.p17.replyBtn')}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                testID={`p17-report-btn-${rev.id}`}
                onPress={() => handleOpenReport(rev.id)}
                style={[styles.reportBtn, minTapTargetStyle()]}
                accessibilityRole="button"
                accessibilityLabel={translate(locale, 'partner.p17.reportBtn')}
              >
                <Text style={[styles.reportBtnText, textTokens(locale, 'label')]}>
                  🚩 {translate(locale, 'partner.p17.reportBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Reply Modal */}
      <Modal visible={replyModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} testID="p17-reply-modal">
            <Text
              style={[
                styles.modalTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'partner.p17.replyModalTitle')}
            </Text>
            <TextInput
              testID="p17-reply-input"
              value={replyText}
              onChangeText={setReplyText}
              placeholder={translate(locale, 'partner.p17.replyPlaceholder')}
              placeholderTextColor={COLOR.neutral400}
              multiline
              numberOfLines={4}
              maxLength={1000}
              style={[
                styles.modalInput,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            />
            <View style={[styles.modalBtnRow, { flexDirection: mirror.row }]}>
              <TouchableOpacity
                onPress={() => setReplyModalVisible(false)}
                style={[styles.modalCancelBtn, minTapTargetStyle()]}
                accessibilityRole="button"
              >
                <Text style={[styles.modalCancelText, textTokens(locale, 'label')]}>
                  {translate(locale, 'partner.p17.cancelBtn')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="p17-reply-confirm-btn"
                onPress={handleSendReply}
                style={[styles.modalConfirmBtn, minTapTargetStyle()]}
                accessibilityRole="button"
              >
                <Text style={[styles.modalConfirmText, textTokens(locale, 'label')]}>
                  {translate(locale, 'partner.p17.submitBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} testID="p17-report-modal">
            <Text
              style={[
                styles.modalTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'partner.p17.reportModalTitle')}
            </Text>
            <TextInput
              testID="p17-report-input"
              value={reportReason}
              onChangeText={setReportReason}
              placeholder={translate(locale, 'partner.p17.reportPlaceholder')}
              placeholderTextColor={COLOR.neutral400}
              multiline
              numberOfLines={3}
              maxLength={500}
              style={[
                styles.modalInput,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            />
            <View style={[styles.modalBtnRow, { flexDirection: mirror.row }]}>
              <TouchableOpacity
                onPress={() => setReportModalVisible(false)}
                style={[styles.modalCancelBtn, minTapTargetStyle()]}
                accessibilityRole="button"
              >
                <Text style={[styles.modalCancelText, textTokens(locale, 'label')]}>
                  {translate(locale, 'partner.p17.cancelBtn')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="p17-report-confirm-btn"
                onPress={handleSendReport}
                style={[styles.modalConfirmBtn, minTapTargetStyle()]}
                accessibilityRole="button"
              >
                <Text style={[styles.modalConfirmText, textTokens(locale, 'label')]}>
                  {translate(locale, 'partner.p17.submitBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.neutral50,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  titleText: {
    color: COLOR.neutral900,
  },
  backBtn: {
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  backBtnText: {
    color: COLOR.primary600,
  },
  feedbackBanner: {
    backgroundColor: '#E8F5E9',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  feedbackText: {
    color: '#2E7D32',
  },
  summaryCard: {
    backgroundColor: COLOR.neutral0,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLOR.neutral200,
  },
  summaryTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    color: '#F59E0B',
    fontSize: 28,
    fontWeight: '700',
  },
  summarySubtext: {
    color: COLOR.neutral600,
    marginTop: SPACING.xs,
  },
  standingChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  standingGood: {
    backgroundColor: '#E8F5E9',
  },
  standingWarning: {
    backgroundColor: '#FEF3C7',
  },
  standingBlocked: {
    backgroundColor: '#FEE2E2',
  },
  standingText: {
    fontWeight: '600',
  },
  standingTextGood: {
    color: '#2E7D32',
  },
  standingTextWarning: {
    color: '#B45309',
  },
  standingTextBlocked: {
    color: '#B91C1C',
  },
  thresholdBox: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLOR.neutral100,
  },
  thresholdText: {
    color: COLOR.neutral600,
  },
  emptyContainer: {
    padding: SPACING.xl,
    backgroundColor: COLOR.neutral0,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLOR.neutral200,
  },
  emptyText: {
    color: COLOR.neutral500,
  },
  reviewCard: {
    backgroundColor: COLOR.neutral0,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLOR.neutral200,
  },
  reviewTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  bookingRef: {
    color: COLOR.neutral500,
  },
  starsText: {
    color: '#F59E0B',
    fontSize: 16,
  },
  tagsRow: {
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  tagBadge: {
    backgroundColor: COLOR.neutral100,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  tagBadgeText: {
    color: COLOR.neutral700,
  },
  reviewBodyText: {
    color: COLOR.neutral800,
    marginBottom: SPACING.sm,
  },
  replyBox: {
    backgroundColor: COLOR.neutral50,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.primary600,
    marginBottom: SPACING.sm,
  },
  replyHeader: {
    color: COLOR.primary700,
    fontWeight: '600',
    marginBottom: 2,
  },
  replyText: {
    color: COLOR.neutral800,
  },
  actionRow: {
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  replyBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  replyBtnText: {
    color: COLOR.primary600,
  },
  reportBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  reportBtnText: {
    color: COLOR.neutral600,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: COLOR.neutral0,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: COLOR.neutral900,
    marginBottom: SPACING.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLOR.neutral300,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    color: COLOR.neutral900,
    marginBottom: SPACING.md,
  },
  modalBtnRow: {
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  modalCancelText: {
    color: COLOR.neutral600,
  },
  modalConfirmBtn: {
    backgroundColor: COLOR.primary600,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: COLOR.neutral0,
    fontWeight: '600',
  },
});

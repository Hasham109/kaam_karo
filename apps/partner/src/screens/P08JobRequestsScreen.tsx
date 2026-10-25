/**
 * P08 — Incoming Job Requests Screen (Task T4.3; BP §13 P08, BP §85, BP §62.2, UX-PROV-001..003, QUOTE-002, PROF-ADDR-004).
 */
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
import {
  COLOR,
  RADIUS,
  SPACING,
  STATUS_THEME,
  URDU_FONT_FAMILY,
  interactiveProps,
  minTapTargetStyle,
  textTokens,
} from '@kaamkaro/ui';
import { usePartner } from '../state/PartnerContext';
import type { IncomingJobRequest } from '../types';
import { getAppMirroring } from '../utils/rtl';
import { P10ActionSheet } from './P10ActionSheet';

export function P08JobRequestsScreen() {
  const { locale, jobRequests, screenStates, selectJob, setActiveActionSheet, navigate, goBack } =
    usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P08;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  const incomingList = jobRequests.filter(
    (j) => j.status === 'REQUESTED' || j.status === 'QUOTE_PENDING',
  );

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p08-loading-view">
        <Text style={[styles.centerText, fontStyle]}>
          {translate(locale, 'partner.p08.loading')}
        </Text>
      </View>
    );
  }

  if (currentState === 'empty' && incomingList.length === 0) {
    return (
      <View style={styles.centerContainer} testID="p08-empty-view">
        <Text style={[styles.centerText, fontStyle]}>{translate(locale, 'partner.p08.empty')}</Text>
      </View>
    );
  }

  const handleOpenDetail = (job: IncomingJobRequest) => {
    selectJob(job.id);
    navigate('P09');
  };

  const handleOpenAcceptSheet = (job: IncomingJobRequest) => {
    selectJob(job.id);
    setActiveActionSheet('ACCEPT');
  };

  const handleOpenDeclineSheet = (job: IncomingJobRequest) => {
    selectJob(job.id);
    setActiveActionSheet('DECLINE');
  };

  const handleOpenMedia = (job: IncomingJobRequest) => {
    selectJob(job.id);
    navigate('P25');
  };

  const getCommercialLabel = (model: IncomingJobRequest['commercialModel']) => {
    switch (model) {
      case 'INSTANT':
        return translate(locale, 'partner.p08.commercialInstant');
      case 'CHOOSE_SUPPLIER':
        return translate(locale, 'partner.p08.commercialChosen');
      case 'REQUEST_QUOTES':
        return translate(locale, 'partner.p08.commercialQuote');
    }
  };

  const getPriceLabel = (job: IncomingJobRequest) => {
    const formatted = formatPkr(locale, job.pricePkr);
    switch (job.priceType) {
      case 'FIXED':
        return translate(locale, 'partner.p08.fixedPrice', { amount: formatted });
      case 'FROM':
        return translate(locale, 'partner.p08.startingPrice', { amount: formatted });
      case 'INSPECTION_QUOTE':
        return translate(locale, 'partner.p08.visitFee', { amount: formatted });
    }
  };

  return (
    <View style={styles.container} testID="p08-job-requests-screen">
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[styles.title, headlineTokens, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p08-title"
          >
            {translate(locale, 'partner.p08.title')}
          </Text>
          <Text
            style={[styles.subtitle, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p08-subtitle"
          >
            {translate(locale, 'partner.p08.subtitle')}
          </Text>
        </View>

        {/* Success banner */}
        {currentState === 'success' && (
          <View style={styles.successBanner} testID="p08-success-banner">
            <Text style={[styles.successText, fontStyle]}>
              {translate(locale, 'partner.p08.acceptedSuccess')}
            </Text>
          </View>
        )}

        {/* Requests List */}
        <View style={styles.listSection} testID="p08-requests-list">
          {incomingList.map((job) => {
            const hasVoice = job.media.some((m) => m.type === 'voice');
            const hasVideo = job.media.some((m) => m.type === 'video');
            const photoCount = job.media.filter((m) => m.type === 'photo').length;

            return (
              <View key={job.id} style={styles.card} testID={`p08-job-card-${job.id}`}>
                {/* Commercial Model Chip & Time Left */}
                <View style={[styles.cardTopRow, { flexDirection: mirroring.row }]}>
                  <View style={styles.commercialChip}>
                    <Text style={[styles.commercialChipText, fontStyle]}>
                      {getCommercialLabel(job.commercialModel)}
                    </Text>
                  </View>
                  {job.expiresInMinutes && (
                    <Text style={[styles.expiryText, fontStyle]}>
                      {translate(locale, 'partner.p08.respondWithin', {
                        time: `${job.expiresInMinutes}m`,
                      })}
                    </Text>
                  )}
                </View>

                {/* Service Name & Summary */}
                <TouchableOpacity
                  {...interactiveProps({
                    testID: `p08-job-title-${job.id}`,
                    accessibilityRole: 'button',
                    accessibilityLabel: job.serviceName,
                  })}
                  onPress={() => handleOpenDetail(job)}
                >
                  <Text
                    style={[styles.serviceTitle, fontStyle, { textAlign: mirroring.textAlign }]}
                  >
                    {job.serviceName}
                  </Text>
                  <Text style={[styles.summaryText, fontStyle, { textAlign: mirroring.textAlign }]}>
                    {job.shortSummary}
                  </Text>
                </TouchableOpacity>

                {/* Location (Area + distance ONLY, NEVER exact address pre-match; BP §52.2, PROF-ADDR-004) */}
                <View style={styles.metaRow}>
                  <Text
                    style={[styles.areaText, fontStyle, { textAlign: mirroring.textAlign }]}
                    testID={`p08-job-area-${job.id}`}
                  >
                    {translate(locale, 'partner.p08.distanceAway', {
                      area: job.areaName,
                      km: job.distanceKm,
                    })}
                  </Text>
                </View>

                {/* Media Badges (P25 launcher) */}
                {job.media.length > 0 && (
                  <TouchableOpacity
                    {...interactiveProps({
                      testID: `p08-media-btn-${job.id}`,
                      accessibilityRole: 'button',
                      accessibilityLabel: translate(locale, 'partner.p09.customerMedia'),
                    })}
                    style={[styles.mediaRow, { flexDirection: mirroring.row }]}
                    onPress={() => handleOpenMedia(job)}
                  >
                    {hasVoice && (
                      <View style={styles.mediaPill}>
                        <Text style={[styles.mediaPillText, fontStyle]}>
                          🎤 {translate(locale, 'partner.p08.mediaVoice')}
                        </Text>
                      </View>
                    )}
                    {hasVideo && (
                      <View style={styles.mediaPill}>
                        <Text style={[styles.mediaPillText, fontStyle]}>
                          🎬 {translate(locale, 'partner.p08.mediaVideo')}
                        </Text>
                      </View>
                    )}
                    {photoCount > 0 && (
                      <View style={styles.mediaPill}>
                        <Text style={[styles.mediaPillText, fontStyle]}>
                          📷 {translate(locale, 'partner.p08.mediaPhotos', { count: photoCount })}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                {/* Price & Time Window */}
                <View style={[styles.priceTimeRow, { flexDirection: mirroring.row }]}>
                  <Text style={[styles.priceTag, fontStyle]}>{getPriceLabel(job)}</Text>
                  <Text style={[styles.timeWindowText, fontStyle]}>
                    {translate(locale, 'partner.p08.timeWhen', { window: job.timeWindow })}
                  </Text>
                </View>

                {/* Action Buttons (Accept / Quote / Decline reachable in ≤ 2 taps) */}
                <View style={[styles.actionRow, { flexDirection: mirroring.row }]}>
                  <TouchableOpacity
                    {...interactiveProps({
                      testID: `p08-accept-btn-${job.id}`,
                      accessibilityRole: 'button',
                      accessibilityLabel: translate(locale, 'partner.p08.acceptBtn'),
                    })}
                    style={[styles.acceptBtn, minTapTargetStyle()]}
                    onPress={() => handleOpenAcceptSheet(job)}
                  >
                    <Text style={[styles.acceptBtnText, fontStyle]}>
                      {translate(locale, 'partner.p08.acceptBtn')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    {...interactiveProps({
                      testID: `p08-decline-btn-${job.id}`,
                      accessibilityRole: 'button',
                      accessibilityLabel: translate(locale, 'partner.p08.declineBtn'),
                    })}
                    style={[styles.declineBtn, minTapTargetStyle()]}
                    onPress={() => handleOpenDeclineSheet(job)}
                  >
                    <Text style={[styles.declineBtnText, fontStyle]}>
                      {translate(locale, 'partner.p08.declineBtn')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    {...interactiveProps({
                      testID: `p08-detail-btn-${job.id}`,
                      accessibilityRole: 'button',
                      accessibilityLabel: translate(locale, 'partner.p08.viewDetailBtn'),
                    })}
                    style={[styles.detailBtn, minTapTargetStyle()]}
                    onPress={() => handleOpenDetail(job)}
                  >
                    <Text style={[styles.detailBtnText, fontStyle]}>
                      {translate(locale, 'partner.p08.viewDetailBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Back button */}
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p08-back-btn',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'common.action.back'),
          })}
          style={[styles.backBtn, minTapTargetStyle()]}
          onPress={goBack}
        >
          <Text style={[styles.backBtnText, fontStyle]}>
            {translate(locale, 'common.action.back')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* P10 Bottom Action Sheet */}
      <P10ActionSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLOR.background,
  },
  centerText: {
    fontSize: 15,
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    color: COLOR.text,
  },
  subtitle: {
    color: COLOR.textMuted,
    marginTop: 4,
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  successText: {
    color: '#15803d',
    fontSize: 14,
    textAlign: 'center',
  },
  listSection: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    gap: SPACING.sm,
  },
  cardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commercialChip: {
    backgroundColor: STATUS_THEME.info.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  commercialChipText: {
    fontSize: 11,
    color: COLOR.primary,
    fontWeight: '700',
  },
  expiryText: {
    fontSize: 12,
    color: STATUS_THEME.warning.text,
    fontWeight: '600',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.text,
  },
  summaryText: {
    fontSize: 13,
    color: COLOR.textMuted,
    marginTop: 2,
  },
  metaRow: {
    gap: 2,
  },
  areaText: {
    fontSize: 13,
    color: COLOR.text,
    fontWeight: '600',
  },
  mediaRow: {
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  mediaPill: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  mediaPillText: {
    fontSize: 12,
    color: COLOR.text,
  },
  priceTimeRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLOR.border,
  },
  priceTag: {
    fontSize: 14,
    fontWeight: '700',
    color: COLOR.primary,
  },
  timeWindowText: {
    fontSize: 12,
    color: COLOR.textMuted,
  },
  actionRow: {
    gap: SPACING.xs,
    marginTop: 4,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  declineBtn: {
    paddingHorizontal: SPACING.md,
    backgroundColor: '#fee2e2',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    color: STATUS_THEME.danger.text,
    fontSize: 13,
    fontWeight: '600',
  },
  detailBtn: {
    paddingHorizontal: SPACING.md,
    backgroundColor: COLOR.background,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBtnText: {
    color: COLOR.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  backBtn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  backBtnText: {
    color: COLOR.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});

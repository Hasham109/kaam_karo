/**
 * C35: Supplier Match Results Screen (T3.10; BP §54.3, §55.1; ARCH §3.1; D-005).
 * Discovery-only candidate selection, "Why am I seeing this?" explanations,
 * filtering/sorting, and multi-supplier quote request action.
 */
import React, { useMemo, useState } from 'react';
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
import type { MatchCandidateCard, PriceModel } from '../types';

export type FilterOption = 'ALL' | 'NEAREST' | 'TOP_RATED' | 'VERIFIED' | 'FAIR_PRICE';
export type ViewMode = 'LIST' | 'MAP';

export const MOCK_MATCH_CANDIDATES: readonly MatchCandidateCard[] = [
  {
    candidateId: 'cand-1',
    providerProfileId: 'prov-1',
    providerName: 'Tariq Mehmood',
    businessName: 'Tariq AC Solutions',
    avatarMediaId: null,
    verificationLevel: 'BUSINESS_VERIFIED',
    distanceMeters: 1800,
    etaSeconds: 900,
    ratingAverage: 4.9,
    ratingCount: 142,
    completedJobsCount: 280,
    isExactServiceMatch: true,
    score: 0.94,
    rank: 1,
    badges: ['VERIFIED_PRO', 'TOP_RATED'],
    crewSize: 2,
    basePricePkr: 1500,
    priceModel: 'FIXED' as PriceModel,
    matchReasons: [
      {
        key: 'MATCH_SCORE_DISTANCE',
        en: 'Located 1.8 km away (estimated 15 min arrival)',
        ur: '1.8 کلومیٹر دور واقع ہے (تقریباً 15 منٹ میں آمد)',
      },
      {
        key: 'MATCH_SCORE_RATING',
        en: '4.9 rating across 142 customer reviews',
        ur: '142 کسٹمر جائزوں میں 4.9 ریٹنگ',
      },
      {
        key: 'MATCH_SCORE_COMPLETED',
        en: 'Over 280 jobs completed successfully in Lahore',
        ur: 'لاہور میں 280 سے زائد کام کامیابی سے مکمل کیے',
      },
    ],
  },
  {
    candidateId: 'cand-2',
    providerProfileId: 'prov-2',
    providerName: 'Kashif Ali',
    businessName: 'Quick Cool Services',
    avatarMediaId: null,
    verificationLevel: 'VERIFIED',
    distanceMeters: 2400,
    etaSeconds: 1200,
    ratingAverage: 4.8,
    ratingCount: 89,
    completedJobsCount: 135,
    isExactServiceMatch: true,
    score: 0.88,
    rank: 2,
    badges: ['QUICK_RESPONDER'],
    crewSize: 1,
    basePricePkr: 1200,
    priceModel: 'FROM' as PriceModel,
    matchReasons: [
      {
        key: 'MATCH_SCORE_SPEED',
        en: 'Average response time under 10 minutes',
        ur: 'اوسط جواب کا وقت 10 منٹ سے کم',
      },
      {
        key: 'MATCH_SCORE_SKILL',
        en: 'Certified master technician for inverter units',
        ur: 'انورٹر یونٹس کے لیے تصدیق شدہ ماہر کاریگر',
      },
    ],
  },
  {
    candidateId: 'cand-3',
    providerProfileId: 'prov-3',
    providerName: 'Bilal Ahmad',
    businessName: 'Lahore Master Electrician & AC',
    avatarMediaId: null,
    verificationLevel: 'BASIC',
    distanceMeters: 3800,
    etaSeconds: 1800,
    ratingAverage: 4.7,
    ratingCount: 44,
    completedJobsCount: 65,
    isExactServiceMatch: false,
    score: 0.79,
    rank: 3,
    badges: ['NEW_PROVIDER_BOOST'],
    crewSize: 1,
    basePricePkr: 1000,
    priceModel: 'INSPECTION_QUOTE' as PriceModel,
    matchReasons: [
      {
        key: 'MATCH_SCORE_PRICE',
        en: 'Competitive inspection rates with transparent pricing',
        ur: 'شفاف اور مناسب معائنہ چارجز',
      },
      {
        key: 'MATCH_SCORE_RELATED',
        en: 'Qualified in related electrical and appliance repair',
        ur: 'متعلقہ الیکٹریکل اور گھریلو آلات کی مرمت میں ماہر',
      },
    ],
  },
];

export const C35SupplierMatchResultsScreen: React.FC = () => {
  const { locale, navigate, draft, updateDraft } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [expandedReasonCandidateId, setExpandedReasonCandidateId] = useState<string | null>(
    'cand-1',
  );

  const filteredCandidates = useMemo(() => {
    switch (activeFilter) {
      case 'NEAREST':
        return [...MOCK_MATCH_CANDIDATES].sort(
          (a, b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999),
        );
      case 'TOP_RATED':
        return [...MOCK_MATCH_CANDIDATES].filter((c) => (c.ratingAverage ?? 0) >= 4.8);
      case 'VERIFIED':
        return [...MOCK_MATCH_CANDIDATES].filter((c) => c.verificationLevel !== 'BASIC');
      case 'FAIR_PRICE':
        return [...MOCK_MATCH_CANDIDATES].sort(
          (a, b) => (a.basePricePkr ?? 9999) - (b.basePricePkr ?? 9999),
        );
      case 'ALL':
      default:
        return MOCK_MATCH_CANDIDATES;
    }
  }, [activeFilter]);

  const summaryText =
    draft.description || draft.aiSummary || translate(locale, 'customer.c06.whatDoYouNeed');

  const locationLabel = draft.location?.address || 'Lahore';
  const timeLabel =
    draft.when === 'NOW'
      ? translate(locale, 'customer.c12.whenNow')
      : draft.when === 'TODAY'
        ? translate(locale, 'customer.c12.whenToday')
        : translate(locale, 'customer.c12.whenLater');

  const handleChooseCandidate = (candidate: MatchCandidateCard) => {
    // Preserve selected provider in draft
    updateDraft({ providerId: candidate.providerProfileId });
    // Navigate to C14 Booking Review
    navigate('C14', { providerId: candidate.providerProfileId });
  };

  const handleRequestQuotes = () => {
    // Navigate to C36 Multi-supplier Offers Comparison
    navigate('C36');
  };

  const toggleReasonExpand = (candidateId: string) => {
    setExpandedReasonCandidateId((prev) => (prev === candidateId ? null : candidateId));
  };

  return (
    <ScreenContainer
      testID="c35-match-results-screen"
      title={translate(locale, 'customer.c35.title')}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Request Summary & Context Strip */}
        <View style={styles.summaryCard} testID="c35-request-summary-banner">
          <Text
            style={[
              styles.summaryTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c35.requestSummary', { summary: summaryText })}
          </Text>
          <View style={[styles.metaRow, { flexDirection: mirror.row }]}>
            <View style={styles.metaChip}>
              <Text style={[styles.metaChipText, textTokens(locale, 'label')]}>
                📍 {locationLabel}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={[styles.metaChipText, textTokens(locale, 'label')]}>⏰ {timeLabel}</Text>
            </View>
          </View>
        </View>

        {/* View Toggle (List vs Map) */}
        <View style={[styles.viewToggleRow, { flexDirection: mirror.row }]}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'LIST' ? 'MAP' : 'LIST')}
            style={[styles.viewToggleBtn, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c35-view-toggle',
              accessibilityLabel:
                viewMode === 'LIST'
                  ? translate(locale, 'customer.c35.viewMap')
                  : translate(locale, 'customer.c35.viewList'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.viewToggleText, textTokens(locale, 'label')]}>
              {viewMode === 'LIST'
                ? `🗺️ ${translate(locale, 'customer.c35.viewMap')}`
                : `📋 ${translate(locale, 'customer.c35.viewList')}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Coarse Map View (Progressive Coarse Zones per SEC-REVIEW #14) */}
        {viewMode === 'MAP' ? (
          <View testID="c35-map-container" style={styles.mapBox}>
            <Text style={styles.mapIcon}>🗺️</Text>
            <Text
              style={[
                styles.mapNotice,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c35.mapCoarseNotice')}
            </Text>
            <View style={styles.mapPinRow}>
              <View style={styles.mapPinChip}>
                <Text style={textTokens(locale, 'label')}>📍 {locationLabel}</Text>
              </View>
              <View style={styles.mapZoneChip}>
                <Text style={textTokens(locale, 'label')}>
                  🛡️{' '}
                  {translate(locale, 'customer.c35.serviceZone', { zone: 'Gulberg & Model Town' })}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Filter Chips Bar */}
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filtersScroll, { flexDirection: mirror.row }]}
        >
          {(
            [
              { key: 'ALL', labelKey: 'customer.c35.filterAll', testID: 'c35-filter-all' },
              {
                key: 'NEAREST',
                labelKey: 'customer.c35.filterNearest',
                testID: 'c35-filter-nearest',
              },
              {
                key: 'TOP_RATED',
                labelKey: 'customer.c35.filterTopRated',
                testID: 'c35-filter-top-rated',
              },
              {
                key: 'VERIFIED',
                labelKey: 'customer.c35.filterVerified',
                testID: 'c35-filter-verified',
              },
              {
                key: 'FAIR_PRICE',
                labelKey: 'customer.c35.filterFairPrice',
                testID: 'c35-filter-fair-price',
              },
            ] as const
          ).map((filter) => {
            const isSelected = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                  minTapTargetStyle(),
                ]}
                {...interactiveProps({
                  testID: filter.testID,
                  accessibilityLabel: translate(locale, filter.labelKey),
                  accessibilityRole: 'button',
                })}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                    textTokens(locale, 'label'),
                  ]}
                >
                  {translate(locale, filter.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Empty Filter State */}
        {filteredCandidates.length === 0 ? (
          <View testID="c35-empty-filtered-box" style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text
              style={[
                styles.emptyText,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c35.emptyFiltered')}
            </Text>
            <TouchableOpacity
              onPress={() => setActiveFilter('ALL')}
              style={[styles.clearFilterBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'c35-clear-filters-button',
                accessibilityLabel: translate(locale, 'customer.c35.clearFilters'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.clearFilterBtnText, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c35.clearFilters')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Provider Cards List */}
        {filteredCandidates.map((candidate, idx) => {
          const isReasonExpanded = expandedReasonCandidateId === candidate.candidateId;
          const kmDistance = candidate.distanceMeters
            ? (candidate.distanceMeters / 1000).toFixed(1)
            : '2.0';
          const minEta = candidate.etaSeconds ? Math.round(candidate.etaSeconds / 60) : 15;

          return (
            <View
              key={candidate.candidateId}
              testID={`c35-candidate-card-${idx}`}
              style={styles.providerCard}
            >
              {/* Card Top Row: Avatar + Name + Badges */}
              <View style={[styles.cardHeader, { flexDirection: mirror.row }]}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{candidate.providerName.charAt(0)}</Text>
                </View>
                <View style={styles.providerInfo}>
                  <Text
                    style={[
                      styles.providerName,
                      textTokens(locale, 'title'),
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    {candidate.businessName || candidate.providerName}
                  </Text>
                  <View style={[styles.badgesRow, { flexDirection: mirror.row }]}>
                    <View style={styles.verificationBadge}>
                      <Text style={styles.verificationText}>🛡️ {candidate.verificationLevel}</Text>
                    </View>
                    <View
                      style={[
                        styles.matchBadge,
                        candidate.isExactServiceMatch
                          ? styles.exactMatchBadge
                          : styles.relatedMatchBadge,
                      ]}
                    >
                      <Text style={styles.matchBadgeText}>
                        {candidate.isExactServiceMatch
                          ? translate(locale, 'customer.c35.exactMatch')
                          : translate(locale, 'customer.c35.relatedMatch')}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Stats Line */}
              <Text
                style={[
                  styles.statsLine,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {translate(locale, 'customer.c35.statsFormat', {
                  km: kmDistance,
                  min: minEta,
                  rating: candidate.ratingAverage?.toFixed(1) || '5.0',
                  count: candidate.ratingCount,
                  jobs: candidate.completedJobsCount,
                })}
              </Text>

              {/* Crew Size & Pricing Line */}
              <View style={[styles.pricingRow, { flexDirection: mirror.row }]}>
                <Text style={[styles.crewSizeText, textTokens(locale, 'label')]}>
                  👥 {translate(locale, 'customer.c35.crewSize', { n: candidate.crewSize })}
                </Text>
                {candidate.basePricePkr ? (
                  <Text style={[styles.priceTag, textTokens(locale, 'title')]}>
                    {formatPkr(locale, candidate.basePricePkr)}
                  </Text>
                ) : null}
              </View>

              {/* "Why am I seeing this?" Expandable Reason Button */}
              <TouchableOpacity
                onPress={() => toggleReasonExpand(candidate.candidateId)}
                style={[styles.reasonToggleBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: `c35-why-seeing-this-${candidate.candidateId}`,
                  accessibilityLabel: translate(locale, 'customer.c35.whySeeingThis'),
                  accessibilityRole: 'button',
                })}
              >
                <Text
                  style={[
                    styles.reasonToggleText,
                    textTokens(locale, 'label'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  💡 {translate(locale, 'customer.c35.whySeeingThis')}{' '}
                  {isReasonExpanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {/* Reasons Content Box */}
              {isReasonExpanded ? (
                <View
                  testID={`c35-reasons-box-${candidate.candidateId}`}
                  style={styles.reasonsContainer}
                >
                  {candidate.matchReasons.map((reason, rIdx) => (
                    <View
                      key={reason.key || rIdx}
                      style={[styles.reasonItem, { flexDirection: mirror.row }]}
                    >
                      <Text style={styles.reasonBullet}>•</Text>
                      <Text
                        style={[
                          styles.reasonItemText,
                          textTokens(locale, 'label'),
                          { textAlign: mirror.textAlign, flex: 1 },
                        ]}
                      >
                        {locale === 'ur' ? reason.ur : reason.en}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Card Actions: Choose / Profile */}
              <View style={[styles.actionsRow, { flexDirection: mirror.row }]}>
                <TouchableOpacity
                  onPress={() => navigate('C11', { providerId: candidate.providerProfileId })}
                  style={[styles.profileBtn, minTapTargetStyle()]}
                  {...interactiveProps({
                    testID: `c35-view-profile-${candidate.candidateId}`,
                    accessibilityLabel: translate(locale, 'customer.c35.viewProfile'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={[styles.profileBtnText, textTokens(locale, 'label')]}>
                    {translate(locale, 'customer.c35.viewProfile')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleChooseCandidate(candidate)}
                  style={[styles.chooseBtn, minTapTargetStyle()]}
                  {...interactiveProps({
                    testID: `c35-choose-provider-${candidate.candidateId}`,
                    accessibilityLabel: translate(locale, 'customer.c35.chooseProvider'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={[styles.chooseBtnText, textTokens(locale, 'title')]}>
                    {translate(locale, 'customer.c35.chooseProvider')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Bottom Banner: Multi-Supplier Quotes */}
        <View style={styles.quoteInviteCard}>
          <Text
            style={[
              styles.quoteInviteTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c36.subtitle')}
          </Text>
          <TouchableOpacity
            onPress={handleRequestQuotes}
            style={[styles.requestQuotesBtn, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c35-request-quotes-button',
              accessibilityLabel: translate(locale, 'customer.c35.requestQuotes'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.requestQuotesBtnText, textTokens(locale, 'title')]}>
              {translate(locale, 'customer.c35.requestQuotes')}
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
  summaryCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    color: COLOR.text,
    marginBottom: SPACING.xs,
  },
  metaRow: {
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  metaChip: {
    backgroundColor: COLOR.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  metaChipText: {
    color: COLOR.textMuted,
    fontSize: 12,
  },
  viewToggleRow: {
    justifyContent: 'flex-end',
    marginBottom: SPACING.sm,
  },
  viewToggleBtn: {
    backgroundColor: COLOR.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleText: {
    color: COLOR.primary,
    fontWeight: '600',
  },
  mapBox: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  mapIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  mapNotice: {
    color: COLOR.textMuted,
    fontSize: 12,
    marginBottom: SPACING.sm,
  },
  mapPinRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mapPinChip: {
    backgroundColor: COLOR.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  mapZoneChip: {
    backgroundColor: COLOR.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  filtersScroll: {
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  filterChip: {
    backgroundColor: COLOR.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipSelected: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  filterChipText: {
    color: COLOR.text,
  },
  filterChipTextSelected: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.lg,
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
    marginBottom: SPACING.md,
  },
  clearFilterBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearFilterBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '600',
  },
  providerCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
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
    fontSize: 16,
    fontWeight: '700',
  },
  badgesRow: {
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  verificationBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  verificationText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '600',
  },
  matchBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  exactMatchBadge: {
    backgroundColor: '#E3F2FD',
  },
  relatedMatchBadge: {
    backgroundColor: '#FFF3E0',
  },
  matchBadgeText: {
    color: '#1565C0',
    fontSize: 11,
    fontWeight: '600',
  },
  statsLine: {
    color: COLOR.textMuted,
    fontSize: 12,
    marginVertical: SPACING.xs,
  },
  pricingRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  crewSizeText: {
    color: COLOR.textMuted,
    fontSize: 13,
  },
  priceTag: {
    color: COLOR.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  reasonToggleBtn: {
    paddingVertical: SPACING.xs,
    justifyContent: 'center',
  },
  reasonToggleText: {
    color: COLOR.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  reasonsContainer: {
    backgroundColor: COLOR.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  reasonItem: {
    alignItems: 'flex-start',
    gap: SPACING.xs,
    marginVertical: 2,
  },
  reasonBullet: {
    color: COLOR.primary,
    fontSize: 14,
    lineHeight: 18,
  },
  reasonItemText: {
    color: COLOR.text,
    fontSize: 12,
  },
  actionsRow: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  profileBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  profileBtnText: {
    color: COLOR.text,
    fontWeight: '600',
  },
  chooseBtn: {
    flex: 2,
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  chooseBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
  quoteInviteCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  quoteInviteTitle: {
    color: COLOR.text,
    fontSize: 15,
    marginBottom: SPACING.sm,
  },
  requestQuotesBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  requestQuotesBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
  },
});

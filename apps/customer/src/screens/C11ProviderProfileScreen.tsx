/**
 * C11 Provider Profile Screen (BP §12, docs/screens/customer.md).
 * Purpose: provider identity, verification badge, rating, completed jobs, reviews, favorites.
 * Requirement IDs: TRUST-VER-001..003, TRUST-BADGE-001..014, PROF-FAV-001, PROV-CREW-006.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { StateView } from '../components/StateView';
import { VerificationBadge } from '../components/StatusChip';
import { UiButton } from '../components/UiButton';
import { MOCK_PROVIDERS, MOCK_SERVICES } from '../data/mock-data';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';

export function C11ProviderProfileScreen(): React.JSX.Element {
  const { locale, navigate, screenParams, isFavorite, toggleFavorite, isGuest } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const providerId = (screenParams as { providerId?: string })?.providerId ?? 'prov-1';
  const provider = MOCK_PROVIDERS.find((p) => p.id === providerId);

  const [badgeExplanation, setBadgeExplanation] = useState<string | null>(null);

  if (!provider) {
    return (
      <ScreenContainer testID="c11-provider-profile-screen">
        <StateView
          state="E"
          locale={locale}
          message={translate(locale, 'customer.c11.providerUnavailable')}
          nextStepLabel={translate(locale, 'common.action.back')}
          onNextStep={() => navigate('C06')}
        />
      </ScreenContainer>
    );
  }

  const favorited = isFavorite(provider.id);
  const bio = locale === 'ur' ? provider.bioUr : provider.bioEn;
  const offeredServices = MOCK_SERVICES.filter((s) => provider.serviceIds.includes(s.id));

  const handleFavorite = () => {
    if (isGuest) {
      navigate('C03');
    } else {
      toggleFavorite(provider.id);
    }
  };

  const handleBook = () => {
    if (isGuest) {
      navigate('C03');
    } else {
      navigate('C06');
    }
  };

  return (
    <ScreenContainer testID="c11-provider-profile-screen" title={provider.name}>
      <View style={styles.content}>
        {/* Header Profile Box */}
        <View style={styles.profileBox}>
          <View style={[styles.avatarRow, { flexDirection: mirror.row }]}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarGlyph}>{provider.name.charAt(0)}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                testID="c11-provider-name"
                style={[
                  styles.providerName,
                  textTokens(locale, 'title'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {provider.name}
              </Text>

              <Text
                style={[
                  styles.teamLeaderText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {translate(locale, 'customer.c11.teamLeader', {
                  name: provider.teamLeaderName,
                })}
              </Text>

              <View style={{ marginTop: SPACING.xs }}>
                <VerificationBadge level={provider.verificationLevel} locale={locale} />
              </View>
            </View>

            {/* Favorite Button */}
            <TouchableOpacity
              testID="c11-favorite-button"
              onPress={handleFavorite}
              style={[styles.favoriteBtn, favorited && styles.favoriteBtnActive]}
              accessibilityRole="button"
              accessibilityLabel={translate(locale, 'customer.c11.favoriteA11y')}
            >
              <Text style={[styles.favoriteHeart, favorited && styles.favoriteHeartActive]}>♥</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Bar */}
          <View style={styles.statsBar}>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>★ {provider.rating.toFixed(1)}</Text>
              <Text style={[styles.statLabel, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c11.ratingSummary', {
                  rating: provider.rating.toFixed(1),
                  count: provider.reviewCount.toString(),
                })}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{provider.completedJobsCount}</Text>
              <Text style={[styles.statLabel, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c11.completedJobs', {
                  n: provider.completedJobsCount.toString(),
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        {provider.badges.length > 0 ? (
          <View style={styles.section}>
            <View style={[styles.badgesRow, { flexDirection: mirror.row }]}>
              {provider.badges.map((b) => {
                const bName = locale === 'ur' ? b.nameUr : b.nameEn;
                const bDesc = locale === 'ur' ? b.descriptionUr : b.descriptionEn;
                return (
                  <TouchableOpacity
                    key={b.id}
                    testID={`c11-badge-${b.id}`}
                    onPress={() => setBadgeExplanation(badgeExplanation === bDesc ? null : bDesc)}
                    style={styles.badgeChip}
                    accessibilityRole="button"
                    accessibilityLabel={bName}
                  >
                    <Text style={styles.badgeChipText}>🎖 {bName}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {badgeExplanation ? (
              <View testID="c11-badge-explanation" style={styles.badgeExplBox}>
                <Text style={[styles.badgeExplText, textTokens(locale, 'label')]}>
                  {badgeExplanation}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Service Area & Team Size */}
        <View style={styles.metaCard}>
          <Text
            style={[styles.metaText, textTokens(locale, 'label'), { textAlign: mirror.textAlign }]}
          >
            📍{' '}
            {translate(locale, 'customer.c11.serviceArea', {
              areas: provider.serviceAreas.join(', '),
            })}
          </Text>
          {provider.teamSize ? (
            <Text
              style={[
                styles.metaText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              👥{' '}
              {translate(locale, 'customer.c11.teamSize', {
                n: provider.teamSize.toString(),
              })}
            </Text>
          ) : null}
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text
            style={[styles.bioText, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {bio}
          </Text>
        </View>

        {/* Services Offered */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c11.servicesHeader')}
          </Text>
          <View style={styles.servicesList}>
            {offeredServices.map((svc) => {
              const sTitle = locale === 'ur' ? svc.titleUr : svc.titleEn;
              const priceText =
                svc.priceModel === 'FIXED' && svc.basePricePkr
                  ? formatPkr(locale, svc.basePricePkr)
                  : svc.priceModel === 'FROM' && svc.basePricePkr
                    ? translate(locale, 'customer.price.from', {
                        amount: formatPkr(locale, svc.basePricePkr),
                      })
                    : translate(locale, 'customer.price.afterInspection');

              return (
                <TouchableOpacity
                  key={svc.id}
                  testID={`c11-service-row-${svc.id}`}
                  onPress={() => navigate('C10', { serviceId: svc.id })}
                  style={[styles.serviceRow, { flexDirection: mirror.row }]}
                  accessibilityRole="button"
                  accessibilityLabel={sTitle}
                >
                  <Text
                    style={[
                      styles.serviceRowTitle,
                      textTokens(locale, 'body'),
                      { textAlign: mirror.textAlign },
                    ]}
                  >
                    {sTitle}
                  </Text>
                  <Text style={[styles.serviceRowPrice, textTokens(locale, 'label')]}>
                    {priceText}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c10.reviewsHeader')}
          </Text>
          {provider.reviews.length === 0 ? (
            <Text
              style={[
                styles.noReviews,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c11.noReviews')}
            </Text>
          ) : (
            provider.reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={[styles.reviewTopRow, { flexDirection: mirror.row }]}>
                  <Text style={[styles.reviewAuthor, textTokens(locale, 'label')]}>
                    {rev.authorName}
                  </Text>
                  <Text style={styles.reviewStars}>{'★'.repeat(rev.rating)}</Text>
                </View>
                <Text
                  style={[
                    styles.reviewComment,
                    textTokens(locale, 'body'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {locale === 'ur' ? rev.commentUr : rev.commentEn}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Book This Provider CTA */}
        <UiButton
          testID="c11-book-provider-button"
          title={translate(locale, 'customer.c11.bookProvider')}
          onPress={handleBook}
          locale={locale}
          variant="primary"
          style={styles.bookButton}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  profileBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  avatarRow: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLOR.primary,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR.text,
  },
  teamLeaderText: {
    color: COLOR.textMuted,
    marginTop: 2,
  },
  favoriteBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteBtnActive: {
    backgroundColor: '#FCE8E6',
    borderColor: '#C5221F',
  },
  favoriteHeart: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  favoriteHeartActive: {
    color: '#C5221F',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontWeight: 'bold',
    color: COLOR.text,
    fontSize: 16,
  },
  statLabel: {
    color: COLOR.textMuted,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  section: {
    gap: SPACING.xs,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: COLOR.textMuted,
    textTransform: 'uppercase',
  },
  badgesRow: {
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badgeChip: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeChipText: {
    color: '#92400E',
    fontWeight: '600',
    fontSize: 13,
  },
  badgeExplBox: {
    backgroundColor: '#FFFBEB',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginTop: SPACING.xs,
  },
  badgeExplText: {
    color: '#92400E',
  },
  metaCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  metaText: {
    color: COLOR.text,
  },
  bioText: {
    color: COLOR.text,
    lineHeight: 22,
  },
  servicesList: {
    gap: SPACING.xs,
  },
  serviceRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceRowTitle: {
    flex: 1,
    color: COLOR.text,
    fontWeight: '600',
  },
  serviceRowPrice: {
    color: COLOR.primary,
    fontWeight: 'bold',
  },
  noReviews: {
    color: COLOR.textMuted,
    fontStyle: 'italic',
  },
  reviewCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
    gap: 4,
  },
  reviewTopRow: {
    justifyContent: 'space-between',
  },
  reviewAuthor: {
    fontWeight: 'bold',
    color: COLOR.text,
  },
  reviewStars: {
    color: '#D97706',
    fontSize: 12,
  },
  reviewComment: {
    color: COLOR.text,
  },
  bookButton: {
    marginTop: SPACING.md,
    width: '100%',
  },
});

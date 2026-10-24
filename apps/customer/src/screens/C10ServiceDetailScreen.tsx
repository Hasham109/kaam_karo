/**
 * C10 Service Detail Screen (BP §12, §4.2; docs/screens/customer.md).
 * Purpose: service anatomy, pricing model, inclusions, exclusions, reviews, book CTA.
 * Requirement IDs: CAT-SVC-001..011, PRICE-001..004, ANALYTICS-002.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { StateView } from '../components/StateView';
import { UiButton } from '../components/UiButton';
import { MOCK_SERVICES } from '../data/mock-data';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';

export function C10ServiceDetailScreen(): React.JSX.Element {
  const { locale, navigate, screenParams, isGuest } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const serviceId = (screenParams as { serviceId?: string })?.serviceId ?? 'ac-general-service';
  const service = MOCK_SERVICES.find((s) => s.id === serviceId);

  if (!service) {
    return (
      <ScreenContainer testID="c10-service-detail-screen">
        <StateView
          state="E"
          locale={locale}
          message={translate(locale, 'customer.c10.serviceUnavailable')}
          nextStepLabel={translate(locale, 'common.action.back')}
          onNextStep={() => navigate('C06')}
        />
      </ScreenContainer>
    );
  }

  const title = locale === 'ur' ? service.titleUr : service.titleEn;
  const description = locale === 'ur' ? service.descriptionUr : service.descriptionEn;
  const includedList = locale === 'ur' ? service.includedUr : service.includedEn;
  const notIncludedList = locale === 'ur' ? service.notIncludedUr : service.notIncludedEn;

  const priceText =
    service.priceModel === 'FIXED' && service.basePricePkr
      ? formatPkr(locale, service.basePricePkr)
      : service.priceModel === 'FROM' && service.basePricePkr
        ? translate(locale, 'customer.price.from', {
            amount: formatPkr(locale, service.basePricePkr),
          })
        : translate(locale, 'customer.price.afterInspection');

  const getCtaLabel = () => {
    switch (service.priceModel) {
      case 'FIXED':
        return translate(locale, 'customer.c10.bookNow');
      case 'FROM':
        return translate(locale, 'customer.c10.getPrice');
      case 'INSPECTION_QUOTE':
      default:
        return translate(locale, 'customer.c10.requestInspection');
    }
  };

  const handleBook = () => {
    if (isGuest) {
      // Guest submit triggers C03 with login needed message per BP §2.13
      navigate('C03');
    } else {
      // In core flow, simulate placing request -> go to Home or Search Results
      navigate('C06');
    }
  };

  return (
    <ScreenContainer testID="c10-service-detail-screen" title={title}>
      <View style={styles.content}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text
            testID="c10-service-title"
            style={[styles.heroTitle, textTokens(locale, 'title'), { textAlign: mirror.textAlign }]}
          >
            {title}
          </Text>

          <View style={[styles.priceRow, { flexDirection: mirror.row }]}>
            <Text testID="c10-service-price" style={[styles.priceTag, textTokens(locale, 'title')]}>
              {priceText}
            </Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.starIcon}>★</Text>
              <Text style={styles.ratingText}>
                {service.rating.toFixed(1)} ({service.reviewCount})
              </Text>
            </View>
          </View>

          {/* Pay at end note (D-003) */}
          <View style={styles.payAtEndBanner}>
            <Text style={[styles.payAtEndText, textTokens(locale, 'label')]}>
              🛡 {translate(locale, 'customer.payment.atEnd')}
            </Text>
          </View>
        </View>

        {/* Emergency Available Banner (if set) */}
        {service.isEmergencyAvailable ? (
          <View testID="c10-emergency-banner" style={styles.emergencyBanner}>
            <Text style={[styles.emergencyText, textTokens(locale, 'label')]}>
              ⚡ {translate(locale, 'customer.c10.emergencyAvailable')}
            </Text>
          </View>
        ) : null}

        {/* About Section */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionHeading,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c10.aboutService')}
          </Text>
          <Text
            style={[styles.bodyText, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {description}
          </Text>
        </View>

        {/* Charges info (Visit charge / Inspection fee) */}
        {service.visitChargePkr || service.inspectionFeePkr ? (
          <View style={styles.chargesCard}>
            {service.visitChargePkr ? (
              <Text style={[styles.chargeLine, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c10.visitCharge', {
                  amount: formatPkr(locale, service.visitChargePkr),
                })}
              </Text>
            ) : null}
            {service.inspectionFeePkr ? (
              <Text style={[styles.chargeLine, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c10.inspectionFee', {
                  amount: formatPkr(locale, service.inspectionFeePkr),
                  deduction: service.inspectionDeductible
                    ? translate(locale, 'customer.c10.deductedFromRepair')
                    : translate(locale, 'customer.c10.notDeducted'),
                })}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* What's Included */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionHeading,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c10.includedHeader')}
          </Text>
          <View style={styles.bulletList}>
            {includedList.map((item, idx) => (
              <View key={`inc-${idx}`} style={[styles.bulletRow, { flexDirection: mirror.row }]}>
                <Text style={styles.checkIcon}>✓</Text>
                <Text
                  style={[
                    styles.bulletText,
                    textTokens(locale, 'body'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* What's Not Included */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionHeading,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c10.notIncludedHeader')}
          </Text>
          <View style={styles.bulletList}>
            {notIncludedList.map((item, idx) => (
              <View
                key={`not-inc-${idx}`}
                style={[styles.bulletRow, { flexDirection: mirror.row }]}
              >
                <Text style={styles.crossIcon}>✕</Text>
                <Text
                  style={[
                    styles.bulletText,
                    textTokens(locale, 'body'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Estimated Duration & Working Hours */}
        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={[styles.metaLabel, textTokens(locale, 'label')]}>
              ⏱{' '}
              {translate(locale, 'customer.c10.estimatedDuration', {
                duration: locale === 'ur' ? service.durationUr : service.durationEn,
              })}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={[styles.metaLabel, textTokens(locale, 'label')]}>
              🕒{' '}
              {translate(locale, 'customer.c10.availabilityHours', {
                hours: locale === 'ur' ? service.hoursUr : service.hoursEn,
              })}
            </Text>
          </View>
        </View>

        {/* Cancellation Policy */}
        <View style={styles.cancellationBox}>
          <Text style={[styles.cancelHeading, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c10.cancellationPolicy')}
          </Text>
          <Text style={[styles.cancelText, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c10.cancellationPolicyText')}
          </Text>
        </View>

        {/* Reviews Section */}
        {service.reviews.length > 0 ? (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionHeading,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c10.reviewsHeader')}
            </Text>
            {service.reviews.map((rev) => (
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
            ))}
          </View>
        ) : null}

        {/* Sticky-style Bottom Book Button */}
        <UiButton
          testID="c10-book-cta-button"
          title={getCtaLabel()}
          onPress={handleBook}
          locale={locale}
          variant="primary"
          style={styles.bookCta}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLOR.text,
  },
  priceRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  priceTag: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLOR.primary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 4,
  },
  starIcon: {
    color: '#D97706',
    fontSize: 12,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#78350F',
  },
  payAtEndBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  payAtEndText: {
    color: '#15803D',
    fontWeight: '600',
  },
  emergencyBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
  },
  emergencyText: {
    color: '#B45309',
    fontWeight: 'bold',
  },
  section: {
    gap: SPACING.xs,
  },
  sectionHeading: {
    fontWeight: 'bold',
    color: COLOR.textMuted,
    textTransform: 'uppercase',
  },
  bodyText: {
    color: COLOR.text,
    lineHeight: 22,
  },
  chargesCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  chargeLine: {
    color: COLOR.text,
    fontWeight: '600',
  },
  bulletList: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  bulletRow: {
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  checkIcon: {
    color: '#0D6832',
    fontWeight: 'bold',
    fontSize: 14,
  },
  crossIcon: {
    color: '#9A1010',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bulletText: {
    flex: 1,
    color: COLOR.text,
  },
  metaRow: {
    gap: SPACING.sm,
  },
  metaBox: {
    backgroundColor: COLOR.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  metaLabel: {
    color: COLOR.text,
  },
  cancellationBox: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  cancelHeading: {
    fontWeight: 'bold',
    color: COLOR.text,
  },
  cancelText: {
    color: COLOR.textMuted,
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
  bookCta: {
    marginTop: SPACING.md,
    width: '100%',
  },
});

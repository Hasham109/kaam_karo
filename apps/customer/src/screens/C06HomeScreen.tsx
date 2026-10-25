/**
 * C06 Home Screen (BP §12, §79; docs/screens/customer.md).
 * Purpose: location, search, categories, popular services, active job, intake banner.
 * Requirement IDs: PERF-001, LOC-GEO-001, SCOPE-CAT-002, CAT-SVC-012, UX-SCREEN-005.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
import {
  COLOR,
  interactiveProps,
  minTapTargetStyle,
  RADIUS,
  SPACING,
  textTokens,
} from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { BookingStatusChip } from '../components/StatusChip';
import { MOCK_CATEGORIES, MOCK_SERVICES } from '../data/mock-data';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';

export function C06HomeScreen(): React.JSX.Element {
  const { locale, navigate, isGuest, selectedCity, activeBooking } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const popularServices = MOCK_SERVICES.filter((s) => s.isPopular);

  return (
    <ScreenContainer testID="c06-home-screen" showBackButton={false} showLanguageToggle={true}>
      <View style={styles.content}>
        {/* Guest Banner */}
        {isGuest ? (
          <View testID="c06-guest-banner" style={styles.guestBanner}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.guestTitle,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {translate(locale, 'customer.c06.guestBannerTitle')}
              </Text>
            </View>
            <TouchableOpacity
              testID="c06-guest-login-button"
              onPress={() => navigate('C03')}
              style={[styles.guestActionBtn, minTapTargetStyle()]}
              accessibilityRole="button"
              accessibilityLabel={translate(locale, 'customer.c06.guestBannerAction')}
            >
              <Text style={styles.guestActionText}>
                {translate(locale, 'customer.c06.guestBannerAction')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Location Chip */}
        <View style={[styles.locationRow, { flexDirection: mirror.row }]}>
          <TouchableOpacity
            testID="c06-location-chip"
            onPress={() => navigate('C39', { returnTo: 'C06' })}
            style={[styles.locationChip, { flexDirection: mirror.row }]}
            accessibilityRole="button"
            accessibilityLabel={translate(locale, 'customer.c06.serviceLocation', {
              location: selectedCity,
            })}
          >
            <Text style={styles.locationPin}>📍</Text>
            <Text style={[styles.locationText, textTokens(locale, 'body')]}>
              {translate(locale, 'customer.c06.serviceLocation', {
                location: selectedCity,
              })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* "What do you need?" Big Intake Entry */}
        <TouchableOpacity
          testID="c06-intake-banner"
          onPress={() => navigate('C31')}
          style={[styles.intakeCard, { flexDirection: mirror.row }]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={translate(locale, 'customer.c06.whatDoYouNeed')}
        >
          <View style={styles.intakeLeft}>
            <Text style={[styles.intakeTitle, textTokens(locale, 'title')]}>
              {translate(locale, 'customer.c06.whatDoYouNeed')}
            </Text>
            <Text style={[styles.intakeSub, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c06.whatDoYouNeedSub')}
            </Text>
          </View>
          <View style={styles.intakeIconCircle}>
            <Text style={styles.intakeIcon}>🔍</Text>
          </View>
        </TouchableOpacity>

        {/* Search Bar & Voice Action */}
        <View style={[styles.searchRow, { flexDirection: mirror.row }]}>
          <TouchableOpacity
            testID="c06-search-entry"
            onPress={() => navigate('C07')}
            style={[styles.searchBar, { flexDirection: mirror.row }]}
            accessibilityRole="button"
            accessibilityLabel={translate(locale, 'customer.c06.searchPlaceholder')}
          >
            <Text style={styles.searchIcon}>🔎</Text>
            <Text style={[styles.searchPlaceholder, textTokens(locale, 'body')]}>
              {translate(locale, 'customer.c06.searchPlaceholder')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigate('C38', { returnTo: 'C06' })}
            style={[styles.voiceButton, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c06-voice-button',
              accessibilityRole: 'button',
              accessibilityLabel: translate(locale, 'customer.c06.speakA11y'),
            })}
          >
            <Text style={styles.voiceIcon}>🎤</Text>
          </TouchableOpacity>
        </View>

        {/* Active Booking Card (if present) */}
        {activeBooking && !isGuest ? (
          <TouchableOpacity
            testID="c06-active-job-card"
            style={styles.activeJobCard}
            onPress={() => navigate('C17', { bookingId: activeBooking.id })}
            accessibilityRole="button"
            accessibilityLabel={translate(locale, 'customer.c06.viewJob')}
          >
            <View style={[styles.activeJobHeaderRow, { flexDirection: mirror.row }]}>
              <Text
                style={[
                  styles.activeJobTitle,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {translate(locale, 'customer.c06.activeJobHeader')}
              </Text>
              <BookingStatusChip
                testID="c06-active-job-status"
                status={activeBooking.status}
                locale={locale}
              />
            </View>

            <View style={styles.activeJobDetails}>
              <Text
                style={[
                  styles.activeServiceName,
                  textTokens(locale, 'body'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {locale === 'ur' ? activeBooking.serviceTitleUr : activeBooking.serviceTitleEn}
              </Text>
              <Text
                style={[
                  styles.activeProviderName,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {activeBooking.providerName} · {activeBooking.scheduledTime}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Categories Grid */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c06.categoriesHeader')}
          </Text>

          <View style={styles.categoryGrid}>
            {MOCK_CATEGORIES.map((cat) => {
              const catTitle = locale === 'ur' ? cat.nameUr : cat.nameEn;
              return (
                <TouchableOpacity
                  key={cat.id}
                  testID={`c06-category-card-${cat.id}`}
                  onPress={() => navigate('C09', { categoryId: cat.id })}
                  style={styles.categoryCard}
                  accessibilityRole="button"
                  accessibilityLabel={catTitle}
                >
                  <View style={styles.categoryIconCircle}>
                    <Text style={styles.catGlyph}>🛠</Text>
                  </View>
                  <Text
                    style={[styles.categoryName, textTokens(locale, 'label')]}
                    numberOfLines={2}
                  >
                    {catTitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Popular Services */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c06.popularServicesHeader')}
          </Text>

          <View style={styles.servicesList}>
            {popularServices.map((svc) => {
              const title = locale === 'ur' ? svc.titleUr : svc.titleEn;
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
                  testID={`c06-service-card-${svc.id}`}
                  onPress={() => navigate('C10', { serviceId: svc.id })}
                  style={[styles.serviceCard, { flexDirection: mirror.row }]}
                  accessibilityRole="button"
                  accessibilityLabel={title}
                >
                  <View style={styles.serviceInfo}>
                    <Text
                      style={[
                        styles.serviceTitle,
                        textTokens(locale, 'body'),
                        { textAlign: mirror.textAlign },
                      ]}
                    >
                      {title}
                    </Text>
                    <Text
                      style={[
                        styles.servicePrice,
                        textTokens(locale, 'label'),
                        { textAlign: mirror.textAlign },
                      ]}
                    >
                      {priceText}
                    </Text>
                  </View>

                  <View style={styles.ratingBadge}>
                    <Text style={styles.starIcon}>★</Text>
                    <Text style={styles.ratingText}>{svc.rating.toFixed(1)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING.lg,
  },
  guestBanner: {
    backgroundColor: '#FEF7E0',
    borderWidth: 1,
    borderColor: '#B06000',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guestTitle: {
    color: '#7A4100',
    fontWeight: 'bold',
  },
  guestActionBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  guestActionText: {
    color: COLOR.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  locationRow: {
    alignItems: 'center',
  },
  locationChip: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
  },
  locationPin: {
    fontSize: 16,
  },
  locationText: {
    fontWeight: 'bold',
    color: COLOR.text,
  },
  intakeCard: {
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intakeLeft: {
    flex: 1,
  },
  intakeTitle: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  intakeSub: {
    color: '#E0E7FF',
    lineHeight: 18,
  },
  intakeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.md,
  },
  intakeIcon: {
    fontSize: 22,
  },
  searchRow: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchBar: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 48,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchPlaceholder: {
    color: COLOR.textMuted,
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceIcon: {
    fontSize: 20,
  },
  activeJobCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  activeJobHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeJobTitle: {
    color: '#15803D',
    fontWeight: 'bold',
  },
  activeJobDetails: {
    gap: SPACING.xs,
  },
  activeServiceName: {
    fontWeight: 'bold',
    color: COLOR.text,
  },
  activeProviderName: {
    color: COLOR.textMuted,
  },
  section: {
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR.text,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '30%',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  catGlyph: {
    fontSize: 22,
  },
  categoryName: {
    textAlign: 'center',
    fontWeight: '600',
    color: COLOR.text,
  },
  servicesList: {
    gap: SPACING.sm,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontWeight: '600',
    color: COLOR.text,
  },
  servicePrice: {
    color: COLOR.primary,
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
});

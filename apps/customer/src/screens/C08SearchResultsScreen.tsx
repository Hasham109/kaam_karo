/**
 * C08 Search Results Screen (BP §12, docs/screens/customer.md).
 * Purpose: services and providers with segmented tabs and filters.
 * Requirement IDs: UX-SCREEN-001, SCOPE-CAT-002, CAT-SVC-001, MATCH-EXPL-001.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { StateView } from '../components/StateView';
import { VerificationBadge } from '../components/StatusChip';
import { MOCK_CATEGORIES, MOCK_PROVIDERS, MOCK_SERVICES } from '../data/mock-data';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';

export function C08SearchResultsScreen(): React.JSX.Element {
  const { locale, navigate, screenParams } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const query = (screenParams as { query?: string; categoryId?: string })?.query ?? '';
  const initialCategory = (screenParams as { categoryId?: string })?.categoryId ?? 'all';

  const [activeTab, setActiveTab] = useState<'services' | 'providers'>('services');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

  const normalizedQuery = query.toLowerCase().trim();

  // Filter services
  const filteredServices = MOCK_SERVICES.filter((svc) => {
    const matchesCategory = selectedCategory === 'all' || svc.categoryId === selectedCategory;
    const matchesQuery =
      !normalizedQuery ||
      svc.titleEn.toLowerCase().includes(normalizedQuery) ||
      svc.titleUr.includes(normalizedQuery) ||
      svc.descriptionEn.toLowerCase().includes(normalizedQuery) ||
      svc.descriptionUr.includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  // Filter providers
  const filteredProviders = MOCK_PROVIDERS.filter((prov) => {
    const matchesQuery =
      !normalizedQuery ||
      prov.name.toLowerCase().includes(normalizedQuery) ||
      prov.serviceAreas.some((a) => a.toLowerCase().includes(normalizedQuery)) ||
      prov.bioEn.toLowerCase().includes(normalizedQuery);
    return matchesQuery;
  });

  return (
    <ScreenContainer
      testID="c08-search-results-screen"
      title={query || translate(locale, 'customer.c08.tabServices')}
    >
      <View style={styles.content}>
        {/* Segmented Tabs: Services · Providers */}
        <View style={[styles.tabsRow, { flexDirection: mirror.row }]}>
          <TouchableOpacity
            testID="c08-tab-services"
            onPress={() => setActiveTab('services')}
            style={[styles.tabButton, activeTab === 'services' && styles.tabButtonActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'services' }}
            accessibilityLabel={translate(locale, 'customer.c08.tabServices')}
          >
            <Text
              style={[
                styles.tabText,
                textTokens(locale, 'body'),
                activeTab === 'services' && styles.tabTextActive,
              ]}
            >
              {translate(locale, 'customer.c08.tabServices')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="c08-tab-providers"
            onPress={() => setActiveTab('providers')}
            style={[styles.tabButton, activeTab === 'providers' && styles.tabButtonActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'providers' }}
            accessibilityLabel={translate(locale, 'customer.c08.tabProviders')}
          >
            <Text
              style={[
                styles.tabText,
                textTokens(locale, 'body'),
                activeTab === 'providers' && styles.tabTextActive,
              ]}
            >
              {translate(locale, 'customer.c08.tabProviders')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter Chips */}
        {activeTab === 'services' ? (
          <View style={[styles.filterRow, { flexDirection: mirror.row }]}>
            <TouchableOpacity
              testID="c08-filter-all"
              onPress={() => setSelectedCategory('all')}
              style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedCategory === 'all' }}
              accessibilityLabel={translate(locale, 'customer.c08.allCategories')}
            >
              <Text
                style={[
                  styles.filterText,
                  textTokens(locale, 'label'),
                  selectedCategory === 'all' && styles.filterTextActive,
                ]}
              >
                {translate(locale, 'customer.c08.allCategories')}
              </Text>
            </TouchableOpacity>

            {MOCK_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const catTitle = locale === 'ur' ? cat.nameUr : cat.nameEn;
              return (
                <TouchableOpacity
                  key={cat.id}
                  testID={`c08-filter-${cat.id}`}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={catTitle}
                >
                  <Text
                    style={[
                      styles.filterText,
                      textTokens(locale, 'label'),
                      isSelected && styles.filterTextActive,
                    ]}
                  >
                    {catTitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* Results List */}
        {activeTab === 'services' ? (
          filteredServices.length === 0 ? (
            <StateView
              state="E"
              locale={locale}
              message={translate(locale, 'customer.c08.noResults')}
              nextStepLabel={translate(locale, 'customer.c07.describeProblem')}
              onNextStep={() => navigate('C07')}
            />
          ) : (
            <View style={styles.resultsList}>
              {filteredServices.map((svc) => {
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
                    testID={`c08-service-row-${svc.id}`}
                    onPress={() => navigate('C10', { serviceId: svc.id })}
                    style={[styles.serviceRow, { flexDirection: mirror.row }]}
                    accessibilityRole="button"
                    accessibilityLabel={title}
                  >
                    <View style={styles.serviceRowInfo}>
                      <Text
                        style={[
                          styles.serviceRowTitle,
                          textTokens(locale, 'body'),
                          { textAlign: mirror.textAlign },
                        ]}
                      >
                        {title}
                      </Text>
                      <Text
                        style={[
                          styles.serviceRowPrice,
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
          )
        ) : filteredProviders.length === 0 ? (
          <StateView
            state="E"
            locale={locale}
            message={translate(locale, 'customer.c08.noResults')}
            nextStepLabel={translate(locale, 'customer.c07.describeProblem')}
            onNextStep={() => navigate('C07')}
          />
        ) : (
          <View style={styles.resultsList}>
            {filteredProviders.map((prov) => {
              return (
                <TouchableOpacity
                  key={prov.id}
                  testID={`c08-provider-row-${prov.id}`}
                  onPress={() => navigate('C11', { providerId: prov.id })}
                  style={styles.providerCard}
                  accessibilityRole="button"
                  accessibilityLabel={prov.name}
                >
                  <View style={[styles.providerHeader, { flexDirection: mirror.row }]}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{prov.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.provName,
                          textTokens(locale, 'body'),
                          { textAlign: mirror.textAlign },
                        ]}
                      >
                        {prov.name}
                      </Text>
                      <Text
                        style={[
                          styles.teamLead,
                          textTokens(locale, 'label'),
                          { textAlign: mirror.textAlign },
                        ]}
                      >
                        {translate(locale, 'customer.c11.teamLeader', {
                          name: prov.teamLeaderName,
                        })}
                      </Text>
                    </View>
                    <VerificationBadge level={prov.verificationLevel} locale={locale} />
                  </View>

                  <View style={[styles.provStatsRow, { flexDirection: mirror.row }]}>
                    <Text style={[styles.statsText, textTokens(locale, 'label')]}>
                      {translate(locale, 'customer.c08.providerStats', {
                        rating: prov.rating.toFixed(1),
                        count: prov.reviewCount.toString(),
                        jobs: prov.completedJobsCount.toString(),
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING.md,
  },
  tabsRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLOR.primary,
  },
  tabText: {
    fontWeight: 'bold',
    color: COLOR.textMuted,
  },
  tabTextActive: {
    color: COLOR.primary,
  },
  filterRow: {
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  filterText: {
    color: COLOR.text,
    fontWeight: '600',
  },
  filterTextActive: {
    color: COLOR.onPrimary,
  },
  resultsList: {
    gap: SPACING.sm,
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
  serviceRowInfo: {
    flex: 1,
  },
  serviceRowTitle: {
    fontWeight: '600',
    color: COLOR.text,
  },
  serviceRowPrice: {
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
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  providerHeader: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLOR.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  provName: {
    fontWeight: 'bold',
    color: COLOR.text,
  },
  teamLead: {
    color: COLOR.textMuted,
  },
  provStatsRow: {
    backgroundColor: '#F9FAFB',
    padding: SPACING.xs,
    borderRadius: 4,
  },
  statsText: {
    color: COLOR.textMuted,
  },
});

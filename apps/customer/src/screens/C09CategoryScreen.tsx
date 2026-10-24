/**
 * C09 Category Screen (BP §12, docs/screens/customer.md).
 * Purpose: category subcategories, featured and available services.
 * Requirement IDs: SCOPE-CAT-002, CAT-SVC-012, CFG-RULE-001.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { StateView } from '../components/StateView';
import { UiButton } from '../components/UiButton';
import { MOCK_CATEGORIES, MOCK_SERVICES } from '../data/mock-data';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';

export function C09CategoryScreen(): React.JSX.Element {
  const { locale, navigate, screenParams } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const categoryId = (screenParams as { categoryId?: string })?.categoryId ?? 'ac';
  const fallbackCategory = MOCK_CATEGORIES[0] as (typeof MOCK_CATEGORIES)[number];
  const category = MOCK_CATEGORIES.find((c) => c.id === categoryId) ?? fallbackCategory;
  const categoryTitle = locale === 'ur' ? category.nameUr : category.nameEn;

  const [selectedSub, setSelectedSub] = useState<number | null>(null);

  const subcategories = locale === 'ur' ? category.subcategoriesUr : category.subcategoriesEn;
  const services = MOCK_SERVICES.filter((s) => s.categoryId === category.id);

  return (
    <ScreenContainer testID="c09-category-screen" title={categoryTitle}>
      <View style={styles.content}>
        {/* Category Header Card */}
        <View style={styles.headerCard}>
          <Text style={styles.headerGlyph}>🛠</Text>
          <Text
            testID="c09-category-title"
            style={[styles.headerTitle, textTokens(locale, 'title')]}
          >
            {categoryTitle}
          </Text>
        </View>

        {/* Subcategories Horizontal Scroll/Chips */}
        <View style={styles.subSection}>
          <Text
            style={[
              styles.subSectionTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c09.subcategories')}
          </Text>
          <View style={[styles.subChipsRow, { flexDirection: mirror.row }]}>
            {subcategories.map((sub, idx) => {
              const isSelected = selectedSub === idx;
              return (
                <TouchableOpacity
                  key={`sub-${idx}`}
                  testID={`c09-sub-chip-${idx}`}
                  onPress={() => setSelectedSub(isSelected ? null : idx)}
                  style={[
                    styles.subChip,
                    isSelected ? styles.subChipActive : styles.subChipInactive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={sub}
                >
                  <Text
                    style={[
                      styles.subChipText,
                      textTokens(locale, 'label'),
                      isSelected ? styles.subChipTextActive : styles.subChipTextInactive,
                    ]}
                  >
                    {sub}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Services List */}
        {services.length === 0 ? (
          <StateView
            state="E"
            locale={locale}
            message={translate(locale, 'customer.c09.emptyCategory')}
            nextStepLabel={translate(locale, 'customer.c09.notSure')}
            onNextStep={() => navigate('C07')}
          />
        ) : (
          <View style={styles.servicesSection}>
            <Text
              style={[
                styles.servicesSectionTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c09.featured')}
            </Text>

            <View style={styles.servicesList}>
              {services.map((svc) => {
                const title = locale === 'ur' ? svc.titleUr : svc.titleEn;
                const desc = locale === 'ur' ? svc.descriptionUr : svc.descriptionEn;
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
                    testID={`c09-service-item-${svc.id}`}
                    onPress={() => navigate('C10', { serviceId: svc.id })}
                    style={styles.serviceItemCard}
                    accessibilityRole="button"
                    accessibilityLabel={title}
                  >
                    <View style={[styles.itemTopRow, { flexDirection: mirror.row }]}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.itemTitle,
                            textTokens(locale, 'body'),
                            { textAlign: mirror.textAlign },
                          ]}
                        >
                          {title}
                        </Text>
                        <Text
                          style={[
                            styles.itemDesc,
                            textTokens(locale, 'label'),
                            { textAlign: mirror.textAlign },
                          ]}
                          numberOfLines={2}
                        >
                          {desc}
                        </Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.starIcon}>★</Text>
                        <Text style={styles.ratingText}>{svc.rating.toFixed(1)}</Text>
                      </View>
                    </View>

                    <View style={[styles.itemBottomRow, { flexDirection: mirror.row }]}>
                      <Text style={[styles.itemPrice, textTokens(locale, 'body')]}>
                        {priceText}
                      </Text>
                      <Text style={[styles.durationText, textTokens(locale, 'label')]}>
                        {locale === 'ur' ? svc.durationUr : svc.durationEn}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Not Sure CTA */}
        <UiButton
          testID="c09-not-sure-button"
          title={translate(locale, 'customer.c09.notSure')}
          onPress={() => navigate('C07', { initialQuery: categoryTitle })}
          locale={locale}
          variant="outline"
          style={styles.notSureBtn}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING.lg,
  },
  headerCard: {
    backgroundColor: '#E8F0FE',
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGlyph: {
    fontSize: 36,
    marginBottom: SPACING.xs,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: COLOR.primary,
    fontSize: 22,
  },
  subSection: {
    gap: SPACING.sm,
  },
  subSectionTitle: {
    fontWeight: 'bold',
    color: COLOR.textMuted,
  },
  subChipsRow: {
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  subChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  subChipActive: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  subChipInactive: {
    backgroundColor: COLOR.surface,
    borderColor: '#E5E7EB',
  },
  subChipText: {
    fontWeight: '600',
  },
  subChipTextActive: {
    color: COLOR.onPrimary,
  },
  subChipTextInactive: {
    color: COLOR.text,
  },
  servicesSection: {
    gap: SPACING.sm,
  },
  servicesSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLOR.text,
  },
  servicesList: {
    gap: SPACING.sm,
  },
  serviceItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  itemTopRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  itemTitle: {
    fontWeight: 'bold',
    color: COLOR.text,
  },
  itemDesc: {
    color: COLOR.textMuted,
    marginTop: 2,
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
  itemBottomRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: SPACING.xs,
  },
  itemPrice: {
    fontWeight: 'bold',
    color: COLOR.primary,
  },
  durationText: {
    color: COLOR.textMuted,
  },
  notSureBtn: {
    marginTop: SPACING.sm,
    width: '100%',
  },
});

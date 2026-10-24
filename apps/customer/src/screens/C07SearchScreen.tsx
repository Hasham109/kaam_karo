/**
 * C07 Search Screen (BP §12, §9 step 13; docs/screens/customer.md).
 * Purpose: search by problem, service, or provider in everyday language.
 * Requirement IDs: UX-SCREEN-001, ANALYTICS-002, REQ-AI-012, I18N-005.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { UiButton } from '../components/UiButton';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';

export function C07SearchScreen(): React.JSX.Element {
  const { locale, navigate, recentSearches, addRecentSearch, clearRecentSearches, screenParams } =
    useCustomerApp();
  const mirror = getAppMirroring(locale);

  const initial = (screenParams as { initialQuery?: string })?.initialQuery ?? '';
  const [query, setQuery] = useState(initial);

  const handleSearch = (searchQuery?: string) => {
    const q = (searchQuery ?? query).trim();
    if (!q) return;
    addRecentSearch(q);
    navigate('C08', { query: q });
  };

  return (
    <ScreenContainer
      testID="c07-search-screen"
      title={translate(locale, 'customer.c07.searchAction')}
    >
      <View style={styles.content}>
        {/* Search Input Box */}
        <View style={[styles.searchBox, { flexDirection: mirror.row }]}>
          <TextInput
            testID="c07-search-input"
            value={query}
            onChangeText={setQuery}
            placeholder={translate(locale, 'customer.c07.queryPlaceholder')}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => handleSearch()}
            style={[styles.input, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
            accessibilityLabel={translate(locale, 'customer.c07.queryPlaceholder')}
          />
          {query.trim().length > 0 ? (
            <TouchableOpacity
              testID="c07-clear-query"
              onPress={() => setQuery('')}
              style={styles.clearIconBtn}
              accessibilityRole="button"
              accessibilityLabel={translate(locale, 'customer.c07.clearRecent')}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search CTA */}
        <UiButton
          testID="c07-submit-search-button"
          title={translate(locale, 'customer.c07.searchAction')}
          onPress={() => handleSearch()}
          locale={locale}
          variant="primary"
          disabled={!query.trim()}
          style={styles.searchButton}
        />

        {/* "Describe your problem instead" CTA (BP §79) */}
        <UiButton
          testID="c07-describe-problem-button"
          title={translate(locale, 'customer.c07.describeProblem')}
          onPress={() => handleSearch(query || 'General Repair')}
          locale={locale}
          variant="outline"
          style={styles.describeButton}
        />

        {/* Recent Searches */}
        {recentSearches.length > 0 ? (
          <View style={styles.recentSection}>
            <View style={[styles.recentHeaderRow, { flexDirection: mirror.row }]}>
              <Text
                style={[
                  styles.recentTitle,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {translate(locale, 'customer.c07.recentSearches')}
              </Text>
              <TouchableOpacity
                testID="c07-clear-recent-button"
                onPress={clearRecentSearches}
                accessibilityRole="button"
                accessibilityLabel={translate(locale, 'customer.c07.clearRecent')}
              >
                <Text style={styles.clearText}>
                  {translate(locale, 'customer.c07.clearRecent')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentChips}>
              {recentSearches.map((item, idx) => (
                <TouchableOpacity
                  key={`recent-${idx}`}
                  testID={`c07-recent-item-${idx}`}
                  onPress={() => {
                    setQuery(item);
                    handleSearch(item);
                  }}
                  style={[styles.recentChip, { flexDirection: mirror.row }]}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                >
                  <Text style={styles.clockIcon}>🕒</Text>
                  <Text style={[styles.recentChipText, textTokens(locale, 'body')]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: SPACING.md,
  },
  searchBox: {
    borderWidth: 1,
    borderColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLOR.text,
  },
  clearIconBtn: {
    padding: SPACING.xs,
  },
  clearIcon: {
    color: COLOR.textMuted,
    fontSize: 16,
  },
  searchButton: {
    width: '100%',
  },
  describeButton: {
    width: '100%',
  },
  recentSection: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  recentHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentTitle: {
    fontWeight: 'bold',
    color: COLOR.textMuted,
  },
  clearText: {
    color: COLOR.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  recentChips: {
    gap: SPACING.xs,
  },
  recentChip: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
  },
  clockIcon: {
    fontSize: 14,
  },
  recentChipText: {
    color: COLOR.text,
  },
});

/**
 * C21 Review Screen (BP §12, §19; docs/screens/customer.md).
 * Purpose: Customer rating, tags, and optional written review for completed bookings.
 * Requirements: REV-001, REV-002, REV-007, RATING-ENF-001, CFG-RULE-009, OQ-043.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import { COLOR, RADIUS, SPACING, minTapTargetStyle, textTokens } from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { StateView } from '../components/StateView';
import { UiButton } from '../components/UiButton';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';
import type { ScreenState } from '../types';

interface TagOption {
  key: string;
  labelKey:
    | 'customer.c21.tagPunctual'
    | 'customer.c21.tagProfessional'
    | 'customer.c21.tagCleanWork'
    | 'customer.c21.tagFairPrice'
    | 'customer.c21.tagPolite';
}

const TAG_OPTIONS: TagOption[] = [
  { key: 'punctual', labelKey: 'customer.c21.tagPunctual' },
  { key: 'professional', labelKey: 'customer.c21.tagProfessional' },
  { key: 'clean_work', labelKey: 'customer.c21.tagCleanWork' },
  { key: 'fair_price', labelKey: 'customer.c21.tagFairPrice' },
  { key: 'polite', labelKey: 'customer.c21.tagPolite' },
];

export function C21ReviewScreen(): React.JSX.Element {
  const { locale, navigate, screenParams } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const bookingId = screenParams?.C21?.bookingId ?? 'b-100';
  const providerName = screenParams?.C21?.providerName ?? 'Muhammad Tariq';
  const returnTo = screenParams?.C21?.returnTo ?? 'C20';

  const [rating, setRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reviewText, setReviewText] = useState<string>('');
  const [screenState, setScreenState] = useState<ScreenState>('E');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const toggleTag = (key: string) => {
    setSelectedTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
    );
  };

  const handleStarPress = (starIndex: number) => {
    setRating(starIndex);
    if (screenState === 'E') {
      setScreenState('S');
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setScreenState('E');
      return;
    }

    setScreenState('L');

    try {
      // Simulate API submit review
      // Real API maps: POST /v1/reviews
      setScreenState('S');
    } catch {
      setErrorCode('GENERIC');
      setScreenState('X');
    }
  };

  // StateView Rendering for Terminal/Full Screen States
  if (screenState === 'L') {
    return (
      <ScreenContainer testID="c21-review-screen">
        <StateView state="L" locale={locale} message={translate(locale, 'customer.c21.sending')} />
      </ScreenContainer>
    );
  }

  if (screenState === 'P') {
    return (
      <ScreenContainer testID="c21-review-screen">
        <StateView
          state="P"
          locale={locale}
          message={translate(locale, 'customer.c21.pending')}
          nextStepLabel={translate(locale, 'common.action.retry')}
          onNextStep={handleSubmit}
        />
      </ScreenContainer>
    );
  }

  if (screenState === 'X') {
    const errorMsg =
      errorCode === 'NOT_COMPLETED'
        ? translate(locale, 'customer.c21.notCompleted')
        : errorCode === 'ALREADY_REVIEWED'
          ? translate(locale, 'customer.c21.alreadyReviewed')
          : errorCode === 'REVIEW_WINDOW_CLOSED'
            ? translate(locale, 'customer.c21.windowClosed')
            : translate(locale, 'customer.c21.genericError');

    return (
      <ScreenContainer testID="c21-review-screen">
        <StateView
          state="X"
          locale={locale}
          message={errorMsg}
          nextStepLabel={translate(locale, 'common.action.back')}
          onNextStep={() => navigate(returnTo)}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer testID="c21-review-screen" title={translate(locale, 'customer.c21.title')}>
      <View style={styles.content}>
        {/* Provider Context Card */}
        <View style={styles.providerCard}>
          <Text
            style={[
              styles.providerLabel,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {providerName}
          </Text>
          <Text
            style={[
              styles.questionText,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c21.question')}
          </Text>
        </View>

        {/* 1–5 Star Rating (REV-001) */}
        <View style={[styles.starsRow, { flexDirection: mirror.row }]} testID="c21-stars-container">
          {[1, 2, 3, 4, 5].map((starIndex) => {
            const isFilled = starIndex <= rating;
            return (
              <TouchableOpacity
                key={starIndex}
                testID={`c21-star-${starIndex}`}
                onPress={() => handleStarPress(starIndex)}
                style={[styles.starBtn, minTapTargetStyle()]}
                accessibilityRole="button"
                accessibilityLabel={translate(locale, 'customer.c21.starLabel', {
                  n: starIndex.toString(),
                })}
              >
                <Text style={[styles.starIcon, isFilled && styles.starFilled]}>
                  {isFilled ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Empty state hint: No rating selected */}
        {rating === 0 ? (
          <Text
            testID="c21-rating-hint"
            style={[styles.ratingHint, textTokens(locale, 'label'), { textAlign: 'center' }]}
          >
            {translate(locale, 'customer.c21.noRatingError')}
          </Text>
        ) : null}

        {/* Structured Tags (REV-001) */}
        <View style={styles.tagsSection}>
          <Text
            style={[
              styles.tagsHeader,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c21.tagsHeader')}
          </Text>
          <View style={[styles.tagsContainer, { flexDirection: mirror.row }]}>
            {TAG_OPTIONS.map((tag) => {
              const isSelected = selectedTags.includes(tag.key);
              return (
                <TouchableOpacity
                  key={tag.key}
                  testID={`c21-tag-${tag.key}`}
                  onPress={() => toggleTag(tag.key)}
                  style={[
                    styles.tagChip,
                    isSelected && styles.tagChipSelected,
                    minTapTargetStyle(),
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={translate(locale, tag.labelKey)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      isSelected && styles.tagTextSelected,
                      textTokens(locale, 'label'),
                    ]}
                  >
                    {translate(locale, tag.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Optional Written Review (REV-002) */}
        <View style={styles.textSection}>
          <TextInput
            testID="c21-text-input"
            value={reviewText}
            onChangeText={setReviewText}
            placeholder={translate(locale, 'customer.c21.textPlaceholder')}
            placeholderTextColor={COLOR.neutral400}
            multiline
            numberOfLines={4}
            maxLength={1000}
            style={[styles.textInput, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          />
        </View>

        {/* Submit Action */}
        <UiButton
          testID="c21-submit-btn"
          title={translate(locale, 'customer.c21.submitBtn')}
          onPress={handleSubmit}
          locale={locale}
          disabled={rating === 0}
          variant="primary"
          style={styles.submitBtn}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
  },
  providerCard: {
    backgroundColor: COLOR.neutral50,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLOR.neutral200,
  },
  providerLabel: {
    color: COLOR.neutral900,
    marginBottom: SPACING.xs,
  },
  questionText: {
    color: COLOR.neutral700,
  },
  starsRow: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SPACING.md,
    gap: SPACING.sm,
  },
  starBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xs,
  },
  starIcon: {
    fontSize: 38,
    color: COLOR.neutral300,
  },
  starFilled: {
    color: '#F59E0B', // Golden amber star
  },
  ratingHint: {
    color: COLOR.neutral500,
    marginBottom: SPACING.md,
  },
  tagsSection: {
    marginVertical: SPACING.md,
  },
  tagsHeader: {
    color: COLOR.neutral800,
    marginBottom: SPACING.sm,
  },
  tagsContainer: {
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tagChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLOR.neutral300,
    backgroundColor: COLOR.neutral0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagChipSelected: {
    backgroundColor: COLOR.primary50,
    borderColor: COLOR.primary600,
  },
  tagText: {
    color: COLOR.neutral700,
  },
  tagTextSelected: {
    color: COLOR.primary700,
    fontWeight: '600',
  },
  textSection: {
    marginVertical: SPACING.md,
  },
  textInput: {
    backgroundColor: COLOR.neutral0,
    borderWidth: 1,
    borderColor: COLOR.neutral300,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 100,
    textAlignVertical: 'top',
    color: COLOR.neutral900,
  },
  submitBtn: {
    marginTop: SPACING.lg,
  },
});

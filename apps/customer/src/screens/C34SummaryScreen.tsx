/**
 * C34 Request Summary Confirmation Screen (BP §56.1 step 85, §67, §79 steps 105–106; ARCH §3.1).
 * AI interpretation visible and editable; explicit customer submit action ("Find providers").
 * Requirement IDs: REQ-AI-005, REQ-AI-006, REQ-AI-011, PERF-002, PERF-003, VOICE-007, REL-003.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import {
  COLOR,
  interactiveProps,
  minTapTargetStyle,
  RADIUS,
  SPACING,
  STATUS_THEME,
  textTokens,
} from '@kaamkaro/ui';
import { ScreenContainer } from '../components/ScreenContainer';
import { MOCK_SERVICES } from '../data/mock-data';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';

export function C34SummaryScreen(): React.JSX.Element {
  const { locale, draft, updateDraft, navigate, user, isGuest } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [summaryText, setSummaryText] = useState(draft.aiSummary || draft.description);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const matchedService =
    MOCK_SERVICES.find((s) => s.id === draft.serviceId) ||
    MOCK_SERVICES.find((s) => s.id === draft.aiInterpretedServiceId) ||
    MOCK_SERVICES[0];

  const serviceName = matchedService
    ? locale === 'ur'
      ? matchedService.titleUr
      : matchedService.titleEn
    : '';

  const handleSummaryChange = (txt: string) => {
    setSummaryText(txt);
    updateDraft({ aiSummary: txt });
  };

  const handleFindProviders = () => {
    // Check required fields: Location confirmed, Time choice, and Summary non-empty
    if (!draft.location?.isConfirmed) {
      setSubmitError(translate(locale, 'customer.c34.missingLocation'));
      return;
    }

    if (!summaryText.trim()) {
      setSubmitError(translate(locale, 'customer.c12.emptyError'));
      return;
    }

    // BP §8.1 / UX-SCREEN-005: Guest must log in before request submission
    if (isGuest && !user) {
      navigate('C03', { returnTo: 'C34' });
      return;
    }

    // REQ-AI-005: Explicit customer submit -> transitions to Matching
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      // If provider was already chosen, go to C14 Booking Review, else C35 Match Results
      if (draft.providerId) {
        navigate('C14', { providerId: draft.providerId });
      } else {
        navigate('C35', { serviceId: draft.serviceId });
      }
    }, 400);
  };

  const timeLabelKey =
    draft.when === 'NOW'
      ? 'customer.c12.whenNow'
      : draft.when === 'TODAY'
        ? 'customer.c12.whenToday'
        : 'customer.c12.whenLater';

  const isFindDisabled = !draft.location?.isConfirmed || isSubmitting;

  return (
    <ScreenContainer testID="c34-summary-screen" title={translate(locale, 'customer.c34.title')}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Service Card */}
        <View style={styles.card} testID="c34-service-card">
          <View style={[styles.cardHeaderRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.cardLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign, flex: 1 },
              ]}
            >
              {translate(locale, 'customer.c34.likelyServiceHeader')}
            </Text>
            <TouchableOpacity
              onPress={() => navigate('C12')}
              style={minTapTargetStyle()}
              {...interactiveProps({
                testID: 'c34-change-service-btn',
                accessibilityLabel: translate(locale, 'customer.c31.changeService'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.changeLink, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c31.changeService')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text
            testID="c34-service-title"
            style={[styles.cardValue, textTokens(locale, 'title'), { textAlign: mirror.textAlign }]}
          >
            {serviceName}
          </Text>
        </View>

        {/* AI Interpretation / Problem Summary */}
        <View style={styles.card} testID="c34-summary-card">
          <View style={[styles.cardHeaderRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.cardLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign, flex: 1 },
              ]}
            >
              {translate(locale, 'customer.c34.summaryHeader')}
            </Text>
          </View>
          <TextInput
            testID="c34-summary-text-input"
            value={summaryText}
            onChangeText={handleSummaryChange}
            multiline={true}
            style={[
              styles.summaryInput,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          />
        </View>

        {/* Location Snapshot Card */}
        <View style={styles.card} testID="c34-location-card">
          <View style={[styles.cardHeaderRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.cardLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign, flex: 1 },
              ]}
            >
              {translate(locale, 'customer.c34.locationHeader')}
            </Text>
            <TouchableOpacity
              onPress={() => navigate('C39', { returnTo: 'C34' })}
              style={minTapTargetStyle()}
              {...interactiveProps({
                testID: 'c34-change-location-btn',
                accessibilityLabel: translate(locale, 'customer.c31.changeService'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.changeLink, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c31.changeService')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text
            testID="c34-location-address"
            style={[styles.cardValue, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {draft.location?.isConfirmed
              ? draft.location.address
              : translate(locale, 'customer.c34.missingLocation')}
          </Text>
        </View>

        {/* When Card */}
        <View style={styles.card} testID="c34-when-card">
          <View style={[styles.cardHeaderRow, { flexDirection: mirror.row }]}>
            <Text
              style={[
                styles.cardLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign, flex: 1 },
              ]}
            >
              {translate(locale, 'customer.c34.timeHeader')}
            </Text>
            <TouchableOpacity
              onPress={() => navigate('C12')}
              style={minTapTargetStyle()}
              {...interactiveProps({
                testID: 'c34-change-when-btn',
                accessibilityLabel: translate(locale, 'customer.c31.changeService'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.changeLink, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c31.changeService')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text
            testID="c34-when-value"
            style={[styles.cardValue, textTokens(locale, 'body'), { textAlign: mirror.textAlign }]}
          >
            {translate(locale, timeLabelKey)}
          </Text>
        </View>

        {/* Attachments Section */}
        {draft.photos.length > 0 || draft.audioNote || draft.video ? (
          <View style={styles.card} testID="c34-attachments-card">
            <Text
              style={[
                styles.cardLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c34.attachmentsHeader')}
            </Text>
            <View style={styles.attachmentsList}>
              {draft.photos.map((p) => (
                <View
                  key={p.id}
                  testID={`c34-photo-${p.id}`}
                  style={[styles.attachmentItem, { flexDirection: mirror.row }]}
                >
                  <Text>🖼️</Text>
                  <Text style={[styles.attachmentName, textTokens(locale, 'label')]}>{p.name}</Text>
                </View>
              ))}

              {draft.audioNote ? (
                <View
                  testID="c34-audio-note"
                  style={[styles.attachmentItem, { flexDirection: mirror.row }]}
                >
                  <Text>🎙️</Text>
                  <Text style={[styles.attachmentName, textTokens(locale, 'label')]}>
                    {translate(locale, 'customer.media.duration', {
                      title: translate(locale, 'customer.c32.title'),
                      seconds: draft.audioNote.durationSeconds,
                    })}
                  </Text>
                </View>
              ) : null}

              {draft.video ? (
                <View
                  testID="c34-video"
                  style={[styles.attachmentItem, { flexDirection: mirror.row }]}
                >
                  <Text>🎬</Text>
                  <Text style={[styles.attachmentName, textTokens(locale, 'label')]}>
                    {translate(locale, 'customer.media.duration', {
                      title: translate(locale, 'customer.c33.title'),
                      seconds: draft.video.durationSeconds,
                    })}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Submitting Progress Indicator */}
        {isSubmitting ? (
          <View testID="c34-submitting-indicator" style={styles.submittingNotice}>
            <Text style={[styles.submittingText, textTokens(locale, 'body')]}>
              {translate(locale, 'customer.c34.submitting')}
            </Text>
          </View>
        ) : null}

        {/* Error Notice */}
        {submitError ? (
          <View testID="c34-error-notice" style={styles.errorNotice}>
            <Text
              style={[
                styles.errorText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {submitError}
            </Text>
          </View>
        ) : null}

        {/* Find Providers Primary CTA */}
        <TouchableOpacity
          onPress={handleFindProviders}
          disabled={isFindDisabled}
          style={[styles.findBtn, minTapTargetStyle(), isFindDisabled && styles.disabledBtn]}
          {...interactiveProps({
            testID: 'c34-find-providers-btn',
            accessibilityLabel: translate(locale, 'customer.c34.findProviders'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.findBtnText, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c34.findProviders')}
          </Text>
        </TouchableOpacity>

        {/* Fallback to simple form */}
        <TouchableOpacity
          onPress={() => navigate('C12')}
          style={[styles.simpleFormLink, minTapTargetStyle()]}
          {...interactiveProps({
            testID: 'c34-fallback-simple-form-btn',
            accessibilityLabel: translate(locale, 'customer.c31.simpleForm'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.simpleFormLinkText, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c31.simpleForm')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  cardHeaderRow: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardLabel: {
    color: COLOR.textMuted,
  },
  changeLink: {
    color: COLOR.primary,
    textDecorationLine: 'underline',
  },
  cardValue: {
    color: COLOR.text,
  },
  summaryInput: {
    color: COLOR.text,
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    minHeight: 70,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  attachmentsList: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  attachmentItem: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  attachmentName: {
    color: COLOR.text,
  },
  submittingNotice: {
    padding: SPACING.md,
    alignItems: 'center',
    backgroundColor: STATUS_THEME.info.background,
    borderRadius: RADIUS.sm,
  },
  submittingText: {
    color: STATUS_THEME.info.text,
    fontStyle: 'italic',
  },
  errorNotice: {
    padding: SPACING.md,
    backgroundColor: STATUS_THEME.warning.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: STATUS_THEME.warning.border,
  },
  errorText: {
    color: STATUS_THEME.warning.text,
  },
  findBtn: {
    backgroundColor: COLOR.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  findBtnText: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
  },
  simpleFormLink: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  simpleFormLinkText: {
    color: COLOR.textMuted,
    textDecorationLine: 'underline',
  },
});

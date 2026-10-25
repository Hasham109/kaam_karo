/**
 * C31 "What do you need?" Conversational Request Composer Screen (BP §56.1, §79, §85; ARCH §3.1).
 * Supports talk, type, photo, video mix; AI interpretation; non-AI fallback to C12.
 * Requirement IDs: REQ-AI-001..004, REQ-AI-006, REQ-AI-011, REQ-AI-012, MEDIA-003, PERM-002, PERM-003.
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
import type { AttachedPhoto, ScreenParams, WhenTimeChoice } from '../types';

export function C31ComposerScreen(): React.JSX.Element {
  const { locale, draft, updateDraft, navigate, user, isGuest, screenParams } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const c31Params = screenParams as ScreenParams['C31'];
  const [composerText, setComposerText] = useState(c31Params?.initialText || draft.description);
  const [isInterpreting, setIsInterpreting] = useState(false);

  // Interpret service from text or default
  const likelyService =
    MOCK_SERVICES.find((s) => s.id === draft.serviceId) ||
    MOCK_SERVICES.find((s) => s.id === draft.aiInterpretedServiceId) ||
    MOCK_SERVICES[0];

  const handleTextChange = (text: string) => {
    setComposerText(text);
    updateDraft({ description: text });

    if (text.trim().length > 3 && !isInterpreting) {
      setIsInterpreting(true);
      setTimeout(() => {
        setIsInterpreting(false);
        // Simulate AI service inference
        const matched =
          MOCK_SERVICES.find(
            (svc) =>
              svc.titleEn.toLowerCase().includes('ac') ||
              text.toLowerCase().includes('ac') ||
              text.toLowerCase().includes('cool') ||
              text.includes('ایئر کنڈیشنر'),
          ) || MOCK_SERVICES[0];

        updateDraft({
          aiInterpretedServiceId: matched?.id,
          serviceId: draft.serviceId || matched?.id,
          aiSummary: text.trim(),
        });
      }, 300);
    }
  };

  const handleWhenChange = (when: WhenTimeChoice) => {
    updateDraft({ when });
  };

  const handleAddSamplePhoto = () => {
    const photo: AttachedPhoto = {
      id: `photo-${Date.now()}`,
      uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
      name: `issue_${draft.photos.length + 1}.jpg`,
      sizeBytes: 150000,
    };
    updateDraft({ photos: [...draft.photos, photo] });
  };

  const handleRemovePhoto = (id: string) => {
    updateDraft({ photos: draft.photos.filter((p) => p.id !== id) });
  };

  const hasAnyInput =
    composerText.trim().length > 0 ||
    draft.photos.length > 0 ||
    draft.audioNote !== null ||
    draft.video !== null;

  const handleNext = () => {
    if (!hasAnyInput) return;

    // Check if location confirmed
    if (!draft.location?.isConfirmed) {
      navigate('C39', { returnTo: 'C31' });
      return;
    }

    // Guest prompt if needed
    if (isGuest && !user) {
      navigate('C03', { returnTo: 'C34' });
      return;
    }

    navigate('C34');
  };

  const handleFallbackSimpleForm = () => {
    // REQ-AI-012: Navigates to C12 preserving all entered data
    updateDraft({
      description: composerText,
      serviceId: draft.serviceId || likelyService?.id,
    });
    navigate('C12');
  };

  const likelyServiceName = likelyService
    ? locale === 'ur'
      ? likelyService.titleUr
      : likelyService.titleEn
    : '';

  const timeLabelKey =
    draft.when === 'NOW'
      ? 'customer.c12.whenNow'
      : draft.when === 'TODAY'
        ? 'customer.c12.whenToday'
        : 'customer.c12.whenLater';

  const whenLabel = translate(locale, 'customer.c31.whenChip', {
    time: translate(locale, timeLabelKey),
  });

  const locationLabel = translate(locale, 'customer.c31.whereChip', {
    location: draft.location?.address ?? '',
  });

  return (
    <ScreenContainer testID="c31-composer-screen" title={translate(locale, 'customer.c31.title')}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main Prompt */}
        <View style={styles.promptCard} testID="c31-prompt-card">
          <Text
            style={[
              styles.promptText,
              textTokens(locale, 'title'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c31.prompt')}
          </Text>
        </View>

        {/* Text Input Area */}
        <View style={styles.inputCard} testID="c31-input-card">
          <TextInput
            testID="c31-text-input"
            value={composerText}
            onChangeText={handleTextChange}
            placeholder={translate(locale, 'customer.c31.typePlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            multiline={true}
            style={[
              styles.multilineInput,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          />

          {/* Privacy Hint (SEC-REVIEW #13) */}
          <Text
            testID="c31-privacy-hint"
            style={[
              styles.privacyHint,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c12.privacyHint')}
          </Text>
        </View>

        {/* Multimodal Action Buttons Row */}
        <View style={[styles.actionsRow, { flexDirection: mirror.row }]}>
          <TouchableOpacity
            onPress={() => navigate('C32', { returnTo: 'C31' })}
            style={[styles.mediaActionBtn, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c31-audio-note-btn',
              accessibilityLabel: translate(locale, 'customer.c31.recordAudio'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={styles.mediaIcon}>🎙️</Text>
            <Text style={[styles.mediaLabel, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c31.recordAudio')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleAddSamplePhoto}
            style={[styles.mediaActionBtn, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c31-photo-btn',
              accessibilityLabel: translate(locale, 'customer.c31.takePhoto'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={styles.mediaIcon}>📷</Text>
            <Text style={[styles.mediaLabel, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c31.takePhoto')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigate('C33', { returnTo: 'C31' })}
            style={[styles.mediaActionBtn, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c31-video-btn',
              accessibilityLabel: translate(locale, 'customer.c31.recordVideo'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={styles.mediaIcon}>📹</Text>
            <Text style={[styles.mediaLabel, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c31.recordVideo')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Attached Items Preview */}
        {draft.photos.length > 0 || draft.audioNote || draft.video ? (
          <View style={styles.attachmentsSection} testID="c31-attachments-preview">
            {draft.photos.map((p) => (
              <View
                key={p.id}
                testID={`c31-photo-item-${p.id}`}
                style={[styles.attachmentItem, { flexDirection: mirror.row }]}
              >
                <Text>🖼️</Text>
                <Text style={[styles.attachmentText, textTokens(locale, 'label')]}>{p.name}</Text>
                <TouchableOpacity
                  onPress={() => handleRemovePhoto(p.id)}
                  style={styles.removeBtn}
                  {...interactiveProps({
                    testID: `c31-remove-photo-${p.id}`,
                    accessibilityLabel: translate(locale, 'customer.c31.removeAttachment'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {draft.audioNote ? (
              <View
                testID="c31-audio-item"
                style={[styles.attachmentItem, { flexDirection: mirror.row }]}
              >
                <Text>🎙️</Text>
                <Text style={[styles.attachmentText, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.media.duration', {
                    title: translate(locale, 'customer.c32.title'),
                    seconds: draft.audioNote.durationSeconds,
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => updateDraft({ audioNote: null })}
                  style={styles.removeBtn}
                  {...interactiveProps({
                    testID: 'c31-remove-audio',
                    accessibilityLabel: translate(locale, 'customer.c31.removeAttachment'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {draft.video ? (
              <View
                testID="c31-video-item"
                style={[styles.attachmentItem, { flexDirection: mirror.row }]}
              >
                <Text>🎬</Text>
                <Text style={[styles.attachmentText, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.media.duration', {
                    title: translate(locale, 'customer.c33.title'),
                    seconds: draft.video.durationSeconds,
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => updateDraft({ video: null })}
                  style={styles.removeBtn}
                  {...interactiveProps({
                    testID: 'c31-remove-video',
                    accessibilityLabel: translate(locale, 'customer.c31.removeAttachment'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* AI Interpretation Preview Card */}
        {isInterpreting ? (
          <View testID="c31-interpreting-indicator" style={styles.interpretingCard}>
            <Text
              style={[
                styles.interpretingText,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c31.interpreting')}
            </Text>
          </View>
        ) : hasAnyInput ? (
          <View testID="c31-ai-reply-area" style={styles.aiReplyCard}>
            <View style={[styles.aiHeaderRow, { flexDirection: mirror.row }]}>
              <Text
                testID="c31-likely-service-text"
                style={[
                  styles.aiServiceName,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign, flex: 1 },
                ]}
              >
                {translate(locale, 'customer.c31.likelyService', {
                  service: likelyServiceName,
                })}
              </Text>
              <TouchableOpacity
                onPress={() => navigate('C12')}
                style={minTapTargetStyle()}
                {...interactiveProps({
                  testID: 'c31-change-service-btn',
                  accessibilityLabel: translate(locale, 'customer.c31.changeService'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.changeServiceText, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.c31.changeService')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Time Chips Row */}
        <View style={styles.chipsSection} testID="c31-when-chips">
          <Text
            style={[
              styles.chipsLabel,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {whenLabel}
          </Text>
          <View style={[styles.chipsRow, { flexDirection: mirror.row }]}>
            {(['NOW', 'TODAY', 'LATER'] as const).map((choice) => {
              const isSelected = draft.when === choice;
              const labelKey =
                choice === 'NOW'
                  ? 'customer.c12.whenNow'
                  : choice === 'TODAY'
                    ? 'customer.c12.whenToday'
                    : 'customer.c12.whenLater';

              return (
                <TouchableOpacity
                  key={choice}
                  onPress={() => handleWhenChange(choice)}
                  style={[
                    styles.chipBtn,
                    minTapTargetStyle(),
                    isSelected && styles.chipBtnSelected,
                  ]}
                  {...interactiveProps({
                    testID: `c31-when-${choice.toLowerCase()}`,
                    accessibilityLabel: translate(locale, labelKey),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text
                    style={[
                      styles.chipBtnText,
                      isSelected && styles.chipBtnTextSelected,
                      textTokens(locale, 'label'),
                    ]}
                  >
                    {translate(locale, labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Location Chip */}
        <View style={styles.chipsSection} testID="c31-location-chip-section">
          <Text
            style={[
              styles.chipsLabel,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {locationLabel}
          </Text>
          <TouchableOpacity
            onPress={() => navigate('C39', { returnTo: 'C31' })}
            style={[styles.locationChipBtn, minTapTargetStyle(), { flexDirection: mirror.row }]}
            {...interactiveProps({
              testID: 'c31-location-btn',
              accessibilityLabel: locationLabel,
              accessibilityRole: 'button',
            })}
          >
            <Text style={styles.locationIcon}>📍</Text>
            <Text
              testID="c31-location-text"
              style={[
                styles.locationChipText,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign, flex: 1 },
              ]}
            >
              {draft.location?.isConfirmed
                ? draft.location.address
                : translate(locale, 'customer.c12.locationRequired')}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Next / Submit Button */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={!hasAnyInput}
          style={[styles.nextBtn, minTapTargetStyle(), !hasAnyInput && styles.disabledBtn]}
          {...interactiveProps({
            testID: 'c31-next-btn',
            accessibilityLabel: translate(locale, 'customer.c31.next'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.nextBtnText, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c31.next')}
          </Text>
        </TouchableOpacity>

        {/* Fallback Link to Simple Form C12 */}
        <TouchableOpacity
          onPress={handleFallbackSimpleForm}
          style={[styles.simpleFormLink, minTapTargetStyle()]}
          {...interactiveProps({
            testID: 'c31-fallback-simple-form-btn',
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
  promptCard: {
    paddingVertical: SPACING.xs,
  },
  promptText: {
    color: COLOR.text,
  },
  inputCard: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  multilineInput: {
    color: COLOR.text,
    minHeight: 110,
    padding: SPACING.xs,
  },
  privacyHint: {
    color: COLOR.textMuted,
  },
  actionsRow: {
    gap: SPACING.sm,
  },
  mediaActionBtn: {
    flex: 1,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  mediaIcon: {
    fontSize: 22,
  },
  mediaLabel: {
    color: COLOR.text,
  },
  attachmentsSection: {
    gap: SPACING.xs,
  },
  attachmentItem: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
    gap: SPACING.sm,
  },
  attachmentText: {
    flex: 1,
    color: COLOR.text,
  },
  removeBtn: {
    padding: SPACING.xs,
  },
  removeBtnText: {
    color: COLOR.textMuted,
    fontWeight: 'bold',
  },
  interpretingCard: {
    padding: SPACING.md,
    backgroundColor: STATUS_THEME.info.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: STATUS_THEME.info.border,
    alignItems: 'center',
  },
  interpretingText: {
    color: STATUS_THEME.info.text,
    fontStyle: 'italic',
  },
  aiReplyCard: {
    padding: SPACING.md,
    backgroundColor: STATUS_THEME.info.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: STATUS_THEME.info.border,
  },
  aiHeaderRow: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  aiServiceName: {
    color: STATUS_THEME.info.text,
    fontWeight: 'bold',
  },
  changeServiceText: {
    color: COLOR.primary,
    textDecorationLine: 'underline',
  },
  chipsSection: {
    gap: SPACING.xs,
  },
  chipsLabel: {
    color: COLOR.text,
  },
  chipsRow: {
    gap: SPACING.sm,
  },
  chipBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBtnSelected: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  chipBtnText: {
    color: COLOR.text,
  },
  chipBtnTextSelected: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
  },
  locationChipBtn: {
    padding: SPACING.md,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationIcon: {
    fontSize: 18,
  },
  locationChipText: {
    color: COLOR.text,
  },
  chevron: {
    fontSize: 20,
    color: COLOR.textMuted,
  },
  nextBtn: {
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
  nextBtnText: {
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

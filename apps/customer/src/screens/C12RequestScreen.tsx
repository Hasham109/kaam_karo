/**
 * C12 Request / Booking Screen (Simple Form) (BP §12, §62.1, §67; REQ-AI-006, REQ-AI-012).
 * Non-AI structured normal form and direct booking entry point.
 * Requirement IDs: REQ-AI-006, REQ-AI-012, PERF-002, PROF-ADDR-002, LOC-GEO-003, MEDIA-003, UX-SCREEN-005.
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
import { MOCK_SERVICES, MOCK_PROVIDERS } from '../data/mock-data';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';
import type { AttachedPhoto, ScreenParams, WhenTimeChoice } from '../types';

export function C12RequestScreen(): React.JSX.Element {
  const { locale, draft, updateDraft, navigate, user, isGuest, screenParams } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const c12Params = screenParams as ScreenParams['C12'];
  const initialServiceId = c12Params?.serviceId || draft.serviceId || MOCK_SERVICES[0]?.id;
  const initialProviderId = c12Params?.providerId || draft.providerId;

  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(initialServiceId);
  const [descriptionText, setDescriptionText] = useState(draft.description);
  const [whenChoice, setWhenChoice] = useState<WhenTimeChoice>(draft.when || 'TODAY');
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeServices = MOCK_SERVICES;
  const currentProvider = initialProviderId
    ? MOCK_PROVIDERS.find((p) => p.id === initialProviderId)
    : null;

  const handleTextChange = (text: string) => {
    setDescriptionText(text);
    updateDraft({ description: text });
    if (validationError) setValidationError(null);
  };

  const handleWhenChange = (choice: WhenTimeChoice) => {
    setWhenChoice(choice);
    updateDraft({ when: choice });
  };

  const handleAddSamplePhoto = () => {
    const newPhoto: AttachedPhoto = {
      id: `photo-${Date.now()}`,
      uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
      name: `issue_photo_${draft.photos.length + 1}.jpg`,
      sizeBytes: 150000,
    };
    updateDraft({ photos: [...draft.photos, newPhoto] });
  };

  const handleRemovePhoto = (photoId: string) => {
    updateDraft({ photos: draft.photos.filter((p) => p.id !== photoId) });
  };

  const handleRemoveAudio = () => {
    updateDraft({ audioNote: null });
  };

  const handleRemoveVideo = () => {
    updateDraft({ video: null });
  };

  const hasAnyProblemInput =
    descriptionText.trim().length > 0 ||
    draft.photos.length > 0 ||
    draft.audioNote !== null ||
    draft.video !== null;

  const hasConfirmedLocation = Boolean(draft.location?.isConfirmed);

  const handleContinue = () => {
    if (!hasConfirmedLocation) {
      setValidationError(translate(locale, 'customer.c12.locationRequired'));
      return;
    }

    if (!hasAnyProblemInput) {
      setValidationError(translate(locale, 'customer.c12.emptyError'));
      return;
    }

    // Save draft state
    updateDraft({
      serviceId: selectedServiceId,
      providerId: initialProviderId,
      description: descriptionText,
      when: whenChoice,
    });

    // BP §8.1 / UX-SCREEN-005: Guest must login before submit, draft is kept safely
    if (isGuest && !user) {
      navigate('C03', { returnTo: 'C12' });
      return;
    }

    navigate('C34');
  };

  return (
    <ScreenContainer testID="c12-request-screen" title={translate(locale, 'customer.c12.title')}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Service Picker / Preset Display */}
        <View style={styles.section} testID="c12-service-section">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c12.serviceLabel')}
          </Text>

          <View style={styles.serviceChipsRow}>
            {activeServices.slice(0, 4).map((svc) => {
              const isSelected = svc.id === selectedServiceId;
              const svcTitle = locale === 'ur' ? svc.titleUr : svc.titleEn;
              return (
                <TouchableOpacity
                  key={svc.id}
                  onPress={() => {
                    setSelectedServiceId(svc.id);
                    updateDraft({ serviceId: svc.id });
                  }}
                  style={[
                    styles.serviceChip,
                    minTapTargetStyle(),
                    isSelected && styles.serviceChipSelected,
                  ]}
                  {...interactiveProps({
                    testID: `c12-service-chip-${svc.id}`,
                    accessibilityLabel: svcTitle,
                    accessibilityRole: 'button',
                  })}
                >
                  <Text
                    style={[
                      styles.serviceChipText,
                      isSelected && styles.serviceChipTextSelected,
                      textTokens(locale, 'label'),
                    ]}
                  >
                    {svcTitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Provider Preset Banner (if booked directly from C11) */}
        {currentProvider ? (
          <View style={styles.providerBanner} testID="c12-provider-preset-banner">
            <Text
              style={[
                styles.providerBannerText,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c12.providerLabel', {
                name: currentProvider.name,
              })}
            </Text>
          </View>
        ) : null}

        {/* Location Section (Taps to C39) */}
        <View style={styles.section} testID="c12-location-section">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c12.locationLabel')}
          </Text>

          <TouchableOpacity
            onPress={() => navigate('C39', { returnTo: 'C12' })}
            style={[styles.locationCard, minTapTargetStyle(), { flexDirection: mirror.row }]}
            {...interactiveProps({
              testID: 'c12-location-tap-btn',
              accessibilityLabel: translate(locale, 'customer.c12.locationLabel'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={styles.locationIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              {draft.location?.isConfirmed ? (
                <Text
                  testID="c12-confirmed-address-text"
                  style={[
                    styles.addressText,
                    textTokens(locale, 'body'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {draft.location.address}
                </Text>
              ) : (
                <Text
                  testID="c12-tap-to-choose-location"
                  style={[
                    styles.locationPlaceholder,
                    textTokens(locale, 'body'),
                    { textAlign: mirror.textAlign },
                  ]}
                >
                  {translate(locale, 'customer.c12.locationRequired')}
                </Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* When Section */}
        <View style={styles.section} testID="c12-when-section">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c12.whenLabel')}
          </Text>

          <View style={[styles.whenRow, { flexDirection: mirror.row }]}>
            {(['NOW', 'TODAY', 'LATER'] as const).map((choice) => {
              const isSelected = whenChoice === choice;
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
                    styles.whenBtn,
                    minTapTargetStyle(),
                    isSelected && styles.whenBtnSelected,
                  ]}
                  {...interactiveProps({
                    testID: `c12-when-${choice.toLowerCase()}`,
                    accessibilityLabel: translate(locale, labelKey),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text
                    style={[
                      styles.whenBtnText,
                      isSelected && styles.whenBtnTextSelected,
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

        {/* Problem Description */}
        <View style={styles.section} testID="c12-description-section">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c12.descLabel')}
          </Text>

          <TextInput
            testID="c12-description-input"
            value={descriptionText}
            onChangeText={handleTextChange}
            placeholder={translate(locale, 'customer.c12.descPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            multiline={true}
            style={[
              styles.multilineInput,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          />

          {/* Privacy Hint */}
          <Text
            style={[
              styles.privacyHint,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c12.privacyHint')}
          </Text>
        </View>

        {/* Media Attachments Section */}
        <View style={styles.section} testID="c12-attachments-section">
          <Text
            style={[
              styles.sectionTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c12.attachmentsHeader')}
          </Text>

          {/* Action Buttons to Add Media */}
          <View style={[styles.mediaButtonRow, { flexDirection: mirror.row }]}>
            <TouchableOpacity
              onPress={handleAddSamplePhoto}
              style={[styles.mediaActionBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'c12-add-photo-btn',
                accessibilityLabel: translate(locale, 'customer.c12.addPhoto'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={styles.mediaActionIcon}>📷</Text>
              <Text style={[styles.mediaActionLabel, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c12.addPhoto')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigate('C32', { returnTo: 'C12' })}
              style={[styles.mediaActionBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'c12-voice-note-btn',
                accessibilityLabel: translate(locale, 'customer.c12.addAudio'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={styles.mediaActionIcon}>🎙️</Text>
              <Text style={[styles.mediaActionLabel, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c12.addAudio')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigate('C33', { returnTo: 'C12' })}
              style={[styles.mediaActionBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'c12-video-btn',
                accessibilityLabel: translate(locale, 'customer.c12.addVideo'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={styles.mediaActionIcon}>📹</Text>
              <Text style={[styles.mediaActionLabel, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c12.addVideo')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Attached Items Preview */}
          <View style={styles.attachedList} testID="c12-attached-list">
            {draft.photos.map((photo) => (
              <View
                key={photo.id}
                testID={`c12-attached-photo-${photo.id}`}
                style={[styles.attachedItemCard, { flexDirection: mirror.row }]}
              >
                <Text style={styles.attachedIcon}>🖼️</Text>
                <Text style={[styles.attachedName, textTokens(locale, 'label')]}>
                  {photo.name || 'Photo'}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemovePhoto(photo.id)}
                  style={[styles.removeBtn, minTapTargetStyle()]}
                  {...interactiveProps({
                    testID: `c12-remove-photo-${photo.id}`,
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
                testID="c12-attached-audio"
                style={[styles.attachedItemCard, { flexDirection: mirror.row }]}
              >
                <Text style={styles.attachedIcon}>🎙️</Text>
                <Text style={[styles.attachedName, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.media.duration', {
                    title: translate(locale, 'customer.c32.title'),
                    seconds: draft.audioNote.durationSeconds,
                  })}
                </Text>
                <TouchableOpacity
                  onPress={handleRemoveAudio}
                  style={[styles.removeBtn, minTapTargetStyle()]}
                  {...interactiveProps({
                    testID: 'c12-remove-audio',
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
                testID="c12-attached-video"
                style={[styles.attachedItemCard, { flexDirection: mirror.row }]}
              >
                <Text style={styles.attachedIcon}>🎬</Text>
                <Text style={[styles.attachedName, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.media.duration', {
                    title: translate(locale, 'customer.c33.title'),
                    seconds: draft.video.durationSeconds,
                  })}
                </Text>
                <TouchableOpacity
                  onPress={handleRemoveVideo}
                  style={[styles.removeBtn, minTapTargetStyle()]}
                  {...interactiveProps({
                    testID: 'c12-remove-video',
                    accessibilityLabel: translate(locale, 'customer.c31.removeAttachment'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* Validation Error Message */}
        {validationError ? (
          <View testID="c12-validation-error" style={styles.errorBanner}>
            <Text
              style={[
                styles.errorText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {validationError}
            </Text>
          </View>
        ) : null}

        {/* Continue Action Button */}
        <TouchableOpacity
          onPress={handleContinue}
          style={[styles.continueBtn, minTapTargetStyle()]}
          {...interactiveProps({
            testID: 'c12-continue-btn',
            accessibilityLabel: translate(locale, 'customer.c12.continue'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.continueBtnText, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c12.continue')}
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
  section: {
    gap: SPACING.xs,
  },
  sectionTitle: {
    color: COLOR.text,
  },
  serviceChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  serviceChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sheet,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  serviceChipSelected: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  serviceChipText: {
    color: COLOR.text,
  },
  serviceChipTextSelected: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
  },
  providerBanner: {
    padding: SPACING.md,
    backgroundColor: STATUS_THEME.info.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: STATUS_THEME.info.border,
  },
  providerBannerText: {
    color: STATUS_THEME.info.text,
    fontWeight: 'bold',
  },
  locationCard: {
    padding: SPACING.md,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationIcon: {
    fontSize: 20,
  },
  addressText: {
    color: COLOR.text,
    fontWeight: '500',
  },
  locationPlaceholder: {
    color: COLOR.textMuted,
  },
  chevron: {
    fontSize: 20,
    color: COLOR.textMuted,
  },
  whenRow: {
    gap: SPACING.sm,
  },
  whenBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whenBtnSelected: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  whenBtnText: {
    color: COLOR.text,
  },
  whenBtnTextSelected: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
  },
  multilineInput: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLOR.text,
    minHeight: 90,
  },
  privacyHint: {
    color: COLOR.textMuted,
  },
  mediaButtonRow: {
    gap: SPACING.sm,
  },
  mediaActionBtn: {
    flex: 1,
    backgroundColor: COLOR.surface,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  mediaActionIcon: {
    fontSize: 20,
  },
  mediaActionLabel: {
    color: COLOR.text,
  },
  attachedList: {
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  attachedItemCard: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
    gap: SPACING.sm,
  },
  attachedIcon: {
    fontSize: 16,
  },
  attachedName: {
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
  errorBanner: {
    padding: SPACING.md,
    backgroundColor: STATUS_THEME.warning.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: STATUS_THEME.warning.border,
  },
  errorText: {
    color: STATUS_THEME.warning.text,
  },
  continueBtn: {
    backgroundColor: COLOR.primary,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  continueBtnText: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
  },
});

/**
 * P25 — Request Media Player Screen (Task T4.3; BP §76.1, ARCH §3.2, MEDIA-005, MEDIA-006).
 * Plays customer voice notes, videos, and displays photo gallery with transcript viewer.
 */
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { translate } from '@kaamkaro/i18n';
import {
  COLOR,
  RADIUS,
  SPACING,
  STATUS_THEME,
  URDU_FONT_FAMILY,
  interactiveProps,
  minTapTargetStyle,
  textTokens,
} from '@kaamkaro/ui';
import { usePartner } from '../state/PartnerContext';
import { getAppMirroring } from '../utils/rtl';

export function P25MediaPlayerScreen() {
  const {
    locale,
    selectedJob,
    screenStates,
    activeMediaIndex,
    setActiveMediaIndex,
    isPlayingMedia,
    setIsPlayingMedia,
    goBack,
  } = usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P25;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p25-loading-view">
        <Text style={[styles.centerText, fontStyle]}>
          {translate(locale, 'partner.p25.loading')}
        </Text>
      </View>
    );
  }

  const mediaList = selectedJob?.media ?? [];

  if (currentState === 'empty' || (currentState === 'success' && mediaList.length === 0)) {
    return (
      <View style={styles.centerContainer} testID="p25-empty-view">
        <Text style={[styles.centerText, fontStyle]}>{translate(locale, 'partner.p25.empty')}</Text>
        <TouchableOpacity
          style={[styles.closeBtn, minTapTargetStyle()]}
          onPress={goBack}
          {...interactiveProps({
            testID: 'p25-empty-close-btn',
            accessibilityLabel: translate(locale, 'partner.p25.closeBtn'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.closeBtnText, fontStyle]}>
            {translate(locale, 'partner.p25.closeBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentState === 'error') {
    return (
      <View style={styles.centerContainer} testID="p25-error-view">
        <Text style={[styles.centerText, { color: STATUS_THEME.danger.text }, fontStyle]}>
          {translate(locale, 'partner.p25.error')}
        </Text>
        <TouchableOpacity
          style={[styles.closeBtn, minTapTargetStyle()]}
          onPress={goBack}
          {...interactiveProps({
            testID: 'p25-error-close-btn',
            accessibilityLabel: translate(locale, 'partner.p25.closeBtn'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.closeBtnText, fontStyle]}>
            {translate(locale, 'partner.p25.closeBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const voiceItem = mediaList.find((m) => m.type === 'voice');
  const videoItem = mediaList.find((m) => m.type === 'video');
  const photoItems = mediaList.filter((m) => m.type === 'photo');

  const currentPhotoIndex = Math.min(
    Math.max(activeMediaIndex, 0),
    Math.max(photoItems.length - 1, 0),
  );

  return (
    <View style={styles.container} testID="p25-media-player-screen">
      {/* Top Header */}
      <View style={[styles.headerRow, { flexDirection: mirroring.row }]}>
        <TouchableOpacity
          onPress={goBack}
          style={[styles.backBtn, minTapTargetStyle()]}
          {...interactiveProps({
            testID: 'p25-close-btn',
            accessibilityLabel: translate(locale, 'partner.p25.closeBtn'),
            accessibilityRole: 'button',
          })}
        >
          <Text style={[styles.backBtnText, fontStyle]}>
            {isUrdu ? '→' : '←'} {translate(locale, 'partner.p25.closeBtn')}
          </Text>
        </TouchableOpacity>
        <Text
          style={[styles.titleText, headlineTokens, { textAlign: mirroring.textAlign }, fontStyle]}
        >
          {translate(locale, 'partner.p25.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} testID="p25-media-scroll">
        {/* Voice Note Section */}
        {voiceItem && (
          <View style={styles.sectionCard} testID="p25-voice-section">
            <Text style={[styles.sectionHeading, { textAlign: mirroring.textAlign }, fontStyle]}>
              🎤 {translate(locale, 'partner.p25.voiceTitle')}
            </Text>

            <View style={[styles.audioPlayerRow, { flexDirection: mirroring.row }]}>
              <TouchableOpacity
                style={[styles.playPauseBtn, minTapTargetStyle()]}
                onPress={() => setIsPlayingMedia(!isPlayingMedia)}
                {...interactiveProps({
                  testID: 'p25-voice-play-pause-btn',
                  accessibilityLabel: isPlayingMedia
                    ? translate(locale, 'partner.p25.pause')
                    : translate(locale, 'partner.p25.play'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.playIconText}>{isPlayingMedia ? '⏸️' : '▶️'}</Text>
                <Text style={[styles.playBtnLabel, fontStyle]}>
                  {isPlayingMedia
                    ? translate(locale, 'partner.p25.pause')
                    : translate(locale, 'partner.p25.play')}
                </Text>
              </TouchableOpacity>

              <View style={styles.audioWaveform}>
                <View
                  style={[styles.audioProgressFill, { width: isPlayingMedia ? '65%' : '0%' }]}
                />
                <Text style={styles.durationText}>
                  {voiceItem.durationSeconds
                    ? `0:${voiceItem.durationSeconds.toString().padStart(2, '0')}`
                    : '0:30'}
                </Text>
              </View>
            </View>

            {voiceItem.transcriptText && (
              <View style={styles.transcriptBox} testID="p25-transcript-box">
                <Text
                  style={[styles.transcriptLabel, { textAlign: mirroring.textAlign }, fontStyle]}
                >
                  {translate(locale, 'partner.p25.transcriptTitle')}:
                </Text>
                <Text
                  style={[
                    styles.transcriptText,
                    bodyTokens,
                    { textAlign: mirroring.textAlign },
                    fontStyle,
                  ]}
                  testID="p25-transcript-text"
                >
                  "{voiceItem.transcriptText}"
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Video Section */}
        {videoItem && (
          <View style={styles.sectionCard} testID="p25-video-section">
            <Text style={[styles.sectionHeading, { textAlign: mirroring.textAlign }, fontStyle]}>
              📹 {translate(locale, 'partner.p25.videoTitle')}
            </Text>

            <View style={styles.videoContainer}>
              {videoItem.thumbnailUrl ? (
                <Image
                  source={{ uri: videoItem.thumbnailUrl }}
                  style={styles.videoThumbnail}
                  accessibilityLabel={translate(locale, 'partner.p25.videoTitle')}
                />
              ) : (
                <View style={styles.videoPlaceholder} />
              )}
              <TouchableOpacity
                style={[styles.videoPlayOverlay, minTapTargetStyle()]}
                onPress={() => setIsPlayingMedia(!isPlayingMedia)}
                {...interactiveProps({
                  testID: 'p25-video-play-btn',
                  accessibilityLabel: isPlayingMedia
                    ? translate(locale, 'partner.p25.pause')
                    : translate(locale, 'partner.p25.play'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.videoPlayIcon}>{isPlayingMedia ? '⏸️' : '▶️'}</Text>
                <Text style={[styles.videoPlayLabel, fontStyle]}>
                  {isPlayingMedia
                    ? translate(locale, 'partner.p25.pause')
                    : translate(locale, 'partner.p25.play')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Photos Carousel Section */}
        {photoItems.length > 0 && (
          <View style={styles.sectionCard} testID="p25-photos-section">
            <Text style={[styles.sectionHeading, { textAlign: mirroring.textAlign }, fontStyle]}>
              📷{' '}
              {translate(locale, 'partner.p25.photosTitle', {
                count: photoItems.length,
              })}
            </Text>

            <View style={styles.photoPagerContainer}>
              <Image
                source={{ uri: photoItems[currentPhotoIndex]?.url }}
                style={styles.activePhoto}
                accessibilityLabel={translate(locale, 'partner.p25.photoIndex', {
                  index: currentPhotoIndex + 1,
                  total: photoItems.length,
                })}
              />

              <View style={[styles.pagerControls, { flexDirection: mirroring.row }]}>
                <TouchableOpacity
                  style={[
                    styles.pagerBtn,
                    minTapTargetStyle(),
                    currentPhotoIndex === 0 && styles.pagerBtnDisabled,
                  ]}
                  disabled={currentPhotoIndex === 0}
                  onPress={() => setActiveMediaIndex(Math.max(currentPhotoIndex - 1, 0))}
                  {...interactiveProps({
                    testID: 'p25-photo-prev-btn',
                    accessibilityLabel: translate(locale, 'partner.p25.prevPhoto'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={styles.pagerArrow}>◀</Text>
                </TouchableOpacity>

                <Text style={[styles.pagerIndexText, fontStyle]} testID="p25-photo-indicator">
                  {translate(locale, 'partner.p25.photoIndex', {
                    index: currentPhotoIndex + 1,
                    total: photoItems.length,
                  })}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.pagerBtn,
                    minTapTargetStyle(),
                    currentPhotoIndex === photoItems.length - 1 && styles.pagerBtnDisabled,
                  ]}
                  disabled={currentPhotoIndex === photoItems.length - 1}
                  onPress={() =>
                    setActiveMediaIndex(Math.min(currentPhotoIndex + 1, photoItems.length - 1))
                  }
                  {...interactiveProps({
                    testID: 'p25-photo-next-btn',
                    accessibilityLabel: translate(locale, 'partner.p25.nextPhoto'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={styles.pagerArrow}>▶</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.surface,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLOR.surface,
  },
  centerText: {
    fontSize: 16,
    color: COLOR.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  headerRow: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLOR.background,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
  },
  backBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    marginRight: SPACING.sm,
  },
  backBtnText: {
    fontSize: 14,
    color: COLOR.primary,
    fontWeight: '600',
  },
  titleText: {
    flex: 1,
    color: COLOR.text,
    fontWeight: '700',
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  sectionCard: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.md,
  },
  audioPlayerRow: {
    alignItems: 'center',
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  playPauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    gap: SPACING.xs,
  },
  playIconText: {
    fontSize: 14,
  },
  playBtnLabel: {
    color: COLOR.onPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  audioWaveform: {
    flex: 1,
    height: 16,
    backgroundColor: COLOR.border,
    borderRadius: 999,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  audioProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLOR.primary,
  },
  durationText: {
    position: 'absolute',
    right: 8,
    fontSize: 10,
    color: COLOR.text,
    fontWeight: '600',
  },
  transcriptBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLOR.textMuted,
    marginBottom: SPACING.xs,
  },
  transcriptText: {
    color: COLOR.text,
    fontStyle: 'italic',
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1e293b',
  },
  videoPlayOverlay: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    gap: SPACING.sm,
  },
  videoPlayIcon: {
    fontSize: 18,
  },
  videoPlayLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoPagerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  activePhoto: {
    width: '100%',
    height: 220,
    borderRadius: RADIUS.sm,
    resizeMode: 'cover',
    backgroundColor: COLOR.surface,
  },
  pagerControls: {
    marginTop: SPACING.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.sm,
  },
  pagerBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
  },
  pagerBtnDisabled: {
    opacity: 0.3,
  },
  pagerArrow: {
    fontSize: 14,
    color: COLOR.text,
  },
  pagerIndexText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.textMuted,
  },
  closeBtn: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  closeBtnText: {
    color: COLOR.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});

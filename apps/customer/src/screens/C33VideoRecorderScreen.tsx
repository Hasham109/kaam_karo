/**
 * C33 Problem Video Recorder Screen (BP §76.2; ARCH §3.1; docs/screens/customer.md).
 * Purpose: short video recording (max 30s) with live timer, file size estimate, thumbnail preview,
 * camera permission on tap with educational rationale, and system gallery fallback.
 * Requirement IDs: MEDIA-002, MEDIA-003, MEDIA-004, MEDIA-005, MEDIA-009, PERM-002.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { PermissionModal } from '../components/PermissionModal';
import { useCustomerApp } from '../state/CustomerContext';
import { getAppMirroring } from '../utils/rtl';
import type { AttachedVideo, ScreenState } from '../types';

const MAX_VIDEO_SECONDS = 30; // 30 seconds max

export function C33VideoRecorderScreen(): React.JSX.Element {
  const {
    locale,
    updateDraft,
    goBack,
    permissionStatus,
    setPermissionStatus,
  } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const [screenState, setScreenState] = useState<ScreenState>('E');
  const [showPermModal, setShowPermModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasRecordedVideo, setHasRecordedVideo] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev + 1 >= MAX_VIDEO_SECONDS) {
            setIsRecording(false);
            setHasRecordedVideo(true);
            return MAX_VIDEO_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  const handleRecordTap = () => {
    if (permissionStatus.camera === 'granted') {
      startRecording();
    } else {
      setShowPermModal(true);
    }
  };

  const startRecording = () => {
    setElapsedSeconds(0);
    setIsRecording(true);
    setIsPaused(false);
    setHasRecordedVideo(false);
    setScreenState('L');
  };

  const handlePermissionContinue = () => {
    setShowPermModal(false);
    setPermissionStatus('camera', 'granted');
    startRecording();
  };

  const handlePermissionCancel = () => {
    setShowPermModal(false);
    setPermissionStatus('camera', 'denied');
    setScreenState('X');
  };

  const handlePauseResume = () => {
    setIsPaused((prev) => !prev);
  };

  const handleStop = () => {
    setIsRecording(false);
    setIsPaused(false);
    setHasRecordedVideo(true);
    setScreenState('S');
  };

  const handleDelete = () => {
    setIsRecording(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setHasRecordedVideo(false);
    setScreenState('E');
  };

  const handleAttach = () => {
    if (!hasRecordedVideo && elapsedSeconds === 0) return;

    const video: AttachedVideo = {
      id: `video-${Date.now()}`,
      uri: `file:///storage/emulated/0/KaamKaro/video_${Date.now()}.mp4`,
      durationSeconds: elapsedSeconds || 10,
      thumbnailUri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
      sizeBytes: (elapsedSeconds || 10) * 800000,
    };

    updateDraft({ video });
    goBack();
  };

  const handleGalleryFallback = () => {
    // Android system video picker (PERM-005: no runtime permission needed)
    const video: AttachedVideo = {
      id: `gallery-video-${Date.now()}`,
      uri: `content://media/external/video/media/${Date.now()}`,
      durationSeconds: 15,
      thumbnailUri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
      sizeBytes: 15 * 800000,
    };

    updateDraft({ video });
    goBack();
  };

  const timerText = `0:${elapsedSeconds < 10 ? '0' : ''}${elapsedSeconds} / 0:${MAX_VIDEO_SECONDS}`;

  return (
    <ScreenContainer
      testID="c33-video-recorder-screen"
      title={translate(locale, 'customer.c33.title')}
    >
      <View style={styles.container}>
        {/* Hint */}
        <View style={styles.hintCard} testID="c33-hint-card">
          <Text
            style={[
              styles.hintText,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c33.hint')}
          </Text>
        </View>

        {/* Viewfinder / Preview Card */}
        <View style={styles.viewfinderCard} testID="c33-viewfinder-card">
          {hasRecordedVideo ? (
            <View style={styles.thumbnailContainer} testID="c33-thumbnail-preview">
              <Text style={styles.viewfinderIcon}>🎬</Text>
              <Text style={[styles.thumbnailText, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c33.attachedSuccess')}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyViewfinder}>
              <Text style={styles.viewfinderIcon}>📹</Text>
              <Text style={[styles.timerOverlay, textTokens(locale, 'title')]}>
                {timerText}
              </Text>
              {isRecording ? (
                <View style={styles.recordingPill}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.recordingPillText}>
                    {translate(locale, 'customer.c32.recording')}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Permission Denied / Gallery Fallback Notice */}
        {permissionStatus.camera === 'denied' || screenState === 'X' ? (
          <View testID="c33-perm-denied-box" style={styles.deniedBox}>
            <Text
              style={[
                styles.deniedText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c33.galleryFallback')}
            </Text>
            <TouchableOpacity
              onPress={handleGalleryFallback}
              style={[styles.fallbackBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'c33-gallery-fallback-btn',
                accessibilityLabel: translate(locale, 'customer.c33.galleryFallback'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.fallbackBtnText, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c33.galleryFallback')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          {!isRecording && !hasRecordedVideo ? (
            <View style={styles.initButtonGroup}>
              <TouchableOpacity
                onPress={handleRecordTap}
                style={[styles.recordCircleBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c33-record-btn',
                  accessibilityLabel: translate(locale, 'customer.c33.recordAction'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.recordCircleIcon}>🔴</Text>
                <Text style={[styles.recordCircleLabel, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.c33.recordAction')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleGalleryFallback}
                style={[styles.galleryPickerBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c33-choose-gallery-btn',
                  accessibilityLabel: translate(locale, 'customer.c33.galleryFallback'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.galleryPickerText, textTokens(locale, 'label')]}>
                  {translate(locale, 'customer.c33.galleryFallback')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {isRecording ? (
            <View style={styles.actionButtonGroup}>
              <TouchableOpacity
                onPress={handlePauseResume}
                style={[styles.controlBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c33-pause-resume-btn',
                  accessibilityLabel: translate(
                    locale,
                    isPaused ? 'customer.c32.resumeAction' : 'customer.c32.pauseAction',
                  ),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.controlBtnText}>
                  {translate(
                    locale,
                    isPaused ? 'customer.c32.resumeAction' : 'customer.c32.pauseAction',
                  )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleStop}
                style={[styles.stopBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c33-stop-btn',
                  accessibilityLabel: translate(locale, 'customer.c33.stopAction'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.stopBtnText}>
                  {translate(locale, 'customer.c33.stopAction')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {hasRecordedVideo ? (
            <View style={styles.reviewGroup} testID="c33-review-group">
              <TouchableOpacity
                onPress={startRecording}
                style={[styles.controlBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c33-re-record-btn',
                  accessibilityLabel: translate(locale, 'customer.c32.reRecordAction'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.controlBtnText}>
                  {translate(locale, 'customer.c32.reRecordAction')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.deleteBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c33-delete-btn',
                  accessibilityLabel: translate(locale, 'customer.c33.deleteAction'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.deleteBtnText}>
                  {translate(locale, 'customer.c33.deleteAction')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAttach}
                style={[styles.attachBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c33-attach-btn',
                  accessibilityLabel: translate(locale, 'customer.c33.attachAction'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.attachBtnText}>
                  {translate(locale, 'customer.c33.attachAction')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      {/* Permission Rationale Modal */}
      <PermissionModal
        visible={showPermModal}
        kind="camera"
        onContinue={handlePermissionContinue}
        onCancel={handlePermissionCancel}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'space-between',
  },
  hintCard: {
    padding: SPACING.md,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  hintText: {
    color: COLOR.textMuted,
  },
  viewfinderCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: RADIUS.sheet,
    marginVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 240,
  },
  emptyViewfinder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  viewfinderIcon: {
    fontSize: 48,
  },
  timerOverlay: {
    color: COLOR.background,
    fontFamily: 'monospace',
  },
  recordingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    gap: SPACING.xs,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLOR.background,
  },
  recordingPillText: {
    color: COLOR.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  thumbnailText: {
    color: STATUS_THEME.success.text,
    fontWeight: 'bold',
  },
  deniedBox: {
    padding: SPACING.md,
    backgroundColor: STATUS_THEME.warning.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: STATUS_THEME.warning.border,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deniedText: {
    color: STATUS_THEME.warning.text,
    textAlign: 'center',
  },
  fallbackBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
  },
  fallbackBtnText: {
    color: COLOR.onPrimary,
  },
  controlsRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  initButtonGroup: {
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
  },
  recordCircleBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: STATUS_THEME.danger.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  recordCircleIcon: {
    fontSize: 28,
  },
  recordCircleLabel: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
  },
  galleryPickerBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  galleryPickerText: {
    color: COLOR.text,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  controlBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  controlBtnText: {
    color: COLOR.text,
    fontWeight: 'bold',
  },
  stopBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: STATUS_THEME.danger.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: STATUS_THEME.danger.border,
  },
  stopBtnText: {
    color: STATUS_THEME.danger.text,
    fontWeight: 'bold',
  },
  reviewGroup: {
    width: '100%',
    gap: SPACING.sm,
  },
  deleteBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: STATUS_THEME.danger.background,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: STATUS_THEME.danger.border,
  },
  deleteBtnText: {
    color: STATUS_THEME.danger.text,
    fontWeight: 'bold',
  },
  attachBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLOR.primary,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  attachBtnText: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
  },
});

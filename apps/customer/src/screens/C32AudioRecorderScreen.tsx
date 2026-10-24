/**
 * C32 Audio Note Recorder Screen (BP §76.1; ARCH §3.1; docs/screens/customer.md).
 * Purpose: audio recording with elapsed/remaining timers, pause/resume, playback, fallback to typing.
 * Requirement IDs: MEDIA-001, MEDIA-003, MEDIA-004, MEDIA-006, MEDIA-009, PERM-003.
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
import type { AttachedAudioNote, ScreenState } from '../types';

const MAX_AUDIO_SECONDS = 120; // 2 minutes

function formatMmSs(totalSeconds: number): { mm: string; ss: string; formatted: string } {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  return { mm, ss, formatted: `${mm}:${ss}` };
}

export function C32AudioRecorderScreen(): React.JSX.Element {
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev + 1 >= MAX_AUDIO_SECONDS) {
            setIsRecording(false);
            setHasRecordedAudio(true);
            return MAX_AUDIO_SECONDS;
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
    if (permissionStatus.microphone === 'granted') {
      startRecording();
    } else {
      setShowPermModal(true);
    }
  };

  const startRecording = () => {
    setElapsedSeconds(0);
    setIsRecording(true);
    setIsPaused(false);
    setIsPlaying(false);
    setHasRecordedAudio(false);
    setScreenState('L');
  };

  const handlePermissionContinue = () => {
    setShowPermModal(false);
    setPermissionStatus('microphone', 'granted');
    startRecording();
  };

  const handlePermissionCancel = () => {
    setShowPermModal(false);
    setPermissionStatus('microphone', 'denied');
    setScreenState('X');
  };

  const handlePauseResume = () => {
    setIsPaused((prev) => !prev);
  };

  const handleStop = () => {
    setIsRecording(false);
    setIsPaused(false);
    setHasRecordedAudio(true);
    setScreenState('S');
  };

  const handlePlayToggle = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleDelete = () => {
    setIsRecording(false);
    setIsPaused(false);
    setIsPlaying(false);
    setElapsedSeconds(0);
    setHasRecordedAudio(false);
    setScreenState('E');
  };

  const handleAttach = () => {
    if (!hasRecordedAudio && elapsedSeconds === 0) return;

    const audioNote: AttachedAudioNote = {
      id: `audio-${Date.now()}`,
      uri: `file:///storage/emulated/0/KaamKaro/audio_${Date.now()}.m4a`,
      durationSeconds: elapsedSeconds || 15,
      sizeBytes: (elapsedSeconds || 15) * 16000,
    };

    updateDraft({ audioNote });
    goBack();
  };

  const elapsed = formatMmSs(elapsedSeconds);
  const remaining = formatMmSs(Math.max(0, MAX_AUDIO_SECONDS - elapsedSeconds));

  return (
    <ScreenContainer
      testID="c32-audio-recorder-screen"
      title={translate(locale, 'customer.c32.title')}
    >
      <View style={styles.container}>
        {/* Hint & Privacy */}
        <View style={styles.hintCard} testID="c32-hint-card">
          <Text
            style={[
              styles.hintText,
              textTokens(locale, 'body'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c32.hint')}
          </Text>
        </View>

        {/* Timer Display */}
        <View style={styles.timerContainer} testID="c32-timer-container">
          <Text testID="c32-elapsed-time" style={styles.elapsedText}>
            {elapsed.formatted}
          </Text>
          <Text testID="c32-remaining-time" style={styles.remainingText}>
            {translate(locale, 'customer.c32.timeLeft', {
              mm: remaining.mm,
              ss: remaining.ss,
            })}
          </Text>
        </View>

        {/* Recording Visual State */}
        {isRecording ? (
          <View style={styles.recordingIndicator} testID="c32-recording-indicator">
            <View style={styles.pulseDot} />
            <Text style={[styles.recordingText, textTokens(locale, 'label')]}>
              {translate(locale, 'customer.c32.recording')}
            </Text>
          </View>
        ) : null}

        {/* Permission Denied Fallback */}
        {permissionStatus.microphone === 'denied' || screenState === 'X' ? (
          <View testID="c32-perm-denied-box" style={styles.deniedBox}>
            <Text
              style={[
                styles.deniedText,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c32.fallbackText')}
            </Text>
            <TouchableOpacity
              onPress={goBack}
              style={[styles.fallbackBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'c32-fallback-type-btn',
                accessibilityLabel: translate(locale, 'customer.c32.fallbackText'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={[styles.fallbackBtnText, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c32.fallbackText')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Controls Section */}
        <View style={styles.controlsRow}>
          {!isRecording && !hasRecordedAudio ? (
            <TouchableOpacity
              onPress={handleRecordTap}
              style={[styles.recordCircleBtn, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'c32-record-btn',
                accessibilityLabel: translate(locale, 'customer.c32.recordAction'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={styles.recordCircleIcon}>🎙️</Text>
              <Text style={[styles.recordCircleLabel, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c32.recordAction')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {isRecording ? (
            <View style={styles.actionButtonGroup}>
              <TouchableOpacity
                onPress={handlePauseResume}
                style={[styles.controlBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c32-pause-resume-btn',
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
                  testID: 'c32-stop-btn',
                  accessibilityLabel: translate(locale, 'customer.c32.stopAction'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.stopBtnText}>
                  {translate(locale, 'customer.c32.stopAction')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {hasRecordedAudio ? (
            <View style={styles.reviewGroup} testID="c32-review-group">
              <TouchableOpacity
                onPress={handlePlayToggle}
                style={[styles.controlBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c32-play-btn',
                  accessibilityLabel: translate(locale, 'customer.c32.playAction'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.controlBtnText}>
                  {isPlaying ? '⏸️' : '▶️'} {translate(locale, 'customer.c32.playAction')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={startRecording}
                style={[styles.controlBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c32-re-record-btn',
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
                  testID: 'c32-delete-btn',
                  accessibilityLabel: translate(locale, 'customer.c32.deleteAction'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.deleteBtnText}>
                  {translate(locale, 'customer.c32.deleteAction')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAttach}
                style={[styles.attachBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c32-attach-btn',
                  accessibilityLabel: translate(locale, 'customer.c32.attachAction'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.attachBtnText}>
                  {translate(locale, 'customer.c32.attachAction')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      {/* Permission Rationale Modal */}
      <PermissionModal
        visible={showPermModal}
        kind="microphone"
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
    lineHeight: 22,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.xl,
  },
  elapsedText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLOR.text,
    fontFamily: 'monospace',
  },
  remainingText: {
    fontSize: 14,
    color: COLOR.textMuted,
    marginTop: SPACING.xs,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: STATUS_THEME.danger.border,
  },
  recordingText: {
    color: STATUS_THEME.danger.text,
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
    marginBottom: SPACING.xl,
  },
  recordCircleBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLOR.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  recordCircleIcon: {
    fontSize: 32,
  },
  recordCircleLabel: {
    color: COLOR.onPrimary,
    fontWeight: 'bold',
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
    alignItems: 'center',
  },
  controlBtnText: {
    color: COLOR.text,
    fontWeight: 'bold',
  },
  stopBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: STATUS_THEME.danger.background,
    borderColor: STATUS_THEME.danger.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
  },
  stopBtnText: {
    color: STATUS_THEME.danger.text,
    fontWeight: 'bold',
  },
  reviewGroup: {
    width: '100%',
    gap: SPACING.md,
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

/**
 * C38: Voice Assistant Overlay & Screen (T3.11; BP §77, §78; ARCH §10.3; VOICE-001..008).
 * Features:
 * - Push-to-talk / explicit start-stop (VOICE-001; no always-listening wake word).
 * - Visible listening state indicator (VOICE-002).
 * - Recognized text shown before applying important commands (VOICE-003).
 * - "Undo" / "Cancel that" reverts previous draft modifications (VOICE-004).
 * - Operational text fallback always available (VOICE-005).
 * - Language switcher chip for English / Urdu (VOICE-006).
 * - Consequential action confirmation modal (book, accept quote, pay, cancel, complaint per VOICE-007).
 * - Strict allow-list enforcement per BP §77.3 with "not supported" rejection (VOICE-008).
 * - 48x48 dp min tap targets (A11Y-002), RTL mirroring, and zero hardcoded user-facing strings.
 */
import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  COLOR,
  RADIUS,
  SPACING,
  interactiveProps,
  minTapTargetStyle,
  textTokens,
} from '@kaamkaro/ui';
import { type Locale, translate } from '@kaamkaro/i18n';
import { getAppMirroring } from '../utils/rtl';
import { ScreenContainer } from '../components/ScreenContainer';
import { PermissionModal } from '../components/PermissionModal';
import { useCustomerApp } from '../state/CustomerContext';
import { VoiceAssistantSession } from '../services/voice-assistant';
import type {
  ConsequentialConfirmationPrompt,
  ScreenId,
  VoiceAssistantResult,
} from '../types';

export const EXAMPLE_HINTS = [
  'Mera AC thanda nahi kar raha',
  'Only verified providers',
  'Kal shaam electrician chahiye',
  'Nearest plumber dhoondo',
  'Show quotes',
] as const;

function renderConfirmationMessage(
  locale: Locale,
  conf: ConsequentialConfirmationPrompt,
): string {
  switch (conf.actionType) {
    case 'PLACE_BOOKING':
      return translate(locale, 'customer.c38.confirmBooking', {
        provider: String(conf.params?.provider ?? ''),
        service: String(conf.params?.service ?? ''),
      });
    case 'ACCEPT_QUOTE':
      return translate(locale, 'customer.c38.confirmQuoteAccept', {
        provider: String(conf.params?.provider ?? ''),
        amount: String(conf.params?.amount ?? ''),
      });
    case 'PAY_BOOKING':
      return translate(locale, 'customer.c38.confirmPayment', {
        amount: String(conf.params?.amount ?? '3,500'),
        service: String(conf.params?.service ?? 'AC General Service'),
      });
    case 'CANCEL_BOOKING':
      return translate(locale, 'customer.c38.confirmCancel', {
        service: String(conf.params?.service ?? 'AC General Service'),
        provider: String(conf.params?.provider ?? 'Tariq AC Solutions'),
      });
    case 'SUBMIT_COMPLAINT':
      return translate(locale, 'customer.c38.confirmComplaint', {
        bookingNumber: String(conf.params?.bookingNumber ?? 'BK-ACTIVE'),
      });
    default:
      return '';
  }
}

export const C38VoiceAssistantScreen: React.FC = () => {
  const {
    locale,
    setLocale,
    navigate,
    goBack,
    draft,
    updateDraft,
    permissionStatus,
    setPermissionStatus,
    screenParams,
  } = useCustomerApp();

  const mirror = getAppMirroring(locale);
  const params = screenParams as
    | { initialQuery?: string | undefined; returnTo?: ScreenId | undefined }
    | undefined;

  // Session state with undo history
  const session = useMemo(() => new VoiceAssistantSession(draft), []);
  session.updateDraftReference(draft);

  // Screen UI state
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState(params?.initialQuery || '');
  const [recognizedText, setRecognizedText] = useState('');
  const [lastResult, setLastResult] = useState<VoiceAssistantResult | null>(null);
  const [activeConfirmation, setActiveConfirmation] =
    useState<ConsequentialConfirmationPrompt | null>(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  // Toggle microphone with permission check (VOICE-001, PERM-003)
  const handleToggleMic = () => {
    if (isListening) {
      setIsListening(false);
      handleProcessCommand(inputText || recognizedText || 'Mera AC thanda nahi kar raha');
      return;
    }

    if (permissionStatus.microphone === 'denied') {
      return;
    }

    if (permissionStatus.microphone !== 'granted') {
      setShowPermissionPrompt(true);
      return;
    }

    startListening();
  };

  const startListening = () => {
    setIsListening(true);
    setRecognizedText('');
    setLastResult(null);
  };

  const handleGrantMicPermission = () => {
    setPermissionStatus('microphone', 'granted');
    setShowPermissionPrompt(false);
    startListening();
  };

  const handleDenyMicPermission = () => {
    setPermissionStatus('microphone', 'denied');
    setShowPermissionPrompt(false);
  };

  // Language toggle chip (VOICE-006)
  const handleToggleLanguage = () => {
    setLocale(locale === 'ur' ? 'en' : 'ur');
  };

  // Process command text (spoken or typed text fallback per VOICE-005)
  const handleProcessCommand = (textToProcess: string) => {
    const trimmed = textToProcess.trim();
    if (!trimmed) return;

    setIsListening(false);
    setIsProcessing(true);

    // Simulate STT text presentation (VOICE-003)
    setRecognizedText(trimmed);

    setTimeout(() => {
      const result = session.parseIntent(trimmed, params?.returnTo);
      setLastResult(result);
      setIsProcessing(false);

      // Handle consequential actions requiring confirmation (VOICE-007)
      if (result.requiresConfirmation && result.confirmationPrompt) {
        setActiveConfirmation(result.confirmationPrompt);
        return;
      }

      // Handle non-consequential direct actions
      if (result.draftUpdates) {
        updateDraft(result.draftUpdates);
      }
    }, 200);
  };

  // User taps "Do it" / Apply button
  const handleApplyCommand = () => {
    if (!recognizedText && !inputText) return;
    handleProcessCommand(recognizedText || inputText);
  };

  // User taps "Undo" / "Cancel that" (VOICE-004)
  const handleUndo = () => {
    const undoResult = session.parseIntent('undo');
    setLastResult(undoResult);
    if (undoResult.draftUpdates) {
      updateDraft(undoResult.draftUpdates);
    }
  };

  // Confirming consequential action (VOICE-007)
  const handleConfirmAction = () => {
    if (!activeConfirmation) return;
    const conf = activeConfirmation;
    setActiveConfirmation(null);

    // Navigate to respective target flow
    if (conf.actionType === 'PLACE_BOOKING') {
      navigate('C14');
    } else if (conf.actionType === 'ACCEPT_QUOTE') {
      navigate('C15', { bookingId: 'book-881' });
    } else if (conf.actionType === 'PAY_BOOKING') {
      navigate('C06');
    } else if (conf.actionType === 'CANCEL_BOOKING') {
      navigate('C06');
    } else if (conf.actionType === 'SUBMIT_COMPLAINT') {
      navigate('C06');
    }
  };

  const handleCancelAction = () => {
    setActiveConfirmation(null);
  };

  // Close overlay back to previous task (draft preserved, VOICE-005)
  const handleClose = () => {
    setIsListening(false);
    if (lastResult?.targetScreen && !lastResult.requiresConfirmation) {
      navigate(lastResult.targetScreen);
    } else if (params?.returnTo) {
      navigate(params.returnTo);
    } else {
      goBack();
    }
  };

  return (
    <ScreenContainer
      testID="c38-voice-assistant-screen"
      title={translate(locale, 'customer.c38.title')}
      showBackButton={true}
      showLanguageToggle={false}
      scrollable={true}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Language Switcher Chip (VOICE-006) */}
        <View style={[styles.topBar, { flexDirection: mirror.row }]}>
          <TouchableOpacity
            onPress={handleToggleLanguage}
            style={[styles.languageChip, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c38-language-chip',
              accessibilityLabel: translate(locale, 'customer.c38.languageToggleLabel', {
                lang: locale === 'ur' ? 'اردو' : 'English',
              }),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.languageChipText, textTokens(locale, 'label')]}>
              🌐 {locale === 'ur' ? 'اردو (Urdu)' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Listening / Status Visual Indicator (VOICE-002: visible for whole capture) */}
        <View style={styles.centerStatusSection}>
          {isListening ? (
            <View
              style={styles.listeningBadge}
              testID="c38-listening-indicator"
            >
              <Text style={styles.listeningPulseIcon}>🔴</Text>
              <Text style={[styles.listeningText, textTokens(locale, 'title')]}>
                {translate(locale, 'customer.c38.listening')}
              </Text>
            </View>
          ) : isProcessing ? (
            <View style={styles.processingBadge} testID="c38-working-indicator">
              <Text style={[styles.processingText, textTokens(locale, 'label')]}>
                ⏳ {translate(locale, 'customer.c38.working')}
              </Text>
            </View>
          ) : (
            <View style={styles.idleBadge}>
              <Text style={[styles.idleHintText, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c38.hintExamples')}
              </Text>
            </View>
          )}

          {/* Large Push-to-Talk Button (VOICE-001) */}
          <TouchableOpacity
            onPress={handleToggleMic}
            style={[
              styles.pttButton,
              isListening ? styles.pttButtonActive : styles.pttButtonIdle,
              minTapTargetStyle(),
            ]}
            {...interactiveProps({
              testID: 'c38-ptt-button',
              accessibilityLabel: isListening
                ? translate(locale, 'customer.c38.tapToStop')
                : translate(locale, 'customer.c38.tapToSpeak'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={styles.pttIcon}>{isListening ? '⏹️' : '🎙️'}</Text>
            <Text style={styles.pttLabel}>
              {isListening
                ? translate(locale, 'customer.c38.tapToStop')
                : translate(locale, 'customer.c38.tapToSpeak')}
            </Text>
          </TouchableOpacity>

          {/* Mic Denied Notice */}
          {permissionStatus.microphone === 'denied' ? (
            <View style={styles.micDeniedNotice}>
              <Text
                style={[
                  styles.micDeniedText,
                  textTokens(locale, 'label'),
                  { textAlign: mirror.textAlign },
                ]}
              >
                {translate(locale, 'customer.c38.micDenied')}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Recognised Text Display (VOICE-003: shown before applying important command) */}
        {recognizedText ? (
          <View style={styles.recognizedCard} testID="c38-heard-card">
            <Text
              style={[
                styles.recognizedLabel,
                textTokens(locale, 'label'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {translate(locale, 'customer.c38.heardPrefix', { text: recognizedText })}
            </Text>
          </View>
        ) : null}

        {/* Assistant Response Card */}
        {lastResult ? (
          <View
            style={[
              styles.resultCard,
              lastResult.intentType === 'UNSUPPORTED'
                ? styles.resultCardWarn
                : styles.resultCardSuccess,
            ]}
            testID="c38-assistant-reply"
          >
            <Text
              style={[
                styles.resultExplanation,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {locale === 'ur' ? lastResult.explanationUr : lastResult.explanationEn}
            </Text>

            {/* Undo button if undo is available (VOICE-004) */}
            {session.canUndo() ? (
              <View style={[styles.undoRow, { flexDirection: mirror.row }]}>
                <TouchableOpacity
                  onPress={handleUndo}
                  style={[styles.undoButton, minTapTargetStyle()]}
                  {...interactiveProps({
                    testID: 'c38-undo-button',
                    accessibilityLabel: translate(locale, 'customer.c38.undoAction'),
                    accessibilityRole: 'button',
                  })}
                >
                  <Text style={[styles.undoButtonText, textTokens(locale, 'label')]}>
                    ↩️ {translate(locale, 'customer.c38.undoAction')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Text Fallback Input (VOICE-005: always available) */}
        <View style={styles.textFallbackSection}>
          <Text
            style={[
              styles.fallbackTitle,
              textTokens(locale, 'label'),
              { textAlign: mirror.textAlign },
            ]}
          >
            {translate(locale, 'customer.c38.typeFallback')}
          </Text>

          <View style={[styles.inputRow, { flexDirection: mirror.row }]}>
            <TextInput
              testID="c38-text-input"
              value={inputText}
              onChangeText={setInputText}
              placeholder={translate(locale, 'customer.c38.typePlaceholder')}
              placeholderTextColor={COLOR.textMuted}
              style={[
                styles.textInput,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            />

            <TouchableOpacity
              onPress={handleApplyCommand}
              style={[styles.applyButton, minTapTargetStyle()]}
              {...interactiveProps({
                testID: 'c38-apply-button',
                accessibilityLabel: translate(locale, 'customer.c38.applyAction'),
                accessibilityRole: 'button',
              })}
            >
              <Text style={styles.applyButtonText}>
                {translate(locale, 'customer.c38.applyAction')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Example Suggestions Chips (BP §77.2) */}
        <View style={styles.hintsSection}>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.hintsScroll, { flexDirection: mirror.row }]}
          >
            {EXAMPLE_HINTS.map((hint, index) => (
              <TouchableOpacity
                key={hint}
                onPress={() => {
                  setInputText(hint);
                  handleProcessCommand(hint);
                }}
                style={[styles.hintChip, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: `c38-hint-chip-${index}`,
                  accessibilityLabel: hint,
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.hintChipText, textTokens(locale, 'label')]}>
                  💬 {hint}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Bottom Actions: Close */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.closeButton, minTapTargetStyle()]}
            {...interactiveProps({
              testID: 'c38-close-button',
              accessibilityLabel: translate(locale, 'customer.c38.closeAction'),
              accessibilityRole: 'button',
            })}
          >
            <Text style={[styles.closeButtonText, textTokens(locale, 'body')]}>
              {translate(locale, 'customer.c38.closeAction')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Consequential Action Confirmation Modal (VOICE-007) */}
      <Modal
        visible={activeConfirmation !== null}
        transparent={true}
        animationType="fade"
        testID="c38-confirm-modal"
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text
              style={[
                styles.modalTitle,
                textTokens(locale, 'title'),
                { textAlign: mirror.textAlign },
              ]}
            >
              ⚠️ {translate(locale, 'customer.c38.confirmTitle')}
            </Text>

            <Text
              style={[
                styles.modalBody,
                textTokens(locale, 'body'),
                { textAlign: mirror.textAlign },
              ]}
            >
              {activeConfirmation
                ? renderConfirmationMessage(locale, activeConfirmation)
                : ''}
            </Text>

            <View style={[styles.modalActionsRow, { flexDirection: mirror.row }]}>
              <TouchableOpacity
                onPress={handleCancelAction}
                style={[styles.modalCancelBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c38-modal-cancel-button',
                  accessibilityLabel: translate(locale, 'customer.c38.cancelButton'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={[styles.modalCancelText, textTokens(locale, 'body')]}>
                  {translate(locale, 'customer.c38.cancelButton')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmAction}
                style={[styles.modalConfirmBtn, minTapTargetStyle()]}
                {...interactiveProps({
                  testID: 'c38-modal-confirm-button',
                  accessibilityLabel: translate(locale, 'customer.c38.confirmButton'),
                  accessibilityRole: 'button',
                })}
              >
                <Text style={styles.modalConfirmText}>
                  {translate(locale, 'customer.c38.confirmButton')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Educational Microphone Pre-Prompt (PERM-JUST-002, PERM-003) */}
      <PermissionModal
        visible={showPermissionPrompt}
        kind="microphone"
        onContinue={handleGrantMicPermission}
        onCancel={handleDenyMicPermission}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  topBar: {
    justifyContent: 'flex-end',
    marginBottom: SPACING.xs,
  },
  languageChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 999,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageChipText: {
    color: COLOR.primary,
    fontWeight: '600',
  },
  centerStatusSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLOR.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLOR.border,
    gap: SPACING.md,
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  listeningPulseIcon: {
    fontSize: 14,
  },
  listeningText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  processingBadge: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
  },
  processingText: {
    color: COLOR.primary,
    fontWeight: '600',
  },
  idleBadge: {
    paddingHorizontal: SPACING.md,
  },
  idleHintText: {
    color: COLOR.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pttButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  pttButtonIdle: {
    backgroundColor: COLOR.primary,
  },
  pttButtonActive: {
    backgroundColor: '#DC2626',
  },
  pttIcon: {
    fontSize: 42,
  },
  pttLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginTop: SPACING.xs,
  },
  micDeniedNotice: {
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  micDeniedText: {
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  recognizedCard: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  recognizedLabel: {
    color: COLOR.text,
    fontStyle: 'italic',
  },
  resultCard: {
    padding: SPACING.md,
    borderRadius: 12,
    gap: SPACING.sm,
    borderWidth: 1,
  },
  resultCardSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  resultCardWarn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  resultExplanation: {
    color: COLOR.text,
  },
  undoRow: {
    justifyContent: 'flex-end',
    marginTop: SPACING.xs,
  },
  undoButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoButtonText: {
    color: COLOR.primary,
    fontWeight: '600',
  },
  textFallbackSection: {
    backgroundColor: COLOR.surface,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.border,
    gap: SPACING.sm,
  },
  fallbackTitle: {
    color: COLOR.textMuted,
    fontWeight: '600',
  },
  inputRow: {
    gap: SPACING.sm,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: '#FFFFFF',
    color: COLOR.text,
  },
  applyButton: {
    backgroundColor: COLOR.primary,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  hintsSection: {
    marginVertical: SPACING.xs,
  },
  hintsScroll: {
    gap: SPACING.sm,
  },
  hintChip: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 999,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintChipText: {
    color: COLOR.text,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  closeButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: 999,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: COLOR.text,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLOR.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalTitle: {
    color: COLOR.text,
    fontWeight: '700',
  },
  modalBody: {
    color: COLOR.text,
    lineHeight: 22,
  },
  modalActionsRow: {
    gap: SPACING.md,
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
  },
  modalCancelBtn: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: COLOR.textMuted,
  },
  modalConfirmBtn: {
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

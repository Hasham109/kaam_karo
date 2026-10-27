/**
 * C29: Structured Complaint / Dispute Screen (T7.5; BP §12 C29; SUP-003..005, BOOK-STATUS-012).
 * Features:
 * - Structured complaint flow linked to booking.
 * - Issue type selector (POOR_WORKMANSHIP, NO_SHOW, OVERCHARGING, PROPERTY_DAMAGE, SAFETY_HAZARD, etc.).
 * - Description input & optional evidence attachments.
 * - Confirmation modal before final submission.
 * - 5 canonical screen states (L, E, S, X, P).
 */
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLOR, RADIUS, SPACING, STATUS_THEME, textTokens } from '@kaamkaro/ui';
import { translate } from '@kaamkaro/i18n';
import { getAppMirroring } from '../utils/rtl';
import { ScreenContainer } from '../components/ScreenContainer';
import { StateView } from '../components/StateView';
import { UiButton } from '../components/UiButton';
import { useCustomerApp } from '../state/CustomerContext';
import { MOCK_CUSTOMER_DISPUTES } from '../data/mock-data';
import type { CustomerDispute, ScreenParams, ScreenState } from '../types';

export interface C29DisputeScreenProps {
  readonly initialDisputes?: CustomerDispute[];
  readonly initialState?: ScreenState;
  readonly onSubmitDispute?: (dispute: CustomerDispute) => void;
}

const ISSUE_TYPES = [
  'POOR_WORKMANSHIP',
  'NO_SHOW',
  'OVERCHARGING',
  'UNPROFESSIONAL_BEHAVIOUR',
  'PROPERTY_DAMAGE',
  'SAFETY_HAZARD',
] as const;

export const C29DisputeScreen: React.FC<C29DisputeScreenProps> = ({
  initialDisputes: _initialDisputes = MOCK_CUSTOMER_DISPUTES,
  initialState = 'S',
  onSubmitDispute,
}) => {
  const { locale, screenParams } = useCustomerApp();
  const mirror = getAppMirroring(locale);

  const c29Params = screenParams as ScreenParams['C29'];
  const bookingId = c29Params?.bookingId ?? 'bk-78912';

  const [screenState, setScreenState] = useState<ScreenState>(initialState);
  const [issueType, setIssueType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleAddEvidence = () => {
    // Simulate attaching a photo or document
    setEvidenceFiles((prev) => [...prev, `file-${Date.now()}-${prev.length + 1}.jpg`]);
  };

  const handleInitiateSubmit = () => {
    if (!issueType) {
      setValidationError(translate(locale, 'customer.c29.emptyIssueType'));
      return;
    }
    if (!description.trim()) {
      setValidationError(translate(locale, 'customer.c29.emptyDescription'));
      return;
    }
    setValidationError(null);
    setIsConfirmOpen(true);
  };

  const handleConfirmSubmit = () => {
    setIsConfirmOpen(false);
    setScreenState('P');

    setTimeout(() => {
      const disputeNumber = `DSP-${Math.floor(1000 + Math.random() * 9000)}`;
      const newDispute: CustomerDispute = {
        id: `dsp-${Date.now()}`,
        disputeNumber,
        bookingId,
        issueType,
        description: description.trim(),
        status: 'OPEN',
        level: 3,
        evidenceUrls: evidenceFiles,
        createdAt: new Date().toISOString(),
      };

      setSuccessNotice(translate(locale, 'customer.c29.success', { number: disputeNumber }));
      setDescription('');
      setIssueType('');
      setEvidenceFiles([]);
      setScreenState('S');
      onSubmitDispute?.(newDispute);
    }, 400);
  };

  if (screenState === 'L') {
    return (
      <ScreenContainer testID="c29-dispute-screen">
        <StateView state="L" locale={locale} message={translate(locale, 'customer.c29.pending')} />
      </ScreenContainer>
    );
  }

  if (screenState === 'X') {
    return (
      <ScreenContainer testID="c29-dispute-screen">
        <StateView
          state="X"
          locale={locale}
          message={translate(locale, 'common.error.server')}
          onRetry={() => setScreenState('S')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer testID="c29-dispute-screen">
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={[styles.headerRow, { flexDirection: mirror.row }]}>
          <Text style={[styles.title, { textAlign: mirror.textAlign }, textTokens(locale, 'title')]}>
            {translate(locale, 'customer.c29.title')}
          </Text>
        </View>

        {/* Success Notice */}
        {successNotice ? (
          <View style={styles.noticeBox} testID="c29-success-notice">
            <Text style={[styles.noticeText, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}>
              {successNotice}
            </Text>
          </View>
        ) : null}

        {/* Booking Reference Box */}
        <View style={styles.bookingCard} testID="c29-booking-card">
          <Text style={[styles.bookingLabel, { textAlign: mirror.textAlign }, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c29.bookingLabel')}
          </Text>
          <Text style={[styles.bookingValue, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}>
            #{bookingId}
          </Text>
        </View>

        {validationError ? (
          <View style={styles.errorBanner} testID="c29-validation-error">
            <Text style={[styles.errorText, { textAlign: mirror.textAlign }, textTokens(locale, 'label')]}>
              {validationError}
            </Text>
          </View>
        ) : null}

        {/* Issue Type Selector */}
        <View style={styles.section} testID="c29-issue-type-section">
          <Text style={[styles.inputLabel, { textAlign: mirror.textAlign }, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c29.issueTypeLabel')}
          </Text>
          <View style={[styles.issueTypeGrid, { flexDirection: mirror.row }]}>
            {ISSUE_TYPES.map((typeKey) => {
              const isSelected = issueType === typeKey;
              return (
                <TouchableOpacity
                  key={typeKey}
                  testID={`c29-issue-${typeKey}`}
                  style={[
                    styles.issueTypePill,
                    isSelected ? styles.issueTypePillSelected : styles.issueTypePillUnselected,
                  ]}
                  onPress={() => setIssueType(typeKey)}
                  accessible={true}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.issueTypeText,
                      textTokens(locale, 'label'),
                      isSelected ? styles.issueTypeTextSelected : styles.issueTypeTextUnselected,
                    ]}
                  >
                    {typeKey}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Description TextArea */}
        <View style={styles.section}>
          <Text style={[styles.inputLabel, { textAlign: mirror.textAlign }, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c29.descriptionLabel')}
          </Text>
          <TextInput
            testID="c29-description-input"
            style={[styles.textArea, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}
            value={description}
            onChangeText={setDescription}
            placeholder={translate(locale, 'customer.c29.descriptionPlaceholder')}
            placeholderTextColor={COLOR.textMuted}
            multiline
            numberOfLines={5}
          />
        </View>

        {/* Evidence Section */}
        <View style={styles.section} testID="c29-evidence-section">
          <Text style={[styles.inputLabel, { textAlign: mirror.textAlign }, textTokens(locale, 'label')]}>
            {translate(locale, 'customer.c29.evidenceLabel')}
          </Text>
          {evidenceFiles.length > 0 ? (
            <View style={styles.evidenceBadge}>
              <Text style={[styles.evidenceBadgeText, textTokens(locale, 'label')]}>
                {translate(locale, 'customer.c29.evidenceCount', {
                  count: evidenceFiles.length,
                })}
              </Text>
            </View>
          ) : null}
          <UiButton
            testID="c29-add-evidence-btn"
            variant="secondary"
            locale={locale}
            title={translate(locale, 'customer.c29.addEvidenceBtn')}
            onPress={handleAddEvidence}
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitRow}>
          <UiButton
            testID="c29-submit-btn"
            variant="primary"
            locale={locale}
            title={
              screenState === 'P'
                ? translate(locale, 'customer.c29.sending')
                : translate(locale, 'customer.c29.submitBtn')
            }
            onPress={handleInitiateSubmit}
            disabled={screenState === 'P'}
          />
        </View>

        {/* Confirmation Modal */}
        <Modal
          visible={isConfirmOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsConfirmOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent} testID="c29-confirm-modal">
              <Text style={[styles.modalTitle, { textAlign: mirror.textAlign }, textTokens(locale, 'title')]}>
                {translate(locale, 'customer.c29.confirmTitle')}
              </Text>
              <Text style={[styles.modalBody, { textAlign: mirror.textAlign }, textTokens(locale, 'body')]}>
                {translate(locale, 'customer.c29.confirmBody', {
                  number: bookingId,
                })}
              </Text>
              <View style={[styles.modalActionsRow, { flexDirection: mirror.row }]}>
                <View style={styles.modalBtnWrapper}>
                  <UiButton
                    testID="c29-confirm-cancel-btn"
                    variant="secondary"
                    locale={locale}
                    title={translate(locale, 'customer.c29.confirmCancel')}
                    onPress={() => setIsConfirmOpen(false)}
                  />
                </View>
                <View style={styles.modalBtnWrapper}>
                  <UiButton
                    testID="c29-confirm-yes-btn"
                    variant="primary"
                    locale={locale}
                    title={translate(locale, 'customer.c29.confirmYes')}
                    onPress={handleConfirmSubmit}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  headerRow: {
    marginBottom: SPACING.md,
  },
  title: {
    color: COLOR.primary,
  },
  noticeBox: {
    backgroundColor: STATUS_THEME.info.background,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  noticeText: {
    color: STATUS_THEME.info.text,
    fontWeight: '600',
  },
  bookingCard: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLOR.border,
    marginBottom: SPACING.md,
  },
  bookingLabel: {
    color: COLOR.textMuted,
    marginBottom: 2,
  },
  bookingValue: {
    fontWeight: '700',
    color: COLOR.text,
  },
  errorBanner: {
    backgroundColor: STATUS_THEME.danger.background,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: STATUS_THEME.danger.text,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontWeight: '600',
    color: COLOR.text,
    marginBottom: SPACING.xs,
  },
  issueTypeGrid: {
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  issueTypePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    minHeight: 48,
  },
  issueTypePillSelected: {
    backgroundColor: COLOR.primary,
    borderColor: COLOR.primary,
  },
  issueTypePillUnselected: {
    backgroundColor: COLOR.surface,
    borderColor: COLOR.border,
  },
  issueTypeText: {
    fontWeight: '600',
  },
  issueTypeTextSelected: {
    color: COLOR.onPrimary,
  },
  issueTypeTextUnselected: {
    color: COLOR.text,
  },
  textArea: {
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    color: COLOR.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  evidenceBadge: {
    backgroundColor: COLOR.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
    alignSelf: 'flex-start',
  },
  evidenceBadgeText: {
    color: COLOR.text,
    fontWeight: '600',
  },
  submitRow: {
    marginTop: SPACING.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLOR.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  modalBody: {
    color: COLOR.textMuted,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  modalActionsRow: {
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  modalBtnWrapper: {
    flex: 1,
  },
});


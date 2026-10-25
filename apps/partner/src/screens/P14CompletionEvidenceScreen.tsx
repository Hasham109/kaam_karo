/**
 * P14 — Completion Evidence & Billing Screen (Task T4.5; BP §13 P14, UX-PROV-005, BOOK-STATUS-009, D-003, D-006, D-016, D-030).
 * Owner: A12 (partner-app).
 */
import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
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

export function P14CompletionEvidenceScreen() {
  const {
    locale,
    executionStatus,
    completionEvidence,
    updateCompletionNotes,
    addCompletionPhoto,
    removeCompletionPhoto,
    setCustomerSignature,
    setCompletionCode,
    completeJobWithEvidence,
    recordPaymentMethod,
    finalBillTotals,
    screenStates,
    navigate,
    goBack,
  } = usePartner();

  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const currentState = screenStates.P14;

  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;
  const headlineTokens = textTokens(locale, 'headline');
  const bodyTokens = textTokens(locale, 'body');

  // Local form inputs
  const [photoCount, setPhotoCount] = useState<number>(completionEvidence.photos.length);
  const [showCashConfirmSheet, setShowCashConfirmSheet] = useState<boolean>(false);
  const [codeAttempts, setCodeAttempts] = useState<number>(3);
  const [codeError, setCodeError] = useState<string | null>(null);

  const isCompleted = executionStatus === 'COMPLETED';

  // Handle adding photo thumbnail
  const handleAddPhoto = () => {
    const nextIdx = photoCount + 1;
    const url = `https://cdn.kaamkaro.pk/evidence/photo_${nextIdx}.jpg`;
    addCompletionPhoto(url);
    setPhotoCount(nextIdx);
  };

  // Handle signature simulation
  const handleSign = () => {
    setCustomerSignature('SIGNED_BY_CUSTOMER_ON_DEVICE');
  };

  // Handle completion code verification
  const handleVerifyCode = (val: string) => {
    setCompletionCode(val);
    if (val.length === 4) {
      if (val === '1234') {
        setCodeError(null);
      } else {
        const remaining = codeAttempts - 1;
        setCodeAttempts(remaining);
        if (remaining > 0) {
          setCodeError(
            translate(locale, 'partner.p14.invalidCodeError', {
              tries: remaining.toString(),
            }),
          );
        } else {
          setCodeError(translate(locale, 'partner.p14.tooManyCodesError'));
        }
      }
    }
  };

  // Step 1: Mark job complete
  const handleMarkComplete = async () => {
    await completeJobWithEvidence();
  };

  // Step 2: Confirm cash payment
  const handleConfirmCashPayment = async () => {
    setShowCashConfirmSheet(false);
    await recordPaymentMethod('CASH');
  };

  // Step 2: Record digital payment
  const handleRecordDigital = async () => {
    await recordPaymentMethod('DIGITAL');
  };

  if (currentState === 'loading') {
    return (
      <View style={styles.centerContainer} testID="p14-state-loading">
        <Text style={[styles.stateText, bodyTokens, fontStyle]}>
          {translate(locale, 'partner.p14.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="p14-completion-evidence-screen">
      {/* Header */}
      <View style={[styles.header, { flexDirection: mirroring.row }]}>
        <TouchableOpacity
          {...interactiveProps({
            testID: 'p14-back-btn',
            accessibilityRole: 'button',
            accessibilityLabel: translate(locale, 'partner.p10.cancelBtn'),
          })}
          style={[styles.backBtn, minTapTargetStyle()]}
          onPress={goBack}
        >
          <Text style={[styles.backBtnText, fontStyle]}>
            {translate(locale, 'partner.p10.cancelBtn')}
          </Text>
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text
            style={[styles.title, headlineTokens, fontStyle, { textAlign: mirroring.textAlign }]}
            testID="p14-title"
          >
            {translate(locale, 'partner.p14.title')}
          </Text>
          <Text style={[styles.subtitle, fontStyle, { textAlign: mirroring.textAlign }]}>
            {!isCompleted
              ? translate(locale, 'partner.p14.step1Title')
              : translate(locale, 'partner.p14.step2Title')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Canonical State Banners */}
        {currentState === 'success' && (
          <View style={[styles.banner, styles.bannerSuccess]} testID="p14-state-success">
            <Text style={[styles.bannerSuccessText, bodyTokens, fontStyle]}>
              {completionEvidence.paymentMethod === 'CASH'
                ? translate(locale, 'partner.p14.successCash', {
                    commission: finalBillTotals.commissionPkr.toString(),
                  })
                : completionEvidence.paymentMethod === 'DIGITAL'
                  ? translate(locale, 'partner.p14.successDigital')
                  : translate(locale, 'partner.p14.successComplete')}
            </Text>
          </View>
        )}

        {currentState === 'error' && (
          <View style={[styles.banner, styles.bannerError]} testID="p14-state-error">
            <Text style={[styles.bannerErrorText, bodyTokens, fontStyle]}>
              {translate(locale, 'partner.p14.error')}
            </Text>
          </View>
        )}

        {currentState === 'pending' && (
          <View style={[styles.banner, styles.bannerPending]} testID="p14-state-pending">
            <Text style={[styles.bannerPendingText, bodyTokens, fontStyle]}>
              {translate(locale, 'partner.p14.pending')}
            </Text>
          </View>
        )}

        {/* STEP 1: Completion Evidence (Before Completion Confirmation) */}
        {!isCompleted ? (
          <View testID="p14-evidence-step-section">
            {/* Work Notes */}
            <View style={styles.card}>
              <Text style={[styles.fieldLabel, fontStyle, { textAlign: mirroring.textAlign }]}>
                {translate(locale, 'partner.p14.workNotes')}
              </Text>
              <TextInput
                style={[styles.textArea, fontStyle, { textAlign: mirroring.textAlign }]}
                testID="p14-input-work-notes"
                multiline
                numberOfLines={3}
                value={completionEvidence.workNotes}
                onChangeText={updateCompletionNotes}
                placeholder={translate(locale, 'partner.p14.workNotesPlaceholder')}
                placeholderTextColor={COLOR.textMuted}
              />
            </View>

            {/* Photos Upload & Thumbnails */}
            <View style={styles.card}>
              <Text
                style={[
                  styles.cardTitle,
                  headlineTokens,
                  fontStyle,
                  { textAlign: mirroring.textAlign },
                ]}
              >
                {translate(locale, 'partner.p14.photosTitle')}
              </Text>
              <Text
                style={[styles.metaText, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
                testID="p14-photos-count"
              >
                {translate(locale, 'partner.p14.photoCount', {
                  count: completionEvidence.photos.length,
                })}
              </Text>

              <View style={[styles.photoGrid, { flexDirection: mirroring.row }]}>
                {completionEvidence.photos.map((photoUrl, idx) => (
                  <View key={photoUrl} style={styles.photoThumb}>
                    <Text style={[styles.photoThumbText, fontStyle]}>
                      {translate(locale, 'partner.p14.photoIndex', {
                        index: String(idx + 1),
                      })}
                    </Text>
                    <TouchableOpacity
                      style={styles.photoRemoveBtn}
                      onPress={() => removeCompletionPhoto(idx)}
                    >
                      <Text style={styles.photoRemoveBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  {...interactiveProps({
                    testID: 'p14-add-photo-btn',
                    accessibilityRole: 'button',
                    accessibilityLabel: translate(locale, 'partner.p14.addPhotoBtn'),
                  })}
                  style={[styles.addPhotoCard, minTapTargetStyle()]}
                  onPress={handleAddPhoto}
                >
                  <Text style={[styles.addPhotoCardText, fontStyle]}>
                    + {translate(locale, 'partner.p14.addPhotoBtn')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Customer Signature & Completion Code */}
            <View style={styles.card}>
              <Text
                style={[
                  styles.cardTitle,
                  headlineTokens,
                  fontStyle,
                  { textAlign: mirroring.textAlign },
                ]}
              >
                {translate(locale, 'partner.p14.customerSignature')}
              </Text>

              {completionEvidence.customerSignature ? (
                <View style={styles.signatureBadge} testID="p14-signature-captured">
                  <Text style={[styles.signatureBadgeText, fontStyle]}>
                    ✓ {translate(locale, 'partner.p14.signaturePlaceholder')}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  {...interactiveProps({
                    testID: 'p14-sign-btn',
                    accessibilityRole: 'button',
                    accessibilityLabel: translate(locale, 'partner.p14.signBtn'),
                  })}
                  style={[styles.secondaryActionBtn, minTapTargetStyle()]}
                  onPress={handleSign}
                >
                  <Text style={[styles.secondaryActionBtnText, fontStyle]}>
                    {translate(locale, 'partner.p14.signBtn')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Completion Code Input */}
              <Text
                style={[
                  styles.fieldLabel,
                  fontStyle,
                  { textAlign: mirroring.textAlign, marginTop: SPACING.md },
                ]}
              >
                {translate(locale, 'partner.p14.completionCode')}
              </Text>
              <TextInput
                style={[styles.input, fontStyle, { textAlign: mirroring.textAlign }]}
                testID="p14-input-completion-code"
                maxLength={4}
                keyboardType="numeric"
                value={completionEvidence.completionCode || ''}
                onChangeText={handleVerifyCode}
                placeholder={translate(locale, 'partner.p14.completionCodePlaceholder')}
                placeholderTextColor={COLOR.textMuted}
              />
              {codeError && (
                <Text style={[styles.errorText, fontStyle]} testID="p14-code-error">
                  {codeError}
                </Text>
              )}
            </View>

            {/* Primary Action: Mark Job Complete */}
            <TouchableOpacity
              {...interactiveProps({
                testID: 'p14-mark-complete-btn',
                accessibilityRole: 'button',
                accessibilityLabel: translate(locale, 'partner.p14.markCompleteBtn'),
              })}
              style={[styles.primaryActionBtn, minTapTargetStyle()]}
              onPress={() => void handleMarkComplete()}
            >
              <Text style={[styles.primaryActionBtnText, headlineTokens, fontStyle]}>
                {translate(locale, 'partner.p14.markCompleteBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* STEP 2: Final Bill & How was it paid? (D-003: Payment ONLY after Completed) */
          <View testID="p14-billing-step-section">
            {/* Final Bill Breakdown Card */}
            <View style={styles.card} testID="p14-final-bill-card">
              <Text
                style={[
                  styles.cardTitle,
                  headlineTokens,
                  fontStyle,
                  { textAlign: mirroring.textAlign },
                ]}
              >
                {translate(locale, 'partner.p14.finalBillTitle')}
              </Text>

              <View style={[styles.billLine, { flexDirection: mirroring.row }]}>
                <Text style={[styles.billLineLabel, fontStyle]}>
                  {translate(locale, 'partner.p14.labourAmount')}
                </Text>
                <Text style={[styles.billLineValue, fontStyle]} testID="p14-bill-labour">
                  {formatPkr(locale, finalBillTotals.labourPkr)}
                </Text>
              </View>

              <View style={[styles.billLine, { flexDirection: mirroring.row }]}>
                <Text style={[styles.billLineLabel, fontStyle]}>
                  {translate(locale, 'partner.p14.materialsAmount')}
                </Text>
                <Text style={[styles.billLineValue, fontStyle]} testID="p14-bill-materials">
                  {formatPkr(locale, finalBillTotals.materialsPkr)}
                </Text>
              </View>

              <View style={[styles.billLine, { flexDirection: mirroring.row }]}>
                <Text style={[styles.billLineLabel, fontStyle]}>
                  {translate(locale, 'partner.p14.taxAmount')}
                </Text>
                <Text style={[styles.billLineValue, fontStyle]} testID="p14-bill-tax">
                  {formatPkr(locale, finalBillTotals.taxPkr)}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={[styles.billLine, { flexDirection: mirroring.row }]}>
                <Text style={[styles.totalLabel, fontStyle]}>
                  {translate(locale, 'partner.p14.customerTotal')}
                </Text>
                <Text style={[styles.totalValue, fontStyle]} testID="p14-bill-total">
                  {formatPkr(locale, finalBillTotals.customerTotalPkr)}
                </Text>
              </View>

              {/* Commission Split on Labour Only (D-006, D-015, COMM-004) */}
              <View style={styles.commissionSplitBox} testID="p14-commission-split-box">
                <Text
                  style={[
                    styles.commissionSplitText,
                    fontStyle,
                    { textAlign: mirroring.textAlign },
                  ]}
                >
                  {translate(locale, 'partner.p14.commissionSplit', {
                    rate: finalBillTotals.commissionRatePct.toString(),
                    amount: formatPkr(locale, finalBillTotals.commissionPkr),
                    share: formatPkr(locale, finalBillTotals.providerSharePkr),
                  })}
                </Text>
              </View>
            </View>

            {/* How was it paid? Choice (D-016, D-030) */}
            <View style={styles.card} testID="p14-payment-choice-card">
              <Text
                style={[
                  styles.cardTitle,
                  headlineTokens,
                  fontStyle,
                  { textAlign: mirroring.textAlign },
                ]}
              >
                {translate(locale, 'partner.p14.howWasItPaid')}
              </Text>

              {/* If already recorded, show confirmed badge */}
              {completionEvidence.paymentMethod === 'CASH' && (
                <View style={styles.confirmedPayBox} testID="p14-cash-recorded-badge">
                  <Text style={[styles.confirmedPayText, fontStyle]}>
                    ✓ {translate(locale, 'partner.p14.payCashOption')}
                  </Text>
                  <Text style={[styles.metaText, fontStyle]}>
                    {translate(locale, 'partner.p14.successCash', {
                      commission: String(
                        completionEvidence.cashCommissionDebited ?? finalBillTotals.commissionPkr,
                      ),
                    })}
                  </Text>
                </View>
              )}

              {completionEvidence.paymentMethod === 'DIGITAL' && (
                <View style={styles.digitalStatusBox} testID="p14-digital-status-box">
                  <Text style={[styles.confirmedPayText, fontStyle]}>
                    {translate(locale, 'partner.p14.payDigitalOption')}
                  </Text>
                  <View style={styles.digitalStatusChip}>
                    <Text style={[styles.digitalStatusText, fontStyle]}>
                      {completionEvidence.digitalStatus === 'PAID'
                        ? translate(locale, 'partner.p14.digitalStatusPaid')
                        : completionEvidence.digitalStatus === 'NOT_RECEIVED'
                          ? translate(locale, 'partner.p14.digitalStatusNotReceived')
                          : translate(locale, 'partner.p14.digitalStatusWaiting')}
                    </Text>
                  </View>
                </View>
              )}

              {/* If payment method not yet recorded */}
              {!completionEvidence.paymentMethod && (
                <View style={styles.paymentButtonsStack}>
                  {/* Cash Option Button */}
                  <TouchableOpacity
                    {...interactiveProps({
                      testID: 'p14-record-cash-btn',
                      accessibilityRole: 'button',
                      accessibilityLabel: translate(locale, 'partner.p14.payCashOption'),
                    })}
                    style={[styles.cashActionBtn, minTapTargetStyle()]}
                    onPress={() => setShowCashConfirmSheet(true)}
                  >
                    <Text style={[styles.cashActionBtnText, fontStyle]}>
                      {translate(locale, 'partner.p14.payCashOption')}
                    </Text>
                  </TouchableOpacity>

                  {/* Digital Option Button */}
                  <TouchableOpacity
                    {...interactiveProps({
                      testID: 'p14-record-digital-btn',
                      accessibilityRole: 'button',
                      accessibilityLabel: translate(locale, 'partner.p14.recordDigitalBtn'),
                    })}
                    style={[styles.digitalActionBtn, minTapTargetStyle()]}
                    onPress={() => void handleRecordDigital()}
                  >
                    <Text style={[styles.digitalActionBtnText, fontStyle]}>
                      {translate(locale, 'partner.p14.recordDigitalBtn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Done & Return to Home Button */}
            {completionEvidence.paymentMethod && (
              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p14-done-home-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p14.doneCloseBtn'),
                })}
                style={[styles.primaryActionBtn, minTapTargetStyle()]}
                onPress={() => navigate('P04')}
              >
                <Text style={[styles.primaryActionBtnText, headlineTokens, fontStyle]}>
                  {translate(locale, 'partner.p14.doneCloseBtn')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Cash Confirmation Sheet (D-006, COMM-001) */}
      <Modal
        visible={showCashConfirmSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCashConfirmSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} testID="p14-cash-confirm-sheet">
            <Text
              style={[
                styles.modalTitle,
                headlineTokens,
                fontStyle,
                { textAlign: mirroring.textAlign },
              ]}
            >
              {translate(locale, 'partner.p14.cashConfirmSheetTitle')}
            </Text>
            <Text
              style={[styles.modalBody, bodyTokens, fontStyle, { textAlign: mirroring.textAlign }]}
              testID="p14-cash-prompt-text"
            >
              {translate(locale, 'partner.p14.cashConfirmPrompt', {
                total: finalBillTotals.customerTotalPkr.toString(),
                commission: finalBillTotals.commissionPkr.toString(),
                rate: `${finalBillTotals.commissionRatePct}%`,
              })}
            </Text>

            <View style={[styles.modalActions, { flexDirection: mirroring.row }]}>
              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p14-confirm-cash-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p14.cashConfirmBtn'),
                })}
                style={[styles.confirmCashBtn, minTapTargetStyle()]}
                onPress={() => void handleConfirmCashPayment()}
              >
                <Text style={[styles.confirmCashBtnText, fontStyle]}>
                  {translate(locale, 'partner.p14.cashConfirmBtn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                {...interactiveProps({
                  testID: 'p14-cancel-cash-modal-btn',
                  accessibilityRole: 'button',
                  accessibilityLabel: translate(locale, 'partner.p14.cancelModalBtn'),
                })}
                style={[styles.neutralModalBtn, minTapTargetStyle()]}
                onPress={() => setShowCashConfirmSheet(false)}
              >
                <Text style={[styles.neutralModalBtnText, fontStyle]}>
                  {translate(locale, 'partner.p14.cancelModalBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLOR.background,
  },
  stateText: {
    color: COLOR.textMuted,
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
    backgroundColor: COLOR.surface,
  },
  backBtn: {
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  backBtnText: {
    color: COLOR.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  titleWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLOR.textMuted,
    marginTop: 2,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  banner: {
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  bannerSuccess: {
    backgroundColor: STATUS_THEME.success.background,
  },
  bannerSuccessText: {
    color: STATUS_THEME.success.text,
  },
  bannerError: {
    backgroundColor: STATUS_THEME.danger.background,
  },
  bannerErrorText: {
    color: STATUS_THEME.danger.text,
  },
  bannerPending: {
    backgroundColor: COLOR.surface,
  },
  bannerPendingText: {
    color: COLOR.textMuted,
  },
  card: {
    backgroundColor: COLOR.surface,
    borderRadius: RADIUS.sheet,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLOR.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLOR.text,
  },
  textArea: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLOR.text,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  metaText: {
    fontSize: 12,
    color: COLOR.textMuted,
    marginBottom: SPACING.sm,
  },
  photoGrid: {
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.sm,
    backgroundColor: COLOR.background,
    borderWidth: 1,
    borderColor: COLOR.border,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photoThumbText: {
    fontSize: 11,
    color: COLOR.textMuted,
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: STATUS_THEME.danger.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveBtnText: {
    color: COLOR.onPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  addPhotoCard: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLOR.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoCardText: {
    color: COLOR.primary,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  signatureBadge: {
    backgroundColor: STATUS_THEME.success.background,
    borderWidth: 1,
    borderColor: STATUS_THEME.success.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    alignItems: 'center',
  },
  signatureBadgeText: {
    color: STATUS_THEME.success.text,
    fontWeight: '600',
    fontSize: 13,
  },
  secondaryActionBtn: {
    backgroundColor: COLOR.background,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  secondaryActionBtnText: {
    color: COLOR.text,
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    color: STATUS_THEME.danger.text,
    fontSize: 12,
    marginTop: 4,
  },
  primaryActionBtn: {
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  primaryActionBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  billLine: {
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billLineLabel: {
    fontSize: 14,
    color: COLOR.textMuted,
  },
  billLineValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLOR.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLOR.border,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLOR.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.primary,
  },
  commissionSplitBox: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  commissionSplitText: {
    fontSize: 12,
    color: COLOR.textMuted,
    fontWeight: '600',
  },
  paymentButtonsStack: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cashActionBtn: {
    backgroundColor: STATUS_THEME.success.border,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  cashActionBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  digitalActionBtn: {
    backgroundColor: COLOR.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  digitalActionBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  confirmedPayBox: {
    backgroundColor: STATUS_THEME.success.background,
    borderWidth: 1,
    borderColor: STATUS_THEME.success.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  confirmedPayText: {
    color: STATUS_THEME.success.text,
    fontWeight: '700',
    fontSize: 14,
  },
  digitalStatusBox: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLOR.border,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  digitalStatusChip: {
    backgroundColor: STATUS_THEME.warning.background,
    borderWidth: 1,
    borderColor: STATUS_THEME.warning.border,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
    alignItems: 'center',
  },
  digitalStatusText: {
    color: STATUS_THEME.warning.text,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLOR.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLOR.background,
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLOR.text,
    marginBottom: SPACING.sm,
  },
  modalBody: {
    fontSize: 14,
    color: COLOR.textMuted,
    marginBottom: SPACING.lg,
  },
  modalActions: {
    gap: SPACING.md,
    justifyContent: 'flex-end',
  },
  confirmCashBtn: {
    flex: 1,
    backgroundColor: STATUS_THEME.success.border,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  confirmCashBtnText: {
    color: COLOR.onPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  neutralModalBtn: {
    flex: 1,
    backgroundColor: COLOR.surface,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.border,
  },
  neutralModalBtnText: {
    color: COLOR.text,
    fontWeight: '600',
    fontSize: 14,
  },
});

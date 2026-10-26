/**
 * Screen P16 — Payout Methods Management (BP §13 P16; D-008, EXT-001, SEC-BASE-002, SEC-BASE-010, SEC-REVIEW #2).
 * Requirements:
 * - Bank account & Mobile wallet configuration.
 * - Masked account number display (SEC-BASE-002).
 * - PayoutProvider status: Not checked / Verified / Failed (EXT-001).
 * - Fresh OTP confirmation modal for EVERY add or remove action (BP §27, §30; SEC-REVIEW #2).
 * - 5 canonical screen states (loading, empty, success, error, pending).
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
import { translate } from '@kaamkaro/i18n';
import {
  RADIUS,
  SPACING,
  URDU_FONT_FAMILY,
  interactiveProps,
  minTapTargetStyle,
} from '@kaamkaro/ui';
import { usePartner } from '../state/PartnerContext';
import { getAppMirroring } from '../utils/rtl';
import type { PayoutMethodItem, PayoutMethodType, ScreenStateMode } from '../types';

import { SEEDED_BANKS, SEEDED_WALLETS, INITIAL_PAYOUT_METHODS } from '../mock-payment-data';

export { SEEDED_BANKS, SEEDED_WALLETS, INITIAL_PAYOUT_METHODS };

export interface P16PayoutMethodsScreenProps {
  initialMethods?: PayoutMethodItem[];
  mockState?: ScreenStateMode;
  onSaveMethod?: (method: Omit<PayoutMethodItem, 'id' | 'createdAt'>) => Promise<void>;
  onRemoveMethod?: (methodId: string) => Promise<void>;
}

export function P16PayoutMethodsScreen({
  initialMethods = INITIAL_PAYOUT_METHODS,
  mockState = 'success',
  onSaveMethod,
  onRemoveMethod,
}: P16PayoutMethodsScreenProps) {
  const { locale, goBack, phone } = usePartner();
  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;

  const [methods, setMethods] = useState<PayoutMethodItem[]>(initialMethods);
  const [screenState, setScreenState] = useState<ScreenStateMode>(mockState);

  // Form fields
  const [selectedType, setSelectedType] = useState<PayoutMethodType>('BANK_ACCOUNT');
  const [accountTitle, setAccountTitle] = useState('');
  const [bankName, setBankName] = useState(SEEDED_BANKS[0]);
  const [iban, setIban] = useState('');
  const [walletName, setWalletName] = useState(SEEDED_WALLETS[0]);
  const [walletNumber, setWalletNumber] = useState('');

  // OTP confirmation modal state (SEC-REVIEW #2: Fresh OTP for every add/remove)
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    { type: 'ADD' } | { type: 'REMOVE'; methodId: string } | null
  >(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInitiateAdd = () => {
    setErrorMessage(null);
    setFeedbackMessage(null);

    if (!accountTitle.trim()) {
      setErrorMessage(translate(locale, 'partner.p16.accountTitle'));
      return;
    }

    if (selectedType === 'BANK_ACCOUNT' && !iban.trim()) {
      setErrorMessage(translate(locale, 'partner.p16.iban'));
      return;
    }

    if (selectedType === 'MOBILE_WALLET' && !walletNumber.trim()) {
      setErrorMessage(translate(locale, 'partner.p16.walletNumber'));
      return;
    }

    // Open Fresh OTP verification dialog (SEC-REVIEW #2)
    setPendingAction({ type: 'ADD' });
    setOtpCode('');
    setOtpError(null);
    setOtpModalVisible(true);
  };

  const handleInitiateRemove = (methodId: string) => {
    setErrorMessage(null);
    setFeedbackMessage(null);

    // Open Fresh OTP verification dialog (SEC-REVIEW #2)
    setPendingAction({ type: 'REMOVE', methodId });
    setOtpCode('');
    setOtpError(null);
    setOtpModalVisible(true);
  };

  const handleConfirmOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setOtpError(translate(locale, 'partner.p16.otpPlaceholder'));
      return;
    }

    setOtpModalVisible(false);
    setScreenState('loading');

    try {
      if (pendingAction?.type === 'ADD') {
        const masked =
          selectedType === 'BANK_ACCOUNT'
            ? `PK•• •••• •••• ${iban.slice(-4) || '1234'}`
            : `${walletNumber.slice(0, 4)} ••• ${walletNumber.slice(-4) || '5678'}`;

        const newMethod: PayoutMethodItem = {
          id: `pm-${Date.now()}`,
          type: selectedType,
          accountTitle: accountTitle.trim(),
          bankOrWalletName: (selectedType === 'BANK_ACCOUNT' ? bankName : walletName) ?? 'Bank',
          maskedAccountNumber: masked,
          status: 'VERIFIED',
          createdAt: new Date().toISOString().split('T')[0] ?? '2026-10-26',
        };

        if (onSaveMethod) {
          await onSaveMethod(newMethod);
        }

        setMethods((prev) => [newMethod, ...prev]);
        setFeedbackMessage(translate(locale, 'partner.p16.savedSuccess'));
        setAccountTitle('');
        setIban('');
        setWalletNumber('');
        setScreenState('success');
      } else if (pendingAction?.type === 'REMOVE') {
        if (onRemoveMethod) {
          await onRemoveMethod(pendingAction.methodId);
        }
        setMethods((prev) => prev.filter((m) => m.id !== pendingAction.methodId));
        setFeedbackMessage(translate(locale, 'partner.p16.removedSuccess'));
        setScreenState('success');
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : translate(locale, 'partner.p16.saveFailed'),
      );
      setScreenState('error');
    } finally {
      setPendingAction(null);
    }
  };

  // 1. Loading State
  if (screenState === 'loading') {
    return (
      <View style={styles.stateCenterContainer} testID="p16-loading-state">
        <Text style={[styles.stateTitle, fontStyle]}>
          {translate(locale, 'partner.p16.loading')}
        </Text>
      </View>
    );
  }

  // 2. Error State
  if (screenState === 'error') {
    return (
      <View style={styles.stateCenterContainer} testID="p16-error-state">
        <Text style={[styles.stateTitle, fontStyle]}>
          {errorMessage || translate(locale, 'partner.p16.saveFailed')}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, minTapTargetStyle()]}
          onPress={() => setScreenState('success')}
          {...interactiveProps}
          testID="p16-retry-button"
        >
          <Text style={[styles.btnTextPrimary, fontStyle]}>
            {translate(locale, 'common.action.retry')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Pending/Unknown State (BP §31.1)
  if (screenState === 'pending') {
    return (
      <View style={styles.stateCenterContainer} testID="p16-pending-state">
        <Text style={[styles.stateTitle, fontStyle]}>
          {translate(locale, 'partner.p16.statePending')}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, minTapTargetStyle()]}
          onPress={() => setScreenState('success')}
          {...interactiveProps}
          testID="p16-pending-back-button"
        >
          <Text style={[styles.btnTextPrimary, fontStyle]}>
            {translate(locale, 'common.action.back')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} testID="p16-payout-methods-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          testID="p16-back-button"
          {...interactiveProps}
        >
          <Text style={[styles.backText, fontStyle]}>
            {`← ${translate(locale, 'common.action.back')}`}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p16.title')}
        </Text>
      </View>

      {/* Alerts */}
      {feedbackMessage && (
        <View style={styles.successBox} testID="p16-success-alert">
          <Text style={styles.successText}>{feedbackMessage}</Text>
        </View>
      )}

      {errorMessage && (
        <View style={styles.errorBox} testID="p16-error-alert">
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Saved Methods List */}
      <View style={styles.card} testID="p16-saved-methods-card">
        <Text style={[styles.sectionTitle, fontStyle]}>
          {translate(locale, 'partner.p16.savedMethods')}
        </Text>

        {methods.length === 0 ? (
          <Text style={[styles.emptyText, fontStyle]}>
            {translate(locale, 'partner.p16.emptyMethods')}
          </Text>
        ) : (
          methods.map((method) => {
            const statusLabel =
              method.status === 'VERIFIED'
                ? translate(locale, 'partner.p16.statusVerified')
                : method.status === 'FAILED'
                  ? translate(locale, 'partner.p16.statusFailed')
                  : translate(locale, 'partner.p16.statusNotChecked');

            return (
              <View
                key={method.id}
                style={styles.methodCard}
                testID={`p16-method-item-${method.id}`}
              >
                <View style={styles.methodHeader}>
                  <View>
                    <Text style={[styles.methodTitle, fontStyle]}>{method.accountTitle}</Text>
                    <Text style={[styles.methodSubtitle, fontStyle]}>
                      {`${method.bankOrWalletName} · ${method.maskedAccountNumber}`}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      method.status === 'VERIFIED'
                        ? styles.statusVerified
                        : method.status === 'FAILED'
                          ? styles.statusFailed
                          : styles.statusNotChecked,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{statusLabel}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.removeBtn, minTapTargetStyle()]}
                  onPress={() => handleInitiateRemove(method.id)}
                  testID={`p16-remove-method-${method.id}`}
                  {...interactiveProps}
                >
                  <Text style={[styles.removeBtnText, fontStyle]}>
                    {translate(locale, 'partner.p16.btnRemove')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* Add New Payout Method Card */}
      <View style={styles.card} testID="p16-add-method-card">
        <Text style={[styles.sectionTitle, fontStyle]}>
          {translate(locale, 'partner.p16.btnAddMethod')}
        </Text>

        {/* Method Type Segmented Buttons */}
        <Text style={[styles.inputLabel, fontStyle]}>
          {translate(locale, 'partner.p16.methodType')}
        </Text>
        <View style={styles.segmentedRow}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              selectedType === 'BANK_ACCOUNT' && styles.segmentBtnActive,
              minTapTargetStyle(),
            ]}
            onPress={() => setSelectedType('BANK_ACCOUNT')}
            testID="p16-type-bank-btn"
            {...interactiveProps}
          >
            <Text
              style={[
                styles.segmentText,
                selectedType === 'BANK_ACCOUNT' && styles.segmentTextActive,
                fontStyle,
              ]}
            >
              {translate(locale, 'partner.p16.bankAccount')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              selectedType === 'MOBILE_WALLET' && styles.segmentBtnActive,
              minTapTargetStyle(),
            ]}
            onPress={() => setSelectedType('MOBILE_WALLET')}
            testID="p16-type-wallet-btn"
            {...interactiveProps}
          >
            <Text
              style={[
                styles.segmentText,
                selectedType === 'MOBILE_WALLET' && styles.segmentTextActive,
                fontStyle,
              ]}
            >
              {translate(locale, 'partner.p16.mobileWallet')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Account Title */}
        <Text style={[styles.inputLabel, fontStyle]}>
          {translate(locale, 'partner.p16.accountTitle')}
        </Text>
        <TextInput
          style={styles.input}
          value={accountTitle}
          onChangeText={setAccountTitle}
          placeholder={translate(locale, 'partner.p16.accountTitlePlaceholder')}
          testID="p16-account-title-input"
        />

        {selectedType === 'BANK_ACCOUNT' ? (
          <>
            <Text style={[styles.inputLabel, fontStyle]}>
              {translate(locale, 'partner.p16.bank')}
            </Text>
            <View style={styles.selectRow}>
              {SEEDED_BANKS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.chipBtn, bankName === b && styles.chipBtnActive]}
                  onPress={() => setBankName(b)}
                  {...interactiveProps}
                >
                  <Text style={[styles.chipText, bankName === b && styles.chipTextActive]}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, fontStyle]}>
              {translate(locale, 'partner.p16.iban')}
            </Text>
            <TextInput
              style={styles.input}
              value={iban}
              onChangeText={setIban}
              placeholder={translate(locale, 'partner.p16.ibanPlaceholder')}
              autoCapitalize="characters"
              testID="p16-iban-input"
            />
          </>
        ) : (
          <>
            <Text style={[styles.inputLabel, fontStyle]}>
              {translate(locale, 'partner.p16.wallet')}
            </Text>
            <View style={styles.selectRow}>
              {SEEDED_WALLETS.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.chipBtn, walletName === w && styles.chipBtnActive]}
                  onPress={() => setWalletName(w)}
                  {...interactiveProps}
                >
                  <Text style={[styles.chipText, walletName === w && styles.chipTextActive]}>
                    {w}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, fontStyle]}>
              {translate(locale, 'partner.p16.walletNumber')}
            </Text>
            <TextInput
              style={styles.input}
              value={walletNumber}
              onChangeText={setWalletNumber}
              keyboardType="phone-pad"
              placeholder={translate(locale, 'partner.p16.walletNumberPlaceholder')}
              testID="p16-wallet-number-input"
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, minTapTargetStyle()]}
          onPress={handleInitiateAdd}
          testID="p16-add-method-btn"
          {...interactiveProps}
        >
          <Text style={[styles.btnTextPrimary, fontStyle]}>
            {translate(locale, 'partner.p16.btnAddMethod')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fresh OTP Modal (SEC-REVIEW #2, BP §27, §30) */}
      <Modal visible={otpModalVisible} transparent animationType="fade" testID="p16-otp-modal">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, fontStyle]}>
              {translate(locale, 'partner.p16.otpModalTitle')}
            </Text>
            <Text style={[styles.modalDesc, fontStyle]}>
              {translate(locale, 'partner.p16.otpModalDesc', { phone: phone || '0300 ••• 1234' })}
            </Text>

            {otpError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{otpError}</Text>
              </View>
            )}

            <TextInput
              style={[styles.input, styles.otpInput]}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="numeric"
              maxLength={6}
              placeholder={translate(locale, 'partner.p16.otpPlaceholder')}
              testID="p16-otp-code-input"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.secondaryBtn, minTapTargetStyle()]}
                onPress={() => setOtpModalVisible(false)}
                testID="p16-otp-cancel-btn"
                {...interactiveProps}
              >
                <Text style={[styles.btnTextSecondary, fontStyle]}>
                  {translate(locale, 'partner.p16.btnCancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, minTapTargetStyle()]}
                onPress={handleConfirmOtp}
                testID="p16-otp-confirm-btn"
                {...interactiveProps}
              >
                <Text style={[styles.btnTextPrimary, fontStyle]}>
                  {translate(locale, 'partner.p16.btnConfirmOtp')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    marginRight: SPACING.sm,
  },
  backText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: '#6C757D',
    fontSize: 14,
    fontStyle: 'italic',
  },
  methodCard: {
    borderWidth: 1,
    borderColor: '#DEE2E6',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  methodSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  statusVerified: {
    backgroundColor: '#E8F5E9',
  },
  statusFailed: {
    backgroundColor: '#FFEBEE',
  },
  statusNotChecked: {
    backgroundColor: '#FFF8E1',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212529',
  },
  removeBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
  },
  removeBtnText: {
    fontSize: 13,
    color: '#DC3545',
    fontWeight: '600',
  },
  segmentedRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  segmentText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 14,
    color: '#495057',
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  selectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  chipBtn: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  chipBtnActive: {
    backgroundColor: '#E7F1FF',
    borderColor: '#0066CC',
  },
  chipText: {
    fontSize: 13,
    color: '#495057',
  },
  chipTextActive: {
    color: '#0066CC',
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#0066CC',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  btnTextPrimary: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextSecondary: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
  },
  successBox: {
    backgroundColor: '#D4EDDA',
    borderColor: '#C3E6CB',
    borderWidth: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  successText: {
    color: '#155724',
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: '#F8D7DA',
    borderColor: '#F5C6CB',
    borderWidth: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#721C24',
    fontSize: 14,
  },
  stateCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  stateTitle: {
    fontSize: 16,
    color: '#212529',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#0066CC',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.sheet,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 380,
    gap: SPACING.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  modalDesc: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: SPACING.sm,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
});

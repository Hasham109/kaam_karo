/**
 * Screen P15 — Earnings, Wallet & "Pay company" (ARCH §6.8, D-020, D-021)
 * Requirements: LEDGER-PAY-001..007, LEDGER-NEG-001..005, COMM-004.
 */

import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
import { RADIUS, SPACING, URDU_FONT_FAMILY, interactiveProps } from '@kaamkaro/ui';
import { usePartner } from '../state/PartnerContext';
import { getAppMirroring } from '../utils/rtl';

export interface LedgerEntryItem {
  id: string;
  entryType: 'COMMISSION_DEBIT' | 'JOB_CREDIT' | 'COMPANY_PAYMENT_CREDIT';
  amountMinor: number;
  direction: 'CREDIT' | 'DEBIT';
  reason: string;
  createdAt: string;
}

export interface CommissionSubmissionItem {
  id: string;
  amountMinor: number;
  transactionRef: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  decisionReason?: string;
}

interface P15EarningsWalletScreenProps {
  initialBalanceMinor?: number;
  ledgerEntries?: LedgerEntryItem[];
  submissions?: CommissionSubmissionItem[];
  onSubmitPayment?: (
    amountMinor: number,
    transactionRef: string,
    screenshotMediaId?: string,
  ) => Promise<void>;
}

export function P15EarningsWalletScreen({
  initialBalanceMinor = -60000, // Rs. -600 (worked example from ARCH §6.8)
  ledgerEntries = [
    {
      id: 'entry-001',
      entryType: 'COMMISSION_DEBIT',
      amountMinor: 60000,
      direction: 'DEBIT',
      reason: 'Platform commission deduction for Cash Booking #BK-78912',
      createdAt: '2026-10-25 12:00 PKT',
    },
  ],
  submissions: initialSubmissions = [],
  onSubmitPayment,
}: P15EarningsWalletScreenProps) {
  const { locale, goBack } = usePartner();
  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;

  const [balanceMinor] = useState(initialBalanceMinor);
  const [submissions, setSubmissions] = useState<CommissionSubmissionItem[]>(initialSubmissions);
  const [payAmountRs, setPayAmountRs] = useState(
    balanceMinor < 0 ? String(Math.abs(balanceMinor) / 100) : '',
  );
  const [transactionRef, setTransactionRef] = useState('');
  const [screenshotSelected, setScreenshotSelected] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBlocked = balanceMinor < 0;
  const owedRs = Math.abs(balanceMinor) / 100;

  const handlePayCompanySubmit = async () => {
    setErrorMessage(null);
    setFeedbackMessage(null);

    const parsedRs = parseFloat(payAmountRs);
    if (isNaN(parsedRs) || parsedRs <= 0) {
      setErrorMessage(
        isUrdu ? 'برائے مہربانی درست رقم درج کریں' : 'Please enter a valid payment amount.',
      );
      return;
    }

    if (!transactionRef.trim()) {
      setErrorMessage(
        isUrdu
          ? 'ٹرانزیکشن ریفرنس نمبر درکار ہے'
          : 'Bank/Wallet transaction reference is required (LEDGER-PAY-002).',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const amountMinor = Math.round(parsedRs * 100);
      if (onSubmitPayment) {
        await onSubmitPayment(
          amountMinor,
          transactionRef.trim(),
          screenshotSelected ? 'media-screenshot-123' : undefined,
        );
      }

      const newSubmission: CommissionSubmissionItem = {
        id: `sub-${Date.now()}`,
        amountMinor,
        transactionRef: transactionRef.trim(),
        status: 'SUBMITTED',
        submittedAt: 'Just now',
      };

      setSubmissions((prev) => [newSubmission, ...prev]);
      setFeedbackMessage(
        isUrdu
          ? 'ادائیگی جمع ہو گئی۔ فنانس کی تصدیق تک بلاک برقرار رہے گا۔'
          : 'Payment claim submitted. Your account will remain blocked until verified by Finance (D-021).',
      );
      setTransactionRef('');
      setScreenshotSelected(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} testID="p15-earnings-wallet-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backButton}
          testID="p15-back-button"
          {...interactiveProps}
        >
          <Text style={[styles.backText, fontStyle]}>
            {`← ${translate(locale, 'common.action.back')}`}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, fontStyle, { textAlign: mirroring.textAlign }]}>
          {translate(locale, 'partner.p15.title')}
        </Text>
      </View>

      {/* Balance Card */}
      <View style={styles.card} testID="p15-balance-card">
        <Text style={[styles.label, fontStyle]}>
          {translate(locale, 'partner.p15.currentBalance')}
        </Text>
        <Text
          style={[styles.balanceText, isBlocked ? styles.negativeBalance : styles.positiveBalance]}
          testID="p15-balance-amount"
        >
          {formatPkr(locale, Math.round(balanceMinor / 100))}
        </Text>
      </View>

      {/* Unpaid Commission Block Banner (D-020, D-021, LEDGER-NEG-003) */}
      {isBlocked && (
        <View style={styles.bannerBlock} testID="p15-unpaid-commission-banner">
          <Text style={styles.bannerIcon}>⚠️</Text>
          <View style={styles.bannerContent}>
            <Text style={[styles.bannerTitle, fontStyle]}>
              {translate(locale, 'partner.p15.unpaidBlockTitle')}
            </Text>
            <Text style={[styles.bannerDescription, fontStyle]}>
              {translate(locale, 'partner.p15.unpaidBlockDesc', {
                amount: formatPkr(locale, owedRs),
              })}
            </Text>
          </View>
        </View>
      )}

      {/* Pay Company Form */}
      {isBlocked && (
        <View style={styles.card} testID="p15-pay-company-card">
          <Text style={[styles.sectionTitle, fontStyle]}>
            {translate(locale, 'partner.p15.payCompany')}
          </Text>
          <Text style={[styles.companyAccountDetails, fontStyle]}>
            {translate(locale, 'partner.p15.bankDetails')}
          </Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {feedbackMessage && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{feedbackMessage}</Text>
            </View>
          )}

          <Text style={[styles.inputLabel, fontStyle]}>
            {translate(locale, 'partner.p15.amountLabel')}
          </Text>
          <TextInput
            style={styles.input}
            value={payAmountRs}
            onChangeText={setPayAmountRs}
            keyboardType="numeric"
            placeholder={translate(locale, 'partner.p15.amountPlaceholder')}
            testID="p15-pay-amount-input"
          />

          <Text style={[styles.inputLabel, fontStyle]}>
            {translate(locale, 'partner.p15.refLabel')}
          </Text>
          <TextInput
            style={styles.input}
            value={transactionRef}
            onChangeText={setTransactionRef}
            placeholder={translate(locale, 'partner.p15.refPlaceholder')}
            autoCapitalize="characters"
            testID="p15-transaction-ref-input"
          />

          <TouchableOpacity
            style={styles.photoPickerBtn}
            onPress={() => setScreenshotSelected(!screenshotSelected)}
            testID="p15-screenshot-picker-btn"
            {...interactiveProps}
          >
            <Text style={[styles.photoPickerText, fontStyle]}>
              {screenshotSelected
                ? translate(locale, 'partner.p15.screenshotAttached')
                : translate(locale, 'partner.p15.attachScreenshot')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
            disabled={isSubmitting}
            onPress={handlePayCompanySubmit}
            testID="p15-submit-payment-btn"
            {...interactiveProps}
          >
            <Text style={[styles.submitButtonText, fontStyle]}>
              {isSubmitting
                ? translate(locale, 'partner.p15.submittingBtn')
                : translate(locale, 'partner.p15.submitBtn')}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.disclaimerText, fontStyle]}>
            {translate(locale, 'partner.p15.disclaimer')}
          </Text>
        </View>
      )}

      {/* Submissions Queue History */}
      {submissions.length > 0 && (
        <View style={styles.card} testID="p15-submissions-card">
          <Text style={[styles.sectionTitle, fontStyle]}>
            {translate(locale, 'partner.p15.recentSubmissions')}
          </Text>
          {submissions.map((sub) => (
            <View key={sub.id} style={styles.submissionRow}>
              <View>
                <Text style={styles.subRef}>{sub.transactionRef}</Text>
                <Text style={styles.subTime}>{sub.submittedAt}</Text>
              </View>
              <View style={styles.subRight}>
                <Text style={styles.subAmount}>
                  {formatPkr(locale, Math.round(sub.amountMinor / 100))}
                </Text>
                <View
                  style={[
                    styles.statusTag,
                    sub.status === 'APPROVED'
                      ? styles.statusApproved
                      : sub.status === 'REJECTED'
                        ? styles.statusRejected
                        : styles.statusSubmitted,
                  ]}
                >
                  <Text style={styles.statusText}>{sub.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Ledger History */}
      <View style={styles.card} testID="p15-ledger-history-card">
        <Text style={[styles.sectionTitle, fontStyle]}>
          {translate(locale, 'partner.p15.ledgerHistory')}
        </Text>
        {ledgerEntries.map((entry) => (
          <View key={entry.id} style={styles.ledgerRow}>
            <View style={styles.ledgerInfo}>
              <Text style={styles.ledgerReason}>{entry.reason}</Text>
              <Text style={styles.ledgerDate}>{entry.createdAt}</Text>
            </View>
            <Text
              style={[
                styles.ledgerImpact,
                entry.direction === 'CREDIT' ? styles.positiveBalance : styles.negativeBalance,
              ]}
            >
              {`${entry.direction === 'CREDIT' ? '+' : '-'} ${formatPkr(locale, Math.round(entry.amountMinor / 100))}`}
            </Text>
          </View>
        ))}
      </View>
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
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: SPACING.xs,
  },
  balanceText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  positiveBalance: {
    color: '#28A745',
  },
  negativeBalance: {
    color: '#DC3545',
  },
  bannerBlock: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEEBA',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  bannerIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: SPACING.xs,
  },
  bannerDescription: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: SPACING.sm,
  },
  companyAccountDetails: {
    fontSize: 13,
    color: '#495057',
    backgroundColor: '#E9ECEF',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    fontSize: 16,
    marginBottom: SPACING.md,
    backgroundColor: '#FFFFFF',
  },
  photoPickerBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#0066CC',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  photoPickerText: {
    color: '#0066CC',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: '#F8D7DA',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: '#721C24',
    fontSize: 13,
  },
  successBox: {
    backgroundColor: '#D4EDDA',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  successText: {
    color: '#155724',
    fontSize: 13,
  },
  submissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  subRef: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  subTime: {
    fontSize: 12,
    color: '#6C757D',
  },
  subRight: {
    alignItems: 'flex-end',
  },
  subAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 2,
  },
  statusTag: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusSubmitted: {
    backgroundColor: '#FFF3CD',
  },
  statusApproved: {
    backgroundColor: '#D4EDDA',
  },
  statusRejected: {
    backgroundColor: '#F8D7DA',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  ledgerInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  ledgerReason: {
    fontSize: 13,
    color: '#212529',
  },
  ledgerDate: {
    fontSize: 11,
    color: '#6C757D',
  },
  ledgerImpact: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

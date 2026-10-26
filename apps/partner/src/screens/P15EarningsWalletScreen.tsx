/**
 * Screen P15 — Earnings, Wallet & "Pay company" (ARCH §6.8, D-016, D-020, D-021; BP §13 P15; BP §26)
 * Requirements:
 * - Balance & buckets (Pending, Available, Paid out) per OQ-070.
 * - Unrecorded billing jobs list with "Record payment" navigation to P14 (LEDGER-001).
 * - Full ledger history with all types: Commission debit, Job credit, Company payment, Settlement, Reversal.
 * - Row tap job breakdown: Bill, Labour, Commission, Share (COMM-004).
 * - Settlement status display: "Paid out to you" / "Being processed" (PAY-007).
 * - "Pay company" section with transaction ID, amount, and screenshot submission.
 * - Button to navigate to Payout methods (P16).
 * - 5 canonical screen states (loading, empty, success, error, pending).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatPkr, translate } from '@kaamkaro/i18n';
import {
  RADIUS,
  SPACING,
  URDU_FONT_FAMILY,
  interactiveProps,
  minTapTargetStyle,
} from '@kaamkaro/ui';
import { usePartner } from '../state/PartnerContext';
import { getAppMirroring } from '../utils/rtl';
import type { ScreenStateMode } from '../types';

import {
  type LedgerJobBreakdown,
  type LedgerEntryItem,
  type CommissionSubmissionItem,
  type UnrecordedBillingJob,
  INITIAL_LEDGER_ENTRIES,
} from '../mock-payment-data';

export type { LedgerJobBreakdown, LedgerEntryItem, CommissionSubmissionItem, UnrecordedBillingJob };
export { INITIAL_LEDGER_ENTRIES };

export interface P15EarningsWalletScreenProps {
  initialBalanceMinor?: number;
  pendingMinor?: number;
  availableMinor?: number;
  paidMinor?: number;
  ledgerEntries?: LedgerEntryItem[];
  submissions?: CommissionSubmissionItem[];
  unrecordedJobs?: UnrecordedBillingJob[];
  mockState?: ScreenStateMode;
  onSubmitPayment?: (
    amountMinor: number,
    transactionRef: string,
    screenshotMediaId?: string,
  ) => Promise<void>;
}

export function P15EarningsWalletScreen({
  initialBalanceMinor = -60000, // Rs. -600 (worked example from ARCH §6.8)
  pendingMinor = 0,
  availableMinor = 0,
  paidMinor = 320000,
  ledgerEntries = INITIAL_LEDGER_ENTRIES,
  submissions: initialSubmissions = [],
  unrecordedJobs = [],
  mockState = 'success',
  onSubmitPayment,
}: P15EarningsWalletScreenProps) {
  const { locale, goBack, navigate } = usePartner();
  const mirroring = getAppMirroring(locale);
  const isUrdu = locale === 'ur';
  const fontStyle = isUrdu ? { fontFamily: URDU_FONT_FAMILY } : undefined;

  const [screenState, setScreenState] = useState<ScreenStateMode>(mockState);
  const [balanceMinor] = useState(initialBalanceMinor);
  const [submissions, setSubmissions] = useState<CommissionSubmissionItem[]>(initialSubmissions);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

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

  const handleCopyAccountDetails = () => {
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleToggleRow = (rowId: string) => {
    setExpandedRowId((prev) => (prev === rowId ? null : rowId));
  };

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

  // 1. Loading State
  if (screenState === 'loading') {
    return (
      <View style={styles.stateCenterContainer} testID="p15-loading-state">
        <Text style={[styles.stateTitle, fontStyle]}>
          {translate(locale, 'partner.p15.statePending')}
        </Text>
      </View>
    );
  }

  // 2. Error State
  if (screenState === 'error') {
    return (
      <View style={styles.stateCenterContainer} testID="p15-error-state">
        <Text style={[styles.stateTitle, fontStyle]}>
          {translate(locale, 'partner.p15.stateError')}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, minTapTargetStyle()]}
          onPress={() => setScreenState('success')}
          testID="p15-retry-button"
          {...interactiveProps}
        >
          <Text style={[styles.retryBtnText, fontStyle]}>
            {translate(locale, 'common.action.retry')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Pending/Unknown State (BP §31.1)
  if (screenState === 'pending') {
    return (
      <View style={styles.stateCenterContainer} testID="p15-pending-state">
        <Text style={[styles.stateTitle, fontStyle]}>
          {translate(locale, 'partner.p15.pendingOffline')}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, minTapTargetStyle()]}
          onPress={() => setScreenState('success')}
          testID="p15-pending-back-button"
          {...interactiveProps}
        >
          <Text style={[styles.retryBtnText, fontStyle]}>
            {translate(locale, 'common.action.back')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 4. Empty State
  const isEmpty = ledgerEntries.length === 0 && !isBlocked;
  if (screenState === 'empty' || isEmpty) {
    return (
      <View style={styles.stateCenterContainer} testID="p15-empty-state">
        <Text style={[styles.stateTitle, fontStyle]}>
          {translate(locale, 'partner.p15.emptyHistory')}
        </Text>
        <TouchableOpacity
          style={[styles.payoutNavBtn, minTapTargetStyle()]}
          onPress={() => navigate('P16')}
          testID="p15-empty-payout-methods-button"
          {...interactiveProps}
        >
          <Text style={[styles.payoutNavBtnText, fontStyle]}>
            {translate(locale, 'partner.p15.btnPayoutMethods')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          {isBlocked
            ? translate(locale, 'partner.p15.youOweVal', {
                amount: formatPkr(locale, owedRs),
              })
            : translate(locale, 'partner.p15.balanceVal', {
                amount: formatPkr(locale, Math.round(balanceMinor / 100)),
              })}
        </Text>

        {/* Earnings Buckets (OQ-070) */}
        <View style={styles.bucketsRow}>
          <View style={styles.bucketCol}>
            <Text style={[styles.bucketLabel, fontStyle]}>
              {translate(locale, 'partner.p15.pending')}
            </Text>
            <Text style={styles.bucketValue}>
              {formatPkr(locale, Math.round(pendingMinor / 100))}
            </Text>
          </View>
          <View style={styles.bucketDivider} />
          <View style={styles.bucketCol}>
            <Text style={[styles.bucketLabel, fontStyle]}>
              {translate(locale, 'partner.p15.available')}
            </Text>
            <Text style={styles.bucketValue}>
              {formatPkr(locale, Math.round(availableMinor / 100))}
            </Text>
          </View>
          <View style={styles.bucketDivider} />
          <View style={styles.bucketCol}>
            <Text style={[styles.bucketLabel, fontStyle]}>
              {translate(locale, 'partner.p15.paidOut')}
            </Text>
            <Text style={styles.bucketValue}>{formatPkr(locale, Math.round(paidMinor / 100))}</Text>
          </View>
        </View>

        {/* Navigation to Payout Methods (P16) */}
        <TouchableOpacity
          style={[styles.payoutNavBtn, minTapTargetStyle()]}
          onPress={() => navigate('P16')}
          testID="p15-payout-methods-button"
          {...interactiveProps}
        >
          <Text style={[styles.payoutNavBtnText, fontStyle]}>
            {`💳 ${translate(locale, 'partner.p15.btnPayoutMethods')} →`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Unrecorded Billing Section (D-016, LEDGER-001) */}
      {unrecordedJobs.length > 0 && (
        <View style={styles.card} testID="p15-unrecorded-billing-card">
          <Text style={[styles.sectionTitle, fontStyle]}>
            {translate(locale, 'partner.p15.recordBilling')}
          </Text>
          {unrecordedJobs.map((job) => (
            <View key={job.bookingId} style={styles.unrecordedJobRow}>
              <View style={styles.unrecordedJobInfo}>
                <Text style={styles.jobRef}>{job.bookingRef}</Text>
                <Text style={styles.jobTitle}>{job.serviceTitle}</Text>
                <Text style={styles.jobAmount}>{formatPkr(locale, job.amountPkr)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.recordPaymentBtn, minTapTargetStyle()]}
                onPress={() => navigate('P14')}
                testID={`p15-record-payment-${job.bookingId}`}
                {...interactiveProps}
              >
                <Text style={[styles.recordPaymentBtnText, fontStyle]}>
                  {translate(locale, 'partner.p15.recordPaymentBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

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

          {/* Copy Account Button */}
          <TouchableOpacity
            style={[styles.copyBtn, minTapTargetStyle()]}
            onPress={handleCopyAccountDetails}
            testID="p15-copy-account-btn"
            {...interactiveProps}
          >
            <Text style={[styles.copyBtnText, fontStyle]}>
              {copiedAccount
                ? `✓ ${translate(locale, 'partner.p15.copied')}`
                : `📋 ${translate(locale, 'partner.p15.copyAccount')}`}
            </Text>
          </TouchableOpacity>

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
            testID="p15-ref-input"
          />

          <TouchableOpacity
            style={[styles.attachButton, minTapTargetStyle()]}
            onPress={() => setScreenshotSelected(!screenshotSelected)}
            testID="p15-attach-screenshot-btn"
            {...interactiveProps}
          >
            <Text style={[styles.attachText, fontStyle]}>
              {screenshotSelected
                ? translate(locale, 'partner.p15.screenshotAttached')
                : translate(locale, 'partner.p15.attachScreenshot')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
              minTapTargetStyle(),
            ]}
            onPress={handlePayCompanySubmit}
            disabled={isSubmitting}
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

      {/* Submissions List */}
      {submissions.length > 0 && (
        <View style={styles.card} testID="p15-submissions-card">
          <Text style={[styles.sectionTitle, fontStyle]}>
            {translate(locale, 'partner.p15.recentSubmissions')}
          </Text>
          {submissions.map((sub) => (
            <View key={sub.id} style={styles.subItem}>
              <View style={styles.subLeft}>
                <Text style={styles.subRef}>{sub.transactionRef}</Text>
                <Text style={styles.subDate}>{sub.submittedAt}</Text>
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

      {/* Ledger History (Full History, +/- rows, Breakdown on tap, Settlement status) */}
      <View style={styles.card} testID="p15-ledger-history-card">
        <Text style={[styles.sectionTitle, fontStyle]}>
          {translate(locale, 'partner.p15.ledgerHistory')}
        </Text>
        {ledgerEntries.map((entry) => {
          const isExpanded = expandedRowId === entry.id;

          let typeLabel = entry.reason;
          if (entry.entryType === 'COMMISSION_DEBIT') {
            typeLabel = translate(locale, 'partner.p15.rowCommissionDebit', {
              id: entry.bookingRef || 'BK',
            });
          } else if (entry.entryType === 'JOB_CREDIT') {
            typeLabel = translate(locale, 'partner.p15.rowJobCredit', {
              id: entry.bookingRef || 'BK',
            });
          } else if (entry.entryType === 'COMPANY_PAYMENT_CREDIT') {
            typeLabel = translate(locale, 'partner.p15.rowCompanyPayment');
          } else if (entry.entryType === 'SETTLEMENT') {
            typeLabel = translate(locale, 'partner.p15.rowSettlement');
          } else if (entry.entryType === 'REVERSAL') {
            typeLabel = translate(locale, 'partner.p15.rowReversal', {
              row: entry.bookingRef || entry.id,
            });
          }

          return (
            <TouchableOpacity
              key={entry.id}
              style={styles.ledgerRow}
              onPress={() => entry.jobBreakdown && handleToggleRow(entry.id)}
              activeOpacity={entry.jobBreakdown ? 0.7 : 1}
              testID={`p15-ledger-row-${entry.id}`}
              {...interactiveProps}
            >
              <View style={styles.ledgerTopRow}>
                <View style={styles.ledgerInfo}>
                  <Text style={[styles.ledgerReason, fontStyle]}>{typeLabel}</Text>
                  <Text style={styles.ledgerDate}>{entry.createdAt}</Text>
                  {entry.settlementStatus && (
                    <Text style={styles.settlementStatusText}>
                      {translate(locale, 'partner.p15.settlementStatus', {
                        status:
                          entry.settlementStatus === 'SETTLED'
                            ? translate(locale, 'partner.p15.statusPaidOut')
                            : translate(locale, 'partner.p15.statusBeingProcessed'),
                      })}
                    </Text>
                  )}
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

              {/* Job Breakdown on row tap (COMM-004) */}
              {isExpanded && entry.jobBreakdown && (
                <View style={styles.breakdownBox} testID={`p15-breakdown-${entry.id}`}>
                  <Text style={[styles.breakdownText, fontStyle]}>
                    {translate(locale, 'partner.p15.jobBreakdown', {
                      bill: String(entry.jobBreakdown.billPkr),
                      labour: String(entry.jobBreakdown.labourPkr),
                      commission: String(entry.jobBreakdown.commissionPkr),
                      share: String(entry.jobBreakdown.sharePkr),
                    })}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
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
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: SPACING.xs,
  },
  balanceText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  positiveBalance: {
    color: '#28A745',
  },
  negativeBalance: {
    color: '#DC3545',
  },
  bucketsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  bucketCol: {
    flex: 1,
    alignItems: 'center',
  },
  bucketLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 2,
  },
  bucketValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  bucketDivider: {
    width: 1,
    backgroundColor: '#DEE2E6',
    marginVertical: 4,
  },
  payoutNavBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
  },
  payoutNavBtnText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '600',
  },
  bannerBlock: {
    flexDirection: 'row',
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEEBA',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  bannerIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: SPACING.md,
  },
  companyAccountDetails: {
    fontSize: 14,
    color: '#495057',
    backgroundColor: '#E9ECEF',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  copyBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginBottom: SPACING.sm,
  },
  copyBtnText: {
    fontSize: 13,
    color: '#0066CC',
    fontWeight: '600',
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
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  attachButton: {
    borderWidth: 1,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  attachText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#0066CC',
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  submitButtonDisabled: {
    backgroundColor: '#6C757D',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  subItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#DEE2E6',
  },
  subLeft: {
    flex: 1,
  },
  subRef: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  subDate: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  subRight: {
    alignItems: 'flex-end',
  },
  subAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#212529',
  },
  statusTag: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: 2,
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
    fontSize: 11,
    fontWeight: 'bold',
    color: '#212529',
  },
  ledgerRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#DEE2E6',
  },
  ledgerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerInfo: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  ledgerReason: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '500',
  },
  ledgerDate: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  settlementStatusText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
    marginTop: 2,
  },
  ledgerImpact: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  breakdownBox: {
    backgroundColor: '#F8F9FA',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  breakdownText: {
    fontSize: 13,
    color: '#495057',
  },
  unrecordedJobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#DEE2E6',
  },
  unrecordedJobInfo: {
    flex: 1,
  },
  jobRef: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  jobTitle: {
    fontSize: 13,
    color: '#212529',
  },
  jobAmount: {
    fontSize: 13,
    color: '#6C757D',
  },
  recordPaymentBtn: {
    backgroundColor: '#28A745',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  recordPaymentBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
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
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

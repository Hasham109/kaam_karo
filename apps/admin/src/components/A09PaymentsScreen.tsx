/**
 * Screen A09 — Payments, Exceptions, Provider Accounts & Settlements
 * Source of Truth: docs/screens/admin.md §A09, docs/screens/flows.md §4b
 * Requirements: LEDGER-PAY-001..007, LEDGER-NEG-001..005, ROLE-003, ABUSE-010, D-016, D-020, D-021, PAY-001..009.
 *
 * CRITICAL ACCESS CONTROL:
 * Only Finance and Super Admin roles can access this screen.
 * Separation of duty: staff cannot approve their own submissions (ABUSE-010).
 *
 * Tabs: Transactions · Exceptions · Provider accounts · Commission payments to verify · Settlements.
 */

'use client';

import { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export type A09Tab = 'transactions' | 'exceptions' | 'providers' | 'verify' | 'settlements';

export interface CommissionSubmissionItem {
  id: string;
  providerProfileId: string;
  providerName: string;
  amountMinor: number;
  transactionRef: string;
  submittedByUserId: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  screenshotUrl?: string;
  decisionReason?: string;
}

export interface PaymentTransactionItem {
  id: string;
  bookingRef: string;
  amountMinor: number;
  method: 'CASH' | 'DIGITAL';
  status: 'PAID' | 'PROCESSING' | 'FAILED';
  gatewayRef?: string;
  createdAt: string;
}

export interface PaymentExceptionItem {
  id: string;
  type: 'RECONCILIATION_MISMATCH' | 'FAILED_OR_STUCK' | 'TAX_RULE_UNSET' | 'DIGITAL_UNCONFIRMED';
  bookingRef?: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM';
  detectedAt: string;
}

export interface AdminLedgerRow {
  id: string;
  entryType:
    'COMMISSION_DEBIT' | 'JOB_CREDIT' | 'COMPANY_PAYMENT_CREDIT' | 'SETTLEMENT' | 'REVERSAL';
  amountMinor: number;
  direction: 'CREDIT' | 'DEBIT';
  bookingRef?: string;
  reason: string;
  createdAt: string;
}

export interface ProviderAccountItem {
  providerId: string;
  providerName: string;
  balanceMinor: number;
  owesCompany: boolean;
  ledgerRows: AdminLedgerRow[];
}

export interface SettlementItem {
  id: string;
  providerId: string;
  providerName: string;
  amountMinor: number;
  reference: string;
  status: 'SETTLED' | 'PROCESSING';
  createdAt: string;
}

export const INITIAL_SUBMISSIONS: CommissionSubmissionItem[] = [
  {
    id: 'sub-001',
    providerProfileId: 'prov-prof-101',
    providerName: 'Akram Electrician',
    amountMinor: 60000, // Rs. 600
    transactionRef: 'EP-9823411',
    submittedByUserId: 'usr-p101',
    submittedAt: '2026-10-25 14:30 PKT',
    status: 'SUBMITTED',
    screenshotUrl: 'https://cdn.kaamkaro.pk/receipts/ep-9823411.jpg',
  },
  {
    id: 'sub-002',
    providerProfileId: 'prov-prof-102',
    providerName: 'Rashid Plumber',
    amountMinor: 45000, // Rs. 450
    transactionRef: 'JC-4412093',
    submittedByUserId: 'usr-p102',
    submittedAt: '2026-10-25 15:10 PKT',
    status: 'SUBMITTED',
  },
];

export const INITIAL_TRANSACTIONS: PaymentTransactionItem[] = [
  {
    id: 'pay-001',
    bookingRef: 'BK-78912',
    amountMinor: 370000,
    method: 'DIGITAL',
    status: 'PAID',
    gatewayRef: 'GW-8849102',
    createdAt: '2026-10-25 14:15 PKT',
  },
  {
    id: 'pay-002',
    bookingRef: 'BK-78401',
    amountMinor: 180000,
    method: 'CASH',
    status: 'PAID',
    createdAt: '2026-10-24 11:30 PKT',
  },
  {
    id: 'pay-003',
    bookingRef: 'BK-78990',
    amountMinor: 250000,
    method: 'DIGITAL',
    status: 'PROCESSING',
    createdAt: '2026-10-25 16:00 PKT',
  },
];

export const INITIAL_EXCEPTIONS: PaymentExceptionItem[] = [
  {
    id: 'exc-001',
    type: 'DIGITAL_UNCONFIRMED',
    bookingRef: 'BK-78990',
    description:
      'DIGITAL recorded by provider but no gateway confirmation arrived within flag hours (KK-T5)',
    severity: 'HIGH',
    detectedAt: '2026-10-25 17:00 PKT',
  },
  {
    id: 'exc-002',
    type: 'TAX_RULE_UNSET',
    description:
      'Tax configuration is unset (TODO OWNER) — invoices generated at Rs. 0 launch tax (D-029)',
    severity: 'MEDIUM',
    detectedAt: '2026-10-20 00:00 PKT',
  },
];

export const INITIAL_PROVIDER_ACCOUNTS: ProviderAccountItem[] = [
  {
    providerId: 'prov-prof-101',
    providerName: 'Akram Electrician',
    balanceMinor: -60000,
    owesCompany: true,
    ledgerRows: [
      {
        id: 'led-001',
        entryType: 'COMMISSION_DEBIT',
        amountMinor: 60000,
        direction: 'DEBIT',
        bookingRef: 'BK-78912',
        reason: 'Commission deduction for Cash job BK-78912',
        createdAt: '2026-10-25 12:00 PKT',
      },
    ],
  },
  {
    providerId: 'prov-prof-102',
    providerName: 'Rashid Plumber',
    balanceMinor: 320000,
    owesCompany: false,
    ledgerRows: [
      {
        id: 'led-002',
        entryType: 'JOB_CREDIT',
        amountMinor: 320000,
        direction: 'CREDIT',
        bookingRef: 'BK-78401',
        reason: 'Earnings credit for Digital job BK-78401',
        createdAt: '2026-10-24 16:30 PKT',
      },
    ],
  },
];

export const INITIAL_SETTLEMENTS: SettlementItem[] = [
  {
    id: 'stl-001',
    providerId: 'prov-prof-102',
    providerName: 'Rashid Plumber',
    amountMinor: 320000,
    reference: 'HBL-STL-9901',
    status: 'SETTLED',
    createdAt: '2026-10-24 18:00 PKT',
  },
];

interface A09PaymentsScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
  onDecideSubmission?: (
    submissionId: string,
    action: 'APPROVE' | 'REJECT',
    reason: string,
  ) => Promise<void>;
  onCreateCorrection?: (
    providerId: string,
    originalRowId: string,
    amountMinor: number,
    reason: string,
  ) => Promise<void>;
  onRecordSettlement?: (
    providerId: string,
    amountMinor: number,
    reference: string,
    reason: string,
  ) => Promise<void>;
}

export function A09PaymentsScreen({
  onReturnToDashboard,
  mockScreenState: _mockScreenState,
  onDecideSubmission,
  onCreateCorrection,
  onRecordSettlement,
}: A09PaymentsScreenProps) {
  const { user } = useAdminAuth();
  const effectiveAccess = resolveEffectiveAccess(user?.subRoles ?? [], 'A09');

  const [activeTab, setActiveTab] = useState<A09Tab>('verify');
  const [submissions, setSubmissions] = useState<CommissionSubmissionItem[]>(INITIAL_SUBMISSIONS);
  const [transactions] = useState<PaymentTransactionItem[]>(INITIAL_TRANSACTIONS);
  const [exceptions] = useState<PaymentExceptionItem[]>(INITIAL_EXCEPTIONS);
  const [providerAccounts, setProviderAccounts] =
    useState<ProviderAccountItem[]>(INITIAL_PROVIDER_ACCOUNTS);
  const [settlements, setSettlements] = useState<SettlementItem[]>(INITIAL_SETTLEMENTS);

  // Modals state
  const [selectedSub, setSelectedSub] = useState<CommissionSubmissionItem | null>(null);
  const [decisionModalAction, setDecisionModalAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');

  // Correction Modal
  const [correctionTarget, setCorrectionTarget] = useState<{
    provider: ProviderAccountItem;
    row: AdminLedgerRow;
  } | null>(null);
  const [correctionAmountRs, setCorrectionAmountRs] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Settlement Modal
  const [settlementTarget, setSettlementTarget] = useState<ProviderAccountItem | null>(null);
  const [settlementAmountRs, setSettlementAmountRs] = useState('');
  const [settlementRef, setSettlementRef] = useState('');
  const [settlementReason, setSettlementReason] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Hard authorization boundary check
  if (effectiveAccess === 'none') {
    return (
      <Forbidden403View
        screenId="A09"
        screenTitle="Payments & Commission Queue"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  // Handle Commission Verification Decision
  const openDecisionModal = (sub: CommissionSubmissionItem, action: 'APPROVE' | 'REJECT') => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Separation of duty client guard (ABUSE-010)
    if (sub.submittedByUserId === user?.id) {
      setErrorMessage(
        'Separation of duty violation: You cannot decide your own payment submission (ABUSE-010)',
      );
      return;
    }

    setSelectedSub(sub);
    setDecisionModalAction(action);
    setDecisionReason('');
  };

  const handleConfirmDecision = async () => {
    if (!selectedSub || !decisionModalAction) return;

    if (!decisionReason.trim()) {
      setErrorMessage('Mandatory audit reason is required for Finance decisions (ROLE-003)');
      return;
    }

    try {
      if (onDecideSubmission) {
        await onDecideSubmission(selectedSub.id, decisionModalAction, decisionReason.trim());
      }

      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === selectedSub.id
            ? {
                ...item,
                status: decisionModalAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                decisionReason: decisionReason.trim(),
              }
            : item,
        ),
      );

      setSuccessMessage(
        decisionModalAction === 'APPROVE'
          ? `Submission ${selectedSub.transactionRef} approved. COMPANY_PAYMENT_CREDIT recorded.`
          : `Submission ${selectedSub.transactionRef} rejected.`,
      );

      setSelectedSub(null);
      setDecisionModalAction(null);
      setDecisionReason('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record decision');
    }
  };

  // Handle Correction Submission (Reversal row, BP §26)
  const handleOpenCorrection = (provider: ProviderAccountItem, row: AdminLedgerRow) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setCorrectionTarget({ provider, row });
    setCorrectionAmountRs(String(row.amountMinor / 100));
    setCorrectionReason('');
  };

  const handleConfirmCorrection = async () => {
    if (!correctionTarget) return;

    const parsedRs = parseFloat(correctionAmountRs);
    if (isNaN(parsedRs) || parsedRs <= 0) {
      setErrorMessage('Please enter a valid correction amount.');
      return;
    }

    const amountMinor = Math.round(parsedRs * 100);
    if (amountMinor > correctionTarget.row.amountMinor) {
      setErrorMessage('Correction amount cannot exceed original row amount (BP §26, 422).');
      return;
    }

    if (!correctionReason.trim()) {
      setErrorMessage('Mandatory reason is required for ledger reversal (ROLE-003).');
      return;
    }

    try {
      if (onCreateCorrection) {
        await onCreateCorrection(
          correctionTarget.provider.providerId,
          correctionTarget.row.id,
          amountMinor,
          correctionReason.trim(),
        );
      }

      const reversalRow: AdminLedgerRow = {
        id: `rev-${Date.now()}`,
        entryType: 'REVERSAL',
        amountMinor,
        direction: correctionTarget.row.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
        ...(correctionTarget.row.bookingRef ? { bookingRef: correctionTarget.row.bookingRef } : {}),
        reason: `Reversal: ${correctionReason.trim()} (for ${correctionTarget.row.id})`,
        createdAt: 'Just now',
      };

      setProviderAccounts((prev) =>
        prev.map((acc) => {
          if (acc.providerId !== correctionTarget.provider.providerId) return acc;
          const delta = reversalRow.direction === 'CREDIT' ? amountMinor : -amountMinor;
          const newBal = acc.balanceMinor + delta;
          return {
            ...acc,
            balanceMinor: newBal,
            owesCompany: newBal < 0,
            ledgerRows: [reversalRow, ...acc.ledgerRows],
          };
        }),
      );

      setSuccessMessage(translate('en', 'admin.a09.correction_success'));
      setCorrectionTarget(null);
      setCorrectionReason('');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record correction');
    }
  };

  // Handle Manual Settlement Recording (PAY-007)
  const handleOpenSettlement = (provider: ProviderAccountItem) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (provider.balanceMinor <= 0) {
      setErrorMessage('Cannot settle a zero or negative balance (LEDGER-007, 409).');
      return;
    }
    setSettlementTarget(provider);
    setSettlementAmountRs(String(provider.balanceMinor / 100));
    setSettlementRef(`STL-${Date.now().toString().slice(-6)}`);
    setSettlementReason('Weekly manual bank settlement');
  };

  const handleConfirmSettlement = async () => {
    if (!settlementTarget) return;

    const parsedRs = parseFloat(settlementAmountRs);
    if (isNaN(parsedRs) || parsedRs <= 0) {
      setErrorMessage('Please enter a valid settlement amount.');
      return;
    }

    const amountMinor = Math.round(parsedRs * 100);
    if (amountMinor > settlementTarget.balanceMinor) {
      setErrorMessage('Settlement amount cannot exceed available positive balance (PAY-007).');
      return;
    }

    if (!settlementRef.trim() || !settlementReason.trim()) {
      setErrorMessage('Reference and mandatory reason are required.');
      return;
    }

    try {
      if (onRecordSettlement) {
        await onRecordSettlement(
          settlementTarget.providerId,
          amountMinor,
          settlementRef.trim(),
          settlementReason.trim(),
        );
      }

      const newStl: SettlementItem = {
        id: `stl-${Date.now()}`,
        providerId: settlementTarget.providerId,
        providerName: settlementTarget.providerName,
        amountMinor,
        reference: settlementRef.trim(),
        status: 'SETTLED',
        createdAt: 'Just now',
      };

      setSettlements((prev) => [newStl, ...prev]);

      setProviderAccounts((prev) =>
        prev.map((acc) => {
          if (acc.providerId !== settlementTarget.providerId) return acc;
          const newBal = acc.balanceMinor - amountMinor;
          return {
            ...acc,
            balanceMinor: newBal,
            owesCompany: newBal < 0,
            ledgerRows: [
              {
                id: `led-stl-${Date.now()}`,
                entryType: 'SETTLEMENT',
                amountMinor,
                direction: 'DEBIT',
                reason: `Settlement payout #${newStl.reference}`,
                createdAt: 'Just now',
              },
              ...acc.ledgerRows,
            ],
          };
        }),
      );

      setSuccessMessage(translate('en', 'admin.a09.settlement_success'));
      setSettlementTarget(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record settlement');
    }
  };

  const pendingSubmissions = submissions.filter((s) => s.status === 'SUBMITTED');
  const decidedSubmissions = submissions.filter((s) => s.status !== 'SUBMITTED');
  const readyToSettle = providerAccounts.filter((p) => p.balanceMinor > 0);

  return (
    <div className="admin-screen" data-screen-id="A09">
      <header className="admin-header">
        <div>
          <h2>{translate('en', 'admin.a09.title')}</h2>
          <p className="admin-subtitle">{translate('en', 'admin.a09.desc')}</p>
        </div>
        <div className="admin-badge">
          {translate('en', 'admin.a09.role_label', {
            role: `${(user?.subRoles ?? []).join(', ')} (${effectiveAccess.toUpperCase()})`,
          })}
        </div>
      </header>

      {errorMessage && (
        <div className="admin-alert admin-alert-danger" role="alert" data-testid="a09-error-alert">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          className="admin-alert admin-alert-success"
          role="alert"
          data-testid="a09-success-alert"
        >
          {successMessage}
        </div>
      )}

      {/* Tabs Navigation (BP §14 A09: Transactions · Exceptions · Provider accounts · Commission verify · Settlements) */}
      <div
        className="admin-tabs-bar"
        data-testid="a09-tabs-nav"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          borderBottom: '1px solid #ccc',
          paddingBottom: '8px',
        }}
      >
        <button
          type="button"
          className={`tab-btn ${activeTab === 'verify' ? 'active font-bold' : ''}`}
          onClick={() => setActiveTab('verify')}
          data-testid="a09-tab-verify"
        >
          {translate('en', 'admin.a09.tab_verify')} ({pendingSubmissions.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'transactions' ? 'active font-bold' : ''}`}
          onClick={() => setActiveTab('transactions')}
          data-testid="a09-tab-transactions"
        >
          {translate('en', 'admin.a09.tab_transactions')}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'exceptions' ? 'active font-bold' : ''}`}
          onClick={() => setActiveTab('exceptions')}
          data-testid="a09-tab-exceptions"
        >
          {translate('en', 'admin.a09.tab_exceptions')} ({exceptions.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'providers' ? 'active font-bold' : ''}`}
          onClick={() => setActiveTab('providers')}
          data-testid="a09-tab-providers"
        >
          {translate('en', 'admin.a09.tab_providers')}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'settlements' ? 'active font-bold' : ''}`}
          onClick={() => setActiveTab('settlements')}
          data-testid="a09-tab-settlements"
        >
          {translate('en', 'admin.a09.tab_settlements')} ({readyToSettle.length})
        </button>
      </div>

      {/* TAB 1: Commission Payments to Verify */}
      {activeTab === 'verify' && (
        <section className="admin-section" data-testid="a09-verify-section">
          <div className="admin-stats-bar">
            <div className="stat-card">
              <span className="stat-label">{translate('en', 'admin.a09.stat_pending')}</span>
              <span className="stat-value">{pendingSubmissions.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{translate('en', 'admin.a09.stat_decided')}</span>
              <span className="stat-value">{decidedSubmissions.length}</span>
            </div>
          </div>

          <h3>
            {translate('en', 'admin.a09.section_pending', {
              count: String(pendingSubmissions.length),
            })}
          </h3>
          {pendingSubmissions.length === 0 ? (
            <p className="empty-message">{translate('en', 'admin.a09.empty_text')}</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{translate('en', 'admin.a09.th_provider')}</th>
                    <th>{translate('en', 'admin.a09.th_amount')}</th>
                    <th>{translate('en', 'admin.a09.th_ref')}</th>
                    <th>{translate('en', 'admin.a09.th_submitted_at')}</th>
                    <th>{translate('en', 'admin.a09.th_proof')}</th>
                    <th>{translate('en', 'admin.a09.th_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSubmissions.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <strong>{sub.providerName}</strong>
                        <div className="muted-text">{sub.providerProfileId}</div>
                      </td>
                      <td>
                        <strong>
                          {translate('en', 'admin.a09.amount_display', {
                            amount: (sub.amountMinor / 100).toLocaleString(),
                          })}
                        </strong>
                      </td>
                      <td>
                        <code>{sub.transactionRef}</code>
                      </td>
                      <td>{sub.submittedAt}</td>
                      <td>
                        {sub.screenshotUrl ? (
                          <a
                            href={sub.screenshotUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="link-btn"
                          >
                            {translate('en', 'admin.a09.view_receipt')}
                          </a>
                        ) : (
                          <span className="muted-text">
                            {translate('en', 'admin.a09.no_receipt')}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-button-group">
                          <button
                            type="button"
                            className="btn-approve"
                            onClick={() => openDecisionModal(sub, 'APPROVE')}
                            data-testid={`a09-approve-btn-${sub.id}`}
                          >
                            {translate('en', 'admin.a09.approve_btn')}
                          </button>
                          <button
                            type="button"
                            className="btn-reject"
                            onClick={() => openDecisionModal(sub, 'REJECT')}
                            data-testid={`a09-reject-btn-${sub.id}`}
                          >
                            {translate('en', 'admin.a09.reject_btn')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Transactions */}
      {activeTab === 'transactions' && (
        <section className="admin-section" data-testid="a09-transactions-section">
          <h3>{translate('en', 'admin.a09.tab_transactions')}</h3>
          {transactions.length === 0 ? (
            <p className="empty-message">{translate('en', 'admin.a09.trx_empty')}</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{translate('en', 'admin.a09.th_payment_id')}</th>
                    <th>{translate('en', 'admin.a09.th_booking_id')}</th>
                    <th>{translate('en', 'admin.a09.th_amount')}</th>
                    <th>{translate('en', 'admin.a09.th_method')}</th>
                    <th>{translate('en', 'admin.a09.th_status')}</th>
                    <th>{translate('en', 'admin.a09.th_gateway_ref')}</th>
                    <th>{translate('en', 'admin.a09.th_time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((trx) => (
                    <tr key={trx.id}>
                      <td>
                        <code>{trx.id}</code>
                      </td>
                      <td>
                        <strong>{trx.bookingRef}</strong>
                      </td>
                      <td>
                        {translate('en', 'admin.a09.amount_display', {
                          amount: (trx.amountMinor / 100).toLocaleString(),
                        })}
                      </td>
                      <td>{trx.method}</td>
                      <td>
                        {trx.status === 'PROCESSING' ? (
                          <span className="badge badge-warning">
                            {translate('en', 'admin.a09.trx_status_unknown')}
                          </span>
                        ) : (
                          <span
                            className={`badge ${trx.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}
                          >
                            {trx.status}
                          </span>
                        )}
                      </td>
                      <td>{trx.gatewayRef || '—'}</td>
                      <td>{trx.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: Exceptions */}
      {activeTab === 'exceptions' && (
        <section className="admin-section" data-testid="a09-exceptions-section">
          <h3>{translate('en', 'admin.a09.tab_exceptions')}</h3>
          {exceptions.length === 0 ? (
            <p className="empty-message">{translate('en', 'admin.a09.exc_empty')}</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{translate('en', 'admin.a09.th_id')}</th>
                    <th>{translate('en', 'admin.a09.th_type')}</th>
                    <th>{translate('en', 'admin.a09.th_booking_id')}</th>
                    <th>{translate('en', 'admin.a09.th_desc')}</th>
                    <th>{translate('en', 'admin.a09.th_severity')}</th>
                    <th>{translate('en', 'admin.a09.th_detected_at')}</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.map((exc) => (
                    <tr key={exc.id}>
                      <td>
                        <code>{exc.id}</code>
                      </td>
                      <td>
                        <strong>
                          {exc.type === 'DIGITAL_UNCONFIRMED'
                            ? translate('en', 'admin.a09.exc_digital_unconfirmed')
                            : exc.type === 'TAX_RULE_UNSET'
                              ? translate('en', 'admin.a09.exc_tax_unset')
                              : translate('en', 'admin.a09.exc_recon')}
                        </strong>
                      </td>
                      <td>{exc.bookingRef || '—'}</td>
                      <td>{exc.description}</td>
                      <td>
                        <span
                          className={`badge ${exc.severity === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}
                        >
                          {exc.severity}
                        </span>
                      </td>
                      <td>{exc.detectedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: Provider Accounts & Reversals */}
      {activeTab === 'providers' && (
        <section className="admin-section" data-testid="a09-providers-section">
          <h3>{translate('en', 'admin.a09.tab_providers')}</h3>
          {providerAccounts.map((acc) => (
            <div
              key={acc.providerId}
              style={{
                marginBottom: '24px',
                border: '1px solid #ddd',
                padding: '16px',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <div>
                  <h4 style={{ margin: 0 }}>
                    {acc.providerName} ({acc.providerId})
                  </h4>
                  <div style={{ marginTop: '4px' }}>
                    {translate('en', 'admin.a09.th_balance')}:{' '}
                    <strong style={{ color: acc.balanceMinor < 0 ? '#DC3545' : '#28A745' }}>
                      {translate('en', 'admin.a09.amount_display', {
                        amount: (acc.balanceMinor / 100).toLocaleString(),
                      })}
                    </strong>
                    {acc.owesCompany && (
                      <span className="badge badge-danger" style={{ marginLeft: '8px' }}>
                        {translate('en', 'admin.a09.th_owes')}
                      </span>
                    )}
                  </div>
                </div>
                {acc.balanceMinor > 0 && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleOpenSettlement(acc)}
                    data-testid={`a09-settle-btn-${acc.providerId}`}
                  >
                    {translate('en', 'admin.a09.btn_record_settlement')}
                  </button>
                )}
              </div>

              <h5>{translate('en', 'admin.a09.history_title')}</h5>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{translate('en', 'admin.a09.th_entry_id')}</th>
                    <th>{translate('en', 'admin.a09.th_type')}</th>
                    <th>{translate('en', 'admin.a09.th_booking')}</th>
                    <th>{translate('en', 'admin.a09.th_amount')}</th>
                    <th>{translate('en', 'admin.a09.th_reason')}</th>
                    <th>{translate('en', 'admin.a09.th_time')}</th>
                    <th>{translate('en', 'admin.a09.th_action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {acc.ledgerRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <code>{row.id}</code>
                      </td>
                      <td>{row.entryType}</td>
                      <td>{row.bookingRef || '—'}</td>
                      <td
                        style={{
                          color: row.direction === 'CREDIT' ? '#28A745' : '#DC3545',
                          fontWeight: 'bold',
                        }}
                      >
                        {`${row.direction === 'CREDIT' ? '+' : '-'} Rs. ${(row.amountMinor / 100).toLocaleString()}`}
                      </td>
                      <td>{row.reason}</td>
                      <td>{row.createdAt}</td>
                      <td>
                        {row.entryType !== 'REVERSAL' && (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleOpenCorrection(acc, row)}
                            data-testid={`a09-correction-btn-${row.id}`}
                          >
                            {translate('en', 'admin.a09.btn_create_correction')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}

      {/* TAB 5: Settlements */}
      {activeTab === 'settlements' && (
        <section className="admin-section" data-testid="a09-settlements-section">
          <h3>{translate('en', 'admin.a09.settlement_ready_title')}</h3>
          {readyToSettle.length === 0 ? (
            <p className="empty-message">{translate('en', 'admin.a09.settlement_empty')}</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{translate('en', 'admin.a09.th_provider')}</th>
                  <th>{translate('en', 'admin.a09.th_balance')}</th>
                  <th>{translate('en', 'admin.a09.th_action')}</th>
                </tr>
              </thead>
              <tbody>
                {readyToSettle.map((prov) => (
                  <tr key={prov.providerId}>
                    <td>
                      <strong>{prov.providerName}</strong>
                      <div className="muted-text">{prov.providerId}</div>
                    </td>
                    <td style={{ color: '#28A745', fontWeight: 'bold' }}>
                      {translate('en', 'admin.a09.amount_display', {
                        amount: (prov.balanceMinor / 100).toLocaleString(),
                      })}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleOpenSettlement(prov)}
                        data-testid={`a09-record-settlement-btn-${prov.providerId}`}
                      >
                        {translate('en', 'admin.a09.btn_record_settlement')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ marginTop: '24px' }}>
            {translate('en', 'admin.a09.settlement_history_title')}
          </h3>
          {settlements.length === 0 ? (
            <p className="empty-message">{translate('en', 'admin.a09.settlement_past_empty')}</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{translate('en', 'admin.a09.th_settlement_id')}</th>
                  <th>{translate('en', 'admin.a09.th_provider')}</th>
                  <th>{translate('en', 'admin.a09.th_amount')}</th>
                  <th>{translate('en', 'admin.a09.th_ref')}</th>
                  <th>{translate('en', 'admin.a09.th_status')}</th>
                  <th>{translate('en', 'admin.a09.th_date')}</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((stl) => (
                  <tr key={stl.id}>
                    <td>
                      <code>{stl.id}</code>
                    </td>
                    <td>{stl.providerName}</td>
                    <td>
                      {translate('en', 'admin.a09.amount_display', {
                        amount: (stl.amountMinor / 100).toLocaleString(),
                      })}
                    </td>
                    <td>
                      <code>{stl.reference}</code>
                    </td>
                    <td>
                      <span className="badge badge-success">{stl.status}</span>
                    </td>
                    <td>{stl.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Modal 1: Commission Approval/Rejection Modal */}
      {selectedSub && decisionModalAction && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          data-testid="a09-decision-modal"
        >
          <div className="admin-modal-card">
            <h3>
              {translate('en', 'admin.a09.modal_title', {
                action: decisionModalAction === 'APPROVE' ? 'Approve' : 'Reject',
              })}
            </h3>
            <p className="admin-modal-subtitle">
              {translate('en', 'admin.a09.modal_provider_label', {
                providerId: selectedSub.providerName,
                amount: `Rs. ${(selectedSub.amountMinor / 100).toLocaleString()}`,
              })}
            </p>
            <p className="admin-modal-detail">
              {translate('en', 'admin.a09.modal_ref_label', {
                ref: selectedSub.transactionRef,
              })}
            </p>

            <div className="form-group">
              <label htmlFor="decisionReason">
                {translate('en', 'admin.a09.modal_reason_label')}
              </label>
              <textarea
                id="decisionReason"
                rows={3}
                className="admin-textarea"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={translate('en', 'admin.a09.modal_reason_placeholder')}
                data-testid="a09-decision-reason-input"
              />
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setSelectedSub(null)}
                data-testid="a09-modal-cancel-btn"
              >
                {translate('en', 'admin.a09.cancel_btn')}
              </button>
              <button
                type="button"
                className={decisionModalAction === 'APPROVE' ? 'btn-approve' : 'btn-reject'}
                onClick={handleConfirmDecision}
                data-testid="a09-modal-confirm-btn"
              >
                {translate('en', 'admin.a09.confirm_btn', {
                  action: decisionModalAction === 'APPROVE' ? 'Approval' : 'Rejection',
                })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Create Correction (Reversal) Modal */}
      {correctionTarget && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          data-testid="a09-correction-modal"
        >
          <div className="admin-modal-card">
            <h3>{translate('en', 'admin.a09.correction_modal_title')}</h3>
            <p className="admin-modal-subtitle">
              {translate('en', 'admin.a09.label_provider_inline', {
                name: correctionTarget.provider.providerName,
              })}{' '}
              | {translate('en', 'admin.a09.label_target_inline', { id: correctionTarget.row.id })}
            </p>

            <div className="form-group">
              <label htmlFor="correctionAmount">
                {translate('en', 'admin.a09.correction_amount')}
              </label>
              <input
                id="correctionAmount"
                type="number"
                className="admin-input"
                value={correctionAmountRs}
                onChange={(e) => setCorrectionAmountRs(e.target.value)}
                data-testid="a09-correction-amount-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="correctionReason">
                {translate('en', 'admin.a09.correction_reason')}
              </label>
              <textarea
                id="correctionReason"
                rows={3}
                className="admin-textarea"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder={translate('en', 'admin.a09.placeholder_reversal_reason')}
                data-testid="a09-correction-reason-input"
              />
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setCorrectionTarget(null)}
              >
                {translate('en', 'admin.a09.cancel_btn')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmCorrection}
                data-testid="a09-correction-confirm-btn"
              >
                {translate('en', 'admin.a09.btn_confirm_correction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Record Manual Settlement Modal */}
      {settlementTarget && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          data-testid="a09-settlement-modal"
        >
          <div className="admin-modal-card">
            <h3>{translate('en', 'admin.a09.settlement_modal_title')}</h3>
            <p className="admin-modal-subtitle">
              {translate('en', 'admin.a09.label_provider_inline', {
                name: `${settlementTarget.providerName} (${settlementTarget.providerId})`,
              })}
            </p>

            <div className="form-group">
              <label htmlFor="settlementAmount">
                {translate('en', 'admin.a09.settlement_amount')}
              </label>
              <input
                id="settlementAmount"
                type="number"
                className="admin-input"
                value={settlementAmountRs}
                onChange={(e) => setSettlementAmountRs(e.target.value)}
                data-testid="a09-settlement-amount-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="settlementRef">{translate('en', 'admin.a09.settlement_ref')}</label>
              <input
                id="settlementRef"
                type="text"
                className="admin-input"
                value={settlementRef}
                onChange={(e) => setSettlementRef(e.target.value)}
                data-testid="a09-settlement-ref-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="settlementReason">
                {translate('en', 'admin.a09.settlement_reason')}
              </label>
              <textarea
                id="settlementReason"
                rows={2}
                className="admin-textarea"
                value={settlementReason}
                onChange={(e) => setSettlementReason(e.target.value)}
                data-testid="a09-settlement-reason-input"
              />
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setSettlementTarget(null)}
              >
                {translate('en', 'admin.a09.cancel_btn')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmSettlement}
                data-testid="a09-settlement-confirm-btn"
              >
                {translate('en', 'admin.a09.btn_confirm_settlement')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Screen A09 — Payments & Commission Verification Queue
 * Source of Truth: docs/screens/admin.md, docs/screens/flows.md §4b
 * Requirements: LEDGER-PAY-001..007, LEDGER-NEG-001..005, ROLE-003, ABUSE-010, D-020, D-021.
 *
 * CRITICAL ACCESS CONTROL:
 * Only Finance and Super Admin roles can access this screen.
 * Separation of duty: staff cannot approve their own submissions (ABUSE-010).
 */

'use client';

import { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

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

interface A09PaymentsScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
  onDecideSubmission?: (
    submissionId: string,
    action: 'APPROVE' | 'REJECT',
    reason: string,
  ) => Promise<void>;
}

export function A09PaymentsScreen({
  onReturnToDashboard,
  mockScreenState: _mockScreenState,
  onDecideSubmission,
}: A09PaymentsScreenProps) {
  const { user } = useAdminAuth();
  const effectiveAccess = resolveEffectiveAccess(user?.subRoles ?? [], 'A09');

  const [submissions, setSubmissions] = useState<CommissionSubmissionItem[]>(INITIAL_SUBMISSIONS);
  const [selectedSub, setSelectedSub] = useState<CommissionSubmissionItem | null>(null);
  const [decisionModalAction, setDecisionModalAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
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

  const pendingSubmissions = submissions.filter((s) => s.status === 'SUBMITTED');
  const decidedSubmissions = submissions.filter((s) => s.status !== 'SUBMITTED');

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
        <div className="admin-alert admin-alert-danger" role="alert">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="admin-alert admin-alert-success" role="alert">
          {successMessage}
        </div>
      )}

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

      <section className="admin-section">
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
                        >
                          {translate('en', 'admin.a09.approve_btn')}
                        </button>
                        <button
                          type="button"
                          className="btn-reject"
                          onClick={() => openDecisionModal(sub, 'REJECT')}
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

      {/* Decision Modal */}
      {selectedSub && decisionModalAction && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h3>
              {translate('en', 'admin.a09.modal_title', {
                action:
                  decisionModalAction === 'APPROVE'
                    ? translate('en', 'admin.a09.approve_btn')
                    : translate('en', 'admin.a09.reject_btn'),
              })}
            </h3>
            <p>
              {translate('en', 'admin.a09.modal_provider_label', {
                providerId: selectedSub.providerName,
                amount: translate('en', 'admin.a09.amount_display', {
                  amount: String(selectedSub.amountMinor / 100),
                }),
              })}
              <br />
              {translate('en', 'admin.a09.modal_ref_label', { ref: selectedSub.transactionRef })}
            </p>

            <div className="form-group">
              <label htmlFor="decision-reason">
                {translate('en', 'admin.a09.modal_reason_label')}
              </label>
              <textarea
                id="decision-reason"
                className="admin-textarea"
                rows={3}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={translate('en', 'admin.a09.modal_reason_placeholder')}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSelectedSub(null);
                  setDecisionModalAction(null);
                }}
              >
                {translate('en', 'admin.a09.cancel_btn')}
              </button>
              <button
                type="button"
                className={decisionModalAction === 'APPROVE' ? 'btn-approve' : 'btn-reject'}
                onClick={handleConfirmDecision}
              >
                {translate('en', 'admin.a09.confirm_btn', {
                  action:
                    decisionModalAction === 'APPROVE'
                      ? translate('en', 'admin.a09.approve_btn')
                      : translate('en', 'admin.a09.reject_btn'),
                })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

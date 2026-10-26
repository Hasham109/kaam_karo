/**
 * Screen A10 — Refunds & Disputes
 * Source of Truth: docs/screens/admin.md §A10
 * Requirements: OPS-ADMIN-010, SUP-002, SUP-003, SUP-004, PAY-006, BOOK-STATUS-012, CHAT-001, NOTIF-007, SEC-REVIEW #25.
 *
 * ACCESS CONTROL:
 * Allowed: OPS (approve/decide), SUP (edit/send update), RT (approve), FIN (approve/issue refund).
 * Finance role only can issue gateway refunds.
 */

'use client';

import { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export type DisputeOutcome = 'OPEN' | 'RESOLVED' | 'REWORK' | 'REFUNDED' | 'CLOSED';
export type DisputeLevel = 'L2' | 'L3' | 'L4' | 'L5';

export interface DisputeCaseItem {
  id: string;
  bookingRef: string;
  openedBy: 'CUSTOMER' | 'PROVIDER';
  openedAt: string;
  level: DisputeLevel;
  outcome: DisputeOutcome;
  complaintText: string;
  maskedPhone: string;
  paidAmountMinor: number;
  refundableAmountMinor: number;
  method: 'CASH' | 'DIGITAL';
  isGatewayConfirmed: boolean;
  linkedRefund?: {
    amountMinor: number;
    status: 'ISSUED' | 'FAILED';
    issuedAt: string;
  };
  updates: {
    author: string;
    text: string;
    time: string;
  }[];
}

export const INITIAL_DISPUTES: DisputeCaseItem[] = [
  {
    id: 'disp-001',
    bookingRef: 'BK-78912',
    openedBy: 'CUSTOMER',
    openedAt: '2026-10-25 15:00 PKT',
    level: 'L3',
    outcome: 'OPEN',
    complaintText: 'AC cooling issue unresolved after servicing. Water dripping from indoor unit.',
    maskedPhone: '0300 ••• 1234',
    paidAmountMinor: 370000,
    refundableAmountMinor: 370000,
    method: 'DIGITAL',
    isGatewayConfirmed: true,
    updates: [
      {
        author: 'SUP-Zeeshan',
        text: 'Contacted customer to request video evidence of dripping water.',
        time: '2026-10-25 15:30 PKT',
      },
    ],
  },
  {
    id: 'disp-002',
    bookingRef: 'BK-78401',
    openedBy: 'CUSTOMER',
    openedAt: '2026-10-24 17:00 PKT',
    level: 'L2',
    outcome: 'REFUNDED',
    complaintText: 'Provider arrived 3 hours late and charged extra for non-required capacitor.',
    maskedPhone: '0321 ••• 5678',
    paidAmountMinor: 180000,
    refundableAmountMinor: 0,
    method: 'DIGITAL',
    isGatewayConfirmed: true,
    linkedRefund: {
      amountMinor: 50000,
      status: 'ISSUED',
      issuedAt: '2026-10-24 19:30 PKT',
    },
    updates: [
      {
        author: 'FIN-Ahmed',
        text: 'Partial gateway refund of Rs. 500 issued after customer agreement.',
        time: '2026-10-24 19:30 PKT',
      },
    ],
  },
];

interface A10RefundsDisputesScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
  onSendUpdate?: (caseId: string, text: string, reason: string) => Promise<void>;
  onEscalate?: (caseId: string, level: DisputeLevel, reason: string) => Promise<void>;
  onDecideOutcome?: (caseId: string, outcome: DisputeOutcome, reason: string) => Promise<void>;
  onIssueRefund?: (caseId: string, amountMinor: number, reason: string) => Promise<void>;
}

export function A10RefundsDisputesScreen({
  onReturnToDashboard,
  mockScreenState: _mockScreenState,
  onSendUpdate,
  onEscalate,
  onDecideOutcome,
  onIssueRefund,
}: A10RefundsDisputesScreenProps) {
  const { user } = useAdminAuth();
  const effectiveAccess = resolveEffectiveAccess(user?.subRoles ?? [], 'A10');

  const [disputes, setDisputes] = useState<DisputeCaseItem[]>(INITIAL_DISPUTES);
  const [selectedCase, setSelectedCase] = useState<DisputeCaseItem | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<
    'UPDATE' | 'ESCALATE' | 'DECIDE' | 'REFUND' | null
  >(null);
  const [updateText, setUpdateText] = useState('');
  const [escalateLevel, setEscalateLevel] = useState<DisputeLevel>('L4');
  const [decisionOutcome, setDecisionOutcome] = useState<DisputeOutcome>('RESOLVED');
  const [refundAmountRs, setRefundAmountRs] = useState('');
  const [auditReason, setAuditReason] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Authorization check
  if (effectiveAccess === 'none') {
    return (
      <Forbidden403View
        screenId="A10"
        screenTitle="Refunds & Disputes"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const isFinance = user?.subRoles.includes('FINANCE') || user?.subRoles.includes('SUPER_ADMIN');

  const handleOpenUpdateModal = (c: DisputeCaseItem) => {
    setSelectedCase(c);
    setUpdateText('');
    setAuditReason('');
    setErrorMessage(null);
    setActiveModal('UPDATE');
  };

  const handleConfirmUpdate = async () => {
    if (!selectedCase) return;
    if (!updateText.trim() || !auditReason.trim()) {
      setErrorMessage('Update text and mandatory reason are required.');
      return;
    }

    try {
      if (onSendUpdate) {
        await onSendUpdate(selectedCase.id, updateText.trim(), auditReason.trim());
      }

      const newUpdate = {
        author: `${user?.name || 'Staff'}`,
        text: updateText.trim(),
        time: 'Just now',
      };

      setDisputes((prev) =>
        prev.map((c) =>
          c.id === selectedCase.id ? { ...c, updates: [newUpdate, ...c.updates] } : c,
        ),
      );

      setSuccessMessage('Case update sent successfully.');
      setActiveModal(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send update');
    }
  };

  const handleOpenEscalateModal = (c: DisputeCaseItem) => {
    setSelectedCase(c);
    setEscalateLevel(c.level === 'L2' ? 'L3' : c.level === 'L3' ? 'L4' : 'L5');
    setAuditReason('');
    setErrorMessage(null);
    setActiveModal('ESCALATE');
  };

  const handleConfirmEscalate = async () => {
    if (!selectedCase) return;
    if (!auditReason.trim()) {
      setErrorMessage('Mandatory reason is required for escalation.');
      return;
    }

    try {
      if (onEscalate) {
        await onEscalate(selectedCase.id, escalateLevel, auditReason.trim());
      }

      setDisputes((prev) =>
        prev.map((c) => (c.id === selectedCase.id ? { ...c, level: escalateLevel } : c)),
      );

      setSuccessMessage(`Dispute escalated to ${escalateLevel}.`);
      setActiveModal(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to escalate');
    }
  };

  const handleOpenDecideModal = (c: DisputeCaseItem, outcome: DisputeOutcome) => {
    setSelectedCase(c);
    setDecisionOutcome(outcome);
    setAuditReason('');
    setErrorMessage(null);
    setActiveModal('DECIDE');
  };

  const handleConfirmDecide = async () => {
    if (!selectedCase) return;
    if (!auditReason.trim()) {
      setErrorMessage('Mandatory reason is required for decision.');
      return;
    }

    try {
      if (onDecideOutcome) {
        await onDecideOutcome(selectedCase.id, decisionOutcome, auditReason.trim());
      }

      setDisputes((prev) =>
        prev.map((c) => (c.id === selectedCase.id ? { ...c, outcome: decisionOutcome } : c)),
      );

      setSuccessMessage(`Dispute outcome recorded: ${decisionOutcome}.`);
      setActiveModal(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to record decision');
    }
  };

  const handleOpenRefundModal = (c: DisputeCaseItem) => {
    setSelectedCase(c);
    setRefundAmountRs(String(c.refundableAmountMinor / 100));
    setAuditReason('');
    setErrorMessage(null);
    setActiveModal('REFUND');
  };

  const handleConfirmRefund = async () => {
    if (!selectedCase) return;

    const parsedRs = parseFloat(refundAmountRs);
    if (isNaN(parsedRs) || parsedRs <= 0) {
      setErrorMessage('Please enter a valid refund amount.');
      return;
    }

    const amountMinor = Math.round(parsedRs * 100);
    if (amountMinor > selectedCase.refundableAmountMinor) {
      setErrorMessage('Refund amount cannot exceed refundable charges (422).');
      return;
    }

    if (!auditReason.trim()) {
      setErrorMessage('Mandatory audit reason is required for Finance refund.');
      return;
    }

    try {
      if (onIssueRefund) {
        await onIssueRefund(selectedCase.id, amountMinor, auditReason.trim());
      }

      const refundRecord = {
        amountMinor,
        status: 'ISSUED' as const,
        issuedAt: 'Just now',
      };

      setDisputes((prev) =>
        prev.map((c) =>
          c.id === selectedCase.id
            ? {
                ...c,
                outcome: 'REFUNDED',
                refundableAmountMinor: c.refundableAmountMinor - amountMinor,
                linkedRefund: refundRecord,
              }
            : c,
        ),
      );

      setSuccessMessage(`Refund of Rs. ${parsedRs.toLocaleString()} issued successfully.`);
      setActiveModal(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to issue refund');
    }
  };

  const openCases = disputes.filter((d) => d.outcome === 'OPEN');
  const refundedCases = disputes.filter((d) => d.outcome === 'REFUNDED');

  return (
    <div className="admin-screen" data-screen-id="A10">
      <header className="admin-header">
        <div>
          <h2>{translate('en', 'admin.a10.title')}</h2>
          <p className="admin-subtitle">{translate('en', 'admin.a10.desc')}</p>
        </div>
        <div className="admin-badge">
          {translate('en', 'admin.a10.role_label', {
            role: `${(user?.subRoles ?? []).join(', ')} (${effectiveAccess.toUpperCase()})`,
          })}
        </div>
      </header>

      {errorMessage && (
        <div className="admin-alert admin-alert-danger" role="alert" data-testid="a10-error-alert">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          className="admin-alert admin-alert-success"
          role="alert"
          data-testid="a10-success-alert"
        >
          {successMessage}
        </div>
      )}

      <div className="admin-stats-bar">
        <div className="stat-card">
          <span className="stat-label">{translate('en', 'admin.a10.stat_open')}</span>
          <span className="stat-value">{openCases.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{translate('en', 'admin.a10.stat_refunded')}</span>
          <span className="stat-value">{refundedCases.length}</span>
        </div>
      </div>

      {/* Main Dispute Cases Table */}
      <section className="admin-section" data-testid="a10-disputes-list-section">
        <h3>{translate('en', 'admin.a10.title_cases')}</h3>
        {disputes.length === 0 ? (
          <p className="empty-message">{translate('en', 'admin.a10.empty_text')}</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{translate('en', 'admin.a10.th_case')}</th>
                  <th>{translate('en', 'admin.a10.th_booking')}</th>
                  <th>{translate('en', 'admin.a10.th_opened_by')}</th>
                  <th>{translate('en', 'admin.a10.th_level')}</th>
                  <th>{translate('en', 'admin.a10.th_outcome')}</th>
                  <th>{translate('en', 'admin.a10.th_refund')}</th>
                  <th>{translate('en', 'admin.a10.th_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <code>{c.id}</code>
                    </td>
                    <td>
                      <strong>{c.bookingRef}</strong>
                    </td>
                    <td>
                      {c.openedBy} ({c.maskedPhone})
                    </td>
                    <td>
                      <span className="badge badge-warning">{c.level}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          c.outcome === 'OPEN'
                            ? 'badge-warning'
                            : c.outcome === 'REFUNDED'
                              ? 'badge-info'
                              : 'badge-success'
                        }`}
                      >
                        {c.outcome}
                      </span>
                    </td>
                    <td>
                      {c.linkedRefund ? (
                        <span style={{ color: '#28A745', fontWeight: 'bold' }}>
                          {translate('en', 'admin.a09.amount_display', {
                            amount: (c.linkedRefund.amountMinor / 100).toLocaleString(),
                          })}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div
                        className="action-button-group"
                        style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}
                      >
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleOpenUpdateModal(c)}
                          data-testid={`a10-update-btn-${c.id}`}
                        >
                          {translate('en', 'admin.a10.btn_send_update')}
                        </button>

                        {c.outcome === 'OPEN' && (
                          <>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleOpenEscalateModal(c)}
                              data-testid={`a10-escalate-btn-${c.id}`}
                            >
                              {translate('en', 'admin.a10.btn_escalate')}
                            </button>

                            <button
                              type="button"
                              className="btn-approve"
                              onClick={() => handleOpenDecideModal(c, 'RESOLVED')}
                              data-testid={`a10-resolve-btn-${c.id}`}
                            >
                              {translate('en', 'admin.a10.btn_resolve')}
                            </button>

                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleOpenDecideModal(c, 'REWORK')}
                              data-testid={`a10-rework-btn-${c.id}`}
                            >
                              {translate('en', 'admin.a10.btn_rework')}
                            </button>

                            <button
                              type="button"
                              className="btn-reject"
                              onClick={() => handleOpenDecideModal(c, 'CLOSED')}
                              data-testid={`a10-close-btn-${c.id}`}
                            >
                              {translate('en', 'admin.a10.btn_close')}
                            </button>

                            {/* Issue Refund: Only for Finance, on digital confirmed payment */}
                            {isFinance && c.isGatewayConfirmed && c.refundableAmountMinor > 0 && (
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => handleOpenRefundModal(c)}
                                data-testid={`a10-refund-btn-${c.id}`}
                              >
                                {translate('en', 'admin.a10.btn_issue_refund')}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Case Details Viewer */}
      <section className="admin-section">
        <h3>{translate('en', 'admin.a10.title_details')}</h3>
        {disputes.map((c) => (
          <div
            key={`detail-${c.id}`}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <h4 style={{ margin: '0 0 8px 0' }}>
              {translate('en', 'admin.a10.label_case_header', {
                caseId: c.id,
                bookingRef: c.bookingRef,
              })}
            </h4>
            <p style={{ margin: '0 0 8px 0', color: '#555' }}>
              <strong>{translate('en', 'admin.a10.detail_complaint')}:</strong> {c.complaintText}
            </p>
            <p style={{ margin: '0 0 8px 0', color: '#555' }}>
              <strong>{translate('en', 'admin.a10.detail_charges')}:</strong>{' '}
              {translate('en', 'admin.a10.label_charges_summary', {
                paid: (c.paidAmountMinor / 100).toLocaleString(),
                method: c.method,
                refundable: (c.refundableAmountMinor / 100).toLocaleString(),
              })}
            </p>

            <h5>{translate('en', 'admin.a10.detail_updates')}</h5>
            {c.updates.length === 0 ? (
              <p className="empty-message">{translate('en', 'admin.a10.empty_updates')}</p>
            ) : (
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {c.updates.map((up, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>
                    <strong>{up.author}</strong> ({up.time}): {up.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {/* Modal 1: Send Case Update */}
      {activeModal === 'UPDATE' && selectedCase && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          data-testid="a10-update-modal"
        >
          <div className="admin-modal-card">
            <h3>{translate('en', 'admin.a10.modal_update_title')}</h3>
            <p className="admin-modal-subtitle">
              {translate('en', 'admin.a10.label_case_booking', {
                caseId: selectedCase.id,
                bookingRef: selectedCase.bookingRef,
              })}
            </p>

            <div className="form-group">
              <label htmlFor="updateText">{translate('en', 'admin.a10.modal_update_text')}</label>
              <textarea
                id="updateText"
                rows={3}
                className="admin-textarea"
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder={translate('en', 'admin.a10.placeholder_update_message')}
                data-testid="a10-update-text-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="updateAuditReason">
                {translate('en', 'admin.a10.label_audit_reason')}
              </label>
              <input
                id="updateAuditReason"
                type="text"
                className="admin-input"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                data-testid="a10-update-reason-input"
              />
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setActiveModal(null)}>
                {translate('en', 'admin.a10.btn_cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmUpdate}
                data-testid="a10-update-confirm-btn"
              >
                {translate('en', 'admin.a10.btn_submit_update')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Escalate Level */}
      {activeModal === 'ESCALATE' && selectedCase && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          data-testid="a10-escalate-modal"
        >
          <div className="admin-modal-card">
            <h3>{translate('en', 'admin.a10.modal_escalate_title')}</h3>
            <p className="admin-modal-subtitle">
              {translate('en', 'admin.a10.label_escalate_target', {
                current: selectedCase.level,
                target: escalateLevel,
              })}
            </p>

            <div className="form-group">
              <label htmlFor="escalateLevelSelect">
                {translate('en', 'admin.a10.label_select_level')}
              </label>
              <select
                id="escalateLevelSelect"
                className="admin-select"
                value={escalateLevel}
                onChange={(e) => setEscalateLevel(e.target.value as DisputeLevel)}
                data-testid="a10-escalate-level-select"
              >
                <option value="L3">{translate('en', 'admin.a10.level_l3')}</option>
                <option value="L4">{translate('en', 'admin.a10.level_l4')}</option>
                <option value="L5">{translate('en', 'admin.a10.level_l5')}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="escalateAuditReason">
                {translate('en', 'admin.a10.label_audit_reason')}
              </label>
              <textarea
                id="escalateAuditReason"
                rows={2}
                className="admin-textarea"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                data-testid="a10-escalate-reason-input"
              />
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setActiveModal(null)}>
                {translate('en', 'admin.a10.btn_cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmEscalate}
                data-testid="a10-escalate-confirm-btn"
              >
                {translate('en', 'admin.a10.btn_confirm_escalate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Decide Outcome */}
      {activeModal === 'DECIDE' && selectedCase && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          data-testid="a10-decision-modal"
        >
          <div className="admin-modal-card">
            <h3>
              {translate('en', 'admin.a10.modal_decision_title', {
                outcome: decisionOutcome,
              })}
            </h3>
            <p className="admin-modal-subtitle">
              {translate('en', 'admin.a10.label_case_id', { id: selectedCase.id })}
            </p>

            <div className="form-group">
              <label htmlFor="decisionAuditReason">
                {translate('en', 'admin.a10.label_audit_reason')}
              </label>
              <textarea
                id="decisionAuditReason"
                rows={3}
                className="admin-textarea"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder={translate('en', 'admin.a10.placeholder_decision_reason')}
                data-testid="a10-decision-reason-input"
              />
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setActiveModal(null)}>
                {translate('en', 'admin.a10.btn_cancel')}
              </button>
              <button
                type="button"
                className="btn-approve"
                onClick={handleConfirmDecide}
                data-testid="a10-decision-confirm-btn"
              >
                {translate('en', 'admin.a10.btn_confirm_decision')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Issue Gateway Refund (FIN role only) */}
      {activeModal === 'REFUND' && selectedCase && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          data-testid="a10-refund-modal"
        >
          <div className="admin-modal-card">
            <h3>{translate('en', 'admin.a10.modal_refund_title')}</h3>
            <p className="admin-modal-subtitle">
              {translate('en', 'admin.a10.label_refund_booking_max', {
                bookingRef: selectedCase.bookingRef,
                max: (selectedCase.refundableAmountMinor / 100).toLocaleString(),
              })}
            </p>

            <div className="form-group">
              <label htmlFor="refundAmount">
                {translate('en', 'admin.a10.modal_refund_amount')}
              </label>
              <input
                id="refundAmount"
                type="number"
                className="admin-input"
                value={refundAmountRs}
                onChange={(e) => setRefundAmountRs(e.target.value)}
                data-testid="a10-refund-amount-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="refundReason">
                {translate('en', 'admin.a10.modal_refund_reason')}
              </label>
              <textarea
                id="refundReason"
                rows={2}
                className="admin-textarea"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder={translate('en', 'admin.a10.placeholder_refund_reason')}
                data-testid="a10-refund-reason-input"
              />
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setActiveModal(null)}>
                {translate('en', 'admin.a10.btn_cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmRefund}
                data-testid="a10-refund-confirm-btn"
              >
                {translate('en', 'admin.a10.btn_submit_refund')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

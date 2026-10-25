/**
 * Screen A04 — Provider Verification Queue
 * Source of Truth: docs/screens/admin.md §3 A04
 * Requirements: OPS-ADMIN-004, TRUST-VER-001..004, CAT-SVC-005, CFG-RULE-007,
 * PROV-CREW-006, ADMIN-ROLE-006, BP §14, §22.1, §39; D-018, D-026.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface VerificationItem {
  id: string;
  providerId: string;
  providerName: string;
  phoneMasked: string;
  currentTier: 'BASIC' | 'VERIFIED';
  requestedTier: 'VERIFIED' | 'BUSINESS_VERIFIED';
  services: string[];
  submittedAt: string;
  waitingDuration: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  documents: {
    cnicFrontUrl: string;
    cnicBackUrl: string;
    selfieUrl: string;
    businessRegUrl?: string;
  };
}

export const INITIAL_VERIFICATIONS: VerificationItem[] = [
  {
    id: 'ver-001',
    providerId: 'usr-p001',
    providerName: 'Muhammad Tariq',
    phoneMasked: '+92 ••• ••••789',
    currentTier: 'BASIC',
    requestedTier: 'VERIFIED',
    services: ['AC General Service', 'AC Repair'],
    submittedAt: '2026-10-24 10:15 PKT',
    waitingDuration: '24 hours',
    status: 'PENDING',
    documents: {
      cnicFrontUrl: 'https://cdn.kaamkaro.pk/docs/cnic_front_001.jpg',
      cnicBackUrl: 'https://cdn.kaamkaro.pk/docs/cnic_back_001.jpg',
      selfieUrl: 'https://cdn.kaamkaro.pk/docs/selfie_001.jpg',
    },
  },
  {
    id: 'ver-002',
    providerId: 'usr-p003',
    providerName: 'Zahid Mehmood',
    phoneMasked: '+92 ••• ••••888',
    currentTier: 'VERIFIED',
    requestedTier: 'BUSINESS_VERIFIED',
    services: ['Complete Rewiring', 'Electrical DB Installation'],
    submittedAt: '2026-10-24 14:30 PKT',
    waitingDuration: '20 hours',
    status: 'PENDING',
    documents: {
      cnicFrontUrl: 'https://cdn.kaamkaro.pk/docs/cnic_front_002.jpg',
      cnicBackUrl: 'https://cdn.kaamkaro.pk/docs/cnic_back_002.jpg',
      selfieUrl: 'https://cdn.kaamkaro.pk/docs/selfie_002.jpg',
      businessRegUrl: 'https://cdn.kaamkaro.pk/docs/ntn_002.pdf',
    },
  },
];

interface A04VerificationScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A04VerificationScreen({
  onReturnToDashboard,
  mockScreenState,
}: A04VerificationScreenProps) {
  const { user } = useAdminAuth();

  // RBAC Guard: Risk/Trust has approve; Operations has view; others none
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A04');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="Provider Verification Queue"
        screenId="A04"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  // Documents are visible ONLY to Risk/Trust (permission-policy §7, docs/screens/admin.md footnote 3)
  const isRiskTrust = user?.subRoles.includes('RISK_TRUST');
  const canDecide = effectiveLevel === 'approve';

  const [queue, setQueue] = useState<VerificationItem[]>(INITIAL_VERIFICATIONS);
  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState || 'success');
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);
  const [decisionType, setDecisionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const pendingItems = queue.filter((item) => item.status === 'PENDING');

  const handleOpenDecision = (item: VerificationItem, type: 'APPROVE' | 'REJECT') => {
    setErrorMsg(null);
    setSelectedItem(item);
    setDecisionType(type);
    setDecisionReason('');
  };

  const handleConfirmDecision = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !decisionType) return;

    if (!decisionReason.trim()) {
      setErrorMsg(translate('en', 'admin.a04.reason_label'));
      return;
    }

    setScreenState('loading');
    setTimeout(() => {
      setQueue((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? { ...item, status: decisionType === 'APPROVE' ? 'APPROVED' : 'REJECTED' }
            : item,
        ),
      );
      if (decisionType === 'APPROVE') {
        setSuccessBanner(
          translate('en', 'admin.a04.success_approved', {
            name: selectedItem.providerName,
            tier: selectedItem.requestedTier,
            reason: decisionReason,
          }),
        );
      } else {
        setSuccessBanner(
          translate('en', 'admin.a04.success_rejected', {
            name: selectedItem.providerName,
            reason: decisionReason,
          }),
        );
      }
      setSelectedItem(null);
      setDecisionType(null);
      setScreenState('success');
    }, 150);
  };

  return (
    <div className="fees-screen-container" data-testid="a04-verification-screen">
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a04-page-title">
            {translate('en', 'admin.a04.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a04.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a04-access-level">
          {translate('en', 'admin.access.chip', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {successBanner && (
        <div className="alert alert-success" data-testid="a04-success-banner">
          <span>{successBanner}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessBanner(null)}>
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-error" data-testid="a04-error-banner">
          <span>{errorMsg}</span>
          <button type="button" className="alert-close" onClick={() => setErrorMsg(null)}>
            ✕
          </button>
        </div>
      )}

      {screenState === 'loading' && (
        <div className="state-skeleton" data-testid="a04-state-loading">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <p>{translate('en', 'admin.a04.loading_text')}</p>
        </div>
      )}

      {screenState === 'error' && (
        <div className="state-error" data-testid="a04-state-error">
          <p>{translate('en', 'admin.a04.error_text')}</p>
          <button type="button" className="btn-retry" onClick={() => setScreenState('success')}>
            {translate('en', 'admin.a13.retry_btn')}
          </button>
        </div>
      )}

      {screenState === 'pending' && (
        <div className="state-pending" data-testid="a04-state-pending">
          <div className="spinner" />
          <p>{translate('en', 'admin.a13.pending_text')}</p>
        </div>
      )}

      {screenState === 'success' && pendingItems.length === 0 && (
        <div className="state-empty" data-testid="a04-state-empty">
          <p>{translate('en', 'admin.a04.empty_text')}</p>
        </div>
      )}

      {screenState === 'success' && pendingItems.length > 0 && (
        <div className="config-table-card" data-testid="a04-verification-table">
          <table className="fee-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a04.th_provider')}</th>
                <th>{translate('en', 'admin.a04.th_phone')}</th>
                <th>{translate('en', 'admin.a04.th_requested')}</th>
                <th>{translate('en', 'admin.a04.th_submitted')}</th>
                <th>{translate('en', 'admin.a04.th_waiting')}</th>
                <th>{translate('en', 'admin.a04.th_docs')}</th>
                <th>{translate('en', 'admin.a04.th_action')}</th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.map((item) => (
                <tr key={item.id} data-testid={`ver-row-${item.id}`}>
                  <td>
                    <strong>{item.providerName}</strong>
                    <div className="sub-text">
                      <code>{item.providerId}</code>
                    </div>
                  </td>
                  <td>{item.phoneMasked}</td>
                  <td>
                    <span className="tier-tag">{item.requestedTier}</span>
                  </td>
                  <td>{item.submittedAt}</td>
                  <td>{item.waitingDuration}</td>
                  <td data-testid={`docs-cell-${item.id}`}>
                    {isRiskTrust ? (
                      <div className="doc-links-group">
                        <span className="doc-chip">
                          {translate('en', 'admin.a04.doc_cnic_front')}
                        </span>
                        <span className="doc-chip">
                          {translate('en', 'admin.a04.doc_cnic_back')}
                        </span>
                        <span className="doc-chip">{translate('en', 'admin.a04.doc_selfie')}</span>
                      </div>
                    ) : (
                      <span className="doc-restricted">
                        {translate('en', 'admin.a04.doc_hidden_ops')}
                      </span>
                    )}
                  </td>
                  <td>
                    {canDecide ? (
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="btn-action btn-approve"
                          data-testid={`approve-btn-${item.id}`}
                          onClick={() => handleOpenDecision(item, 'APPROVE')}
                        >
                          {translate('en', 'admin.a04.btn_approve')}
                        </button>
                        <button
                          type="button"
                          className="btn-action btn-reject"
                          data-testid={`reject-btn-${item.id}`}
                          onClick={() => handleOpenDecision(item, 'REJECT')}
                        >
                          {translate('en', 'admin.a04.btn_reject')}
                        </button>
                      </div>
                    ) : (
                      <span className="no-perm">{translate('en', 'admin.a13.view_only')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Decision Modal */}
      {selectedItem && decisionType && (
        <div className="modal-backdrop" data-testid="a04-decision-modal">
          <div className="modal-card">
            <h2 className="modal-title">
              {decisionType === 'APPROVE'
                ? translate('en', 'admin.a04.modal_approve_title', {
                    name: selectedItem.providerName,
                  })
                : translate('en', 'admin.a04.modal_reject_title', {
                    name: selectedItem.providerName,
                  })}
            </h2>
            <div className="modal-subtitle">
              {translate('en', 'admin.a04.modal_subtitle', {
                tier: selectedItem.requestedTier,
                id: selectedItem.providerId,
              })}
            </div>

            <form onSubmit={handleConfirmDecision}>
              <div className="form-group">
                <label htmlFor="a04-decision-reason" className="form-label">
                  {translate('en', 'admin.a04.reason_label')}
                </label>
                <textarea
                  id="a04-decision-reason"
                  data-testid="a04-decision-reason-input"
                  className="form-textarea"
                  placeholder={translate('en', 'admin.a04.reason_placeholder')}
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  data-testid="a04-cancel-btn"
                  onClick={() => {
                    setSelectedItem(null);
                    setDecisionType(null);
                  }}
                >
                  {translate('en', 'admin.a03.cancel_btn')}
                </button>
                <button
                  type="submit"
                  className={`btn-save ${decisionType === 'REJECT' ? 'btn-danger' : ''}`}
                  data-testid="a04-confirm-decision-btn"
                >
                  {decisionType === 'APPROVE'
                    ? translate('en', 'admin.a04.btn_approve')
                    : translate('en', 'admin.a04.btn_reject')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

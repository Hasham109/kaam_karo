/**
 * Screen A11 — Reviews & Moderation (Controlled Content Moderation Queue)
 * Source of Truth: docs/screens/admin.md §3 A11
 * Requirements: OPS-ADMIN-011, REV-003..005, REV-006, RATING-ENF-002, ADMIN-ROLE-006, ROLE-003.
 *
 * CRITICAL ACCESS CONTROL:
 * Only staff with the Risk & Trust (RT) sub-role can moderate items (access level 'approve').
 * All other roles receive 403 Forbidden.
 */

'use client';

import { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface ModerationQueueItem {
  flagId: string;
  reviewId: string;
  bookingId: string;
  itemType: 'REVIEW' | 'PROVIDER_RESPONSE' | 'HELD_CONTENT';
  source: 'USER_FLAG' | 'AUTO_MOD';
  rating: number;
  excerpt: string;
  authorName: string;
  authorMaskedPhone: string;
  reason: string;
  status: 'OPEN' | 'UPHELD' | 'DISMISSED';
  flaggedAt: string;
}

export const INITIAL_MODERATION_ITEMS: ModerationQueueItem[] = [
  {
    flagId: 'flag-101',
    reviewId: 'rev-301',
    bookingId: 'b-982',
    itemType: 'REVIEW',
    source: 'USER_FLAG',
    rating: 1,
    excerpt: 'Provider was completely unprofessional and shared private phone numbers.',
    authorName: 'Customer',
    authorMaskedPhone: '+92 ••• ••••456',
    reason: 'Contains unmasked personal phone numbers and abusive text',
    status: 'OPEN',
    flaggedAt: '2026-10-26T14:15:00Z',
  },
  {
    flagId: 'flag-102',
    reviewId: 'rev-302',
    bookingId: 'b-975',
    itemType: 'PROVIDER_RESPONSE',
    source: 'USER_FLAG',
    rating: 5,
    excerpt: 'Do not book with this customer again, they refused to pay extra.',
    authorName: 'Provider',
    authorMaskedPhone: '+92 ••• ••••789',
    reason: 'Disparaging remarks against customer',
    status: 'OPEN',
    flaggedAt: '2026-10-26T12:30:00Z',
  },
];

export function A11ReviewsModerationScreen(): React.JSX.Element {
  const { user, canAccess } = useAdminAuth();

  // Role Gate check: Only RT (Risk/Trust) sub-role has access (A11 is 'approve' for RT, 'none' for others)
  const effectiveAccess = resolveEffectiveAccess(user?.subRoles ?? [], 'A11');
  const hasAccess = effectiveAccess === 'approve' || canAccess('A11', 'approve');

  const [items, setItems] = useState<ModerationQueueItem[]>(INITIAL_MODERATION_ITEMS);
  const [screenState, setScreenState] = useState<ScreenState>('success');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State for Mandatory Audit Reason (ROLE-003)
  const [modalMode, setModalMode] = useState<'HIDE' | 'KEEP' | null>(null);
  const [activeItem, setActiveItem] = useState<ModerationQueueItem | null>(null);
  const [auditReason, setAuditReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  if (!hasAccess) {
    return (
      <Forbidden403View screenId="A11" message={translate('en', 'admin.a11.forbidden_desc')} />
    );
  }

  const handleOpenDecisionModal = (item: ModerationQueueItem, mode: 'HIDE' | 'KEEP') => {
    setActiveItem(item);
    setModalMode(mode);
    setAuditReason('');
    setReasonError(null);
  };

  const handleConfirmDecision = () => {
    if (!auditReason.trim() || auditReason.trim().length < 5) {
      setReasonError('Audit reason must be at least 5 characters (ROLE-003)');
      return;
    }

    if (!activeItem || !modalMode) return;

    setScreenState('pending');

    // Simulate decision application
    const newStatus = modalMode === 'HIDE' ? 'UPHELD' : 'DISMISSED';
    setItems((prev) =>
      prev.map((it) => (it.flagId === activeItem.flagId ? { ...it, status: newStatus } : it)),
    );

    setModalMode(null);
    setActiveItem(null);
    setAuditReason('');
    setScreenState('success');
  };

  const filteredItems = items.filter((it) => {
    if (typeFilter !== 'ALL' && it.itemType !== typeFilter) return false;
    if (sourceFilter !== 'ALL' && it.source !== sourceFilter) return false;
    if (statusFilter !== 'ALL' && it.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="admin-screen-container" data-testid="a11-screen-root">
      {/* Screen Title & Description */}
      <div className="admin-screen-header">
        <h1 className="screen-title">{translate('en', 'admin.a11.title')}</h1>
        <p className="screen-description">{translate('en', 'admin.a11.desc')}</p>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-filters-bar" data-testid="a11-filters-bar">
        <div className="filter-group">
          <label htmlFor="filter-item-type">{translate('en', 'admin.a11.filter_item_type')}</label>
          <select
            id="filter-item-type"
            data-testid="filter-item-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">{translate('en', 'admin.a11.type_all')}</option>
            <option value="REVIEW">{translate('en', 'admin.a11.type_review')}</option>
            <option value="PROVIDER_RESPONSE">
              {translate('en', 'admin.a11.type_provider_response')}
            </option>
            <option value="HELD_CONTENT">{translate('en', 'admin.a11.type_held_content')}</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-source">{translate('en', 'admin.a11.filter_source')}</label>
          <select
            id="filter-source"
            data-testid="filter-source"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="ALL">{translate('en', 'admin.a11.source_all')}</option>
            <option value="USER_FLAG">{translate('en', 'admin.a11.source_user_flag')}</option>
            <option value="AUTO_MOD">{translate('en', 'admin.a11.source_auto_mod')}</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-status">{translate('en', 'admin.a11.filter_status')}</label>
          <select
            id="filter-status"
            data-testid="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">{translate('en', 'admin.a11.status_all')}</option>
            <option value="OPEN">{translate('en', 'admin.a11.status_open')}</option>
            <option value="UPHELD">{translate('en', 'admin.a11.status_upheld')}</option>
            <option value="DISMISSED">{translate('en', 'admin.a11.status_dismissed')}</option>
          </select>
        </div>
      </div>

      {/* Screen States */}
      {screenState === 'loading' && (
        <div className="state-view state-loading" data-testid="a11-loading">
          <p>{translate('en', 'admin.a11.loading_text')}</p>
        </div>
      )}

      {screenState === 'error' && (
        <div className="state-view state-error" data-testid="a11-error">
          <p>{translate('en', 'admin.a11.error_text')}</p>
          <button type="button" onClick={() => setScreenState('success')}>
            {translate('en', 'common.action.retry')}
          </button>
        </div>
      )}

      {screenState === 'pending' && (
        <div className="state-view state-pending" data-testid="a11-pending">
          <p>{translate('en', 'admin.a11.pending_text')}</p>
        </div>
      )}

      {/* Moderation Queue Table */}
      {filteredItems.length === 0 ? (
        <div className="state-view state-empty" data-testid="a11-empty">
          <h3>{translate('en', 'admin.a11.empty_text')}</h3>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table" data-testid="a11-moderation-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a11.th_content')}</th>
                <th>{translate('en', 'admin.a11.th_rating')}</th>
                <th>{translate('en', 'admin.a11.th_author')}</th>
                <th>{translate('en', 'admin.a11.th_reason')}</th>
                <th>{translate('en', 'admin.a11.th_booking')}</th>
                <th>{translate('en', 'admin.a11.th_flagged_at')}</th>
                <th>{translate('en', 'admin.a11.th_status')}</th>
                <th>{translate('en', 'admin.a11.th_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.flagId} data-testid={`moderation-row-${item.flagId}`}>
                  <td className="content-cell">
                    <span className="item-type-badge">{item.itemType}</span>
                    <p className="excerpt-text">{item.excerpt}</p>
                  </td>
                  <td>
                    <span className="rating-badge">★ {item.rating}</span>
                  </td>
                  <td>
                    <div>{item.authorName}</div>
                    <small className="muted-phone">{item.authorMaskedPhone}</small>
                  </td>
                  <td className="reason-cell">{item.reason}</td>
                  <td>
                    <span className="booking-link">#{item.bookingId}</span>
                  </td>
                  <td>{new Date(item.flaggedAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-chip status-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {item.status === 'OPEN' ? (
                      <div className="button-group">
                        <button
                          type="button"
                          className="btn-action btn-danger"
                          data-testid={`btn-hide-${item.flagId}`}
                          onClick={() => handleOpenDecisionModal(item, 'HIDE')}
                        >
                          {translate('en', 'admin.a11.btn_hide')}
                        </button>
                        <button
                          type="button"
                          className="btn-action btn-secondary"
                          data-testid={`btn-keep-${item.flagId}`}
                          onClick={() => handleOpenDecisionModal(item, 'KEEP')}
                        >
                          {translate('en', 'admin.a11.btn_keep')}
                        </button>
                      </div>
                    ) : (
                      <span className="decided-label">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Decision Modal with Mandatory Audit Reason (ROLE-003) */}
      {modalMode && activeItem ? (
        <div className="modal-backdrop" data-testid="a11-decision-modal">
          <div className="modal-content">
            <h3 className="modal-title">
              {modalMode === 'HIDE'
                ? translate('en', 'admin.a11.modal_hide_title')
                : translate('en', 'admin.a11.modal_keep_title')}
            </h3>

            <div className="modal-body">
              <p className="modal-prompt">
                {translate('en', 'admin.a11.modal_excerpt', { text: activeItem.excerpt })}
              </p>

              <div className="form-group">
                <label htmlFor="audit-reason-input">
                  {translate('en', 'admin.a11.label_audit_reason')}
                </label>
                <textarea
                  id="audit-reason-input"
                  data-testid="audit-reason-input"
                  className="form-control"
                  rows={4}
                  value={auditReason}
                  onChange={(e) => {
                    setAuditReason(e.target.value);
                    if (reasonError) setReasonError(null);
                  }}
                  placeholder={translate('en', 'admin.a11.placeholder_audit_reason')}
                />
                {reasonError ? <span className="error-text">{reasonError}</span> : null}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                data-testid="btn-modal-cancel"
                onClick={() => {
                  setModalMode(null);
                  setActiveItem(null);
                }}
              >
                {translate('en', 'admin.a11.btn_cancel')}
              </button>
              <button
                type="button"
                className={`btn-${modalMode === 'HIDE' ? 'danger' : 'primary'}`}
                data-testid="btn-modal-confirm"
                onClick={handleConfirmDecision}
              >
                {modalMode === 'HIDE'
                  ? translate('en', 'admin.a11.btn_confirm_hide')
                  : translate('en', 'admin.a11.btn_confirm_keep')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Screen A22 — Badge Rules & Fact Badges
 * Source of Truth: docs/screens/admin.md §3 A22
 * Requirements: OPS-ADMIN-022, TRUST-BADGE-001..014, BP §55.2, §66, D-010, D-026.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface AdminBadgeItem {
  id: string;
  name: string;
  nameUr: string;
  kind: 'FACT' | 'RULE';
  ruleMetric: string;
  threshold: string;
  activeHoldersCount: number;
}

export const INITIAL_BADGES: AdminBadgeItem[] = [
  {
    id: 'b-ver',
    name: 'Verified',
    nameUr: 'تصدیق شدہ',
    kind: 'FACT',
    ruleMetric: 'CNIC & Selfie Verified by Risk/Trust',
    threshold: 'Verified Standing',
    activeHoldersCount: 0,
  },
  {
    id: 'b-emerg',
    name: 'Emergency Available',
    nameUr: 'ہنگامی دستیابی',
    kind: 'FACT',
    ruleMetric: 'Emergency switch active in availability profile',
    threshold: 'Live Toggle Active',
    activeHoldersCount: 0,
  },
  {
    id: 'b-today',
    name: 'Available Today',
    nameUr: 'آج دستیاب',
    kind: 'FACT',
    ruleMetric: 'Open calendar slots on current calendar day',
    threshold: 'Slot > 0 today',
    activeHoldersCount: 0,
  },
  {
    id: 'b-now',
    name: 'Available Now',
    nameUr: 'ابھی دستیاب',
    kind: 'FACT',
    ruleMetric: 'Live Online status switch enabled',
    threshold: 'Live Switch On',
    activeHoldersCount: 0,
  },
  {
    id: 'b-rated',
    name: 'Highly Rated',
    nameUr: 'اعلیٰ درجہ بندی',
    kind: 'RULE',
    ruleMetric: 'Average customer rating ≥ 4.8 from ≥ 20 reviews',
    threshold: 'Rating ≥ 4.80',
    activeHoldersCount: 0,
  },
  {
    id: 'b-exp',
    name: 'Experienced',
    nameUr: 'تجربہ کار',
    kind: 'RULE',
    ruleMetric: 'Completed jobs count ≥ 50 on platform',
    threshold: 'Jobs ≥ 50',
    activeHoldersCount: 0,
  },
  {
    id: 'b-fav',
    name: 'Customer Favorite',
    nameUr: 'پسندیدہ کاریگر',
    kind: 'RULE',
    ruleMetric: 'Added to customer favorites list ≥ 15 times',
    threshold: 'Favorites ≥ 15',
    activeHoldersCount: 0,
  },
  {
    id: 'b-fast-resp',
    name: 'Fast Response',
    nameUr: 'تیز جواب دہندہ',
    kind: 'RULE',
    ruleMetric: 'Average request acceptance time ≤ 5 minutes',
    threshold: 'Response ≤ 5m',
    activeHoldersCount: 0,
  },
  {
    id: 'b-fast-svc',
    name: 'Fast Service',
    nameUr: 'تیز سروس',
    kind: 'RULE',
    ruleMetric: 'Arrives within window in ≥ 95% of bookings',
    threshold: 'On-time ≥ 95%',
    activeHoldersCount: 0,
  },
  {
    id: 'b-rel',
    name: 'Reliable',
    nameUr: 'قابل اعتماد',
    kind: 'RULE',
    ruleMetric: 'Zero unexcused no-shows or cancellations in last 90 days',
    threshold: 'No-show = 0',
    activeHoldersCount: 0,
  },
  {
    id: 'b-repeat',
    name: 'Repeat Customer Favorite',
    nameUr: 'بار بار منتخب',
    kind: 'RULE',
    ruleMetric: 'Repeat customer re-hire rate ≥ 25%',
    threshold: 'Re-hire ≥ 25%',
    activeHoldersCount: 0,
  },
  {
    id: 'b-spec',
    name: 'Top Specialist',
    nameUr: 'ماہر کاریگر',
    kind: 'RULE',
    ruleMetric: 'Category specific volume in top 10th percentile',
    threshold: 'Top 10% volume',
    activeHoldersCount: 0,
  },
  {
    id: 'b-new',
    name: 'Recently Joined',
    nameUr: 'نیا شامل شدہ',
    kind: 'RULE',
    ruleMetric: 'Registered within the last 30 calendar days',
    threshold: 'Tenure ≤ 30d',
    activeHoldersCount: 0,
  },
  {
    id: 'b-team',
    name: 'Large Team',
    nameUr: 'بڑی ٹیم / کمپنی',
    kind: 'RULE',
    ruleMetric: 'Verified crew size capacity ≥ 3 workers',
    threshold: 'Crew ≥ 3',
    activeHoldersCount: 0,
  },
];

interface A22BadgeRulesScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A22BadgeRulesScreen({
  onReturnToDashboard,
  mockScreenState,
}: A22BadgeRulesScreenProps) {
  const { user } = useAdminAuth();

  // RBAC Guard: Super Admin only; others get 403 Forbidden
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A22');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="Badge Rules"
        screenId="A22"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');
  const [badges, setBadges] = useState<AdminBadgeItem[]>(INITIAL_BADGES);
  const [editingBadge, setEditingBadge] = useState<AdminBadgeItem | null>(null);
  const [editThreshold, setEditThreshold] = useState<string>('');
  const [auditReason, setAuditReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleOpenEdit = (badge: AdminBadgeItem) => {
    setEditingBadge(badge);
    setEditThreshold(badge.threshold);
    setAuditReason('');
    setReasonError(null);
  };

  const handleCloseEdit = () => {
    setEditingBadge(null);
    setAuditReason('');
    setReasonError(null);
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingBadge) return;

    if (!auditReason.trim()) {
      setReasonError(translate('en', 'admin.a03.err_reason'));
      return;
    }

    setBadges((prev) =>
      prev.map((item) =>
        item.id === editingBadge.id ? { ...item, threshold: editThreshold } : item,
      ),
    );

    setSuccessBanner(
      translate('en', 'admin.a22.success_saved', {
        name: editingBadge.name,
        reason: auditReason.trim(),
      }),
    );

    handleCloseEdit();
  };

  // State: Loading
  if (screenState === 'loading') {
    return (
      <div className="state-card" data-testid="a22-state-loading">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a22.loading_text')}</p>
      </div>
    );
  }

  // State: Error
  if (screenState === 'error') {
    return (
      <div className="state-card" data-testid="a22-state-error">
        <div className="error-icon">⚠️</div>
        <p className="state-text">{translate('en', 'admin.a22.error_text')}</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setScreenState('success')}
        >
          {translate('en', 'admin.a13.retry_btn')}
        </button>
      </div>
    );
  }

  // State: Pending
  if (screenState === 'pending') {
    return (
      <div className="state-card" data-testid="a22-state-pending">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a13.pending_text')}</p>
      </div>
    );
  }

  return (
    <div className="admin-page" data-testid="a22-badges-screen">
      {/* Header */}
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a22-page-title">
            {translate('en', 'admin.a22.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a22.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a22-access-level">
          {translate('en', 'admin.access.chip', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {successBanner && (
        <div className="alert alert-success" data-testid="a22-success-banner">
          <span>{successBanner}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessBanner(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Badges Table */}
      <div className="table-card">
        <table className="admin-table" data-testid="a22-badges-table">
          <thead>
            <tr>
              <th>{translate('en', 'admin.a22.th_badge')}</th>
              <th>{translate('en', 'admin.a22.th_kind')}</th>
              <th>{translate('en', 'admin.a22.th_rule')}</th>
              <th>{translate('en', 'admin.a22.threshold_label')}</th>
              <th>{translate('en', 'admin.a22.th_holders')}</th>
              <th>{translate('en', 'admin.a22.th_action')}</th>
            </tr>
          </thead>
          <tbody>
            {badges.map((b) => (
              <tr key={b.id} data-testid={`a22-row-${b.id}`}>
                <td>
                  <div className="cell-primary">{b.name}</div>
                  <div className="cell-secondary" dir="rtl">
                    {b.nameUr}
                  </div>
                </td>
                <td>
                  <span
                    className={`badge ${b.kind === 'FACT' ? 'badge-neutral' : 'badge-primary'}`}
                  >
                    {b.kind === 'FACT'
                      ? translate('en', 'admin.a22.kind_fact')
                      : translate('en', 'admin.a22.kind_rule')}
                  </span>
                </td>
                <td>
                  <span className="text-secondary">{b.ruleMetric}</span>
                </td>
                <td>
                  <span className="badge badge-outline">{b.threshold}</span>
                </td>
                <td>
                  <code>{b.activeHoldersCount}</code>
                </td>
                <td>
                  {b.kind === 'RULE' ? (
                    <button
                      type="button"
                      data-testid={`a22-edit-${b.id}`}
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEdit(b)}
                    >
                      {translate('en', 'admin.a22.btn_edit_rule')}
                    </button>
                  ) : (
                    <span className="text-muted">{translate('en', 'admin.a13.view_only')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Badge Rule Modal */}
      {editingBadge && (
        <div className="modal-backdrop" data-testid="a22-edit-modal">
          <div className="modal-card">
            <h2 className="modal-title">
              {translate('en', 'admin.a22.modal_title', { name: editingBadge.name })}
            </h2>
            <div className="modal-subtitle">
              {translate('en', 'admin.a22.modal_subtitle', {
                kind: editingBadge.kind,
                holders: String(editingBadge.activeHoldersCount),
              })}
            </div>

            <form onSubmit={handleSaveEdit}>
              {/* Threshold Requirement */}
              <div className="form-group">
                <label htmlFor="a22-threshold" className="form-label">
                  {translate('en', 'admin.a22.threshold_label')}
                </label>
                <input
                  id="a22-threshold"
                  data-testid="a22-threshold-input"
                  type="text"
                  className="form-input"
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(e.target.value)}
                />
              </div>

              {/* Audit Reason (Mandatory per ROLE-003) */}
              <div className="form-group">
                <label htmlFor="a22-reason" className="form-label">
                  {translate('en', 'admin.a03.reason_label')}
                </label>
                <textarea
                  id="a22-reason"
                  data-testid="a22-audit-reason-input"
                  className="form-textarea"
                  placeholder={translate('en', 'admin.a03.reason_placeholder')}
                  rows={3} // kk-allow-literal: technical — ui textarea rows
                  value={auditReason}
                  onChange={(e) => {
                    setAuditReason(e.target.value);
                    if (reasonError) setReasonError(null);
                  }}
                />
                {reasonError && (
                  <p className="form-error" data-testid="a22-reason-error">
                    {reasonError}
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  data-testid="a22-cancel-btn"
                  className="btn btn-secondary"
                  onClick={handleCloseEdit}
                >
                  {translate('en', 'admin.a03.cancel_btn')}
                </button>
                <button
                  type="submit"
                  data-testid="a22-confirm-save-btn"
                  className="btn btn-primary"
                >
                  {translate('en', 'admin.a13.save_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

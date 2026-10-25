/**
 * Screen A13 — Fees & Commissions (Controlled Financial Configuration)
 * Source of Truth: docs/screens/admin.md §3 A13
 * Requirements: OPS-ADMIN-013, CFG-RULE-002, CFG-RULE-003, COMM-001, COMM-003,
 * FARE-008..011, FARE-013, LEDGER-NEG-001, LEDGER-PAY-001,
 * ADMIN-ROLE-002/003/004/006, ROLE-003.
 *
 * CRITICAL ACCEPTANCE CRITERIA (docs/implementation.md line 494; ADMIN-ROLE-003):
 * "Support role cannot open Fees page (test)" (§8.4, §27).
 * Attempting to access with Support sub-role renders 403 Forbidden page and denies access.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface FeeConfigItem {
  key: string;
  label: string;
  value: string;
  source: string;
  isReadOnly: boolean;
  status: 'active' | 'unset' | 'disabled';
}

export const INITIAL_FEE_CONFIGS: FeeConfigItem[] = [
  {
    key: 'commission.rate',
    label: 'Commission rate',
    value: '0.30 (30%)',
    source: 'D-006; COMM-001',
    isReadOnly: true,
    status: 'active',
  },
  {
    key: 'commission.base_line_types',
    label: 'Commission charged on',
    value: '["LABOR"] only',
    source: 'D-015; COMM-003',
    isReadOnly: true,
    status: 'active',
  },
  {
    key: 'fees.customer_platform_fee',
    label: 'Customer platform fee',
    value: 'Disabled (Rs. 0)',
    source: 'D-025; FARE-009',
    isReadOnly: true,
    status: 'disabled',
  },
  {
    key: 'ledger.max_negative_balance',
    label: 'Allowed unpaid commission',
    value: 'Rs. 0 (Hard block)',
    source: 'D-020; LEDGER-NEG-001',
    isReadOnly: true,
    status: 'active',
  },
  {
    key: 'fare.emergency_exception_enabled',
    label: 'Emergency charge exception',
    value: 'false',
    source: 'FARE-013; K-10',
    isReadOnly: false,
    status: 'disabled',
  },
  {
    key: 'fees.late_cancellation_fee',
    label: 'Late cancellation fee',
    value: 'Not charged at launch (Rs. 0)',
    source: 'D-023; BOOK-CANCEL-002',
    isReadOnly: true,
    status: 'disabled',
  },
  {
    key: 'fees.customer_no_show_fee',
    label: 'Customer no-show fee',
    value: 'Not charged at launch (Rs. 0)',
    source: 'D-023; BOOK-CANCEL-005',
    isReadOnly: true,
    status: 'disabled',
  },
  {
    key: 'tax.customer_bill_rules',
    label: 'Tax on customer bill',
    value: 'Not set — TODO(OWNER)',
    source: 'D-029; FARE-010; OQ-035',
    isReadOnly: true,
    status: 'unset',
  },
];

interface A13FeesScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A13FeesScreen({ onReturnToDashboard, mockScreenState }: A13FeesScreenProps) {
  const { user } = useAdminAuth();

  // 1. RBAC Guard Check:
  // If user has no active session or holds sub-roles without A13 access (such as SUPPORT):
  // Return 403 Forbidden immediately!
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A13');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="Fees & Commissions"
        screenId="A13"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  // 2. States & Local Data for permitted staff (Finance or Super Admin)
  const [configs, setConfigs] = useState<FeeConfigItem[]>(INITIAL_FEE_CONFIGS);
  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState || 'success');
  const [editingItem, setEditingItem] = useState<FeeConfigItem | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const canEdit = effectiveLevel === 'edit' || effectiveLevel === 'approve';

  const handleOpenEdit = (item: FeeConfigItem) => {
    if (item.isReadOnly) {
      setValidationError(
        translate('en', 'admin.a13.err_locked', { key: item.key, source: item.source }),
      );
      return;
    }
    setValidationError(null);
    setEditingItem(item);
    setEditValue(item.value);
    setEditReason('');
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    // Consequential Admin Write requires explicit audit reason (ROLE-003, DATA-004)
    if (!editReason.trim()) {
      setValidationError(translate('en', 'admin.a13.err_reason_required'));
      return;
    }

    setScreenState('loading');
    setTimeout(() => {
      setConfigs((prev) =>
        prev.map((c) =>
          c.key === editingItem.key ? { ...c, value: editValue, status: 'active' } : c,
        ),
      );
      setSuccessBanner(
        translate('en', 'admin.a13.success_updated', {
          key: editingItem.key,
          reason: editReason,
        }),
      );
      setEditingItem(null);
      setScreenState('success');
    }, 150);
  };

  return (
    <div className="fees-screen-container" data-testid="a13-fees-screen">
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a13-page-title">
            {translate('en', 'admin.a13.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a13.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a13-access-level">
          {translate('en', 'admin.a13.access_label', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div className="alert alert-success" data-testid="a13-success-banner">
          <span>{successBanner}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessBanner(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="alert alert-error" data-testid="a13-validation-error">
          <span>{validationError}</span>
          <button type="button" className="alert-close" onClick={() => setValidationError(null)}>
            ✕
          </button>
        </div>
      )}

      {/* 5 Canonical Screen States handling */}
      {screenState === 'loading' && (
        <div className="state-skeleton" data-testid="a13-state-loading">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <p>{translate('en', 'admin.a13.loading_text')}</p>
        </div>
      )}

      {screenState === 'empty' && (
        <div className="state-empty" data-testid="a13-state-empty">
          <p>{translate('en', 'admin.a13.empty_text')}</p>
        </div>
      )}

      {screenState === 'error' && (
        <div className="state-error" data-testid="a13-state-error">
          <p>{translate('en', 'admin.a13.error_text')}</p>
          <button type="button" className="btn-retry" onClick={() => setScreenState('success')}>
            {translate('en', 'admin.a13.retry_btn')}
          </button>
        </div>
      )}

      {screenState === 'pending' && (
        <div className="state-pending" data-testid="a13-state-pending">
          <p>{translate('en', 'admin.a13.pending_text')}</p>
        </div>
      )}

      {screenState === 'success' && (
        <div className="config-table-card" data-testid="a13-config-table">
          <table className="fee-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a13.th_key')}</th>
                <th>{translate('en', 'admin.a13.th_label')}</th>
                <th>{translate('en', 'admin.a13.th_value')}</th>
                <th>{translate('en', 'admin.a13.th_governance')}</th>
                <th>{translate('en', 'admin.a13.th_status')}</th>
                <th>{translate('en', 'admin.a13.th_action')}</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((item) => (
                <tr key={item.key} data-testid={`row-${item.key}`}>
                  <td className="key-cell">
                    <code>{item.key}</code>
                  </td>
                  <td className="label-cell">{item.label}</td>
                  <td className="value-cell" data-testid={`val-${item.key}`}>
                    <strong>{item.value}</strong>
                  </td>
                  <td className="source-cell">
                    <span className="source-tag">{item.source}</span>
                  </td>
                  <td className="status-cell">
                    <span className={`status-badge status-${item.status}`}>
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="action-cell">
                    {item.isReadOnly ? (
                      <span
                        className="readonly-indicator"
                        title={translate('en', 'admin.a13.owner_locked_title')}
                      >
                        {translate('en', 'admin.a13.readonly_lock')}
                      </span>
                    ) : canEdit ? (
                      <button
                        type="button"
                        className="btn-edit"
                        data-testid={`edit-btn-${item.key}`}
                        onClick={() => handleOpenEdit(item)}
                      >
                        {translate('en', 'admin.a13.edit_btn')}
                      </button>
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

      {/* Edit Modal (Consequential Write with Reason) */}
      {editingItem && (
        <div className="modal-backdrop" data-testid="a13-edit-modal">
          <div className="modal-card">
            <h2 className="modal-title">
              {translate('en', 'admin.a13.modal_title', { label: editingItem.label })}
            </h2>
            <div className="modal-subtitle">
              {translate('en', 'admin.a13.modal_subtitle', { key: editingItem.key })}
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label htmlFor="a13-new-value" className="form-label">
                  {translate('en', 'admin.a13.new_value_label')}
                </label>
                <input
                  id="a13-new-value"
                  data-testid="a13-edit-value-input"
                  type="text"
                  className="form-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="a13-edit-reason" className="form-label">
                  {translate('en', 'admin.a13.reason_label')}
                </label>
                <textarea
                  id="a13-edit-reason"
                  data-testid="a13-edit-reason-input"
                  className="form-textarea"
                  placeholder={translate('en', 'admin.a13.reason_placeholder')}
                  rows={3}
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  data-testid="a13-edit-cancel-btn"
                  onClick={() => setEditingItem(null)}
                >
                  {translate('en', 'admin.a13.cancel_btn')}
                </button>
                <button type="submit" className="btn-save" data-testid="a13-edit-save-btn">
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

/**
 * Screen A03 — Users & Accounts
 * Source of Truth: docs/screens/admin.md §3 A03
 * Requirements: OPS-ADMIN-003, ROLE-003, SEC-AUTH-006, SEC-AUTH-008, RATING-ENF-006,
 * ADMIN-ROLE-002, ADMIN-ROLE-006, BP §8.3, §8.4, §20, §21, §27; D-026.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface AdminUserRecord {
  id: string;
  name: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'STAFF';
  phoneMasked: string;
  area: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'DELETED';
  verificationLevel?: 'BASIC' | 'VERIFIED' | 'BUSINESS_VERIFIED';
  ratingStanding?: 'Good standing' | 'Warning 1' | 'Warning 2' | 'Blocked';
  owesCompany?: boolean;
  joined: string;
}

export const INITIAL_USERS: AdminUserRecord[] = [
  {
    id: 'usr-c001',
    name: 'Ahmed Khan',
    role: 'CUSTOMER',
    phoneMasked: '+92 ••• ••••456',
    area: 'Gulberg III',
    status: 'ACTIVE',
    joined: '2026-10-01',
  },
  {
    id: 'usr-p001',
    name: 'Muhammad Tariq',
    role: 'PROVIDER',
    phoneMasked: '+92 ••• ••••789',
    area: 'DHA Phase 5',
    status: 'ACTIVE',
    verificationLevel: 'VERIFIED',
    ratingStanding: 'Good standing',
    owesCompany: false,
    joined: '2026-10-05',
  },
  {
    id: 'usr-p002',
    name: 'Bilal Hussain',
    role: 'PROVIDER',
    phoneMasked: '+92 ••• ••••112',
    area: 'Johar Town',
    status: 'SUSPENDED',
    verificationLevel: 'BASIC',
    ratingStanding: 'Warning 1',
    owesCompany: true,
    joined: '2026-10-10',
  },
  {
    id: 'usr-c002',
    name: 'Fatima Ali',
    role: 'CUSTOMER',
    phoneMasked: '+92 ••• ••••334',
    area: 'Model Town',
    status: 'ACTIVE',
    joined: '2026-10-12',
  },
];

interface A03UsersScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A03UsersScreen({ onReturnToDashboard, mockScreenState }: A03UsersScreenProps) {
  const { user } = useAdminAuth();

  // RBAC Guard: OPS and RT have edit; SUP has view; others none
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A03');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="Users & Accounts"
        screenId="A03"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const canEdit = effectiveLevel === 'edit' || effectiveLevel === 'approve';

  const [users, setUsers] = useState<AdminUserRecord[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'PROVIDER'>('ALL');
  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState || 'success');
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [actionKind, setActionKind] = useState<'SUSPEND' | 'REINSTATE' | null>(null);
  const [auditReason, setAuditReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filter users
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      u.phoneMasked.includes(q)
    );
  });

  const handleOpenAction = (u: AdminUserRecord, kind: 'SUSPEND' | 'REINSTATE') => {
    setErrorMsg(null);
    setSelectedUser(u);
    setActionKind(kind);
    setAuditReason('');
  };

  const handleConfirmAction = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionKind) return;

    if (!auditReason.trim()) {
      setErrorMsg(translate('en', 'admin.a03.err_reason'));
      return;
    }

    const nextStatus = actionKind === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE';
    setScreenState('loading');

    setTimeout(() => {
      setUsers((prev) =>
        prev.map((item) => (item.id === selectedUser.id ? { ...item, status: nextStatus } : item)),
      );
      setSuccessBanner(
        translate('en', 'admin.a03.success_action', {
          name: selectedUser.name,
          status: nextStatus,
          reason: auditReason,
        }),
      );
      setSelectedUser(null);
      setActionKind(null);
      setScreenState('success');
    }, 150);
  };

  return (
    <div className="fees-screen-container" data-testid="a03-users-screen">
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a03-page-title">
            {translate('en', 'admin.a03.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a03.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a03-access-level">
          {translate('en', 'admin.access.chip', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {successBanner && (
        <div className="alert alert-success" data-testid="a03-success-banner">
          <span>{successBanner}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessBanner(null)}>
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-error" data-testid="a03-error-banner">
          <span>{errorMsg}</span>
          <button type="button" className="alert-close" onClick={() => setErrorMsg(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="admin-toolbar" data-testid="a03-toolbar">
        <input
          type="text"
          className="form-input search-input"
          data-testid="a03-search-input"
          placeholder={translate('en', 'admin.a03.search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="form-input filter-select"
          data-testid="a03-role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'CUSTOMER' | 'PROVIDER')}
        >
          <option value="ALL">{translate('en', 'admin.a03.filter_type_all')}</option>
          <option value="CUSTOMER">{translate('en', 'admin.a03.filter_type_customer')}</option>
          <option value="PROVIDER">{translate('en', 'admin.a03.filter_type_provider')}</option>
        </select>
      </div>

      {/* Screen States */}
      {screenState === 'loading' && (
        <div className="state-skeleton" data-testid="a03-state-loading">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <p>{translate('en', 'admin.a03.loading_text')}</p>
        </div>
      )}

      {screenState === 'error' && (
        <div className="state-error" data-testid="a03-state-error">
          <p>{translate('en', 'admin.a03.error_text')}</p>
          <button type="button" className="btn-retry" onClick={() => setScreenState('success')}>
            {translate('en', 'admin.a13.retry_btn')}
          </button>
        </div>
      )}

      {screenState === 'pending' && (
        <div className="state-pending" data-testid="a03-state-pending">
          <div className="spinner" />
          <p>{translate('en', 'admin.a13.pending_text')}</p>
        </div>
      )}

      {screenState === 'success' && filteredUsers.length === 0 && (
        <div className="state-empty" data-testid="a03-state-empty">
          <p>{translate('en', 'admin.a03.empty_text')}</p>
        </div>
      )}

      {screenState === 'success' && filteredUsers.length > 0 && (
        <div className="config-table-card" data-testid="a03-users-table">
          <table className="fee-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a03.th_id')}</th>
                <th>{translate('en', 'admin.a03.th_name')}</th>
                <th>{translate('en', 'admin.a03.th_role')}</th>
                <th>{translate('en', 'admin.a03.th_phone')}</th>
                <th>{translate('en', 'admin.a03.th_area')}</th>
                <th>{translate('en', 'admin.a03.th_status')}</th>
                <th>{translate('en', 'admin.a03.th_level')}</th>
                <th>{translate('en', 'admin.a03.th_action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} data-testid={`row-${u.id}`}>
                  <td>
                    <code>{u.id}</code>
                  </td>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>
                    <span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span>
                  </td>
                  <td>{u.phoneMasked}</td>
                  <td>{u.area}</td>
                  <td>
                    <span className={`status-badge status-${u.status.toLowerCase()}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>{u.verificationLevel || '—'}</td>
                  <td>
                    {canEdit ? (
                      u.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          className="btn-action btn-suspend"
                          data-testid={`suspend-btn-${u.id}`}
                          onClick={() => handleOpenAction(u, 'SUSPEND')}
                        >
                          {translate('en', 'admin.a03.btn_suspend')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-action btn-reinstate"
                          data-testid={`reinstate-btn-${u.id}`}
                          onClick={() => handleOpenAction(u, 'REINSTATE')}
                        >
                          {translate('en', 'admin.a03.btn_reinstate')}
                        </button>
                      )
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

      {/* Consequential Action Confirmation Modal */}
      {selectedUser && actionKind && (
        <div className="modal-backdrop" data-testid="a03-action-modal">
          <div className="modal-card">
            <h2 className="modal-title">
              {actionKind === 'SUSPEND'
                ? translate('en', 'admin.a03.modal_suspend_title', { name: selectedUser.name })
                : translate('en', 'admin.a03.modal_reinstate_title', { name: selectedUser.name })}
            </h2>
            <div className="modal-subtitle">
              {translate('en', 'admin.a03.modal_subtitle', {
                id: selectedUser.id,
                status: selectedUser.status,
              })}
            </div>

            <form onSubmit={handleConfirmAction}>
              <div className="form-group">
                <label htmlFor="a03-reason-input" className="form-label">
                  {translate('en', 'admin.a03.reason_label')}
                </label>
                <textarea
                  id="a03-reason-input"
                  data-testid="a03-audit-reason-input"
                  className="form-textarea"
                  placeholder={translate('en', 'admin.a03.reason_placeholder')}
                  rows={3}
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  data-testid="a03-cancel-btn"
                  onClick={() => {
                    setSelectedUser(null);
                    setActionKind(null);
                  }}
                >
                  {translate('en', 'admin.a03.cancel_btn')}
                </button>
                <button
                  type="submit"
                  className={`btn-save ${actionKind === 'SUSPEND' ? 'btn-danger' : ''}`}
                  data-testid="a03-confirm-action-btn"
                >
                  {translate('en', 'admin.a03.confirm_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

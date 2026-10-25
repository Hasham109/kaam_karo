'use client';

import { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface AuditLogRow {
  id: string;
  timestamp: string;
  actor: string;
  subRoles: string;
  action: string;
  objectType: string;
  objectId: string;
  changeDiff: string;
  reason: string;
  sourceIp: string;
  isSensitiveChange?: boolean;
  isSensitiveRead?: boolean;
}

export const INITIAL_AUDIT_LOGS: AuditLogRow[] = [
  {
    id: 'aud-001',
    timestamp: '2026-10-25 21:15:02 PKT',
    actor: 'admin-super-01',
    subRoles: 'SUPER_ADMIN',
    action: 'MATCHING_WEIGHTS_UPDATE',
    objectType: 'ConfigRule',
    objectId: 'matching.weights.v2.4',
    changeDiff: 'distanceWeight: 0.20 -> 0.22, responseSpeed: 0.05 -> 0.03',
    reason: 'Optimizing matching density for Lahore pilot zones',
    sourceIp: '192.168.1.104',
    isSensitiveChange: true,
  },
  {
    id: 'aud-002',
    timestamp: '2026-10-25 20:45:18 PKT',
    actor: 'staff-ops-04',
    subRoles: 'OPERATIONS',
    action: 'BOOKING_CANCEL_INTERVENTION',
    objectType: 'Booking',
    objectId: 'bk-20261025-091',
    changeDiff: 'status: ACCEPTED -> CANCELLED_BY_ADMIN, party: CUSTOMER',
    reason: 'Customer reported emergency water leakage shutoff',
    sourceIp: '192.168.1.112',
    isSensitiveChange: true,
  },
  {
    id: 'aud-003',
    timestamp: '2026-10-25 20:10:33 PKT',
    actor: 'staff-rt-02',
    subRoles: 'RISK_TRUST',
    action: 'SENSITIVE_DOCUMENT_READ',
    objectType: 'VerificationDoc',
    objectId: 'doc-cnic-prv-004',
    changeDiff: 'CNIC front and back accessed for verification audit',
    reason: 'Biometric name verification on CNIC',
    sourceIp: '192.168.1.109',
    isSensitiveRead: true,
  },
  {
    id: 'aud-004',
    timestamp: '2026-10-25 19:30:10 PKT',
    actor: 'staff-fin-01',
    subRoles: 'FINANCE',
    action: 'COMMISSION_SETTLEMENT_APPROVE',
    objectType: 'LedgerEntry',
    objectId: 'led-settle-089',
    changeDiff: 'unpaidBalance: Rs. -1,200 -> Rs. 0',
    reason: 'Bank transfer verified via JazzCash receipt 987654',
    sourceIp: '192.168.1.105',
    isSensitiveChange: true,
  },
  {
    id: 'aud-005',
    timestamp: '2026-10-25 18:22:45 PKT',
    actor: 'staff-sup-03',
    subRoles: 'SUPPORT',
    action: 'PHONE_LOOKUP_READ',
    objectType: 'UserAccount',
    objectId: 'usr-c-042',
    changeDiff: 'Phone number audit lookup: +92 ••• ••••891',
    reason: 'Inbound customer ticket SLA review',
    sourceIp: '192.168.1.115',
    isSensitiveRead: true,
  },
];

interface A17AuditLogsScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A17AuditLogsScreen({
  onReturnToDashboard,
  mockScreenState,
}: A17AuditLogsScreenProps) {
  const { user } = useAdminAuth();
  const screenLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A17');

  const [quickFilter, setQuickFilter] = useState<'ALL' | 'SENSITIVE_CHANGES' | 'SENSITIVE_READS'>(
    'ALL',
  );
  const [actorQuery, setActorQuery] = useState('');
  const [actionQuery, setActionQuery] = useState('ALL');
  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');

  if (screenLevel === 'none') {
    return (
      <Forbidden403View
        screenTitle="Audit Logs"
        screenId="A17"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const actionOptions = [
    'ALL',
    'MATCHING_WEIGHTS_UPDATE',
    'BOOKING_CANCEL_INTERVENTION',
    'SENSITIVE_DOCUMENT_READ',
    'COMMISSION_SETTLEMENT_APPROVE',
    'PHONE_LOOKUP_READ',
  ];

  const filteredLogs = INITIAL_AUDIT_LOGS.filter((log) => {
    if (quickFilter === 'SENSITIVE_CHANGES' && !log.isSensitiveChange) return false;
    if (quickFilter === 'SENSITIVE_READS' && !log.isSensitiveRead) return false;
    if (actionQuery !== 'ALL' && log.action !== actionQuery) return false;
    if (actorQuery.trim() && !log.actor.toLowerCase().includes(actorQuery.toLowerCase()))
      return false;
    return true;
  });

  if (screenState === 'loading') {
    return (
      <div className="admin-screen-container" data-testid="a17-audit-logs-loading">
        <div className="admin-loading-indicator">{translate('en', 'admin.a17.loading_text')}</div>
      </div>
    );
  }

  if (screenState === 'error') {
    return (
      <div className="admin-screen-container" data-testid="a17-audit-logs-error">
        <div className="admin-error-banner" data-testid="a17-audit-logs-error-banner">
          {translate('en', 'admin.a17.error_text')}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setScreenState('success')}
          data-testid="a17-retry-btn"
        >
          {translate('en', 'admin.a13.retry_btn')}
        </button>
      </div>
    );
  }

  if (screenState === 'pending') {
    return (
      <div className="admin-screen-container" data-testid="a17-audit-logs-pending">
        <div className="admin-pending-banner">{translate('en', 'admin.a17.pending_text')}</div>
      </div>
    );
  }

  return (
    <div className="admin-screen-container" data-testid="a17-audit-logs-screen">
      <header className="admin-screen-header">
        <div className="admin-screen-header-left">
          <h1 className="admin-page-title" data-testid="a17-page-title">
            {translate('en', 'admin.a17.title')}
          </h1>
          <p className="admin-page-desc">{translate('en', 'admin.a17.desc')}</p>
        </div>
        <div className="admin-screen-header-right">
          <span className="badge badge-success" data-testid="a17-immutable-badge">
            {translate('en', 'admin.a17.immutable_note')}
          </span>
        </div>
      </header>

      {/* Quick Filter Buttons */}
      <div className="admin-quick-filters" data-testid="a17-quick-filters">
        <button
          type="button"
          className={`btn ${quickFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setQuickFilter('ALL')}
          data-testid="a17-qf-all"
        >
          {translate('en', 'admin.a17.qf_all')}
        </button>
        <button
          type="button"
          className={`btn ${quickFilter === 'SENSITIVE_CHANGES' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setQuickFilter('SENSITIVE_CHANGES')}
          data-testid="a17-qf-sensitive-changes"
        >
          {translate('en', 'admin.a17.qf_sensitive_changes')}
        </button>
        <button
          type="button"
          className={`btn ${quickFilter === 'SENSITIVE_READS' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setQuickFilter('SENSITIVE_READS')}
          data-testid="a17-qf-sensitive-reads"
        >
          {translate('en', 'admin.a17.qf_sensitive_reads')}
        </button>
      </div>

      {/* Filter Bar */}
      <section className="admin-filter-bar" aria-label={translate('en', 'admin.a17.title')}>
        <div className="filter-group">
          <label htmlFor="a17-actor" className="filter-label">
            {translate('en', 'admin.a17.filter_actor')}
          </label>
          <input
            id="a17-actor"
            type="text"
            className="filter-input"
            placeholder={translate('en', 'admin.a17.filter_actor_placeholder')}
            value={actorQuery}
            onChange={(e) => setActorQuery(e.target.value)}
            data-testid="a17-filter-actor"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="a17-action" className="filter-label">
            {translate('en', 'admin.a17.filter_action')}
          </label>
          <select
            id="a17-action"
            className="filter-select"
            value={actionQuery}
            onChange={(e) => setActionQuery(e.target.value)}
            data-testid="a17-filter-action"
          >
            {actionOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <div className="filter-label" />
          <button
            id="a17-search-btn"
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setScreenState('pending');
              setTimeout(() => setScreenState('success'), 100); // kk-allow-literal: technical — ui debounce
            }}
            data-testid="a17-btn-search"
          >
            {translate('en', 'admin.a17.btn_search')}
          </button>
        </div>
      </section>

      {/* Audit Log Table */}
      {filteredLogs.length === 0 || screenState === 'empty' ? (
        <div className="admin-empty-state" data-testid="a17-empty-state">
          <p>{translate('en', 'admin.a17.empty_text')}</p>
        </div>
      ) : (
        <div className="admin-table-wrapper" data-testid="a17-table-wrapper">
          <table className="admin-table" data-testid="a17-audit-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a17.th_time')}</th>
                <th>{translate('en', 'admin.a17.th_who')}</th>
                <th>{translate('en', 'admin.a17.th_action')}</th>
                <th>{translate('en', 'admin.a17.th_object')}</th>
                <th>{translate('en', 'admin.a17.th_change')}</th>
                <th>{translate('en', 'admin.a17.th_reason')}</th>
                <th>{translate('en', 'admin.a17.th_source')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} data-testid={`a17-row-${log.id}`}>
                  <td className="text-secondary font-mono text-xs">{log.timestamp}</td>
                  <td>
                    <div>
                      <span className="font-semibold">{log.actor}</span>
                      <span className="badge badge-neutral ml-1 text-xs">{log.subRoles}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info text-xs">{log.action}</span>
                  </td>
                  <td>
                    <span className="font-mono text-xs">
                      {log.objectType}: {log.objectId}
                    </span>
                  </td>
                  <td className="max-w-xs text-xs font-mono">{log.changeDiff}</td>
                  <td className="text-sm">{log.reason}</td>
                  <td className="text-secondary font-mono text-xs">{log.sourceIp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

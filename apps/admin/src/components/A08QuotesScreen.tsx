/**
 * Screen A08 — Quotes Exceptions
 * Source of Truth: docs/screens/admin.md §3 A08
 * Requirements: OPS-ADMIN-008, QUOTE-001..009, FARE-012, PROV-CREW-004,
 * ABUSE-005, BP §14, §18, §66, D-004, D-026.
 */

'use client';

import { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';
export type QuoteExceptionKind = 'EXPIRED' | 'DISPUTED' | 'CHANGED_AFTER_ACCEPTANCE';

export interface AdminQuoteExceptionItem {
  id: string;
  bookingId: string;
  providerName: string;
  status: QuoteStatus;
  exceptionKind: QuoteExceptionKind;
  validUntil: string;
  totalPkr: number;
  crewSize: number;
  exceptionDetail: string;
}

export const INITIAL_QUOTES: AdminQuoteExceptionItem[] = [
  {
    id: 'Q-501',
    bookingId: 'B-101',
    providerName: 'Muhammad Tariq',
    status: 'EXPIRED',
    exceptionKind: 'EXPIRED',
    validUntil: '2026-10-24 18:00 PKT',
    totalPkr: 4500,
    crewSize: 2,
    exceptionDetail: 'Quote expired before customer accepted or declined.',
  },
  {
    id: 'Q-502',
    bookingId: 'B-103',
    providerName: 'Zahid Mehmood',
    status: 'ACCEPTED',
    exceptionKind: 'CHANGED_AFTER_ACCEPTANCE',
    validUntil: '2026-10-25 12:00 PKT',
    totalPkr: 3200,
    crewSize: 1,
    exceptionDetail: 'Additional labour line proposed post-acceptance.',
  },
  {
    id: 'Q-503',
    bookingId: 'B-104',
    providerName: 'Zahid Mehmood',
    status: 'DECLINED',
    exceptionKind: 'DISPUTED',
    validUntil: '2026-10-23 20:00 PKT',
    totalPkr: 6000,
    crewSize: 3,
    exceptionDetail: 'Customer reported unexpected materials fee in quote.',
  },
];

interface A08QuotesScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A08QuotesScreen({ onReturnToDashboard, mockScreenState }: A08QuotesScreenProps) {
  const { user } = useAdminAuth();

  // RBAC Guard: Operations and Risk/Trust have view; others none
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A08');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="Quotes Exceptions"
        screenId="A08"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');
  const [quotes] = useState<AdminQuoteExceptionItem[]>(INITIAL_QUOTES);
  const [filterException, setFilterException] = useState<string>('ALL');

  const filteredQuotes = quotes.filter((q) => {
    if (filterException !== 'ALL' && q.exceptionKind !== filterException) return false;
    return true;
  });

  // State: Loading
  if (screenState === 'loading') {
    return (
      <div className="state-card" data-testid="a08-state-loading">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a08.loading_text')}</p>
      </div>
    );
  }

  // State: Error
  if (screenState === 'error') {
    return (
      <div className="state-card" data-testid="a08-state-error">
        <div className="error-icon">⚠️</div>
        <p className="state-text">{translate('en', 'admin.a08.error_text')}</p>
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
      <div className="state-card" data-testid="a08-state-pending">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a13.pending_text')}</p>
      </div>
    );
  }

  const exceptionFilterOptions = [
    { value: 'ALL', label: translate('en', 'admin.a08.filter_all') },
    { value: 'EXPIRED', label: 'EXPIRED' },
    { value: 'DISPUTED', label: 'DISPUTED' },
    { value: 'CHANGED_AFTER_ACCEPTANCE', label: 'CHANGED_AFTER_ACCEPTANCE' },
  ];

  return (
    <div className="admin-page" data-testid="a08-quotes-screen">
      {/* Header */}
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a08-page-title">
            {translate('en', 'admin.a08.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a08.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a08-access-level">
          {translate('en', 'admin.access.chip', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="toolbar">
        <div className="filter-group">
          <select
            data-testid="a08-exception-filter"
            className="filter-select"
            value={filterException}
            onChange={(e) => setFilterException(e.target.value)}
          >
            {exceptionFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredQuotes.length === 0 ? (
        <div className="state-card" data-testid="a08-state-empty">
          <p className="state-text">{translate('en', 'admin.a08.empty_text')}</p>
        </div>
      ) : (
        /* Quotes Table */
        <div className="table-card">
          <table className="admin-table" data-testid="a08-quotes-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a08.th_quote')}</th>
                <th>{translate('en', 'admin.a08.th_booking')}</th>
                <th>{translate('en', 'admin.a08.th_provider')}</th>
                <th>{translate('en', 'admin.a08.th_status')}</th>
                <th>{translate('en', 'admin.a08.th_exception')}</th>
                <th>{translate('en', 'admin.a08.th_valid_until')}</th>
                <th>{translate('en', 'admin.a08.th_total')}</th>
                <th>{translate('en', 'admin.a08.th_crew')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((q) => (
                <tr key={q.id} data-testid={`a08-row-${q.id}`}>
                  <td>
                    <code>{q.id}</code>
                  </td>
                  <td>
                    <code>{q.bookingId}</code>
                  </td>
                  <td>
                    <strong>{q.providerName}</strong>
                  </td>
                  <td>
                    <span className="badge badge-outline">{q.status}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        q.exceptionKind === 'DISPUTED'
                          ? 'badge-danger'
                          : q.exceptionKind === 'CHANGED_AFTER_ACCEPTANCE'
                            ? 'badge-warning'
                            : 'badge-neutral'
                      }`}
                    >
                      {q.exceptionKind}
                    </span>
                    <div className="cell-secondary">{q.exceptionDetail}</div>
                  </td>
                  <td>
                    <span className="cell-secondary">{q.validUntil}</span>
                  </td>
                  <td>
                    <code>{`PKR ${q.totalPkr.toLocaleString('en-US')}`}</code>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{`${q.crewSize} workers`}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

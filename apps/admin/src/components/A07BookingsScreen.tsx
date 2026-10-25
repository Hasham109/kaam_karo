/**
 * Screen A07 — Bookings & Orders
 * Source of Truth: docs/screens/admin.md §3 A07
 * Requirements: OPS-ADMIN-007, BOOK-STATUS-001..017, BOOK-CANCEL-001..006,
 * LEDGER-NEG-005/006, PROV-CREW-001..003, CHAT-001, DATA-002, MATCH-MODE-001,
 * BP §14, §8.3, §11 step 46, §39, D-004, D-005, D-016, D-026.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'DISPUTED';

export interface AdminBookingItem {
  id: string;
  serviceName: string;
  status: BookingStatus;
  customerName: string;
  customerPhoneMasked: string;
  providerName: string;
  providerPhoneMasked: string;
  area: string;
  scheduledTime: string;
  paymentType: 'CASH' | 'DIGITAL';
  isStartBlocked: boolean; // D-021: unpaid commission block
  crewSize: number;
}

export const INITIAL_BOOKINGS: AdminBookingItem[] = [
  {
    id: 'B-101',
    serviceName: 'AC General Service',
    status: 'IN_PROGRESS',
    customerName: 'Ahmed Khan',
    customerPhoneMasked: '+92 ••• ••••456',
    providerName: 'Muhammad Tariq',
    providerPhoneMasked: '+92 ••• ••••789',
    area: 'Gulberg III',
    scheduledTime: '2026-10-25 14:00 PKT',
    paymentType: 'DIGITAL',
    isStartBlocked: false,
    crewSize: 2,
  },
  {
    id: 'B-102',
    serviceName: 'Ceiling Fan Installation',
    status: 'REQUESTED',
    customerName: 'Fatima Ali',
    customerPhoneMasked: '+92 ••• ••••334',
    providerName: 'Bilal Hussain',
    providerPhoneMasked: '+92 ••• ••••112',
    area: 'Model Town',
    scheduledTime: '2026-10-25 16:30 PKT',
    paymentType: 'CASH',
    isStartBlocked: false,
    crewSize: 1,
  },
  {
    id: 'B-103',
    serviceName: 'Water Pipe Leakage Repair',
    status: 'ACCEPTED',
    customerName: 'Usman Ghani',
    customerPhoneMasked: '+92 ••• ••••888',
    providerName: 'Zahid Mehmood',
    providerPhoneMasked: '+92 ••• ••••999',
    area: 'DHA Phase 5',
    scheduledTime: '2026-10-25 17:00 PKT',
    paymentType: 'CASH',
    isStartBlocked: true, // Start blocked due to unpaid commission
    crewSize: 1,
  },
  {
    id: 'B-104',
    serviceName: 'Underground Tank Cleaning',
    status: 'COMPLETED',
    customerName: 'Saima Noor',
    customerPhoneMasked: '+92 ••• ••••221',
    providerName: 'Zahid Mehmood',
    providerPhoneMasked: '+92 ••• ••••999',
    area: 'Johar Town',
    scheduledTime: '2026-10-24 11:00 PKT',
    paymentType: 'CASH',
    isStartBlocked: false,
    crewSize: 3,
  },
];

interface A07BookingsScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A07BookingsScreen({
  onReturnToDashboard,
  mockScreenState,
}: A07BookingsScreenProps) {
  const { user } = useAdminAuth();

  // RBAC Guard: Operations and Support have edit; Risk/Trust has view; others none
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A07');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="Bookings"
        screenId="A07"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');
  const [bookings, setBookings] = useState<AdminBookingItem[]>(INITIAL_BOOKINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal intervention state
  const [activeModal, setActiveModal] = useState<'CANCEL' | 'NO_SHOW' | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingItem | null>(null);
  const [responsibleParty, setResponsibleParty] = useState<'CUSTOMER' | 'PROVIDER'>('CUSTOMER');
  const [auditReason, setAuditReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const canEdit = effectiveLevel === 'edit';

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.id.toLowerCase().includes(q) || b.serviceName.toLowerCase().includes(q);
    }
    return true;
  });

  const handleOpenAction = (booking: AdminBookingItem, kind: 'CANCEL' | 'NO_SHOW') => {
    setSelectedBooking(booking);
    setActiveModal(kind);
    setResponsibleParty('CUSTOMER');
    setAuditReason('');
    setReasonError(null);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedBooking(null);
    setAuditReason('');
    setReasonError(null);
  };

  const handleConfirmAction = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !activeModal) return;

    if (!auditReason.trim()) {
      setReasonError(translate('en', 'admin.a03.err_reason'));
      return;
    }

    const newStatus: BookingStatus = activeModal === 'CANCEL' ? 'CANCELLED' : 'NO_SHOW';

    setBookings((prev) =>
      prev.map((b) => (b.id === selectedBooking.id ? { ...b, status: newStatus } : b)),
    );

    setSuccessBanner(
      translate('en', 'admin.a07.success_action', {
        id: selectedBooking.id,
        status: newStatus,
        party: responsibleParty,
        reason: auditReason.trim(),
      }),
    );

    handleCloseModal();
  };

  // State: Loading
  if (screenState === 'loading') {
    return (
      <div className="state-card" data-testid="a07-state-loading">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a07.loading_text')}</p>
      </div>
    );
  }

  // State: Error
  if (screenState === 'error') {
    return (
      <div className="state-card" data-testid="a07-state-error">
        <div className="error-icon">⚠️</div>
        <p className="state-text">{translate('en', 'admin.a07.error_text')}</p>
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
      <div className="state-card" data-testid="a07-state-pending">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a13.pending_text')}</p>
      </div>
    );
  }

  const statusFilterOptions = [
    { value: 'ALL', label: translate('en', 'admin.a07.filter_status_all') },
    { value: 'REQUESTED', label: 'REQUESTED' },
    { value: 'ACCEPTED', label: 'ACCEPTED' },
    { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
    { value: 'COMPLETED', label: 'COMPLETED' },
    { value: 'CANCELLED', label: 'CANCELLED' },
    { value: 'NO_SHOW', label: 'NO_SHOW' },
  ];

  const partyOptions = [
    { value: 'CUSTOMER', label: translate('en', 'admin.a07.party_customer') },
    { value: 'PROVIDER', label: translate('en', 'admin.a07.party_provider') },
  ];

  return (
    <div className="admin-page" data-testid="a07-bookings-screen">
      {/* Header */}
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a07-page-title">
            {translate('en', 'admin.a07.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a07.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a07-access-level">
          {translate('en', 'admin.access.chip', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {successBanner && (
        <div className="alert alert-success" data-testid="a07-success-banner">
          <span>{successBanner}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessBanner(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="toolbar">
        <div className="filter-group">
          <input
            type="text"
            className="filter-select"
            data-testid="a07-search-input"
            placeholder={translate('en', 'admin.a07.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            data-testid="a07-status-filter"
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredBookings.length === 0 ? (
        <div className="state-card" data-testid="a07-state-empty">
          <p className="state-text">{translate('en', 'admin.a07.empty_text')}</p>
        </div>
      ) : (
        /* Bookings Table */
        <div className="table-card">
          <table className="admin-table" data-testid="a07-bookings-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a07.th_booking')}</th>
                <th>{translate('en', 'admin.a07.th_service')}</th>
                <th>{translate('en', 'admin.a07.th_status')}</th>
                <th>{translate('en', 'admin.a07.th_customer')}</th>
                <th>{translate('en', 'admin.a07.th_provider')}</th>
                <th>{translate('en', 'admin.a07.th_area')}</th>
                <th>{translate('en', 'admin.a07.th_scheduled')}</th>
                <th>{translate('en', 'admin.a07.th_payment')}</th>
                <th>{translate('en', 'admin.a07.th_action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => (
                <tr key={b.id} data-testid={`a07-row-${b.id}`}>
                  <td>
                    <code>{b.id}</code>
                    {b.isStartBlocked && (
                      <span className="badge badge-danger">
                        {translate('en', 'admin.a07.badge_start_blocked')}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="cell-primary">{b.serviceName}</div>
                    <div className="cell-secondary">{`Crew: ${b.crewSize}`}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        b.status === 'COMPLETED'
                          ? 'badge-success'
                          : b.status === 'CANCELLED' || b.status === 'NO_SHOW'
                            ? 'badge-danger'
                            : b.status === 'IN_PROGRESS'
                              ? 'badge-warning'
                              : 'badge-neutral'
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td>
                    <div className="cell-primary">{b.customerName}</div>
                    <div className="cell-secondary">{b.customerPhoneMasked}</div>
                  </td>
                  <td>
                    <div className="cell-primary">{b.providerName}</div>
                    <div className="cell-secondary">{b.providerPhoneMasked}</div>
                  </td>
                  <td>
                    <span className="badge badge-outline">{b.area}</span>
                  </td>
                  <td>
                    <div className="cell-secondary">{b.scheduledTime}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        b.paymentType === 'DIGITAL' ? 'badge-success' : 'badge-neutral'
                      }`}
                    >
                      {b.paymentType}
                    </span>
                  </td>
                  <td>
                    {canEdit ? (
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          data-testid={`a07-cancel-${b.id}`}
                          className="btn btn-danger btn-sm"
                          onClick={() => handleOpenAction(b, 'CANCEL')}
                        >
                          {translate('en', 'admin.a07.btn_cancel')}
                        </button>
                        <button
                          type="button"
                          data-testid={`a07-noshow-${b.id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenAction(b, 'NO_SHOW')}
                        >
                          {translate('en', 'admin.a07.btn_noshow')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted">{translate('en', 'admin.a13.view_only')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Intervention Modal */}
      {selectedBooking && activeModal && (
        <div className="modal-backdrop" data-testid="a07-intervention-modal">
          <div className="modal-card">
            <h2 className="modal-title">
              {activeModal === 'CANCEL'
                ? translate('en', 'admin.a07.modal_cancel_title', { id: selectedBooking.id })
                : translate('en', 'admin.a07.modal_noshow_title', { id: selectedBooking.id })}
            </h2>
            <div className="modal-subtitle">
              {translate('en', 'admin.a07.modal_subtitle', {
                customer: selectedBooking.customerName,
                provider: selectedBooking.providerName,
              })}
            </div>

            <form onSubmit={handleConfirmAction}>
              {/* Responsible Party Selection */}
              <div className="form-group">
                <label htmlFor="a07-party-select" className="form-label">
                  {translate('en', 'admin.a07.party_label')}
                </label>
                <select
                  id="a07-party-select"
                  data-testid="a07-party-select"
                  className="filter-select"
                  value={responsibleParty}
                  onChange={(e) => setResponsibleParty(e.target.value as 'CUSTOMER' | 'PROVIDER')}
                >
                  {partyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audit Reason (Mandatory per ROLE-003) */}
              <div className="form-group">
                <label htmlFor="a07-reason" className="form-label">
                  {translate('en', 'admin.a03.reason_label')}
                </label>
                <textarea
                  id="a07-reason"
                  data-testid="a07-audit-reason-input"
                  className="form-textarea"
                  placeholder={translate('en', 'admin.a03.reason_placeholder')}
                  rows={3}
                  value={auditReason}
                  onChange={(e) => {
                    setAuditReason(e.target.value);
                    if (reasonError) setReasonError(null);
                  }}
                />
                {reasonError && (
                  <p className="form-error" data-testid="a07-reason-error">
                    {reasonError}
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  data-testid="a07-cancel-modal-btn"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  {translate('en', 'admin.a03.cancel_btn')}
                </button>
                <button
                  type="submit"
                  data-testid="a07-confirm-action-btn"
                  className="btn btn-primary"
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

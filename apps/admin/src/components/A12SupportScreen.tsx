/**
 * Screen A12 — Support Tickets Queue & Knowledgebase (Module M16, T7.5; owner A10/A12).
 * Source of Truth: docs/screens/admin.md §A12; ARCH §4 M16; BP §14 A12; BP §40 L1..L5.
 * Requirements: OPS-ADMIN-012, SUP-001, SUP-002, ROLE-003, SEC-REVIEW #25, CFG-RULE-012.
 *
 * ACCESS CONTROL:
 * Allowed: OPERATIONS ('edit'), SUPPORT ('edit'), FINANCE ('edit'), RISK_TRUST ('edit').
 * Other roles: 403 Forbidden.
 */

'use client';

import React, { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export type TicketLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type SLAStatus = 'ON_TRACK' | 'BREACHED' | 'NOT_SET';

export interface SupportTicketItem {
  id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  description: string;
  requesterName: string;
  requesterPhone: string;
  level: TicketLevel;
  assignedTo: string | null;
  slaStatus: SLAStatus;
  source: 'CUSTOMER_APP' | 'PARTNER_APP' | 'PHONE_IVR' | 'INTERNAL';
  bookingRef: string | null;
  isSafety: boolean;
  status: TicketStatus;
  createdAt: string;
  updates: {
    author: string;
    text: string;
    time: string;
  }[];
}

export interface FaqKnowledgeItem {
  id: string;
  audience: 'CUSTOMER' | 'PROVIDER';
  category: string;
  question: string;
  answer: string;
}

export const INITIAL_TICKETS: SupportTicketItem[] = [
  {
    id: 'tkt-001',
    ticketNumber: 'TKT-1001',
    category: 'BOOKING',
    subject: 'Provider delayed over 30 mins',
    description: 'Technician arrived later than booked slot, customer requested update.',
    requesterName: 'Farhan Ali (Customer)',
    requesterPhone: '0300 ••• 1234',
    level: 'L2',
    assignedTo: null,
    slaStatus: 'ON_TRACK',
    source: 'CUSTOMER_APP',
    bookingRef: 'BK-78912',
    isSafety: false,
    status: 'OPEN',
    createdAt: '2026-10-25 15:00 PKT',
    updates: [],
  },
  {
    id: 'tkt-002',
    ticketNumber: 'TKT-1002',
    category: 'PAYOUT',
    subject: 'Weekly payout account verification',
    description: 'Partner requested status on bank account verification.',
    requesterName: 'Tariq Mehmood (Provider)',
    requesterPhone: '0321 ••• 5678',
    level: 'L3',
    assignedTo: 'Bilal Operations',
    slaStatus: 'BREACHED',
    source: 'PARTNER_APP',
    bookingRef: 'BK-78401',
    isSafety: false,
    status: 'IN_PROGRESS',
    createdAt: '2026-10-24 10:00 PKT',
    updates: [
      {
        author: 'Bilal Operations',
        text: 'Reviewing CNIC and 1Link verification record.',
        time: '2026-10-24 11:30 PKT',
      },
    ],
  },
  {
    id: 'tkt-003',
    ticketNumber: 'TKT-1003',
    category: 'SAFETY',
    subject: 'Unsafe electrical short circuit hazard',
    description: 'Customer used Emergency Safety Stop button during live service.',
    requesterName: 'Ayesha Malik (Customer)',
    requesterPhone: '0333 ••• 9999',
    level: 'L3',
    assignedTo: 'Safety Team Lead',
    slaStatus: 'ON_TRACK',
    source: 'CUSTOMER_APP',
    bookingRef: 'BK-78999',
    isSafety: true,
    status: 'OPEN',
    createdAt: '2026-10-25 18:00 PKT',
    updates: [],
  },
];

export const INITIAL_FAQS: FaqKnowledgeItem[] = [
  {
    id: 'faq-c1',
    audience: 'CUSTOMER',
    category: 'BOOKING',
    question: 'How do I cancel or reschedule a booking?',
    answer:
      'Cancel or reschedule directly from the booking tracking screen before provider arrives.',
  },
  {
    id: 'faq-c2',
    audience: 'CUSTOMER',
    category: 'PAYMENT',
    question: 'What payment methods are supported in Kaam Karo?',
    answer: 'Cash on completion, credit/debit card, and digital mobile wallets.',
  },
  {
    id: 'faq-p1',
    audience: 'PROVIDER',
    category: 'PAYOUT',
    question: 'When are earnings paid out?',
    answer: 'Digital earnings are disbursed every Tuesday to your verified account.',
  },
];

const LEVEL_FILTER_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'ALL', label: 'All Levels' },
  { value: 'L2', label: 'Level 2 (Support)' },
  { value: 'L3', label: 'Level 3 (Operations)' },
  { value: 'L4', label: 'Level 4 (Risk/Trust/Finance)' },
  { value: 'L5', label: 'Level 5 (Incident Lead)' },
];

const CATEGORY_FILTER_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'BOOKING', label: 'BOOKING' },
  { value: 'PAYMENT', label: 'PAYMENT' },
  { value: 'PAYOUT', label: 'PAYOUT' },
  { value: 'SAFETY', label: 'SAFETY' },
  { value: 'JOB_DISPUTE', label: 'JOB_DISPUTE' },
  { value: 'SERVICE_QUALITY', label: 'SERVICE_QUALITY' },
];

const STATUS_FILTER_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'OPEN' },
  { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
  { value: 'RESOLVED', label: 'RESOLVED' },
  { value: 'CLOSED', label: 'CLOSED' },
];

const SLA_FILTER_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'ALL', label: 'All SLAs' },
  { value: 'ON_TRACK', label: 'On Track' },
  { value: 'BREACHED', label: 'Breached' },
];

const ESCALATE_OPTIONS: readonly { readonly value: TicketLevel; readonly label: string }[] = [
  { value: 'L2', label: 'Level 2 (Support)' },
  { value: 'L3', label: 'Level 3 (Operations)' },
  { value: 'L4', label: 'Level 4 (Risk/Trust/Finance)' },
  { value: 'L5', label: 'Level 5 (Incident Lead)' },
];

const CATEGORY_SELECT_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'BOOKING', label: 'BOOKING' },
  { value: 'PAYMENT', label: 'PAYMENT' },
  { value: 'PAYOUT', label: 'PAYOUT' },
  { value: 'SAFETY', label: 'SAFETY' },
  { value: 'JOB_DISPUTE', label: 'JOB_DISPUTE' },
  { value: 'SERVICE_QUALITY', label: 'SERVICE_QUALITY' },
];

const SAFETY_TAG_TEXT = 'SAFETY';
const UNASSIGNED_TEXT = '—';

export interface A12SupportScreenProps {
  readonly locale?: 'en' | 'ur';
  readonly initialTicketsList?: SupportTicketItem[];
  readonly initialFaqList?: FaqKnowledgeItem[];
  readonly initialState?: ScreenState;
  readonly onAssignSelf?: (ticketId: string) => Promise<void>;
  readonly onSendUpdate?: (ticketId: string, message: string, reason: string) => Promise<void>;
  readonly onEscalate?: (ticketId: string, level: TicketLevel, reason: string) => Promise<void>;
  readonly onSetCategory?: (ticketId: string, category: string, reason: string) => Promise<void>;
  readonly onCloseTicket?: (
    ticketId: string,
    resolutionNote: string,
    reason: string,
  ) => Promise<void>;
  readonly onReturnToDashboard?: () => void;
}

// Payment instruction detector regex for SEC-REVIEW #25
const PAYMENT_INSTR_REGEX =
  /\b(?:iban|pk\d{2}[a-z]{4}\d{16}|hbl|mcb|meezan|easypaisa|jazzcash|account\s*(?:no|number)|send\s*money|transfer\s*to)\b/i;

export const A12SupportScreen: React.FC<A12SupportScreenProps> = ({
  locale = 'en',
  initialTicketsList = INITIAL_TICKETS,
  initialFaqList = INITIAL_FAQS,
  initialState = 'success',
  onAssignSelf,
  onSendUpdate,
  onEscalate,
  onSetCategory,
  onCloseTicket,
  onReturnToDashboard,
}) => {
  const { user } = useAdminAuth();
  const effectiveAccess = resolveEffectiveAccess(user?.subRoles ?? [], 'A12');

  const [tickets, setTickets] = useState<SupportTicketItem[]>(initialTicketsList);
  const [faqs] = useState<FaqKnowledgeItem[]>(initialFaqList);
  const [screenState, setScreenState] = useState<ScreenState>(initialState);
  const [activeTab, setActiveTab] = useState<'TICKETS' | 'FAQ'>('TICKETS');

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [slaFilter, setSlaFilter] = useState<string>('ALL');
  const [safetyOnly, setSafetyOnly] = useState<boolean>(false);

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [activeModal, setActiveModal] = useState<
    'UPDATE' | 'ESCALATE' | 'CATEGORY' | 'CLOSE' | null
  >(null);

  // Modal Inputs
  const [modalText, setModalText] = useState<string>('');
  const [modalLevel, setModalLevel] = useState<TicketLevel>('L3');
  const [modalCategory, setModalCategory] = useState<string>('BOOKING');
  const [auditReason, setAuditReason] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  if (effectiveAccess === 'none') {
    return (
      <Forbidden403View
        screenId="A12"
        screenTitle={translate(locale, 'admin.a12.title')}
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  if (screenState === 'loading') {
    return (
      <div className="p-6 text-center text-gray-500" data-testid="a12-loading-state">
        <p className="text-lg">{translate(locale, 'admin.a12.loading')}</p>
      </div>
    );
  }

  if (screenState === 'error') {
    return (
      <div className="p-6 text-center text-red-600" data-testid="a12-error-state">
        <p className="text-lg font-semibold">{translate(locale, 'admin.a12.error')}</p>
        <button
          className="mt-3 px-4 py-2 bg-gray-200 rounded"
          onClick={() => setScreenState('success')}
        >
          {translate(locale, 'common.action.retry')}
        </button>
      </div>
    );
  }

  if (screenState === 'pending') {
    return (
      <div className="p-6 text-center text-amber-600" data-testid="a12-pending-state">
        <p className="text-lg">{translate(locale, 'admin.a12.pending')}</p>
      </div>
    );
  }

  // Filter application
  const filteredTickets = tickets.filter((t) => {
    if (levelFilter !== 'ALL' && t.level !== levelFilter) return false;
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (slaFilter !== 'ALL' && t.slaStatus !== slaFilter) return false;
    if (safetyOnly && !t.isSafety) return false;
    return true;
  });

  // Action Handlers
  const handleTakeTicket = async (t: SupportTicketItem) => {
    const adminName = user?.name || 'Staff User';
    try {
      if (onAssignSelf) {
        await onAssignSelf(t.id);
      }
      setTickets((prev) =>
        prev.map((item) => (item.id === t.id ? { ...item, assignedTo: adminName } : item)),
      );
      setBannerMessage(`Assigned ticket ${t.ticketNumber} to you.`);
    } catch {
      setBannerMessage('Failed to assign ticket.');
    }
  };

  const handleOpenUpdate = (t: SupportTicketItem) => {
    setSelectedTicket(t);
    setModalText('');
    setAuditReason('');
    setModalError(null);
    setActiveModal('UPDATE');
  };

  const handleOpenEscalate = (t: SupportTicketItem) => {
    setSelectedTicket(t);
    setModalLevel('L3');
    setAuditReason('');
    setModalError(null);
    setActiveModal('ESCALATE');
  };

  const handleOpenCategory = (t: SupportTicketItem) => {
    setSelectedTicket(t);
    setModalCategory(t.category);
    setAuditReason('');
    setModalError(null);
    setActiveModal('CATEGORY');
  };

  const handleOpenClose = (t: SupportTicketItem) => {
    setSelectedTicket(t);
    setModalText('');
    setAuditReason('');
    setModalError(null);
    setActiveModal('CLOSE');
  };

  const handleConfirmModal = async () => {
    if (!selectedTicket) return;

    // Audit reason is mandatory for consequential admin actions (ROLE-003)
    if (!auditReason.trim() || auditReason.trim().length < 5) {
      setModalError('Audit reason is mandatory and must be at least 5 characters (ROLE-003).');
      return;
    }

    try {
      if (activeModal === 'UPDATE') {
        // SEC-REVIEW #25: Guard against direct payment instructions in staff replies
        if (PAYMENT_INSTR_REGEX.test(modalText)) {
          setModalError(
            'Security violation: Staff updates must never include direct bank account, IBAN, or payment transfer instructions (SEC-REVIEW #25).',
          );
          return;
        }

        if (onSendUpdate) {
          await onSendUpdate(selectedTicket.id, modalText.trim(), auditReason.trim());
        }

        const newUpdate = {
          author: user?.name || 'Staff',
          text: modalText.trim(),
          time: 'Just now',
        };

        setTickets((prev) =>
          prev.map((item) =>
            item.id === selectedTicket.id
              ? { ...item, updates: [...item.updates, newUpdate] }
              : item,
          ),
        );
        setBannerMessage(`Update sent for ${selectedTicket.ticketNumber}.`);
      } else if (activeModal === 'ESCALATE') {
        if (onEscalate) {
          await onEscalate(selectedTicket.id, modalLevel, auditReason.trim());
        }
        setTickets((prev) =>
          prev.map((item) =>
            item.id === selectedTicket.id ? { ...item, level: modalLevel } : item,
          ),
        );
        setBannerMessage(`Escalated ${selectedTicket.ticketNumber} to ${modalLevel}.`);
      } else if (activeModal === 'CATEGORY') {
        if (onSetCategory) {
          await onSetCategory(selectedTicket.id, modalCategory, auditReason.trim());
        }
        setTickets((prev) =>
          prev.map((item) =>
            item.id === selectedTicket.id ? { ...item, category: modalCategory } : item,
          ),
        );
        setBannerMessage(
          `Updated category for ${selectedTicket.ticketNumber} to ${modalCategory}.`,
        );
      } else if (activeModal === 'CLOSE') {
        if (onCloseTicket) {
          await onCloseTicket(selectedTicket.id, modalText.trim(), auditReason.trim());
        }
        setTickets((prev) =>
          prev.map((item) =>
            item.id === selectedTicket.id ? { ...item, status: 'CLOSED' } : item,
          ),
        );
        setBannerMessage(`Closed ticket ${selectedTicket.ticketNumber}.`);
      }

      setActiveModal(null);
      setSelectedTicket(null);
    } catch {
      setModalError('Action failed. Please try again.');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-900" data-testid="a12-support-screen">
      {/* Screen Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {translate(locale, 'admin.a12.title')}
          </h1>
          <p className="text-sm text-gray-500">{translate(locale, 'admin.a12.subtitle')}</p>
        </div>
      </div>

      {bannerMessage && (
        <div
          className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm font-medium"
          data-testid="a12-banner-message"
        >
          {bannerMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 space-x-6">
        <button
          data-testid="a12-tab-tickets"
          className={`pb-3 font-semibold text-sm ${
            activeTab === 'TICKETS'
              ? 'border-b-2 border-emerald-600 text-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('TICKETS')}
        >
          {translate(locale, 'admin.a12.tab_tickets')} ({filteredTickets.length})
        </button>
        <button
          data-testid="a12-tab-faq"
          className={`pb-3 font-semibold text-sm ${
            activeTab === 'FAQ'
              ? 'border-b-2 border-emerald-600 text-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('FAQ')}
        >
          {translate(locale, 'admin.a12.tab_faq')} ({faqs.length})
        </button>
      </div>

      {/* TAB 1: TICKETS QUEUE */}
      {activeTab === 'TICKETS' && (
        <div>
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
            {/* Level Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {translate(locale, 'admin.a12.filter_level')}
              </label>
              <select
                data-testid="a12-filter-level"
                className="text-sm border border-gray-300 rounded px-3 py-1.5 bg-white text-gray-800"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                {LEVEL_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {translate(locale, 'admin.a12.filter_category')}
              </label>
              <select
                data-testid="a12-filter-category"
                className="text-sm border border-gray-300 rounded px-3 py-1.5 bg-white text-gray-800"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {CATEGORY_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {translate(locale, 'admin.a12.filter_status')}
              </label>
              <select
                data-testid="a12-filter-status"
                className="text-sm border border-gray-300 rounded px-3 py-1.5 bg-white text-gray-800"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* SLA Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {translate(locale, 'admin.a12.filter_sla')}
              </label>
              <select
                data-testid="a12-filter-sla"
                className="text-sm border border-gray-300 rounded px-3 py-1.5 bg-white text-gray-800"
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value)}
              >
                {SLA_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Safety Checkbox */}
            <div className="flex items-center pt-5">
              <label className="flex items-center text-sm font-medium text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="a12-filter-safety"
                  className="rounded border-gray-300 text-red-600 mr-2 focus:ring-red-500"
                  checked={safetyOnly}
                  onChange={(e) => setSafetyOnly(e.target.checked)}
                />
                {translate(locale, 'admin.a12.filter_safety')}
              </label>
            </div>
          </div>

          {/* Tickets Table */}
          {filteredTickets.length === 0 ? (
            <div
              className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center text-gray-500"
              data-testid="a12-empty-state"
            >
              <p>{translate(locale, 'admin.a12.empty_tickets')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
              <table
                className="w-full text-left text-sm text-gray-800"
                data-testid="a12-table-tickets"
              >
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">{translate(locale, 'admin.a12.th_ticket')}</th>
                    <th className="px-4 py-3">{translate(locale, 'admin.a12.th_requester')}</th>
                    <th className="px-4 py-3">{translate(locale, 'admin.a12.th_category')}</th>
                    <th className="px-4 py-3">{translate(locale, 'admin.a12.th_level')}</th>
                    <th className="px-4 py-3">{translate(locale, 'admin.a12.th_assigned')}</th>
                    <th className="px-4 py-3">{translate(locale, 'admin.a12.th_sla')}</th>
                    <th className="px-4 py-3">{translate(locale, 'admin.a12.th_booking')}</th>
                    <th className="px-4 py-3">{translate(locale, 'admin.a12.th_status')}</th>
                    <th className="px-4 py-3 text-right">
                      {translate(locale, 'admin.a12.th_actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {t.ticketNumber}
                        {t.isSafety && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded">
                            {SAFETY_TAG_TEXT}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{t.requesterName}</div>
                        <div className="text-xs text-gray-400">{t.requesterPhone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 rounded text-gray-700">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">{t.level}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {t.assignedTo || (
                          <span className="text-gray-400 italic">{UNASSIGNED_TEXT}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                            t.slaStatus === 'BREACHED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {t.slaStatus === 'BREACHED'
                            ? translate(locale, 'admin.a12.sla_breached')
                            : translate(locale, 'admin.a12.sla_on_track')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.bookingRef || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded font-medium ${
                            t.status === 'CLOSED'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        {!t.assignedTo && (
                          <button
                            data-testid={`a12-take-btn-${t.id}`}
                            className="px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700"
                            onClick={() => handleTakeTicket(t)}
                          >
                            {translate(locale, 'admin.a12.btn_assign_self')}
                          </button>
                        )}
                        <button
                          data-testid={`a12-update-btn-${t.id}`}
                          className="px-2.5 py-1 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                          onClick={() => handleOpenUpdate(t)}
                        >
                          {translate(locale, 'admin.a12.btn_send_update')}
                        </button>
                        <button
                          data-testid={`a12-escalate-btn-${t.id}`}
                          className="px-2.5 py-1 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                          onClick={() => handleOpenEscalate(t)}
                        >
                          {translate(locale, 'admin.a12.btn_escalate')}
                        </button>
                        <button
                          data-testid={`a12-category-btn-${t.id}`}
                          className="px-2.5 py-1 text-xs font-medium bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                          onClick={() => handleOpenCategory(t)}
                        >
                          {translate(locale, 'admin.a12.btn_set_category')}
                        </button>
                        {t.status !== 'CLOSED' && (
                          <button
                            data-testid={`a12-close-btn-${t.id}`}
                            className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
                            onClick={() => handleOpenClose(t)}
                          >
                            {translate(locale, 'admin.a12.btn_close')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FAQ KNOWLEDGEBASE */}
      {activeTab === 'FAQ' && (
        <div
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          data-testid="a12-faq-list"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            {translate(locale, 'admin.a12.tab_faq')}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="border border-gray-200 rounded p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                    {faq.audience} • {faq.category}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-base">{faq.question}</h3>
                <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTION MODALS */}
      {activeModal && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
          data-testid={`a12-modal-${activeModal.toLowerCase()}`}
        >
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {activeModal === 'UPDATE' && translate(locale, 'admin.a12.modal_update_title')}
              {activeModal === 'ESCALATE' && translate(locale, 'admin.a12.modal_escalate_title')}
              {activeModal === 'CATEGORY' && translate(locale, 'admin.a12.modal_category_title')}
              {activeModal === 'CLOSE' && translate(locale, 'admin.a12.modal_close_title')}
            </h2>

            {modalError && (
              <div
                className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded"
                data-testid="a12-modal-error"
              >
                {modalError}
              </div>
            )}

            {/* Modal Specific Input */}
            {activeModal === 'UPDATE' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {translate(locale, 'admin.a12.label_update_text')}
                </label>
                <textarea
                  data-testid="a12-modal-update-input"
                  rows={4}
                  className="w-full border border-gray-300 rounded p-2 text-sm text-gray-800"
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder={translate(locale, 'admin.a12.label_update_text')}
                />
              </div>
            )}

            {activeModal === 'ESCALATE' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {translate(locale, 'admin.a12.th_level')}
                </label>
                <select
                  data-testid="a12-modal-escalate-select"
                  className="w-full border border-gray-300 rounded p-2 text-sm text-gray-800"
                  value={modalLevel}
                  onChange={(e) => setModalLevel(e.target.value as TicketLevel)}
                >
                  {ESCALATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeModal === 'CATEGORY' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {translate(locale, 'admin.a12.th_category')}
                </label>
                <select
                  data-testid="a12-modal-category-select"
                  className="w-full border border-gray-300 rounded p-2 text-sm text-gray-800"
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                >
                  {CATEGORY_SELECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeModal === 'CLOSE' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {translate(locale, 'admin.a12.label_resolution_note')}
                </label>
                <textarea
                  data-testid="a12-modal-close-input"
                  rows={3}
                  className="w-full border border-gray-300 rounded p-2 text-sm text-gray-800"
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder={translate(locale, 'admin.a12.label_resolution_note')}
                />
              </div>
            )}

            {/* Mandatory Audit Reason Input (ROLE-003) */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {translate(locale, 'admin.a12.label_audit_reason')}
              </label>
              <input
                data-testid="a12-audit-reason-input"
                type="text"
                className="w-full border border-gray-300 rounded p-2 text-sm text-gray-800"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder={translate(locale, 'admin.a12.placeholder_audit_reason')}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
              <button
                data-testid="a12-modal-cancel-btn"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedTicket(null);
                }}
              >
                {translate(locale, 'admin.a12.btn_cancel')}
              </button>
              <button
                data-testid="a12-modal-confirm-btn"
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                onClick={handleConfirmModal}
              >
                {translate(locale, 'admin.a12.btn_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

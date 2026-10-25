'use client';

import { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface DualSidedMetric {
  id: string;
  side: 'CUSTOMER' | 'SUPPLIER';
  metric: string;
  currentValue: string;
  benchmark: string;
  healthy: boolean;
}

export interface SupplyGapItem {
  id: string;
  requestId: string;
  service: string;
  requestedAt: string;
  recoveryChoice: string;
}

export const INITIAL_DUAL_METRICS: DualSidedMetric[] = [
  {
    id: 'c-1',
    side: 'CUSTOMER',
    metric: 'Request-to-Match Rate',
    currentValue: '94.8%',
    benchmark: '> 90.0%',
    healthy: true,
  },
  {
    id: 'c-2',
    side: 'CUSTOMER',
    metric: 'Booking Completion Rate',
    currentValue: '91.2%',
    benchmark: '> 88.0%',
    healthy: true,
  },
  {
    id: 'c-3',
    side: 'CUSTOMER',
    metric: 'Median Arrival Time',
    currentValue: '18 min',
    benchmark: '< 25 min',
    healthy: true,
  },
  {
    id: 's-1',
    side: 'SUPPLIER',
    metric: 'Active Provider Utilization',
    currentValue: '72.4%',
    benchmark: '> 65.0%',
    healthy: true,
  },
  {
    id: 's-2',
    side: 'SUPPLIER',
    metric: 'Time Available Without Relevant Jobs',
    currentValue: '32 min/day',
    benchmark: '< 45 min',
    healthy: true,
  },
  {
    id: 's-3',
    side: 'SUPPLIER',
    metric: 'Average Net Take-Home Per Day',
    currentValue: 'Rs. 4,850',
    benchmark: '> Rs. 4,000',
    healthy: true,
  },
];

export const INITIAL_SUPPLY_GAPS: SupplyGapItem[] = [
  {
    id: 'gap-001',
    requestId: 'req-gap-891',
    service: 'Emergency Water Tank Leakage',
    requestedAt: '2026-10-25 20:15 PKT',
    recoveryChoice: 'broaden radius (+5km)',
  },
  {
    id: 'gap-002',
    requestId: 'req-gap-892',
    service: 'Industrial 3-Phase Inverter Repair',
    requestedAt: '2026-10-25 19:40 PKT',
    recoveryChoice: 'waitlist / callback requested',
  },
];

interface A25MarketplaceHealthScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A25MarketplaceHealthScreen({
  onReturnToDashboard,
  mockScreenState,
}: A25MarketplaceHealthScreenProps) {
  const { user } = useAdminAuth();
  const screenLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A25');

  const [city, setCity] = useState('Lahore');
  const [category, setCategory] = useState('All Categories');
  const [period, setPeriod] = useState('Today');
  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');

  if (screenLevel === 'none') {
    return (
      <Forbidden403View
        screenTitle="Marketplace Health"
        screenId="A25"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const cityOptions = ['Lahore', 'Karachi', 'Islamabad'];
  const categoryOptions = ['All Categories', 'Electrician', 'Plumber', 'Air Conditioning'];
  const periodOptions = ['Today', 'Last 7 Days', 'Last 30 Days'];

  const customerMetrics = INITIAL_DUAL_METRICS.filter((m) => m.side === 'CUSTOMER');
  const supplierMetrics = INITIAL_DUAL_METRICS.filter((m) => m.side === 'SUPPLIER');

  if (screenState === 'loading') {
    return (
      <div className="admin-screen-container" data-testid="a25-marketplace-health-loading">
        <div className="admin-loading-indicator">{translate('en', 'admin.a25.loading_text')}</div>
      </div>
    );
  }

  if (screenState === 'error') {
    return (
      <div className="admin-screen-container" data-testid="a25-marketplace-health-error">
        <div className="admin-error-banner" data-testid="a25-health-error-banner">
          {translate('en', 'admin.a25.error_text')}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setScreenState('success')}
          data-testid="a25-retry-btn"
        >
          {translate('en', 'admin.a13.retry_btn')}
        </button>
      </div>
    );
  }

  if (screenState === 'pending') {
    return (
      <div className="admin-screen-container" data-testid="a25-marketplace-health-pending">
        <div className="admin-pending-banner">{translate('en', 'admin.a25.pending_text')}</div>
      </div>
    );
  }

  return (
    <div className="admin-screen-container" data-testid="a25-marketplace-health-screen">
      <header className="admin-screen-header">
        <div className="admin-screen-header-left">
          <h1 className="admin-page-title" data-testid="a25-page-title">
            {translate('en', 'admin.a25.title')}
          </h1>
          <p className="admin-page-desc">{translate('en', 'admin.a25.desc')}</p>
        </div>
        <div className="admin-screen-header-right">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setScreenState('pending');
              setTimeout(() => setScreenState('success'), 100); // kk-allow-literal: technical — ui debounce
            }}
            data-testid="a25-btn-refresh"
          >
            {translate('en', 'admin.a25.btn_refresh')}
          </button>
        </div>
      </header>

      {/* Filter Toolbar */}
      <section className="admin-filter-bar" aria-label={translate('en', 'admin.a25.title')}>
        <div className="filter-group">
          <label htmlFor="a25-city" className="filter-label">
            {translate('en', 'admin.a25.filter_city')}
          </label>
          <select
            id="a25-city"
            className="filter-select"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            data-testid="a25-filter-city"
          >
            {cityOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="a25-category" className="filter-label">
            {translate('en', 'admin.a25.filter_category')}
          </label>
          <select
            id="a25-category"
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            data-testid="a25-filter-category"
          >
            {categoryOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="a25-period" className="filter-label">
            {translate('en', 'admin.a25.filter_period')}
          </label>
          <select
            id="a25-period"
            className="filter-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            data-testid="a25-filter-period"
          >
            {periodOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Concentration Notice Banner */}
      <div className="admin-notice-banner mb-4" data-testid="a25-concentration-banner">
        <span>{translate('en', 'admin.a25.concentration_note')}</span>
      </div>

      {/* Dual Sided Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Customer Side */}
        <section
          className="admin-card"
          aria-label={translate('en', 'admin.a25.sec_customer_metrics')}
          data-testid="a25-customer-card"
        >
          <h2 className="admin-section-title">
            {translate('en', 'admin.a25.sec_customer_metrics')}
          </h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a25.th_metric')}</th>
                <th>{translate('en', 'admin.a25.th_current')}</th>
                <th>{translate('en', 'admin.a25.th_benchmark')}</th>
              </tr>
            </thead>
            <tbody>
              {customerMetrics.map((m) => (
                <tr key={m.id} data-testid={`m-row-${m.id}`}>
                  <td className="font-semibold">{m.metric}</td>
                  <td>
                    <span className="badge badge-success font-mono">{m.currentValue}</span>
                  </td>
                  <td className="text-secondary text-xs">{m.benchmark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Supplier Side */}
        <section
          className="admin-card"
          aria-label={translate('en', 'admin.a25.sec_supplier_metrics')}
          data-testid="a25-supplier-card"
        >
          <h2 className="admin-section-title">
            {translate('en', 'admin.a25.sec_supplier_metrics')}
          </h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a25.th_metric')}</th>
                <th>{translate('en', 'admin.a25.th_current')}</th>
                <th>{translate('en', 'admin.a25.th_benchmark')}</th>
              </tr>
            </thead>
            <tbody>
              {supplierMetrics.map((m) => (
                <tr key={m.id} data-testid={`m-row-${m.id}`}>
                  <td className="font-semibold">{m.metric}</td>
                  <td>
                    <span className="badge badge-info font-mono">{m.currentValue}</span>
                  </td>
                  <td className="text-secondary text-xs">{m.benchmark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* Supply Gaps Section */}
      <section
        className="admin-section"
        aria-label={translate('en', 'admin.a25.sec_supply_gaps')}
        data-testid="a25-supply-gaps-section"
      >
        <h2 className="admin-section-title">{translate('en', 'admin.a25.sec_supply_gaps')}</h2>
        {INITIAL_SUPPLY_GAPS.length === 0 || screenState === 'empty' ? (
          <div className="admin-empty-state">
            <p>{translate('en', 'admin.a25.empty_text')}</p>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table" data-testid="a25-gaps-table">
              <thead>
                <tr>
                  <th>{translate('en', 'admin.a25.th_request_id')}</th>
                  <th>{translate('en', 'admin.a25.th_service')}</th>
                  <th>{translate('en', 'admin.a25.th_time')}</th>
                  <th>{translate('en', 'admin.a25.th_gap_action')}</th>
                </tr>
              </thead>
              <tbody>
                {INITIAL_SUPPLY_GAPS.map((gap) => (
                  <tr key={gap.id} data-testid={`gap-row-${gap.id}`}>
                    <td className="font-mono text-xs">{gap.requestId}</td>
                    <td className="font-semibold">{gap.service}</td>
                    <td className="text-secondary font-mono text-xs">{gap.requestedAt}</td>
                    <td>
                      <span className="badge badge-warning text-xs">{gap.recoveryChoice}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

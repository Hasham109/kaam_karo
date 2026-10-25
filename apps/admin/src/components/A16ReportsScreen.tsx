'use client';

import { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export type ReportTab =
  | 'acquisition'
  | 'activation'
  | 'marketplace'
  | 'customer'
  | 'provider'
  | 'financial'
  | 'quality'
  | 'reliability';

export interface ReportMetricRow {
  id: string;
  tab: ReportTab;
  metric: string;
  value: string;
  target: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export const INITIAL_METRICS: ReportMetricRow[] = [
  {
    id: 'm-acq-1',
    tab: 'acquisition',
    metric: 'Customer App Installs (PK)',
    value: '14,200',
    target: '10,000 / mo',
    trend: 'UP',
  },
  {
    id: 'm-acq-2',
    tab: 'acquisition',
    metric: 'Partner Onboarding Submissions',
    value: '840',
    target: '500 / mo',
    trend: 'UP',
  },
  {
    id: 'm-act-1',
    tab: 'activation',
    metric: 'First-Job Request Conversion',
    value: '68.4%',
    target: '65.0%',
    trend: 'UP',
  },
  {
    id: 'm-act-2',
    tab: 'activation',
    metric: 'Partner First Completion Rate',
    value: '74.2%',
    target: '70.0%',
    trend: 'STABLE',
  },
  {
    id: 'm-mkt-1',
    tab: 'marketplace',
    metric: 'Request-to-Match Rate',
    value: '94.8%',
    target: '90.0%',
    trend: 'UP',
  },
  {
    id: 'm-mkt-2',
    tab: 'marketplace',
    metric: 'Median Time to Accept',
    value: '3.4 min',
    target: '< 5.0 min',
    trend: 'DOWN',
  },
  {
    id: 'm-cust-1',
    tab: 'customer',
    metric: 'Customer Repeat Booking Rate',
    value: '38.6%',
    target: '35.0%',
    trend: 'UP',
  },
  {
    id: 'm-cust-2',
    tab: 'customer',
    metric: 'Customer CSAT Score',
    value: '4.82 / 5',
    target: '> 4.50',
    trend: 'STABLE',
  },
  {
    id: 'm-prov-1',
    tab: 'provider',
    metric: 'Active Online Hours / Worker',
    value: '6.2 hrs/day',
    target: '6.0 hrs',
    trend: 'STABLE',
  },
  {
    id: 'm-prov-2',
    tab: 'provider',
    metric: 'Daily Median Take-Home (PKR)',
    value: 'Rs. 4,850',
    target: '> Rs. 4,000',
    trend: 'UP',
  },
  {
    id: 'm-fin-1',
    tab: 'financial',
    metric: 'Net Labour GMV (PKR)',
    value: 'Rs. 2,450,000',
    target: 'Baseline',
    trend: 'UP',
  },
  {
    id: 'm-fin-2',
    tab: 'financial',
    metric: 'Platform Commission Collected',
    value: 'Rs. 735,000',
    target: '30% Labour',
    trend: 'UP',
  },
  {
    id: 'm-qual-1',
    tab: 'quality',
    metric: 'Job Rework / Dispute Rate',
    value: '1.2%',
    target: '< 2.0%',
    trend: 'DOWN',
  },
  {
    id: 'm-qual-2',
    tab: 'quality',
    metric: 'Provider Unexcused No-Shows',
    value: '0.4%',
    target: '< 1.0%',
    trend: 'DOWN',
  },
  {
    id: 'm-rel-1',
    tab: 'reliability',
    metric: 'Platform API Uptime',
    value: '99.98%',
    target: '99.90%',
    trend: 'STABLE',
  },
  {
    id: 'm-rel-2',
    tab: 'reliability',
    metric: 'p95 API Latency',
    value: '84 ms',
    target: '< 200 ms',
    trend: 'STABLE',
  },
];

interface A16ReportsScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A16ReportsScreen({ onReturnToDashboard, mockScreenState }: A16ReportsScreenProps) {
  const { user } = useAdminAuth();
  const screenLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A16');

  const [activeTab, setActiveTab] = useState<ReportTab>('marketplace');
  const [city, setCity] = useState('Lahore');
  const [period, setPeriod] = useState('Last 30 Days');
  const [category, setCategory] = useState('All Categories');
  const [dataFreshness] = useState('2026-10-25 21:00 PKT');
  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');

  if (screenLevel === 'none') {
    return (
      <Forbidden403View
        screenTitle="Reports & Analytics"
        screenId="A16"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  // Check tab access per footnote 10 in docs/screens/admin.md
  // Operations -> Marketplace, Customer, Provider, Quality
  // Finance -> Financial
  // Technical Admin -> Reliability
  // Analyst & Super Admin -> all groups
  const isTabPermitted = (tab: ReportTab): boolean => {
    const roles = user?.subRoles ?? [];
    if (roles.includes('SUPER_ADMIN') || roles.includes('ANALYST')) {
      return true;
    }
    if (roles.includes('OPERATIONS')) {
      return ['marketplace', 'customer', 'provider', 'quality'].includes(tab);
    }
    if (roles.includes('FINANCE')) {
      return tab === 'financial';
    }
    if (roles.includes('TECHNICAL_ADMIN')) {
      return tab === 'reliability';
    }
    return false;
  };

  const tabs: { key: ReportTab; labelKey: `admin.a16.tab_${ReportTab}` }[] = [
    { key: 'marketplace', labelKey: 'admin.a16.tab_marketplace' },
    { key: 'customer', labelKey: 'admin.a16.tab_customer' },
    { key: 'provider', labelKey: 'admin.a16.tab_provider' },
    { key: 'financial', labelKey: 'admin.a16.tab_financial' },
    { key: 'quality', labelKey: 'admin.a16.tab_quality' },
    { key: 'reliability', labelKey: 'admin.a16.tab_reliability' },
    { key: 'acquisition', labelKey: 'admin.a16.tab_acquisition' },
    { key: 'activation', labelKey: 'admin.a16.tab_activation' },
  ];

  const cityOptions = ['Lahore', 'Karachi', 'Islamabad'];
  const periodOptions = ['Today', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days'];
  const categoryOptions = ['All Categories', 'Electrician', 'Plumber', 'Air Conditioning'];

  const filteredMetrics = INITIAL_METRICS.filter((m) => m.tab === activeTab);

  if (screenState === 'loading') {
    return (
      <div className="admin-screen-container" data-testid="a16-reports-screen-loading">
        <div className="admin-loading-indicator">{translate('en', 'admin.a16.loading_text')}</div>
      </div>
    );
  }

  if (screenState === 'error') {
    return (
      <div className="admin-screen-container" data-testid="a16-reports-screen-error">
        <div className="admin-error-banner" data-testid="a16-reports-error-banner">
          {translate('en', 'admin.a16.error_text')}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setScreenState('success')}
          data-testid="a16-retry-btn"
        >
          {translate('en', 'admin.a13.retry_btn')}
        </button>
      </div>
    );
  }

  if (screenState === 'pending') {
    return (
      <div className="admin-screen-container" data-testid="a16-reports-screen-pending">
        <div className="admin-pending-banner">{translate('en', 'admin.a16.pending_text')}</div>
      </div>
    );
  }

  const tabAllowed = isTabPermitted(activeTab);

  return (
    <div className="admin-screen-container" data-testid="a16-reports-screen">
      <header className="admin-screen-header">
        <div className="admin-screen-header-left">
          <h1 className="admin-page-title" data-testid="a16-page-title">
            {translate('en', 'admin.a16.title')}
          </h1>
          <p className="admin-page-desc">{translate('en', 'admin.a16.desc')}</p>
        </div>
        <div className="admin-screen-header-right">
          <span className="badge badge-info" data-testid="a16-data-freshness">
            {translate('en', 'admin.a16.data_freshness', { time: dataFreshness })}
          </span>
        </div>
      </header>

      {/* Filter Toolbar */}
      <section className="admin-filter-bar" aria-label={translate('en', 'admin.a16.title')}>
        <div className="filter-group">
          <label htmlFor="a16-city" className="filter-label">
            {translate('en', 'admin.a16.filter_city')}
          </label>
          <select
            id="a16-city"
            className="filter-select"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            data-testid="a16-filter-city"
          >
            {cityOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="a16-category" className="filter-label">
            {translate('en', 'admin.a16.filter_category')}
          </label>
          <select
            id="a16-category"
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            data-testid="a16-filter-category"
          >
            {categoryOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="a16-period" className="filter-label">
            {translate('en', 'admin.a16.filter_period')}
          </label>
          <select
            id="a16-period"
            className="filter-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            data-testid="a16-filter-period"
          >
            {periodOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <div className="filter-label" />
          <button
            id="a16-refresh-btn"
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setScreenState('pending');
              setTimeout(() => setScreenState('success'), 100); // kk-allow-literal: technical — ui debounce
            }}
            data-testid="a16-btn-show"
          >
            {translate('en', 'admin.a16.btn_show')}
          </button>
        </div>
      </section>

      {/* Report Tabs */}
      <nav
        className="admin-tabs-nav"
        aria-label={translate('en', 'admin.a16.title')}
        data-testid="a16-tabs-nav"
      >
        {tabs.map((tab) => {
          const permitted = isTabPermitted(tab.key);
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`tab-btn ${isSelected ? 'active' : ''} ${!permitted ? 'disabled' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`a16-tab-${tab.key}`}
              aria-selected={isSelected}
            >
              {translate('en', tab.labelKey)}
              {!permitted && ' 🔒'}
            </button>
          );
        })}
      </nav>

      {/* Tab Content / Forbidden Warning / Empty State */}
      {!tabAllowed ? (
        <div className="admin-panel-restricted" data-testid="a16-tab-forbidden-message">
          <p className="form-error">
            {translate('en', 'admin.a16.forbidden_tab', {
              tab: activeTab,
              role: (user?.subRoles ?? []).join(', '),
            })}
          </p>
        </div>
      ) : filteredMetrics.length === 0 || screenState === 'empty' ? (
        <div className="admin-empty-state" data-testid="a16-empty-state">
          <p>{translate('en', 'admin.a16.empty_text')}</p>
        </div>
      ) : (
        <div className="admin-table-wrapper" data-testid="a16-metrics-table-wrapper">
          <table className="admin-table" data-testid="a16-metrics-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a16.th_metric')}</th>
                <th>{translate('en', 'admin.a16.th_value')}</th>
                <th>{translate('en', 'admin.a16.th_target')}</th>
                <th>{translate('en', 'admin.a16.th_trend')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMetrics.map((row) => (
                <tr key={row.id} data-testid={`a16-row-${row.id}`}>
                  <td className="font-semibold">{row.metric}</td>
                  <td>
                    <span className="badge badge-neutral" data-testid={`val-${row.id}`}>
                      {row.value}
                    </span>
                  </td>
                  <td className="text-secondary">{row.target}</td>
                  <td>
                    <span
                      className={`badge ${
                        row.trend === 'UP'
                          ? 'badge-success'
                          : row.trend === 'DOWN'
                            ? 'badge-warning'
                            : 'badge-neutral'
                      }`}
                      data-testid={`trend-${row.id}`}
                    >
                      {row.trend}
                    </span>
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

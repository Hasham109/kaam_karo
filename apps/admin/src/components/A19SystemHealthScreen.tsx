'use client';

import { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface ComponentStatus {
  name: string;
  status: 'OK' | 'DEGRADED' | 'DOWN';
  checkedAt: string;
}

export interface QueueStatus {
  name: string;
  depth: number;
  backlog: number;
  failedJobs: number;
}

export interface IntegrationStatus {
  name: string;
  mode: 'Fake' | 'Real';
  status: 'Healthy' | 'Degraded';
}

export const INITIAL_COMPONENTS: ComponentStatus[] = [
  { name: 'Core API Gateway', status: 'OK', checkedAt: '2026-10-25 21:30 PKT' },
  { name: 'PostgreSQL Primary (RDS)', status: 'OK', checkedAt: '2026-10-25 21:30 PKT' },
  { name: 'Redis Cache & PubSub', status: 'OK', checkedAt: '2026-10-25 21:30 PKT' },
  { name: 'BullMQ Async Workers', status: 'OK', checkedAt: '2026-10-25 21:30 PKT' },
  { name: 'S3 Private Storage Vault', status: 'OK', checkedAt: '2026-10-25 21:30 PKT' },
];

export const INITIAL_QUEUES: QueueStatus[] = [
  { name: 'booking-lifecycle', depth: 4, backlog: 0, failedJobs: 0 }, // kk-allow-literal: technical — queue depth
  { name: 'notifications-dispatch', depth: 1, backlog: 0, failedJobs: 0 },
  { name: 'analytics-aggregation', depth: 8, backlog: 1, failedJobs: 0 }, // kk-allow-literal: technical — queue depth
  { name: 'payment-reconciliation', depth: 0, backlog: 0, failedJobs: 0 },
];

export const INITIAL_INTEGRATIONS: IntegrationStatus[] = [
  { name: 'OtpSender', mode: 'Fake', status: 'Healthy' },
  { name: 'PaymentGateway', mode: 'Fake', status: 'Healthy' },
  { name: 'PayoutProvider', mode: 'Fake', status: 'Healthy' },
  { name: 'IntakeAI (Gemini Flash)', mode: 'Real', status: 'Healthy' },
  { name: 'SpeechToText', mode: 'Real', status: 'Healthy' },
  { name: 'CallRelay', mode: 'Fake', status: 'Healthy' },
  { name: 'MailSender', mode: 'Fake', status: 'Healthy' },
  { name: 'PushSender (FCM)', mode: 'Fake', status: 'Healthy' },
  { name: 'ObjectStore (S3 Compatible)', mode: 'Real', status: 'Healthy' },
  { name: 'AnalyticsSink', mode: 'Real', status: 'Healthy' },
  { name: 'GeoService (Google Maps)', mode: 'Real', status: 'Healthy' },
];

interface A19SystemHealthScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A19SystemHealthScreen({
  onReturnToDashboard,
  mockScreenState,
}: A19SystemHealthScreenProps) {
  const { user } = useAdminAuth();
  const screenLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A19');

  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');
  const [components] = useState<ComponentStatus[]>(INITIAL_COMPONENTS);
  const [queues] = useState<QueueStatus[]>(INITIAL_QUEUES);
  const [integrations] = useState<IntegrationStatus[]>(INITIAL_INTEGRATIONS);

  if (screenLevel === 'none') {
    return (
      <Forbidden403View
        screenTitle="System Health"
        screenId="A19"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  if (screenState === 'loading') {
    return (
      <div className="admin-screen-container" data-testid="a19-system-health-loading">
        <div className="admin-loading-indicator">{translate('en', 'admin.a19.loading_text')}</div>
      </div>
    );
  }

  if (screenState === 'error') {
    return (
      <div className="admin-screen-container" data-testid="a19-system-health-error">
        <div className="admin-error-banner" data-testid="a19-health-error-banner">
          {translate('en', 'admin.a19.error_text')}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setScreenState('success')}
          data-testid="a19-retry-btn"
        >
          {translate('en', 'admin.a13.retry_btn')}
        </button>
      </div>
    );
  }

  if (screenState === 'pending') {
    return (
      <div className="admin-screen-container" data-testid="a19-system-health-pending">
        <div className="admin-pending-banner">{translate('en', 'admin.a19.pending_text')}</div>
      </div>
    );
  }

  return (
    <div className="admin-screen-container" data-testid="a19-system-health-screen">
      <header className="admin-screen-header">
        <div className="admin-screen-header-left">
          <h1 className="admin-page-title" data-testid="a19-page-title">
            {translate('en', 'admin.a19.title')}
          </h1>
          <p className="admin-page-desc">{translate('en', 'admin.a19.desc')}</p>
        </div>
        <div className="admin-screen-header-right">
          <span className="badge badge-neutral" data-testid="a19-env-badge">
            {translate('en', 'admin.env.production')}
          </span>
          <button
            type="button"
            className="btn btn-primary ml-2"
            onClick={() => {
              setScreenState('pending');
              setTimeout(() => setScreenState('success'), 100); // kk-allow-literal: technical — ui debounce
            }}
            data-testid="a19-btn-refresh"
          >
            {translate('en', 'admin.a19.btn_refresh')}
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="stats-grid" data-testid="a19-kpi-grid">
        <div className="stat-card">
          <div className="stat-label">{translate('en', 'admin.a19.metric_uptime')}</div>
          <div className="stat-value font-mono text-success" data-testid="metric-uptime">
            99.98%
          </div>
          <div className="text-secondary text-xs">{translate('en', 'admin.a19.sub_uptime')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{translate('en', 'admin.a19.metric_error_rate')}</div>
          <div className="stat-value font-mono" data-testid="metric-error-rate">
            0.02%
          </div>
          <div className="text-secondary text-xs">{translate('en', 'admin.a19.sub_error')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{translate('en', 'admin.a19.metric_latency')}</div>
          <div className="stat-value font-mono" data-testid="metric-latency">
            {translate('en', 'admin.a19.metric_latency_val')}
          </div>
          <div className="text-secondary text-xs">{translate('en', 'admin.a19.sub_latency')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{translate('en', 'admin.a19.metric_notif_failures')}</div>
          <div className="stat-value font-mono" data-testid="metric-notif-failures">
            0
          </div>
          <div className="text-secondary text-xs">{translate('en', 'admin.a19.sub_channels')}</div>
        </div>
      </div>

      {/* Component Status Section */}
      <section
        className="admin-section"
        aria-label={translate('en', 'admin.a19.sec_components')}
        data-testid="a19-components-section"
      >
        <h2 className="admin-section-title">{translate('en', 'admin.a19.sec_components')}</h2>
        <div className="admin-table-wrapper">
          <table className="admin-table" data-testid="a19-components-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a19.th_component')}</th>
                <th>{translate('en', 'admin.a19.th_status')}</th>
                <th>{translate('en', 'admin.a19.th_checked')}</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr key={c.name} data-testid={`comp-${c.name}`}>
                  <td className="font-semibold">{c.name}</td>
                  <td>
                    <span
                      className={`badge ${
                        c.status === 'OK'
                          ? 'badge-success'
                          : c.status === 'DEGRADED'
                            ? 'badge-warning'
                            : 'badge-error'
                      }`}
                      data-testid={`status-${c.name}`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="text-secondary font-mono text-xs">{c.checkedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Queues and Workers Section */}
      <section
        className="admin-section"
        aria-label={translate('en', 'admin.a19.sec_queues')}
        data-testid="a19-queues-section"
      >
        <h2 className="admin-section-title">{translate('en', 'admin.a19.sec_queues')}</h2>
        <div className="admin-table-wrapper">
          <table className="admin-table" data-testid="a19-queues-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a19.th_queue')}</th>
                <th>{translate('en', 'admin.a19.th_depth')}</th>
                <th>{translate('en', 'admin.a19.th_backlog')}</th>
                <th>{translate('en', 'admin.a19.th_failed')}</th>
              </tr>
            </thead>
            <tbody>
              {queues.map((q) => (
                <tr key={q.name} data-testid={`queue-${q.name}`}>
                  <td className="font-semibold font-mono">{q.name}</td>
                  <td>
                    <span className="badge badge-neutral font-mono">{q.depth}</span>
                  </td>
                  <td>
                    <span className="badge badge-neutral font-mono">{q.backlog}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${q.failedJobs > 0 ? 'badge-error' : 'badge-success'}`}
                      data-testid={`failed-${q.name}`}
                    >
                      {q.failedJobs}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* External Integrations Section */}
      <section
        className="admin-section"
        aria-label={translate('en', 'admin.a19.sec_integrations')}
        data-testid="a19-integrations-section"
      >
        <h2 className="admin-section-title">{translate('en', 'admin.a19.sec_integrations')}</h2>
        <div className="admin-table-wrapper">
          <table className="admin-table" data-testid="a19-integrations-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a19.th_interface')}</th>
                <th>{translate('en', 'admin.a19.th_mode')}</th>
                <th>{translate('en', 'admin.a19.th_status')}</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((itg) => (
                <tr key={itg.name} data-testid={`itg-${itg.name}`}>
                  <td className="font-semibold">{itg.name}</td>
                  <td>
                    <span
                      className={`badge ${itg.mode === 'Real' ? 'badge-info' : 'badge-neutral'}`}
                    >
                      {itg.mode}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        itg.status === 'Healthy' ? 'badge-success' : 'badge-warning'
                      }`}
                      data-testid={`itg-status-${itg.name}`}
                    >
                      {itg.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

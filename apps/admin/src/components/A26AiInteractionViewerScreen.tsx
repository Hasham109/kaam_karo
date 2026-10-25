'use client';

import { useState } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface AiInteractionItem {
  id: string;
  requestId: string;
  aiModelVersion: string;
  guidanceVersion: string;
  inputClass: 'TEXT' | 'VOICE' | 'PHOTO';
  confidence: number;
  safetyState: 'PASSED' | 'FLAGGED' | 'BLOCKED';
  latencyMs: number;
  aiSuggestedService: string;
  aiSuggestedSummary: string;
  customerConfirmedService: string;
  customerConfirmedSummary: string;
}

export const INITIAL_INTERACTIONS: AiInteractionItem[] = [
  {
    id: 'ai-int-101',
    requestId: 'req-c-20261025-01',
    aiModelVersion: 'gemini-2.0-flash-001',
    guidanceVersion: 'v1.4',
    inputClass: 'TEXT',
    confidence: 0.94, // kk-allow-literal: technical — confidence score
    safetyState: 'PASSED',
    latencyMs: 340, // kk-allow-literal: technical — latency in ms
    aiSuggestedService: 'Ceiling Fan Installation & Wiring',
    aiSuggestedSummary: 'Customer requested 2 new ceiling fans mounted in living room',
    customerConfirmedService: 'Ceiling Fan Installation & Wiring',
    customerConfirmedSummary: '2 ceiling fans installed, confirmed without modification',
  },
  {
    id: 'ai-int-102',
    requestId: 'req-c-20261025-02',
    aiModelVersion: 'gemini-2.0-flash-001',
    guidanceVersion: 'v1.4',
    inputClass: 'VOICE',
    confidence: 0.88, // kk-allow-literal: technical — confidence score
    safetyState: 'PASSED',
    latencyMs: 520, // kk-allow-literal: technical — latency in ms
    aiSuggestedService: 'AC Master Service & Gas Refill',
    aiSuggestedSummary: 'Urdu voice message: AC cooling kam hai aur gas leak lagti hai',
    customerConfirmedService: 'AC Master Service & Gas Refill',
    customerConfirmedSummary: '1.5 ton split AC master service confirmed',
  },
  {
    id: 'ai-int-103',
    requestId: 'req-c-20261025-03',
    aiModelVersion: 'gemini-2.0-flash-001',
    guidanceVersion: 'v1.4',
    inputClass: 'PHOTO',
    confidence: 0.72, // kk-allow-literal: technical — confidence score
    safetyState: 'FLAGGED',
    latencyMs: 780, // kk-allow-literal: technical — latency in ms
    aiSuggestedService: 'Water Motor Pump Repair',
    aiSuggestedSummary: 'Image of burnt capacitor on water pump motor',
    customerConfirmedService: 'Water Motor Pump Replacement',
    customerConfirmedSummary: 'Customer modified to complete replacement due to age of motor',
  },
];

interface A26AiInteractionViewerScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A26AiInteractionViewerScreen({
  onReturnToDashboard,
  mockScreenState,
}: A26AiInteractionViewerScreenProps) {
  const { user } = useAdminAuth();
  const screenLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A26');

  const [selectedInteraction, setSelectedInteraction] = useState<AiInteractionItem | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');

  if (screenLevel === 'none') {
    return (
      <Forbidden403View
        screenTitle="AI Interaction Viewer"
        screenId="A26"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  // Check if user is restricted as Technical Admin per footnote 12 in docs/screens/admin.md
  // Technical Admin sees technical telemetry only; request text and summaries are hidden.
  const roles = user?.subRoles ?? [];
  const isTaRestricted =
    roles.includes('TECHNICAL_ADMIN') &&
    !roles.includes('SUPER_ADMIN') &&
    !roles.includes('OPERATIONS') &&
    !roles.includes('RISK_TRUST');

  if (screenState === 'loading') {
    return (
      <div className="admin-screen-container" data-testid="a26-ai-viewer-loading">
        <div className="admin-loading-indicator">{translate('en', 'admin.a26.loading_text')}</div>
      </div>
    );
  }

  if (screenState === 'error') {
    return (
      <div className="admin-screen-container" data-testid="a26-ai-viewer-error">
        <div className="admin-error-banner" data-testid="a26-ai-error-banner">
          {translate('en', 'admin.a26.error_text')}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setScreenState('success')}
          data-testid="a26-retry-btn"
        >
          {translate('en', 'admin.a13.retry_btn')}
        </button>
      </div>
    );
  }

  if (screenState === 'pending') {
    return (
      <div className="admin-screen-container" data-testid="a26-ai-viewer-pending">
        <div className="admin-pending-banner">{translate('en', 'admin.a26.pending_text')}</div>
      </div>
    );
  }

  return (
    <div className="admin-screen-container" data-testid="a26-ai-viewer-screen">
      <header className="admin-screen-header">
        <div className="admin-screen-header-left">
          <h1 className="admin-page-title" data-testid="a26-page-title">
            {translate('en', 'admin.a26.title')}
          </h1>
          <p className="admin-page-desc">{translate('en', 'admin.a26.desc')}</p>
        </div>
      </header>

      {/* Interactions Table */}
      {INITIAL_INTERACTIONS.length === 0 || screenState === 'empty' ? (
        <div className="admin-empty-state" data-testid="a26-empty-state">
          <p>{translate('en', 'admin.a26.empty_text')}</p>
        </div>
      ) : (
        <div className="admin-table-wrapper" data-testid="a26-table-wrapper">
          <table className="admin-table" data-testid="a26-interactions-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a26.th_interaction_id')}</th>
                <th>{translate('en', 'admin.a26.th_request_id')}</th>
                <th>{translate('en', 'admin.a26.th_ai_version')}</th>
                <th>{translate('en', 'admin.a26.th_guidance_version')}</th>
                <th>{translate('en', 'admin.a26.th_input_class')}</th>
                <th>{translate('en', 'admin.a26.th_confidence')}</th>
                <th>{translate('en', 'admin.a26.th_safety')}</th>
                <th>{translate('en', 'admin.a26.th_latency')}</th>
                <th>{translate('en', 'admin.a26.th_action')}</th>
              </tr>
            </thead>
            <tbody>
              {INITIAL_INTERACTIONS.map((item) => (
                <tr key={item.id} data-testid={`ai-row-${item.id}`}>
                  <td className="font-mono text-xs">{item.id}</td>
                  <td className="font-mono text-xs text-secondary">{item.requestId}</td>
                  <td className="font-mono text-xs">{item.aiModelVersion}</td>
                  <td className="badge badge-neutral text-xs">{item.guidanceVersion}</td>
                  <td>
                    <span className="badge badge-info text-xs">{item.inputClass}</span>
                  </td>
                  <td className="font-mono text-xs">{item.confidence.toFixed(2)}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.safetyState === 'PASSED'
                          ? 'badge-success'
                          : item.safetyState === 'FLAGGED'
                            ? 'badge-warning'
                            : 'badge-error'
                      }`}
                      data-testid={`safety-${item.id}`}
                    >
                      {item.safetyState}
                    </span>
                  </td>
                  <td className="font-mono text-xs">
                    {translate('en', 'admin.a26.latency_val', { ms: item.latencyMs })}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedInteraction(item)}
                      data-testid={`view-comp-${item.id}`}
                    >
                      {translate('en', 'admin.a26.btn_view_comparison')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Comparison Detail Modal */}
      {selectedInteraction && (
        <div className="modal-backdrop" data-testid="a26-comparison-modal">
          <div className="modal-card max-w-2xl">
            <h2 className="modal-title">{translate('en', 'admin.a26.modal_title')}</h2>
            <p className="modal-subtitle">
              {translate('en', 'admin.a26.modal_subtitle', {
                id: selectedInteraction.id,
                model: selectedInteraction.aiModelVersion,
                guidance: selectedInteraction.guidanceVersion,
              })}
            </p>

            {isTaRestricted ? (
              <div className="admin-notice-banner mb-4" data-testid="a26-ta-restricted-notice">
                <span>{translate('en', 'admin.a26.ta_restricted_note')}</span>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4"
                data-testid="a26-comparison-content"
              >
                <div className="border border-slate-700 p-3 rounded bg-slate-900">
                  <h3 className="font-semibold text-primary mb-2">
                    {translate('en', 'admin.a26.col_ai_suggested')}
                  </h3>
                  <div className="text-sm font-semibold mb-1" data-testid="ai-suggested-service">
                    {selectedInteraction.aiSuggestedService}
                  </div>
                  <div className="text-xs text-secondary" data-testid="ai-suggested-summary">
                    {selectedInteraction.aiSuggestedSummary}
                  </div>
                </div>

                <div className="border border-slate-700 p-3 rounded bg-slate-900">
                  <h3 className="font-semibold text-success mb-2">
                    {translate('en', 'admin.a26.col_cust_confirmed')}
                  </h3>
                  <div className="text-sm font-semibold mb-1" data-testid="cust-confirmed-service">
                    {selectedInteraction.customerConfirmedService}
                  </div>
                  <div className="text-xs text-secondary" data-testid="cust-confirmed-summary">
                    {selectedInteraction.customerConfirmedSummary}
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedInteraction(null)}
                data-testid="a26-close-modal-btn"
              >
                {translate('en', 'admin.a26.btn_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

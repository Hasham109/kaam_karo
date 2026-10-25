/**
 * Screen A21 — Matching Weights & Fairness
 * Source of Truth: docs/screens/admin.md §3 A21
 * Requirements: OPS-ADMIN-021, MATCH-SCORE-001..013, MATCH-FAIR-001..004,
 * BP §54, §66, §68, D-010, D-020, D-026.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface MatchingSignalWeight {
  key: string;
  name: string;
  description: string;
  weight: number;
}

export const INITIAL_WEIGHTS: MatchingSignalWeight[] = [
  {
    key: 'distance',
    name: 'Distance to Job Location',
    description: 'Haversine km distance and road travel time',
    weight: 0.2,
  },
  {
    key: 'availabilityEta',
    name: 'Availability & Slot ETA',
    description: 'Immediate slot readiness within customer window',
    weight: 0.15,
  },
  {
    key: 'ratingReviews',
    name: 'Rating & Quality Score',
    description: 'Bayesian smoothed customer review score',
    weight: 0.15,
  },
  {
    key: 'acceptanceRate',
    name: 'Historical Acceptance Rate',
    description: 'Proportion of requests accepted without decline',
    weight: 0.1,
  },
  {
    key: 'completionRate',
    name: 'Job Completion Reliability',
    description: 'Jobs completed successfully without cancellation',
    weight: 0.1,
  },
  {
    key: 'responseTime',
    name: 'Response Time Speed',
    description: 'Average response speed to customer requests',
    weight: 0.05,
  },
  {
    key: 'repeatCustomer',
    name: 'Repeat Customer Preference',
    description: 'Prior positive booking history with this customer',
    weight: 0.05,
  },
  {
    key: 'badgeTier',
    name: 'Platform Badges & Specialty',
    description: 'Verified fact and rule badges held',
    weight: 0.05,
  },
  {
    key: 'verificationStanding',
    name: 'Verification Tier',
    description: 'Basic vs Verified vs Business Verified standing',
    weight: 0.05,
  },
  {
    key: 'equipmentTools',
    name: 'Equipment & Tooling',
    description: 'Certified specialized tool readiness',
    weight: 0.03,
  },
  {
    key: 'capacityLoad',
    name: 'Active Load & Capacity',
    description: 'Available buffer below max active jobs limit',
    weight: 0.03,
  },
  {
    key: 'priceCompetitiveness',
    name: 'Price Competitiveness',
    description: 'Proximity to category baseline standard fare',
    weight: 0.02,
  },
  {
    key: 'experienceTenure',
    name: 'Platform Tenure & Volume',
    description: 'Total successful jobs completed on platform',
    weight: 0.02,
  },
];

interface A21WeightsScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A21WeightsScreen({ onReturnToDashboard, mockScreenState }: A21WeightsScreenProps) {
  const { user } = useAdminAuth();

  // RBAC Guard: Super Admin only; all others get 403 Forbidden
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A21');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="Matching Weights"
        screenId="A21"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');
  const [weights, setWeights] = useState<MatchingSignalWeight[]>(INITIAL_WEIGHTS);
  const [rankingVersion, setRankingVersion] = useState<number>(1);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [auditReason, setAuditReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const totalAssignedWeight = Number(
    weights.reduce((sum, item) => sum + item.weight, 0).toFixed(2),
  );

  const handleWeightChange = (key: string, value: number) => {
    setWeights((prev) =>
      prev.map((item) => (item.key === key ? { ...item, weight: value } : item)),
    );
  };

  const handleOpenSaveModal = () => {
    setShowSaveModal(true);
    setAuditReason('');
    setReasonError(null);
  };

  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
    setAuditReason('');
    setReasonError(null);
  };

  const handleConfirmSave = (e: FormEvent) => {
    e.preventDefault();
    if (!auditReason.trim()) {
      setReasonError(translate('en', 'admin.a03.err_reason'));
      return;
    }

    const nextVersion = rankingVersion + 1;
    setRankingVersion(nextVersion);

    setSuccessBanner(
      translate('en', 'admin.a21.success_saved', {
        version: String(nextVersion),
        reason: auditReason.trim(),
      }),
    );

    handleCloseSaveModal();
  };

  // State: Loading
  if (screenState === 'loading') {
    return (
      <div className="state-card" data-testid="a21-state-loading">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a21.loading_text')}</p>
      </div>
    );
  }

  // State: Error
  if (screenState === 'error') {
    return (
      <div className="state-card" data-testid="a21-state-error">
        <div className="error-icon">⚠️</div>
        <p className="state-text">{translate('en', 'admin.a21.error_text')}</p>
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
      <div className="state-card" data-testid="a21-state-pending">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a13.pending_text')}</p>
      </div>
    );
  }

  return (
    <div className="admin-page" data-testid="a21-weights-screen">
      {/* Header */}
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a21-page-title">
            {translate('en', 'admin.a21.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a21.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a21-access-level">
          {translate('en', 'admin.access.chip', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {successBanner && (
        <div className="alert alert-success" data-testid="a21-success-banner">
          <span>{successBanner}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessBanner(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Version & Hard Invariant Banner */}
      <div className="alert alert-info" data-testid="a21-info-banner">
        <div>
          <strong>
            {translate('en', 'admin.a21.version_label', { version: String(rankingVersion) })}
          </strong>
          <p className="cell-secondary">{translate('en', 'admin.a21.hard_filters_note')}</p>
        </div>
        <button
          type="button"
          data-testid="a21-open-save-btn"
          className="btn btn-primary"
          onClick={handleOpenSaveModal}
        >
          {translate('en', 'admin.a21.btn_save_version')}
        </button>
      </div>

      {/* Weights Table */}
      <div className="table-card">
        <table className="admin-table" data-testid="a21-weights-table">
          <thead>
            <tr>
              <th>{translate('en', 'admin.a21.th_signal')}</th>
              <th>{translate('en', 'admin.a21.th_description')}</th>
              <th>{translate('en', 'admin.a21.th_weight')}</th>
            </tr>
          </thead>
          <tbody>
            {weights.map((signal) => (
              <tr key={signal.key} data-testid={`a21-row-${signal.key}`}>
                <td>
                  <strong>{signal.name}</strong>
                  <div className="cell-secondary">
                    <code>{signal.key}</code>
                  </div>
                </td>
                <td>
                  <span className="text-secondary">{signal.description}</span>
                </td>
                <td>
                  <div className="weight-input-group">
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      max={1}
                      className="form-input"
                      style={{ width: '90px' }}
                      data-testid={`a21-input-${signal.key}`}
                      value={signal.weight}
                      onChange={(e) => handleWeightChange(signal.key, Number(e.target.value))}
                    />
                    <span className="chip-mini">{`${(signal.weight * 100).toFixed(0)}%`}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-backdrop" data-testid="a21-save-modal">
          <div className="modal-card">
            <h2 className="modal-title">
              {translate('en', 'admin.a21.modal_title', {
                version: String(rankingVersion + 1),
              })}
            </h2>
            <div className="modal-subtitle">
              {translate('en', 'admin.a21.modal_subtitle', {
                total: `${(totalAssignedWeight * 100).toFixed(0)}%`,
              })}
            </div>

            <form onSubmit={handleConfirmSave}>
              {/* Audit Reason (Mandatory per ROLE-003) */}
              <div className="form-group">
                <label htmlFor="a21-reason" className="form-label">
                  {translate('en', 'admin.a03.reason_label')}
                </label>
                <textarea
                  id="a21-reason"
                  data-testid="a21-audit-reason-input"
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
                  <p className="form-error" data-testid="a21-reason-error">
                    {reasonError}
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  data-testid="a21-cancel-btn"
                  className="btn btn-secondary"
                  onClick={handleCloseSaveModal}
                >
                  {translate('en', 'admin.a03.cancel_btn')}
                </button>
                <button
                  type="submit"
                  data-testid="a21-confirm-save-btn"
                  className="btn btn-primary"
                >
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

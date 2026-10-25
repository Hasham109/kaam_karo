/**
 * Screen A24 — AI Guidance & Customer Questions
 * Source of Truth: docs/screens/admin.md §3 A24
 * Requirements: OPS-ADMIN-024, CAT-SVC-006, CAT-SVC-007, REQ-AI-003,
 * REQ-AI-007, REQ-AI-008, BP §64, §67, D-010, D-026.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface CustomerQuestionItem {
  id: string;
  order: number;
  questionEn: string;
  questionUr: string;
  answerType: 'TEXT' | 'NUMBER' | 'PHOTO' | 'SELECT';
  isRequired: boolean;
}

export interface ServiceAiConfig {
  serviceId: string;
  serviceName: string;
  guidanceVersion: number;
  aiGuidanceText: string;
  questions: CustomerQuestionItem[];
}

export const INITIAL_AI_CONFIGS: Record<string, ServiceAiConfig> = {
  'svc-01': {
    serviceId: 'svc-01',
    serviceName: 'AC General Service',
    guidanceVersion: 3,
    aiGuidanceText:
      'Guide customer to specify AC capacity (tons), indoor vs outdoor leakage symptoms, and cooling performance. Do not offer pricing guarantees before provider inspection.',
    questions: [
      {
        id: 'q-01',
        order: 1,
        questionEn: 'What is the AC ton capacity?',
        questionUr: 'اے سی کی گنجائش (ٹن) کیا ہے؟',
        answerType: 'SELECT',
        isRequired: true,
      },
      {
        id: 'q-02',
        order: 2,
        questionEn: 'Is the outdoor unit accessible safely?',
        questionUr: 'کیا آؤٹ ڈور یونٹ تک محفوظ رسائی ممکن ہے؟',
        answerType: 'SELECT',
        isRequired: true,
      },
      {
        id: 'q-03',
        order: 3,
        questionEn: 'Upload photo of indoor unit error code if any',
        questionUr: 'اگر کوئی ایرر کوڈ ہے تو تصویر اپ لوڈ کریں',
        answerType: 'PHOTO',
        isRequired: false,
      },
    ],
  },
  'svc-03': {
    serviceId: 'svc-03',
    serviceName: 'Electrical Short Circuit Repair',
    guidanceVersion: 2,
    aiGuidanceText:
      'SAFETY FIRST: Inquire if main breaker is tripped. Warn customer not to touch charred wiring. Recommend emergency inspection visit if sparks observed.',
    questions: [
      {
        id: 'q-04',
        order: 1,
        questionEn: 'Are sparks or burning smell present?',
        questionUr: 'کیا چنگاریاں یا جلنے کی بو آ رہی ہے؟',
        answerType: 'SELECT',
        isRequired: true,
      },
      {
        id: 'q-05',
        order: 2,
        questionEn: 'Which area or appliance is affected?',
        questionUr: 'کون سا کمرہ یا آلہ متاثر ہے؟',
        answerType: 'TEXT',
        isRequired: true,
      },
    ],
  },
  'svc-05': {
    serviceId: 'svc-05',
    serviceName: 'Water Pipe Leakage Repair',
    guidanceVersion: 1,
    aiGuidanceText:
      'Advise customer to shut off main water valve if flooding occurs. Clarify whether leakage is concealed in wall or exposed.',
    questions: [
      {
        id: 'q-06',
        order: 1,
        questionEn: 'Is the pipe inside wall or exposed?',
        questionUr: 'کیا پائپ دیوار کے اندر ہے یا باہر؟',
        answerType: 'SELECT',
        isRequired: true,
      },
      {
        id: 'q-07',
        order: 2,
        questionEn: 'Upload photo of leakage area',
        questionUr: 'رساؤ والی جگہ کی تصویر اپ لوڈ کریں',
        answerType: 'PHOTO',
        isRequired: false,
      },
    ],
  },
};

interface A24AiGuidanceScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A24AiGuidanceScreen({
  onReturnToDashboard,
  mockScreenState,
}: A24AiGuidanceScreenProps) {
  const { user } = useAdminAuth();

  // RBAC Guard: Super Admin only; all others get 403 Forbidden
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A24');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="AI Guidance"
        screenId="A24"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('svc-01');
  const [configs, setConfigs] = useState<Record<string, ServiceAiConfig>>(INITIAL_AI_CONFIGS);

  const currentConfig = configs[selectedServiceId] ?? INITIAL_AI_CONFIGS['svc-01']!;
  const [editText, setEditText] = useState<string>(currentConfig.aiGuidanceText);

  // Modal Save Guidance State
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [auditReason, setAuditReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleSelectService = (id: string) => {
    setSelectedServiceId(id);
    const target = configs[id] ?? INITIAL_AI_CONFIGS['svc-01']!;
    setEditText(target.aiGuidanceText);
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

    const nextVersion = currentConfig.guidanceVersion + 1;
    setConfigs((prev) => ({
      ...prev,
      [selectedServiceId]: {
        ...currentConfig,
        guidanceVersion: nextVersion,
        aiGuidanceText: editText,
      },
    }));

    setSuccessBanner(
      translate('en', 'admin.a24.success_saved', {
        service: currentConfig.serviceName,
        version: String(nextVersion),
        reason: auditReason.trim(),
      }),
    );

    handleCloseSaveModal();
  };

  // State: Loading
  if (screenState === 'loading') {
    return (
      <div className="state-card" data-testid="a24-state-loading">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a24.loading_text')}</p>
      </div>
    );
  }

  // State: Error
  if (screenState === 'error') {
    return (
      <div className="state-card" data-testid="a24-state-error">
        <div className="error-icon">⚠️</div>
        <p className="state-text">{translate('en', 'admin.a24.error_text')}</p>
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
      <div className="state-card" data-testid="a24-state-pending">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a13.pending_text')}</p>
      </div>
    );
  }

  const serviceSelectOptions = [
    { value: 'svc-01', label: 'AC General Service' },
    { value: 'svc-03', label: 'Electrical Short Circuit Repair' },
    { value: 'svc-05', label: 'Water Pipe Leakage Repair' },
  ];

  return (
    <div className="admin-page" data-testid="a24-guidance-screen">
      {/* Header */}
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a24-page-title">
            {translate('en', 'admin.a24.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a24.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a24-access-level">
          {translate('en', 'admin.access.chip', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {successBanner && (
        <div className="alert alert-success" data-testid="a24-success-banner">
          <span>{successBanner}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessBanner(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Service Selector Toolbar */}
      <div className="toolbar">
        <div className="filter-group">
          <label htmlFor="a24-service-select" className="form-label" style={{ marginBottom: 0 }}>
            {translate('en', 'admin.a24.service_label')}:
          </label>
          <select
            id="a24-service-select"
            data-testid="a24-service-select"
            className="filter-select"
            value={selectedServiceId}
            onChange={(e) => handleSelectService(e.target.value)}
          >
            {serviceSelectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* AI System Guidance Editor */}
      <div className="table-card" style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}
        >
          <div>
            <h2 className="screen-title" style={{ fontSize: '18px' }}>
              {translate('en', 'admin.a24.guidance_title')}
            </h2>
            <p className="cell-secondary">{translate('en', 'admin.a24.guidance_note')}</p>
          </div>
          <span className="badge badge-outline">{`Version: ${currentConfig.guidanceVersion}`}</span>
        </div>

        <textarea
          data-testid="a24-guidance-textarea"
          className="form-textarea"
          rows={4}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
        />

        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            data-testid="a24-open-save-btn"
            className="btn btn-primary"
            onClick={handleOpenSaveModal}
          >
            {translate('en', 'admin.a24.btn_save_guidance')}
          </button>
        </div>
      </div>

      {/* Customer Intake Questions Table */}
      <div className="table-card">
        <h2 className="screen-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
          {translate('en', 'admin.a24.questions_title')}
        </h2>

        <table className="admin-table" data-testid="a24-questions-table">
          <thead>
            <tr>
              <th>{translate('en', 'admin.a24.th_order')}</th>
              <th>{translate('en', 'admin.a24.th_question_en')}</th>
              <th>{translate('en', 'admin.a24.th_question_ur')}</th>
              <th>{translate('en', 'admin.a24.th_type')}</th>
              <th>{translate('en', 'admin.a24.th_required')}</th>
            </tr>
          </thead>
          <tbody>
            {currentConfig.questions.map((q) => (
              <tr key={q.id} data-testid={`a24-q-${q.id}`}>
                <td>
                  <code>{q.order}</code>
                </td>
                <td>
                  <strong>{q.questionEn}</strong>
                </td>
                <td dir="rtl">
                  <span className="cell-secondary">{q.questionUr}</span>
                </td>
                <td>
                  <span className="badge badge-outline">{q.answerType}</span>
                </td>
                <td>
                  <span className={`badge ${q.isRequired ? 'badge-primary' : 'badge-neutral'}`}>
                    {q.isRequired ? 'REQUIRED' : 'OPTIONAL'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-backdrop" data-testid="a24-save-modal">
          <div className="modal-card">
            <h2 className="modal-title">
              {translate('en', 'admin.a24.modal_guidance_title', {
                service: currentConfig.serviceName,
              })}
            </h2>
            <div className="modal-subtitle">
              {translate('en', 'admin.a24.modal_subtitle', {
                service: currentConfig.serviceName,
                version: String(currentConfig.guidanceVersion + 1),
              })}
            </div>

            <form onSubmit={handleConfirmSave}>
              {/* Audit Reason (Mandatory per ROLE-003) */}
              <div className="form-group">
                <label htmlFor="a24-reason" className="form-label">
                  {translate('en', 'admin.a03.reason_label')}
                </label>
                <textarea
                  id="a24-reason"
                  data-testid="a24-audit-reason-input"
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
                  <p className="form-error" data-testid="a24-reason-error">
                    {reasonError}
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  data-testid="a24-cancel-btn"
                  className="btn btn-secondary"
                  onClick={handleCloseSaveModal}
                >
                  {translate('en', 'admin.a03.cancel_btn')}
                </button>
                <button
                  type="submit"
                  data-testid="a24-confirm-save-btn"
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

/**
 * Screen A06 — Services Catalog
 * Source of Truth: docs/screens/admin.md §3 A06
 * Requirements: OPS-ADMIN-006, CAT-SVC-001..012, CFG-RULE-007, SCOPE-CAT-001,
 * FARE-005, MATCH-ELIG-074, BP §14, §4.2, §64, D-024, D-026.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export type PriceModel = 'FIXED' | 'FROM' | 'INSPECTION_QUOTE';
export type VerificationTier = 'BASIC' | 'VERIFIED' | 'BUSINESS_VERIFIED';
export type SellingMode = 'INSTANT' | 'CHOOSE_SUPPLIER' | 'REQUEST_QUOTES';

export interface CatalogServiceItem {
  id: string;
  slug: string;
  nameEn: string;
  nameUr: string;
  categoryId: string;
  categoryName: string;
  priceModel: PriceModel;
  basePricePkr: number;
  requiredTier: VerificationTier;
  sellingModes: SellingMode[];
}

export const INITIAL_SERVICES: CatalogServiceItem[] = [
  {
    id: 'svc-01',
    slug: 'ac-general-service',
    nameEn: 'AC General Service',
    nameUr: 'اے سی جنرل سروس',
    categoryId: 'cat-01',
    categoryName: 'Air Conditioning',
    priceModel: 'FIXED',
    basePricePkr: 2500,
    requiredTier: 'VERIFIED',
    sellingModes: ['INSTANT', 'CHOOSE_SUPPLIER'],
  },
  {
    id: 'svc-02',
    slug: 'ac-master-overhaul',
    nameEn: 'AC Master Overhaul',
    nameUr: 'اے سی مکمل مرمت اور سروس',
    categoryId: 'cat-01',
    categoryName: 'Air Conditioning',
    priceModel: 'FROM',
    basePricePkr: 4500,
    requiredTier: 'VERIFIED',
    sellingModes: ['CHOOSE_SUPPLIER', 'REQUEST_QUOTES'],
  },
  {
    id: 'svc-03',
    slug: 'electrical-short-circuit',
    nameEn: 'Electrical Short Circuit Repair',
    nameUr: 'شارٹ سرکٹ کی مرمت',
    categoryId: 'cat-02',
    categoryName: 'Electrician',
    priceModel: 'INSPECTION_QUOTE',
    basePricePkr: 1500,
    requiredTier: 'VERIFIED',
    sellingModes: ['INSTANT', 'CHOOSE_SUPPLIER'],
  },
  {
    id: 'svc-04',
    slug: 'ceiling-fan-installation',
    nameEn: 'Ceiling Fan Installation',
    nameUr: 'چھت کے پنکھے کی تنصیب',
    categoryId: 'cat-02',
    categoryName: 'Electrician',
    priceModel: 'FIXED',
    basePricePkr: 800,
    requiredTier: 'BASIC',
    sellingModes: ['INSTANT', 'CHOOSE_SUPPLIER'],
  },
  {
    id: 'svc-05',
    slug: 'pipe-leakage-repair',
    nameEn: 'Water Pipe Leakage Repair',
    nameUr: 'پانی کے پائپ کے رساؤ کی مرمت',
    categoryId: 'cat-03',
    categoryName: 'Plumber',
    priceModel: 'FROM',
    basePricePkr: 1200,
    requiredTier: 'BASIC',
    sellingModes: ['INSTANT', 'CHOOSE_SUPPLIER'],
  },
  {
    id: 'svc-06',
    slug: 'water-tank-cleaning',
    nameEn: 'Underground Tank Cleaning',
    nameUr: 'زیر زمین پانی کے ٹینک کی صفائی',
    categoryId: 'cat-03',
    categoryName: 'Plumber',
    priceModel: 'FIXED',
    basePricePkr: 5000,
    requiredTier: 'BUSINESS_VERIFIED',
    sellingModes: ['CHOOSE_SUPPLIER', 'REQUEST_QUOTES'],
  },
];

interface A06ServicesScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A06ServicesScreen({
  onReturnToDashboard,
  mockScreenState,
}: A06ServicesScreenProps) {
  const { user } = useAdminAuth();

  // RBAC Guard: SA, CM, RT have edit access; others have view
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A06');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="Services"
        screenId="A06"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');
  const [services, setServices] = useState<CatalogServiceItem[]>(INITIAL_SERVICES);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [editingService, setEditingService] = useState<CatalogServiceItem | null>(null);

  // Form edit fields
  const [editPriceModel, setEditPriceModel] = useState<PriceModel>('FIXED');
  const [editBasePrice, setEditBasePrice] = useState<number>(0);
  const [editTier, setEditTier] = useState<VerificationTier>('BASIC');
  const [auditReason, setAuditReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Sub-role specific edit capabilities per docs/screens/admin.md §3 A06
  const userSubRoles = user?.subRoles ?? [];
  const canEditPricing =
    userSubRoles.includes('SUPER_ADMIN') || userSubRoles.includes('CONTENT_MANAGER');
  const canEditTier = userSubRoles.includes('SUPER_ADMIN') || userSubRoles.includes('RISK_TRUST');
  const canEditAny = canEditPricing || canEditTier;

  const filteredServices = services.filter((svc) => {
    if (selectedCategory !== 'ALL' && svc.categoryId !== selectedCategory) {
      return false;
    }
    return true;
  });

  const handleOpenEdit = (svc: CatalogServiceItem) => {
    setEditingService(svc);
    setEditPriceModel(svc.priceModel);
    setEditBasePrice(svc.basePricePkr);
    setEditTier(svc.requiredTier);
    setAuditReason('');
    setReasonError(null);
  };

  const handleCloseEdit = () => {
    setEditingService(null);
    setAuditReason('');
    setReasonError(null);
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    if (!auditReason.trim()) {
      setReasonError(translate('en', 'admin.a03.err_reason'));
      return;
    }

    setServices((prev) =>
      prev.map((item) => {
        if (item.id === editingService.id) {
          return {
            ...item,
            priceModel: canEditPricing ? editPriceModel : item.priceModel,
            basePricePkr: canEditPricing ? editBasePrice : item.basePricePkr,
            requiredTier: canEditTier ? editTier : item.requiredTier,
          };
        }
        return item;
      }),
    );

    setSuccessBanner(
      translate('en', 'admin.a06.success_updated', {
        name: editingService.nameEn,
        reason: auditReason.trim(),
      }),
    );

    handleCloseEdit();
  };

  // State: Loading
  if (screenState === 'loading') {
    return (
      <div className="state-card" data-testid="a06-state-loading">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a06.loading_text')}</p>
      </div>
    );
  }

  // State: Error
  if (screenState === 'error') {
    return (
      <div className="state-card" data-testid="a06-state-error">
        <div className="error-icon">⚠️</div>
        <p className="state-text">{translate('en', 'admin.a06.error_text')}</p>
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
      <div className="state-card" data-testid="a06-state-pending">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a13.pending_text')}</p>
      </div>
    );
  }

  const categoryOptions = [
    { value: 'ALL', label: translate('en', 'admin.a03.filter_type_all') },
    { value: 'cat-01', label: 'Air Conditioning' },
    { value: 'cat-02', label: 'Electrician' },
    { value: 'cat-03', label: 'Plumber' },
  ];

  const priceModelOptions: PriceModel[] = ['FIXED', 'FROM', 'INSPECTION_QUOTE'];
  const verificationTierOptions: VerificationTier[] = ['BASIC', 'VERIFIED', 'BUSINESS_VERIFIED'];

  return (
    <div className="admin-page" data-testid="a06-services-screen">
      {/* Header */}
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a06-page-title">
            {translate('en', 'admin.a06.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a06.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a06-access-level">
          {translate('en', 'admin.access.chip', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {successBanner && (
        <div className="alert alert-success" data-testid="a06-success-banner">
          <span>{successBanner}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessBanner(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="toolbar">
        <div className="filter-group">
          <select
            data-testid="a06-category-filter"
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredServices.length === 0 ? (
        <div className="state-card" data-testid="a06-state-empty">
          <p className="state-text">{translate('en', 'admin.a06.empty_text')}</p>
        </div>
      ) : (
        /* Services Table */
        <div className="table-card">
          <table className="admin-table" data-testid="a06-services-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a06.th_service')}</th>
                <th>{translate('en', 'admin.a06.th_category')}</th>
                <th>{translate('en', 'admin.a06.th_price_model')}</th>
                <th>{translate('en', 'admin.a06.th_base_price')}</th>
                <th>{translate('en', 'admin.a06.th_req_tier')}</th>
                <th>{translate('en', 'admin.a06.th_selling_modes')}</th>
                <th>{translate('en', 'admin.a06.th_action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredServices.map((svc) => (
                <tr key={svc.id} data-testid={`a06-row-${svc.id}`}>
                  <td>
                    <div className="cell-primary">{svc.nameEn}</div>
                    <div className="cell-secondary" dir="rtl">
                      {svc.nameUr}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-neutral">{svc.categoryName}</span>
                  </td>
                  <td>
                    <span className="badge badge-outline">{svc.priceModel}</span>
                  </td>
                  <td>
                    <code>{`PKR ${svc.basePricePkr.toLocaleString('en-US')}`}</code>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        svc.requiredTier === 'BUSINESS_VERIFIED'
                          ? 'badge-warning'
                          : svc.requiredTier === 'VERIFIED'
                            ? 'badge-success'
                            : 'badge-neutral'
                      }`}
                    >
                      {svc.requiredTier}
                    </span>
                  </td>
                  <td>
                    <div className="selling-modes-chips">
                      {svc.sellingModes.map((mode) => (
                        <span key={mode} className="chip-mini">
                          {mode}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {canEditAny ? (
                      <button
                        type="button"
                        data-testid={`a06-edit-${svc.id}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(svc)}
                      >
                        {translate('en', 'admin.a06.btn_edit')}
                      </button>
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

      {/* Configure Service Modal */}
      {editingService && (
        <div className="modal-backdrop" data-testid="a06-edit-modal">
          <div className="modal-card">
            <h2 className="modal-title">
              {translate('en', 'admin.a06.modal_title', { name: editingService.nameEn })}
            </h2>
            <div className="modal-subtitle">
              {translate('en', 'admin.a06.modal_subtitle', {
                category: editingService.categoryName,
                model: editingService.priceModel,
              })}
            </div>

            <form onSubmit={handleSaveEdit}>
              {/* Price Model (SA & CM) */}
              <div className="form-group">
                <label htmlFor="a06-price-model" className="form-label">
                  {translate('en', 'admin.a06.model_label')}
                </label>
                <select
                  id="a06-price-model"
                  data-testid="a06-price-model-select"
                  className="filter-select"
                  value={editPriceModel}
                  disabled={!canEditPricing}
                  onChange={(e) => setEditPriceModel(e.target.value as PriceModel)}
                >
                  {priceModelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Base Price (SA & CM) */}
              <div className="form-group">
                <label htmlFor="a06-base-price" className="form-label">
                  {translate('en', 'admin.a06.base_price_label')}
                </label>
                <input
                  id="a06-base-price"
                  data-testid="a06-base-price-input"
                  type="number"
                  min={0}
                  step={50}
                  className="form-input"
                  value={editBasePrice}
                  disabled={!canEditPricing}
                  onChange={(e) => setEditBasePrice(Number(e.target.value))}
                />
              </div>

              {/* Verification Tier (SA & RT) */}
              <div className="form-group">
                <label htmlFor="a06-req-tier" className="form-label">
                  {translate('en', 'admin.a06.tier_label')}
                </label>
                <select
                  id="a06-req-tier"
                  data-testid="a06-req-tier-select"
                  className="filter-select"
                  value={editTier}
                  disabled={!canEditTier}
                  onChange={(e) => setEditTier(e.target.value as VerificationTier)}
                >
                  {verificationTierOptions.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>

              {/* Audit Reason (Mandatory per ROLE-003) */}
              <div className="form-group">
                <label htmlFor="a06-reason" className="form-label">
                  {translate('en', 'admin.a03.reason_label')}
                </label>
                <textarea
                  id="a06-reason"
                  data-testid="a06-audit-reason-input"
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
                  <p className="form-error" data-testid="a06-reason-error">
                    {reasonError}
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  data-testid="a06-cancel-btn"
                  className="btn btn-secondary"
                  onClick={handleCloseEdit}
                >
                  {translate('en', 'admin.a03.cancel_btn')}
                </button>
                <button
                  type="submit"
                  data-testid="a06-confirm-save-btn"
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

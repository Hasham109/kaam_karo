/**
 * Screen A05 — Categories Hierarchy
 * Source of Truth: docs/screens/admin.md §3 A05
 * Requirements: OPS-ADMIN-005, SCOPE-CAT-001, CAT-SVC-012, CFG-RULE-001,
 * ADMIN-ROLE-005, BP §14, §63, §64; D-024, D-026.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface CategoryItem {
  id: string;
  slug: string;
  nameEn: string;
  nameUr: string;
  order: number;
  isLaunchFamily: boolean; // D-024: AC, Electrician, Plumber
  isActive: boolean;
  servicesCount: number;
}

export const INITIAL_CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-01',
    slug: 'air-conditioning',
    nameEn: 'Air Conditioning',
    nameUr: 'ایئر کنڈیشنگ',
    order: 1,
    isLaunchFamily: true,
    isActive: true,
    servicesCount: 12,
  },
  {
    id: 'cat-02',
    slug: 'electrical',
    nameEn: 'Electrician',
    nameUr: 'الیکٹریشن',
    order: 2,
    isLaunchFamily: true,
    isActive: true,
    servicesCount: 15,
  },
  {
    id: 'cat-03',
    slug: 'plumbing',
    nameEn: 'Plumber',
    nameUr: 'پلمبر',
    order: 3,
    isLaunchFamily: true,
    isActive: true,
    servicesCount: 10,
  },
  {
    id: 'cat-04',
    slug: 'cleaning',
    nameEn: 'Cleaning & Deep Cleaning',
    nameUr: 'صفائی اور ڈیپ کلیننگ',
    order: 4,
    isLaunchFamily: false,
    isActive: false,
    servicesCount: 8,
  },
  {
    id: 'cat-05',
    slug: 'appliances',
    nameEn: 'Home Appliances Repair',
    nameUr: 'گھریلو آلات کی مرمت',
    order: 5,
    isLaunchFamily: false,
    isActive: false,
    servicesCount: 9,
  },
];

interface A05CategoriesScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A05CategoriesScreen({
  onReturnToDashboard,
  mockScreenState,
}: A05CategoriesScreenProps) {
  const { user } = useAdminAuth();

  // RBAC Guard: Super Admin and Content Manager have edit; others view
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A05');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="Categories"
        screenId="A05"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const canEdit = effectiveLevel === 'edit' || effectiveLevel === 'approve';

  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState || 'success');
  const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [auditReason, setAuditReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleOpenEdit = (cat: CategoryItem) => {
    setErrorMsg(null);
    setEditingCat(cat);
    setNameEn(cat.nameEn);
    setNameUr(cat.nameUr);
    setAuditReason('');
  };

  const handleToggleActive = (cat: CategoryItem) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, isActive: !c.isActive } : c)),
    );
    setSuccessBanner(
      translate('en', 'admin.a05.success_saved', {
        name: cat.nameEn,
        reason: 'Status toggled',
      }),
    );
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;

    if (!auditReason.trim()) {
      setErrorMsg(translate('en', 'admin.a13.err_reason_required'));
      return;
    }

    setScreenState('loading');
    setTimeout(() => {
      setCategories((prev) =>
        prev.map((c) => (c.id === editingCat.id ? { ...c, nameEn, nameUr } : c)),
      );
      setSuccessBanner(
        translate('en', 'admin.a05.success_saved', {
          name: nameEn,
          reason: auditReason,
        }),
      );
      setEditingCat(null);
      setScreenState('success');
    }, 150);
  };

  return (
    <div className="fees-screen-container" data-testid="a05-categories-screen">
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a05-page-title">
            {translate('en', 'admin.a05.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a05.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a05-access-level">
          {translate('en', 'admin.access.chip', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {successBanner && (
        <div className="alert alert-success" data-testid="a05-success-banner">
          <span>{successBanner}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessBanner(null)}>
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-error" data-testid="a05-error-banner">
          <span>{errorMsg}</span>
          <button type="button" className="alert-close" onClick={() => setErrorMsg(null)}>
            ✕
          </button>
        </div>
      )}

      {screenState === 'loading' && (
        <div className="state-skeleton" data-testid="a05-state-loading">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <p>{translate('en', 'admin.a05.loading_text')}</p>
        </div>
      )}

      {screenState === 'error' && (
        <div className="state-error" data-testid="a05-state-error">
          <p>{translate('en', 'admin.a05.error_text')}</p>
          <button type="button" className="btn-retry" onClick={() => setScreenState('success')}>
            {translate('en', 'admin.a13.retry_btn')}
          </button>
        </div>
      )}

      {screenState === 'pending' && (
        <div className="state-pending" data-testid="a05-state-pending">
          <div className="spinner" />
          <p>{translate('en', 'admin.a13.pending_text')}</p>
        </div>
      )}

      {screenState === 'success' && categories.length === 0 && (
        <div className="state-empty" data-testid="a05-state-empty">
          <p>{translate('en', 'admin.a05.empty_text')}</p>
        </div>
      )}

      {screenState === 'success' && categories.length > 0 && (
        <div className="config-table-card" data-testid="a05-categories-table">
          <table className="fee-table">
            <thead>
              <tr>
                <th>{translate('en', 'admin.a05.th_order')}</th>
                <th>{translate('en', 'admin.a05.th_name_en')}</th>
                <th>{translate('en', 'admin.a05.th_name_ur')}</th>
                <th>{translate('en', 'admin.a05.th_slug')}</th>
                <th>{translate('en', 'admin.a05.th_launch')}</th>
                <th>{translate('en', 'admin.a05.th_status')}</th>
                <th>{translate('en', 'admin.a05.th_action')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} data-testid={`cat-row-${cat.slug}`}>
                  <td>{cat.order}</td>
                  <td>
                    <strong>{cat.nameEn}</strong>
                  </td>
                  <td dir="rtl">{cat.nameUr}</td>
                  <td>
                    <code>{cat.slug}</code>
                  </td>
                  <td>
                    {cat.isLaunchFamily ? (
                      <span className="badge-launch" data-testid={`badge-launch-${cat.slug}`}>
                        {translate('en', 'admin.a05.badge_day_one')}
                      </span>
                    ) : (
                      <span className="badge-standard">
                        {translate('en', 'admin.a05.badge_standard')}
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${cat.isActive ? 'status-active' : 'status-disabled'}`}
                    >
                      {cat.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td>
                    {canEdit ? (
                      <div className="action-buttons-group">
                        <button
                          type="button"
                          className="btn-edit"
                          data-testid={`edit-cat-${cat.slug}`}
                          onClick={() => handleOpenEdit(cat)}
                        >
                          {translate('en', 'admin.a05.btn_edit')}
                        </button>
                        <button
                          type="button"
                          className="btn-action"
                          data-testid={`toggle-cat-${cat.slug}`}
                          onClick={() => handleToggleActive(cat)}
                        >
                          {cat.isActive
                            ? translate('en', 'admin.a05.btn_deactivate')
                            : translate('en', 'admin.a05.btn_activate')}
                        </button>
                      </div>
                    ) : (
                      <span className="no-perm">{translate('en', 'admin.a13.view_only')}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCat && (
        <div className="modal-backdrop" data-testid="a05-edit-modal">
          <div className="modal-card">
            <h2 className="modal-title">
              {translate('en', 'admin.a05.modal_edit_title', { name: editingCat.nameEn })}
            </h2>
            <div className="modal-subtitle">
              {translate('en', 'admin.a05.modal_subtitle', { slug: editingCat.slug })}
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label htmlFor="a05-name-en" className="form-label">
                  {translate('en', 'admin.a05.name_en_label')}
                </label>
                <input
                  id="a05-name-en"
                  data-testid="a05-name-en-input"
                  type="text"
                  className="form-input"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="a05-name-ur" className="form-label">
                  {translate('en', 'admin.a05.name_ur_label')}
                </label>
                <input
                  id="a05-name-ur"
                  data-testid="a05-name-ur-input"
                  type="text"
                  dir="rtl"
                  className="form-input"
                  value={nameUr}
                  onChange={(e) => setNameUr(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="a05-reason" className="form-label">
                  {translate('en', 'admin.a13.reason_label')}
                </label>
                <textarea
                  id="a05-reason"
                  data-testid="a05-audit-reason-input"
                  className="form-textarea"
                  placeholder={translate('en', 'admin.a13.reason_placeholder')}
                  rows={3}
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  data-testid="a05-cancel-btn"
                  onClick={() => setEditingCat(null)}
                >
                  {translate('en', 'admin.a03.cancel_btn')}
                </button>
                <button type="submit" className="btn-save" data-testid="a05-save-btn">
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

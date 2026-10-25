/**
 * Screen A23 — City & Zone Activation
 * Source of Truth: docs/screens/admin.md §3 A23
 * Requirements: OPS-ADMIN-023, SCOPE-GEO-001, SCOPE-GEO-002, SCOPE-CAT-002,
 * CFG-RULE-001, CAT-SVC-002, BP §57.2, §64, §42, D-007, D-019, D-024, D-026.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { Forbidden403View } from './AdminLayout';
import type { ScreenState } from '../auth/types';

export interface PakistanCityItem {
  id: string;
  name: string;
  province: string;
  isListed: boolean;
  isActive: boolean;
  activeZoneName: string;
  activeFamiliesCount: number;
}

export interface CityFamilyItem {
  id: string;
  familySlug: string;
  nameEn: string;
  nameUr: string;
  isActive: boolean;
  openRequestsCount: number;
}

export const INITIAL_CITIES: PakistanCityItem[] = [
  {
    id: 'city-lhe',
    name: 'Lahore',
    province: 'Punjab',
    isListed: true,
    isActive: true, // D-007, D-019: Lahore active at Day-One
    activeZoneName: 'Whole City (Single Zone - D-019)',
    activeFamiliesCount: 10,
  },
  {
    id: 'city-khi',
    name: 'Karachi',
    province: 'Sindh',
    isListed: true,
    isActive: false,
    activeZoneName: 'None (City Inactive)',
    activeFamiliesCount: 0,
  },
  {
    id: 'city-isb',
    name: 'Islamabad',
    province: 'Federal',
    isListed: true,
    isActive: false,
    activeZoneName: 'None (City Inactive)',
    activeFamiliesCount: 0,
  },
  {
    id: 'city-rwp',
    name: 'Rawalpindi',
    province: 'Punjab',
    isListed: true,
    isActive: false,
    activeZoneName: 'None (City Inactive)',
    activeFamiliesCount: 0,
  },
  {
    id: 'city-fsd',
    name: 'Faisalabad',
    province: 'Punjab',
    isListed: true,
    isActive: false,
    activeZoneName: 'None (City Inactive)',
    activeFamiliesCount: 0,
  },
  {
    id: 'city-mux',
    name: 'Multan',
    province: 'Punjab',
    isListed: true,
    isActive: false,
    activeZoneName: 'None (City Inactive)',
    activeFamiliesCount: 0,
  },
];

export const LAHORE_FAMILIES: CityFamilyItem[] = [
  {
    id: 'fam-ac',
    familySlug: 'ac',
    nameEn: 'Air Conditioning',
    nameUr: 'ایئر کنڈیشنگ',
    isActive: true,
    openRequestsCount: 14,
  },
  {
    id: 'fam-elec',
    familySlug: 'electrician',
    nameEn: 'Electrician',
    nameUr: 'الیکٹریشن',
    isActive: true,
    openRequestsCount: 19,
  },
  {
    id: 'fam-plumb',
    familySlug: 'plumber',
    nameEn: 'Plumber',
    nameUr: 'پلمبر',
    isActive: true,
    openRequestsCount: 8,
  },
  {
    id: 'fam-app',
    familySlug: 'appliances',
    nameEn: 'Home Appliances Repair',
    nameUr: 'گھریلو آلات کی مرمت',
    isActive: true,
    openRequestsCount: 5,
  },
  {
    id: 'fam-paint',
    familySlug: 'painting',
    nameEn: 'Painting',
    nameUr: 'رنگ روغن',
    isActive: true,
    openRequestsCount: 2,
  },
  {
    id: 'fam-carp',
    familySlug: 'carpentry',
    nameEn: 'Carpentry',
    nameUr: 'بڑھئی کا کام',
    isActive: true,
    openRequestsCount: 3,
  },
  {
    id: 'fam-clean',
    familySlug: 'cleaning',
    nameEn: 'Cleaning',
    nameUr: 'صفائی',
    isActive: true,
    openRequestsCount: 6,
  },
  {
    id: 'fam-pest',
    familySlug: 'pest-control',
    nameEn: 'Pest Control',
    nameUr: 'کیڑے مار اسپرے',
    isActive: true,
    openRequestsCount: 1,
  },
  {
    id: 'fam-lock',
    familySlug: 'locksmith',
    nameEn: 'Locksmith',
    nameUr: 'تالا ساز',
    isActive: true,
    openRequestsCount: 2,
  },
  {
    id: 'fam-geys',
    familySlug: 'geyser',
    nameEn: 'Geyser Service',
    nameUr: 'گیزر سروس',
    isActive: true,
    openRequestsCount: 4,
  },
];

interface A23CityActivationScreenProps {
  onReturnToDashboard?: () => void;
  mockScreenState?: ScreenState;
}

export function A23CityActivationScreen({
  onReturnToDashboard,
  mockScreenState,
}: A23CityActivationScreenProps) {
  const { user } = useAdminAuth();

  // RBAC Guard: Super Admin only; all other roles get 403 Forbidden
  const effectiveLevel = resolveEffectiveAccess(user?.subRoles ?? [], 'A23');
  const hasAccess = effectiveLevel !== 'none';

  if (!hasAccess) {
    return (
      <Forbidden403View
        screenTitle="City Activation"
        screenId="A23"
        onReturnToDashboard={onReturnToDashboard}
      />
    );
  }

  const [screenState, setScreenState] = useState<ScreenState>(mockScreenState ?? 'success');
  const [cities, setCities] = useState<PakistanCityItem[]>(INITIAL_CITIES);
  const [selectedCity, setSelectedCity] = useState<PakistanCityItem>(INITIAL_CITIES[0]!);
  const [families] = useState<CityFamilyItem[]>(LAHORE_FAMILIES);

  // Modal action state
  const [actionCity, setActionCity] = useState<PakistanCityItem | null>(null);
  const [targetActiveState, setTargetActiveState] = useState<boolean>(false);
  const [auditReason, setAuditReason] = useState<string>('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleOpenCityAction = (city: PakistanCityItem, makeActive: boolean) => {
    setActionCity(city);
    setTargetActiveState(makeActive);
    setAuditReason('');
    setReasonError(null);
  };

  const handleCloseCityAction = () => {
    setActionCity(null);
    setAuditReason('');
    setReasonError(null);
  };

  const handleConfirmCityAction = (e: FormEvent) => {
    e.preventDefault();
    if (!actionCity) return;

    if (!auditReason.trim()) {
      setReasonError(translate('en', 'admin.a03.err_reason'));
      return;
    }

    setCities((prev) =>
      prev.map((item) => {
        if (item.id === actionCity.id) {
          return {
            ...item,
            isActive: targetActiveState,
            activeZoneName: targetActiveState
              ? translate('en', 'admin.a23.zone_whole_city')
              : translate('en', 'admin.a23.zone_none'),
            activeFamiliesCount: targetActiveState ? 10 : 0,
          };
        }
        return item;
      }),
    );

    if (selectedCity.id === actionCity.id) {
      setSelectedCity((prev) => ({
        ...prev,
        isActive: targetActiveState,
        activeZoneName: targetActiveState
          ? translate('en', 'admin.a23.zone_whole_city')
          : translate('en', 'admin.a23.zone_none'),
        activeFamiliesCount: targetActiveState ? 10 : 0,
      }));
    }

    setSuccessBanner(
      translate('en', 'admin.a23.success_city', {
        city: actionCity.name,
        state: targetActiveState ? 'ACTIVE' : 'INACTIVE',
        reason: auditReason.trim(),
      }),
    );

    handleCloseCityAction();
  };

  // State: Loading
  if (screenState === 'loading') {
    return (
      <div className="state-card" data-testid="a23-state-loading">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a23.loading_text')}</p>
      </div>
    );
  }

  // State: Error
  if (screenState === 'error') {
    return (
      <div className="state-card" data-testid="a23-state-error">
        <div className="error-icon">⚠️</div>
        <p className="state-text">{translate('en', 'admin.a23.error_text')}</p>
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
      <div className="state-card" data-testid="a23-state-pending">
        <div className="spinner" />
        <p className="state-text">{translate('en', 'admin.a13.pending_text')}</p>
      </div>
    );
  }

  return (
    <div className="admin-page" data-testid="a23-city-screen">
      {/* Header */}
      <div className="screen-header">
        <div>
          <h1 className="screen-title" data-testid="a23-page-title">
            {translate('en', 'admin.a23.title')}
          </h1>
          <p className="screen-desc">{translate('en', 'admin.a23.desc')}</p>
        </div>
        <div className="access-chip" data-testid="a23-access-level">
          {translate('en', 'admin.access.chip', { level: effectiveLevel.toUpperCase() })}
        </div>
      </div>

      {successBanner && (
        <div className="alert alert-success" data-testid="a23-success-banner">
          <span>{successBanner}</span>
          <button type="button" className="alert-close" onClick={() => setSuccessBanner(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Empty State Check */}
      {cities.length === 0 ? (
        <div className="state-card" data-testid="a23-state-empty">
          <p className="state-text">{translate('en', 'admin.a23.empty_text')}</p>
        </div>
      ) : (
        <>
          {/* Cities Table */}
          <div className="table-card">
            <table className="admin-table" data-testid="a23-cities-table">
              <thead>
                <tr>
                  <th>{translate('en', 'admin.a23.th_city')}</th>
                  <th>{translate('en', 'admin.a23.th_listed')}</th>
                  <th>{translate('en', 'admin.a23.th_active')}</th>
                  <th>{translate('en', 'admin.a23.th_zone')}</th>
                  <th>{translate('en', 'admin.a23.th_families')}</th>
                  <th>{translate('en', 'admin.a23.th_action')}</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city) => (
                  <tr
                    key={city.id}
                    data-testid={`a23-row-${city.id}`}
                    className={selectedCity.id === city.id ? 'row-selected' : ''}
                    onClick={() => setSelectedCity(city)}
                  >
                    <td>
                      <div className="cell-primary">{city.name}</div>
                      <div className="cell-secondary">{city.province}</div>
                    </td>
                    <td>
                      <span className="badge badge-success">{city.isListed ? 'YES' : 'NO'}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${city.isActive ? 'badge-success' : 'badge-neutral'}`}
                      >
                        {city.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <span className="text-secondary">{city.activeZoneName}</span>
                    </td>
                    <td>
                      <code>{city.activeFamiliesCount}</code>
                    </td>
                    <td>
                      {city.isActive ? (
                        <button
                          type="button"
                          data-testid={`a23-deactivate-${city.id}`}
                          className="btn btn-danger btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCityAction(city, false);
                          }}
                        >
                          {translate('en', 'admin.a23.btn_deactivate_city')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`a23-activate-${city.id}`}
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCityAction(city, true);
                          }}
                        >
                          {translate('en', 'admin.a23.btn_activate_city')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Service Families Table in Selected City */}
          <div className="section-divider" style={{ marginTop: '24px' }}>
            <h2 className="screen-title" style={{ fontSize: '18px' }}>
              {selectedCity.name} — {translate('en', 'admin.a05.title')}
            </h2>
          </div>

          <div className="table-card">
            <table className="admin-table" data-testid="a23-families-table">
              <thead>
                <tr>
                  <th>{translate('en', 'admin.a05.th_launch')}</th>
                  <th>{translate('en', 'admin.a05.th_name_ur')}</th>
                  <th>{translate('en', 'admin.a05.th_status')}</th>
                  <th>{translate('en', 'admin.a05.th_order')}</th>
                </tr>
              </thead>
              <tbody>
                {families.map((fam) => (
                  <tr key={fam.id} data-testid={`a23-family-${fam.id}`}>
                    <td>
                      <div className="cell-primary">{fam.nameEn}</div>
                      <div className="cell-secondary">{fam.familySlug}</div>
                    </td>
                    <td>
                      <div className="cell-secondary" dir="rtl">
                        {fam.nameUr}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          selectedCity.isActive && fam.isActive ? 'badge-success' : 'badge-neutral'
                        }`}
                      >
                        {selectedCity.isActive && fam.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-outline">{fam.openRequestsCount}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* City Activation Modal */}
      {actionCity && (
        <div className="modal-backdrop" data-testid="a23-confirm-modal">
          <div className="modal-card">
            <h2 className="modal-title">
              {targetActiveState
                ? translate('en', 'admin.a23.modal_activate_title', { city: actionCity.name })
                : translate('en', 'admin.a23.modal_deactivate_title', { city: actionCity.name })}
            </h2>
            <div className="modal-subtitle">
              {translate('en', 'admin.a23.modal_subtitle', {
                province: actionCity.province,
                status: actionCity.isActive ? 'ACTIVE' : 'INACTIVE',
              })}
            </div>

            <form onSubmit={handleConfirmCityAction}>
              {/* Audit Reason (Mandatory per ROLE-003) */}
              <div className="form-group">
                <label htmlFor="a23-reason" className="form-label">
                  {translate('en', 'admin.a03.reason_label')}
                </label>
                <textarea
                  id="a23-reason"
                  data-testid="a23-audit-reason-input"
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
                  <p className="form-error" data-testid="a23-reason-error">
                    {reasonError}
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  data-testid="a23-cancel-btn"
                  className="btn btn-secondary"
                  onClick={handleCloseCityAction}
                >
                  {translate('en', 'admin.a03.cancel_btn')}
                </button>
                <button
                  type="submit"
                  data-testid="a23-confirm-action-btn"
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

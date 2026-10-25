/**
 * Screen A03, A04, A05, A06, A23 Operations & Catalog Acceptance Test Suite
 * Requirements: T5.2 (Users, Provider Verification Queue, Categories/Services, City Activation);
 * OPS-ADMIN-003, OPS-ADMIN-004, OPS-ADMIN-005, OPS-ADMIN-006, OPS-ADMIN-023;
 * ROLE-003, DATA-004, D-007, D-019, D-024, D-026, permission-policy §7, BP §8.4, §14, §57.2, §64.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { AdminAuthProvider } from '../auth/admin-auth-context';
import type { AdminStaffUser, AdminSubRole } from '../auth/types';
import { A03UsersScreen } from '../components/A03UsersScreen';
import { A04VerificationScreen } from '../components/A04VerificationScreen';
import { A05CategoriesScreen } from '../components/A05CategoriesScreen';
import { A06ServicesScreen } from '../components/A06ServicesScreen';
import { A23CityActivationScreen } from '../components/A23CityActivationScreen';

function makeStaffUser(subRoles: readonly AdminSubRole[], name = 'Staff'): AdminStaffUser {
  return {
    id: `staff-${subRoles.join('-').toLowerCase()}`,
    name,
    phoneE164: '+923001000000',
    maskedPhone: '+92 ••• ••••000',
    subRoles,
    mfaEnrolled: true,
    mfaVerified: true,
    token: 'test_token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
}

describe('[T5.2] Screen A03 — Users & Accounts', () => {
  it('allows Operations and Risk/Trust to edit, Support to view, denies Finance', () => {
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A03')).toBe('edit');
    expect(resolveEffectiveAccess(['RISK_TRUST'], 'A03')).toBe('edit');
    expect(resolveEffectiveAccess(['SUPPORT'], 'A03')).toBe('view');
    expect(resolveEffectiveAccess(['FINANCE'], 'A03')).toBe('none');
  });

  it('renders user list with masked phone numbers for Support (view-only)', () => {
    const supportUser = makeStaffUser(['SUPPORT'], 'Support Agent');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={supportUser}>
        <A03UsersScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a03-users-screen"');
    expect(html).toContain('+92 ••• ••••456'); // Phone masking invariant
    expect(html).toContain('+92 ••• ••••789');
    expect(html).toContain('View only');
    expect(html).not.toContain('suspend-btn-usr-01');
  });

  it('renders Action buttons for Operations staff', () => {
    const opsUser = makeStaffUser(['OPERATIONS'], 'Ops Officer');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A03UsersScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="suspend-btn-usr-c001"');
    expect(html).toContain('data-testid="reinstate-btn-usr-p002"');
  });

  it('returns 403 Forbidden for unauthorized roles like Finance', () => {
    const financeUser = makeStaffUser(['FINANCE'], 'Finance Officer');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={financeUser}>
        <A03UsersScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a03-forbidden-403"');
    expect(html).toContain('403 — Access Denied');
    expect(html).not.toContain('data-testid="a03-users-table"');
  });

  it('renders all canonical states (loading, empty, error, pending)', () => {
    const opsUser = makeStaffUser(['OPERATIONS']);
    const loadingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A03UsersScreen mockScreenState="loading" />
      </AdminAuthProvider>,
    );
    expect(loadingHtml).toContain('data-testid="a03-state-loading"');

    const errorHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A03UsersScreen mockScreenState="error" />
      </AdminAuthProvider>,
    );
    expect(errorHtml).toContain('data-testid="a03-state-error"');

    const pendingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A03UsersScreen mockScreenState="pending" />
      </AdminAuthProvider>,
    );
    expect(pendingHtml).toContain('data-testid="a03-state-pending"');
  });
});

describe('[T5.2] Screen A04 — Provider Verification Queue', () => {
  it('allows Risk/Trust approve, Operations view, denies Support', () => {
    expect(resolveEffectiveAccess(['RISK_TRUST'], 'A04')).toBe('approve');
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A04')).toBe('view');
    expect(resolveEffectiveAccess(['SUPPORT'], 'A04')).toBe('none');
  });

  it('shows verification document links to Risk/Trust staff', () => {
    const rtUser = makeStaffUser(['RISK_TRUST'], 'Risk Officer');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={rtUser}>
        <A04VerificationScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a04-verification-screen"');
    expect(html).toContain('CNIC Front');
    expect(html).toContain('CNIC Back');
    expect(html).toContain('Live Selfie');
    expect(html).toContain('data-testid="approve-btn-ver-001"');
    expect(html).toContain('data-testid="reject-btn-ver-001"');
  });

  it('strictly isolates verification documents from Operations (permission-policy §7)', () => {
    const opsUser = makeStaffUser(['OPERATIONS'], 'Ops Officer');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A04VerificationScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a04-verification-screen"');
    expect(html).toContain('Documents restricted to Risk/Trust staff only (permission-policy §7)');
    expect(html).not.toContain('data-testid="approve-btn-ver-01"');
    expect(html).toContain('View only');
  });

  it('returns 403 Forbidden for Support', () => {
    const supportUser = makeStaffUser(['SUPPORT']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={supportUser}>
        <A04VerificationScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a04-forbidden-403"');
    expect(html).not.toContain('data-testid="a04-queue-table"');
  });
});

describe('[T5.2] Screen A05 — Categories Hierarchy', () => {
  it('allows Super Admin and Content Manager to edit, others to view', () => {
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A05')).toBe('edit');
    expect(resolveEffectiveAccess(['CONTENT_MANAGER'], 'A05')).toBe('edit');
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A05')).toBe('view');
    expect(resolveEffectiveAccess(['SUPPORT'], 'A05')).toBe('view');
  });

  it('displays Day-One Launch Families (D-024) with launch badges', () => {
    const cmUser = makeStaffUser(['CONTENT_MANAGER'], 'Content Lead');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={cmUser}>
        <A05CategoriesScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('Day-One Launch (D-024)');
    expect(html).toContain('Air Conditioning');
    expect(html).toContain('Electrician');
    expect(html).toContain('Plumber');
    expect(html).toContain('data-testid="edit-cat-air-conditioning"');
  });

  it('renders view-only badge for Support staff without edit buttons', () => {
    const supportUser = makeStaffUser(['SUPPORT'], 'Support Agent');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={supportUser}>
        <A05CategoriesScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('View only');
    expect(html).not.toContain('data-testid="edit-cat-air-conditioning"');
  });
});

describe('[T5.2] Screen A06 — Services Catalog', () => {
  it('allows Super Admin, Content Manager, and Risk/Trust to edit', () => {
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A06')).toBe('edit');
    expect(resolveEffectiveAccess(['CONTENT_MANAGER'], 'A06')).toBe('edit');
    expect(resolveEffectiveAccess(['RISK_TRUST'], 'A06')).toBe('edit');
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A06')).toBe('view');
    expect(resolveEffectiveAccess(['FINANCE'], 'A06')).toBe('view');
  });

  it('renders services catalog with pricing models, verification tiers, and selling modes', () => {
    const cmUser = makeStaffUser(['CONTENT_MANAGER']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={cmUser}>
        <A06ServicesScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a06-services-screen"');
    expect(html).toContain('AC General Service');
    expect(html).toContain('FIXED');
    expect(html).toContain('FROM');
    expect(html).toContain('INSPECTION_QUOTE');
    expect(html).toContain('VERIFIED');
    expect(html).toContain('BASIC');
    expect(html).toContain('BUSINESS_VERIFIED');
    expect(html).toContain('INSTANT');
    expect(html).toContain('CHOOSE_SUPPLIER');
    expect(html).toContain('REQUEST_QUOTES');
  });

  it('renders configure button for Content Manager and Risk/Trust', () => {
    const rtUser = makeStaffUser(['RISK_TRUST']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={rtUser}>
        <A06ServicesScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a06-edit-svc-01"');
    expect(html).toContain('Configure');
  });
});

describe('[T5.2] Screen A23 — City & Zone Activation', () => {
  it('strictly limits access to Super Admin only; all other roles get 403 Forbidden', () => {
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A23')).toBe('edit');
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A23')).toBe('none');
    expect(resolveEffectiveAccess(['SUPPORT'], 'A23')).toBe('none');
    expect(resolveEffectiveAccess(['FINANCE'], 'A23')).toBe('none');
    expect(resolveEffectiveAccess(['CONTENT_MANAGER'], 'A23')).toBe('none');
    expect(resolveEffectiveAccess(['RISK_TRUST'], 'A23')).toBe('none');
    expect(resolveEffectiveAccess(['ANALYST'], 'A23')).toBe('none');
    expect(resolveEffectiveAccess(['TECHNICAL_ADMIN'], 'A23')).toBe('none');
  });

  it('renders 403 Forbidden for Operations on A23', () => {
    const opsUser = makeStaffUser(['OPERATIONS']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A23CityActivationScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a23-forbidden-403"');
    expect(html).toContain('403 — Access Denied');
    expect(html).not.toContain('data-testid="a23-cities-table"');
  });

  it('renders active Lahore city (D-007, D-019) with 10 launch families for Super Admin', () => {
    const saUser = makeStaffUser(['SUPER_ADMIN'], 'Executive Admin');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={saUser}>
        <A23CityActivationScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a23-city-screen"');
    expect(html).toContain('Lahore');
    expect(html).toContain('ACTIVE');
    expect(html).toContain('Whole City (Single Zone - D-019)');
    expect(html).toContain('Karachi');
    expect(html).toContain('INACTIVE');
    expect(html).toContain('data-testid="a23-deactivate-city-lhe"');
    expect(html).toContain('data-testid="a23-activate-city-khi"');

    // 10 launch families
    expect(html).toContain('Air Conditioning');
    expect(html).toContain('Electrician');
    expect(html).toContain('Plumber');
    expect(html).toContain('Home Appliances Repair');
    expect(html).toContain('Painting');
    expect(html).toContain('Carpentry');
    expect(html).toContain('Cleaning');
    expect(html).toContain('Pest Control');
    expect(html).toContain('Locksmith');
    expect(html).toContain('Geyser Service');
  });
});

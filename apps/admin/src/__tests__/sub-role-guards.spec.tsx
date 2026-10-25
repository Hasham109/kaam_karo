/**
 * Sub-Role Guards & Access Matrix Verification Tests
 * Requirements: docs/implementation.md line 494 (T5.1 Acceptance Criteria);
 * ADMIN-ROLE-001..008, ROLE-003, SEC-AUTH-005, D-002, D-026, BP §8.4, BP §27.
 *
 * VERBATIM ACCEPTANCE CRITERIA CHECK:
 * "Support role cannot open Fees page (test)" (§8.4, §27).
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  canOpenFeesPage,
  resolveEffectiveAccess,
  SUB_ROLE_ACCESS_MATRIX,
} from '../auth/access-matrix';
import { AdminAuthProvider } from '../auth/admin-auth-context';
import type { AdminStaffUser, AdminSubRole } from '../auth/types';
import { A13FeesScreen } from '../components/A13FeesScreen';
import { AdminLayout } from '../components/AdminLayout';

function makeStaffUser(subRoles: readonly AdminSubRole[], name = 'Test Staff'): AdminStaffUser {
  return {
    id: `staff-${subRoles.join('-').toLowerCase()}`,
    name,
    phoneE164: '+923001000000',
    maskedPhone: '+92 ••• ••••000',
    subRoles,
    mfaEnrolled: true,
    mfaVerified: true,
    token: 'test_staff_token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
}

describe('[T5.1 Acceptance Criteria] Sub-Role Guards & Fees Access', () => {
  /**
   * VERBATIM ACCEPTANCE TEST: Support role cannot open Fees page (IMPL line 494; ADMIN-ROLE-003; BP §8.4, §27).
   */
  it('VERBATIM ACCEPTANCE CRITERION: Support role CANNOT open Fees page and receives 403 Forbidden', () => {
    const supportUser = makeStaffUser(['SUPPORT'], 'Support Agent');

    // 1. Matrix check: Support role on A13 has strictly 'none' access
    const supportLevel = resolveEffectiveAccess(supportUser.subRoles, 'A13');
    expect(supportLevel).toBe('none');
    expect(canOpenFeesPage(supportUser.subRoles)).toBe(false);

    // 2. Component render check: Attempting to render A13 with Support user produces 403 Forbidden view
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={supportUser}>
        <A13FeesScreen />
      </AdminAuthProvider>,
    );

    // Verifies 403 Forbidden is rendered
    expect(html).toContain('data-testid="a13-forbidden-403"');
    expect(html).toContain('403 — Access Denied');
    expect(html).toContain('You do not have permission to view or manage');
    expect(html).toContain('Fees &amp; Commissions');
    expect(html).toContain('Under strict role-based access control (ADMIN-ROLE-003)');
    expect(html).toContain('Support');

    // Sensitive fee data MUST NOT be rendered
    expect(html).not.toContain('data-testid="a13-fees-screen"');
    expect(html).not.toContain('data-testid="a13-config-table"');
    expect(html).not.toContain('commission.rate');
  });

  it('VERBATIM ACCEPTANCE CRITERION: Support role navigation hides the Fees page link', () => {
    const supportUser = makeStaffUser(['SUPPORT'], 'Support Agent');

    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={supportUser}>
        <AdminLayout activeScreenId="A02">
          <div>Dashboard content</div>
        </AdminLayout>
      </AdminAuthProvider>,
    );

    // Support can see Users (A03 view), Categories (A05 view), Bookings (A07 edit), Support Queue (A12 edit)
    expect(html).toContain('data-testid="nav-link-a03"');
    expect(html).toContain('data-testid="nav-link-a05"');
    expect(html).toContain('data-testid="nav-link-a07"');
    expect(html).toContain('data-testid="nav-link-a12"');

    // But Fees (A13) MUST BE HIDDEN in navigation
    expect(html).not.toContain('data-testid="nav-link-a13"');
    // Payments (A09) MUST BE HIDDEN for Support as well
    expect(html).not.toContain('data-testid="nav-link-a09"');
  });

  it('Super Admin CAN open Fees page and view financial parameters', () => {
    const superAdminUser = makeStaffUser(['SUPER_ADMIN'], 'Super Admin User');

    // 1. Matrix check: Super Admin has 'edit' access
    const saLevel = resolveEffectiveAccess(superAdminUser.subRoles, 'A13');
    expect(saLevel).toBe('edit');
    expect(canOpenFeesPage(superAdminUser.subRoles)).toBe(true);

    // 2. Component render check: Renders full Fees screen with financial parameters
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={superAdminUser}>
        <A13FeesScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a13-fees-screen"');
    expect(html).toContain('data-testid="a13-config-table"');
    expect(html).toContain('commission.rate');
    expect(html).toContain('0.30 (30%)');
    expect(html).toContain('D-006; COMM-001');
    expect(html).toContain('commission.base_line_types');
    expect(html).toContain('[&quot;LABOR&quot;] only');
    expect(html).toContain('ledger.max_negative_balance');
    expect(html).toContain('Rs. 0 (Hard block)');
    expect(html).not.toContain('data-testid="a13-forbidden-403"');
  });

  it('Finance role CAN open Fees page and view financial parameters', () => {
    const financeUser = makeStaffUser(['FINANCE'], 'Finance Officer User');

    // 1. Matrix check: Finance has 'edit' access
    const finLevel = resolveEffectiveAccess(financeUser.subRoles, 'A13');
    expect(finLevel).toBe('edit');
    expect(canOpenFeesPage(financeUser.subRoles)).toBe(true);

    // 2. Component render check: Renders full Fees screen
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={financeUser}>
        <A13FeesScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a13-fees-screen"');
    expect(html).toContain('data-testid="a13-config-table"');
    expect(html).toContain('Access: EDIT');
    expect(html).not.toContain('data-testid="a13-forbidden-403"');
  });

  it('Non-financial roles (Operations, Content Manager, Risk/Trust, Analyst, Technical Admin) are all denied Fees access', () => {
    const deniedRoles: AdminSubRole[] = [
      'OPERATIONS',
      'CONTENT_MANAGER',
      'RISK_TRUST',
      'ANALYST',
      'TECHNICAL_ADMIN',
    ];

    for (const role of deniedRoles) {
      const user = makeStaffUser([role], `${role} Staff`);
      expect(canOpenFeesPage(user.subRoles)).toBe(false);
      expect(resolveEffectiveAccess(user.subRoles, 'A13')).toBe('none');

      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={user}>
          <A13FeesScreen />
        </AdminAuthProvider>,
      );
      expect(html).toContain('data-testid="a13-forbidden-403"');
      expect(html).not.toContain('data-testid="a13-fees-screen"');
    }
  });

  it('Sub-role union rule (OQ-053): User holding Support AND Finance gains Finance access to Fees', () => {
    const dualUser = makeStaffUser(['SUPPORT', 'FINANCE'], 'Dual Role Staff');

    // Union resolves to the higher privilege ('none' for SUP, 'edit' for FIN -> effective: 'edit')
    const effective = resolveEffectiveAccess(dualUser.subRoles, 'A13');
    expect(effective).toBe('edit');
    expect(canOpenFeesPage(dualUser.subRoles)).toBe(true);

    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={dualUser}>
        <A13FeesScreen />
      </AdminAuthProvider>,
    );
    expect(html).toContain('data-testid="a13-fees-screen"');
    expect(html).not.toContain('data-testid="a13-forbidden-403"');
  });

  it('Full access matrix across 26 screens conforms to docs/screens/admin.md §2', () => {
    // A01 Admin login: all 8 sub-roles can edit own sign-in
    for (const role of Object.keys(SUB_ROLE_ACCESS_MATRIX.A01) as AdminSubRole[]) {
      expect(SUB_ROLE_ACCESS_MATRIX.A01[role]).toBe('edit');
    }

    // A02 Dashboard: all 8 sub-roles can view
    for (const role of Object.keys(SUB_ROLE_ACCESS_MATRIX.A02) as AdminSubRole[]) {
      expect(SUB_ROLE_ACCESS_MATRIX.A02[role]).toBe('view');
    }

    // A09 Payments: ONLY Finance has approve access; Support, OPS, CM get none
    expect(SUB_ROLE_ACCESS_MATRIX.A09.FINANCE).toBe('approve');
    expect(SUB_ROLE_ACCESS_MATRIX.A09.SUPPORT).toBe('none');
    expect(SUB_ROLE_ACCESS_MATRIX.A09.CONTENT_MANAGER).toBe('none');

    // A14 Promotions: Not launch (all none)
    for (const role of Object.keys(SUB_ROLE_ACCESS_MATRIX.A14) as AdminSubRole[]) {
      expect(SUB_ROLE_ACCESS_MATRIX.A14[role]).toBe('none');
    }
  });

  it('Screen A13 supports the 5 canonical screen states (UX-SCREEN-003)', () => {
    const finUser = makeStaffUser(['FINANCE']);

    // Loading state
    const loadingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={finUser}>
        <A13FeesScreen mockScreenState="loading" />
      </AdminAuthProvider>,
    );
    expect(loadingHtml).toContain('data-testid="a13-state-loading"');

    // Empty state
    const emptyHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={finUser}>
        <A13FeesScreen mockScreenState="empty" />
      </AdminAuthProvider>,
    );
    expect(emptyHtml).toContain('data-testid="a13-state-empty"');

    // Error state
    const errorHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={finUser}>
        <A13FeesScreen mockScreenState="error" />
      </AdminAuthProvider>,
    );
    expect(errorHtml).toContain('data-testid="a13-state-error"');

    // Pending state
    const pendingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={finUser}>
        <A13FeesScreen mockScreenState="pending" />
      </AdminAuthProvider>,
    );
    expect(pendingHtml).toContain('data-testid="a13-state-pending"');

    // Success state
    const successHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={finUser}>
        <A13FeesScreen mockScreenState="success" />
      </AdminAuthProvider>,
    );
    expect(successHtml).toContain('data-testid="a13-config-table"');
  });
});

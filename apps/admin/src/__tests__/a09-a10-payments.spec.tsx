/**
 * T6.4 Admin Payments & Disputes Test Suite
 * Tests for:
 * - Screen A09 Payments & Commission Verification Queue (all 5 tabs, correction, settlement)
 * - Screen A10 Refunds & Disputes (case workflow, updates, decisions, gateway refunds)
 * Requirements: OPS-ADMIN-009, OPS-ADMIN-010, PAY-001..009, LEDGER-001..007, LEDGER-PAY-001..007, ROLE-003, ABUSE-010, D-026.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SUB_ROLE_ACCESS_MATRIX } from '../auth/access-matrix';
import { AdminAuthProvider } from '../auth/admin-auth-context';
import type { AdminStaffUser, AdminSubRole } from '../auth/types';
import { A09PaymentsScreen } from '../components/A09PaymentsScreen';
import { A10RefundsDisputesScreen } from '../components/A10RefundsDisputesScreen';

function makeStaffUser(subRoles: readonly AdminSubRole[], name = 'Test Staff'): AdminStaffUser {
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

describe('[T6.4] Admin Payments & Disputes Test Suite', () => {
  describe('A09: Payments, Exceptions, Provider Accounts & Settlements', () => {
    it('verifies access control matrix for A09: Finance has approve, Support has none (403)', () => {
      expect(SUB_ROLE_ACCESS_MATRIX.A09.FINANCE).toBe('approve');
      expect(SUB_ROLE_ACCESS_MATRIX.A09.SUPPORT).toBe('none');
      expect(SUB_ROLE_ACCESS_MATRIX.A09.OPERATIONS).toBe('none');

      const supportUser = makeStaffUser(['SUPPORT']);
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={supportUser}>
          <A09PaymentsScreen />
        </AdminAuthProvider>,
      );

      // Support must receive 403 Access Denied
      expect(html).toContain('403 — Access Denied');
    });

    it('renders all 5 tabs for Finance role (Transactions, Exceptions, Provider accounts, Verify, Settlements)', () => {
      const financeUser = makeStaffUser(['FINANCE']);
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={financeUser}>
          <A09PaymentsScreen />
        </AdminAuthProvider>,
      );

      expect(html).toContain('A09 — Payments &amp; Commission Queue');
      expect(html).toContain('Commission payments to verify');
      expect(html).toContain('Transactions');
      expect(html).toContain('Exceptions');
      expect(html).toContain('Provider accounts');
      expect(html).toContain('Settlements');
    });

    it('renders verification queue with duplicate transaction reference check and proof link', () => {
      const financeUser = makeStaffUser(['FINANCE']);
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={financeUser}>
          <A09PaymentsScreen />
        </AdminAuthProvider>,
      );

      expect(html).toContain('Akram Electrician');
      expect(html).toContain('EP-9823411');
      expect(html).toContain('View Receipt');
      expect(html).toContain('Approve');
      expect(html).toContain('Reject');
    });
  });

  describe('A10: Refunds & Disputes (BP §14, §40, SUP-002..004, PAY-006)', () => {
    it('verifies access matrix for A10: OPS, SUP, RT, FIN have access; unpermitted roles receive 403', () => {
      expect(SUB_ROLE_ACCESS_MATRIX.A10.OPERATIONS).toBe('approve');
      expect(SUB_ROLE_ACCESS_MATRIX.A10.SUPPORT).toBe('edit');
      expect(SUB_ROLE_ACCESS_MATRIX.A10.RISK_TRUST).toBe('approve');
      expect(SUB_ROLE_ACCESS_MATRIX.A10.FINANCE).toBe('approve');
      expect(SUB_ROLE_ACCESS_MATRIX.A10.CONTENT_MANAGER).toBe('none');

      const cmUser = makeStaffUser(['CONTENT_MANAGER']);
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={cmUser}>
          <A10RefundsDisputesScreen />
        </AdminAuthProvider>,
      );

      expect(html).toContain('403 — Access Denied');
    });

    it('renders dispute cases list with level, outcome, charges and action buttons', () => {
      const opsUser = makeStaffUser(['OPERATIONS']);
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={opsUser}>
          <A10RefundsDisputesScreen />
        </AdminAuthProvider>,
      );

      expect(html).toContain('A10 — Refunds &amp; Disputes');
      expect(html).toContain('BK-78912');
      expect(html).toContain('L3');
      expect(html).toContain('Send update');
      expect(html).toContain('Escalate');
      expect(html).toContain('Resolve');
      expect(html).toContain('Send back for rework');
      expect(html).toContain('Close');
    });

    it('renders "Issue refund" action only for Finance role on gateway-confirmed digital payments', () => {
      const finUser = makeStaffUser(['FINANCE']);
      const htmlFin = renderToStaticMarkup(
        <AdminAuthProvider initialUser={finUser}>
          <A10RefundsDisputesScreen />
        </AdminAuthProvider>,
      );

      expect(htmlFin).toContain('Issue refund');

      // Support user cannot see Issue refund
      const supUser = makeStaffUser(['SUPPORT']);
      const htmlSup = renderToStaticMarkup(
        <AdminAuthProvider initialUser={supUser}>
          <A10RefundsDisputesScreen />
        </AdminAuthProvider>,
      );

      expect(htmlSup).not.toContain('Issue refund');
    });

    it('verifies English-only administrative presentation (D-026)', () => {
      const finUser = makeStaffUser(['FINANCE']);
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={finUser}>
          <A10RefundsDisputesScreen />
        </AdminAuthProvider>,
      );

      // Verify no Urdu Arabic script is leaked in Admin UI per D-026
      expect(html).not.toMatch(/\p{Script=Arabic}/u);
    });
  });
});

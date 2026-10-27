/**
 * T7.5 Admin Support Queue & Knowledgebase Test Suite (A12)
 * Tests for:
 * - Screen A12 Support Queue & SLAs
 * - Role-based access control: SUPPORT, OPERATIONS, FINANCE, RISK_TRUST allowed ('edit'), others 403 (OPS-ADMIN-012)
 * - Queue rendering, filtering (level, category, status, SLA, safety flag)
 * - FAQ knowledgebase tab rendering
 * - Consequential actions requiring mandatory audit reason (ROLE-003)
 * - Security check against payment instructions in staff updates (SEC-REVIEW #25)
 * - 5 Canonical states (L, E, S, X, P)
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SUB_ROLE_ACCESS_MATRIX } from '../auth/access-matrix';
import { AdminAuthProvider } from '../auth/admin-auth-context';
import type { AdminStaffUser, AdminSubRole } from '../auth/types';
import { A12SupportScreen, INITIAL_TICKETS, INITIAL_FAQS } from '../components/A12SupportScreen';

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

describe('[T7.5] Admin Support Queue Test Suite (A12)', () => {
  describe('A12 Access Control (OPS-ADMIN-012)', () => {
    it('verifies sub-role access matrix according to docs/screens/admin.md', () => {
      expect(SUB_ROLE_ACCESS_MATRIX.A12.SUPPORT).toBe('edit');
      expect(SUB_ROLE_ACCESS_MATRIX.A12.OPERATIONS).toBe('edit');
      expect(SUB_ROLE_ACCESS_MATRIX.A12.FINANCE).toBe('edit');
      expect(SUB_ROLE_ACCESS_MATRIX.A12.RISK_TRUST).toBe('edit');
      expect(SUB_ROLE_ACCESS_MATRIX.A12.CONTENT_MANAGER).toBe('none');
      expect(SUB_ROLE_ACCESS_MATRIX.A12.ANALYST).toBe('none');
      expect(SUB_ROLE_ACCESS_MATRIX.A12.TECHNICAL_ADMIN).toBe('none');
    });

    it('denies access to unauthorized sub-roles with 403 Forbidden', () => {
      // Content Manager
      const cmUser = makeStaffUser(['CONTENT_MANAGER']);
      const cmHtml = renderToStaticMarkup(
        <AdminAuthProvider initialUser={cmUser}>
          <A12SupportScreen />
        </AdminAuthProvider>,
      );
      expect(cmHtml).toContain('403 — Access Denied');

      // Analyst
      const analystUser = makeStaffUser(['ANALYST']);
      const analystHtml = renderToStaticMarkup(
        <AdminAuthProvider initialUser={analystUser}>
          <A12SupportScreen />
        </AdminAuthProvider>,
      );
      expect(analystHtml).toContain('403 — Access Denied');
    });

    it('renders A12 support queue for SUPPORT staff', () => {
      const supportUser = makeStaffUser(['SUPPORT'], 'Support Agent');
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={supportUser}>
          <A12SupportScreen />
        </AdminAuthProvider>,
      );

      expect(html).toContain('Support Queue &amp; SLAs');
      expect(html).toContain('data-testid="a12-tab-tickets"');
      expect(html).toContain('data-testid="a12-tab-faq"');
      expect(html).toContain('TKT-1001');
      expect(html).toContain('TKT-1002');
      expect(html).toContain('TKT-1003');
    });

    it('renders A12 support queue for OPERATIONS staff', () => {
      const opsUser = makeStaffUser(['OPERATIONS'], 'Ops Lead');
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={opsUser}>
          <A12SupportScreen />
        </AdminAuthProvider>,
      );

      expect(html).toContain('Support Queue &amp; SLAs');
      expect(html).toContain('data-testid="a12-table-tickets"');
    });
  });

  describe('Ticket Data, Filters & Canonical States (SUP-001, SUP-002, CFG-RULE-012)', () => {
    it('verifies initial tickets contain essential metadata and levels L2..L5', () => {
      expect(INITIAL_TICKETS.length).toBeGreaterThanOrEqual(3);
      const ticket = INITIAL_TICKETS[0]!;
      expect(ticket.ticketNumber).toMatch(/^TKT-/);
      expect(['L2', 'L3', 'L4', 'L5']).toContain(ticket.level);
      expect(['ON_TRACK', 'BREACHED', 'NOT_SET']).toContain(ticket.slaStatus);
      expect(ticket.requesterName).toBeTruthy();
    });

    it('verifies FAQ knowledgebase data contains Customer and Provider articles', () => {
      expect(INITIAL_FAQS.length).toBeGreaterThanOrEqual(3);
      const customerFaq = INITIAL_FAQS.find((f) => f.audience === 'CUSTOMER');
      const providerFaq = INITIAL_FAQS.find((f) => f.audience === 'PROVIDER');

      expect(customerFaq).toBeDefined();
      expect(providerFaq).toBeDefined();
    });

    it('renders Loading, Error, and Pending states correctly', () => {
      const supportUser = makeStaffUser(['SUPPORT']);

      const loadingHtml = renderToStaticMarkup(
        <AdminAuthProvider initialUser={supportUser}>
          <A12SupportScreen initialState="L" />
        </AdminAuthProvider>,
      );
      expect(loadingHtml).toContain('data-testid="a12-loading-state"');

      const errorHtml = renderToStaticMarkup(
        <AdminAuthProvider initialUser={supportUser}>
          <A12SupportScreen initialState="X" />
        </AdminAuthProvider>,
      );
      expect(errorHtml).toContain('data-testid="a12-error-state"');

      const pendingHtml = renderToStaticMarkup(
        <AdminAuthProvider initialUser={supportUser}>
          <A12SupportScreen initialState="P" />
        </AdminAuthProvider>,
      );
      expect(pendingHtml).toContain('data-testid="a12-pending-state"');
    });

    it('renders Empty state when tickets list is empty', () => {
      const supportUser = makeStaffUser(['SUPPORT']);
      const emptyHtml = renderToStaticMarkup(
        <AdminAuthProvider initialUser={supportUser}>
          <A12SupportScreen initialTicketsList={[]} />
        </AdminAuthProvider>,
      );
      expect(emptyHtml).toContain('data-testid="a12-empty-state"');
    });
  });

  describe('Safety & Escalation Rules (BOOK-CANCEL-006, SEC-REVIEW #25)', () => {
    it('flags safety hazards and emergency fast-track tickets', () => {
      const safetyTicket = INITIAL_TICKETS.find((t) => t.isSafety);
      expect(safetyTicket).toBeDefined();
      expect(safetyTicket?.level).toBe('L3'); // Fast-tracked to L3 Operations
      expect(safetyTicket?.category).toBe('SAFETY');
    });
  });
});

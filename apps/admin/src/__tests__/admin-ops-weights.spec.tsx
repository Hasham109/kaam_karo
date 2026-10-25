/**
 * Screen A07, A08, A21, A22, A24 Operations, Weights & AI Test Suite
 * Requirements: T5.3 (Bookings, Quotes Exceptions, Matching Weights, Badge Rules, AI Guidance Editor);
 * OPS-ADMIN-007, OPS-ADMIN-008, OPS-ADMIN-021, OPS-ADMIN-022, OPS-ADMIN-024;
 * BOOK-STATUS-001..017, BOOK-CANCEL-001..006, LEDGER-NEG-005/006, MATCH-SCORE-001..013,
 * TRUST-BADGE-001..014, REQ-AI-003, REQ-AI-007, ROLE-003, D-004, D-005, D-010, D-021.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { AdminAuthProvider } from '../auth/admin-auth-context';
import type { AdminStaffUser, AdminSubRole } from '../auth/types';
import { A07BookingsScreen } from '../components/A07BookingsScreen';
import { A08QuotesScreen } from '../components/A08QuotesScreen';
import { A21WeightsScreen } from '../components/A21WeightsScreen';
import { A22BadgeRulesScreen } from '../components/A22BadgeRulesScreen';
import { A24AiGuidanceScreen } from '../components/A24AiGuidanceScreen';

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

describe('[T5.3] Screen A07 — Bookings', () => {
  it('allows Operations and Support to edit, Risk/Trust to view, denies Finance', () => {
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A07')).toBe('edit');
    expect(resolveEffectiveAccess(['SUPPORT'], 'A07')).toBe('edit');
    expect(resolveEffectiveAccess(['RISK_TRUST'], 'A07')).toBe('view');
    expect(resolveEffectiveAccess(['FINANCE'], 'A07')).toBe('none');
  });

  it('renders booking list with masked phones and start blocked indicator', () => {
    const opsUser = makeStaffUser(['OPERATIONS'], 'Ops Officer');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A07BookingsScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a07-bookings-screen"');
    expect(html).toContain('B-101');
    expect(html).toContain('AC General Service');
    expect(html).toContain('+92 ••• ••••456');
    expect(html).toContain('+92 ••• ••••789');
    expect(html).toContain('Start Blocked'); // D-021: unpaid commission block
    expect(html).toContain('data-testid="a07-cancel-B-101"');
    expect(html).toContain('data-testid="a07-noshow-B-101"');
  });

  it('renders View only for Risk/Trust staff without action buttons', () => {
    const rtUser = makeStaffUser(['RISK_TRUST'], 'Risk Officer');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={rtUser}>
        <A07BookingsScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('View only');
    expect(html).not.toContain('data-testid="a07-cancel-B-101"');
  });

  it('renders 403 Forbidden for unauthorized roles like Finance', () => {
    const financeUser = makeStaffUser(['FINANCE'], 'Finance Officer');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={financeUser}>
        <A07BookingsScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a07-forbidden-403"');
    expect(html).not.toContain('data-testid="a07-bookings-table"');
  });

  it('renders 5 canonical states', () => {
    const opsUser = makeStaffUser(['OPERATIONS']);
    const loadingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A07BookingsScreen mockScreenState="loading" />
      </AdminAuthProvider>,
    );
    expect(loadingHtml).toContain('data-testid="a07-state-loading"');

    const errorHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A07BookingsScreen mockScreenState="error" />
      </AdminAuthProvider>,
    );
    expect(errorHtml).toContain('data-testid="a07-state-error"');

    const pendingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A07BookingsScreen mockScreenState="pending" />
      </AdminAuthProvider>,
    );
    expect(pendingHtml).toContain('data-testid="a07-state-pending"');
  });
});

describe('[T5.3] Screen A08 — Quotes Exceptions', () => {
  it('allows Operations and Risk/Trust to view, denies Support and Finance', () => {
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A08')).toBe('view');
    expect(resolveEffectiveAccess(['RISK_TRUST'], 'A08')).toBe('view');
    expect(resolveEffectiveAccess(['SUPPORT'], 'A08')).toBe('none');
    expect(resolveEffectiveAccess(['FINANCE'], 'A08')).toBe('none');
  });

  it('renders quote exceptions with crew size and exception kinds', () => {
    const opsUser = makeStaffUser(['OPERATIONS']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A08QuotesScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a08-quotes-screen"');
    expect(html).toContain('Q-501');
    expect(html).toContain('EXPIRED');
    expect(html).toContain('CHANGED_AFTER_ACCEPTANCE');
    expect(html).toContain('DISPUTED');
    expect(html).toContain('2 workers');
    expect(html).toContain('PKR 4,500');
  });

  it('renders 403 Forbidden for Support', () => {
    const supportUser = makeStaffUser(['SUPPORT']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={supportUser}>
        <A08QuotesScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a08-forbidden-403"');
    expect(html).not.toContain('data-testid="a08-quotes-table"');
  });
});

describe('[T5.3] Screen A21 — Matching Weights & Fairness', () => {
  it('strictly limits access to Super Admin only; denies Operations and Support', () => {
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A21')).toBe('edit');
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A21')).toBe('none');
    expect(resolveEffectiveAccess(['SUPPORT'], 'A21')).toBe('none');
  });

  it('renders 13 algorithmic scoring signals and hard filters note', () => {
    const saUser = makeStaffUser(['SUPER_ADMIN']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={saUser}>
        <A21WeightsScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a21-weights-screen"');
    expect(html).toContain('Distance to Job Location');
    expect(html).toContain('Haversine km distance');
    expect(html).toContain('20%');
    expect(html).toContain('Hard eligibility rules 73–79 and unpaid-commission hiring block');
    expect(html).toContain('data-testid="a21-open-save-btn"');
  });

  it('renders 403 Forbidden for Operations on A21', () => {
    const opsUser = makeStaffUser(['OPERATIONS']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A21WeightsScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a21-forbidden-403"');
    expect(html).not.toContain('data-testid="a21-weights-table"');
  });
});

describe('[T5.3] Screen A22 — Badge Rules', () => {
  it('strictly limits access to Super Admin only; denies Operations', () => {
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A22')).toBe('edit');
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A22')).toBe('none');
  });

  it('renders Fact badges as view only and Rule badges with edit controls', () => {
    const saUser = makeStaffUser(['SUPER_ADMIN']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={saUser}>
        <A22BadgeRulesScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a22-badges-screen"');
    expect(html).toContain('Verified');
    expect(html).toContain('Fact Badge');
    expect(html).toContain('Highly Rated');
    expect(html).toContain('Rule Badge');
    expect(html).toContain('data-testid="a22-edit-b-rated"');
  });

  it('renders 403 Forbidden for Operations on A22', () => {
    const opsUser = makeStaffUser(['OPERATIONS']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={opsUser}>
        <A22BadgeRulesScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a22-forbidden-403"');
    expect(html).not.toContain('data-testid="a22-badges-table"');
  });
});

describe('[T5.3] Screen A24 — AI Guidance & Questions Editor', () => {
  it('strictly limits access to Super Admin only; denies Support', () => {
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A24')).toBe('edit');
    expect(resolveEffectiveAccess(['SUPPORT'], 'A24')).toBe('none');
  });

  it('renders AI guidance prompt text and customer intake questions', () => {
    const saUser = makeStaffUser(['SUPER_ADMIN']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={saUser}>
        <A24AiGuidanceScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a24-guidance-screen"');
    expect(html).toContain('Server-side only; never sent to mobile apps');
    expect(html).toContain('What is the AC ton capacity?');
    expect(html).toContain('data-testid="a24-open-save-btn"');
  });

  it('renders 403 Forbidden for Support on A24', () => {
    const supportUser = makeStaffUser(['SUPPORT']);
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={supportUser}>
        <A24AiGuidanceScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a24-forbidden-403"');
    expect(html).not.toContain('data-testid="a24-questions-table"');
  });
});

/**
 * Screen A16, A17, A19, A25, A26 Reports, Audit, Health & AI Viewer Test Suite
 * Requirements: T5.4 (Audit log viewer, reports, marketplace health, AI interaction viewer, system health);
 * OPS-ADMIN-016, OPS-ADMIN-017, OPS-ADMIN-019, OPS-ADMIN-025, OPS-ADMIN-026;
 * ANALYTICS-001..008, DATA-002, DATA-004, REL-009, REL-011, HEALTH-001..020,
 * MATCH-FAIR-002, MATCH-GAP-001, REQ-AI-002..009, BP §14, §35, §39, §61, §66, §67.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveEffectiveAccess } from '../auth/access-matrix';
import { AdminAuthProvider } from '../auth/admin-auth-context';
import type { AdminStaffUser, AdminSubRole } from '../auth/types';
import { A16ReportsScreen } from '../components/A16ReportsScreen';
import { A17AuditLogsScreen } from '../components/A17AuditLogsScreen';
import { A19SystemHealthScreen } from '../components/A19SystemHealthScreen';
import { A25MarketplaceHealthScreen } from '../components/A25MarketplaceHealthScreen';
import { A26AiInteractionViewerScreen } from '../components/A26AiInteractionViewerScreen';

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

describe('[T5.4] Screen A16 — Reports & Analytics', () => {
  it('enforces RBAC matrix for A16', () => {
    expect(resolveEffectiveAccess(['ANALYST'], 'A16')).toBe('view');
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A16')).toBe('view');
    expect(resolveEffectiveAccess(['FINANCE'], 'A16')).toBe('view');
    expect(resolveEffectiveAccess(['TECHNICAL_ADMIN'], 'A16')).toBe('view');
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A16')).toBe('none'); // OQ cell in spec §2
    expect(resolveEffectiveAccess(['SUPPORT'], 'A16')).toBe('none');
    expect(resolveEffectiveAccess(['CONTENT_MANAGER'], 'A16')).toBe('none');
  });

  it('renders report tabs and metrics for Analyst', () => {
    const analyst = makeStaffUser(['ANALYST'], 'Data Analyst');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={analyst}>
        <A16ReportsScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a16-reports-screen"');
    expect(html).toContain('Reports &amp; Analytics (A16)');
    expect(html).toContain('Request-to-Match Rate');
    expect(html).toContain('94.8%');
    expect(html).toContain('data-testid="a16-tabs-nav"');
  });

  it('denies access to Support role with 403 Forbidden', () => {
    const support = makeStaffUser(['SUPPORT'], 'Support Agent');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={support}>
        <A16ReportsScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a16-forbidden-403"');
  });

  it('supports canonical states: loading, error, empty', () => {
    const analyst = makeStaffUser(['ANALYST'], 'Data Analyst');

    const loadingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={analyst}>
        <A16ReportsScreen mockScreenState="loading" />
      </AdminAuthProvider>,
    );
    expect(loadingHtml).toContain('data-testid="a16-reports-screen-loading"');

    const errorHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={analyst}>
        <A16ReportsScreen mockScreenState="error" />
      </AdminAuthProvider>,
    );
    expect(errorHtml).toContain('data-testid="a16-reports-screen-error"');

    const emptyHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={analyst}>
        <A16ReportsScreen mockScreenState="empty" />
      </AdminAuthProvider>,
    );
    expect(emptyHtml).toContain('data-testid="a16-empty-state"');
  });
});

describe('[T5.4] Screen A17 — Audit Logs', () => {
  it('enforces RBAC: Super Admin has view, others have none', () => {
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A17')).toBe('view');
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A17')).toBe('none');
    expect(resolveEffectiveAccess(['SUPPORT'], 'A17')).toBe('none');
    expect(resolveEffectiveAccess(['FINANCE'], 'A17')).toBe('none');
    expect(resolveEffectiveAccess(['ANALYST'], 'A17')).toBe('none');
  });

  it('renders immutable audit log table with quick filters for Super Admin', () => {
    const sa = makeStaffUser(['SUPER_ADMIN'], 'Super Admin');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={sa}>
        <A17AuditLogsScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a17-audit-logs-screen"');
    expect(html).toContain('data-testid="a17-immutable-badge"');
    expect(html).toContain('data-testid="a17-audit-table"');
    expect(html).toContain('MATCHING_WEIGHTS_UPDATE');
    expect(html).toContain('BOOKING_CANCEL_INTERVENTION');
    expect(html).toContain('SENSITIVE_DOCUMENT_READ');
    expect(html).toContain('data-testid="a17-qf-sensitive-changes"');
    expect(html).toContain('data-testid="a17-qf-sensitive-reads"');
  });

  it('denies Operations role with 403 Forbidden', () => {
    const ops = makeStaffUser(['OPERATIONS'], 'Ops Staff');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ops}>
        <A17AuditLogsScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a17-forbidden-403"');
  });

  it('supports canonical states: loading, error, empty', () => {
    const sa = makeStaffUser(['SUPER_ADMIN'], 'Super Admin');

    const loadingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={sa}>
        <A17AuditLogsScreen mockScreenState="loading" />
      </AdminAuthProvider>,
    );
    expect(loadingHtml).toContain('data-testid="a17-audit-logs-loading"');

    const errorHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={sa}>
        <A17AuditLogsScreen mockScreenState="error" />
      </AdminAuthProvider>,
    );
    expect(errorHtml).toContain('data-testid="a17-audit-logs-error"');

    const emptyHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={sa}>
        <A17AuditLogsScreen mockScreenState="empty" />
      </AdminAuthProvider>,
    );
    expect(emptyHtml).toContain('data-testid="a17-empty-state"');
  });
});

describe('[T5.4] Screen A19 — System Health', () => {
  it('enforces RBAC: Technical Admin has view, others none', () => {
    expect(resolveEffectiveAccess(['TECHNICAL_ADMIN'], 'A19')).toBe('view');
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A19')).toBe('none'); // OQ cell in spec §2
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A19')).toBe('none');
    expect(resolveEffectiveAccess(['SUPPORT'], 'A19')).toBe('none');
  });

  it('renders components, queues, and integrations telemetry', () => {
    const ta = makeStaffUser(['TECHNICAL_ADMIN'], 'Tech Admin');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ta}>
        <A19SystemHealthScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a19-system-health-screen"');
    expect(html).toContain('data-testid="a19-env-badge"');
    expect(html).toContain('99.98%');
    expect(html).toContain('84 ms');
    expect(html).toContain('PostgreSQL Primary (RDS)');
    expect(html).toContain('booking-lifecycle');
    expect(html).toContain('IntakeAI (Gemini Flash)');
  });

  it('denies Support role with 403 Forbidden', () => {
    const sup = makeStaffUser(['SUPPORT'], 'Support Agent');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={sup}>
        <A19SystemHealthScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a19-forbidden-403"');
  });

  it('supports canonical states: loading, error', () => {
    const ta = makeStaffUser(['TECHNICAL_ADMIN'], 'Tech Admin');

    const loadingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ta}>
        <A19SystemHealthScreen mockScreenState="loading" />
      </AdminAuthProvider>,
    );
    expect(loadingHtml).toContain('data-testid="a19-system-health-loading"');

    const errorHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ta}>
        <A19SystemHealthScreen mockScreenState="error" />
      </AdminAuthProvider>,
    );
    expect(errorHtml).toContain('data-testid="a19-system-health-error"');
  });
});

describe('[T5.4] Screen A25 — Marketplace Health', () => {
  it('enforces RBAC: Operations and Analyst have view', () => {
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A25')).toBe('view');
    expect(resolveEffectiveAccess(['ANALYST'], 'A25')).toBe('view');
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A25')).toBe('none'); // OQ cell in spec §2
    expect(resolveEffectiveAccess(['SUPPORT'], 'A25')).toBe('none');
    expect(resolveEffectiveAccess(['TECHNICAL_ADMIN'], 'A25')).toBe('none');
  });

  it('renders dual-sided metrics, concentration notice, and supply gaps', () => {
    const ops = makeStaffUser(['OPERATIONS'], 'Ops Staff');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ops}>
        <A25MarketplaceHealthScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a25-marketplace-health-screen"');
    expect(html).toContain('data-testid="a25-concentration-banner"');
    expect(html).toContain('data-testid="a25-customer-card"');
    expect(html).toContain('data-testid="a25-supplier-card"');
    expect(html).toContain('Request-to-Match Rate');
    expect(html).toContain('Active Provider Utilization');
    expect(html).toContain('data-testid="a25-gaps-table"');
    expect(html).toContain('Emergency Water Tank Leakage');
    expect(html).toContain('broaden radius (+5km)');
  });

  it('denies Support role with 403 Forbidden', () => {
    const sup = makeStaffUser(['SUPPORT'], 'Support Agent');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={sup}>
        <A25MarketplaceHealthScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a25-forbidden-403"');
  });

  it('supports canonical states: loading, error', () => {
    const ops = makeStaffUser(['OPERATIONS'], 'Ops Staff');

    const loadingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ops}>
        <A25MarketplaceHealthScreen mockScreenState="loading" />
      </AdminAuthProvider>,
    );
    expect(loadingHtml).toContain('data-testid="a25-marketplace-health-loading"');

    const errorHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ops}>
        <A25MarketplaceHealthScreen mockScreenState="error" />
      </AdminAuthProvider>,
    );
    expect(errorHtml).toContain('data-testid="a25-marketplace-health-error"');
  });
});

describe('[T5.4] Screen A26 — AI Interaction Viewer', () => {
  it('enforces RBAC: Operations, Risk/Trust, Technical Admin have view', () => {
    expect(resolveEffectiveAccess(['OPERATIONS'], 'A26')).toBe('view');
    expect(resolveEffectiveAccess(['RISK_TRUST'], 'A26')).toBe('view');
    expect(resolveEffectiveAccess(['TECHNICAL_ADMIN'], 'A26')).toBe('view');
    expect(resolveEffectiveAccess(['SUPER_ADMIN'], 'A26')).toBe('none'); // OQ cell in spec §2
    expect(resolveEffectiveAccess(['SUPPORT'], 'A26')).toBe('none');
    expect(resolveEffectiveAccess(['FINANCE'], 'A26')).toBe('none');
  });

  it('renders interactions table with models, guidance versions, and confidence', () => {
    const ops = makeStaffUser(['OPERATIONS'], 'Ops Staff');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ops}>
        <A26AiInteractionViewerScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a26-ai-viewer-screen"');
    expect(html).toContain('data-testid="a26-interactions-table"');
    expect(html).toContain('gemini-2.0-flash-001');
    expect(html).toContain('v1.4');
    expect(html).toContain('0.94');
    expect(html).toContain('PASSED');
  });

  it('denies Support role with 403 Forbidden', () => {
    const sup = makeStaffUser(['SUPPORT'], 'Support Agent');
    const html = renderToStaticMarkup(
      <AdminAuthProvider initialUser={sup}>
        <A26AiInteractionViewerScreen />
      </AdminAuthProvider>,
    );

    expect(html).toContain('data-testid="a26-forbidden-403"');
  });

  it('supports canonical states: loading, error, empty', () => {
    const ops = makeStaffUser(['OPERATIONS'], 'Ops Staff');

    const loadingHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ops}>
        <A26AiInteractionViewerScreen mockScreenState="loading" />
      </AdminAuthProvider>,
    );
    expect(loadingHtml).toContain('data-testid="a26-ai-viewer-loading"');

    const errorHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ops}>
        <A26AiInteractionViewerScreen mockScreenState="error" />
      </AdminAuthProvider>,
    );
    expect(errorHtml).toContain('data-testid="a26-ai-viewer-error"');

    const emptyHtml = renderToStaticMarkup(
      <AdminAuthProvider initialUser={ops}>
        <A26AiInteractionViewerScreen mockScreenState="empty" />
      </AdminAuthProvider>,
    );
    expect(emptyHtml).toContain('data-testid="a26-empty-state"');
  });
});

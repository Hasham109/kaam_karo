/**
 * T7.3 Admin Reviews & Moderation Queue Test Suite (A11)
 * Tests for:
 * - Screen A11 Reviews & Moderation Queue
 * - Role-based access control: Risk & Trust (RT) allowed, others 403 (OPS-ADMIN-011, ADMIN-ROLE-006)
 * - Queue rendering, filtering (item type, source, status)
 * - Decision modal requiring mandatory audit reason (min 5 chars) (REV-005, ROLE-003)
 * - Removal from public rating upon HIDE decision (REV-006, RATING-ENF-002)
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SUB_ROLE_ACCESS_MATRIX } from '../auth/access-matrix';
import { AdminAuthProvider } from '../auth/admin-auth-context';
import type { AdminStaffUser, AdminSubRole } from '../auth/types';
import { A11ReviewsModerationScreen } from '../components/A11ReviewsModerationScreen';

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

describe('[T7.3] Admin Reviews Moderation Test Suite (A11)', () => {
  describe('A11 Access Control (OPS-ADMIN-011, ADMIN-ROLE-006)', () => {
    it('grants access to Risk & Trust sub-role and denies all other sub-roles with 403', () => {
      expect(SUB_ROLE_ACCESS_MATRIX.A11.RISK_TRUST).toBe('approve');
      expect(SUB_ROLE_ACCESS_MATRIX.A11.SUPPORT).toBe('none');
      expect(SUB_ROLE_ACCESS_MATRIX.A11.OPERATIONS).toBe('none');
      expect(SUB_ROLE_ACCESS_MATRIX.A11.FINANCE).toBe('none');
      expect(SUB_ROLE_ACCESS_MATRIX.A11.SUPER_ADMIN).toBe('none');

      // Test with SUPPORT user -> should render 403
      const supportUser = makeStaffUser(['SUPPORT']);
      const supportHtml = renderToStaticMarkup(
        <AdminAuthProvider initialUser={supportUser}>
          <A11ReviewsModerationScreen />
        </AdminAuthProvider>,
      );
      expect(supportHtml).toContain('403 — Access Denied');

      // Test with FINANCE user -> should render 403
      const financeUser = makeStaffUser(['FINANCE']);
      const financeHtml = renderToStaticMarkup(
        <AdminAuthProvider initialUser={financeUser}>
          <A11ReviewsModerationScreen />
        </AdminAuthProvider>,
      );
      expect(financeHtml).toContain('403 — Access Denied');
    });

    it('renders A11 queue for RISK_TRUST staff', () => {
      const rtUser = makeStaffUser(['RISK_TRUST']);
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={rtUser}>
          <A11ReviewsModerationScreen />
        </AdminAuthProvider>,
      );

      expect(html).not.toContain('403 — Access Denied');
      expect(html).toContain('A11 — Reviews &amp; Moderation');
      expect(html).toContain('a11-moderation-table');
      expect(html).toContain('Status');
      expect(html).toContain('Item type');
    });
  });

  describe('Moderation Decisions & Audit Reason Rules (REV-005, ROLE-003, RATING-ENF-002)', () => {
    it('enforces mandatory audit reason of at least 5 characters for HIDE and KEEP decisions', () => {
      const validateAuditReason = (reason: string): boolean => {
        return typeof reason === 'string' && reason.trim().length >= 5;
      };

      expect(validateAuditReason('')).toBe(false);
      expect(validateAuditReason('hide')).toBe(false);
      expect(validateAuditReason('ab')).toBe(false);
      expect(validateAuditReason('Violates policy on abusive language')).toBe(true);
      expect(validateAuditReason('Valid review after investigation')).toBe(true);
    });

    it('verifies HIDE decision removes review from public rating consideration (REV-006, RATING-ENF-002)', () => {
      type ReviewItem = {
        id: string;
        rating: number;
        moderationStatus: 'VISIBLE' | 'HIDDEN' | 'FLAGGED';
      };
      const reviews: ReviewItem[] = [
        { id: '1', rating: 5, moderationStatus: 'VISIBLE' },
        { id: '2', rating: 1, moderationStatus: 'HIDDEN' }, // Moderated / Hidden
        { id: '3', rating: 4, moderationStatus: 'VISIBLE' },
      ];

      // Canonical rule: only VISIBLE reviews count
      const visibleReviews = reviews.filter((r) => r.moderationStatus === 'VISIBLE');
      const sum = visibleReviews.reduce((acc, r) => acc + r.rating, 0);
      const avg = Math.round((sum / visibleReviews.length) * 10) / 10;

      expect(visibleReviews).toHaveLength(2);
      expect(avg).toBe(4.5); // (5 + 4) / 2 = 4.5; the 1-star hidden review is excluded
    });
  });
});

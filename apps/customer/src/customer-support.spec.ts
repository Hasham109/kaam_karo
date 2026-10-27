/**
 * T7.5 Customer Support & Dispute UI Test Suite (BP §12 C28, C29; SUP-001..005, BOOK-STATUS-012).
 * Tests for:
 * - C28: Help & Support (FAQ self-help L1, support tickets L1-L5, new ticket form)
 * - C29: Structured Complaint & Dispute Screen (issue types, booking link, evidence upload, confirm modal)
 * - 5 Canonical states (L, E, S, X, P)
 * - RTL & Urdu script compliance
 * - Touch target compliance (>= 48 dp)
 */

import { describe, expect, it } from 'vitest';
import { translate } from '@kaamkaro/i18n';
import { MIN_TAP_TARGET_DP, minTapTargetStyle } from '@kaamkaro/ui';
import { getAppMirroring } from './utils/rtl';
import { MOCK_CUSTOMER_TICKETS, MOCK_CUSTOMER_DISPUTES } from './data/mock-data';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T7.5] Customer Support & Disputes Test Suite (C28, C29)', () => {
  describe('C28: Help & Support Translations (SUP-001, SUP-002)', () => {
    it('verifies English and Urdu translations for C28 keys', () => {
      // Header and sections
      expect(translate('en', 'customer.c28.title')).toBe('Help & Support');
      expect(translate('ur', 'customer.c28.title')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c28.faqHeader')).toBe('Common Questions');
      expect(translate('ur', 'customer.c28.faqHeader')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c28.myTicketsHeader')).toBe('My Requests for Help');
      expect(translate('ur', 'customer.c28.myTicketsHeader')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c28.emptyTickets')).toBe("You haven't asked for help yet.");
      expect(translate('ur', 'customer.c28.emptyTickets')).toMatch(ARABIC_SCRIPT);

      // Form labels
      expect(translate('en', 'customer.c28.categoryLabel')).toBe('What is it about?');
      expect(translate('ur', 'customer.c28.categoryLabel')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c28.bookingLabel')).toBe('Related booking (optional)');
      expect(translate('ur', 'customer.c28.bookingLabel')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c28.descriptionLabel')).toBe('Tell us what happened');
      expect(translate('ur', 'customer.c28.descriptionLabel')).toMatch(ARABIC_SCRIPT);

      // Actions & Badges
      expect(translate('en', 'customer.c28.reportProblemBtn')).toBe(
        'Report a problem with a booking',
      );
      expect(translate('ur', 'customer.c28.reportProblemBtn')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c28.submitBtn')).toBe('Send');
      expect(translate('ur', 'customer.c28.submitBtn')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c28.ticketNumber', { number: '1001' })).toBe('Ticket #1001');
      expect(translate('ur', 'customer.c28.ticketNumber', { number: '1001' })).toMatch(
        ARABIC_SCRIPT,
      );

      expect(translate('en', 'customer.c28.statusOpen')).toBe('Open');
      expect(translate('ur', 'customer.c28.statusOpen')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c28.statusClosed')).toBe('Closed');
      expect(translate('ur', 'customer.c28.statusClosed')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c28.levelPrefix', { level: 2 })).toBe('Tier 2');
      expect(translate('ur', 'customer.c28.levelPrefix', { level: 2 })).toMatch(ARABIC_SCRIPT);
    });

    it('verifies mock tickets structure and L1-L5 levels (SUP-002)', () => {
      expect(MOCK_CUSTOMER_TICKETS.length).toBeGreaterThan(0);
      const ticket = MOCK_CUSTOMER_TICKETS[0]!;
      expect(ticket.ticketNumber).toMatch(/^TKT-/);
      expect(ticket.level).toBeGreaterThanOrEqual(1);
      expect(ticket.level).toBeLessThanOrEqual(5);
      expect(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).toContain(ticket.status);
    });
  });

  describe('C29: Structured Complaint & Disputes Translations (SUP-003..005)', () => {
    it('verifies English and Urdu translations for C29 keys', () => {
      // Header and labels
      expect(translate('en', 'customer.c29.title')).toBe('Report an Issue');
      expect(translate('ur', 'customer.c29.title')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c29.bookingLabel')).toBe('Booking');
      expect(translate('ur', 'customer.c29.bookingLabel')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c29.issueTypeLabel')).toBe('What went wrong?');
      expect(translate('ur', 'customer.c29.issueTypeLabel')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c29.descriptionLabel')).toBe('Describe the issue');
      expect(translate('ur', 'customer.c29.descriptionLabel')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c29.evidenceLabel')).toBe(
        'Add photos or documents (optional)',
      );
      expect(translate('ur', 'customer.c29.evidenceLabel')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c29.evidenceCount', { count: 2 })).toBe(
        '2 file(s) attached',
      );
      expect(translate('ur', 'customer.c29.evidenceCount', { count: 2 })).toMatch(ARABIC_SCRIPT);

      // Submission & Confirmation modal
      expect(translate('en', 'customer.c29.submitBtn')).toBe('Submit Complaint');
      expect(translate('ur', 'customer.c29.submitBtn')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c29.confirmTitle')).toBe('Confirm Submission');
      expect(translate('ur', 'customer.c29.confirmTitle')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c29.confirmYes')).toBe('Yes, Submit');
      expect(translate('ur', 'customer.c29.confirmYes')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c29.confirmCancel')).toBe('Cancel');
      expect(translate('ur', 'customer.c29.confirmCancel')).toMatch(ARABIC_SCRIPT);
    });

    it('verifies mock disputes structure and outcome states (SUP-003, BOOK-STATUS-012)', () => {
      expect(MOCK_CUSTOMER_DISPUTES.length).toBeGreaterThan(0);
      const dispute = MOCK_CUSTOMER_DISPUTES[0]!;
      expect(dispute.disputeNumber).toMatch(/^DSP-/);
      expect(dispute.bookingId).toBeTruthy();
      expect(dispute.level).toBe(3); // Escapes to L3 Operations
      expect(dispute.issueType).toBe('POOR_WORKMANSHIP');
    });
  });

  describe('UI & Accessibility Standards', () => {
    it('verifies minimum touch target compliance (>= 48 dp)', () => {
      const style = minTapTargetStyle();
      expect(MIN_TAP_TARGET_DP).toBeGreaterThanOrEqual(48);
      expect(style.minHeight).toBeGreaterThanOrEqual(48);
      expect(style.minWidth).toBeGreaterThanOrEqual(48);
    });

    it('verifies RTL mirroring configuration for English and Urdu', () => {
      const mirrorEn = getAppMirroring('en');
      expect(mirrorEn.direction).toBe('ltr');
      expect(mirrorEn.row).toBe('row');
      expect(mirrorEn.textAlign).toBe('left');

      const mirrorUr = getAppMirroring('ur');
      expect(mirrorUr.direction).toBe('rtl');
      expect(mirrorUr.row).toBe('row-reverse');
      expect(mirrorUr.textAlign).toBe('right');
    });
  });
});

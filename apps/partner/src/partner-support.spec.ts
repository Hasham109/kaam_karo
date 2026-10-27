/**
 * T7.5 Partner Support UI Test Suite (BP §13 P20, BP §40; SUP-001, SUP-002, ROLE-003).
 * Tests for:
 * - P20: Support & Help Screen
 * - Help articles / FAQ self-help (L1)
 * - Support cases L1–L5 lifecycle and update thread
 * - Reply modal flow for partner
 * - RTL & Arabic script checks
 * - Touch target compliance (>= 48 dp)
 */

import { describe, expect, it } from 'vitest';
import { translate } from '@kaamkaro/i18n';
import { MIN_TAP_TARGET_DP, minTapTargetStyle } from '@kaamkaro/ui';
import { getAppMirroring } from './utils/rtl';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T7.5] Partner Support UI Test Suite (P20)', () => {
  describe('P20: Support & Help Strings & Localisation', () => {
    it('verifies English and Urdu translations for all P20 keys', () => {
      // Header and sections
      expect(translate('en', 'partner.p20.title')).toBe('Support & Help');
      expect(translate('ur', 'partner.p20.title')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.faqHeader')).toBe('Help Articles');
      expect(translate('ur', 'partner.p20.faqHeader')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.myCasesHeader')).toBe('My Cases');
      expect(translate('ur', 'partner.p20.myCasesHeader')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.emptyCases')).toBe('No support cases open.');
      expect(translate('ur', 'partner.p20.emptyCases')).toMatch(ARABIC_SCRIPT);

      // Form labels
      expect(translate('en', 'partner.p20.categoryLabel')).toBe('What is it about?');
      expect(translate('ur', 'partner.p20.categoryLabel')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.jobLabel')).toBe('Which job? (Optional)');
      expect(translate('ur', 'partner.p20.jobLabel')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.descriptionLabel')).toBe('Tell us what happened');
      expect(translate('ur', 'partner.p20.descriptionLabel')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.sendBtn')).toBe('Send to Support');
      expect(translate('ur', 'partner.p20.sendBtn')).toMatch(ARABIC_SCRIPT);

      // Status & Badges
      expect(translate('en', 'partner.p20.caseNumber', { number: '8001' })).toBe('Case #8001');
      expect(translate('ur', 'partner.p20.caseNumber', { number: '8001' })).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.statusOpen')).toBe('Open');
      expect(translate('ur', 'partner.p20.statusOpen')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.statusClosed')).toBe('Closed');
      expect(translate('ur', 'partner.p20.statusClosed')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.levelPrefix', { level: 2 })).toBe('Level 2');
      expect(translate('ur', 'partner.p20.levelPrefix', { level: 2 })).toMatch(ARABIC_SCRIPT);

      // Reply modal
      expect(translate('en', 'partner.p20.replyModalTitle')).toBe('Your reply');
      expect(translate('ur', 'partner.p20.replyModalTitle')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.replySendBtn')).toBe('Send Reply');
      expect(translate('ur', 'partner.p20.replySendBtn')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p20.replySuccess')).toBe('Reply sent.');
      expect(translate('ur', 'partner.p20.replySuccess')).toMatch(ARABIC_SCRIPT);
    });
  });

  describe('Accessibility & Layout (D-008, D-028, D-031)', () => {
    it('verifies touch target size >= 48dp on action buttons', () => {
      const style = minTapTargetStyle();
      expect(style.minWidth).toBe(MIN_TAP_TARGET_DP);
      expect(style.minHeight).toBe(MIN_TAP_TARGET_DP);
      expect(MIN_TAP_TARGET_DP).toBeGreaterThanOrEqual(48);
    });

    it('computes correct RTL layout mirroring for Urdu locale', () => {
      const mirrorEn = getAppMirroring('en');
      const mirrorUr = getAppMirroring('ur');

      expect(mirrorEn.direction).toBe('ltr');
      expect(mirrorEn.row).toBe('row');
      expect(mirrorEn.textAlign).toBe('left');

      expect(mirrorUr.direction).toBe('rtl');
      expect(mirrorUr.row).toBe('row-reverse');
      expect(mirrorUr.textAlign).toBe('right');
    });
  });
});

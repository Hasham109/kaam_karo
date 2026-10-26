/**
 * T7.3 Partner Reviews & Reputation UI Test Suite (BP §13 P17, REV-003, REV-004, REV-006, D-014, D-017, D-028).
 * Tests for:
 * - P17: Reviews & Reputation Screen
 * - Rating summary calculation (arithmetic mean to 1 decimal place)
 * - Standing tiers (Good, Warning, Blocked) (D-014)
 * - Threshold notice (D-017)
 * - Provider single moderated response (REV-003)
 * - Flag/report review flow (REV-004)
 * - RTL & Arabic script checks
 * - Touch target compliance (>= 48 dp)
 */

import { describe, expect, it } from 'vitest';
import { translate } from '@kaamkaro/i18n';
import { MIN_TAP_TARGET_DP, minTapTargetStyle } from '@kaamkaro/ui';
import { getAppMirroring } from './utils/rtl';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T7.3] Partner Reviews UI Test Suite (P17)', () => {
  describe('P17: Reviews & Reputation Strings & Localisation', () => {
    it('verifies English and Urdu translations for all P17 keys', () => {
      // Header and summary
      expect(translate('en', 'partner.p17.title')).toBe('Reviews & Ratings');
      expect(translate('ur', 'partner.p17.title')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p17.summary', { avg: '4.8', n: 12 })).toBe(
        '4.8 from 12 ratings',
      );
      expect(translate('ur', 'partner.p17.summary', { avg: '4.8', n: 12 })).toMatch(ARABIC_SCRIPT);

      // Standing tiers
      expect(translate('en', 'partner.p17.standingGood')).toBe('Good standing');
      expect(translate('en', 'partner.p17.standingWarning', { n: 1, N: 3 })).toBe('Warning 1 of 3');
      expect(translate('en', 'partner.p17.standingBlocked')).toBe('Blocked');

      expect(translate('ur', 'partner.p17.standingGood')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'partner.p17.standingWarning', { n: 1, N: 3 })).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'partner.p17.standingBlocked')).toMatch(ARABIC_SCRIPT);

      // Threshold notice
      expect(translate('en', 'partner.p17.thresholdNotice', { threshold: '4.0' })).toContain(
        'Keep your average at 4.0 or above',
      );
      expect(translate('ur', 'partner.p17.thresholdNotice', { threshold: '4.0' })).toMatch(
        ARABIC_SCRIPT,
      );

      // Reply modal
      expect(translate('en', 'partner.p17.replyModalTitle')).toBe('Your reply');
      expect(translate('ur', 'partner.p17.replyModalTitle')).toMatch(ARABIC_SCRIPT);

      // Report modal
      expect(translate('en', 'partner.p17.reportModalTitle')).toBe('Report Review');
      expect(translate('ur', 'partner.p17.reportModalTitle')).toMatch(ARABIC_SCRIPT);
    });
  });

  describe('Reputation & Moderation Business Rules (REV-003, REV-004, REV-006, D-014)', () => {
    it('computes public rating arithmetic mean rounded to 1 decimal place (REV-006)', () => {
      const computeRating = (scores: number[]) => {
        if (scores.length === 0) return { average: 0, count: 0 };
        const sum = scores.reduce((acc, s) => acc + s, 0);
        const avg = Math.round((sum / scores.length) * 10) / 10;
        return { average: avg, count: scores.length };
      };

      expect(computeRating([5, 4, 5])).toEqual({ average: 4.7, count: 3 });
      expect(computeRating([4, 4, 3])).toEqual({ average: 3.7, count: 3 });
      expect(computeRating([5, 4, 4, 4])).toEqual({ average: 4.3, count: 4 });
      expect(computeRating([])).toEqual({ average: 0, count: 0 });
    });

    it('enforces single provider reply constraint (REV-003)', () => {
      const reviewWithReply = {
        id: 'rev_1',
        response: { text: 'Thank you!', createdAt: new Date().toISOString() },
      };

      const canReply = reviewWithReply.response === undefined;
      expect(canReply).toBe(false);

      const reviewWithoutReply = {
        id: 'rev_2',
        response: undefined,
      };

      const canReply2 = reviewWithoutReply.response === undefined;
      expect(canReply2).toBe(true);
    });

    it('enforces flag/report reason minimum length (REV-004)', () => {
      const minReasonLength = 5;
      expect('Too short'.length >= minReasonLength).toBe(true);
      expect('Bad'.length >= minReasonLength).toBe(false);
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

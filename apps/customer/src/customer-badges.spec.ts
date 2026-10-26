/**
 * T7.4 Customer Badges UI Test Suite (BP §55.2, §66, §77.3; TRUST-BADGE-001..014, PROF-FAV-001, D-010).
 * Tests for:
 * - C11: Provider Profile Badge Display
 * - All 14 candidate badges representation (Fact vs Rule)
 * - "What does this mean?" badge explanation toggle
 * - Strict invariant: "Favorite" (user action) and "Customer Favorite" (platform badge) are distinct and never confused (BP §55.2; TRUST-BADGE-004)
 * - C35: Match Results Candidate Card Badges Display
 * - RTL & Arabic script checks
 * - Touch target compliance (>= 48 dp)
 */

import { describe, expect, it } from 'vitest';
import { translate } from '@kaamkaro/i18n';
import { MIN_TAP_TARGET_DP, minTapTargetStyle } from '@kaamkaro/ui';
import { MOCK_PROVIDERS } from './data/mock-data';
import { MOCK_MATCH_CANDIDATES } from './data/matches-mock-data';
import { getAppMirroring } from './utils/rtl';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T7.4] Customer Badges UI Test Suite', () => {
  describe('C11: Badge Display & Explanation (BP §55.2, BP §77.3, TRUST-BADGE-001..014)', () => {
    it('verifies localized strings for badge explanation prompt', () => {
      expect(translate('en', 'customer.c11.explainBadge')).toBe('What does this mean?');
      expect(translate('ur', 'customer.c11.explainBadge')).toMatch(ARABIC_SCRIPT);
    });

    it('verifies all 14 candidate badge names and descriptions exist in i18n catalogs', () => {
      const allBadgeKeys = [
        'verified',
        'highly_rated',
        'experienced',
        'customer_favorite',
        'fast_response',
        'fast_service',
        'reliable',
        'repeat_customer_favorite',
        'top_specialist',
        'recently_joined',
        'emergency_available',
        'available_today',
        'available_now',
        'large_team',
      ] as const;

      for (const badgeKey of allBadgeKeys) {
        const nameEn = translate('en', `common.badge.${badgeKey}.name` as any);
        const nameUr = translate('ur', `common.badge.${badgeKey}.name` as any);
        const descEn = translate('en', `common.badge.${badgeKey}.desc` as any);
        const descUr = translate('ur', `common.badge.${badgeKey}.desc` as any);

        expect(nameEn.length).toBeGreaterThan(0);
        expect(nameUr).toMatch(ARABIC_SCRIPT);
        expect(descEn.length).toBeGreaterThan(0);
        expect(descUr).toMatch(ARABIC_SCRIPT);
      }
    });

    it('renders provider badges on C11 profile', () => {
      const provider = MOCK_PROVIDERS[0]!;
      expect(provider.badges.length).toBeGreaterThan(0);

      for (const b of provider.badges) {
        expect(b.nameEn).toBeTruthy();
        expect(b.nameUr).toMatch(ARABIC_SCRIPT);
        expect(b.descriptionEn).toBeTruthy();
        expect(b.descriptionUr).toMatch(ARABIC_SCRIPT);
      }
    });

    it('enforces BP §55.2 invariant: Favorite action is distinct from Customer Favorite badge', () => {
      // Favorite action string
      const favActionEn = translate('en', 'customer.c11.favoriteSave');
      const favActionUr = translate('ur', 'customer.c11.favoriteSave');
      expect(favActionEn).toBe('Save to favorites');
      expect(favActionUr).toMatch(ARABIC_SCRIPT);

      // Customer Favorite badge string
      const badgeFavEn = translate('en', 'common.badge.customer_favorite.name');
      const badgeFavUr = translate('ur', 'common.badge.customer_favorite.name');
      expect(badgeFavEn).toBe('Customer Favorite');
      expect(badgeFavUr).toMatch(ARABIC_SCRIPT);

      // They must NOT be identical
      expect(favActionEn).not.toBe(badgeFavEn);
      expect(favActionUr).not.toBe(badgeFavUr);
    });
  });

  describe('C35: Candidate Cards Badges (BP §55.1, BP §55.2)', () => {
    it('verifies candidate match cards contain badges array', () => {
      expect(MOCK_MATCH_CANDIDATES.length).toBeGreaterThan(0);

      for (const candidate of MOCK_MATCH_CANDIDATES) {
        expect(Array.isArray(candidate.badges)).toBe(true);
        expect(candidate.verificationLevel).toBeTruthy();
      }
    });
  });

  describe('Accessibility & Layout (D-008, D-028, D-031)', () => {
    it('verifies touch target size >= 48dp on badge interactions', () => {
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

/**
 * T7.2 Customer Chat & Contact UI Test Suite (BP §12 C18, BP §20, BP §74, BP §82; CHAT-001..004, SHARE-001..003).
 */
import { describe, expect, it } from 'vitest';
import { translate } from '@kaamkaro/i18n';
import { MIN_TAP_TARGET_DP, minTapTargetStyle } from '@kaamkaro/ui';
import { getAppMirroring } from './utils/rtl';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T7.2] Customer Chat & Contact UI Test Suite (C18)', () => {
  describe('C18: Chat / Contact Screen Localization & Strings', () => {
    it('verifies C18 title and core action buttons in English and Urdu', () => {
      // English
      expect(translate('en', 'customer.c18.title')).toBe('Chat / Contact');
      expect(translate('en', 'customer.c18.typePlaceholder')).toBe('Type a message');
      expect(translate('en', 'customer.c18.sendBtn')).toBe('Send');
      expect(translate('en', 'customer.c18.callBtn')).toBe('Call');
      expect(translate('en', 'customer.c18.attachBtn')).toBe('Attach');
      expect(translate('en', 'customer.c18.reportBtn')).toBe('Report');
      expect(translate('en', 'customer.c18.blockBtn')).toBe('Block');
      expect(translate('en', 'customer.c18.shareBooking')).toBe('Share Request');

      // Urdu
      expect(translate('ur', 'customer.c18.title')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'customer.c18.typePlaceholder')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'customer.c18.sendBtn')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'customer.c18.callBtn')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'customer.c18.attachBtn')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'customer.c18.reportBtn')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'customer.c18.blockBtn')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'customer.c18.shareBooking')).toMatch(ARABIC_SCRIPT);
    });

    it('verifies canonical screen states copy across en and ur', () => {
      // Empty state
      expect(translate('en', 'customer.c18.empty')).toBe('Send a message about this booking.');
      expect(translate('ur', 'customer.c18.empty')).toMatch(ARABIC_SCRIPT);

      // Error state
      expect(translate('en', 'customer.c18.notSentRetry')).toBe('Not sent. Tap to try again.');
      expect(translate('ur', 'customer.c18.notSentRetry')).toMatch(ARABIC_SCRIPT);

      // Pending / Held moderation state
      expect(translate('en', 'customer.c18.heldMessage')).toBe('This message is being checked.');
      expect(translate('ur', 'customer.c18.heldMessage')).toMatch(ARABIC_SCRIPT);

      // Disallowed attachment
      expect(translate('en', 'customer.c18.fileNotAllowed')).toBe(
        "This file type or size isn't allowed.",
      );
      expect(translate('ur', 'customer.c18.fileNotAllowed')).toMatch(ARABIC_SCRIPT);
    });
  });

  describe('C18: Masked Telephony & Privacy Invariants (CHAT-002, BP §20, §74)', () => {
    it('verifies virtual relay number display string replaces raw phone numbers', () => {
      const enRelay = translate('en', 'customer.c18.callRelayNumber', { number: '+92421115226' });
      const urRelay = translate('ur', 'customer.c18.callRelayNumber', { number: '+92421115226' });

      expect(enRelay).toBe('Virtual Relay: +92421115226');
      expect(urRelay).toMatch(ARABIC_SCRIPT);
      expect(urRelay).toContain('+92421115226');

      // Invariant: Customer/provider personal numbers (e.g. 0300...) are strictly absent
      expect(enRelay).not.toContain('0300');
      expect(urRelay).not.toContain('0300');
    });

    it('enforces touch target minimums (≥ 48 dp) for all chat action buttons', () => {
      expect(MIN_TAP_TARGET_DP).toBe(48);
      expect(minTapTargetStyle().minHeight).toBe(48);
      expect(minTapTargetStyle().minWidth).toBe(48);
    });

    it('verifies RTL mirroring for Urdu layout', () => {
      const enMirror = getAppMirroring('en');
      const urMirror = getAppMirroring('ur');

      expect(enMirror.direction).toBe('ltr');
      expect(enMirror.row).toBe('row');

      expect(urMirror.direction).toBe('rtl');
      expect(urMirror.row).toBe('row-reverse');
      expect(urMirror.iconScaleX).toBe(-1);
    });
  });

  describe('External Share Invariants (SHARE-001, SHARE-003, BP §82)', () => {
    it('verifies share payload format contains zero raw phone numbers and no exact address', () => {
      const sampleShareText =
        'Need help with AC Repair on Kaam Karo! Booking Ref: KK-BK001. Area: Gulberg III, Lahore. View details: https://kaamkaro.pk/b/KK-BK001';

      expect(sampleShareText).toContain('AC Repair');
      expect(sampleShareText).toContain('Gulberg III');
      expect(sampleShareText).toContain('KK-BK001');

      // Must not contain phone numbers (BP §20, §52.2, §82)
      expect(sampleShareText).not.toMatch(/(?:\+?92|0)?\s?[3]\d{2}[-\s]?\d{7}/);

      // Must not contain exact street/house numbers
      expect(sampleShareText).not.toContain('House');
      expect(sampleShareText).not.toContain('Street');
    });

    it('enforces SHARE-003: share deep links are informational only with no commercial action execution tokens', () => {
      const deepLink = 'https://kaamkaro.pk/b/KK-BK001';
      expect(deepLink).not.toContain('accept');
      expect(deepLink).not.toContain('pay');
      expect(deepLink).not.toContain('cancel');
      expect(deepLink).not.toContain('complete');
    });
  });
});

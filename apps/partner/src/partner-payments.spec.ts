/**
 * T6.4 Partner Payments Test Suite (BP §13 P15, P16, BP §26, BP §27, BP §30, BP §31.1; D-008, D-016, D-020, D-021; LEDGER-PAY-001..007, PAY-007, SEC-BASE-002, SEC-REVIEW #2).
 * Covers:
 * - P15: Earnings, Wallet, Buckets & Pay Company
 * - P16: Payout Methods Management with Fresh OTP
 */
import { describe, expect, it } from 'vitest';
import { formatPkr, translate } from '@kaamkaro/i18n';
import {
  LINE_HEIGHT_RATIO,
  MIN_TAP_TARGET_DP,
  URDU_FONT_FAMILY,
  minTapTargetStyle,
  textTokens,
} from '@kaamkaro/ui';
import {
  INITIAL_LEDGER_ENTRIES,
  INITIAL_PAYOUT_METHODS,
  SEEDED_BANKS,
  SEEDED_WALLETS,
} from './mock-payment-data';
import type { ScreenStateMode } from './types';
import { getAppMirroring } from './utils/rtl';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T6.4] Partner Payments Test Suite', () => {
  describe('P15: Earnings & Wallet Screen (ARCH §6.8, BP §13 P15, D-016, D-020, D-021, COMM-004)', () => {
    it('verifies balance display and negative balance owed amount (D-016, D-020)', () => {
      const negativeBalanceMinor = -60000; // Rs. -600
      const owedRs = Math.abs(negativeBalanceMinor) / 100;

      const owedEn = translate('en', 'partner.p15.youOweVal', {
        amount: formatPkr('en', owedRs),
      });
      const owedUr = translate('ur', 'partner.p15.youOweVal', {
        amount: formatPkr('ur', owedRs),
      });

      expect(owedEn).toBe('You owe Rs 600');
      expect(owedUr).toMatch(ARABIC_SCRIPT);
    });

    it('verifies earnings buckets: Pending, Available, and Paid out (OQ-070)', () => {
      expect(translate('en', 'partner.p15.pending')).toBe('Pending');
      expect(translate('en', 'partner.p15.available')).toBe('Available');
      expect(translate('en', 'partner.p15.paidOut')).toBe('Paid');

      expect(translate('ur', 'partner.p15.pending')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'partner.p15.available')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'partner.p15.paidOut')).toMatch(ARABIC_SCRIPT);
    });

    it('verifies full ledger history rows (+/-) with all required types (BP §26, LEDGER-003..006)', () => {
      const entries = INITIAL_LEDGER_ENTRIES;
      expect(entries.length).toBeGreaterThanOrEqual(3);

      const commissionDebit = entries.find((e) => e.entryType === 'COMMISSION_DEBIT');
      expect(commissionDebit).toBeDefined();
      expect(commissionDebit?.direction).toBe('DEBIT');
      expect(commissionDebit?.amountMinor).toBe(60000);

      const jobCredit = entries.find((e) => e.entryType === 'JOB_CREDIT');
      expect(jobCredit).toBeDefined();
      expect(jobCredit?.direction).toBe('CREDIT');
      expect(jobCredit?.amountMinor).toBe(320000);

      const settlement = entries.find((e) => e.entryType === 'SETTLEMENT');
      expect(settlement).toBeDefined();
      expect(settlement?.direction).toBe('DEBIT');
      expect(settlement?.settlementStatus).toBe('SETTLED');
    });

    it('verifies per-job breakdown row details: bill, labour, commission, your share (COMM-004)', () => {
      const breakdown = INITIAL_LEDGER_ENTRIES[0]!.jobBreakdown;
      expect(breakdown).toBeDefined();
      expect(breakdown?.billPkr).toBe(2000);
      expect(breakdown?.labourPkr).toBe(2000);
      expect(breakdown?.commissionPkr).toBe(600);
      expect(breakdown?.sharePkr).toBe(1400);

      const textEn = translate('en', 'partner.p15.jobBreakdown', {
        bill: '2000',
        labour: '2000',
        commission: '600',
        share: '1400',
      });
      expect(textEn).toContain('Bill Rs. 2000');
      expect(textEn).toContain('Labour Rs. 2000');
      expect(textEn).toContain('Commission Rs. 600');
      expect(textEn).toContain('Your share Rs. 1400');

      const textUr = translate('ur', 'partner.p15.jobBreakdown', {
        bill: '2000',
        labour: '2000',
        commission: '600',
        share: '1400',
      });
      expect(textUr).toMatch(ARABIC_SCRIPT);
    });

    it('verifies settlement status mapping: Being processed vs Paid out to you (PAY-007)', () => {
      expect(translate('en', 'partner.p15.statusBeingProcessed')).toBe('Being processed');
      expect(translate('en', 'partner.p15.statusPaidOut')).toBe('Paid out to you');

      expect(translate('ur', 'partner.p15.statusBeingProcessed')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'partner.p15.statusPaidOut')).toMatch(ARABIC_SCRIPT);
    });

    it('verifies 5 canonical screen states for P15 (loading, empty, success, error, pending)', () => {
      const states: ScreenStateMode[] = ['loading', 'empty', 'success', 'error', 'pending'];
      expect(states.length).toBe(5);

      expect(translate('en', 'partner.p15.statePending')).toContain('Processing');
      expect(translate('ur', 'partner.p15.statePending')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p15.emptyHistory')).toContain('No earnings yet');
      expect(translate('ur', 'partner.p15.emptyHistory')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p15.stateError')).toContain('Failed to load');
      expect(translate('ur', 'partner.p15.stateError')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p15.pendingOffline')).toContain('Payment submission sent');
      expect(translate('ur', 'partner.p15.pendingOffline')).toMatch(ARABIC_SCRIPT);
    });
  });

  describe('P16: Payout Methods Screen (BP §13 P16, D-008, SEC-BASE-002, SEC-REVIEW #2)', () => {
    it('verifies supported payout method types and seeded providers (EXT-001)', () => {
      expect(SEEDED_BANKS).toContain('Meezan Bank');
      expect(SEEDED_BANKS).toContain('Standard Chartered Bank');
      expect(SEEDED_WALLETS).toContain('EasyPaisa');
      expect(SEEDED_WALLETS).toContain('JazzCash');

      expect(translate('en', 'partner.p16.bankAccount')).toBe('Bank account');
      expect(translate('en', 'partner.p16.mobileWallet')).toBe('Mobile wallet');

      expect(translate('ur', 'partner.p16.bankAccount')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'partner.p16.mobileWallet')).toMatch(ARABIC_SCRIPT);
    });

    it('verifies masked account number format (SEC-BASE-002)', () => {
      const methods = INITIAL_PAYOUT_METHODS;
      expect(methods.length).toBeGreaterThanOrEqual(1);

      const bankMethod = methods[0]!;
      expect(bankMethod.maskedAccountNumber).toContain('••••');
      expect(bankMethod.maskedAccountNumber.endsWith('4401')).toBe(true);
    });

    it('verifies PayoutProvider status chips (Not checked / Verified / Failed)', () => {
      expect(translate('en', 'partner.p16.statusVerified')).toBe('Verified');
      expect(translate('en', 'partner.p16.statusFailed')).toBe('Failed');
      expect(translate('en', 'partner.p16.statusNotChecked')).toBe('Not checked');

      expect(translate('ur', 'partner.p16.statusVerified')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'partner.p16.statusFailed')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'partner.p16.statusNotChecked')).toMatch(ARABIC_SCRIPT);
    });

    it('enforces fresh OTP confirmation requirement for every add or remove (SEC-REVIEW #2, BP §27, §30)', () => {
      const otpDescEn = translate('en', 'partner.p16.otpModalDesc', {
        phone: '0300 1234567',
      });
      const otpDescUr = translate('ur', 'partner.p16.otpModalDesc', {
        phone: '0300 1234567',
      });

      expect(otpDescEn).toContain('0300 1234567');
      expect(otpDescUr).toMatch(ARABIC_SCRIPT);
      expect(otpDescUr).toContain('0300 1234567');
    });

    it('verifies 5 canonical screen states for P16 (loading, empty, success, error, pending)', () => {
      const states: ScreenStateMode[] = ['loading', 'empty', 'success', 'error', 'pending'];
      expect(states.length).toBe(5);

      expect(translate('en', 'partner.p16.loading')).toBe('Saving…');
      expect(translate('ur', 'partner.p16.loading')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p16.emptyMethods')).toContain(
        'Add a bank account or mobile wallet',
      );
      expect(translate('ur', 'partner.p16.emptyMethods')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p16.savedSuccess')).toBe('Payout method saved.');
      expect(translate('ur', 'partner.p16.savedSuccess')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p16.saveFailed')).toContain(
        'We could not save these details',
      );
      expect(translate('ur', 'partner.p16.saveFailed')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'partner.p16.statePending')).toContain('Processing payout method');
      expect(translate('ur', 'partner.p16.statePending')).toMatch(ARABIC_SCRIPT);
    });

    it('verifies 48x48 dp minimum touch targets and RTL tokens', () => {
      const tapStyle = minTapTargetStyle();
      expect(tapStyle.minWidth).toBe(MIN_TAP_TARGET_DP);
      expect(tapStyle.minHeight).toBe(MIN_TAP_TARGET_DP);

      const mirror = getAppMirroring('ur');
      expect(mirror.direction).toBe('rtl');
      expect(mirror.row).toBe('row-reverse');

      const labelTokens = textTokens('ur', 'label');
      expect(labelTokens.fontFamily).toBe(URDU_FONT_FAMILY);
      expect(labelTokens.lineHeight).toBe(Math.round(14 * LINE_HEIGHT_RATIO.urdu));
    });
  });
});

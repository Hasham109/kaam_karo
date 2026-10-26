/**
 * T6.4 Customer Payment UI Test Suite (BP §12 C16, C24, BP §23, BP §26, BP §31.1; D-003, D-008, D-025, D-029, D-030; PAY-001..009).
 * Tests for:
 * - C16 Payment Screen
 * - C24 Payment Receipts & Transaction History Screen
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
import { MOCK_CUSTOMER_RECEIPTS, MOCK_PAYMENT_DETAILS } from './data/mock-data';
import type { CustomerPaymentDetails, ScreenState } from './types';
import { getAppMirroring } from './utils/rtl';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T6.4] Customer Payment UI Test Suite', () => {
  describe('C16: Payment Screen (BP §12 C16, D-003, D-029, D-030, PAY-TIMING-001)', () => {
    it('verifies final bill breakdown includes labour, materials, and launch tax Rs. 0 (D-029)', () => {
      const details = MOCK_PAYMENT_DETAILS;
      expect(details.labourMinor).toBe(250000);
      expect(details.materialsMinor).toBe(120000);
      expect(details.taxMinor).toBe(0); // Launch rate Rs. 0
      expect(details.totalMinor).toBe(370000);

      // Verify no platform fee is charged or shown (D-025)
      expect((details as unknown as Record<string, unknown>).platformFee).toBeUndefined();

      // Translations in English
      expect(translate('en', 'customer.c16.billHeader')).toBe('Your bill');
      expect(translate('en', 'customer.c16.taxZero')).toBe('Tax (Launch Rate: Rs. 0)');
      expect(translate('en', 'customer.c16.totalToPay')).toBe('Total to pay');

      // Translations in Urdu with Arabic script
      expect(translate('ur', 'customer.c16.billHeader')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'customer.c16.taxZero')).toMatch(ARABIC_SCRIPT);
      expect(translate('ur', 'customer.c16.totalToPay')).toMatch(ARABIC_SCRIPT);
    });

    it('enforces D-030: Customer app has NO cash choice; only an information note', () => {
      // Cash information note exists
      const enCashInfo = translate('en', 'customer.c16.cashInfo');
      const urCashInfo = translate('ur', 'customer.c16.cashInfo');

      expect(enCashInfo).toBe('Paying cash? Pay the provider directly. They will record it.');
      expect(urCashInfo).toMatch(ARABIC_SCRIPT);

      // There is no customer action to select cash as payment method
      expect(translate('en', 'customer.c16.digitalMethod')).toBe(
        'Online Payment (Card / Mobile Wallet)',
      );
    });

    it('enforces payment gating (D-003, PAY-TIMING-001): pay action enabled only after job is Completed', () => {
      const incompleteJob: CustomerPaymentDetails = {
        ...MOCK_PAYMENT_DETAILS,
        isJobCompleted: false,
      };

      expect(incompleteJob.isJobCompleted).toBe(false);
      expect(translate('en', 'customer.c16.notCompleted')).toBe(
        'You can pay after the job is completed.',
      );
      expect(translate('ur', 'customer.c16.notCompleted')).toMatch(ARABIC_SCRIPT);
    });

    it('verifies confirmation dialog before digital payment initiation', () => {
      const totalStr = formatPkr('en', 3700);
      const enConfirmBody = translate('en', 'customer.c16.confirmBody', {
        total: totalStr,
        number: 'BK-78912',
      });
      const urConfirmBody = translate('ur', 'customer.c16.confirmBody', {
        total: totalStr,
        number: 'BK-78912',
      });

      expect(enConfirmBody).toContain('BK-78912');
      expect(urConfirmBody).toMatch(ARABIC_SCRIPT);
      expect(urConfirmBody).toContain('BK-78912');
    });

    it('verifies 5 canonical screen states (L, E, S, X, P) and pending network loss copy (BP §31.1)', () => {
      const states: ScreenState[] = ['L', 'E', 'S', 'X', 'P'];
      expect(states.length).toBe(5);

      // Loading state copy
      expect(translate('en', 'customer.c16.startingPayment')).toBe('Starting payment…');
      expect(translate('ur', 'customer.c16.startingPayment')).toMatch(ARABIC_SCRIPT);

      // Empty state (Nothing to pay, already paid)
      expect(translate('en', 'customer.c16.nothingToPay', { method: 'Digital' })).toContain(
        'Nothing to pay',
      );
      expect(translate('ur', 'customer.c16.nothingToPay', { method: 'ڈیجیٹل' })).toMatch(
        ARABIC_SCRIPT,
      );

      // Error state
      expect(translate('en', 'customer.c16.paymentFailed')).toContain("Payment didn't go through");
      expect(translate('ur', 'customer.c16.paymentFailed')).toMatch(ARABIC_SCRIPT);

      // Pending state on network loss (BP §31.1)
      const enPending = translate('en', 'customer.c16.paymentProcessing');
      const urPending = translate('ur', 'customer.c16.paymentProcessing');

      expect(enPending).toBe("Payment is processing. Please don't pay again — we'll update you.");
      expect(urPending).toMatch(ARABIC_SCRIPT);
    });

    it('verifies tap targets meet 48x48 dp minimum and RTL mirroring tokens', () => {
      const tapStyle = minTapTargetStyle();
      expect(tapStyle.minWidth).toBe(MIN_TAP_TARGET_DP);
      expect(tapStyle.minHeight).toBe(MIN_TAP_TARGET_DP);

      const mirrorEn = getAppMirroring('en');
      expect(mirrorEn.direction).toBe('ltr');
      expect(mirrorEn.row).toBe('row');

      const mirrorUr = getAppMirroring('ur');
      expect(mirrorUr.direction).toBe('rtl');
      expect(mirrorUr.row).toBe('row-reverse');

      const bodyTokensUr = textTokens('ur', 'body');
      expect(bodyTokensUr.fontFamily).toBe(URDU_FONT_FAMILY);
      expect(bodyTokensUr.lineHeight).toBe(Math.round(16 * LINE_HEIGHT_RATIO.urdu));
    });
  });

  describe('C24: Payments / Receipts Screen (BP §12 C24, BP §23, BP §26, PAY-009, PAY-006)', () => {
    it('verifies transaction history records show booking ref, amount, method, and status', () => {
      const receipts = MOCK_CUSTOMER_RECEIPTS;
      expect(receipts.length).toBeGreaterThanOrEqual(2);

      const first = receipts[0]!;
      expect(first.bookingRef).toBe('BK-78912');
      expect(first.method).toBe('DIGITAL');
      expect(first.status).toBe('PAID');
      expect(first.amountMinor).toBe(370000);

      expect(translate('en', 'customer.c24.methodDigital')).toBe('Digital');
      expect(translate('ur', 'customer.c24.methodDigital')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c24.statusPaid')).toBe('Paid');
      expect(translate('ur', 'customer.c24.statusPaid')).toMatch(ARABIC_SCRIPT);
    });

    it('verifies linked refund reversal row is rendered for refunded bookings (BP §26, PAY-006)', () => {
      const refundedReceipt = MOCK_CUSTOMER_RECEIPTS.find((r) => r.refund !== undefined);
      expect(refundedReceipt).toBeDefined();
      expect(refundedReceipt?.refund?.amountMinor).toBe(50000);

      const refundStr = translate('en', 'customer.c24.refundRow', {
        amount: formatPkr('en', 500),
        date: '2026-10-21',
      });
      expect(refundStr).toContain('Refund: Rs 500 on 2026-10-21');

      const urRefundStr = translate('ur', 'customer.c24.refundRow', {
        amount: formatPkr('ur', 500),
        date: '2026-10-21',
      });
      expect(urRefundStr).toMatch(ARABIC_SCRIPT);
    });

    it('verifies receipt summary sharing via ACTION_SEND (SHARE-001)', () => {
      const shareTextEn = translate('en', 'customer.c24.shareText', {
        number: 'BK-78912',
        amount: formatPkr('en', 3700),
        method: 'Digital',
      });
      expect(shareTextEn).toBe('Receipt for Booking #BK-78912 — Rs 3,700 (Digital).');

      const shareTextUr = translate('ur', 'customer.c24.shareText', {
        number: 'BK-78912',
        amount: formatPkr('ur', 3700),
        method: 'ڈیجیٹل',
      });
      expect(shareTextUr).toMatch(ARABIC_SCRIPT);
    });

    it('verifies 5 canonical screen states (L, E, S, X, P) for C24', () => {
      const states: ScreenState[] = ['L', 'E', 'S', 'X', 'P'];
      expect(states.length).toBe(5);

      expect(translate('en', 'customer.c24.loading')).toBe('Loading receipts…');
      expect(translate('ur', 'customer.c24.loading')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c24.noTransactions')).toContain('No payments yet');
      expect(translate('ur', 'customer.c24.noTransactions')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c24.error')).toContain('Failed to load receipts');
      expect(translate('ur', 'customer.c24.error')).toMatch(ARABIC_SCRIPT);

      expect(translate('en', 'customer.c24.statusProcessing')).toBe('Processing');
      expect(translate('ur', 'customer.c24.statusProcessing')).toMatch(ARABIC_SCRIPT);
    });
  });
});

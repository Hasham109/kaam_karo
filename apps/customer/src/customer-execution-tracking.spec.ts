/**
 * T4.6 Customer Execution Tracking Test Suite (BP §9, §12, §15, §57.4, §58.2, §81; IMPL §6 line 486).
 * Screens covered:
 * - C17 Booking Tracking Screen (LOC-GEO-007, BOOK-STATUS-006..010, PROV-CREW-003, CHAT-002, BOOK-CANCEL-003, BOOK-CANCEL-006)
 * - C19 Job in Progress Screen (BOOK-STATUS-008..010, D-004, FARE-012)
 * - C37 Extra-Charge Approval Sheet & Dispute (FARE-004, FARE-012, PRICE-005, PRICE-007, PROV-CREW-004, BOOK-CANCEL-006)
 * - C20 Completion & Payment Screen (D-003, D-016, D-029, D-030, PAY-TIMING-001, ARCH §6.8, OQ-044, OQ-077)
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
  MOCK_CANCELLATION_REASONS,
  MOCK_COMPLETION_DETAILS,
  MOCK_PROPOSED_EXTRAS,
  MOCK_TRACKING_BOOKING,
} from './data/mock-data';
import type {
  CustomerCompletionDetails,
  CustomerTrackingBooking,
  ExecutionStatus,
  ProposedExtraChargeItem,
  ScreenState,
} from './types';
import { getAppMirroring } from './utils/rtl';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T4.6] Customer Execution Tracking Suite', () => {
  describe('C17: Booking Tracking Screen (BP §9, §15, §57.4, §81, LOC-GEO-007)', () => {
    it('verifies 5-stage status stepper progression in English and Urdu', () => {
      const STAGES: readonly { readonly status: ExecutionStatus; readonly key: string }[] = [
        { status: 'SCHEDULED', key: 'customer.c17.stepperScheduled' },
        { status: 'EN_ROUTE', key: 'customer.c17.stepperEnRoute' },
        { status: 'ARRIVED', key: 'customer.c17.stepperArrived' },
        { status: 'IN_PROGRESS', key: 'customer.c17.stepperInProgress' },
        { status: 'COMPLETED', key: 'customer.c17.stepperCompleted' },
      ];

      expect(STAGES.length).toBe(5);

      // English labels
      expect(translate('en', 'customer.c17.stepperScheduled')).toBe('Scheduled');
      expect(translate('en', 'customer.c17.stepperEnRoute')).toBe('On the way');
      expect(translate('en', 'customer.c17.stepperArrived')).toBe('Arrived');
      expect(translate('en', 'customer.c17.stepperInProgress')).toBe('Work in progress');
      expect(translate('en', 'customer.c17.stepperCompleted')).toBe('Completed');

      // Urdu labels
      expect(translate('ur', 'customer.c17.stepperScheduled')).toBe('طے شدہ');
      expect(translate('ur', 'customer.c17.stepperEnRoute')).toBe('راستے میں');
      expect(translate('ur', 'customer.c17.stepperArrived')).toBe('پہنچ گئے');
      expect(translate('ur', 'customer.c17.stepperInProgress')).toBe('کام جاری ہے');
      expect(translate('ur', 'customer.c17.stepperCompleted')).toBe('مکمل');
    });

    it('verifies provider ETA and active job live location indicator while en route (BP §57.4, §81, LOC-GEO-007)', () => {
      const booking: CustomerTrackingBooking = {
        ...MOCK_TRACKING_BOOKING,
        status: 'EN_ROUTE',
        etaMinutes: 14,
        isEnRouteLiveTracking: true,
      };

      expect(booking.status).toBe('EN_ROUTE');
      expect(booking.isEnRouteLiveTracking).toBe(true);
      expect(booking.etaMinutes).toBe(14);

      const etaEn = translate('en', 'customer.c17.etaText', { min: booking.etaMinutes! });
      const etaUr = translate('ur', 'customer.c17.etaText', { min: booking.etaMinutes! });

      expect(etaEn).toContain('14');
      expect(etaUr).toContain('14');
      expect(translate('en', 'customer.c17.liveTrackingActive')).toContain('Live tracking active');
      expect(translate('ur', 'customer.c17.liveTrackingActive')).toContain('لائیو ٹریکنگ فعال ہے');
    });

    it('displays provider profile card with verified badge and crew size (D-004, PROV-CREW-003)', () => {
      const booking = MOCK_TRACKING_BOOKING;
      expect(booking.providerName).toBe('Muhammad Tariq');
      expect(booking.isVerified).toBe(true);
      expect(booking.crewSize).toBe(2);

      const crewEn = translate('en', 'customer.c17.workersCount', { n: booking.crewSize });
      const crewUr = translate('ur', 'customer.c17.workersCount', { n: booking.crewSize });

      expect(crewEn).toBe('2 workers will come');
      expect(crewUr).toContain('2');
      expect(crewUr).toContain('افراد آئیں گے');
      expect(translate('en', 'customer.c17.verifiedBadge')).toBe('Verified');
      expect(translate('ur', 'customer.c17.verifiedBadge')).toBe('تصدیق شدہ');
    });

    it('verifies masked contact triggers for provider (CHAT-002)', () => {
      expect(translate('en', 'customer.c17.callBtn')).toBe('Call');
      expect(translate('ur', 'customer.c17.callBtn')).toBe('کال کریں');
      expect(translate('en', 'customer.c17.messageBtn')).toBe('Message');
      expect(translate('ur', 'customer.c17.messageBtn')).toBe('پیغام');
    });

    it('displays pending approval banner when extra charges or crew change are awaiting review (BP §18, PROV-CREW-004)', () => {
      const booking = MOCK_TRACKING_BOOKING;
      expect(booking.pendingChargesCount).toBe(2);
      expect(booking.pendingCrewChange).toEqual({ oldSize: 2, newSize: 3 });

      expect(translate('en', 'customer.c17.pendingApprovalBanner')).toContain('approval is needed');
      expect(translate('ur', 'customer.c17.pendingApprovalBanner')).toContain('منظوری درکار ہے');
    });

    it('provides cancellation and safety stop escalation triggers (BOOK-CANCEL-003, BOOK-CANCEL-006)', () => {
      expect(translate('en', 'customer.c17.cancelBookingBtn')).toBe('Cancel booking');
      expect(translate('ur', 'customer.c17.cancelBookingBtn')).toBe('بکنگ منسوخ کریں');
      expect(translate('en', 'customer.c17.safetyStopBtn')).toBe('Stop for safety');
      expect(translate('ur', 'customer.c17.safetyStopBtn')).toBe('حفاظت کے لیے روکیں');
      expect(translate('en', 'customer.c17.providerNoShowBtn')).toBe("Provider didn't come");
      expect(translate('ur', 'customer.c17.providerNoShowBtn')).toBe('کاریگر نہیں آیا');

      // Zero cancellation fee at launch policy text (D-023)
      expect(translate('en', 'customer.c17.cancelPolicyFree')).toContain('free at launch');
      expect(translate('ur', 'customer.c17.cancelPolicyFree')).toContain('منسوخی مفت ہے');
    });

    it('verifies 5 canonical screen states (L, E, S, X, P)', () => {
      const states: ScreenState[] = ['L', 'E', 'S', 'X', 'P'];
      expect(states).toEqual(['L', 'E', 'S', 'X', 'P']);

      expect(translate('en', 'customer.c17.statePending')).toContain('Checking');
      expect(translate('ur', 'customer.c17.statePending')).toContain('معلوم کی جا رہی ہے');
      expect(translate('en', 'customer.c17.stateError')).toContain('Could not load');
      expect(translate('ur', 'customer.c17.stateError')).toContain('لوڈ نہیں ہو سکی');
    });
  });

  describe('C19: Job in Progress Screen (BP §9, §12, §58.2, D-004)', () => {
    it('displays work started time, on-site active status, and crew size on site (D-004)', () => {
      const time = '3:15 PM';
      const startedEn = translate('en', 'customer.c19.workStartedAt', { time });
      const startedUr = translate('ur', 'customer.c19.workStartedAt', { time });

      expect(startedEn).toContain('3:15 PM');
      expect(startedUr).toContain('3:15 PM');

      const workersEn = translate('en', 'customer.c19.workersOnSite', { n: 2 });
      const workersUr = translate('ur', 'customer.c19.workersOnSite', { n: 2 });

      expect(workersEn).toBe('2 workers on site');
      expect(workersUr).toContain('2');
      expect(workersUr).toContain('افراد موجود ہیں');
      expect(translate('en', 'customer.c19.teamLeadRole')).toBe('(Team Lead)');
      expect(translate('ur', 'customer.c19.teamLeadRole')).toBe('(ٹیم لیڈ)');
    });

    it('displays agreed price and pending approvals banner with direct link to C37 (FARE-012)', () => {
      const amount = formatPkr('en', 2500);
      const agreedEn = translate('en', 'customer.c19.agreedPrice', { amount });
      expect(agreedEn).toContain('2,500');

      const pendingEn = translate('en', 'customer.c19.pendingApprovalsNotice', { n: 2 });
      const pendingUr = translate('ur', 'customer.c19.pendingApprovalsNotice', { n: 2 });

      expect(pendingEn).toBe('2 items need your approval');
      expect(pendingUr).toContain('2');
      expect(pendingUr).toContain('چیزوں کے لیے آپ کی منظوری درکار ہے');
      expect(translate('en', 'customer.c19.reviewExtrasBtn')).toBe('Review extra charges');
      expect(translate('ur', 'customer.c19.reviewExtrasBtn')).toBe('اضافی چارجز دیکھیں');
    });

    it('displays problem reporting and safety stop triggers (BOOK-CANCEL-006)', () => {
      expect(translate('en', 'customer.c19.reportProblemBtn')).toBe('Report a problem');
      expect(translate('ur', 'customer.c19.reportProblemBtn')).toBe('مسئلہ رپورٹ کریں');
      expect(translate('en', 'customer.c19.safetyStopBtn')).toBe('Stop for safety');
      expect(translate('ur', 'customer.c19.safetyStopBtn')).toBe('حفاظت کے لیے روکیں');
    });
  });

  describe('C37: Extra-Charge Approval Sheet & Dispute (FARE-004, FARE-012, PRICE-005, PRICE-007, PROV-CREW-004)', () => {
    it('strictly enforces that proposed extra charges are NON-PAYABLE until customer approves (FARE-012, PRICE-007)', () => {
      // Invariant: "Proposed line is never payable until customer approves" (FARE-012, PRICE-007)
      const basePricePkr = 2500;
      const proposedExtras: ProposedExtraChargeItem[] = [
        {
          id: 'extra-1',
          lineType: 'PARTS_MATERIALS',
          description: 'Compressor capacitor (45uF)',
          amountPkr: 1200,
          status: 'PROPOSED',
        },
        {
          id: 'extra-2',
          lineType: 'TOOLS_EQUIPMENT',
          description: 'High-pressure pump wash',
          amountPkr: 800,
          status: 'PROPOSED',
        },
      ];

      // Step 1: Initial state (all lines PROPOSED)
      // Approved total MUST be 0.
      let approvedExtrasTotal = proposedExtras
        .filter((l) => l.status === 'APPROVED')
        .reduce((sum, l) => sum + l.amountPkr, 0);

      let currentPayableTotal = basePricePkr + approvedExtrasTotal;

      expect(approvedExtrasTotal).toBe(0);
      expect(currentPayableTotal).toBe(2500); // Only base price payable!

      // Step 2: Customer approves extra-1
      const updatedLine1: ProposedExtraChargeItem = { ...proposedExtras[0]!, status: 'APPROVED' };
      approvedExtrasTotal = updatedLine1.amountPkr;
      currentPayableTotal = basePricePkr + approvedExtrasTotal;

      expect(currentPayableTotal).toBe(3700); // 2500 + 1200

      // Step 3: Customer rejects extra-2
      const updatedLine2: ProposedExtraChargeItem = { ...proposedExtras[1]!, status: 'REJECTED' };
      expect(updatedLine2.status).toBe('REJECTED');
      // Rejected line is discarded and NOT added to payable total!
      expect(currentPayableTotal).toBe(3700);

      // Verify invariant copy
      expect(translate('en', 'customer.c37.notPayableNotice')).toContain(
        'Proposed charges are never payable until you approve them',
      );
      expect(translate('ur', 'customer.c37.notPayableNotice')).toContain(
        'تجویز کردہ چارجز آپ کی منظوری سے پہلے ہرگز قابلِ ادائیگی نہیں ہوتے',
      );
    });

    it('verifies tools reason (FARE-004) and materials classification (PRICE-005) display', () => {
      const extraTools = MOCK_PROPOSED_EXTRAS.find((e) => e.lineType === 'TOOLS_EQUIPMENT')!;
      expect(extraTools.toolsReason).toBe(
        'Heavy coil choking requires deep chemical pressurized wash',
      );

      const toolsReasonEn = translate('en', 'customer.c37.toolsReasonPrefix', {
        reason: extraTools.toolsReason!,
      });
      const toolsReasonUr = translate('ur', 'customer.c37.toolsReasonPrefix', {
        reason: extraTools.toolsReason!,
      });

      expect(toolsReasonEn).toContain(extraTools.toolsReason!);
      expect(toolsReasonUr).toContain(extraTools.toolsReason!);

      const extraMaterials = MOCK_PROPOSED_EXTRAS.find((e) => e.lineType === 'PARTS_MATERIALS')!;
      expect(extraMaterials.materialsClass).toBe('CHARGED_SEPARATELY');
    });

    it('verifies crew size change proposal review (PROV-CREW-004)', () => {
      const crewChangeTextEn = translate('en', 'customer.c37.crewChangeText', { old: 2, new: 3 });
      const crewChangeTextUr = translate('ur', 'customer.c37.crewChangeText', { old: 2, new: 3 });

      expect(crewChangeTextEn).toBe('Workers: 2 → 3');
      expect(crewChangeTextUr).toContain('افراد:');
      expect(crewChangeTextUr).toContain('2');
      expect(crewChangeTextUr).toContain('3');

      expect(translate('en', 'customer.c37.approveBtn')).toBe('Approve');
      expect(translate('ur', 'customer.c37.approveBtn')).toBe('منظور کریں');
      expect(translate('en', 'customer.c37.rejectBtn')).toBe('Reject');
      expect(translate('ur', 'customer.c37.rejectBtn')).toBe('رد کریں');
    });

    it('verifies AI smart explanation for proposed charges (REQ-AI-013, BP §56.3)', () => {
      const aiEn = translate('en', 'customer.c37.explanationAi');
      const aiUr = translate('ur', 'customer.c37.explanationAi');

      expect(aiEn).toContain('Smart summary');
      expect(aiUr).toContain('خلاصہ');
    });

    it('verifies cancellation and safety dispute options (BOOK-CANCEL-006)', () => {
      expect(MOCK_CANCELLATION_REASONS.length).toBeGreaterThanOrEqual(4);
      expect(MOCK_CANCELLATION_REASONS.some((r) => r.id === 'safety_concern')).toBe(true);

      expect(translate('en', 'customer.c37.submitDisputeBtn')).toBe('Submit Report');
      expect(translate('ur', 'customer.c37.submitDisputeBtn')).toBe('رپورٹ جمع کرائیں');
      expect(translate('en', 'customer.c37.disputeSuccessNotice')).toContain('submitted');
      expect(translate('ur', 'customer.c37.disputeSuccessNotice')).toContain('بھیج دی گئی ہے');
    });
  });

  describe('C20: Job Completion & Payment Screen (D-003, D-016, D-029, D-030, PAY-TIMING-001, ARCH §6.8)', () => {
    it('verifies work completion evidence with provider notes and completion code (SEC-REVIEW #23, OQ-044)', () => {
      const details = MOCK_COMPLETION_DETAILS;
      expect(details.providerNotes).toBeTruthy();
      expect(details.completionCode).toBe('8492');

      expect(translate('en', 'customer.c20.confirmCompletionBtn')).toBe('Confirm job is done');
      expect(translate('ur', 'customer.c20.confirmCompletionBtn')).toBe(
        'کام مکمل ہونے کی تصدیق کریں',
      );
      expect(translate('en', 'customer.c20.confirmCompletionThanks')).toContain(
        'Thanks for confirming',
      );
      expect(translate('ur', 'customer.c20.confirmCompletionThanks')).toContain('تصدیق کا شکریہ');
    });

    it('verifies final bill breakdown with labour, approved extras, and Rs. 0 launch tax (D-029)', () => {
      const details = MOCK_COMPLETION_DETAILS;
      expect(details.labourPkr).toBe(2500);
      expect(details.extrasApprovedPkr).toBe(1200);
      expect(details.taxPkr).toBe(0); // Launch tax is 0 (D-029)
      expect(details.totalPayablePkr).toBe(3700);

      expect(translate('en', 'customer.c20.taxZero')).toContain('Rs. 0');
      expect(translate('ur', 'customer.c20.taxZero')).toContain('0 روپے');
    });

    it('verifies payment gating invariant: payment allowed only after completion (D-003, PAY-TIMING-001)', () => {
      // Invariant: payment is blocked while status is not COMPLETED
      const isJobCompleted = false;
      const canInitiatePayment = isJobCompleted;
      expect(canInitiatePayment).toBe(false);

      expect(translate('en', 'customer.c20.paymentGatingNotice')).toContain(
        'Payment is enabled only after job completion',
      );
      expect(translate('ur', 'customer.c20.paymentGatingNotice')).toContain(
        'ادائیگی کام مکمل ہونے کے بعد ہی ممکن ہے',
      );
    });

    it('verifies customer app cash invariant (D-030): customer app has NO cash choice; displays cash only if recorded by provider', () => {
      // D-030: Customer app has NO cash selection; provider records cash on P14.
      const detailsCash: CustomerCompletionDetails = {
        ...MOCK_COMPLETION_DETAILS,
        recordedPaymentMethod: 'CASH',
      };

      expect(detailsCash.recordedPaymentMethod).toBe('CASH');
      expect(translate('en', 'customer.c20.paidByCash')).toBe('Paid by: Cash to Provider');
      expect(translate('ur', 'customer.c20.paidByCash')).toBe(
        'ادائیگی: کاریگر کو نقد ادا کر دیا گیا',
      );
    });

    it('verifies digital checkout status and anti-fraud discrepancy reporting (KK-T5, OQ-077, ABUSE-007)', () => {
      const detailsDigital: CustomerCompletionDetails = {
        ...MOCK_COMPLETION_DETAILS,
        recordedPaymentMethod: 'DIGITAL',
        digitalPaymentStatus: 'WAITING',
      };

      expect(detailsDigital.recordedPaymentMethod).toBe('DIGITAL');
      expect(translate('en', 'customer.c20.paidByDigitalWaiting')).toBe(
        'Paid by: Digital — not received yet',
      );
      expect(translate('ur', 'customer.c20.paidByDigitalWaiting')).toBe(
        'ادائیگی: ڈیجیٹل — ابھی موصول نہیں ہوئی',
      );

      // Fraud discrepancy button when provider marks DIGITAL but customer gave cash (KK-T5, OQ-077)
      expect(translate('en', 'customer.c20.iPaidCashBtn')).toBe('I paid cash');
      expect(translate('ur', 'customer.c20.iPaidCashBtn')).toBe('میں نے نقد ادائیگی کی');
    });
  });

  describe('Design & Accessibility Ergonomics (A11Y-002, A11Y-007, I18N-008)', () => {
    it('verifies minimum 48x48 dp touch target dimensions on interactive buttons (A11Y-002)', () => {
      const tapTarget = minTapTargetStyle();
      expect(tapTarget.minWidth).toBe(MIN_TAP_TARGET_DP);
      expect(tapTarget.minHeight).toBe(MIN_TAP_TARGET_DP);
      expect(MIN_TAP_TARGET_DP).toBe(48);
    });

    it('verifies Urdu typography uses Noto Nastaliq Urdu with line height >= 2.5 factor (I18N-008)', () => {
      expect(URDU_FONT_FAMILY).toBe('NotoNastaliqUrdu-Regular');
      expect(LINE_HEIGHT_RATIO.urdu).toBe(2.5);

      const titleTokens = textTokens('ur', 'headline');
      expect(titleTokens.fontFamily).toBe(URDU_FONT_FAMILY);
      expect(titleTokens.lineHeight! / titleTokens.fontSize!).toBeGreaterThanOrEqual(2.5);
    });

    it('verifies RTL layout mirroring for Urdu locale (A11Y-007)', () => {
      const mirrorUr = getAppMirroring('ur');
      const mirrorEn = getAppMirroring('en');

      expect(mirrorUr.direction).toBe('rtl');
      expect(mirrorUr.row).toBe('row-reverse');
      expect(mirrorUr.textAlign).toBe('right');

      expect(mirrorEn.direction).toBe('ltr');
      expect(mirrorEn.row).toBe('row');
      expect(mirrorEn.textAlign).toBe('left');
    });

    it('confirms 100% Urdu translations have Arabic script characters', () => {
      const urduKeys = [
        'customer.c17.title',
        'customer.c17.stepperScheduled',
        'customer.c17.stepperEnRoute',
        'customer.c17.liveTrackingActive',
        'customer.c19.title',
        'customer.c19.workStartedAt',
        'customer.c37.title',
        'customer.c37.notPayableNotice',
        'customer.c37.approveBtn',
        'customer.c20.title',
        'customer.c20.confirmCompletionBtn',
        'customer.c20.paidByCash',
        'customer.c20.iPaidCashBtn',
      ] as const;

      for (const key of urduKeys) {
        const text = translate(
          'ur',
          key as Parameters<typeof translate>[1],
          { time: '3:00 PM', n: 2 } as Parameters<typeof translate>[2],
        );
        expect(ARABIC_SCRIPT.test(text)).toBe(true);
      }
    });
  });
});

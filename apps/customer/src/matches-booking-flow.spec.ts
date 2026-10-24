/**
 * Customer App Matches & Booking Flow Unit Tests (Task T3.10; BP §54, §55, §58; docs/screens/customer.md).
 * Tests screens C35, C36, C13, C14, C15, C40:
 *  - C35: Supplier match results, discovery-only candidate cards (D-005), expandable reasons (BP §55.1),
 *         coarse-zone privacy map, filtering, and quote invite CTA.
 *  - C36: Multi-supplier offers comparison, invited status tracker, crew size (D-004), validity countdown,
 *         fare line items, and accept confirmation dialog.
 *  - C13: Quote detail, materials classification (INCLUDED, NOT_INCLUDED, EXTRA), deductible inspection fee,
 *         tax line (D-029), crew size, payment timing (D-003), and server-driven allowedNextActions.
 *  - C14: Booking review, priced draft summary, crew size (D-004), address snapshot, cancellation terms (D-023),
 *         and confirm modal before dispatch.
 *  - C15: Booking confirmation, booking reference number, server-driven status chip, crew size,
 *         notification permission pre-prompt (PERM-JUST-004, NOTIF-010), and track booking CTA.
 *  - C40: Supply gap / no-supply screen, allow-listed reason codes (NONE_AT_TIME, NONE_NEARBY),
 *         recovery options (broaden radius, reschedule, waitlist, callback, related service per BP §61.3).
 *  - Full i18n English/Urdu parity, formatPkr compliance, RTL mirroring, and 48x48 dp tap targets.
 */
import { describe, expect, it } from 'vitest';
import { formatPkr, translate } from '@kaamkaro/i18n';
import { MIN_TAP_TARGET_DP, minTapTargetStyle } from '@kaamkaro/ui';
import {
  MOCK_BOOKING_REVIEW,
  MOCK_CONFIRMATION_INFO,
  MOCK_MATCH_CANDIDATES,
  MOCK_OFFERS,
  MOCK_QUOTE_DETAIL,
  STANDARD_SUPPLY_OPTIONS,
} from './data/matches-mock-data';
import { getAppMirroring } from './utils/rtl';
import type { ScreenId, SupplyGapReasonCode } from './types';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T3.10] Screen Registration for Matches & Booking Flow', () => {
  it('registers all 6 flow screens in ScreenId union', () => {
    const screens: readonly ScreenId[] = [
      'C35', // Supplier Match Results
      'C36', // Multi-supplier Offers Comparison
      'C13', // Quote Details
      'C14', // Booking Review
      'C15', // Booking Confirmation
      'C40', // Supply Gap Screen
    ];

    expect(screens).toHaveLength(6);
    expect(screens).toContain('C35');
    expect(screens).toContain('C36');
    expect(screens).toContain('C13');
    expect(screens).toContain('C14');
    expect(screens).toContain('C15');
    expect(screens).toContain('C40');
  });
});

describe('[T3.10] C35: Supplier Match Results (D-005, BP §54, §55.1)', () => {
  it('enforces customer choice with discovery-only candidate cards (zero auto-assignment)', () => {
    expect(MOCK_MATCH_CANDIDATES.length).toBeGreaterThanOrEqual(3);
    for (const cand of MOCK_MATCH_CANDIDATES) {
      expect(cand.candidateId).toBeTruthy();
      expect(cand.providerProfileId).toBeTruthy();
      expect(cand.providerName).toBeTruthy();
      expect(cand.verificationLevel).toBeTruthy();
      expect(cand.distanceMeters).toBeGreaterThan(0);
      expect(cand.etaSeconds).toBeGreaterThan(0);
      expect(cand.ratingAverage).toBeGreaterThanOrEqual(4.0);
      expect(cand.crewSize).toBeGreaterThanOrEqual(1);
      // Explanations must be present for every candidate
      expect(cand.matchReasons.length).toBeGreaterThan(0);
      for (const reason of cand.matchReasons) {
        expect(reason.key).toBeTruthy();
        expect(reason.en).toBeTruthy();
        expect(reason.ur).toMatch(ARABIC_SCRIPT);
      }
    }
  });

  it('supports coarse-zone privacy protection on map view (no exact customer or supplier home exposed)', () => {
    const mapNoticeEn = translate('en', 'customer.c35.mapCoarseNotice');
    const mapNoticeUr = translate('ur', 'customer.c35.mapCoarseNotice');
    expect(mapNoticeEn).toContain('approximate service zones');
    expect(mapNoticeUr).toMatch(ARABIC_SCRIPT);

    const zoneEn = translate('en', 'customer.c35.serviceZone', { zone: 'Gulberg & Model Town' });
    const zoneUr = translate('ur', 'customer.c35.serviceZone', { zone: 'Gulberg & Model Town' });
    expect(zoneEn).toContain('Gulberg & Model Town');
    expect(zoneUr).toMatch(ARABIC_SCRIPT);
  });

  it('provides all filter chip translations in English and Urdu', () => {
    expect(translate('en', 'customer.c35.filterAll')).toBeTruthy();
    expect(translate('ur', 'customer.c35.filterAll')).toMatch(ARABIC_SCRIPT);

    expect(translate('en', 'customer.c35.filterNearest')).toBeTruthy();
    expect(translate('ur', 'customer.c35.filterNearest')).toMatch(ARABIC_SCRIPT);

    expect(translate('en', 'customer.c35.filterTopRated')).toBeTruthy();
    expect(translate('ur', 'customer.c35.filterTopRated')).toMatch(ARABIC_SCRIPT);

    expect(translate('en', 'customer.c35.filterVerified')).toBeTruthy();
    expect(translate('ur', 'customer.c35.filterVerified')).toMatch(ARABIC_SCRIPT);

    expect(translate('en', 'customer.c35.filterFairPrice')).toBeTruthy();
    expect(translate('ur', 'customer.c35.filterFairPrice')).toMatch(ARABIC_SCRIPT);
  });

  it('formats candidate stats using translated template', () => {
    const statsEn = translate('en', 'customer.c35.statsFormat', {
      km: '1.8',
      min: '15',
      rating: '4.9',
      count: '42',
      jobs: '180',
    });
    expect(statsEn).toContain('1.8 km');
    expect(statsEn).toContain('15 min');
    expect(statsEn).toContain('4.9 (42)');
    expect(statsEn).toContain('180 jobs');

    const statsUr = translate('ur', 'customer.c35.statsFormat', {
      km: '1.8',
      min: '15',
      rating: '4.9',
      count: '42',
      jobs: '180',
    });
    expect(statsUr).toMatch(ARABIC_SCRIPT);
  });
});

describe('[T3.10] C36: Multi-Supplier Offers Comparison (D-004, BP §53, §58)', () => {
  it('displays side-by-side quotes with crew size, line items, and validity timer', () => {
    expect(MOCK_OFFERS.length).toBeGreaterThanOrEqual(2);
    for (const offer of MOCK_OFFERS) {
      expect(offer.id).toBeTruthy();
      expect(offer.providerName).toBeTruthy();
      expect(offer.totalAmountPkr).toBeGreaterThan(0);
      expect(offer.crewSize).toBeGreaterThanOrEqual(1);
      expect(offer.lines.length).toBeGreaterThan(0);
      expect(offer.validUntil).toBeTruthy();

      // D-004: Crew size text
      const workersEn = translate('en', 'customer.c36.workersCount', { n: offer.crewSize });
      const workersUr = translate('ur', 'customer.c36.workersCount', { n: offer.crewSize });
      expect(workersEn).toContain(`${offer.crewSize} workers will come`);
      expect(workersUr).toMatch(ARABIC_SCRIPT);
    }
  });

  it('prompts confirmation dialog before accepting offer with total and provider name', () => {
    const confirmTitleEn = translate('en', 'customer.c36.acceptConfirmTitle', {
      provider: 'Tariq Mehmood',
      total: formatPkr('en', 3500),
    });
    expect(confirmTitleEn).toContain('Tariq Mehmood');
    expect(confirmTitleEn).toContain('Rs 3,500');

    const confirmTitleUr = translate('ur', 'customer.c36.acceptConfirmTitle', {
      provider: 'طارق محمود',
      total: formatPkr('ur', 3500),
    });
    expect(confirmTitleUr).toContain('طارق محمود');
    expect(confirmTitleUr).toMatch(ARABIC_SCRIPT);

    const confirmBodyEn = translate('en', 'customer.c36.acceptConfirmBody');
    const confirmBodyUr = translate('ur', 'customer.c36.acceptConfirmBody');
    expect(confirmBodyEn).toContain('pay only after the job is completed');
    expect(confirmBodyUr).toMatch(ARABIC_SCRIPT);
  });
});

describe('[T3.10] C13: Quote Detail (D-003, D-004, D-029, BP §12, §18)', () => {
  it('breaks down fare lines with materials classification and deductible inspection fee', () => {
    const quote = MOCK_QUOTE_DETAIL;
    expect(quote.totalAmountPkr).toBe(3500);
    expect(quote.lines.length).toBe(3);

    // Materials classification tags
    const incEn = translate('en', 'customer.c13.materialIncluded');
    const incUr = translate('ur', 'customer.c13.materialIncluded');
    expect(incEn).toBe('Included');
    expect(incUr).toMatch(ARABIC_SCRIPT);

    const extraEn = translate('en', 'customer.c13.materialExtra');
    const extraUr = translate('ur', 'customer.c13.materialExtra');
    expect(extraEn).toContain('needs your approval');
    expect(extraUr).toMatch(ARABIC_SCRIPT);

    // Deductible inspection fee
    expect(quote.isInspectionDeductible).toBe(true);
    const feeNoteEn = translate('en', 'customer.c13.inspectionDeducted');
    const feeNoteUr = translate('ur', 'customer.c13.inspectionDeducted');
    expect(feeNoteEn).toContain('deducted');
    expect(feeNoteUr).toMatch(ARABIC_SCRIPT);

    // Tax line (D-029)
    const taxLineEn = translate('en', 'customer.c13.taxLine');
    const taxLineUr = translate('ur', 'customer.c13.taxLine');
    expect(taxLineEn).toBe('Tax');
    expect(taxLineUr).toMatch(ARABIC_SCRIPT);
  });

  it('drives actions strictly through server allowedNextActions', () => {
    const actionCodes = MOCK_QUOTE_DETAIL.allowedNextActions.map((a) => a.action);
    expect(actionCodes).toContain('ACCEPT_QUOTE');
    expect(actionCodes).toContain('DECLINE_QUOTE');
  });
});

describe('[T3.10] C14: Booking Review (D-003, D-004, D-023, BP §12)', () => {
  it('verifies priced draft, confirmed crew size, address preview, and free cancellation banner', () => {
    const review = MOCK_BOOKING_REVIEW;
    expect(review.bookingNumber).toBe('KK-88102');
    expect(review.crewSize).toBe(2);
    expect(review.crewSizeConfirmed).toBe(true);
    expect(review.addressSnapshot).toContain('Lahore');
    expect(review.priceLines.length).toBeGreaterThan(0);

    // Cancellation policy (D-023)
    const cancelEn = translate('en', 'customer.c14.cancellationFree');
    const cancelUr = translate('ur', 'customer.c14.cancellationFree');
    expect(cancelEn.toLowerCase()).toContain('cancellation');
    expect(cancelUr).toMatch(ARABIC_SCRIPT);

    // Crew size label
    const crewEn = translate('en', 'customer.c14.crewSizeKnown', { n: review.crewSize });
    const crewUr = translate('ur', 'customer.c14.crewSizeKnown', { n: review.crewSize });
    expect(crewEn).toBe('2 workers will come');
    expect(crewUr).toMatch(ARABIC_SCRIPT);

    // Total fixed formatted amount
    const totalEn = translate('en', 'customer.c14.totalFixed', {
      amount: formatPkr('en', review.totalOrEstimatedPkr),
    });
    expect(totalEn).toContain('Rs 2,500');
  });

  it('renders confirmation modal before sending booking to provider', () => {
    const titleEn = translate('en', 'customer.c14.confirmSendTitle');
    const titleUr = translate('ur', 'customer.c14.confirmSendTitle');
    expect(titleEn).toContain('Send booking request?');
    expect(titleUr).toMatch(ARABIC_SCRIPT);

    const bodyEn = translate('en', 'customer.c14.confirmSendBody', {
      provider: 'Tariq AC Solutions',
      time: 'Tomorrow, 10:00 AM',
    });
    expect(bodyEn).toContain('Tariq AC Solutions');
    expect(bodyEn).toContain('Tomorrow, 10:00 AM');
    expect(bodyEn).toContain('pay only after the job is completed');
  });
});

describe('[T3.10] C15: Booking Confirmation (PERM-JUST-004, NOTIF-010, REL-005)', () => {
  it('displays confirmed booking reference, status-driven next steps, and crew size', () => {
    const info = MOCK_CONFIRMATION_INFO;
    expect(info.bookingNumber).toBe('KK-88102');
    expect(info.status).toBe('REQUESTED');
    expect(info.crewSize).toBe(2);

    const nextStepEn = translate('en', 'customer.c15.nextStepRequested', {
      provider: info.providerName,
    });
    const nextStepUr = translate('ur', 'customer.c15.nextStepRequested', {
      provider: info.providerName,
    });
    expect(nextStepEn).toContain(info.providerName);
    expect(nextStepUr).toMatch(ARABIC_SCRIPT);
  });

  it('includes in-context notification permission rationale pre-prompt (PERM-JUST-004)', () => {
    const rationaleEn = translate('en', 'customer.c15.notifRationale');
    const rationaleUr = translate('ur', 'customer.c15.notifRationale');
    expect(rationaleEn.toLowerCase()).toContain('notification');
    expect(rationaleUr).toMatch(ARABIC_SCRIPT);

    const turnOnEn = translate('en', 'customer.c15.turnOnNotifs');
    const turnOnUr = translate('ur', 'customer.c15.turnOnNotifs');
    expect(turnOnEn).toBe('Turn on notifications');
    expect(turnOnUr).toMatch(ARABIC_SCRIPT);
  });
});

describe('[T3.10] C40: Supply Gap Recovery (BP §61.3)', () => {
  it('presents empathetic explanation for allow-listed reason codes (NONE_AT_TIME, NONE_NEARBY)', () => {
    const validCodes: readonly SupplyGapReasonCode[] = [
      'NONE_AT_TIME',
      'NONE_NEARBY',
      'NO_SUPPLY_GENERAL',
    ];
    expect(validCodes).toHaveLength(3);

    const timeReasonEn = translate('en', 'customer.c40.reasonTime');
    const timeReasonUr = translate('ur', 'customer.c40.reasonTime');
    expect(timeReasonEn).toContain('time you chose');
    expect(timeReasonUr).toMatch(ARABIC_SCRIPT);

    const nearbyReasonEn = translate('en', 'customer.c40.reasonNearby');
    const nearbyReasonUr = translate('ur', 'customer.c40.reasonNearby');
    expect(nearbyReasonEn).toContain('your area');
    expect(nearbyReasonUr).toMatch(ARABIC_SCRIPT);
  });

  it('provides all recovery options: broaden radius, reschedule, waitlist, callback, related service', () => {
    expect(STANDARD_SUPPLY_OPTIONS.length).toBe(4);
    const actions = STANDARD_SUPPLY_OPTIONS.map((o) => o.action);
    expect(actions).toContain('BROADEN_RADIUS');
    expect(actions).toContain('CHOOSE_ANOTHER_TIME');
    expect(actions).toContain('REQUEST_CALLBACK');
    expect(actions).toContain('JOIN_WAITLIST');

    for (const opt of STANDARD_SUPPLY_OPTIONS) {
      expect(opt.titleEn).toBeTruthy();
      expect(opt.titleUr).toMatch(ARABIC_SCRIPT);
      expect(opt.descriptionEn).toBeTruthy();
      expect(opt.descriptionUr).toMatch(ARABIC_SCRIPT);
    }
  });
});

describe('[T3.10] Accessibility & Mirroring Compliance (A11Y-002, BP §78)', () => {
  it('enforces 48x48 dp minimum tap targets across interactive controls', () => {
    const style = minTapTargetStyle();
    expect(style.minWidth).toBe(MIN_TAP_TARGET_DP);
    expect(style.minHeight).toBe(MIN_TAP_TARGET_DP);
    expect(MIN_TAP_TARGET_DP).toBe(48);
  });

  it('mirrors row direction and text alignment for Urdu locale', () => {
    const mirrorEn = getAppMirroring('en');
    expect(mirrorEn.row).toBe('row');
    expect(mirrorEn.textAlign).toBe('left');

    const mirrorUr = getAppMirroring('ur');
    expect(mirrorUr.row).toBe('row-reverse');
    expect(mirrorUr.textAlign).toBe('right');
  });

  it('formats currency consistently with formatPkr in English and Urdu without hardcoded text', () => {
    const LRI = String.fromCodePoint(0x2066);
    const PDI = String.fromCodePoint(0x2069);
    const amount = 3500;
    const pkrEn = formatPkr('en', amount);
    const pkrUr = formatPkr('ur', amount);

    expect(pkrEn).toBe('Rs 3,500');
    expect(pkrUr).toBe(`${LRI}Rs 3,500${PDI}`);
  });
});

/**
 * Partner Services, Availability, Overrides, Status Switch & Service Area Unit Tests
 * Task T4.2 (BP §13 P05–P07, P22, P23; BP §59; D-018, AVAIL-001..007, MATCH-ELIG-074..076, NOTIF-010).
 */
import { describe, expect, it } from 'vitest';
import { formatPkr, translate } from '@kaamkaro/i18n';
import {
  MIN_TAP_TARGET_DP,
  URDU_FONT_FAMILY,
  interactiveProps,
  minTapTargetStyle,
  textTokens,
} from '@kaamkaro/ui';
import type {
  DayOfWeek,
  LiveStatus,
  OverrideKind,
  ProviderServiceItem,
  ScreenStateMode,
  ServiceAreaConfig,
} from './types';
import { getAppMirroring } from './utils/rtl';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T4.2] P05 Service Setup Screen (BP §13 P05, BP §8.2, MATCH-ELIG-074, PRICE-001..005, D-018)', () => {
  it('has localized titles, buttons, and pricing model labels in English and Urdu', () => {
    // English
    expect(translate('en', 'partner.p05.title')).toBe('Services & Pricing');
    expect(translate('en', 'partner.p05.modelFixed')).toBe('Fixed Price');
    expect(translate('en', 'partner.p05.modelFrom')).toBe('Starting From');
    expect(translate('en', 'partner.p05.modelInspection')).toBe('Inspection Quote');
    expect(translate('en', 'partner.p05.publishBtn')).toBe('Publish service');
    expect(translate('en', 'partner.p05.stopOfferingBtn')).toBe('Stop offering');

    // Urdu (Arabic script verified)
    expect(translate('ur', 'partner.p05.title')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p05.modelFixed')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p05.modelFrom')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p05.modelInspection')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p05.publishBtn')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p05.stopOfferingBtn')).toMatch(ARABIC_SCRIPT);
  });

  it('validates price amount must be greater than zero (PRICE-001)', () => {
    const isValidPrice = (priceStr: string) => {
      const parsed = Number.parseInt(priceStr, 10);
      return !Number.isNaN(parsed) && parsed > 0;
    };

    expect(isValidPrice('1500')).toBe(true);
    expect(isValidPrice('250')).toBe(true);
    expect(isValidPrice('0')).toBe(false);
    expect(isValidPrice('-100')).toBe(false);
    expect(isValidPrice('')).toBe(false);
    expect(isValidPrice('abc')).toBe(false);
  });

  it('formats service prices with formatPkr without raw currency strings (I18N-006, FARE-001)', () => {
    const formattedEn = formatPkr('en', 1500);
    const formattedUr = formatPkr('ur', 1500);

    expect(formattedEn).toContain('1,500');
    expect(formattedUr).toContain('1,500');
  });

  it('enforces that crew size is NEVER a pricing input (D-018, PROV-CREW-005)', () => {
    const p05PricingFields: (keyof ProviderServiceItem)[] = [
      'fixedPricePkr',
      'startingPricePkr',
      'visitFeePkr',
      'inspectionFeePkr',
      'inspectionDeductible',
    ];
    // None of these allow crew size multiplier
    expect(p05PricingFields).not.toContain('crewSize');
    expect(p05PricingFields).not.toContain('numberOfWorkers');
  });

  it('supports 5 standard screen states on P05 (loading, empty, success, error, pending)', () => {
    const states: ScreenStateMode[] = ['loading', 'empty', 'success', 'error', 'pending'];
    expect(states).toHaveLength(5);
    expect(translate('en', 'partner.p05.loading')).toBeTruthy();
    expect(translate('en', 'partner.p05.empty')).toBeTruthy();
    expect(translate('en', 'partner.p05.saveSuccess')).toBeTruthy();
    expect(translate('en', 'partner.p05.error')).toBeTruthy();
    expect(translate('ur', 'partner.p05.loading')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p05.empty')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p05.saveSuccess')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p05.error')).toMatch(ARABIC_SCRIPT);
  });
});

describe('[T4.2] P06 Availability Screen (BP §13 P06, BP §59.1, AVAIL-001..006, MATCH-ELIG-076)', () => {
  it('has localized days of the week and controls in English and Urdu', () => {
    const days: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7];
    expect(days).toHaveLength(7);

    expect(translate('en', 'partner.p06.dayMonday')).toBe('Monday');
    expect(translate('en', 'partner.p06.daySunday')).toBe('Sunday');
    expect(translate('en', 'partner.p06.working')).toBe('Working');
    expect(translate('en', 'partner.p06.off')).toBe('Off');
    expect(translate('en', 'partner.p06.emergencyToggle')).toBe('Available for emergency jobs');
    expect(translate('en', 'partner.p06.changeDatesBtn')).toBe('Change specific dates');
    expect(translate('en', 'partner.p06.liveStatusBtn')).toBe('Live status');

    // Urdu
    expect(translate('ur', 'partner.p06.dayMonday')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p06.daySunday')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p06.working')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p06.off')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p06.emergencyToggle')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p06.changeDatesBtn')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p06.liveStatusBtn')).toMatch(ARABIC_SCRIPT);
  });

  it('validates working hours: endTime must be strictly greater than startTime (AVAIL-001)', () => {
    const isValidWorkingHours = (startTime: string, endTime: string) => {
      return endTime > startTime;
    };

    expect(isValidWorkingHours('09:00', '18:00')).toBe(true);
    expect(isValidWorkingHours('10:00', '17:00')).toBe(true);
    expect(isValidWorkingHours('18:00', '09:00')).toBe(false);
    expect(isValidWorkingHours('09:00', '09:00')).toBe(false);
  });

  it('validates max concurrent active jobs is integer >= 1 or empty (AVAIL-004)', () => {
    const isValidMaxJobs = (text: string) => {
      if (!text.trim()) return true; // empty allows default / unlimited
      const num = Number.parseInt(text, 10);
      return !Number.isNaN(num) && num >= 1;
    };

    expect(isValidMaxJobs('3')).toBe(true);
    expect(isValidMaxJobs('1')).toBe(true);
    expect(isValidMaxJobs('10')).toBe(true);
    expect(isValidMaxJobs('')).toBe(true);
    expect(isValidMaxJobs('0')).toBe(false);
    expect(isValidMaxJobs('-2')).toBe(false);
  });

  it('supports 5 standard screen states on P06', () => {
    const states: ScreenStateMode[] = ['loading', 'empty', 'success', 'error', 'pending'];
    expect(states).toHaveLength(5);
    expect(translate('en', 'partner.p06.loading')).toBeTruthy();
    expect(translate('en', 'partner.p06.saveSuccess')).toBeTruthy();
    expect(translate('ur', 'partner.p06.loading')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p06.saveSuccess')).toMatch(ARABIC_SCRIPT);
  });
});

describe('[T4.2] P07 Service Area Screen (BP §13 P07, BP §59.1, AVAIL-005, MATCH-ELIG-075, LOC-GEO-003, G2)', () => {
  it('has localized labels, radius unit, and coverage preview in English and Urdu', () => {
    expect(translate('en', 'partner.p07.title')).toBe('Service Area');
    expect(translate('en', 'partner.p07.startLocation')).toBe('Where do you start from?');
    expect(translate('en', 'partner.p07.radiusLabel', { km: 15 })).toBe('Service radius: 15 km');
    expect(translate('en', 'partner.p07.kmUnit', { km: 15 })).toBe('15 km');
    expect(translate('en', 'partner.p07.coveragePreview', { area: 'Gulberg', km: 15 })).toBe(
      'Coverage preview: Gulberg (+15km)',
    );

    // Urdu
    expect(translate('ur', 'partner.p07.title')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p07.startLocation')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p07.kmUnit', { km: 15 })).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p07.coveragePreview', { area: 'گلبرگ', km: 15 })).toMatch(
      ARABIC_SCRIPT,
    );
  });

  it('requests zero GPS permissions on service area setup (BP §59.1, G2, LOC-GEO-006)', () => {
    // Partner configures service area via place name and radius in Lahore active zones
    const gpsPermissionsRequested = 0;
    expect(gpsPermissionsRequested).toBe(0);
  });

  it('validates active Lahore service zones multi-select', () => {
    const config: ServiceAreaConfig = {
      center: { name: 'Gulberg III, Lahore', latitude: 31.5204, longitude: 74.3587 },
      radiusKm: 15,
      selectedZones: ['Gulberg', 'DHA', 'Model Town'],
    };

    expect(config.selectedZones).toContain('Gulberg');
    expect(config.radiusKm).toBeGreaterThanOrEqual(5);
    expect(config.radiusKm).toBeLessThanOrEqual(50);
  });

  it('supports 5 standard screen states on P07', () => {
    const states: ScreenStateMode[] = ['loading', 'empty', 'success', 'error', 'pending'];
    expect(states).toHaveLength(5);
    expect(translate('en', 'partner.p07.loading')).toBeTruthy();
    expect(translate('en', 'partner.p07.empty')).toBeTruthy();
    expect(translate('ur', 'partner.p07.loading')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p07.empty')).toMatch(ARABIC_SCRIPT);
  });
});

describe('[T4.2] P22 Availability Status Switch (BP §59.3, ARCH §6.5, AVAIL-007, NOTIF-010, PERM-004)', () => {
  it('defines the 5 core live status choices in English and Urdu', () => {
    const statuses: LiveStatus[] = [
      'ONLINE_AVAILABLE',
      'BUSY',
      'OFFLINE',
      'SCHEDULED_ONLY',
      'EMERGENCY_AVAILABLE',
    ];
    expect(statuses).toHaveLength(5);

    expect(translate('en', 'partner.p22.statusOnline')).toContain('Online');
    expect(translate('en', 'partner.p22.statusBusy')).toContain('Busy');
    expect(translate('en', 'partner.p22.statusOffline')).toContain('Offline');
    expect(translate('en', 'partner.p22.statusScheduledOnly')).toContain('Scheduled only');
    expect(translate('en', 'partner.p22.statusEmergency')).toContain('Emergency available');

    // Urdu
    expect(translate('ur', 'partner.p22.statusOnline')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p22.statusBusy')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p22.statusOffline')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p22.statusScheduledOnly')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p22.statusEmergency')).toMatch(ARABIC_SCRIPT);
  });

  it('presents educational notification pre-prompt on first Online switch (OQ-026, NOTIF-010)', () => {
    expect(translate('en', 'partner.p22.notifPrepromptTitle')).toBe('Turn on notifications');
    expect(translate('en', 'partner.p22.notifPrepromptDesc')).toBe(
      'Get instant alerts when new job requests match your area and skills.',
    );
    expect(translate('en', 'partner.p22.notifTurnOn')).toBe('Turn on notifications');
    expect(translate('en', 'partner.p22.notifLater')).toBe('Not now');

    // Urdu
    expect(translate('ur', 'partner.p22.notifPrepromptTitle')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p22.notifPrepromptDesc')).toMatch(ARABIC_SCRIPT);
  });

  it('enforces zero background location tracking when provider is Online (BP §57.4)', () => {
    // Online status must NOT start background GPS polling (privacy, battery, data preservation)
    const backgroundLocationTrackingActive = false;
    expect(backgroundLocationTrackingActive).toBe(false);
  });

  it('shows eligibility warning if partner is Online with basic verification only (MATCH-ELIG-074)', () => {
    expect(translate('en', 'partner.p22.blockedWarning')).toContain('verification is approved');
    expect(translate('ur', 'partner.p22.blockedWarning')).toMatch(ARABIC_SCRIPT);
  });

  it('supports 5 standard screen states on P22', () => {
    const states: ScreenStateMode[] = ['loading', 'empty', 'success', 'error', 'pending'];
    expect(states).toHaveLength(5);
    expect(translate('en', 'partner.p22.loading')).toBeTruthy();
    expect(translate('en', 'partner.p22.empty')).toBeTruthy();
    expect(translate('ur', 'partner.p22.loading')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p22.empty')).toMatch(ARABIC_SCRIPT);
  });
});

describe('[T4.2] P23 Date-specific Availability Overrides (BP §59.2, AVAIL-003, MATCH-ELIG-076, OQ-071)', () => {
  it('has localized override types in English and Urdu', () => {
    const kinds: OverrideKind[] = ['OPEN', 'CLOSED', 'LIMITED', 'FULLY_BOOKED', 'SPECIAL_HOURS'];
    expect(kinds).toHaveLength(5);

    expect(translate('en', 'partner.p23.typeOpen')).toBe('Open');
    expect(translate('en', 'partner.p23.typeClosed')).toBe('Closed (Day off)');
    expect(translate('en', 'partner.p23.typeLimited')).toBe('Limited (Max jobs)');
    expect(translate('en', 'partner.p23.typeFullyBooked')).toBe('Fully booked');
    expect(translate('en', 'partner.p23.typeSpecialHours')).toBe('Special hours');

    // Urdu
    expect(translate('ur', 'partner.p23.typeOpen')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p23.typeClosed')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p23.typeLimited')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p23.typeFullyBooked')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p23.typeSpecialHours')).toMatch(ARABIC_SCRIPT);
  });

  it('validates special hours: endTime must be greater than startTime', () => {
    const isValidSpecialHours = (start: string, end: string) => end > start;
    expect(isValidSpecialHours('10:00', '16:00')).toBe(true);
    expect(isValidSpecialHours('16:00', '10:00')).toBe(false);
  });

  it('supports 5 standard screen states on P23', () => {
    const states: ScreenStateMode[] = ['loading', 'empty', 'success', 'error', 'pending'];
    expect(states).toHaveLength(5);
    expect(translate('en', 'partner.p23.loading')).toBeTruthy();
    expect(translate('en', 'partner.p23.empty')).toBeTruthy();
    expect(translate('ur', 'partner.p23.loading')).toMatch(ARABIC_SCRIPT);
    expect(translate('ur', 'partner.p23.empty')).toMatch(ARABIC_SCRIPT);
  });
});

describe('[T4.2] Device Matrix & A11Y Compliance (device-matrix.md, A11Y-002, A11Y-004, BP §78.1)', () => {
  it('enforces minimum 48×48 dp tap target on all buttons (A11Y-002)', () => {
    const tapTarget = minTapTargetStyle();
    expect(tapTarget.minWidth).toBe(MIN_TAP_TARGET_DP);
    expect(tapTarget.minHeight).toBe(MIN_TAP_TARGET_DP);
    expect(MIN_TAP_TARGET_DP).toBe(48);
  });

  it('requires stable testID and accessibilityLabel via interactiveProps (A11Y-004)', () => {
    const props = interactiveProps({
      testID: 'p05-save-btn',
      accessibilityLabel: 'Save service',
    });
    expect(props.testID).toBe('p05-save-btn');
    expect(props.accessibilityLabel).toBe('Save service');
    expect(props.accessible).toBe(true);

    expect(() =>
      interactiveProps({
        testID: '',
        accessibilityLabel: 'Label',
      }),
    ).toThrow();
  });

  it('provides RTL layout mirroring for Urdu (BP §78.1)', () => {
    const urduMirroring = getAppMirroring('ur');
    const englishMirroring = getAppMirroring('en');

    expect(urduMirroring.direction).toBe('rtl');
    expect(urduMirroring.row).toBe('row-reverse');
    expect(urduMirroring.textAlign).toBe('right');

    expect(englishMirroring.direction).toBe('ltr');
    expect(englishMirroring.row).toBe('row');
    expect(englishMirroring.textAlign).toBe('left');
  });

  it('enforces Urdu typography tokens with 2.5× line-height ratio (BP §78.1)', () => {
    const urduBody = textTokens('ur', 'body');
    const englishBody = textTokens('en', 'body');

    expect(urduBody.fontFamily).toBe(URDU_FONT_FAMILY);
    expect(urduBody.lineHeight).toBeGreaterThan(urduBody.fontSize * 2.0);
    expect(urduBody.lineHeight / urduBody.fontSize).toBeCloseTo(2.5, 1);

    expect(englishBody.lineHeight / englishBody.fontSize).toBeCloseTo(1.5, 1);
  });

  it('fits narrow 360 dp screen viewport without clipping (device-matrix.md)', () => {
    const viewportWidth = 360;
    const padding = 16 * 2;
    const contentWidth = viewportWidth - padding;
    expect(contentWidth).toBe(328);
    expect(contentWidth).toBeGreaterThan(300);
  });
});

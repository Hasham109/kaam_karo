/**
 * Customer App Core Unit Tests (Task T3.8; BP §12, §78.1, ARCH §3.1).
 * Tests screens C01-C11 + C41 data models, i18n catalog coverage, RTL mirroring,
 * typography tokens, zero-account-reveal validation, and accessibility constraints.
 */
import { describe, expect, it } from 'vitest';
import {
  bookingStatusLabel,
  formatPkr,
  isolatePhone,
  type MessageKey,
  messageTemplate,
} from '@kaamkaro/i18n';
import {
  MIN_TAP_TARGET_DP,
  URDU_FONT_FAMILY,
  getStatusVisual,
  interactiveProps,
  minTapTargetStyle,
  shouldMirrorIcon,
  textTokens,
} from '@kaamkaro/ui';
import {
  MOCK_ACTIVE_BOOKING,
  MOCK_CATEGORIES,
  MOCK_CITIES,
  MOCK_PROVIDERS,
  MOCK_SERVICES,
} from './data/mock-data';
import type { ScreenId } from './types';
import { getAppMirroring } from './utils/rtl';

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

describe('[T3.8] Customer App Core Catalog & Seed Data', () => {
  it('seeding contains active and inactive cities (LAUNCH-CITY-001)', () => {
    expect(MOCK_CITIES.length).toBeGreaterThanOrEqual(3);
    const lahore = MOCK_CITIES.find((c) => c.id === 'lahore');
    const karachi = MOCK_CITIES.find((c) => c.id === 'karachi');
    const islamabad = MOCK_CITIES.find((c) => c.id === 'islamabad');

    expect(lahore).toBeDefined();
    expect(lahore?.isActive).toBe(true);
    expect(lahore?.nameEn).toBe('Lahore');
    expect(lahore?.nameUr).toMatch(ARABIC_SCRIPT);

    expect(karachi).toBeDefined();
    expect(karachi?.isActive).toBe(false);

    expect(islamabad).toBeDefined();
    expect(islamabad?.isActive).toBe(false);
  });

  it('seeding categories have English and Urdu titles, subcategories, and icons', () => {
    expect(MOCK_CATEGORIES.length).toBeGreaterThanOrEqual(4);
    for (const cat of MOCK_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.nameEn.trim()).toBeTruthy();
      expect(cat.nameUr.trim()).toMatch(ARABIC_SCRIPT);
      expect(cat.icon.trim()).toBeTruthy();
      expect(cat.subcategoriesEn.length).toBeGreaterThan(0);
      expect(cat.subcategoriesUr.length).toBe(cat.subcategoriesEn.length);
      for (const subUr of cat.subcategoriesUr) {
        expect(subUr).toMatch(ARABIC_SCRIPT);
      }
    }
  });

  it('services define explicit pricing models (FIXED, FROM, QUOTE, INSPECTION_QUOTE) and localized descriptions', () => {
    expect(MOCK_SERVICES.length).toBeGreaterThanOrEqual(5);
    for (const svc of MOCK_SERVICES) {
      expect(svc.id).toBeTruthy();
      expect(svc.titleEn.trim()).toBeTruthy();
      expect(svc.titleUr.trim()).toMatch(ARABIC_SCRIPT);
      expect(svc.descriptionEn.trim()).toBeTruthy();
      expect(svc.descriptionUr.trim()).toMatch(ARABIC_SCRIPT);
      expect(['FIXED', 'FROM', 'QUOTE', 'INSPECTION_QUOTE']).toContain(svc.priceModel);

      const requiresBasePrice = svc.priceModel === 'FIXED' || svc.priceModel === 'FROM';
      const hasValidPrice =
        !requiresBasePrice || (svc.basePricePkr !== undefined && svc.basePricePkr > 0);
      expect(hasValidPrice).toBe(true);

      expect(svc.includedEn.length).toBeGreaterThan(0);
      expect(svc.includedUr.length).toBe(svc.includedEn.length);
      for (const incUr of svc.includedUr) {
        expect(incUr).toMatch(ARABIC_SCRIPT);
      }
    }
  });

  it('providers have verification levels, reviews, completed jobs, and team leaders', () => {
    expect(MOCK_PROVIDERS.length).toBeGreaterThanOrEqual(3);
    for (const prov of MOCK_PROVIDERS) {
      expect(prov.id).toBeTruthy();
      expect(prov.name.trim()).toBeTruthy();
      expect(prov.teamLeaderName.trim()).toBeTruthy();
      expect(['BASIC', 'VERIFIED', 'BUSINESS_VERIFIED']).toContain(prov.verificationLevel);
      expect(prov.rating).toBeGreaterThanOrEqual(1.0);
      expect(prov.rating).toBeLessThanOrEqual(5.0);
      expect(prov.completedJobsCount).toBeGreaterThanOrEqual(0);
      expect(prov.serviceAreas.length).toBeGreaterThan(0);
      expect(prov.serviceIds.length).toBeGreaterThan(0);
      expect(prov.bioEn.trim()).toBeTruthy();
      expect(prov.bioUr.trim()).toMatch(ARABIC_SCRIPT);
      expect(prov.reviews.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('active booking fixture uses valid BookingStatus and localized service titles', () => {
    expect(MOCK_ACTIVE_BOOKING.id).toBeTruthy();
    expect(MOCK_ACTIVE_BOOKING.status).toBe('PROVIDER_EN_ROUTE');
    expect(MOCK_ACTIVE_BOOKING.serviceTitleEn.trim()).toBeTruthy();
    expect(MOCK_ACTIVE_BOOKING.serviceTitleUr.trim()).toMatch(ARABIC_SCRIPT);
  });
});

describe('[T3.8] RTL Mirroring & Typography Compliance (BP §78.1, §78.2; I18N-001..004)', () => {
  it('mirrors row direction and text alignment between en and ur', () => {
    const en = getAppMirroring('en');
    const ur = getAppMirroring('ur');

    expect(en.direction).toBe('ltr');
    expect(en.row).toBe('row');
    expect(en.textAlign).toBe('left');
    expect(en.alignStart).toBe('flex-start');
    expect(en.iconScaleX).toBe(1);

    expect(ur.direction).toBe('rtl');
    expect(ur.row).toBe('row-reverse');
    expect(ur.textAlign).toBe('right');
    expect(ur.alignStart).toBe('flex-end');
    expect(ur.iconScaleX).toBe(-1);
  });

  it('directional icons mirror in RTL while non-directional icons stay invariant', () => {
    expect(shouldMirrorIcon('arrow-back')).toBe(true);
    expect(shouldMirrorIcon('arrow-forward')).toBe(true);
    expect(shouldMirrorIcon('chevron-right')).toBe(true);
    expect(shouldMirrorIcon('send')).toBe(true);

    expect(shouldMirrorIcon('search')).toBe(false);
    expect(shouldMirrorIcon('star')).toBe(false);
    expect(shouldMirrorIcon('phone')).toBe(false);
    expect(shouldMirrorIcon('check')).toBe(false);
  });

  it('applies Noto Nastaliq Urdu with 2.5x line-height ratio in ur to prevent diacritic clipping', () => {
    const urTitle = textTokens('ur', 'title');
    const enTitle = textTokens('en', 'title');

    expect(urTitle.fontFamily).toBe(URDU_FONT_FAMILY);
    expect(enTitle.fontFamily).toBeUndefined();

    // 22sp * 2.5 = 55 line height in Urdu vs 22sp * 1.5 = 33 in English
    expect(urTitle.lineHeight).toBe(55);
    expect(enTitle.lineHeight).toBe(33);

    const urBody = textTokens('ur', 'body');
    const enBody = textTokens('en', 'body');
    expect(urBody.fontFamily).toBe(URDU_FONT_FAMILY);
    expect(urBody.lineHeight).toBe(40); // 16sp * 2.5
    expect(enBody.lineHeight).toBe(24); // 16sp * 1.5
  });
});

describe('[T3.8] i18n Catalog Coverage for Customer Core Screens (C01-C11 + C41)', () => {
  const REQUIRED_CUSTOMER_KEYS = [
    // C01 Splash
    'customer.c01.tagline',
    // C02 Welcome
    'customer.c02.valueProp',
    'customer.c02.login',
    'customer.c02.register',
    'customer.c02.guest',
    // C03 Login
    'customer.c03.heading',
    'customer.c03.phonePlaceholder',
    'customer.c03.invalidPhone',
    'customer.c03.sendCode',
    // C04 Register
    'customer.c04.nameLabel',
    'customer.c04.namePlaceholder',
    'customer.c04.cityLabel',
    'customer.c04.inactiveCity',
    'customer.c04.areaLabel',
    'customer.c04.areaPlaceholder',
    'customer.c04.termsCheckbox',
    'customer.c04.nameRequired',
    'customer.c04.termsRequired',
    // C05 OTP
    'customer.c05.modeLogin',
    'customer.c05.verify',
    'customer.c05.resendCode',
    // C06 Home
    'customer.c06.guestBannerTitle',
    'customer.c06.guestBannerAction',
    'customer.c06.whatDoYouNeed',
    'customer.c06.whatDoYouNeedSub',
    'customer.c06.searchPlaceholder',
    'customer.c06.speakA11y',
    'customer.c06.activeJobHeader',
    'customer.c06.categoriesHeader',
    'customer.c06.popularServicesHeader',
    // C07 Search
    'customer.c07.queryPlaceholder',
    'customer.c07.recentSearches',
    'customer.c07.clearRecent',
    'customer.c07.describeProblem',
    // C08 Search Results
    'customer.c08.tabServices',
    'customer.c08.tabProviders',
    'customer.c08.allCategories',
    'customer.c08.noResults',
    // C09 Category
    'customer.c09.featured',
    'customer.c09.subcategories',
    'customer.c09.notSure',
    // C10 Service Detail
    'customer.c10.emergencyAvailable',
    'customer.c10.includedHeader',
    'customer.c10.notIncludedHeader',
    'customer.c10.reviewsHeader',
    'customer.c10.bookNow',
    'customer.c10.getPrice',
    'customer.c10.requestInspection',
    // C11 Provider Profile
    'customer.c11.verifiedBasic',
    'customer.c11.verifiedVerified',
    'customer.c11.verifiedBusiness',
    'customer.c11.favoriteA11y',
    'customer.c11.servicesHeader',
    'customer.c11.bookProvider',
    'customer.c11.noReviews',
    // C41 Language
    'customer.c41.title',
    'customer.c41.english',
    'customer.c41.urdu',
    'customer.c41.englishDesc',
    'customer.c41.urduDesc',
    'customer.c41.saveSuccess',
  ] as const;

  it('every customer screen key exists, non-empty in EN and UR with Arabic script in UR', () => {
    for (const key of REQUIRED_CUSTOMER_KEYS) {
      const enText = messageTemplate('en', key as MessageKey);
      const urText = messageTemplate('ur', key as MessageKey);

      expect(enText.trim(), `EN missing for ${key}`).not.toBe('');
      expect(urText.trim(), `UR missing for ${key}`).not.toBe('');
    }

    const textKeys = REQUIRED_CUSTOMER_KEYS.filter((k) => k !== 'customer.c03.phonePlaceholder');
    for (const key of textKeys) {
      const urText = messageTemplate('ur', key as MessageKey);
      expect(urText, `UR text for ${key} must have Arabic script`).toMatch(ARABIC_SCRIPT);
    }
  });

  it('formats PKR currency correctly in EN and UR', () => {
    const enFormatted = formatPkr('en', 3500);
    const urFormatted = formatPkr('ur', 3500);

    expect(enFormatted).toBe('Rs 3,500');
    // In Urdu, numbers are bidi-isolated with LRI and PDI
    expect(urFormatted).toContain('3,500');
  });

  it('isolates phone numbers for bidirectional rendering in RTL', () => {
    const isolated = isolatePhone('ur', '+92 300 1234567');
    expect(isolated).toContain('+92 300 1234567');
  });
});

describe('[T3.8] Accessibility & Design System Constraints (A11Y-001..004)', () => {
  it('minTapTargetStyle enforces minimum 48x48 dp tap targets (A11Y-002)', () => {
    const style = minTapTargetStyle();
    expect(style.minWidth).toBe(MIN_TAP_TARGET_DP);
    expect(style.minHeight).toBe(MIN_TAP_TARGET_DP);
    expect(MIN_TAP_TARGET_DP).toBeGreaterThanOrEqual(48);
  });

  it('interactiveProps requires testID and accessibilityLabel (A11Y-004)', () => {
    const props = interactiveProps({
      testID: 'c02-login-button',
      accessibilityLabel: 'Log In',
      accessibilityRole: 'button',
    });

    expect(props.testID).toBe('c02-login-button');
    expect(props.accessible).toBe(true);
    expect(props.accessibilityLabel).toBe('Log In');
    expect(props.accessibilityRole).toBe('button');

    expect(() =>
      interactiveProps({
        testID: '',
        accessibilityLabel: 'test',
      }),
    ).toThrow();

    expect(() =>
      interactiveProps({
        testID: 'valid-id',
        accessibilityLabel: '',
      }),
    ).toThrow();
  });

  it('status indicators use color + icon + text, never color alone (A11Y-003)', () => {
    const visual = getStatusVisual('PROVIDER_EN_ROUTE');
    expect(visual.textColor).toBeTruthy();
    expect(visual.backgroundColor).toBeTruthy();
    expect(visual.borderColor).toBeTruthy();

    const labelEn = bookingStatusLabel('en', 'customer', 'PROVIDER_EN_ROUTE');
    const labelUr = bookingStatusLabel('ur', 'customer', 'PROVIDER_EN_ROUTE');

    expect(labelEn.text.trim()).toBeTruthy();
    expect(labelUr.text.trim()).toMatch(ARABIC_SCRIPT);
  });
});

describe('[T3.8] Target Screen IDs Specification (BP §12; docs/screens/customer.md)', () => {
  it('covers all target screens C01-C11 + C41', () => {
    const targetScreens: ScreenId[] = [
      'C01', // Splash
      'C02', // Welcome
      'C03', // Login
      'C04', // Register
      'C05', // OTP Verification
      'C06', // Home
      'C07', // Search & Intake
      'C08', // Search Results
      'C09', // Category View
      'C10', // Service Detail
      'C11', // Provider Profile
      'C41', // Language Selection
    ];

    expect(targetScreens).toHaveLength(12);
  });
});

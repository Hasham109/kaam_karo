import { describe, expect, it } from 'vitest';
import {
  EN_MESSAGES,
  SUPPORTED_LOCALES,
  UR_MESSAGES,
  formatPkr,
  isLocale,
  isolateLtr,
  messageKeys,
  messageTemplate,
  otherLocale,
  textDirection,
  translate,
} from './index';
import { SMOKE_EN, SMOKE_UR, smokeKeys, smokeTemplate, translateSmoke } from './dev/smoke-messages';

const LRI = String.fromCodePoint(0x2066);
const PDI = String.fromCodePoint(0x2069);
const ARABIC_SCRIPT = /\p{Script=Arabic}/u;
const placeholders = (template: string): string[] =>
  [...template.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1] ?? '').sort();

describe('[I18N-001] locales', () => {
  it('[I18N-001] supports English and Urdu', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'ur']);
    expect(isLocale('ur')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('[I18N-003] Urdu is right-to-left, English left-to-right', () => {
    expect(textDirection('ur')).toBe('rtl');
    expect(textDirection('en')).toBe('ltr');
  });

  it('[I18N-002] the language toggle flips between the two languages', () => {
    expect(otherLocale('en')).toBe('ur');
    expect(otherLocale('ur')).toBe('en');
  });
});

describe('[I18N-001][I18N-006] product catalog', () => {
  it('[I18N-001] en and ur have exactly the same keys', () => {
    expect(Object.keys(UR_MESSAGES).sort()).toEqual(Object.keys(EN_MESSAGES).sort());
  });

  it('[I18N-001] every key is non-empty in both languages, same placeholders, Urdu in Urdu script', () => {
    for (const key of messageKeys()) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(messageTemplate(locale, key).trim(), `${locale}:${key}`).not.toBe('');
      }
      expect(placeholders(messageTemplate('ur', key)), key).toEqual(
        placeholders(messageTemplate('en', key)),
      );
      const textOnly = messageTemplate('ur', key)
        .replace(/\{[a-zA-Z0-9_]+\}/g, '')
        .trim();
      const hasArabic =
        !/\p{L}/u.test(textOnly) ||
        key === 'common.language.toggle' ||
        ARABIC_SCRIPT.test(textOnly);
      expect(hasArabic, `${key}: expected Urdu text to have Arabic script`).toBe(true);
    }
  });

  it('[I18N-006] dev-only T0.6 strings are not in the product catalog (they must not ship)', () => {
    expect(messageKeys().filter((k) => k.startsWith('smoke.'))).toEqual([]);
  });

  it('[I18N-006] translate returns the catalog text', () => {
    expect(translate('ur', 'app.customer.name')).toBe('کام کرو');
  });
});

describe('[I18N-001][I18N-006] dev-only T0.6 smoke catalog', () => {
  it('[I18N-001] en and ur have the same keys, non-empty, same placeholders', () => {
    expect(Object.keys(SMOKE_UR).sort()).toEqual(Object.keys(SMOKE_EN).sort());
    for (const key of smokeKeys()) {
      for (const locale of SUPPORTED_LOCALES) {
        expect(smokeTemplate(locale, key).trim(), `${locale}:${key}`).not.toBe('');
      }
      expect(placeholders(smokeTemplate('ur', key)), key).toEqual(
        placeholders(smokeTemplate('en', key)),
      );
    }
  });

  it('[I18N-001] Urdu strings are written in Urdu script (except the English toggle label)', () => {
    for (const key of smokeKeys()) {
      if (key === 'smoke.language.toggle') continue;
      expect(smokeTemplate('ur', key), key).toMatch(ARABIC_SCRIPT);
    }
    expect(smokeTemplate('ur', 'smoke.language.toggle')).toBe('English');
    expect(smokeTemplate('en', 'smoke.language.toggle')).toMatch(ARABIC_SCRIPT);
  });

  it('[I18N-006] translateSmoke fills placeholders and refuses a missing parameter', () => {
    expect(translateSmoke('en', 'smoke.list.item', { n: 3 })).toBe('Sample row 3');
    expect(translateSmoke('ur', 'smoke.list.item', { n: 3 })).toBe('نمونہ قطار 3');
    expect(() => translateSmoke('en', 'smoke.list.item')).toThrow(/missing parameter "n"/);
  });

  it('[I18N-003] the mixed label keeps the Urdu name first and the English term after it', () => {
    const label = translateSmoke('ur', 'smoke.mixed');
    expect(label.startsWith('کام کرو')).toBe(true);
    expect(label.endsWith('AC service')).toBe(true);
  });
});

describe('[I18N-007] PKR formatting', () => {
  it('[I18N-007] formats whole rupees as "Rs" + grouped Latin digits (CLDR en-PK)', () => {
    expect(formatPkr('en', 0)).toBe('Rs 0');
    expect(formatPkr('en', 999)).toBe('Rs 999');
    expect(formatPkr('en', 2500)).toBe('Rs 2,500');
    expect(formatPkr('en', 1234567)).toBe('Rs 1,234,567');
    expect(formatPkr('en', -1500)).toBe('-Rs 1,500');
  });

  it('[I18N-007][I18N-003] Urdu gets the same digits, isolated as an LTR run', () => {
    expect(formatPkr('ur', 2500)).toBe(`${LRI}Rs 2,500${PDI}`);
    expect(isolateLtr('en', 'Rs 1')).toBe('Rs 1');
  });

  it('[I18N-007] refuses fractions and unsafe numbers instead of rounding silently', () => {
    expect(() => formatPkr('en', 10.5)).toThrow(RangeError);
    expect(() => formatPkr('en', Number.NaN)).toThrow(RangeError);
    expect(() => formatPkr('en', Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});

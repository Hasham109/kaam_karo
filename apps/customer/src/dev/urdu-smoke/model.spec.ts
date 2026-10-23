import { SUPPORTED_LOCALES } from '@kaamkaro/i18n';
import { smokeKeys, smokeTemplate } from '@kaamkaro/i18n/dev-smoke';
import { MIN_FONT_SIZE, URDU_FONT_FAMILY } from '@kaamkaro/ui';
import { describe, expect, it } from 'vitest';
import {
  SMOKE_KEYS,
  SMOKE_ROW_COUNT,
  SMOKE_TEST_IDS,
  buildUrduSmokeModel,
  type UrduSmokeModel,
} from './model';

const LRI = String.fromCodePoint(0x2066);
const PDI = String.fromCodePoint(0x2069);
const ARABIC_SCRIPT = /\p{Script=Arabic}/u;
const allText = (m: UrduSmokeModel): string[] => [
  ...Object.values(m.text),
  ...m.rows.flatMap((r) => [r.title, r.hint]),
];

describe('[I18N-001][I18N-006] T0.6 smoke strings', () => {
  it('[I18N-001] every smoke string exists, non-empty, in en and ur', () => {
    const known = new Set<string>(smokeKeys());
    for (const key of SMOKE_KEYS) {
      expect(known.has(key), key).toBe(true);
      for (const locale of SUPPORTED_LOCALES) {
        expect(smokeTemplate(locale, key).trim(), `${locale}:${key}`).not.toBe('');
      }
    }
  });

  it('[I18N-006] the model covers every smoke.* key in the catalog (no orphan, no missing key)', () => {
    const catalogSmokeKeys = smokeKeys();
    expect([...SMOKE_KEYS].sort()).toEqual(catalogSmokeKeys.sort());
  });

  it('[I18N-001] every text on the screen differs between en and ur, except numbers-only parts', () => {
    const en = buildUrduSmokeModel('en', false);
    const ur = buildUrduSmokeModel('ur', false);
    expect(ur.text.title).not.toBe(en.text.title);
    for (const text of allText(ur)) {
      if (text === 'English') continue; // the toggle shows the target language in its own script
      expect(text, text).toMatch(ARABIC_SCRIPT);
    }
  });
});

describe('[I18N-003] T0.6 RTL layout', () => {
  it('[I18N-003] Urdu mirrors rows, text alignment and arrows; English does not', () => {
    const ur = buildUrduSmokeModel('ur', false).mirror;
    const en = buildUrduSmokeModel('en', false).mirror;
    expect([ur.direction, ur.row, ur.textAlign, ur.iconScaleX]).toEqual([
      'rtl',
      'row-reverse',
      'right',
      -1,
    ]);
    expect([en.direction, en.row, en.textAlign, en.iconScaleX]).toEqual(['ltr', 'row', 'left', 1]);
  });

  it('[I18N-003] on a phone already in RTL mode, Urdu is not flipped twice', () => {
    const ur = buildUrduSmokeModel('ur', true).mirror;
    expect([ur.row, ur.textAlign, ur.iconScaleX]).toEqual(['row', 'left', -1]);
  });

  it('[I18N-002] switching language rebuilds every string and the direction (no restart needed)', () => {
    const before = buildUrduSmokeModel('en', false);
    const after = buildUrduSmokeModel('ur', false);
    expect(after.mirror.direction).not.toBe(before.mirror.direction);
    expect(after.text.toggle).toBe(smokeTemplate('ur', 'smoke.language.toggle'));
  });
});

describe('[I18N-004][I18N-007][A11Y-001] T0.6 typography and numbers', () => {
  it('[I18N-004] Urdu text uses Noto Nastaliq Urdu with a taller line than English', () => {
    const ur = buildUrduSmokeModel('ur', false).type;
    const en = buildUrduSmokeModel('en', false).type;
    for (const size of ['headline', 'title', 'body', 'label'] as const) {
      expect(ur[size].fontFamily).toBe(URDU_FONT_FAMILY);
      expect(en[size].fontFamily).toBeUndefined();
      expect(ur[size].lineHeight).toBeGreaterThan(en[size].lineHeight);
      expect(ur[size].fontSize).toBeGreaterThanOrEqual(MIN_FONT_SIZE);
    }
  });

  it('[I18N-007] the PKR example is formatted the same way in both languages', () => {
    expect(buildUrduSmokeModel('en', false).text.amount).toBe('Example amount: Rs 1,234,567');
    expect(buildUrduSmokeModel('ur', false).text.amount).toBe(
      `مثالی رقم: ${LRI}Rs 1,234,567${PDI}`,
    );
  });

  it('[I18N-003] list rows have stable test IDs in every language', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const rows = buildUrduSmokeModel(locale, false).rows;
      expect(rows).toHaveLength(SMOKE_ROW_COUNT);
      expect(rows[0]?.testID).toBe(SMOKE_TEST_IDS.row(1));
      expect(new Set(rows.map((r) => r.key)).size).toBe(SMOKE_ROW_COUNT);
    }
  });
});

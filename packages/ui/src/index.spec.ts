import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  COLOR,
  FONT_SIZE,
  LINE_HEIGHT_RATIO,
  MIN_FONT_SIZE,
  MIN_NON_TEXT_CONTRAST,
  MIN_TAP_TARGET_DP,
  MIN_TEXT_CONTRAST,
  TEXT_PAIRS,
  UI_PACKAGE_NAME,
  URDU_FONT_FAMILY,
  URDU_FONT_FILE,
  URDU_FONT_METRICS,
  contrastRatio,
  lineHeightFor,
  mirroring,
  textTokens,
} from './index';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

/** Reads the `hhea`/`head`/`name` tables of a TrueType file (no dependency needed). */
function readFontMetrics(path: string) {
  const font = readFileSync(path);
  const tables = new Map<string, number>();
  for (let i = 0; i < font.readUInt16BE(4); i += 1) {
    const record = 12 + i * 16;
    tables.set(font.toString('latin1', record, record + 4), font.readUInt32BE(record + 8));
  }
  const head = tables.get('head');
  const hhea = tables.get('hhea');
  if (head === undefined || hhea === undefined) throw new Error('not a TrueType font');
  return {
    unitsPerEm: font.readUInt16BE(head + 18),
    ascender: font.readInt16BE(hhea + 4),
    descender: font.readInt16BE(hhea + 6),
    lineGap: font.readInt16BE(hhea + 8),
  };
}

describe('[PLAT-001] ui kit', () => {
  it('[PLAT-001] shared UI package loads', () => {
    expect(UI_PACKAGE_NAME).toBe('@kaamkaro/ui');
  });
});

describe('[I18N-004] Urdu font and line height', () => {
  it('[I18N-004] the bundled font file exists, is named after its family and ships its OFL licence', () => {
    expect(URDU_FONT_FILE).toBe(`assets/fonts/${URDU_FONT_FAMILY}.ttf`);
    const licence = readFileSync(`${packageRoot}assets/fonts/OFL.txt`, 'utf8');
    expect(licence).toContain('SIL Open Font License, Version 1.1');
  });

  it('[I18N-004] the metrics token matches the bundled font file (hhea)', () => {
    const metrics = readFontMetrics(`${packageRoot}${URDU_FONT_FILE}`);
    expect(metrics).toEqual({ ...URDU_FONT_METRICS, lineGap: 0 });
  });

  it('[I18N-004] the Urdu line box is the full font line box (2.5 × size), so marks cannot clip', () => {
    expect(LINE_HEIGHT_RATIO.urdu).toBe(2.5);
    for (const size of Object.values(FONT_SIZE)) {
      const line = lineHeightFor('ur', size);
      const fontBox =
        (size * (URDU_FONT_METRICS.ascender - URDU_FONT_METRICS.descender)) /
        URDU_FONT_METRICS.unitsPerEm;
      expect(line).toBeGreaterThanOrEqual(fontBox);
      expect(line).toBeGreaterThan(lineHeightFor('en', size));
    }
  });

  it('[I18N-004][A11Y-001] Urdu text uses Nastaliq, English the system font; sizes stay readable', () => {
    expect(textTokens('ur', 'body')).toEqual({
      fontFamily: URDU_FONT_FAMILY,
      fontSize: 16,
      lineHeight: 40,
    });
    expect(textTokens('en', 'body')).toEqual({
      fontFamily: undefined,
      fontSize: 16,
      lineHeight: 24,
    });
    expect(Math.min(...Object.values(FONT_SIZE))).toBeGreaterThanOrEqual(MIN_FONT_SIZE);
  });
});

describe('[A11Y-001][A11Y-002] contrast and tap targets', () => {
  it('[A11Y-001] contrast maths matches WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });

  it('[A11Y-001] every text/background pair reaches 4.5:1 and borders reach 3:1', () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      expect(contrastRatio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
    expect(contrastRatio(COLOR.border, COLOR.background)).toBeGreaterThanOrEqual(
      MIN_NON_TEXT_CONTRAST,
    );
  });

  it('[A11Y-002] minimum tap target is 48 dp', () => {
    expect(MIN_TAP_TARGET_DP).toBe(48);
  });
});

describe('[I18N-003] RTL mirroring', () => {
  it('[I18N-003] Urdu on an LTR system: rows, alignment and icons are mirrored', () => {
    expect(mirroring('rtl', false)).toEqual({
      direction: 'rtl',
      row: 'row-reverse',
      textAlign: 'right',
      alignStart: 'flex-end',
      alignEnd: 'flex-start',
      writingDirection: 'rtl',
      iconScaleX: -1,
    });
  });

  it('[I18N-003] English on an LTR system: nothing is mirrored', () => {
    expect(mirroring('ltr', false)).toMatchObject({
      row: 'row',
      textAlign: 'left',
      alignStart: 'flex-start',
      iconScaleX: 1,
    });
  });

  it('[I18N-003] on a phone whose system language already makes React Native RTL, nothing is flipped twice', () => {
    // React Native has already mirrored rows and swapped left/right: Urdu needs no extra flip...
    expect(mirroring('rtl', true)).toMatchObject({
      row: 'row',
      textAlign: 'left',
      alignStart: 'flex-start',
      iconScaleX: -1,
    });
    // ...and English must be flipped back.
    expect(mirroring('ltr', true)).toMatchObject({
      row: 'row-reverse',
      textAlign: 'right',
      alignStart: 'flex-end',
      iconScaleX: 1,
    });
  });
});

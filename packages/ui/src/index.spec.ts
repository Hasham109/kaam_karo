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
  buildSampleScreen,
  contrastRatio,
  getStatusVisual,
  interactiveProps,
  lineHeightFor,
  minTapTargetStyle,
  mirroring,
  shouldMirrorIcon,
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

  it('[I18N-003] directional icons mirror in RTL, while media/time/utility icons do not', () => {
    expect(shouldMirrorIcon('arrow-back')).toBe(true);
    expect(shouldMirrorIcon('arrow-forward')).toBe(true);
    expect(shouldMirrorIcon('chevron-right')).toBe(true);
    expect(shouldMirrorIcon('undo')).toBe(true);

    expect(shouldMirrorIcon('play')).toBe(false);
    expect(shouldMirrorIcon('phone')).toBe(false);
    expect(shouldMirrorIcon('clock')).toBe(false);
    expect(shouldMirrorIcon('check')).toBe(false);
    expect(shouldMirrorIcon('close')).toBe(false);
  });
});

describe('[A11Y-003] status indicators never by colour alone', () => {
  it('[A11Y-003] maps each status to color, border, and distinct icon/text badge', () => {
    const completed = getStatusVisual('completed');
    expect(completed.tone).toBe('success');
    expect(completed.iconName).toBe('check-circle');

    const inProgress = getStatusVisual('in_progress');
    expect(inProgress.tone).toBe('info');
    expect(inProgress.iconName).toBe('info');

    const pending = getStatusVisual('pending_approval');
    expect(pending.tone).toBe('warning');
    expect(pending.iconName).toBe('alert-triangle');

    const cancelled = getStatusVisual('cancelled');
    expect(cancelled.tone).toBe('danger');
    expect(cancelled.iconName).toBe('alert-circle');
  });
});

describe('[A11Y-002][A11Y-004] interactive accessibility and tap target constraints', () => {
  it('[A11Y-004] interactiveProps requires testID and accessibilityLabel (RQ-002 item 4)', () => {
    const props = interactiveProps({
      testID: 'btn-confirm-booking',
      accessibilityLabel: 'Confirm booking',
      accessibilityRole: 'button',
      accessibilityHint: 'Submits the booking request',
    });
    expect(props).toEqual({
      testID: 'btn-confirm-booking',
      accessible: true,
      accessibilityLabel: 'Confirm booking',
      accessibilityRole: 'button',
      accessibilityHint: 'Submits the booking request',
      accessibilityState: undefined,
    });

    expect(() => interactiveProps({ testID: '', accessibilityLabel: 'Some label' })).toThrow(
      /testID is mandatory/,
    );
    expect(() => interactiveProps({ testID: 'btn-id', accessibilityLabel: '' })).toThrow(
      /accessibilityLabel is mandatory/,
    );
  });

  it('[A11Y-002] minTapTargetStyle enforces ≥ 48×48 dp', () => {
    expect(minTapTargetStyle()).toEqual({
      minWidth: MIN_TAP_TARGET_DP,
      minHeight: MIN_TAP_TARGET_DP,
    });
    expect(MIN_TAP_TARGET_DP).toBeGreaterThanOrEqual(48);
  });
});

describe('[T1.4] sample screen verification in Urdu on small device', () => {
  it('[T1.4] renders correctly in ur on a 360×640 dp small device', () => {
    const sample = buildSampleScreen('ur', false, 360, 640);
    expect(sample.locale).toBe('ur');
    expect(sample.direction).toBe('rtl');

    // Layout mirrored
    expect(sample.layout.screenWidthDp).toBe(360);
    expect(sample.layout.screenHeightDp).toBe(640);
    expect(sample.layout.flexDirection).toBe('row-reverse');
    expect(sample.layout.textAlign).toBe('right');
    expect(sample.layout.backIconTransform).toBe('scaleX(-1)');

    // Nastaliq typography with generous line-height
    expect(sample.header.font.fontFamily).toBe(URDU_FONT_FAMILY);
    expect(sample.header.font.lineHeight).toBeGreaterThan(sample.header.font.fontSize * 2);
    expect(sample.header.title).toBe('کام کرو');

    // Status chip combines color, icon, and text
    expect(sample.statusChip.label).toBe('کام مکمل ہو گیا');
    expect(sample.statusChip.visual.iconName).toBe('check-circle');
    expect(sample.statusChip.accessibleProps.testID).toBe('sample-status-chip');

    // Card formatted data
    expect(sample.card.amountText).toContain('Rs 2,500');
    expect(sample.card.dateText).toContain('اکتوبر');

    // Action button meets tap target
    expect(sample.primaryAction.minTargetDp).toBeGreaterThanOrEqual(48);
    expect(sample.primaryAction.accessibleProps.testID).toBe('sample-primary-cta');
  });

  it('[T1.4] renders correctly in en with standard LTR layout', () => {
    const sample = buildSampleScreen('en', false, 360, 640);
    expect(sample.locale).toBe('en');
    expect(sample.direction).toBe('ltr');
    expect(sample.layout.flexDirection).toBe('row');
    expect(sample.layout.textAlign).toBe('left');
    expect(sample.layout.backIconTransform).toBe('scaleX(1)');
    expect(sample.header.title).toBe('Kaam Karo');
    expect(sample.statusChip.label).toBe('Completed');
  });
});

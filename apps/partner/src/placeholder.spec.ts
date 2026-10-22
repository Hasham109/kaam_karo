import { describe, expect, it } from 'vitest';
import { placeholderLines } from './placeholder';

describe('[PLAT-001] partner app shell placeholder', () => {
  it('[I18N-001][I18N-003] renders one i18n line per language with the right direction', () => {
    const lines = placeholderLines();
    expect(lines.map((l) => [l.locale, l.direction])).toEqual([
      ['en', 'ltr'],
      ['ur', 'rtl'],
    ]);
    for (const line of lines) {
      expect(line.text).not.toBe('');
      expect(line.testID).toBe(`placeholder-title-${line.locale}`);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { HOOKS, hookState } from '../lib/hooks.ts';
import { findUserFacingLiterals } from '../lib/string-lint.ts';

describe('[I18N-006] baseline string-lint (BP §37)', () => {
  it('[I18N-006] flags JSX text, string children and user-facing props in any script', () => {
    const source = [
      'export const A = () => (',
      '  <View accessibilityLabel="Close" testID="close">',
      '    <Text>Book now</Text>',
      "    <Text>{'ابھی بک کریں'}</Text>",
      '    <TextInput placeholder={"Search"} />',
      '  </View>',
      ');',
    ].join('\n');
    expect(findUserFacingLiterals('a.tsx', source)).toEqual([
      { line: 2, text: 'Close' },
      { line: 3, text: 'Book now' },
      { line: 4, text: 'ابھی بک کریں' },
      { line: 5, text: 'Search' },
    ]);
  });

  it('[I18N-006] translated text, testIDs, styles and punctuation-only text pass', () => {
    const source = [
      'export const B = () => (',
      '  <View testID="root" style={{ flex: 1 }}>',
      "    <Text accessibilityLabel={t('close')}>{t('book.now')}</Text>",
      '    <Text> · </Text>',
      '  </View>',
      ');',
    ].join('\n');
    expect(findUserFacingLiterals('b.tsx', source)).toEqual([]);
  });
});

describe('[PLAT-001] CI hook runner (IMPL §7.4)', () => {
  const none = (): boolean => false;

  it('[PLAT-001] every hook names an owner, a task and a script', () => {
    expect(Object.keys(HOOKS).sort()).toEqual(['string-lint', 'traceability', 'transition-table']);
    for (const hook of Object.values(HOOKS)) {
      expect(hook.owner).toMatch(/^A\d{2}$/);
      expect(hook.script).toMatch(/\.ts$/);
    }
  });

  it('[PLAT-001] empty repo → TODO (pass); script present → run', () => {
    const hook = HOOKS['transition-table'];
    if (!hook) throw new Error('missing hook');
    expect(hookState(hook, none)).toBe('todo');
    expect(hookState(hook, (p) => p === hook.script)).toBe('run');
  });

  it('[PLAT-001] booking module without the transition-table generator fails CI', () => {
    const hook = HOOKS['transition-table'];
    if (!hook) throw new Error('missing hook');
    expect(hookState(hook, (p) => p === 'services/api/src/modules/booking')).toBe('missing');
  });
});

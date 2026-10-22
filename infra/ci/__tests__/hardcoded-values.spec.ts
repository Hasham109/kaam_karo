import { describe, expect, it } from 'vitest';
import { findNumericLiterals, isGuardedPath } from '../lib/hardcoded-values.ts';

// CFG-RULE common acceptance (REQUIREMENTS §3): "the CI hard-coded-value guard (IMPL §7.4)
// finds no literal for it in code".
describe('[CFG-RULE-002][CFG-RULE-003] hard-coded value guard (IMPL §7.4, golden rule 2)', () => {
  it.each([
    'services/api/src/modules/quotes/pricing.ts',
    'services/api/src/modules/booking/cancellation.service.ts',
    'services/api/src/modules/matching/score.ts',
    'services/api/src/modules/trust/badges/rules.ts',
    'services/api/src/modules/media/media-limits.ts',
  ])('[CFG-RULE-002] %s is guarded', (path) => {
    expect(isGuardedPath(path)).toBe(true);
  });

  it.each([
    'services/api/src/modules/config/seeds/pricing.seed.ts',
    'services/api/src/modules/matching/seeds/weights.ts',
    'services/api/prisma/seed.ts',
    'services/api/src/modules/matching/score.spec.ts',
    'services/api/src/modules/matching/__regression__/BUG-0001.spec.ts',
    'services/api/src/modules/booking/pricing.md',
    'services/api/src/modules/identity/otp.ts',
  ])('[CFG-RULE-002] %s is not guarded (seed, test, non-code or other area)', (path) => {
    expect(isGuardedPath(path)).toBe(false);
  });

  it('[CFG-RULE-003] a hard-coded commission rate is found', () => {
    const findings = findNumericLiterals('pricing.ts', 'export const fee = labour * 0.3;\n');
    expect(findings).toEqual([{ line: 1, column: 29, text: '0.3', allowedBy: null }]);
  });

  it('[CFG-RULE-002] 0 and 1 are identity values and pass; others (incl. bigint, hex) are found', () => {
    const source = [
      'const first = items[0];',
      'const next = i + 1;',
      'const negative = -1;',
      'const window = 24 * 60;',
      'const big = 10n;',
      'const hex = 0x10;',
      'type Level = 2 | 3;',
    ].join('\n');
    expect(findNumericLiterals('cancel.ts', source).map((f) => f.text)).toEqual([
      '24',
      '60',
      '10n',
      '0x10',
      '2',
      '3',
    ]);
  });

  it('[CFG-RULE-002] the escape hatch needs a citation or a "technical" reason', () => {
    const source = [
      'const percent = amount / 100; // kk-allow-literal: technical percent conversion',
      'const share = 0.7; // kk-allow-literal: D-006',
      'const window = 30; // kk-allow-literal:',
    ].join('\n');
    expect(findNumericLiterals('pricing.ts', source).map((f) => f.allowedBy)).toEqual([
      'technical percent',
      'D-006',
      null,
    ]);
  });

  it('[CFG-RULE-002] literals in strings and comments are ignored; TSX is parsed', () => {
    const source =
      "// 30% commission\nconst label = 'Rs 500';\nexport const C = () => <View style={{ flex: 1 }} />;\n";
    expect(findNumericLiterals('badge.tsx', source)).toEqual([]);
  });
});

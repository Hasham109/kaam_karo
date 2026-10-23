/**
 * T0.6 Urdu Nastaliq smoke test — screen model (condition of D-001; D-027 reference phone).
 * DEV-ONLY test screen, no business logic, no network call, no permission (owner A14,
 * authorised by A00 to live in apps/customer for T0.6).
 *
 * Plain TypeScript (no React Native import) so the RTL and catalog rules can be unit tested
 * without a device. The view is UrduSmokeScreen.tsx.
 *
 * Strings come from the DEV-ONLY catalog @kaamkaro/i18n/dev-smoke; this module is reached only
 * through the __DEV__-guarded require in ./entry (App.tsx), so release bundles drop it.
 *
 * I18N-001 en/ur, I18N-002 switch any time, I18N-003 RTL mirroring, I18N-004 Nastaliq + line
 * height, I18N-006 strings from @kaamkaro/i18n, I18N-007 PKR format (BP §37, §78);
 * A11Y-001/002/004 (BP §38).
 */
import { type Locale, formatPkr, isolateLtr, textDirection } from '@kaamkaro/i18n';
import { type SmokeKey, translateSmoke } from '@kaamkaro/i18n/dev-smoke';
import { type Mirroring, type TextTokens, mirroring, textTokens } from '@kaamkaro/ui';

/**
 * Technical test settings, not business values: enough rows to need scrolling on any screen,
 * and an amount with three digit groups to show the PKR format. Display-only; never a price.
 */
export const SMOKE_ROW_COUNT = 30;
export const SMOKE_SAMPLE_RUPEES = 1234567;
export const SMOKE_DIGITS = '0123456789';

/** Every catalog key the smoke screen shows (tested to exist in en and ur). */
export const SMOKE_KEYS = [
  'smoke.open',
  'smoke.title',
  'smoke.back',
  'smoke.language.toggle',
  'smoke.language.toggleA11y',
  'smoke.paragraph.heading',
  'smoke.paragraph',
  'smoke.mixed.heading',
  'smoke.mixed',
  'smoke.amount',
  'smoke.digits',
  'smoke.input.label',
  'smoke.input.placeholder',
  'smoke.sheet.open',
  'smoke.sheet.title',
  'smoke.sheet.body',
  'smoke.sheet.close',
  'smoke.list.heading',
  'smoke.list.item',
  'smoke.list.itemHint',
] as const satisfies readonly SmokeKey[];

/** Stable test IDs: one Maestro flow runs in en and ur (RQ-002 item 4). */
export const SMOKE_TEST_IDS = {
  open: 'urdu-smoke-open',
  screen: 'urdu-smoke-screen',
  back: 'urdu-smoke-back',
  title: 'urdu-smoke-title',
  toggle: 'urdu-smoke-language-toggle',
  paragraph: 'urdu-smoke-paragraph',
  mixed: 'urdu-smoke-mixed',
  amount: 'urdu-smoke-amount',
  digits: 'urdu-smoke-digits',
  input: 'urdu-smoke-input',
  sheetOpen: 'urdu-smoke-sheet-open',
  sheet: 'urdu-smoke-sheet',
  sheetClose: 'urdu-smoke-sheet-close',
  sheetBackdrop: 'urdu-smoke-sheet-backdrop',
  list: 'urdu-smoke-list',
  row: (n: number): string => `urdu-smoke-row-${n}`,
} as const;

export interface SmokeRow {
  readonly n: number;
  readonly key: string;
  readonly testID: string;
  readonly title: string;
  readonly hint: string;
}

export interface UrduSmokeModel {
  readonly locale: Locale;
  readonly mirror: Mirroring;
  readonly type: {
    readonly headline: TextTokens;
    readonly title: TextTokens;
    readonly body: TextTokens;
    readonly label: TextTokens;
  };
  readonly text: {
    readonly title: string;
    readonly back: string;
    readonly toggle: string;
    readonly toggleA11y: string;
    readonly paragraphHeading: string;
    readonly paragraph: string;
    readonly mixedHeading: string;
    readonly mixed: string;
    readonly amount: string;
    readonly digits: string;
    readonly inputLabel: string;
    readonly inputPlaceholder: string;
    readonly sheetOpen: string;
    readonly sheetTitle: string;
    readonly sheetBody: string;
    readonly sheetClose: string;
    readonly listHeading: string;
  };
  readonly rows: readonly SmokeRow[];
}

/**
 * @param globalIsRtl `I18nManager.isRTL` (true when the phone's own language already makes
 *   React Native right-to-left); see @kaamkaro/ui `mirroring`.
 */
export function buildUrduSmokeModel(locale: Locale, globalIsRtl: boolean): UrduSmokeModel {
  const t = (key: SmokeKey, params?: Readonly<Record<string, string | number>>): string =>
    translateSmoke(locale, key, params);
  const rows: SmokeRow[] = Array.from({ length: SMOKE_ROW_COUNT }, (_unused, index) => {
    const n = index + 1;
    return {
      n,
      key: `row-${n}`,
      testID: SMOKE_TEST_IDS.row(n),
      title: t('smoke.list.item', { n }),
      hint: t('smoke.list.itemHint'),
    };
  });
  return {
    locale,
    mirror: mirroring(textDirection(locale), globalIsRtl),
    type: {
      headline: textTokens(locale, 'headline'),
      title: textTokens(locale, 'title'),
      body: textTokens(locale, 'body'),
      label: textTokens(locale, 'label'),
    },
    text: {
      title: t('smoke.title'),
      back: t('smoke.back'),
      toggle: t('smoke.language.toggle'),
      toggleA11y: t('smoke.language.toggleA11y'),
      paragraphHeading: t('smoke.paragraph.heading'),
      paragraph: t('smoke.paragraph'),
      mixedHeading: t('smoke.mixed.heading'),
      mixed: t('smoke.mixed'),
      amount: t('smoke.amount', { amount: formatPkr(locale, SMOKE_SAMPLE_RUPEES) }),
      digits: t('smoke.digits', { digits: isolateLtr(locale, SMOKE_DIGITS) }),
      inputLabel: t('smoke.input.label'),
      inputPlaceholder: t('smoke.input.placeholder'),
      sheetOpen: t('smoke.sheet.open'),
      sheetTitle: t('smoke.sheet.title'),
      sheetBody: t('smoke.sheet.body'),
      sheetClose: t('smoke.sheet.close'),
      listHeading: t('smoke.list.heading'),
    },
    rows,
  };
}

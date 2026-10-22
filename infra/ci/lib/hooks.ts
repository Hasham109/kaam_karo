/**
 * Registry of CI hooks whose real rules are owned by other agents (T2.1; IMPL §7.4).
 *
 * A01 wires the hook into CI now; the owner drops the script at `script` in its task.
 *  - Script present            → it runs; its exit code decides.
 *  - Script absent, not due    → prints TODO and passes (empty repo).
 *  - Script absent, but due    → FAILS: the code the hook protects exists without its guard.
 */

export interface HookDefinition {
  readonly owner: string;
  readonly task: string;
  readonly purpose: string;
  /** Repo-relative script run with `node` (Node 24 type stripping for `.ts`). */
  readonly script: string;
  /** When this repo-relative path exists, the hook script is mandatory. */
  readonly requiredWhen: string | null;
  /** Built-in baseline that always runs (in addition to the owner script). */
  readonly baseline: 'string-lint' | null;
}

export const HOOKS: Readonly<Record<string, HookDefinition>> = {
  'string-lint': {
    owner: 'A14',
    task: 'T1.4',
    purpose: 'No hard-coded user-facing strings (I18N-006, BP §37)',
    script: 'packages/i18n/tools/string-lint.ts',
    requiredWhen: null,
    baseline: 'string-lint',
  },
  'transition-table': {
    owner: 'A04',
    task: 'T3.4',
    purpose:
      'Reads the ARCH §6.1 transition table from one source file and asserts every non-listed pair is rejected (BOOK-STATUS-*, BP §15)',
    script: 'services/api/src/modules/booking/tools/check-transition-table.ts',
    requiredWhen: 'services/api/src/modules/booking',
    baseline: null,
  },
  traceability: {
    owner: 'A16',
    task: 'RQ-002 item 1',
    purpose:
      'Unknown requirement IDs in tests fail; Launch IDs due in a closed phase need a passing test (docs/qa/test-strategy.md §3)',
    script: 'tests/e2e/tools/traceability/index.ts',
    requiredWhen: 'tests/e2e/traceability/phase-map.json',
    baseline: null,
  },
};

export type HookState = 'run' | 'todo' | 'missing';

/** Decides what to do with a hook given which paths exist. */
export function hookState(hook: HookDefinition, exists: (relPath: string) => boolean): HookState {
  if (exists(hook.script)) return 'run';
  if (hook.requiredWhen !== null && exists(hook.requiredWhen)) return 'missing';
  return 'todo';
}

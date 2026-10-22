/**
 * CI hook runner (T2.1; IMPL §7.4). Hooks: string-lint, transition-table, traceability.
 * See lib/hooks.ts for owners, script locations and when a hook becomes mandatory.
 *
 * Usage: node infra/ci/run-hook.ts <hook-name>
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { HOOKS, hookState } from './lib/hooks.ts';
import { GENERATED_DIRS, REPO_ROOT, readText, walkFiles } from './lib/repo.ts';
import { EXEMPT_UI_FILE, UI_FILE, UI_ROOTS, findUserFacingLiterals } from './lib/string-lint.ts';

const name = process.argv[2] ?? '';
const hook = HOOKS[name];
if (!hook) {
  console.error(`Unknown hook "${name}". Known: ${Object.keys(HOOKS).join(', ')}`);
  process.exit(2);
}

let failed = false;

if (hook.baseline === 'string-lint') {
  const skipDirs = new Set([...GENERATED_DIRS, 'android', 'ios']);
  const files = UI_ROOTS.flatMap((root) =>
    walkFiles(join(REPO_ROOT, root), {
      skipDirs,
      accept: (rel) => UI_FILE.test(rel) && !EXEMPT_UI_FILE.test(rel),
    }),
  );
  const findings = files.flatMap((file) =>
    findUserFacingLiterals(file, readText(file)).map((f) => `${file}:${f.line} "${f.text}"`),
  );
  if (findings.length > 0) {
    failed = true;
    console.error(
      `string-lint (baseline) FAILED: user-facing text must come from @kaamkaro/i18n (I18N-006, BP §37):`,
    );
    for (const finding of findings) console.error(`  - ${finding}`);
  } else {
    console.log(`string-lint (baseline) passed (${files.length} UI file(s) scanned).`);
  }
}

const state = hookState(hook, (rel) => existsSync(join(REPO_ROOT, rel)));
if (state === 'run') {
  const result = spawnSync(process.execPath, [join(REPO_ROOT, hook.script)], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) failed = true;
} else if (state === 'missing') {
  failed = true;
  console.error(
    `${name} FAILED: ${hook.requiredWhen} exists but the hook script ${hook.script} is missing ` +
      `(owner ${hook.owner}, ${hook.task}). Purpose: ${hook.purpose}`,
  );
} else {
  console.log(
    `${name}: TODO(${hook.owner}, ${hook.task}) — hook script ${hook.script} not installed yet; ` +
      `passing (nothing to guard yet). Purpose: ${hook.purpose}`,
  );
}

process.exit(failed ? 1 : 0);

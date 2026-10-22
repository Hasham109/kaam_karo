/**
 * CI guard: forbidden Android permissions (T2.1; PERM-006, SEC-BASE-001; BP §75 item 98, §29;
 * IMPL §7.4; RQ-001).
 *
 * Usage:
 *   node infra/ci/check-android-permissions.ts            # app.json + any prebuild source manifest
 *   node infra/ci/check-android-permissions.ts --release  # also the MERGED release manifests
 *
 * `--release` expects `expo prebuild` + Gradle `processReleaseMainManifest` to have run (CI job
 * `android-manifest`) and fails when no merged release manifest is found.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { APPS, checkExpoConfig, checkManifest, type MobileApp } from './lib/android-permissions.ts';
import { GENERATED_DIRS, REPO_ROOT, readText, walkFiles } from './lib/repo.ts';

const release = process.argv.includes('--release');
const failures: string[] = [];
let checked = 0;

function report(source: string, problems: readonly string[]): void {
  checked += 1;
  for (const problem of problems) failures.push(`${source}: ${problem}`);
}

function manifests(app: MobileApp, filter: (rel: string) => boolean): string[] {
  const androidDir = join(REPO_ROOT, 'apps', app, 'android');
  const skip = new Set([...GENERATED_DIRS].filter((d) => d !== 'build'));
  return walkFiles(androidDir, {
    skipDirs: skip,
    accept: (rel) => rel.endsWith('/AndroidManifest.xml') && filter(rel),
  });
}

for (const app of APPS) {
  const appJsonPath = `apps/${app}/app.json`;
  if (!existsSync(join(REPO_ROOT, appJsonPath))) {
    failures.push(`${appJsonPath}: missing (both mobile apps must declare their permissions)`);
    continue;
  }
  report(appJsonPath, checkExpoConfig(app, JSON.parse(readText(appJsonPath)) as unknown));

  // Main source manifest written by `expo prebuild` (git-ignored, present only after a
  // prebuild). It feeds the release build, so release rules apply; debug/ manifests are skipped.
  for (const rel of manifests(app, (r) => r.includes('/app/src/main/'))) {
    report(rel, checkManifest(app, readText(rel), true));
  }

  if (release) {
    const merged = manifests(
      app,
      (r) => r.includes('/build/intermediates/') && /merged_manifest/.test(r) && /release/i.test(r),
    );
    if (merged.length === 0) {
      failures.push(
        `apps/${app}: no merged release manifest found (run prebuild + processReleaseMainManifest)`,
      );
    }
    for (const rel of merged)
      report(rel, checkManifest(app, readFileSync(join(REPO_ROOT, rel), 'utf8'), true));
  }
}

if (failures.length > 0) {
  console.error(`Forbidden-permission guard FAILED (${failures.length} problem(s)):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `Forbidden-permission guard passed (${checked} file(s) checked${release ? ', release mode' : ''}).`,
);

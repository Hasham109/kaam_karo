/**
 * Shared helpers for the CI guards (T2.1, IMPL §7.4). Plain Node: these files run with
 * Node 24's built-in type stripping (`node infra/ci/<guard>.ts`), so only erasable
 * TypeScript syntax is allowed and relative imports carry the `.ts` extension.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the repository root (this file lives in `infra/ci/lib/`). */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Folders that never contain hand-written source. */
export const GENERATED_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'web-build',
  '.git',
  '.next',
  '.expo',
  '.turbo',
]);

export function toPosix(path: string): string {
  return path.split(sep).join('/');
}

export interface WalkOptions {
  /** Directory names to skip (in addition to nothing: pass GENERATED_DIRS for the usual set). */
  readonly skipDirs: ReadonlySet<string>;
  /** Called with the repo-relative POSIX path; return true to include the file. */
  readonly accept: (relPath: string) => boolean;
}

/** Lists files under `startDir` (absolute) as repo-relative POSIX paths, sorted. */
export function walkFiles(startDir: string, options: WalkOptions, root = REPO_ROOT): string[] {
  if (!existsSync(startDir)) return [];
  const found: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!options.skipDirs.has(entry.name)) visit(abs);
      } else if (entry.isFile()) {
        const rel = toPosix(relative(root, abs));
        if (options.accept(rel)) found.push(rel);
      }
    }
  };
  visit(startDir);
  return found.sort();
}

export function readText(relPath: string, root = REPO_ROOT): string {
  return readFileSync(join(root, relPath), 'utf8');
}

/** Requirement IDs from docs/requirements/REQUIREMENTS.md (pattern from its §34 count command). */
export function parseRequirementIds(registryText: string): Set<string> {
  const ids = new Set<string>();
  for (const match of registryText.matchAll(/^\| ([A-Z0-9-]+-[0-9]{3}) /gm)) {
    const id = match[1];
    if (id && !id.startsWith('OQ-') && !id.startsWith('D-')) ids.add(id);
  }
  return ids;
}

export const REQUIREMENTS_PATH = 'docs/requirements/REQUIREMENTS.md';

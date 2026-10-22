/**
 * CI guard: PR citations (T2.1; IMPL §7.4; golden rule 1). Rules: lib/citations.ts.
 *
 * Usage:
 *   node infra/ci/check-pr-citations.ts                    # reads $GITHUB_EVENT_PATH (pull_request)
 *   node infra/ci/check-pr-citations.ts --body-file pr.md  # local check of a PR description
 *
 * Outside a pull request (push to main, local run without --body-file) it prints a notice
 * and passes: the PR that brought the change was already checked.
 */
import { existsSync, readFileSync } from 'node:fs';
import { checkPrBody } from './lib/citations.ts';
import { REQUIREMENTS_PATH, parseRequirementIds, readText } from './lib/repo.ts';

function readBody(): string | null {
  const flag = process.argv.indexOf('--body-file');
  if (flag !== -1) {
    const file = process.argv[flag + 1];
    if (!file) throw new Error('--body-file needs a path');
    return readFileSync(file, 'utf8');
  }
  const eventPath = process.env['GITHUB_EVENT_PATH'];
  if (!eventPath || !existsSync(eventPath)) return null;
  const event = JSON.parse(readFileSync(eventPath, 'utf8')) as {
    pull_request?: { body?: string | null };
  };
  if (!event.pull_request) return null;
  return event.pull_request.body ?? '';
}

const body = readBody();
if (body === null) {
  console.log('Citation guard: not a pull request — nothing to check.');
  process.exit(0);
}

const problems = checkPrBody(body, parseRequirementIds(readText(REQUIREMENTS_PATH)));
if (problems.length > 0) {
  console.error('Citation guard FAILED (fill in the PR template fields):');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('Citation guard passed.');

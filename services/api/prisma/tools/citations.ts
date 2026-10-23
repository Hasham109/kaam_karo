/**
 * Citation rules for schema docs (T2.3 acceptance "every table/column has a comment citing BP §";
 * CLAUDE.md golden rule 1 "cite or stop"; DATA-001).
 *
 * A doc comment is cited when it contains at least one of:
 *   - a Blueprint section `BP §n`,
 *   - an owner decision `D-xxx` that exists in coordination/DECISIONS.md,
 *   - a requirement ID that exists in docs/requirements/REQUIREMENTS.md.
 * `ARCH §n` and `OQ-xxx` may appear as extra context but never count on their own.
 * Every D-/OQ-/requirement ID that appears must exist (catches typos and invented IDs).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface IdRegistry {
  decisions: Set<string>;
  openQuestions: Set<string>;
  requirements: Set<string>;
}

const BP_RE = /\bBP §\d+/;
const DECISION_RE = /\bD-\d{3}\b/g;
const OQ_RE = /\bOQ-\d{3}\b/g;
/** AREA-TOPIC-NNN (BP §48); excludes D- and OQ- which are handled above. */
const REQUIREMENT_RE = /\b(?!D-\d)(?!OQ-\d)[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d{3}\b/g;

export function loadIdRegistry(repoRoot: string): IdRegistry {
  const decisions = readFileSync(join(repoRoot, 'coordination/DECISIONS.md'), 'utf8');
  const questions = readFileSync(join(repoRoot, 'coordination/OPEN_QUESTIONS.md'), 'utf8');
  const requirements = readFileSync(join(repoRoot, 'docs/requirements/REQUIREMENTS.md'), 'utf8');
  return {
    decisions: rowIds(decisions, /^\| (D-\d{3}) \|/gm),
    openQuestions: rowIds(questions, /^\| (OQ-\d{3}) \|/gm),
    requirements: rowIds(requirements, /^\| ([A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d{3}) \|/gm),
  };
}

function rowIds(text: string, re: RegExp): Set<string> {
  const ids = new Set<string>();
  for (const match of text.matchAll(re)) ids.add(match[1] as string);
  return ids;
}

export interface CitationCheck {
  cited: boolean;
  unknownIds: string[];
}

export function checkCitation(doc: string, registry: IdRegistry): CitationCheck {
  const unknownIds: string[] = [];
  let cited = BP_RE.test(doc);

  for (const id of doc.match(DECISION_RE) ?? []) {
    if (registry.decisions.has(id)) cited = true;
    else unknownIds.push(id);
  }
  for (const id of doc.match(OQ_RE) ?? []) {
    if (!registry.openQuestions.has(id)) unknownIds.push(id);
  }
  for (const id of doc.match(REQUIREMENT_RE) ?? []) {
    if (registry.requirements.has(id)) cited = true;
    else unknownIds.push(id);
  }
  return { cited, unknownIds };
}

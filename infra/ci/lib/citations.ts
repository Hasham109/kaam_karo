/**
 * PR citation guard — rules (T2.1; IMPL §7.4 "Citation guard"; CLAUDE.md golden rule 1).
 *
 * The PR template (.github/pull_request_template.md) has two fields:
 *   Requirement IDs: <IDs from docs/requirements/REQUIREMENTS.md>   — must be non-empty and known
 *   Citations: <BP §n / D-xxx / ARCH §n>                             — must contain at least one
 *
 * IDs may be written one by one or as ranges: `SEC-AUTH-001..008`, `REL-001…003`,
 * `PERM-001..PERM-006`. Wildcards (`PERM-*`) are refused: name the IDs.
 */

export const REQUIREMENT_FIELD = 'Requirement IDs';
export const CITATION_FIELD = 'Citations';

const ID = /^([A-Z0-9]+(?:-[A-Z0-9]+)*)-(\d{3})$/;
const RANGE =
  /^([A-Z0-9]+(?:-[A-Z0-9]+)*)-(\d{3})(?:\.\.|…)(?:([A-Z0-9]+(?:-[A-Z0-9]+)*)-)?(\d{3})$/;
const CITATION = /(BP §\s?\d+|D-\d{3}|ARCH §\s?\d+)/;

/** Removes HTML comments (template hints) so placeholder text never counts as an answer. */
export function stripComments(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, '');
}

/** Value after `**Label:**` / `Label:` on its own line (first match), trimmed; null if absent. */
export function extractField(body: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Horizontal whitespace only: an empty field must never swallow the next line.
  const re = new RegExp(`^[ \\t>*_-]*${escaped}(?:\\*\\*)?[ \\t]*:[ \\t]*(?:\\*\\*)?(.*)$`, 'im');
  const match = re.exec(stripComments(body));
  return match ? (match[1] ?? '').replace(/\*+/g, '').trim() : null;
}

export interface ExpandResult {
  readonly ids: string[];
  readonly invalid: string[];
}

/** Splits a field into IDs, expanding ranges. Unknown shapes go to `invalid`. */
export function expandIds(field: string): ExpandResult {
  const ids: string[] = [];
  const invalid: string[] = [];
  const tokens = field
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^[`([]+|[`)\].]+$/g, ''))
    .filter((t) => t.length > 0);
  for (const token of tokens) {
    const single = ID.exec(token);
    if (single) {
      ids.push(token);
      continue;
    }
    const range = RANGE.exec(token);
    if (range) {
      const prefix = range[1] ?? '';
      const endPrefix = range[3];
      const start = Number(range[2]);
      const end = Number(range[4]);
      if ((endPrefix !== undefined && endPrefix !== prefix) || end < start) {
        invalid.push(token);
        continue;
      }
      for (let n = start; n <= end; n += 1) ids.push(`${prefix}-${String(n).padStart(3, '0')}`);
      continue;
    }
    invalid.push(token);
  }
  return { ids, invalid };
}

/** Problems with a PR body (empty = guard passes). */
export function checkPrBody(body: string, knownIds: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  const reqField = extractField(body, REQUIREMENT_FIELD);
  if (reqField === null || reqField === '') {
    problems.push(`"${REQUIREMENT_FIELD}:" is missing or empty (IMPL §7.4)`);
  } else {
    const { ids, invalid } = expandIds(reqField);
    for (const token of invalid) problems.push(`"${token}" is not a requirement ID or ID range`);
    if (ids.length === 0 && invalid.length === 0) {
      problems.push(`"${REQUIREMENT_FIELD}:" lists no IDs`);
    }
    for (const id of ids) {
      if (!knownIds.has(id))
        problems.push(`${id} does not exist in docs/requirements/REQUIREMENTS.md`);
    }
  }
  const citeField = extractField(body, CITATION_FIELD);
  if (citeField === null || !CITATION.test(citeField)) {
    problems.push(
      `"${CITATION_FIELD}:" must cite at least one BP §n, D-xxx or ARCH §n (golden rule 1)`,
    );
  }
  return problems;
}

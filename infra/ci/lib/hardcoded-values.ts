/**
 * Hard-coded value guard — rules (T2.1; IMPL §7.4; CLAUDE.md golden rule 2; BP §42).
 *
 * Fails when numeric literals appear in pricing / cancellation / matching / badge /
 * media-limit code outside config seeds. Business numbers (fees, windows, thresholds,
 * weights, limits) must come from the ConfigRule store (A03) instead.
 *
 * Rule owner: A17 (IMPL §7.4). A01 runs it in CI.
 */
import ts from 'typescript';

/** Paths (repo-relative, POSIX) whose code is guarded — IMPL §7.4 list. */
export const GUARDED_PATH = /(pricing|cancel|matching|badge|media-limits)/i;

export const SOURCE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

/** Config seeds and tests may contain literals. */
export const EXEMPT_PATHS: readonly RegExp[] = [
  /(^|\/)seeds?\//,
  /(^|\/)seed\.[cm]?[jt]sx?$/,
  /\.seed\.[cm]?[jt]sx?$/,
  /(^|\/)migrations\//,
  /\.(spec|e2e-spec|test)\.[cm]?[jt]sx?$/,
  /(^|\/)__(tests|regression)__\//,
  /\.d\.ts$/,
];

/** Identity values, not business values. */
export const ALLOWED_LITERALS: ReadonlySet<string> = new Set(['0', '1']);

/**
 * Per-line escape hatch for purely technical numbers. It must carry a citation or the word
 * `technical` plus a reason, and every use is printed in the CI log for reviewers.
 *   const PERCENT = 100; // kk-allow-literal: technical — percent conversion
 */
export const ALLOW_COMMENT = /kk-allow-literal:\s*(D-\d{3}|BP §\d+|technical\b\s*\S+)/;

export interface LiteralFinding {
  readonly line: number;
  readonly column: number;
  readonly text: string;
  readonly allowedBy: string | null;
}

export function isGuardedPath(relPath: string): boolean {
  return (
    SOURCE_FILE.test(relPath) &&
    GUARDED_PATH.test(relPath) &&
    !EXEMPT_PATHS.some((re) => re.test(relPath))
  );
}

function scriptKind(fileName: string): ts.ScriptKind {
  if (/\.tsx$/.test(fileName)) return ts.ScriptKind.TSX;
  if (/\.jsx$/.test(fileName)) return ts.ScriptKind.JSX;
  if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/** Numeric (and bigint) literals other than 0 and 1, with any allow comment on the same line. */
export function findNumericLiterals(fileName: string, text: string): LiteralFinding[] {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(fileName),
  );
  const lines = text.split(/\r?\n/);
  const findings: LiteralFinding[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isNumericLiteral(node) || ts.isBigIntLiteral(node)) {
      const literal = node.getText(source);
      const normalized = ts.isNumericLiteral(node) ? String(Number(node.text)) : literal;
      if (!ALLOWED_LITERALS.has(normalized)) {
        const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
        const allow = ALLOW_COMMENT.exec(lines[pos.line] ?? '');
        findings.push({
          line: pos.line + 1,
          column: pos.character + 1,
          text: literal,
          allowedBy: allow ? (allow[1] ?? null) : null,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

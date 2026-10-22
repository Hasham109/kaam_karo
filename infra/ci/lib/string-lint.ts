/**
 * Baseline string-lint (T2.1; I18N-006, BP §37; IMPL §7.4 "String-lint for user-facing
 * literals (A14 rule)"). Runs until A14 installs the full rule in T1.4
 * (packages/i18n/tools/string-lint.ts); it then runs in addition to A14's rule.
 *
 * Flags, in UI files (.tsx/.jsx) of the three apps and the shared UI kit:
 *  - JSX text containing a letter (`<Text>Book now</Text>`),
 *  - string literals containing a letter as a JSX child expression (`{'Book now'}`),
 *  - string literals in user-facing props (`placeholder="Search"`).
 */
import ts from 'typescript';

export const UI_ROOTS = ['apps/customer', 'apps/partner', 'apps/admin', 'packages/ui'];
export const UI_FILE = /\.(tsx|jsx)$/;
export const EXEMPT_UI_FILE = /\.(spec|test|e2e-spec)\.[jt]sx$|(^|\/)__(tests|regression)__\//;

/** Props whose value is shown or read out to the user. */
export const USER_FACING_PROPS: ReadonlySet<string> = new Set([
  'title',
  'placeholder',
  'label',
  'alt',
  'aria-label',
  'accessibilityLabel',
  'accessibilityHint',
]);

const HAS_LETTER = /\p{L}/u;

export interface StringFinding {
  readonly line: number;
  readonly text: string;
}

export function findUserFacingLiterals(fileName: string, text: string): StringFinding[] {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX,
  );
  const findings: StringFinding[] = [];
  const add = (node: ts.Node, value: string): void => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    findings.push({ line, text: value.trim() });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node) && HAS_LETTER.test(node.text)) {
      add(node, node.text);
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isStringLiteral(node.expression) ||
        ts.isNoSubstitutionTemplateLiteral(node.expression)) &&
      !ts.isJsxAttribute(node.parent) &&
      HAS_LETTER.test(node.expression.text)
    ) {
      add(node, node.expression.text);
    } else if (ts.isJsxAttribute(node) && USER_FACING_PROPS.has(node.name.getText(source))) {
      const init = node.initializer;
      const literal =
        init && ts.isStringLiteral(init)
          ? init
          : init &&
              ts.isJsxExpression(init) &&
              init.expression &&
              ts.isStringLiteral(init.expression)
            ? init.expression
            : null;
      if (literal && HAS_LETTER.test(literal.text)) add(node, literal.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

/**
 * string-lint CI hook — owner A14 (T1.4; I18N-006, BP §37; IMPL §7.4).
 *
 * Enforces two critical localization invariants:
 *  1. No hard-coded user-facing string literals in UI code (apps/customer, apps/partner, apps/admin, packages/ui).
 *     All user-facing copy must come from @kaamkaro/i18n message catalogs or backend dynamic data.
 *  2. Message catalog parity: Every English key must have a corresponding, non-empty Urdu translation
 *     in Urdu script, and placeholder tokens {param} must match exactly between languages.
 *
 * Usage: node packages/i18n/tools/string-lint.ts
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '../../..');

const UI_ROOTS = ['apps/customer', 'apps/partner', 'apps/admin', 'packages/ui'];
const UI_EXT_RE = /\.(tsx|jsx)$/;
const EXEMPT_FILE_RE = /\.(spec|test|e2e-spec)\.[jt]sx$|(^|\/)__(tests|regression)__\//;
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.turbo',
  '.git',
  '.expo',
  'android',
  'ios',
]);

const USER_FACING_PROPS = new Set([
  'title',
  'placeholder',
  'label',
  'alt',
  'aria-label',
  'accessibilityLabel',
  'accessibilityHint',
]);

const HAS_LETTER = /\p{L}/u;
const ARABIC_SCRIPT = /\p{Script=Arabic}/u;

interface StringFinding {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

function walkDirectory(dir: string, fileList: string[]): void {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(fullPath, fileList);
    } else if (entry.isFile()) {
      const relPath = relative(repoRoot, fullPath).replace(/\\/g, '/');
      if (UI_EXT_RE.test(relPath) && !EXEMPT_FILE_RE.test(relPath)) {
        fileList.push(fullPath);
      }
    }
  }
}

function findUserFacingLiteralsInFile(filePath: string): StringFinding[] {
  const content = readFileSync(filePath, 'utf8');
  const source = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.jsx') ? ts.ScriptKind.JSX : ts.ScriptKind.TSX,
  );
  const findings: StringFinding[] = [];
  const relPath = relative(repoRoot, filePath).replace(/\\/g, '/');

  const add = (node: ts.Node, val: string): void => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    findings.push({ file: relPath, line, text: val.trim() });
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
      if (literal && HAS_LETTER.test(literal.text)) {
        add(node, literal.text);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return findings;
}

function extractPlaceholders(text: string): string[] {
  return [...text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1] ?? '').sort();
}

function checkCatalogParity(): string[] {
  const messagesDir = resolve(repoRoot, 'packages/i18n/src/messages');
  const messagesFile = resolve(repoRoot, 'packages/i18n/src/messages.ts');
  const errors: string[] = [];

  const enMap = new Map<string, string>();
  const urMap = new Map<string, string>();

  const extractObjectProps = (obj: ts.ObjectLiteralExpression, targetMap: Map<string, string>) => {
    for (const prop of obj.properties) {
      if (ts.isPropertyAssignment(prop)) {
        let key = '';
        if (ts.isStringLiteral(prop.name) || ts.isIdentifier(prop.name)) {
          key = prop.name.text;
        }
        if (
          key &&
          (ts.isStringLiteral(prop.initializer) ||
            ts.isNoSubstitutionTemplateLiteral(prop.initializer))
        ) {
          targetMap.set(key, prop.initializer.text);
        }
      }
    }
  };

  const parseFile = (filePath: string) => {
    if (!existsSync(filePath)) return;
    const content = readFileSync(filePath, 'utf8');
    const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    ts.forEachChild(source, (node) => {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer) {
            const varName = decl.name.text;
            let init: ts.Expression = decl.initializer;
            while (ts.isAsExpression(init) || ts.isSatisfiesExpression(init)) {
              init = init.expression;
            }
            if (ts.isObjectLiteralExpression(init)) {
              if (varName === 'EN_MESSAGES' || varName.endsWith('_EN')) {
                extractObjectProps(init, enMap);
              } else if (varName === 'UR_MESSAGES' || varName.endsWith('_UR')) {
                extractObjectProps(init, urMap);
              }
            }
          }
        }
      }
    });
  };

  if (existsSync(messagesDir)) {
    for (const file of readdirSync(messagesDir)) {
      if (file.endsWith('.ts')) {
        parseFile(join(messagesDir, file));
      }
    }
  }
  if (existsSync(messagesFile)) {
    parseFile(messagesFile);
  }

  if (enMap.size === 0) {
    errors.push('EN_MESSAGES could not be parsed or contains no keys.');
  }
  if (urMap.size === 0) {
    errors.push('UR_MESSAGES could not be parsed or contains no keys.');
  }

  // Verify completeness
  for (const [key, enText] of enMap.entries()) {
    const urText = urMap.get(key);
    if (urText === undefined) {
      errors.push(`Key "${key}" is defined in EN_MESSAGES but missing in UR_MESSAGES.`);
      continue;
    }
    if (!urText.trim()) {
      errors.push(`Key "${key}" in UR_MESSAGES is empty.`);
    }
    // All Urdu text must contain Arabic/Urdu script unless it's explicitly an English toggle or purely punctuation/placeholders
    const textOnly = urText.replace(/\{[a-zA-Z0-9_]+\}/g, '').trim();
    if (
      HAS_LETTER.test(textOnly) &&
      key !== 'a11y.language_toggle' &&
      key !== 'common.language.toggle'
    ) {
      if (!ARABIC_SCRIPT.test(textOnly)) {
        errors.push(`Key "${key}" in UR_MESSAGES must contain Urdu script: "${urText}".`);
      }
    }
    // Placeholders must match exactly
    const enPlaceholders = extractPlaceholders(enText);
    const urPlaceholders = extractPlaceholders(urText);
    if (enPlaceholders.join(',') !== urPlaceholders.join(',')) {
      errors.push(
        `Placeholder mismatch on key "${key}": EN=[${enPlaceholders.join(',')}] vs UR=[${urPlaceholders.join(',')}]`,
      );
    }
  }

  for (const key of urMap.keys()) {
    if (!enMap.has(key)) {
      errors.push(`Key "${key}" is defined in UR_MESSAGES but missing in EN_MESSAGES.`);
    }
  }

  return errors;
}

function main(): void {
  console.log(
    '[string-lint] Scanning UI files and message catalogs for localization compliance...',
  );
  const uiFiles: string[] = [];
  for (const root of UI_ROOTS) {
    walkDirectory(join(repoRoot, root), uiFiles);
  }

  const allFindings: StringFinding[] = [];
  for (const file of uiFiles) {
    const findings = findUserFacingLiteralsInFile(file);
    allFindings.push(...findings);
  }

  const catalogErrors = checkCatalogParity();

  let hasError = false;

  if (allFindings.length > 0) {
    hasError = true;
    console.error(
      `\n[string-lint] FAILED: Found ${allFindings.length} hard-coded user-facing literal(s) (I18N-006, BP §37):`,
    );
    for (const f of allFindings) {
      console.error(`  - ${f.file}:${f.line} "${f.text}"`);
    }
  }

  if (catalogErrors.length > 0) {
    hasError = true;
    console.error(`\n[string-lint] FAILED: Catalog parity errors (${catalogErrors.length}):`);
    for (const err of catalogErrors) {
      console.error(`  - ${err}`);
    }
  }

  if (hasError) {
    process.exit(1);
  }

  console.log(
    `[string-lint] Passed: ${uiFiles.length} UI file(s) checked (0 hard-coded literals), message catalogs 100% synchronized.`,
  );
  process.exit(0);
}

main();

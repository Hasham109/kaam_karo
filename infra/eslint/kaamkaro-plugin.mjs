/**
 * Local ESLint plugin `kaamkaro` (T2.1, A01).
 *
 * Rule `no-cross-module-import` — INFRA-001 (BP §32, §69; D-001): the backend is one modular
 * monolith and modules never reach into each other's internals (tables, repositories,
 * services). Code outside `services/api/src/modules/<m>/` may import that module only through
 * its public `index.ts`; everything else is reported.
 */
import path from 'node:path';

const MODULES_SEGMENT = '/services/api/src/modules/';
const INDEX_FILES = new Set(['', '/index', '/index.ts', '/index.js']);

/** @param {string} p */
function toPosix(p) {
  return p.split(path.sep).join('/');
}

/**
 * Splits an absolute POSIX path into the module name and the rest of the path inside it.
 * @param {string} absPath
 * @returns {{ module: string, rest: string } | null}
 */
export function moduleOf(absPath) {
  const at = absPath.indexOf(MODULES_SEGMENT);
  if (at === -1) return null;
  const tail = absPath.slice(at + MODULES_SEGMENT.length);
  const slash = tail.indexOf('/');
  if (slash === -1) return { module: tail, rest: '' };
  return { module: tail.slice(0, slash), rest: tail.slice(slash) };
}

/** @type {import('eslint').Rule.RuleModule} */
const noCrossModuleImport = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Modules may import another module only through its public index.ts (INFRA-001, BP §32)',
    },
    schema: [],
    messages: {
      deep: "Import of '{{source}}' reaches into module '{{target}}' internals. Import from '{{target}}/index' (its public API) or use a domain event (INFRA-001, ARCH §4.1).",
    },
  },
  create(context) {
    const filename = toPosix(context.filename);
    const own = moduleOf(filename);

    /** @param {import('estree').Node & { value?: unknown }} sourceNode */
    function check(sourceNode) {
      const source = sourceNode.value;
      if (typeof source !== 'string' || !source.startsWith('.')) return;
      const resolved = toPosix(path.resolve(path.dirname(context.filename), source));
      const target = moduleOf(resolved);
      if (!target || (own && own.module === target.module)) return;
      if (INDEX_FILES.has(target.rest)) return;
      context.report({
        node: sourceNode,
        messageId: 'deep',
        data: { source, target: target.module },
      });
    }

    return {
      ImportDeclaration(node) {
        check(node.source);
      },
      ExportNamedDeclaration(node) {
        if (node.source) check(node.source);
      },
      ExportAllDeclaration(node) {
        check(node.source);
      },
      ImportExpression(node) {
        if (node.source.type === 'Literal') check(node.source);
      },
    };
  },
};

const plugin = {
  meta: { name: 'eslint-plugin-kaamkaro', version: '0.0.0' },
  rules: { 'no-cross-module-import': noCrossModuleImport },
};

export default plugin;

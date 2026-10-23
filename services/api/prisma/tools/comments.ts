/**
 * Generates `COMMENT ON TABLE/COLUMN/TYPE` SQL from the `///` docs in prisma/schema, so the
 * Postgres catalog carries the same BP §/D-xxx/requirement citations as the schema
 * (T2.3 acceptance; DATA-001). The docs are the single source: migrations embed the generated
 * statements and a unit test fails when they drift (see __tests__/schema-citations.spec.ts).
 */
import { columnsOf, type SchemaModelSet } from './schema-model.ts';

export type CommentTarget =
  | { kind: 'TABLE'; table: string }
  | { kind: 'COLUMN'; table: string; column: string }
  | { kind: 'TYPE'; type: string };

export interface CommentStatement {
  /** Stable key, e.g. `COLUMN booking.status`. */
  key: string;
  text: string;
  sql: string;
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function quoteLiteral(text: string): string {
  return `'${text.replace(/'/g, "''")}'`;
}

export function targetKey(target: CommentTarget): string {
  switch (target.kind) {
    case 'TABLE':
      return `TABLE ${target.table}`;
    case 'COLUMN':
      return `COLUMN ${target.table}.${target.column}`;
    case 'TYPE':
      return `TYPE ${target.type}`;
  }
}

function targetSql(target: CommentTarget): string {
  switch (target.kind) {
    case 'TABLE':
      return `TABLE ${quoteIdent(target.table)}`;
    case 'COLUMN':
      return `COLUMN ${quoteIdent(target.table)}.${quoteIdent(target.column)}`;
    case 'TYPE':
      return `TYPE ${quoteIdent(target.type)}`;
  }
}

function statement(target: CommentTarget, text: string): CommentStatement {
  return {
    key: targetKey(target),
    text,
    sql: `COMMENT ON ${targetSql(target)} IS ${quoteLiteral(text)};`,
  };
}

/** One statement per table, per real column and per enum type, in schema order. */
export function buildCommentStatements(set: SchemaModelSet): CommentStatement[] {
  const owners = new Map(set.modules.map((m) => [m.name, m.owner ?? 'owner?']));
  const out: CommentStatement[] = [];
  for (const model of set.models) {
    const prefix = `[module ${model.module}, owner ${owners.get(model.module) ?? 'owner?'}] `;
    out.push(statement({ kind: 'TABLE', table: model.table }, prefix + model.doc));
    for (const field of columnsOf(model)) {
      out.push(statement({ kind: 'COLUMN', table: model.table, column: field.column }, field.doc));
    }
  }
  for (const enumDef of set.enums) {
    out.push(statement({ kind: 'TYPE', type: enumDef.dbName }, enumDef.doc));
  }
  return out;
}

export function renderCommentSql(statements: CommentStatement[]): string {
  return statements.map((s) => s.sql).join('\n') + '\n';
}

/**
 * Reads `COMMENT ON …` statements back from migration SQL (as written by renderCommentSql).
 * Returns key → comment text. Later statements win, so the last migration that comments an
 * object defines its current comment.
 */
export function parseCommentStatements(
  sql: string,
  into = new Map<string, string>(),
): Map<string, string> {
  const re =
    /^COMMENT ON (TABLE|COLUMN|TYPE) ("(?:[^"]|"")+")(?:\.("(?:[^"]|"")+"))? IS ('(?:[^']|'')*'|NULL);$/gm;
  for (const match of sql.matchAll(re)) {
    const [, kind, first, second, literal] = match as unknown as [
      string,
      'TABLE' | 'COLUMN' | 'TYPE',
      string,
      string | undefined,
      string,
    ];
    const unquote = (ident: string) => ident.slice(1, -1).replace(/""/g, '"');
    let key: string;
    if (kind === 'COLUMN') {
      if (second === undefined) throw new Error(`COMMENT ON COLUMN without column: ${match[0]}`);
      key = targetKey({ kind, table: unquote(first), column: unquote(second) });
    } else if (kind === 'TABLE') {
      key = targetKey({ kind, table: unquote(first) });
    } else {
      key = targetKey({ kind, type: unquote(first) });
    }
    if (literal === 'NULL') into.delete(key);
    else into.set(key, literal.slice(1, -1).replace(/''/g, "'"));
  }
  return into;
}

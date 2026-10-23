/**
 * Minimal reader for the multi-file Prisma schema in prisma/schema (T2.3; DATA-001; INFRA-001).
 * It extracts what the citation test and the COMMENT ON generator need: modules (one file each),
 * models with their table name, fields with their column name and `///` docs, and enums.
 * Prisma itself validates the schema (`prisma validate`); this reader only has to be faithful
 * for the constructs used here, and it throws on anything it does not understand.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

export interface SchemaField {
  name: string;
  /** Postgres column name (`@map` or the field name). */
  column: string;
  /** Type name without `?` / `[]`; `Unsupported(...)` is kept verbatim. */
  type: string;
  optional: boolean;
  list: boolean;
  /** True when the type is another model (a virtual relation field, no column). */
  isRelation: boolean;
  /** The `@relation(...)` / attribute text after the type. */
  attributes: string;
  doc: string;
  line: number;
}

export interface SchemaModel {
  name: string;
  /** Postgres table name (`@@map` or the model name). */
  table: string;
  module: string;
  file: string;
  doc: string;
  line: number;
  fields: SchemaField[];
  blockAttributes: string[];
}

export interface SchemaEnum {
  name: string;
  /** Postgres type name (`@@map` or the enum name). */
  dbName: string;
  module: string;
  file: string;
  doc: string;
  line: number;
  values: string[];
}

export interface SchemaModule {
  name: string;
  file: string;
  /** Leading `//` comment block of the file (module header). */
  header: string;
  /** Owner agent from the header line `Owner: A0x`. */
  owner: string | undefined;
}

export interface SchemaModelSet {
  modules: SchemaModule[];
  models: SchemaModel[];
  enums: SchemaEnum[];
}

/** Files that hold generator/datasource only; they are not a module. */
const NON_MODULE_FILES = new Set(['_base']);

const FIELD_RE = /^(\w+)\s+(Unsupported\("[^"]*"\)|\w+)(\[\])?(\?)?\s*(.*)$/;
const MAP_RE = /@map\("([^"]+)"\)/;
const BLOCK_MAP_RE = /^@@map\("([^"]+)"\)/;

export function readSchemaDir(dir: string): SchemaModelSet {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.prisma'))
    .sort();
  const set: SchemaModelSet = { modules: [], models: [], enums: [] };
  for (const file of files) parseFile(join(dir, file), readFileSync(join(dir, file), 'utf8'), set);
  const modelNames = new Set(set.models.map((m) => m.name));
  for (const model of set.models) {
    for (const field of model.fields) field.isRelation = modelNames.has(field.type);
  }
  return set;
}

export function parseFile(path: string, text: string, set: SchemaModelSet): void {
  const moduleName = basename(path, '.prisma');
  const lines = text.split(/\r?\n/);
  const isModule = !NON_MODULE_FILES.has(moduleName);

  const headerLines: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('//') && !line.startsWith('///'))
      headerLines.push(line.replace(/^\/\/\s?/, ''));
    else break;
  }
  const header = headerLines.join('\n');
  if (isModule) {
    set.modules.push({
      name: moduleName,
      file: path,
      header,
      owner: /Owner:\s*(A\d\d)/.exec(header)?.[1],
    });
  }

  let pendingDoc: string[] = [];
  let current:
    | { kind: 'model'; model: SchemaModel }
    | { kind: 'enum'; enumDef: SchemaEnum }
    | { kind: 'other' }
    | undefined;

  lines.forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.trim();
    if (line.startsWith('///')) {
      pendingDoc.push(line.replace(/^\/\/\/\s?/, ''));
      return;
    }
    if (line === '' || line.startsWith('//')) {
      if (current === undefined) pendingDoc = [];
      return;
    }
    const doc = pendingDoc.join(' ').trim();
    pendingDoc = [];

    if (current === undefined) {
      const block = /^(model|enum|generator|datasource|view|type)\s+(\w+)\s*\{$/.exec(line);
      if (!block) throw new Error(`${path}:${lineNo}: unexpected top-level line: ${line}`);
      const [, kind, name] = block as unknown as [string, string, string];
      if (kind === 'model') {
        if (!isModule) throw new Error(`${path}:${lineNo}: models must live in a module file`);
        current = {
          kind: 'model',
          model: {
            name,
            table: name,
            module: moduleName,
            file: path,
            doc,
            line: lineNo,
            fields: [],
            blockAttributes: [],
          },
        };
      } else if (kind === 'enum') {
        current = {
          kind: 'enum',
          enumDef: {
            name,
            dbName: name,
            module: moduleName,
            file: path,
            doc,
            line: lineNo,
            values: [],
          },
        };
      } else if (kind === 'generator' || kind === 'datasource') {
        current = { kind: 'other' };
      } else {
        throw new Error(`${path}:${lineNo}: unsupported block "${kind}"`);
      }
      return;
    }

    if (line === '}') {
      if (current.kind === 'model') set.models.push(current.model);
      if (current.kind === 'enum') set.enums.push(current.enumDef);
      current = undefined;
      return;
    }

    if (current.kind === 'other') return;

    if (line.startsWith('@@')) {
      const mapped = BLOCK_MAP_RE.exec(line)?.[1];
      if (current.kind === 'model') {
        current.model.blockAttributes.push(line);
        if (mapped) current.model.table = mapped;
      } else if (mapped) {
        current.enumDef.dbName = mapped;
      }
      return;
    }

    if (current.kind === 'enum') {
      const value = /^(\w+)(\s+@map\("[^"]+"\))?$/.exec(line);
      if (!value) throw new Error(`${path}:${lineNo}: cannot read enum value: ${line}`);
      current.enumDef.values.push(value[1] as string);
      return;
    }

    const field = FIELD_RE.exec(line);
    if (!field) throw new Error(`${path}:${lineNo}: cannot read field: ${line}`);
    const [, name, type, list, optional, attributes] = field as unknown as [
      string,
      string,
      string,
      string | undefined,
      string | undefined,
      string,
    ];
    current.model.fields.push({
      name,
      column: MAP_RE.exec(attributes)?.[1] ?? name,
      type,
      optional: optional === '?',
      list: list === '[]',
      isRelation: false,
      attributes,
      doc,
      line: lineNo,
    });
  });

  if (current !== undefined) throw new Error(`${path}: unterminated block at end of file`);
}

/** Scalar fields = real columns (relation fields are virtual). */
export function columnsOf(model: SchemaModel): SchemaField[] {
  return model.fields.filter((f) => !f.isRelation);
}

/**
 * T2.3 acceptance (IMPL §6): "Every table/column has a comment citing BP §" — plus the module,
 * money and append-only rules of the schema (DATA-001, DATA-004, INFRA-001, LEDGER-005, PAY-003).
 * Runs without a database; the DB-level checks live in prisma/tests-db (pnpm test:db).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APPEND_ONLY_TABLES,
  DELETE_ALLOWED_TABLES,
  FROZEN_TABLES,
  NON_APP_TABLES,
  OWNER_MAINTAINED_TABLES,
} from '../append-only.ts';
import { checkCitation, loadIdRegistry } from '../citations.ts';
import { buildCommentStatements, parseCommentStatements, renderCommentSql } from '../comments.ts';
import {
  API_ROOT,
  INIT_MIGRATION,
  MIGRATIONS_DIR,
  SCHEMA_DIR,
  SQL_AFTER_DDL,
  SQL_DIR,
  commentsInMigrations,
} from '../db-schema.ts';
import { columnsOf, parseFile, readSchemaDir, type SchemaModelSet } from '../schema-model.ts';

const REPO_ROOT = join(API_ROOT, '..', '..');
const schema = readSchemaDir(SCHEMA_DIR);
const registry = loadIdRegistry(REPO_ROOT);
const initSql = readFileSync(join(MIGRATIONS_DIR, INIT_MIGRATION, 'migration.sql'), 'utf8');

/** ARCH §4 modules that own tables in schema v1, plus `platform` (M18 audit, outbox, idempotency). */
const EXPECTED_MODULES = [
  'availability',
  'booking',
  'catalog',
  'chat',
  'config',
  'identity',
  'intake',
  'location',
  'matching',
  'media',
  'notifications',
  'payments',
  'platform',
  'profiles',
  'quotes',
  'reviews',
  'support',
  'trust',
];

function everyDoc(set: SchemaModelSet): { where: string; doc: string }[] {
  return [
    ...set.models.flatMap((m) => [
      { where: `model ${m.name} (${m.file}:${m.line})`, doc: m.doc },
      ...m.fields.map((f) => ({
        where: `field ${m.name}.${f.name} (${m.file}:${f.line})`,
        doc: f.doc,
      })),
    ]),
    ...set.enums.map((e) => ({ where: `enum ${e.name} (${e.file}:${e.line})`, doc: e.doc })),
  ];
}

describe('schema citations', () => {
  it('[DATA-001] every model, field and enum has a /// doc citing BP §n, D-xxx or a requirement ID', () => {
    const uncited = everyDoc(schema)
      .filter(({ doc }) => !checkCitation(doc, registry).cited)
      .map(({ where }) => where);
    expect(uncited, `uncited:\n${uncited.join('\n')}`).toEqual([]);
  });

  it('[DATA-001] every D-xxx, OQ-xxx and requirement ID used in a doc exists', () => {
    const unknown = everyDoc(schema).flatMap(({ where, doc }) =>
      checkCitation(doc, registry).unknownIds.map((id) => `${where}: ${id}`),
    );
    expect(unknown, `unknown IDs:\n${unknown.join('\n')}`).toEqual([]);
  });

  it('[DATA-001] the citation rule rejects ARCH-only or empty docs and invented IDs', () => {
    expect(checkCitation('', registry).cited).toBe(false);
    expect(checkCitation('Technical field (ARCH §5).', registry).cited).toBe(false);
    expect(checkCitation('See OQ-009.', registry).cited).toBe(false);
    expect(checkCitation('Booking (BP §25).', registry).cited).toBe(true);
    expect(checkCitation('Crew size (D-004).', registry).cited).toBe(true);
    expect(checkCitation('Status (BOOK-STATUS-017).', registry).cited).toBe(true);
    expect(checkCitation('Made up (D-999; FOO-BAR-123).', registry)).toEqual({
      cited: false,
      unknownIds: ['D-999', 'FOO-BAR-123'],
    });
  });
});

describe('schema modules', () => {
  it('[INFRA-001] one file per ARCH §4 module, each with a header naming the module and its owner agent', () => {
    expect(schema.modules.map((m) => m.name).sort()).toEqual(EXPECTED_MODULES);
    for (const module of schema.modules) {
      expect(module.header, module.file).toMatch(new RegExp(`Module M\\d+ ${module.name}\\b`));
      expect(module.owner, `${module.file} header needs "Owner: A0x"`).toMatch(/^A\d\d$/);
      expect(module.header, module.file).toMatch(/ARCH §4/);
    }
  });

  it('[INFRA-001] relations (FK constraints) only connect models of the same module', () => {
    const moduleOf = new Map(schema.models.map((m) => [m.name, m.module]));
    const crossing = schema.models.flatMap((m) =>
      m.fields
        .filter((f) => f.isRelation && moduleOf.get(f.type) !== m.module)
        .map((f) => `${m.module}.${m.name}.${f.name} -> ${moduleOf.get(f.type)}.${f.type}`),
    );
    expect(crossing).toEqual([]);
  });

  it('[DATA-001] covers the BP §25 / §66 entities and skips the not-launch Promotion', () => {
    const models = new Set(schema.models.map((m) => m.name));
    for (const entity of [
      'User',
      'CustomerProfile',
      'ProviderProfile',
      'AdminUser',
      'Address',
      'Category',
      'Service',
      'ServiceArea',
      'AvailabilityRule',
      'Booking',
      'Quote',
      'JobEvent',
      'Payment',
      'Settlement',
      'Review',
      'Conversation',
      'Message',
      'SupportTicket',
      'Dispute',
      'Refund',
      'Notification',
      'AuditLog',
      'DeviceSession',
      'VerificationRecord',
      'CustomerRequest',
      'MatchCandidate',
      'FareLine',
      'SupplierBadge',
      'Favorite',
      'LocationSnapshot',
      'AiInteraction',
      'MarketplaceEvent',
      'MediaObject',
      'ConfigRule',
      'NotificationPreference',
      'City',
      'ServiceZone',
      'IdempotencyKey',
      'OutboxEvent',
      'ProviderLedgerEntry',
      'CommissionPaymentSubmission',
    ]) {
      expect(models.has(entity), entity).toBe(true);
    }
    expect(models.has('Promotion')).toBe(false);
  });

  it('[BOOK-STATUS-017] booking status enum has the 15 BP §15 statuses plus REJECTED and NO_SHOW', () => {
    const status = schema.enums.find((e) => e.name === 'BookingStatus');
    expect(status?.values).toHaveLength(17);
    expect(status?.values).toEqual(
      expect.arrayContaining(['QUOTE_PENDING', 'REJECTED', 'NO_SHOW', 'CLOSED']),
    );
  });

  it('[PROV-CREW-001] quote.crew_size is required and booking.crew_size exists (D-004)', () => {
    const quote = schema.models.find((m) => m.name === 'Quote');
    const booking = schema.models.find((m) => m.name === 'Booking');
    expect(quote?.fields.find((f) => f.name === 'crewSize')).toMatchObject({
      type: 'Int',
      optional: false,
    });
    expect(booking?.fields.find((f) => f.name === 'crewSize')).toMatchObject({ type: 'Int' });
    expect(initSql).toMatch(/"quote_crew_size_positive" CHECK \("crew_size" >= 1\)/);
  });

  it('[DATA-001] money is BigInt minor units; no floating-point column exists', () => {
    const fields = schema.models.flatMap((m) => columnsOf(m).map((f) => ({ m, f })));
    const floats = fields
      .filter(({ f }) => f.type === 'Float')
      .map(({ m, f }) => `${m.name}.${f.name}`);
    expect(floats).toEqual([]);
    const money = fields.filter(({ f }) => /Minor$/.test(f.name));
    expect(money.length).toBeGreaterThan(10);
    for (const { m, f } of money) expect(f.type, `${m.name}.${f.name}`).toBe('BigInt');
  });
});

describe('COMMENT ON generation', () => {
  it('[DATA-001] the migrations carry exactly the generated comment for every table, column and enum', () => {
    const wanted = new Map(buildCommentStatements(schema).map((s) => [s.key, s.text]));
    const actual = commentsInMigrations();
    const missingOrStale = [...wanted]
      .filter(([key, text]) => actual.get(key) !== text)
      .map(([key]) => key);
    const orphaned = [...actual.keys()].filter((key) => !wanted.has(key));
    expect(missingOrStale, 'run: node prisma/tools/db-schema.ts comments').toEqual([]);
    expect(orphaned).toEqual([]);
    const tables = schema.models.length;
    const columns = schema.models.reduce((n, m) => n + columnsOf(m).length, 0);
    expect(wanted.size).toBe(tables + columns + schema.enums.length);
  });

  it('[DATA-001] table comments name the owning module and agent', () => {
    const booking = buildCommentStatements(schema).find((s) => s.key === 'TABLE booking');
    expect(booking?.text).toMatch(/^\[module booking, owner A04\] .*BP §25/);
  });

  it('[DATA-001] quoting round-trips apostrophes and double quotes', () => {
    const set: SchemaModelSet = { modules: [], models: [], enums: [] };
    parseFile(
      'x/demo.prisma',
      [
        '// Module M0 demo. Owner: A01. ARCH §4',
        '/// It\'s a "demo" (BP §25).',
        'model Demo {',
        "  /// Customer's id (BP §25).",
        '  id String @id @map("demo_id")',
        '  @@map("demo_table")',
        '}',
      ].join('\n'),
      set,
    );
    const sql = renderCommentSql(buildCommentStatements(set));
    expect(sql).toContain(
      `COMMENT ON COLUMN "demo_table"."demo_id" IS 'Customer''s id (BP §25).';`,
    );
    expect(parseCommentStatements(sql).get('TABLE demo_table')).toBe(
      `[module demo, owner A01] It's a "demo" (BP §25).`,
    );
  });
});

describe('privileges and integrity SQL (BP §26, §29)', () => {
  const privilegesSql = readFileSync(join(SQL_DIR, '20_privileges.sql'), 'utf8');
  const integritySql = readFileSync(join(SQL_DIR, '30_integrity.sql'), 'utf8');
  const tables = new Set(schema.models.map((m) => m.table));
  const quoted = (block: string, quote: string) =>
    [...block.matchAll(new RegExp(`${quote}([a-z_]+)${quote}`, 'g'))].map((m) => m[1]).sort();

  it('[DATA-004] every listed table exists in the schema', () => {
    for (const table of [
      ...APPEND_ONLY_TABLES,
      ...DELETE_ALLOWED_TABLES,
      ...FROZEN_TABLES.map((f) => f[0]),
      ...OWNER_MAINTAINED_TABLES,
    ]) {
      expect(tables.has(table), table).toBe(true);
    }
    for (const table of DELETE_ALLOWED_TABLES) {
      expect(APPEND_ONLY_TABLES as readonly string[], table).not.toContain(table);
    }
  });

  it('[DATA-004] every model documented as append-only is in APPEND_ONLY_TABLES and vice versa', () => {
    const documented = schema.models
      .filter((m) => /\bappend-only\b/i.test(m.doc))
      .map((m) => m.table);
    expect(documented.sort()).toEqual([...APPEND_ONLY_TABLES].sort());
  });

  it('[LEDGER-005] UPDATE is granted to every table except exactly the append-only and non-app tables', () => {
    const block = /-- kk:append-only([\s\S]*?)-- kk:non-app([\s\S]*?)\)/.exec(privilegesSql);
    expect(quoted(block?.[1] ?? '', "'")).toEqual([...APPEND_ONLY_TABLES].sort());
    expect(quoted(block?.[2] ?? '', "'")).toEqual([...NON_APP_TABLES].sort());
  });

  it('[DATA-003] DELETE is granted only to the allow-list; default privileges never include UPDATE/DELETE', () => {
    const block = /GRANT DELETE ON TABLE([\s\S]*?)TO kaamkaro_app;/.exec(privilegesSql)?.[1] ?? '';
    expect(quoted(block, '"')).toEqual([...DELETE_ALLOWED_TABLES].sort());
    expect(privilegesSql.match(/GRANT DELETE/g)).toHaveLength(1);
    expect(privilegesSql).toContain(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT ON TABLES TO kaamkaro_app;',
    );
    expect(privilegesSql).toMatch(/REVOKE ALL ON ALL TABLES IN SCHEMA public FROM kaamkaro_app;/);
    expect(privilegesSql).toContain('REVOKE CREATE ON SCHEMA public FROM PUBLIC;');
    expect(
      readFileSync(join(API_ROOT, '..', '..', 'infra', 'db', 'bootstrap.sql'), 'utf8'),
    ).toContain('REVOKE CREATE ON SCHEMA public FROM PUBLIC;');
  });

  it('[PAY-003] row + truncate triggers exist for exactly the append-only tables', () => {
    const rows = [
      ...integritySql.matchAll(
        /CREATE TRIGGER kk_append_only_row BEFORE UPDATE OR DELETE ON "(\w+)" FOR EACH ROW/g,
      ),
    ].map((m) => m[1]);
    const truncates = [
      ...integritySql.matchAll(
        /CREATE TRIGGER kk_append_only_truncate BEFORE TRUNCATE ON "(\w+)" FOR EACH STATEMENT/g,
      ),
    ].map((m) => m[1]);
    expect(rows.sort()).toEqual([...APPEND_ONLY_TABLES].sort());
    expect(truncates.sort()).toEqual([...APPEND_ONLY_TABLES].sort());
  });

  it('[LEDGER-PAY-004] decision-freeze triggers match FROZEN_TABLES exactly', () => {
    const found = [
      ...integritySql.matchAll(
        /CREATE TRIGGER kk_freeze BEFORE UPDATE ON "(\w+)" FOR EACH ROW EXECUTE FUNCTION kk_freeze_after_decision\('([^']*)', '([^']*)', '([^']*)'\);/g,
      ),
    ].map((m) => [m[1], m[2], m[3], m[4]]);
    expect(found).toEqual(FROZEN_TABLES.map((f) => [...f]));
    const columnsByTable = new Map(
      schema.models.map((m) => [m.table, new Set(columnsOf(m).map((f) => f.column))]),
    );
    for (const [table, decision, , immutable] of FROZEN_TABLES) {
      const columns = columnsByTable.get(table);
      for (const column of [decision, ...immutable.split(',')].filter(Boolean)) {
        expect(columns?.has(column), `${table}.${column}`).toBe(true);
      }
    }
  });

  it('[DATA-004] every kk_* function pins its search_path', () => {
    const functions = [
      ...integritySql.matchAll(
        /CREATE OR REPLACE FUNCTION (kk_\w+)\(\) RETURNS trigger\nLANGUAGE plpgsql SET search_path = pg_catalog, public AS/g,
      ),
    ];
    const all = integritySql.match(/CREATE OR REPLACE FUNCTION/g) ?? [];
    expect(functions.length).toBe(all.length);
    expect(functions.length).toBeGreaterThanOrEqual(6);
  });

  it('[PAY-003] append-only tables have no updated_at/version/deleted_at column', () => {
    for (const table of APPEND_ONLY_TABLES) {
      const model = schema.models.find((m) => m.table === table);
      const columns = columnsOf(model!).map((f) => f.column);
      expect(columns, table).not.toContain('updated_at');
      expect(columns, table).not.toContain('version');
      expect(columns, table).not.toContain('deleted_at');
    }
  });

  it('[CFG-RULE-003] the config-policy migration embeds sql/40_config_policy.sql unchanged (SEC-REVIEW-T2.6 #2, #3)', () => {
    const fragment = readFileSync(join(SQL_DIR, '40_config_policy.sql'), 'utf8').replace(
      /\r\n/g,
      '\n',
    );
    const migration = readFileSync(
      join(MIGRATIONS_DIR, '20261024000000_config_policy_zone_code', 'migration.sql'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(migration).toContain(fragment);
    const functions = fragment.match(/CREATE OR REPLACE FUNCTION/g) ?? [];
    const pinned = fragment.match(/SET search_path = pg_catalog, public AS/g) ?? [];
    expect(pinned.length).toBe(functions.length);
    expect(fragment).toContain(
      'CREATE TRIGGER kk_config_rule_guard BEFORE INSERT ON "config_rule" FOR EACH ROW',
    );
    for (const table of OWNER_MAINTAINED_TABLES) {
      expect(fragment).toContain(`REVOKE ALL ON TABLE "${table}" FROM kaamkaro_app;`);
      expect(fragment).toContain(`GRANT SELECT ON TABLE "${table}" TO kaamkaro_app;`);
    }
  });

  it('[DATA-004] the init migration contains every sql/ fragment unchanged', () => {
    for (const file of ['00_extensions.sql', ...SQL_AFTER_DDL]) {
      expect(initSql, file).toContain(
        readFileSync(join(SQL_DIR, file), 'utf8').replace(/\r\n/g, '\n'),
      );
    }
    expect(initSql).toContain('CREATE EXTENSION IF NOT EXISTS postgis;');
  });

  it('[UX-SCREEN-001] booking has a unique, random (non-sequential) booking number (BP §12 C15)', () => {
    const booking = schema.models.find((m) => m.name === 'Booking');
    const field = booking?.fields.find((f) => f.name === 'bookingNumber');
    expect(field?.attributes).toMatch(/@unique/);
    expect(field?.attributes).toMatch(/gen_random_uuid/);
  });
});

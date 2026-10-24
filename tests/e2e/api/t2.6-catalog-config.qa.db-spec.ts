/**
 * A16 QA probes for T2.6 (catalog seed, cities, ConfigRule store) on a FRESH, migrated and seeded
 * PostgreSQL + PostGIS database, run as the non-owner API login (kaamkaro_api).
 * Independent of A03's prisma/seed/__tests__: the expected values come straight from
 * docs/BLUEPRINT.md §63, §1.4, §65 and coordination/DECISIONS.md, never from the seed data files.
 *
 * Requirements: SCOPE-CAT-001, SCOPE-CAT-002, SCOPE-GEO-001, SCOPE-GEO-002, CFG-RULE-001,
 * CFG-RULE-003, OPS-ADMIN-023, SEC-BASE-010, I18N-006 (BP §1.4, §6, §26, §42, §57.2, §63, §64, §65;
 * D-006, D-007, D-014, D-015, D-017, D-019, D-020, D-023, D-024, D-025, D-029; OQ-076, OQ-078).
 *
 * Run (not part of the turbo pipeline; tests/e2e has no runner yet), from services/api:
 *   DATABASE_URL=<kaamkaro_api on a fresh migrated + seeded DB> \
 *   pnpm exec vitest run --config ../../tests/e2e/api/vitest.qa-db.config.mts t2.6-catalog-config
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { CachedConfigService } from '@kaamkaro/platform';
import { PrismaClient } from '../../../services/api/src/generated/prisma/client.js';
import {
  CatalogService,
  PlatformAuditPort,
  PrismaCatalogRepository,
} from '../../../services/api/src/modules/catalog/index';
import {
  ConfigAdminService,
  PrismaConfigRuleStore,
} from '../../../services/api/src/modules/config/index';
import { AuditWriter } from '../../../services/api/src/platform/audit.writer';
import type { PrismaService } from '../../../services/api/src/platform/prisma.service';

const repoFile = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(`../../../${rel}`, import.meta.url)), 'utf8');

const appUrl = process.env['DATABASE_URL'];
if (!appUrl) throw new Error('needs DATABASE_URL (the API login, kaamkaro_api)');
if (!/\/\/kaamkaro_api[:@]/.test(appUrl)) throw new Error('DATABASE_URL must be kaamkaro_api');
if (/\/kaamkaro_dev\?/.test(appUrl)) throw new Error('never run QA probes on kaamkaro_dev');

const requireFromApi = createRequire(
  fileURLToPath(new URL('../../../services/api/package.json', import.meta.url)),
);
const { PrismaPg } = requireFromApi('@prisma/adapter-pg') as {
  PrismaPg: new (o: { connectionString: string }) => never;
};
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: appUrl }) });
afterAll(() => db.$disconnect());

/** Independent BP §63 parse: section text between `# 63.` and `# 64.`, split on `## ` headings. */
function bp63(): Map<string, string[]> {
  const text = repoFile('docs/BLUEPRINT.md');
  const section = text.slice(text.indexOf('\n# 63. '), text.indexOf('\n# 64. '));
  const families = new Map<string, string[]>();
  for (const chunk of section.split(/\r?\n## /).slice(1)) {
    const [heading = '', ...rest] = chunk.split(/\r?\n/);
    families.set(
      heading.trim(),
      rest.filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim()),
    );
  }
  return families;
}

/** D-024 family names from the DECISIONS.md row (BP §63 names without commas). */
function d024Families(): string[] {
  const row = repoFile('coordination/DECISIONS.md')
    .split(/\r?\n/)
    .find((l) => l.startsWith('| D-024 '));
  const list = /\(BP §63 families: ([^)]+)\)/.exec(row ?? '')?.[1] ?? '';
  return list.split(', ').map((s) => s.trim());
}

const noComma = (s: string) => s.replace(/,/g, '');

describe('T2.6 acceptance on the seeded DB (A16)', () => {
  it('[SCOPE-CAT-001] DB families and services equal BP §63 exactly (22 / 351, per family)', async () => {
    const bp = bp63();
    expect(bp.size).toBe(22);
    expect([...bp.values()].reduce((n, v) => n + v.length, 0)).toBe(351);
    const cats = await db.category.findMany({
      select: { nameEn: true, parentId: true, services: { select: { nameEn: true } } },
    });
    expect(cats.every((c) => c.parentId === null)).toBe(true);
    expect(cats.map((c) => c.nameEn).sort()).toEqual([...bp.keys()].sort());
    for (const c of cats) {
      expect(c.services.map((s) => s.nameEn).sort(), c.nameEn).toEqual(
        [...(bp.get(c.nameEn) ?? [])].sort(),
      );
    }
    expect(await db.service.count()).toBe(351);
  });

  it('[SCOPE-CAT-001] no BP §1.4 / §63-intro / §65 excluded area is seeded', async () => {
    const excluded =
      /\b(medical|medicine|doctors?|nurs\w*|pharmac\w*|clinic\w*|health\w*|hospital|lawyers?|legal (advice|representation|services?)|financial|loans?|insurance|invest\w*|child ?care|elder ?care|recruit\w*|employment|government|procurement|structural|certification|engineering|tutor\w*|education|beauty|salon|wellness|psycholog\w*|therap\w*|business services?|professional services?|event services?|pet care)\b/i;
    const names = [
      ...(await db.category.findMany({ select: { nameEn: true } })),
      ...(await db.service.findMany({ select: { nameEn: true } })),
    ].map((r) => r.nameEn);
    expect(names.filter((n) => excluded.test(n))).toEqual([]);
  });

  it('[I18N-006] every city, zone, family and service has a distinct Urdu-script name', async () => {
    const urdu = /^[^a-zA-Z]*[؀-ۿ]/;
    const rows = [
      ...(await db.city.findMany({ select: { nameEn: true, nameUr: true } })),
      ...(await db.serviceZone.findMany({ select: { nameEn: true, nameUr: true } })),
      ...(await db.category.findMany({ select: { nameEn: true, nameUr: true } })),
      ...(await db.service.findMany({ select: { nameEn: true, nameUr: true } })),
    ];
    expect(rows.length).toBe(1 + 1 + 22 + 351);
    expect(rows.filter((r) => !r.nameUr || !urdu.test(r.nameUr) || r.nameUr === r.nameEn)).toEqual(
      [],
    );
  });

  it('[SCOPE-GEO-002] only Lahore is active (D-007) with one active whole-city zone (D-019)', async () => {
    const active = await db.city.findMany({ where: { isActive: true }, select: { code: true } });
    expect(active.map((c) => c.code)).toEqual(['lahore']);
    const zones = await db.$queryRaw<{ is_active: boolean; whole: boolean }[]>`
      SELECT z.is_active, z.area IS NULL AS whole FROM service_zone z JOIN city c ON c.id = z.city_id
      WHERE c.code = 'lahore'`;
    expect(zones).toEqual([{ is_active: true, whole: true }]);
  });

  it('[SCOPE-CAT-002] exactly the D-024 families are active, only in Lahore, and nothing else', async () => {
    const d024 = d024Families();
    expect(d024).toHaveLength(10);
    const rows = await db.catalogActivation.findMany({
      select: {
        isActive: true,
        serviceId: true,
        city: { select: { code: true } },
        category: { select: { nameEn: true } },
      },
    });
    expect(rows.filter((r) => r.serviceId !== null)).toEqual([]);
    const active = rows.filter((r) => r.isActive);
    expect(active.every((r) => r.city.code === 'lahore')).toBe(true);
    expect(active.map((r) => noComma(r.category?.nameEn ?? '')).sort()).toEqual([...d024].sort());
    expect(rows.filter((r) => !r.isActive)).toHaveLength(12);
  });
});

describe('Owner-decided config seeds on the DB (A16)', () => {
  const decided: Record<string, unknown> = {
    'commission.rate': 0.3, // D-006
    'commission.base_line_types': ['LABOR'], // D-015
    'ledger.max_negative_balance': 0, // D-020
    'rating.block_threshold': 2, // D-014 / D-017 (2.0)
    'rating.warnings_before_block': 2, // D-014 / D-017
    'fees.customer_platform_fee': { enabled: false, amountMinor: 0 }, // D-025
    'tax.line_shown': true, // D-029
  };
  const cited: Record<string, unknown> = {
    'fare.emergency_exception_enabled': false, // FARE-013, K-10
    'payments.customer_cash_claim_enabled': true, // OQ-077 default
    'catalog.pricing_units': ['job', 'hour', 'room', 'appliance', 'meter', 'item', 'vehicle'], // BP §4.2
  };

  it('[CFG-RULE-003] decided values exact; D-023 fees and tax.rules null; everything else null', async () => {
    const rows = await db.configRule.findMany({
      where: { scope: 'GLOBAL' },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value ?? null]));
    for (const [key, value] of Object.entries({ ...decided, ...cited })) {
      expect(byKey.get(key), key).toEqual(value);
    }
    for (const key of [
      'fees.late_cancellation_fee_minor',
      'fees.customer_no_show_fee_minor',
      'fees.declined_quote_inspection_fee_minor',
      'tax.rules',
    ]) {
      expect(byKey.has(key), key).toBe(true);
      expect(byKey.get(key), key).toBeNull();
    }
    const nonNull = rows.filter((r) => r.value !== null).map((r) => r.key);
    expect(nonNull.sort()).toEqual(Object.keys({ ...decided, ...cited }).sort());
  });

  it('[CFG-RULE-003] the API login cannot UPDATE, DELETE or TRUNCATE config_rule (append-only)', async () => {
    for (const sql of [
      `UPDATE config_rule SET value = '0.5' WHERE key = 'commission.rate'`,
      `DELETE FROM config_rule WHERE key = 'commission.rate'`,
      `TRUNCATE config_rule`,
    ]) {
      const result = await db.$executeRawUnsafe(sql).catch((e: unknown) => String(e));
      expect(result, sql).toMatch(/permission denied for table config_rule/);
    }
  });
});

describe('ConfigAdminService on the real store + audit writer (A16)', () => {
  const audit = new PlatformAuditPort(new AuditWriter(db as unknown as PrismaService));
  const store = new PrismaConfigRuleStore(db, audit);
  const catalog = new CatalogService(new PrismaCatalogRepository(db, audit));
  const invalidated: string[] = [];
  const reader = new CachedConfigService(store, { cacheTtlMs: 30_000 });
  const origInvalidate = reader.invalidate.bind(reader);
  reader.invalidate = (k: string) => {
    invalidated.push(k);
    origInvalidate(k);
  };
  const staff = { subRolesOf: () => Promise.resolve(['SUPER_ADMIN' as const]) };
  const admin = new ConfigAdminService(store, reader, catalog, staff);
  const base = { scope: 'GLOBAL' as const, scopeRefId: null, actorUserId: randomUUID() };

  it('[CFG-RULE-003] refusals write no row and no audit (403 decided, 409 OQ-076, 422 back-dated / no reason)', async () => {
    const reason = `A16 T2.6 refusal ${randomUUID()}`;
    const before = await db.configRule.count();
    const cases: Array<[Parameters<ConfigAdminService['setRule']>[0], string, number]> = [
      [{ ...base, key: 'commission.rate', value: 0.25, reason }, 'OWNER_DECIDED_READ_ONLY', 403],
      [
        { ...base, key: 'rating.block_threshold', value: 1, reason },
        'OWNER_DECIDED_READ_ONLY',
        403,
      ],
      [
        { ...base, key: 'fees.late_cancellation_fee_minor', value: 100, reason },
        'OWNER_DECIDED_READ_ONLY',
        403,
      ],
      [
        { ...base, key: 'payments.company_account', value: { iban: 'x' }, reason },
        'APPROVAL_FLOW_REQUIRED',
        409,
      ],
      [
        {
          ...base,
          key: 'price.min_total_minor',
          value: 1,
          reason,
          effectiveFrom: new Date(Date.now() - 60_000),
        },
        'BACKDATED_EFFECTIVE_FROM',
        422,
      ],
      [{ ...base, key: 'price.min_total_minor', value: 1, reason: '' }, 'REASON_REQUIRED', 422],
    ];
    for (const [cmd, code, status] of cases) {
      await expect(admin.setRule(cmd), cmd.key).rejects.toMatchObject({ code, httpStatus: status });
    }
    expect(await db.configRule.count()).toBe(before);
    expect(await db.auditLog.count({ where: { reason } })).toBe(0);
    expect(invalidated).toEqual([]);
  });

  it('[SEC-BASE-010] an accepted write appends one version + one audit row and invalidates the cache', async () => {
    const lahore = await db.city.findUniqueOrThrow({ where: { code: 'lahore' } });
    const reason = `A16 T2.6 write ${randomUUID()}`;
    // A null (unset) CITY row effective immediately (future scheduling requires config.max_schedule_ahead_hours per SEC-REVIEW-T2.6 #9).
    const stored = await admin.setRule({
      ...base,
      key: 'availability.max_service_radius_m',
      scope: 'CITY',
      scopeRefId: lahore.id,
      value: null,
      reason,
    });
    expect(stored).toMatchObject({ scope: 'CITY', scopeRefId: lahore.id, value: null });
    const logs = await db.auditLog.findMany({ where: { reason } });
    expect(logs.map((l) => [l.action, l.objectType, l.objectId, l.actorRole])).toEqual([
      ['CONFIG_RULE_SET', 'config_rule', stored.id, 'ADMIN'],
    ]);
    expect(invalidated).toEqual(['availability.max_service_radius_m']);
  });
});

// Leaves one service-level row (Ant treatment, Lahore, inactive) behind: run on a throwaway DB and
// remove it as the owner afterwards (DELETE FROM catalog_activation WHERE service_id IS NOT NULL).
describe('Service-level activation inside an inactive family (A16 defect probe)', () => {
  it('[CFG-RULE-001] a service "activate" that is reported saved must make the service available (BP §64)', async () => {
    const audit = new PlatformAuditPort(new AuditWriter(db as unknown as PrismaService));
    const catalog = new CatalogService(new PrismaCatalogRepository(db, audit));
    const lahore = await db.city.findUniqueOrThrow({ where: { code: 'lahore' } });
    const ant = await db.service.findUniqueOrThrow({
      where: { code: 'pest_control.ant_treatment' },
    });
    const cmd = { cityId: lahore.id, serviceId: ant.id, actorUserId: randomUUID() };
    let saved: { isActive: boolean } | undefined;
    let refused = false;
    try {
      saved = await catalog.setServiceActive({ ...cmd, isActive: true, reason: 'A16 probe on' });
    } catch {
      refused = true;
    }
    const availability = await catalog.availability(lahore.id, ant.id);
    if (saved) {
      await catalog.setServiceActive({ ...cmd, isActive: false, reason: 'A16 probe off' });
    }
    // Either the server refuses (family inactive) or the reported success is real.
    expect(
      refused || (saved?.isActive === true && availability.available),
      `saved=${JSON.stringify(saved)} availability=${JSON.stringify(availability)}`,
    ).toBe(true);
  });
});

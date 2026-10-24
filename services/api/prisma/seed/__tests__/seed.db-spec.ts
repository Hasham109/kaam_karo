/**
 * T2.6 seeded-database tests (real PostgreSQL + PostGIS, run through the API login kaamkaro_api).
 * SCOPE-CAT-001/002, SCOPE-GEO-001/002, CFG-RULE-001…003 (BP §26, §42, §57.2, §63, §64;
 * D-006, D-007, D-015, D-019, D-020, D-024; SEC-REVIEW-T2.3 #8).
 * Writes run inside transactions that are rolled back (config_rule is append-only).
 */
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { CachedConfigService, configParsers } from '@kaamkaro/platform';
import { afterAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '../../../src/generated/prisma/client.js';
import {
  type AdminSubRoleName,
  CatalogService,
  DenyAllStaffRoleLookup,
  PlatformAuditPort,
  PrismaCatalogRepository,
} from '../../../src/modules/catalog/index.ts';
import { AuditWriter, type PrismaService } from '../../../src/platform/index.ts';
import {
  FAIL_CLOSED_KEYS,
  missingFailClosedKeys,
  PrismaConfigRuleStore,
} from '../../../src/modules/config/index.ts';
import { CATALOG_FAMILIES } from '../catalog.data.ts';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONFIG_SEEDS } from '../config.seed.ts';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl) throw new Error('seed db tests need DATABASE_URL (the API login)');
if (appUrl === ownerUrl) throw new Error('DATABASE_URL must be the non-owner API login');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: appUrl }) });
afterAll(() => db.$disconnect());

class Rollback extends Error {}
const noAudit = { record: () => Promise.resolve() };
const superAdmin = {
  subRolesOf: (): Promise<readonly AdminSubRoleName[]> => Promise.resolve(['SUPER_ADMIN']),
};
const API_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const actorRef = { changedByUserId: randomUUID() };
const LAUNCH = CATALOG_FAMILIES.filter((f) => f.launchFamily).map((f) => f.code);

describe('Seeded catalog (DB)', () => {
  it('[SCOPE-CAT-001] service count equals BP §63 items; 22 top-level families', async () => {
    expect(await db.service.count()).toBe(351);
    expect(await db.category.count({ where: { parentId: null } })).toBe(22);
    expect(await db.category.count({ where: { parentId: { not: null } } })).toBe(0);
  });

  it('[SCOPE-GEO-002] only Lahore is active; listed; one active zone with area NULL (whole city)', async () => {
    const active = await db.city.findMany({ where: { isActive: true }, select: { code: true } });
    expect(active.map((c) => c.code)).toEqual(['lahore']);
    const lahore = await db.city.findUniqueOrThrow({ where: { code: 'lahore' } });
    expect(lahore.isListed).toBe(true);
    const zones = await db.$queryRaw<{ active: boolean; whole: boolean }[]>`
      SELECT is_active AS active, area IS NULL AS whole FROM service_zone WHERE city_id = ${lahore.id}::uuid`;
    expect(zones).toEqual([{ active: true, whole: true }]);
    expect(await db.city.count({ where: { isActive: true, isListed: false } })).toBe(0);
  });

  it('[SCOPE-CAT-002] exactly the 10 D-024 families are active in Lahore; nothing else anywhere', async () => {
    const rows = await db.catalogActivation.findMany({
      where: { isActive: true },
      select: {
        city: { select: { code: true } },
        category: { select: { code: true } },
        serviceId: true,
      },
    });
    expect(rows.every((r) => r.city.code === 'lahore' && r.serviceId === null)).toBe(true);
    expect(rows.map((r) => r.category?.code).sort()).toEqual([...LAUNCH].sort());
    expect(await db.catalogActivation.count({ where: { serviceId: { not: null } } })).toBe(0);
  });

  it('[SCOPE-CAT-002] the customer catalog of Lahore has the 10 families and their 189 services', async () => {
    const lahore = await db.city.findUniqueOrThrow({ where: { code: 'lahore' } });
    const catalog = new CatalogService(
      new PrismaCatalogRepository(db, noAudit),
      new DenyAllStaffRoleLookup(),
    );
    const families = await catalog.activeCatalog(lahore.id);
    expect(families).toHaveLength(10);
    expect(families.reduce((n, f) => n + f.services.length, 0)).toBe(189);
  });
});

describe('Activation without a release, audited (DB)', () => {
  it('[CFG-RULE-001] activating a family in Lahore offers its services and writes audit rows', async () => {
    const lahore = await db.city.findUniqueOrThrow({ where: { code: 'lahore' } });
    const pest = await db.category.findUniqueOrThrow({ where: { code: 'pest_control' } });
    const ant = await db.service.findUniqueOrThrow({
      where: { code: 'pest_control.ant_treatment' },
    });
    const audit = new PlatformAuditPort(new AuditWriter(db as unknown as PrismaService));
    const catalog = new CatalogService(new PrismaCatalogRepository(db, audit), superAdmin);
    const reason = `T2.6 db-spec ${randomUUID()}`;
    const actor = { actorUserId: randomUUID(), reason };
    expect(await catalog.availability(lahore.id, ant.id)).toMatchObject({
      reason: 'FAMILY_INACTIVE',
    });
    try {
      await catalog.setFamilyActive({
        ...actor,
        cityId: lahore.id,
        categoryId: pest.id,
        isActive: true,
      });
      expect(await catalog.availability(lahore.id, ant.id)).toEqual({ available: true });
    } finally {
      await catalog.setFamilyActive({
        ...actor,
        cityId: lahore.id,
        categoryId: pest.id,
        isActive: false,
      });
    }
    expect(await catalog.availability(lahore.id, ant.id)).toMatchObject({
      reason: 'FAMILY_INACTIVE',
    });
    const rows = await db.auditLog.findMany({ where: { reason }, orderBy: { occurredAt: 'asc' } });
    expect(rows.map((r) => [r.action, r.actorRole, r.objectType, r.actorSubRoles])).toEqual([
      ['FAMILY_SET_ACTIVE', 'ADMIN', 'catalog_activation', ['SUPER_ADMIN']],
      ['FAMILY_SET_ACTIVE', 'ADMIN', 'catalog_activation', ['SUPER_ADMIN']],
    ]);
  });

  it('[SCOPE-GEO-002] re-running the seed never re-creates a renamed/deactivated zone (SEC-REVIEW-T2.6 #8)', async () => {
    const lahore = await db.city.findUniqueOrThrow({ where: { code: 'lahore' } });
    const zone = await db.serviceZone.findFirstOrThrow({ where: { cityId: lahore.id } });
    await db.serviceZone.update({
      where: { id: zone.id },
      data: { nameEn: 'Lahore (renamed by test)' },
    });
    try {
      const run = spawnSync(process.execPath, ['prisma/seed/run.ts'], {
        cwd: API_ROOT,
        encoding: 'utf8',
      });
      expect(run.status, run.stderr).toBe(0);
      expect(await db.serviceZone.count({ where: { cityId: lahore.id } })).toBe(1);
    } finally {
      await db.serviceZone.update({ where: { id: zone.id }, data: { nameEn: zone.nameEn } });
    }
  });
});

describe('Seed audit rows (SEC-REVIEW-T2.6 #7)', () => {
  it('[SEC-BASE-010] every seeded config row and family activation has one SYSTEM_SEED audit row', async () => {
    const seeded = await db.auditLog.findMany({
      where: { action: { in: ['CONFIG_RULE_SEEDED', 'FAMILY_ACTIVATION_SEEDED'] } },
      select: {
        action: true,
        actorRole: true,
        actorUserId: true,
        reason: true,
        sourceMetadata: true,
      },
    });
    const config = seeded.filter((r) => r.action === 'CONFIG_RULE_SEEDED');
    expect(config).toHaveLength(CONFIG_SEEDS.length);
    expect(seeded.filter((r) => r.action === 'FAMILY_ACTIVATION_SEEDED')).toHaveLength(
      CATALOG_FAMILIES.length,
    );
    expect(seeded.every((r) => r.actorRole === 'SYSTEM' && r.actorUserId === null)).toBe(true);
    expect(
      seeded.every((r) => (r.sourceMetadata as { actor?: string } | null)?.actor === 'SYSTEM_SEED'),
    ).toBe(true);
    const rate = await db.configRule.findFirstOrThrow({
      where: { key: 'commission.rate', scope: 'GLOBAL' },
    });
    const rateAudit = await db.auditLog.findFirstOrThrow({ where: { objectId: rate.id } });
    expect(rateAudit.reason).toBe('seed T2.6: D-006');
  });
});

describe('Seeded config + ConfigRule store (DB)', () => {
  it('[CFG-RULE-003] owner values are read through the store and A01 reader (D-006, D-015, D-020)', async () => {
    const reader = new CachedConfigService(new PrismaConfigRuleStore(db, noAudit), {
      cacheTtlMs: 0,
    });
    expect(await reader.require('commission.rate', configParsers.ratio)).toBe(0.3);
    expect(await reader.require('commission.base_line_types', configParsers.stringArray)).toEqual([
      'LABOR',
    ]);
    expect(await reader.require('ledger.max_negative_balance', configParsers.integer)).toBe(0);
    // QA-T2.6-02: fail-closed keys are checked with inspect + registry parsers. Production seed:
    // all missing; after `run.ts --dev-test-limits` (dev/test DB): none missing.
    const devSeeded =
      (await db.auditLog.count({ where: { action: 'CONFIG_RULE_DEV_TEST_SEEDED' } })) > 0;
    expect(await missingFailClosedKeys(reader)).toEqual(devSeeded ? [] : FAIL_CLOSED_KEYS);
    expect(await db.configRule.count({ where: { scope: 'GLOBAL' } })).toBeGreaterThanOrEqual(
      CONFIG_SEEDS.length,
    );
  });

  it('[CFG-RULE-001] get by scope and effective date over real rows (rolled back)', async () => {
    const lahore = await db.city.findUniqueOrThrow({ where: { code: 'lahore' } });
    const key = 'availability.max_service_radius_m';
    await expect(
      db.$transaction(async (tx) => {
        const now = new Date();
        await tx.configRule.create({
          data: {
            ...actorRef,
            key,
            scope: 'CITY',
            scopeRefId: lahore.id,
            value: 7000,
            effectiveFrom: now,
          },
        });
        await tx.configRule.create({
          data: {
            ...actorRef,
            key,
            scope: 'CITY',
            scopeRefId: lahore.id,
            value: 9000,
            effectiveFrom: new Date(now.getTime() + 3_600_000),
          },
        });
        const store = new PrismaConfigRuleStore(tx as unknown as PrismaClient, noAudit);
        const reader = new CachedConfigService(store, { cacheTtlMs: 0 });
        // The DB trigger may move effective_from up to the transaction time: read 1 s later (clock skew).
        const atNow = await reader.get(key, configParsers.integer, {
          cityId: lahore.id,
          at: new Date(now.getTime() + 1000),
        });
        expect(atNow).toMatchObject({ status: 'configured', value: 7000, scope: 'CITY' });
        const later = await reader.get(key, configParsers.integer, {
          cityId: lahore.id,
          at: new Date(now.getTime() + 3_600_000),
        });
        expect(later).toMatchObject({ status: 'configured', value: 9000 });
        const global = await reader.get(key, configParsers.integer, {
          at: new Date(now.getTime() + 1000),
        });
        expect(global).toMatchObject({
          status: 'not_configured',
          reason: 'VALUE_NULL',
          scope: 'GLOBAL',
        });
        throw new Rollback('rollback');
      }),
    ).rejects.toBeInstanceOf(Rollback);
  });

  it('[CFG-RULE-003] the DB refuses a back-dated version (config_rule_not_backdated, SEC-REVIEW-T2.3 #8)', async () => {
    let error: string | undefined;
    await expect(
      db.$transaction(async (tx) => {
        error = await tx.configRule
          .create({
            data: {
              ...actorRef,
              key: 'price.min_total_minor',
              scope: 'GLOBAL',
              value: 1,
              effectiveFrom: new Date(Date.now() - 3_600_000),
            },
          })
          .then(() => undefined)
          .catch((e: unknown) => String(e));
        throw new Rollback('rollback');
      }),
    ).rejects.toBeInstanceOf(Rollback);
    expect(error).toMatch(/kk_config_backdated|config_rule_not_backdated/);
  });

  it('[CFG-RULE-003] the DB policy refuses a decided key and a null security limit from the API login (SEC-REVIEW-T2.6 #1, #2)', async () => {
    const attempts = [
      { key: 'commission.rate', value: 0.05 as number | null, expected: /kk_config_read_only/ },
      { key: 'auth.otp.max_attempts', value: null, expected: /kk_config_fail_closed_null/ },
      { key: 'auth.otp.max_attempts', value: 0, expected: /kk_config_value/ },
    ];
    for (const attempt of attempts) {
      let error: string | undefined;
      await expect(
        db.$transaction(async (tx) => {
          error = await tx.configRule
            .create({
              data: {
                ...actorRef,
                key: attempt.key,
                scope: 'GLOBAL',
                value: attempt.value ?? Prisma.DbNull,
                effectiveFrom: new Date(Date.now() + 1000),
              },
            })
            .then(() => undefined)
            .catch((e: unknown) => String(e));
          throw new Rollback('rollback');
        }),
      ).rejects.toBeInstanceOf(Rollback);
      expect(error, attempt.key).toMatch(attempt.expected);
    }
  });

  it('[CFG-RULE-003] the API login cannot edit or delete a config version (append-only)', async () => {
    const update = await db
      .$executeRawUnsafe(`UPDATE config_rule SET value = '1' WHERE key = 'commission.rate'`)
      .catch((e: unknown) => String(e));
    expect(update).toMatch(/permission denied for table config_rule/);
    const del = await db
      .$executeRawUnsafe(`DELETE FROM config_rule WHERE key = 'commission.rate'`)
      .catch((e: unknown) => String(e));
    expect(del).toMatch(/permission denied for table config_rule/);
  });
});

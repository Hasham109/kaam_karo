/**
 * T2.6 catalog + city seed checks (no database). SCOPE-CAT-001, SCOPE-CAT-002, SCOPE-GEO-001,
 * SCOPE-GEO-002, CAT-SVC-001…003 (BP §1.4, §6, §57.2, §63, §64, §65; D-007, D-019, D-024).
 * The expected catalog is parsed from docs/BLUEPRINT.md §63 at test time, so any drift between
 * the Blueprint and the seed fails here.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATALOG_FAMILIES, serviceCode } from '../catalog.data.ts';
import { CITIES } from '../cities.data.ts';
import { buildSeedSql, seedSummary } from '../seed-sql.ts';
import { SERVICE_DEFAULTS } from '../service-defaults.data.ts';

const repoFile = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../../../../${rel}`, import.meta.url)), 'utf8');

interface Bp63Family {
  readonly name: string;
  readonly items: string[];
}

/** Families (`## `) and items (`- `) between `# 63.` and `# 64.` of the Blueprint. */
function parseBp63(): Bp63Family[] {
  const lines = repoFile('docs/BLUEPRINT.md').split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('# 63. '));
  const end = lines.findIndex((l) => l.startsWith('# 64. '));
  expect(start, 'BP §63 heading').toBeGreaterThan(-1);
  expect(end, 'BP §64 heading').toBeGreaterThan(start);
  const families: Bp63Family[] = [];
  for (const line of lines.slice(start + 1, end)) {
    if (line.startsWith('## ')) families.push({ name: line.slice(3).trim(), items: [] });
    else if (line.startsWith('- ')) families.at(-1)?.items.push(line.slice(2).trim());
  }
  return families;
}

const bp63 = parseBp63();
const bpItemCount = bp63.reduce((n, f) => n + f.items.length, 0);

describe('BP §63 catalog seed', () => {
  it('[SCOPE-CAT-001] seed families equal the BP §63 families, in order', () => {
    expect(CATALOG_FAMILIES.map((f) => f.en)).toEqual(bp63.map((f) => f.name));
    expect(CATALOG_FAMILIES).toHaveLength(22);
  });

  it('[SCOPE-CAT-001] seed items equal the BP §63 items of each family, in order', () => {
    for (const [i, family] of CATALOG_FAMILIES.entries()) {
      expect(
        family.services.map((s) => s.en),
        family.en,
      ).toEqual(bp63[i]?.items);
    }
  });

  it('[SCOPE-CAT-001] seed count equals the BP §63 item count (one row per family entry)', () => {
    // Counting rule: an item that BP lists under two families (5 such names) is two services.
    expect(seedSummary().services).toBe(bpItemCount);
    expect(bpItemCount).toBe(351);
    const names = CATALOG_FAMILIES.flatMap((f) => f.services.map((s) => s.en));
    const repeated = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))].sort();
    expect(repeated).toEqual([
      'Fixture installation',
      'Furniture assembly',
      'Shelf installation',
      'Wall mounting',
      'Water tank cleaning',
    ]);
  });

  it('[SCOPE-CAT-001] family and service codes are unique and stable', () => {
    const familyCodes = CATALOG_FAMILIES.map((f) => f.code);
    expect(new Set(familyCodes).size).toBe(familyCodes.length);
    const codes = CATALOG_FAMILIES.flatMap((f) => f.services.map((s) => serviceCode(f.code, s.en)));
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of [...familyCodes, ...codes])
      expect(code).toMatch(/^[a-z0-9_]+(\.[a-z0-9_]+)?$/);
    expect(serviceCode('plumbing_water', 'Gas/water line plumbing where legally allowed')).toBe(
      'plumbing_water.gas_water_line_plumbing_where_legally_allowed',
    );
  });

  it('[SCOPE-CAT-001] no seeded family or service belongs to an excluded area (BP §1.4, §63, §65)', () => {
    // BP §1.4 out of scope + BP §63 intro + BP §65 future verticals.
    const excluded =
      /\b(medical|medicine|doctors?|nurs(e|es|ing)|pharmac\w*|clinic\w*|health ?care|hospital|legal advice|lawyers?|attorney|financial|loans?|insurance|invest\w*|child ?care|baby ?sit\w*|nanny|elder ?care|recruit\w*|employment|jobs? board|government|utility procurement|structural|engineering approval|permits?|tutor\w*|education|beauty|salon|wellness|psycholog\w*|therap\w*|counsel\w*|event services?|pet care)\b/i;
    const texts = CATALOG_FAMILIES.flatMap((f) => [f.en, ...f.services.map((s) => s.en)]);
    expect(texts.filter((t) => excluded.test(t))).toEqual([]);
  });

  it('[I18N-006] every family and service has an Urdu name in Urdu script', () => {
    const arabicScript = /[؀-ۿ]/;
    for (const f of CATALOG_FAMILIES) {
      expect(f.ur, f.en).toMatch(arabicScript);
      for (const s of f.services) expect(s.ur, s.en).toMatch(arabicScript);
    }
  });

  it('[SCOPE-CAT-001] every seed line carries its BP §63 family comment', () => {
    const text = repoFile('services/api/prisma/seed/catalog.data.ts');
    const lines = text.split('\n').filter((l) => /^\s+\{ en: '/.test(l));
    expect(lines).toHaveLength(bpItemCount);
    let family = '';
    const missing: string[] = [];
    for (const line of text.split('\n')) {
      const fam = /\/\/ BP §63 family: (.+?) {2}—/.exec(line);
      if (fam?.[1]) family = fam[1];
      if (/^\s+\{ en: '/.test(line) && !line.endsWith(`// §63 ${family}`)) missing.push(line);
    }
    expect(missing).toEqual([]);
  });
});

describe('D-024 launch families', () => {
  it('[SCOPE-CAT-002] exactly the 10 D-024 families are launch families', () => {
    const decisions = repoFile('coordination/DECISIONS.md');
    const row = decisions.split('\n').find((l) => l.startsWith('| D-024 '));
    const list = /\(BP §63 families: ([^)]+)\)/.exec(row ?? '')?.[1];
    expect(list, 'D-024 family list').toBeDefined();
    const d024 = (list ?? '').split(', ').map((s) => s.trim());
    expect(d024).toHaveLength(10);
    const launch = CATALOG_FAMILIES.filter((f) => f.launchFamily).map((f) =>
      f.en.replace(/,/g, ''),
    );
    expect(launch.sort()).toEqual([...d024].sort());
  });

  it('[SCOPE-CAT-002] the seed SQL activates exactly those 10 families, only in Lahore', () => {
    const sql = buildSeedSql();
    const activationBlocks = sql.split('INSERT INTO "catalog_activation"').slice(1);
    expect(activationBlocks).toHaveLength(CITIES.length);
    const active = [...(activationBlocks[0] ?? '').matchAll(/\('([a-z_]+)', true\)/g)].map(
      (m) => m[1],
    );
    const expected = CATALOG_FAMILIES.filter((f) => f.launchFamily).map((f) => f.code);
    expect(active.sort()).toEqual([...expected].sort());
    expect(activationBlocks[0]).toContain(`JOIN "city" c ON c."code" = 'lahore'`);
    // No service-level activation row is seeded: services follow their family (SCOPE-CAT-002).
    expect(sql).not.toMatch(/"catalog_activation" \([^)]*"service_id"/);
  });
});

describe('Cities and zones', () => {
  it('[SCOPE-GEO-002] only Lahore is active; it is listed with one active whole-city zone (D-007, D-019)', () => {
    expect(CITIES.filter((c) => c.isActive).map((c) => c.code)).toEqual(['lahore']);
    const lahore = CITIES.find((c) => c.code === 'lahore');
    expect(lahore).toMatchObject({
      isListed: true,
      isActive: true,
      activeFamilies: 'LAUNCH_FAMILIES',
    });
    expect(lahore?.zones).toEqual([
      { code: 'lahore-whole-city', en: 'Whole Lahore', ur: 'پورا لاہور', isActive: true },
    ]);
    // area NULL = whole city: the seed never writes a polygon (OQ-086).
    expect(buildSeedSql()).toMatch(
      /"service_zone" \("city_id", "code", "name_en", "name_ur", "area", "is_active"\) SELECT c\."id", 'lahore-whole-city', 'Whole Lahore', 'پورا لاہور', NULL, true .*NOT EXISTS \(SELECT 1 FROM "service_zone" z WHERE z\."city_id" = c\."id"\) ON CONFLICT \("city_id", "code"\) DO NOTHING/,
    );
  });

  it('[SCOPE-GEO-001] every other seeded city is listed and inactive (none named by BP yet, OQ-084)', () => {
    for (const city of CITIES.filter((c) => c.code !== 'lahore')) {
      expect(city).toMatchObject({ isListed: true, isActive: false, activeFamilies: 'NONE' });
    }
  });
});

describe('Interim service configuration (OQ-085)', () => {
  it('[CAT-SVC-002] every service has a non-empty selling-mode set and is quote-only (no invented price)', () => {
    expect(SERVICE_DEFAULTS.sellingModes.length).toBeGreaterThan(0);
    expect(SERVICE_DEFAULTS).toMatchObject({
      priceModel: 'INSPECTION_QUOTE',
      quoteRequired: true,
      emergencyAllowed: false,
      pricingUnit: null,
      materialsPolicy: null,
      requiredVerificationLevel: null,
    });
  });
});

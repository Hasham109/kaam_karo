/**
 * T2.6 CatalogService: per-city activation without an app release (BP §42, §57.2, §64; D-007,
 * D-019, D-024; SCOPE-GEO-001/002, SCOPE-CAT-001/002, CAT-SVC-002, CFG-RULE-001, OPS-ADMIN-023).
 * In-memory repository; the seeded DB state is covered by prisma/seed/__tests__/seed.db-spec.ts.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { AuditEntryInput } from '../config';
import type {
  ActivationRecord,
  ActivationTarget,
  CatalogRepository,
  CategoryRecord,
  CityRecord,
  ServiceRecord,
} from './catalog.repository';
import { CatalogService, CatalogWriteError } from './catalog.service';
import { type AdminSubRoleName, DenyAllStaffRoleLookup, type StaffRoleLookup } from './staff-roles';

const LHR = '00000000-0000-4000-8000-0000000c0001';
const OTHER = '00000000-0000-4000-8000-0000000c0002';
const PLUMBING = '00000000-0000-4000-8000-0000000ca001';
const PEST = '00000000-0000-4000-8000-0000000ca002';
const TAP = '00000000-0000-4000-8000-00000005e001';
const ANT = '00000000-0000-4000-8000-00000005e002';
const NO_MODE = '00000000-0000-4000-8000-00000005e003';
const ACTOR = '00000000-0000-4000-8000-00000000a001';
const OPS_USER = '00000000-0000-4000-8000-00000000a002';
const ROLES: Record<string, readonly AdminSubRoleName[]> = {
  [ACTOR]: ['SUPER_ADMIN'],
  [OPS_USER]: ['OPERATIONS', 'CONTENT_MANAGER'],
};
const staff: StaffRoleLookup = { subRolesOf: (id) => Promise.resolve(ROLES[id] ?? []) };

class MemoryCatalog implements CatalogRepository {
  cities: CityRecord[] = [
    { id: LHR, code: 'lahore', nameEn: 'Lahore', nameUr: 'لاہور', isListed: true, isActive: true },
    { id: OTHER, code: 'other', nameEn: 'Other', nameUr: 'دوسرا', isListed: true, isActive: false },
  ];
  zones = new Map<string, boolean>([[LHR, true]]);
  families: CategoryRecord[] = [
    {
      id: PLUMBING,
      parentId: null,
      code: 'plumbing_water',
      nameEn: 'Plumbing & Water',
      nameUr: 'پلمبنگ',
    },
    { id: PEST, parentId: null, code: 'pest_control', nameEn: 'Pest Control', nameUr: 'کیڑے' },
  ];
  services: ServiceRecord[] = [
    this.svc(TAP, PLUMBING, ['REQUEST_QUOTES']),
    this.svc(NO_MODE, PLUMBING, []),
    this.svc(ANT, PEST, ['REQUEST_QUOTES']),
  ];
  activations: ActivationRecord[] = [
    { cityId: LHR, categoryId: PLUMBING, serviceId: null, isActive: true },
    { cityId: LHR, categoryId: PEST, serviceId: null, isActive: false },
  ];
  audits: AuditEntryInput[] = [];

  private svc(id: string, categoryId: string, sellingModes: string[]): ServiceRecord {
    return {
      id,
      categoryId,
      code: id,
      nameEn: id,
      nameUr: id,
      priceModel: 'INSPECTION_QUOTE',
      sellingModes,
      inspectionExpected: false,
      quoteRequired: true,
      emergencyAllowed: false,
    };
  }

  getCity = (id: string) => Promise.resolve(this.cities.find((c) => c.id === id) ?? null);
  listCities = () => Promise.resolve(this.cities);
  getCategory = (id: string) => Promise.resolve(this.families.find((c) => c.id === id) ?? null);
  getService = (id: string) => Promise.resolve(this.services.find((s) => s.id === id) ?? null);
  listFamilies = () => Promise.resolve(this.families);
  listServices = (ids: readonly string[]) =>
    Promise.resolve(this.services.filter((s) => ids.includes(s.categoryId)));
  listActivations = (cityId: string) =>
    Promise.resolve(this.activations.filter((a) => a.cityId === cityId));
  hasActiveZone = (cityId: string) => Promise.resolve(this.zones.get(cityId) === true);

  setCityActive(cityId: string, isActive: boolean, audit: AuditEntryInput): Promise<void> {
    this.cities = this.cities.map((c) => (c.id === cityId ? { ...c, isActive } : c));
    this.audits.push(audit);
    return Promise.resolve();
  }

  setActivation(
    cityId: string,
    target: ActivationTarget,
    isActive: boolean,
    audit: AuditEntryInput,
  ): Promise<ActivationRecord> {
    const categoryId = target.kind === 'CATEGORY' ? target.id : null;
    const serviceId = target.kind === 'SERVICE' ? target.id : null;
    const row = { cityId, categoryId, serviceId, isActive };
    this.activations = [
      ...this.activations.filter(
        (a) => !(a.cityId === cityId && a.categoryId === categoryId && a.serviceId === serviceId),
      ),
      row,
    ];
    this.audits.push(audit);
    return Promise.resolve(row);
  }
}

let repo: MemoryCatalog;
let catalog: CatalogService;
beforeEach(() => {
  repo = new MemoryCatalog();
  catalog = new CatalogService(repo, staff);
});

const cmd = { actorUserId: ACTOR, reason: 'ops decision' } as const;

describe('Service availability per city', () => {
  it('[SCOPE-CAT-002] a service of an active family in active Lahore is available', async () => {
    expect(await catalog.availability(LHR, TAP)).toEqual({ available: true });
  });

  it('[SCOPE-GEO-001] a listed but inactive city is "not active yet"', async () => {
    expect(await catalog.availability(OTHER, TAP)).toEqual({
      available: false,
      reason: 'CITY_NOT_ACTIVE',
    });
    expect(await catalog.activeCatalog(OTHER)).toEqual([]);
  });

  it('[SCOPE-GEO-002] a city without an active zone offers nothing', async () => {
    repo.zones.set(LHR, false);
    expect(await catalog.availability(LHR, TAP)).toMatchObject({ reason: 'NO_ACTIVE_ZONE' });
  });

  it('[SCOPE-CAT-002] an inactive family hides its services', async () => {
    expect(await catalog.availability(LHR, ANT)).toMatchObject({ reason: 'FAMILY_INACTIVE' });
    const families = await catalog.activeCatalog(LHR);
    expect(families.map((f) => f.family.id)).toEqual([PLUMBING]);
  });

  it('[CAT-SVC-002] a service with no selling mode is never offered', async () => {
    expect(await catalog.availability(LHR, NO_MODE)).toMatchObject({ reason: 'NO_SELLING_MODE' });
    const [plumbing] = await catalog.activeCatalog(LHR);
    expect(plumbing?.services.map((s) => s.id)).toEqual([TAP]);
  });

  it('[SCOPE-GEO-001] unknown city or service is refused', async () => {
    expect(await catalog.availability('nope', TAP)).toMatchObject({ reason: 'UNKNOWN_CITY' });
    expect(await catalog.availability(LHR, 'nope')).toMatchObject({ reason: 'UNKNOWN_SERVICE' });
  });
});

describe('Activation without an app release (BP §64)', () => {
  it('[CFG-RULE-001] activating a family makes its services available, audited with reason', async () => {
    await catalog.setFamilyActive({ ...cmd, cityId: LHR, categoryId: PEST, isActive: true });
    expect(await catalog.availability(LHR, ANT)).toEqual({ available: true });
    expect(repo.audits).toEqual([
      expect.objectContaining({
        actorUserId: ACTOR,
        action: 'FAMILY_SET_ACTIVE',
        reason: 'ops decision',
        before: expect.objectContaining({ isActive: false }),
        after: expect.objectContaining({ isActive: true }),
      }),
    ]);
  });

  it('[OPS-ADMIN-023] a single service can be switched off inside an active family', async () => {
    await catalog.setServiceActive({ ...cmd, cityId: LHR, serviceId: TAP, isActive: false });
    expect(await catalog.availability(LHR, TAP)).toMatchObject({ reason: 'SERVICE_INACTIVE' });
    await catalog.setServiceActive({ ...cmd, cityId: LHR, serviceId: TAP, isActive: true });
    expect(await catalog.availability(LHR, TAP)).toEqual({ available: true });
  });

  it('[CAT-SVC-002] activating a service with an empty selling-mode set is refused', async () => {
    await expect(
      catalog.setServiceActive({ ...cmd, cityId: LHR, serviceId: NO_MODE, isActive: true }),
    ).rejects.toMatchObject({ code: 'NO_SELLING_MODE', httpStatus: 422 });
  });

  it('[SCOPE-GEO-001] only a listed city can be activated; activation is audited', async () => {
    repo.cities = repo.cities.map((c) => (c.id === OTHER ? { ...c, isListed: false } : c));
    await expect(
      catalog.setCityActive({ ...cmd, cityId: OTHER, isActive: true }),
    ).rejects.toMatchObject({ code: 'CITY_NOT_LISTED' });
    await catalog.setCityActive({ ...cmd, cityId: LHR, isActive: false });
    expect(await catalog.availability(LHR, TAP)).toMatchObject({ reason: 'CITY_NOT_ACTIVE' });
    expect(repo.audits).toHaveLength(1);
  });

  it('[CFG-RULE-001] every activation write needs an actor and a reason', async () => {
    const noReason = catalog.setFamilyActive({
      ...cmd,
      reason: ' ',
      cityId: LHR,
      categoryId: PEST,
      isActive: true,
    });
    await expect(noReason).rejects.toBeInstanceOf(CatalogWriteError);
    await expect(
      catalog.setFamilyActive({
        ...cmd,
        actorUserId: '',
        cityId: LHR,
        categoryId: PEST,
        isActive: true,
      }),
    ).rejects.toMatchObject({ code: 'ACTOR_REQUIRED' });
    expect(repo.audits).toHaveLength(0);
  });

  it('[SCOPE-CAT-001] the catalog service has no way to create a family or service', () => {
    const methods = Object.getOwnPropertyNames(CatalogService.prototype);
    expect(methods.filter((m) => /create|add|insert/i.test(m))).toEqual([]);
  });

  it('[CFG-RULE-001] scope IDs for config rules are checked against the catalog', async () => {
    expect(await catalog.exists('CITY', LHR)).toBe(true);
    expect(await catalog.exists('CATEGORY', PEST)).toBe(true);
    expect(await catalog.exists('SERVICE', TAP)).toBe(true);
    expect(await catalog.exists('SERVICE', 'nope')).toBe(false);
    expect(await catalog.exists('SERVICE', '00000000-0000-4000-8000-0000000000ff')).toBe(false);
  });
});

describe('Review fixes (QA-T2.6-01, SEC-REVIEW-T2.6 #4, #11)', () => {
  it('[CFG-RULE-001] activating a service inside an inactive family is refused with 409 FAMILY_INACTIVE (OQ-087)', async () => {
    await expect(
      catalog.setServiceActive({ ...cmd, cityId: LHR, serviceId: ANT, isActive: true }),
    ).rejects.toMatchObject({ code: 'FAMILY_INACTIVE', httpStatus: 409 });
    expect(repo.audits).toHaveLength(0);
    // Switching a service OFF inside an inactive family stays allowed (it only narrows).
    await catalog.setServiceActive({ ...cmd, cityId: LHR, serviceId: ANT, isActive: false });
    expect(repo.audits).toHaveLength(1);
  });

  it('[ADMIN-ROLE-001] only Super Admin may change activation until OQ-052; sub-roles come from the server', async () => {
    const asOps = catalog.setFamilyActive({
      ...cmd,
      actorUserId: OPS_USER,
      cityId: LHR,
      categoryId: PEST,
      isActive: true,
    });
    await expect(asOps).rejects.toMatchObject({ code: 'FORBIDDEN_FOR_SUB_ROLE', httpStatus: 403 });
    const denyAll = new CatalogService(repo, new DenyAllStaffRoleLookup());
    await expect(
      denyAll.setFamilyActive({ ...cmd, cityId: LHR, categoryId: PEST, isActive: true }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN_FOR_SUB_ROLE' });
    await catalog.setFamilyActive({ ...cmd, cityId: LHR, categoryId: PEST, isActive: true });
    expect(repo.audits.at(-1)).toMatchObject({ actorSubRoles: ['SUPER_ADMIN'] });
  });

  it('[SEC-BASE-005] malformed IDs give 422 INVALID_ID and unknown IDs 404; a concurrent create gives 409', async () => {
    await expect(
      catalog.setFamilyActive({ ...cmd, cityId: 'abc', categoryId: PEST, isActive: true }),
    ).rejects.toMatchObject({ code: 'INVALID_ID', httpStatus: 422 });
    await expect(
      catalog.setServiceActive({
        ...cmd,
        cityId: LHR,
        serviceId: '00000000-0000-4000-8000-0000000000ff',
        isActive: false,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', httpStatus: 404 });
    expect(await catalog.availability('abc', TAP)).toMatchObject({ reason: 'UNKNOWN_CITY' });
    repo.setActivation = () =>
      Promise.reject(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(
      catalog.setFamilyActive({ ...cmd, cityId: LHR, categoryId: PEST, isActive: true }),
    ).rejects.toMatchObject({ code: 'CONCURRENT_WRITE', httpStatus: 409 });
  });
});

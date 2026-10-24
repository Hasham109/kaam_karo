/**
 * Catalog repository (T2.6, owner A03; M4 Catalog, ARCH §4). Only this module touches the
 * city, service_zone, category, service and catalog_activation tables (INFRA-001).
 * Writes run in one transaction with their audit row (SEC-BASE-010; BP §11, §26; CFG-RULE-001).
 */
import type { AuditEntryInput, AuditPort } from '../config';
import type { PrismaClient } from '../../generated/prisma/client.js';

export interface CityRecord {
  readonly id: string;
  readonly code: string;
  readonly nameEn: string;
  readonly nameUr: string;
  readonly isListed: boolean;
  readonly isActive: boolean;
}

export interface CategoryRecord {
  readonly id: string;
  readonly parentId: string | null;
  readonly code: string;
  readonly nameEn: string;
  readonly nameUr: string;
}

export interface ServiceRecord {
  readonly id: string;
  readonly categoryId: string;
  readonly code: string;
  readonly nameEn: string;
  readonly nameUr: string;
  readonly priceModel: string;
  readonly sellingModes: readonly string[];
  readonly inspectionExpected: boolean;
  readonly quoteRequired: boolean;
  readonly emergencyAllowed: boolean;
}

export type ActivationTarget =
  | { readonly kind: 'CATEGORY'; readonly id: string }
  | { readonly kind: 'SERVICE'; readonly id: string };

export interface ActivationRecord {
  readonly cityId: string;
  readonly categoryId: string | null;
  readonly serviceId: string | null;
  readonly isActive: boolean;
}

export interface CatalogRepository {
  getCity(id: string): Promise<CityRecord | null>;
  listCities(): Promise<readonly CityRecord[]>;
  getCategory(id: string): Promise<CategoryRecord | null>;
  getService(id: string): Promise<ServiceRecord | null>;
  listFamilies(): Promise<readonly CategoryRecord[]>;
  listServices(categoryIds: readonly string[]): Promise<readonly ServiceRecord[]>;
  listActivations(cityId: string): Promise<readonly ActivationRecord[]>;
  hasActiveZone(cityId: string): Promise<boolean>;
  setCityActive(cityId: string, isActive: boolean, audit: AuditEntryInput): Promise<void>;
  setActivation(
    cityId: string,
    target: ActivationTarget,
    isActive: boolean,
    audit: AuditEntryInput,
  ): Promise<ActivationRecord>;
}

export const CATALOG_REPOSITORY = Symbol.for('kaamkaro.catalog.Repository');

const SERVICE_SELECT = {
  id: true,
  categoryId: true,
  code: true,
  nameEn: true,
  nameUr: true,
  priceModel: true,
  sellingModes: true,
  inspectionExpected: true,
  quoteRequired: true,
  emergencyAllowed: true,
} as const;

const CITY_SELECT = {
  id: true,
  code: true,
  nameEn: true,
  nameUr: true,
  isListed: true,
  isActive: true,
} as const;

const CATEGORY_SELECT = {
  id: true,
  parentId: true,
  code: true,
  nameEn: true,
  nameUr: true,
} as const;

const ACTIVATION_SELECT = {
  cityId: true,
  categoryId: true,
  serviceId: true,
  isActive: true,
} as const;

export type CatalogDb = Pick<
  PrismaClient,
  'city' | 'serviceZone' | 'category' | 'service' | 'catalogActivation' | '$transaction'
>;

export class PrismaCatalogRepository implements CatalogRepository {
  private readonly db: CatalogDb;
  private readonly audit: AuditPort;

  constructor(db: CatalogDb, audit: AuditPort) {
    this.db = db;
    this.audit = audit;
  }

  getCity(id: string): Promise<CityRecord | null> {
    return this.db.city.findUnique({ where: { id }, select: CITY_SELECT });
  }

  listCities(): Promise<readonly CityRecord[]> {
    return this.db.city.findMany({ select: CITY_SELECT, orderBy: { nameEn: 'asc' } });
  }

  getCategory(id: string): Promise<CategoryRecord | null> {
    return this.db.category.findUnique({ where: { id }, select: CATEGORY_SELECT });
  }

  async getService(id: string): Promise<ServiceRecord | null> {
    const row = await this.db.service.findUnique({ where: { id }, select: SERVICE_SELECT });
    return row ? { ...row, sellingModes: row.sellingModes ?? [] } : null;
  }

  listFamilies(): Promise<readonly CategoryRecord[]> {
    return this.db.category.findMany({
      where: { parentId: null },
      select: CATEGORY_SELECT,
      orderBy: { nameEn: 'asc' },
    });
  }

  async listServices(categoryIds: readonly string[]): Promise<readonly ServiceRecord[]> {
    const rows = await this.db.service.findMany({
      where: { categoryId: { in: [...categoryIds] } },
      select: SERVICE_SELECT,
      orderBy: { nameEn: 'asc' },
    });
    return rows.map((r) => ({ ...r, sellingModes: r.sellingModes ?? [] }));
  }

  listActivations(cityId: string): Promise<readonly ActivationRecord[]> {
    return this.db.catalogActivation.findMany({ where: { cityId }, select: ACTIVATION_SELECT });
  }

  async hasActiveZone(cityId: string): Promise<boolean> {
    return (await this.db.serviceZone.count({ where: { cityId, isActive: true } })) > 0;
  }

  async setCityActive(cityId: string, isActive: boolean, audit: AuditEntryInput): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.city.update({
        where: { id: cityId },
        data: { isActive, version: { increment: 1 } },
      });
      await this.audit.record(audit, tx);
    });
  }

  async setActivation(
    cityId: string,
    target: ActivationTarget,
    isActive: boolean,
    audit: AuditEntryInput,
  ): Promise<ActivationRecord> {
    const where =
      target.kind === 'CATEGORY'
        ? { cityId, categoryId: target.id }
        : { cityId, serviceId: target.id };
    return this.db.$transaction(async (tx) => {
      const existing = await tx.catalogActivation.findFirst({ where, select: { id: true } });
      const row = existing
        ? await tx.catalogActivation.update({
            where: { id: existing.id },
            data: { isActive, changedByUserId: audit.actorUserId, version: { increment: 1 } },
            select: { id: true, ...ACTIVATION_SELECT },
          })
        : await tx.catalogActivation.create({
            data: { ...where, isActive, changedByUserId: audit.actorUserId },
            select: { id: true, ...ACTIVATION_SELECT },
          });
      await this.audit.record({ ...audit, objectId: row.id }, tx);
      return {
        cityId: row.cityId,
        categoryId: row.categoryId,
        serviceId: row.serviceId,
        isActive: row.isActive,
      };
    });
  }
}

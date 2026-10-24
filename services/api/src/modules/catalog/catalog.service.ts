/**
 * CatalogService (T2.6, owner A03; M4 Catalog). The server decides what is offered where
 * (BP §29, §64; golden rule 4); clients only display the result.
 * - SCOPE-GEO-001 (BP §57.2): a listed but inactive city is "not active yet" and never matches.
 * - SCOPE-GEO-002 (D-007, D-019): a city needs an active zone (whole Lahore = one zone).
 * - SCOPE-CAT-002, CFG-RULE-001 (BP §6, §42, §64; D-024): a service is offered in a city only when
 *   its family is active there and no service-level row deactivates it. Activation changes take
 *   effect without an app release and are audited (OPS-ADMIN-023).
 * - QA-T2.6-01 / OQ-087 default: activating a service whose family is inactive in that city is
 *   refused (409 FAMILY_INACTIVE), never reported as a success that has no effect.
 * - CAT-SVC-002 (BP §53): a service with no selling mode is never offered and cannot be activated.
 * - SEC-REVIEW-T2.6 #4: the actor's sub-roles come from the server (StaffRoleLookup); activation is
 *   allowed only for CATALOG_ACTIVATION_SUB_ROLES (OQ-052 cells denied).
 * - SEC-REVIEW-T2.6 #11: malformed IDs → 422 INVALID_ID; concurrent creates → 409 CONCURRENT_WRITE.
 * - SCOPE-CAT-001 (BP §63, §65): there is deliberately NO method to create a family or service.
 */
import type { ConfigScope } from '@kaamkaro/platform';
import type { AuditEntryInput, ScopeRefCheck } from '../config';
import type {
  ActivationRecord,
  ActivationTarget,
  CatalogRepository,
  CategoryRecord,
  CityRecord,
  ServiceRecord,
} from './catalog.repository';
import {
  type AdminSubRoleName,
  CATALOG_ACTIVATION_SUB_ROLES,
  hasAnySubRole,
  isUniqueViolation,
  isUuid,
  type StaffRoleLookup,
} from './staff-roles';

export type UnavailableReason =
  | 'UNKNOWN_CITY'
  | 'UNKNOWN_SERVICE'
  | 'CITY_NOT_ACTIVE'
  | 'NO_ACTIVE_ZONE'
  | 'FAMILY_INACTIVE'
  | 'SERVICE_INACTIVE'
  | 'NO_SELLING_MODE';

export type Availability =
  { readonly available: true } | { readonly available: false; readonly reason: UnavailableReason };

export type CatalogWriteErrorCode =
  | 'INVALID_ID'
  | 'NOT_FOUND'
  | 'FORBIDDEN_FOR_SUB_ROLE'
  | 'CITY_NOT_LISTED'
  | 'FAMILY_INACTIVE'
  | 'NO_SELLING_MODE'
  | 'CONCURRENT_WRITE'
  | 'REASON_REQUIRED'
  | 'ACTOR_REQUIRED';

/** HTTP status per code (contracts/catalog.yaml). */
export const CATALOG_WRITE_HTTP_STATUS: Readonly<Record<CatalogWriteErrorCode, number>> = {
  INVALID_ID: 422, // kk-allow-literal: technical — HTTP status
  NOT_FOUND: 404, // kk-allow-literal: technical — HTTP status
  FORBIDDEN_FOR_SUB_ROLE: 403, // kk-allow-literal: technical — HTTP status
  CITY_NOT_LISTED: 422, // kk-allow-literal: technical — HTTP status
  FAMILY_INACTIVE: 409, // kk-allow-literal: technical — HTTP status
  NO_SELLING_MODE: 422, // kk-allow-literal: technical — HTTP status
  CONCURRENT_WRITE: 409, // kk-allow-literal: technical — HTTP status (retryable)
  REASON_REQUIRED: 422, // kk-allow-literal: technical — HTTP status
  ACTOR_REQUIRED: 401, // kk-allow-literal: technical — HTTP status
};

export class CatalogWriteError extends Error {
  readonly httpStatus: number;
  readonly code: CatalogWriteErrorCode;
  constructor(code: CatalogWriteErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'CatalogWriteError';
    this.httpStatus = CATALOG_WRITE_HTTP_STATUS[code];
  }
}

/**
 * `actorUserId` is the authenticated staff user from the server session (A02 guard, T2.4),
 * never a request-body field. Sub-roles are looked up, not passed in.
 */
export interface ActivationCommand {
  readonly cityId: string;
  readonly isActive: boolean;
  readonly actorUserId: string;
  readonly reason: string;
}

export interface ActiveFamily {
  readonly family: CategoryRecord;
  readonly services: readonly ServiceRecord[];
}

function familyActive(activations: readonly ActivationRecord[], categoryId: string): boolean {
  return activations.some((a) => a.categoryId === categoryId && a.isActive);
}

function serviceSwitchedOff(activations: readonly ActivationRecord[], serviceId: string): boolean {
  return activations.some((a) => a.serviceId === serviceId && !a.isActive);
}

export class CatalogService implements ScopeRefCheck {
  private readonly repo: CatalogRepository;
  private readonly staff: StaffRoleLookup;

  constructor(repo: CatalogRepository, staff: StaffRoleLookup) {
    this.repo = repo;
    this.staff = staff;
  }

  /** Cities shown in city selection (BP §57.2: listed, active or not). */
  async listedCities(): Promise<readonly CityRecord[]> {
    return (await this.repo.listCities()).filter((c) => c.isListed);
  }

  /** Can a customer request this service in this city right now? (SCOPE-GEO-001, SCOPE-CAT-002) */
  async availability(cityId: string, serviceId: string): Promise<Availability> {
    const city = isUuid(cityId) ? await this.repo.getCity(cityId) : null;
    if (!city || !city.isListed) return { available: false, reason: 'UNKNOWN_CITY' };
    if (!city.isActive) return { available: false, reason: 'CITY_NOT_ACTIVE' };
    if (!(await this.repo.hasActiveZone(cityId)))
      return { available: false, reason: 'NO_ACTIVE_ZONE' };
    const service = isUuid(serviceId) ? await this.repo.getService(serviceId) : null;
    if (!service) return { available: false, reason: 'UNKNOWN_SERVICE' };
    const activations = await this.repo.listActivations(cityId);
    if (!familyActive(activations, service.categoryId))
      return { available: false, reason: 'FAMILY_INACTIVE' };
    if (serviceSwitchedOff(activations, service.id))
      return { available: false, reason: 'SERVICE_INACTIVE' };
    if (service.sellingModes.length === 0) return { available: false, reason: 'NO_SELLING_MODE' };
    return { available: true };
  }

  /** The customer catalog of a city: active families with their offered services. */
  async activeCatalog(cityId: string): Promise<readonly ActiveFamily[]> {
    const city = isUuid(cityId) ? await this.repo.getCity(cityId) : null;
    if (!city || !city.isListed || !city.isActive || !(await this.repo.hasActiveZone(cityId))) {
      return [];
    }
    const activations = await this.repo.listActivations(cityId);
    const families = (await this.repo.listFamilies()).filter((f) =>
      familyActive(activations, f.id),
    );
    const services = await this.repo.listServices(families.map((f) => f.id));
    return families.map((family) => ({
      family,
      services: services.filter(
        (s) =>
          s.categoryId === family.id &&
          s.sellingModes.length > 0 &&
          !serviceSwitchedOff(activations, s.id),
      ),
    }));
  }

  /** A23 "Activate / deactivate city" (BP §57.2; CFG-RULE-001). Only listed cities can be active. */
  async setCityActive(cmd: ActivationCommand): Promise<CityRecord> {
    const subRoles = await this.authorize(cmd);
    const city = await this.requireCity(cmd.cityId);
    if (cmd.isActive && !city.isListed) {
      throw new CatalogWriteError('CITY_NOT_LISTED', 'Only a listed city can be activated');
    }
    await this.repo.setCityActive(
      city.id,
      cmd.isActive,
      this.audit(cmd, subRoles, 'CITY_SET_ACTIVE', 'city', city.id, city.isActive),
    );
    return { ...city, isActive: cmd.isActive };
  }

  /** A23 family activation per city (SCOPE-CAT-002; D-024). */
  async setFamilyActive(cmd: ActivationCommand & { readonly categoryId: string }) {
    const subRoles = await this.authorize(cmd);
    await this.requireCity(cmd.cityId);
    const family = isUuid(cmd.categoryId) ? await this.repo.getCategory(cmd.categoryId) : null;
    if (!family) throw this.notFound(cmd.categoryId, 'Family');
    const before = familyActive(await this.repo.listActivations(cmd.cityId), family.id);
    return this.write(
      cmd,
      subRoles,
      { kind: 'CATEGORY', id: family.id },
      before,
      'FAMILY_SET_ACTIVE',
    );
  }

  /**
   * A23 service activation per city (BP §64). Refused with an empty selling-mode set (CAT-SVC-002)
   * and, when activating, while the service's family is inactive in that city (QA-T2.6-01, OQ-087).
   */
  async setServiceActive(cmd: ActivationCommand & { readonly serviceId: string }) {
    const subRoles = await this.authorize(cmd);
    await this.requireCity(cmd.cityId);
    const service = isUuid(cmd.serviceId) ? await this.repo.getService(cmd.serviceId) : null;
    if (!service) throw this.notFound(cmd.serviceId, 'Service');
    const activations = await this.repo.listActivations(cmd.cityId);
    if (cmd.isActive && service.sellingModes.length === 0) {
      throw new CatalogWriteError('NO_SELLING_MODE', 'Service has no selling mode');
    }
    if (cmd.isActive && !familyActive(activations, service.categoryId)) {
      throw new CatalogWriteError(
        'FAMILY_INACTIVE',
        'The service family is not active in this city; activate the family first (OQ-087)',
      );
    }
    const before = !serviceSwitchedOff(activations, service.id);
    return this.write(
      cmd,
      subRoles,
      { kind: 'SERVICE', id: service.id },
      before,
      'SERVICE_SET_ACTIVE',
    );
  }

  /** ScopeRefCheck for ConfigAdminService (CFG-RULE-001: city/category/service scopes). */
  async exists(scope: Exclude<ConfigScope, 'GLOBAL'>, id: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    switch (scope) {
      case 'CITY':
        return (await this.repo.getCity(id)) !== null;
      case 'CATEGORY':
        return (await this.repo.getCategory(id)) !== null;
      case 'SERVICE':
        return (await this.repo.getService(id)) !== null;
    }
  }

  private async authorize(cmd: ActivationCommand): Promise<readonly AdminSubRoleName[]> {
    if (!cmd.actorUserId) throw new CatalogWriteError('ACTOR_REQUIRED', 'Actor is required');
    if (!cmd.reason || cmd.reason.trim().length === 0) {
      throw new CatalogWriteError('REASON_REQUIRED', 'A reason is required');
    }
    const subRoles = await this.staff.subRolesOf(cmd.actorUserId);
    if (!hasAnySubRole(subRoles, CATALOG_ACTIVATION_SUB_ROLES)) {
      throw new CatalogWriteError('FORBIDDEN_FOR_SUB_ROLE', 'Not allowed to change activation');
    }
    return subRoles;
  }

  private async requireCity(cityId: string): Promise<CityRecord> {
    const city = isUuid(cityId) ? await this.repo.getCity(cityId) : null;
    if (!city) throw this.notFound(cityId, 'City');
    return city;
  }

  private notFound(id: string, what: string): CatalogWriteError {
    return isUuid(id)
      ? new CatalogWriteError('NOT_FOUND', `${what} not found`)
      : new CatalogWriteError('INVALID_ID', `${what} ID is not a UUID`);
  }

  private async write(
    cmd: ActivationCommand,
    subRoles: readonly AdminSubRoleName[],
    target: ActivationTarget,
    before: boolean,
    action: string,
  ): Promise<ActivationRecord> {
    try {
      return await this.repo.setActivation(
        cmd.cityId,
        target,
        cmd.isActive,
        this.audit(cmd, subRoles, action, 'catalog_activation', null, before, target),
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CatalogWriteError(
          'CONCURRENT_WRITE',
          'Another change was saved at the same time; retry',
        );
      }
      throw error;
    }
  }

  private audit(
    cmd: ActivationCommand,
    subRoles: readonly AdminSubRoleName[],
    action: string,
    objectType: string,
    objectId: string | null,
    before: boolean,
    target?: ActivationTarget,
  ): AuditEntryInput {
    const subject = target ? { cityId: cmd.cityId, [target.kind.toLowerCase()]: target.id } : {};
    return {
      actorUserId: cmd.actorUserId,
      actorSubRoles: subRoles,
      action,
      objectType,
      objectId,
      before: { ...subject, isActive: before },
      after: { ...subject, isActive: cmd.isActive },
      reason: cmd.reason.trim(),
    };
  }
}

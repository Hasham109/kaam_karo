// Public API of the catalog module (M4, owner A03; INFRA-001). Other modules import only from here.
export { PlatformAuditPort } from './platform-audit.port';
export {
  ADMIN_SUB_ROLES,
  type AdminSubRoleName,
  CATALOG_ACTIVATION_SUB_ROLES,
  DenyAllStaffRoleLookup,
  hasAnySubRole,
  isUniqueViolation,
  isUuid,
  STAFF_ROLE_LOOKUP,
  type StaffRoleLookup,
} from './staff-roles';
export { CATALOG_SCOPE_REF_CHECK, CatalogModule } from './catalog.module';
export {
  type ActiveFamily,
  type ActivationCommand,
  type Availability,
  CatalogService,
  CatalogWriteError,
  type CatalogWriteErrorCode,
  type UnavailableReason,
} from './catalog.service';
export {
  type ActivationRecord,
  type ActivationTarget,
  CATALOG_REPOSITORY,
  type CatalogRepository,
  type CategoryRecord,
  type CityRecord,
  PrismaCatalogRepository,
  type ServiceRecord,
} from './catalog.repository';

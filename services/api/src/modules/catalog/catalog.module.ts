/**
 * M4 catalog module wiring (T2.6, owner A03). Uses the global PlatformModule (PrismaService,
 * AuditWriter; T2.2). CatalogService is also the ScopeRefCheck for the config module
 * (CATALOG_SCOPE_REF_CHECK). AppModule imports it (RQ-008 to A01).
 */
import { Module } from '@nestjs/common';
import { AuditWriter, PrismaService } from '../../platform';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
  PrismaCatalogRepository,
} from './catalog.repository';
import { CatalogService } from './catalog.service';
import { PlatformAuditPort } from './platform-audit.port';
import { DenyAllStaffRoleLookup, STAFF_ROLE_LOOKUP, type StaffRoleLookup } from './staff-roles';

export const CATALOG_SCOPE_REF_CHECK = Symbol.for('kaamkaro.catalog.ScopeRefCheck');

@Module({
  providers: [
    {
      provide: CATALOG_REPOSITORY,
      useFactory: (prisma: PrismaService, writer: AuditWriter) =>
        new PrismaCatalogRepository(prisma, new PlatformAuditPort(writer)),
      inject: [PrismaService, AuditWriter],
    },
    {
      provide: CatalogService,
      useFactory: (repo: CatalogRepository, staff: StaffRoleLookup) =>
        new CatalogService(repo, staff),
      inject: [CATALOG_REPOSITORY, STAFF_ROLE_LOOKUP],
    },
    // Deny by default until A02 binds the identity lookup (T2.4, RQ-012; SEC-REVIEW-T2.6 #4).
    { provide: STAFF_ROLE_LOOKUP, useClass: DenyAllStaffRoleLookup },
    { provide: CATALOG_SCOPE_REF_CHECK, useExisting: CatalogService },
  ],
  exports: [CatalogService, CATALOG_SCOPE_REF_CHECK, STAFF_ROLE_LOOKUP],
})
export class CatalogModule {}

/**
 * M17 config module wiring (T2.6, owner A03; RQ-006). Global, because every module reads config.
 * Provides CONFIG_RULE_SOURCE (the config_rule store), CONFIG_SERVICE (A01's cached reader from
 * @kaamkaro/platform) and ConfigAdminService for admin writes (CFG-RULE-001…012; BP §42, §64).
 * Uses the global PlatformModule (PrismaService, AuditWriter; T2.2) and CatalogModule for the
 * scope-ID check. AppModule imports it (RQ-008 to A01).
 */
import { Global, Module } from '@nestjs/common';
import {
  CONFIG_RULE_SOURCE,
  CONFIG_SERVICE,
  CachedConfigService,
  type ConfigService,
  type ServerEnv,
} from '@kaamkaro/platform';
import { SERVER_ENV } from '../../config/server-env.module';
import { AuditWriter, PrismaService } from '../../platform';
import {
  CATALOG_SCOPE_REF_CHECK,
  CatalogModule,
  PlatformAuditPort,
  STAFF_ROLE_LOOKUP,
  type StaffRoleLookup,
} from '../catalog';
import { ConfigAdminService, type ScopeRefCheck } from './config-admin.service';
import {
  CONFIG_RULE_STORE,
  type ConfigRuleStore,
  PrismaConfigRuleStore,
} from './config-rule.store';

@Global()
@Module({
  imports: [CatalogModule],
  providers: [
    {
      provide: CONFIG_RULE_STORE,
      useFactory: (prisma: PrismaService, writer: AuditWriter) =>
        new PrismaConfigRuleStore(prisma, new PlatformAuditPort(writer)),
      inject: [PrismaService, AuditWriter],
    },
    { provide: CONFIG_RULE_SOURCE, useExisting: CONFIG_RULE_STORE },
    {
      provide: CONFIG_SERVICE,
      useFactory: (source: ConfigRuleStore, env: ServerEnv) =>
        new CachedConfigService(source, { cacheTtlMs: env.configCacheTtlMs }),
      inject: [CONFIG_RULE_SOURCE, SERVER_ENV],
    },
    {
      provide: ConfigAdminService,
      useFactory: (
        store: ConfigRuleStore,
        reader: ConfigService,
        refs: ScopeRefCheck,
        staff: StaffRoleLookup,
      ) => new ConfigAdminService(store, reader, refs, staff),
      inject: [CONFIG_RULE_STORE, CONFIG_SERVICE, CATALOG_SCOPE_REF_CHECK, STAFF_ROLE_LOOKUP],
    },
  ],
  exports: [CONFIG_SERVICE, CONFIG_RULE_SOURCE, ConfigAdminService],
})
export class ConfigRulesModule {}

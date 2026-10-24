/**
 * T2.6 wiring (RQ-006): ConfigRulesModule + CatalogModule on top of the global PlatformModule
 * (T2.2) resolve CONFIG_SERVICE, CONFIG_RULE_SOURCE, ConfigAdminService and CatalogService
 * without a database (PrismaService connects lazily). CFG-RULE-001, SEC-BASE-010.
 */
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import {
  CachedConfigService,
  CONFIG_RULE_SOURCE,
  CONFIG_SERVICE,
  loadServerEnv,
} from '@kaamkaro/platform';
import { describe, expect, it, vi } from 'vitest';
import { ServerEnvModule } from '../../config/server-env.module';
import { PlatformModule, type TxClient } from '../../platform';
import { CatalogService, PlatformAuditPort } from '../catalog';
import { ConfigAdminService, ConfigRulesModule, PrismaConfigRuleStore } from './index';

describe('Config + catalog module wiring', () => {
  it('[CFG-RULE-001] resolves the reader, the store, the admin service and the catalog service', async () => {
    const env = loadServerEnv({ APP_ENV: 'test', LOG_LEVEL: 'error' });
    const moduleRef = await Test.createTestingModule({
      imports: [ServerEnvModule.forRoot(env), PlatformModule, ConfigRulesModule],
    }).compile();
    expect(moduleRef.get(CONFIG_SERVICE)).toBeInstanceOf(CachedConfigService);
    expect(moduleRef.get(CONFIG_RULE_SOURCE)).toBeInstanceOf(PrismaConfigRuleStore);
    expect(moduleRef.get(ConfigAdminService)).toBeInstanceOf(ConfigAdminService);
    expect(moduleRef.get(CatalogService, { strict: false })).toBeInstanceOf(CatalogService);
    await moduleRef.close();
  });

  it('[SEC-BASE-010] the audit port writes an ADMIN audit entry with reason inside the transaction', async () => {
    const write = vi.fn().mockResolvedValue('audit-id');
    const port = new PlatformAuditPort({ write });
    const tx = {} as TxClient;
    await port.record(
      {
        actorUserId: 'u1',
        actorSubRoles: ['FINANCE'],
        action: 'CONFIG_RULE_SET',
        objectType: 'config_rule',
        objectId: 'r1',
        before: { value: null },
        after: { value: 1 },
        reason: 'why',
      },
      tx,
    );
    expect(write).toHaveBeenCalledWith(
      {
        actor: { userId: 'u1', role: 'ADMIN', subRoles: ['FINANCE'] },
        action: 'CONFIG_RULE_SET',
        object: { type: 'config_rule', id: 'r1' },
        before: { value: null },
        after: { value: 1 },
        reason: 'why',
      },
      tx,
    );
  });
});

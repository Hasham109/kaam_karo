// Public API of the config module (M17, owner A03; INFRA-001). Other modules import only from here.
// Reading config: inject CONFIG_SERVICE from @kaamkaro/platform (A01 reader), not this module.
export { ConfigRulesModule } from './config.module';
export {
  ConfigAdminService,
  type ConfigKeyView,
  CONFIG_WRITE_HTTP_STATUS,
  ConfigWriteError,
  type ConfigWriteErrorCode,
  fingerprintValue,
  presentableValue,
  CONFIG_SCOPE_REF_CHECK,
  type ScopeRefCheck,
  type SetConfigRuleCommand,
} from './config-admin.service';
export {
  type AuditEntryInput,
  type AuditPort,
  CONFIG_RULE_STORE,
  type ConfigRuleStore,
  type NewConfigRuleVersion,
  PrismaConfigRuleStore,
} from './config-rule.store';
export {
  CONFIG_KEYS,
  type ConfigKeyDefinition,
  type ConfigUnit,
  type ConfigValueKind,
  EDIT_GROUP_SUB_ROLES,
  type EditGroup,
  FAIL_CLOSED_KEYS,
  UNIT_CEILINGS,
  canAccessKey,
  configKeyDefinition,
  isFailClosedConfigKey,
  isValidValueFor,
  parserFor,
} from './config-keys';
export {
  assertFailClosedKeysSet,
  FailClosedConfigError,
  LIMIT_NOT_CONFIGURED,
  missingFailClosedKeys,
} from './config-readiness';

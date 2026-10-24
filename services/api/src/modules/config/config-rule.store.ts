/**
 * ConfigRule backing store (T2.6, owner A03; RQ-006 from A01).
 * CFG-RULE-001…012 (BP §42, §64; ARCH §5.3): config_rule is append-only and versioned
 * (BP §26; SEC-REVIEW-T2.3 #8): a change is always a new row; effective_from is never back-dated
 * (DB CHECK config_rule_not_backdated + ConfigAdminService). SEC-BASE-010: every change is
 * written together with its audit row in one transaction.
 */
import type {
  ConfigRuleSource,
  ConfigRuleVersion,
  ConfigScope,
  JsonValue,
} from '@kaamkaro/platform';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

/** Audit row for a config or catalog change (BP §25 actor/action/object; BP §26; SEC-BASE-010). */
export interface AuditEntryInput {
  readonly actorUserId: string;
  /** Admin sub-roles of the actor at the time (BP §8.4; OQ-053). */
  readonly actorSubRoles?: readonly string[];
  readonly action: string;
  readonly objectType: string;
  readonly objectId: string | null;
  readonly before: JsonValue | null;
  readonly after: JsonValue | null;
  readonly reason: string;
}

/**
 * Port to the platform audit writer (A01, T2.2). It receives the open transaction so the audit
 * row commits or rolls back with the change. Bound to AuditWriter by PlatformAuditPort (catalog).
 */
export interface AuditPort {
  record(entry: AuditEntryInput, tx: Prisma.TransactionClient): Promise<void>;
}

export const CONFIG_RULE_STORE = Symbol.for('kaamkaro.config.RuleStore');

export interface NewConfigRuleVersion {
  readonly key: string;
  readonly scope: ConfigScope;
  readonly scopeRefId: string | null;
  readonly value: JsonValue | null;
  readonly effectiveFrom: Date;
  readonly changedByUserId: string;
}

export interface ConfigRuleStore extends ConfigRuleSource {
  /** Inserts a new version and its audit row atomically; returns the stored version. */
  append(version: NewConfigRuleVersion, audit: AuditEntryInput): Promise<ConfigRuleVersion>;
}

type ConfigRuleRow = {
  id: string;
  key: string;
  scope: ConfigScope;
  scopeRefId: string | null;
  value: unknown;
  effectiveFrom: Date;
};

function toVersion(row: ConfigRuleRow): ConfigRuleVersion {
  return {
    id: row.id,
    key: row.key,
    scope: row.scope,
    scopeRefId: row.scopeRefId,
    // DB NULL arrives as null; JSON null is treated the same (TODO(OWNER), RQ-006 item 1).
    value: (row.value ?? null) as JsonValue | null,
    effectiveFrom: row.effectiveFrom,
  };
}

export type ConfigDb = Pick<PrismaClient, 'configRule' | '$transaction'>;

/** Prisma implementation. Errors propagate (never `[]` on failure; the reader fails closed). */
export class PrismaConfigRuleStore implements ConfigRuleStore {
  private readonly db: ConfigDb;
  private readonly audit: AuditPort;

  constructor(db: ConfigDb, audit: AuditPort) {
    this.db = db;
    this.audit = audit;
  }

  async listVersions(key: string): Promise<readonly ConfigRuleVersion[]> {
    const rows = await this.db.configRule.findMany({
      where: { key },
      orderBy: [{ effectiveFrom: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        key: true,
        scope: true,
        scopeRefId: true,
        value: true,
        effectiveFrom: true,
      },
    });
    return rows.map(toVersion);
  }

  async append(version: NewConfigRuleVersion, audit: AuditEntryInput): Promise<ConfigRuleVersion> {
    return this.db.$transaction(async (tx) => {
      const row = await tx.configRule.create({
        data: {
          key: version.key,
          scope: version.scope,
          scopeRefId: version.scopeRefId,
          value: version.value === null ? Prisma.DbNull : (version.value as Prisma.InputJsonValue),
          effectiveFrom: version.effectiveFrom,
          changedByUserId: version.changedByUserId,
        },
        select: {
          id: true,
          key: true,
          scope: true,
          scopeRefId: true,
          value: true,
          effectiveFrom: true,
        },
      });
      await this.audit.record({ ...audit, objectId: row.id }, tx);
      return toVersion(row);
    });
  }
}

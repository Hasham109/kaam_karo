/**
 * Append-only writers for audit_log and marketplace_event (T2.2; M18; BP §26, §29, §66;
 * DATA-002, DATA-004, SEC-BASE-010; SEC-REVIEW-T2.3 #10).
 * The PII masker runs inside `buildAuditRow` / `buildMarketplaceEventRow`; these writers accept
 * only entries, never raw rows, so the masker cannot be skipped. INSERT only: the DB role has no
 * UPDATE/DELETE and triggers refuse it (T2.3), so there is deliberately no update method.
 * Pass the transaction client `tx` to make the audit row commit/roll back with the change.
 */
import { Injectable } from '@nestjs/common';
import {
  type AuditEntry,
  type MarketplaceEventEntry,
  buildAuditRow,
  buildMarketplaceEventRow,
} from '@kaamkaro/platform';
import type { $Enums } from '../generated/prisma/client.js';
import { toDbJson } from './json';
import { type DbClient, PrismaService } from './prisma.service';

@Injectable()
export class AuditWriter {
  constructor(private readonly prisma: PrismaService) {}

  /** Insert one audit row; returns its ID. */
  async write(entry: AuditEntry, tx?: DbClient): Promise<string> {
    const row = buildAuditRow(entry);
    const created = await (tx ?? this.prisma).auditLog.create({
      data: {
        actorUserId: row.actorUserId,
        actorRole: row.actorRole,
        actorSubRoles: row.actorSubRoles as $Enums.AdminSubRole[],
        action: row.action,
        objectType: row.objectType,
        objectId: row.objectId,
        before: toDbJson(row.before),
        after: toDbJson(row.after),
        reason: row.reason,
        sourceMetadata: toDbJson(row.sourceMetadata),
      },
      select: { id: true },
    });
    return created.id;
  }
}

@Injectable()
export class MarketplaceEventWriter {
  constructor(private readonly prisma: PrismaService) {}

  async write(entry: MarketplaceEventEntry, tx?: DbClient): Promise<string> {
    const row = buildMarketplaceEventRow(entry);
    const created = await (tx ?? this.prisma).marketplaceEvent.create({
      data: { ...row, sourceMetadata: toDbJson(row.sourceMetadata) },
      select: { id: true },
    });
    return created.id;
  }
}

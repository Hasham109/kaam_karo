/**
 * AuditPort bound to the platform AuditWriter (T2.2, A01); used by the catalog and config modules. Catalog and config changes are staff
 * actions, so the actor role is ADMIN and the reason is mandatory (SEC-BASE-010, ROLE-003;
 * BP §11, §26). The writer masks PII before the append-only insert (SEC-REVIEW-T2.3 #10).
 */
import type { AuditWriter, TxClient } from '../../platform';
import type { AuditEntryInput, AuditPort } from '../config';

export class PlatformAuditPort implements AuditPort {
  private readonly writer: Pick<AuditWriter, 'write'>;

  constructor(writer: Pick<AuditWriter, 'write'>) {
    this.writer = writer;
  }

  async record(entry: AuditEntryInput, tx: TxClient): Promise<void> {
    await this.writer.write(
      {
        actor: { userId: entry.actorUserId, role: 'ADMIN', subRoles: entry.actorSubRoles ?? [] },
        action: entry.action,
        object: { type: entry.objectType, id: entry.objectId },
        before: entry.before,
        after: entry.after,
        reason: entry.reason,
      },
      tx,
    );
  }
}

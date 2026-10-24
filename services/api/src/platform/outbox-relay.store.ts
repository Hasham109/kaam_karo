/**
 * Relay store over `outbox_event` (T2.2; ARCH §7; BP §31.2; REL-007, REL-009).
 * One transaction per batch: lock due rows with FOR UPDATE SKIP LOCKED (several worker replicas
 * never take the same row), publish, then mark PUBLISHED or schedule the retry / dead-letter.
 */
import { Injectable } from '@nestjs/common';
import type {
  MaskedJson,
  OutboxDeliveryOutcome,
  OutboxDueEvent,
  OutboxRelayStore,
} from '@kaamkaro/platform';
import { PrismaService } from './prisma.service';

interface DueRow {
  id: string;
  event_type: string;
  schema_version: number;
  aggregate_type: string;
  aggregate_id: string;
  payload: MaskedJson;
  occurred_at: Date;
  attempts: number;
}

/** Upper bound for one relay transaction (technical; publishing a batch is fast). */
const BATCH_TRANSACTION_TIMEOUT_MS = 60_000;

@Injectable()
export class PrismaOutboxRelayStore implements OutboxRelayStore {
  constructor(private readonly prisma: PrismaService) {}

  withDueBatch(
    limit: number,
    now: Date,
    deliver: (events: readonly OutboxDueEvent[]) => Promise<readonly OutboxDeliveryOutcome[]>,
  ): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<DueRow[]>`
          SELECT id, event_type, schema_version, aggregate_type, aggregate_id, payload,
                 occurred_at, attempts
            FROM outbox_event
           WHERE status = 'PENDING' AND next_attempt_at <= ${now}
           ORDER BY occurred_at, id
           LIMIT ${limit}
             FOR UPDATE SKIP LOCKED`;
        if (rows.length === 0) return 0;
        const outcomes = await deliver(
          rows.map((r) => ({
            id: r.id,
            eventType: r.event_type,
            schemaVersion: r.schema_version,
            aggregateType: r.aggregate_type,
            aggregateId: r.aggregate_id,
            payload: r.payload,
            occurredAt: r.occurred_at.toISOString(),
            attempts: r.attempts,
          })),
        );
        const published = outcomes.filter((o) => o.ok).map((o) => o.id);
        if (published.length > 0) {
          await tx.outboxEvent.updateMany({
            where: { id: { in: published } },
            data: { status: 'PUBLISHED', publishedAt: now, lastError: null },
          });
        }
        for (const o of outcomes) {
          if (o.ok) continue;
          await tx.outboxEvent.update({
            where: { id: o.id },
            data:
              o.nextAttemptAt === null
                ? { status: 'FAILED', attempts: o.attempts, lastError: o.error }
                : { attempts: o.attempts, nextAttemptAt: o.nextAttemptAt, lastError: o.error },
          });
        }
        return rows.length;
      },
      { timeout: BATCH_TRANSACTION_TIMEOUT_MS },
    );
  }

  /**
   * Retention (SEC-REVIEW-T2.2 #8; BP §26; OQ-080): delete PUBLISHED rows older than
   * `publishedDays` and FAILED (dead-lettered) rows older than `failedDays`. null = keep
   * (TODO(OWNER), OQ-080). Returns the number of rows removed.
   */
  async purge(now: Date, publishedDays: number | null, failedDays: number | null): Promise<number> {
    let removed = 0;
    const day = 86_400_000;
    if (publishedDays !== null) {
      const r = await this.prisma.outboxEvent.deleteMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: { lt: new Date(now.getTime() - publishedDays * day) },
        },
      });
      removed += r.count;
    }
    if (failedDays !== null) {
      const r = await this.prisma.outboxEvent.deleteMany({
        where: { status: 'FAILED', updatedAt: { lt: new Date(now.getTime() - failedDays * day) } },
      });
      removed += r.count;
    }
    return removed;
  }

  /** Dead-lettered events (status FAILED), for system health (T5.4). */
  countFailed(): Promise<number> {
    return this.prisma.outboxEvent.count({ where: { status: 'FAILED' } });
  }
}

/**
 * Transactional outbox writer (T2.2; ARCH §7; BP §24, §31.2; D-001; NOTIF-001, REL-009).
 * ALWAYS call it with the transaction client of the state change:
 *
 *   await prisma.$transaction(async (tx) => {
 *     await tx.booking.update(...);                     // state change (own module table)
 *     await outbox.append(tx, { eventType: 'booking.accepted', ... });
 *   });
 *
 * Rollback → no event. Commit → the relay (worker process) delivers it at least once.
 */
import { Injectable } from '@nestjs/common';
import { type OutboxEventInput, buildOutboxRow } from '@kaamkaro/platform';
import type { Prisma } from '../generated/prisma/client.js';
import type { TxClient } from './prisma.service';

@Injectable()
export class OutboxWriter {
  /** Returns the event ID (= consumer de-duplication key). */
  async append(tx: TxClient, event: OutboxEventInput): Promise<string> {
    const row = buildOutboxRow(event);
    const created = await tx.outboxEvent.create({
      data: { ...row, payload: row.payload as Prisma.InputJsonValue },
      select: { id: true },
    });
    return created.id;
  }
}

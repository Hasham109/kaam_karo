/**
 * `idempotency_key` table store (T2.2; ARCH §5.3; BP §31.2; REL-008). The unique key
 * (scope, operation, key) makes "same key twice → one row" a database guarantee: two concurrent
 * first requests race on INSERT … ON CONFLICT DO NOTHING and exactly one wins.
 */
import { Injectable } from '@nestjs/common';
import type { IdempotencyKeyRef, IdempotencyRecord, IdempotencyStore } from '@kaamkaro/platform';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from './prisma.service';

interface Row {
  id: string;
  request_hash: string;
  response_status: number | null;
  response_body: unknown;
  updated_at: Date;
  expires_at: Date;
}

function toRecord(r: Row): IdempotencyRecord {
  return {
    id: r.id,
    requestHash: r.request_hash,
    responseStatus: r.response_status,
    responseBody: r.response_body,
    updatedAt: r.updated_at,
    expiresAt: r.expires_at,
  };
}

const COLUMNS = Prisma.sql`id, request_hash, response_status, response_body, updated_at, expires_at`;

@Injectable()
export class PrismaIdempotencyStore implements IdempotencyStore {
  constructor(private readonly prisma: PrismaService) {}

  async tryInsert(ref: IdempotencyKeyRef, requestHash: string, expiresAt: Date) {
    const rows = await this.prisma.$queryRaw<Row[]>`
      INSERT INTO idempotency_key (scope, operation, key, request_hash, expires_at)
      VALUES (${ref.scope}, ${ref.operation}, ${ref.key}, ${requestHash}, ${expiresAt})
      ON CONFLICT (scope, operation, key) DO NOTHING
      RETURNING ${COLUMNS}`;
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async find(ref: IdempotencyKeyRef) {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT ${COLUMNS} FROM idempotency_key
       WHERE scope = ${ref.scope} AND operation = ${ref.operation} AND key = ${ref.key}`;
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async complete(id: string, status: number, body: unknown) {
    await this.prisma.idempotencyKey.update({
      where: { id },
      data: {
        responseStatus: status,
        responseBody:
          body === null || body === undefined ? Prisma.DbNull : (body as Prisma.InputJsonValue),
      },
    });
  }

  async release(id: string) {
    await this.prisma.idempotencyKey.deleteMany({ where: { id, responseStatus: null } });
  }

  async reclaim(id: string, expectedUpdatedAt: Date, requestHash: string, expiresAt: Date) {
    const rows = await this.prisma.$queryRaw<Row[]>`
      UPDATE idempotency_key
         SET request_hash = ${requestHash}, response_status = NULL, response_body = NULL,
             expires_at = ${expiresAt}, updated_at = now()
       WHERE id = ${id}::uuid AND updated_at = ${expectedUpdatedAt}
      RETURNING ${COLUMNS}`;
    return rows[0] ? toRecord(rows[0]) : null;
  }

  /** Lease heartbeat (SEC-REVIEW-T2.2 #2): only a still-running row is refreshed. */
  async heartbeat(id: string) {
    await this.prisma.$executeRaw`
      UPDATE idempotency_key SET updated_at = now()
       WHERE id = ${id}::uuid AND response_status IS NULL`;
  }

  async purgeExpired(now: Date) {
    const result = await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return result.count;
  }
}

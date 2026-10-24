import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { maskCreateArgs } from './append-only-masking';

// SEC-REVIEW-T2.2 #5(b), QA-T22-06; SEC-REVIEW-T2.3 #10 (BP §26, §29; DATA-003, DATA-004).
describe('[DATA-004] structural masking hook for append-only tables', () => {
  it('[DATA-004] job_event / refund / ledger reasons are masked on create, createMany and upsert', () => {
    const create = maskCreateArgs('jobEvent', 'create', {
      data: {
        bookingId: 'b1',
        reason: 'customer ۰۳۰۰۱۲۳۴۵۶۷ no show',
        sourceMetadata: { phone: '0300', ip: '203.0.113.9' },
      },
    }) as { data: Record<string, unknown> };
    expect(create.data['reason']).toBe('customer [PHONE] no show');
    expect(create.data['sourceMetadata']).toEqual({ phone: '[REDACTED]', ip: '203.0.113.0/24' });

    const many = maskCreateArgs('refund', 'createMany', {
      data: [{ reason: 'refund to 03001234567' }, { reason: 'ok' }],
    }) as { data: Record<string, unknown>[] };
    expect(many.data.map((r) => r['reason'])).toEqual(['refund to [PHONE]', 'ok']);

    const upsert = maskCreateArgs('providerLedgerEntry', 'upsert', {
      where: { id: 'x' },
      create: { reason: 'call 0300-1234567' },
      update: {},
    }) as { create: Record<string, unknown> };
    expect(upsert.create['reason']).toBe('call [PHONE]');
  });

  it('[DATA-004] works with the schema model name Prisma passes to query extensions (AuditLog)', () => {
    const out = maskCreateArgs('AuditLog', 'create', { data: { reason: 'call 03001234567' } }) as {
      data: Record<string, unknown>;
    };
    expect(out.data['reason']).toBe('call [PHONE]');
  });

  it('[DATA-004] Prisma null markers, reads and other models are left untouched', () => {
    const args = { data: { before: Prisma.DbNull, reason: null } };
    expect(maskCreateArgs('auditLog', 'create', args)).toEqual(args);
    const read = { where: { reason: '03001234567' } };
    expect(maskCreateArgs('auditLog', 'findMany', read)).toBe(read);
    const other = { data: { displayName: 'Ali' } };
    expect(maskCreateArgs('user', 'create', other)).toBe(other);
  });
});

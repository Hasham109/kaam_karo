import { describe, expect, it } from 'vitest';
import {
  AuditValidationError,
  buildAuditRow,
  buildMarketplaceEventRow,
  isSafeObjectId,
} from './audit';

const ADMIN = { userId: '0b6f1d9e-3c1a-4b8e-9f00-123456789012', role: 'ADMIN' as const };

// DATA-004, SEC-BASE-010, DATA-002, ROLE-003 (BP §26, §29, §66, §8.3); SEC-REVIEW-T2.3 #10.
describe('[SEC-BASE-010] audit row builder', () => {
  it('[DATA-004] masks before/after, reason and source before the row exists', () => {
    const row = buildAuditRow({
      actor: { ...ADMIN, subRoles: ['FINANCE'] },
      action: 'PROVIDER_PROFILE_CHANGED',
      object: { type: 'provider_profile', id: 'p-1' },
      before: { phoneE164: '+923001234567', businessName: 'Ali Electric' },
      after: { phoneE164: '+923331112223', sessionToken: 'tok_abcdef123456' },
      reason: 'customer called from 0300-7654321, see ticket',
      source: {
        ip: '203.0.113.200',
        userAgent: 'okhttp/4',
        client: 'admin-portal',
        email: 'a@b.pk',
      },
    });
    const text = JSON.stringify(row);
    for (const leak of [
      '923001234567',
      '923331112223',
      'tok_abcdef123456',
      '0300-7654321',
      '203.0.113.200',
      'a@b.pk',
    ]) {
      expect(text, leak).not.toContain(leak);
    }
    expect(row.sourceMetadata).toEqual({
      client: 'admin-portal',
      email: '[REDACTED]',
      ip: '203.0.113.0/24',
      userAgent: 'okhttp/4',
    });
    expect(row.reason).toBe('customer called from [PHONE], see ticket');
    expect(row.actorSubRoles).toEqual(['FINANCE']);
    expect(row.objectId).toBe('p-1');
  });

  it('[ROLE-003] an admin write without a reason is refused', () => {
    expect(() =>
      buildAuditRow({
        actor: ADMIN,
        action: 'CONFIG_RULE_CHANGED',
        object: { type: 'config_rule' },
      }),
    ).toThrow(AuditValidationError);
    expect(() =>
      buildAuditRow({
        actor: ADMIN,
        action: 'CONFIG_RULE_CHANGED',
        object: { type: 'config_rule' },
        reason: '   ',
      }),
    ).toThrow(/reason/);
  });

  it('[SEC-BASE-010] only SYSTEM may have no actor user; codes are validated', () => {
    expect(() =>
      buildAuditRow({
        actor: { userId: null, role: 'CUSTOMER' },
        action: 'X',
        object: { type: 'booking' },
      }),
    ).toThrow(AuditValidationError);
    expect(
      buildAuditRow({
        actor: { userId: null, role: 'SYSTEM' },
        action: 'KEY_PURGED',
        object: { type: 'idempotency_key' },
      }).actorUserId,
    ).toBeNull();
    expect(() =>
      buildAuditRow({ actor: ADMIN, action: 'lower-case', object: { type: 'x' }, reason: 'r' }),
    ).toThrow(/action/);
    expect(() =>
      buildAuditRow({ actor: ADMIN, action: 'OK', object: { type: 'Bad Type' }, reason: 'r' }),
    ).toThrow(/object type/);
  });
});

describe('[DATA-002] marketplace event row builder', () => {
  it('[DATA-002] records actor, action, object, previous/new state with masked source', () => {
    const row = buildMarketplaceEventRow({
      actor: { userId: 'u-1', role: 'PROVIDER' },
      action: 'QUOTE_SUBMITTED',
      object: { type: 'quote', id: 'q-1' },
      previousState: 'DRAFT',
      newState: 'SUBMITTED',
      source: { ip: '2001:db8:abcd:12::1', client: 'partner-app' },
    });
    expect(row).toEqual({
      actorUserId: 'u-1',
      actorRole: 'PROVIDER',
      action: 'QUOTE_SUBMITTED',
      objectType: 'quote',
      objectId: 'q-1',
      previousState: 'DRAFT',
      newState: 'SUBMITTED',
      sourceMetadata: { client: 'partner-app', ip: '2001:db8:abcd::/48' },
    });
  });

  it('[DATA-002] refuses a missing object ID or a malformed state', () => {
    expect(() =>
      buildMarketplaceEventRow({
        actor: { userId: 'u-1', role: 'PROVIDER' },
        action: 'X',
        object: { type: 'quote', id: '' },
      }),
    ).toThrow(AuditValidationError);
    expect(() =>
      buildMarketplaceEventRow({
        actor: { userId: 'u-1', role: 'PROVIDER' },
        action: 'X',
        object: { type: 'quote', id: 'q' },
        newState: 'call 03001234567',
      }),
    ).toThrow(/state/);
  });
});

// SEC-REVIEW-T2.2 #5(a), #12; QA-T22-04 (BP §26, §29, §66; DATA-004).
describe('[DATA-004] review fixes: IDs, request IDs, mask-then-bound', () => {
  const base = { actor: ADMIN, action: 'OTP_SENT', reason: 'r' } as const;

  it('[DATA-004] a phone number used as an object ID is refused; UUIDs and short keys pass', () => {
    for (const id of ['+923001234567', '03001234567', 'Ali Khan', 'x'.repeat(65)]) {
      expect(() => buildAuditRow({ ...base, object: { type: 'user', id } }), id).toThrow(
        AuditValidationError,
      );
    }
    expect(
      buildAuditRow({ ...base, object: { type: 'config_rule', id: 'commission.rate' } }).objectId,
    ).toBe('commission.rate');
    expect(
      buildAuditRow({
        ...base,
        object: { type: 'user', id: '0b6f1d9e-3c1a-4b8e-9f00-123456789012' },
      }).objectId,
    ).toBe('0b6f1d9e-3c1a-4b8e-9f00-123456789012');
  });

  it('[DATA-004] phone-shaped IDs are refused; random numeric key parts are allowed', () => {
    for (const id of [
      'user-03001234567',
      '923001234567',
      'a.b@x.pk',
      '10.0.0.1',
      '35202-1234567-1',
    ]) {
      expect(isSafeObjectId(id), id).toBe(false);
    }
    for (const id of ['20394857-12', 'run-1234567890', 'commission.rate', 'b1']) {
      expect(isSafeObjectId(id), id).toBe(true);
    }
  });

  it('[DATA-004] source.requestId must be the server UUID; the client ID is only a masked hint', () => {
    expect(() =>
      buildAuditRow({ ...base, object: { type: 'user' }, source: { requestId: 'AAAAAAAA' } }),
    ).toThrow(/server-generated/);
    const row = buildAuditRow({
      ...base,
      object: { type: 'user' },
      source: {
        requestId: '7d0c2b54-1111-4222-8333-444455556666',
        clientRequestId: `trace-03001234567-${'z'.repeat(100)}`,
      },
    });
    const src = row.sourceMetadata as Record<string, string>;
    expect(src['requestId']).toBe('7d0c2b54-1111-4222-8333-444455556666');
    expect(src['clientRequestId']).not.toContain('03001234567');
    expect(src['clientRequestId']?.length).toBeLessThanOrEqual(64);
  });

  it('[DATA-004] QA-T22-04: a phone at the 2000-char boundary is masked, not cut into a fragment', () => {
    const row = buildAuditRow({
      ...base,
      object: { type: 'user' },
      reason: `${'x'.repeat(1993)} 03001234567`,
    });
    expect(row.reason).not.toMatch(/\d{3,}/);
  });

  it('[DATA-002] marketplace events refuse a phone as the object ID', () => {
    expect(() =>
      buildMarketplaceEventRow({
        actor: { userId: 'u-1', role: 'PROVIDER' },
        action: 'X',
        object: { type: 'quote', id: '03001234567' },
      }),
    ).toThrow(AuditValidationError);
  });
});

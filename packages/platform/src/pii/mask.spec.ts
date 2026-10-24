import { describe, expect, it } from 'vitest';
import {
  REDACTED,
  REDACTED_EMAIL,
  REDACTED_PHONE,
  classifyKey,
  maskFreeText,
  maskPii,
  truncateIp,
} from './mask';

// SEC-REVIEW-T2.3 #10; DATA-003, DATA-004 (BP §26, §29): PII never reaches append-only rows.
describe('[DATA-004] PII masker for append-only writes (SEC-REVIEW-T2.3 #10)', () => {
  it('[DATA-004] a payload with a phone, an IP and a token keeps none of them', () => {
    const payload = {
      phoneE164: '+923001234567',
      ip: '203.0.113.77',
      sessionToken: 'tok_live_9f8e7d6c5b4a',
      note: 'customer 0300-1234567 called from 198.51.100.23, mail ali@example.com',
      nested: { contact: { mobile: '03001234567' }, otp: '123456' },
    };
    const out = JSON.stringify(maskPii(payload));
    for (const secret of [
      '923001234567',
      '03001234567',
      '0300-1234567',
      '203.0.113.77',
      '198.51.100.23',
      'tok_live_9f8e7d6c5b4a',
      'ali@example.com',
      '123456',
    ]) {
      expect(out, secret).not.toContain(secret);
    }
    expect(out).toContain('203.0.113.0/24');
    expect(out).toContain('198.51.100.0/24');
    expect(out).toContain(REDACTED_PHONE);
    expect(out).toContain(REDACTED_EMAIL);
  });

  it('[DATA-003] identifiers stay so records remain traceable', () => {
    const out = maskPii({
      addressId: '0b6f1d9e-3c1a-4b8e-9f00-123456789012',
      phoneVerified: true,
      bookingId: '7d0c2b54-1111-4222-8333-444455556666',
      status: 'ACCEPTED',
      amountMinor: 250000n,
    });
    expect(out).toEqual({
      addressId: '0b6f1d9e-3c1a-4b8e-9f00-123456789012',
      phoneVerified: true,
      bookingId: '7d0c2b54-1111-4222-8333-444455556666',
      status: 'ACCEPTED',
      amountMinor: '250000',
    });
  });

  it.each([
    ['phone', 'redact'],
    ['phone_e164', 'redact'],
    ['email', 'redact'],
    ['addressText', 'redact'],
    ['point', 'redact'],
    ['lat', 'redact'],
    ['lng', 'redact'],
    ['refreshToken', 'redact'],
    ['sessionToken', 'redact'],
    ['customerPhone', 'redact'],
    ['pin', 'redact'],
    ['panel', 'keep'],
    ['otpCode', 'redact'],
    ['cnic', 'redact'],
    ['displayName', 'redact'],
    ['accountTitle', 'redact'],
    ['authorization', 'redact'],
    ['ip', 'ip'],
    ['ipAddress', 'ip'],
    ['x-forwarded-for', 'ip'],
    ['addressId', 'keep'],
    ['tokenRef', 'redact'],
    ['serviceName', 'keep'],
    ['reason', 'keep'],
  ] as const)('[DATA-004] key %s → %s', (key, rule) => {
    expect(classifyKey(key)).toBe(rule);
  });

  it('[DATA-004] IPs are truncated: IPv4 /24, IPv6 /48, mapped IPv4, lists', () => {
    expect(truncateIp('192.0.2.155')).toBe('192.0.2.0/24');
    expect(truncateIp('2001:db8:abcd:12:1::7')).toBe('2001:db8:abcd::/48');
    expect(truncateIp('::ffff:192.0.2.9')).toBe('192.0.2.0/24');
    expect(truncateIp('not-an-ip')).toBe('[IP]');
    expect(maskPii({ xForwardedFor: '192.0.2.1, 198.51.100.7' })).toEqual({
      xForwardedFor: '192.0.2.0/24, 198.51.100.0/24',
    });
  });

  it.each([
    'call +92 300 1234567 now',
    'call 0092-300-1234567 now',
    'call 03001234567 now',
    'call 0300 123 4567 now',
    'landline 042-35761234 please',
    'intl +44 20 7946 0958 ok',
  ])('[DATA-004] phone in free text is masked: %s', (text) => {
    const out = maskFreeText(text);
    expect(out).toContain(REDACTED_PHONE);
    expect(out.replace(/\D/g, '').length).toBeLessThan(4);
  });

  it('[DATA-004] CNIC and email in free text are masked; short numbers and UUIDs stay', () => {
    const out = maskFreeText(
      'cnic 35202-1234567-1, mail a.b@x.pk, booking 3fa2c91b07 for Rs 2500, id 0b6f1d9e-3c1a-4b8e-9f00-123456789012',
    );
    expect(out).not.toContain('35202-1234567-1');
    expect(out).not.toContain('a.b@x.pk');
    expect(out).toContain('3fa2c91b07');
    expect(out).toContain('2500');
    expect(out).toContain('0b6f1d9e-3c1a-4b8e-9f00-123456789012');
  });

  it('[DATA-004] never mutates input, survives cycles and deep nesting, drops functions', () => {
    const input: Record<string, unknown> = { phone: '03001234567', fn: () => 1, when: new Date(0) };
    input['self'] = input;
    let deep: Record<string, unknown> = {};
    const root = deep;
    for (let i = 0; i < 50; i += 1) {
      deep['n'] = {};
      deep = deep['n'] as Record<string, unknown>;
    }
    input['deep'] = root;
    const out = maskPii(input) as Record<string, unknown>;
    expect(input['phone']).toBe('03001234567');
    expect(out['phone']).toBe(REDACTED);
    expect(out['self']).toBe(REDACTED);
    expect(out).not.toHaveProperty('fn');
    expect(out['when']).toBe('1970-01-01T00:00:00.000Z');
    expect(JSON.stringify(out['deep'])).toContain(REDACTED);
  });

  it('[DATA-004] Errors keep only their name (messages can carry PII)', () => {
    expect(maskPii({ err: new Error('user 03001234567 failed') })).toEqual({
      err: { name: 'Error' },
    });
  });
});

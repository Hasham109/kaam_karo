import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  REDACTED,
  REDACTED_CNIC,
  REDACTED_IBAN,
  REDACTED_PHONE,
  classifyKey,
  maskAndBound,
  maskFreeText,
  maskPii,
} from './mask';

/** True when no run of ≥ 7 digits (any script) is left. */
function noLongNumber(text: string): boolean {
  return !/\p{Nd}(?:[^\p{L}]{0,3}\p{Nd}){6,}/u.test(text.replace(/\[[A-Z]+\]/g, ''));
}

// SEC-REVIEW-T2.2 #1 / QA-T22-01 (S2): DATA-003, DATA-004 (BP §26, §29). Urdu users type ۰-۹.
describe('[DATA-004] free-text phones in any digits and layout (SEC-REVIEW-T2.2 #1, QA-T22-01)', () => {
  it.each([
    ['Urdu digits', 'call ۰۳۰۰۱۲۳۴۵۶۷'],
    ['Arabic-Indic digits', 'call ٠٣٠٠١٢٣٤٥٦٧'],
    ['Urdu digits with dash', 'call ۰۳۰۰-۱۲۳۴۵۶۷'],
    ['full-width digits', 'call ０３００１２３４５６７'],
    ['mixed ASCII + Arabic-Indic', 'call 0300١٢٣٤٥٦٧'],
    ['spaced dash', 'call 0300 - 1234567'],
    ['parentheses', 'call (0300) 1234567'],
    ['slash', 'call 0300/1234567'],
    ['double space', 'call 0300  1234567'],
    ['en dash', 'call 0300–1234567'],
    ['underscore', 'call 0300_1234567'],
    ['zero-width space', 'call 0300​1234567'],
    ['zero-width joiner + BOM', 'call 0300‍123﻿4567'],
    ['tel prefix', 'tel03001234567'],
    ['num_ prefix', 'num_03001234567'],
    ['call glued', 'call0300-1234567'],
    ['phone-word join', '03001234567-urgent'],
    ['letters after', '03001234567abc'],
    ['landline in brackets', 'landline (042) 35761234'],
    ['landline dashed', 'landline 042-35761234'],
    ['plus spaced', '+92 300 1234567'],
    ['0092', '0092-300-1234567'],
    ['intl', 'intl +44 20 7946 0958'],
  ])('[DATA-004] %s is masked', (_label, text) => {
    const out = maskFreeText(text);
    expect(out).toContain(REDACTED_PHONE);
    expect(noLongNumber(out), out).toBe(true);
  });

  it.each([
    ['ASCII CNIC', 'cnic 35202-1234567-1'],
    ['Urdu-digit CNIC', 'شناختی کارڈ ۳۵۲۰۲-۱۲۳۴۵۶۷-۱'],
    ['CNIC with en dashes', 'cnic 35202–1234567–1'],
    ['CNIC with spaces', 'cnic 35202 1234567 1'],
  ])('[DATA-004] %s is masked', (_label, text) => {
    const out = maskFreeText(text);
    expect(out).toContain(REDACTED_CNIC);
    expect(noLongNumber(out), out).toBe(true);
  });

  it.each([
    ['2001:db8:85a3::8a2e:370:7334', '2001:db8:85a3::/48'],
    ['2001:db8:1:2::1', '2001:db8:1::/48'],
    ['fe80::1', 'fe80:0:0::/48'],
  ])('[DATA-004] IPv6 with :: in text (%s) is truncated', (ip, expected) => {
    const out = maskFreeText(`from ${ip} today`);
    expect(out).toBe(`from ${expected} today`);
  });

  it('[DATA-004] ordinary numbers, dates, times and UUIDs are left alone', () => {
    const text =
      'order 12345 qty 3, price 150000, at 2026-10-24T10:00:00Z / 2026-10-24 10:00, 10:30:00, id 0b6f1d9e-3c1a-4b8e-9f00-123456789012, booking 3fa2c91b07';
    expect(maskFreeText(text)).toBe(text);
  });

  it('[DATA-004] QA-T22-04: masking runs before truncation (no digit fragment at the cut)', () => {
    const reason = `${'x'.repeat(1993)} 03001234567`;
    const out = maskAndBound(reason, 2000);
    expect(out.length).toBeLessThanOrEqual(2000);
    expect(out).not.toMatch(/\d{3,}/);
    const huge = `${'y'.repeat(10_000)} 03001234567`;
    expect(maskAndBound(huge, 2000)).not.toMatch(/\d/);
  });
});

// RQ-011 item 2 / SEC-REVIEW-T2.6 #6 (SEC-BASE-010): fingerprints stay verifiable in audit rows.
describe('[SEC-BASE-010] sha256 fingerprints are kept unchanged', () => {
  it('[SEC-BASE-010] 200 random sha256 fingerprints survive the masker (value and free text)', () => {
    for (let i = 0; i < 200; i += 1) {
      const fp = `sha256:${createHash('sha256').update(String(i)).digest('hex')}`;
      expect(maskPii({ fingerprint: fp, note: `account ${fp} changed` })).toEqual({
        fingerprint: fp,
        note: `account ${fp} changed`,
      });
    }
  });

  it('[DATA-004] only the exact form is kept: a phone next to it, or uppercase / short hex, is not', () => {
    const fp = `sha256:${'a1'.repeat(32)}`;
    expect(maskFreeText(`${fp} call 03001234567`)).toBe(`${fp} call [PHONE]`);
    expect(maskFreeText(`sha256:${'1'.repeat(20)}`)).toContain(REDACTED_PHONE);
  });
});

describe('[DATA-004] masking is idempotent (writer + DB hook both run)', () => {
  it('[DATA-004] masking twice gives the same result', () => {
    const input = {
      ip: '203.0.113.77',
      v6: { ip: '2001:db8:85a3::1' },
      reason: 'call 03001234567 from 198.51.100.4 and 2001:db8:1:2::1',
      phone: '0300',
    };
    const once = maskPii(input);
    expect(maskPii(once)).toEqual(once);
    expect(once).toMatchObject({ ip: '203.0.113.0/24', v6: { ip: '2001:db8:85a3::/48' } });
  });
});

// SEC-REVIEW-T2.2 #4 (BP §29; SEC-BASE-002; permission-policy §7): secrets in free text / URLs.
describe('[SEC-BASE-002] secrets in free text and URLs (SEC-REVIEW-T2.2 #4)', () => {
  it.each([
    ['otp/token query', '/v1/auth/verify?otp=123456&token=abcdef', ['123456', 'abcdef']],
    [
      'signed URL',
      'https://bucket/x.jpg?X-Amz-Signature=deadbeefcafe&X-Amz-Credential=AKIAEXAMPLE&X-Amz-Expires=60',
      ['deadbeefcafe', 'AKIAEXAMPLE'],
    ],
    ['Bearer token', 'Authorization: Bearer abc123def456ghi', ['abc123def456ghi']],
    [
      'JWT',
      'jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1In0.c2lnbmF0dXJl',
      ['eyJhbGciOiJIUzI1NiJ9', 'c2lnbmF0dXJl'],
    ],
    ['IBAN compact', 'pay to PK36SCBL0000001123456702', ['PK36SCBL0000001123456702', '1123456702']],
    ['IBAN spaced', 'pay to PK36 SCBL 0000 0011 2345 6702', ['SCBL 0000', '6702']],
    ['labelled OTP', 'your otp 482913 please', ['482913']],
    ['labelled code', 'verification code: 4829', ['4829']],
  ])('[SEC-BASE-002] %s is masked', (_label, text, leaks) => {
    const out = maskFreeText(text);
    for (const leak of leaks) expect(out, out).not.toContain(leak);
  });

  it('[SEC-BASE-002] non-secret query values are kept', () => {
    expect(maskFreeText('/v1/services?page=2&lang=ur')).toBe('/v1/services?page=2&lang=ur');
    expect(maskFreeText('pay to PK36SCBL0000001123456702')).toContain(REDACTED_IBAN);
  });
});

// SEC-REVIEW-T2.2 #3 / QA-T22-03 (S3): deny-list keys; the deny-list runs before the ID exemption.
describe('[DATA-003] key deny-list (SEC-REVIEW-T2.2 #3, QA-T22-03, #14)', () => {
  it.each([
    'name',
    'customerName',
    'providerName',
    'fatherName',
    'userName',
    'businessName',
    'pickupLat',
    'homeLng',
    'latLng',
    'coords',
    'gps',
    'pos',
    'position',
    'geoPoint',
    'pickupLocation',
    'customerLocation',
    'locationText',
    'dateOfBirth',
    'dob',
    'walletNumber',
    'accountNo',
    'bankAccount',
    'contactNumber',
    'landline',
    'sessionId',
    'sid',
    'jwt',
    'bearer',
    'credentials',
    'auth',
    'verificationCode',
    'pinHash',
    'passwordReset',
    'phoneSet',
    'PHONE',
    'Phone_Number',
    'phone.number',
    'x-otp',
  ])('[DATA-003] %s → redact', (key) => {
    expect(classifyKey(key)).toBe('redact');
    expect(classifyKey(key, 'some value 1')).toBe('redact');
  });

  it.each([
    ['addressId', 'a1'],
    ['bookingId', 'b1'],
    ['locationSnapshotId', 'l1'],
    ['payoutProviderRef', 'r1'],
    ['serviceName', 'AC repair'],
    ['categoryName', 'Plumbing'],
    ['nameEn', 'Electrician'],
    ['nameUr', 'الیکٹریشن'],
    ['eventName', 'booking.accepted'],
    ['reason', 'late'],
    ['status', 'ACCEPTED'],
    ['panel', 'x'],
  ])('[DATA-003] %s → keep', (key, value) => {
    expect(classifyKey(key, value)).toBe('keep');
  });

  it('[DATA-003] a homoglyph key (Cyrillic һ) still has its value masked by the free-text pass', () => {
    expect(maskPii({ pһone: '03001234567' })).toEqual({ pһone: REDACTED_PHONE });
  });

  it('[DATA-003] flag/enum suffixes are kept only for flag values', () => {
    expect(classifyKey('phoneVerified', true)).toBe('keep');
    expect(classifyKey('addressType', 'HOME')).toBe('keep');
    expect(classifyKey('phoneSet', '03001234567')).toBe('redact');
    expect(classifyKey('phoneStatus', 'call me at 0300')).toBe('redact');
  });

  it('[DATA-003] coordinates under any key never survive; binary data is redacted', () => {
    const out = maskPii({
      latLng: [31.52, 74.35],
      gps: '31.5204,74.3587',
      pos: { x: 31.52, y: 74.35 },
      name: 'Ali Khan',
      buf: Buffer.from('0300'),
      bytes: new Uint8Array([1, 2, 3]),
    });
    expect(out).toEqual({
      latLng: REDACTED,
      gps: REDACTED,
      pos: REDACTED,
      name: REDACTED,
      buf: REDACTED,
      bytes: REDACTED,
    });
  });
});

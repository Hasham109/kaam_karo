import { describe, expect, it } from 'vitest';
import { AppError, PLATFORM_ERRORS, codeForStatus, toErrorEnvelope } from './error-envelope';

// ARCH §8; BP §29, §31.1; REL-001, REL-002, SEC-BASE-005.
describe('[REL-001] error envelope', () => {
  it('[REL-001] an AppError keeps its stable code, status, retry hint and details', () => {
    const err = new AppError('TRANSITION_NOT_ALLOWED', 409, 'Transition not allowed.', {
      details: [{ field: '/body/transition', issue: 'not_allowed' }],
    });
    expect(toErrorEnvelope(err, 'req-1')).toEqual({
      status: 409,
      unexpected: false,
      body: {
        error: {
          code: 'TRANSITION_NOT_ALLOWED',
          message: 'Transition not allowed.',
          requestId: 'req-1',
          retryable: false,
          details: [{ field: '/body/transition', issue: 'not_allowed' }],
        },
      },
    });
  });

  it('[REL-001] unknown errors leak nothing (no message, stack, SQL or host)', () => {
    const err = new Error(
      'relation "user_account" does not exist at db.internal:5432 phone 03001234567',
    );
    const result = toErrorEnvelope(err, 'req-2');
    expect(result.status).toBe(500);
    expect(result.unexpected).toBe(true);
    expect(result.body.error.code).toBe('INTERNAL_ERROR');
    const text = JSON.stringify(result.body);
    for (const leak of ['user_account', 'db.internal', '5432', '03001234567', 'stack', 'at ']) {
      expect(text).not.toContain(leak);
    }
  });

  it('[SEC-BASE-005] framework statuses map to generic codes without their messages', () => {
    expect(codeForStatus(422)).toBe('VALIDATION_FAILED');
    expect(codeForStatus(404)).toBe('NOT_FOUND');
    expect(codeForStatus(502)).toBe('INTERNAL_ERROR');
    const result = toErrorEnvelope(new Error('Cannot GET /secret/path'), null, 404);
    expect(result.body.error).toEqual({
      code: 'NOT_FOUND',
      message: PLATFORM_ERRORS.NOT_FOUND.message,
      requestId: null,
      retryable: false,
    });
  });

  it('[REL-002] retry hints: in-progress and unavailable are retryable, reuse is not', () => {
    expect(AppError.of('IDEMPOTENCY_REQUEST_IN_PROGRESS').retryable).toBe(true);
    expect(AppError.of('SERVICE_UNAVAILABLE').retryable).toBe(true);
    expect(AppError.of('IDEMPOTENCY_KEY_REUSED').retryable).toBe(false);
    expect(AppError.of('IDEMPOTENCY_KEY_REQUIRED').status).toBe(428);
  });

  it('[REL-001] codes and statuses are validated; details are bounded', () => {
    expect(() => new AppError('bad code', 400, 'x')).toThrow(TypeError);
    expect(() => new AppError('OK_CODE', 200, 'x')).toThrow(TypeError);
    const many = Array.from({ length: 80 }, (_v, i) => ({ issue: `i${i}`.repeat(100) }));
    const result = toErrorEnvelope(AppError.of('VALIDATION_FAILED', { details: many }), null);
    expect(result.body.error.details).toHaveLength(50);
    expect(result.body.error.details?.[0]?.issue.length).toBeLessThanOrEqual(200);
  });

  it('[REL-001] every platform code has a 4xx/5xx status', () => {
    for (const def of Object.values(PLATFORM_ERRORS)) {
      expect(def.status).toBeGreaterThanOrEqual(400);
      expect(def.status).toBeLessThan(600);
    }
  });
});

describe('[REL-001] review fixes (SEC-REVIEW-T2.2 #16)', () => {
  it('[SEC-BASE-002] an AppError message with personal data is masked in the envelope', () => {
    const r = toErrorEnvelope(
      new AppError('CONFLICT_X', 409, 'Booking for 03001234567 exists'),
      null,
    );
    expect(r.body.error.message).toBe('Booking for [PHONE] exists');
  });
});

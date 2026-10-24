import { describe, expect, it } from 'vitest';
import { maskedJobError } from './bullmq';

// SEC-REVIEW-T2.2 #8 (BP §26, §29; SEC-BASE-002; INFRA-005).
describe('[SEC-BASE-002] queue job errors stored in Redis are masked', () => {
  it('[SEC-BASE-002] failedReason has no phone and the stack is reduced to the masked message', () => {
    const err = maskedJobError(new Error('SMS rejected for 03001234567'));
    expect(err.message).toBe('Error: SMS rejected for [PHONE]');
    expect(err.stack).toBe(err.message);
    expect(err.stack).not.toContain('at ');
  });
});

/**
 * DEV/TEST ONLY test values for the fail-closed limit keys (T2.6 review fix, SEC-REVIEW-T2.6 #1;
 * SEC-REVIEW-T1.1-1.3 #1; admin.md A20 G2 "safe test values in dev/test"; OQ-028, D-011).
 * Fail-closed keys never mean "unlimited" in any environment, so a development or test database
 * needs explicit values to log in and upload at all. These are NOT production values and are
 * never applied by the default seed: `node prisma/seed/run.ts --dev-test-limits` refuses unless
 * APP_ENV is development or test. Production values come from the owner (OQ-028, D-011).
 * The list must cover exactly FAIL_CLOSED_KEYS (__tests__/config-seed.spec.ts).
 * Pure data (no imports).
 */
import type { ConfigSeed } from './config.seed.ts';

// One line per key. Restrictive test values; audio/video use the BP §76 guidance targets.
// prettier-ignore
export const DEV_TEST_LIMITS: readonly ConfigSeed[] = [
  { key: 'auth.otp.expiry_seconds', value: 300, source: 'dev/test value (OQ-028)' },
  { key: 'auth.otp.resend_cooldown_seconds', value: 60, source: 'dev/test value (OQ-028)' },
  { key: 'auth.otp.max_attempts', value: 5, source: 'dev/test value (OQ-028)' },
  { key: 'auth.otp.lockout_seconds', value: 900, source: 'dev/test value (OQ-028)' },
  { key: 'auth.rate_limit.login', value: { maxAttempts: 10, windowSeconds: 900 }, source: 'dev/test value (OQ-028)' },
  { key: 'auth.rate_limit.otp_send', value: { maxSends: 5, windowSeconds: 3600 }, source: 'dev/test value (OQ-028)' },
  { key: 'rate_limit.messaging', value: { maxMessages: 60, windowSeconds: 60 }, source: 'dev/test value (OQ-028)' },
  { key: 'rate_limit.requests', value: { maxRequests: 10, windowSeconds: 3600 }, source: 'dev/test value (OQ-017, OQ-028)' },
  { key: 'media.audio.max_seconds', value: 120, source: 'dev/test value (BP §76 target ≈ 2 min; D-011)' },
  { key: 'media.video.max_seconds', value: 30, source: 'dev/test value (BP §76 target ≈ 30 s; D-011)' },
  { key: 'media.max_upload_bytes', value: 26_214_400, source: 'dev/test value (D-011)' },
  { key: 'chat.attachment_limits', value: { maxAttachments: 5, maxBytes: 10_485_760 }, source: 'dev/test value (D-011)' },
];

export const DEV_TEST_ENVS: readonly string[] = ['development', 'test'];

/**
 * Fail-closed check for security and abuse limits (T2.6; SEC-REVIEW-T2.6 #1, #5, QA-T2.6-02).
 * SEC-AUTH-004, SEC-BASE-006, ABUSE-003, MEDIA-004 (BP §29, §30, §76; SEC-REVIEW-T1.1-1.3 #1;
 * admin.md §1.1): a fail-closed key must hold a value that passes its registry check (closed
 * schema, positive bounded integers) in EVERY environment. There is no environment switch:
 * development and test get explicit test values from the dev seed (`run.ts --dev-test-limits`).
 * Uses the reader's `inspect` (A01: `get` throws ConfigNotSetError for fail-closed keys).
 * No number is invented here: the values come from the owner (OQ-028, D-011).
 */
import type { ConfigService } from '@kaamkaro/platform';
import { CONFIG_KEYS, parserFor } from './config-keys';

/** Error code returned to clients when a fail-closed limit is not set (admin.md §1.1). */
export const LIMIT_NOT_CONFIGURED = 'LIMIT_NOT_CONFIGURED';

/** Fail-closed keys that have no valid value right now (null, missing or failing the schema). */
export async function missingFailClosedKeys(
  config: Pick<ConfigService, 'inspect'>,
  at?: Date,
): Promise<readonly string[]> {
  const missing: string[] = [];
  for (const def of CONFIG_KEYS.filter((d) => d.failClosed)) {
    const result = await config.inspect(def.key, parserFor(def), at ? { at } : {});
    if (result.status !== 'configured') missing.push(def.key);
  }
  return missing;
}

export class FailClosedConfigError extends Error {
  readonly code = LIMIT_NOT_CONFIGURED;
  readonly keys: readonly string[];
  constructor(keys: readonly string[]) {
    super(`Security limits not configured: ${keys.join(', ')}`);
    this.name = 'FailClosedConfigError';
    this.keys = keys;
  }
}

/** Throws when any fail-closed limit is missing; call at start-up and before each guarded action. */
export async function assertFailClosedKeysSet(
  config: Pick<ConfigService, 'inspect'>,
  at?: Date,
): Promise<void> {
  const missing = await missingFailClosedKeys(config, at);
  if (missing.length > 0) throw new FailClosedConfigError(missing);
}

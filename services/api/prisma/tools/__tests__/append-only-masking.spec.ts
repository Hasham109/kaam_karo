import { describe, expect, it } from 'vitest';
import {
  APPEND_ONLY_MASKING,
  MASKING_EXEMPT_TABLES,
} from '../../../src/platform/append-only-masking.ts';
import { APPEND_ONLY_TABLES } from '../append-only.ts';

// SEC-REVIEW-T2.2 #5(b), QA-T22-06 (BP §26, §29; DATA-004): a new append-only table must get a
// masking decision (masked columns, or an exemption with a reason) before it can be used.
describe('[DATA-004] every append-only table has a masking decision', () => {
  it('[DATA-004] masked or explicitly exempt', () => {
    const masked = Object.values(APPEND_ONLY_MASKING).map((c) => c.table);
    for (const table of APPEND_ONLY_TABLES) {
      const covered = masked.includes(table) || table in MASKING_EXEMPT_TABLES;
      expect(covered, `${table} has no masking decision`).toBe(true);
    }
  });
});

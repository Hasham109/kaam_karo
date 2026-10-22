import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkPrBody, expandIds, extractField } from '../lib/citations.ts';
import { REPO_ROOT, REQUIREMENTS_PATH, parseRequirementIds, readText } from '../lib/repo.ts';

const known = new Set(['PLAT-001', 'SEC-AUTH-001', 'SEC-AUTH-002', 'SEC-AUTH-003', 'REL-011']);

// No requirement ID covers the PR citation guard itself (IMPL §7.4, golden rule 1);
// see coordination/handoffs/T-2.1.md "Open questions raised".
describe('PR citation guard (IMPL §7.4, golden rule 1)', () => {
  it('reads inline field values in plain and bold form and ignores HTML comments', () => {
    const body =
      '<!-- Requirement IDs: FAKE-001 -->\n**Requirement IDs:** PLAT-001, REL-011\n- Citations: BP §60';
    expect(extractField(body, 'Requirement IDs')).toBe('PLAT-001, REL-011');
    expect(extractField(body, 'Citations')).toBe('BP §60');
    expect(extractField('nothing here', 'Citations')).toBeNull();
    // An empty field must not borrow the next line's value.
    expect(extractField('Requirement IDs:\n**Citations:** BP §60', 'Requirement IDs')).toBe('');
  });

  it('expands ranges (.. and …) and rejects wildcards and reversed ranges', () => {
    expect(expandIds('SEC-AUTH-001..003')).toEqual({
      ids: ['SEC-AUTH-001', 'SEC-AUTH-002', 'SEC-AUTH-003'],
      invalid: [],
    });
    expect(expandIds('SEC-AUTH-001…SEC-AUTH-002, `REL-011`').ids).toEqual([
      'SEC-AUTH-001',
      'SEC-AUTH-002',
      'REL-011',
    ]);
    expect(expandIds('PERM-* REL-003..001 SEC-AUTH-001..REL-003').invalid).toEqual([
      'PERM-*',
      'REL-003..001',
      'SEC-AUTH-001..REL-003',
    ]);
  });

  it('passes a filled-in template', () => {
    const body = 'Requirement IDs: SEC-AUTH-001..003, PLAT-001\nCitations: BP §27, D-002\n';
    expect(checkPrBody(body, known)).toEqual([]);
  });

  it('fails an empty field, an unknown ID and a missing citation', () => {
    expect(checkPrBody('Requirement IDs:\nCitations: D-002', known).join('\n')).toMatch(
      /missing or empty/,
    );
    expect(checkPrBody('Requirement IDs: PLAT-999\nCitations: D-002', known).join('\n')).toMatch(
      /PLAT-999 does not exist/,
    );
    expect(checkPrBody('Requirement IDs: PLAT-001\nCitations: see docs', known).join('\n')).toMatch(
      /must cite at least one/,
    );
  });

  it('the unfilled PR template fails (hints live in comments)', () => {
    const template = readFileSync(join(REPO_ROOT, '.github', 'pull_request_template.md'), 'utf8');
    expect(checkPrBody(template, known)).not.toEqual([]);
  });

  it('the real registry parses (REQUIREMENTS §34 pattern, OQ/D rows excluded)', () => {
    const ids = parseRequirementIds(readText(REQUIREMENTS_PATH));
    expect(ids.has('PLAT-001')).toBe(true);
    expect(ids.has('PERM-006')).toBe(true);
    expect([...ids].some((id) => id.startsWith('OQ-') || id.startsWith('D-'))).toBe(false);
  });
});

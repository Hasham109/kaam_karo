import { describe, expect, it } from 'vitest';
import { loadOpenApi } from '@kaamkaro/contracts';
import { ADMIN_SUB_ROLES, type AdminSubRoleName, hasAnySubRole } from '../../catalog';

describe('RBAC Matrix (RQ-012; SEC-REVIEW-T2.6 #4; ADMIN-ROLE-001…008, SEC-BASE-004)', () => {
  const configDoc = loadOpenApi('config');

  const rolesByGroup: Record<string, readonly AdminSubRoleName[]> = (
    configDoc.info as Record<string, unknown>
  )['x-admin-sub-roles-by-group'] as Record<string, readonly AdminSubRoleName[]>;

  it('contracts define valid admin sub-roles from BP §8.4', () => {
    expect(rolesByGroup).toBeDefined();
    for (const [_group, allowed] of Object.entries(rolesByGroup)) {
      expect(Array.isArray(allowed)).toBe(true);
      expect(allowed.length).toBeGreaterThan(0);
      for (const role of allowed) {
        expect(ADMIN_SUB_ROLES).toContain(role);
      }
    }
  });

  it('Super Admin can manage all config groups and catalog activation (ADMIN-ROLE-001)', () => {
    const superAdmin: readonly AdminSubRoleName[] = ['SUPER_ADMIN'];

    // All config groups
    for (const [group, allowed] of Object.entries(rolesByGroup)) {
      expect(
        hasAnySubRole(superAdmin, allowed),
        `Super Admin must be permitted for group ${group}`,
      ).toBe(true);
    }

    // Catalog activations
    const catalogAllowed = ['SUPER_ADMIN'] as const;
    expect(hasAnySubRole(superAdmin, catalogAllowed)).toBe(true);
  });

  it('Finance can manage FINANCIAL group, but forbidden on SECURITY and all other groups (ADMIN-ROLE-004)', () => {
    const finance: readonly AdminSubRoleName[] = ['FINANCE'];

    // Allowed on financial
    expect(hasAnySubRole(finance, rolesByGroup['FINANCIAL'] ?? [])).toBe(true);

    // Forbidden on security and other groups
    const forbiddenGroups = Object.keys(rolesByGroup).filter((g) => g !== 'FINANCIAL');
    for (const group of forbiddenGroups) {
      expect(
        hasAnySubRole(finance, rolesByGroup[group] ?? []),
        `Finance must be forbidden for group ${group}`,
      ).toBe(false);
    }
  });

  it('Analyst is read-only and denied on all config and catalog writes (ADMIN-ROLE-007)', () => {
    const analyst: readonly AdminSubRoleName[] = ['ANALYST'];

    for (const [group, allowed] of Object.entries(rolesByGroup)) {
      expect(
        hasAnySubRole(analyst, allowed),
        `Analyst must be forbidden for write group ${group}`,
      ).toBe(false);
    }

    expect(hasAnySubRole(analyst, ['SUPER_ADMIN'])).toBe(false);
  });

  it('Deny by default: empty sub-roles gets false on every action (BP §29; SEC-BASE-003)', () => {
    const empty: readonly AdminSubRoleName[] = [];

    for (const [, allowed] of Object.entries(rolesByGroup)) {
      expect(hasAnySubRole(empty, allowed)).toBe(false);
    }
  });
});

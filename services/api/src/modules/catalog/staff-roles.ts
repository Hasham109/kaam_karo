/**
 * Staff sub-roles, looked up on the SERVER from the identity module, never taken from a request
 * (SEC-REVIEW-T2.6 #4; ADMIN-ROLE-001…008, SEC-AUTH-005; BP §8.4, §29). Used by catalog activation
 * and config writes/reads.
 * A02 (T2.4) provides the real lookup over admin_user_sub_role (RQ-012). Until then the default
 * lookup returns no sub-roles, so every staff write and config read is refused (deny by default).
 */

/** Same names as the Prisma enum `AdminSubRole` (BP §8.4). */
export const ADMIN_SUB_ROLES = [
  'SUPER_ADMIN',
  'OPERATIONS',
  'SUPPORT',
  'FINANCE',
  'CONTENT_MANAGER',
  'RISK_TRUST',
  'ANALYST',
  'TECHNICAL_ADMIN',
] as const;
export type AdminSubRoleName = (typeof ADMIN_SUB_ROLES)[number];

export interface StaffRoleLookup {
  /** Active sub-roles of a staff user with completed MFA; [] for anyone else. */
  subRolesOf(userId: string): Promise<readonly AdminSubRoleName[]>;
}

export const STAFF_ROLE_LOOKUP = Symbol.for('kaamkaro.identity.StaffRoleLookup');

/** Default until A02 binds the identity lookup: nobody has a sub-role, so all staff actions are refused. */
export class DenyAllStaffRoleLookup implements StaffRoleLookup {
  subRolesOf(): Promise<readonly AdminSubRoleName[]> {
    return Promise.resolve([]);
  }
}

/**
 * A23 city / family / service activation (OPS-ADMIN-023). admin.md A23 allows Super Admin;
 * Operations and Content Manager are open cells of OQ-052 and stay denied until answered.
 */
export const CATALOG_ACTIVATION_SUB_ROLES: readonly AdminSubRoleName[] = ['SUPER_ADMIN'];

export function hasAnySubRole(
  held: readonly AdminSubRoleName[],
  allowed: readonly AdminSubRoleName[],
): boolean {
  return held.some((r) => allowed.includes(r));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Malformed IDs are refused before any query (SEC-REVIEW-T2.6 #11: no 500 for client errors). */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

/** Prisma unique-constraint violation (concurrent create) → mapped to 409 by the services. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

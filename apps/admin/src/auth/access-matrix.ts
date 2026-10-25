/**
 * Admin Portal Sub-Role Access Matrix
 * Source of Truth: docs/screens/admin.md §2 (rows A01–A26 × BP §8.4 sub-roles)
 * Requirements: ADMIN-ROLE-001..008, ROLE-003, SEC-AUTH-005, D-026.
 */

import {
  type AccessLevel,
  type AdminScreenId,
  type AdminSubRole,
  ACCESS_LEVEL_WEIGHT,
} from './types';

/**
 * Access Matrix definition verbatim from docs/screens/admin.md §2:
 *
 * | Screen | SA | OPS | SUP | FIN | CM | RT | AN | TA |
 * | A01 Admin login | edit | edit | edit | edit | edit | edit | edit | edit |
 * | A02 Dashboard | view | view | view | view | view | view | view | view |
 * | A03 Users | none | edit | view | none | none | edit | none | none |
 * | A04 Provider verification | none | view | none | none | none | approve | none | none |
 * | A05 Categories | edit | view | view | view | edit | view | view | view |
 * | A06 Services | edit | view | view | view | edit | edit | view | view |
 * | A07 Bookings | none | edit | edit | none | none | view | none | none |
 * | A08 Quotes | none | view | none | none | none | view | none | none |
 * | A09 Payments | none | none | none | approve | none | none | none | none |
 * | A10 Refunds/disputes | none | approve | edit | approve | none | approve | none | none |
 * | A11 Reviews/moderation | none | none | none | none | none | approve | none | none |
 * | A12 Support | none | edit | edit | edit | none | edit | none | none |
 * | A13 Fees/commissions | edit | none | none | edit | none | none | none | none |
 * | A14 Promotions | none | none | none | none | none | none | none | none |
 * | A15 Notifications | edit | none | none | none | none | none | none | none |
 * | A16 Reports | none | view | none | view | none | none | view | view |
 * | A17 Audit logs | view | none | none | none | none | none | none | none |
 * | A18 Risk/fraud | none | none | none | view | none | approve | none | none |
 * | A19 System health | none | none | none | none | none | none | none | view |
 * | A20 Settings | edit | none | none | none | none | none | none | none |
 * | A21 Matching weights | edit | none | none | none | none | none | none | none |
 * | A22 Badge rules | edit | none | none | none | none | none | none | none |
 * | A23 City & zone activation | edit | none | none | none | none | none | none | none |
 * | A24 AI guidance | edit | none | none | none | none | none | none | none |
 * | A25 Marketplace health | none | view | none | none | none | none | view | none |
 * | A26 AI interaction viewer | none | view | none | none | none | view | none | view |
 */
export const SUB_ROLE_ACCESS_MATRIX: Record<AdminScreenId, Record<AdminSubRole, AccessLevel>> = {
  A01: {
    SUPER_ADMIN: 'edit',
    OPERATIONS: 'edit',
    SUPPORT: 'edit',
    FINANCE: 'edit',
    CONTENT_MANAGER: 'edit',
    RISK_TRUST: 'edit',
    ANALYST: 'edit',
    TECHNICAL_ADMIN: 'edit',
  },
  A02: {
    SUPER_ADMIN: 'view',
    OPERATIONS: 'view',
    SUPPORT: 'view',
    FINANCE: 'view',
    CONTENT_MANAGER: 'view',
    RISK_TRUST: 'view',
    ANALYST: 'view',
    TECHNICAL_ADMIN: 'view',
  },
  A03: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'edit',
    SUPPORT: 'view',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'edit',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A04: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'view',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'approve',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A05: {
    SUPER_ADMIN: 'edit',
    OPERATIONS: 'view',
    SUPPORT: 'view',
    FINANCE: 'view',
    CONTENT_MANAGER: 'edit',
    RISK_TRUST: 'view',
    ANALYST: 'view',
    TECHNICAL_ADMIN: 'view',
  },
  A06: {
    SUPER_ADMIN: 'edit',
    OPERATIONS: 'view',
    SUPPORT: 'view',
    FINANCE: 'view',
    CONTENT_MANAGER: 'edit',
    RISK_TRUST: 'edit',
    ANALYST: 'view',
    TECHNICAL_ADMIN: 'view',
  },
  A07: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'edit',
    SUPPORT: 'edit',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'view',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A08: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'view',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'view',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A09: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'approve',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A10: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'approve',
    SUPPORT: 'edit',
    FINANCE: 'approve',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'approve',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A11: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'approve',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A12: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'edit',
    SUPPORT: 'edit',
    FINANCE: 'edit',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'edit',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  // CRITICAL ACCEPTANCE CRITERIA (IMPL line 494, ADMIN-ROLE-003):
  // Support role CANNOT open Fees page (access is strictly 'none').
  // Super Admin and Finance have 'edit' access.
  A13: {
    SUPER_ADMIN: 'edit',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'edit',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A14: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A15: {
    SUPER_ADMIN: 'edit',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A16: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'view',
    SUPPORT: 'none',
    FINANCE: 'view',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'view',
    TECHNICAL_ADMIN: 'view',
  },
  A17: {
    SUPER_ADMIN: 'view',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A18: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'view',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'approve',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A19: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'view',
  },
  A20: {
    SUPER_ADMIN: 'edit',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A21: {
    SUPER_ADMIN: 'edit',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A22: {
    SUPER_ADMIN: 'edit',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A23: {
    SUPER_ADMIN: 'edit',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A24: {
    SUPER_ADMIN: 'edit',
    OPERATIONS: 'none',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'none',
  },
  A25: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'view',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'none',
    ANALYST: 'view',
    TECHNICAL_ADMIN: 'none',
  },
  A26: {
    SUPER_ADMIN: 'none',
    OPERATIONS: 'view',
    SUPPORT: 'none',
    FINANCE: 'none',
    CONTENT_MANAGER: 'none',
    RISK_TRUST: 'view',
    ANALYST: 'none',
    TECHNICAL_ADMIN: 'view',
  },
};

/** Screen Metadata for Navigation and Headings */
export interface ScreenMeta {
  id: AdminScreenId;
  title: string;
  route: string;
  category: 'core' | 'operations' | 'finance' | 'catalog' | 'config' | 'system';
}

export const ADMIN_SCREENS_METADATA: readonly ScreenMeta[] = [
  { id: 'A01', title: 'Admin Login', route: '/login', category: 'core' },
  { id: 'A02', title: 'Dashboard', route: '/', category: 'core' },
  { id: 'A03', title: 'Users & Accounts', route: '/users', category: 'operations' },
  { id: 'A04', title: 'Provider Verification', route: '/verifications', category: 'operations' },
  { id: 'A05', title: 'Categories', route: '/categories', category: 'catalog' },
  { id: 'A06', title: 'Services Catalog', route: '/services', category: 'catalog' },
  { id: 'A07', title: 'Bookings', route: '/bookings', category: 'operations' },
  { id: 'A08', title: 'Quotes', route: '/quotes', category: 'operations' },
  { id: 'A09', title: 'Payments & Ledger', route: '/payments', category: 'finance' },
  { id: 'A10', title: 'Refunds & Disputes', route: '/disputes', category: 'finance' },
  { id: 'A11', title: 'Reviews & Moderation', route: '/moderation', category: 'operations' },
  { id: 'A12', title: 'Support Queue', route: '/support', category: 'operations' },
  { id: 'A13', title: 'Fees & Commissions', route: '/fees', category: 'finance' },
  { id: 'A15', title: 'Notification Templates', route: '/notifications', category: 'config' },
  { id: 'A16', title: 'Reports & Analytics', route: '/reports', category: 'core' },
  { id: 'A17', title: 'Audit Logs', route: '/audit', category: 'system' },
  { id: 'A18', title: 'Risk & Fraud Alerts', route: '/risk', category: 'operations' },
  { id: 'A19', title: 'System Health', route: '/health', category: 'system' },
  { id: 'A20', title: 'System Settings', route: '/settings', category: 'config' },
  { id: 'A21', title: 'Matching Weights', route: '/matching-weights', category: 'config' },
  { id: 'A22', title: 'Badge Rules', route: '/badge-rules', category: 'config' },
  { id: 'A23', title: 'City & Zone Activation', route: '/city-activation', category: 'config' },
  { id: 'A24', title: 'AI Guidance & Prompts', route: '/ai-guidance', category: 'config' },
  { id: 'A25', title: 'Marketplace Health', route: '/marketplace-health', category: 'core' },
  { id: 'A26', title: 'AI Interaction Viewer', route: '/ai-viewer', category: 'system' },
];

/**
 * Resolves the effective access level for a staff member holding one or more sub-roles (BP §8.4, OQ-053).
 * Effective level is the union (highest permission weight).
 */
export function resolveEffectiveAccess(
  subRoles: readonly AdminSubRole[],
  screenId: AdminScreenId,
): AccessLevel {
  if (!subRoles || subRoles.length === 0) {
    return 'none';
  }

  const matrix = SUB_ROLE_ACCESS_MATRIX[screenId];
  if (!matrix) {
    return 'none';
  }

  let highestWeight = 0;
  let highestLevel: AccessLevel = 'none';

  for (const role of subRoles) {
    const level = matrix[role] ?? 'none';
    const weight = ACCESS_LEVEL_WEIGHT[level];
    if (weight > highestWeight) {
      highestWeight = weight;
      highestLevel = level;
    }
  }

  return highestLevel;
}

/**
 * Checks whether the given sub-roles permit access to a screen with at least `minLevel`.
 */
export function canAccessScreen(
  subRoles: readonly AdminSubRole[],
  screenId: AdminScreenId,
  minLevel: AccessLevel = 'view',
): boolean {
  const effective = resolveEffectiveAccess(subRoles, screenId);
  return ACCESS_LEVEL_WEIGHT[effective] >= ACCESS_LEVEL_WEIGHT[minLevel];
}

/**
 * Helper to check specifically if a staff member can open the Fees page (A13).
 * For T5.1 acceptance verification.
 */
export function canOpenFeesPage(subRoles: readonly AdminSubRole[]): boolean {
  return canAccessScreen(subRoles, 'A13', 'view');
}

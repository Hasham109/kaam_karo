/**
 * Admin Portal Authentication & Sub-Role Type Definitions
 * Requirements: BP §8.4, BP §27, BP §34; SEC-AUTH-005, ADMIN-ROLE-001..008, ROLE-003; D-002, D-026.
 */

/**
 * The 8 canonical staff sub-roles from BP §8.4 and Prisma enum `AdminSubRole`.
 */
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

export type AdminSubRole = (typeof ADMIN_SUB_ROLES)[number];

/** Short codes as used in specs (docs/screens/admin.md §0.1) */
export const SUB_ROLE_ABBREVIATIONS: Record<AdminSubRole, string> = {
  SUPER_ADMIN: 'SA',
  OPERATIONS: 'OPS',
  SUPPORT: 'SUP',
  FINANCE: 'FIN',
  CONTENT_MANAGER: 'CM',
  RISK_TRUST: 'RT',
  ANALYST: 'AN',
  TECHNICAL_ADMIN: 'TA',
};

/**
 * Access levels per docs/screens/admin.md §0.2
 * 'none': Screen hidden in nav; URL access renders 403 Forbidden "No access" page.
 * 'view': Read-only access with PII masking; no write controls.
 * 'edit': Routine write actions allowed (each with mandatory audit reason).
 * 'approve': Decision actions on queue items (approve/reject, refund, dispute).
 */
export type AccessLevel = 'none' | 'view' | 'edit' | 'approve';

export const ACCESS_LEVEL_WEIGHT: Record<AccessLevel, number> = {
  none: 0,
  view: 1,
  edit: 2,
  approve: 3,
};

/**
 * Canonical Screen Identifiers (A01 - A26) from docs/screens/admin.md
 */
export type AdminScreenId =
  | 'A01' // Admin login
  | 'A02' // Dashboard
  | 'A03' // Users
  | 'A04' // Provider verification
  | 'A05' // Categories
  | 'A06' // Services
  | 'A07' // Bookings
  | 'A08' // Quotes
  | 'A09' // Payments
  | 'A10' // Refunds/disputes
  | 'A11' // Reviews/moderation
  | 'A12' // Support
  | 'A13' // Fees/commissions
  | 'A14' // Promotions (Not launch)
  | 'A15' // Notifications
  | 'A16' // Reports
  | 'A17' // Audit logs
  | 'A18' // Risk/fraud
  | 'A19' // System health
  | 'A20' // Settings
  | 'A21' // Matching weights
  | 'A22' // Badge rules
  | 'A23' // City & zone activation
  | 'A24' // AI guidance
  | 'A25' // Marketplace health
  | 'A26'; // AI interaction viewer

/**
 * Canonical 5 Screen States (UX-SCREEN-003, BP §45, §31.1)
 */
export type ScreenState = 'loading' | 'empty' | 'success' | 'error' | 'pending';

/**
 * Authenticated staff member profile & session
 */
export interface AdminStaffUser {
  id: string;
  name: string;
  phoneE164: string;
  maskedPhone: string;
  email?: string;
  subRoles: readonly AdminSubRole[];
  mfaEnrolled: boolean;
  mfaVerified: boolean;
  token: string;
  expiresAt: string;
}

/**
 * MFA Challenge issued by step 1 of admin login
 */
export interface AdminMfaChallenge {
  challengeId: string;
  status: 'MFA_REQUIRED';
  phoneMasked: string;
  expiresAt: number;
}

/**
 * Consequential admin write payload requiring explicit audit reason (ROLE-003, DATA-004)
 */
export interface AdminWritePayload<T = unknown> {
  data: T;
  reason: string;
  idempotencyKey?: string;
}

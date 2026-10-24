/**
 * Message catalogs (I18N-006, BP §37: user-facing text lives outside the app code).
 *
 * One catalogue for both apps, split into namespaces (QA F-03):
 *   app.*       app names (brand)
 *   common.*    copy shared by the Customer and Partner apps
 *   customer.*  Customer-app-only copy (docs/screens/customer.md §2)
 *   partner.*   Partner-app-only copy (docs/screens/partner.md G)
 *   status.*    booking status labels for both audiences (BP §15; A11Y-003)
 *
 * The English catalog defines the keys. Each Urdu namespace is typed from its English one, so a
 * key missing from Urdu, or an Urdu-only key, is a compile error (I18N-001, BP §78.1). Each
 * namespace also checks that its keys carry its prefix (`satisfies Record<'ns.${string}', …>`).
 *
 * Product strings only. Dev/test-only copy (the T0.6/T1.4 smoke screen) lives in the separate
 * dev-only catalog `src/dev/smoke-messages.ts` (`@kaamkaro/i18n/dev-smoke`), so it never ships
 * in a release bundle. The Admin Portal is English only (D-026); its copy will get its own
 * English-only namespace when A13 builds the first admin screen.
 */
import { APP_EN, APP_UR } from './messages/app.js';
import { COMMON_EN, COMMON_UR } from './messages/common.js';
import { CUSTOMER_EN, CUSTOMER_UR } from './messages/customer.js';
import { PARTNER_EN, PARTNER_UR } from './messages/partner.js';
import { STATUS_EN, STATUS_UR } from './messages/status.js';

export const EN_MESSAGES = {
  ...APP_EN,
  ...COMMON_EN,
  ...CUSTOMER_EN,
  ...PARTNER_EN,
  ...STATUS_EN,
} as const;

export type MessageKey = keyof typeof EN_MESSAGES;

export const UR_MESSAGES: Readonly<Record<MessageKey, string>> = {
  ...APP_UR,
  ...COMMON_UR,
  ...CUSTOMER_UR,
  ...PARTNER_UR,
  ...STATUS_UR,
};

export const NAMESPACES = ['app', 'common', 'customer', 'partner', 'status'] as const;
export type Namespace = (typeof NAMESPACES)[number];

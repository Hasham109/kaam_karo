/**
 * Registry of every known ConfigRule key (T2.6, owner A03). SINGLE SOURCE for key metadata:
 * the admin editors, ConfigAdminService, the readiness check, the seed (policy + audit) and the
 * platform reader's fail-closed list (RQ-011) all derive from it.
 * CFG-RULE-001…012 (BP §42, §64; ARCH §5.3, §19). Golden rule 2: this file holds NO business
 * value. Values live only in the seed (services/api/prisma/seed/config.seed.ts) and in config_rule.
 *
 * Per key:
 * - `kind` + `unit` value shape. Integer kinds carry a unit whose TECHNICAL ceiling (UNIT_CEILINGS)
 *   only rejects absurd values such as 2^53 attempts (SEC-REVIEW-T2.6 #1). It is not a business
 *   limit: the owner sets the real values and any tighter bounds (OQ-088).
 * - `fields`   closed schema for limit objects: exactly these fields, each a bounded positive
 *              integer, nothing else (SEC-REVIEW-T2.6 #1, #5). Field names avoid masker stems (#6).
 * - `scopes`   scopes at which a row may be written (BP §64 "active in one city but not another").
 * - `editGroup` who may write AND read the key (EDIT_GROUP_SUB_ROLES; SEC-REVIEW-T2.6 #4).
 * - `decidedBy` owner decision → read-only (OQ-078 default).
 * - `failClosed` a security/abuse limit: it must hold a valid value in EVERY environment; null or
 *               invalid → the action is refused (LIMIT_NOT_CONFIGURED). Dev/test get explicit test
 *               values from the dev seed, never "unlimited" (SEC-REVIEW-T1.1-1.3 #1, T2.6 #1).
 * - `approval`  TWO_PERSON: direct writes are refused until the OQ-076 approval flow exists.
 * - `auditFormat` FINGERPRINT: the audit stores a fingerprint, not the value (SEC-REVIEW-T2.6 #6).
 * - `whileNull` the safe behaviour while the value is null (shown in A13/A20).
 * Key names given in the specs are used verbatim; other names were chosen by A03 (handoff T-2.6).
 */
import type { ConfigParser, ConfigScope, JsonValue } from '@kaamkaro/platform';
import type { AdminSubRoleName } from '../catalog';

export type ConfigValueKind =
  | 'ratio'
  | 'non_negative_number'
  | 'non_negative_integer'
  | 'positive_integer'
  | 'limit_object'
  | 'boolean'
  | 'string'
  | 'url'
  | 'string_array'
  | 'object'
  | 'json';

export type ConfigUnit =
  'count' | 'seconds' | 'minutes' | 'hours' | 'days' | 'bytes' | 'meters' | 'paisa';

/**
 * Technical sanity ceilings per unit (not business values; OQ-088 asks the owner for real bounds).
 * kk-allow-literal: technical — unit ceilings that only reject "effectively unlimited" values.
 */
export const UNIT_CEILINGS: Readonly<Record<ConfigUnit, number>> = {
  count: 10_000, // kk-allow-literal: technical — unit ceiling (OQ-088)
  seconds: 86_400, // kk-allow-literal: technical — one day (OQ-088)
  minutes: 43_200, // kk-allow-literal: technical — 30 days (OQ-088)
  hours: 8_760, // kk-allow-literal: technical — one year (OQ-088)
  days: 3_650, // kk-allow-literal: technical — ten years (OQ-088)
  bytes: 1_073_741_824, // kk-allow-literal: technical — 1 GiB (OQ-088)
  meters: 200_000, // kk-allow-literal: technical — 200 km (OQ-088)
  paisa: 99_999_999_999_999, // kk-allow-literal: technical — largest value of config_key_policy.max_value DECIMAL(20,6)
};

/** Who may write and read a key group (SEC-REVIEW-T2.6 #4). */
export type EditGroup =
  | 'FINANCIAL'
  | 'SECURITY'
  | 'BOOKING_RULES'
  | 'SUPPORT'
  | 'MEDIA'
  | 'RATING'
  | 'AI_MATCHING'
  | 'TRUST'
  | 'CONTENT'
  | 'PROMOTIONS';

/**
 * admin.md A13: financial keys are "edited by Finance and Super Admin" (ADMIN-ROLE-003/004:
 * Support never). admin.md A20/A21/A22/A24: Super Admin for every group; the other sub-role cells
 * are open in OQ-052 and stay DENIED until answered. Analyst never writes (ADMIN-ROLE-007).
 */
export const EDIT_GROUP_SUB_ROLES: Readonly<Record<EditGroup, readonly AdminSubRoleName[]>> = {
  FINANCIAL: ['SUPER_ADMIN', 'FINANCE'],
  SECURITY: ['SUPER_ADMIN'],
  BOOKING_RULES: ['SUPER_ADMIN'],
  SUPPORT: ['SUPER_ADMIN'],
  MEDIA: ['SUPER_ADMIN'],
  RATING: ['SUPER_ADMIN'],
  AI_MATCHING: ['SUPER_ADMIN'],
  TRUST: ['SUPER_ADMIN'],
  CONTENT: ['SUPER_ADMIN'],
  PROMOTIONS: ['SUPER_ADMIN'],
};

export interface ConfigKeyDefinition {
  readonly key: string;
  readonly kind: ConfigValueKind;
  readonly unit?: ConfigUnit;
  readonly fields?: Readonly<Record<string, ConfigUnit>>;
  readonly scopes: readonly ConfigScope[];
  readonly editGroup: EditGroup;
  /** Requirement IDs (docs/requirements/REQUIREMENTS.md). */
  readonly requirementIds: readonly string[];
  /** BP §n / D-xxx / OQ-xxx / K-xx sources. */
  readonly sources: readonly string[];
  readonly decidedBy?: string;
  readonly failClosed?: boolean;
  readonly approval?: 'TWO_PERSON';
  readonly auditFormat?: 'FINGERPRINT';
  readonly whileNull: string;
}

const G: readonly ConfigScope[] = ['GLOBAL'];
const ALL: readonly ConfigScope[] = ['GLOBAL', 'CITY', 'CATEGORY', 'SERVICE'];
const CATALOG: readonly ConfigScope[] = ['GLOBAL', 'CATEGORY', 'SERVICE'];
const AREA: readonly ConfigScope[] = ['GLOBAL', 'CITY', 'CATEGORY'];
const LIMIT = 'LIMIT_NOT_CONFIGURED in every environment (dev/test use the dev seed test values)';

// One key per line (kept off Prettier so every key reads as one registry row).
// prettier-ignore
export const CONFIG_KEYS: readonly ConfigKeyDefinition[] = [
  // ---- Commission, fees, tax (A13 Fees/commissions) -----------------------------------------
  { key: 'commission.rate', kind: 'ratio', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['CFG-RULE-003', 'COMM-001'], sources: ['BP §42', 'D-006'], decidedBy: 'D-006', whileNull: 'not applicable (decided)' },
  { key: 'commission.base_line_types', kind: 'string_array', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['CFG-RULE-003', 'COMM-003'], sources: ['BP §58.1', 'D-015'], decidedBy: 'D-015', whileNull: 'not applicable (decided)' },
  { key: 'fees.customer_platform_fee', kind: 'object', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['CFG-RULE-003', 'FARE-009'], sources: ['BP §42', 'D-025'], decidedBy: 'D-025', whileNull: 'not applicable (decided: disabled)' },
  { key: 'fees.late_cancellation_fee_minor', kind: 'non_negative_integer', unit: 'paisa', scopes: ALL, editGroup: 'FINANCIAL', requirementIds: ['CFG-RULE-004', 'BOOK-CANCEL-002'], sources: ['BP §16', 'D-023', 'D-013'], decidedBy: 'D-023', whileNull: 'not charged (D-023)' },
  { key: 'fees.customer_no_show_fee_minor', kind: 'non_negative_integer', unit: 'paisa', scopes: ALL, editGroup: 'FINANCIAL', requirementIds: ['BOOK-CANCEL-005'], sources: ['BP §16', 'D-023'], decidedBy: 'D-023', whileNull: 'not charged (D-023)' },
  { key: 'fees.declined_quote_inspection_fee_minor', kind: 'non_negative_integer', unit: 'paisa', scopes: ALL, editGroup: 'FINANCIAL', requirementIds: ['PRICE-003'], sources: ['BP §58.1', 'D-023'], decidedBy: 'D-023', whileNull: 'not charged (D-023)' },
  { key: 'tax.line_shown', kind: 'boolean', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['FARE-010'], sources: ['BP §58.1', 'D-029'], decidedBy: 'D-029', whileNull: 'not applicable (decided: shown)' },
  { key: 'tax.rules', kind: 'json', scopes: ALL, editGroup: 'FINANCIAL', requirementIds: ['FARE-010'], sources: ['D-029', 'OQ-035'], whileNull: 'tax line shows Rs. 0 and A09 flags it (OQ-035)' },
  { key: 'fare.emergency_exception_enabled', kind: 'boolean', scopes: ALL, editGroup: 'FINANCIAL', requirementIds: ['FARE-013'], sources: ['BP §58.3', 'K-10'], whileNull: 'off: no line skips approval' },
  { key: 'fare.travel_surcharge_rule', kind: 'json', scopes: ALL, editGroup: 'FINANCIAL', requirementIds: ['FARE-008'], sources: ['BP §58.1'], whileNull: 'travel surcharge line type disabled' },
  { key: 'fare.discount_reduces_commission_base', kind: 'boolean', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['FARE-011'], sources: ['D-022', 'OQ-007'], whileNull: 'refuse discounts that need the answer; flag to Finance' },
  { key: 'price.min_total_minor', kind: 'non_negative_integer', unit: 'paisa', scopes: ALL, editGroup: 'FINANCIAL', requirementIds: ['CFG-RULE-002'], sources: ['BP §42'], whileNull: 'no lower limit applied' },
  { key: 'price.max_total_minor', kind: 'non_negative_integer', unit: 'paisa', scopes: ALL, editGroup: 'FINANCIAL', requirementIds: ['CFG-RULE-002'], sources: ['BP §42'], whileNull: 'no upper limit applied' },

  // ---- Provider account / ledger (D-016, D-020, D-021, D-022) --------------------------------
  { key: 'ledger.max_negative_balance', kind: 'non_negative_integer', unit: 'paisa', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['LEDGER-NEG-001'], sources: ['D-020'], decidedBy: 'D-020', whileNull: 'not applicable (decided)' },
  { key: 'ledger.unpaid_start_grace_minutes', kind: 'non_negative_integer', unit: 'minutes', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['LEDGER-NEG-006'], sources: ['D-021', 'D-022', 'OQ-007'], whileNull: 'booking is flagged to Operations' },
  { key: 'ledger.finance_verification_hours', kind: 'non_negative_integer', unit: 'hours', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['LEDGER-PAY-004'], sources: ['D-022', 'OQ-007'], whileNull: 'no SLA flag' },
  { key: 'ledger.digital_unconfirmed_flag_hours', kind: 'non_negative_integer', unit: 'hours', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['LEDGER-PAY-006'], sources: ['OQ-077'], whileNull: 'no automatic risk flag' },
  { key: 'payments.customer_cash_claim_enabled', kind: 'boolean', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['LEDGER-PAY-006'], sources: ['OQ-077', 'D-030'], whileNull: 'claim option shown (OQ-077 default)' },
  { key: 'payments.company_account', kind: 'object', scopes: G, editGroup: 'FINANCIAL', requirementIds: ['LEDGER-PAY-001'], sources: ['D-021', 'OQ-076'], approval: 'TWO_PERSON', auditFormat: 'FINGERPRINT', whileNull: '"Pay company" is not usable' },

  // ---- Rating enforcement (D-014, D-017) ----------------------------------------------------
  { key: 'rating.block_threshold', kind: 'non_negative_number', scopes: G, editGroup: 'RATING', requirementIds: ['RATING-ENF-003'], sources: ['D-014', 'D-017'], decidedBy: 'D-017', whileNull: 'not applicable (decided)' },
  { key: 'rating.warnings_before_block', kind: 'positive_integer', unit: 'count', scopes: G, editGroup: 'RATING', requirementIds: ['RATING-ENF-004'], sources: ['D-014', 'D-017'], decidedBy: 'D-014', whileNull: 'not applicable (decided)' },
  { key: 'rating.min_reviews_for_enforcement', kind: 'positive_integer', unit: 'count', scopes: G, editGroup: 'RATING', requirementIds: ['RATING-ENF-008'], sources: ['D-017', 'OQ-013'], whileNull: 'enforcement runs in dry-run' },
  { key: 'rating.review_period_days', kind: 'positive_integer', unit: 'days', scopes: G, editGroup: 'RATING', requirementIds: ['RATING-ENF-008'], sources: ['D-017', 'OQ-013'], whileNull: 'enforcement runs in dry-run' },
  { key: 'rating.window', kind: 'json', scopes: G, editGroup: 'RATING', requirementIds: ['RATING-ENF-008'], sources: ['D-017', 'OQ-013'], whileNull: 'enforcement runs in dry-run' },

  // ---- Security, sessions, abuse limits (A20 G2) — fail closed ------------------------------
  { key: 'auth.session_ttl', kind: 'positive_integer', unit: 'seconds', scopes: G, editGroup: 'SECURITY', requirementIds: ['SEC-AUTH-002'], sources: ['BP §27', 'OQ-028'], whileNull: 'TODO(OWNER); A02 decides the safe behaviour (handoff T-2.6)' },
  { key: 'auth.admin_idle_timeout', kind: 'positive_integer', unit: 'seconds', scopes: G, editGroup: 'SECURITY', requirementIds: ['SEC-AUTH-002'], sources: ['BP §27', 'OQ-028', 'OQ-051'], whileNull: 'TODO(OWNER); A02 decides the safe behaviour (handoff T-2.6)' },
  { key: 'auth.otp.expiry_seconds', kind: 'positive_integer', unit: 'seconds', scopes: G, editGroup: 'SECURITY', requirementIds: ['SEC-AUTH-004'], sources: ['D-002', 'OQ-028'], failClosed: true, whileNull: LIMIT },
  { key: 'auth.otp.resend_cooldown_seconds', kind: 'positive_integer', unit: 'seconds', scopes: G, editGroup: 'SECURITY', requirementIds: ['SEC-AUTH-004'], sources: ['D-002', 'OQ-028'], failClosed: true, whileNull: LIMIT },
  { key: 'auth.otp.max_attempts', kind: 'positive_integer', unit: 'count', scopes: G, editGroup: 'SECURITY', requirementIds: ['SEC-AUTH-004'], sources: ['D-002', 'OQ-028'], failClosed: true, whileNull: LIMIT },
  { key: 'auth.otp.lockout_seconds', kind: 'positive_integer', unit: 'seconds', scopes: G, editGroup: 'SECURITY', requirementIds: ['SEC-AUTH-004'], sources: ['D-002', 'OQ-028'], failClosed: true, whileNull: LIMIT },
  { key: 'auth.rate_limit.login', kind: 'limit_object', fields: { maxAttempts: 'count', windowSeconds: 'seconds' }, scopes: G, editGroup: 'SECURITY', requirementIds: ['SEC-BASE-006'], sources: ['BP §29', 'BP §30', 'OQ-028'], failClosed: true, whileNull: LIMIT },
  { key: 'auth.rate_limit.otp_send', kind: 'limit_object', fields: { maxSends: 'count', windowSeconds: 'seconds' }, scopes: G, editGroup: 'SECURITY', requirementIds: ['SEC-BASE-006'], sources: ['BP §29', 'BP §30', 'OQ-028'], failClosed: true, whileNull: LIMIT },
  { key: 'rate_limit.messaging', kind: 'limit_object', fields: { maxMessages: 'count', windowSeconds: 'seconds' }, scopes: G, editGroup: 'SECURITY', requirementIds: ['SEC-BASE-006'], sources: ['BP §30', 'OQ-028'], failClosed: true, whileNull: LIMIT },
  { key: 'rate_limit.requests', kind: 'limit_object', fields: { maxRequests: 'count', windowSeconds: 'seconds' }, scopes: G, editGroup: 'SECURITY', requirementIds: ['ABUSE-003'], sources: ['BP §30', 'OQ-017'], failClosed: true, whileNull: LIMIT },
  { key: 'account.deletion_hold_days', kind: 'non_negative_integer', unit: 'days', scopes: G, editGroup: 'SECURITY', requirementIds: ['SEC-AUTH-008'], sources: ['BP §26', 'BP §27'], whileNull: 'deletion requests wait for manual handling' },
  { key: 'config.max_schedule_ahead_hours', kind: 'positive_integer', unit: 'hours', scopes: G, editGroup: 'SECURITY', requirementIds: ['CFG-RULE-003'], sources: ['BP §26', 'OQ-088'], whileNull: 'no scheduling: every change takes effect immediately' },

  // ---- Booking, quote, review rules (A20 G3) ------------------------------------------------
  { key: 'booking.cancellation_window_minutes', kind: 'non_negative_integer', unit: 'minutes', scopes: ALL, editGroup: 'BOOKING_RULES', requirementIds: ['CFG-RULE-004'], sources: ['BP §16', 'BP §42', 'D-013'], whileNull: 'no cancellation fee applied' },
  { key: 'quote.validity_default_hours', kind: 'positive_integer', unit: 'hours', scopes: ALL, editGroup: 'BOOKING_RULES', requirementIds: ['CFG-RULE-005', 'QUOTE-004'], sources: ['BP §18', 'BP §42', 'D-013'], whileNull: 'provider enters a validity on each quote' },
  { key: 'quote.validity_max_hours', kind: 'positive_integer', unit: 'hours', scopes: ALL, editGroup: 'BOOKING_RULES', requirementIds: ['CFG-RULE-005', 'QUOTE-004'], sources: ['BP §18', 'BP §42', 'D-013'], whileNull: 'no maximum applied' },
  { key: 'booking.status_expiry', kind: 'object', scopes: G, editGroup: 'BOOKING_RULES', requirementIds: ['BOOK-STATUS-014'], sources: ['BP §15', 'D-013'], whileNull: 'nothing expires automatically' },
  { key: 'booking.customer_no_show_wait_minutes', kind: 'non_negative_integer', unit: 'minutes', scopes: G, editGroup: 'BOOKING_RULES', requirementIds: ['BOOK-CANCEL-005'], sources: ['BP §16', 'D-013'], whileNull: 'report goes to Support review' },
  { key: 'booking.customer_open_request_limit', kind: 'non_negative_integer', unit: 'count', scopes: G, editGroup: 'BOOKING_RULES', requirementIds: ['CFG-RULE-008'], sources: ['BP §30', 'BP §42', 'OQ-017'], whileNull: 'only the abuse rate limits apply (rate_limit.requests, fail closed)' },
  { key: 'booking.cancel_reasons', kind: 'string_array', scopes: G, editGroup: 'BOOKING_RULES', requirementIds: ['BOOK-STATUS-013'], sources: ['BP §16', 'OQ-050', 'OQ-065'], whileNull: 'no reason asked; server records UNSPECIFIED' },
  { key: 'booking.completion_code_max_attempts', kind: 'positive_integer', unit: 'count', scopes: G, editGroup: 'BOOKING_RULES', requirementIds: ['BOOK-STATUS-013'], sources: ['BP §13', 'OQ-069'], whileNull: 'completion code not required (OQ-069 default)' },
  { key: 'booking.completion_proof', kind: 'object', scopes: CATALOG, editGroup: 'BOOKING_RULES', requirementIds: ['BOOK-STATUS-013'], sources: ['BP §13', 'OQ-069'], whileNull: 'nothing required beyond "Mark job complete"' },
  { key: 'reviews.eligibility_window_days', kind: 'positive_integer', unit: 'days', scopes: G, editGroup: 'BOOKING_RULES', requirementIds: ['CFG-RULE-009'], sources: ['BP §19', 'BP §42'], whileNull: 'any Completed booking without a review is eligible' },
  { key: 'reviews.tags', kind: 'string_array', scopes: G, editGroup: 'BOOKING_RULES', requirementIds: ['CFG-RULE-009'], sources: ['BP §19', 'OQ-043'], whileNull: 'tag chips hidden' },
  { key: 'reviews.max_text_length', kind: 'positive_integer', unit: 'count', scopes: G, editGroup: 'BOOKING_RULES', requirementIds: ['CFG-RULE-009'], sources: ['BP §19', 'OQ-043'], whileNull: 'contract maximum only' },
  { key: 'availability.max_service_radius_m', kind: 'positive_integer', unit: 'meters', scopes: AREA, editGroup: 'BOOKING_RULES', requirementIds: ['CFG-RULE-006'], sources: ['BP §42', 'BP §59.1'], whileNull: 'any radius inside the active Lahore zone' },
  { key: 'notifications.booking_reminder_minutes', kind: 'positive_integer', unit: 'minutes', scopes: G, editGroup: 'BOOKING_RULES', requirementIds: ['NOTIF-003'], sources: ['BP §80'], whileNull: 'no reminder sent' },
  { key: 'matching.supply_gap_options', kind: 'string_array', scopes: G, editGroup: 'BOOKING_RULES', requirementIds: ['MATCH-GAP-001'], sources: ['BP §61.3', 'OQ-021'], whileNull: 'OQ-021 default options' },

  // ---- Support (A20 G4) ---------------------------------------------------------------------
  { key: 'support.categories', kind: 'json', scopes: G, editGroup: 'SUPPORT', requirementIds: ['CFG-RULE-012'], sources: ['BP §40', 'BP §42', 'OQ-018'], whileNull: 'one uncategorised queue' },
  { key: 'support.sla_targets', kind: 'object', scopes: G, editGroup: 'SUPPORT', requirementIds: ['CFG-RULE-012'], sources: ['BP §40', 'BP §42', 'OQ-018'], whileNull: 'no SLA breach flagged' },

  // ---- Media (A20 G5; D-011) — limits fail closed --------------------------------------------
  { key: 'media.audio.max_seconds', kind: 'positive_integer', unit: 'seconds', scopes: G, editGroup: 'MEDIA', requirementIds: ['MEDIA-001', 'MEDIA-004'], sources: ['BP §76', 'D-011'], failClosed: true, whileNull: LIMIT },
  { key: 'media.video.max_seconds', kind: 'positive_integer', unit: 'seconds', scopes: G, editGroup: 'MEDIA', requirementIds: ['MEDIA-002', 'MEDIA-004'], sources: ['BP §76', 'D-011'], failClosed: true, whileNull: LIMIT },
  { key: 'media.max_upload_bytes', kind: 'positive_integer', unit: 'bytes', scopes: G, editGroup: 'MEDIA', requirementIds: ['MEDIA-004'], sources: ['BP §76', 'D-011'], failClosed: true, whileNull: LIMIT },
  { key: 'media.retention_days', kind: 'object', scopes: G, editGroup: 'MEDIA', requirementIds: ['MEDIA-007'], sources: ['BP §76', 'D-011'], whileNull: 'kept; no purge job' },
  { key: 'chat.attachment_limits', kind: 'limit_object', fields: { maxAttachments: 'count', maxBytes: 'bytes' }, scopes: G, editGroup: 'MEDIA', requirementIds: ['CHAT-003'], sources: ['BP §20', 'D-011'], failClosed: true, whileNull: LIMIT },

  // ---- AI, matching, badges, verification (A20 G7, A21, A22; D-010) --------------------------
  { key: 'ai.confidence_threshold', kind: 'ratio', scopes: G, editGroup: 'AI_MATCHING', requirementIds: ['REQ-AI-006'], sources: ['BP §67', 'D-010'], whileNull: 'every request goes through confirmation with the service editable' },
  { key: 'matching.weights', kind: 'object', scopes: AREA, editGroup: 'AI_MATCHING', requirementIds: ['MATCH-SCORE-001'], sources: ['BP §54.2', 'D-010'], whileNull: 'null behaviour per MATCH-SCORE criterion' },
  { key: 'matching.fairness', kind: 'object', scopes: AREA, editGroup: 'AI_MATCHING', requirementIds: ['MATCH-FAIR-001', 'MATCH-FAIR-002'], sources: ['BP §54.2', 'BP §68', 'D-010'], whileNull: 'fairness rules off' },
  { key: 'matching.shown_set_size', kind: 'positive_integer', unit: 'count', scopes: AREA, editGroup: 'AI_MATCHING', requirementIds: ['MATCH-SCORE-001'], sources: ['BP §55.1', 'D-010'], whileNull: 'TODO(OWNER); A05 decides the safe behaviour' },
  { key: 'matching.capacity_rules_enabled', kind: 'boolean', scopes: G, editGroup: 'AI_MATCHING', requirementIds: ['MATCH-ELIG-079'], sources: ['BP §54.1'], whileNull: 'capacity limits off' },
  { key: 'trust.badge_rules', kind: 'object', scopes: G, editGroup: 'TRUST', requirementIds: ['TRUST-BADGE-002'], sources: ['BP §55.2', 'D-010'], whileNull: 'nobody gets a rule badge' },
  { key: 'trust.required_verification_level', kind: 'string', scopes: CATALOG, editGroup: 'TRUST', requirementIds: ['CAT-SVC-005', 'CFG-RULE-007'], sources: ['BP §22.1', 'BP §42', 'OQ-015'], whileNull: 'Risk/Trust decides manually (OQ-015 default)' },
  { key: 'trust.required_verification_items', kind: 'object', scopes: CATALOG, editGroup: 'TRUST', requirementIds: ['CFG-RULE-007'], sources: ['BP §22.1', 'OQ-015'], whileNull: 'Risk/Trust decides manually (OQ-015 default)' },
  { key: 'promotions.rules', kind: 'json', scopes: G, editGroup: 'PROMOTIONS', requirementIds: ['CFG-RULE-010'], sources: ['BP §14', 'BP §46'], whileNull: 'not launch: no promotions exist' },

  // ---- Content (customer app) ---------------------------------------------------------------
  { key: 'legal.terms_url', kind: 'url', scopes: G, editGroup: 'CONTENT', requirementIds: ['SEC-AUTH-008'], sources: ['OQ-039'], whileNull: 'TODO(OWNER) (OQ-039)' },
  { key: 'legal.privacy_url', kind: 'url', scopes: G, editGroup: 'CONTENT', requirementIds: ['SEC-AUTH-008'], sources: ['OQ-039'], whileNull: 'TODO(OWNER) (OQ-039)' },
  { key: 'home.popular_services', kind: 'string_array', scopes: ['GLOBAL', 'CITY'], editGroup: 'CONTENT', requirementIds: ['CAT-SVC-012'], sources: ['BP §12', 'OQ-041'], whileNull: 'section hidden' },
  { key: 'category.featured_services', kind: 'string_array', scopes: ['GLOBAL', 'CATEGORY'], editGroup: 'CONTENT', requirementIds: ['CAT-SVC-012'], sources: ['BP §12', 'OQ-041'], whileNull: 'section hidden' },
  { key: 'catalog.pricing_units', kind: 'string_array', scopes: G, editGroup: 'CONTENT', requirementIds: ['CAT-SVC-009'], sources: ['BP §4.2'], whileNull: 'no unit shown' },
];

const BY_KEY = new Map(CONFIG_KEYS.map((d) => [d.key, d]));

export function configKeyDefinition(key: string): ConfigKeyDefinition | undefined {
  return BY_KEY.get(key);
}

/**
 * Fail-closed keys: single source for the readiness check, the setRule null refusal, the dev seed
 * and the platform reader (RQ-011 asks A01 to take this list instead of FAIL_CLOSED_KEY_PREFIXES).
 */
export const FAIL_CLOSED_KEYS: readonly string[] = CONFIG_KEYS.filter((d) => d.failClosed).map(
  (d) => d.key,
);

export function isFailClosedConfigKey(key: string): boolean {
  return BY_KEY.get(key)?.failClosed === true;
}

/** May a staff user with these sub-roles write or read this key? (SEC-REVIEW-T2.6 #4) */
export function canAccessKey(
  def: ConfigKeyDefinition,
  subRoles: readonly AdminSubRoleName[],
): boolean {
  const allowed = EDIT_GROUP_SUB_ROLES[def.editGroup];
  return subRoles.some((r) => allowed.includes(r));
}

const URL_PATTERN = /^https:\/\/[^\s]+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedInteger(value: unknown, min: number, unit: ConfigUnit | undefined): boolean {
  const ceiling = UNIT_CEILINGS[unit ?? 'count'];
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= ceiling
  );
}

/** Full value check of a key definition (null = "unset", handled by the caller). */
export function isValidValueFor(def: ConfigKeyDefinition, value: unknown): boolean {
  switch (def.kind) {
    case 'ratio':
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1;
    case 'non_negative_number':
      return typeof value === 'number' && Number.isFinite(value) && value >= 0;
    case 'non_negative_integer':
      return isBoundedInteger(value, 0, def.unit);
    case 'positive_integer':
      return isBoundedInteger(value, 1, def.unit);
    case 'limit_object': {
      if (!isPlainObject(value) || !def.fields) return false;
      const expected = Object.keys(def.fields).sort();
      const actual = Object.keys(value).sort();
      if (expected.length !== actual.length || expected.some((k, i) => k !== actual[i]))
        return false;
      return Object.entries(def.fields).every(([field, unit]) =>
        isBoundedInteger(value[field], 1, unit),
      );
    }
    case 'boolean':
      return typeof value === 'boolean';
    case 'string':
      return typeof value === 'string' && value.length > 0;
    case 'url':
      return typeof value === 'string' && URL_PATTERN.test(value);
    case 'string_array':
      return Array.isArray(value) && value.every((v) => typeof v === 'string' && v.length > 0);
    case 'object':
      return isPlainObject(value);
    case 'json':
      return value !== undefined;
  }
}

/** Reader parser for a key (readiness, consumers): same rules as writes. */
export function parserFor(def: ConfigKeyDefinition): ConfigParser<JsonValue> {
  return (value) => (isValidValueFor(def, value) ? value : undefined);
}

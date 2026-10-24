/**
 * Privilege model of the application role (T2.3; BP §26, §29; ARCH §5.4; DATA-003, DATA-004,
 * LEDGER-005, PAY-003; SEC-REVIEW-T2.3 #1, #4, #8, #14). Enforced in prisma/sql/20_privileges.sql
 * and prisma/sql/30_integrity.sql; the unit test checks the SQL against these lists and the DB
 * test checks the real privilege matrix.
 */
export const APP_ROLE = 'kaamkaro_app';

/** Rows are never updated or deleted: SELECT/INSERT only + triggers for every role (BP §26). */
export const APPEND_ONLY_TABLES = [
  'audit_log',
  'marketplace_event',
  'job_event',
  'provider_ledger_entry',
  'payment',
  'payment_method_record',
  'refund',
  'config_rule',
] as const;

/**
 * The only tables where the app may DELETE rows (default deny, SEC-REVIEW-T2.3 #4). Everything
 * else is kept for traceability and uses soft delete / anonymisation (DATA-003; SEC-AUTH-008).
 */
export const DELETE_ALLOWED_TABLES = [
  'outbox_event',
  'idempotency_key',
  'device_session',
  'favorite',
  'notification_preference',
  'availability_rule',
  'service_area',
  'match_candidate',
  'user_role',
  'admin_recovery_code',
] as const;

/**
 * Owner-maintained tables (SEC-REVIEW-T2.6 #2): the API login may only SELECT; rows are written by
 * the table owner (seed / migration). Created in migration 20261024000000_config_policy_zone_code.
 */
export const OWNER_MAINTAINED_TABLES = ['config_key_policy'] as const;

/** Tables that are not application data: no app privileges except SELECT on spatial_ref_sys. */
export const NON_APP_TABLES = ['_prisma_migrations', 'spatial_ref_sys'] as const;

/**
 * Decision records frozen by kk_freeze_after_decision (SEC-REVIEW-T2.3 #3, #7, #9, #11, #17):
 * [table, decision column ('' = no decision), open value ('NULL' = open while null), always-immutable columns].
 */
export const FROZEN_TABLES: readonly (readonly [string, string, string, string])[] = [
  [
    'commission_payment_submission',
    'status',
    'SUBMITTED',
    'provider_profile_id,amount_minor,transaction_ref,screenshot_media_id,submitted_at,submitted_by_user_id',
  ],
  ['settlement', 'status', 'PENDING', 'provider_profile_id,amount_minor'],
  [
    'verification_record',
    'status',
    'SUBMITTED',
    'provider_profile_id,requested_level,category_id,document_media_ids,submitted_at',
  ],
  [
    'dispute',
    'outcome',
    'NULL',
    'booking_id,opened_by_user_id,opened_by_role,description,evidence_media_ids,is_safety',
  ],
  ['review_flag', 'status', 'OPEN', 'review_id,flagged_by_user_id,reason'],
  [
    'admin_user_sub_role',
    'revoked_at',
    'NULL',
    'admin_user_id,sub_role,granted_by_user_id,created_at',
  ],
  ['media_object', '', '', 'owner_user_id,kind,purpose,sensitivity,storage_key'],
];

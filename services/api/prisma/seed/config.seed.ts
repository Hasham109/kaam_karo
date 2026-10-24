/**
 * Initial GLOBAL config_rule values (T2.6, owner A03; CFG-RULE-001…012; BP §42, §64; ARCH §19).
 * Golden rule 2: an owner-decided value is seeded exactly and cites its D-number; every other
 * value is `null` + TODO(OWNER) and the dependent module applies the safe behaviour from
 * src/modules/config/config-keys.ts (`whileNull`). Security-relevant nulls fail closed
 * (`failClosed` keys, SEC-REVIEW-T1.1-1.3 #1).
 * The key list must equal CONFIG_KEYS (checked by __tests__/config-seed.spec.ts).
 * A seed row is only inserted when the key has no GLOBAL row yet, so admin changes are never
 * overwritten by a re-run. Pure data (no imports).
 */

export type SeedJson =
  string | number | boolean | null | readonly SeedJson[] | { readonly [key: string]: SeedJson };

export interface ConfigSeed {
  readonly key: string;
  readonly value: SeedJson;
  /** Citation written into the seed audit row (SEC-REVIEW-T2.6 #7): D-number, rule or TODO(OWNER). */
  readonly source: string;
}

// One line per key, each with its D-number / TODO(OWNER) comment: keep Prettier off this array.
// prettier-ignore
export const CONFIG_SEEDS: readonly ConfigSeed[] = [
  // ---- Owner-decided values ----------------------------------------------------------------
  { key: 'commission.rate', value: 0.3, source: 'D-006' }, // D-006: 30% platform / 70% provider
  { key: 'commission.base_line_types', value: ['LABOR'], source: 'D-015' }, // D-015: labour (Labor / Service fee) lines only
  { key: 'fees.customer_platform_fee', value: { enabled: false, amountMinor: 0 }, source: 'D-025' }, // D-025: no customer platform fee
  { key: 'fees.late_cancellation_fee_minor', value: null, source: 'D-023' }, // D-023: not charged at launch
  { key: 'fees.customer_no_show_fee_minor', value: null, source: 'D-023' }, // D-023: not charged at launch
  { key: 'fees.declined_quote_inspection_fee_minor', value: null, source: 'D-023' }, // D-023: not charged at launch
  { key: 'tax.line_shown', value: true, source: 'D-029' }, // D-029: the bill shows a separate tax line
  { key: 'ledger.max_negative_balance', value: 0, source: 'D-020 D-021' }, // D-020: balance below 0 blocks hiring (D-021: and starting)
  { key: 'rating.block_threshold', value: 2.0, source: 'D-017 D-014' }, // D-017 (D-014): average below 2.0
  { key: 'rating.warnings_before_block', value: 2, source: 'D-014 D-017' }, // D-014 (D-017): warning 1 → warning 2 → block

  // ---- Defaults stated by a requirement or an OQ default (not owner values) ------------------
  { key: 'fare.emergency_exception_enabled', value: false, source: 'FARE-013 K-10' }, // FARE-013, K-10: disabled until rules exist
  { key: 'payments.customer_cash_claim_enabled', value: true, source: 'OQ-077' }, // OQ-077 default (A15 re-review 1)
  { key: 'catalog.pricing_units', value: ['job', 'hour', 'room', 'appliance', 'meter', 'item', 'vehicle'], source: 'BP §4.2 CAT-SVC-009' }, // BP §4.2 list (CAT-SVC-009)

  // ---- Not decided: null + TODO(OWNER) ------------------------------------------------------
  { key: 'tax.rules', value: null, source: 'TODO(OWNER) OQ-035 D-029' }, // TODO(OWNER) OQ-035 (D-029 tax type/rate)
  { key: 'fare.travel_surcharge_rule', value: null, source: 'TODO(OWNER) FARE-008' }, // TODO(OWNER) FARE-008
  { key: 'fare.discount_reduces_commission_base', value: null, source: 'TODO(OWNER) D-022 OQ-007' }, // TODO(OWNER) D-022, OQ-007
  { key: 'price.min_total_minor', value: null, source: 'TODO(OWNER) CFG-RULE-002' }, // TODO(OWNER) CFG-RULE-002
  { key: 'price.max_total_minor', value: null, source: 'TODO(OWNER) CFG-RULE-002' }, // TODO(OWNER) CFG-RULE-002
  { key: 'ledger.unpaid_start_grace_minutes', value: null, source: 'TODO(OWNER) D-022' }, // TODO(OWNER) D-022
  { key: 'ledger.finance_verification_hours', value: null, source: 'TODO(OWNER) D-022' }, // TODO(OWNER) D-022
  { key: 'ledger.digital_unconfirmed_flag_hours', value: null, source: 'TODO(OWNER) OQ-077' }, // TODO(OWNER) OQ-077
  { key: 'payments.company_account', value: null, source: 'TODO(OWNER) D-021 OQ-076' }, // TODO(OWNER) D-021, OQ-076 (two-person approval)
  { key: 'rating.min_reviews_for_enforcement', value: null, source: 'TODO(OWNER) D-017 OQ-013' }, // TODO(OWNER) D-017, OQ-013 → dry-run
  { key: 'rating.review_period_days', value: null, source: 'TODO(OWNER) D-017 OQ-013' }, // TODO(OWNER) D-017, OQ-013 → dry-run
  { key: 'rating.window', value: null, source: 'TODO(OWNER) D-017 OQ-013' }, // TODO(OWNER) D-017, OQ-013 → dry-run
  { key: 'auth.session_ttl', value: null, source: 'TODO(OWNER) OQ-028' }, // TODO(OWNER) OQ-028
  { key: 'auth.admin_idle_timeout', value: null, source: 'TODO(OWNER) OQ-028 OQ-051' }, // TODO(OWNER) OQ-028, OQ-051
  { key: 'auth.otp.expiry_seconds', value: null, source: 'TODO(OWNER) OQ-028' }, // TODO(OWNER) OQ-028 — fail closed
  { key: 'auth.otp.resend_cooldown_seconds', value: null, source: 'TODO(OWNER) OQ-028' }, // TODO(OWNER) OQ-028 — fail closed
  { key: 'auth.otp.max_attempts', value: null, source: 'TODO(OWNER) OQ-028' }, // TODO(OWNER) OQ-028 — fail closed
  { key: 'auth.otp.lockout_seconds', value: null, source: 'TODO(OWNER) OQ-028' }, // TODO(OWNER) OQ-028 — fail closed
  { key: 'auth.rate_limit.login', value: null, source: 'TODO(OWNER) OQ-028' }, // TODO(OWNER) OQ-028 — fail closed
  { key: 'auth.rate_limit.otp_send', value: null, source: 'TODO(OWNER) OQ-028' }, // TODO(OWNER) OQ-028 — fail closed
  { key: 'rate_limit.messaging', value: null, source: 'TODO(OWNER) OQ-028' }, // TODO(OWNER) OQ-028
  { key: 'rate_limit.requests', value: null, source: 'TODO(OWNER) OQ-017' }, // TODO(OWNER) OQ-017
  { key: 'account.deletion_hold_days', value: null, source: 'TODO(OWNER) BP §26' }, // TODO(OWNER) BP §26, §27
  { key: 'config.max_schedule_ahead_hours', value: null, source: 'TODO(OWNER) OQ-088' }, // TODO(OWNER) OQ-088 — no scheduling while null
  { key: 'booking.cancellation_window_minutes', value: null, source: 'TODO(OWNER) D-013' }, // TODO(OWNER) D-013
  { key: 'quote.validity_default_hours', value: null, source: 'TODO(OWNER) D-013' }, // TODO(OWNER) D-013
  { key: 'quote.validity_max_hours', value: null, source: 'TODO(OWNER) D-013' }, // TODO(OWNER) D-013
  { key: 'booking.status_expiry', value: null, source: 'TODO(OWNER) D-013' }, // TODO(OWNER) D-013
  { key: 'booking.customer_no_show_wait_minutes', value: null, source: 'TODO(OWNER) D-013' }, // TODO(OWNER) D-013
  { key: 'booking.customer_open_request_limit', value: null, source: 'TODO(OWNER) OQ-017' }, // TODO(OWNER) OQ-017
  { key: 'booking.cancel_reasons', value: null, source: 'TODO(OWNER) OQ-050 OQ-065' }, // TODO(OWNER) OQ-050, OQ-065
  { key: 'booking.completion_code_max_attempts', value: null, source: 'TODO(OWNER) OQ-069' }, // TODO(OWNER) OQ-069
  { key: 'booking.completion_proof', value: null, source: 'TODO(OWNER) OQ-069' }, // TODO(OWNER) OQ-069
  { key: 'reviews.eligibility_window_days', value: null, source: 'TODO(OWNER) CFG-RULE-009' }, // TODO(OWNER) CFG-RULE-009
  { key: 'reviews.tags', value: null, source: 'TODO(OWNER) OQ-043' }, // TODO(OWNER) OQ-043
  { key: 'reviews.max_text_length', value: null, source: 'TODO(OWNER) OQ-043' }, // TODO(OWNER) OQ-043
  { key: 'availability.max_service_radius_m', value: null, source: 'TODO(OWNER) CFG-RULE-006' }, // TODO(OWNER) CFG-RULE-006
  { key: 'notifications.booking_reminder_minutes', value: null, source: 'TODO(OWNER) NOTIF-003' }, // TODO(OWNER) NOTIF-003
  { key: 'matching.supply_gap_options', value: null, source: 'TODO(OWNER) OQ-021' }, // TODO(OWNER) OQ-021
  { key: 'support.categories', value: null, source: 'TODO(OWNER) OQ-018' }, // TODO(OWNER) OQ-018
  { key: 'support.sla_targets', value: null, source: 'TODO(OWNER) OQ-018' }, // TODO(OWNER) OQ-018
  { key: 'media.audio.max_seconds', value: null, source: 'TODO(OWNER) D-011' }, // TODO(OWNER) D-011 — fail closed
  { key: 'media.video.max_seconds', value: null, source: 'TODO(OWNER) D-011' }, // TODO(OWNER) D-011 — fail closed
  { key: 'media.max_upload_bytes', value: null, source: 'TODO(OWNER) D-011' }, // TODO(OWNER) D-011 — fail closed
  { key: 'media.retention_days', value: null, source: 'TODO(OWNER) D-011' }, // TODO(OWNER) D-011
  { key: 'chat.attachment_limits', value: null, source: 'TODO(OWNER) D-011' }, // TODO(OWNER) D-011
  { key: 'ai.confidence_threshold', value: null, source: 'TODO(OWNER) D-010' }, // TODO(OWNER) D-010
  { key: 'matching.weights', value: null, source: 'TODO(OWNER) D-010' }, // TODO(OWNER) D-010
  { key: 'matching.fairness', value: null, source: 'TODO(OWNER) D-010' }, // TODO(OWNER) D-010
  { key: 'matching.shown_set_size', value: null, source: 'TODO(OWNER) D-010' }, // TODO(OWNER) D-010
  { key: 'matching.capacity_rules_enabled', value: null, source: 'TODO(OWNER) BP §54.1' }, // TODO(OWNER) BP §54.1 rule 79
  { key: 'trust.badge_rules', value: null, source: 'TODO(OWNER) D-010' }, // TODO(OWNER) D-010
  { key: 'trust.required_verification_level', value: null, source: 'TODO(OWNER) OQ-015' }, // TODO(OWNER) OQ-015
  { key: 'trust.required_verification_items', value: null, source: 'TODO(OWNER) OQ-015' }, // TODO(OWNER) OQ-015
  { key: 'promotions.rules', value: null, source: 'not launch CFG-RULE-010' }, // not launch (CFG-RULE-010): key only
  { key: 'legal.terms_url', value: null, source: 'TODO(OWNER) OQ-039' }, // TODO(OWNER) OQ-039
  { key: 'legal.privacy_url', value: null, source: 'TODO(OWNER) OQ-039' }, // TODO(OWNER) OQ-039
  { key: 'home.popular_services', value: null, source: 'TODO(OWNER) OQ-041' }, // TODO(OWNER) OQ-041
  { key: 'category.featured_services', value: null, source: 'TODO(OWNER) OQ-041' }, // TODO(OWNER) OQ-041
];

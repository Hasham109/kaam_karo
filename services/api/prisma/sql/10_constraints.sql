-- kk:section constraints (T2.3). CHECK constraints Prisma cannot express. Prisma ignores CHECK
-- constraints when diffing, so these never cause drift. Each line cites its rule.

-- Booking / job (BP §15, §16; ARCH §5.6, §6.1)
ALTER TABLE "booking" ADD CONSTRAINT "booking_crew_size_positive" CHECK ("crew_size" IS NULL OR "crew_size" >= 1); -- D-004; PROV-CREW-002
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_show_has_party" CHECK ("status" <> 'NO_SHOW' OR "no_show_party" IS NOT NULL); -- BOOK-STATUS-017

-- Quotes and fare lines (BP §18, §58; ARCH §6.3, §6.6)
ALTER TABLE "quote" ADD CONSTRAINT "quote_crew_size_positive" CHECK ("crew_size" >= 1); -- D-004; PROV-CREW-001
ALTER TABLE "fare_line" ADD CONSTRAINT "fare_line_amount_not_negative" CHECK ("amount_minor" >= 0); -- BP §58.1, §26
ALTER TABLE "fare_line" ADD CONSTRAINT "fare_line_has_parent" CHECK (num_nonnulls("quote_id", "booking_id") >= 1); -- BP §66 Fare Line; ARCH §6.3

-- Payments and provider ledger (BP §26; ARCH §6.8; D-006, D-015, D-016, D-021)
ALTER TABLE "payment" ADD CONSTRAINT "payment_amount_positive" CHECK ("amount_minor" > 0); -- BP §26; PAY-003
ALTER TABLE "refund" ADD CONSTRAINT "refund_amount_positive" CHECK ("amount_minor" > 0); -- PAY-006
ALTER TABLE "provider_ledger_entry" ADD CONSTRAINT "ledger_amount_positive" CHECK ("amount_minor" > 0); -- LEDGER-005
ALTER TABLE "provider_ledger_entry" ADD CONSTRAINT "ledger_direction_matches_type" CHECK (
  ("entry_type" = 'COMMISSION_DEBIT' AND "direction" = 'DEBIT')
  OR ("entry_type" = 'JOB_CREDIT' AND "direction" = 'CREDIT')
  OR ("entry_type" = 'COMPANY_PAYMENT_CREDIT' AND "direction" = 'CREDIT')
  OR ("entry_type" = 'SETTLEMENT_DEBIT' AND "direction" = 'DEBIT')
  OR "entry_type" = 'REVERSAL'
); -- ARCH §6.8; LEDGER-003, LEDGER-004, LEDGER-PAY-005, PAY-007
ALTER TABLE "provider_ledger_entry" ADD CONSTRAINT "ledger_links_match_type" CHECK (
  ("entry_type" IN ('COMMISSION_DEBIT', 'JOB_CREDIT') AND "booking_id" IS NOT NULL)
  OR ("entry_type" = 'COMPANY_PAYMENT_CREDIT' AND "commission_payment_submission_id" IS NOT NULL)
  OR ("entry_type" = 'SETTLEMENT_DEBIT' AND "settlement_id" IS NOT NULL)
  OR ("entry_type" = 'REVERSAL' AND "reverses_entry_id" IS NOT NULL AND "reason" IS NOT NULL)
); -- BP §26; PAY-004; LEDGER-PAY-005, LEDGER-PAY-006 (no free-standing credit)
ALTER TABLE "provider_ledger_entry" ADD CONSTRAINT "ledger_only_reversal_links_original" CHECK ("entry_type" = 'REVERSAL' OR "reverses_entry_id" IS NULL); -- BP §26; PAY-004
ALTER TABLE "provider_ledger_entry" ADD CONSTRAINT "ledger_commission_rate_range" CHECK ("commission_rate" IS NULL OR ("commission_rate" >= 0 AND "commission_rate" <= 1)); -- D-006; COMM-001
ALTER TABLE "commission_payment_submission" ADD CONSTRAINT "commission_payment_amount_positive" CHECK ("amount_minor" > 0); -- D-021; LEDGER-PAY-003
ALTER TABLE "commission_payment_submission" ADD CONSTRAINT "commission_payment_decision_complete" CHECK (
  "status" = 'SUBMITTED'
  OR ("decided_by_user_id" IS NOT NULL AND "decided_at" IS NOT NULL AND "decision_reason" IS NOT NULL)
); -- LEDGER-PAY-004; ROLE-003
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_amount_positive" CHECK ("amount_minor" > 0); -- PAY-007

-- Catalog, config, profiles (BP §4.2, §42, §59, §64)
ALTER TABLE "catalog_activation" ADD CONSTRAINT "catalog_activation_one_target" CHECK (num_nonnulls("category_id", "service_id") = 1); -- CFG-RULE-001
ALTER TABLE "config_rule" ADD CONSTRAINT "config_rule_scope_ref" CHECK (("scope" = 'GLOBAL') = ("scope_ref_id" IS NULL)); -- ARCH §5.3; BP §64
ALTER TABLE "provider_service" ADD CONSTRAINT "provider_service_amounts_not_negative" CHECK (
  ("base_price_minor" IS NULL OR "base_price_minor" >= 0)
  AND ("visit_fee_minor" IS NULL OR "visit_fee_minor" >= 0)
  AND ("inspection_fee_minor" IS NULL OR "inspection_fee_minor" >= 0)
); -- BP §4.2, §58.1
ALTER TABLE "provider_profile" ADD CONSTRAINT "provider_usual_team_size_positive" CHECK ("usual_team_size" IS NULL OR "usual_team_size" >= 1); -- ARCH §5.6; D-004
ALTER TABLE "address" ADD CONSTRAINT "address_custom_label_present" CHECK ("label_kind" <> 'CUSTOM' OR "custom_label" IS NOT NULL); -- PROF-ADDR-001

-- Availability and service areas (BP §59)
ALTER TABLE "availability_rule" ADD CONSTRAINT "availability_rule_day_range" CHECK ("day_of_week" IS NULL OR "day_of_week" BETWEEN 1 AND 7); -- BP §59.1; AVAIL-001
ALTER TABLE "availability_rule" ADD CONSTRAINT "availability_rule_shape" CHECK (
  ("kind" IN ('WEEKLY_HOURS', 'BREAK') AND "day_of_week" IS NOT NULL AND "date" IS NULL AND "override_kind" IS NULL)
  OR ("kind" = 'DATE_OVERRIDE' AND "date" IS NOT NULL AND "override_kind" IS NOT NULL)
); -- BP §59.1, §59.2; AVAIL-001…003
ALTER TABLE "service_area" ADD CONSTRAINT "service_area_shape" CHECK (
  ("kind" = 'RADIUS' AND "center" IS NOT NULL AND "radius_meters" > 0)
  OR ("kind" = 'ZONE' AND "service_zone_id" IS NOT NULL)
); -- BP §59.1; AVAIL-005
ALTER TABLE "provider_live_status" ADD CONSTRAINT "provider_max_active_jobs_positive" CHECK ("max_active_jobs" IS NULL OR "max_active_jobs" >= 1); -- AVAIL-006

-- Trust, reviews, support (BP §19, §40; D-014)
ALTER TABLE "provider_standing" ADD CONSTRAINT "provider_standing_warning_count" CHECK ("rating_warning_count" >= 0); -- RATING-ENF-004
ALTER TABLE "review" ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5); -- BP §19; REV-001
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_outcome_complete" CHECK (
  "outcome" IS NULL
  OR ("outcome_reason" IS NOT NULL AND "decided_by_user_id" IS NOT NULL AND "decided_at" IS NOT NULL)
); -- SUP-003; ROLE-003
ALTER TABLE "case_update" ADD CONSTRAINT "case_update_one_parent" CHECK (num_nonnulls("support_ticket_id", "dispute_id") = 1); -- BP §40

-- AI, media, outbox (BP §66, §76; BP §31.2)
ALTER TABLE "customer_request" ADD CONSTRAINT "customer_request_confidence_range" CHECK ("ai_confidence" IS NULL OR ("ai_confidence" >= 0 AND "ai_confidence" <= 1)); -- REQ-AI-002
ALTER TABLE "ai_interaction" ADD CONSTRAINT "ai_interaction_confidence_range" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1)); -- REQ-AI-006
ALTER TABLE "media_object" ADD CONSTRAINT "media_object_sizes_not_negative" CHECK (("size_bytes" IS NULL OR "size_bytes" >= 0) AND ("duration_ms" IS NULL OR "duration_ms" >= 0)); -- MEDIA-004
ALTER TABLE "outbox_event" ADD CONSTRAINT "outbox_attempts_not_negative" CHECK ("attempts" >= 0); -- REL-009

-- SEC-REVIEW-T2.3 fixes (#2, #5, #6, #8, #11, #12, #13)
ALTER TABLE "payment" ADD CONSTRAINT "payment_method_matches_status" CHECK (("method" = 'CASH') = ("status" = 'CASH_RECORDED')); -- D-016, D-030; LEDGER-002
ALTER TABLE "provider_ledger_entry" ADD CONSTRAINT "ledger_job_credit_has_payment" CHECK ("entry_type" <> 'JOB_CREDIT' OR "payment_id" IS NOT NULL); -- D-016; LEDGER-004; LEDGER-PAY-006
ALTER TABLE "refund" ADD CONSTRAINT "refund_issued_has_reason" CHECK ("status" <> 'ISSUED' OR "reason" IS NOT NULL); -- PAY-006; ROLE-003
ALTER TABLE "config_rule" ADD CONSTRAINT "config_rule_not_backdated" CHECK ("effective_from" >= "created_at" - interval '1 minute'); -- BP §26, §42; CFG-RULE-003
ALTER TABLE "media_object" ADD CONSTRAINT "media_object_restricted_purposes" CHECK (("purpose" IN ('VERIFICATION_DOCUMENT', 'PAYMENT_PROOF')) <= ("sensitivity" = 'RESTRICTED')); -- BP §29, §75 item 97; ABUSE-010
ALTER TABLE "admin_user" ADD CONSTRAINT "admin_user_mfa_secret_has_key" CHECK (("mfa_secret_ciphertext" IS NULL) = ("mfa_secret_key_id" IS NULL)); -- BP §29; SEC-AUTH-005
ALTER TABLE "payout_method" ADD CONSTRAINT "payout_method_masked_number" CHECK ("masked_number" ~ '^[•*Xx\s-]*[0-9]{0,4}$'); -- BP §13 P16, §29; SEC-BASE-002

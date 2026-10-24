-- T2.2 review fixes (A01): SEC-REVIEW-T2.6 #2 (config_key_policy + guard trigger), #3 (created_at := now(), no
-- back-dating slack), #8 (stable service_zone.code). BP §26, §29, §42, §57.2, §64; CFG-RULE-001…012;
-- SEC-BASE-010; SCOPE-GEO-002. Generated: prisma migrate diff (DDL) + sql/40_config_policy.sql + db:comments.

-- AlterTable
ALTER TABLE "service_zone" ADD COLUMN     "code" TEXT NOT NULL DEFAULT ('zone-'::text || substr(md5((gen_random_uuid())::text), 1, 12));

-- CreateTable
CREATE TABLE "config_key_policy" (
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "allowed_scopes" "config_scope"[],
    "max_value" DECIMAL(20,6),
    "limit_fields" JSONB,
    "read_only" BOOLEAN NOT NULL DEFAULT false,
    "two_person" BOOLEAN NOT NULL DEFAULT false,
    "fail_closed" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_key_policy_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_zone_city_code_key" ON "service_zone"("city_id", "code");


-- T2.2 review fixes / SEC-REVIEW-T2.6 #2, #3 (A01). BP §26, §29, §42; CFG-RULE-001…012;
-- SEC-BASE-010; SEC-AUTH-004. Embedded verbatim in migration 20261024000000_config_policy_zone_code.

-- config_key_policy is owner-maintained: the API login may only read it (SEC-REVIEW-T2.6 #2).
REVOKE ALL ON TABLE "config_key_policy" FROM kaamkaro_app;
GRANT SELECT ON TABLE "config_key_policy" TO kaamkaro_app;

ALTER TABLE "config_key_policy" ADD CONSTRAINT "config_key_policy_kind" CHECK ("kind" IN ('ratio', 'non_negative_number', 'non_negative_integer', 'positive_integer', 'limit_object', 'boolean', 'string', 'url', 'string_array', 'object', 'json')); -- BP §42; CFG-RULE-003
ALTER TABLE "config_key_policy" ADD CONSTRAINT "config_key_policy_scopes" CHECK ("allowed_scopes" IS NOT NULL AND cardinality("allowed_scopes") >= 1); -- BP §64; CFG-RULE-001
ALTER TABLE "config_key_policy" ADD CONSTRAINT "config_key_policy_max" CHECK ("max_value" IS NULL OR "max_value" >= 0); -- BP §42
ALTER TABLE "config_key_policy" ADD CONSTRAINT "config_key_policy_limit_fields" CHECK (("kind" = 'limit_object') = ("limit_fields" IS NOT NULL AND jsonb_typeof("limit_fields") = 'object')); -- BP §29, §30; SEC-BASE-006

-- SEC-REVIEW-T2.6 #3: no back-dating slack; created_at is set by the trigger below.
ALTER TABLE "config_rule" DROP CONSTRAINT "config_rule_not_backdated";
ALTER TABLE "config_rule" ADD CONSTRAINT "config_rule_not_backdated" CHECK ("effective_from" >= "created_at"); -- BP §26, §42; CFG-RULE-003

-- Value check of one JSON value against a policy row (NULL value = "not decided", checked by the caller).
CREATE OR REPLACE FUNCTION kk_config_value_ok(p "config_key_policy", v jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog, public AS $$
DECLARE
  f record;
BEGIN
  CASE p."kind"
    WHEN 'ratio' THEN
      RETURN jsonb_typeof(v) = 'number' AND v::numeric >= 0 AND v::numeric < 1;
    WHEN 'non_negative_number' THEN
      RETURN jsonb_typeof(v) = 'number' AND v::numeric >= 0;
    WHEN 'non_negative_integer', 'positive_integer' THEN
      RETURN jsonb_typeof(v) = 'number' AND v::numeric = trunc(v::numeric)
        AND v::numeric >= (CASE WHEN p."kind" = 'positive_integer' THEN 1 ELSE 0 END)
        AND (p."max_value" IS NULL OR v::numeric <= p."max_value");
    WHEN 'limit_object' THEN
      IF jsonb_typeof(v) <> 'object' THEN RETURN false; END IF;
      IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(v) k)
         IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(p."limit_fields") k) THEN
        RETURN false;
      END IF;
      FOR f IN SELECT key, value FROM jsonb_each(v) LOOP
        IF jsonb_typeof(f.value) <> 'number' OR f.value::numeric <> trunc(f.value::numeric)
           OR f.value::numeric < 1 OR f.value::numeric > (p."limit_fields" ->> f.key)::numeric THEN
          RETURN false;
        END IF;
      END LOOP;
      RETURN true;
    WHEN 'boolean' THEN
      RETURN jsonb_typeof(v) = 'boolean';
    WHEN 'string' THEN
      RETURN jsonb_typeof(v) = 'string' AND length(v #>> '{}') > 0;
    WHEN 'url' THEN
      RETURN jsonb_typeof(v) = 'string' AND (v #>> '{}') ~ '^https://[^[:space:]]+$';
    WHEN 'string_array' THEN
      RETURN jsonb_typeof(v) = 'array' AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v) e WHERE jsonb_typeof(e) <> 'string' OR length(e #>> '{}') = 0);
    WHEN 'object' THEN
      RETURN jsonb_typeof(v) = 'object';
    WHEN 'json' THEN
      RETURN true;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Every config_rule insert (SEC-REVIEW-T2.6 #2, #3):
--  * created_at := now() (server clock, not settable); effective_from may not be in the past (a
--    request tolerance covers the app clock reading "now" a moment before the transaction starts;
--    the STORED effective_from is never earlier than created_at);
--  * the key must have a policy row; the scope must be allowed; a non-null value must fit the kind;
--  * for every login except the table owner (i.e. the API): no read-only (decided) key, no
--    two-person key, an actor is required, and a fail-closed key can never be set to null.
CREATE OR REPLACE FUNCTION kk_config_rule_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
  p "config_key_policy";
  is_owner boolean;
  v jsonb := NEW."value";
BEGIN
  NEW."created_at" := now();
  IF NEW."effective_from" < now() - interval '5 seconds' THEN
    RAISE EXCEPTION 'kk_config_backdated: effective_from % is before now', NEW."effective_from"
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."effective_from" < NEW."created_at" THEN
    NEW."effective_from" := NEW."created_at";
  END IF;

  SELECT * INTO p FROM "config_key_policy" WHERE "key" = NEW."key";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'kk_config_unknown_key: % has no config_key_policy row', NEW."key"
      USING ERRCODE = 'check_violation';
  END IF;
  IF NOT (NEW."scope" = ANY (p."allowed_scopes")) THEN
    RAISE EXCEPTION 'kk_config_scope: % is not allowed for %', NEW."scope", NEW."key"
      USING ERRCODE = 'check_violation';
  END IF;

  is_owner := pg_has_role(current_user,
    (SELECT tableowner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'config_rule'),
    'MEMBER');
  IF NOT is_owner THEN
    IF p."read_only" THEN
      RAISE EXCEPTION 'kk_config_read_only: % is owner-decided', NEW."key" USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF p."two_person" THEN
      RAISE EXCEPTION 'kk_config_two_person: % needs two-person approval', NEW."key" USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW."changed_by_user_id" IS NULL THEN
      RAISE EXCEPTION 'kk_config_actor_required: changed_by_user_id is required' USING ERRCODE = 'check_violation';
    END IF;
    IF p."fail_closed" AND (v IS NULL OR jsonb_typeof(v) = 'null') THEN
      RAISE EXCEPTION 'kk_config_fail_closed_null: % is a security limit and cannot be null', NEW."key"
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF v IS NOT NULL AND jsonb_typeof(v) <> 'null' AND NOT kk_config_value_ok(p, v) THEN
    RAISE EXCEPTION 'kk_config_value: value does not fit kind % of %', p."kind", NEW."key"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER kk_config_rule_guard BEFORE INSERT ON "config_rule" FOR EACH ROW EXECUTE FUNCTION kk_config_rule_guard();

-- COMMENT ON (generated by prisma/tools/comments.ts)
COMMENT ON COLUMN "service_zone"."code" IS 'Stable zone code, unique per city; seeds and imports key on it, so a renamed or deactivated zone is never re-created (BP §57.2, §64; SCOPE-GEO-002). Default = random code for rows created without one.';
COMMENT ON TABLE "config_key_policy" IS '[module config, owner A03] Owner-maintained policy for every config key: kind, allowed scopes, decided/read-only, two-person and fail-closed flags. A BEFORE INSERT trigger on config_rule enforces it, so the API login cannot write an unknown key, a wrong scope or type, a decided key or a null security limit (BP §26, §29, §42; CFG-RULE-003; SEC-BASE-010). The API login may only read it; rows are generated from the config registry by the seed, run as the table owner.';
COMMENT ON COLUMN "config_key_policy"."key" IS 'Rule key, same as config_rule.key (BP §42; CFG-RULE-001).';
COMMENT ON COLUMN "config_key_policy"."kind" IS 'Value kind from the config registry, e.g. ratio, positive_integer, limit_object (BP §42; CFG-RULE-003).';
COMMENT ON COLUMN "config_key_policy"."allowed_scopes" IS 'Scopes allowed for this key (BP §64; CFG-RULE-001).';
COMMENT ON COLUMN "config_key_policy"."max_value" IS 'Upper bound for integer kinds (unit ceiling); null = none (BP §42; SEC-AUTH-004).';
COMMENT ON COLUMN "config_key_policy"."limit_fields" IS 'Field → upper bound for limit_object kinds; every field is a positive integer (BP §29, §30; SEC-BASE-006).';
COMMENT ON COLUMN "config_key_policy"."read_only" IS 'Owner-decided value: the API login may not write new versions (BP §42; CFG-RULE-003).';
COMMENT ON COLUMN "config_key_policy"."two_person" IS 'Change needs two-person approval, which the API login cannot record yet (BP §29; SEC-BASE-010).';
COMMENT ON COLUMN "config_key_policy"."fail_closed" IS 'Security limit: the API login may never store null (BP §27, §29; SEC-AUTH-004).';
COMMENT ON COLUMN "config_key_policy"."updated_at" IS 'When the policy row was last generated (technical field, ARCH §5; BP §25).';


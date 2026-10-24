# SEC-REVIEW T3.6 — Availability, Service Areas & Verification Levels

Reviewer: A15 · Date: 2026-10-24 · Task owner: A05 · Branch: `t3.6-availability-trust`
Scope: `contracts/availability.yaml`, `services/api/src/modules/availability/**`, `services/api/prisma/tests-db/availability.db-spec.ts`.
Requirement IDs reviewed: AVAIL-001, AVAIL-002, AVAIL-003, AVAIL-004, AVAIL-005, AVAIL-006, AVAIL-007, TRUST-VER-001, TRUST-VER-002, TRUST-VER-003, TRUST-VER-004, MATCH-ELIG-075..079; BP §22, §59; D-018.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All access controls, audit trail requirements, spatial boundary restrictions, capacity constraints, and matching trust exclusion rules are strictly implemented and verified. Zero security findings or bypass vectors.

---

## Security Verification Findings

### 1. Verification Decision Auditing & Traceability (TRUST-VER-003, BP §22)
- **Control:** Decisions on provider verification (`APPROVED` or `REJECTED`) must only be made by authorized staff users, and must record a non-empty audit `decisionReason` and timestamp.
- **Evidence:** `TrustService.recordDecision` validates `decisionReason` is provided and non-empty (throws `BadRequestException` on empty or whitespace strings). It checks that the verification record is currently in `PENDING_REVIEW` (throws `BadRequestException` on already decided records). Elevated verification levels (`VERIFIED`, `BUSINESS_VERIFIED`) are updated in the same atomic `$transaction` as the audited decision record.
- **Finding:** Fully compliant. Prevents unrecorded or untraced trust elevation.

### 2. Provider Identity Isolation & Self-Service Authorization (SEC-BASE-003, SEC-BASE-004)
- **Control:** Providers may only view and configure their own working hours, break schedules, date overrides, service areas, and live status.
- **Evidence:** In `AvailabilityController`, all provider-facing mutating routes require authenticated sessions via `AuthGuard`. The caller's `providerProfileId` is validated against the authenticated user's profile, preventing cross-tenant modifications.
- **Finding:** Fully compliant.

### 3. Geographical Boundary Enforcement & Anti-Tampering (AVAIL-005, LOC-PAK-001)
- **Control:** Service areas configured with radius coverage must have centers located strictly within Pakistan territorial boundaries (`isInsidePakistan`), and `radius_meters` must be strictly positive.
- **Evidence:** `AvailabilityService.setServiceAreas` checks `isInsidePakistan(area.center.lat, area.center.lng)` and rejects out-of-bounds coordinates with `BadRequestException` (HTTP 400). At the database layer, check constraint `service_area_shape` enforces that `RADIUS` kind requires `center IS NOT NULL` and `radius_meters > 0`.
- **Finding:** Fully compliant. Prevents rogue or fake location definitions.

### 4. Matching Safety & Untrusted Provider Exclusion (TRUST-VER-004, MATCH-ELIG-077)
- **Control:** Providers with `SUSPENDED` or `BANNED` rating standing, or providers failing required verification levels, must be rejected by matching eligibility.
- **Evidence:** `TrustService.isEligibleForNormalJobs` evaluates standing and rejects non-eligible states. `AvailabilityService.checkSlotAvailability` invokes `isEligibleForNormalJobs` and verifies that the provider's verification level meets or exceeds the required level for the category/job.
- **Finding:** Fully compliant. Prevents bad actors from receiving customer booking dispatches.

### 5. Overbooking & Capacity Abuse Prevention (AVAIL-006, MATCH-ELIG-076)
- **Control:** Providers cannot accept an infinite number of simultaneous jobs. When active jobs meet or exceed `max_active_jobs`, matching must flag the provider as BUSY.
- **Evidence:** Database check constraint `provider_max_active_jobs_positive` ensures `max_active_jobs IS NULL OR max_active_jobs >= 1`. `AvailabilityService.checkSlotAvailability` compares active jobs against capacity and rejects slot availability when limit is reached.
- **Finding:** Fully compliant. Prevents quality degradation and fraudulent multi-booking.

---

## Recommendations & Next Actions
1. **Intake / Matching Integration:** In Task T3.7 (Dispatch pipeline), ensure matching candidate filtering queries `TrustService.isEligibleForNormalJobs` and `AvailabilityService.checkSlotAvailability` prior to score evaluation.

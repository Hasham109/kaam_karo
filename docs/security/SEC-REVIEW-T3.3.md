# SEC-REVIEW T3.3 — AI Request Intake & Moderation

Reviewer: A15 · Date: 2026-10-24 · Task owner: A07 · Branch: `t3.3-ai-intake`  
Scope: `contracts/intake.yaml`, `services/api/src/modules/intake/**`, `services/api/prisma/tests-db/intake.db-spec.ts`.  
Requirement IDs reviewed: REQ-AI-001..012, OPS-ADMIN-026, CAT-SVC-004, CAT-SVC-007; BP §56, §66, §67, §77, §79; SEC-PRIV-001, ARCH §6.2.  

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**  
All privacy protections (PII scrubbing), anti-hallucination boundaries, catalog validation, closed schema constraints, emergency gating, and content moderation checks are verified. Zero security findings or data leakage vulnerabilities.

---

## Security Verification Findings

### 1. PII Redaction in AI Audit Logs (REQ-AI-008, SEC-PRIV-001, BP §66)
- **Control:** Raw voice transcripts and customer prompt text must never store raw personally identifiable information (Pakistani phone numbers, CNICs, email addresses) in `ai_interaction` logs.
- **Evidence:** `scrubPii()` utility uses regex filters targeting:
  - Pakistani phone numbers: `03xx-xxxxxxx`, `+923xxxxxxxxx`, `923xxxxxxxxx`, and loose spaced variants -> replaced with `[PHONE_REDACTED]`.
  - Pakistani CNIC format: `\b\d{5}-\d{7}-\d{1}\b` and contiguous 13-digit numbers -> replaced with `[CNIC_REDACTED]`.
  - Email addresses: standard RFC-compliant patterns -> replaced with `[EMAIL_REDACTED]`.
  Unit tests and live DB tests explicitly verify that prompts containing mobile numbers, CNICs, and emails are scrubbed prior to writing to the `ai_interaction.promptScrubbed` column.
- **Finding:** Fully compliant. Prevents sensitive customer identities from leaking into operational logs or secondary training data.

### 2. Anti-Hallucination & Closed Schema Boundary (REQ-AI-010, REQ-AI-007, ARCH §6.2)
- **Control:** The AI intake module must not generate prices, promise provider arrival times, assign specific technicians, or output contact information. The schema is strictly closed.
- **Evidence:** `ClosedAiInterpretation` interface defines exact allowable fields: `categorySlug`, `serviceSlug`, `candidateServiceId`, `confidence`, `urgency`, `locationHint`, `timeHint`, `clarifyingQuestions`, `detectedLanguage`. No fields exist for price quotes, provider names, or phone numbers.
- **Catalog Validation:** Output service suggestions are cross-checked against the active database catalog via `CatalogService`. If the AI model invents or hallucinates an unknown service slug/ID, `IntakeService` rejects the service candidate, drops confidence to 0.35, and triggers clarification rather than accepting unverified services.
- **Finding:** Fully compliant. Eliminates legal liability and price spoofing vectors.

### 3. Customer Authorization & State Transition Lockdown (REQ-AI-005, SEC-BASE-003)
- **Control:** AI interpretation does not create bookings. Only the authenticated customer who created the draft request may confirm and submit it.
- **Evidence:** Requests start in `COMPOSING` or `AWAITING_CONFIRMATION`. Mutating requests requires caller authorization. `IntakeService.confirmRequest` strictly checks `request.status` and rejects calls on already cancelled or submitted requests with `BadRequestException`. The request snapshot is immutably locked upon transition to `SUBMITTED`.
- **Finding:** Fully compliant. Prevents unauthorized state transitions or request re-submission race conditions.

### 4. Emergency Request Gating (REQ-AI-011, CAT-SVC-004)
- **Control:** Customers cannot abuse the emergency triage flag for standard non-emergency services.
- **Evidence:** When `isEmergency = true`, `IntakeService.confirmRequest` verifies that the referenced catalog service has `emergencyAllowed = true`. If not allowed, the request is rejected immediately with `BadRequestException: Emergency booking is not permitted for this service`.
- **Finding:** Fully compliant. Protects emergency provider dispatch queues from non-critical bookings.

### 5. Content Moderation & Exclusionary Filter (REQ-AI-001, BP §67)
- **Control:** Prompts containing abusive, prohibited, or out-of-scope content must be blocked immediately without catalog invocation.
- **Evidence:** `checkContentModeration()` flags offensive keywords and out-of-scope commercial activities. When triggered, `IntakeService.interpret` records `safetyState = BLOCKED`, sets confidence to 0, and returns a safe canned refusal message.
- **Finding:** Fully compliant.

---

## Recommendations & Next Actions
1. **Downstream Matching (T3.7):** Matching engine should consume confirmed requests (`status = SUBMITTED`) and use immutable `request_snapshot` fields without re-invoking AI services.

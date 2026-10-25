# Security Review — Task T6.1: Payment State Model, Fake Gateway, Idempotency & Completion Gating

> Task: **T6.1** (Payment state model: cash + digital fake gateway, idempotent initiation, payment allowed only after Completed).  
> Owner: **A09** (payments-ledger).  
> Reviewer: **A15** (security-reviewer).  
> Date: 2026-10-25.  
> Branch: `t6.1-payments-model-initiation`.  

---

## 1. Security Invariants Evaluated

### Payment Timing Post-Completion Gating (D-003, PAY-TIMING-001)
- **Assessment:** PASS.
- Customer payment initiation and provider cash recording are strictly locked until the booking is in `COMPLETED` status.
- Payment attempts on `IN_PROGRESS`, `SCHEDULED`, `ACCEPTED`, or earlier states immediately throw HTTP 409 Conflict. This prevents premature money capture or customer extortion before verified work delivery.

### Double-Submit & Replay Attack Defense (PAY-002, REL-008)
- **Assessment:** PASS.
- Idempotency tokens (`idempotencyKey`) ensure double-clicking or network retries resolve to the same underlying transaction reference without creating duplicate financial obligations.
- In-flight pending digital payments are returned without duplicate database allocation.

### Role Segregation & Cash Payment Integrity (D-016, D-030, LEDGER-001..002)
- **Assessment:** PASS.
- The customer application has zero cash selection controls. Cash payment is recorded strictly by the assigned provider at billing (`D-030`).
- If a customer pays digitally via the gateway (`SUCCEEDED`), providers are strictly forbidden from recording cash (`LEDGER-002`), preventing double-billing fraud.

### Zero Raw Cardholder Data Handling (PAY-008, BP §29)
- **Assessment:** PASS.
- The API schema and application models contain zero fields for Primary Account Numbers (PAN), CVVs, or cardholder PINs.
- Digital payments leverage a hosted gateway redirection pattern (`checkoutUrl`), keeping the Kaam Karo platform out of PCI-DSS Level 1 cardholder data scope.

### Append-Only Immutability (PAY-003, DATA-004, BP §26)
- **Assessment:** PASS.
- Financial state records in `payment` are strictly append-only. State transitions (`PENDING` -> `SUCCEEDED` / `FAILED`) create new chronological rows with distinct timestamps; existing rows are never modified in place.

---

## 2. Threat Modeling & Residual Risks

| Threat ID | Threat Description | Mitigation in T6.1 | Status |
|---|---|---|---|
| **KK-T16** | Customer double-charged due to network latency or double-tap | Idempotent initiation deduplicates requests by key and pending reference (`PAY-002`, `REL-008`). | Mitigated |
| **KK-T17** | Customer forced to pay before work is completed | Strict server-side check prevents payment initiation until booking status is `COMPLETED` (`D-003`, `PAY-TIMING-001`). | Mitigated |
| **KK-T18** | Provider logs fake cash payment after customer already paid digitally | System rejects cash recording if digital payment has succeeded (`LEDGER-002`). | Mitigated |
| **KK-T19** | Credit card theft via Kaam Karo servers | Kaam Karo never accepts or stores raw card data; gateway handles card entry on hosted page (`PAY-008`). | Mitigated |

---

## 3. Security Sign-off Verdict

**VERDICT: SEC PASS.**  
All financial security invariants, idempotency controls, and role-based cash protections verified. Approved for merge to `main`.

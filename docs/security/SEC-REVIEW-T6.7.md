# Security Review: Task T6.7 — Unpaid-Commission Hiring Block & "Pay Company" Flow

**Task:** T6.7 (Unpaid-commission hiring block: ARCH §6.8, D-020, D-021; LEDGER-NEG-001..005, LEDGER-PAY-001..007)  
**Reviewer:** Security & Financial Integrity Officer (A16)  
**Date:** 2026-10-26  
**Status:** **SEC PASS**

---

## 1. Security & Integrity Assessment

### 1.1 Separation of Duty (`ABUSE-010`, `OQ-083`)
- **Risk:** A rogue staff member or provider with dual accounts could submit a fabricated payment reference and approve it themselves to wipe out liabilities or generate unauthorized ledger credit.
- **Enforcement:**
  - `decideCommissionPayment` verifies `submission.submittedByUserId !== input.decidedByUserId`.
  - Violations are rejected with `403 Forbidden` (`CANNOT_DECIDE_OWN_SUBMISSION`).
  - Screen A09 (`A09PaymentsScreen.tsx`) blocks self-approval client-side with explicit security warnings.

### 1.2 Unverified Payment Invariant (`D-020`, `LEDGER-PAY-003`)
- **Risk:** Malicious providers submitting fake reference strings (e.g. "TRX-0000000") to immediately lift hiring blocks without transferring money.
- **Enforcement:**
  - Submissions are created in `SUBMITTED` status without any ledger rows written or balance adjustments made.
  - The provider balance remains unchanged until and unless an authorized finance administrator explicitly marks it `APPROVED`.
  - Invariant tested and verified in `ledger.service.spec.ts`.

### 1.3 Audit Trail & Non-Repudiation (`ROLE-003`, `DATA-004`)
- **Enforcement:**
  - Decision reason (`decisionReason`) is strictly mandatory for both `APPROVE` and `REJECT` actions (`REASON_REQUIRED`).
  - Decisions are immutable: an already-decided submission (`APPROVED` or `REJECTED`) cannot be decided again (`409 SUBMISSION_ALREADY_DECIDED`).
  - Approval generates an immutable, audited `COMPANY_PAYMENT_CREDIT` ledger entry referencing `commissionPaymentSubmissionId`.
  - PostgreSQL unique constraint `ledger_one_credit_per_submission` guarantees at most one credit per submission at the database layer.

### 1.4 Access Control & Endpoint Protection (`SEC-AUTH-005`, `BP §29`)
- **Enforcement:**
  - `POST /v1/payments/company/submit`: Requires authenticated session with `PROVIDER` role, asserting profile ownership.
  - `GET /v1/payments/company/submissions/provider/:id`: Restricted to the owning provider or authorized finance staff.
  - `GET /v1/payments/company/submissions/pending`: Restricted to `ADMIN` with `FINANCE` or `SUPER_ADMIN` sub-roles.
  - `POST /v1/payments/company/submissions/:id/decision`: Restricted to `ADMIN` with `FINANCE` or `SUPER_ADMIN` sub-roles.

---

## 2. Security Sign-Off

The unpaid-commission hiring block, "pay company" submission pipeline, and finance verification queue adhere to all separation of duty, auditability, and access control mandates.
Security Sign-off: **SEC PASS**.

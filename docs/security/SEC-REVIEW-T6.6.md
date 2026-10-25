# Security & Integrity Review: Task T6.6 — Provider Earnings Ledger

**Task:** T6.6 (Provider earnings ledger, ARCH §6.8: "How was it paid?" CASH/DIGITAL at billing P14/P15, cash → debit 30% of labour, digital → credit bill − commission, history in P15 and admin A09, "Paid by" shown on C20)  
**Reviewer:** Security & Financial Integrity Officer (A16)  
**Date:** 2026-10-26  
**Status:** **SEC PASS**

---

## 1. Threat Modeling & Security Posture Assessment

### 1.1 Endpoint Protection & Public Allowlist Audit (`SEC-AUTH-005`, `BP §27`)
- **Finding Identified & Fixed (2026-10-26):**
  - Previously, `PaymentsController` inherited a class-level `@Public()` decorator which unintentionally exposed sensitive balance and ledger queries without authentication.
  - **Remediation:** Removed `@Public()` from `PaymentsController`. Enforced global `AuthGuard` across all endpoints. Explicitly whitelisted only the external gateway callback `confirmPayment` as `@Public()` (required for asynchronous webhook ingestion).
  - **Regression Test:** Added `services/api/src/modules/payments/__tests__/payments-access.spec.ts` (7 tests) scanning controller metadata and verifying unauthorized request rejection (HTTP 401).

### 1.2 Data Isolation & Ledger Access (`BP §29: Own Data Only`)
- **Risk:** Malicious providers attempting to inspect competitor revenue, earnings history, or commission status.
- **Mitigation:**
  - `assertProviderOwnsProfile(callerUserId, providerProfileId)` verifies the requested profile ID maps directly to the authenticated session's user account. Cross-provider requests are rejected with `403 Forbidden` (`NOT_YOUR_LEDGER`).
  - Admin ledger queries require `UserRoleType.ADMIN` and either `AdminSubRole.FINANCE` or `SUPER_ADMIN`, with verified session MFA.

### 1.3 Provider Cash Recording Authorization (`D-030`)
- **Risk:** Unassigned providers or customers falsely recording cash payment to trigger or manipulate ledger state.
- **Mitigation:**
  - `recordCashPayment` enforces `UserRoleType.PROVIDER` and verifies that the calling provider's profile matches `booking.providerProfileId`.
  - Non-assigned callers receive `403 Forbidden` (`NOT_ASSIGNED_PROVIDER`).

### 1.4 Double-Entry Financial Consistency & Atomicity (`PAY-003`, `REL-008`, `D-016`)
- **Risk:** Partial failures where a payment state transition succeeds but the corresponding ledger entry fails to write, leading to untracked commission or missing provider credits.
- **Mitigation:**
  - `recordCashPayment` and `confirmDigitalPayment` execute payment records and `LedgerService.recordJobSettlement` inside a single atomic `this.prisma.$transaction`. Either both succeed or both roll back.
  - Single settlement per booking invariant (`LEDGER-002`) prevents duplicate debit or credit creation on retries.

### 1.5 Immutable Financial History (`DATA-004`)
- **Database Grants:** In PostgreSQL production schema (`prisma/schema.prisma` and database migrations), `provider_ledger_entry` is strictly append-only for the application role (`kaamkaro_app`). `UPDATE` and `DELETE` grants are omitted.
- Adjustments or corrections in future tasks will be recorded as reversal rows (`REVERSAL`), preserving an unbroken audit trail.

---

## 2. Security Sign-Off

The provider earnings ledger and billing lifecycle satisfy all financial safety, role-based access control, and transaction atomicity requirements.
Security Review: **SEC PASS**.

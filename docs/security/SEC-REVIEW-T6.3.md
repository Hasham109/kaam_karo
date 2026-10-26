# Security Review: Task T6.3 — Refunds, Settlements, and Reconciliation Job

**Task:** T6.3 (Refunds as reversal rows, positive balance settlements, reconciliation job: PAY-004..007, LEDGER-005, LEDGER-007, SUP-004, ROLE-003, ADMIN-ROLE-004, REL-003)  
**Reviewer:** Security & Financial Integrity Officer (A16)  
**Date:** 2026-10-26  
**Status:** **SEC PASS**

---

## 1. Security & Financial Integrity Assessment

### 1.1 Append-Only Immutability (`PAY-003`, `PAY-004`, `LEDGER-005`, `BP §26`)
- **Risk:** In-place modification or deletion of financial records (payments, refunds, ledger rows) leading to auditing blindspots, fraud, or tax discrepancies.
- **Enforcement:**
  - Original `Payment` rows are never updated in place when a refund occurs.
  - A refund creates append-only `Refund` rows tracking state (`ISSUED` → `SUCCEEDED` / `FAILED`).
  - Ledger adjustments are strictly modeled as new `REVERSAL` rows (`LedgerEntryType.REVERSAL`) referencing the original entry ID (`reversesEntryId`).
  - Database schema (`schema/payments.prisma`) and DB triggers enforce append-only guarantees without UPDATE/DELETE permissions on financial tables for the application role.

### 1.2 Balance Overdraw Prevention (`PAY-007`, `LEDGER-007`)
- **Risk:** Race conditions or double-tap settlement requests allowing a provider to withdraw more than their earned balance or withdraw while in debt.
- **Enforcement:**
  - `SettlementService` locks the provider balance using transactional advisory locking (`pg_advisory_xact_lock`).
  - Payouts are strictly refused if current balance ≤ 0 (`409 Conflict: BALANCE_NOT_POSITIVE`).
  - Requested settlement amount cannot exceed computed positive balance (`409 Conflict: AMOUNT_EXCEEDS_BALANCE`).
  - Deductions are written as `SETTLEMENT_DEBIT` rows within the transaction.

### 1.3 Over-Refund Prevention (`PAY-006`, `BP §26`)
- **Risk:** Malicious or erroneous multiple refunds exceeding the original digital amount paid.
- **Enforcement:**
  - `RefundService` calculates the cumulative non-failed refund total for the payment.
  - New refund requests exceeding the remaining refundable balance are rejected with `409 Conflict: REFUND_EXCEEDS_REFUNDABLE`.
  - Database integrity constraint (`30_integrity.sql`) mirrors this check at the SQL layer.

### 1.4 Access Control & Role Segregation (`ADMIN-ROLE-004`, `ROLE-003`, `SEC-AUTH-005`)
- **Risk:** Unauthorized users or non-finance staff initiating payouts, refunds, or ledger reversals.
- **Enforcement:**
  - `POST /v1/payments/refunds`, `POST /v1/payments/settlements`, and `POST /v1/payments/ledger/corrections` require `ADMIN` role with `FINANCE` or `SUPER_ADMIN` subroles and verified MFA (`assertFinanceStaff`).
  - Mandatory audit reason is enforced across all refund, settlement, and correction writes (`ROLE-003`).
  - Reversals, settlements, and refunds write comprehensive immutable audit logs via `AuditWriter`.

### 1.5 Reconciliation Anomaly Detection (`PAY-005`)
- **Risk:** Divergence between gateway-reported state and internal database state going unnoticed.
- **Enforcement:**
  - `ReconciliationService` queries the gateway for status and amount verification.
  - Exceptions (`MISSING_AT_GATEWAY`, `STATUS_MISMATCH`, `AMOUNT_MISMATCH`, `STUCK_PAYMENT`, `STUCK_REFUND`, `DIGITAL_UNCONFIRMED`) are surfaced to Finance queue A09.
  - Every reconciliation run is logged with `RECONCILIATION_RUN` in `audit_log`.

---

## 2. Security Sign-Off

All financial controls, append-only invariants, role restrictions, and audit mandates for Task T6.3 have been verified.
Security Sign-off: **SEC PASS**.

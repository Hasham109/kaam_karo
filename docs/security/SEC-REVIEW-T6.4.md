# Security Review: Task T6.4 — Payment UI (C16, C24, P15, P16, A09, A10, A13)

**Task:** T6.4 (Payment UI: Customer C16, C24; Partner P15, P16; Admin A09, A10, A13 per docs/screens/customer.md, partner.md, admin.md; D-003, D-006, D-008, D-015, D-016, D-020, D-021, D-025, D-029, D-030; COMM-004, PAY-TIMING-001, PAY-006, PAY-007, LEDGER-001, EXT-001, SHARE-001; BP §13, §15, §25, §26, §27, §30, §31.1; SEC-REVIEW #2, #25)  
**Reviewer:** Security & Financial Integrity Officer (A15 / A16)  
**Date:** 2026-10-26  
**Status:** **SEC PASS**

---

## 1. Security & Financial Integrity Assessment

### 1.1 Fresh OTP Verification on Payout Methods (`BP §27, §30; SEC-REVIEW #2`)
- **Risk:** Account takeover, unauthorized SIM swaps, or malicious session hijacking where an attacker attempts to divert provider earnings by silently modifying or adding a fraudulent payout destination.
- **Enforcement:**
  - `P16PayoutMethodsScreen.tsx` strictly requires the `OtpModal` confirmation step for **every single** action that adds a new payout method or removes an existing payout method.
  - No client-side bypass is permitted; the OTP confirmation state must be validated before the action is dispatched.

### 1.2 Zero Customer Cash Selection Bypass (`D-030, BP §15`)
- **Risk:** Customer selecting "Cash" in app to evade digital processing without provider agreement, or manipulating bill confirmation status.
- **Enforcement:**
  - `C16PaymentScreen.tsx` contains **no** cash selection button or trigger.
  - Cash payment option is exclusively rendered as an informational notice indicating cash is settled directly in person and recorded by the service provider on P14.

### 1.3 Post-Completion Payment Gating (`D-003, PAY-TIMING-001`)
- **Risk:** Customer charged before job completion or paying for an incomplete booking.
- **Enforcement:**
  - `C16PaymentScreen.tsx` checks `bookingStatus === 'COMPLETED'`.
  - If booking is in any other status (e.g. `IN_PROGRESS`, `PENDING`, `ACCEPTED`), the digital checkout action is disabled and guidance is shown.

### 1.4 PII & Financial Account Number Masking (`SEC-BASE-002`)
- **Risk:** Exposure of complete IBAN or mobile wallet account numbers on device screens or shared viewports.
- **Enforcement:**
  - `P16PayoutMethodsScreen.tsx` displays only masked account numbers (e.g. `•••• •••• •••• 4567`).

### 1.5 Separation of Duties & RBAC in Admin Portal (`ADMIN-ROLE-004, ROLE-003`)
- **Risk:** Unauthorized staff issuing refunds, tampering with commission rules, or resolving financial disputes without proper privileges.
- **Enforcement:**
  - `A13FeesScreen.tsx` renders `403 Forbidden` for non-Finance / non-Super Admin roles.
  - `A09PaymentsScreen.tsx` mandates audit reasons (`ROLE-003`) for ledger correction reversals and settlement approvals.
  - `A10RefundsDisputesScreen.tsx` restricts "Issue Refund" button strictly to users with `FINANCE` sub-role.

### 1.6 Prevention of Bank Details in Dispute Logs (`SEC-REVIEW #25`)
- **Risk:** Staff recording customer or partner full bank account details in public or shared dispute timeline updates.
- **Enforcement:**
  - `A10RefundsDisputesScreen.tsx` regex-checks dispute update input for full account/IBAN patterns, preventing leakage in dispute threads.

---

## 2. Security Sign-Off

All authentication constraints, role segregation, masking rules, and financial gating mechanisms for Task T6.4 have been verified.
Security Sign-off: **SEC PASS**.

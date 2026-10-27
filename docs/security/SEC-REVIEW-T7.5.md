# Security & Integrity Review: Task T7.5 — Support Tickets L1–L5, Disputes ↔ Refunds

**Task:** T7.5 (Support tickets L1–L5, disputes ↔ refunds, C28/C29, P20, A10/A12; BP §12 C28, C29; BP §13 P20; BP §14 A10, A12; BP §15, §16, §40, §61.3; SUP-001..005, OPS-ADMIN-010, OPS-ADMIN-012, CFG-RULE-012, ROLE-003, BOOK-STATUS-012, BOOK-CANCEL-006)  
**Reviewer:** Security & Privacy Officer (A15)  
**Date:** 2026-10-27  
**Status:** **SEC PASS**

---

## 1. Threat Modeling & Security Posture Assessment

### 1.1 Support & Dispute Queue Access Control (`OPS-ADMIN-010`, `OPS-ADMIN-012`, `ADMIN-ROLE-001..008`)
- **Risk:** Unauthorized staff accessing private customer/partner complaints or modifying dispute outcomes and monetary refunds.
- **Mitigation:**
  - Admin endpoints (`/admin/support/tickets/*`, `/admin/disputes/*`) are protected by `RequireAdminSubRoleGuard` enforcing allowed sub-roles:
    - Support Queue (`A12`): `SUPPORT`, `OPERATIONS`, `FINANCE`, `RISK_TRUST`, `SUPER_ADMIN`.
    - Refunds/Disputes Decisions (`A10`): `OPERATIONS`, `FINANCE`, `RISK_TRUST`, `SUPER_ADMIN`.
  - Non-authorized roles (`CONTENT_MANAGER`, `ANALYST`, `TECHNICAL_ADMIN`) receive `403 Forbidden`.
  - Finance sub-role exclusively gates final gateway refunds issuance (`PAY-006`).

### 1.2 Mandatory Audit Logging for Consequential Actions (`ROLE-003`)
- **Risk:** Staff arbitrarily closing tickets, escalating levels, reassigning cases, or awarding refunds without operational justification or accountability.
- **Mitigation:**
  - Every consequential staff action (assigning, sending updates, escalating level, setting category, closing ticket, or deciding dispute outcome) strictly mandates an audit reason of at least 5 characters.
  - Omission or short reasons are rejected immediately with 422 `UnprocessableEntityException`.
  - All actions are logged via append-only `AuditWriter.log()` with `actorId`, `targetType` (`SUPPORT_TICKET` or `DISPUTE`), `action`, snapshot payloads, and full reason.

### 1.3 Prevention of Payment Instruction Tampering (`SEC-REVIEW #25`)
- **Risk:** Rogue or compromised support agents instructing customers or providers in ticket replies to wire funds to external personal bank accounts or fraudulent mobile wallets.
- **Mitigation:**
  - Staff message inputs are filtered by automated regex pattern matching (`SEC-REVIEW #25`) detecting IBANs, bank codes (HBL, MCB, Meezan, Easypaisa, JazzCash), account numbers, and wire transfer instructions.
  - Matches are blocked with 400 Bad Request / validation error preventing dispatch.

### 1.4 State Machine & Booking Status Integrity (`BOOK-STATUS-012`, `SUP-003`)
- **Risk:** Opening a dispute while booking is in an invalid or cancelled state, or invalid transition out of dispute.
- **Mitigation:**
  - Disputes can only be created for bookings in `IN_PROGRESS` or `COMPLETED` status.
  - Creation atomically transitions booking to `DISPUTED` (`BOOK-STATUS-012`), recorded via audit log and outbox event `dispute.opened`.
  - Dispute outcomes strictly respect the transition table:
    - `REWORK` moves booking back to `IN_PROGRESS`.
    - `RESOLVED` / `CLOSED` moves booking to `CLOSED`.
    - `REFUNDED` links a pending refund record (`PAY-006`).

### 1.5 Emergency Fast-Track Security (`BOOK-CANCEL-006`)
- **Risk:** Safety threats or on-site violence trapped in standard L2 queue delays.
- **Mitigation:**
  - Emergency safety stop / safety hazard tickets are automatically tagged `isSafety: true` and fast-tracked immediately to L3 Operations with priority SLA deadlines (1h instead of standard 24h).

---

## 2. Security Sign-Off

All endpoints, RBAC sub-role guards, audit trails, state transition integrity, and staff reply safety filters fulfill platform security requirements.  
Security Review: **SEC PASS**.

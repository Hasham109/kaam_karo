# Security & Integrity Review: Task T6.2 — Commission Split & Fee Display

**Task:** T6.2 (Commission split from config `commission.rate = 0.30` on labour lines only D-015, per-party fee display data)  
**Reviewer:** Security & Financial Integrity Officer (A16)  
**Date:** 2026-10-25  
**Status:** **SEC PASS**

---

## 1. Threat Modeling & Financial Integrity Assessment

### 1.1 Invariant Protection: Zero Rounding Leakage (`COMM-002`, `D-008`)
- **Risk:** Floating point precision errors or naive integer division could cause platform or provider funds to leak fractional paisa over thousands of transactions.
- **Mitigation:** Integer arithmetic in minor units (paisa). The rounding formula calculates:
  $$\text{platformCommissionMinor} = \text{round}(\text{commissionableLabourMinor} \times \text{commissionRate})$$
  $$\text{providerShareMinor} = \text{totalBillMinor} - \text{platformCommissionMinor}$$
  Because $\text{providerShareMinor}$ is derived by subtraction, $\text{platformCommissionMinor} + \text{providerShareMinor} \equiv \text{totalBillMinor}$ unconditionally holds for all integer inputs. Residual paisa is mathematically 0.

### 1.2 Information Disclosure Prevention: Customer Shielding (`D-025`, `COMM-004`)
- **Risk:** Exposing platform take-rate or commission breakdown to customer could lead to off-platform transaction incentives or customer friction.
- **Mitigation:** The customer DTO (`CustomerFeeDisplayDto`) strictly strips `commissionRate`, `platformCommissionMinor`, and `providerNetEarningsMinor`. Only approved line item descriptions, types, amounts, and bill totals are exposed.

### 1.3 Unapproved Price Manipulation Prevention (`FARE-012`, `PRICE-007`)
- **Risk:** Malicious or unconfirmed price revisions entered as `PROPOSED` or `REJECTED` fare lines being factored into commission or payout.
- **Mitigation:** `CommissionService` filters lines strictly for `state === 'APPROVED' || state === 'FINAL'` (or default approved lines). Unapproved lines are discarded prior to base summation and total bill calculation.

### 1.4 Dynamic Config Integrity & Grep Test (`COMM-001`, `D-006`)
- **Risk:** Hardcoded commission rates bypassing centralized governance, leading to unversioned discrepancies.
- **Mitigation:** Rate is retrieved from `ConfigService` (`commission.rate`, parsed with `configParsers.ratio`) with fallback to the database `config_rule` table. Automated grep constraint test confirms 0 literal numeric rate values in business logic.

---

## 2. Security Sign-Off

The commission split engine satisfies financial safety, data isolation, and configuration governance requirements. No critical or high vulnerabilities identified.
Security Review: **SEC PASS**.

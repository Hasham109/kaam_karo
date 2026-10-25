# Security Review — Task T5.3: Admin Bookings, Quotes Exceptions, Matching Weights, Badge Rules & AI Guidance

> Task: **T5.3** (Bookings, quotes exceptions, matching weights, badge rules, AI guidance editor).
> Owner: **A13** (admin-portal).
> Reviewer: **A15** (security-reviewer).
> Date: 2026-10-25.
> Branch: `t5.3-admin-ops-weights-ai`.

---

## 1. Security Invariants Evaluated

### Least Privilege & Role-Based Access Control (RBAC)
- **Assessment:** PASS.
- Evaluated sub-role permissions according to `docs/screens/admin.md` §2 and `permission-policy`:
  - **A07 Bookings:** Operations (`OPS`) and Support (`SUP`) have edit rights for interventions (Cancel, No-show); Risk/Trust (`RT`) has view-only access; Finance, Content Manager, and Analyst receive 403 Forbidden.
  - **A08 Quotes Exceptions:** Operations and Risk/Trust have view-only access; all other roles receive 403 Forbidden. No unilateral quote price editing is exposed in admin.
  - **A21 Matching Weights:** Super Admin (`SA`) only. All other roles receive 403 Forbidden.
  - **A22 Badge Rules:** Super Admin (`SA`) only. All other roles receive 403 Forbidden.
  - **A24 AI Guidance:** Super Admin (`SA`) only. All other roles receive 403 Forbidden.

### PII Protection & Customer/Provider Privacy
- **Assessment:** PASS.
- In Screens A07 (Bookings) and A08 (Quotes Exceptions), phone numbers are strictly masked (`+92 ••• ••••456`), preventing bulk data harvesting or improper personal contact outside platform audit workflows.

### Zero Secret Exposure in AI Guidance Configuration (A24)
- **Assessment:** PASS.
- Screen A24 manages natural language instructions and intake questions only.
- Gemini API keys, OAuth credentials, and server secrets are strictly kept on the backend / environment store and are NOT exposed in any client-side state, form fields, or mock contracts.

### Matching Weights Invariants (A21)
- **Assessment:** PASS.
- Hard filters (verification requirement, category capability, suspension status, geographical zone) are strictly enforced in core matchmaking and cannot be circumvented through weight configuration (`D-010`, `BP §52`).
- The UI prominently flags this invariant to administrators and enforces mathematical normalization (weight sum = 100%).

### Mandatory Audit Reason on All State Mutations (ROLE-003, DATA-004)
- **Assessment:** PASS.
- Every state mutation on bookings (interventions, cancellations, no-show declarations), matching weights (new version deployment), badge rules (threshold changes), and AI guidance (prompt and question updates) strictly mandates a non-empty audit reason.

---

## 2. Threat Modeling & Residual Risks

| Threat ID | Threat Description | Mitigation in T5.3 | Status |
|---|---|---|---|
| **KK-T8** | Unauthorized algorithmic manipulation of matchmaking | Matching weights editor (A21) restricted strictly to Super Admin only; sum normalization and audit logging enforced. | Mitigated |
| **KK-T9** | AI prompt injection or credential leak via admin UI | No API keys or backend secrets in A24; inputs sanitized and audited; guidance updates logged with operator ID. | Mitigated |
| **KK-T10** | Arbitrary booking manipulation or cancellation without accountability | Interventions (A07) require selection of responsible party and mandatory audit reason; phone numbers masked. | Mitigated |
| **KK-T11** | Unilateral tampering with provider badge criteria | Badge rules editor (A22) restricted to Super Admin; Fact badges locked to system verification; Rule badges require audit reason. | Mitigated |

---

## 3. Security Sign-off Verdict

**VERDICT: SEC PASS.**
All security invariants verified. Approved for merge to `main`.

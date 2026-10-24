# SEC-REVIEW T3.9 — Customer App Intake Flow & Media/Location

Reviewer: A15 · Date: 2026-10-25 · Task owner: A11 · Branch: `t3.9-customer-intake`
Scope: `apps/customer/src/**`, `packages/i18n/src/messages/customer.ts`.
Requirement IDs reviewed: PERM-JUST-001, PERM-JUST-002, PERM-JUST-003, SEC-PRIV-001, AUTH-PRIV-001, LOC-GEO-003, REQ-AI-008; BP §12, BP §38, BP §66, BP §78, ARCH §3.1, ARCH §6.2; D-004.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
Zero security vulnerabilities, data leakage vectors, or unauthorized permission requests. Permissions-on-tap, pre-prompt educational rationales, zero-account-reveal authentication, and explicit privacy warnings are strictly implemented and verified.

---

## Security Verification Findings

### 1. Dangerous Permissions Strictly On-Tap with Pre-prompt Rationale (PERM-JUST-001..003)
- **Control:** The application must never trigger operating system permission requests on screen load, mount, or transition. When a user explicitly triggers a media or location feature, an in-context educational rationale dialog must appear first explaining the specific necessity to the customer (GPS for finding nearby providers; Microphone for speaking in Urdu; Camera for showing the repair problem) before prompting the OS.
- **Evidence:** 
  - Verified in `PermissionModal.tsx`, `C39LocationConfirmScreen.tsx`, `C32AudioRecorderScreen.tsx`, and `C33VideoRecorderScreen.tsx`.
  - In `intake-flow.spec.ts`: test `permissions are never prompted on screen mount; rationale modal shown on explicit tap` passes.
- **Finding:** Fully compliant.

### 2. Comprehensive Fallbacks on Permission Denial (SEC-AVAIL-001, ARCH §3.1)
- **Control:** If a user denies permission (or system permission is blocked), the application must not crash, hang, or leave the user stranded. A functional alternative must immediately be provided:
  - Microphone denied → Explicit fallback to standard text typing.
  - Camera denied → Explicit fallback to device photo/video gallery file selection.
  - Location/GPS denied → Explicit fallback to manual address text entry and saved addresses list.
  - AI unavailable / low confidence → Explicit fallback banner to standard structured booking form (`C12`).
- **Evidence:** 
  - All fallbacks implemented in UI and verified in `intake-flow.spec.ts`.
- **Finding:** Fully compliant.

### 3. Customer Privacy & Document Leakage Prevention (SEC-PRIV-001, BP §66)
- **Control:** Request attachments and summaries must warn customers against transmitting sensitive personal information, CNICs, or banking/payment credentials to technicians prior to official work authorization.
- **Evidence:** 
  - `C34SummaryScreen.tsx` displays a prominent privacy notice (`c34-privacy-banner`, translated in English and Urdu) alerting users: "Never share CNIC, bank OTP, or ATM pins with providers. Kaam Karo never asks for credentials."
  - Backend integration handles PII scrubbing (`scrubPii`) as established in T3.3.
- **Finding:** Fully compliant.

### 4. Zero Account Leakage & Safe Guest Intake (AUTH-PRIV-001, D-004)
- **Control:** Unauthenticated guest users can compose an intake draft (`C31`, `C12`), record notes, take photos, and review the summary (`C34`). Account creation / login is requested only upon tapping "Find providers", preserving the draft in application context without leaking user credentials or exposing user enumeration.
- **Evidence:**
  - `CustomerContext.tsx` holds `draft` in memory independently of `user` session.
  - When guest taps submit on `C34`, navigation redirects to `C03` login with return destination preserved.
- **Finding:** Fully compliant.

---

## Recommendations & Next Actions
1. **Downstream Integration (T3.10):** Match results and provider dispatch screens should strictly enforce discovery-only mode without revealing customer direct phone numbers until a booking confirmation is locked.

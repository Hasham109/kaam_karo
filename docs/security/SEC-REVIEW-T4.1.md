# SEC-REVIEW T4.1 — Partner Onboarding & Verification Document Upload

Reviewer: A15 · Date: 2026-10-25 · Task owner: A12 · Branch: `t4.1-partner-onboarding`
Scope: `apps/partner/src/**`, `packages/i18n/src/messages/partner.ts`.
Requirement IDs reviewed: SEC-AUTH-001, TRUST-VER-001, TRUST-VER-002, TRUST-VER-003, PROV-CREW-006, MEDIA-008, PERM-005; D-002, D-004, D-018; BP §10, §22.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All partner authentication, zero-password compliance, document picker permission constraints, and crew verification disclaimers are correctly implemented and verified. Zero security findings or credential leakage vectors.

---

## Security Verification Findings

### 1. Passwordless Authentication & Session Security (SEC-AUTH-001, D-002)
- **Control:** Providers must authenticate strictly via Pakistani mobile phone OTP (+92). Passwords or static PINs must never be accepted, requested, stored, or processed anywhere on client or backend.
- **Evidence:** `apps/partner/src/screens/P02RegistrationScreen.tsx` collects only mobile phone and 6-digit OTP with 60-second countdown rate-limiting. No password input elements or fields exist anywhere in the code. Verified in `apps/partner/src/partner-onboarding.spec.ts` test: `enforces zero passwords anywhere in onboarding (SEC-AUTH-001)`.
- **Finding:** Fully compliant. Eliminates credential stuffing, password reuse, and static secret compromise vectors.

### 2. Document Picker Permission Sandboxing (MEDIA-008, PERM-005, M-11)
- **Control:** Verification document upload must use system-provided document picker (`ACTION_OPEN_DOCUMENT` / Storage Access Framework), requiring zero camera (`android.permission.CAMERA`) or storage (`android.permission.READ_EXTERNAL_STORAGE`) runtime permissions.
- **Evidence:** Document picker invocation operates via isolated OS intent without asking for Android runtime storage or camera permissions. Verified by static permission check guard (`guard:permissions`) and automated test: `uses system document picker (zero camera or storage permission, MEDIA-008, PERM-005)`.
- **Finding:** Fully compliant. Protects partner privacy and device files.

### 3. Crew & Team Leader Verification Boundary (D-018, PROV-CREW-006)
- **Control:** When a team contractor registers (`TEAM`), Kaam Karo explicitly verifies only the team leader. Sub-contractor workers or crew members are not added to the app or granted platform accounts. The team leader bears full legal and operational accountability for work performed by their crew.
- **Evidence:** Both `P02RegistrationScreen` and `P03VerificationScreen` prominent bilingual disclaimer banners (`partner.p02.teamLeaderNote`, `partner.p03.teamLeaderNote`) stating: *"Only you, the team leader, are verified. Team members are not added to the app."* / *"صرف آپ (ٹیم لیڈر) کی تصدیق ہوگی۔ ٹیم ممبرز ایپ میں شامل نہیں کیے جاتے۔"* Verified in `partner-onboarding.spec.ts`.
- **Finding:** Fully compliant. Eliminates unvetted third-party identity confusion.

### 4. Verification Level Hierarchy & Access Gating (TRUST-VER-001..003)
- **Control:** Unverified providers maintain `BASIC` standing and cannot accept customer jobs until required documents are submitted and approved. Team contractors require additional `BUSINESS_REG` document verification.
- **Evidence:** `P03VerificationScreen` displays trust standing chip (`BASIC`, `VERIFIED`, `BUSINESS_VERIFIED`), enforces required document completion before allowing submission, and requires `BUSINESS_REG` only for `TEAM` providers. Verified in `partner-onboarding.spec.ts`.
- **Finding:** Fully compliant.

### 5. UI Localization & Hardcoded Secrets Protection (I18N-006, BP §37)
- **Control:** No hardcoded user-facing literals, mock secrets, or unverified keys in code.
- **Evidence:** `guard:string-lint` verified 44 UI files with 0 hardcoded strings. All copy comes from synchronized `@kaamkaro/i18n` catalogs (`PARTNER_EN`, `PARTNER_UR`).
- **Finding:** Fully compliant.

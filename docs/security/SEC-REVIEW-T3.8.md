# SEC-REVIEW T3.8 — Customer App Core UI

Reviewer: A15 · Date: 2026-10-24 · Task owner: A11 · Branch: `t3.8-customer-app-core`
Scope: `apps/customer/src/**`, `packages/i18n/src/messages/customer.ts`.
Requirement IDs reviewed: PERM-JUST-001, PERM-JUST-002, PERM-JUST-003, AUTH-PRIV-001, AUTH-OTP-001, GUEST-PRIV-001; BP §12, BP §38, BP §78, ARCH §3.1; D-004.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
Zero security vulnerabilities, data leakage vectors, or unauthorized permission requests. Zero-account-reveal authentication and safe guest browsing are strictly enforced.

---

## Security Verification Findings

### 1. No Pre-emptive Permissions at Install, Splash, or Onboarding (PERM-JUST-001..003)
- **Control:** Neither the splash screen (`C01`), welcome screen (`C02`), login (`C03`), nor language screen (`C41`) may prompt the operating system for dangerous permissions (location, camera, microphone, notifications). Permissions must only be requested just-in-time when an explicit user action demands it (e.g. mic button tap, photo attachment, exact GPS button tap).
- **Evidence:** 
  - `AndroidManifest.xml` verified via `guard:permissions` (passes).
  - Screen implementations in `C01SplashScreen`, `C02WelcomeScreen`, `C03LoginScreen`, `C04RegisterScreen`, `C05OtpScreen`, `C06HomeScreen`, and `C41LanguageScreen` contain zero permission request calls.
- **Finding:** Fully compliant.

### 2. Zero-Account-Reveal Login Flow (AUTH-PRIV-001, SEC-PRIV-001)
- **Control:** Entering a mobile number on the login screen (`C03`) must never inform the client or UI whether that phone number is already registered or new before OTP verification. This prevents mobile number enumeration attacks and customer identification.
- **Evidence:** `C03LoginScreen` performs uniform client validation and sends an OTP without rendering distinct "user found" or "user not found" states. Registration details (name, city, area) are collected only after OTP verification on `C05`.
- **Finding:** Fully compliant.

### 3. Safe Guest Mode Isolation (D-004, GUEST-PRIV-001)
- **Control:** Guests must be allowed to browse catalog, categories, search results, and provider public profiles without creating accounts or revealing personal data. Any mutation or booking commitment must safely pause and route to authentication.
- **Evidence:** `C02WelcomeScreen` offers "Continue as guest". In guest mode (`isGuest === true`), the user can browse `C06`, `C07`, `C08`, `C09`, `C10`, and `C11`. Tapping "Book now" or "Favorite" safely redirects to `C03` login with return parameters preserved in navigation state.
- **Finding:** Fully compliant.

### 4. Input Sanitization & Phone Normalization
- **Control:** Phone inputs must be sanitized to strip non-digit characters and validated to 10 digits starting with `3` (`03XX-XXXXXXX` / `+92 3XX XXXXXXX`).
- **Evidence:** `C03LoginScreen` normalizes input via `text.replace(/\D/g, '')` and validates `cleaned.length === 10 && cleaned.startsWith('3')`. Bidirectional text isolation is handled via `isolatePhone(locale, phone)`.
- **Finding:** Fully compliant.

---

## Recommendations & Next Actions
1. **Intake Flow Integration (T3.9):** When implementing the audio/photo intake screens (C12–C16), ensure `PERM-JUST-001` educational rationale modals are displayed prior to OS runtime permission prompts for microphone and camera.

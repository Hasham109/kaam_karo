# SEC-REVIEW T4.2 — Partner Services Setup, Availability, Overrides, Status Switch & Service Area

Reviewer: A15 · Date: 2026-10-25 · Task owner: A12 · Branch: `t4.2-partner-services-availability`
Scope: `apps/partner/src/**`, `packages/i18n/src/messages/partner.ts`.
Requirement IDs reviewed: BP §59, BP §13 P05–P07, P22, P23; ROLE-002, MATCH-ELIG-074, PRICE-001..005, FARE-001..002, AVAIL-001..007, MATCH-ELIG-075..076, LOC-GEO-003, LOC-GEO-006, G2, NOTIF-010, PERM-004, BP §57.4, D-018, PROV-CREW-005.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All partner service pricing controls, availability validation rules, geographic boundary constraints, notification educational pre-prompts, zero-background location guarantees, and zero-GPS permission compliance are correctly implemented and verified. Zero security findings or privacy leakage vectors.

---

## Security Verification Findings

### 1. Crew Size Never a Price Input (D-018, PROV-CREW-005)
- **Control:** In accordance with Kaam Karo design principles (`D-018`, `PROV-CREW-005`), customer pricing and partner service setup must NEVER allow crew size or worker count as a price multiplier or pricing input. Fixed prices, starting prices, visit fees, and inspection fees apply per job/unit regardless of crew size.
- **Evidence:** `apps/partner/src/screens/P05ServiceSetupScreen.tsx` provides inputs strictly for `priceAmount`, `visitFee`, `inspectionFee`, and deductible toggles. No crew size inputs or pricing multipliers exist. Verified in `apps/partner/src/partner-services-availability.spec.ts` test: `enforces that crew size is NEVER a pricing input (D-018, PROV-CREW-005)`.
- **Finding:** Fully compliant. Prevents predatory pricing or unauthorized labour surcharge manipulation.

### 2. Zero GPS Permissions on Service Area Setup (BP §59.1, G2, LOC-GEO-003, LOC-GEO-006)
- **Control:** Configuring partner service radius and working areas must NOT prompt for or require Android GPS runtime permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`). Partners configure their service area via place name search and radius within active Lahore zones, with offline fallback (`LOC-GEO-006`).
- **Evidence:** `apps/partner/src/screens/P07ServiceAreaScreen.tsx` operates entirely on administrative place name centers (Gulberg III default) and km radius pills without calling device GPS. Verified by `guard:permissions` (0 forbidden permissions) and automated test: `requests zero GPS permissions on service area setup (BP §59.1, G2, LOC-GEO-006)`.
- **Finding:** Fully compliant. Protects partner privacy and device location confidentiality.

### 3. Zero Background Location Tracking on Online Status (BP §57.4, AVAIL-007)
- **Control:** Switching availability status to `ONLINE_AVAILABLE` or `EMERGENCY_AVAILABLE` must NOT activate background location polling or continuous GPS tracking. Partner matching uses configured service area center and radius, not real-time background tracking.
- **Evidence:** `apps/partner/src/screens/P22LiveStatusScreen.tsx` sets provider availability state without spawning any location tracking listeners or background workers. Verified in unit tests (`enforces zero background location tracking when provider is Online (BP §57.4)`).
- **Finding:** Fully compliant. Protects battery, partner data plan, and location privacy.

### 4. Educational In-Context Notification Pre-Prompt (OQ-026, NOTIF-010, PERM-004)
- **Control:** Notification permission requests must never be presented cold on app launch. When a partner switches to `ONLINE_AVAILABLE` or `EMERGENCY_AVAILABLE` for the first time, the app must show an educational in-context pre-prompt explaining the business benefit (instant job request alerts) before requesting system notification permissions.
- **Evidence:** `apps/partner/src/screens/P22LiveStatusScreen.tsx` intercepts the first Online transition when `hasPromptedNotification === false` and presents a modal with bilingual educational text (`partner.p22.notifPrepromptTitle`, `partner.p22.notifPrepromptDesc`) with "Turn on notifications" and "Not now" actions. Verified in `partner-services-availability.spec.ts`.
- **Finding:** Fully compliant. Prevents permission fatigue and TalkBack confusion.

### 5. Eligibility Gating on Live Availability (MATCH-ELIG-074, ROLE-002)
- **Control:** Partners with unapproved/basic verification must receive clear visual notice that while their status is Online, they are ineligible to receive dispatched instant jobs until verification is approved.
- **Evidence:** `P22LiveStatusScreen` displays a prominent warning banner (`partner.p22.blockedWarning`: *"You are Online, but you won't get new jobs until verification is approved."*) whenever status is Online and verification is `BASIC`. Verified in `partner-services-availability.spec.ts`.
- **Finding:** Fully compliant. Prevents dispatching unverified contractors to customer premises.

### 6. UI Localization & Hardcoded String Protection (I18N-006, BP §37)
- **Control:** All copy across P05, P06, P07, P22, P23 must originate from verified, synchronized `@kaamkaro/i18n` catalogs.
- **Evidence:** `guard:string-lint` verified 49 UI files with 0 hardcoded strings. All message keys are present in both `PARTNER_EN` and `PARTNER_UR`.
- **Finding:** Fully compliant.

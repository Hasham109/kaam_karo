# OPEN QUESTIONS — Kaam Karo

Anything the Blueprint or DECISIONS.md does not answer. Agents add rows; only the owner answers (record answers with `/decision`).

| ID | Question | Raised by | Blocks | Status |
|---|---|---|---|---|
| OQ-001 | D-008 Payment gateway(s) & payout provider: Pakistan options (BP §69) | A00 (from ARCH §22) | M11 real integration | OPEN |
| OQ-002 | D-009 SMS/OTP, LLM, STT, masked-calling vendors: BP §33, §77.1 | A00 (from ARCH §22) | Real integrations (fakes allowed until then) | OPEN |
| OQ-003 | D-010 Ranking weights, badge thresholds, AI confidence threshold: Admin-configurable (BP §54.2, §55.2) | A00 (from ARCH §22) | Production values | OPEN |
| OQ-004 | D-011 Media limits & retention: BP §76 | A00 (from ARCH §22) | M14 production config | OPEN |
| OQ-005 | D-012 RPO / RTO / performance budgets: BP §31.3, §84 item 120 | A00 (from ARCH §22) | Release gate | OPEN |
| OQ-006 | D-013 Cancellation windows/fees & quote validity: BP §16, §18, §42 | A00 (from ARCH §22) | M9/M10 production config | OPEN |
| OQ-007 | D-022 Provider account follow-ups: Finance verification time limit; grace time before an unpaid already-accepted job is treated as provider cancellation; does a discount reduce labour before commission; should the customer confirm the recorded payment method (§6.8) | A00 (from ARCH §22) | Production values (config `TODO(OWNER)` until decided) | OPEN |
| OQ-008 | Guest browsing: may a guest browse without login, account needed only to submit? (ARCH K-09) | A00 | Confirmation only (default implemented) | OPEN |
| OQ-009 | Booking states not defined in BP §15 (Abandoned, Declined, Reviewed, Resolved, Refunded, Rework, Rejected, No-show): confirm the defaults in ARCH §6.1 (K-05) | A00 | Confirmation only (default implemented) | OPEN |
| OQ-010 | Price model vs selling model as two separate service fields (ARCH §5.5, K-08) | A00 | Confirmation only (default implemented) | OPEN |
| OQ-011 | Visit/inspection/emergency fees excluded from commission (ARCH §6.8 interpretation) | A00 | Confirmation only (default implemented) | OPEN |
| OQ-012 | Should email be collected at registration (optional, not for login)? (ARCH §3.1) | A00 | Confirmation only (default implemented) | OPEN |
| OQ-013 | D-017 remaining rating numbers: minimum number of ratings before enforcement, rating window, review period (days), warning reset, effect on scheduled jobs, appeal flow (ARCH §6.7) | A00 | Rating enforcement leaves dry-run | OPEN |
| OQ-014 | K-16: how does a booking enter Quote Pending, and how is the inspection-first flow (BP §4.1) mapped? Default: Draft → Quote Pending for quote/inspection services, Requested → Quote Pending when the provider chooses Quote; inspection visit happens inside Quote Pending (REQ BOOK-STATUS-003) | A00 (T0.2) | Confirmation only (default implemented) | OPEN |
| OQ-015 | Which verification items (documents/checks) are required per category for Verified / Business Verified (BP §22.1, §42; ARCH §6.4)? Default: config per category, `TODO(OWNER)`; Risk/Trust decides manually in A04 meanwhile | A00 (T0.2) | Production verification rules | OPEN |
| OQ-016 | Which service families are active in Lahore on day one? BP §6 suggests 8–10: Plumbing, Electrical, AC/Cooling, Appliance Repair, Internet/Wi-Fi, TV/Entertainment, Cleaning, Carpentry/Furniture, Locksmith/Access, basic Car Care (REQ SCOPE-CAT-002) | A00 (T0.2) | Pilot catalog (operations can switch in A23) | ANSWERED 2026-10-22 → D-024 (all 10 families) |
| OQ-017 | Customer booking/request limits and spam limits (BP §30, §42; REQ CFG-RULE-008, ABUSE-003). Default: `null` → only technical rate limits | A00 (T0.2) | Production config | OPEN |
| OQ-018 | Support categories and SLA targets per level L1–L5 (BP §40, §42; REQ CFG-RULE-012). Default: `null` → no SLA breach flagged | A00 (T0.2) | Production config | OPEN |
| OQ-019 | K-17: payment is only after Completed (D-003). How are a late-cancellation fee, a customer no-show fee or an inspection fee (quote declined) collected, or are they not charged at launch? Default: not charged (config `null`) | A00 (T0.2) | BOOK-CANCEL-002/005 production config | ANSWERED 2026-10-22 → D-023 (not charged at launch) |
| OQ-020 | Will the customer pay a separate Kaam Karo platform fee (BP §41, §58.1)? How is tax shown? Default: no platform-fee line, no tax line until decided (REQ FARE-009, FARE-010) | A00 (T0.2) | Fare/bill production config | PARTLY ANSWERED 2026-10-22 → D-025 (no platform fee); tax line still OPEN |
| OQ-021 | Supply gap (BP §61.3): what happens after "request a callback" and "join a waitlist"? Default: callback creates an Operations ticket in A12; waitlist stores the request for A25 health metrics only (automatic "notify when available" is BP §83 Proposed, not launch) (REQ MATCH-GAP-001) | A00 (T0.2) | Confirmation only (default implemented) | OPEN |
| OQ-022 | Admin portal language: English only, or English + Urdu like the apps? Default: English only for staff screens; all customer/provider-facing templates in en + ur | A00 (T0.2) | A13 scope | ANSWERED 2026-10-22 → D-026 (English only) |
| OQ-023 | Does the ≈30 s problem video (BP §76.2) record sound? Default: yes only if needed; microphone asked at the video-record tap only if sound is recorded | A15 (T0.4) | Media recorder (T3.9) | OPEN |
| OQ-024 | Does the Partner app need the microphone at launch? BP §74 calls provider voice replies "optional future". Default: no `RECORD_AUDIO` in the Partner app | A15 (T0.4) | Partner app manifest | OPEN |
| OQ-025 | Is the provider's live location shared with the customer while "on the way" (BP §80, §81) at launch? Default: no live map sharing; status + ETA only | A15 (T0.4) | T4.5, T4.6 | OPEN |
| OQ-026 | When does the Partner app ask for notification permission? BP §75 item 96 gives only the customer example. Default: after onboarding, before the provider first goes Online, with a short explanation | A15 (T0.4) | T4.1 | OPEN |
| OQ-027 | Exactly when does a provider get the customer's exact address and contact route (customer chooses them vs booking confirmed), and does access end after completion? Default: after the customer chooses and the booking is Accepted; before that area + distance only (REQ PROF-ADDR-004) | A15 (T0.4) | Confirmation only (default implemented) | OPEN |
| OQ-028 | Security numbers: OTP expiry, resend cooldown, attempt limit, lockout, session lifetime, deletion hold period, chat/review rate limits (BP §27, §29; D-002). Default: config `null` + `TODO(OWNER)`; non-production uses safe test values | A15 (T0.4) | Production config before pilot | OPEN |
| OQ-029 | Which physical phones will we buy/borrow for D-REF (cheapest, small screen, low RAM), D-OLD (Android 12 or lower) and D-MID (current mid-range)? (docs/qa/device-matrix.md) | A16 (T0.5) | **T0.6** (D-001 condition) and every physical gate run (BP §49) | PARTLY ANSWERED 2026-10-22 → D-027 (cheapest, lowest-spec phone); exact model still OPEN |
| OQ-030 | Minimum supported Android version: A01 proposes it from the pinned Expo SDK at T2.1; owner confirms. Default: Expo SDK default floor | A16 (T0.5) | D-OLD choice; store listing | OPEN |
| OQ-031 | Which browsers will the admin/operations team use? Default: Chromium is the release-gate browser | A16 (T0.5) | Admin release-gate browser list | OPEN |
| OQ-032 | Confirm iOS is not in the launch/pilot test matrix (D-001 Android-first, BP §49). Default: Android only | A16 (T0.5) | Matrix scope | OPEN |
| OQ-033 | May QA use a paid cloud device farm, or physical devices + emulators only? (vendor choice). Default: physical devices + emulators only | A16 (T0.5) | Scale of nightly physical runs | OPEN |

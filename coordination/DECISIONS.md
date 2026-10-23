# DECISIONS — Kaam Karo

Owner decisions are the highest authority (ARCH §0.1). Copied from docs/architecture.md §22 on 2026-10-22 and verified against it in T0.3 (2026-10-22). Update with `/decision`.

Status values follow BP §72: **Accepted**, **Proposed** (options on the table, waiting for the owner), Rejected, Deferred, Needs Validation. Every row has exactly one status. "Partly accepted" means the accepted part is binding and the rest is Proposed.

| ID | Decision | Status | Detail / options | Blocks |
|---|---|---|---|---|
| D-001 | Technology stack | **Accepted 2026-10-22** | React Native (Expo) + TypeScript, Next.js admin, NestJS, PostgreSQL + PostGIS, Prisma, Redis + BullMQ, FCM, Google Maps (ARCH §17). Condition: Urdu smoke test T0.6 | Nothing (unblocked) |
| D-002 | Authentication | **Accepted 2026-10-22** | Phone number + OTP for customers and providers; admin keeps strong auth + MFA (BP §27). SMS vendor still open (D-009) | Nothing for build (fake `OtpSender`); real SMS vendor needed before pilot |
| D-003 | Payment timing | **Accepted 2026-10-22** | Pay at the end, after the job is Completed. Visit/inspection fees are also collected at the end unless the owner decides otherwise. See K-17 for fees on jobs that never reach Completed | Nothing |
| D-004 | Provider model | **Accepted 2026-10-22** | A provider can be one worker or a team; the provider states the crew size (how many workers will come) on every offer/booking (ARCH §5.6) | Nothing |
| D-005 | Matching mode default | **Accepted 2026-10-22** | Customer chooses (no auto-assign) | Nothing |
| D-006 | Commission | **Accepted 2026-10-22** | Fixed 30% to platform, 70% to provider. Config `commission.rate = 0.30` | Nothing (base = labour only, D-015) |
| D-007 | Launch city | **Accepted 2026-10-22** | Lahore. Pilot area = whole Lahore (D-019) | Nothing |
| D-008 | Payment gateway(s) & payout provider | **Proposed** (waiting for owner) | Pakistan options (BP §69). Build uses `PaymentGateway` / `PayoutProvider` fakes | M11 real integration (T6.5) |
| D-009 | SMS/OTP, LLM, STT, masked-calling vendors | **Proposed** (waiting for owner) | BP §33, §77.1. Build uses fakes | Real integrations (fakes allowed until then) |
| D-010 | Ranking weights, badge thresholds, AI confidence threshold | **Proposed** (waiting for owner) | Admin-configurable (BP §54.2, §55.2). Seeded `null` + `TODO(OWNER)` | Production values |
| D-011 | Media limits & retention | **Proposed** (waiting for owner) | BP §76 (targets ≈ 2 min audio, ≈ 30 s video; exact max size/duration, bitrate, retention open) | M14 production config |
| D-012 | RPO / RTO / performance budgets | **Proposed** (waiting for owner) | BP §31.3, §84 item 120 | Release gate |
| D-013 | Cancellation windows/fees & quote validity | **Proposed** (waiting for owner) | BP §16, §18, §42 | M9/M10 production config |
| D-014 | Provider low-rating enforcement | **Accepted 2026-10-22** | Rating per job → 1–2 warnings → block (ARCH §6.7) | Nothing for build |
| D-015 | What the 30% commission is calculated on | **Accepted 2026-10-22** | Worker's labour only (Labor / Service fee lines). Config `commission.base_line_types = ["LABOR"]` (ARCH §6.8) | Nothing |
| D-016 | How the platform collects its 30% on cash jobs | **Accepted 2026-10-22** | Provider records the payment method in billing; for cash, the 30% is debited from the provider's account (ARCH §6.8) | Nothing |
| D-017 | Rating enforcement numbers | **Partly accepted 2026-10-22** | Accepted: threshold = average **below 2.0**. Proposed (open): minimum number of ratings, rating window, review period, warning reset, effect on scheduled jobs, appeal (ARCH §6.7) | Production enforcement (dry-run until minimum ratings and review period are set) |
| D-018 | Crew details | **Accepted 2026-10-22** | Only the team leader is verified; crew size does not change the price; price depends on the nature of the work (ARCH §5.6) | Nothing |
| D-019 | Pilot area inside Lahore | **Accepted 2026-10-22** | Whole Lahore, not selected neighbourhoods. Overrides the BP §6.2 pilot suggestion (authority order ARCH §0.1 item 1; K-14) | Nothing |
| D-020 | Provider with unpaid commission | **Accepted 2026-10-22** | Until the worker pays the owed commission to the company, the next customer cannot hire them (limit 0, ARCH §6.8) | Nothing |
| D-021 | Provider pays the company | **Accepted 2026-10-22** | The worker can send the money through any bank or mobile wallet; the hiring block also applies to already-accepted jobs (they cannot start until paid) (ARCH §6.8) | Nothing |
| D-022 | Provider account follow-ups | **Proposed** (waiting for owner) | Finance verification time limit; grace time before an unpaid already-accepted job is treated as provider cancellation; does a discount reduce labour before commission; should the customer confirm the recorded payment method (ARCH §6.8) | Production values (config `TODO(OWNER)` until decided) |
| D-023 | Fees on jobs that never reach Completed (K-17, OQ-019) | **Accepted 2026-10-22** | Owner: "for now keep payment at the end only." Payment stays only after `Completed` (D-003). A late-cancellation fee, a customer no-show fee, or an inspection fee when the quote is declined is **not charged at launch** (config stays `null`) | Nothing |
| D-024 | Service families active in Lahore on day one (OQ-016) | **Accepted 2026-10-22** | All 10 families suggested by BP §6: Plumbing, Electrical, AC/Cooling, Appliance Repair, Internet/Wi-Fi, TV/Entertainment, Cleaning, Carpentry/Furniture, Locksmith/Access, basic Car Care (BP §63 families: Plumbing & Water, Electrical & Power, AC Cooling & Heating, Home Appliances, Internet Wi-Fi & Networking, TV Satellite & Home Entertainment, Cleaning & Hygiene, Carpentry & Furniture, Locksmith & Access, Car & Two-Wheeler Everyday Care). All other §63 families stay inactive | Nothing |
| D-025 | Customer platform fee (OQ-020) | **Accepted 2026-10-22** | **No** separate platform fee for the customer. Platform income = 30% commission only (D-006). Config `fees.customer_platform_fee` = `0`/disabled. (Tax line is still open, OQ-020) | Nothing |
| D-026 | Admin portal language (OQ-022) | **Accepted 2026-10-22** | Admin portal in **English only**. Customer and Partner apps stay English + Urdu | Nothing |
| D-027 | Test phone for the Urdu smoke test and low-end testing (OQ-029) | **Accepted 2026-10-22** | Owner's choice: **Infinix Note 40** is the physical reference test phone for T0.6 and low-end testing. A00 note: this model is not a small-screen / low-RAM phone (A00 understanding of the model, to be checked against the actual phone), so small-screen and low-memory checks also run on the emulator profile E-MIN until a cheaper phone is added (OQ-034) | Nothing (T0.6 can start once the phone is on hand) |
| D-028 | Quote Pending entry and inspection-first flow (K-16, OQ-014) | **Accepted 2026-10-22** | Owner confirmed the default: Draft → Quote Pending when the customer submits on a quote/inspection service; Requested → Quote Pending when the provider chooses "Quote"; the inspection visit happens while the booking is in Quote Pending (visit time stored on the booking, no separate status) | Nothing |
| D-029 | Tax on the customer bill (OQ-020) | **Accepted 2026-10-22** | The bill **shows a separate tax line** (BP §58.1). Which tax and what rate are still open (OQ-035); config tax rules seeded `null` + `TODO(OWNER)` | Production tax values |
| D-030 | Who records a cash payment; when a booking exists (OQ-049) | **Accepted 2026-10-23** | Owner: the customer sends the booking request and the provider accepts it; only then is it a booking (Requested → Accepted, BP §15). Cash payment is **recorded only by the provider** in the Partner app (P14, D-016). The Customer app has no "choose cash" option: C16 only tells the customer to pay cash to the provider; C20 shows "Paid by" as recorded | Nothing |

## Not launch (do not build)
Wallet/credits for customers, subscriptions, corporate/B2B (BP §46); promotions/coupons (BP §14); contacts picker, calendar, biometrics, Bluetooth (BP §74); every item in BP §83 until accepted (BP §86).

## T0.3 verification note (2026-10-22, A00)
- Every row above matches ARCH §22 word for word in meaning; only the layout changed (separate Status column, rows sorted by ID).
- ARCH §22 itself still uses the old layout; no content difference, so no ARCH change is needed.
- Every decision now has one status: 14 Accepted (D-001…D-007, D-014…D-016, D-018…D-021), 1 Partly accepted (D-017), 7 Proposed (D-008…D-013, D-022). Total 22. Later the same day the owner added D-023…D-027 (all Accepted; D-027 criterion only).

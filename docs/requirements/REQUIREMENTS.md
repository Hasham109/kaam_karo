# Kaam Karo — Requirement Registry

> Task **T0.2** (owner A00). Built 2026-10-22 from `docs/implementation.md` §5 (seed), `docs/BLUEPRINT.md` v0.4 and `coordination/DECISIONS.md`.
> Format per BP §48: `AREA-TOPIC-NNN`. **Agents must not create requirement IDs.** Ask A00 (IMPL §5).
> Every code change, test and handoff cites IDs from this file (IMPL §0 rule 2, §7.4 citation guard).

## 0. How to read this file

### 0.1 Columns

| Column | Meaning |
|---|---|
| ID | Stable requirement ID. Never reused. When a rule changes, edit the row (BP §48) and log it in `coordination/CHANGELOG.md`. |
| Requirement | One behaviour. |
| Acceptance criterion | One testable check. A16 turns it into a test (unit / API / E2E / manual device check). |
| Source | `BP §n` (Blueprint), `D-xxx` (owner decision), `K-xx` (conflict register), `ARCH §n` only for derived detail. |
| Owner | Agent ID (IMPL §2). First listed agent is accountable. |
| Status | See 0.2. |

### 0.2 Status values

| Status | Meaning | What agents do |
|---|---|---|
| `Launch` | Stated by the Blueprint or an accepted owner decision. | Build it. |
| `Launch · INTERP` | The Blueprint is ambiguous; the default reading is used (ARCH §0.2 `[INTERPRETATION]`). The linked K-/OQ- item asks the owner to confirm. | Build the default behind config; do not extend it. |
| `Launch · TODO(OWNER)` | Mechanism is required now, but a business value is still open. | Build the mechanism; seed `null` + `// TODO(OWNER)`; behave safely while `null` (as stated in the criterion). |
| `Not launch` | Blueprint marks it Later / Proposed / Future (BP §72, §86). | Do not build. At most reserve an enum value or extension point. |

### 0.3 Rules used while writing this file

1. No requirement exists without a Blueprint section or an owner decision behind it.
2. No business value is invented. A value appears only when an owner decision gives it (e.g. `commission.rate = 0.30`, D-006).
3. "config `x`" means a `ConfigRule` row (ARCH §5.3): editable in the Admin Portal, audited, effective without a deploy.
4. Blueprint ranked-list numbers are cited only for BP §54.1 rules 73–79 and BP §75 items 93–98 (K-12). Other lists are cited by section.

### 0.4 Differences from the IMPL §5 seed

The seed ranges were expanded exactly as written. These changes were needed so that every rule has exactly one ID and every Blueprint section is covered:

| Change | Why |
|---|---|
| `BOOK-STATUS-016`, `-017` added | Seed text "server-only" and the K-05 statuses (Rejected, No-show) needed their own IDs. |
| `QUOTE-009` added | Seed text "+ multi-supplier offers" had no number. |
| `FARE-012`, `-013` added | Seed text "proposed/approved/rejected/final; emergency exception flag" had no number. |
| `CAT-SVC-011`, `-012` added | Rest of the BP §4.2 listing anatomy; BP §64 "configurable without app release". |
| `REQ-AI-013`, `-014` added | BP §56.3 post-job assistance and support triage were not in the seed. |
| `PAY-009` added | Receipts (BP §12 C24, §23). |
| `REL-014`…`-016` added | BP §31.3 recovery objectives (seed covered §31.1–§31.2 only). |
| `OPS-ADMIN-021`…`-026` added | Seed said "(+A21–A26 derived)". |
| New areas `ROLE`, `PROF-FAV`, `SHARE`, `DATA`, `INFRA`, `EXT`, `PLAT`, `UX-SCREEN`, `UX-PROV`, `PERF`, `JOURNEY` | Blueprint sections §8.1–§8.3, §9–§13, §25–§26, §32–§34, §55.2 (Favorite), §60, §62, §66, §82, §84 had no seed ID. |

---

## 1. Scope (SCOPE)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| SCOPE-GEO-001 | Pakistan is the only supported marketplace country; a city can be listed without being active. | API test: a service location outside Pakistan is rejected with `OUT_OF_SERVICE_COUNTRY`; a request in a listed but inactive city returns a "not active yet" result and never reaches matching. | BP §57.2, §69; K-13 | A03 | Launch |
| SCOPE-GEO-002 | Lahore is the launch city and the whole of Lahore is one active service zone from the pilot. | Seed test: Lahore `is_listed = true, is_active = true`; every other Pakistani city `is_listed = true, is_active = false`; any point inside the Lahore boundary resolves to the active zone. | BP §6.2; D-007, D-019; K-14 | A03 | Launch |
| SCOPE-CAT-001 | The catalog is limited to the BP §63 household tree; categories excluded by BP §1.4 never exist, and new verticals are not added to the launch menu. | Seed test: seeded service count equals the BP §63 item count; no seeded item belongs to an excluded area (medical, legal, financial, childcare/eldercare, recruitment, government, high-risk construction); the admin API offers no way to create a new top-level family at launch. | BP §1.4, §5, §63, §65; K-04 | A03 | Launch |
| SCOPE-CAT-002 | All catalog items are seeded inactive; the active launch set is chosen per city in the Admin Portal. | Seed test: every seeded service is inactive; activating a family for Lahore in A23 makes it visible in the customer app without a deploy; inactive items never appear to customers. | BP §6, §6.1, §64 | A03 | Launch · TODO(OWNER) (which families on day one: OQ-016) |

## 2. Catalog and service configuration (CAT-SVC)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| CAT-SVC-001 | Each service has a price model: `FIXED`, `FROM` or `INSPECTION_QUOTE`. | Saving a service without a valid `price_model` is rejected; C10 shows the price label that matches the model ("Rs. X", "from Rs. X", "price after inspection"). | BP §4.1, §17; K-08 | A03 | Launch · INTERP (OQ-010) |
| CAT-SVC-002 | Each service has one or more selling modes: `INSTANT`, `CHOOSE_SUPPLIER`, `REQUEST_QUOTES`. | A request using a mode not in the service's `selling_modes` is refused by the server (409); a service with an empty set cannot be activated. | BP §53, §64; K-08 | A03 | Launch · INTERP (OQ-010) |
| CAT-SVC-003 | Each service states whether inspection is expected and whether a quote is required. | For a service with `quote_required = true`, the server refuses a booking at a catalog price and routes it to the quote flow (BOOK-STATUS-003). | BP §4.2, §64 | A03 | Launch |
| CAT-SVC-004 | Each service states whether emergency mode is allowed. | Emergency requests and the `Emergency Available` status are matched only for services with `emergency_allowed = true` (test with flag on/off). | BP §58.3, §59.3, §64 | A03 | Launch |
| CAT-SVC-005 | Each service/category states the provider verification level it requires. | A provider below the required level fails hard rule 77 (MATCH-ELIG-077) for that service; the requirement is read from config, not code. | BP §22.1, §42, §64 | A03 | Launch · TODO(OWNER) (OQ-015) |
| CAT-SVC-006 | Each service can have customer questions configured in the Admin Portal. | Editing a service's questions in A24 changes the questions asked in the customer request flow after refresh, with no app release. | BP §64 | A03 | Launch |
| CAT-SVC-007 | Each service can have AI guidance configured in the Admin Portal. | IntakeAI receives the current guidance for the candidate service; the AI Interaction record stores which guidance version was used. | BP §64, §67 | A03 | Launch |
| CAT-SVC-008 | Each service shows what is included and what is not included. | C10 (and the quote, QUOTE-005) render the "included" and "not included" lists from service data. | BP §4.2, §18 | A03 | Launch |
| CAT-SVC-009 | Each service has a pricing unit (job, hour, room, appliance, meter, item, vehicle, …). | The unit comes from a configurable list; C10 and quotes show "per <unit>" next to the price. | BP §4.2 | A03 | Launch |
| CAT-SVC-010 | Each service has a materials policy and an optional warranty/rework policy. | `materials_policy ∈ {INCLUDED, CUSTOMER_PROVIDED, CHARGED_SEPARATELY}` is required; both policies are shown on C10. | BP §4.2, §17 | A03 | Launch |
| CAT-SVC-011 | Each service carries the rest of the BP §4.2 listing anatomy: name, category, plain-language description, estimated duration, availability hours, minimum visit/call-out charge if applicable, required customer information/photos, cancellation policy reference, images/examples. | The service-detail API returns every listed field (nullable where BP says "if applicable") and C10 renders each non-null field. | BP §4.2 | A03 | Launch |
| CAT-SVC-012 | Category (family), service (customer task) and provider skill are separate; service content is configurable without a mobile release. | Schema test: provider skills are a separate mapping; renaming a service in admin changes its en/ur name in both apps after refresh without a new build. | BP §37, §64 | A03 | Launch |

## 3. Configurable rules (CFG-RULE) — one per BP §42 item

Common acceptance for every row: the value is read from config; an admin change is audited (actor, before, after, time) and takes effect without a deploy; the CI hard-coded-value guard (IMPL §7.4) finds no literal for it in code.

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| CFG-RULE-001 | Service category activation is configurable per city. | Activation/deactivation of a family for a city in A23 is audited and changes the customer catalog without a deploy. | BP §42, §64 | A03 | Launch |
| CFG-RULE-002 | Minimum/maximum price thresholds are configurable where applicable. | A quote/fare total outside a configured threshold is refused; while the threshold is `null`, no limit is applied. | BP §42 | A03 | Launch · TODO(OWNER) |
| CFG-RULE-003 | Commission and fees are configurable. | `commission.rate` seeded `0.30` (D-006) and `commission.base_line_types` seeded `["LABOR"]` (D-015) are read from config; other fees are seeded `null`. | BP §42; D-006, D-015 | A03 | Launch |
| CFG-RULE-004 | Cancellation windows are configurable. | Cancellation logic (BOOK-CANCEL-002) reads the window from config; while `null`, no cancellation fee is applied. | BP §16, §42; D-013 | A03 | Launch · TODO(OWNER) |
| CFG-RULE-005 | Quote expiry is configurable. | Quote validity defaults/limits are read from config; while `null`, the provider must enter a validity on each quote (QUOTE-004). | BP §18, §42; D-013 | A03 | Launch · TODO(OWNER) |
| CFG-RULE-006 | Provider service radius/area limits are configurable. | A provider radius above the configured maximum is refused; while `null`, any radius inside the active Lahore zone is accepted. | BP §42, §59.1 | A03 | Launch · TODO(OWNER) |
| CFG-RULE-007 | Provider verification requirements are configurable by category. | Required verification items per category come from config (see CAT-SVC-005); changing them does not need a deploy. | BP §22.1, §42 | A03 | Launch · TODO(OWNER) (OQ-015) |
| CFG-RULE-008 | Customer booking limits are configurable. | A customer exceeding the configured number of open requests/bookings is refused with `LIMIT_REACHED`; while `null`, only the abuse rate limits (ABUSE-003) apply. | BP §30, §42 | A03 | Launch · TODO(OWNER) (OQ-017) |
| CFG-RULE-009 | Review eligibility rules are configurable. | The review window after completion is read from config; a review outside the window is refused; while `null`, any Completed booking without a review is eligible. | BP §19, §42 | A03 | Launch · TODO(OWNER) |
| CFG-RULE-010 | Promotion rules are configurable. | Not built at launch: only the config key exists. | BP §14 (A14), §42, §46 | A03 | Not launch |
| CFG-RULE-011 | Notification templates are configurable (en + ur). | Editing a template in A15 changes the next notification text in both languages without a deploy. | BP §24, §42, §78 | A03 / A10 | Launch |
| CFG-RULE-012 | Support categories and SLAs are configurable. | Ticket categories and SLA targets come from config; A12 shows SLA status; while an SLA is `null`, no breach is flagged. | BP §40, §42 | A03 / A10 | Launch · TODO(OWNER) (OQ-018) |

## 4. Identity, access and roles (SEC-AUTH, ADMIN-ROLE, ROLE)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| SEC-AUTH-001 | Customers and providers log in with phone number + OTP through `AuthProvider` / `OtpSender` interfaces (fake sender until D-009). No passwords for customers/providers. | API test: valid OTP → session; schema has no password column for customer/provider users; non-production uses the fake `OtpSender`. | BP §27; D-002, D-009; K-03 | A02 | Launch |
| SEC-AUTH-002 | Sessions expire and can be revoked. | A revoked session gets 401 on its next call; a session older than config `auth.session_ttl` gets 401; the user can sign out other devices (C27/P21). | BP §27, §30 | A02 | Launch · TODO(OWNER) (TTL value) |
| SEC-AUTH-003 | Raw passwords are never stored. | Admin credentials go through a trusted auth mechanism; a DB scan finds no plaintext or reversible password field. | BP §27 | A02 | Launch |
| SEC-AUTH-004 | OTP sending and checking are rate-limited (attempt limit, resend cooldown, per-number and per-device limits). | After the configured wrong-attempt count the code is invalidated (brute-force test); requests above the limit get 429. Values are config, `TODO(OWNER)`. | BP §29, §30; D-002 | A02 | Launch · TODO(OWNER) |
| SEC-AUTH-005 | Admin uses strong authentication with MFA on a separate auth path. | Admin login without the second factor is refused; a customer/provider token gets 401/403 on every admin API. | BP §27, §34; D-002 | A02 / A13 | Launch |
| SEC-AUTH-006 | Blocked accounts cannot sign in or act, but their records are kept. | A blocked user gets `ACCOUNT_BLOCKED` on login and on every protected action; their bookings, payments and audit rows remain readable by authorised admins. | BP §27 | A02 | Launch |
| SEC-AUTH-007 | Account recovery is controlled and protected against abuse. | Recovery requests are rate-limited, every recovery is audited, and recovery cannot unblock a blocked account. | BP §27, §30 | A02 | Launch |
| SEC-AUTH-008 | Account deletion follows a lifecycle: request → hold → anonymise. | After the lifecycle completes, personal fields are anonymised while bookings/payments stay linked to the anonymised user (traceability test). Hold length is config `TODO(OWNER)`. | BP §26, §27; BP §12 C30 | A02 | Launch · TODO(OWNER) |
| ADMIN-ROLE-001 | Super Admin: all configuration and security functions. | Permission-matrix test: Super Admin can manage admin users/roles and security settings; no other sub-role can. | BP §8.4 | A02 / A13 | Launch |
| ADMIN-ROLE-002 | Operations: bookings, providers, customers, service quality. | Matrix test: Operations can act on A03, A07, A08; gets 403 on A13 Fees/commissions. | BP §8.4 | A02 / A13 | Launch |
| ADMIN-ROLE-003 | Support: customer/provider cases; no financial configuration. | Matrix test: Support can act on A12 tickets; gets 403 on A13 Fees/commissions (IMPL T5.1). | BP §8.4 | A02 / A13 | Launch |
| ADMIN-ROLE-004 | Finance: payments, refunds, settlements, reports, commission-payment verification; no user-password/OTP access. | Matrix test: Finance can act on A09, A10 (refunds), A13; gets 403 on any credential/OTP data. | BP §8.4; D-021 | A02 / A13 | Launch |
| ADMIN-ROLE-005 | Content Manager: categories, service text, banners, FAQs. | Matrix test: Content Manager can edit A05/A06 text; gets 403 on A09 Payments. | BP §8.4 | A02 / A13 | Launch |
| ADMIN-ROLE-006 | Risk/Trust: verification, abuse, fraud, moderation (incl. rating warnings and reinstatement). | Matrix test: Risk/Trust can act on A04, A11, A18 and low-rating reinstatement; gets 403 on A13. | BP §8.4; D-014 | A02 / A13 | Launch |
| ADMIN-ROLE-007 | Analyst: read-only reporting and analytics. | Matrix test: every write endpoint returns 403 for Analyst; A16 reports are readable. | BP §8.4 | A02 / A13 | Launch |
| ADMIN-ROLE-008 | Technical Admin: system configuration and diagnostics without unnecessary business-data access. | Matrix test: Technical Admin can open A19 System health; customer phone/address fields are masked for this role. | BP §8.4 | A02 / A13 | Launch |
| ROLE-001 | Customers can do exactly the BP §8.1 actions (browse, request/book, manage addresses/contact, view status, message, pay, cancel within policy, raise support case, review, request deletion). | Permission-matrix test over every customer endpoint: listed actions allowed on own records; other customers' records and provider/admin endpoints → 403. | BP §8.1, §29 | A02 | Launch |
| ROLE-002 | Providers can do exactly the BP §8.2 actions (profile, verification, services/prices/areas, hours/unavailability, receive leads, accept/reject/quote, manage jobs, record start/completion, add approved extras, see earnings, respond to reviews/cases). | Permission-matrix test over every provider endpoint: listed actions allowed on own records only; another provider's booking → 403. | BP §8.2, §29 | A02 | Launch |
| ROLE-003 | Admins can do the BP §8.3 actions, limited by sub-role; suspend/restrict/reinstate always needs a reason and is audited. | API test: suspend/restrict/reinstate without a reason → 422; with a reason → audit row (actor, action, object, before, after). | BP §8.3, §11, §68 | A13 / A02 | Launch |

## 5. Profiles, addresses and favorites (PROF-ADDR, PROF-FAV)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| PROF-ADDR-001 | A customer can save multiple labelled addresses (Home, Work, custom). | API/E2E: create, edit, delete and label several addresses on C23. | BP §21, §57.3 | A02 | Launch |
| PROF-ADDR-002 | A booking stores a snapshot of the address used. | Editing or deleting a saved address does not change any existing booking's address (IMPL T2.5 test). | BP §21, §26 | A02 / A04 | Launch |
| PROF-ADDR-003 | Manual address entry works when location permission is denied. | E2E with location permission denied: customer completes a request using a typed address. | BP §21, §38, §57.1 | A02 / A06 / A11 | Launch |
| PROF-ADDR-004 | A provider sees only the location/customer information needed for the job. | API test: before the provider is chosen/accepted on a booking, provider responses contain area-level location only and no customer phone or exact address; after acceptance the provider receives the booking's address snapshot. | BP §21, §52.2 | A02 / A06 | Launch · INTERP (exact reveal moment, ARCH §12) |
| PROF-FAV-001 | A customer can save a provider as a Favorite and rebook them; "Favorite" (user action) is separate from the "Customer Favorite" badge. | E2E: save/unsave on C11, list on C42, rebook from C42 still runs every hard eligibility rule (incl. LEDGER-NEG-002); Favorite record stores customer, provider, created date, optional notes; no code links Favorite to the badge. | BP §55.2, §66 | A02 / A11 | Launch |

## 6. Location (LOC-GEO)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| LOC-GEO-001 | Location permission is requested only when the user asks for nearby providers or must confirm a service address. | E2E: fresh install → no location prompt until the user taps "Use current location" or starts address confirmation (C39). | BP §57.1, §75 item 93, §81 | A06 / A11 | Launch |
| LOC-GEO-002 | The app suggests the city/area and never silently locks it ("We think you are in Lahore"). | E2E: a GPS fix suggests the city with a visible "change" action; the customer can pick another listed city. | BP §57.1, §57.3 | A06 / A11 | Launch |
| LOC-GEO-003 | The service location can be corrected by map pin, place search, saved address or manual entry, including "service at another location". | E2E: each of the four paths produces a confirmed Location Snapshot that differs from the GPS position. | BP §57.1, §57.3 | A06 / A11 | Launch |
| LOC-GEO-004 | Coordinates are reverse-geocoded to a readable address that the customer confirms; only the needed location detail is stored. | API test: the Location Snapshot stores label, lat/long, accuracy, place reference and `confirmation_status`; matching uses only a `CONFIRMED` snapshot. | BP §57.1, §66 | A06 | Launch |
| LOC-GEO-005 | Distance and ETA come from Google Maps Routes through `GeoService`. | Matching candidates and C35 cards carry distance/ETA computed by `GeoService`. | BP §54.2, §57, §69 | A06 | Launch |
| LOC-GEO-006 | When Maps is unavailable, location still works through manual address and straight-line distance. | Fallback test with Maps disabled: a request is created and matched using a typed address and straight-line distance (IMPL T3.1). | BP §57, §62.3; ARCH §18 | A06 | Launch |
| LOC-GEO-007 | No background location; provider location is used only during an active job/navigation, with a visible indicator. | Manifest guard finds no `ACCESS_BACKGROUND_LOCATION`; provider location is sent only while a booking is En Route / Arrived / In Progress and the indicator is visible (IMPL T4.5). | BP §57.4, §75 item 98, §81 | A06 / A12 | Launch |
| LOC-GEO-008 | Maps keys are restricted, quota-limited and budget-monitored. | Config check: each key is restricted (app signature or server IP) and to the needed APIs; quota and budget alerts exist; no unrestricted key appears in any client bundle. | BP §57, §71, §74 | A06 / A01 | Launch |

## 7. AI intake (REQ-AI)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| REQ-AI-001 | AI detects the customer's intent from everyday English, Urdu or mixed text/transcript. | Golden tests on the Blueprint examples ("Mera AC thanda nahi kar raha", "Kal shaam electrician chahiye", "Mera geyser leak kar raha hai, DHA Phase 4 mein hoon, aaj 7 baje ke baad…") return the expected service family as a candidate. | BP §56.1, §56.2, §56.3, §77.2, §79 | A07 | Launch |
| REQ-AI-002 | AI maps the request to services that are active in the customer's city, with a confidence value. | Every candidate is an active service in the selected city and has `confidence` in [0, 1]. | BP §56.3 | A07 | Launch |
| REQ-AI-003 | AI asks one or two clarifying questions only when critical information is missing. | Interpret test: at most two clarifying questions per request; none is asked when all required fields are already known. | BP §56.1, §56.3, §79 | A07 | Launch |
| REQ-AI-004 | AI turns time and place words into hints ("aaj shaam", "kal subah", "7 baje ke baad", area names) that the customer confirms. | Golden tests produce the expected time windows/area hints; hints are shown as editable suggestions, never applied silently. | BP §56.1, §56.3, §79 | A07 | Launch |
| REQ-AI-005 | AI writes a short supplier-ready summary in the app language; only the customer submits the request. | C34 shows the summary and the interpreted service, both editable; the request moves to `Submitted` only through an explicit customer confirm call (AI endpoints can only write drafts). | BP §56.1, §56.3, §67, §78.3; ARCH §6.2 | A07 / A11 | Launch |
| REQ-AI-006 | Low-confidence results fall back to a question or the normal form. | `confidence` below config `ai.confidence_threshold` → question or normal form; while the threshold is `null`, every request goes through C34 with the service editable (no shortcut). | BP §67; D-010 | A07 | Launch · TODO(OWNER) |
| REQ-AI-007 | AI output is validated against the catalog through a closed schema. | Unknown fields are dropped; a `serviceId` not in the catalog is discarded (anti-hallucination test). | BP §67; ARCH §10.4 | A07 | Launch |
| REQ-AI-008 | Each important AI decision is logged with model/service version. | Every AI Interaction row stores request/session, model/service version, input class, output summary, safety/approval state, latency and errors; visible in A26. | BP §66, §67 | A07 | Launch |
| REQ-AI-009 | Uploaded text, images and chat are moderated before they reach the other party. | Content flagged by the moderation step is held and not delivered (test with a fake moderation result). | BP §67 | A07 / A10 | Launch |
| REQ-AI-010 | AI never invents prices, provider credentials or customer details. | The AI output schema has no price, credential or personal-detail fields; prices come only from catalog/quotes (schema test). | BP §56.3, §67 | A07 | Launch |
| REQ-AI-011 | AI never claims a diagnosis it cannot establish. | Output uses "likely service" wording; there is no `diagnosis` field; template review in en and ur. | BP §67 | A07 | Launch |
| REQ-AI-012 | AI failure is never fatal; there is always a non-AI path. | With `IntakeAI` returning errors/timeouts, the customer completes a request through the normal form (E2E). | BP §62.1, §67 | A07 / A11 | Launch |
| REQ-AI-013 | AI can explain an invoice or quote lines and unexpected charges, read-only. | The explanation uses only the stored fare lines; it cannot change, approve or reject any line (API test). | BP §56.3 | A07 | Launch |
| REQ-AI-014 | AI can categorise a support problem and suggest a route; a person confirms. | Triage output sets a suggested category only; the ticket is created only after the user confirms (C28/C29). | BP §56.3, §77.3 | A07 / A10 | Launch |

## 8. Voice assistant (VOICE)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| VOICE-001 | Voice uses push-to-talk / explicit start-stop; no always-listening wake word. | The microphone opens only after a tap on C38; no background audio capture exists (code + manifest review). | BP §74, §77.4 | A11 / A07 | Launch |
| VOICE-002 | A visible listening state is shown while the microphone is on. | UI test: listening indicator visible for the whole capture. | BP §77.4 | A11 | Launch |
| VOICE-003 | Recognised text is shown before an important command is applied. | E2E: a navigation/search/draft command displays the recognised text before acting. | BP §77.4 | A11 / A07 | Launch |
| VOICE-004 | The user can say "undo" / "cancel that" during the interaction. | E2E: "cancel that" reverts the last applied voice change to the draft. | BP §77.4 | A07 / A11 | Launch |
| VOICE-005 | Every voice function has a text fallback; recognition failure returns the user to the same task. | With `SpeechToText` failing, the user stays on the same screen with a text input and keeps the draft. | BP §62.1, §77.4 | A11 / A07 | Launch |
| VOICE-006 | Voice supports English and Urdu (and natural mixing where recognition supports it), shows the detected/selected language, and follows the app language by default. | E2E in `en` and `ur`: the language chip shows the active language; summaries appear in the app language. | BP §77.1, §78.3 | A07 / A11 | Launch |
| VOICE-007 | The assistant asks for confirmation before placing a booking, accepting a quote, paying, cancelling or submitting a consequential complaint. | E2E: each of the five actions started by voice shows a confirm step; without confirmation nothing is sent (IMPL T3.11). | BP §77.3; ARCH §10.3 | A11 / A07 | Launch |
| VOICE-008 | The assistant performs only the BP §77.3 actions and only non-sensitive preferences. | Intent-parser test: anything outside the allowed list (navigate, search, draft create/edit, location suggest/confirm, non-sensitive preferences, read summaries, explain badges/fees/statuses, open support and summarise) is answered as "not supported". | BP §77.2, §77.3 | A07 | Launch |

## 9. Media (MEDIA)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| MEDIA-001 | Customer audio note up to about 2 minutes, with elapsed time, remaining time, pause/stop, replay, delete and re-record. | Recorder UI test shows all six controls; recording stops at config `media.audio.max_seconds` (Blueprint target ≈ 2 min; exact value D-011). | BP §76.1, §84 item 111 | A11 / A08 | Launch · TODO(OWNER) |
| MEDIA-002 | Customer problem video up to about 30 seconds at 720p-class by default, with pause/delete/re-record. | Recorder test: default capture profile is 720p-class; capture stops at config `media.video.max_seconds` (Blueprint target ≈ 30 s; exact value D-011). | BP §76.2, §84 item 111 | A11 / A08 | Launch · TODO(OWNER) |
| MEDIA-003 | Audio, video and photos are compressed on the device before upload; video shows an estimated file size. | Device test: uploaded audio is mono speech-quality; uploaded photos are resized previews; the video screen shows estimated size before upload. | BP §76.1, §76.2, §76.3 | A11 / A08 | Launch |
| MEDIA-004 | The server enforces both a maximum size and a maximum duration. | API test: an over-long or over-size upload is rejected at finalize; limits come from config (D-011); while a limit is `null`, uploads are rejected with `LIMIT_NOT_CONFIGURED` outside dev. | BP §76.1, §76.2, §84 item 112; K-11 | A08 | Launch · TODO(OWNER) |
| MEDIA-005 | A thumbnail is generated for each video. | Finalize test: a video MediaObject gets a thumbnail reference shown on P25. | BP §76.2 | A08 | Launch |
| MEDIA-006 | A transcript can be created through the `SpeechToText` interface (fake until D-009). | An audio upload creates a transcript job; the transcript is stored and linked; transcript failure leaves the audio usable. | BP §76.1, §77.1; D-009 | A08 | Launch |
| MEDIA-007 | Original audio and full-resolution images are not kept forever. | Each MediaObject has `retention_until` from config; the retention job deletes expired originals; while the period is `null`, the job only reports (dry run). | BP §76.1, §76.3; D-011 | A08 | Launch · TODO(OWNER) |
| MEDIA-008 | Photos, videos and documents are picked with system pickers, not broad storage/media permissions. | Manifest guard finds no broad storage/media permission; E2E uses the Android photo/document picker. | BP §74, §75 item 97, §76.3 | A11 / A12 / A08 | Launch |
| MEDIA-009 | An upload failure never loses the draft request; retry is offered. | E2E: kill the network during upload → the draft and other inputs remain; retry succeeds later. | BP §76.2, §84 item 112 | A11 / A08 | Launch |

## 10. Matching (MATCH)

Common rule for all MATCH rows: every Match Candidate stores its eligibility result, distance/ETA, availability result, reasons and `ranking_version` (BP §66). Weights, set sizes and caps live in config and are shown in A21; values are `TODO(OWNER)` (D-010).

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| MATCH-ELIG-073 | Supplier account is active and not suspended (includes the low-rating block). | Test: a suspended or `LOW_RATING`-blocked provider who passes every other rule is absent from candidates; eligibility result names rule 73. | BP §54.1 rule 73; D-014 | A05 | Launch |
| MATCH-ELIG-074 | Supplier has the requested service or a configured equivalent skill. | Test: a provider without the service or an equivalent skill mapping is excluded; one with an equivalent skill is included and marked "related". | BP §54.1 rule 74, §64 | A05 | Launch |
| MATCH-ELIG-075 | Supplier serves the customer's city and allowed zone/radius, using the confirmed service location. | Test: a provider whose radius/zone does not cover the confirmed Location Snapshot is excluded. | BP §54.1 rule 75, §57.1 item 92, §81 | A05 | Launch |
| MATCH-ELIG-076 | Supplier is available for the requested time, or may receive it for later confirmation. | Test: an Offline provider is excluded; a `Scheduled Only` provider is included only for future slots matching their availability. | BP §54.1 rule 76, §59.3 | A05 | Launch |
| MATCH-ELIG-077 | Supplier meets the service's verification requirement. | Test: a provider below the required level (CAT-SVC-005) is excluded. | BP §54.1 rule 77, §22.1 | A05 | Launch |
| MATCH-ELIG-078 | Supplier is not blocked from this customer by an active safety or dispute rule. | Test: an active customer–provider block excludes that provider for that customer only. | BP §54.1 rule 78, §30 | A05 | Launch |
| MATCH-ELIG-079 | Supplier is under the active-job capacity limit when capacity rules are enabled. | Test: with capacity enabled and the limit reached, the provider is excluded (and shows Busy, AVAIL-006); with capacity disabled, the rule passes. | BP §54.1 rule 79, §59.1 | A05 | Launch |
| MATCH-SCORE-001 | Score signal: geographic closeness / estimated travel time. | Raising only this weight in A21 reorders candidates by ETA without a deploy. | BP §54.2 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-002 | Score signal: current availability and ability to arrive within the requested window. | Unit test: a provider who can arrive in the window scores higher on this signal than one who cannot. | BP §54.2 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-003 | Score signal: exact service match vs related service match. | Unit test: exact match scores higher than related match on this signal. | BP §54.2 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-004 | Score signal: customer-selected preferences (time, price range, badges, verified only). | Unit test: a candidate meeting a selected preference scores higher; "only verified" preference filters non-verified providers. | BP §54.2, §77.2 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-005 | Score signal: verified provider status and verified skill/category. | Unit test: higher verification level scores higher on this signal. | BP §54.2, §22 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-006 | Score signal: rating quality and volume, never rating alone. | Unit test: rating signal combines average and count (a 5.0 from 1 rating does not beat 4.8 from 240 on this signal); rating is never the only non-zero weight allowed in A21. | BP §54.2 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-007 | Score signal: completed jobs relevant to the requested service. | Unit test: completed jobs in the same service count; other services do not. | BP §54.2 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-008 | Score signal: response speed and acceptance/quote response behaviour. | Unit test: faster median response scores higher on this signal. | BP §54.2, §22.2 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-009 | Score signal: cancellation/no-show history, carefully interpreted. | Unit test: provider cancellations and provider no-shows lower this signal; customer-caused cancellations do not. | BP §54.2, §22.2, §16 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-010 | Score signal: repeat-customer rate / customer-favorite signal only where statistically meaningful. | Unit test: the signal is zero below config minimum sample size; while that minimum is `null`, the signal is off. | BP §54.2 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-011 | Score signal: price competitiveness within the same service model. | Unit test: prices are compared only among candidates with the same price model. | BP §54.2 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-012 | Score signal: provider reliability and marketplace policy compliance. | Unit test: active policy warnings (e.g. rating warning) lower this signal. | BP §54.2, §68 | A05 | Launch · TODO(OWNER) |
| MATCH-SCORE-013 | Score signal: new-provider fairness boost (see MATCH-FAIR-001). | Unit test: a newly approved provider gets the configured boost for the configured period; the boost never lifts an ineligible provider. | BP §54.2 | A05 | Launch · TODO(OWNER) |
| MATCH-FAIR-001 | New good providers get exposure without unfairly displacing relevant high performers. | Simulation test: with the rule on, a new eligible provider appears in the shown set at the configured rate; top relevant providers stay in the set. | BP §52.3, §54.2 | A05 | Launch · TODO(OWNER) |
| MATCH-FAIR-002 | A few providers cannot monopolise requests when other qualified suppliers exist. | Simulation test: with the cap set, no provider exceeds the configured share of shown slots over the window; while the cap is `null`, the rule is off and A25 reports concentration. | BP §52.3, §68 | A05 | Launch · TODO(OWNER) |
| MATCH-FAIR-003 | Paid or promoted placement can never defeat relevance, safety or eligibility. | Code-path test: no ranking input runs before the hard filters; promoted placement is not built at launch. | BP §68, §41 | A05 | Launch |
| MATCH-FAIR-004 | Manual overrides of ranking, suspension or dispute outcomes are audited. | Every override writes an audit row (actor, reason, before, after); an override without a reason is refused. | BP §68 | A05 / A13 | Launch |
| MATCH-EXPL-001 | Shown suppliers carry simple "Why am I seeing this?" reasons. | Each shown candidate has at least one reason built from real data ("2.1 km away", "Available at your requested time", "Verified electrician", "4.8 from 240 completed jobs"), translated en/ur. | BP §54.3 | A05 / A11 | Launch |
| MATCH-MODE-001 | The customer chooses the supplier or offer; nothing is auto-assigned. | Code-path test: no endpoint or job creates an Accepted booking for a provider without a customer choice action (IMPL T3.7). | BP §46, §53; D-005 | A05 / A04 / A11 | Launch |
| MATCH-GAP-001 | When no supplier matches, the app explains why and offers next actions: broaden radius, another time, request a callback, join a waitlist, or a related service. | Test: zero candidates → request status `NoSupply` and C40 shows the configured options; each option leads to a defined action (OQ-021). Not an empty screen. | BP §61.3 | A05 / A11 | Launch · INTERP (OQ-021) |
| PROV-CREW-001 | Crew size (number of workers who will come) is required on every offer/quote. | API test: an offer/quote without `crew_size ≥ 1` is rejected (IMPL T3.5). | D-004; BP §18, §58 | A04 | Launch |
| PROV-CREW-002 | Crew size is copied to the booking, or entered when accepting an instant/choose-supplier booking. | API test: accepted booking has `crew_size` from the quote, or Accept without crew size is rejected for instant bookings. | D-004 | A04 / A12 | Launch |
| PROV-CREW-003 | The customer sees "N workers will come" before choosing and on booking screens. | UI test: C35, C36, C14, C15, C17 show crew size in en and ur. | D-004; BP §55.1 | A11 | Launch |
| PROV-CREW-004 | A crew-size change after acceptance needs customer-visible approval. | API test: changing crew size on an Accepted booking creates an approval request; the old value stays until the customer approves. | D-004; BP §18 (scope change) | A04 | Launch |
| PROV-CREW-005 | Crew size never changes the price; price depends on the nature of the work. | Grep/unit test: no pricing, commission or fare code reads `crew_size`; same quote with crew 1 or 5 gives the same total. | D-018; BP §4.1, §58.1 | A04 / A09 | Launch |
| PROV-CREW-006 | Only the team leader (provider account holder) is verified; no team-member accounts at launch. | Schema/API test: no team-member user/verification entity exists; the booking shows the verified team leader as responsible. | D-018; BP §22 | A05 / A02 | Launch |

## 11. Low-rating enforcement (RATING-ENF)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| RATING-ENF-001 | Every completed job can be rated by the customer. | E2E: after `Completed`, the customer can rate once on C21; the rating is linked to that booking. | D-014; BP §19 | A10 / A05 | Launch |
| RATING-ENF-002 | Only eligible ratings count; ratings removed in moderation do not. | Unit test: a moderated-out rating is excluded from the provider's average used for enforcement. | D-014; BP §19 | A05 | Launch |
| RATING-ENF-003 | An average rating below 2.0 starts the warning process (threshold from config). | Unit test with config `rating.block_threshold = 2.0`: average 1.99 triggers; exactly 2.0 does not (IMPL T7.6). | D-014, D-017 | A05 | Launch |
| RATING-ENF-004 | The provider gets warning 1, then warning 2 before a block; the count comes from config seeded 2; going back above the threshold resets warnings. | Unit test: below threshold → warning 1 → (still below after review period) → warning 2; recovery to ≥ threshold resets to good standing. | D-014, D-017 | A05 | Launch · INTERP (reset rule, OQ-013) |
| RATING-ENF-005 | After the last warning, if still below threshold, the account is blocked with reason `LOW_RATING` and removed from matching. | Unit test: block written with reason, audited; the provider fails MATCH-ELIG-073. | D-014; BP §54.1 rule 73 | A05 | Launch |
| RATING-ENF-006 | Admin (Operations or Risk/Trust) can reinstate a blocked provider with a reason; audited. | API test: reinstate without reason → 422; with reason → audit row and provider eligible again. | D-014; BP §8.3 | A13 / A05 | Launch |
| RATING-ENF-007 | Warning and block notifications reach the provider in en/ur and the Risk/Trust queue. | Event test: `provider.rating_warning` and `provider.blocked_low_rating` produce provider notifications and admin queue items. | D-014; ARCH §7 | A10 | Launch |
| RATING-ENF-008 | Enforcement runs in dry-run mode until the remaining D-017 numbers are set. | Test: while `rating.min_reviews_for_enforcement` or `rating.review_period_days` is `null`, the job only logs what it would do and blocks nobody. | D-017 | A05 | Launch · TODO(OWNER) (OQ-013) |

## 12. Availability and trust (AVAIL, TRUST-VER, TRUST-BADGE)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| AVAIL-001 | Provider sets weekly working hours by day. | API test: hours per weekday saved; matching treats times outside hours as unavailable. | BP §59.1 | A05 | Launch |
| AVAIL-002 | Provider sets break periods. | Unit test: a requested time inside a break is unavailable. | BP §59.1 | A05 | Launch |
| AVAIL-003 | Provider overrides specific dates: open, closed, limited, fully booked, special hours. | Unit test: each of the five override types changes availability for that date only (P23). | BP §59.2 | A05 / A12 | Launch |
| AVAIL-004 | Provider can mark emergency availability. | Unit test: emergency requests match only providers with emergency availability and a service with `emergency_allowed`. | BP §59.1, §59.3 | A05 | Launch |
| AVAIL-005 | Provider sets service radius and/or zones (inside active zones). | API test: radius/zone saved on P07 and used by MATCH-ELIG-075. | BP §59.1, §22, §10 | A05 / A12 | Launch |
| AVAIL-006 | Provider can set maximum active jobs; reaching it sets Busy. | Unit test: at the limit the status becomes Busy and MATCH-ELIG-079 excludes the provider. | BP §59.1, §59.3 | A05 | Launch |
| AVAIL-007 | Provider has one live status: Online/Available, Busy, Offline, Scheduled Only, Emergency Available. | Unit test per status: matching behaviour follows the BP §59.3 meaning; status switch on P22. | BP §59.3 | A05 / A12 | Launch |
| TRUST-VER-001 | Level Basic: contact verified, profile created; not eligible for normal jobs. | Test: a Basic provider never appears in matching for normal jobs. | BP §22.1 | A05 | Launch |
| TRUST-VER-002 | Level Verified: identity/contact and minimum marketplace checks completed by Risk/Trust; can receive normal jobs. Requirements are proportional to the category's risk. | Test: Risk/Trust approval in A04 (with reason, audited) moves the provider to Verified; required items come from config per category (OQ-015). | BP §22.1, §42 | A05 / A13 | Launch · TODO(OWNER) (OQ-015) |
| TRUST-VER-003 | Level Business Verified: business identity and additional checks for company/team listings. | Test: only Risk/Trust can set this level; it is shown on the provider profile. | BP §22.1 | A05 / A13 | Launch · TODO(OWNER) (OQ-015) |
| TRUST-VER-004 | Level Specialized Verified for selected higher-risk categories later. | Enum value reserved; no flow built. | BP §22.1 ("later") | A05 | Not launch |
| TRUST-BADGE-001 | Badge "Verified". | Shown only when verification level ≥ Verified; traceable to that rule. | BP §55.2 | A05 | Launch |
| TRUST-BADGE-002 | Badge "Highly Rated". | Awarded only by its configured rule; while the rule is `null`, nobody gets it. Badge record stores rule, effective date, recalculation status, source metrics. | BP §55.2, §66; D-010 | A05 | Launch · TODO(OWNER) |
| TRUST-BADGE-003 | Badge "Experienced". | Same rule-based test as TRUST-BADGE-002. | BP §55.2; D-010 | A05 | Launch · TODO(OWNER) |
| TRUST-BADGE-004 | Badge "Customer Favorite" (platform badge, not the user's Favorite). | Same rule-based test; computing it never reads the Favorite table alone as the rule. | BP §55.2; D-010 | A05 | Launch · TODO(OWNER) |
| TRUST-BADGE-005 | Badge "Fast Response". | Same rule-based test. | BP §55.2; D-010 | A05 | Launch · TODO(OWNER) |
| TRUST-BADGE-006 | Badge "Fast Service / frequently completes jobs within expected time". | Same rule-based test. | BP §55.2; D-010 | A05 | Launch · TODO(OWNER) |
| TRUST-BADGE-007 | Badge "Reliable / low cancellation rate". | Same rule-based test. | BP §55.2; D-010 | A05 | Launch · TODO(OWNER) |
| TRUST-BADGE-008 | Badge "Repeat Customer Favorite". | Same rule-based test. | BP §55.2; D-010 | A05 | Launch · TODO(OWNER) |
| TRUST-BADGE-009 | Badge "Top Specialist for this service". | Same rule-based test, computed per service. | BP §55.2; D-010 | A05 | Launch · TODO(OWNER) |
| TRUST-BADGE-010 | Badge "Recently Joined / New Provider". | Awarded for the configured period after approval; while `null`, nobody gets it. | BP §55.2; D-010 | A05 | Launch · TODO(OWNER) |
| TRUST-BADGE-011 | Badge "Emergency Available". | Shown only while the provider has emergency availability (AVAIL-004). | BP §55.2, §59 | A05 | Launch |
| TRUST-BADGE-012 | Badge "Available Today". | Shown only when availability has an open slot today. | BP §55.2, §59 | A05 | Launch |
| TRUST-BADGE-013 | Badge "Available Now". | Shown only while status is Online/Available and under capacity. | BP §55.2, §59.3 | A05 | Launch |
| TRUST-BADGE-014 | Badge "Large Team / Company Provider". | Same rule-based test (rule may use usual team size and Business Verified level); while `null`, nobody gets it. | BP §55.2; D-004, D-010 | A05 | Launch · TODO(OWNER) |

## 13. Booking state machine (BOOK-STATUS)

Common acceptance for BOOK-STATUS-001…015: from the named state the server allows **only** the listed targets; every other target returns 409 `TRANSITION_NOT_ALLOWED`; each allowed transition writes one Job Event (actor, from, to, time, reason). The generated transition-table test (IMPL §7.4) covers every pair.

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| BOOK-STATUS-001 | Draft: customer has not submitted. | Allowed → Requested (or → Quote Pending, see 003). "Abandoned" is not a status: an old Draft is removed by a cleanup job. | BP §15; K-05 | A04 | Launch · INTERP (OQ-009) |
| BOOK-STATUS-002 | Requested: customer submitted. | Allowed → Accepted, Rejected, Expired, Cancelled (and → Quote Pending when the provider chooses to quote, see 003). | BP §15 | A04 | Launch |
| BOOK-STATUS-003 | Quote Pending: provider must price or inspect. | Entered from Draft (submit on a quote-required/inspection service) or Requested (provider chooses Quote); allowed → Quoted, Rejected, Expired, Cancelled. | BP §15, §4.1, §18; K-16 | A04 | Launch · INTERP (OQ-014) |
| BOOK-STATUS-004 | Quoted: a quote waits for the customer. | Allowed → Accepted, Expired; customer "Decline" is stored as `Quote.customer_response = DECLINED` and the booking goes to Cancelled (reason `QUOTE_DECLINED`) unless other offers are still open. | BP §15, §53; K-05 | A04 | Launch · INTERP (OQ-009) |
| BOOK-STATUS-005 | Accepted: provider accepted the booking/quote. | Allowed → Scheduled, Cancelled. | BP §15 | A04 | Launch |
| BOOK-STATUS-006 | Scheduled: appointment set. | Allowed → Provider En Route, Cancelled, No-show; → En Route is refused with `UNPAID_COMMISSION` while the provider balance is below the limit (LEDGER-NEG-005). | BP §15; D-021 | A04 | Launch |
| BOOK-STATUS-007 | Provider En Route: provider travelling. | Allowed → Arrived, Cancelled, No-show. | BP §15 | A04 | Launch |
| BOOK-STATUS-008 | Arrived: provider at the location. | Allowed → In Progress, Cancelled; → In Progress is refused with `UNPAID_COMMISSION` while the balance is below the limit. | BP §15; D-021 | A04 | Launch |
| BOOK-STATUS-009 | In Progress: work being done. | Allowed → Awaiting Approval, Completed, Disputed. | BP §15 | A04 | Launch |
| BOOK-STATUS-010 | Awaiting Approval: customer or extra-charge approval needed. | Allowed → In Progress, Completed, Disputed; entered automatically when a fare line is Proposed during work (FARE-012). | BP §15, §58.2 | A04 | Launch |
| BOOK-STATUS-011 | Completed: work finished and recorded. | Allowed → Disputed (and → Closed by the lifecycle job); "Reviewed" is a flag `review_submitted_at`, not a status; payment can start only here (PAY-TIMING-001). | BP §15; K-05; D-003 | A04 | Launch · INTERP (OQ-009) |
| BOOK-STATUS-012 | Disputed: issue raised. | Allowed → Closed, or → In Progress for Rework; the outcome (Resolved / Refunded / Rework) is stored on the Dispute record. | BP §15; K-05 | A04 / A10 | Launch · INTERP (OQ-009) |
| BOOK-STATUS-013 | Cancelled: ended before completion. | Allowed → Closed only; cancel reason and party recorded. | BP §15, §16 | A04 | Launch |
| BOOK-STATUS-014 | Expired: required action not taken in time. | Allowed → Closed only; expiry times come from config (D-013); while `null`, nothing expires automatically. | BP §15; D-013 | A04 | Launch · TODO(OWNER) |
| BOOK-STATUS-015 | Closed: lifecycle complete. | No transition out of Closed. | BP §15 | A04 | Launch |
| BOOK-STATUS-016 | The server is the only source of status; clients only request transitions and render server-given actions. | API test: a client payload containing `status` is ignored/refused; booking responses include `allowedNextActions`; apps show only those buttons (IMPL T3.10). | BP §15.1, §29 | A04 / A11 / A12 | Launch |
| BOOK-STATUS-017 | "Rejected" and "No-show" are terminal statuses; No-show records the party (CUSTOMER or PROVIDER). | Allowed → Closed only; a No-show without party is refused. | BP §15, §16; K-05 | A04 | Launch · INTERP (OQ-009) |

## 14. Cancellation and no-show (BOOK-CANCEL) — one per BP §16 row

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| BOOK-CANCEL-001 | Customer cancels before provider acceptance: normally no fee. | API test: cancel from Requested/Quote Pending/Quoted → Cancelled with fee 0. | BP §16 | A04 | Launch |
| BOOK-CANCEL-002 | Customer cancels after acceptance but before the agreed window: policy-dependent fee, shown before confirmation. | The fee and window come from config (D-013) and are shown on C14 before confirm; while `null`, the fee is 0. How a fee is collected when the job never reaches Completed is open (K-17). | BP §16, §42; D-003, D-013; K-17 | A04 / A09 | Launch · TODO(OWNER) (OQ-019) |
| BOOK-CANCEL-003 | Provider cancels: the customer gets a clear replacement/refund path; provider reliability is affected. | Test: provider cancel → customer sees re-match/other offers and refund path (if anything was paid); the cancellation counts in MATCH-SCORE-009. | BP §16 | A04 / A05 | Launch |
| BOOK-CANCEL-004 | Provider no-show: customer can report; a support case opens and policy action can follow. | Test: customer report → No-show (party PROVIDER) + support ticket; counts in reliability. | BP §16 | A04 / A10 | Launch |
| BOOK-CANCEL-005 | Customer no-show: provider can report after a controlled wait period; any fee must be disclosed in policy. | Test: report before the configured wait period is refused; after it → No-show (party CUSTOMER). While the wait period is `null`, the report goes to support for manual review. Fee: same as BOOK-CANCEL-002. | BP §16; D-013; K-17 | A04 | Launch · TODO(OWNER) (OQ-019) |
| BOOK-CANCEL-006 | Emergency/unsafe situation: either side can stop the job and escalate to support. | Test: "Stop – safety" from Arrived → Cancelled, from In Progress → Disputed; both create a safety-flagged support ticket. | BP §16, §40 | A04 / A10 | Launch · INTERP (target state) |

## 15. Pricing (PRICE) — one per BP §17 rule

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| PRICE-001 | Fixed price: total known before booking, except clearly defined optional extras. | C14 shows the full total before confirm; any later line must be a defined optional extra approved by the customer. | BP §17, §4.1 | A04 | Launch |
| PRICE-002 | From price: shown as a starting price; provider can quote the actual price after review. | C10 shows "from Rs. X"; the payable amount comes only from an accepted quote. | BP §17 | A04 | Launch |
| PRICE-003 | Inspection fee is clearly separated from the final service price, and says whether it is deductible. | Quote/bill show the inspection line separately with a deductible yes/no flag. | BP §17, §58.1 | A04 | Launch |
| PRICE-004 | Call-out/travel fee is displayed before confirmation if it applies. | C14 shows the visit/travel line before confirm; a visit fee cannot be added after confirm without approval. | BP §17, §58.1 | A04 | Launch |
| PRICE-005 | Materials are classified as included, excluded or customer-approved extra. | Every materials line carries one of the three classes; extras need approval (FARE-012). | BP §17, §58.1 | A04 | Launch |
| PRICE-006 | Tax, platform fee and commission: each party sees the amount relevant to them. | Customer bill shows tax/platform-fee lines if any; provider views show commission and own share (COMM-004). | BP §17; D-006 | A04 / A09 | Launch |
| PRICE-007 | No hidden fees after confirmation, except a documented exception or a customer-approved extra. | Test: the payable total equals approved lines only; an unapproved new line is never payable. | BP §17, §58.2 | A04 / A09 | Launch |

## 16. Quotes (QUOTE) — BP §18 steps 55–62 + multi-supplier offers

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| QUOTE-001 | The customer submits the issue/request to get a quote. | E2E: a confirmed request for a quote service creates quote requests to the providers the customer chose/invited. | BP §18 | A04 | Launch |
| QUOTE-002 | The provider receives enough information to decide whether to quote or inspect, without unnecessary private customer data. | P09 shows summary, media, service, area and time window; no customer phone/exact address pre-match (PROF-ADDR-004). | BP §18, §52.2, §85 | A04 / A12 | Launch |
| QUOTE-003 | The provider creates a quote with line items or a simple total. | API test: both forms accepted; line types are only those in FARE-001…011. | BP §18, §58.1 | A04 | Launch |
| QUOTE-004 | Each quote has a validity time/date; an expired quote cannot be accepted. | API test: quote without validity is rejected; accepting after validity → 409 `QUOTE_EXPIRED`. Default/max validity from config (D-013). | BP §18; D-013 | A04 | Launch |
| QUOTE-005 | The customer sees inclusions, exclusions and expected duration. | C13/C36 render all three from the quote. | BP §18 | A04 / A11 | Launch |
| QUOTE-006 | The customer can accept, decline or ask for clarification. | E2E: all three actions; clarification opens a message thread on the booking. | BP §18 | A04 / A11 | Launch |
| QUOTE-007 | The accepted quote becomes the commercial basis for the job. | API test: the booking's lines are copied from the accepted quote and cannot be edited directly afterwards. | BP §18 | A04 | Launch |
| QUOTE-008 | After acceptance, any change that affects price or scope needs customer-visible approval. | API test: a changed/added line becomes Proposed and needs approval (FARE-012); scope changes include crew size (PROV-CREW-004). | BP §18, §58.2 | A04 | Launch |
| QUOTE-009 | Customer can request offers from several eligible suppliers, compare them and select one. | E2E: invite several providers; C36 compares structured lines and crew size; selecting one closes the other open offers. | BP §53, §55.1; D-005 | A04 / A11 | Launch |

## 17. Fare lines (FARE) — one per BP §58.1 line type + states

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| FARE-001 | Line type Visit / Call-out fee: shown before approval where applicable. | The line is visible on C14/C13 before the customer confirms. | BP §58.1 | A04 | Launch |
| FARE-002 | Line type Inspection / Diagnosis fee: shown separately, stating whether deductible from the final repair. | Line has `deductible` true/false shown to the customer. | BP §58.1 | A04 | Launch |
| FARE-003 | Line type Labor / Service fee: shown with quantity/unit where practical; the only commissionable type. | Line carries quantity and unit; commission engine reads only this type (COMM-003). | BP §58.1; D-015 | A04 | Launch |
| FARE-004 | Line type Tools / Equipment usage: must have a reason; never hidden. | API test: line without a reason is rejected. | BP §58.1 | A04 | Launch |
| FARE-005 | Line type Consumables: listed separately or grouped per policy. | Line is shown individually or in one group line per the service's policy. | BP §58.1 | A04 | Launch |
| FARE-006 | Line type Parts / New materials: customer approval required when additional to the approved estimate. | Test: a parts line added after acceptance stays Proposed until approved. | BP §58.1, §58.2 | A04 | Launch |
| FARE-007 | Line type Emergency / After-hours fee: disclosed before acceptance when reasonably possible. | Allowed only on services with `emergency_allowed`; shown before accept. | BP §58.1; CAT-SVC-004 | A04 | Launch |
| FARE-008 | Line type Travel / Distance surcharge: rule-based and visible. | Line can only be created from a configured rule (outside normal area); while the rule is `null`, the type is disabled. | BP §58.1 | A04 | Launch · TODO(OWNER) |
| FARE-009 | Line type Platform fee: Kaam Karo fee if charged to the customer, displayed separately. | While config `fees.customer_platform_fee` is `null`, no platform-fee line is created. | BP §58.1, §41 | A04 / A09 | Launch · TODO(OWNER) (OQ-020) |
| FARE-010 | Line type Tax: from configured rules, displayed separately. | While tax rules are `null`, no tax line is created. | BP §58.1 | A04 / A09 | Launch · TODO(OWNER) (OQ-020) |
| FARE-011 | Line type Discount / Coupon: displayed separately. | Negotiated discount line allowed; coupons are not built (promotions Not launch). Whether a discount reduces labour before commission is open (D-022). | BP §58.1, §46; D-022 | A04 / A09 | Launch · TODO(OWNER) |
| FARE-012 | Each line has a state: Proposed → Approved or Rejected; approved lines become Final; an unapproved line is never payable. | Test: a Proposed line is excluded from the payable total; only the customer can approve/reject (C37); provider cannot convert it (IMPL T3.5). | BP §52.1, §58.2 | A04 | Launch |
| FARE-013 | Emergency exception for charges is narrowly defined, logged and communicated; disabled until rules exist. | Feature flag `fare.emergency_exception_enabled = false`; with the flag off no line skips approval. | BP §58.3; K-10 | A04 | Launch · TODO(OWNER) |

## 18. Payments, commission and provider ledger (PAY, COMM, LEDGER)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| PAY-001 | Payments support cash and digital; digital goes through a `PaymentGateway` interface with a fake until D-008. | API test: a Completed booking can be settled as CASH or via the fake gateway; no real vendor code exists. | BP §49, §69; D-008 | A09 | Launch |
| PAY-002 | Payment initiation is idempotent. | Double tap / same idempotency key → exactly one payment (IMPL T6.1). | BP §31.1, §31.2 | A09 | Launch |
| PAY-003 | Payment records are immutable. | DB grant test: the app role cannot UPDATE/DELETE payment rows. | BP §26 | A09 | Launch |
| PAY-004 | Corrections are reversal/adjustment rows. | Test: a correction creates a new row linked to the original; balances reconcile. | BP §26 | A09 | Launch |
| PAY-005 | A reconciliation job compares gateway records with internal records and flags mismatches. | Test with fake gateway data: a mismatch appears in A09 exceptions. | BP §30, §31.2 | A09 | Launch |
| PAY-006 | Refunds are reversal rows linked to payment, booking and (if any) dispute. | Test: refund from a dispute outcome creates a linked reversal; original payment row unchanged. | BP §26, §40 | A09 | Launch |
| PAY-007 | Settlements pay out a positive provider balance through a `PayoutProvider` interface (fake) or manual Finance settlement with audit. | Test: settlement reduces available balance by a ledger row; manual settlement needs Finance role and writes audit. | BP §13 P15/P16, §33; D-008 | A09 | Launch |
| PAY-008 | No raw card data is handled by Kaam Karo. | Schema/code review: no card number/CVV fields; card entry only inside the gateway's hosted flow. | BP §29 | A09 | Launch |
| PAY-009 | The customer gets receipts and transaction history. | After a successful payment, C24 lists the receipt and a receipt notification is sent (NOTIF-006). | BP §12 C24, §23, §24 | A09 / A11 | Launch |
| PAY-TIMING-001 | Payment can only start after the booking is `Completed`. | API test: payment initiation before Completed → 409 (IMPL T6.1). | D-003 | A09 / A04 | Launch |
| COMM-001 | Commission rate comes from config `commission.rate`, seeded 0.30. | Grep test: no literal 0.30 outside the config seed; changing config changes the next calculation. | D-006; BP §42 | A09 | Launch |
| COMM-002 | Provider share of commissionable labour = 70% (1 − rate); platform + provider shares add up exactly to the commissionable amount. | Unit test: no paisa lost to rounding; rounding rule documented in the handoff. | D-006 | A09 | Launch |
| COMM-003 | Commission base = Labor / Service fee lines only (config `commission.base_line_types = ["LABOR"]`). | ARCH §6.8 worked example as a test: labour 2,000 + parts 1,500 + visit 300 → commission 600, provider share 3,200. Visit/inspection/emergency excluded (interpretation, OQ-011). | D-015; BP §58.1 | A09 | Launch · INTERP (OQ-011) |
| COMM-004 | Each party sees the amounts relevant to them. | Provider sees commission and own share per booking in P15; customer sees the bill lines only; Finance sees all in A09. | BP §17; D-006 | A09 / A11 / A12 | Launch |
| LEDGER-001 | At billing the provider records how the bill was paid: CASH or DIGITAL. | E2E: P14/P15 "How was it paid?" is required to close billing. | D-016 | A09 / A12 | Launch |
| LEDGER-002 | CASH can be recorded only when no confirmed digital payment exists; payment is recorded once. | API test: recording CASH on a digitally paid booking → 409; a second record → 409. | D-016 | A09 | Launch |
| LEDGER-003 | Cash job → debit the provider account with commission on labour. | Worked example → debit Rs. 600 (IMPL T6.6). | D-016, D-015 | A09 | Launch |
| LEDGER-004 | Digital job → credit the provider account with bill − commission. | Worked example → credit Rs. 3,200. | D-016 | A09 | Launch |
| LEDGER-005 | Ledger rows are append-only; corrections are reversal rows. | DB grant test: no UPDATE/DELETE on ledger rows. | BP §26; D-016 | A09 | Launch |
| LEDGER-006 | Balance and full history are visible to the provider (P15) and Finance (A09); the customer completion screen shows "Paid by" as recorded. | UI/API test: every debit/credit listed; negative balance shown; C20 shows Cash/Digital. | BP §13 P15; D-016; ARCH §6.8 | A09 / A12 / A13 / A11 | Launch · INTERP ("Paid by" on C20, D-022) |
| LEDGER-007 | A positive balance is paid out through Settlement. | Test: a positive available balance can be settled (PAY-007); a negative balance cannot. | BP §13 P15; D-016 | A09 | Launch |
| LEDGER-NEG-001 | While the balance is below config `ledger.max_negative_balance` (seeded 0), the provider is excluded from matching. | Test: after a cash job with Rs. 600 owed, the provider is absent from candidates (IMPL T6.7). | D-020; ARCH §6.8, §9 | A05 / A09 | Launch |
| LEDGER-NEG-002 | While below the limit, the provider cannot accept, quote or be rebooked from Favorites. | API test: accept/quote → 409 `UNPAID_COMMISSION`; rebook from C42 refused; same through the voice path. | D-020 | A04 / A09 | Launch |
| LEDGER-NEG-003 | The Partner App shows the amount owed and a "Pay company" action. | UI test: P15 shows owed amount and the action while balance < 0. | D-020, D-021 | A12 | Launch |
| LEDGER-NEG-004 | Eligibility returns automatically when the balance is ≥ 0; this block is not a suspension. | Test: after a Finance-approved Rs. 600 credit, the provider appears in matching again; earnings, support, profile and existing chats work during the block. | D-020 | A09 / A05 | Launch |
| LEDGER-NEG-005 | While below the limit, already-accepted jobs cannot start. | API test: Scheduled → En Route and Arrived → In Progress return 409 `UNPAID_COMMISSION`; P12 shows "Pay Rs. X to start this job". | D-021 | A04 / A09 / A12 | Launch |
| LEDGER-NEG-006 | If commission is still unpaid at appointment time, after a grace time the booking is treated as a provider cancellation. | Test: after `ledger.unpaid_start_grace_minutes` the booking follows BOOK-CANCEL-003; while `null`, the booking is flagged to Operations instead. | D-021, D-022; BP §16 | A04 / A09 | Launch · INTERP + TODO(OWNER) (OQ-007) |
| LEDGER-PAY-001 | "Pay company" shows the amount owed and the company's account details from config (set by Finance). | UI test: details come from config; editing them is Finance-only and audited. | D-021 | A12 / A09 | Launch |
| LEDGER-PAY-002 | The provider pays from any bank or mobile wallet, then submits the transaction ID and an optional screenshot (system photo picker). | API test: submission without transaction ID → 422; screenshot via picker only. | D-021; BP §75 item 97 | A12 / A09 | Launch |
| LEDGER-PAY-003 | Submissions go to a Finance verification queue in A09. | Test: each submission appears in the A09 queue with amount, ID and screenshot. | D-021 | A13 / A09 | Launch |
| LEDGER-PAY-004 | Finance approves or rejects with a reason; audited. | API test: reject without reason → 422; both actions write audit rows. Verification time limit is open (D-022). | D-021, D-022 | A09 / A13 | Launch |
| LEDGER-PAY-005 | Approval writes a credit ledger row. | Test: approval of Rs. 600 creates one credit row of Rs. 600. | D-021; BP §26 | A09 | Launch |
| LEDGER-PAY-006 | Only Finance-approved or gateway-confirmed credits clear the block; the provider's claim never does. | Test: a submitted-but-unverified payment does not unblock (IMPL T6.7). | D-021 | A09 | Launch |
| LEDGER-PAY-007 | Events `provider.commission_payment_submitted`, `…_rejected` and `provider.balance_cleared` are emitted. | Event test: each step emits its event to the outbox. | D-021; ARCH §7 | A09 / A10 | Launch |

## 19. Reviews (REV) — one per BP §19 rule

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| REV-001 | A review is a 1–5 rating plus optional structured tags, only for a completed/eligible job. | API test: rating outside 1–5 → 422; review on a non-Completed booking → 409; one review per booking. | BP §19; D-014 | A10 | Launch |
| REV-002 | Written review text is optional. | API test: rating without text is accepted. | BP §19 | A10 | Launch |
| REV-003 | Provider can respond under controlled rules. | API test: a provider can respond only to reviews of their own bookings; responses go through moderation (REV-005). | BP §19 | A10 | Launch |
| REV-004 | Reviews can be flagged/reported. | API test: customer or provider can flag a review; it enters the moderation queue. | BP §19 | A10 | Launch |
| REV-005 | A moderation queue handles abusive, private or illegal content. | A11 shows flagged items; a moderator can hide with a reason (audited); hidden reviews leave the public average and RATING-ENF. | BP §19, §11 | A10 / A13 | Launch |
| REV-006 | The public rating uses one clear, consistent rule. | The same function computes the rating for C11, matching and enforcement (unit test on shared function). | BP §19 | A10 / A05 | Launch |
| REV-007 | Providers cannot buy or manufacture ratings. | No API creates a review except the booking's own customer after Completed; providers cannot edit/delete ratings (permission test). | BP §19, §30 | A10 | Launch |

## 20. Chat, contact and sharing (CHAT, SHARE)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| CHAT-001 | In-app chat is bound to a booking's participants and is the primary auditable channel. | API test: only the booking's customer, provider and authorised admins can read/write the conversation. | BP §20, §74 | A10 | Launch |
| CHAT-002 | Calls use a masked/relay `CallRelay` interface (fake until D-009); personal numbers are not exposed. | Test: no raw phone number in any chat/call payload (IMPL T7.2). | BP §20; D-009 | A10 | Launch |
| CHAT-003 | Attachments are size-limited, type-limited and scanned/validated. | API test: wrong type or oversize attachment rejected; scan status recorded; limits from config (D-011). | BP §20 | A10 / A08 | Launch · TODO(OWNER) |
| CHAT-004 | Phone and WhatsApp are launched as actions/intents only; the app never reads call logs, contacts or WhatsApp data. | Manifest guard + code review: dialer/ACTION_SEND intents only, no related read permissions. | BP §74, §82 | A11 / A12 / A10 | Launch |
| SHARE-001 | Customer can share a request ("Need help with this"), referral link, or booking/quote summary through WhatsApp/other apps. | E2E: share sheet opens via ACTION_SEND with a summary that contains no phone number or exact address. | BP §82 | A11 / A10 | Launch |
| SHARE-002 | Provider can share a service profile or availability link. | E2E: share sheet opens from P18 with a public profile link. | BP §82 | A12 / A10 | Launch |
| SHARE-003 | Important commercial actions stay inside Kaam Karo. | Code-path test: quote acceptance, booking acceptance, payment, cancellation, dispute and completion have no path through a shared link or external message. | BP §74, §82 | A10 | Launch |

## 21. Notifications (NOTIF)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| NOTIF-001 | Notifications are produced from domain events through the outbox, not coded into screens; one event yields per-role messages. | Test: an event written in the same DB transaction as the state change is delivered once per recipient role after a worker restart. | BP §24, §31.2 | A10 | Launch |
| NOTIF-002 | `request.submitted` and `quote.received` notify customer, provider and admin per the BP tables. | Event test: correct recipients and en/ur templates. | BP §24, §80 | A10 | Launch |
| NOTIF-003 | `booking.accepted` and `booking.reminder` notify customer and provider. | Event test as above; reminder timing from config. | BP §24, §80 | A10 | Launch |
| NOTIF-004 | `provider.en_route` and `job.status_changed` notify customer and provider. | Event test as above. | BP §24, §80 | A10 | Launch |
| NOTIF-005 | `charge.proposed` asks the customer for approval. | Event test: high-priority customer notification opening C37. | BP §58.2 | A10 | Launch |
| NOTIF-006 | `payment.succeeded / failed` and `refund.issued` notify customer, provider and Finance. | Event test as above. | BP §24, §80 | A10 | Launch |
| NOTIF-007 | `message.new` and `dispute.opened / updated` notify the parties and the case queue. | Event test as above. | BP §24, §80 | A10 | Launch |
| NOTIF-008 | Provider account events notify the provider and the admin queue: rating warning/block, commission debited, balance negative, payment submitted/rejected, balance cleared. | Event test for each of the seven ARCH §7 events. | D-014, D-016, D-020, D-021 | A10 | Launch |
| NOTIF-009 | Users control notification categories; messages have critical/non-critical priority; growth does not rely on spammy notifications. | Test: disabling a non-critical category stops it; critical booking/payment messages still arrive; promotion notifications are not built. | BP §36, §74, §80, §84 item 116 | A10 | Launch |
| NOTIF-010 | Notification permission (Android 13+) is asked in context, ideally after a meaningful event such as the first booking. | E2E: no notification prompt at install; prompt appears after the first booking confirmation. | BP §75 item 96, §80 | A11 / A12 | Launch |

## 22. Support and disputes (SUP)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| SUP-001 | Customers and providers can read FAQ (L1 self-help) and create support tickets. | E2E: C28/P20 show FAQ and create a ticket visible in A12. | BP §12 C28, §13 P20, §40 | A10 | Launch |
| SUP-002 | Tickets escalate through L1–L5 (self-help, Support, Operations, Risk/Finance, Executive/incident). | API test: escalation changes level and owning role; each change audited. | BP §40 | A10 | Launch |
| SUP-003 | A dispute is a formal record linked to the booking; outcomes are Resolved, Refunded, Rework or Closed. | Test: opening a dispute moves the booking to Disputed; the outcome is stored on the Dispute (BOOK-STATUS-012). | BP §15, §40; K-05 | A10 / A04 | Launch |
| SUP-004 | A dispute can lead to a refund that is linked to it. | Test: a "Refunded" outcome creates a linked refund reversal by Finance (PAY-006). | BP §11, §40 | A10 / A09 | Launch |
| SUP-005 | C29 is a structured complaint flow (booking, issue type, description, optional evidence). | E2E: complaint submitted with evidence via system picker; voice-started complaints need confirmation (VOICE-007). | BP §12 C29, §77.3 | A10 / A11 | Launch |

## 23. Language and accessibility (I18N, A11Y)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| I18N-001 | Customer and Partner apps work fully in English and Urdu. | Every screen passes the en and ur E2E runs. Admin portal language: OQ-022. | BP §78.1, §86 | A14 | Launch |
| I18N-002 | Language is chosen at onboarding or from the device language, and can be changed any time. | E2E: switch on C41/settings applies immediately without reinstall. | BP §78.1 | A14 / A11 / A12 | Launch |
| I18N-003 | Urdu uses full RTL mirroring: alignment, icons, arrows, control order and sheets. | RTL screenshot checks per screen (checklist IMPL §7.3-E). | BP §78.2 | A14 | Launch |
| I18N-004 | Urdu uses a professional font (Noto Nastaliq Urdu candidate) with generous line height. | T0.6 smoke test passes on the cheapest device: no clipped marks, readable line height. | BP §78.2; D-001 | A14 | Launch |
| I18N-005 | No careless mixing of Urdu and English in one label; customer wording is everyday language; provider technical text may keep common English terms. | String review of the ur catalogue; customer strings avoid trade jargon. | BP §37, §78.2 | A14 | Launch |
| I18N-006 | All user-facing text lives outside code; service names come from the backend. | String-lint CI finds no hard-coded user-facing literal. | BP §37 | A14 | Launch |
| I18N-007 | Money is shown in PKR and dates/times in local conventions. | Formatter unit tests for en and ur. | BP §37 | A14 | Launch |
| I18N-008 | Urdu is tested on small screens and low-cost Android devices. | Device matrix (T0.5) includes a small low-cost phone; Urdu runs pass on it. | BP §78.2 | A14 / A16 | Launch |
| A11Y-001 | Readable text sizes and sufficient contrast. | Contrast check on design tokens; minimum text sizes enforced in the UI kit. | BP §38 | A14 | Launch |
| A11Y-002 | Large tap targets. | UI-kit test: interactive elements meet the kit's minimum target size. | BP §38 | A14 | Launch |
| A11Y-003 | Colour is never the only way to understand status. | Every status chip has text or an icon label (audit). | BP §38 | A14 | Launch |
| A11Y-004 | Icons have labels. | Accessibility scan: every icon button has an accessible label in en/ur. | BP §38 | A14 | Launch |
| A11Y-005 | Error messages say what to do next. | Error-catalogue review: each error string includes a next step. | BP §38, §31.1 | A14 | Launch |
| A11Y-006 | Manual address entry is supported when location permission is denied. | Same test as PROF-ADDR-003. | BP §38, §21 | A14 / A11 | Launch |
| A11Y-007 | Poor network conditions show clear states. | Slow/offline network test: loading, retry and pending states appear; no blank screen. | BP §38, §31.1 | A14 / A11 / A12 | Launch |
| A11Y-008 | The customer journey stays short for common services. | E2E: a common fixed-price service can be booked from Home through C34/C14 without extra mandatory screens (see PERF-002). | BP §38, §62.1 | A14 / A11 | Launch |

## 24. Reliability and performance (REL, PERF)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| REL-001 | Show a useful error message, never a blank screen. | Fault-injection test on every screen: an error state renders. | BP §31.1 | A01 + all | Launch |
| REL-002 | Allow safe retry where the action can be repeated. | Retry button on failed safe actions; retry of an idempotent action returns the original result. | BP §31.1 | A01 + all | Launch |
| REL-003 | Prevent duplicate bookings/payments on repeated taps. | Double-tap test: create booking / initiate payment / accept quote / approve charge → one record. | BP §31.1, §31.2 | A04 / A09 | Launch |
| REL-004 | Save a safe local draft for important forms. | Kill the app during a request → draft restored on reopen. | BP §31.1, §76.2 | A11 / A12 | Launch |
| REL-005 | Never show "success" until the server confirms. | Test with delayed server: UI shows pending until the confirmed response. | BP §31.1 | A11 / A12 / A13 | Launch |
| REL-006 | Network loss during a critical action shows a clear pending/unknown state. | Cut network after sending: UI shows "pending/unknown" and reconciles on reconnect. | BP §31.1 | A11 / A12 | Launch |
| REL-007 | Automatic retries only for safe operations. | Code review + test: non-idempotent calls are never auto-retried. | BP §31.2 | A01 | Launch |
| REL-008 | Idempotency for booking creation, request submission, payment initiation, quote acceptance and charge approval. | Same key twice → one row (IMPL T2.2). | BP §31.2; ARCH §8 | A01 | Launch |
| REL-009 | Queue-based processing for notifications and non-critical background work. | Test: notification sending happens in the worker; an API call does not wait for it. | BP §31.2 | A01 | Launch |
| REL-010 | Database transactions around financially important updates. | Test: a failure mid-way through ledger/payment writes leaves no partial rows. | BP §31.2 | A09 / A01 | Launch |
| REL-011 | Health checks and monitoring. | `/health` reports DB, Redis, queue and storage status; uptime check configured. | BP §31.2, §34 | A01 | Launch |
| REL-012 | Backups with tested restoration. | Restore test in staging documented with timestamp (IMPL T2.7). | BP §31.2, §31.3, §49 | A01 | Launch |
| REL-013 | Critical data is separate from disposable caches. | Flushing Redis loses no business data (test). | BP §31.2 | A01 | Launch |
| REL-014 | Automated database backup at least daily. | Backup schedule shows ≥ 1 automated backup per day in staging/production. | BP §31.3 | A01 | Launch |
| REL-015 | RPO and RTO targets are agreed before launch. | Release gate blocked until D-012 values are recorded and a restore drill meets them. | BP §31.3; D-012 | A01 | Launch · TODO(OWNER) |
| REL-016 | One internal incident owner and a simple customer-facing status process. | Incident owner named in the runbook; drill log exists (IMPL T8.5). | BP §31.3 | A01 | Launch · TODO(OWNER) (owner names the person) |
| PERF-001 | The Home screen is lightweight and usable quickly on normal mobile connections. | With AI, Maps and media services stalled, Home still renders categories and search. | BP §62.1 | A11 | Launch |
| PERF-002 | A service request needs very few steps; no list of mandatory dropdowns before search. | E2E: a request is submitted with only free text/voice + location confirm + time choice (Now/Today/Later). | BP §56.1, §62.1, §79, §85 | A11 / A07 | Launch |
| PERF-003 | Progress states are shown while searching/matching; the app never freezes. | UI test: matching shows a progress state within the first frame after submit. | BP §62.1 | A11 | Launch |
| PERF-004 | AI interactions feel immediate (streaming/partial UI where supported, honest loading text where not). | UI test: an AI call shows partial output or a loading message, never a frozen screen. | BP §62.1 | A11 / A07 | Launch |
| PERF-005 | Heavy images and map content load progressively. | Slow-network test: text content shows before images/maps finish. | BP §62.1 | A11 / A12 | Launch |
| PERF-006 | No single AI call, map request, image operation, notification or third-party service can freeze the app: each has timeout, retry, failure state and fallback. | Fault-injection test per integration (AI, Maps, STT, push, media). | BP §62.3; ARCH §8 | A01 + all | Launch |
| PERF-007 | Performance budgets exist for AI, map, media and notification operations and are measured on a low-end device. | Budgets recorded (D-012) and measured in T8.3. | BP §84 item 120; D-012 | A01 / A16 | Launch · TODO(OWNER) |

## 25. Screens and provider speed (UX-SCREEN, UX-PROV, PLAT)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| PLAT-001 | Two separate mobile apps (Customer, Partner) and one web Admin Portal share one backend; no app keeps its own copy of marketplace truth. | Architecture test: all three surfaces read/write through the same API; no business record is stored only on a device. | BP §60, §60.1, §60.2, §84 item 108; D-001 | A00 / A01 | Launch |
| UX-SCREEN-001 | The Customer App provides screens C01–C30 (BP §12) plus derived C31–C42. | T1.1 screen spec lists each screen with fields and states; E2E reaches each screen. | BP §12, §55, §56, §57, §61.3, §76, §77, §78; K-06 | A11 | Launch |
| UX-SCREEN-002 | The Partner App provides screens P01–P21 (BP §13) plus derived P22–P26. | T1.2 screen spec lists each screen; E2E reaches each screen. | BP §13, §18, §58, §59, §74, §76; K-06 | A12 | Launch |
| UX-SCREEN-003 | Every screen implements loading, empty, success, error and pending/unknown states. | Screen-spec checklist and UI tests per screen. | BP §45, §31.1 | A11 / A12 / A13 | Launch |
| UX-SCREEN-004 | Login (C03) and Register (C04) use phone number + OTP only; no password field; email is optional profile data. | UI test: no password field anywhere in the apps; email field optional or absent (OQ-012). | BP §12; D-002; K-03 | A11 / A12 / A02 | Launch · INTERP (OQ-012) |
| UX-SCREEN-005 | A guest can browse the public catalog; an account is needed to submit a request. | E2E: guest browses C06–C11; submit asks to log in. | BP §8.1, §12 C02; K-09 | A11 / A02 | Launch · INTERP (OQ-008) |
| UX-PROV-001 | A new request is understandable at a glance: short summary, location/area, media/voice note, commercial model, availability window. | P08/P09 show all five items without scrolling to another screen. | BP §62.2, §85 | A12 | Launch |
| UX-PROV-002 | Accept / Decline / Quote / Ask a question take one or two clear actions. | E2E tap count ≤ 2 for each action from the request card (IMPL T4.3). | BP §62.2, §85 | A12 | Launch |
| UX-PROV-003 | The provider sees job location (area) and key pricing information before committing. | P09 shows area/distance and price model/estimate before Accept/Quote. | BP §62.2 | A12 | Launch |
| UX-PROV-004 | Navigation starts without unnecessary screens. | From P12 one action hands off to the chosen navigation app. | BP §62.2, §81 | A12 / A06 | Launch |
| UX-PROV-005 | Job completion is simple enough to finish in the field. | E2E: mark complete + evidence (P14, P26) in one flow on a small device. | BP §62.2, §10 | A12 | Launch |

## 26. Security, permissions and abuse (SEC-BASE, PERM, ABUSE)

Detailed controls: `docs/security/permission-policy.md` (T0.4).

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| SEC-BASE-001 | Encrypted network communication for all app/API traffic. | HTTP is refused; release builds disallow cleartext traffic. | BP §29, §34 | A15 / A01 | Launch |
| SEC-BASE-002 | Secure authentication and session storage. | Tokens stored only in secure device storage; review by A15. | BP §29 | A15 / A02 | Launch |
| SEC-BASE-003 | Server-side authorization for every protected action (deny by default). | Permission-matrix tests cover every endpoint; an endpoint without a guard fails CI. | BP §29 | A15 + all | Launch |
| SEC-BASE-004 | Least privilege for admin and provider roles. | ADMIN-ROLE and ROLE matrix tests pass. | BP §29 | A15 / A02 | Launch |
| SEC-BASE-005 | All inputs validated on the server. | Contract validation rejects invalid payloads with 422 for every endpoint. | BP §29 | A15 + all | Launch |
| SEC-BASE-006 | Login, OTP, messaging and other abuse-prone endpoints are rate-limited. | Load test: limits return 429; values from config (`TODO(OWNER)`). | BP §29, §30 | A15 / A02 / A10 | Launch · TODO(OWNER) |
| SEC-BASE-007 | Prices, permissions and booking status sent by the app are never trusted. | API test: client-sent amount/role/status/verified fields are ignored or refused (IMPL §7.3-A). | BP §29, §15.1 | A15 + all | Launch |
| SEC-BASE-008 | Secrets in a secret manager; no private API keys in the apps or in git. | Secret scanner in CI; bundle scan finds no private keys or AI prompts. | BP §29, §34, §43 rule 69, §67 | A15 / A01 | Launch |
| SEC-BASE-009 | Payment data protected through the chosen payment provider; no raw card data. | Same as PAY-008. | BP §29 | A15 / A09 | Launch |
| SEC-BASE-010 | Audit logs for important admin and financial actions. | Every admin write and financial action creates an audit row (sampling test across modules). | BP §29, §26 | A15 / A01 | Launch |
| SEC-BASE-011 | Development, testing/staging and production are separated. | Separate databases, keys and storage per environment (config review). | BP §29, §34 | A15 / A01 | Launch |
| SEC-BASE-012 | A documented backup and recovery plan exists. | Runbook in `docs/` reviewed by A15; matches REL-012/014. | BP §29, §31.3 | A15 / A01 | Launch |
| PERM-001 | Ask for location when the user asks for nearby providers or must confirm the service address. | Same as LOC-GEO-001. | BP §75 item 93 | A15 / A11 / A12 | Launch |
| PERM-002 | Ask for camera only when the user chooses to take a photo/video. | E2E: camera prompt only after tapping a camera action. | BP §75 item 94 | A15 / A11 / A12 | Launch |
| PERM-003 | Ask for microphone only when the user starts an audio note or the voice assistant. | E2E: microphone prompt only after tapping record or C38. | BP §75 item 95; K-01 | A15 / A11 | Launch |
| PERM-004 | Ask for notifications when they become useful, ideally after a meaningful event such as a booking. | Same as NOTIF-010. | BP §75 item 96 | A15 / A11 / A12 | Launch |
| PERM-005 | Use system pickers for photos, videos and documents instead of broad library/storage permissions. | Same as MEDIA-008. | BP §75 item 97 | A15 / A11 / A12 | Launch |
| PERM-006 | Never request contacts, Bluetooth, calendar, call logs or background location "because they may be useful someday". | CI forbidden-permission guard on the merged release manifest (IMPL §7.4). | BP §75 item 98, §74 | A15 / A01 | Launch |
| ABUSE-001 | Fake provider: verification, moderation, review history, complaints. | A15 checks each control exists (TRUST-VER, REV-005, SUP) with a test. | BP §30 | A15 + owners | Launch |
| ABUSE-002 | Fake customer: phone verification, rate limits, abuse monitoring. | OTP required to submit; rate-limit tests; abuse signals visible in A18. | BP §30; D-002 | A15 + owners | Launch |
| ABUSE-003 | Spam requests: request limits and behaviour rules. | Test: request rate limit and CFG-RULE-008 enforced. | BP §30, §68 | A15 + owners | Launch · TODO(OWNER) (OQ-017) |
| ABUSE-004 | Fake review: review tied to a completed job. | Same as REV-007. | BP §30, §19 | A15 / A10 | Launch |
| ABUSE-005 | Price manipulation: server-side quote and approval states; audit history. | Same as FARE-012 + SEC-BASE-007; audit on every quote/fare change. | BP §30 | A15 / A04 | Launch |
| ABUSE-006 | Off-platform leakage: controlled contact, terms and reporting, without over-restricting legitimate communication. | CHAT-002 masking + report action in chat; no blanket blocking of normal messages. | BP §30, §20 | A15 / A10 | Launch |
| ABUSE-007 | Payment fraud: payment-provider checks, reconciliation, risk flags; false CASH records and fake "Pay company" claims. | PAY-005 reconciliation + LEDGER-002 + LEDGER-PAY-006 tests; risk flags in A18. | BP §30; D-016, D-021 | A15 / A09 | Launch |
| ABUSE-008 | Harassment: block/report tools, moderation and support escalation. | E2E: block/report from chat and booking; block feeds MATCH-ELIG-078. | BP §30 | A15 / A10 | Launch |
| ABUSE-009 | Account takeover: strong authentication, suspicious-login detection, session revocation. | OTP limits (SEC-AUTH-004), new-device login visible to user, sessions revocable (SEC-AUTH-002). | BP §30 | A15 / A02 | Launch |
| ABUSE-010 | Admin abuse: role separation, logs, limited permissions, review of sensitive changes. | ADMIN-ROLE tests + audit on every admin write; sensitive config changes listed in A17 audit view. | BP §30 | A15 / A13 | Launch |

## 27. Data, infrastructure and vendors (DATA, INFRA, EXT)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| DATA-001 | All BP §25 entities and BP §66 records exist, designed around business objects, not screens. | Schema v1 has every entity; every table/column carries a comment citing its BP § (IMPL T2.3). Promotion table not built (Not launch). | BP §25, §66 | A01 + owners | Launch |
| DATA-002 | Every state/action change is recorded as a Marketplace Event / Job Event (actor, action, object, time, previous and new state, source metadata where needed). | Test: each booking transition and each admin override writes an event row. | BP §15, §66 | A01 / A04 | Launch |
| DATA-003 | Transaction records stay traceable after a user deletes their profile. | Same test as SEC-AUTH-008. | BP §26 | A01 / A02 | Launch |
| DATA-004 | Audit logs are append-only. | DB grant test: no UPDATE/DELETE on audit rows (IMPL T2.2). | BP §26 | A01 | Launch |
| INFRA-001 | Backend is one modular monolith in one primary region; modules never read each other's tables. | Lint/architecture test fails on cross-module table access. | BP §32, §69; D-001 | A01 | Launch |
| INFRA-002 | API → database over a private network path; private components not exposed to the internet. | Infra review: DB and Redis have no public endpoint. | BP §34 | A01 | Launch |
| INFRA-003 | File storage is private by default with signed, time-limited access. | Test: an object URL without a signature is refused. | BP §34 | A01 / A08 | Launch |
| INFRA-004 | Managed domain with secure DNS configuration. | Infra review checklist passes. | BP §34 | A01 | Launch |
| INFRA-005 | Centralised monitoring of errors, latency, uptime and important business failures (e.g. payment stuck, no-match spike). | Sentry + alerts configured; a simulated payment-stuck event raises an alert. | BP §34, §31.2; D-001 | A01 | Launch |
| EXT-001 | Every external vendor except Google Maps Platform sits behind an interface with a fake until the owner decides; vendor choices are documented (country availability, fees, limits, certifications, data residency, support, exit). | Code review: interfaces `OtpSender`, `PaymentGateway`, `PayoutProvider`, `IntakeAI`, `SpeechToText`, `CallRelay`, `MailSender`, `PushSender`, `ObjectStore`, `AnalyticsSink` with fakes; no vendor SDK without a DECISIONS entry. | BP §33, §69; D-008, D-009 | A01 + owners | Launch |

## 28. Admin portal (OPS-ADMIN) — one per screen A01–A26

Common acceptance: the screen exists in the Admin Portal; access follows the per-screen sub-role matrix from T1.3 (BP §8.4 as base); every write is audited with actor and reason.

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| OPS-ADMIN-001 | A01 Admin login: protected staff authentication. | Same as SEC-AUTH-005. | BP §14, §11 | A13 / A02 | Launch |
| OPS-ADMIN-002 | A02 Dashboard: marketplace health snapshot and operational alerts. | Shows alerts and key health metrics for the current day. | BP §14, §11, §39 | A13 | Launch |
| OPS-ADMIN-003 | A03 Users: customer/provider search and controls (suspend, restrict, reinstate). | Search by phone/name/ID; controls follow ROLE-003. | BP §14, §8.3 | A13 | Launch |
| OPS-ADMIN-004 | A04 Provider verification: queue, review and decisions. | Approve/reject with reason; queue sorted by age (TRUST-VER-002). | BP §14, §11, §39 | A13 | Launch |
| OPS-ADMIN-005 | A05 Categories: manage the hierarchy. | Edit names/order/activation inside the §63 tree; no new top-level family (SCOPE-CAT-001). | BP §14, §64 | A13 | Launch |
| OPS-ADMIN-006 | A06 Services: manage the service catalog configuration. | Edit every CAT-SVC field. | BP §14, §64 | A13 | Launch |
| OPS-ADMIN-007 | A07 Bookings: search/filter/inspect jobs, including unassigned/rejected/expired. | Filters by status, city, category, date; full Job Event history visible. | BP §14, §39 | A13 | Launch |
| OPS-ADMIN-008 | A08 Quotes: review quote exceptions. | Lists expired, disputed and changed-after-acceptance quotes. | BP §14 | A13 | Launch |
| OPS-ADMIN-009 | A09 Payments: transaction exceptions and status, provider ledger, commission-payment verification queue. | Shows reconciliation mismatches (PAY-005), ledger (LEDGER-006) and the D-021 queue (LEDGER-PAY-003). | BP §14; D-016, D-021 | A13 / A09 | Launch |
| OPS-ADMIN-010 | A10 Refunds/disputes: case workflow. | Dispute outcome + refund link (SUP-003/004). | BP §14, §40 | A13 / A10 | Launch |
| OPS-ADMIN-011 | A11 Reviews/moderation: content controls. | Same as REV-005. | BP §14, §19 | A13 / A10 | Launch |
| OPS-ADMIN-012 | A12 Support: ticket queue and SLA. | Queue with level and SLA status (SUP-002, CFG-RULE-012). | BP §14, §40 | A13 / A10 | Launch |
| OPS-ADMIN-013 | A13 Fees/commissions: controlled financial configuration. | Finance/Super Admin only; shows `commission.rate` 0.30 and base types; edits audited. | BP §14; D-006, D-015 | A13 / A09 | Launch |
| OPS-ADMIN-014 | A14 Promotions: coupons/campaigns. | Not built. | BP §14 ("later") | A13 | Not launch |
| OPS-ADMIN-015 | A15 Notifications: templates (campaigns not at launch). | Template editor en/ur (CFG-RULE-011); no campaign sending. | BP §14, §24 | A13 / A10 | Launch |
| OPS-ADMIN-016 | A16 Reports: operational, financial and marketplace reports. | Reports for ANALYTICS groups; Analyst read-only. | BP §14, §35, §39 | A13 | Launch |
| OPS-ADMIN-017 | A17 Audit logs: who changed what and when. | Search audit rows by actor, object, date; read-only. | BP §14, §26 | A13 / A01 | Launch |
| OPS-ADMIN-018 | A18 Risk/fraud: suspicious accounts and behaviour. | Lists risk flags from ABUSE controls with actions. | BP §14, §30 | A13 | Launch |
| OPS-ADMIN-019 | A19 System health: errors, uptime, queues and integrations. | Shows REL-011 health and queue depth; integration status per interface. | BP §14, §11 | A13 / A01 | Launch |
| OPS-ADMIN-020 | A20 Settings: platform configuration. | Generic ConfigRule editor with audit (CFG-RULE-*). | BP §14, §42 | A13 / A03 | Launch |
| OPS-ADMIN-021 | A21 Matching weights and fairness configuration. | Editing weights changes ranking without deploy; new `ranking_version` recorded. | BP §54.2; K-06 | A13 / A05 | Launch |
| OPS-ADMIN-022 | A22 Badge rules configuration. | Each badge rule editable; changes recalculated and audited. | BP §55.2, §66 | A13 / A05 | Launch |
| OPS-ADMIN-023 | A23 City and service-zone activation (listed vs active). | Same as SCOPE-CAT-002 / CFG-RULE-001. | BP §57.2, §64 | A13 / A03 | Launch |
| OPS-ADMIN-024 | A24 Per-service AI guidance and customer questions. | Same as CAT-SVC-006/007. | BP §64 | A13 / A03 | Launch |
| OPS-ADMIN-025 | A25 Marketplace health (customer side + supplier side). | Shows HEALTH-001…020 by city, category and period. | BP §61 | A13 / A05 | Launch |
| OPS-ADMIN-026 | A26 AI interaction viewer (what AI suggested vs what was confirmed). | Shows REQ-AI-008 records next to the confirmed request. | BP §66, §67 | A13 / A07 | Launch |

## 29. Marketplace health (HEALTH) — one per BP §61 metric

Common acceptance: the metric is computed from recorded events per city, category and period and shown on A25.

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| HEALTH-001 | Customer: request-to-match success rate. | Metric test on seeded events. | BP §61.1 | A05 / A13 | Launch |
| HEALTH-002 | Customer: time until first suitable supplier is found. | Metric test. | BP §61.1 | A05 / A13 | Launch |
| HEALTH-003 | Customer: quote/accept response rate. | Metric test. | BP §61.1 | A05 / A13 | Launch |
| HEALTH-004 | Customer: booking completion rate. | Metric test. | BP §61.1 | A05 / A13 | Launch |
| HEALTH-005 | Customer: cancellation rate and reason. | Metric test grouped by reason. | BP §61.1 | A05 / A13 | Launch |
| HEALTH-006 | Customer: successful completion rate. | Metric test (completed without dispute). | BP §61.1 | A05 / A13 | Launch |
| HEALTH-007 | Customer: repeat usage. | Metric test. | BP §61.1 | A05 / A13 | Launch |
| HEALTH-008 | Customer: favorite/rebook behaviour. | Metric test. | BP §61.1 | A05 / A13 | Launch |
| HEALTH-009 | Customer: support and dispute rate. | Metric test. | BP §61.1 | A05 / A13 | Launch |
| HEALTH-010 | Customer: rating and review quality. | Metric test. | BP §61.1 | A05 / A13 | Launch |
| HEALTH-011 | Supplier: relevant request volume. | Metric test. | BP §61.2 | A05 / A13 | Launch |
| HEALTH-012 | Supplier: response time. | Metric test. | BP §61.2 | A05 / A13 | Launch |
| HEALTH-013 | Supplier: acceptance/quote rate. | Metric test. | BP §61.2 | A05 / A13 | Launch |
| HEALTH-014 | Supplier: job completion rate. | Metric test. | BP §61.2 | A05 / A13 | Launch |
| HEALTH-015 | Supplier: earnings and successful settlement. | Metric test from ledger/settlement rows. | BP §61.2 | A05 / A13 / A09 | Launch |
| HEALTH-016 | Supplier: cancellation/no-show rate. | Metric test. | BP §61.2 | A05 / A13 | Launch |
| HEALTH-017 | Supplier: repeat-customer rate. | Metric test. | BP §61.2 | A05 / A13 | Launch |
| HEALTH-018 | Supplier: profile completeness. | Metric test. | BP §61.2 | A05 / A13 | Launch |
| HEALTH-019 | Supplier: time spent available without receiving relevant jobs. | Metric test from availability status + match events. | BP §61.2 | A05 / A13 | Launch |
| HEALTH-020 | Supplier: customer feedback. | Metric test. | BP §61.2 | A05 / A13 | Launch |

## 30. Analytics (ANALYTICS) — one per BP §35 group

Common acceptance: events go through `AnalyticsSink` (local event table fake, ARCH §18); the group's example metrics can be computed by a report query on A16.

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| ANALYTICS-001 | Acquisition: install → first open → signup. | Funnel query returns counts for each step. | BP §35 | A01 / A13 | Launch |
| ANALYTICS-002 | Activation: first search, first service view, first request. | Query returns each first-time event per user. | BP §35 | A01 / A13 | Launch |
| ANALYTICS-003 | Marketplace: requests, acceptance rate, time-to-accept, completion rate. | Query test. | BP §35 | A01 / A13 | Launch |
| ANALYTICS-004 | Customer: repeat booking rate, cancellation rate, support rate. | Query test. | BP §35 | A01 / A13 | Launch |
| ANALYTICS-005 | Provider: activation, response rate, acceptance rate, utilisation, earnings. | Query test. | BP §35 | A01 / A13 | Launch |
| ANALYTICS-006 | Financial: value of jobs, platform revenue, refunds, failed payments. | Query test against ledger/payment rows. | BP §35 | A01 / A13 / A09 | Launch |
| ANALYTICS-007 | Quality: rating, repeat-provider rate, complaints, rework. | Query test. | BP §35 | A01 / A13 | Launch |
| ANALYTICS-008 | Reliability: crash rate, API error rate, latency, notification delivery. | Query/dashboard test from Sentry + logs + delivery events. | BP §35 | A01 / A13 | Launch |

## 31. End-to-end journeys (JOURNEY)

| ID | Requirement | Acceptance criterion | Source | Owner | Status |
|---|---|---|---|---|---|
| JOURNEY-001 | Customer journey BP §9 steps 11–26 works end to end. | E2E passes in en and ur on the device matrix (IMPL T3.12, T4.7). | BP §9, §49 | A16 | Launch |
| JOURNEY-002 | Provider journey BP §10 steps 27–42 works end to end. | E2E passes in en and ur on the device matrix (IMPL T4.7). | BP §10, §49 | A16 | Launch |
| JOURNEY-003 | Admin journey BP §11 steps 43–54 works without direct database edits (promotions excluded). | Playwright E2E passes for every step except "controlled promotions". | BP §11, §44, §49 | A16 | Launch |

---

## 32. Blueprint coverage matrix (§1–§87)

T0.2 acceptance: every Blueprint section maps to at least one requirement ID or is marked **informational** (no buildable behaviour of its own: vision, process, references, or a list that is already covered elsewhere).

| BP § | Title | Requirement IDs | Note |
|---|---|---|---|
| §1 | Product definition | PLAT-001, ROLE-001…003, SCOPE-GEO-002, SCOPE-CAT-001 | §1.5 long-term verticals: informational |
| §2 | What the prototype contributes | — | **Informational** (visual reference only; K-07) |
| §3 | Product principles | PRICE-*, CFG-RULE-*, PERM-*, REL-* | Principles realised through these IDs; otherwise informational |
| §4 | Service marketplace model | CAT-SVC-001…011, PRICE-001…003 | |
| §5 | Launch service catalog (old) | SCOPE-CAT-001 | Superseded by §63 (K-04) |
| §6 | Recommended launch boundary | SCOPE-CAT-002, SCOPE-GEO-002 | §6.2 pilot area overridden by D-019 (K-14) |
| §7 | Personas | — | **Informational** |
| §8 | Role and access framework | ROLE-001…003, ADMIN-ROLE-001…008, UX-SCREEN-005 | |
| §9 | Customer journey | JOURNEY-001 | |
| §10 | Provider journey | JOURNEY-002, UX-PROV-005 | |
| §11 | Admin journey | JOURNEY-003, OPS-ADMIN-* | |
| §12 | Screen inventory – customer | UX-SCREEN-001, -003, -004, -005, PAY-009, SUP-001, SUP-005 | |
| §13 | Screen inventory – provider | UX-SCREEN-002, LEDGER-006, PAY-007 | |
| §14 | Screen inventory – admin | OPS-ADMIN-001…020 | A14 Promotions Not launch |
| §15 | Booking/job state machine | BOOK-STATUS-001…017, DATA-002 | |
| §16 | Cancellation and no-show | BOOK-CANCEL-001…006 | |
| §17 | Pricing rules | PRICE-001…007, COMM-004 | |
| §18 | Quote logic | QUOTE-001…008 | |
| §19 | Reviews and reputation | REV-001…007, RATING-ENF-001…002 | |
| §20 | Chat and contact | CHAT-001…003 | |
| §21 | Addresses and location | PROF-ADDR-001…004 | |
| §22 | Provider onboarding and verification | TRUST-VER-001…004, MATCH-SCORE-005/008/009 | §22.2 quality signals feed MATCH-SCORE |
| §23 | Customer trust features | TRUST-VER-*, CAT-SVC-011, REV-001, BOOK-STATUS-016, PAY-009, SUP-001, SUP-003 | List realised by these IDs |
| §24 | Notifications | NOTIF-001…007 | |
| §25 | Core data model | DATA-001 | |
| §26 | Data ownership rules | DATA-003, DATA-004, PROF-ADDR-002, PAY-003, SEC-AUTH-008 | |
| §27 | Authentication and account policy | SEC-AUTH-001…008 | |
| §28 | Mobile permissions | PERM-001…006 | Microphone row replaced by §74 (K-01) |
| §29 | Security baseline | SEC-BASE-001…012 | |
| §30 | Abuse, fraud and safety | ABUSE-001…010 | |
| §31 | Reliability and data-loss prevention | REL-001…016 | |
| §32 | Scalability approach | INFRA-001 | Growth stages beyond launch: informational |
| §33 | Paid/external services | EXT-001 | |
| §34 | Network and infrastructure | INFRA-002…005, SEC-BASE-001, -011 | |
| §35 | Analytics | ANALYTICS-001…008 | |
| §36 | Growth loop | NOTIF-009 | Otherwise informational |
| §37 | Content and localization | I18N-005…007, CAT-SVC-012 | |
| §38 | Accessibility and usability | A11Y-001…008 | |
| §39 | Admin operating model | OPS-ADMIN-002, -004, -007, -016 | Daily/weekly/monthly routines are an owner SOP: informational |
| §40 | Support and dispute hierarchy | SUP-001…005 | |
| §41 | Financial model options | COMM-001, FARE-009 | Only commission chosen (D-006); other models Later: informational |
| §42 | Configurable product rules | CFG-RULE-001…012 | |
| §43 | AI-assisted build protocol | — | **Informational** (process; enforced by IMPL §0 and CLAUDE.md) |
| §44 | Development phases | JOURNEY-003 | Phase plan itself is informational (IMPL §6) |
| §45 | Definition of Done | UX-SCREEN-003 | Process: IMPL §8 |
| §46 | Open decisions | — | **Informational** (tracked in DECISIONS.md) |
| §47 | Master-document structure | — | **Informational** |
| §48 | Requirement ID convention | — | **Informational** (this file follows it) |
| §49 | Minimum launch checklist | JOURNEY-001…003, REL-012, PAY-001 | Business items are owner tasks (IMPL §6 Phase 9) |
| §50 | Final product statement | — | **Informational** |
| §51 | What comes next | — | **Informational** |
| §52 | Core marketplace concept | MATCH-*, QUOTE-002, FARE-012, MATCH-FAIR-001/002, PROF-ADDR-004 | |
| §53 | Three service commercial models | CAT-SVC-002, QUOTE-009, MATCH-MODE-001 | |
| §54 | Supplier matching engine | MATCH-ELIG-073…079, MATCH-SCORE-001…013, MATCH-EXPL-001 | |
| §55 | Customer discovery and comparison | TRUST-BADGE-001…014, PROF-FAV-001, QUOTE-009, PROV-CREW-003 | |
| §56 | Intelligent customer request | REQ-AI-001…005, -010, -013, -014, PERF-002 | |
| §57 | Google Maps and location | LOC-GEO-001…008, SCOPE-GEO-001 | |
| §58 | Fare and quote breakdown | FARE-001…013 | |
| §59 | Supplier availability and capacity | AVAIL-001…007 | |
| §60 | Two apps + one admin portal | PLAT-001 | |
| §61 | Dual-sided marketplace health | HEALTH-001…020, MATCH-GAP-001, OPS-ADMIN-025 | |
| §62 | Simplicity, speed, intelligence | PERF-001…006, UX-PROV-001…005 | |
| §63 | Expanded service universe | SCOPE-CAT-001, SCOPE-CAT-002 | Seed data (IMPL T2.6) |
| §64 | Service catalog design rules | CAT-SVC-001…012, CFG-RULE-001 | |
| §65 | Future vertical expansion | SCOPE-CAT-001 | Extension point only |
| §66 | Data and record additions | DATA-001, DATA-002, REQ-AI-008 | |
| §67 | AI governance and human control | REQ-AI-005…012 | |
| §68 | Fair two-sided matching | MATCH-FAIR-001…004, ABUSE-003 | |
| §69 | Architecture decision summary | SCOPE-GEO-001, PLAT-001, PAY-001, INFRA-001, EXT-001 | |
| §70 | Master-document implications (v0.3) | — | **Informational** (list of areas, each covered above) |
| §71 | External planning references | LOC-GEO-008 | References: informational |
| §72 | Working rule for future updates | — | **Informational** (status rules; "Not launch" status in this file) |
| §73 | v0.4 interaction and device layer | — | **Informational** (introduction to §74–§87) |
| §74 | Device and platform tools | PERM-*, MEDIA-008, CHAT-004, LOC-GEO-008, VOICE-001 | Contacts picker, calendar, biometrics, Bluetooth: Not launch |
| §75 | Permission and privacy philosophy | PERM-001…006 | |
| §76 | Media notes | MEDIA-001…009 | |
| §77 | AI voice assistant | VOICE-001…008, REQ-AI-001 | |
| §78 | Urdu and English localization | I18N-001…008, VOICE-006 | |
| §79 | "No boredom" request flow | REQ-AI-001…005, PERF-002 | |
| §80 | Notifications and communication intelligence | NOTIF-002…010 | Promotion notifications Not launch |
| §81 | Maps and location behaviour expansion | LOC-GEO-001, -007, UX-PROV-004 | |
| §82 | External communication and WhatsApp | SHARE-001…003, CHAT-004 | WhatsApp Business workflow: Later |
| §83 | Recommended additional features | — | **Informational** — all items Proposed/Later, **Not launch** (BP §86) |
| §84 | v0.4 master-document implications | PLAT-001 (108), PERM-* (109, 118), MEDIA-* (110–112), I18N-* (113), VOICE-* (114), LOC-GEO-* (115), NOTIF-009 (116), CHAT-004 (117), REQ-AI-* (119), PERF-007 (120) | |
| §85 | "Talk, show, tap" principle | PERF-002, UX-PROV-001, UX-PROV-002 | |
| §86 | v0.4 change status | — | **Informational** (defines accepted vs proposed) |
| §87 | External references (v0.4) | — | **Informational** |

## 33. Open items referenced in this file

| Ref | Topic | Where |
|---|---|---|
| OQ-007 / D-022 | Provider account follow-ups (verification time, grace time, discount vs commission, "Paid by" confirmation) | LEDGER-006, LEDGER-NEG-006, LEDGER-PAY-004, FARE-011 |
| OQ-008 / K-09 | Guest browsing | UX-SCREEN-005 |
| OQ-009 / K-05 | Undefined booking states | BOOK-STATUS-001, -004, -011, -012, -017 |
| OQ-010 / K-08 | Price model vs selling model | CAT-SVC-001, -002 |
| OQ-011 | Visit/inspection/emergency fees excluded from commission | COMM-003 |
| OQ-012 | Email at registration | UX-SCREEN-004 |
| OQ-013 / D-017 | Remaining rating numbers | RATING-ENF-004, -008 |
| OQ-014 / K-16 | How a booking enters Quote Pending; inspection-first flow | BOOK-STATUS-003 |
| OQ-015 | Verification items per category | CAT-SVC-005, CFG-RULE-007, TRUST-VER-002/003 |
| OQ-016 | Which service families are active in Lahore on day one | SCOPE-CAT-002 |
| OQ-017 | Customer booking/request limits | CFG-RULE-008, ABUSE-003 |
| OQ-018 | Support categories and SLAs | CFG-RULE-012 |
| OQ-019 / K-17 | Fees for jobs that never reach Completed vs D-003 | BOOK-CANCEL-002, -005 |
| OQ-020 | Customer platform fee and tax lines | FARE-009, FARE-010 |
| OQ-021 | Supply gap: what "callback" and "waitlist" do | MATCH-GAP-001 |
| OQ-022 | Admin portal language | I18N-001 |
| D-008…D-013 | Vendors, weights/thresholds, media limits, RPO/RTO, cancellation windows | many `TODO(OWNER)` rows |

## 34. Counts

v1 (2026-10-22): **417 requirements** in 56 ID groups. 414 are launch scope (of which 18 carry an `INTERP` default to confirm and about 60 carry a `TODO(OWNER)` value); 3 are `Not launch` (CFG-RULE-010, TRUST-VER-004, OPS-ADMIN-014). All 87 Blueprint sections are in the coverage matrix: 73 map to requirement IDs and 14 are informational only.

Count command: `grep -E '^\| [A-Z0-9-]+-[0-9]{3} ' docs/requirements/REQUIREMENTS.md | grep -vc '^| OQ-'`.

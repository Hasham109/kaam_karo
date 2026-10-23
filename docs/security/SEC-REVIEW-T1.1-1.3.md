# SEC-REVIEW T1.1–T1.3 — Customer, Partner and Admin screen specs

Reviewer: A15 · Date: 2026-10-23 · Task owners: A11 (T1.1), A12 (T1.2), A13 (T1.3)
Scope: `docs/screens/customer.md`, `docs/screens/partner.md`, `docs/screens/admin.md`; handoffs `coordination/handoffs/T-1.1.md`, `T-1.2.md`, `T-1.3.md`.
Checked against: `docs/security/permission-policy.md` (T0.4: §2–§9), BP §20, §21, §26–§30, §52.2, §57.4, §74, §75, §81; D-002, D-016, D-020, D-021, D-022; `coordination/OPEN_QUESTIONS.md` (OQ-025, -027, -028, -047, -051, -052, -055, -070).
These are specs, not code. Line numbers refer to the spec files as of this review. No spec file was edited.

## Verdict

**SEC-REVIEW: CHANGES-REQUIRED**

There are 8 S2 findings (1–8). Each one is a spec change or a safer OQ default, so nothing needs a code rollback. Fix them before the matching T3.x/T4.x/T5.x/T6.x build task starts. The S3 findings (9–18) must be closed or turned into tracked OQs before the build task that uses that screen. The S4 findings (19–25) are advisory.

Severity scale (same as SEC-REVIEW-T2.1): S1 = exploitable now, data or money loss · S2 = a stated security control is missing or not effective as specified · S3 = hardening gap with a realistic path to harm later · S4 = defence in depth / hygiene.

## What passes (verified)

| Check | Result | Evidence |
|---|---|---|
| Permission asked only on tap, with pre-prompt and fallback (BP §74, §75 items 93–97; PERM-001…005) | Pass | customer.md §2.5 (l.66–81), C32 l.1407, C33 l.1448, C38 l.1647, C39 l.1691; partner.md G2 (l.70–90), P12 l.622, P26 l.1188 |
| Never-request list: contacts, call logs, calendar, Bluetooth, background location, broad storage (PERM-006) | Pass | customer.md l.81, §5; partner.md G2 l.80; no screen uses them |
| Partner app asks for no microphone at launch (policy §4.1, OQ-024) | Pass | partner.md G2 l.79, P26 l.1203 |
| Notification prompt only after a meaningful event (PERM-004) | Pass | customer.md C15 l.761/773; partner.md P22 l.1041 (OQ-026 default) |
| System photo and document pickers, no storage permission (PERM-005) | Pass | customer.md §2.5; partner.md P03 l.274, P15 l.766 |
| No SMS-read permission; OTP never in drafts or logs | Pass | customer.md C03 l.279, C05 l.352; partner.md G1 l.54, P02 l.235 |
| Clients send only intent; status, price, tax and commission come from the server; buttons come from `allowedNextActions` (BP §15.1, §29; SEC-BASE-007) | Pass | customer.md §2.1; partner.md G5, G6 l.120, P24 l.1121/1134; admin.md §1.2 l.74, A07 l.445 |
| CASH only when no confirmed digital payment, recorded once (KK-T1) | Pass | partner.md P14 l.704, l.725 |
| "Pay company" claim never clears the block; screenshot is Finance-only; duplicate transaction ID flagged (D-021, KK-T2) | Pass | partner.md P15 l.776, l.791; admin.md §1.6 l.99, A03 l.272, A09 l.512–513, l.527 |
| `UNPAID_COMMISSION` and other provider-only reasons are not shown to customers on provider-ineligibility paths | Pass | customer.md C11 l.595/598, C13 l.686, C14 l.730, C35 l.1542, C42 l.1811/1814. `UNPAID_COMMISSION` appears only in partner.md. Note finding 11 for the generic `{reason}` slots |
| No customer phone, exact address or name before a match (BP §52.2; PROF-ADDR-004) | Pass at UI level | partner.md G7, P08 l.450, P09 l.493/526. Note finding 13 (media/AI text path) |
| Admin: separate auth path, MFA for every sub-role, generic login error (D-002; SEC-AUTH-005) | Pass | admin.md §1.1 l.66–70, A01 l.180–183 |
| Admin access matrix is complete; the 45 `OQ` cells default to `none` / 403 | Pass | Script count over admin.md §2: 45 `OQ` cells (SA 13, OPS 9, SUP 7, FIN 4, CM 4, RT 6, AN 0, TA 2), which matches l.162 and OQ-052. §0.2 l.46 says `OQ` = `none` on the server |
| Audit on every admin write; append-only ledger and audit; corrections only as reversals (BP §26; SEC-BASE-010) | Pass (finding 5 covers the scope of a correction, finding 22 covers the reason field) | admin.md §1.3, A09 l.524, A17 l.789 |
| Admins cannot set status, price or fare lines, and cannot assign a provider | Pass | admin.md A07 l.445, A08 l.480, A11 l.601 |
| AI cannot submit; AI guidance stays server-side; raw prompts are never shown | Pass | customer.md C34 l.1489; admin.md A24 l.1038, A26 l.1113 |

## Findings

### S2

**1. S2 — Auth rate limits have no safe behaviour while `null` in production**
- Where: customer.md C03 l.266, C05 l.332/352; partner.md P02 l.204; admin.md A01 l.180, A20 G2 l.883–884.
- Rule: SEC-AUTH-004, SEC-BASE-006, BP §29 ("rate-limit login, OTP"), BP §30 account takeover; D-002; OQ-028.
- Reproduction (spec reading): A20 G2 shows OTP expiry, attempt limit, lockout and login rate limits as "Not set — TODO(OWNER) (safe test values outside production)". Nothing says what production does while they are `null`. If `null` is read as "no limit", OTP verify and admin password sign-in can be brute-forced without limit. Media limits already have a fail-closed pattern (`LIMIT_NOT_CONFIGURED`, partner.md G6 l.129). Auth limits have none.
- Fix (A13 in admin.md §1.4/A20 G2; A02 in T3.1/T5.1; A00 to tie this to the pilot gate): state that the auth/OTP/login rate-limit keys are **required in staging and production**. When they are unset, the API refuses to start (or refuses OTP send and admin sign-in with `LIMIT_NOT_CONFIGURED`). They never run unlimited. No number is invented; OQ-028 must be answered before the pilot.

**2. S2 — Payout-method add or change has no step-up check (OQ-070 default "no extra step")**
- Where: partner.md P16 l.815, l.828; §7 OQ-070 l.1269.
- Rule: BP §30 account takeover + payment fraud ("strong authentication"); SEC-BASE-002; PAY-007.
- Reproduction: someone holding a provider's unlocked phone, or a stolen session token, opens P16 → "Add payout method" with their own wallet → removes the old one → the next settlement goes to the attacker. No OTP is asked and the provider is not told.
- Fix (A12 spec + A00 to change the OQ-070 default): add or remove of a payout method requires a fresh OTP on the account's phone (same `OtpSender` flow as P02). The server sends a critical, non-disableable notification to the provider ("Your payout details were changed"). Any waiting period before a new method is used is an owner value: add it to OQ-070 as `TODO(OWNER)`.

**3. S2 — Customer phone-number change needs only an OTP to the new number**
- Where: customer.md C25 l.1134, l.1143.
- Rule: BP §27 ("controlled account recovery with abuse protection"), BP §30 account takeover; D-002; SEC-AUTH-002.
- Reproduction: a thief with an unlocked phone (or a stolen token) uses "Change number", verifies an OTP sent to their own SIM, and now owns the account permanently. The real owner cannot log in, because login is phone + OTP only.
- Fix (A11 spec; A02 in T3.1): changing the number needs (a) a fresh OTP on the **current** number and (b) an OTP on the new number. On success the server revokes all other sessions and notifies the old number. If the old number is lost, the case goes to support-assisted recovery (BP §27), not self-service. Partner app: keep P21 without a change-number action unless the same rule is applied.

**4. S2 — One Finance user both sets the company account that providers pay into and approves those payments**
- Where: admin.md A13 l.678, l.684, footnote 9 l.157; A09 l.515, l.521.
- Rule: BP §30 admin abuse ("role separation, logs, limited permissions and review of sensitive changes"); ABUSE-010; KK-T2; D-021.
- Reproduction: a dishonest or compromised Finance account changes "Company account details" to a private wallet (the change is audited, but nobody else has to look at it). All providers (P15 l.763) pay into it, and the same user approves the submissions in A09, which clears every provider's block. The money never reaches Kaam Karo.
- Fix (A13 spec; owner via a new OQ raised by A00): (a) a change to company account details does not take effect until a **second** person approves it (default proposal: Super Admin approves Finance's change); (b) every change raises a "sensitive change" audit item and a notification to all Super Admins; (c) P15 shows the details only from the server's current effective value. If the owner rejects two-person approval, the minimum is (b) plus a fixed review of A17 "Sensitive changes".

**5. S2 — A09 "Create correction" allows a free "adjustment", which can clear the unpaid-commission block without any payment**
- Where: admin.md A09 l.524.
- Rule: BP §26 (corrections are reversals of the original record), BP §30 admin abuse / payment fraud; LEDGER-005, LEDGER-PAY-006, KK-T4.
- Reproduction: Finance picks any old ledger row of a provider who owes money and creates an "adjustment" credit for any amount. The balance goes to ≥ 0 and `provider.balance_cleared` fires. No commission payment, transaction ID or screenshot exists.
- Fix (A13 spec; A09 module owner in T6.x): a correction may only **reverse** a linked original row, fully or partially, for at most the not-yet-reversed amount of that row, with a reason. Any free-standing credit ("adjustment") is either not offered at launch or needs the same second-person approval as finding 4. Add the test "correction > original amount → 422" to the IMPL §7.3 A list.

**6. S2 — New threat KK-T5: provider records DIGITAL, collects cash outside the platform, and no commission is ever debited**
- Where: partner.md P14 l.704–707, l.716; customer.md C16 l.791, C20 l.955.
- Rule: BP §30 off-platform leakage + payment fraud; D-016 (cash → 30% of labour debited); D-022 (follow-ups open); ABUSE-006, ABUSE-007.
- Reproduction: the provider taps "Customer will pay digitally" (no debit), then takes cash in hand. The booking stays `Completed` with digital "Waiting for payment" forever. No commission debit, no flag, and the provider stays eligible. KK-T1 only covers false **CASH**.
- Fix (A12/A11 spec; A13 adds a queue column; A00 raises an OQ for the time value): DIGITAL-recorded bookings with no gateway confirmation after a configured time (`TODO(OWNER)`) raise a risk flag in A18 (payment-fraud type) and an A09 Exceptions row. The customer's C20 shows "Paid by: Digital — not received yet" and a way to say "I paid cash" (this feeds the existing C29 "wrong payment record"). A15 adds KK-T5 to permission-policy §9.2 in the next policy revision.

**7. S2 — Partner app sends live location to the server before OQ-025 is decided, and keeps sending after the provider has arrived**
- Where: partner.md G3 l.94–97, P12 l.622, l.633, l.647.
- Rule: BP §57.4, §81 ("limited to what the job actually needs"), BP §57.1 item 91 (store only the needed location); permission-policy §5 last row ("Until decided, no live sharing is built"; OQ-P3 default "no foreground-service location"); LOC-GEO-007.
- Reproduction: G3 says the app *sends* location during En Route, Arrived **and** In Progress, but no consumer is defined (the customer sees no map until OQ-025). Location keeps being collected for the whole on-site job, when no routing purpose exists, and its retention is not defined.
- Fix (A12 spec): until OQ-025 is answered, the Partner app does **not** send location. Navigation is a hand-off of the address (needs no permission) and the ETA comes from M6 using the service address. If the owner later approves live ETA, collection is limited to `Provider En Route` only, stops on `Arrived`, has a retention value (`TODO(OWNER)`), and stays foreground-only with the G3 strip. Remove "Arrived / In Progress" from G3 and from G2 l.77.

**8. S2 — Admin PII masking is not stated to happen on the server**
- Where: admin.md §1.6 l.97, §0.2 l.43, A03 l.254, A07 l.424.
- Rule: BP §20, §21, §29 (least privilege); ADMIN-ROLE-008; permission-policy §7.
- Reproduction: the spec says "masked", but §1.2 only makes *permissions* server-side. If the API returns full phones and exact addresses and the browser masks them, any role with `view` can read full PII from DevTools or the network tab.
- Fix (A13 spec, A02/A04 contracts): add to §1.6: "Masking is done by the API. The full phone number and the exact address are never sent to the admin web for any sub-role while OQ-055 has no reveal action." **Mask format (A15 decision, as §1.6 asks):** phone = `+92` + bullets + the last 3 digits (e.g. `+92 ••• ••••567`); address = area or neighbourhood name only, no house, street or coordinates. Search by full phone (A03) is allowed as input, but results are masked and the search is audited (see finding 16).

### S3

**9. S3 — Account enumeration on C03 and C04**
- Where: customer.md C03 X l.276 ("No account with this number"), C04 X l.314 ("This number already has an account"), C25 X l.1153; note l.279 asks A15 to decide.
- Rule: BP §29, §30 (fake customer, account takeover); ABUSE-002, ABUSE-009.
- Reproduction: type any number on C03 → the reply tells you whether that person uses Kaam Karo. This needs no SMS and costs nothing, so it is a cheap way to scrape the user base.
- **A15 ruling:** do not reveal registration state before the OTP is verified. Fix (A11): one entry flow. "Send code" always answers "We sent a code to {number}" for any valid number (subject to rate limits). After a correct OTP, the server returns `isNewUser`. New users then fill the C04 details (name, city, terms) **after** verification. This also stops unverified registrations from reserving a number. The Partner app (P02) already works this way. The C25 "number already used" message stays, because that user is already authenticated and the change is OTP-gated (finding 3).

**10. S3 — Account deletion has no fresh re-authentication (OQ-047 default "no extra OTP step")**
- Where: customer.md C30 l.1328; partner.md P21 l.999.
- Rule: BP §27 (account management), BP §30 account takeover; SEC-AUTH-008.
- Reproduction: anyone with an unlocked phone can delete the account. If the hold period is `null`, nothing protects it.
- Fix (A11, A12; A00 to change the OQ-047 default): require a fresh OTP before the deletion request. On request, revoke all sessions and push tokens. Notify the user by SMS during the hold period, with a "cancel deletion" route through support.

**11. S3 — Free-text `{reason from server}` on customer screens can leak provider-only or internal reasons**
- Where: customer.md C21 l.1010, C29 l.1303, C30 l.1337, C40 l.1718; partner.md P05/P06/P13/P16/P21–P24 "{server reason}".
- Rule: COMM-004, MATCH-ELIG-078, BP §17 (provider standing is not customer information); BP §29.
- Reproduction: if any customer-facing endpoint returns a message such as "provider has unpaid commission" or "provider blocked LOW_RATING" (for example C29 reporting on a booking whose provider was blocked), the app shows it verbatim.
- Fix (A11 and A12 spec; contract owners A04/A09/A10/A07): customer screens show **only** copy mapped from an allow-listed reason **code** (as partner G6 does). Unknown codes fall back to generic copy, and free text is never rendered. Customer-facing APIs must never return `UNPAID_COMMISSION`, `LOW_RATING` or safety-block codes; they return a generic `PROVIDER_UNAVAILABLE`. Add an API test to IMPL §7.3 C.

**12. S3 — Customer app has no list of signed-in devices**
- Where: customer.md C27 l.1207, l.1218 (only "Log out of other devices"); compare partner.md P21 l.988.
- Rule: BP §30 account takeover ("suspicious-login detection, session revocation"); KK-T3 test "new-device login visible in session list and revocable"; SEC-AUTH-002.
- Fix (A11): add the same "Devices signed in" list as P21. The server also sends a notification on a new-device sign-in (category: account, critical).

**13. S3 — Customer PII can reach a provider before a match through audio, transcripts, AI summaries and quote notes**
- Where: partner.md P25 l.1146–1149 (audio + transcript), P08 l.449, P24 l.1112 (free-text note to customer); customer.md C34 l.1478, C31/C32.
- Rule: BP §52.2 (no unnecessary private customer information before a match), BP §30 off-platform leakage; PROF-ADDR-004, REQ-AI-009.
- Reproduction: the customer says "my number is 03xx… house 12 street 4" in a voice note. The transcript and the AI "supplier-ready summary" pass it to every invited provider before the customer has chosen. Also, a provider writes their own phone number in the P24 "Explain your price" note.
- Fix (A11, A12 spec; A07 intake owner): (a) C31/C32 hint: "Don't include your phone number or address — we share those only with the provider you choose"; (b) the server redacts phone-number and address patterns from transcripts and summaries before they appear in provider-facing payloads (pre-match); (c) the P24 note and P13 descriptions go through the same moderation hook as chat (REQ-AI-009). Raw audio cannot be redacted, which is accepted residual risk given (a).

**14. S3 — The C35 map view could show providers' home locations**
- Where: customer.md C35 l.1523; partner.md P07 l.409 ("Where do you start from?" area centre).
- Rule: BP §21, §81 (matching uses the service area, not live GPS); provider privacy is part of BP §29.
- Reproduction: if C35 plots each provider at their P07 area centre, which for many individual workers is their home, any customer can map where workers live.
- Fix (A11 spec, A06 for the location API): the map shows only the customer's service location and, at most, the provider's **area name or coarse zone**. Never the provider's area-centre point. The supplier card keeps distance/ETA as a number only.

**15. S3 — Super Admin safeguards: last-Super-Admin lockout, Super-Admin-on-Super-Admin actions, break-glass**
- Where: admin.md A20 l.907–910; T-1.3 handoff "suggestion" (no citation).
- Rule: ADMIN-ROLE-001 (only Super Admin manages staff) + BP §8.4 SA "security functions" → without an active SA no one can manage staff or reset MFA `[DERIVED]`; BP §30 admin abuse.
- **A15 ruling: adopt the lockout guard as a security control** (it adds no business value or new feature, and it follows from ADMIN-ROLE-001). Fix (A13 spec, A02 in T5.1):
  - The server refuses (409) to deactivate, demote or remove the second factor of the **last active Super Admin with enrolled MFA**, including the SA acting on their own account.
  - "Reset two-step verification" on any account revokes all of that account's sessions and forces re-enrolment at the next sign-in. Any action by one SA on another SA (roles, deactivate, MFA reset) notifies all SAs and appears in A17 "Sensitive changes".
  - A break-glass recovery procedure for "no SA can sign in" (offline, owner-held, audited) goes to OQ-051. It is a runbook, not a portal feature.

**16. S3 — Audit log review: SA actions are reviewed only by SA, and reads of sensitive data are not audited**
- Where: admin.md A17 l.787, §2 A17 row l.137; §1.3 l.78 (writes only).
- Rule: BP §8.3 ("access audit logs according to least-privilege roles"), BP §30 admin abuse ("logs … review of sensitive changes"); ABUSE-010; DATA-004.
- Reproduction: a Super Admin changes settings or roles, and the only role that can read A17 is Super Admin. A Finance or Risk/Trust user can open every screenshot, document and chat and leave no trace.
- Fix (A13 spec; owner via OQ-052): (a) name at least one non-SA reviewer of A17 "Sensitive changes" (proposal for OQ-052: Risk/Trust `view` scoped to sensitive changes, or owner-held read access); (b) audit **reads** of: verification documents (A04), "Pay company" screenshots (A09), request/evidence media and chat transcripts (A07/A10/A12), AI request text (A26), and phone search (A03). Actor, object and time are enough.

**17. S3 — Support (and Operations/Risk/Trust) can read every booking's chat and media**
- Where: admin.md §2 A07 row l.127 (SUP edit⁶), A07 detail l.429, l.435.
- Rule: BP §8.4 Support = "Customer/provider cases"; BP §29 least privilege; SEC-BASE-004.
- Fix (A13 spec; owner confirms under OQ-052): Support's A07 access is limited to bookings linked to a ticket or dispute that Support can see (A12/A10), plus booking-ID lookup that is read-audited (finding 16). Chat and media tabs are shown only in that case context.

**18. S3 — Free text bypasses masking, and the C40 callback conflicts with "no reveal"**
- Where: admin.md §1.6 l.97 vs A07 l.435, A10 l.553–554, A11 l.587, A12 l.631; customer.md C40 l.1727 ("Ask Kaam Karo to call me" → Operations ticket); OQ-055 default "no reveal".
- Rule: BP §20, §21; OQ-055.
- Reproduction: phones and addresses typed in chat, complaints or reviews appear unmasked to every role that can open them. Separately, Operations receives a "please call me" ticket but cannot see the number. They can only use `CallRelay` (a fake until D-009) or push someone to look in the database.
- Fix (A13, A11; A00 to settle OQ-055 before T5.x/C40): (a) in admin views, mask phone-number patterns in free text, server-side; (b) either C40 callback is not built until there is a staff contact route (staff `CallRelay` or an audited, reason-gated reveal for the ticket owner), or OQ-055 gets that reveal. Do not leave a callback feature that cannot be used.

### S4

**19. S4 — Location trigger wording is inconsistent.** customer.md §2.5 l.72 says location may be asked on "reaching address confirmation (C39)", but C39 E l.1699 says it is asked only on tap. BP §75 item 93 allows both. Pick tap-only for consistency with PERM-001 tests (A11).

**20. S4 — Idempotent OTP-verify replay.** customer.md C05 P l.350. A replay with the same idempotency key must not count as another attempt, and the idempotency store must not keep the issued session token beyond the request's short technical TTL (A02, T3.1).

**21. S4 — Partner `ACCOUNT_BLOCKED: {reason}`.** partner.md G6 l.128, P04 l.316. The server should send a provider-safe reason code (e.g. `LOW_RATING`, `ADMIN_SUSPENSION`), not internal investigation notes (for example a fraud case in progress) (A12, A02).

**22. S4 — The "reason on every write" rule has exceptions.** admin.md §1.3 l.79 says a reason is required on every write, but A10 "Add case update" l.560 and A12 "Take ticket", "Send update", "Set category" l.637–639 have no reason. Either state that these operational writes are exempt (the update text serves as the reason) or add a reason field (A13).

**23. S4 — The completion code needs attempt limits.** partner.md P14 l.701. When OQ-069 enables it, the server limits wrong attempts and invalidates the code after the limit, which is a config value (`TODO(OWNER)`) (A12, A04).

**24. S4 — Suspension should end sessions.** admin.md A03 l.267 and A18 l.823. Suspend/block should revoke the user's sessions or be checked on every request, so `ACCOUNT_BLOCKED` takes effect at once (SEC-AUTH-006) (A13, A02).

**25. S4 — Staff-written updates.** admin.md A10 l.560 and A12 l.638 send staff free text to users. Add a short spec note that staff updates never contain payment-account instructions. Payment details come only from the A13 config (phishing / insider risk, BP §30) (A13).

## Routing (for A00 → BUGS.md / REQUESTS.md)

| # | Sev | Owner | Spec / file | Also needs |
|---|---|---|---|---|
| 1 | S2 | A13, A02 | admin.md A20 G2, §1.4; customer C05; partner P02 | OQ-028 before pilot gate |
| 2 | S2 | A12 | partner.md P16 | Change the OQ-070 default |
| 3 | S2 | A11 | customer.md C25 | A02 (T3.1) |
| 4 | S2 | A13 | admin.md A13, A09 | New OQ: two-person approval |
| 5 | S2 | A13 | admin.md A09 | A09 module owner, IMPL §7.3 A test |
| 6 | S2 | A12, A11, A13 | partner P14; customer C16/C20; admin A09/A18 | New OQ: time value; A15 adds KK-T5 |
| 7 | S2 | A12 | partner.md G2, G3, P12 | OQ-025 |
| 8 | S2 | A13 | admin.md §1.6 | A02/A04 contracts |
| 9 | S3 | A11 | customer.md C03, C04 | A02 (T3.1) |
| 10 | S3 | A11, A12 | customer C30; partner P21 | Change the OQ-047 default |
| 11 | S3 | A11, A12 | customer C21/C29/C30/C40; partner {server reason} | A04/A07/A09/A10 contracts |
| 12 | S3 | A11 | customer.md C27 | — |
| 13 | S3 | A11, A12 | customer C31/C32/C34; partner P24/P25 | Intake owner (redaction), REQ-AI-009 |
| 14 | S3 | A11 | customer.md C35 | A06 |
| 15 | S3 | A13, A02 | admin.md A20 | OQ-051 (break-glass) |
| 16 | S3 | A13 | admin.md A17, §1.3 | OQ-052 |
| 17 | S3 | A13 | admin.md §2 A07 | OQ-052 |
| 18 | S3 | A13, A11 | admin §1.6; customer C40 | OQ-055 |
| 19–25 | S4 | as listed | as listed | — |

Re-review: A15 re-checks findings 1–8 after the spec owners update the files. Findings 9–18 are re-checked at the first build task that uses each screen.


---

## Re-review 1 (2026-10-23)

Inputs: the "Review fixes" sections in `coordination/handoffs/T-1.1.md`, `T-1.2.md` and `T-1.3.md`; the updated `docs/screens/customer.md`, `partner.md` and `admin.md`; D-030; OQ-076, OQ-077, OQ-078. I checked each S2 fix against the spec text, not only against the handoff claims. Line references are given by section, because the fixes moved the line numbers.

### Verdict per task

| Task | Owner | Verdict |
|---|---|---|
| T1.1 Customer screens | A11 | **SEC-REVIEW: PASS** |
| T1.2 Partner screens | A12 | **SEC-REVIEW: PASS** |
| T1.3 Admin screens | A13 | **SEC-REVIEW: PASS** |

All S2 findings are closed. Every S3 finding is closed in the spec or depends on an open question whose default is the safe option. The residual items R1–R3 below are S4 or A15 follow-ups and do not block.

### S2 findings

| # | Status | Evidence in the spec |
|---|---|---|
| 1 Auth limits fail open | Closed | admin.md §1.1 "Rate limits fail closed"; A01 second-factor row + Error state (`LIMIT_NOT_CONFIGURED`); A20 G2 OTP and rate-limit rows "required in staging/production; unset → fail closed". No value invented; OQ-028 is a pilot-gate item. |
| 2 Payout-method step-up | Closed | partner.md P16: "Fresh OTP" field required on every add/remove; Add/Remove actions request an OTP first; critical, non-disableable notification with EN/UR copy; waiting period left to OQ-070 `TODO(OWNER)`. |
| 3 Phone-number change | Closed | customer.md C25: OTP on the current number, then on the new number (C05 modes); other sessions revoked; old number notified; "I no longer have my old number" → C28 support-assisted recovery, with no self-service bypass. |
| 4 Company account two-person rule | Closed (pending OQ-076 confirmation) | admin.md §1.3 "Sensitive changes"; footnote 9; A13 "Propose change" / "Approve / reject" (not the proposer, self-approval → 403), all Super Admins notified, P15 shows only the effective value. The build follows the safe proposed default of OQ-076. |
| 5 Correction as free credit | Closed | admin.md A09 "Reverse a ledger row": linked to one original row, at most the not-yet-reversed amount (more → 422), no free-standing credit or adjustment, can never clear the unpaid-commission block. A16: add "correction > not-yet-reversed amount → 422" and "no correction without a linked original row" to the IMPL §7.3 A tests. |
| 6 KK-T5 DIGITAL-not-received | Closed (time value pending OQ-077) | partner.md P14 "Digital status" + Notes; admin.md A09 Exceptions row (listed with its waiting time even while the value is `null`), A18 payment-fraud flag type; customer.md C20 "Digital — not received yet" + "I paid cash" (see the answer below). |
| 7 Provider location | Closed | partner.md G2 Location row ("Not requested at launch"), G3 rewritten, P12 "Start trip" ("No location permission ask at launch"), indicator and "Stop sharing" gated on OQ-025; any future sharing is `Provider En Route` only, foreground only, retention `TODO(OWNER)`. |
| 8 Server-side masking | Closed | admin.md §1.6: masking is done by the API, and full phone and exact address are never sent to the admin web; A15 mask format copied correctly; phone search masked and read-audited; free text masked server-side. |

### S3 findings (spot-checked in the spec text)

| # | Status | Evidence |
|---|---|---|
| 9 Enumeration | Closed | C03 Send-code row, S and X states (same answer for every valid number, no registered/blocked message); `ACCOUNT_BLOCKED` only after a correct OTP (C05 X); C04 details collected after verification (`isNewUser`). A02 contract note present. |
| 10 Deletion re-auth | Closed | C30 Request deletion (fresh OTP via the C05 deletion mode, sessions and push tokens revoked, SMS during hold); partner.md P21. OQ-047 default changed. |
| 11 Reason codes | Closed | customer.md §2.4 "Reason codes, never server text" + generic `PROVIDER_UNAVAILABLE`; C30 X uses codes. partner.md G6 "Reason slots" rule covers every remaining `{server reason}` placeholder; these are provider-only screens, so this is acceptable. |
| 12 Customer device list | Closed | C27 "Devices signed in" + per-device sign-out + new-device critical notification. |
| 13 Pre-match PII in text | Closed | C31/C32/C12 hints; C34 summary is server-redacted; partner.md G7 + P24 note through the moderation/redaction hook. Raw audio is accepted residual risk (A15). |
| 14 Provider home on map | Closed | C35 Map/list row. |
| 15 Super Admin safeguards | Closed | admin.md A20 "Super Admin safeguards", Reset second factor revokes sessions, break-glass under OQ-051. |
| 16 Audit reads / SA reviewer | Closed (reviewer pending OQ-052) | §1.3 "Sensitive reads are audited too"; footnote 13 keeps the RT reviewer cell at `OQ` → 403 until answered. A script recount confirms 45 `OQ` cells. |
| 17 Support scope | Closed (owner confirms under OQ-052) | footnote 6. |
| 18 Free text / C40 callback | Closed | §1.6 free-text masking; C40 callback hidden until OQ-055 gives a staff contact route. |

S4 #19–#25: #19, #20 (C05 P state + A02 contract note), #21 (partner G6 block reasons), #22 (reason fields added to A10/A12), #23 (P14 completion-code limit `null` + TODO(OWNER)), #24 (A03/A18 suspend revokes sessions) and #25 (§1.6) are all fixed.

### New since the first review

- **D-030** (a booking exists only after the provider accepts; cash is recorded only by the provider; the Customer app has no cash choice). This strengthens the PII rule: with the OQ-027 default (reveal after Accepted), exact address and contact route now reach the provider only once a real booking exists. customer.md C16/C20 and partner.md P14 cite D-030 correctly. No security change is needed.
- **OQ-076 / OQ-077 / OQ-078**: the specs build the safe default of each one (two-person rule; listing with waiting time and no automatic trigger while `null`; owner-decided keys read-only, write → 403). OQ-078 also reduces admin-abuse risk (BP §30), because a single admin can no longer change `commission.rate` or `ledger.max_negative_balance`.

### Answer to A00: C20 "I paid cash" behind a config switch that is on by default

**Acceptable, and on-by-default is the right security default**, under these conditions:

1. **Why on:** while `ledger.digital_unconfirmed_flag_hours` is `null` (OQ-077), partner.md P14 says "no automatic flag is raised". The customer report is then the only active signal for KK-T5, apart from the A09 waiting-time list that someone has to read. Turning it off would leave the threat undetected.
2. **It is a report, not a payment record.** It opens C29 "wrong payment record" and never changes the payment record (customer.md C20 Notes). So it does not conflict with D-030, which says the Customer app has no option to choose or record cash. A00 should still mention D-030 in the OQ-077 wording, so the owner sees both together.
3. **Server-side conditions (A10 Support + A09 Payments contracts; A16 tests):**
   - the switch is a server config key (proposed `payments.customer_cash_claim_enabled`, seeded `true` with the source "A15 security default pending OQ-077"), not an app build flag;
   - the server re-checks eligibility on every call: the caller is that booking's customer, the record says DIGITAL, and there is no gateway-confirmed payment;
   - one open claim per booking (idempotent), and the report rate limits apply (SEC-BASE-006);
   - the claim never moves money, never changes "Paid by" and never clears or creates a ledger row. Only Finance acts, through the A09/A18 flow.
4. **If the owner turns it off** under OQ-077, `ledger.digital_unconfirmed_flag_hours` must be set first, so that KK-T5 always has at least one detection path.

### Residual items (non-blocking)

- **R1 (S4, A11/A03):** the config key for the "I paid cash" switch is not named in customer.md C20. Name it in the C20 Notes and RQ-004 (see condition 3).
- **R2 (A15 follow-up):** permission-policy v1.1. With G2/G3 the Partner app requests no location permission at launch, so the Partner allow-list in policy §4.2 drops `ACCESS_COARSE_LOCATION`/`ACCESS_FINE_LOCATION` until OQ-025 is answered, and the CI manifest guard (A01/A17) should block them for the Partner app. Also add threat KK-T5 to §9.2 and update the M-04 provider row.
- **R3 (S4, A16):** add these tests to the RBAC/security test plan for T3.1, T5.1 and T6.x: fail-closed auth limits (#1), company-account self-approval → 403 (#4), correction cap (#5), DIGITAL-unconfirmed listing (#6) and last Super Admin → 409 (#15).

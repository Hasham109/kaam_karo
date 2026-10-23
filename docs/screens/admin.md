# Admin Portal — Screen specs A01–A26 and sub-role access matrix

> Task **T1.3** (owner A13, reviewer A00). Spec only: no code. Written 2026-10-23.
> Acceptance (IMPL §6 T1.3): **access matrix complete**; every screen has the five states (UX-SCREEN-003).

## 0. Sources and how to read this file

| Source | Used for |
|---|---|
| `coordination/DECISIONS.md` (highest authority) | D-002 admin strong auth + MFA; D-006/D-015 commission; D-014/D-017 rating enforcement (dry-run); D-016/D-020/D-021/D-022 provider ledger and Finance verification; D-019/D-024 Lahore + day-one families; D-023/D-025/D-029 fees and tax; **D-026 Admin Portal English only** |
| `docs/BLUEPRINT.md` | §8.3 admin access, **§8.4 sub-roles**, §11 admin journey, **§14 screens A01–A20**, §15 states, §19 reviews, §26 data ownership, §27 auth, §29 security, §30 abuse, §31.1 failure behaviour, §39 operating model, §40 support levels, §42 configurable rules; v0.3 §54 matching, §55.2 badges, §57.2 cities, §60.3 admin portal, §61 health, §64 catalog rules, §66 records, §67 AI governance, §68 fair matching; v0.4 §76 media, §78 localisation, §80/§84 item 116 notification priority |
| `docs/architecture.md` | §3.3 derived screens **A21–A26**, §5.3 ConfigRule/City, §6.7 rating enforcement, §6.8 ledger, §7 events, §8 API rules, §9 matching, §18 interfaces, §19 config list |
| `docs/requirements/REQUIREMENTS.md` | Requirement IDs (OPS-ADMIN-001…026, ADMIN-ROLE-001…008, ROLE-003 and the IDs cited per screen) |
| `docs/security/permission-policy.md` (T0.4) | Data exposure rules §7, admin session cookie (SEC-BASE-002), threat KK-T2/KK-T4 |

Rules applied while writing:
1. Every element, column and action cites a `BP §n`, a `D-xxx` or a requirement ID. Elements without a source are **not** specified; they are listed as `OQ-xxx` in `coordination/OPEN_QUESTIONS.md`.
2. No business value is invented. A value is printed only where an owner decision gives it (e.g. `commission.rate = 0.30`, D-006). Everything else is shown as **"Not set — TODO(OWNER)"** with its OQ/D reference.
3. Admin UI text is **English only** (D-026). Content that admins edit and that customers/providers see (catalog names, service text, customer questions, notification templates, FAQ) keeps **both `en` and `ur` fields**, and both are required (BP §37, §78; CFG-RULE-011, CAT-SVC-012).
4. The "Server request" column names the owning backend module (ARCH §4) and the operation. These are **not contracts**. The owning agent publishes the real endpoint in `contracts/` before T5.x uses it (contract-first, IMPL §3.4).
5. Promotions (A14) are **Not launch** (BP §14 "later"; DECISIONS "Not launch"). The screen is listed for completeness only.

### 0.1 Sub-role abbreviations (exact names from BP §8.4)

| Abbrev. | BP §8.4 sub-role | BP §8.4 example permissions (verbatim) |
|---|---|---|
| SA | **Super Admin** | All configuration and security functions. |
| OPS | **Operations** | Bookings, providers, customers, service quality. |
| SUP | **Support** | Customer/provider cases; no financial configuration. |
| FIN | **Finance** | Payments, refunds, settlements, reports; no user-password access. |
| CM | **Content Manager** | Categories, service text, banners, FAQs. |
| RT | **Risk/Trust** | Verification, abuse, fraud and moderation. |
| AN | **Analyst** | Read-only reporting and analytics where possible. |
| TA | **Technical Admin** | System configuration and diagnostics; no unnecessary business-data access. |

Whether one staff account may hold several sub-roles (access = union) is open: **OQ-053** (default: yes).

### 0.2 Access levels (used in §2 and in every Actions table)

| Level | Meaning | Server behaviour |
|---|---|---|
| `none` | The screen is not in the navigation. Opening its URL shows the "No access" page. | Every API of the screen returns **403** (deny by default, BP §29; ARCH §8 rule 1). |
| `view` | Read only. PII masked per §1.6. No write controls are rendered. | Reads allowed; every write returns 403. |
| `edit` | `view` + the routine write actions that the screen's Actions table lists for this sub-role (each with a reason, audited). | Server checks the sub-role **per action**, not per page. |
| `approve` | `edit` + the **decision** actions on queue items submitted by someone else (approve/reject, dispute outcome, refund, moderation decision). | Same; decision endpoints require the reason field. |
| `OQ` | BP §8.4 and the decisions are silent for this cell. | Server applies **`none`** until the owner answers **OQ-052** (deny by default, BP §29). |
| Footnote (¹, ², …) | The level is limited to part of the screen. | The server enforces the limit per field/section, not only the UI. |

How cells were decided: a cell is `view`/`edit`/`approve` only when BP §8.4, another BP section, a requirement ID or a decision ties the sub-role to the screen's content (cited in the "Basis" column). A cell is `none` when the screen is outside the sub-role's BP §8.4 area **and** least privilege applies (BP §29 "Apply least privilege to admin … roles"), or a requirement explicitly denies it (e.g. ADMIN-ROLE-003: Support gets 403 on A13). Every other cell is `OQ`.

### 0.3 State legend (the five states, UX-SCREEN-003; BP §45, §31.1)

| State | Meaning in the Admin Portal |
|---|---|
| **Loading** | Skeleton of the table/form; the page header and navigation stay usable. Never a blank page (REL-001). |
| **Empty** | The server returned zero items. A sentence says *why* (e.g. "No providers waiting for verification") and, where relevant, which filter to clear. |
| **Success** | Data shown. After a write, the success message appears **only after** the server confirms, and shows the server's new state (REL-005; BP §31.1). |
| **Error** | Server or network error rendered from the error envelope: what failed + what to do next (A11Y-005) + **Retry** for reads. Writes are never auto-retried (REL-007). 403 → "No access" page; 409 → "This item changed; reload" (optimistic lock, ARCH §5 `version`). |
| **Pending / unknown** | A write was sent but no answer arrived (timeout or network lost). The UI shows "Result unknown — checking…", disables the action, and re-reads the object to reconcile. It never shows success or failure on a guess (BP §31.1; REL-006). |

---

## 1. Global rules (apply to every screen)

### 1.1 Authentication, MFA and session (A01; BP §27, §34; D-002; SEC-AUTH-002/003/005)
- The Admin Portal has its **own login path and authorization**, separate from the customer/provider APIs (BP §34 "Admin panel: separate authentication and authorization"). A customer or provider token gets 401/403 on every admin API (SEC-AUTH-005).
- **MFA is mandatory for every sub-role** (D-002; BP §27). Login without the second factor is refused.
- The login method (identifier, primary factor, second-factor type, factor reset) is open: **OQ-051**. Build behind the `AuthProvider` interface with a fake (ARCH §18). No raw password is ever stored (SEC-AUTH-003).
- Session: `HttpOnly`, `Secure`, `SameSite` cookie (permission-policy SEC-BASE-002); sessions expire and can be revoked (BP §27). Session lifetime, idle timeout, lockout and attempt limits are config `null` + `TODO(OWNER)` (**OQ-028**, OQ-051). When the session expires, the next request returns 401 and the portal shows A01 again; an unsaved form is kept in the page until the user signs in again (BP §31.1 "save safe local draft").
- A blocked or deactivated staff account cannot sign in (BP §27 "Blocked account").
- **Rate limits fail closed** (SEC-REVIEW-T1.1-1.3 #1). The OTP and admin sign-in limits (OTP expiry, resend cooldown, attempt limit, lockout, login rate limits; A20 G2) are **required in staging and production**. While any of them is unset there, the API refuses to start, or it refuses admin sign-in and OTP send with `LIMIT_NOT_CONFIGURED`. It never runs without limits (BP §29, §30; SEC-AUTH-004, SEC-BASE-006). No number is invented: the values come from **OQ-028**, which must be answered before the pilot. Development and test use safe test values.
- Break-glass recovery when no Super Admin can sign in is an offline, owner-held, audited runbook, not a portal feature: **OQ-051** (SEC-REVIEW #15).

### 1.2 Server-enforced permissions (BP §29; SEC-BASE-003/004; ADMIN-ROLE-001…008)
- After sign-in the portal reads the staff account's sub-roles and permitted actions **from the server**. Navigation and buttons are built from that list. Hiding a button is only cosmetic: the server checks the sub-role on **every** request and returns 403 otherwise.
- The client never sends a status, price, amount of commission or permission that the server trusts (BP §29; SEC-BASE-007). Booking actions are taken only from the server's `allowedNextActions` (BOOK-STATUS-016).
- Must-test rules: Support gets 403 on A13 (ADMIN-ROLE-003; T5.1 acceptance); Content Manager gets 403 on A09 (ADMIN-ROLE-005); Analyst gets 403 on every write (ADMIN-ROLE-007); only Super Admin manages staff accounts and sub-roles (ADMIN-ROLE-001).

### 1.3 Audit on every write (BP §11 step 50, §26, §29, §68; SEC-BASE-010; ROLE-003; MATCH-FAIR-004)
- **Every** admin write (status override, account action, queue decision, config change, template change) writes an append-only audit row: actor, actor's sub-roles, action, object type + ID, before, after, **reason**, time (BP §26, §66 Marketplace Event; DATA-004).
- The **reason** field is required on every write (OPS-ADMIN common acceptance "every write is audited with actor and reason"). The server returns 422 without it (ROLE-003, RATING-ENF-006, LEDGER-PAY-004). Reason is free text; its maximum length is set in the contract.
- Consequential writes (money, account standing, verification level, live configuration, activation) show a **confirm dialog** that repeats the object, the before → after value and the reason before sending (BP §11 step 50, §60.3 "approvals, overrides").
- There is no admin write without audit, and no "edit the database" path (IMPL A13 must-never; BP §44 phase 5 exit).
- **Sensitive reads are audited too** (BP §8.3, §30; ABUSE-010; SEC-REVIEW #16). Opening any of these writes an audit row with actor, object and time: verification documents (A04), "Pay company" screenshots (A09), request/evidence media and chat transcripts (A07, A10, A12), AI request text (A26), and a search by phone number (A03).
- **Sensitive changes** (config, financial, verification, account standing, staff/role changes, company account proposals/approvals, and any action by one Super Admin on another Super Admin) appear in the A17 "Sensitive changes" filter. A company account change (A13, **OQ-076**) and any Super-Admin-on-Super-Admin action (A20 G1) also **notify all Super Admins**. Which non-Super-Admin sub-role reviews Super Admin actions in A17 is an open cell under **OQ-052** (footnote 13; A15 proposal: Risk/Trust `view` scoped to sensitive changes).

### 1.4 Config editors (A13, A20–A24; BP §42, §64; ARCH §5.3, §19; CFG-RULE-*)
- Every configurable rule is a `ConfigRule` row: key, scope (global / city / category / service), value, `effective_from`, `changed_by` (ARCH §5.3). Changes take effect without a deploy (CFG-RULE common acceptance).
- A value decided by the owner is shown **read-only** with its decision number (e.g. "0.30 — D-006"). It changes only through a new owner decision, pending **OQ-078** (QA F-04). Until OQ-078 is answered the server refuses a write to such a key with 403.
- A value the owner has not decided shows **"Not set — TODO(OWNER)"**, its OQ/D reference, and the safe behaviour that applies while it is `null` (copied from the requirement, e.g. "no limit applied", "dry-run").
- Server validation per key (type, range, allowed values) comes from the config contract (A03, T2.6). The editor never hard-codes a value.

### 1.5 Network and failure handling (BP §31.1, §62.3; ARCH §8 rules 6 and 9; REL-001…007)
- Every request has a timeout. Reads may be retried by the user (Retry button). Writes are never retried automatically (REL-007).
- Writes that create money or decisions (Finance approve/reject, settlement, refund, adjustment, verification decision, dispute outcome) send an **idempotency key**; a double click returns the first result (BP §31.2; REL-003, REL-008).
- Optimistic lock: every edit sends the object's `version`; a 409 shows "This item was changed by someone else — reload" and keeps the user's input visible (ARCH §5 technical field `version`).
- Signed media (documents, screenshots, request media) load through short-lived signed URLs; an expired URL is re-requested once, then shows an error state for that file only (BP §34; INFRA-003).

### 1.6 PII masking and secrets (BP §20, §21, §29; permission-policy §7; IMPL A13 must-never)
- **Never displayed anywhere:** OTP codes, passwords, MFA secrets, session tokens, API keys, AI prompts' secrets, gateway credentials (BP §29, §67; IMPL A13 must-never; permission-policy §7 last row).
- **Masking is done by the API, not by the admin web** (SEC-REVIEW #8; BP §20, §21, §29). The full phone number and the exact address are never sent to the admin web, for any sub-role, while OQ-055 has no reveal action.
- Mask format (A15 decision): phone = `+92` + bullets + the **last 3 digits** (e.g. `+92 ••• ••••567`); address = **area or neighbourhood name only** — no house, street or coordinates. A03 accepts a full phone number as search input, but results are masked and the search is read-audited (§1.3).
- **Free text is masked too** (SEC-REVIEW #18): phone-number patterns typed in chat, complaints, reviews, ticket text and case updates are masked by the server in every admin view, with the same format.
- Whether any sub-role may reveal a full phone number or exact address is open: **OQ-055** (default: no reveal action).
- **Staff-written text never contains payment instructions** (SEC-REVIEW #25; BP §30): case updates and ticket replies (A10, A12) must not give bank or wallet accounts. Providers get payment details only from the A13 config shown on P15.
- Provider verification documents are visible **only to Risk/Trust** (permission-policy §7; BP §8.4).
- "Pay company" screenshots are visible **only to Finance** (permission-policy KK-T2).
- Technical Admin sees customer phone/address fields masked in every screen it can open (ADMIN-ROLE-008).
- A user who requested deletion and was anonymised appears as "Deleted user" with the transaction still linked (BP §26; SEC-AUTH-008).

### 1.7 Language, format, accessibility
- Admin UI strings: English only (D-026), still kept outside code in the i18n package (BP §37; I18N-006).
- Money in PKR ("Rs."), dates and times in Pakistan local conventions (BP §37; I18N-007).
- Status chips carry text, never colour only; icons have labels; errors say what to do next (BP §38; A11Y-003…005).
- Supported browsers: **OQ-031** (default: Chromium is the release-gate browser).

### 1.8 Common list behaviour
- Lists are paged, sorted and filtered **on the server** (the server is the source of truth, BP §60.1). Filters are kept in the URL so a link reproduces the view.
- Each row links to the related screens the user may open (e.g. booking → A07). Links to a screen with `none` are not rendered.

---

## 2. Access matrix (rows A01–A26 × BP §8.4 sub-roles)

Levels and `OQ` per §0.2. Every `OQ` cell is listed in **OQ-052** and is `none` on the server until answered.

| Screen | Super Admin | Operations | Support | Finance | Content Manager | Risk/Trust | Analyst | Technical Admin | Basis |
|---|---|---|---|---|---|---|---|---|---|
| A01 Admin login | edit¹ | edit¹ | edit¹ | edit¹ | edit¹ | edit¹ | edit¹ | edit¹ | BP §14, §27; D-002; SEC-AUTH-005. Every staff member signs in with MFA. |
| A02 Dashboard | view | view | view | view | view | view | view | view² | BP §11 step 44 ("Admin … review operational alerts and marketplace health"), §14; aggregate counts only, no PII. TA: BP §8.4 "no unnecessary business-data access". |
| A03 Users | OQ | edit | view | none | none | edit | none | none | BP §8.3 suspend/restrict/reinstate; §8.4 OPS "providers, customers", SUP "cases", RT "abuse, fraud"; RATING-ENF-006 (OPS or RT reinstate); ADMIN-ROLE-002/006. FIN: A09 already shows the provider fields Finance needs; CM/AN/TA: outside §8.4 area + least privilege (BP §29). |
| A04 Provider verification | OQ | view³ | OQ | none | none | approve | none | none | BP §8.4 RT "Verification"; TRUST-VER-002/003 ("only Risk/Trust can set this level"); documents RT-only (permission-policy §7). OPS: §8.4 "providers", §39 daily queue review. |
| A05 Categories | edit | view | view | view | edit | view | view | view | BP §8.4 CM "Categories", SA "All configuration"; catalog content is public (BP §8.1 browse public listings), so view reveals no private data; ADMIN-ROLE-005. |
| A06 Services | edit | view | view | view | edit⁴ | edit⁵ | view | view | BP §8.4 CM "service text", SA "All configuration", RT "Verification" (CAT-SVC-005, CFG-RULE-007); public content (BP §8.1). |
| A07 Bookings | OQ | edit | edit⁶ | OQ | none | view | none | none | BP §8.3 "view and manage bookings"; §8.4 OPS "Bookings"; §40 L2 Support "routine cancellation"; BOOK-CANCEL-005 (no-show report → support review); RT "abuse, fraud" (BP §30). |
| A08 Quotes | OQ | view | OQ | OQ | none | view | none | none | BP §14 "Review quote exceptions"; §8.4 OPS "Bookings, … service quality"; RT: BP §30 price manipulation. Actions beyond view: OQ-057. |
| A09 Payments | OQ | OQ | OQ | approve | none | OQ | none | none | BP §8.4 FIN "Payments, … settlements"; D-021 Finance verification queue; LEDGER-PAY-003/004; PAY-007; ADMIN-ROLE-004; CM 403 (ADMIN-ROLE-005). |
| A10 Refunds/disputes | OQ | approve | edit | approve⁷ | none | approve | none | none | BP §40 (L2 Support, L3 Operations "service quality dispute", L4 Risk/finance "suspected fraud, serious payment disputes"); §8.4 FIN "refunds"; SUP-003/004. |
| A11 Reviews/moderation | OQ | OQ | OQ | none | none | approve | none | none | BP §8.4 RT "moderation"; §19 moderation queue; REV-005; ADMIN-ROLE-006. |
| A12 Support | OQ | edit | edit | edit⁸ | OQ | edit⁸ | none | none | BP §14 "Ticket queue and SLA"; §40 L2 Support, L3 Operations, L4 Risk/finance; §8.4 SUP "cases"; SUP-002. CM FAQ tab: OQ-056. L5: OQ-061. |
| A13 Fees/commissions | edit⁹ | none | none | edit | none | none | none | none | BP §14 "Controlled financial configuration"; OPS-ADMIN-013 "Finance/Super Admin only"; LEDGER-PAY-001 (company account details Finance-only); ADMIN-ROLE-002/003/006 (403). |
| A14 Promotions | none | none | none | none | none | none | none | none | **Not launch** (BP §14 "later", §46; OPS-ADMIN-014). |
| A15 Notifications | edit | none | none | none | OQ | none | none | none | BP §8.3 "Manage content and notification templates"; §42 templates are configuration (SA "All configuration"); CFG-RULE-011. CM: §8.4 does not list templates → OQ. |
| A16 Reports | OQ | view¹⁰ | OQ | view¹⁰ | none | OQ | view | view¹⁰ | BP §8.4 AN "Read-only reporting and analytics", FIN "reports", TA "diagnostics"; §39 operations reviews; ANALYTICS-001…008; OPS-ADMIN-016. |
| A17 Audit logs | view | OQ | none | OQ | none | OQ¹³ | none | OQ | BP §8.3 "Access audit logs according to least-privilege roles"; §8.4 SA "security functions"; §30 admin abuse review; ABUSE-010. |
| A18 Risk/fraud | OQ | OQ | none | view¹¹ | none | approve | none | none | BP §8.4 RT "abuse, fraud"; §30; §40 L4 "Risk/finance"; ABUSE-002/007; ARCH §7 Risk/Trust queue (D-014). |
| A19 System health | OQ | OQ | none | none | none | none | none | view | BP §8.4 TA "diagnostics"; §14; REL-011; ADMIN-ROLE-008. |
| A20 Settings | edit | OQ | OQ | none | none | OQ | none | OQ | BP §8.4 SA "All configuration and security functions", TA "System configuration"; §42; ADMIN-ROLE-001; financial keys live in A13. Per-group editors: §A20 + OQ-052. |
| A21 Matching weights & fairness | edit | OQ | none | none | none | none | none | none | BP §54.2 "configurable in the Admin Portal"; SA "All configuration"; OPS-ADMIN-021; D-010. |
| A22 Badge rules | edit | OQ | none | none | none | OQ | none | none | BP §55.2, §66; SA "All configuration"; OPS-ADMIN-022; D-010. |
| A23 City & zone activation | edit | OQ | none | none | OQ | none | none | none | BP §42 "Service category activation", §57.2, §64; SA "All configuration"; CFG-RULE-001; D-007, D-019, D-024. |
| A24 AI guidance & questions | edit | none | none | none | OQ | none | none | none | BP §64; §67; SA "All configuration"; CAT-SVC-006/007. |
| A25 Marketplace health | OQ | view | OQ | OQ | none | OQ | view | none | BP §61; §39 weekly "supply-demand balance"; §8.4 OPS "service quality", AN "analytics"; OPS-ADMIN-025. |
| A26 AI interaction viewer | OQ | view | none | none | none | view | none | view¹² | BP §66, §67 ("human-readable records of what AI suggested and what … was confirmed"; version "for troubleshooting"); §8.4 OPS "service quality", RT "moderation", TA "diagnostics"; REQ-AI-008. |

Footnotes:
1. Own sign-in, password/second factor of **their own** account only (A01).
2. Technical Admin sees only the system-health widgets on A02 (BP §8.4 "no unnecessary business-data access").
3. Operations sees verification **status and age** only, never the documents (permission-policy §7).
4. Content Manager edits **text/content fields** only (names en/ur, descriptions, included/not included, images) — BP §8.4 "service text".
5. Risk/Trust edits only the **verification requirement** field (CAT-SVC-005, CFG-RULE-007).
6. Support: cancel (routine cancellation, BP §40 L2) and the no-show review (BOOK-CANCEL-005) only, and **only on bookings linked to a ticket or dispute that Support can see** (A12/A10). Booking-ID lookup outside that context is read-audited; chat and media tabs show only in the case context (BP §8.4 "cases"; BP §29; SEC-REVIEW #17; owner confirms under OQ-052).
7. Finance: refund issuance only (BP §8.4 "refunds"; SUP-004); dispute outcomes belong to Operations/Risk/Trust.
8. Finance and Risk/Trust work tickets at level L4 (BP §40) and tickets assigned to them.
9. Finance and Super Admin edit the A13 keys that are **not** fixed by an owner decision (those are read-only, OQ-078). Company account details: Finance proposes (LEDGER-PAY-001); the change takes effect only after a **second** staff member (Finance or Super Admin, not the proposer) approves, and all Super Admins are notified (**OQ-076**; SEC-REVIEW #4).
10. Report groups: Operations → Marketplace, Customer, Provider, Quality (BP §39); Finance → Financial (BP §8.4); Technical Admin → Reliability (ANALYTICS-008); Analyst → all groups.
11. Finance sees payment-related flags only (BP §40 L4; ABUSE-007).
12. Technical Admin sees technical metadata only (version, latency, errors, input class, safety state); request text and summaries are hidden (BP §8.4 TA; BP §67 troubleshooting).
13. Proposed non-Super-Admin reviewer of Super Admin actions: Risk/Trust `view` limited to the A17 "Sensitive changes" filter (SEC-REVIEW #16). Still `OQ` under **OQ-052**, so the server returns 403 until answered.

**Completeness check:** 26 rows × 8 sub-roles = 208 cells, every cell filled: 147 decided (`none`/`view`/`edit`/`approve` with a basis) and 45 `OQ` cells (all listed in OQ-052) + 16 A01/A14 cells fixed by rule. Count of `OQ` cells: Super Admin 13, Operations 9, Support 7, Finance 4, Content Manager 4, Risk/Trust 6, Technical Admin 2. The T1.3 review fixes changed no level: footnotes 6, 9 and 13 narrow or explain existing cells.

---
## 3. Screen specs

Each screen has: purpose + requirement IDs; fields/columns/filters; actions; the five states; PII notes and open items. Sub-role abbreviations per §0.1. "Audit" = row written per §1.3. "R/C" = reason field required (R) and/or confirm dialog (C).

---

### A01 — Admin login

**Purpose:** protected staff authentication with MFA (BP §14, §11 step 43, §27; D-002).
**Requirement IDs:** OPS-ADMIN-001, SEC-AUTH-002, SEC-AUTH-003, SEC-AUTH-005, SEC-AUTH-006, ABUSE-009, ADMIN-ROLE-001…008.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Sign-in ID | text input | Required; format per OQ-051 | "Sign-in ID" | BP §27; OQ-051 |
| Primary credential | masked input, never echoed or logged | Required; checked by `AuthProvider` (no raw password stored) | "Password" (final label per OQ-051) | BP §27; SEC-AUTH-003; OQ-051 |
| Second-factor code | input | Required on every sign-in; attempt limit and lockout from config (OQ-028); unset in staging/production → sign-in refused with `LIMIT_NOT_CONFIGURED` (§1.1) | "Verification code" | D-002; BP §27, §29; OQ-028 |
| Second-factor setup (first sign-in only) | guided step | Must be completed before any other page opens | "Set up two-step verification" | D-002; OQ-051 |
| Environment badge | read-only label | Shows `development` / `staging` / `production` from the server | "Environment: Staging" | BP §29, §34 (separate environments); SEC-BASE-011 |
| Error area | text | Generic message; does not say which factor failed | "Sign-in failed. Check your details and try again." | BP §30 (account takeover) |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Sign in (step 1) | "Continue" | any staff account | M1 Identity · admin sign-in (primary factor) via `AuthProvider` | Yes (success and failure, for suspicious-login detection) | — | BP §27, §30; SEC-AUTH-005 |
| Verify second factor | "Verify" | same | M1 · verify second factor → creates the admin session | Yes | — | D-002 |
| Set up second factor | "Set up" | same (own account) | M1 · enrol second factor | Yes | — | D-002; OQ-051 |
| Sign out | "Sign out" (header menu, every page) | any signed-in staff | M1 · revoke current session | Yes | — | BP §27 (revocation) |

**States**
- Loading: the button shows progress and inputs are disabled until the server answers.
- Empty: the first visit shows the empty form.
- Success: the portal opens A02 only after the server has created the session. The server's list of sub-roles and permissions builds the navigation (§1.2).
- Error: wrong details → generic error (above). Locked or blocked account → "This account cannot sign in. Contact a Super Admin." (BP §27 blocked account; lockout values OQ-028). Limits not configured → "Sign-in is not available. Contact the Technical Admin." (`LIMIT_NOT_CONFIGURED`, §1.1). Network → "Cannot reach Kaam Karo. Check your connection and try again." + Retry.
- Pending/unknown: timeout after submit → "We could not confirm your sign-in. Try again." No partial session is kept; a retry starts again from step 1.

**PII / open:** the second-factor secret and one-time codes are never shown or logged (§1.6). Sign-in method, factor reset, idle timeout: **OQ-051**; limits: **OQ-028**.

---

### A02 — Dashboard

**Purpose:** marketplace health snapshot and operational alerts for the current day (BP §14, §11 step 44, §39 daily operations).
**Requirement IDs:** OPS-ADMIN-002, INFRA-005, HEALTH-001…020 (summary only), RATING-ENF-008.

Every widget is an aggregate count with a link. A widget is shown only if the user may open the screen it links to (§2). Technical Admin sees only the system widgets (footnote 2).

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| City selector | select | Listed cities; default Lahore | "City" | BP §61 (per city); D-007 |
| Verification queue | count + oldest age → A04 | — | "Providers waiting for verification" | BP §39 daily |
| Unassigned / rejected / expired jobs today | 3 counts → A07 filtered | — | "Unassigned jobs", "Rejected jobs", "Expired jobs" | BP §39 daily |
| No-supply requests today | count → A25 | — | "Requests with no matching provider" | BP §61.3; MATCH-GAP-001 |
| Payment exceptions | count → A09 Exceptions | — | "Payment exceptions" | BP §39 daily; PAY-005 |
| "Pay company" submissions waiting | count + oldest age → A09 queue | — | "Commission payments to verify" | D-021; LEDGER-PAY-003 |
| Notification failures | count → A19 | — | "Notification failures" | BP §39 daily ("notification exceptions") |
| Safety incidents and major complaints | count → A12 (safety flag) / A10 | — | "Open safety cases" | BP §39 daily; BOOK-CANCEL-006 |
| Low provider availability | list of categories → A25 | — | "Categories with low provider availability" | BP §39 daily |
| Key health metrics (today) | small numbers → A25 | — | e.g. "Request-to-match rate" | BP §61; OPS-ADMIN-002 |
| Rating enforcement mode | label | "Dry-run" while the D-017 numbers are `null` | "Rating enforcement: Dry-run" | D-017; RATING-ENF-008 |
| System status | OK / degraded / down → A19 | — | "System status" | BP §14 A19; REL-011 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Refresh | "Refresh" | all with `view` | read-only aggregate endpoints of each owner module | No (read) | — | BP §11 step 44 |
| Open linked screen | (widget click) | per target screen | — | No | — | §2 |

**States**
- Loading: each widget loads on its own with a skeleton; one slow widget never blocks the page (BP §62.3).
- Empty: a widget with zero items shows "Nothing waiting".
- Success: numbers with the time of the last update ("Updated 10:42").
- Error: the failing widget shows "Could not load — Retry"; the other widgets stay visible.
- Pending/unknown: not applicable (no writes). A stale widget shows its last update time.

**PII / open:** aggregates only. Thresholds that would turn a widget red are business values that nobody has decided, so no colour thresholds are applied.

---

### A03 — Users

**Purpose:** search customers and providers and apply account controls: suspend and reinstate; restrict pending OQ-054 (BP §14, §8.3, §11 step 50).
**Requirement IDs:** OPS-ADMIN-003, ROLE-003, SEC-AUTH-006, SEC-AUTH-008, RATING-ENF-006, MATCH-FAIR-004, LEDGER-NEG-004, LEDGER-PAY-006, ADMIN-ROLE-002, ADMIN-ROLE-006.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Search | text | Phone, name or user ID; server-side; results masked; a phone search is read-audited (§1.3) | "Search by phone, name or ID" | OPS-ADMIN-003; SEC-REVIEW #8, #16 |
| Filter: user type | select | Customer / Provider | "Type" | BP §8.1, §8.2 |
| Filter: account status | select | Active / Suspended / Blocked (low rating) / Deletion requested / Anonymised | "Account status" | BP §8.3, §27; D-014; SEC-AUTH-008 |
| Filter: verification level (providers) | select | Basic / Verified / Business Verified | "Verification level" | BP §22.1 |
| Filter: owes company (providers) | yes/no | — | "Owes company" | D-020 |
| Column: user ID, name | text | — | "ID", "Name" | BP §25 |
| Column: phone | masked | Always masked (§1.6) | "Phone" | BP §20; OQ-055 |
| Column: area | text | Area level only | "Area" | BP §21 |
| Column: account status | chip with text | — | "Status" | BP §27 |
| Column: verification level | chip | — | "Level" | BP §22.1 |
| Column: rating (providers) | average + count | Same calculation as the apps | "Rating" | BP §19; REV-006 |
| Column: rating standing (providers) | Good standing / Warning 1 / Warning 2 / Blocked | — | "Rating standing" | D-014; ARCH §6.7 |
| Column: owes company (providers) | yes/no only (the amount is in A09) | — | "Owes company" | D-020; LEDGER-006 |
| Column: joined | date | — | "Joined" | BP §25 |
| Detail: links | A07 bookings, A12 tickets, A10 cases, A11 reviews, A17 audit (if allowed) | — | "Bookings", "Tickets", … | BP §60.3 |
| Detail: account history | suspend / reinstate / block events with reason | Read-only | "Account history" | BP §68; MATCH-FAIR-004 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Suspend account | "Suspend" | OPS, RT | M1 Identity · suspend(user, reason) — **revokes all the user's sessions** so `ACCOUNT_BLOCKED` applies at once | Yes | R + C (confirm shows the count of open bookings, OQ-054) | BP §8.3, §27; ROLE-003; SEC-AUTH-006; SEC-REVIEW #24 |
| Reinstate account | "Reinstate" | OPS, RT | M1 · reinstate(user, reason); for a `LOW_RATING` block M3 Trust · reinstate(provider, reason) | Yes | R + C | BP §8.3; D-014; RATING-ENF-006 |
| Restrict account | — | **not offered** | — | — | — | OQ-054 |
| Open linked record | (link) | per target screen | — | No | — | §2 |

There is **no** action that clears the unpaid-commission block. Only a Finance-approved or gateway-confirmed credit clears it (LEDGER-PAY-006; permission-policy KK-T4).

**States**
- Loading: table skeleton; the search box stays usable.
- Empty: "No users match this search." + "Clear filters".
- Success: list; after Suspend/Reinstate the row shows the new status returned by the server, with the time.
- Error: read error → message + Retry. Write refused → server message (422 "Reason is required"; 409 "Account changed — reload").
- Pending/unknown: "Result unknown — checking…"; the row is re-read; the button stays disabled until the server state is known.

**PII / open:** masked phone, area-level address (**OQ-055**). "Restrict" and the effect of a suspension on scheduled bookings: **OQ-054**. Super Admin access: **OQ-052**.

---

### A04 — Provider verification

**Purpose:** review provider verification submissions and decide the level (BP §14, §11 step 45, §22.1, §39 daily).
**Requirement IDs:** OPS-ADMIN-004, TRUST-VER-001…004, CAT-SVC-005, CFG-RULE-007, PROV-CREW-006, ADMIN-ROLE-006.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Queue (default sort: oldest first) | table | Server-sorted by age | "Verification queue" | OPS-ADMIN-004; TRUST-VER-002 |
| Filter: status | select | Pending / Approved / Rejected | "Status" | BP §22.1 |
| Filter: requested level | select | Verified / Business Verified (Specialized Verified is not launch) | "Requested level" | BP §22.1; TRUST-VER-004 |
| Filter: category | select | Catalog categories | "Category" | BP §22.1 (per category) |
| Column: provider name, ID, phone (masked) | text | — | "Provider", "ID", "Phone" | BP §25 |
| Column: current / requested level | chips | — | "Current", "Requested" | BP §22.1 |
| Column: services applied for | list | — | "Services" | BP §22 |
| Column: submitted at / waiting time | date, duration | — | "Submitted", "Waiting" | OPS-ADMIN-004 |
| Detail: required items for these categories | list from config; "Not set — TODO(OWNER)" while `null` (Risk/Trust then decides manually) | — | "Required for this category" | CFG-RULE-007; OQ-015 |
| Detail: submitted documents / evidence | file viewer via signed URL — **Risk/Trust only**; each opening is read-audited (§1.3) | — | "Documents" | BP §22; permission-policy §7; SEC-REVIEW #16 |
| Detail: team leader note | "Only the team leader (this account) is verified" | — | "Team leader" | D-018; PROV-CREW-006 |
| Detail: usual team size (optional) | number | — | "Usual team size" | ARCH §5.6 |
| Detail: decision history | decision, level, reason, reviewer, time | Read-only | "History" | BP §26, §68 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Approve to a level | "Approve as Verified" / "Approve as Business Verified" | RT | M3 Trust · verification decide(APPROVE, level, reason) — idempotent | Yes | R + C | BP §22.1; TRUST-VER-002/003 |
| Reject | "Reject" | RT | M3 · verification decide(REJECT, reason) | Yes | R + C | BP §22.1; OPS-ADMIN-004 |
| Request more information | — | **not offered** | — | — | — | OQ-057 |

**States**
- Loading: queue skeleton; the document viewer shows a placeholder per file while its signed URL loads.
- Empty: "No providers waiting for verification."
- Success: after a decision the item leaves the Pending view and shows the server's new level and the reviewer.
- Error: read → Retry. Document URL failed → "Could not open this file — Retry" for that file only. Write refused → server message (e.g. 409 "Already decided by another reviewer").
- Pending/unknown: decision sent, no answer → "Result unknown — checking…", buttons disabled, item re-read.

**PII / open:** documents are Risk/Trust only; Operations sees status and age only (footnote 3). Required items per category: **OQ-015**. ARCH §7 lists no event for a verification decision, so how the provider is told is a follow-up for A00/A10 (see handoff). Super Admin / Support access: **OQ-052**.

---

### A05 — Categories

**Purpose:** manage the category hierarchy inside the BP §63 tree (BP §14, §64).
**Requirement IDs:** OPS-ADMIN-005, SCOPE-CAT-001, CAT-SVC-012, CFG-RULE-001, ADMIN-ROLE-005.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Category tree | tree (family → child) | Read from catalog; seeded from BP §63 | "Categories" | BP §25 (parent/child), §63, §64 |
| Name (English) | text | Required | "Name (English)" | BP §37; CAT-SVC-012 |
| Name (Urdu) | text, RTL input | Required | "Name (Urdu)" | BP §78; CAT-SVC-012 |
| Display order | number / drag | Integer; unique among siblings | "Order" | OPS-ADMIN-005 |
| Image / icon | image via file picker | Type/size limits from config (D-011) | "Image" | BP §4.2 (images/examples) |
| Active in city | read-only chips + link to A23 | — | "Active in" | BP §64; CFG-RULE-001 |
| Number of services | count → A06 | — | "Services" | BP §64 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Edit category text / image | "Save" | SA, CM | M4 Catalog · update category | Yes | R | BP §8.4 CM; OPS-ADMIN-005 |
| Reorder | "Save order" | SA, CM | M4 · reorder categories | Yes | R | OPS-ADMIN-005 |
| Activate / deactivate per city | (link) "Manage in City activation" | per A23 | — | — | — | CFG-RULE-001 |

There is no "create top-level family" action (SCOPE-CAT-001; BP §65). Creating, moving or deleting categories is not specified for launch, so it is not offered.

**States**
- Loading: tree skeleton.
- Empty: should never happen after the T2.6 seed; if the server returns none → "No categories found. The catalog seed may be missing."
- Success: tree; after Save the server's saved names and version are shown.
- Error: read → Retry; save → server message (422 "Urdu name is required"; 409 changed by someone else).
- Pending/unknown: "Saving… result unknown — checking"; the form keeps the input until the server state is re-read.

**PII / open:** no PII (public content). Image limits: D-011 / OQ-004.

---

### A06 — Services

**Purpose:** manage the service catalog configuration and text (BP §14, §4.2, §64).
**Requirement IDs:** OPS-ADMIN-006, CAT-SVC-001…012, CFG-RULE-007, SCOPE-CAT-001, FARE-005, MATCH-ELIG-074.

Edit rights per field: **[S]** = SA; **[C]** = SA + CM (footnote 4); **[R]** = SA + RT (footnote 5). All other roles with access: view.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| List filters: category, price model, selling mode, active in city | selects | — | "Category", "Price model", "Selling mode", "Active in" | BP §64 |
| Name en / ur [C] | text ×2 | Both required | "Service name (English)", "Service name (Urdu)" | BP §4.2, §37, §78; CAT-SVC-012 |
| Category | read-only | — | "Category" | BP §4.2 |
| Description en / ur [C] | text ×2 | Both required | "Description (English)", "Description (Urdu)" | BP §4.2; CAT-SVC-011 |
| Price model [S] | select FIXED / FROM / INSPECTION_QUOTE | Required | "Price model" | BP §4.1, §17; CAT-SVC-001; OQ-010 |
| Selling modes [S] | multi-select INSTANT / CHOOSE_SUPPLIER / REQUEST_QUOTES | A non-empty set is required to activate | "Selling modes" | BP §53, §64; CAT-SVC-002 |
| Inspection expected [S] | yes/no | — | "Inspection expected" | BP §4.2, §64; CAT-SVC-003 |
| Quote required [S] | yes/no | — | "Quote required" | BP §64; CAT-SVC-003 |
| Emergency allowed [S] | yes/no | — | "Emergency mode allowed" | BP §58.3, §64; CAT-SVC-004 |
| Verification required [R] | select level | "Not set — TODO(OWNER)" allowed (OQ-015) | "Verification required" | BP §22.1, §64; CAT-SVC-005; CFG-RULE-007 |
| Included / Not included en / ur [C] | lists ×4 | — | "What is included", "What is not included" | BP §4.2, §18; CAT-SVC-008 |
| Pricing unit [S] | select from the configured unit list | Required | "Priced per" | BP §4.2; CAT-SVC-009 |
| Materials policy [S] | select INCLUDED / CUSTOMER_PROVIDED / CHARGED_SEPARATELY | Required | "Materials" | BP §4.2, §17; CAT-SVC-010 |
| Warranty / rework policy en / ur [C] | text ×2, optional | — | "Warranty / rework policy" | BP §4.2; CAT-SVC-010 |
| Consumables display policy [S] | select: listed separately / grouped | — | "Consumables on the bill" | BP §58.1; FARE-005 |
| Estimated duration [C] | duration | — | "Usual duration" | BP §4.2; CAT-SVC-011 |
| Availability hours [S] | time ranges | — | "Service hours" | BP §4.2; CAT-SVC-011 |
| Minimum visit / call-out charge, if applicable [S] | money (PKR), nullable | ≥ 0 when set | "Minimum visit charge" | BP §4.2; CAT-SVC-011 |
| Required customer information / photos | read-only summary + link to A24 | — | "Customer questions" | BP §4.2, §64; CAT-SVC-006 |
| Cancellation policy reference [S] | select policy reference | — | "Cancellation policy" | BP §4.2; CAT-SVC-011 |
| Eligibility, safety and documentation requirements [S] | text | — | "Safety and documentation requirements" | BP §64 |
| Equivalent skills [S] | multi-select provider skills | — | "Equivalent skills" | BP §54.1 rule 74, §64; CAT-SVC-012 |
| Images / examples [C] | images via file picker | Limits from config (D-011) | "Images" | BP §4.2 |
| Active in city | read-only + link to A23 | — | "Active in" | BP §64 |

Price amounts are set by providers (BP §8.2 "Define services, prices"). Platform-wide minimum/maximum price thresholds are in A13 (CFG-RULE-002).

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Save service | "Save" | SA (all fields); CM ([C] fields); RT ([R] field). The server rejects a field outside the caller's set with 403 | M4 Catalog · update service | Yes (before/after per field) | R | BP §8.4; CAT-SVC-012 |
| Activate per city | (link) "Manage in City activation" | per A23 | — | — | — | BP §64 |

No "create service" action: the catalog is the BP §63 seed (SCOPE-CAT-001).

**States**
- Loading: list/form skeleton.
- Empty: "No services match these filters." + "Clear filters".
- Success: saved values re-read from the server; the apps show them after refresh, with no release (CAT-SVC-012).
- Error: 422 per field (e.g. "Urdu name is required"; "A service with no selling mode cannot be active"); 403 for a field outside the role; 409 version conflict.
- Pending/unknown: "Saving… result unknown — checking"; inputs kept.

**PII / open:** no PII. Price/selling model split: OQ-010. Verification items: OQ-015. Image limits: OQ-004.

---

### A07 — Bookings

**Purpose:** search, filter and inspect jobs, including unassigned, rejected and expired ones, and apply the allowed policy actions (BP §14, §8.3, §11 step 46, §39 daily).
**Requirement IDs:** OPS-ADMIN-007, BOOK-STATUS-001…017, BOOK-CANCEL-001…006, LEDGER-NEG-005/006, PROV-CREW-001…003, CHAT-001, DATA-002, MATCH-MODE-001, MATCH-FAIR-004.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Filter: status | multi-select of BP §15 statuses + Rejected, No-show | — | "Status" | BP §15; K-05 |
| Filters: city, category, service, date range | selects / date | — | "City", "Category", "Service", "Date" | OPS-ADMIN-007 |
| Quick filters | Unassigned · Rejected · Expired · Disputed · Start blocked (unpaid commission) · No-show to review · Safety | — | as listed | BP §39; LEDGER-NEG-006; BOOK-CANCEL-005/006 |
| Search | booking ID | — | "Booking ID" | OPS-ADMIN-007 |
| Column: booking ID, service, category | text | — | "Booking", "Service" | BP §25 |
| Column: status | chip (server value) | — | "Status" | BP §15.1 |
| Column: customer, provider | name + masked phone | — | "Customer", "Provider" | BP §20; OQ-055 |
| Column: area | area level | — | "Area" | BP §21 |
| Column: created, scheduled time | date-time | — | "Created", "Scheduled" | BP §15 |
| Column: payment | status + "Paid by" Cash/Digital | — | "Payment" | D-016; LEDGER-006 |
| Detail: status timeline | Job Events (actor, from, to, time, reason) | Read-only | "History" | BP §15, §66; DATA-002 |
| Detail: request | summary, AI interpretation (link A26), media (signed URLs; opening is read-audited; Support only in case context, footnote 6) | Read-only | "Customer request" | BP §66, §67; SEC-REVIEW #16, #17 |
| Detail: match candidates | eligibility result, reasons, distance/ETA, `ranking_version` | Read-only | "Matching" | BP §54 ("explainable internally"), §66 |
| Detail: quotes / offers | link to A08 | — | "Quotes" | BP §18, §53 |
| Detail: fare lines | type, amount, proposed by, state Proposed/Approved/Rejected/Final | Read-only | "Charges" | BP §58.1, §58.2; FARE-012 |
| Detail: crew size | "N workers will come" | Read-only | "Crew size" | D-004; PROV-CREW-001…003 |
| Detail: inspection visit time | date-time (in Quote Pending) | Read-only | "Inspection visit" | D-028 |
| Detail: conversation | chat, read-only; phone numbers in the text masked; opening is read-audited; Support only in case context (footnote 6) | — | "Messages" | BP §20; CHAT-001; SEC-REVIEW #16–#18 |
| Detail: linked tickets / disputes | links A12 / A10 | — | "Cases" | BP §40 |
| Detail: start blocked flag | "Provider owes the company; this job cannot start" | Read-only | "Start blocked" | D-021; LEDGER-NEG-005/006 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Cancel booking | "Cancel booking" (only when the server lists it in `allowedNextActions`) | OPS, SUP | M9 Booking · requestTransition(CANCEL, party = Customer or Provider, reason) | Yes (Job Event + audit) | R + party + C | BP §8.3, §11 step 50, §16, §40 L2; BOOK-STATUS-013 |
| Record no-show after review | "Record no-show" (party Customer / Provider) | OPS, SUP | M9 · requestTransition(NO_SHOW, party, reason) | Yes | R + party + C | BP §16; BOOK-CANCEL-004/005; BOOK-STATUS-017 |
| Handle an unpaid start (grace not set) | uses "Cancel booking" with party = Provider | OPS | as Cancel | Yes | R + C | LEDGER-NEG-006 (flagged to Operations while `ledger.unpaid_start_grace_minutes` is `null`) |

Admins cannot set any other status, edit prices or fare lines, or assign a provider (BP §15.1, §18; D-005; MATCH-MODE-001).

**States**
- Loading: table skeleton; detail tabs (timeline, matching, chat) load separately so one slow part does not block the rest.
- Empty: "No bookings match these filters." + "Clear filters".
- Success: list/detail; after an action the status chip and timeline show the server's new state and the new Job Event.
- Error: read → Retry; action refused → server message (409 `TRANSITION_NOT_ALLOWED` → "This booking has moved on — reload").
- Pending/unknown: "Result unknown — checking…"; the booking is re-read; no optimistic status change.

**PII / open:** masked phones, area-level address (OQ-055). Support's case-context limit (footnote 6) and Super Admin / Finance access: OQ-052.

---

### A08 — Quotes

**Purpose:** review quote exceptions: expired, disputed, and changed after acceptance (BP §14).
**Requirement IDs:** OPS-ADMIN-008, QUOTE-001…009, FARE-012, PROV-CREW-004, ABUSE-005.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Filter: exception type | select Expired / Disputed / Changed after acceptance | — | "Exception" | OPS-ADMIN-008 |
| Filters: category, provider, date | selects / date | — | "Category", "Provider", "Date" | BP §14 |
| Column: quote ID, booking ID | links | — | "Quote", "Booking" | BP §66 |
| Column: provider | name | — | "Provider" | BP §66 |
| Column: quote status | Draft / Sent / Accepted / Declined / Expired / Withdrawn | — | "Status" | ARCH §6.6 |
| Column: valid until | date-time | — | "Valid until" | BP §18; QUOTE-004 |
| Column: total, crew size | PKR, number | — | "Total", "Crew size" | BP §66; D-004 |
| Detail: line items | type, description, amount, proposed by, approval state | Read-only | "Lines" | BP §58.1, §66; FARE-012 |
| Detail: inclusions, exclusions, duration | text | Read-only | "Included", "Not included", "Duration" | BP §18; QUOTE-005 |
| Detail: customer response + timestamps | text | Read-only | "Customer response" | BP §66 |
| Detail: changes after acceptance | proposed lines / crew-size change with approval state | Read-only | "Changes after acceptance" | BP §18 step 62; QUOTE-008; PROV-CREW-004 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Open booking / case | (links) "Open booking", "Open case" | per A07 / A10 / A12 | — | No | — | BP §60.3 |
| Any change to a quote | — | **not offered** | — | — | — | OQ-057; BP §18 (the quote is between customer and provider) |

**States**
- Loading: table skeleton.
- Empty: "No quote exceptions."
- Success: list/detail from the server.
- Error: read → Retry.
- Pending/unknown: not applicable (no writes at launch).

**PII / open:** customer masked. Actions beyond view: **OQ-057**. Support / Finance / Super Admin access: OQ-052.

---

### A09 — Payments

**Purpose:** payment status and exceptions, provider accounts (ledger), settlements and the **Finance verification queue** for provider payments to the company (BP §14, §8.4 Finance; D-016, D-020, D-021).
**Requirement IDs:** OPS-ADMIN-009, PAY-001…009, PAY-TIMING-001, COMM-004, LEDGER-001…007, LEDGER-NEG-001…006, LEDGER-PAY-001…007, FARE-010, ABUSE-007, ADMIN-ROLE-004.

Tabs: **Transactions · Exceptions · Provider accounts · Commission payments to verify · Settlements.**

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Transactions: payment ID, booking, amount, method (Cash/Digital), status, gateway reference, times | table | Read-only | "Payment", "Method", "Status", … | BP §25, §66; PAY-001; D-016 |
| Transactions: "Unknown — waiting for gateway" | chip | — | "Unknown" | BP §31.1 |
| Exceptions: reconciliation mismatches | table | Read-only | "Reconciliation mismatches" | PAY-005; BP §30 |
| Exceptions: failed / stuck payments | table | Read-only | "Failed or stuck payments" | BP §39; INFRA-005 |
| Exceptions: "Tax rule not set" | flag per bill while the tax config is `null` | Read-only | "Tax rule not set" | D-029; FARE-010; OQ-035 |
| Exceptions: DIGITAL recorded, no gateway confirmation | row per booking where the provider recorded DIGITAL and no gateway confirmation arrived within `ledger.digital_unconfirmed_flag_hours` (`null`, TODO(OWNER)); the same case raises an A18 payment-fraud flag. While the value is `null`, the row is listed with its waiting time and no time trigger | Read-only | "Digital payment not received" | BP §30; D-016; ABUSE-007; threat KK-T5 (SEC-REVIEW #6); **OQ-077** |
| Provider accounts: provider, balance, "Owes company" | table | Read-only | "Balance", "Owes company" | D-016, D-020; LEDGER-006 |
| Provider accounts: ledger rows (debit / credit / reversal / settlement, amount, booking, commission, time, reason) | table | Read-only; append-only | "Account history" | BP §26; LEDGER-003…006; COMM-004 |
| Verify queue: submission ID, provider (name, ID, masked phone) | table, oldest first | — | "Submission", "Provider" | D-021; LEDGER-PAY-003; ARCH §6.8 (speed note) |
| Verify queue: amount (as recorded by M11), amount owed now | PKR | Read-only | "Amount", "Owed now" | LEDGER-PAY-003 |
| Verify queue: transaction ID | text | Read-only | "Transaction ID" | D-021; LEDGER-PAY-002 |
| Verify queue: duplicate transaction ID warning | flag | Read-only | "Transaction ID used before" | permission-policy KK-T2 `[DERIVED]` |
| Verify queue: screenshot | image via signed URL, **Finance only**; each opening is read-audited (§1.3) | — | "Screenshot" | D-021; permission-policy KK-T2; SEC-REVIEW #16 |
| Verify queue: submitted at / waiting time | date-time, duration (no SLA colour: time limit not set) | — | "Submitted", "Waiting" | D-022; OQ-007 |
| Verify queue: company account details (reference) | read-only text from config | — | "Company account" | LEDGER-PAY-001 |
| Settlements: positive balances, settlement rows | table | Read-only | "Ready to settle", "Settlements" | PAY-007; LEDGER-007 |
| Filters: date, method, status, provider, city | selects | — | "Date", "Method", … | BP §14 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Approve commission payment | "Approve payment" | FIN | M11 Payments · commission payment approve(submission, reason) — idempotent; writes one credit ledger row; emits `provider.balance_cleared` when the balance is ≥ 0 | Yes | R + C (shows amount, balance before → after) | D-021; LEDGER-PAY-004/005/007 |
| Reject commission payment | "Reject payment" | FIN | M11 · commission payment reject(submission, reason) — emits `provider.commission_payment_rejected` | Yes | R + C | D-021; LEDGER-PAY-004/007 |
| Record manual settlement | "Record settlement" | FIN | M11 · settlement create(provider, amount ≤ available balance, reference, reason) via the `PayoutProvider` fake or manual — idempotent | Yes | R + C | BP §13 P15/P16; PAY-007; LEDGER-007; ARCH §18 |
| Reverse a ledger row | "Create correction" | FIN | M11 · reversal row linked to **one** original ledger row, full or partial, for at most that row's **not-yet-reversed amount** (more → 422); the original never changes — idempotent. There is **no free-standing credit or adjustment**, so a correction can never act as a credit that clears the unpaid-commission block (only "Approve payment" or a gateway-confirmed credit does) | Yes | R + C | BP §26, §30; PAY-004; LEDGER-005; LEDGER-PAY-006; KK-T4; SEC-REVIEW #5 |
| Open booking | (link) | per A07 | — | No | — | §2 |

The provider's own claim never clears the block; only "Approve payment" (or a gateway-confirmed credit) does (LEDGER-PAY-006). Approving an amount different from the submitted amount is not offered (**OQ-059**).

**States**
- Loading: per-tab skeleton; the screenshot shows a placeholder until its signed URL loads.
- Empty: per tab — "No payment exceptions", "No commission payments to verify", "No balances ready to settle".
- Success: values from the server; after Approve the submission shows "Approved", the new ledger row and the new balance, all from the server.
- Error: read → Retry; write refused → server message (422 "Reason is required"; 409 "Already decided"; 409 "Balance is not positive" for a settlement).
- Pending/unknown: "Result unknown — checking…"; buttons disabled; the item is re-read, and any retry reuses the same idempotency key so it cannot double-credit.

**PII / open:** masked phones; screenshot Finance-only. Verification time limit: **OQ-007** (D-022). Amount mismatch: **OQ-059**. Tax: **OQ-035**. DIGITAL-unconfirmed time value: **OQ-077**. Gateway/payout vendors: D-008 (OQ-001). Operations / Support / Risk/Trust / Super Admin access: OQ-052.

---
### A10 — Refunds/disputes

**Purpose:** dispute case workflow from opening to outcome, and refunds linked to the outcome (BP §14, §11 step 47, §40).
**Requirement IDs:** OPS-ADMIN-010, SUP-002, SUP-003, SUP-004, PAY-006, BOOK-STATUS-012, CHAT-001, NOTIF-007.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Filters: status, outcome, level, city, date, safety flag | selects | — | "Status", "Outcome", "Level", … | BP §40; SUP-003 |
| Column: case ID, booking ID | links | — | "Case", "Booking" | BP §25 (Dispute: Booking + parties) |
| Column: opened by (Customer / Provider), opened at | text, date | — | "Opened by", "Opened" | BP §25 |
| Column: level L2–L5 | chip | — | "Level" | BP §40; SUP-002 |
| Column: outcome | Resolved / Refunded / Rework / Closed, or "Open" | — | "Outcome" | BP §15; SUP-003; K-05 |
| Column: linked refund | amount + status | — | "Refund" | BP §25; SUP-004 |
| Detail: booking summary + Job Events | read-only | — | "Booking" | BP §15, §66 |
| Detail: complaint and evidence | text (phone numbers masked) + media via signed URL; opening media is read-audited | Read-only | "Complaint" | BP §12 C29; SUP-005; SEC-REVIEW #16, #18 |
| Detail: conversation | chat, read-only; phone numbers masked; opening is read-audited | — | "Messages" | BP §20; CHAT-001; SEC-REVIEW #16, #18 |
| Detail: fare lines and payment | read-only (method, paid amount, refundable amount from M11) | — | "Charges and payment" | BP §58; PAY-006 |
| Detail: case updates timeline | list (author, text, time) | — | "Case updates" | BP §24, §80 ("Case update") |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Add case update | "Send update" | SUP, OPS, RT | M16 Support · dispute add update(text, reason) → `dispute.updated` notification to both parties. The text must not contain payment instructions (§1.6) | Yes | R (text also required) | BP §24, §30, §80; NOTIF-007; SEC-REVIEW #22, #25 |
| Escalate level | "Escalate" | SUP, OPS, RT | M16 · dispute escalate(level, reason) | Yes | R | BP §40; SUP-002 |
| Record outcome: Resolved / Rework / Closed | "Resolve", "Send back for rework", "Close" | OPS (L3), RT (L4) | M16 · dispute decide(outcome, reason); Rework → M9 Disputed → In Progress | Yes | R + C | BP §15, §40; SUP-003; BOOK-STATUS-012 |
| Record outcome: Refunded | "Decide refund" | OPS (L3), RT (L4) | M16 · dispute decide(REFUNDED, reason) → refund request for Finance | Yes | R + C | BP §11 step 47, §40; SUP-004 |
| Issue refund | "Issue refund" (only for a gateway-confirmed digital payment) | FIN | M11 Payments · refund create(dispute, reason) — reversal row linked to payment, booking and dispute; idempotent; emits `refund.issued` | Yes | R + C | BP §8.4 Finance, §26; PAY-006; SUP-004 |

**States**
- Loading: list skeleton; detail sections load separately.
- Empty: "No open cases." (with "Show closed cases").
- Success: after a decision the case shows the outcome, decider and time from the server; after "Issue refund" the refund row and its status come from the server.
- Error: read → Retry; write refused → server message (409 "Outcome already recorded"; 409 "Nothing refundable on this booking"; 422 "Reason is required").
- Pending/unknown: "Result unknown — checking…"; the case is re-read; a refund retry reuses the same idempotency key.

**PII / open:** masked phones; area-level address (OQ-055). Refunds on cash-paid bookings and partial refunds: **OQ-058**. Staff-written case updates are sent as typed (English admin UI, D-026); the notification wrapper comes from the en/ur template in A15. Super Admin access: OQ-052.

---

### A11 — Reviews/moderation

**Purpose:** content controls for reviews, provider responses and content held by the moderation step (BP §14, §11 step 49, §19, §67).
**Requirement IDs:** OPS-ADMIN-011, REV-003, REV-004, REV-005, REV-006, RATING-ENF-002, REQ-AI-009, ADMIN-ROLE-006.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Filter: item type | Review / Provider response / Held message or upload / Provider service or profile text | — | "Item type" | BP §11 step 49, §19, §67; REV-003; REQ-AI-009 |
| Filter: source | User flag / Automatic moderation | — | "Source" | BP §19; REV-004; REQ-AI-009 |
| Filters: status, date | selects | — | "Status", "Date" | BP §19 |
| Column: excerpt | text (in the language written) | — | "Content" | BP §19 |
| Column: rating (reviews) | 1–5 | — | "Rating" | BP §19 |
| Column: author, subject | name, masked phone | — | "Author", "About" | BP §19 |
| Column: flag reason / moderation reason | text | — | "Reason" | BP §19; REV-004 |
| Column: booking | link to A07 | — | "Booking" | BP §19 (review tied to the transaction) |
| Column: flagged at, status | date, chip | — | "Flagged", "Status" | BP §19 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Hide review / response | "Hide" | RT | M12 Reviews · moderate(HIDE, reason) — hidden reviews leave the public average and rating enforcement | Yes | R + C | BP §19; REV-005; RATING-ENF-002 |
| Keep (dismiss flag) | "Keep visible" | RT | M12 · moderate(KEEP, reason) | Yes | R | BP §19; REV-005 |
| Release held content | "Release" | RT | M13/M7 · moderation release(item, reason) — content is delivered | Yes | R | BP §67; REQ-AI-009 |
| Block held content | "Block" | RT | M13/M7 · moderation block(item, reason) — never delivered | Yes | R + C | BP §67; REQ-AI-009 |

Admins cannot edit review text or change a rating (BP §19 "Do not allow providers to buy or manufacture ratings"; REV-007).

**States**
- Loading: list skeleton.
- Empty: "Nothing to moderate."
- Success: the item leaves the open queue with the decision returned by the server.
- Error: read → Retry; write refused → server message (409 "Already moderated").
- Pending/unknown: "Result unknown — checking…"; item re-read.

**PII / open:** the content may itself contain private data (the reason it was flagged); it is shown only to roles with access. Super Admin / Operations / Support access: OQ-052.

---

### A12 — Support

**Purpose:** ticket queue with level and SLA status (BP §14, §40; BP §12 C28, §13 P20).
**Requirement IDs:** OPS-ADMIN-012, SUP-001, SUP-002, SUP-005, CFG-RULE-012, REQ-AI-014, BOOK-CANCEL-006, MATCH-GAP-001.

Level → handling role (BP §40): L2 Support, L3 Operations, L4 Risk/Trust and Finance, L5 **OQ-061** (default Super Admin). L1 is self-help in the apps.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Filters: level, category, status, SLA status, safety flag, assigned to me, requester type | selects | — | "Level", "Category", … | BP §40; SUP-002; CFG-RULE-012 |
| Column: ticket ID, requester (Customer / Provider, name, masked phone) | text | — | "Ticket", "Requester" | BP §25 |
| Column: category | from config | Category list `null` → "Uncategorised" | "Category" | BP §40, §42; CFG-RULE-012; OQ-018 |
| Column: level, owning role, assigned staff | chips | — | "Level", "Team", "Assigned to" | BP §40; SUP-002 |
| Column: SLA status | On track / Breached / "SLA not set" (while `null`, nothing is flagged) | — | "SLA" | CFG-RULE-012; OQ-018 |
| Column: source | App ticket / Complaint / Safety stop / No-supply callback | — | "Source" | BP §12 C28/C29, §16, §61.3; OQ-021 |
| Column: booking | link to A07 | — | "Booking" | BP §25 (Support Ticket: User + Booking) |
| Column: created, status | date, chip | — | "Created", "Status" | BP §25 |
| Detail: description (phone numbers masked), evidence (signed URLs; opening is read-audited), case updates | read-only | — | "Details", "Updates" | SUP-005; SEC-REVIEW #16, #18 |
| Detail: AI-suggested category | label "Suggested: …" — suggestion only | — | "Suggested category" | BP §56.3; REQ-AI-014 |
| FAQ tab (OQ-056): entries question/answer en + ur, audience Customer/Provider, order | form | Both languages required | "FAQ" | BP §8.4 CM "FAQs", §40 L1; SUP-001; OQ-056 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Assign to me | "Take ticket" | role that owns the ticket's level (SUP L2, OPS L3, RT/FIN L4) | M16 Support · ticket assign(self, reason) | Yes | R | BP §40; SUP-002 `[DERIVED]`; SEC-REVIEW #22 |
| Send update to requester | "Send update" | same | M16 · ticket add update(text, reason) → "Case update" notification. The text must not contain payment instructions (§1.6) | Yes | R (text also required) | BP §24, §30, §80; SEC-REVIEW #22, #25 |
| Confirm / change category | "Set category" | same | M16 · ticket set category(category, reason) | Yes | R | REQ-AI-014 (a person confirms); SEC-REVIEW #22 |
| Escalate | "Escalate to L3 / L4 / L5" | same | M16 · ticket escalate(level, reason) | Yes | R | BP §40; SUP-002 |
| Close ticket | "Close" | same | M16 · ticket close(resolution note) | Yes | R | BP §40 |
| Edit FAQ | "Save FAQ" | CM per OQ-056 (server: `none` until answered; SA edits as "All configuration") | M16 · FAQ update | Yes | R | BP §8.4; OQ-056 |

**States**
- Loading: queue skeleton.
- Empty: "No open tickets at your level." (+ "Show all levels" if permitted).
- Success: after an action the ticket shows the server's new level/assignee/status.
- Error: read → Retry; write refused → server message (409 "Taken by another agent"; 403 "This level belongs to another team").
- Pending/unknown: "Result unknown — checking…"; ticket re-read.

**PII / open:** masked phone (OQ-055). Categories and SLA targets: **OQ-018**. FAQ editing place: **OQ-056**. L5 handler: **OQ-061**. Supply-gap callback ticket: **OQ-021**. Super Admin access: OQ-052.

---

### A13 — Fees/commissions

**Purpose:** controlled financial configuration (BP §14, §42; D-006, D-015, D-020, D-021, D-022, D-023, D-025, D-029).
**Requirement IDs:** OPS-ADMIN-013, CFG-RULE-002, CFG-RULE-003, COMM-001, COMM-003, FARE-008…011, FARE-013, LEDGER-NEG-001, LEDGER-NEG-006, LEDGER-PAY-001, ADMIN-ROLE-002/003/004/006.

Config editor pattern per §1.4. Edited by Finance and Super Admin. Keys fixed by an owner decision are **read-only** with their D-number until **OQ-078** is answered (QA F-04). Company account details: Finance proposes, a second staff member approves (footnote 9, **OQ-076**).

| Element (ConfigRule key) | Type | Validation | EN label | Current value | Source |
|---|---|---|---|---|---|
| `commission.rate` | decimal | 0 ≤ value < 1 | "Commission rate" | **0.30** (D-006) — read-only (OQ-078) | D-006; COMM-001 |
| `commission.base_line_types` | multi-select of BP §58.1 line types | Non-empty | "Commission is charged on" | **["LABOR"]** (D-015) — read-only (OQ-078) | D-015; COMM-003; OQ-011 |
| `fees.customer_platform_fee` | toggle + amount | — | "Customer platform fee" | **Disabled** (D-025) — read-only (OQ-078) | D-025; FARE-009 |
| Tax rules (type, rate, scope) | rule list | Fields per OQ-035 | "Tax on customer bill" | Not set — TODO(OWNER); line shows Rs. 0 and A09 flags it | D-029; FARE-010; OQ-035 |
| Late-cancellation fee | money | — | "Late cancellation fee" | Not charged at launch (`null`, D-023) — read-only (OQ-078) | D-023; BOOK-CANCEL-002; D-013 |
| Customer no-show fee | money | — | "Customer no-show fee" | Not charged at launch (`null`, D-023) — read-only (OQ-078) | D-023; BOOK-CANCEL-005 |
| Inspection fee when the quote is declined | money | — | "Inspection fee (quote declined)" | Not charged at launch (`null`, D-023) — read-only (OQ-078) | D-023 |
| Travel / distance surcharge rule | rule | — | "Travel surcharge rule" | Not set — type disabled | FARE-008 |
| `fare.emergency_exception_enabled` | toggle | — | "Emergency charge exception" | **false** | FARE-013; K-10 |
| Discount reduces labour before commission | yes/no | — | "Discount reduces commission base" | Not set — TODO(OWNER) | D-022; FARE-011; OQ-007 |
| Minimum / maximum price thresholds | money, per scope | min ≤ max | "Price limits" | Not set — no limit applied | BP §42; CFG-RULE-002 |
| `ledger.max_negative_balance` | money | ≥ 0 | "Allowed unpaid commission" | **0** (D-020) — read-only (OQ-078) | D-020; LEDGER-NEG-001 |
| `ledger.unpaid_start_grace_minutes` | minutes | ≥ 0 | "Grace before an unpaid job counts as provider cancellation" | Not set — job is flagged to Operations | D-021, D-022; LEDGER-NEG-006; OQ-007 |
| Finance verification time limit | duration | ≥ 0 | "Time limit to verify a provider payment" | Not set — no SLA flag | D-022; OQ-007 |
| Company account details for "Pay company" (**Finance only**) | text fields per the A09 contract | Required before "Pay company" is usable | "Company bank / wallet account" | Not set — Finance proposes; effective only after a second staff approval; all Super Admins notified (OQ-076). P15 shows only the server's current effective value | D-021; LEDGER-PAY-001 |
| Scope, effective from | select, date-time | `effective_from` ≥ now | "Applies to", "Effective from" | — | ARCH §5.3 |
| Change history per key | list (value, changed by, effective from, reason) | Read-only | "History" | — | ARCH §5.3; BP §26 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Change a value | "Save" | FIN, SA — only keys **not** fixed by an owner decision (OQ-078) | M17 Admin Ops & Config · config set(key, scope, value, effective_from, reason) | Yes (before/after) | R + C | BP §14, §42; CFG-RULE-003; OPS-ADMIN-013 |
| Propose company account change | "Propose change" | FIN | M17 · config propose(company account, value, reason) — not effective yet; notifies all Super Admins | Yes (sensitive change) | R + C | D-021; LEDGER-PAY-001; BP §30; OQ-076; SEC-REVIEW #4 |
| Approve / reject company account change | "Approve change" / "Reject change" | FIN or SA, **not the proposer** (self-approval → 403) | M17 · config decide(proposal, APPROVE or REJECT, reason) — on approve the value becomes effective; all Super Admins notified | Yes (sensitive change) | R + C | BP §30; ABUSE-010; OQ-076; SEC-REVIEW #4 |

**States**
- Loading: form skeleton.
- Empty: not applicable (every key is listed; unset keys show "Not set — TODO(OWNER)").
- Success: the saved value, version and effective time are re-read from the server.
- Error: 403 for any other sub-role (Support/Operations/Risk/Trust tests, ADMIN-ROLE-002/003/006), for a write to an owner-decided key (OQ-078) and for approving one's own proposal (OQ-076); 422 validation per key; 409 version conflict.
- Pending/unknown: "Saving… result unknown — checking"; the key is re-read; the input stays visible.

**PII / open:** no PII. Company account details are not a secret (providers see them), but a wrong or fraudulent change would send provider payments to the wrong account, hence the two-person rule (**OQ-076**). Open: **OQ-007**, **OQ-011**, **OQ-035**, **OQ-076**, **OQ-078**, D-013 (**OQ-006**).

---

### A14 — Promotions (Not launch)

**Purpose:** coupons/campaigns "later" (BP §14, §46; DECISIONS "Not launch"). **Requirement ID:** OPS-ADMIN-014 (Not launch), CFG-RULE-010 (Not launch).

Not built. No navigation entry; the route does not exist; no API. All eight sub-roles: `none`. The five states do not apply because there is no screen. Nothing else is specified (CLAUDE.md rule 10).

---

### A15 — Notifications

**Purpose:** manage notification templates in English and Urdu; campaigns are not launch (BP §14, §24, §80; OPS-ADMIN-015).
**Requirement IDs:** OPS-ADMIN-015, CFG-RULE-011, NOTIF-001…009.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Template list filter: event, recipient role | selects | Events from ARCH §7 (no `promotion.*`) | "Event", "Recipient" | BP §24; ARCH §7 |
| Event key | read-only | — | "Event" | ARCH §7 |
| Recipient role | read-only Customer / Provider / Admin | — | "Sent to" | BP §24 |
| Category | read-only (user-controllable category) | — | "Category" | BP §84 item 116; NOTIF-009 |
| Priority | read-only Critical / Non-critical | — | "Priority" | BP §80, §84 item 116 |
| Title en / ur | text ×2 | Both required | "Title (English)", "Title (Urdu)" | BP §78; CFG-RULE-011 |
| Body en / ur | text ×2 | Both required; only the event's allowed variables | "Message (English)", "Message (Urdu)" | BP §78; CFG-RULE-011 |
| Allowed variables | read-only list from the event schema | — | "Variables you can use" | ARCH §8 rule 7 (event schemas in contracts/) |
| Preview en / ur | rendered sample, Urdu right-to-left | — | "Preview" | BP §78.2 |
| History | versions (changed by, time, reason) | Read-only | "History" | BP §26 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Save template | "Save" | SA (CM per OQ-052) | M15 Notifications · template update(event, role, en, ur, reason) | Yes (before/after) | R + C | BP §8.3, §42; CFG-RULE-011 |
| Preview | "Preview" | all with access | M15 · template render preview (no sending) | No | — | BP §78 |
| Send campaign | — | **not offered** | — | — | — | OPS-ADMIN-015; BP §14 |

**States**
- Loading: list/form skeleton.
- Empty: filter with no match → "No templates for this event."
- Success: saved text re-read from the server; the next notification uses it (CFG-RULE-011).
- Error: 422 "Urdu text is required" / "Unknown variable {x}"; 409 version conflict; read → Retry.
- Pending/unknown: "Saving… result unknown — checking"; inputs kept.

**PII / open:** templates must not include phone numbers or exact addresses as variables (BP §20, §21). Content Manager access: **OQ-052**. Operational updates (BP §11 step 52): **OQ-056**.

---

### A16 — Reports

**Purpose:** operational, financial and marketplace reports (BP §14, §35, §39).
**Requirement IDs:** OPS-ADMIN-016, ANALYTICS-001…008, ADMIN-ROLE-007.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Report group | tabs: Acquisition · Activation · Marketplace · Customer · Provider · Financial · Quality · Reliability (each tab only for permitted roles, footnote 10) | — | as listed | BP §35; ANALYTICS-001…008 |
| Filters: city, category, period, area | selects / dates | Period start ≤ end | "City", "Category", "Period", "Area" | BP §35, §39 ("by neighborhood/category") |
| Report table / chart | aggregate numbers only | — | per metric, e.g. "Time to accept" | BP §35 |
| Data freshness | time of the last computed data | — | "Data up to" | BP §35 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Run / refresh report | "Show" | per group (footnote 10) | M19 Analytics · report query(group, filters) | No (read) | — | BP §35 |

No export or download is specified, so none is offered. Analyst has no write action anywhere (ADMIN-ROLE-007).

**States**
- Loading: chart/table skeleton; "Calculating…" for long queries.
- Empty: "No data for this period and filter."
- Success: numbers with the data-freshness time.
- Error: "Report could not be calculated — Retry".
- Pending/unknown: a query that times out shows "Taking longer than usual — Retry"; no partial numbers are shown as final.

**PII / open:** aggregates only, no personal rows. Super Admin / Support / Risk/Trust access: OQ-052.

---

### A17 — Audit logs

**Purpose:** who changed what and when; read-only (BP §14, §26, §30, §8.3).
**Requirement IDs:** OPS-ADMIN-017, DATA-002, DATA-004, SEC-BASE-010, ABUSE-010, MATCH-FAIR-004.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Filters: actor, action, object type, object ID, date range | selects / text / dates | — | "Actor", "Action", "Object", "Date" | OPS-ADMIN-017 |
| Quick filter: sensitive changes | config, financial, verification, account standing, staff/role changes, company account proposals/approvals, Super-Admin-on-Super-Admin actions | — | "Sensitive changes" | BP §30 ("review of sensitive changes"); ABUSE-010; OQ-076; SEC-REVIEW #15 |
| Quick filter: sensitive reads | openings of documents, screenshots, chats, media, AI request text; phone searches | — | "Sensitive reads" | BP §8.3, §30; SEC-REVIEW #16 |
| Column: time | date-time | — | "Time" | BP §66 |
| Column: actor + sub-roles | staff or "System" | — | "Who" | BP §26, §66 |
| Column: action, object | text, link to the object's screen if permitted | — | "Action", "Object" | BP §66 |
| Column: before → after | diff | PII masked per §1.6 | "Change" | BP §66; ARCH §4 M18 |
| Column: reason | text | — | "Reason" | BP §11 step 50, §68 |
| Column: source metadata | e.g. IP / client, where recorded | — | "Source" | BP §66 ("source/device metadata where needed") |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Search | "Search" | SA (others per OQ-052) | M18 Audit · query(filters) | No (read) | — | OPS-ADMIN-017 |

No edit or delete exists, for anyone (DATA-004 append-only).

**States**
- Loading: table skeleton.
- Empty: "No audit entries match these filters."
- Success: rows, newest first.
- Error: read → Retry.
- Pending/unknown: not applicable (no writes).

**PII / open:** secrets are never stored in audit rows; personal values in before/after are masked. Which other sub-roles may read audit logs, and whether scoped to their own area, including the non-Super-Admin reviewer of Super Admin actions (footnote 13): **OQ-052**.

---

### A18 — Risk/fraud

**Purpose:** suspicious accounts and behaviour, plus the low-rating enforcement queue (BP §14, §30, §11 step 50; D-014, D-017).
**Requirement IDs:** OPS-ADMIN-018, ABUSE-001…009, RATING-ENF-003…008, ADMIN-ROLE-006.

Tabs: **Risk flags · Rating enforcement.**

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Flags: type | Fake customer signals · Spam requests · Payment fraud (reconciliation, disputed CASH record, reused "Pay company" transaction ID, DIGITAL recorded with no gateway confirmation — KK-T5, **OQ-077**) · Harassment / block reports · Off-platform leakage reports | — | "Flag type" | BP §30; ABUSE-002/003/006/007/008; permission-policy KK-T1/KK-T2 |
| Flags: subject (masked), linked booking/payment | text, links | — | "Account", "Related to" | BP §30 |
| Flags: source rule, created, status (Open / Resolved) | text, date, chip | — | "Raised by", "Created", "Status" | BP §30 |
| Rating: provider, average, number of ratings, standing (Good / Warning 1 / Warning 2 / Blocked) | table | Same rating function as the apps | "Average", "Ratings", "Standing" | D-014; RATING-ENF-003/004; REV-006 |
| Rating: mode | "Dry-run — nobody is blocked" while D-017 numbers are `null` | — | "Mode" | D-017; RATING-ENF-008 |
| Rating: would-warn / would-block log (dry-run) | list | Read-only | "What enforcement would do" | RATING-ENF-008 |
| Rating: threshold | read-only "below 2.0" + link to A20 | — | "Threshold" | D-017 |

Flag thresholds belong to the module that raises the flag; any number is config `null` + TODO(OWNER) there. A18 only shows flags.

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Suspend account | "Suspend" | RT | M1 Identity · suspend(user, reason) — revokes all the user's sessions | Yes | R + C | BP §8.3, §30; ROLE-003; SEC-AUTH-006; SEC-REVIEW #24 |
| Reinstate (incl. `LOW_RATING`) | "Reinstate" | RT | M1 / M3 · reinstate(user, reason) | Yes | R + C | D-014; RATING-ENF-006 |
| Resolve flag | "Resolve" | RT | owning module · flag resolve(outcome text, reason) | Yes | R | BP §11 step 50 |
| Open linked record | (link) | per target screen | — | No | — | §2 |

**States**
- Loading: per-tab skeleton.
- Empty: "No open risk flags." / "No providers below the rating threshold."
- Success: after an action the row shows the server's new status.
- Error: read → Retry; write refused → server message.
- Pending/unknown: "Result unknown — checking…"; row re-read.

**PII / open:** masked phones. Finance sees payment-fraud flags only (footnote 11). Remaining D-017 numbers: **OQ-013**. Super Admin / Operations access: OQ-052.

---
### A19 — System health

**Purpose:** errors, uptime, queues and integrations (BP §14, §11 step 54, §31.2, §34).
**Requirement IDs:** OPS-ADMIN-019, REL-009, REL-011, INFRA-005, EXT-001, ANALYTICS-008, ADMIN-ROLE-008.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Environment | read-only label | — | "Environment" | BP §29, §34; SEC-BASE-011 |
| Component status: API, database, Redis, queue workers, storage | OK / degraded / down + checked-at time | — | "Components" | REL-011 |
| Queue depth and outbox backlog per queue | numbers | — | "Queues" | BP §31.2; REL-009 |
| Failed jobs per queue | number | — | "Failed jobs" | BP §31.2 |
| Notification delivery failures | number by channel | — | "Notification failures" | BP §39 daily; ANALYTICS-008 |
| Error rate and latency | numbers + link to the error tracker (Sentry, separate login) | — | "Errors", "Latency" | BP §34, §35; D-001 (Sentry) |
| Uptime | percentage per period | — | "Uptime" | BP §14, §34 |
| Business failure alerts | "Payment stuck", "No-match spike" | — | "Business alerts" | BP §34; INFRA-005 |
| Integrations | one row per interface (`OtpSender`, `PaymentGateway`, `PayoutProvider`, `IntakeAI`, `SpeechToText`, `CallRelay`, `MailSender`, `PushSender`, `ObjectStore`, `AnalyticsSink`, `GeoService`) with mode **Fake / Real** and status | — | "Integrations" | BP §33; ARCH §18; EXT-001 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Refresh | "Refresh" | TA (others per OQ-052) | platform health/metrics read endpoints | No (read) | — | REL-011 |

No restart, retry or purge action is specified, so none is offered.

**States**
- Loading: per-panel skeleton.
- Empty: "No failed jobs" / "No alerts" per panel.
- Success: values with the checked-at time.
- Error: a panel that cannot load shows "Health data unavailable — Retry"; the other panels stay visible.
- Pending/unknown: a component whose check timed out shows "Unknown" (never "OK").

**PII / open:** no environment variable values, keys or credentials are ever displayed (§1.6). Error details show no customer phone or address (masked, ADMIN-ROLE-008). Other sub-roles: OQ-052.

---

### A20 — Settings

**Purpose:** platform configuration that is not financial (A13), matching (A21), badges (A22) or activation (A23), plus staff accounts and sub-roles (BP §14, §42, §8.4 SA "All configuration and security functions").
**Requirement IDs:** OPS-ADMIN-020, ADMIN-ROLE-001, ADMIN-ROLE-008, CFG-RULE-004…009, CFG-RULE-012, SEC-AUTH-002, SEC-AUTH-004, SEC-AUTH-008, SEC-BASE-006, MEDIA-001/002/004/007, CHAT-003, RATING-ENF-003/004/008, REQ-AI-006, BOOK-CANCEL-005, BOOK-STATUS-014, QUOTE-004, NOTIF-003, MATCH-GAP-001.

Config editor pattern per §1.4. Editing: **Super Admin** for every group; other sub-roles per OQ-052 (shown in the "Others" column as the cell under question).

| Group | Element (key) | Type | Validation | EN label | Current value | Others (OQ-052) | Source |
|---|---|---|---|---|---|---|---|
| **G1 Staff & roles** | Staff list: name, sign-in ID, sub-roles, status, second factor enrolled yes/no, last sign-in | table | — | "Staff accounts" | — | none (SA only) | BP §8.4; ADMIN-ROLE-001 |
| G2 Security & sessions | Session lifetime (`auth.session_ttl`), admin idle timeout | duration | > 0 when set | "Session lifetime", "Admin idle timeout" | Not set — TODO(OWNER) | none (SA only) | BP §27; SEC-AUTH-002; OQ-028, OQ-051 |
| G2 | OTP expiry, resend cooldown, attempt limit, lockout | numbers | > 0 when set | "OTP settings" | Not set — TODO(OWNER). **Required in staging/production; unset → fail closed** (`LIMIT_NOT_CONFIGURED`, §1.1); safe test values in dev/test | none | D-002; SEC-AUTH-004; OQ-028; SEC-REVIEW #1 |
| G2 | Rate limits (login, OTP, messaging, requests) | numbers | > 0 when set | "Rate limits" | Not set — TODO(OWNER). Login and OTP limits **required in staging/production; unset → fail closed** (§1.1) | none | BP §29, §30; SEC-BASE-006; OQ-028; SEC-REVIEW #1 |
| G2 | Account deletion hold period | duration | ≥ 0 | "Deletion hold period" | Not set — TODO(OWNER) | none | BP §26, §27; SEC-AUTH-008 |
| G3 Booking & quote rules | Cancellation windows | duration | ≥ 0 | "Cancellation window" | Not set — no fee applied (D-023) | Operations | BP §16, §42; CFG-RULE-004; D-013 (OQ-006) |
| G3 | Quote validity default / maximum | duration | default ≤ max | "Quote validity" | Not set — provider enters validity on each quote | Operations | BP §18, §42; CFG-RULE-005; QUOTE-004; OQ-006 |
| G3 | Expiry times per status | duration | ≥ 0 | "Expiry times" | Not set — nothing expires automatically | Operations | BP §15; BOOK-STATUS-014; D-013 |
| G3 | Customer no-show wait period | duration | ≥ 0 | "Wait before customer no-show" | Not set — report goes to Support review | Operations | BP §16; BOOK-CANCEL-005; D-013 |
| G3 | Customer booking limits | number | ≥ 0 | "Open requests per customer" | Not set — only rate limits apply | Operations | BP §30, §42; CFG-RULE-008; OQ-017 |
| G3 | Review eligibility window | duration | ≥ 0 | "Review window" | Not set — any Completed booking without review is eligible | Operations | BP §19, §42; CFG-RULE-009 |
| G3 | Provider service radius maximum | distance | > 0 when set | "Maximum provider radius" | Not set — any radius inside the active Lahore zone | Operations | BP §42, §59.1; CFG-RULE-006 |
| G3 | Booking reminder timing | duration | ≥ 0 | "Reminder before appointment" | Not set — TODO(OWNER) | Operations | BP §80; NOTIF-003 |
| G3 | Supply-gap options shown to customers | multi-select of BP §61.3 options | — | "No-supply options" | per OQ-021 default | Operations | BP §61.3; MATCH-GAP-001; OQ-021 |
| G4 Support | Support categories; SLA target per level | list; durations | — | "Support categories", "SLA targets" | Not set — no breach flagged | Support, Operations | BP §40, §42; CFG-RULE-012; OQ-018 |
| G5 Media & attachments | `media.audio.max_seconds`, `media.video.max_seconds`, max sizes, retention, chat attachment limits | numbers | > 0 when set | "Audio limit", "Video limit", "Max file size", "Retention", "Chat attachments" | Not set — TODO(OWNER) (BP targets ≈ 2 min audio, ≈ 30 s video shown as guidance only) | Technical Admin | BP §20, §76; MEDIA-001/002/004/007; CHAT-003; D-011 (OQ-004) |
| G6 Rating enforcement | `rating.block_threshold` | decimal 1–5 | — | "Block threshold (average below)" | **2.0** (D-017) — read-only (OQ-078) | Risk/Trust | D-017; RATING-ENF-003 |
| G6 | `rating.warnings_before_block` | integer | ≥ 1 | "Warnings before block" | **2** (D-014) — read-only (OQ-078) | Risk/Trust | D-014; RATING-ENF-004 |
| G6 | `rating.min_reviews_for_enforcement`, `rating.review_period_days`, `rating.window` | number / days / window | — | "Minimum ratings", "Review period", "Rating window" | Not set — enforcement runs in **dry-run** | Risk/Trust | D-017; RATING-ENF-008; OQ-013 |
| G7 AI | `ai.confidence_threshold` | decimal 0–1 | — | "AI confidence threshold" | Not set — every request goes through C34 with the service editable | none | BP §67; REQ-AI-006; D-010 (OQ-003) |

Not shown: promotion rules (CFG-RULE-010, Not launch). Financial keys → A13; matching → A21; badges → A22; activation → A23.

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Change a config value (G2–G7) | "Save" | SA (others per OQ-052); keys fixed by an owner decision are read-only (OQ-078) | M17 Admin Ops & Config · config set(key, scope, value, effective_from, reason) | Yes | R + C (before → after; D-number warning for decided values) | BP §42; CFG-RULE-* |
| Create staff account | "Add staff" | SA | M1 Identity · staff create(name, sign-in ID, sub-roles) — first sign-in requires second-factor setup | Yes | R + C | BP §8.4; ADMIN-ROLE-001; D-002 |
| Change sub-roles | "Change roles" | SA | M1 · staff set roles(sub-roles, reason) | Yes | R + C | BP §8.4; ADMIN-ROLE-001; OQ-053 |
| Deactivate / reactivate staff | "Deactivate" / "Reactivate" | SA | M1 · staff deactivate/reactivate(reason) — revokes sessions on deactivate | Yes | R + C | BP §27 (revocation), §30 |
| Reset second factor | "Reset two-step verification" | SA | M1 · staff reset second factor(reason) — **revokes all that account's sessions** and forces re-enrolment at the next sign-in | Yes | R + C | D-002; BP §27; OQ-051; SEC-REVIEW #15 |

**Super Admin safeguards** (A15 ruling, SEC-REVIEW #15; ADMIN-ROLE-001, BP §8.4 SA "security functions", BP §30):
- The server refuses (409) to deactivate, demote or reset the second factor of the **last active Super Admin with enrolled MFA**, including a Super Admin acting on their own account.
- Any action by one Super Admin on another Super Admin (change roles, deactivate, reset second factor) **notifies all Super Admins** and appears in A17 "Sensitive changes".
- Break-glass recovery when no Super Admin can sign in: offline, owner-held, audited runbook (**OQ-051**); not a portal feature.

**States**
- Loading: per-group skeleton.
- Empty: G1 can never be empty for a signed-in Super Admin; config groups always list their keys.
- Success: saved value / staff change re-read from the server, with the effective time.
- Error: 403 for other sub-roles or an owner-decided key (OQ-078); 422 validation; 409 version conflict or "This is the last active Super Admin".
- Pending/unknown: "Saving… result unknown — checking"; the key or staff row is re-read.

**PII / open:** staff sign-in IDs are shown to Super Admin only; no password, second-factor secret or OTP is ever displayed or exportable (§1.6). Group editors other than Super Admin: **OQ-052**. Multiple sub-roles: **OQ-053**.

---

### A21 — Matching weights & fairness

**Purpose:** configure ranking weights and fairness rules without a deploy; every change creates a new `ranking_version` (BP §54.2, §68; ARCH §9).
**Requirement IDs:** OPS-ADMIN-021, MATCH-SCORE-001…013, MATCH-FAIR-001…004, MATCH-ELIG-073…079, LEDGER-NEG-001.

| Element | Type | Validation | EN label | Current value | Source |
|---|---|---|---|---|---|
| Scope | select global / city / category | — | "Applies to" | global | ARCH §5.3 |
| Weight: closeness / travel time | number | ≥ 0 | "Distance / travel time" | Not set — TODO(OWNER) | BP §54.2; MATCH-SCORE-001; D-010 |
| Weight: availability fit | number | ≥ 0 | "Can arrive in the requested window" | Not set | MATCH-SCORE-002 |
| Weight: exact vs related service | number | ≥ 0 | "Exact service match" | Not set | MATCH-SCORE-003 |
| Weight: customer preferences | number | ≥ 0 | "Customer preferences" | Not set | MATCH-SCORE-004 |
| Weight: verification | number | ≥ 0 | "Verification" | Not set | MATCH-SCORE-005 |
| Weight: rating quality and volume | number | ≥ 0; **cannot be the only non-zero weight** | "Rating (quality and volume)" | Not set | BP §54.2; MATCH-SCORE-006 |
| Weight: relevant completed jobs | number | ≥ 0 | "Completed jobs for this service" | Not set | MATCH-SCORE-007 |
| Weight: response speed | number | ≥ 0 | "Response speed" | Not set | MATCH-SCORE-008 |
| Weight: cancellation / no-show history | number | ≥ 0 | "Cancellation and no-show history" | Not set | MATCH-SCORE-009 |
| Weight: repeat-customer signal + minimum sample | number + integer | ≥ 0 | "Repeat customers", "Minimum sample" | Not set — signal off | MATCH-SCORE-010 |
| Weight: price competitiveness | number | ≥ 0 | "Price within same price model" | Not set | MATCH-SCORE-011 |
| Weight: reliability / policy compliance | number | ≥ 0 | "Reliability" | Not set | MATCH-SCORE-012 |
| New-provider boost + period | number + duration | ≥ 0 | "New provider exposure" | Not set — rule off | BP §54.2; MATCH-SCORE-013; MATCH-FAIR-001 |
| Anti-monopoly cap + window | share + duration | 0–1 | "Maximum share of shown slots" | Not set — rule off; A25 reports concentration | BP §68; MATCH-FAIR-002 |
| Size of the "small set" shown first | integer | ≥ 1 | "Providers shown first" | Not set — TODO(OWNER) | BP §55.1; ARCH §9 |
| Capacity rules enabled | toggle | — | "Use active-job capacity limits" | Not set — TODO(OWNER) | BP §54.1 rule 79; MATCH-ELIG-079 |
| Hard eligibility rules 73–79 + unpaid-commission rule | read-only list | Not editable here | "Always applied first" | — | BP §54.1, §68; D-020; MATCH-FAIR-003 |
| Current `ranking_version` + version history (changed by, time, reason) | read-only | — | "Ranking version" | — | BP §66; OPS-ADMIN-021 |

While a weight is `null`, the null behaviour stated in its MATCH-SCORE criterion applies (docs/qa/test-strategy.md). Paid or promoted placement does not exist (MATCH-FAIR-003).

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Save weights / fairness | "Save as new ranking version" | SA (Operations per OQ-052) | M8 Matching · ranking config save(values, scope, reason) → new `ranking_version` | Yes | R + C (before → after) | BP §54.2, §68; OPS-ADMIN-021; MATCH-FAIR-004 |

**States**
- Loading: form skeleton.
- Empty: not applicable; unset values show "Not set — TODO(OWNER) (D-010)".
- Success: new `ranking_version` number returned by the server is shown.
- Error: 422 (e.g. "Rating cannot be the only non-zero weight"); 409 version conflict; 403 other roles.
- Pending/unknown: "Saving… result unknown — checking"; the current version is re-read.

**PII / open:** no PII. Values: **OQ-003** (D-010). Operations access: OQ-052.

---

### A22 — Badge rules

**Purpose:** configure the rules behind each platform badge; badges must represent measurable facts (BP §55.2, §66).
**Requirement IDs:** OPS-ADMIN-022, TRUST-BADGE-001…014.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Badge list | table: badge, kind (Fact / Rule), rule status (Set / Not set), effective date, recalculation status, number of holders | — | "Badge", "Kind", "Rule", "Effective", "Recalculation", "Holders" | BP §55.2, §66 |
| Fact badges (definition read-only): Verified, Emergency Available, Available Today, Available Now | read-only text | Not editable | — | BP §55.2, §59; TRUST-BADGE-001, -011…013 |
| Rule badges: Highly Rated, Experienced, Customer Favorite, Fast Response, Fast Service, Reliable, Repeat Customer Favorite, Top Specialist (per service), Recently Joined, Large Team / Company Provider | rule form: source metrics + values, per the A05 badge-rule contract | Values `null` → "Not set — nobody gets this badge" | per badge name | BP §55.2; TRUST-BADGE-002…010, -014; D-010 |
| Badge label en / ur | text ×2 | Both required | "Label (English)", "Label (Urdu)" | BP §78 |
| Note | "Favorite (customer action) and Customer Favorite (badge) are different" | — | — | BP §55.2 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Save badge rule | "Save and recalculate" | SA (Operations, Risk/Trust per OQ-052) | M3 Trust · badge rule save(badge, rule, effective_from, reason) → recalculation | Yes | R + C | BP §55.2, §66; OPS-ADMIN-022 |
| Save badge label | "Save" | SA | M3 · badge label update(en, ur, reason) | Yes | R | BP §78 |

**States**
- Loading: list skeleton.
- Empty: not applicable (14 badges always listed).
- Success: rule saved; recalculation status shows "Running" then "Done" from the server.
- Error: 422 per rule; 409 conflict; recalculation failed → "Recalculation failed — badges unchanged" + Retry.
- Pending/unknown: "Saving… result unknown — checking"; recalculation status re-read.

**PII / open:** no PII. Thresholds: **OQ-003** (D-010). Operations / Risk/Trust access: OQ-052.

---

### A23 — City & zone activation

**Purpose:** a city can exist without being active; activate families and services per city (BP §57.2, §64, §42).
**Requirement IDs:** OPS-ADMIN-023, SCOPE-GEO-001, SCOPE-GEO-002, SCOPE-CAT-002, CFG-RULE-001, CAT-SVC-002.

| Element | Type | Validation | EN label | Current value | Source |
|---|---|---|---|---|---|
| City list: name, listed, active | table | Pakistan cities only | "City", "Listed", "Active" | Lahore listed + active; other Pakistani cities listed + inactive | BP §57.2; D-007; SCOPE-GEO-001/002 |
| Service zone (Lahore) | read-only map of the whole-city zone (Google Maps) | Not editable at launch | "Service zone" | Whole Lahore = one active zone | D-019; BP §57 |
| Families in selected city | table: family, active yes/no, open requests/bookings count | Only BP §63 families | "Service families" | The 10 D-024 families active in Lahore; others inactive | D-024; BP §63, §64 |
| Services in selected family | table: service, active yes/no | Activation refused if `selling_modes` is empty | "Services" | — | BP §64; CAT-SVC-002 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Activate / deactivate city | "Activate city" / "Deactivate city" | SA (Operations per OQ-052) | M4 Catalog · city set active(city, value, reason) | Yes | R + C (confirm shows open requests/bookings count, OQ-060) | BP §57.2; CFG-RULE-001 |
| Activate / deactivate family in city | "Activate" / "Deactivate" | SA (Operations, Content Manager per OQ-052) | M4 · family activation(city, family, value, reason) | Yes | R + C | BP §42, §64; SCOPE-CAT-002 |
| Activate / deactivate service in city | "Activate" / "Deactivate" | same | M4 · service activation(city, service, value, reason) | Yes | R + C | BP §64 |

No "add city", "edit zone" or "create family" action (D-019; SCOPE-CAT-001). Changes reach the apps without a deploy (CFG-RULE-001).

**States**
- Loading: tables skeleton; the map loads after the table so a slow map never blocks activation (BP §62.3).
- Empty: a family with no services → "No services in this family."
- Success: new activation state re-read from the server.
- Error: 422 "Service has no selling mode"; map failed → "Map unavailable" text in place of the map (fallback, ARCH §18); read → Retry.
- Pending/unknown: "Result unknown — checking…"; the row is re-read.

**PII / open:** no PII. Admin web Maps key restricted by HTTP referrer (permission-policy SEC-BASE-008). Effect on open items: **OQ-060**. Operations / Content Manager access: OQ-052.

---

### A24 — AI guidance & customer questions

**Purpose:** per-service customer questions and AI guidance, editable without an app release (BP §64, §67).
**Requirement IDs:** OPS-ADMIN-024, CAT-SVC-006, CAT-SVC-007, REQ-AI-003, REQ-AI-007, REQ-AI-008.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Service selector | search/select | Catalog services | "Service" | BP §64 |
| Customer questions: text en / ur | text ×2 per question | Both required | "Question (English)", "Question (Urdu)" | BP §4.2, §64, §78; CAT-SVC-006 |
| Customer questions: answer type | select from the A03 catalog contract | Required | "Answer type" | BP §4.2 ("required customer information/photos") |
| Customer questions: required yes/no, order | toggle, number | — | "Required", "Order" | BP §4.2 |
| AI guidance | multi-line text (server-side only; never sent to the apps) | — | "AI guidance for this service" | BP §64, §67; CAT-SVC-007 |
| Guidance version + history | read-only | — | "Version" | CAT-SVC-007; REQ-AI-008 |
| AI confidence threshold | read-only + link to A20 G7 | — | "Confidence threshold" | REQ-AI-006; D-010 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Save questions | "Save questions" | SA (Content Manager per OQ-052) | M4 Catalog · service questions update(service, questions, reason) | Yes | R + C | BP §64; CAT-SVC-006 |
| Save AI guidance | "Save guidance" | SA | M4 · service AI guidance update(service, text, reason) → new guidance version | Yes | R + C | BP §64, §67; CAT-SVC-007 |

**States**
- Loading: form skeleton.
- Empty: "No questions for this service yet." / "No AI guidance yet — the AI uses the catalog data only."
- Success: saved questions/guidance and the new version re-read from the server; the customer flow uses them after refresh (CAT-SVC-006).
- Error: 422 "Urdu text is required"; 409 conflict; read → Retry.
- Pending/unknown: "Saving… result unknown — checking"; inputs kept.

**PII / open:** no PII. Guidance never contains secrets or API keys (BP §67). Content Manager access: **OQ-052**.

---

### A25 — Marketplace health

**Purpose:** dual-sided health by city, category, area and period; supply gaps and provider concentration (BP §61, §39 weekly, §68).
**Requirement IDs:** OPS-ADMIN-025, HEALTH-001…020, MATCH-FAIR-002, MATCH-GAP-001.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Filters: city, category, area, period | selects / dates | Period start ≤ end | "City", "Category", "Area", "Period" | BP §39, §61 |
| Customer-side metrics (10) | numbers + trend | — | e.g. "Request-to-match success rate" | BP §61.1; HEALTH-001…010 |
| Supplier-side metrics (10) | numbers + trend | — | e.g. "Time available without relevant jobs" | BP §61.2; HEALTH-011…020 |
| Supply gaps | list: requests with no supply, chosen next action (broaden radius, other time, callback, waitlist, related service) | — | "Supply gaps" | BP §61.3; MATCH-GAP-001; OQ-021 |
| Provider concentration | share of shown slots per provider | — | "Concentration" | BP §68; MATCH-FAIR-002 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Show / refresh | "Show" | OPS, AN (others per OQ-052) | M19 Analytics · health query(filters) | No (read) | — | BP §61 |

**States**
- Loading: metric tiles skeleton.
- Empty: "No activity in this period and area."
- Success: metrics with the data-freshness time.
- Error: per-tile "Could not calculate — Retry".
- Pending/unknown: slow query → "Taking longer than usual"; no partial number is shown as final.

**PII / open:** aggregates only. Supply-gap follow-up: **OQ-021**. Super Admin / Support / Finance / Risk/Trust access: OQ-052.

---

### A26 — AI interaction viewer

**Purpose:** what the AI suggested next to what the customer actually confirmed, with version, safety and performance data (BP §66, §67).
**Requirement IDs:** OPS-ADMIN-026, REQ-AI-002, REQ-AI-005, REQ-AI-006, REQ-AI-008, REQ-AI-009, CAT-SVC-007.

| Element | Type | Validation | EN label | Source |
|---|---|---|---|---|
| Filters: date, service, model/service version, errors only, safety state | selects | — | "Date", "Service", "Version", … | BP §66, §67 |
| Column: interaction ID, request/session link (A07) | text | — | "Interaction", "Request" | BP §66 |
| Column: model/service version, guidance version | text | — | "AI version", "Guidance version" | BP §67; CAT-SVC-007 |
| Column: input class (text / voice transcript / photo) | chip | — | "Input" | BP §66 ("prompt/input class") |
| Column: confidence | number | — | "Confidence" | BP §67; REQ-AI-006 |
| Column: safety / approval state | chip | — | "Safety" | BP §66; REQ-AI-009 |
| Column: latency, error | ms, text | — | "Latency", "Error" | BP §66 |
| Detail: AI suggested vs customer confirmed | two columns: service, summary, time hint, location hint | Read-only; **hidden for Technical Admin** (footnote 12); opening is read-audited (§1.3) | "AI suggested", "Customer confirmed" | BP §67; REQ-AI-005 |

| Action | Label | Allowed | Server request | Audit | R/C | Source |
|---|---|---|---|---|---|---|
| Search / open | "Search" | OPS, RT, TA (metadata only) | M7 Intake · AI interaction query(filters) | No (read) | — | BP §67 |

**States**
- Loading: table skeleton.
- Empty: "No AI interactions match these filters."
- Success: rows; detail shows both columns side by side.
- Error: read → Retry.
- Pending/unknown: not applicable (no writes).

**PII / open:** customer request text is personal; Technical Admin sees metadata only. Raw prompts and system instructions are never shown (BP §67). Super Admin access: OQ-052.

---

## 4. Open questions raised or used by this spec

| OQ | Topic | Where |
|---|---|---|
| **OQ-051** | Admin sign-in method, second-factor type and reset, idle timeout | §1.1, A01, A20 |
| **OQ-052** | All `OQ` cells of the access matrix + A20 group editors | §2, every screen |
| **OQ-053** | Several sub-roles per staff account | §0.1, A20 |
| **OQ-054** | Meaning of "restrict"; effect of a suspension on scheduled bookings | A03 |
| **OQ-055** | Full phone / exact address reveal for staff | §1.6, A03, A07, A10, A12 |
| **OQ-056** | FAQ editing place, banners, "operational updates" | A12, A15 |
| **OQ-057** | A08 actions beyond view; A04 "request more information" | A04, A08 |
| **OQ-058** | Refunds on cash-paid bookings; partial refunds | A10 |
| **OQ-059** | "Pay company" amount differs from submitted amount | A09 |
| **OQ-060** | Effect of deactivating a city/family/service on open items | A23 |
| **OQ-061** | Which sub-role handles L5 tickets | A12 |
| OQ-076 (A00) | Two-person approval of company account changes + notify all Super Admins | A13, §1.3 |
| OQ-077 (A00) | Time before DIGITAL-without-gateway-confirmation raises a flag | A09, A18 |
| OQ-078 (A00) | Owner-decided config values read-only in the UI | §1.4, A13, A20 |
| Existing | OQ-003 (D-010 weights/badges/AI threshold), OQ-004 (D-011 media), OQ-006 (D-013), OQ-007 (D-022), OQ-010, OQ-011, OQ-013 (D-017), OQ-015, OQ-017, OQ-018, OQ-021, OQ-028, OQ-031, OQ-035 | as cited |

## 5. Requirement coverage

| Requirement | Covered in |
|---|---|
| OPS-ADMIN-001 … OPS-ADMIN-026 | A01 … A26 (one section each; A14 Not launch) |
| ADMIN-ROLE-001 Super Admin manages staff/roles | §2, A20 G1 |
| ADMIN-ROLE-002 Operations acts on A03/A07/A08, 403 on A13 | §2 (A08 is view until OQ-057) |
| ADMIN-ROLE-003 Support acts on A12, 403 on A13 | §2, A12, A13 |
| ADMIN-ROLE-004 Finance A09/A10 refunds/A13, no credential data | §2, A09, A10, A13, §1.6 |
| ADMIN-ROLE-005 Content Manager edits A05/A06 text, 403 on A09 | §2, A05, A06 |
| ADMIN-ROLE-006 Risk/Trust A04/A11/A18 + reinstatement, 403 on A13 | §2, A03, A04, A11, A18 |
| ADMIN-ROLE-007 Analyst read-only | §2 (no `edit`/`approve` cell), A16 |
| ADMIN-ROLE-008 Technical Admin A19, masked PII | §2, A19, §1.6 |
| ROLE-003 reason + audit on suspend/reinstate | §1.3, A03, A18 |
| UX-SCREEN-003 five states | every screen section |
| SEC-AUTH-005 admin MFA, separate path | §1.1, A01 |
| RATING-ENF-006 reinstate with reason | A03, A18 |
| LEDGER-PAY-003/004 Finance queue | A09 |

Test hint for A16/T5.1: the §2 matrix is the source for the RBAC matrix test (each sub-role × each screen API → expected 200/403), including every `OQ` cell expecting 403 until OQ-052 is answered.

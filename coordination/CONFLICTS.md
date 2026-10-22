# CONFLICTS — copy of docs/architecture.md §21 + new conflicts found

K-01…K-15 are copied from ARCH §21 (verified in T0.3 on 2026-10-22; rows sorted by ID, meaning unchanged; cross-references to REQ/OQ/D IDs added). K-16 and K-17 were found by A00 in T0.2 and were added to ARCH §21 on 2026-10-22.

| ID | Issue | Blueprint refs | Default resolution | Status |
|---|---|---|---|---|
| K-01 | Microphone: "Do not request in MVP unless needed" vs microphone **Must-have** | §28 vs §74 | v0.4 wins: microphone is needed (audio notes + voice). Still requested just-in-time. | Resolved by authority order |
| K-02 | Multilingual listed as **Open** vs Urdu + English **Accepted** | §46 vs §78, §86 | v0.4 wins: bilingual at launch | Resolved by authority order |
| K-03 | Auth method was Open (OTP / email-password / social); C03/C04 assume phone/email | §12, §27, §46 | Owner chose **phone OTP** (D-002). C03/C04 updated in ARCH §3.1. Email is optional profile data only | Resolved 2026-10-22 |
| K-04 | Old catalog (§5) and new catalog (§63) differ in names/items | §5 vs §63 | §63 is the planning universe; §6 defines the active launch set | Resolved by authority order |
| K-05 | Next states Abandoned, Declined, Reviewed, Resolved, Refunded, Rework, Rejected, No-show are not defined as statuses | §15 | See ARCH §6.1 footnotes (REQ BOOK-STATUS-001, -004, -011, -012, -017) | `[INTERPRETATION]` confirm (OQ-009) |
| K-06 | BP §12 screen list predates v0.3/v0.4 features | §12 vs §55, §76, §77 | New IDs C31–C42, P22–P26, A21–A26 | `[DERIVED]` |
| K-07 | Stray text "filecite marker belongs outside the document" in Section 2 | §2 | Editorial. Ignore and remove in the next Blueprint revision. | Doc bug |
| K-08 | Price models (§4.1) vs selling models (§53) — two taxonomies | §4.1, §53 | Two separate fields (ARCH §5.5) | `[INTERPRETATION]` confirm (OQ-010) |
| K-09 | Guest browsing: C02 offers "continue as guest", but no rule says what a guest may do | §12, §8.1 | Guest may browse public catalog; account needed to submit a request | `[INTERPRETATION]` confirm (OQ-008) |
| K-10 | Emergency exception for charges is required but not specified | §58.3 | Disabled by default (feature flag) until rules are written (REQ FARE-013) | `[OPEN]` |
| K-11 | Media numbers (bitrate, max MB, retention) not specified | §76 | Config with `TODO(OWNER)` (D-011) | `[OPEN]` |
| K-12 | Ranked list numbering in the .docx runs across sections (11…120) | many | Editorial; cite by section, not list number. Exception: §54.1 rules 73–79 and §75 items 93–98 are cited by their printed numbers. | Doc bug |
| K-13 | Location strategy reaches multi-country (Stage 5) while v0.3 says Pakistan only | §6.2 vs §57.2, §69 | Launch = Pakistan only. Multi-country is a far-future stage, not scope. | Resolved |
| K-14 | BP §6.2 suggests a pilot in "one city + selected neighborhoods"; owner chose the whole of Lahore | §6.2 vs D-019 | Owner decision wins (authority order ARCH §0.1). Watch supply density per area on the health dashboard (BP §61) | Resolved 2026-10-22 |
| K-15 | BP §46 marks "Wallet/credits" as Later, but D-016 needs a provider account balance | §46, §13 P15 vs D-016 | Not a conflict: the provider earnings ledger (P15 pending/available/paid) is required now. A **customer** wallet/credits feature stays Later | Resolved 2026-10-22 |
| K-16 | The BP §15 table has no transition **into** Quote Pending (Draft → Requested only; Requested → Accepted/Rejected/Expired/Cancelled). The inspection-first flow of BP §4.1 ("visit → inspection → quote → approval") has no state mapping | §15, §4.1, §18 | Draft → Quote Pending when the customer submits on a quote-required/inspection service; Requested → Quote Pending when the provider chooses "Quote". The inspection visit happens while the booking is in Quote Pending ("provider needs to price or inspect"); its time is stored on the booking but arrival is not a separate status (REQ BOOK-STATUS-003) | Resolved 2026-10-22 (D-028) |
| K-17 | D-003 says payment happens only after `Completed`, but BP §16 allows a cancellation fee and a customer no-show fee, and BP §58.1 an inspection fee — on bookings that may never reach `Completed` (cancelled, no-show, quote declined after inspection) | §16, §58.1 vs D-003 | Owner decision D-023: payment stays at the end only; these fees are not charged at launch (config `null`) (REQ BOOK-CANCEL-002, -005) | Resolved 2026-10-22 (D-023) |

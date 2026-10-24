# TASKS — Kaam Karo

Seeded from docs/implementation.md §6. Owner agent IDs map to `.claude/agents/` (A01 platform-devops … A17 bug-hunter; A00 = main session). Status: TODO → CLAIMED → IN_PROGRESS → IN_REVIEW → DONE (or BLOCKED).

Acceptance criteria and BP refs per task: docs/implementation.md §6 (same task ID). Requirement IDs: docs/requirements/REQUIREMENTS.md.

| Task | Title | Owner | Depends on | Status | Handoff |
|---|---|---|---|---|---|
| T0.1 | Create `coordination/` files and templates from §3 | A00 | — | DONE | handoffs/T-0.1-0.3.md |
| T0.2 | Build the requirement registry from §5 with acceptance criteria | A00 | T0.1 | DONE | handoffs/T-0.1-0.3.md |
| T0.3 | Copy ARCH §21 conflicts and §22 decisions into `CONFLICTS.md` / `DECISIONS.md` (record D-001, D-002, D-003, D-005, D-006, D-007, D-014 as Accepted 2026-10-22); record D-004, D-015, D-016, D-018, D-019 and the D-017 threshold as Accepted too; record D-020 and D-021 Accepted too; ask the owner the rest of D-017 and D-022 | A00 | T0.1 | DONE | handoffs/T-0.1-0.3.md |
| T0.4 | Permission & threat policy v1 | A15 | T0.1 | DONE | handoffs/T-0.4.md |
| T0.5 | Test strategy + device matrix | A16 | T0.2 | DONE | handoffs/T-0.5.md |
| T0.6 | **Urdu Nastaliq smoke test** (condition of D-001): one Expo dev-build screen with Noto Nastaliq Urdu, RTL layout, mixed Urdu/English label, a list, a bottom sheet and a text input, run on the cheapest phone in the device matrix | A14 + A01 | T0.5 | BLOCKED-DEVICE (code + tests done; device run PENDING: no phone/emulator/JDK 17 on A14 machine) | handoffs/T-0.6.md |
| T1.1 | Screen specs for C01–C42 (fields, states: loading/empty/success/error/pending) | A11 + A00 | T0.2 | DONE | handoffs/T-1.1.md |
| T1.2 | Screen specs for P01–P26 | A12 + A00 | T0.2 | DONE | handoffs/T-1.2.md |
| T1.3 | Screen specs for A01–A26 with sub-role access per screen | A13 + A00 | T0.2 | DONE | handoffs/T-1.3.md |
| T1.4 | i18n + RTL + Urdu typography kit; string-lint rule | A14 | G0 | DONE | handoffs/T-1.4.md |
| T1.5 | Flow maps: request → match → book/quote → job → pay → review; supply gap; dispute | A00 | T1.1–T1.3 | DONE | handoffs/T-1.5.md |
| T2.1 | Monorepo, CI (build/lint/typecheck/test), envs, secrets, Sentry, health check | A01 | G0 | DONE | handoffs/T-2.1.md |
| T2.2 | Platform lib: config loader, error envelope, idempotency middleware, outbox + worker, append-only audit | A01 | T2.1 | DONE | handoffs/T-2.2.md |
| T2.3 | DB schema v1 for all ARCH §5 entities (technical fields per ARCH §5) + migrations | A01 with each owner | T2.1 | DONE | handoffs/T-2.3.md |
| T2.4 | Identity: phone OTP login (D-002) with fake `OtpSender`, OTP expiry + attempt limits + resend cooldown (values in config, `TODO(OWNER)`), sessions, roles, admin sub-roles, MFA for admin | A02 | T2.2 | DONE | handoffs/T-2.4.md |
| T2.5 | Profiles + addresses + snapshot helper + favorites | A02 | T2.4 | DONE | handoffs/T-2.5.md |
| T2.6 | Catalog seed from BP §63 (all inactive) + launch-family flags + `ConfigRule` store + cities: **Lahore** `is_listed = true, is_active = true` (D-007); other Pakistani cities `is_listed = true, is_active = false`; whole Lahore seeded as one active service zone (D-019); provider radius/areas still work inside it (BP §59) | A03 | T2.3 | DONE | handoffs/T-2.6.md |
| T2.7 | Backup + **restore test** in staging | A01 | T2.3 | DONE | handoffs/T-2.7.md |
| T2.8 | Security review of T2.1–T2.6 | A15 | T2.4–T2.6 | DONE | handoffs/T-2.8.md |
| T3.1 | `GeoService` + Pakistan boundary + Location Snapshot + fallback | A06 | T2.3 | DONE | handoffs/T-3.1.md |
| T3.2 | Media upload sessions, limits from config, thumbnails, retention job | A08 | T2.2 | DONE | handoffs/T-3.2.md |
| T3.3 | `IntakeAI` fake + closed schema + catalog validation + confidence fallback + AI logs | A07 | T2.6 | DONE | handoffs/T-3.3.md |
| T3.4 | Booking state machine + Job Events + cancellation rules (config) | A04 | T2.6 | DONE | handoffs/T-3.4.md |
| T3.5 | Quotes + multi-supplier offers + fare lines (proposed/approved/rejected/final) + **crew size** (ARCH §5.6) | A04 | T3.4 | DONE | handoffs/T-3.5.md |
| T3.6 | Availability, service areas, verification levels | A05 | T2.5 | DONE | handoffs/T-3.6.md |
| T3.7 | Matching: hard filters 73–79, configurable scoring, fairness, reasons, ranking_version, supply gap | A05 | T3.1, T3.3, T3.6 | DONE | handoffs/T-3.7.md |
| T3.8 | Customer app: onboarding, language choice, login, home, search, category, service detail, provider profile | A11 | T2.4, T2.6, T1.4 | DONE | handoffs/T-3.8.md |
| T3.9 | Customer app: "What do you need?" composer, audio/video recorders, photo picker, location confirm, summary confirm | A11 | T3.1–T3.3 | DONE | handoffs/T-3.9.md |
| T3.10 | Customer app: match results, comparison, reasons, offers comparison, booking review/confirmation, supply-gap screen | A11 | T3.5, T3.7 | DONE | handoffs/T-3.10.md |
| T3.11 | Voice assistant v1 (push-to-talk, intents only, confirmation dialogs) | A07 + A11 | T3.3, T3.9 | TODO | — |
| T3.12 | QA: customer journey E2E (BP §9 steps up to "Confirm request/booking") | A16 | T3.8–T3.11 | TODO | — |
| T4.1 | Partner onboarding + verification upload (document picker) | A12 | T2.4, T3.6 | TODO | — |
| T4.2 | Service setup, availability, overrides, status switch, service area | A12 | T3.6 | TODO | — |
| T4.3 | Incoming requests + job detail with media player; Accept/Quote/Ask/Decline ≤ 2 taps | A12 | T3.5, T3.7, T3.2 | TODO | — |
| T4.4 | Quote builder with BP §58.1 line types + crew size; crew size also asked on Accept for instant bookings | A12 | T3.5 | TODO | — |
| T4.5 | Job execution: en route, arrived, in progress, extras (proposed), completion evidence, navigation hand-off | A12 + A06 | T3.4 | TODO | — |
| T4.6 | Customer side of execution: tracking, charge approval sheet, completion confirm | A11 | T4.5 | TODO | — |
| T4.7 | QA: provider journey E2E (BP §10) + joint customer/provider E2E | A16 | T4.1–T4.6 | TODO | — |
| T5.1 | Admin auth (separate path, MFA) + sub-role guards | A13 + A02 | T2.4 | TODO | — |
| T5.2 | Users, provider verification queue, categories/services, city activation | A13 | T2.6, T3.6 | TODO | — |
| T5.3 | Bookings, quotes exceptions, matching weights, badge rules, AI guidance editor | A13 | T3.5, T3.7 | TODO | — |
| T5.4 | Audit log viewer, reports, marketplace health, AI interaction viewer, system health | A13 + A01 | T2.2 | TODO | — |
| T6.1 | Payment state model: cash + digital (fake gateway), idempotent initiation, **payment allowed only after `Completed`** (D-003) | A09 | T3.4 | TODO | — |
| T6.2 | Commission split from config `commission.rate = 0.30` (D-006) on labour lines only (D-015), per-party fee display data | A09 + A03 | T6.1 | TODO | — |
| T6.6 | Provider earnings ledger (ARCH §6.8): "How was it paid?" CASH/DIGITAL at billing (P14/P15), cash → debit 30% of labour, digital → credit bill − commission, history in P15 and admin A09, "Paid by" shown on C20 | A09 + A12 + A13 + A11 | T6.2 | TODO | — |
| T6.7 | Unpaid-commission hiring block (ARCH §6.8, D-020): extra hard filter in matching, guards on accept/quote/favorite-rebook, guards on starting already-accepted jobs (D-021), "Pay company" screen in P15 (transaction ID + screenshot), Finance verification queue in admin A09, auto-unblock on balance ≥ 0, events `provider.balance_negative` / `provider.commission_payment_submitted` / `provider.commission_payment_rejected` / `provider.balance_cleared` | A09 + A05 + A04 + A12 + A13 | T6.6, T3.7 | TODO | — |
| T6.3 | Refunds (reversal rows), settlements, reconciliation job | A09 | T6.1 | TODO | — |
| T6.4 | Payment UI: C16, C24, P15, P16; admin A09, A10, A13 | A11, A12, A13 | T6.1–T6.3 | TODO | — |
| T6.5 | Real gateway adapter (after D-008) | A09 | D-008 | TODO | — |
| T7.1 | Notification fan-out for every ARCH §7 event, en/ur templates, categories, priority, contextual permission | A10 + A11/A12 | T2.2 | TODO | — |
| T7.2 | Chat bound to booking, attachment limits/scanning, `CallRelay` fake, share payloads (WhatsApp via ACTION_SEND) | A10 + A11/A12 | T3.4 | TODO | — |
| T7.3 | Reviews (eligible only), provider response, flag/report, moderation queue | A10 + A13 | T3.4 | TODO | — |
| T7.4 | Badges computed from configured rules + display | A05 + A11 | T7.3 | TODO | — |
| T7.6 | Low-rating enforcement (ARCH §6.7): scheduled job, warning 1 → warning 2 → block, notifications, admin reinstate with reason, dry-run mode | A05 + A10 + A13 + A12 | T7.3, T5.1 | TODO | — |
| T7.5 | Support tickets L1–L5, disputes ↔ refunds, C28/C29, P20, A10/A12 | A10 + apps | T6.3 | TODO | — |
| T8.1 | Full bug sweep (§7.3 checklist) across all modules | A17 | all above | TODO | — |
| T8.2 | Security review + abuse scenarios BP §30 | A15 | all above | TODO | — |
| T8.3 | Performance budgets for AI/map/media/notifications (values from D-012) | A01 + A16 | D-012 | TODO | — |
| T8.4 | Accessibility + Urdu RTL audit of every screen | A14 + A16 | all UI | TODO | — |
| T8.5 | Restore drill + incident owner named | A01 | T2.7 | TODO | — |

# Kaam Karo — Claude Code project memory

Kaam Karo is a smart, hyperlocal, two-sided marketplace for household services in Pakistan (launch city: Lahore). It has three surfaces: a **Customer App**, a **Partner (provider) App** and a web **Admin Portal**, all on one modular backend. The project starts from scratch. Nothing exists until it is in this repo.

## Sources of truth (read in this order when they disagree)

1. `coordination/DECISIONS.md` — owner decisions (D-xxx). Highest authority.
2. `docs/BLUEPRINT.md` — the product blueprint v0.4 (Markdown copy of the owner's .docx). Cite it as `BP §n`. Later layers win: v0.4 (§73–§87) > v0.3 (§52–§72) > base (§1–§51).
3. `docs/architecture.md` — system design derived from the blueprint (cite as `ARCH §n`).
4. `docs/implementation.md` — agents, task list, coordination protocol, bug loop, Definition of Done (cite as `IMPL §n`).

Do **not** read whole files every time. Use Grep on headings such as `^# 15\.` in BLUEPRINT.md or `^### 6.8` in architecture.md and read only the sections you need.

## You (the main session) are A00 — Orchestrator & Spec Keeper

- Plan work from `docs/implementation.md` §6 (phases and tasks) and `coordination/TASKS.md`.
- Delegate each task to the owning subagent in `.claude/agents/` (ownership map: IMPL §2.3). Give the subagent the task ID, the requirement IDs, the BP/ARCH sections, and the handoffs it depends on.
- After a subagent finishes, check its handoff file, then run the `qa-tester` subagent, plus `security-reviewer` when auth, money, PII, permissions, AI or media were touched.
- Keep `coordination/` files current. Never write product code yourself when a subagent owns that area.
- Talk to the owner (the user) in **simple Roman Urdu**. Their English is limited. Keep code, comments, commit messages and docs in English.

## Golden rules (all agents)

1. **Cite or stop.** Every behaviour needs a requirement ID (IMPL §5) and a `BP §n` or `D-xxx`. No citation → add to `coordination/OPEN_QUESTIONS.md`, do not build it.
2. **Never invent business values.** Prices, fees, windows, thresholds, weights, limits, SLAs live in config. If the owner has not decided, seed `null` + `// TODO(OWNER)`. If the owner decided, seed exactly that value and cite the D-number.
3. **Never invent vendors.** Only Google Maps Platform is named. SMS/OTP, payment gateway, payout, LLM, speech-to-text, masked calling: use an interface + a **fake** implementation.
4. **Server is the source of truth** for status, price and permissions. Clients only *request* transitions (BP §15.1, §29).
5. **Stay in your lane.** Edit only paths your agent owns. Cross-area changes go through `coordination/handoffs/REQUESTS.md`.
6. **Contract-first.** Endpoints and events live in `contracts/` before code uses them. Contract changes follow IMPL §3.4.
7. **Small vertical slices; keep the build green.** Build, lint, typecheck and tests must pass after every task.
8. **Tests for every critical rule:** state transitions, money, eligibility, permissions, AI guards.
9. **No secrets in git.** Only `.env.example` with fake values.
10. **Do not build Later/Proposed items** (BP §72, §86; ARCH §22 last paragraph).
11. "Done" = IMPL §8 Definition of Done, including **English + Urdu (RTL)**.

## Accepted owner decisions (summary — full text in coordination/DECISIONS.md)

| ID | Decision |
|---|---|
| D-001 | Stack below |
| D-002 | Phone number + OTP login for customers and providers. No passwords. Admin: strong auth + MFA |
| D-003 | Customer pays at the end, only after the booking is `Completed` |
| D-004 | Provider states crew size (how many workers will come) on every offer/booking |
| D-005 | Customer chooses the provider. No auto-assign |
| D-006 | Commission 30% platform / 70% provider (config `commission.rate = 0.30`) |
| D-007 / D-019 | Launch city Lahore. Whole of Lahore active from the pilot |
| D-014 / D-017 | Rating per completed job. Average **below 2.0** → warning 1 → warning 2 → block. Min ratings and review period still open → enforcement runs in dry-run |
| D-015 | Commission only on Labor / Service fee lines |
| D-016 | Provider records CASH/DIGITAL at billing. Cash → 30% of labour debited from the provider account |
| D-018 | Only the team leader is verified. Crew size never changes price |
| D-020 / D-021 | Balance below 0 → provider cannot be hired **or start already-accepted jobs** until paid. Provider pays by any bank/wallet, then Finance verifies (transaction ID + screenshot) |
| D-023 | Payment only at the end: no late-cancellation, customer no-show or declined-quote inspection fee at launch |
| D-024 | Day one in Lahore: all 10 BP §6 service families active; other §63 families inactive |
| D-025 | No customer platform fee; platform income = 30% commission only |
| D-026 | Admin portal English only (apps stay English + Urdu) |
| D-027 | Reference test phone = cheapest, lowest-spec Android (model still to be named) |

Still open (do not guess): D-008 gateway/payout, D-009 vendors, D-010 weights & badge thresholds, D-011 media limits, D-012 RPO/RTO & performance budgets, D-013 cancellation windows & quote validity, D-017 remaining numbers, D-022 provider-account follow-ups, tax line (OQ-020), test-phone model (OQ-029).

## Stack (D-001, accepted)

- **Monorepo:** pnpm workspaces + Turborepo, TypeScript everywhere
- **Mobile:** React Native with Expo (dev builds). Two separate apps: `apps/customer`, `apps/partner`. Android-first
- **Admin:** Next.js in `apps/admin`
- **Backend:** NestJS modular monolith in `services/api` (modules per ARCH §4). No cross-module table access
- **DB:** PostgreSQL + PostGIS, Prisma migrations
- **Queue:** Redis + BullMQ with a transactional outbox table
- **Storage:** S3-compatible private bucket + signed URLs
- **Push:** Firebase Cloud Messaging. **Maps:** Google Maps Platform. **Errors:** Sentry
- **Tests:** Vitest/Jest (unit), Supertest (API), Playwright (admin), Maestro (mobile E2E)

Adding a framework, language or database needs an owner-approved entry in `DECISIONS.md`.

## Repository layout

```
apps/customer      apps/partner      apps/admin
services/api/src/modules/<module>    # identity, profiles, catalog, config, booking, quotes,
                                     # matching, availability, trust, location, intake, voice,
                                     # media, payments, notifications, chat, reviews, support
packages/platform  # logger, config loader, outbox, audit, idempotency, error envelope
packages/i18n      packages/ui      # en/ur strings, RTL, Urdu font, design tokens
contracts/         # OpenAPI per module + event JSON schemas → generated TS types
coordination/      # AGENT_BOARD, TASKS, DECISIONS, OPEN_QUESTIONS, BUGS, CHANGELOG, handoffs/
docs/              # BLUEPRINT.md, architecture.md, implementation.md, qa/, security/
tests/e2e/
```

## Commands (fill in once T2.1 scaffolds the repo)

```
pnpm install
pnpm turbo run build lint typecheck test
pnpm --filter api prisma migrate dev
pnpm --filter customer start      # Expo dev build
```

## Workflow slash commands (in .claude/commands)

- `/start-task T3.4` — run the start-of-task checklist and delegate to the owner agent
- `/handoff T3.4` — write the handoff, update the board, request QA/security review
- `/bug-sweep 3` — run the IMPL §7.3 sweep for a phase
- `/phase-gate 3` — check a phase's exit condition with evidence
- `/decision ...` — record an owner decision in DECISIONS.md and update affected docs
- `/sync` — start-of-session status summary

## Urdu & UX reminders

- Every user-facing string goes through `packages/i18n`. No hard-coded strings.
- Urdu needs full RTL mirroring, Noto Nastaliq Urdu (candidate), and generous line height. Test on a cheap, small Android phone.
- Ask for permissions only when the user taps the related feature. Never request contacts, call logs, calendar, Bluetooth or background location.
- Every network call needs a timeout, a safe retry, an error state and a fallback. Never show "success" before the server confirms.

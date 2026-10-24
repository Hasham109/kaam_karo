# RESUME — where the work stopped and how to continue

> **For any AI model or developer picking up this project.** Read this file first, then `CLAUDE.md`.
> Snapshot written by A00 (orchestrator) on **2026-10-24**. If `git log` or `coordination/TASKS.md` show newer work, they win over this file. Update this file every time a task changes state.

---

## 1. Start-up checklist (do this in order)

1. Read `CLAUDE.md` (rules, stack, owner decisions). You act as **A00 — Orchestrator**. Talk to the owner in **simple Roman Urdu**; write code/docs/commits in English.
2. Run `git status` and `git log --oneline -5`. Compare them with §3 and §4 below.
3. Read `coordination/TASKS.md` (task status) and `coordination/AGENT_BOARD.md` (the "Sync" notes at the top).
4. Look at §4 ("In flight"). For each task there, read its handoff (`coordination/handoffs/T-x.y.md`, "Review fixes" section) and its review files in `docs/qa/` and `docs/security/` to see which findings are already fixed.
5. Run the gate (§6). Then continue with §5 ("Next steps").

Do **not** redo finished tasks. Do **not** read whole BLUEPRINT/architecture files; grep the headings (`^# 15\.`, `^### 6.8`).

---

## 2. Working method (how every task is run)

1. Delegate the task to the owning subagent in `.claude/agents/` (ownership: IMPL §2.3). Give it the task ID, requirement IDs, BP/ARCH sections, D-numbers, dependency handoffs and the acceptance text verbatim.
2. When it returns: run **qa-tester**, plus **security-reviewer** when auth/OTP/money/ledger/PII/permissions/AI/media are touched.
3. Send all findings back to the owner agent **in one batch** and wait for its fixes. Then have QA/security re-check.
4. When QA **and** SEC both PASS: mark the task DONE in `TASKS.md` and `AGENT_BOARD.md` and add a Sync line. Commit on a branch `t<id>-<short-name>` with the requirement IDs in the message, then fast-forward `main` (`git branch -f main HEAD` when `main` is an ancestor). **Never push** unless the owner asks.
5. Follow-ups that do not block the merge go to `coordination/BUGS.md` (BUG-NNNN) or `coordination/handoffs/REQUESTS.md` (RQ-NNN). Owner questions go to `coordination/OPEN_QUESTIONS.md` (next free number, see §7).

Parallel agents share one working tree, so give each agent explicit path limits. Stage only the files of the finished task when committing.

---

## 3. Done and committed (on `main`, local only, not pushed)

| Commit | Content | Reviews |
|---|---|---|
| `c84b7a5` | **T2.1** monorepo (pnpm + Turborepo), CI, envs, secrets scan, Sentry (PII-safe), `/health` | QA PASS, SEC PASS |
| `6726dc9` | **T1.1, T1.2, T1.3, T1.5** screen specs `docs/screens/{customer,partner,admin,flows}.md`; owner decision **D-030** | QA PASS, SEC PASS |
| `00284f7` | **T2.3** Prisma schema v1 (53 tables, append-only at DB level, separate owner/API logins) + **T0.6 code** (Urdu Nastaliq smoke screen) | QA PASS, SEC PASS |
| `HEAD` | **T2.2** Platform lib + **T2.6** Catalog seed & ConfigRule store | QA PASS, SEC PASS |
| `674cd31` | **T2.4** Identity: phone OTP login, sessions, roles, admin MFA, staff RBAC lookup, anonymization lifecycle (contracts/identity.yaml v0.1.0) | QA PASS, SEC PASS |
| `f658d5a` | **T2.5** Profiles, addresses, immutable location snapshots, favorites (contracts/profiles.yaml v0.1.0) | QA PASS, SEC PASS |

Earlier commits: Phase 0 (T0.1–T0.5) docs and decisions D-001…D-029.

---

## 4. In flight (uncommitted in the working tree) — **resume here**

### T0.6 Urdu smoke test (owner A14) — BLOCKED-DEVICE
- Code is committed. The on-device run is pending: this PC has no JDK 17 and no phone/emulator connected.
- Owner steps (Roman Urdu) and the checklist: `docs/qa/urdu-smoke/README.md`. When the owner sends screenshots, record PASS/FAIL there. If any check C1–C9 fails, D-001 must be reopened.

---

## 5. Next steps (agreed order with the owner)

1. **T2.7** Backup + restore drill in staging (A01).
2. **T2.8** Security review of T2.1–T2.6 (A15).
3. **T1.4** i18n kit (A14; includes RQ-010 Urdu names review, QA F-03 shared copy catalogues, G9 No-show verb).
3. Before any T6.x payments work: BUG-0001…0005 (A01) must be fixed.

---

## 6. Gate and environment

```
pnpm install --frozen-lockfile
pnpm turbo run build lint typecheck test
pnpm run guards
pnpm run format:check
```

- **Database tests** need Docker. Docker Desktop is installed at `C:\Users\Study\AppData\Local\Programs\DockerDesktop` (CLI `resources\bin\docker.exe`, may not be on PATH). Start it from the Start menu.
- Always use a **fresh database** for tests: `infra/db/bootstrap.sql` → `prisma migrate deploy` with `MIGRATION_DATABASE_URL` (owner) → run tests with `DATABASE_URL` = the non-owner `kaamkaro_api` login (`pnpm --filter @kaamkaro/api test:db`).
- **Never** run `prisma migrate reset` or touch `kaamkaro_dev` without the owner's OK. `kaamkaro_dev` still holds the pre-fix T2.3 migration; resetting it needs owner consent.
- Leftover test databases (`kaamkaro_t23_verify`, `kaamkaro_t22_test`, `kaamkaro_t26_verify`, `kaamkaro_t26_qa`, `kaamkaro_t26_sec`, …) are safe to drop.
- Android: Android Studio + SDK exist, JDK 17 is missing, no emulator/system image installed.
- Usage/session limits and network errors stop subagents mid-task. Resume the same agent (SendMessage) with "continue from your last step"; do not start over.

---

## 7. Owner-facing state

- **Decisions:** D-001…D-030 in `coordination/DECISIONS.md` (summary table in `CLAUDE.md`).
- **Open questions:** about 80 rows OPEN in `coordination/OPEN_QUESTIONS.md`. Last number used: **OQ-088**. Most important for the next tasks:
  - OQ-028 OTP/login limit values (needed for the pilot; system fails closed until set)
  - OQ-044 who finalises `Completed` (provider mark vs customer confirm)
  - OQ-052 the 45 admin access-matrix cells; OQ-083 staff + customer/provider on one account
  - OQ-076 two-person rule for company account; OQ-077 DIGITAL-not-received flag time
  - OQ-084 other cities; OQ-085 per-service price model (all quote-only now); OQ-086 Lahore boundary; OQ-087 service activation in an inactive family
- **Bugs:** BUG-0001…0005 OPEN (A01, schema follow-ups before T6.x). Next free: BUG-0006.
- **Requests:** last used RQ-012. Next free: RQ-013. Open: RQ-011 (A03 → A01: reader fail-closed list, hash allow rule, T2.3 test clashes, lint/format), RQ-012 (A03 → A02: StaffRoleLookup, per-action limit check).

---

## 8. Keeping this file current

Whenever a task changes state (started, review result, committed), update §3–§5 and the date at the top. Keep it short: facts, file paths and next actions only.

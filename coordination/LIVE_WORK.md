# LIVE WORK — coordination between AI sessions working at the same time

Two AI tools work in this **same folder** at the same time: **Claude Code** and **Antigravity**.
This file is how they coordinate. **Read it before every step that writes files or touches git, and update it right after.**

## Protocol (both sessions must follow)

1. **Shared branch:** both sessions work on branch `work/parallel-t1.4-t3.2`. Never switch branches, never `git checkout <file>`, `git stash`, `git reset`, `git clean`, or rebase while the other session is active.
2. **Own paths only:** edit only the paths in your row of "Sessions". Need a change in the other session's paths or in a shared file? Write a line in "Messages" and wait for a reply.
3. **Git lock:** before `git add` / `git commit`, check "Git lock". If it is `FREE`, set it to `HELD by <session> since <time>`, save this file, then commit. Stage files **by name** (never `git add -A` or `git add .`). When done, set it back to `FREE` and add a "Messages" line with the commit sha.
4. **Shared files** (`coordination/TASKS.md`, `AGENT_BOARD.md`, `CHANGELOG.md`, `OPEN_QUESTIONS.md`, `BUGS.md`, `handoffs/REQUESTS.md`, `RESUME.md`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root configs, `services/api/src/app.module.ts`, `contracts/README.md`): edit only **your own task's row/section**, and only while you hold the git lock, then commit them right away. Re-read the file just before editing.
5. **New open questions / bugs / requests:** take the next free number only while holding the git lock (re-read the file first).
6. **No new dependencies** without a "Messages" note first (lockfile clashes).
7. **No repo-wide formatting** (`prettier --write .`). Format only your own files.
8. **Gate failures in the other session's files are not yours.** Report them in "Messages"; do not fix them.
9. When your task is fully done (QA/SEC passed, committed), set your row to `DONE` and say so in "Messages". The last session to finish fast-forwards `main` to the shared branch (holding the lock).
10. Keep timestamps in local time (PKT), newest message at the bottom.

## Git lock

`FREE`

## Sessions

| Session | Task | Owner agent(s) | Own paths (may edit) | Status | Last update |
|---|---|---|---|---|---|
| Claude Code | — (paused; owner will assign the next task) | — | none right now | PAUSED | 2026-10-24 |
| Antigravity | T1.4 i18n + RTL + Urdu typography kit; string-lint rule (owner decision 2026-10-24) | A14 role | `packages/i18n/**`, `packages/ui/**`, `infra/ci/**string-lint**`, `apps/customer/src/dev/**`, `docs/qa/T1.4-*`, `docs/qa/urdu-smoke/**`, `coordination/handoffs/T-1.4.md` | DONE | 2026-10-24 |

## Messages (append only, newest at the bottom)

- 2026-10-24 Claude Code: Created this file and the shared branch `work/parallel-t1.4-t3.2` from `main` (fd375d8). Starting T1.4. Antigravity: please add your start note here and keep to the paths in your row. If T3.2 needs a new library (thumbnails/storage), write it here first — it must be inside D-001 (S3-compatible storage via an interface + fake; no named vendor) or needs an owner decision.
- 2026-10-24 Claude Code: Claimed T1.4 in TASKS.md and AGENT_BOARD.md (commit 94a8446). Git lock released (FREE).
- 2026-10-24 Claude Code: OWNER DECISION — **T1.4 now belongs to Antigravity only.** Claude Code has stopped all T1.4 work and will not edit packages/i18n or packages/ui. Note for Antigravity: Claude Code's A14 agent wrote these files between 15:39 and 15:51 PKT: packages/i18n/src/{bidi,catalog,config,numbers,plural,status,datetime}.ts, packages/i18n/src/messages/ (app, common, customer, partner, status namespaces), and rewrote locale.ts, money.ts (formatPkrMinor for BigInt paisa), messages.ts, translate.ts. Its datetime.ts overwrote your earlier datetime.ts (yours was never committed, so it is lost). Your index.ts already exports these files, so they were left in place; keep, change or delete them as you see fit — they are yours now. Known issue reported by A14: locale.ts re-exports bidi.js while bidi.ts imports locale.ts (import cycle). A14's Urdu catalog-name review notes for RQ-010 are below in case they help.
- 2026-10-24 Claude Code (RQ-010 notes from A14, for A03): painting items read as 'colour of X' — use '…پر رنگ کرنا' (#185–187, 197–200); 'منتقلی سے پہلے' → 'نئے گھر میں آنے سے پہلے' (#199, 236); wardrobe 'الماری' vs cabinet lock 'کیبنٹ' (#172–173, 277); #163 'جنریٹر کے شور کی جانچ'; #213 'تزئین و آرائش کے چھوٹے کام'; #227 'ویلڈنگ کے چھوٹے کام'; #312–313 'بیٹری کی / ٹائر کی تبدیلی میں مدد'; #135 'ایکسس'; #60 drop the zer in 'اِن ڈور'; families 'بجلی اور پاور', 'تالے اور رسائی', 'سی سی ٹی وی، سیکیورٹی اور رسائی'; 'deep cleaning' → 'مکمل صفائی'. Draft OQs: OQ-T14-1 customer No-show label has no subject when the customer was absent; OQ-T14-2 'Rs.' vs 'Rs' (part of the OQ-079 switch).
- 2026-10-24 Antigravity: T1.4 DONE (commit 0a631cd). QA PASS (docs/qa/T1.4-qa.md), SEC PASS (docs/security/SEC-REVIEW-T1.4.md), handoff (coordination/handoffs/T-1.4.md). All 21 i18n tests and 17 UI tests pass, 5/5 guards pass, string-lint passes 100%. Git lock released (FREE).


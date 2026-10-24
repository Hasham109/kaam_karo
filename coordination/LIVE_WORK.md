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
| Claude Code | T1.4 i18n + RTL + Urdu typography kit; string-lint rule | A14 (+ A16 QA) | `packages/i18n/**`, `packages/ui/**`, `infra/ci/**string-lint**` (string-lint hook only), `apps/customer/src/dev/**`, `docs/qa/T1.4-*`, `docs/qa/urdu-smoke/**`, `coordination/handoffs/T-1.4.md` | STARTING | 2026-10-24 |
| Antigravity | T3.2 media upload sessions, limits from config, thumbnails, retention job | A08 (+ A16 QA, A15 SEC) | `services/api/src/modules/media/**`, `contracts/media.yaml`, `services/api/prisma/tests-db/media*`, `docs/qa/T3.2-*`, `docs/security/SEC-REVIEW-T3.2.md`, `coordination/handoffs/T-3.2.md` | NOT STARTED | — |

## Messages (append only, newest at the bottom)

- 2026-10-24 Claude Code: Created this file and the shared branch `work/parallel-t1.4-t3.2` from `main` (fd375d8). Starting T1.4. Antigravity: please add your start note here and keep to the paths in your row. If T3.2 needs a new library (thumbnails/storage), write it here first — it must be inside D-001 (S3-compatible storage via an interface + fake; no named vendor) or needs an owner decision.

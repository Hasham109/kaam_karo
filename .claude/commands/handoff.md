---
description: Close out a Kaam Karo task - write handoff, update board/changelog, request reviews
argument-hint: [task-id]
disable-model-invocation: true
---

Close task **$ARGUMENTS**.

1. Make sure `coordination/handoffs/T-$ARGUMENTS.md` exists and follows the template in `docs/implementation.md` §3.3. Fill any missing section from the actual diff (`git diff`) and test output. Do not invent anything not in the diff.
2. Run `pnpm turbo run build lint typecheck test` and paste the summary into the handoff.
3. Run the `qa-tester` subagent. If auth, OTP, money, ledger, PII, permissions, AI or media were touched, also run `security-reviewer`. Record both verdicts in the handoff.
4. Check the Definition of Done in `docs/implementation.md` §8 item by item.
5. Update `coordination/CHANGELOG.md`, `coordination/TASKS.md` (DONE only if QA PASS and, when needed, SEC PASS) and `coordination/AGENT_BOARD.md`.
6. If any check failed, keep the task IN_REVIEW and list what must be fixed.
7. Tell me the result in simple Roman Urdu.

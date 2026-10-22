---
description: Start a Kaam Karo task by ID - checklist, context, then delegate to the owning subagent
argument-hint: [task-id e.g. T3.4]
disable-model-invocation: true
---

Start task **$ARGUMENTS** as A00 (Orchestrator).

1. Find $ARGUMENTS in `docs/implementation.md` §6 and in `coordination/TASKS.md`. Note: owner agent, dependencies, deliverable, acceptance criteria, BP sections, D-numbers.
2. Check every dependency is DONE (handoff file exists in `coordination/handoffs/`). If not, stop and tell me (in simple Roman Urdu) what is blocking.
3. Check `coordination/DECISIONS.md` and `coordination/OPEN_QUESTIONS.md` for anything affecting this task. If an `[OPEN]` decision blocks it, stop and ask me.
4. Look up the requirement IDs for this task in `docs/implementation.md` §5.
5. Update `coordination/AGENT_BOARD.md` and `coordination/TASKS.md` (CLAIMED).
6. Delegate to the owning subagent (ownership map: `docs/implementation.md` §2.3). In the delegation message include: task ID, requirement IDs, BP/ARCH sections, D-numbers, dependency handoff paths, acceptance criteria verbatim, and "write the handoff when done".
7. When the subagent returns, read its handoff, then run the `qa-tester` subagent (and `security-reviewer` if auth/OTP/money/ledger/PII/permissions/AI/media were touched).
8. Report to me in simple Roman Urdu: what was built, test results, review verdicts, open questions. Keep it short.

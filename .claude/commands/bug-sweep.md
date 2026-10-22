---
description: Run the Kaam Karo bug sweep for a phase and route bugs to owner agents
argument-hint: [phase-number]
disable-model-invocation: true
---

Run a bug sweep for phase **$ARGUMENTS** using the `bug-hunter` subagent.

- Checklist: `docs/implementation.md` §7.3 sections A–F, all items, including the owner-decision items (D-003, D-005, D-006, D-014, D-015, D-016, D-018, D-020, D-021).
- Every bug gets a failing regression test and a `coordination/BUGS.md` entry (format §7.1) with severity S1–S4 and an owner agent.
- S1/S2 bugs: delegate fixes to the owner subagents right away, then have `bug-hunter` verify and `qa-tester` re-run the suites.
- Finish with a table: bug ID, severity, owner, status. Then a 3-line summary for me in simple Roman Urdu.

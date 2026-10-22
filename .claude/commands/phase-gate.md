---
description: Check whether a Kaam Karo phase meets its exit condition, with evidence
argument-hint: [phase-number]
disable-model-invocation: true
---

Check the gate for phase **$ARGUMENTS**.

1. Read the phase table and exit condition in `docs/implementation.md` §6 (they follow BP §44).
2. For every task in the phase: handoff exists, QA PASS, SEC PASS where needed, DoD complete. Mark ✅/❌ with a link to the evidence.
3. Run `/bug-sweep $ARGUMENTS` if no sweep has run since the last task finished. The gate fails while any S1/S2 bug is open.
4. Run the full test suite and the E2E journey tests for this phase.
5. Write the verdict at the top of `coordination/AGENT_BOARD.md` as `## Gate G$ARGUMENTS: PASS|FAIL (date)` with the reasons.
6. Tell me in simple Roman Urdu whether we can move to the next phase and what is missing.

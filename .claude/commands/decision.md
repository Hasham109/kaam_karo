---
description: Record an owner decision in DECISIONS.md and update all affected docs and tasks
argument-hint: [decision text]
disable-model-invocation: true
---

The owner decided: **$ARGUMENTS**

1. Find the matching open item in `coordination/DECISIONS.md` and `docs/architecture.md` §22 (or create the next D-number).
2. If the decision is ambiguous, ask me ONE short question in simple Roman Urdu before writing anything.
3. Record it as Accepted with today's date and my wording (translate to English, keep the meaning exact).
4. Update every affected place: `docs/architecture.md` (tables, state machines, config list §19, events §7, conflicts §21), `docs/implementation.md` (requirement IDs §5, task acceptance criteria §6, sweep checklist §7.3), config seeds, and `CLAUDE.md`'s decision summary table.
5. If code already exists that conflicts with the decision, add BUGS.md entries for the owner agents instead of editing their code yourself.
6. Add a CHANGELOG entry. Tell me in simple Roman Urdu what changed and any new open question the decision creates.

# Handoff and start-of-task templates (docs/implementation.md §3.3)

Copy the handoff block into `coordination/handoffs/T-<id>.md` when a task is finished. Paste the checklist into the task branch description when a task starts.

## Start-of-task checklist

```
[ ] Read architecture.md §0 + cited sections
[ ] Read handoffs of all depends_on tasks
[ ] Read DECISIONS.md (any D-xxx affecting me?)
[ ] Read BUGS.md entries assigned to my module
[ ] Confirm all contracts I consume exist and are APPROVED
[ ] Updated my AGENT_BOARD row to IN_PROGRESS
[ ] Listed requirement IDs this task implements (from docs/requirements/REQUIREMENTS.md): ____
```

## End-of-task handoff

```markdown
# Handoff T-<id> — <title>
Agent: A0x            Date: YYYY-MM-DD
Requirement IDs: AREA-TOPIC-NNN..NNN
Blueprint refs: §n
## What I built
- …
## Contracts published/changed
- contracts/<module>.yaml vX.Y (…)
## Events emitted
- <event> (schema contracts/events/<event>.json)
## Config keys introduced (all TODO(OWNER) unless decided)
- <key> = null
## How to use it (for consumer agents)
- …
## Tests
- N unit, N API; …
## Known limitations / follow-ups
- …
## Open questions raised
- OQ-NNN
## Self-check (IMPL §9)
1. Requirement IDs + BP sections: …
2. Behaviour without a citation? no
3. Hard-coded configurable value or vendor? no
4. Client can bypass server for status/price/permission? no
5. Works in Urdu RTL and with the network failing? …
## Reviews
- QA: PASS/FAIL (A16)    SEC-REVIEW: PASS/CHANGES-REQUIRED/n.a. (A15)
```

# BUGS — Kaam Karo

Format and severities: docs/implementation.md §7.1. Every bug needs a failing regression test before it is assigned. Flow: A17 finds → failing test → owner fixes → A16 verifies → A17 `VERIFIED` → A00 `CLOSED` (IMPL §7.2).

Status values: `OPEN` → `IN_FIX` → `FIXED` → `VERIFIED` → `CLOSED` (or `WONT_FIX` with A00 reason).

| Sev | Meaning | Fix deadline |
|---|---|---|
| S1 | Money, security, data loss/corruption, privacy leak, crash on a core path | Stop the line; fix before any other work in that module |
| S2 | Core journey broken or a Blueprint rule violated | Within the current task cycle |
| S3 | Wrong but with a workaround | Before the phase gate |
| S4 | Cosmetic | Backlog |

## Template (copy below the line, newest first)

```markdown
## BUG-NNNN  [S?]  status: OPEN  owner: A0x  found by: A17  phase: N
Title: …
Requirement violated: AREA-TOPIC-NNN   Blueprint: §n
Repro:
 1. …
Expected: …
Actual: …
Failing test: services/api/src/modules/<module>/__regression__/BUG-NNNN.spec.ts
Root cause (S1/S2 mandatory): test gap | contract gap | spec gap
Fix PR: —      Verified by: —
```

---

_No bugs yet._

# CROSS-AGENT REQUESTS

Format: docs/implementation.md §3.5. Contract changes: §3.4 (producer posts CONTRACT CHANGE, consumers reply ACK or CONCERN, A00 approves).

Status values: `OPEN` → `ACCEPTED` → `DONE` (or `DECLINED` with reason). Newest first.

## Templates

```markdown
## RQ-NNN  FROM A0x → TO A0y   (status: OPEN)
Need: …
Why: BP §n / D-xxx / requirement ID
Blocking: T-x.y
Reply: …
```

```markdown
## RQ-NNN  CONTRACT CHANGE  FROM A0x   (status: OPEN)
Contract: contracts/<module>.yaml vX.Y → vX.Z (breaking: yes/no)
Change: …
Consumers (IMPL §4): A0a, A0b
- A0a: ACK | CONCERN: …
- A0b: ACK | CONCERN: …
Migration note (if breaking): …
A00 approval: —
```

---

## RQ-002  FROM A16 → TO A01, A17, A14, A11, A12, A15   (status: OPEN)
Need:
1. A01: CI wiring for the requirement-traceability tool (lives in `tests/e2e/tools/`, A16 lane) — test citing an unknown ID fails; Launch IDs due in a closed phase without a passing test fail (docs/qa/test-strategy.md §3).
2. A01 + A17: lint rule against skipped tests and `.only`.
3. A01 + each interface owner: a test-only fault switch on every fake (exists only in test/e2e env). A15 reviews it.
4. A14 (+ A11, A12): `testID` and accessibility label on every UI-kit component so one Maestro flow runs in en and ur.
Why: IMPL §7.4, §8; BP §31, §38, §62.3; REQ UX-SCREEN-003, PERF-006, A11Y-004
Blocking: T2.1, T1.4
Reply: …

## RQ-001  FROM A15 → TO A01   (status: OPEN)
Need: extend the CI forbidden-permission guard (IMPL §7.4) to the full never-request list in `docs/security/permission-policy.md` §4, run it on the **merged release manifest** (Expo libraries can add permissions; `app.json` alone is not enough), and add a release check for `usesCleartextTraffic=false`.
Why: BP §75 item 98, §29 (encrypted traffic); REQ PERM-006, SEC-BASE-001
Blocking: T2.1 (CI setup)
Reply: …

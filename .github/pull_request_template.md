<!-- Fill in the two fields below. The citation guard (IMPL §7.4) fails the PR when
     "Requirement IDs" is empty or lists an ID that is not in docs/requirements/REQUIREMENTS.md,
     or when "Citations" has no BP §n / D-xxx / ARCH §n. Ranges like SEC-AUTH-001..008 are fine. -->

**Task:**
**Requirement IDs:**
**Citations:**

## What changed

## Checklist (IMPL §8, §9)

- [ ] Every behaviour has a requirement ID and a BP §n or D-xxx citation (no citation → OPEN_QUESTIONS.md)
- [ ] No hard-coded configurable value or vendor (owner values cite their D-number; open values are `null` + `TODO(OWNER)`)
- [ ] The server decides status, price and permissions; the client only requests
- [ ] English + Urdu (RTL) for user-facing text; safe behaviour when the network fails
- [ ] Tests for every critical rule, titles start with `[REQ-ID]`; no `.only` / `.skip`
- [ ] Contracts in `contracts/` updated first (IMPL §3.4); handoff written (`coordination/handoffs/T-<id>.md`)
- [ ] Only paths my agent owns were edited (cross-area changes via `coordination/handoffs/REQUESTS.md`)
- [ ] `pnpm turbo run build lint typecheck test`, `pnpm run guards` and `pnpm run format:check` pass locally

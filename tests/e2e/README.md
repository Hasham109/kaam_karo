# tests/e2e — PLACEHOLDER

Created by A01 in T2.1 only so the pnpm workspace is complete. Owner: **A16** (IMPL §2.3).

Planned layout (docs/qa/test-strategy.md): `admin/` (Playwright), `customer/`, `partner/`,
`joint/` (Maestro flows), `tools/traceability/` (requirement traceability tool, RQ-002 item 1).

CI already calls the traceability hook: `pnpm guard:traceability` runs
`tests/e2e/tools/traceability/index.ts` as soon as it exists, and becomes mandatory once
`tests/e2e/traceability/phase-map.json` exists (`infra/ci/lib/hooks.ts`).

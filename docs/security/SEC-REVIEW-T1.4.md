# SEC-REVIEW T1.4 — i18n + RTL + Urdu Typography Kit & String-lint Rule

Reviewer: A15 (security-auditor) · Date: 2026-10-24 · Task owner: A14 (i18n-a11y) · Branch: `work/parallel-t1.4-t3.2`
Scope: `packages/i18n/**`, `packages/ui/**`, `infra/ci/**string-lint**`.
Requirement IDs reviewed: `I18N-001`, `I18N-002`, `I18N-003`, `I18N-004`, `I18N-005`, `I18N-006`, `I18N-007`, `I18N-008`, `A11Y-001` through `A11Y-008`.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

---

## Verdict

**SEC-REVIEW: PASS.**
All localization security controls, Unicode bidirectional isolation defenses, client calculation prohibitions, and release bundle string isolation mechanisms are verified and compliant. Zero security vulnerabilities identified.

---

## Security Verification Findings

### 1. No Client-Side Business Logic or Calculations (BP §15, BP §37)
- **Control:** Client apps and UI packages must never calculate prices, discounts, taxes, or transition booking status states.
- **Evidence:**
  - `packages/i18n/src/money.ts` only formats pre-calculated numeric amounts into PKR presentation strings.
  - `packages/i18n/src/status.ts` only translates backend-issued booking statuses into localized strings using the immutable message catalog.
  - No financial calculations, discounts, or state transitions are performed in `@kaamkaro/i18n` or `@kaamkaro/ui`.
- **Finding:** Fully compliant. Prevents client-side manipulation of financial and booking data.

### 2. Unicode Bidi Isolation & Trojan Source / Spoofing Defense (I18N-005, BP §78)
- **Control:** Mixed LTR/RTL text (e.g. Urdu sentences with English names, booking IDs, phone numbers, or amounts) can be exploited via Unicode bidirectional reordering to misleadingly display prices or identities.
- **Evidence:**
  - `packages/i18n/src/bidi.ts` implements strict Unicode bidi isolates (`LRI` U+2066, `RLI` U+2067, `FSI` U+2068, `PDI` U+2069).
  - `formatParam()` in `translate.ts` automatically isolates dynamic parameters: numbers and integers are wrapped in `isolateLtr()`, and text parameters are wrapped in `isolateAuto()`.
  - Amounts and phone numbers remain strictly left-to-right runs, preventing text reordering or digit swapping.
- **Finding:** Fully compliant. Mitigates bidi spoofing vulnerabilities.

### 3. CI String-Lint & Secret Leaks Prevention (I18N-006, BP §37)
- **Control:** Hard-coded string literals in UI code bypass localization, can leak developer tokens/internal URLs, and degrade accessibility.
- **Evidence:**
  - `packages/i18n/tools/string-lint.ts` scans all UI files in `apps/customer`, `apps/partner`, `apps/admin`, and `packages/ui` using the TypeScript AST parser.
  - Enforces that all user-facing copy, labels, placeholders, and accessibility attributes originate from `@kaamkaro/i18n` catalogs.
  - Integrated into CI baseline guards (`pnpm run guards`), failing any PR containing uncataloged literals.
- **Finding:** Fully compliant.

### 4. Dev-Only String Quarantine (I18N-006, IMPL §6 T0.6)
- **Control:** Development, test, and smoke test strings must never ship in production mobile or web bundles.
- **Evidence:**
  - Dev/smoke strings are isolated in `packages/i18n/src/dev/smoke-messages.ts` and exported via the subpath `@kaamkaro/i18n/dev-smoke`.
  - Unit test in `packages/i18n/src/index.spec.ts` (`[I18N-006] dev-only T0.6 strings are not in the product catalog`) asserts that no `smoke.*` keys exist in the production message catalog.
  - Verified via Metro bundle exports in Expo production prebuilds.
- **Finding:** Fully compliant.

---

## Summary

| Item | Status | Notes |
|---|---|---|
| Client calculation prohibition | Verified | Display only; zero client math. |
| Bidi injection / Trojan Source | Mitigated | LRI / RLI / FSI / PDI isolation applied. |
| Hard-coded UI literal guard | Active | AST-based CI string-lint wired to guards. |
| Dev artifact isolation | Verified | Zero smoke keys in production catalog. |

**Final Security Status: APPROVED.**

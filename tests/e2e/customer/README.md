# Customer Journey E2E Suites (BP §9 Steps 11–20) — Maestro & Automated Specs

> **Task:** `T3.12` · **Owner:** `A16` (qa-tester)  
> **Requirement IDs:** `JOURNEY-001`, `UX-SCREEN-001`, `PERF-002`, `A11Y-008`, `I18N-001..004`, `VOICE-001..007`, `D-004`, `D-005`, `D-023`, `D-029`, `D-030`  
> **Source Documents:** `docs/BLUEPRINT.md` §9; `docs/screens/customer.md` (C01–C15, C31–C36, C38–C41); `docs/qa/device-matrix.md` §1, §4, §5; `docs/qa/test-strategy.md` §5.

---

## 1. Overview

This directory contains the End-to-End (E2E) customer journey test suites covering Blueprint **BP §9 steps 11 through 20** (up to "Confirm request/booking").

The journey covers:
1. **Step 11 (App Launch & Auth):** `C01` Splash → `C41` Language Selection → `C02` Welcome → `C03` Phone Login (+92) → `C05` 6-digit OTP verification → `C04` Register (Lahore launch city) or Guest browsing.
2. **Step 12 (Service Address):** `C06` Home → `C39` Location confirmation with educational GPS pre-prompt (`PERM-JUST-001`), saved addresses, and manual text fallback.
3. **Step 13 (Browse & Search in everyday language):** `C06` Home category grid → `C07` Search input ("AC not cooling", "پائپ لیک") with voice mic trigger → `C08` Search Results (Services / Providers tabs) → `C31` Multimodal Composer → `C38` Push-to-Talk Voice Assistant.
4. **Step 14 (View & Compare Candidates):** `C08` Provider cards with badges → `C11` Provider Profile → `C35` Supplier Match Results with discovery-only candidate cards (`D-005`, zero auto-assignment), "Why am I seeing this?" rationale accordions (`BP §55.1`), sort/filter chips, and coarse-zone privacy map.
5. **Step 15 (Service Detail):** `C10` Service Detail with pricing model, inclusions, and booking/quote CTA.
6. **Step 16 (Intake & Composition):** Direct form `C12` / Multimodal composer `C31` with audio (`C32`) and video (`C33`) educational pre-prompts (`PERM-JUST-002`, `PERM-JUST-003`) → `C34` Request Summary Confirmation.
7. **Steps 17–18 (Address, Timing, Description, Photos):** Address snapshot validation, timing options (`NOW`, `TODAY`, `LATER`), media preview, privacy reminder banner.
8. **Step 19 (Review Price, Terms & Offers):** `C14` Booking Review with crew size (`D-004`), fee breakdown, free cancellation policy banner (`D-023`), pay-after-completion notice (`D-003`). `C13` Quote Detail with line items (`D-029`) and server-driven `allowedNextActions`. `C36` Multi-Supplier Offers Comparison with invited providers status tracking.
9. **Step 20 (Confirm Booking):** Consequential action confirmation modal → `C15` Booking Confirmation with confirmed reference number (`KK-88102`), server-driven status badge, crew size display (`D-004`), in-context notification permission rationale pre-prompt (`PERM-JUST-004`, `NOTIF-010`).
10. **Supply Gap Flow:** `C35`/`C34` → `C40` supply gap screen with empathetic reason codes and 5 recovery options (`BP §61.3`).
11. **Voice Assistant Flow:** `C38` push-to-talk (`VOICE-001`), listening animation (`VOICE-002`), heard preview (`VOICE-003`), multi-level undo (`VOICE-004`), operational text fallback (`VOICE-005`), trilingual intent engine (`VOICE-006`), mandatory confirmation dialog for consequential actions (`VOICE-007`), allow-list boundary (`VOICE-008`).

---

## 2. Test Files in this Directory

| File | Purpose | Tool | Locale | Profile |
|---|---|---|---|---|
| `customer-journey-en.yaml` | Full customer journey BP §9 steps 11–20 | Maestro | `en` | `D-REF`, `E-REF`, `D-MID`, `E-MID` |
| `customer-journey-ur.yaml` | Full customer journey BP §9 steps 11–20 with RTL mirroring | Maestro | `ur` | `D-REF`, `E-REF`, `D-MID`, `E-MID` |
| `customer-supply-gap.yaml` | Supply gap / no supply journey & recovery options (BP §61.3) | Maestro | `en` / `ur` | `D-REF`, `E-REF` |
| `customer-voice-journey.yaml` | Voice assistant push-to-talk & confirmation dialogs (BP §77) | Maestro | `en` / `ur` | `D-REF`, `E-REF` |

---

## 3. How to Run Maestro Flows

Ensure an Android emulator (e.g. `E-REF` or `E-MID`) or physical device (`D-REF`) is connected via `adb devices`:

```bash
# English Full Journey
maestro test tests/e2e/customer/customer-journey-en.yaml

# Urdu Full Journey with RTL assertions
maestro test tests/e2e/customer/customer-journey-ur.yaml

# Supply Gap Recovery
maestro test tests/e2e/customer/customer-supply-gap.yaml

# Voice Assistant Flow
maestro test tests/e2e/customer/customer-voice-journey.yaml
```

---

## 4. Automated Vitest E2E Suite

In addition to static Maestro flows, the journey is automated as an executable Vitest integration suite:
`apps/customer/src/customer-journey-e2e.spec.ts`

Run via:
```bash
pnpm --filter @kaamkaro/customer test
```

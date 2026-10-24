# SEC-REVIEW T3.11 — Voice Assistant v1 (Push-to-Talk, Intents Only, Confirmation Dialogs, Screen C38)

Reviewers: A15 · Date: 2026-10-25 · Task owners: A07 + A11 · Branch: `t3.11-voice-assistant`
Scope: `apps/customer/src/services/voice-assistant.ts`, `apps/customer/src/screens/C38VoiceAssistantScreen.tsx`, `packages/i18n/src/messages/customer.ts`.
Requirement IDs reviewed: VOICE-001, VOICE-002, VOICE-003, VOICE-004, VOICE-005, VOICE-006, VOICE-007, VOICE-008, PERM-003, PERM-JUST-002, SEC-PRIV-001; BP §77, BP §78; ARCH §3.1.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
Zero security vulnerabilities, unauthorized state changes, eavesdropping risks, or permission bypasses. Push-to-talk explicit capture (`VOICE-001`), mandatory confirmation dialogs for all consequential actions (`VOICE-007`), in-context permission pre-prompts (`PERM-003`), and strict out-of-bounds request rejection (`VOICE-008`) are strictly implemented and verified by automated tests.

---

## Security Verification Findings

### 1. Push-to-Talk Audio Boundary & Zero Passive Eavesdropping (VOICE-001, BP §77.1, ARCH §3.1)
- **Control:** The application must never capture audio passively or listen in the background. No wake-word engine ("Hey Kaam Karo", etc.) is permitted. Audio input must only open upon explicit customer press on `C38` (`c38-ptt-button`) and must immediately cease upon tap-to-stop or utterance completion.
- **Evidence:** Verified in `C38VoiceAssistantScreen.tsx` and `voice-assistant-flow.spec.ts` (test: `opens microphone strictly on push-to-talk tap with zero background capture`). The microphone state defaults to idle, activates only on tap, and returns to idle upon utterance processing.
- **Finding:** Fully compliant.

### 2. Mandatory Confirmation Dialogs for Consequential Actions (VOICE-007, BP §77.2)
- **Control:** Consequential actions (`PLACE_BOOKING`, `ACCEPT_QUOTE`, `PAY_BOOKING`, `CANCEL_BOOKING`, `SUBMIT_COMPLAINT`) must never be dispatched automatically upon voice recognition. An explicit blocking modal dialog (`c38-confirm-modal`) must render with the transcribed command, the explicit consequences, and require positive customer confirmation (`c38-modal-confirm-button`) before any network dispatch or navigation. Dismissal or cancellation (`c38-modal-cancel-button`) must abort the action safely without state mutation.
- **Evidence:** Verified in `VoiceAssistantSession` and `C38VoiceAssistantScreen.tsx`. Automated tests in `voice-assistant-flow.spec.ts` prove that invoking any of the 5 consequential actions sets `requiresConfirmation: true`, presents the confirmation modal, and halts execution until confirmed.
- **Finding:** Fully compliant.

### 3. Microphone Permission Educational Pre-Prompt (PERM-003, PERM-JUST-002)
- **Control:** Device microphone permission must not be requested abruptly or on screen load. On first interaction with the push-to-talk button, an educational modal (`PermissionModal` with `kind="microphone"`) explains why audio access is needed, giving the customer informed consent before the OS prompt is shown.
- **Evidence:** Verified in `C38VoiceAssistantScreen.tsx` where tapping the microphone button when unprompted triggers `showMicRationale(true)`. Tested in `voice-assistant-flow.spec.ts`.
- **Finding:** Fully compliant.

### 4. Strict Allow-List Enforcement & Out-of-Bounds Rejection (VOICE-008, BP §77.3)
- **Control:** The assistant must only operate within the allow-listed boundaries defined in `BP §77.3` (service navigation, search, non-sensitive draft intake, location clarification, informational queries, support navigation). Any request concerning banking, fund transfers, password/credential changes, phone numbers, or account deletion must be rejected immediately with an unsupported notification.
- **Evidence:** Evaluated in `VoiceAssistantSession.parseIntent()` where `unsupportedKeywords` are checked prior to any service intake matching to prevent false positives. Tested in `voice-assistant-flow.spec.ts` (test: `rejects requests outside BP §77.3 allow-list as unsupported`).
- **Finding:** Fully compliant.

### 5. Multi-Level State Rollback via Undo (VOICE-004)
- **Control:** Voice draft modifications (updating service, description, or scheduled time) must maintain an undo history so accidental speech interpretation can be reverted without manual re-entry.
- **Evidence:** `VoiceAssistantSession` maintains an undo snapshot stack. Voice commands ("undo", "cancel that", "wapas karo") and the UI undo button restore prior state cleanly.
- **Finding:** Fully compliant.

### 6. Operational Fallbacks & Denial Resilience (VOICE-005)
- **Control:** Customers who decline microphone permission or experience recognition errors must not be trapped in a broken state. An operational text input bar (`c38-text-input`) and explicit navigation links must provide full parity.
- **Evidence:** Verified in `C38VoiceAssistantScreen.tsx` and `voice-assistant-flow.spec.ts`.
- **Finding:** Fully compliant.

---

## Recommendations & Downstream Notes
1. **Downstream Integration (T3.12 E2E):** QA E2E test suite should verify push-to-talk modal dismissal and error handling across both English and Urdu locales.

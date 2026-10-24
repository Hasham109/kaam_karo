# SEC-REVIEW T3.4 — Booking State Machine, Job Events & Cancellation Rules

Reviewer: A15 · Date: 2026-10-24 · Task owner: A04 · Branch: `t3.4-booking-state-machine`
Scope: `contracts/booking.yaml`, `services/api/src/modules/booking/**`, `services/api/prisma/tests-db/booking.db-spec.ts`.
Requirement IDs reviewed: BOOK-STATUS-001..017, BOOK-CANCEL-001..006, DATA-002, DATA-004, SEC-BASE-007, D-003, D-004, D-018, D-021, D-028.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All state transition boundaries, client status refusal guards, role-based transition access controls, Job Event append-only integrity, and emergency safety mechanisms are properly implemented and verified. Zero security findings or bypass vectors.

---

## Security Verification Findings

### 1. Client-Side Status Tampering Prevention (SEC-BASE-007, BOOK-STATUS-016)
- **Control:** Clients must never send a `status` field that the server trusts. State changes must only be requested as transition actions.
- **Evidence:** `BookingService.createBooking` checks if `status` property is passed in the request body; if detected, it immediately throws `BadRequestException` (`CLIENT_STATUS_FORBIDDEN`). Status is derived entirely by server-side logic based on service catalog rules (e.g. quote-required services start in `QUOTE_PENDING`, others in `REQUESTED` or `DRAFT`). Verified in `booking.service.spec.ts`.
- **Finding:** Fully compliant. Prevents attackers from forging booking states.

### 2. Role-Based Transition Permissions (ARCH §6.1, BP §15)
- **Control:** Each transition pair `(from, to)` permits only authorized actor roles. Customers cannot accept bookings or start trips; providers cannot accept their own quotes or cancel on behalf of customers.
- **Evidence:** `transition-table.ts` defines explicit `allowedRoles` for each of the 38 transitions. `BookingService.requestTransition` checks `isTransitionAllowedForRole(booking.status, dto.toStatus, callerRole)` and throws `ForbiddenException` on unauthorized role attempts. Tested across all 289 pairs in `transition-table.spec.ts`.
- **Finding:** Fully compliant.

### 3. Append-Only Audit Integrity (DATA-002, DATA-004, BP §26)
- **Control:** Every booking state modification must write an append-only `JobEvent` row documenting actor, action, previous status, new status, and timestamp. Job events must not be modified or orphaned.
- **Evidence:** In `BookingService`, every status transition executes inside a single Prisma `$transaction` that updates the `booking` row and creates a `jobEvent` record. Foreign key constraint `job_event_booking_id_fkey` enforces `ON DELETE RESTRICT`. Verified in live PostgreSQL integration test `booking.db-spec.ts`.
- **Finding:** Fully compliant. Enforces non-repudiation of all marketplace and job events.

### 4. Unpaid Commission Protection (BOOK-STATUS-006, BOOK-STATUS-008, LEDGER-NEG-005, D-021)
- **Control:** Providers with negative ledger balance exceeding configured thresholds must be blocked from transitioning to `PROVIDER_EN_ROUTE` or `IN_PROGRESS`.
- **Evidence:** `unpaidCommissionGuard` in `transition-table.ts` verifies provider unpaid commission before allowing `START_TRIP` or `START_WORK` actions, rejecting non-compliant transitions with `UNPAID_COMMISSION` (`ConflictException`).
- **Finding:** Fully compliant. Prevents debt escalation by defaulting providers.

### 5. Optimistic Concurrency Control (BP §15, BP §31.2)
- **Control:** Concurrent transition requests must not corrupt state or trigger race condition transitions.
- **Evidence:** `Booking` model tracks a numeric `version` column, incremented on each transition. Transactions verify booking state atomically within PostgreSQL row locks.
- **Finding:** Fully compliant.

### 6. Emergency Safety Stop Mechanism (BOOK-CANCEL-006)
- **Control:** In unsafe or hostile situations, either party can immediately stop the booking without waiting for standard completion steps.
- **Evidence:** `BookingService.safetyStop` allows immediate transition from `ARRIVED` to `CANCELLED` and from `IN_PROGRESS`/`AWAITING_APPROVAL` to `DISPUTED`, tagging the event metadata with `isSafetyStop: true` for urgent support escalation.
- **Finding:** Fully compliant.

---

## Recommendations & Next Actions
1. **Quotes Integration (T3.5):** When wiring Module M10 (Quotes), ensure accepted quote binding updates `booking.acceptedQuoteId` and copies `crewSize` into the booking record as required by D-004.
2. **Payments Integration (T6.1):** Maintain D-003 invariant that payment initiation is only allowed when booking status is `COMPLETED`.

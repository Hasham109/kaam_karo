# SEC-REVIEW T2.5 — Profiles, Saved Addresses, Location Snapshots & Favorites

Reviewer: A15 · Date: 2026-10-24 · Task owner: A02 · Branch: `t2.5-profiles`
Scope: `contracts/profiles.yaml`, `services/api/src/modules/profiles/**`, `services/api/prisma/tests-db/profiles.db-spec.ts`.
Requirement IDs reviewed: PROF-ADDR-001, PROF-ADDR-002, PROF-ADDR-003, PROF-ADDR-004, PROF-FAV-001, ROLE-001, ROLE-002, LOC-GEO-003, LOC-GEO-004; D-004, D-018.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

## Verdict

**SEC-REVIEW: PASS.**
All location privacy, snapshot immutability, customer data separation, and access control requirements are properly implemented and verified. Zero security findings or data leak vectors.

---

## Security Verification Findings

### 1. Location Privacy & Provider Masking (PROF-ADDR-004)
- **Control:** Providers must not see exact customer street address or GPS coordinates before job acceptance. Only area-level location (e.g. "Gulberg III", "Johar Town") may be revealed.
- **Evidence:** `LocationSnapshotService.getSnapshotForCaller` checks caller role and job acceptance status. When `callerRole === 'PROVIDER'` and `isAcceptedProviderOnJob === false`, `addressText`, `addressLabel`, `placeRef`, `latitude`, and `longitude` are strictly masked to `null`, while `areaName` and `cityId` remain available. Full address details are returned only when `isAcceptedProviderOnJob === true` or when requested by the customer/admin. Verified in `location-snapshot.service.spec.ts`.
- **Finding:** Fully compliant. Prevents unsolicited customer location harvesting and provider stalking.

### 2. Location Snapshot Immutability & Audit Trail (PROF-ADDR-002, LOC-GEO-004)
- **Control:** A booking's location snapshot must never change after creation, even if the customer edits or soft-deletes their saved address.
- **Evidence:** 
  - `LocationSnapshotService.createSnapshot` clones all address text, locality, and PostGIS coordinates into an independent `location_snapshot` row referencing `sourceAddressId`.
  - Database trigger `kk_location_snapshot_freeze` (in `30_integrity.sql`) fires `BEFORE UPDATE` on `location_snapshot` and rejects updates with SQL state `55000` once `confirmation_status = 'CONFIRMED'` or when referenced by a booking row.
  - Integration test in `profiles.db-spec.ts` verifies that updating and soft-deleting an address leaves the booking location snapshot completely intact.
- **Finding:** Fully compliant. Enforces non-repudiation of service locations at both application and database layers.

### 3. Soft-Deletion of Saved Addresses (PROF-ADDR-002, DATA-004)
- **Control:** Deleting a saved address must not delete the physical row or affect historical references.
- **Evidence:** `AddressService.deleteAddress` updates `deleted_at = NOW()`. Queries for active addresses filter out soft-deleted records (`WHERE deleted_at IS NULL`).
- **Finding:** Compliant. Preserves foreign key integrity and auditability.

### 4. Public Profile Data Sanitization (ROLE-002, D-004, D-018)
- **Control:** Public provider profile view must not leak team leader's private phone number, email, or personal account details.
- **Evidence:** `ProviderProfileService.getPublicProfile` returns only public presentation fields: `id`, `businessName`, `photoMediaId`, and `usualTeamSize`. User account fields (`phoneE164`, `email`, `displayName`) are not returned by the public endpoint.
- **Finding:** Compliant.

### 5. Access Control & Authorization (SEC-BASE-003, SEC-BASE-004)
- **Control:** Customer endpoints (`/profiles/customer/*`) must only be accessible by users with `CUSTOMER` role; provider endpoints (`/profiles/provider/*`) only by users with `PROVIDER` role.
- **Evidence:** Controllers use NestJS `@UseGuards(AuthGuard, RequireRoleGuard)` with `@RequireRole(UserRoleType.CUSTOMER)` and `@RequireRole(UserRoleType.PROVIDER)`. Cross-user data isolation is enforced by resolving `req.user.id` from the verified session token.
- **Finding:** Compliant.

---

## Recommendations & Next Actions
1. **Intake & Booking Wiring:** When wiring Module M3 (Intake) and Module M4 (Booking), ensure that bookings bind directly to `location_snapshot.id` and never to `address.id` (BP §21; PROF-ADDR-002).

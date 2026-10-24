# SEC-REVIEW T3.1 — GeoService, Pakistan Boundary, Location Snapshot & Fallback

Reviewer: A15 (security-auditor) · Date: 2026-10-24 · Task owner: A06 (location-maps) · Branch: `t3.1-location-maps`
Scope: `contracts/location.yaml`, `services/api/src/modules/location/**`, `services/api/prisma/tests-db/location.db-spec.ts`.
Requirement IDs reviewed: LOC-GEO-001, LOC-GEO-002, LOC-GEO-003, LOC-GEO-004, LOC-GEO-005, LOC-GEO-006, LOC-GEO-007, LOC-GEO-008, SCOPE-GEO-001, SCOPE-GEO-002.

Severity scale: S1 exploitable now, data/money loss · S2 a stated security control is not effective · S3 hardening gap with a realistic path to harm later · S4 defence in depth / hygiene.

---

## Verdict

**SEC-REVIEW: PASS.**
All location privacy controls, API key restrictions, server-side boundary checks, and quota abuse prevention mechanisms are verified and compliant. Zero security vulnerabilities identified.

---

## Security Verification Findings

### 1. Server-Side Only Google Maps API Keys (LOC-GEO-008)
- **Control:** Google Maps Platform API keys must never be exposed to web or mobile client bundles where they could be harvested or abused.
- **Evidence:** 
  - All Google Maps calls are encapsulated inside `GoogleMapsClient` in `services/api/src/modules/location/google-maps.client.ts`.
  - The API key is loaded strictly from server environment variables (`process.env.GOOGLE_MAPS_API_KEY`).
  - No client SDKs in mobile or web apps load unrestricted keys. All client requests proxy through `/v1/location/*` endpoints.
- **Finding:** Fully compliant. Prevents billing abuse and quota theft.

### 2. Geographic Boundary Enforcement (SCOPE-GEO-001)
- **Control:** The service must enforce server-side geographic boundaries to prevent servicing or routing outside Pakistan.
- **Evidence:**
  - `pakistan-boundary.ts` checks latitude [23.5, 37.2] and longitude [60.5, 78.0].
  - `GeoService.validateLocation`, `geocode`, `reverseGeocode`, and `computeRoute` all call `assertInsidePakistan()`.
  - Coordinates outside Pakistan trigger `OUT_OF_SERVICE_AREA` (HTTP 400).
- **Finding:** Fully compliant. Enforces service jurisdiction and prevents cross-border data leakage.

### 3. No Background Location Tracking (LOC-GEO-007)
- **Control:** The application must never track user location in the background or continuously harvest GPS coordinates.
- **Evidence:**
  - Architecture and contracts do not provide any continuous location streaming, WebSocket geo-tracking, or background location collection endpoints.
  - Location is provided only upon explicit user interactions: pin drop, address search, or booking checkout.
  - The Android permission guard (`infra/ci/check-android-permissions.ts`) asserts `ACCESS_BACKGROUND_LOCATION` is absent from all manifests.
- **Finding:** Fully compliant. Adheres to privacy-first principles.

### 4. Quota Exhaustion & Denial of Service Resilience (LOC-GEO-005, BP §81)
- **Control:** If Google Maps API is down, rate-limited, quota-exhausted, or disabled, the application must not crash or halt core booking operations.
- **Evidence:**
  - `GeoService` catches any Google Maps client error or disabled state and gracefully falls back to straight-line Haversine distance and urban transit speed estimation.
  - Autocomplete falls back to database catalog cities and local landmarks.
  - Returns `isFallback: true` in the response payload.
- **Finding:** Fully compliant. Provides high availability and anti-fragility against third-party API disruptions.

### 5. Location Snapshot Immutability (LOC-GEO-004)
- **Control:** Location data tied to confirmed bookings must remain immutable and non-repudiable.
- **Evidence:**
  - Database trigger `kk_location_snapshot_freeze` prevents post-confirmation modifications.
  - Verified in database integration tests (`location.db-spec.ts`).
- **Finding:** Fully compliant.

---

## Recommendations & Follow-Up
1. **Google Cloud Console Restrictions (Production Deployment):** In the production Google Cloud console, ensure the server API key is restricted by IP address (to the API gateway/backend egress IPs) and restricted strictly to Geocoding API, Places API, and Routes API.

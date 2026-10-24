/**
 * Cities and service zones (T2.6, owner A03).
 * SCOPE-GEO-001 (BP §57.2): Pakistan only; a city can be listed without being active.
 * SCOPE-GEO-002 (D-007, D-019; K-14): Lahore is the only active city and the whole of Lahore is
 *   one active zone. The zone `area` is NULL = "the whole city" (schema doc of service_zone.area);
 *   no boundary polygon is invented. The geometry that decides "is this point in Lahore" comes
 *   from A06 (Google Maps, BP §57) or the owner: OQ-086.
 * Other Pakistani cities: BP names none (searched BP §6, §57.2 and the whole Blueprint), so none
 *   are seeded. TODO(OWNER) OQ-084: which cities are listed (is_listed = true, is_active = false).
 * Pure data (no imports).
 */

export interface SeedZone {
  /** Stable zone code, unique per city (SEC-REVIEW-T2.6 #8). */
  readonly code: string;
  readonly en: string;
  readonly ur: string;
  readonly isActive: boolean;
}

export interface SeedCity {
  readonly code: string;
  readonly en: string;
  readonly ur: string;
  readonly isListed: boolean;
  readonly isActive: boolean;
  readonly zones: readonly SeedZone[];
  /** Families (category codes) active in this city on day one. */
  readonly activeFamilies: 'LAUNCH_FAMILIES' | 'NONE';
}

export const CITIES: readonly SeedCity[] = [
  {
    code: 'lahore', // D-007: launch city
    en: 'Lahore',
    ur: 'لاہور',
    isListed: true, // D-007, SCOPE-GEO-002
    isActive: true, // D-007, SCOPE-GEO-002
    zones: [{ code: 'lahore-whole-city', en: 'Whole Lahore', ur: 'پورا لاہور', isActive: true }], // D-019: whole city, area NULL
    activeFamilies: 'LAUNCH_FAMILIES', // D-024: the 10 BP §6 families
  },
  // TODO(OWNER) OQ-084: other Pakistani cities, listed + inactive, once the owner names them.
];

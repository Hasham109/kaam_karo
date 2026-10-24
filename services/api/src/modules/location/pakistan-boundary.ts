/**
 * Pakistan Geographic Boundary Validation (T3.1, owner A06).
 * Requirement IDs: SCOPE-GEO-001, LOC-GEO-001, LOC-GEO-002, LOC-GEO-004
 * BP §57.2: "The system must enforce Pakistan as the supported marketplace country during the launch phase."
 */
import { AppError } from '@kaamkaro/platform';
import type { Coordinates } from './location.types';

/**
 * Approximate Pakistan mainland bounding box.
 * Lat: ~23.5° N (Sindh coast) to ~37.2° N (Northern areas)
 * Lng: ~60.5° E (Balochistan western border) to ~78.0° E (Eastern border)
 */
export const PAKISTAN_BOUNDS = {
  MIN_LATITUDE: 23.5,
  MAX_LATITUDE: 37.2,
  MIN_LONGITUDE: 60.5,
  MAX_LONGITUDE: 78.0,
} as const;

/**
 * Default fallback coordinates: Lahore District Center (Mall Road / Charing Cross).
 * BP §57.2, D-007 (Lahore launch city).
 */
export const LAHORE_CENTER: Coordinates = {
  latitude: 31.5204,
  longitude: 74.3587,
};

/**
 * Verifies whether coordinates fall within Pakistan's geographic bounding box.
 * SCOPE-GEO-001 (BP §57.2).
 */
export function isInsidePakistan(latitude: number, longitude: number): boolean {
  if (
    Number.isNaN(latitude) ||
    Number.isNaN(longitude) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return false;
  }

  return (
    latitude >= PAKISTAN_BOUNDS.MIN_LATITUDE &&
    latitude <= PAKISTAN_BOUNDS.MAX_LATITUDE &&
    longitude >= PAKISTAN_BOUNDS.MIN_LONGITUDE &&
    longitude <= PAKISTAN_BOUNDS.MAX_LONGITUDE
  );
}

/**
 * Asserts that coordinates are within Pakistan, throwing AppError if outside.
 * SCOPE-GEO-001 (BP §57.2).
 */
export function assertInsidePakistan(latitude: number, longitude: number): void {
  if (!isInsidePakistan(latitude, longitude)) {
    throw new AppError(
      'LOCATION_OUTSIDE_PAKISTAN',
      400,
      'Location coordinates are outside the supported marketplace territory (Pakistan only).',
    );
  }
}

import { describe, expect, it } from 'vitest';
import { AppError } from '@kaamkaro/platform';
import {
  assertInsidePakistan,
  isInsidePakistan,
  LAHORE_CENTER,
  PAKISTAN_BOUNDS,
} from '../pakistan-boundary';

describe('[SCOPE-GEO-001] Pakistan geographic boundary validation (BP §57.2)', () => {
  it('[SCOPE-GEO-001] recognizes major Pakistani cities as inside Pakistan', () => {
    // Lahore (D-007)
    expect(isInsidePakistan(LAHORE_CENTER.latitude, LAHORE_CENTER.longitude)).toBe(true);
    // Karachi
    expect(isInsidePakistan(24.8607, 67.0011)).toBe(true);
    // Islamabad
    expect(isInsidePakistan(33.6844, 73.0479)).toBe(true);
    // Peshawar
    expect(isInsidePakistan(34.0151, 71.5249)).toBe(true);
    // Quetta
    expect(isInsidePakistan(30.1798, 66.975)).toBe(true);
    // Gilgit
    expect(isInsidePakistan(35.9221, 74.3087)).toBe(true);
    // Gwadar
    expect(isInsidePakistan(25.1264, 62.3225)).toBe(true);
  });

  it('[SCOPE-GEO-001] rejects points outside Pakistan boundary', () => {
    // Dubai, UAE
    expect(isInsidePakistan(25.2048, 55.2708)).toBe(false);
    // London, UK
    expect(isInsidePakistan(51.5074, -0.1278)).toBe(false);
    // New York, USA
    expect(isInsidePakistan(40.7128, -74.006)).toBe(false);
    // Central Indian Ocean
    expect(isInsidePakistan(0.0, 70.0)).toBe(false);
    // Beyond northern border
    expect(isInsidePakistan(38.5, 74.0)).toBe(false);
    // Beyond western border
    expect(isInsidePakistan(30.0, 58.0)).toBe(false);
  });

  it('[SCOPE-GEO-001] rejects invalid or NaN coordinates', () => {
    expect(isInsidePakistan(Number.NaN, 74.3587)).toBe(false);
    expect(isInsidePakistan(31.5204, Number.NaN)).toBe(false);
    expect(isInsidePakistan(Number.POSITIVE_INFINITY, 74.0)).toBe(false);
  });

  it('[SCOPE-GEO-001] assertInsidePakistan throws 400 AppError with LOCATION_OUTSIDE_PAKISTAN', () => {
    expect(() =>
      assertInsidePakistan(LAHORE_CENTER.latitude, LAHORE_CENTER.longitude),
    ).not.toThrow();

    expect(() => assertInsidePakistan(51.5074, -0.1278)).toThrowError(AppError);
    expect(() => assertInsidePakistan(51.5074, -0.1278)).toThrowError(
      expect.objectContaining({ code: 'LOCATION_OUTSIDE_PAKISTAN', status: 400 }),
    );
  });

  it('[SCOPE-GEO-001] verifies boundary constants match Pakistan geography', () => {
    expect(PAKISTAN_BOUNDS.MIN_LATITUDE).toBe(23.5);
    expect(PAKISTAN_BOUNDS.MAX_LATITUDE).toBe(37.2);
    expect(PAKISTAN_BOUNDS.MIN_LONGITUDE).toBe(60.5);
    expect(PAKISTAN_BOUNDS.MAX_LONGITUDE).toBe(78.0);
  });
});

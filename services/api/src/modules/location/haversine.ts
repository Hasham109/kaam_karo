/**
 * Straight-line Haversine distance and urban duration estimation fallback.
 * Requirement IDs: LOC-GEO-005, LOC-GEO-006
 * BP §57: "Fallback behavior when Maps is unavailable"
 * ARCH §18: "straight-line distance fallback"
 */
import type { Coordinates } from './location.types';

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates straight-line distance in metres between two WGS84 coordinates
 * using the Haversine formula (spherical earth approximation).
 * LOC-GEO-006 (BP §57, ARCH §18).
 */
export function calculateHaversineDistanceMeters(
  origin: Coordinates,
  destination: Coordinates,
): number {
  if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) {
    return 0;
  }

  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLon = toRadians(destination.longitude - origin.longitude);

  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Estimates urban travel duration in seconds based on distance.
 * Assumes average urban speed (default: 25 km/h ≈ 6.94 m/s) with a 3-minute (180s)
 * buffer for Pakistani city traffic signals, dispatch and parking.
 * LOC-GEO-005, LOC-GEO-006 (BP §57, ARCH §18).
 */
export function estimateUrbanDurationSeconds(distanceMeters: number, averageSpeedKmh = 25): number {
  if (distanceMeters <= 0) {
    return 0;
  }

  const speedMps = (averageSpeedKmh * 1000) / 3600;
  const travelSeconds = Math.round(distanceMeters / speedMps);

  // 180 seconds baseline dispatch/parking buffer
  const bufferSeconds = 180;

  return travelSeconds + bufferSeconds;
}

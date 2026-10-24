import { describe, expect, it } from 'vitest';
import { calculateHaversineDistanceMeters, estimateUrbanDurationSeconds } from '../haversine';
import { LAHORE_CENTER } from '../pakistan-boundary';

describe('[LOC-GEO-005, LOC-GEO-006] Haversine distance & urban duration fallback (BP §57, ARCH §18)', () => {
  it('[LOC-GEO-006] distance between identical points is exactly 0 metres', () => {
    const dist = calculateHaversineDistanceMeters(LAHORE_CENTER, LAHORE_CENTER);
    expect(dist).toBe(0);
  });

  it('[LOC-GEO-006] computes realistic straight-line distance between known Lahore landmarks', () => {
    // Lahore Mall Road (Charing Cross)
    const mallRoad = { latitude: 31.558, longitude: 74.326 };
    // DHA Phase 5 Lahore
    const dhaPhase5 = { latitude: 31.472, longitude: 74.408 };

    const distMeters = calculateHaversineDistanceMeters(mallRoad, dhaPhase5);
    // Straight-line distance is approx 12.3 km (12,000 - 13,000 m)
    expect(distMeters).toBeGreaterThan(11_500);
    expect(distMeters).toBeLessThan(13_500);
  });

  it('[LOC-GEO-006] computes distance symmetrically between origin and destination', () => {
    const p1 = { latitude: 31.5204, longitude: 74.3587 };
    const p2 = { latitude: 31.4504, longitude: 73.135 }; // Faisalabad

    const d1 = calculateHaversineDistanceMeters(p1, p2);
    const d2 = calculateHaversineDistanceMeters(p2, p1);
    expect(d1).toBe(d2);
    expect(d1).toBeGreaterThan(110_000); // ~118 km
  });

  it('[LOC-GEO-006] estimateUrbanDurationSeconds returns 0 for 0 distance', () => {
    expect(estimateUrbanDurationSeconds(0)).toBe(0);
    expect(estimateUrbanDurationSeconds(-100)).toBe(0);
  });

  it('[LOC-GEO-006] estimateUrbanDurationSeconds calculates duration with traffic buffer', () => {
    // 5 km (5000 metres) at 25 km/h:
    // 5000 / (25 * 1000 / 3600) = 5000 / 6.944 = 720 seconds (12 minutes)
    // + 180s buffer = 900 seconds (15 minutes)
    const duration = estimateUrbanDurationSeconds(5000, 25);
    expect(duration).toBe(900);
  });
});

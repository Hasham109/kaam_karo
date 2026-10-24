import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../platform/prisma.service';
import { GeoService } from '../geo.service';
import { GoogleMapsClient } from '../google-maps.client';
import { LAHORE_CENTER } from '../pakistan-boundary';

describe('[LOC-GEO-001..006, SCOPE-GEO-001..002] GeoService (BP §57, §81; ARCH §18)', () => {
  const mockLahoreCity = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'lahore',
    nameEn: 'Lahore',
    nameUr: 'لاہور',
    isListed: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  const mockKarachiCity = {
    id: '22222222-2222-4222-8222-222222222222',
    code: 'karachi',
    nameEn: 'Karachi',
    nameUr: 'کراچی',
    isListed: true,
    isActive: false, // Inactive city at launch (SCOPE-GEO-001, D-007)
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  interface MockCityWhere {
    id?: string;
    OR?: Array<{ code?: { equals?: string }; nameEn?: { equals?: string } }>;
  }

  interface MockPrisma {
    city: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
  }

  let mockPrisma: MockPrisma;
  let mapsClient: GoogleMapsClient;
  let geoService: GeoService;

  beforeEach(() => {
    mockPrisma = {
      city: {
        findMany: vi.fn().mockResolvedValue([mockLahoreCity, mockKarachiCity]),
        findFirst: vi.fn().mockImplementation(({ where }: { where?: MockCityWhere }) => {
          if (
            where?.OR?.some(
              (cond) => cond.code?.equals === 'lahore' || cond.nameEn?.equals === 'Lahore',
            )
          ) {
            return Promise.resolve(mockLahoreCity);
          }
          return Promise.resolve(null);
        }),
        findUnique: vi.fn().mockImplementation(({ where }: { where?: MockCityWhere }) => {
          if (where?.id === mockLahoreCity.id) return Promise.resolve(mockLahoreCity);
          if (where?.id === mockKarachiCity.id) return Promise.resolve(mockKarachiCity);
          return Promise.resolve(null);
        }),
      },
    };

    mapsClient = new GoogleMapsClient();
    mapsClient.setEnabled(false);
    geoService = new GeoService(mockPrisma as unknown as PrismaService, mapsClient);
  });

  describe('suggestLocation [LOC-GEO-002, SCOPE-GEO-001, SCOPE-GEO-002]', () => {
    it('[LOC-GEO-002] defaults to Lahore when no GPS coordinates are provided', async () => {
      const res = await geoService.suggestLocation();
      expect(res.suggestedCity.code).toBe('lahore');
      expect(res.suggestionMessageEn).toBe('We think you are in Lahore');
      expect(res.suggestionMessageUr).toBe('ہمیں لگتا ہے کہ آپ لاہور میں ہیں');
      expect(res.canChangeCity).toBe(true);
      expect(res.availableCities).toHaveLength(2);
      expect(res.availableCities[0]?.code).toBe('lahore');
    });

    it('[LOC-GEO-002] suggests Lahore when coordinates are inside Lahore', async () => {
      const res = await geoService.suggestLocation({
        latitude: 31.5204,
        longitude: 74.3587,
      });
      expect(res.suggestedCity.code).toBe('lahore');
      expect(res.suggestionMessageEn).toBe('We think you are in Lahore');
      expect(res.canChangeCity).toBe(true);
    });

    it('[SCOPE-GEO-001] throws LOCATION_OUTSIDE_PAKISTAN when GPS coordinates are outside Pakistan', async () => {
      await expect(
        geoService.suggestLocation({
          latitude: 25.2048,
          longitude: 55.2708, // Dubai
        }),
      ).rejects.toMatchObject({
        code: 'LOCATION_OUTSIDE_PAKISTAN',
        status: 400,
      });
    });
  });

  describe('autocomplete [LOC-GEO-003, LOC-GEO-006]', () => {
    it('[LOC-GEO-006] falls back to catalog and known areas when Maps is disabled', async () => {
      mapsClient.setEnabled(false);

      const res = await geoService.autocomplete('Gulberg');
      expect(res.isFallback).toBe(true);
      expect(res.predictions.length).toBeGreaterThan(0);
      expect(res.predictions.some((p) => p.primaryText.includes('Gulberg'))).toBe(true);
    });

    it('[LOC-GEO-003] uses Google Places autocomplete when Maps is enabled', async () => {
      mapsClient.setEnabled(true, 'test-key');
      vi.spyOn(mapsClient, 'placesAutocomplete').mockResolvedValue([
        {
          placeId: 'google-place-1',
          primaryText: 'Mall Road',
          secondaryText: 'Lahore, Pakistan',
          fullText: 'Mall Road, Lahore, Pakistan',
        },
      ]);

      const res = await geoService.autocomplete('Mall Road');
      expect(res.isFallback).toBe(false);
      expect(res.predictions).toHaveLength(1);
      expect(res.predictions[0]?.placeId).toBe('google-place-1');
    });
  });

  describe('geocode [LOC-GEO-003, LOC-GEO-006, SCOPE-GEO-001]', () => {
    it('[LOC-GEO-006] falls back to city center coordinates when Maps is disabled', async () => {
      mapsClient.setEnabled(false);

      const res = await geoService.geocode('Main Boulevard Gulberg, Lahore');
      expect(res.isFallback).toBe(true);
      expect(res.isInsidePakistan).toBe(true);
      expect(res.latitude).toBe(LAHORE_CENTER.latitude);
      expect(res.longitude).toBe(LAHORE_CENTER.longitude);
      expect(res.cityName).toBe('Lahore');
    });

    it('[LOC-GEO-003] uses Google Geocoding when Maps is enabled', async () => {
      mapsClient.setEnabled(true, 'test-key');
      vi.spyOn(mapsClient, 'geocode').mockResolvedValue({
        formattedAddress: 'Gulberg III, Lahore, Pakistan',
        latitude: 31.51,
        longitude: 74.34,
        cityId: null,
        cityName: 'Lahore',
        areaName: 'Gulberg',
        placeRef: 'google-place-123',
        isInsidePakistan: true,
        isFallback: false,
      });

      const res = await geoService.geocode('Gulberg III');
      expect(res.isFallback).toBe(false);
      expect(res.formattedAddress).toBe('Gulberg III, Lahore, Pakistan');
      expect(res.areaName).toBe('Gulberg');
    });

    it('[SCOPE-GEO-001] throws LOCATION_OUTSIDE_PAKISTAN if Google returns a location outside Pakistan', async () => {
      mapsClient.setEnabled(true, 'test-key');
      vi.spyOn(mapsClient, 'geocode').mockResolvedValue({
        formattedAddress: 'Downtown Dubai, UAE',
        latitude: 25.2,
        longitude: 55.27,
        cityId: null,
        cityName: 'Dubai',
        areaName: null,
        placeRef: 'dubai-1',
        isInsidePakistan: false,
        isFallback: false,
      });

      await expect(geoService.geocode('Dubai Mall')).rejects.toMatchObject({
        code: 'LOCATION_OUTSIDE_PAKISTAN',
        status: 400,
      });
    });
  });

  describe('reverseGeocode [LOC-GEO-004, LOC-GEO-006, SCOPE-GEO-001]', () => {
    it('[LOC-GEO-006] falls back to nearest city address when Maps is disabled', async () => {
      mapsClient.setEnabled(false);

      const res = await geoService.reverseGeocode(31.5204, 74.3587);
      expect(res.isFallback).toBe(true);
      expect(res.isInsidePakistan).toBe(true);
      expect(res.cityName).toBe('Lahore');
      expect(res.formattedAddress).toContain('Lahore');
    });

    it('[SCOPE-GEO-001] throws LOCATION_OUTSIDE_PAKISTAN when reversing coordinates outside Pakistan', async () => {
      await expect(geoService.reverseGeocode(51.5074, -0.1278)).rejects.toMatchObject({
        code: 'LOCATION_OUTSIDE_PAKISTAN',
        status: 400,
      });
    });

    it('[LOC-GEO-004] uses Google Reverse Geocoding when Maps is enabled', async () => {
      mapsClient.setEnabled(true, 'test-key');
      vi.spyOn(mapsClient, 'reverseGeocode').mockResolvedValue({
        formattedAddress: 'Mall Road, Garhi Shahu, Lahore, Pakistan',
        cityId: null,
        cityName: 'Lahore',
        areaName: 'Garhi Shahu',
        placeRef: 'charing-cross-ref',
        isInsidePakistan: true,
        isFallback: false,
      });

      const res = await geoService.reverseGeocode(31.558, 74.326);
      expect(res.isFallback).toBe(false);
      expect(res.areaName).toBe('Garhi Shahu');
      expect(res.cityName).toBe('Lahore');
    });
  });

  describe('computeRoute [LOC-GEO-005, LOC-GEO-006]', () => {
    const origin = { latitude: 31.558, longitude: 74.326 }; // Mall Road
    const destination = { latitude: 31.472, longitude: 74.408 }; // DHA Phase 5

    it('[LOC-GEO-006] calculates straight-line Haversine distance and urban duration when Maps is disabled', async () => {
      mapsClient.setEnabled(false);

      const res = await geoService.computeRoute(origin, destination);
      expect(res.isFallback).toBe(true);
      expect(res.distanceMeters).toBeGreaterThan(11_500);
      expect(res.distanceMeters).toBeLessThan(13_500);
      expect(res.durationSeconds).toBeGreaterThan(1000); // > 16 minutes
    });

    it('[LOC-GEO-005] uses Google Routes API when Maps is enabled', async () => {
      mapsClient.setEnabled(true, 'test-key');
      vi.spyOn(mapsClient, 'computeRoute').mockResolvedValue({
        distanceMeters: 14200,
        durationSeconds: 1560,
      });

      const res = await geoService.computeRoute(origin, destination);
      expect(res.isFallback).toBe(false);
      expect(res.distanceMeters).toBe(14200);
      expect(res.durationSeconds).toBe(1560);
    });

    it('[SCOPE-GEO-001] throws LOCATION_OUTSIDE_PAKISTAN when origin is outside Pakistan', async () => {
      const outsideOrigin = { latitude: 25.2, longitude: 55.2 };
      await expect(geoService.computeRoute(outsideOrigin, destination)).rejects.toMatchObject({
        code: 'LOCATION_OUTSIDE_PAKISTAN',
        status: 400,
      });
    });

    it('[SCOPE-GEO-001] throws LOCATION_OUTSIDE_PAKISTAN when destination is outside Pakistan', async () => {
      const outsideDest = { latitude: 25.2, longitude: 55.2 };
      await expect(geoService.computeRoute(origin, outsideDest)).rejects.toMatchObject({
        code: 'LOCATION_OUTSIDE_PAKISTAN',
        status: 400,
      });
    });
  });

  describe('validateLocation [SCOPE-GEO-001, SCOPE-GEO-002]', () => {
    it('[SCOPE-GEO-001, SCOPE-GEO-002] validates Lahore coordinates as inside Pakistan and active in marketplace', async () => {
      const res = await geoService.validateLocation(31.5204, 74.3587);
      expect(res.isInsidePakistan).toBe(true);
      expect(res.cityName).toBe('Lahore');
      expect(res.isMarketplaceActive).toBe(true);
    });

    it('[SCOPE-GEO-001] returns isInsidePakistan: false for coordinates outside Pakistan', async () => {
      const res = await geoService.validateLocation(51.5074, -0.1278); // London
      expect(res.isInsidePakistan).toBe(false);
      expect(res.isMarketplaceActive).toBe(false);
      expect(res.cityId).toBeNull();
    });
  });
});

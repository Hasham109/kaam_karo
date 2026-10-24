/**
 * GeoService (T3.1, owner A06; M6 Location).
 * Requirement IDs: LOC-GEO-001, LOC-GEO-002, LOC-GEO-003, LOC-GEO-004, LOC-GEO-005, LOC-GEO-006, LOC-GEO-008, SCOPE-GEO-001, SCOPE-GEO-002
 * BP §57, §81; ARCH §4 M6, §12, §18; D-007, D-019
 *
 * Core marketplace capability: proximity, suggested city, reverse geocoding, route estimates,
 * and robust straight-line/database fallbacks when Google Maps is disabled or quota-exhausted.
 */
import { Injectable } from '@nestjs/common';
import { AppError } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service';
import { GoogleMapsClient } from './google-maps.client';
import { calculateHaversineDistanceMeters, estimateUrbanDurationSeconds } from './haversine';
import type {
  AutocompletePrediction,
  AutocompleteResult,
  CitySummary,
  Coordinates,
  GeocodeResult,
  ReverseGeocodeResult,
  RouteResult,
  SuggestLocationResult,
  ValidateLocationResult,
} from './location.types';
import { assertInsidePakistan, isInsidePakistan, LAHORE_CENTER } from './pakistan-boundary';

/** Known central coordinates for major Pakistani cities (used for distance & fallback matching). */
const KNOWN_CITY_COORDINATES: Record<string, Coordinates> = {
  lahore: { latitude: 31.5204, longitude: 74.3587 },
  karachi: { latitude: 24.8607, longitude: 67.0011 },
  islamabad: { latitude: 33.6844, longitude: 73.0479 },
  rawalpindi: { latitude: 33.5651, longitude: 73.0169 },
  faisalabad: { latitude: 31.4504, longitude: 73.135 },
  multan: { latitude: 30.1575, longitude: 71.5249 },
  peshawar: { latitude: 34.0151, longitude: 71.5249 },
  quetta: { latitude: 30.1798, longitude: 66.975 },
};

/** Well-known localities for Lahore fallback search (D-007, D-019). */
const LAHORE_FALLBACK_AREAS: readonly { name: string; area: string }[] = [
  { name: 'Gulberg, Lahore', area: 'Gulberg' },
  { name: 'DHA Defence, Lahore', area: 'DHA' },
  { name: 'Model Town, Lahore', area: 'Model Town' },
  { name: 'Johar Town, Lahore', area: 'Johar Town' },
  { name: 'Bahria Town, Lahore', area: 'Bahria Town' },
  { name: 'Faisal Town, Lahore', area: 'Faisal Town' },
  { name: 'Mall Road, Lahore', area: 'Mall Road' },
  { name: 'Cantt, Lahore', area: 'Lahore Cantt' },
  { name: 'Walled City, Lahore', area: 'Walled City' },
  { name: 'Shadman, Lahore', area: 'Shadman' },
];

@Injectable()
export class GeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapsClient: GoogleMapsClient,
  ) {}

  /**
   * Suggests city and locality for a GPS position, or defaults to Lahore (D-007).
   * Never silently locks the city; always allows user to pick another listed city.
   * LOC-GEO-002, SCOPE-GEO-001, SCOPE-GEO-002 (BP §57.1, §57.3).
   */
  async suggestLocation(coords?: Partial<Coordinates>): Promise<SuggestLocationResult> {
    const hasCoordinates =
      coords?.latitude !== undefined &&
      coords?.longitude !== undefined &&
      !Number.isNaN(coords.latitude) &&
      !Number.isNaN(coords.longitude);

    if (hasCoordinates) {
      assertInsidePakistan(coords.latitude!, coords.longitude!);
    }

    const listedCities = await this.prisma.city.findMany({
      where: { isListed: true },
      orderBy: [{ isActive: 'desc' }, { nameEn: 'asc' }],
    });

    if (listedCities.length === 0) {
      throw new AppError('CONFIG_NOT_SET', 500, 'No listed cities found in catalog.');
    }

    let nearestCity = listedCities.find((c) => c.code === 'lahore') ?? listedCities[0]!;
    let areaName: string | null = null;

    if (hasCoordinates) {
      const lat = coords.latitude!;
      const lng = coords.longitude!;

      // Find nearest city by comparing distances to known city coordinates
      let minDistance = Number.POSITIVE_INFINITY;
      for (const city of listedCities) {
        const cityCoord = KNOWN_CITY_COORDINATES[city.code.toLowerCase()];
        if (cityCoord) {
          const dist = calculateHaversineDistanceMeters(
            { latitude: lat, longitude: lng },
            cityCoord,
          );
          if (dist < minDistance) {
            minDistance = dist;
            nearestCity = city;
          }
        }
      }

      // If Google Maps is available, attempt reverse geocode for area name
      if (this.mapsClient.isEnabled()) {
        const reverse = await this.mapsClient.reverseGeocode(lat, lng);
        if (reverse?.areaName) {
          areaName = reverse.areaName;
        }
      }
    }

    const availableCities: CitySummary[] = listedCities.map((c) => ({
      id: c.id,
      code: c.code,
      nameEn: c.nameEn,
      nameUr: c.nameUr,
      isListed: c.isListed,
      isActive: c.isActive,
    }));

    const suggestedCitySummary: CitySummary = {
      id: nearestCity.id,
      code: nearestCity.code,
      nameEn: nearestCity.nameEn,
      nameUr: nearestCity.nameUr,
      isListed: nearestCity.isListed,
      isActive: nearestCity.isActive,
    };

    return {
      suggestedCity: suggestedCitySummary,
      areaName,
      suggestionMessageEn: `We think you are in ${nearestCity.nameEn}`,
      suggestionMessageUr: `ہمیں لگتا ہے کہ آپ ${nearestCity.nameUr} میں ہیں`,
      canChangeCity: true,
      availableCities,
    };
  }

  /**
   * Autocomplete place search restricted to Pakistan with database/static fallback.
   * LOC-GEO-003, LOC-GEO-006 (BP §57, ARCH §18).
   */
  async autocomplete(
    query: string,
    sessionToken?: string,
    lat?: number,
    lng?: number,
  ): Promise<AutocompleteResult> {
    if (lat !== undefined && lng !== undefined) {
      assertInsidePakistan(lat, lng);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return { predictions: [], isFallback: false };
    }

    // 1. Try Google Maps Places API if enabled
    if (this.mapsClient.isEnabled()) {
      const googlePredictions = await this.mapsClient.placesAutocomplete(
        trimmed,
        sessionToken,
        lat,
        lng,
      );
      if (googlePredictions && googlePredictions.length > 0) {
        return {
          predictions: googlePredictions,
          isFallback: false,
        };
      }
    }

    // 2. Fallback: query database catalog cities and known localities
    const lowerQuery = trimmed.toLowerCase();
    const predictions: AutocompletePrediction[] = [];

    // Check listed cities in database
    const cities = await this.prisma.city.findMany({
      where: {
        isListed: true,
        OR: [
          { nameEn: { contains: trimmed, mode: 'insensitive' } },
          { nameUr: { contains: trimmed } },
          { code: { contains: lowerQuery } },
        ],
      },
      take: 5,
    });

    for (const city of cities) {
      predictions.push({
        placeId: `city-${city.code}`,
        primaryText: city.nameEn,
        secondaryText: `${city.nameUr}, Pakistan`,
        fullText: `${city.nameEn}, Pakistan`,
      });
    }

    // Check Lahore popular fallback areas
    for (const area of LAHORE_FALLBACK_AREAS) {
      if (
        area.name.toLowerCase().includes(lowerQuery) ||
        area.area.toLowerCase().includes(lowerQuery)
      ) {
        predictions.push({
          placeId: `area-${area.area.toLowerCase().replace(/\s+/g, '-')}`,
          primaryText: area.area,
          secondaryText: 'Lahore, Punjab, Pakistan',
          fullText: `${area.name}, Pakistan`,
        });
      }
    }

    return {
      predictions,
      isFallback: true,
    };
  }

  /**
   * Geocodes an address string to coordinates with Pakistan validation and fallback.
   * LOC-GEO-003, LOC-GEO-006, SCOPE-GEO-001 (BP §57, §57.2).
   */
  async geocode(address: string, cityId?: string): Promise<GeocodeResult> {
    const trimmed = address.trim();
    if (!trimmed) {
      throw new AppError('VALIDATION_FAILED', 422, 'Address string cannot be empty.');
    }

    // 1. Try Google Maps if enabled
    if (this.mapsClient.isEnabled()) {
      const googleResult = await this.mapsClient.geocode(trimmed);
      if (googleResult) {
        if (!isInsidePakistan(googleResult.latitude, googleResult.longitude)) {
          throw new AppError(
            'LOCATION_OUTSIDE_PAKISTAN',
            400,
            'Geocoded location is outside Pakistan.',
          );
        }

        // Match city from DB if available
        let matchedCityId = cityId ?? null;
        let matchedCityName = googleResult.cityName;

        if (googleResult.cityName) {
          const city = await this.prisma.city.findFirst({
            where: {
              OR: [
                { nameEn: { equals: googleResult.cityName, mode: 'insensitive' } },
                { code: { equals: googleResult.cityName.toLowerCase() } },
              ],
            },
          });
          if (city) {
            matchedCityId = city.id;
            matchedCityName = city.nameEn;
          }
        }

        return {
          ...googleResult,
          cityId: matchedCityId,
          cityName: matchedCityName,
          isFallback: false,
        };
      }
    }

    // 2. Fallback: resolve using cityId or address matching against catalog.city
    let targetCity = null;
    if (cityId) {
      targetCity = await this.prisma.city.findUnique({ where: { id: cityId } });
    }

    if (!targetCity) {
      const allListed = await this.prisma.city.findMany({ where: { isListed: true } });
      const lower = trimmed.toLowerCase();
      targetCity =
        allListed.find((c) => lower.includes(c.nameEn.toLowerCase()) || lower.includes(c.code)) ??
        allListed.find((c) => c.code === 'lahore') ??
        allListed[0] ??
        null;
    }

    const cityCoord = targetCity
      ? (KNOWN_CITY_COORDINATES[targetCity.code.toLowerCase()] ?? LAHORE_CENTER)
      : LAHORE_CENTER;

    return {
      formattedAddress: trimmed,
      latitude: cityCoord.latitude,
      longitude: cityCoord.longitude,
      cityId: targetCity?.id ?? null,
      cityName: targetCity?.nameEn ?? 'Lahore',
      areaName: null,
      placeRef: null,
      isInsidePakistan: true,
      isFallback: true,
    };
  }

  /**
   * Reverse-geocodes coordinates into a confirmed readable address.
   * LOC-GEO-004, SCOPE-GEO-001 (BP §57.1, §66).
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    assertInsidePakistan(latitude, longitude);

    // 1. Try Google Maps if enabled
    if (this.mapsClient.isEnabled()) {
      const googleResult = await this.mapsClient.reverseGeocode(latitude, longitude);
      if (googleResult) {
        let matchedCityId: string | null = null;
        let matchedCityName = googleResult.cityName;

        if (googleResult.cityName) {
          const city = await this.prisma.city.findFirst({
            where: {
              OR: [
                { nameEn: { equals: googleResult.cityName, mode: 'insensitive' } },
                { code: { equals: googleResult.cityName.toLowerCase() } },
              ],
            },
          });
          if (city) {
            matchedCityId = city.id;
            matchedCityName = city.nameEn;
          }
        }

        return {
          ...googleResult,
          cityId: matchedCityId,
          cityName: matchedCityName,
          isFallback: false,
        };
      }
    }

    // 2. Fallback: match nearest city from catalog
    const listedCities = await this.prisma.city.findMany({ where: { isListed: true } });
    let nearestCity = listedCities.find((c) => c.code === 'lahore') ?? listedCities[0]!;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const city of listedCities) {
      const cityCoord = KNOWN_CITY_COORDINATES[city.code.toLowerCase()];
      if (cityCoord) {
        const dist = calculateHaversineDistanceMeters({ latitude, longitude }, cityCoord);
        if (dist < minDistance) {
          minDistance = dist;
          nearestCity = city;
        }
      }
    }

    return {
      formattedAddress: `${nearestCity.nameEn}, Pakistan`,
      cityId: nearestCity.id,
      cityName: nearestCity.nameEn,
      areaName: null,
      placeRef: null,
      isInsidePakistan: true,
      isFallback: true,
    };
  }

  /**
   * Computes route distance and estimated duration with straight-line Haversine fallback.
   * LOC-GEO-005, LOC-GEO-006 (BP §54.2, §57, ARCH §18).
   */
  async computeRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    assertInsidePakistan(origin.latitude, origin.longitude);
    assertInsidePakistan(destination.latitude, destination.longitude);

    // 1. Try Google Routes API if enabled
    if (this.mapsClient.isEnabled()) {
      const route = await this.mapsClient.computeRoute(origin, destination);
      if (route) {
        return {
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          isFallback: false,
        };
      }
    }

    // 2. Fallback: Straight-line distance & urban duration estimation
    const distanceMeters = calculateHaversineDistanceMeters(origin, destination);
    const durationSeconds = estimateUrbanDurationSeconds(distanceMeters);

    return {
      distanceMeters,
      durationSeconds,
      isFallback: true,
    };
  }

  /**
   * Validates location coordinates and determines marketplace activation status.
   * SCOPE-GEO-001, SCOPE-GEO-002, D-007 (BP §57.2).
   */
  async validateLocation(latitude: number, longitude: number): Promise<ValidateLocationResult> {
    const inside = isInsidePakistan(latitude, longitude);
    if (!inside) {
      return {
        isInsidePakistan: false,
        cityId: null,
        cityName: null,
        isMarketplaceActive: false,
      };
    }

    const listedCities = await this.prisma.city.findMany({ where: { isListed: true } });
    let nearestCity = listedCities.find((c) => c.code === 'lahore') ?? listedCities[0] ?? null;
    let minDistance = Number.POSITIVE_INFINITY;

    for (const city of listedCities) {
      const cityCoord = KNOWN_CITY_COORDINATES[city.code.toLowerCase()];
      if (cityCoord) {
        const dist = calculateHaversineDistanceMeters({ latitude, longitude }, cityCoord);
        if (dist < minDistance) {
          minDistance = dist;
          nearestCity = city;
        }
      }
    }

    return {
      isInsidePakistan: true,
      cityId: nearestCity?.id ?? null,
      cityName: nearestCity?.nameEn ?? null,
      isMarketplaceActive: nearestCity?.isActive ?? false,
    };
  }
}

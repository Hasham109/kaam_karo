/**
 * Google Maps Platform API Client (T3.1, owner A06).
 * Requirement IDs: LOC-GEO-005, LOC-GEO-006, LOC-GEO-008
 * BP §57, §71, §74; ARCH §18
 *
 * Server-side only wrapper. Never leaks API keys to clients (LOC-GEO-008).
 * Provides graceful null fallback when Maps is disabled, offline or quota-limited (LOC-GEO-006).
 */
import { Injectable, Logger } from '@nestjs/common';
import type {
  AutocompletePrediction,
  Coordinates,
  GeocodeResult,
  ReverseGeocodeResult,
} from './location.types';

export interface GoogleMapsClientConfig {
  readonly apiKey?: string | null;
  readonly enabled?: boolean;
  readonly requestTimeoutMs?: number;
}

@Injectable()
export class GoogleMapsClient {
  private readonly logger = new Logger(GoogleMapsClient.name);
  private apiKey: string | null = null;
  private enabled = false;
  private timeoutMs = 5000;

  constructor() {
    this.apiKey = process.env['GOOGLE_MAPS_API_KEY'] ?? null;
    this.enabled = process.env['GOOGLE_MAPS_ENABLED'] === 'true' && Boolean(this.apiKey);
  }

  /**
   * Configures client settings at runtime (useful for testing).
   */
  configure(config: GoogleMapsClientConfig): void {
    if (config.apiKey !== undefined) {
      this.apiKey = config.apiKey;
    }
    if (config.enabled !== undefined) {
      this.enabled = config.enabled;
    }
    if (config.requestTimeoutMs !== undefined) {
      this.timeoutMs = config.requestTimeoutMs;
    }
  }

  /**
   * For testing: enables or disables Maps client at runtime.
   */
  setEnabled(enabled: boolean, apiKey?: string): void {
    this.enabled = enabled;
    if (apiKey) {
      this.apiKey = apiKey;
    } else if (enabled && !this.apiKey) {
      this.apiKey = 'test-key';
    }
  }

  /**
   * For testing: sets or clears API key.
   */
  setApiKey(key: string | null): void {
    this.apiKey = key;
    if (key) {
      this.enabled = true;
    } else {
      this.enabled = false;
    }
  }

  isEnabled(): boolean {
    return this.enabled && Boolean(this.apiKey);
  }

  /**
   * Geocodes an address string using Google Geocoding API.
   * Restricted to Pakistan (components=country:PK).
   */
  async geocode(address: string): Promise<GeocodeResult | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('address', address);
      url.searchParams.set('components', 'country:PK');
      url.searchParams.set('key', this.apiKey!);

      const res = await this.fetchWithTimeout(url.toString());
      if (!res.ok) {
        this.logger.warn(`Google Geocoding HTTP error: status ${res.status}`);
        return null;
      }

      const data = (await res.json()) as {
        status: string;
        results?: Array<{
          formatted_address: string;
          geometry: { location: { lat: number; lng: number } };
          place_id: string;
          address_components?: Array<{ long_name: string; types: string[] }>;
        }>;
      };

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        this.logger.debug(`Google Geocoding returned non-OK status: ${data.status}`);
        return null;
      }

      const result = data.results[0]!;
      let cityName: string | null = null;
      let areaName: string | null = null;

      if (result.address_components) {
        for (const comp of result.address_components) {
          if (comp.types.includes('locality')) {
            cityName = comp.long_name;
          } else if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
            areaName = comp.long_name;
          }
        }
      }

      return {
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        cityId: null,
        cityName,
        areaName,
        placeRef: result.place_id,
        isInsidePakistan: true,
        isFallback: false,
      };
    } catch (err) {
      this.logger.warn(`Google Geocoding failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Reverse-geocodes coordinates using Google Geocoding API.
   */
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('latlng', `${lat},${lng}`);
      url.searchParams.set('key', this.apiKey!);

      const res = await this.fetchWithTimeout(url.toString());
      if (!res.ok) {
        this.logger.warn(`Google Reverse Geocoding HTTP error: status ${res.status}`);
        return null;
      }

      const data = (await res.json()) as {
        status: string;
        results?: Array<{
          formatted_address: string;
          place_id: string;
          address_components?: Array<{ long_name: string; types: string[] }>;
        }>;
      };

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0]!;
      let cityName: string | null = null;
      let areaName: string | null = null;

      if (result.address_components) {
        for (const comp of result.address_components) {
          if (comp.types.includes('locality')) {
            cityName = comp.long_name;
          } else if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
            areaName = comp.long_name;
          }
        }
      }

      return {
        formattedAddress: result.formatted_address,
        cityId: null,
        cityName,
        areaName,
        placeRef: result.place_id,
        isInsidePakistan: true,
        isFallback: false,
      };
    } catch (err) {
      this.logger.warn(`Google Reverse Geocoding failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Autocomplete place search using Google Places Autocomplete API.
   * Restricted to Pakistan (components=country:pk).
   */
  async placesAutocomplete(
    query: string,
    sessionToken?: string,
    lat?: number,
    lng?: number,
  ): Promise<AutocompletePrediction[] | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
      url.searchParams.set('input', query);
      url.searchParams.set('components', 'country:pk');
      url.searchParams.set('key', this.apiKey!);
      if (sessionToken) {
        url.searchParams.set('sessiontoken', sessionToken);
      }
      if (lat !== undefined && lng !== undefined) {
        url.searchParams.set('location', `${lat},${lng}`);
        url.searchParams.set('radius', '50000'); // 50km bias
      }

      const res = await this.fetchWithTimeout(url.toString());
      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as {
        status: string;
        predictions?: Array<{
          place_id: string;
          description: string;
          structured_formatting?: {
            main_text: string;
            secondary_text?: string;
          };
        }>;
      };

      if (data.status !== 'OK' || !data.predictions) {
        return null;
      }

      return data.predictions.map((p) => ({
        placeId: p.place_id,
        primaryText: p.structured_formatting?.main_text ?? p.description,
        secondaryText: p.structured_formatting?.secondary_text ?? '',
        fullText: p.description,
      }));
    } catch (err) {
      this.logger.warn(`Google Places autocomplete failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Computes route distance and travel duration using Google Routes API.
   */
  async computeRoute(
    origin: Coordinates,
    destination: Coordinates,
  ): Promise<{ distanceMeters: number; durationSeconds: number } | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
      const body = {
        origin: {
          location: {
            latLng: {
              latitude: origin.latitude,
              longitude: origin.longitude,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.latitude,
              longitude: destination.longitude,
            },
          },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      };

      const res = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey!,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as {
        routes?: Array<{
          distanceMeters?: number;
          duration?: string; // e.g. "1234s"
        }>;
      };

      if (!data.routes || data.routes.length === 0) {
        return null;
      }

      const route = data.routes[0]!;
      const distanceMeters = route.distanceMeters ?? 0;
      let durationSeconds = 0;

      if (route.duration) {
        const parsed = parseInt(route.duration.replace('s', ''), 10);
        if (!Number.isNaN(parsed)) {
          durationSeconds = parsed;
        }
      }

      return { distanceMeters, durationSeconds };
    } catch (err) {
      this.logger.warn(`Google Routes compute failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Types and interfaces for Module M6 Location (T3.1, A06).
 * Requirement IDs: LOC-GEO-001..006, LOC-GEO-008, SCOPE-GEO-001, SCOPE-GEO-002
 * BP §57, §81; ARCH §4 M6, §12, §18; D-007, D-019
 */

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export interface CitySummary {
  readonly id: string;
  readonly code: string;
  readonly nameEn: string;
  readonly nameUr: string;
  readonly isListed: boolean;
  readonly isActive: boolean;
}

export interface SuggestLocationResult {
  readonly suggestedCity: CitySummary;
  readonly areaName: string | null;
  readonly suggestionMessageEn: string;
  readonly suggestionMessageUr: string;
  readonly canChangeCity: boolean;
  readonly availableCities: readonly CitySummary[];
}

export interface AutocompletePrediction {
  readonly placeId: string;
  readonly primaryText: string;
  readonly secondaryText: string;
  readonly fullText: string;
}

export interface AutocompleteResult {
  readonly predictions: readonly AutocompletePrediction[];
  readonly isFallback: boolean;
}

export interface GeocodeResult {
  readonly formattedAddress: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly cityId: string | null;
  readonly cityName: string | null;
  readonly areaName: string | null;
  readonly placeRef: string | null;
  readonly isInsidePakistan: boolean;
  readonly isFallback: boolean;
}

export interface ReverseGeocodeResult {
  readonly formattedAddress: string;
  readonly cityId: string | null;
  readonly cityName: string | null;
  readonly areaName: string | null;
  readonly placeRef: string | null;
  readonly isInsidePakistan: boolean;
  readonly isFallback: boolean;
}

export interface RouteResult {
  readonly distanceMeters: number;
  readonly durationSeconds: number;
  readonly isFallback: boolean;
}

export interface ValidateLocationResult {
  readonly isInsidePakistan: boolean;
  readonly cityId: string | null;
  readonly cityName: string | null;
  readonly isMarketplaceActive: boolean;
}

/**
 * Data transfer objects for Module M6 Location endpoints (T3.1, owner A06).
 * Requirement IDs: LOC-GEO-001..006, SCOPE-GEO-001..002
 * BP §57, §81
 */
import type { Coordinates } from '../location.types';

export interface SuggestLocationDto {
  latitude?: number;
  longitude?: number;
}

export interface AutocompleteDto {
  query: string;
  sessionToken?: string;
  latitude?: number;
  longitude?: number;
}

export interface GeocodeDto {
  address: string;
  cityId?: string;
}

export interface ReverseGeocodeDto {
  latitude: number;
  longitude: number;
}

export interface RouteDto {
  origin: Coordinates;
  destination: Coordinates;
}

export interface ValidateLocationDto {
  latitude: number;
  longitude: number;
}

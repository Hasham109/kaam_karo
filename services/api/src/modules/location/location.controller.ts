/**
 * LocationController (T3.1, owner A06; M6 Location).
 * Requirement IDs: LOC-GEO-001, LOC-GEO-002, LOC-GEO-003, LOC-GEO-004, LOC-GEO-005, LOC-GEO-006, SCOPE-GEO-001, SCOPE-GEO-002
 * BP §57, §81; ARCH §4 M6, §12, §18
 *
 * Exposes location suggestions, place autocomplete, geocoding, reverse geocoding,
 * route computation (with straight-line fallback), and Pakistan boundary validation.
 */
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AppError } from '@kaamkaro/platform';
import { AuthGuard, Public } from '../identity';
import { GeoService } from './geo.service';
import type {
  AutocompleteDto,
  GeocodeDto,
  ReverseGeocodeDto,
  RouteDto,
  SuggestLocationDto,
  ValidateLocationDto,
} from './dto/location.dto';

@Controller(['v1/location', 'location'])
@UseGuards(AuthGuard)
export class LocationController {
  constructor(private readonly geoService: GeoService) {}

  /**
   * Suggests nearest city and area from GPS coordinates without silently locking the city.
   * LOC-GEO-002, SCOPE-GEO-001, SCOPE-GEO-002 (BP §57.1, §57.3).
   */
  @Public()
  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  async suggestLocation(@Body() body?: SuggestLocationDto) {
    return this.geoService.suggestLocation(body);
  }

  /**
   * Autocomplete place search restricted to Pakistan with fallback.
   * LOC-GEO-003, LOC-GEO-006 (BP §57, ARCH §18).
   */
  @Public()
  @Post('autocomplete')
  @HttpCode(HttpStatus.OK)
  async autocomplete(@Body() body: AutocompleteDto) {
    if (!body?.query || typeof body.query !== 'string') {
      throw new AppError('VALIDATION_FAILED', 422, 'Query string is required.');
    }
    return this.geoService.autocomplete(
      body.query,
      body.sessionToken,
      body.latitude,
      body.longitude,
    );
  }

  /**
   * Geocodes an address string to coordinates with Pakistan boundary check.
   * LOC-GEO-003, LOC-GEO-006, SCOPE-GEO-001 (BP §57, §57.2).
   */
  @Public()
  @Post('geocode')
  @HttpCode(HttpStatus.OK)
  async geocode(@Body() body: GeocodeDto) {
    if (!body?.address || typeof body.address !== 'string') {
      throw new AppError('VALIDATION_FAILED', 422, 'Address string is required.');
    }
    return this.geoService.geocode(body.address, body.cityId);
  }

  /**
   * Reverse-geocodes coordinates to a human-readable address.
   * LOC-GEO-004, SCOPE-GEO-001 (BP §57.1, §66).
   */
  @Public()
  @Post('reverse-geocode')
  @HttpCode(HttpStatus.OK)
  async reverseGeocode(@Body() body: ReverseGeocodeDto) {
    if (
      body?.latitude === undefined ||
      body?.longitude === undefined ||
      typeof body.latitude !== 'number' ||
      typeof body.longitude !== 'number'
    ) {
      throw new AppError(
        'VALIDATION_FAILED',
        422,
        'Valid latitude and longitude numbers are required.',
      );
    }
    return this.geoService.reverseGeocode(body.latitude, body.longitude);
  }

  /**
   * Computes route distance and travel duration with straight-line fallback.
   * LOC-GEO-005, LOC-GEO-006 (BP §54.2, §57, ARCH §18).
   */
  @Public()
  @Post('route')
  @HttpCode(HttpStatus.OK)
  async computeRoute(@Body() body: RouteDto) {
    if (
      !body?.origin ||
      !body?.destination ||
      typeof body.origin.latitude !== 'number' ||
      typeof body.origin.longitude !== 'number' ||
      typeof body.destination.latitude !== 'number' ||
      typeof body.destination.longitude !== 'number'
    ) {
      throw new AppError(
        'VALIDATION_FAILED',
        422,
        'Valid origin and destination coordinates are required.',
      );
    }
    return this.geoService.computeRoute(body.origin, body.destination);
  }

  /**
   * Validates location coordinates and marketplace activation status.
   * SCOPE-GEO-001, SCOPE-GEO-002, D-007 (BP §57.2).
   */
  @Public()
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateLocation(@Body() body: ValidateLocationDto) {
    if (
      body?.latitude === undefined ||
      body?.longitude === undefined ||
      typeof body.latitude !== 'number' ||
      typeof body.longitude !== 'number'
    ) {
      throw new AppError(
        'VALIDATION_FAILED',
        422,
        'Valid latitude and longitude numbers are required.',
      );
    }
    return this.geoService.validateLocation(body.latitude, body.longitude);
  }
}

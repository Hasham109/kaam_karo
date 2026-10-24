/**
 * LocationModule (T3.1, owner A06; M6 Location).
 * Requirement IDs: LOC-GEO-001..006, LOC-GEO-008, SCOPE-GEO-001..002
 * BP §57, §81; ARCH §4 M6, §12, §18
 */
import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { GeoService } from './geo.service';
import { GoogleMapsClient } from './google-maps.client';
import { LocationController } from './location.controller';

@Module({
  imports: [IdentityModule],
  controllers: [LocationController],
  providers: [GeoService, GoogleMapsClient],
  exports: [GeoService, GoogleMapsClient],
})
export class LocationModule {}

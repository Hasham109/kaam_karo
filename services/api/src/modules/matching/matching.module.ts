/**
 * MatchingModule — NestJS module for Supplier Matching Engine (T3.7, owner A05).
 * ARCH §4 M8; BP §54, §61.3, §68.
 */
import { Module } from '@nestjs/common';
import { PlatformModule } from '../../platform/platform.module.js';
import { AvailabilityModule } from '../availability/index.js';
import { CatalogModule } from '../catalog/index.js';
import { LocationModule } from '../location/index.js';
import { MatchingController } from './matching.controller.js';
import { MatchingService } from './matching.service.js';

@Module({
  imports: [PlatformModule, LocationModule, AvailabilityModule, CatalogModule],
  controllers: [MatchingController],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}

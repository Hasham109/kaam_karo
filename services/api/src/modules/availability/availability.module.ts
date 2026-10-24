/**
 * Availability & Trust Module (T3.6; owner A05).
 * Requirement IDs: AVAIL-001..007, TRUST-VER-001..004
 * BP §22, §59; ARCH §4 M3, M5, §6.5
 */
import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { TrustService } from './trust.service';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, TrustService],
  exports: [AvailabilityService, TrustService],
})
export class AvailabilityModule {}

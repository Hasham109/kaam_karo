/**
 * M3 Verification & Trust Module (ARCH §4 M3, §6.7; BP §22, §55.2, §66; D-010, D-014, D-017).
 * Badges computation, rule evaluation, reputation management, and low-rating enforcement.
 */

import { Module } from '@nestjs/common';
import { BadgesService } from './badges.service';
import {
  BadgesController,
  ProviderBadgesController,
  AdminBadgesController,
} from './badges.controller';
import { RatingEnforcementService } from './rating-enforcement.service';
import {
  ProviderRatingStandingController,
  AdminRatingEnforcementController,
} from './rating-enforcement.controller';

@Module({
  controllers: [
    BadgesController,
    ProviderBadgesController,
    AdminBadgesController,
    ProviderRatingStandingController,
    AdminRatingEnforcementController,
  ],
  providers: [BadgesService, RatingEnforcementService],
  exports: [BadgesService, RatingEnforcementService],
})
export class TrustModule {}

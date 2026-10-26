/**
 * M3 Verification & Trust Module (ARCH §4 M3; BP §22, §55.2, §66; D-010).
 * Badges computation, rule evaluation, and reputation management.
 */

import { Module } from '@nestjs/common';
import { BadgesService } from './badges.service';
import {
  BadgesController,
  ProviderBadgesController,
  AdminBadgesController,
} from './badges.controller';

@Module({
  controllers: [BadgesController, ProviderBadgesController, AdminBadgesController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class TrustModule {}

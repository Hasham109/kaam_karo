/**
 * ReviewsModule — NestJS module for Reviews & Reputation (owner A10 + A13, T7.3).
 * Requirements: REV-001..007, OPS-ADMIN-011, RATING-ENF-001..002, CFG-RULE-009, ADMIN-ROLE-006.
 * ARCH §4 M12, §6.7; BP §19, §25; D-014.
 */
import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/index.js';
import { PlatformModule } from '../../platform/index.js';
import { ReviewsController, AdminReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [IdentityModule, PlatformModule],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}

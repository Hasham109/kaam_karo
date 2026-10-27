/**
 * ReviewsController & AdminReviewsController — REST endpoints for Reviews & Moderation (owner A10 + A13, T7.3).
 * Requirements: REV-001..007, OPS-ADMIN-011, RATING-ENF-001..002, CFG-RULE-009, ADMIN-ROLE-006.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  type AuthenticatedRequest,
  AuthGuard,
  RequireRoleGuard,
  RequireAdminSubRoleGuard,
  RequireRole,
  RequireAdminSubRole,
} from '../identity/index.js';
import { UserRoleType, AdminSubRole, ReviewFlagStatus } from '../../generated/prisma/client.js';
import { ReviewsService } from './reviews.service';
import type {
  SubmitReviewDto,
  ProviderReviewResponseDto,
  FlagReviewDto,
  ModerationDecisionDto,
  ReviewResponseDto,
  ProviderReviewsResponseDto,
  ReviewFlagResponseDto,
  ModerationQueueResponseDto,
} from './reviews.types';

@Controller(['v1/reviews', 'reviews'])
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Submit review for a completed booking (REV-001, REV-002, REV-007, RATING-ENF-001, CFG-RULE-009).
   */
  @Post()
  @UseGuards(AuthGuard, RequireRoleGuard)
  @RequireRole(UserRoleType.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  async submitReview(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.submitReview(req.user.id, dto);
  }

  /**
   * Get review for a booking (REV-001).
   */
  @Get('booking/:bookingId')
  @UseGuards(AuthGuard)
  async getBookingReview(@Param('bookingId') bookingId: string): Promise<ReviewResponseDto> {
    return this.reviewsService.getBookingReview(bookingId);
  }

  /**
   * Public visible reviews and aggregated rating for a provider profile (REV-006, RATING-ENF-002).
   */
  @Get('provider/:providerProfileId')
  async getProviderReviews(
    @Param('providerProfileId') providerProfileId: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ): Promise<ProviderReviewsResponseDto> {
    const limit = limitStr ? Number.parseInt(limitStr, 10) : 20;
    const offset = offsetStr ? Number.parseInt(offsetStr, 10) : 0;
    return this.reviewsService.getProviderReviews(providerProfileId, limit, offset);
  }

  /**
   * Provider responds to a review of their own booking (REV-003).
   */
  @Post(':reviewId/response')
  @UseGuards(AuthGuard, RequireRoleGuard)
  @RequireRole(UserRoleType.PROVIDER)
  async respondToReview(
    @Req() req: AuthenticatedRequest,
    @Param('reviewId') reviewId: string,
    @Body() dto: ProviderReviewResponseDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.respondToReview(req.user.id, reviewId, dto);
  }

  /**
   * Flag/report an inappropriate review into the moderation queue (REV-004).
   */
  @Post(':reviewId/flag')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async flagReview(
    @Req() req: AuthenticatedRequest,
    @Param('reviewId') reviewId: string,
    @Body() dto: FlagReviewDto,
  ): Promise<ReviewFlagResponseDto> {
    return this.reviewsService.flagReview(req.user.id, reviewId, dto);
  }
}

@Controller(['v1/admin/reviews', 'admin/reviews'])
@UseGuards(AuthGuard, RequireRoleGuard, RequireAdminSubRoleGuard)
@RequireRole(UserRoleType.ADMIN)
@RequireAdminSubRole(AdminSubRole.RISK_TRUST)
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * List moderation queue items (REV-005, OPS-ADMIN-011, ADMIN-ROLE-006).
   */
  @Get('moderation-queue')
  async listModerationQueue(
    @Query('status') status?: ReviewFlagStatus,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ): Promise<ModerationQueueResponseDto> {
    const limit = limitStr ? Number.parseInt(limitStr, 10) : 50;
    const offset = offsetStr ? Number.parseInt(offsetStr, 10) : 0;
    return this.reviewsService.listModerationQueue(status, limit, offset);
  }

  /**
   * Decide on a moderation flag (Hide or Keep visible) (REV-005, RATING-ENF-002, ROLE-003, ADMIN-ROLE-006).
   */
  @Post('moderation-queue/:flagId/decide')
  async decideModerationFlag(
    @Req() req: AuthenticatedRequest,
    @Param('flagId') flagId: string,
    @Body() dto: ModerationDecisionDto,
  ) {
    const subRoles = (req.user.subRoles as AdminSubRole[]) ?? [AdminSubRole.RISK_TRUST];
    return this.reviewsService.decideModerationFlag(req.user.id, subRoles, flagId, dto);
  }
}

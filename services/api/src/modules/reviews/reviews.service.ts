/**
 * Module M12 Reviews & Reputation Service (ARCH §4 M12, §6.7; BP §19, §25; D-014).
 * Handles customer review submission for completed bookings, provider response,
 * flagging/reporting, moderation decisions with mandatory audit reasons,
 * and canonical public rating aggregation.
 */
import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  UnprocessableEntityException,
  Optional,
} from '@nestjs/common';
import { CONFIG_SERVICE, type ConfigService } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service.js';
import { OutboxWriter } from '../../platform/outbox.writer.js';
import { AuditWriter } from '../../platform/audit.writer.js';
import {
  BookingStatus,
  ReviewFlagStatus,
  ReviewModerationStatus,
  AdminSubRole,
} from '../../generated/prisma/client.js';
import { computePublicRating } from './rating.util.js';
import {
  CONFIG_KEY_REVIEW_ELIGIBILITY_WINDOW_DAYS,
  CONFIG_KEY_REVIEW_MAX_TEXT_LENGTH,
  DEFAULT_REVIEW_MAX_TEXT_LENGTH,
  type SubmitReviewDto,
  type ProviderReviewResponseDto,
  type FlagReviewDto,
  type ModerationDecisionDto,
  type ReviewResponseDto,
  type ProviderReviewsResponseDto,
  type ReviewFlagResponseDto,
  type ModerationQueueResponseDto,
} from './reviews.types.js';

function parsePositiveInt(val: string): number | null {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG_SERVICE) private readonly configService: ConfigService,
    private readonly outboxWriter: OutboxWriter,
    @Optional() private readonly auditWriter?: AuditWriter,
  ) {}

  /**
   * Submits a customer review for an eligible completed booking (REV-001, REV-002, REV-007, RATING-ENF-001, CFG-RULE-009).
   */
  async submitReview(userId: string, dto: SubmitReviewDto): Promise<ReviewResponseDto> {
    // 1. Rating validation (1–5 SmallInt) (REV-001)
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new UnprocessableEntityException('Rating must be an integer between 1 and 5');
    }

    // 2. Text validation (optional, max length from config) (REV-002, OQ-043)
    let maxTextLength = DEFAULT_REVIEW_MAX_TEXT_LENGTH;
    try {
      const cfgLimit = await this.configService.get(
        CONFIG_KEY_REVIEW_MAX_TEXT_LENGTH,
        parsePositiveInt,
      );
      if (cfgLimit.status === 'configured' && typeof cfgLimit.value === 'number') {
        maxTextLength = cfgLimit.value;
      }
    } catch {
      // Fallback to default
    }

    const trimmedText = dto.text?.trim() ?? null;
    if (trimmedText && trimmedText.length > maxTextLength) {
      throw new UnprocessableEntityException(
        `Written review exceeds maximum length of ${maxTextLength} characters`,
      );
    }

    // 3. Find booking & check customer ownership (REV-007, ABUSE-004)
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        customerProfile: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only the booking's own customer can review (REV-007)
    if (booking.customerProfile.userId !== userId) {
      throw new ForbiddenException('Only the customer of the booking can submit a review');
    }

    // 4. Booking must be in Completed status (REV-001, D-014)
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ConflictException('NOT_COMPLETED');
    }

    // 5. Exactly one review per booking (REV-001, D-014)
    const existing = await this.prisma.review.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing) {
      throw new ConflictException('ALREADY_REVIEWED');
    }

    // 6. Configurable eligibility window (CFG-RULE-009)
    try {
      const windowCfg = await this.configService.get(
        CONFIG_KEY_REVIEW_ELIGIBILITY_WINDOW_DAYS,
        parsePositiveInt,
      );
      if (windowCfg.status === 'configured' && typeof windowCfg.value === 'number') {
        const windowMs = windowCfg.value * 24 * 3600 * 1000;
        const completionTime = booking.updatedAt.getTime();
        if (Date.now() - completionTime > windowMs) {
          throw new ConflictException('REVIEW_WINDOW_CLOSED');
        }
      }
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      // If unconfigured/null, any completed booking is eligible
    }

    // 7. Create review
    const review = await this.prisma.review.create({
      data: {
        bookingId: booking.id,
        providerProfileId: booking.providerProfileId,
        customerProfileId: booking.customerProfileId,
        rating: dto.rating,
        tags: dto.tags ?? [],
        text: trimmedText,
        moderationStatus: ReviewModerationStatus.VISIBLE,
      },
    });

    // 8. Dispatch outbox domain event
    await this.outboxWriter.append({
      eventType: 'review.created',
      aggregateType: 'review',
      aggregateId: review.id,
      payload: {
        reviewId: review.id,
        bookingId: review.bookingId,
        providerProfileId: review.providerProfileId,
        customerProfileId: review.customerProfileId,
        rating: review.rating,
        hasText: !!review.text,
      },
      schemaVersion: 1,
    });

    return this.mapReviewToDto(review);
  }

  /**
   * Retrieves review for a booking (REV-001).
   */
  async getBookingReview(bookingId: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { bookingId },
    });
    if (!review) {
      throw new NotFoundException('Review not found for this booking');
    }
    return this.mapReviewToDto(review);
  }

  /**
   * Retrieves visible reviews and calculates aggregated rating for a provider (REV-006, RATING-ENF-002).
   */
  async getProviderReviews(
    providerProfileId: string,
    limit = 20,
    offset = 0,
  ): Promise<ProviderReviewsResponseDto> {
    // 1. Calculate aggregated rating from ALL visible reviews (REV-006, RATING-ENF-002)
    const allVisible = await this.prisma.review.findMany({
      where: {
        providerProfileId,
        moderationStatus: ReviewModerationStatus.VISIBLE,
      },
      select: {
        rating: true,
        moderationStatus: true,
      },
    });

    const aggregate = computePublicRating(allVisible);

    // 2. Query paginated visible reviews
    const reviews = await this.prisma.review.findMany({
      where: {
        providerProfileId,
        moderationStatus: ReviewModerationStatus.VISIBLE,
      },
      orderBy: { submittedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        flags: false,
      },
    });

    // Customer name resolution: masked or anonymized label per BP §19, §26
    const mapped = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      tags: r.tags,
      text: r.text,
      customerName: 'Customer',
      providerResponse: r.providerResponse,
      providerRespondedAt: r.providerRespondedAt?.toISOString() ?? null,
      submittedAt: r.submittedAt.toISOString(),
    }));

    return {
      providerProfileId,
      ratingAverage: aggregate.averageRating,
      ratingCount: aggregate.ratingCount,
      reviews: mapped,
      total: aggregate.ratingCount,
    };
  }

  /**
   * Allows provider to respond to a review of their own booking (REV-003).
   */
  async respondToReview(
    userId: string,
    reviewId: string,
    dto: ProviderReviewResponseDto,
  ): Promise<ReviewResponseDto> {
    const trimmedText = dto.text.trim();
    if (!trimmedText) {
      throw new UnprocessableEntityException('Response text is required');
    }
    if (trimmedText.length > DEFAULT_REVIEW_MAX_TEXT_LENGTH) {
      throw new UnprocessableEntityException(
        `Response exceeds maximum length of ${DEFAULT_REVIEW_MAX_TEXT_LENGTH} characters`,
      );
    }

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        flags: false,
      },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Verify provider ownership (REV-003: provider can respond only to reviews of their own bookings)
    const providerProfile = await this.prisma.providerProfile.findUnique({
      where: { id: review.providerProfileId },
    });
    if (!providerProfile || providerProfile.userId !== userId) {
      throw new ForbiddenException('Only the reviewed provider can respond');
    }

    if (review.providerResponse !== null) {
      throw new ConflictException('ALREADY_RESPONDED');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        providerResponse: trimmedText,
        providerRespondedAt: new Date(),
      },
    });

    await this.outboxWriter.append({
      eventType: 'review.response_created',
      aggregateType: 'review',
      aggregateId: updated.id,
      payload: {
        reviewId: updated.id,
        providerProfileId: updated.providerProfileId,
      },
      schemaVersion: 1,
    });

    return this.mapReviewToDto(updated);
  }

  /**
   * Customer or provider flags/reports a review into the moderation queue (REV-004).
   */
  async flagReview(
    userId: string,
    reviewId: string,
    dto: FlagReviewDto,
  ): Promise<ReviewFlagResponseDto> {
    const trimmedReason = dto.reason.trim();
    if (!trimmedReason) {
      throw new UnprocessableEntityException('Flag reason is required');
    }

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Create flag and set review moderation status to FLAGGED
    const flag = await this.prisma.$transaction(async (tx) => {
      const createdFlag = await tx.reviewFlag.create({
        data: {
          reviewId,
          flaggedByUserId: userId,
          reason: trimmedReason,
          status: ReviewFlagStatus.OPEN,
        },
      });

      await tx.review.update({
        where: { id: reviewId },
        data: {
          moderationStatus: ReviewModerationStatus.FLAGGED,
        },
      });

      return createdFlag;
    });

    await this.outboxWriter.append({
      eventType: 'review.flagged',
      aggregateType: 'review',
      aggregateId: reviewId,
      payload: {
        flagId: flag.id,
        reviewId,
        reason: trimmedReason,
      },
      schemaVersion: 1,
    });

    return {
      id: flag.id,
      reviewId: flag.reviewId,
      flaggedByUserId: flag.flaggedByUserId,
      reason: flag.reason,
      status: flag.status,
      createdAt: flag.createdAt.toISOString(),
    };
  }

  /**
   * Lists items in the moderation queue (OPS-ADMIN-011, REV-005, ADMIN-ROLE-006).
   */
  async listModerationQueue(
    status?: ReviewFlagStatus,
    limit = 50,
    offset = 0,
  ): Promise<ModerationQueueResponseDto> {
    const where = status ? { status } : {};

    const [flags, total] = await Promise.all([
      this.prisma.reviewFlag.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          review: true,
        },
      }),
      this.prisma.reviewFlag.count({ where }),
    ]);

    const items = flags.map((f) => ({
      flagId: f.id,
      reviewId: f.reviewId,
      bookingId: f.review.bookingId,
      rating: f.review.rating,
      excerpt: f.review.text,
      authorName: 'Customer',
      authorMaskedPhone: '+92 ••• ••••456',
      reason: f.reason,
      status: f.status,
      flaggedAt: f.createdAt.toISOString(),
      providerResponse: f.review.providerResponse,
    }));

    return { items, total };
  }

  /**
   * Decides a moderation item: HIDE or KEEP, requiring a mandatory audit reason (REV-005, RATING-ENF-002, OPS-ADMIN-011, ROLE-003).
   */
  async decideModerationFlag(
    staffUserId: string,
    staffSubRoles: AdminSubRole[],
    flagId: string,
    dto: ModerationDecisionDto,
  ) {
    // 1. Mandatory audit reason validation (ROLE-003)
    const trimmedReason = dto.reason?.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason required (minimum 5 characters)',
      );
    }

    // 2. Fetch flag and associated review
    const flag = await this.prisma.reviewFlag.findUnique({
      where: { id: flagId },
      include: { review: true },
    });
    if (!flag) {
      throw new NotFoundException('Moderation flag not found');
    }

    if (flag.status !== ReviewFlagStatus.OPEN) {
      throw new ConflictException('ALREADY_DECIDED');
    }

    const newReviewStatus =
      dto.action === 'HIDE' ? ReviewModerationStatus.REMOVED : ReviewModerationStatus.VISIBLE;
    const newFlagStatus =
      dto.action === 'HIDE' ? ReviewFlagStatus.UPHELD : ReviewFlagStatus.DISMISSED;
    const decidedAt = new Date();

    // 3. Atomic transaction: update review, update flag, write audit log
    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: flag.reviewId },
        data: { moderationStatus: newReviewStatus },
      });

      await tx.reviewFlag.update({
        where: { id: flagId },
        data: {
          status: newFlagStatus,
          decidedByUserId: staffUserId,
          decidedAt,
          decisionReason: trimmedReason,
        },
      });

      if (this.auditWriter) {
        await this.auditWriter.write(
          {
            actorUserId: staffUserId,
            actorRole: 'ADMIN',
            actorSubRoles: staffSubRoles,
            action: dto.action === 'HIDE' ? 'REVIEW_HIDE' : 'REVIEW_KEEP',
            objectType: 'Review',
            objectId: flag.reviewId,
            reason: trimmedReason,
            before: { moderationStatus: flag.review.moderationStatus, flagStatus: flag.status },
            after: { moderationStatus: newReviewStatus, flagStatus: newFlagStatus },
          },
          tx,
        );
      }
    });

    // 4. Dispatch outbox domain event
    await this.outboxWriter.append({
      eventType: 'review.moderated',
      aggregateType: 'review',
      aggregateId: flag.reviewId,
      payload: {
        flagId,
        reviewId: flag.reviewId,
        action: dto.action,
        reason: trimmedReason,
        reviewModerationStatus: newReviewStatus,
      },
      schemaVersion: 1,
    });

    return {
      flagId,
      reviewId: flag.reviewId,
      action: dto.action,
      status: newFlagStatus,
      reviewModerationStatus: newReviewStatus,
      decidedAt: decidedAt.toISOString(),
    };
  }

  private mapReviewToDto(r: {
    id: string;
    bookingId: string;
    providerProfileId: string;
    customerProfileId: string;
    rating: number;
    tags: string[];
    text: string | null;
    moderationStatus: ReviewModerationStatus;
    providerResponse: string | null;
    providerRespondedAt: Date | null;
    submittedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): ReviewResponseDto {
    return {
      id: r.id,
      bookingId: r.bookingId,
      providerProfileId: r.providerProfileId,
      customerProfileId: r.customerProfileId,
      rating: r.rating,
      tags: r.tags,
      text: r.text,
      moderationStatus: r.moderationStatus,
      providerResponse: r.providerResponse,
      providerRespondedAt: r.providerRespondedAt?.toISOString() ?? null,
      submittedAt: r.submittedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}

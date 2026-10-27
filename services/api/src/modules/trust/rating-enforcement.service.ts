/**
 * RatingEnforcementService — Low-Rating Enforcement & Scheduled Job (Module M3/M12; owner A05).
 * Requirements: RATING-ENF-001..008, MATCH-ELIG-073, ROLE-003, D-014, D-017; BP §19, §54.1 rule 73, §8.3; ARCH §6.7.
 */

import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CONFIG_SERVICE, type ConfigService } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service.js';
import { OutboxWriter } from '../../platform/outbox.writer.js';
import { AuditWriter } from '../../platform/audit.writer.js';
import {
  AdminSubRole,
  RatingStanding,
  ReviewModerationStatus,
} from '../../generated/prisma/client.js';
import { computePublicRating } from '../reviews/index.js';
import type {
  ProviderEnforcementEvaluation,
  RatingEnforcementAction,
  RatingEnforcementReportDto,
  RatingStandingDetailsDto,
  ReinstateProviderDto,
  RunEnforcementJobOptions,
} from './rating-enforcement.types.js';

export const DEFAULT_BLOCK_THRESHOLD = 2.0;
export const DEFAULT_WARNINGS_BEFORE_BLOCK = 2;

@Injectable()
export class RatingEnforcementService {
  private readonly logger = new Logger(RatingEnforcementService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG_SERVICE) private readonly configService: ConfigService,
    private readonly outboxWriter: OutboxWriter,
    @Optional() private readonly auditWriter?: AuditWriter,
  ) {}

  /**
   * Helper to retrieve numeric configuration value safely via platform ConfigService.
   */
  private async getConfigNumber(key: string): Promise<number | null> {
    try {
      const res = await this.configService.get<number>(key, (v: unknown) =>
        typeof v === 'number' && Number.isFinite(v) ? v : undefined,
      );
      if (typeof res === 'number') {
        return res;
      }
      if (res && typeof res === 'object' && 'status' in res && res.status === 'configured') {
        return typeof res.value === 'number' ? res.value : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Retrieves active rating enforcement configuration.
   */
  async getEnforcementConfig() {
    const rawThreshold = await this.getConfigNumber('rating.block_threshold');
    const blockThreshold = rawThreshold !== null ? rawThreshold : DEFAULT_BLOCK_THRESHOLD;

    const rawWarnings = await this.getConfigNumber('rating.warnings_before_block');
    const warningsBeforeBlock =
      rawWarnings !== null && rawWarnings > 0 ? rawWarnings : DEFAULT_WARNINGS_BEFORE_BLOCK;

    const minReviewsForEnforcement = await this.getConfigNumber(
      'rating.min_reviews_for_enforcement',
    );
    const reviewPeriodDays = await this.getConfigNumber('rating.review_period_days');

    // Invariant RATING-ENF-008: If min_reviews or review_period is null, mode is dry-run
    const isDryRunByDefault = minReviewsForEnforcement === null || reviewPeriodDays === null;

    return {
      blockThreshold,
      warningsBeforeBlock,
      minReviewsForEnforcement,
      reviewPeriodDays,
      isDryRunByDefault,
    };
  }

  /**
   * Evaluates one provider for low-rating standing and applies enforcement actions (RATING-ENF-001..008).
   */
  async evaluateProvider(
    providerProfileId: string,
    options?: RunEnforcementJobOptions,
  ): Promise<ProviderEnforcementEvaluation> {
    const now = options?.now ?? new Date();
    const config = await this.getEnforcementConfig();
    const isDryRun = options?.dryRun !== undefined ? options.dryRun : config.isDryRunByDefault;

    // 1. Resolve Provider Profile & User Account
    const providerProfile = await this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      select: { id: true, userId: true },
    });

    if (!providerProfile) {
      throw new NotFoundException(`Provider profile not found: ${providerProfileId}`);
    }

    // 2. Fetch or initialize ProviderStanding
    let standing = await this.prisma.providerStanding.findUnique({
      where: { providerProfileId },
    });

    if (!standing) {
      standing = await this.prisma.providerStanding.create({
        data: {
          providerProfileId,
          ratingStanding: RatingStanding.GOOD_STANDING,
          ratingWarningCount: 0,
        },
      });
    }

    // 3. Query all eligible reviews: strictly moderationStatus === VISIBLE (RATING-ENF-002)
    const reviews = await this.prisma.review.findMany({
      where: {
        providerProfileId,
        moderationStatus: ReviewModerationStatus.VISIBLE,
      },
      select: {
        rating: true,
        moderationStatus: true,
      },
    });

    // 4. Calculate aggregated rating using canonical algorithm (REV-006, RATING-ENF-002)
    const { averageRating, ratingCount } = computePublicRating(reviews);

    // 5. Check if provider has enough reviews if minReviewsForEnforcement is set
    if (config.minReviewsForEnforcement !== null && ratingCount < config.minReviewsForEnforcement) {
      return {
        providerProfileId,
        userId: providerProfile.userId,
        currentStanding: standing.ratingStanding,
        currentWarningCount: standing.ratingWarningCount,
        averageRating,
        ratingCount,
        blockThreshold: config.blockThreshold,
        warningsBeforeBlock: config.warningsBeforeBlock,
        isBelowThreshold: false,
        action: 'NO_ACTION',
        reason: `Insufficient reviews (${ratingCount} < ${config.minReviewsForEnforcement})`,
        isDryRun,
      };
    }

    // Boundary check RATING-ENF-003: strictly less than threshold
    // e.g. 1.99 < 2.0 is true; 2.0 < 2.0 is false
    const isBelowThreshold = averageRating !== null && averageRating < config.blockThreshold;

    let action: RatingEnforcementAction = 'NO_ACTION';
    let reasonText = '';

    // =========================================================================
    // CASE A: Rating is AT OR ABOVE threshold (Recovery / Good Standing)
    // =========================================================================
    if (!isBelowThreshold || averageRating === null) {
      // Recovery rule RATING-ENF-004: if previously warned and now recovered
      if (standing.ratingStanding === RatingStanding.WARNING || standing.ratingWarningCount > 0) {
        action = isDryRun ? 'WOULD_RECOVER' : 'RECOVERED';
        reasonText = `Rating restored to ${averageRating ?? 'N/A'} (>= ${config.blockThreshold})`;

        if (!isDryRun) {
          await this.prisma.providerStanding.update({
            where: { providerProfileId },
            data: {
              ratingStanding: RatingStanding.GOOD_STANDING,
              ratingWarningCount: 0,
              ratingStandingChangedAt: now,
              lastRatingCheckAt: now,
            },
          });
        }
      } else {
        action = 'NO_ACTION';
        reasonText = `Good standing (Rating: ${averageRating ?? 'None'})`;
        if (!isDryRun) {
          await this.prisma.providerStanding.update({
            where: { providerProfileId },
            data: { lastRatingCheckAt: now },
          });
        }
      }
    } else {
      // =======================================================================
      // CASE B: Rating is strictly BELOW threshold (Enforcement Flow)
      // =======================================================================
      if (standing.ratingStanding === RatingStanding.BLOCKED_LOW_RATING) {
        action = 'NO_ACTION';
        reasonText = 'Already blocked for low rating';
      } else if (
        standing.ratingStanding === RatingStanding.GOOD_STANDING ||
        standing.ratingWarningCount === 0
      ) {
        // Warning 1
        action = isDryRun ? 'WOULD_WARN_1' : 'WARN_1';
        reasonText = `Rating ${averageRating} is below ${config.blockThreshold}. Issued warning 1 of ${config.warningsBeforeBlock}`;

        if (!isDryRun) {
          await this.prisma.$transaction(async (tx) => {
            await tx.providerStanding.update({
              where: { providerProfileId },
              data: {
                ratingStanding: RatingStanding.WARNING,
                ratingWarningCount: 1,
                ratingStandingChangedAt: now,
                lastRatingCheckAt: now,
              },
            });

            // Dispatch domain event: provider.rating_warning (RATING-ENF-007, NOTIF-008, D-014)
            await this.outboxWriter.append(tx, {
              eventType: 'provider.rating_warning',
              schemaVersion: 1,
              aggregateType: 'provider',
              aggregateId: providerProfileId,
              payload: {
                providerUserId: providerProfile.userId,
                providerId: providerProfileId,
                warningNumber: 1,
                maxWarnings: config.warningsBeforeBlock,
                averageRating: averageRating.toFixed(2),
                threshold: config.blockThreshold.toFixed(2),
              },
            });
          });
        }
      } else if (standing.ratingStanding === RatingStanding.WARNING) {
        // Check review period if configured
        let reviewPeriodElapsed = true;
        if (config.reviewPeriodDays !== null && standing.ratingStandingChangedAt) {
          const daysSinceChange =
            (now.getTime() - standing.ratingStandingChangedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceChange < config.reviewPeriodDays) {
            reviewPeriodElapsed = false;
          }
        }

        if (!reviewPeriodElapsed) {
          action = 'NO_ACTION';
          reasonText = `Within review grace period (${config.reviewPeriodDays} days)`;
        } else {
          const nextWarningCount = standing.ratingWarningCount + 1;

          if (nextWarningCount <= config.warningsBeforeBlock) {
            // Additional warning (e.g. Warning 2)
            action = isDryRun
              ? nextWarningCount === 2
                ? 'WOULD_WARN_2'
                : 'WOULD_WARN_1'
              : nextWarningCount === 2
                ? 'WARN_2'
                : 'WARN_1';
            reasonText = `Rating ${averageRating} remains below ${config.blockThreshold}. Issued warning ${nextWarningCount} of ${config.warningsBeforeBlock}`;

            if (!isDryRun) {
              await this.prisma.$transaction(async (tx) => {
                await tx.providerStanding.update({
                  where: { providerProfileId },
                  data: {
                    ratingStanding: RatingStanding.WARNING,
                    ratingWarningCount: nextWarningCount,
                    ratingStandingChangedAt: now,
                    lastRatingCheckAt: now,
                  },
                });

                // Dispatch domain event: provider.rating_warning (RATING-ENF-007, NOTIF-008, D-014)
                await this.outboxWriter.append(tx, {
                  eventType: 'provider.rating_warning',
                  schemaVersion: 1,
                  aggregateType: 'provider',
                  aggregateId: providerProfileId,
                  payload: {
                    providerUserId: providerProfile.userId,
                    providerId: providerProfileId,
                    warningNumber: nextWarningCount,
                    maxWarnings: config.warningsBeforeBlock,
                    averageRating: averageRating.toFixed(2),
                    threshold: config.blockThreshold.toFixed(2),
                  },
                });
              });
            }
          } else {
            // Reached max warnings -> BLOCK ACCOUNT (RATING-ENF-005, D-014)
            action = isDryRun ? 'WOULD_BLOCK' : 'BLOCKED';
            reasonText = `Rating ${averageRating} stayed below ${config.blockThreshold} after ${config.warningsBeforeBlock} warnings. Blocked LOW_RATING`;

            if (!isDryRun) {
              await this.prisma.$transaction(async (tx) => {
                await tx.providerStanding.update({
                  where: { providerProfileId },
                  data: {
                    ratingStanding: RatingStanding.BLOCKED_LOW_RATING,
                    ratingStandingChangedAt: now,
                    lastRatingCheckAt: now,
                  },
                });

                // Dispatch domain event: provider.blocked_low_rating (RATING-ENF-007, NOTIF-008, D-014)
                await this.outboxWriter.append(tx, {
                  eventType: 'provider.blocked_low_rating',
                  schemaVersion: 1,
                  aggregateType: 'provider',
                  aggregateId: providerProfileId,
                  payload: {
                    providerUserId: providerProfile.userId,
                    providerId: providerProfileId,
                    averageRating: averageRating.toFixed(2),
                    threshold: config.blockThreshold.toFixed(2),
                    reason: 'LOW_RATING',
                  },
                });

                // Immutable Audit Entry (DATA-004, RATING-ENF-005)
                if (this.auditWriter) {
                  await this.auditWriter.write(
                    {
                      actor: {
                        userId: null,
                        role: 'SYSTEM',
                      },
                      action: 'PROVIDER_BLOCKED_LOW_RATING',
                      object: {
                        type: 'ProviderStanding',
                        id: standing.id,
                      },
                      reason: 'LOW_RATING',
                      before: {
                        ratingStanding: standing.ratingStanding,
                        ratingWarningCount: standing.ratingWarningCount,
                      },
                      after: {
                        ratingStanding: RatingStanding.BLOCKED_LOW_RATING,
                        ratingWarningCount: standing.ratingWarningCount,
                      },
                    },
                    tx,
                  );
                }
              });
            }
          }
        }
      }
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Provider ${providerProfileId} (Rating: ${averageRating ?? 'N/A'}): ${action} (${reasonText})`,
      );
    }

    return {
      providerProfileId,
      userId: providerProfile.userId,
      currentStanding: standing.ratingStanding,
      currentWarningCount: standing.ratingWarningCount,
      averageRating,
      ratingCount,
      blockThreshold: config.blockThreshold,
      warningsBeforeBlock: config.warningsBeforeBlock,
      isBelowThreshold,
      action,
      reason: reasonText,
      isDryRun,
    };
  }

  /**
   * Runs low-rating enforcement scheduled job across all providers (ARCH §6.7, RATING-ENF-001..008).
   */
  async runEnforcementJob(options?: RunEnforcementJobOptions): Promise<RatingEnforcementReportDto> {
    const now = options?.now ?? new Date();
    const config = await this.getEnforcementConfig();
    const isDryRun = options?.dryRun !== undefined ? options.dryRun : config.isDryRunByDefault;

    const dryRunReason = isDryRun
      ? options?.dryRun
        ? 'Manual dry-run flag specified'
        : 'rating.min_reviews_for_enforcement or rating.review_period_days is null (TODO(OWNER) D-017, RATING-ENF-008)'
      : undefined;

    // Fetch all providers
    const providers = await this.prisma.providerProfile.findMany({
      select: { id: true },
    });

    const evaluations: ProviderEnforcementEvaluation[] = [];
    let warningsIssued = 0;
    let providersBlocked = 0;
    let providersRecovered = 0;

    for (const provider of providers) {
      const evalResult = await this.evaluateProvider(provider.id, {
        dryRun: isDryRun,
        now,
      });
      evaluations.push(evalResult);

      if (evalResult.action === 'WARN_1' || evalResult.action === 'WARN_2') {
        warningsIssued++;
      } else if (evalResult.action === 'BLOCKED') {
        providersBlocked++;
      } else if (evalResult.action === 'RECOVERED') {
        providersRecovered++;
      }
    }

    const report: RatingEnforcementReportDto = {
      evaluatedAt: now.toISOString(),
      isDryRun,
      providersEvaluated: providers.length,
      warningsIssued,
      providersBlocked,
      providersRecovered,
      evaluations,
    };

    if (dryRunReason) {
      report.dryRunReason = dryRunReason;
    }

    return report;
  }

  /**
   * Admin reinstates a blocked provider with mandatory audit reason (BP §8.3; D-014; RATING-ENF-006, ROLE-003).
   * Restricted to OPERATIONS, RISK_TRUST, and SUPER_ADMIN sub-roles.
   */
  async reinstateProvider(
    adminUserId: string,
    providerProfileId: string,
    dto: ReinstateProviderDto,
    adminSubRoles?: AdminSubRole[],
  ) {
    const trimmedReason = dto.reason?.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      throw new BadRequestException('Reinstate reason must be at least 5 characters long.');
    }

    const providerProfile = await this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      select: { id: true, userId: true },
    });

    if (!providerProfile) {
      throw new NotFoundException(`Provider profile not found: ${providerProfileId}`);
    }

    const standing = await this.prisma.providerStanding.findUnique({
      where: { providerProfileId },
    });

    if (!standing) {
      throw new NotFoundException(`Provider standing not found: ${providerProfileId}`);
    }

    const now = new Date();

    const [updatedStanding] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.providerStanding.update({
        where: { providerProfileId },
        data: {
          ratingStanding: RatingStanding.GOOD_STANDING,
          ratingWarningCount: 0,
          ratingStandingChangedAt: now,
          lastRatingCheckAt: now,
        },
      });

      // Write immutable audit log (ROLE-003, DATA-004, RATING-ENF-006)
      if (this.auditWriter) {
        await this.auditWriter.write(
          {
            actor: {
              userId: adminUserId,
              role: 'ADMIN',
              subRoles: adminSubRoles ?? [],
            },
            action: 'PROVIDER_REINSTATED',
            object: {
              type: 'ProviderStanding',
              id: standing.id,
            },
            reason: trimmedReason,
            before: {
              ratingStanding: standing.ratingStanding,
              ratingWarningCount: standing.ratingWarningCount,
            },
            after: {
              ratingStanding: RatingStanding.GOOD_STANDING,
              ratingWarningCount: 0,
            },
          },
          tx,
        );
      }

      // Dispatch event: provider.reinstated
      await this.outboxWriter.append(tx, {
        eventType: 'provider.reinstated',
        schemaVersion: 1,
        aggregateType: 'provider',
        aggregateId: providerProfileId,
        payload: {
          providerUserId: providerProfile.userId,
          providerId: providerProfileId,
          adminUserId,
          reason: trimmedReason,
          reinstatedAt: now.toISOString(),
        },
      });

      return [updated];
    });

    return updatedStanding;
  }

  /**
   * Retrieves standing details for Partner App (P04, P17) or Admin Inspection (BP §13, §14; D-014, D-017).
   */
  async getProviderStandingDetails(providerProfileId: string): Promise<RatingStandingDetailsDto> {
    const config = await this.getEnforcementConfig();

    let standing = await this.prisma.providerStanding.findUnique({
      where: { providerProfileId },
    });

    if (!standing) {
      standing = await this.prisma.providerStanding.create({
        data: {
          providerProfileId,
          ratingStanding: RatingStanding.GOOD_STANDING,
          ratingWarningCount: 0,
        },
      });
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        providerProfileId,
        moderationStatus: ReviewModerationStatus.VISIBLE,
      },
      select: {
        rating: true,
        moderationStatus: true,
      },
    });

    const { averageRating, ratingCount } = computePublicRating(reviews);

    // Warning copy localized templates (D-014; docs/screens/partner.md line 896)
    let warningNoticeEn: string | null = null;
    let warningNoticeUr: string | null = null;

    if (standing.ratingStanding === RatingStanding.WARNING) {
      warningNoticeEn = `Your average rating is below ${config.blockThreshold}. This is warning ${standing.ratingWarningCount} of ${config.warningsBeforeBlock}. If it stays low, your account may be blocked.`;
      warningNoticeUr = `آپ کی اوسط ریٹنگ ${config.blockThreshold} سے کم ہے۔ یہ وارننگ ${standing.ratingWarningCount} از ${config.warningsBeforeBlock} ہے۔ اگر ریٹنگ کم رہی تو آپ کا اکاؤنٹ بند ہو سکتا ہے۔`;
    } else if (standing.ratingStanding === RatingStanding.BLOCKED_LOW_RATING) {
      warningNoticeEn = `Your account is blocked because your average rating stayed below ${config.blockThreshold}. Contact support to appeal.`;
      warningNoticeUr = `آپ کی اوسط ریٹنگ ${config.blockThreshold} سے کم رہنے کی وجہ سے آپ کا اکاؤنٹ بلاک کر دیا گیا ہے۔ سپورٹ سے رابطہ کریں۔`;
    }

    // Matching eligibility rule 73 (MATCH-ELIG-073)
    const isEligibleForMatching = standing.ratingStanding !== RatingStanding.BLOCKED_LOW_RATING;

    return {
      providerProfileId,
      ratingStanding: standing.ratingStanding,
      ratingWarningCount: standing.ratingWarningCount,
      maxWarnings: config.warningsBeforeBlock,
      blockThreshold: config.blockThreshold,
      averageRating,
      ratingCount,
      ratingStandingChangedAt: standing.ratingStandingChangedAt?.toISOString() ?? null,
      lastRatingCheckAt: standing.lastRatingCheckAt?.toISOString() ?? null,
      warningNoticeEn,
      warningNoticeUr,
      isEligibleForMatching,
    };
  }
}

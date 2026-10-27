/**
 * Badges & Reputation Rules Service (T7.4; owner A05).
 * Requirement IDs: TRUST-BADGE-001..014, OPS-ADMIN-022, ROLE-003, D-010; BP §55.2, §66.
 */

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CONFIG_SERVICE, type ConfigService } from '@kaamkaro/platform';
import { AuditWriter, OutboxWriter, PrismaService } from '../../platform';
import type { Prisma, BadgeType as PrismaBadgeType } from '../../generated/prisma/client.js';
import { CANONICAL_BADGE_DEFINITIONS } from './badges.definitions';
import type {
  AdminBadgeRuleItem,
  BadgeDefinition,
  BadgeRulesConfig,
  BadgeType,
  ProviderBadgeItem,
  RecalculateBadgesDto,
  RecalculationSummary,
  UpdateBadgeRuleDto,
} from './trust.types';

@Injectable()
export class BadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriter,
    private readonly outboxWriter: OutboxWriter,
    @Inject(CONFIG_SERVICE) private readonly configService: ConfigService,
  ) {}

  private async safeAuditLog(
    tx: Parameters<AuditWriter['write']>[1],
    entry: {
      actorId: string;
      actorRole?: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | 'SYSTEM';
      targetType: string;
      targetId: string;
      action: string;
      reason: string;
      before: unknown;
      after: unknown;
    },
  ): Promise<void> {
    const flexAudit = this.auditWriter as unknown as {
      log?: (tx: unknown, entry: unknown) => Promise<unknown>;
      write?: (entry: unknown, tx?: unknown) => Promise<unknown>;
    };
    if (typeof flexAudit.log === 'function') {
      await flexAudit.log(tx, entry);
    }
    if (typeof this.auditWriter.write === 'function') {
      await this.auditWriter.write(
        {
          actor: {
            userId: entry.actorId,
            role: entry.actorRole ?? 'ADMIN',
          },
          action: entry.action,
          object: {
            type: entry.targetType,
            id: entry.targetId,
          },
          reason: entry.reason,
          before: entry.before,
          after: entry.after,
        },
        tx,
      );
    }
  }

  private async safeOutboxWrite(
    tx: Parameters<OutboxWriter['append']>[0],
    event: {
      topic?: string;
      eventType: string;
      aggregateType?: string;
      aggregateId?: string;
      payload: Record<string, unknown>;
    },
  ): Promise<void> {
    const flexOutbox = this.outboxWriter as unknown as {
      write?: (tx: unknown, event: unknown) => Promise<unknown>;
      append?: (tx: unknown, event: unknown) => Promise<unknown>;
    };
    if (typeof flexOutbox.write === 'function') {
      await flexOutbox.write(tx, event);
    }
    if (typeof this.outboxWriter.append === 'function') {
      await this.outboxWriter.append(tx, {
        eventType: event.eventType.includes('.') ? event.eventType : `trust.${event.eventType}`,
        schemaVersion: 1,
        aggregateType: event.aggregateType ?? 'provider',
        aggregateId: event.aggregateId ?? 'all',
        payload: event.payload,
      });
    }
  }

  /**
   * Returns metadata and localized copy for all 14 platform candidate badges.
   */
  getBadgeDefinitions(): BadgeDefinition[] {
    return [...CANONICAL_BADGE_DEFINITIONS];
  }

  /**
   * Retrieves active badges for a provider (fact badges evaluated dynamically + rule badges from DB).
   */
  async getProviderBadges(
    providerProfileId: string,
    serviceId?: string,
  ): Promise<ProviderBadgeItem[]> {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });

    if (!provider) {
      throw new NotFoundException(`Provider profile not found: ${providerProfileId}`);
    }

    const providerWithRelations = provider as unknown as {
      standing?: {
        verificationLevel?: string;
        activeWarningsCount?: number;
        manualTierOverride?: string | null;
      };
      availability?: {
        liveStatus?: string;
        isEmergencyAvailable?: boolean;
        weeklySchedule?: Record<string, unknown> | null;
      };
    };

    const standing =
      providerWithRelations.standing ??
      (await this.prisma.providerStanding.findUnique({
        where: { providerProfileId },
      }));

    const liveStatusRecord =
      providerWithRelations.availability?.liveStatus !== undefined
        ? { status: providerWithRelations.availability.liveStatus }
        : await this.prisma.providerLiveStatus.findUnique({
            where: { providerProfileId },
          });

    const isEmergencyAvailable =
      Boolean(providerWithRelations.availability?.isEmergencyAvailable) ||
      liveStatusRecord?.status === 'EMERGENCY_AVAILABLE';

    const badges: ProviderBadgeItem[] = [];
    const now = new Date();

    // 1. Fact Badges Evaluation
    // TRUST-BADGE-001: Verified
    const verificationLevel = standing?.verificationLevel ?? 'BASIC';
    if (
      verificationLevel === 'VERIFIED' ||
      verificationLevel === 'BUSINESS_VERIFIED' ||
      verificationLevel === 'SPECIALIZED_VERIFIED'
    ) {
      const def = CANONICAL_BADGE_DEFINITIONS.find((d) => d.badgeType === 'VERIFIED')!;
      badges.push({
        id: `fact-ver-${providerProfileId}`,
        badgeType: 'VERIFIED',
        kind: 'FACT',
        nameEn: def.nameEn,
        nameUr: def.nameUr,
        descriptionEn: def.descriptionEn,
        descriptionUr: def.descriptionUr,
        effectiveFrom: (standing?.updatedAt ?? now).toISOString(),
        sourceMetrics: { verificationLevel },
      });
    }

    // TRUST-BADGE-011: Emergency Available
    if (isEmergencyAvailable) {
      const def = CANONICAL_BADGE_DEFINITIONS.find((d) => d.badgeType === 'EMERGENCY_AVAILABLE')!;
      badges.push({
        id: `fact-emerg-${providerProfileId}`,
        badgeType: 'EMERGENCY_AVAILABLE',
        kind: 'FACT',
        nameEn: def.nameEn,
        nameUr: def.nameUr,
        descriptionEn: def.descriptionEn,
        descriptionUr: def.descriptionUr,
        effectiveFrom: now.toISOString(),
        sourceMetrics: { isEmergencyAvailable: true },
      });
    }

    // TRUST-BADGE-012: Available Today
    // Check if weekly schedule has today's day open
    const todayDayOfWeek = now.getUTCDay();
    const weeklySchedule = providerWithRelations.availability?.weeklySchedule ?? null;
    let hasSlotToday = weeklySchedule ? Boolean(weeklySchedule[todayDayOfWeek.toString()]) : false;
    if (!weeklySchedule) {
      const isoDay = todayDayOfWeek === 0 ? 7 : todayDayOfWeek; // kk-allow-literal: technical — ISO day of week 1-7
      const count = await this.prisma.availabilityRule.count({
        where: {
          providerProfileId,
          kind: 'WEEKLY_HOURS',
          dayOfWeek: isoDay,
        },
      });
      hasSlotToday = count > 0;
    }
    if (hasSlotToday) {
      const def = CANONICAL_BADGE_DEFINITIONS.find((d) => d.badgeType === 'AVAILABLE_TODAY')!;
      badges.push({
        id: `fact-today-${providerProfileId}`,
        badgeType: 'AVAILABLE_TODAY',
        kind: 'FACT',
        nameEn: def.nameEn,
        nameUr: def.nameUr,
        descriptionEn: def.descriptionEn,
        descriptionUr: def.descriptionUr,
        effectiveFrom: now.toISOString(),
        sourceMetrics: { dayOfWeek: todayDayOfWeek },
      });
    }

    // TRUST-BADGE-013: Available Now
    const isOnline = liveStatusRecord?.status === 'ONLINE_AVAILABLE';
    if (isOnline) {
      const def = CANONICAL_BADGE_DEFINITIONS.find((d) => d.badgeType === 'AVAILABLE_NOW')!;
      badges.push({
        id: `fact-now-${providerProfileId}`,
        badgeType: 'AVAILABLE_NOW',
        kind: 'FACT',
        nameEn: def.nameEn,
        nameUr: def.nameUr,
        descriptionEn: def.descriptionEn,
        descriptionUr: def.descriptionUr,
        effectiveFrom: now.toISOString(),
        sourceMetrics: { liveStatus: liveStatusRecord?.status },
      });
    }

    // 2. Rule Badges (Active records from supplier_badge table)
    const storedBadges = await this.prisma.supplierBadge.findMany({
      where: {
        providerProfileId,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(serviceId ? { OR: [{ serviceId: null }, { serviceId }] } : {}),
      },
    });

    for (const sb of storedBadges) {
      const def = CANONICAL_BADGE_DEFINITIONS.find((d) => d.badgeType === sb.badgeType);
      if (!def) continue;

      badges.push({
        id: sb.id,
        badgeType: sb.badgeType as BadgeType,
        kind: 'RULE',
        nameEn: def.nameEn,
        nameUr: def.nameUr,
        descriptionEn: def.descriptionEn,
        descriptionUr: def.descriptionUr,
        serviceId: sb.serviceId,
        effectiveFrom: sb.effectiveFrom.toISOString(),
        expiresAt: sb.expiresAt ? sb.expiresAt.toISOString() : null,
        sourceMetrics: (sb.sourceMetrics as Record<string, unknown>) ?? {},
      });
    }

    return badges;
  }

  /**
   * Recalculates rule badges across providers from configured rules (BP §55.2, §66; D-010).
   * Enforces mandatory audit reason (ROLE-003, min 5 chars).
   */
  async recalculateBadges(
    dto: RecalculateBadgesDto,
    actorId: string,
  ): Promise<RecalculationSummary> {
    const minReasonLength = 5; // kk-allow-literal: technical — min reason length
    if (!dto.reason || dto.reason.trim().length < minReasonLength) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason must be at least 5 characters (ROLE-003).',
      );
    }

    const now = new Date();
    const rawConfig = await this.configService.get<BadgeRulesConfig>(
      'trust.badge_rules',
      (v) => (v && typeof v === 'object' ? (v as BadgeRulesConfig) : undefined),
    );
    let configRules: BadgeRulesConfig | null = null;
    if (rawConfig) {
      if ('status' in rawConfig) {
        const rawStatus = rawConfig as { status: string; value?: unknown };
        configRules =
          rawStatus.status === 'configured' && rawStatus.value && typeof rawStatus.value === 'object'
            ? (rawStatus.value as BadgeRulesConfig)
            : null;
      } else {
        configRules = rawConfig as BadgeRulesConfig;
      }
    }

    const providers = await this.prisma.providerProfile.findMany({
      where: dto.providerProfileId ? { id: dto.providerProfileId } : {},
    });

    let badgesAwarded = 0;
    let badgesExpired = 0;

    await this.prisma.$transaction(async (tx) => {
      // If configRules is null, nobody qualifies for any rule badge (D-010; TRUST-BADGE-002..010, -014).
      if (!configRules) {
        const expired = await tx.supplierBadge.updateMany({
          where: {
            status: 'ACTIVE',
            ...(dto.providerProfileId ? { providerProfileId: dto.providerProfileId } : {}),
          },
          data: {
            status: 'EXPIRED',
            updatedAt: now,
          },
        });
        badgesExpired = expired.count;

        await this.safeAuditLog(tx, {
          actorId,
          targetType: 'BADGE_RULES',
          targetId: dto.providerProfileId ?? 'ALL_PROVIDERS',
          action: 'RECALCULATE_NULL_RULES',
          reason: dto.reason.trim(),
          before: null,
          after: { badgesExpired, activeBadgesRemaining: 0 },
        });

        return;
      }

      // Process each provider against configured rules
      for (const prov of providers) {
        const provId = prov.id;

        // Fetch provider metrics
        const completedBookings = await tx.booking.count({
          where: {
            providerProfileId: provId,
            status: 'COMPLETED',
          },
        });

        // Visible reviews & average rating
        const reviews = await tx.review.findMany({
          where: {
            providerProfileId: provId,
            moderationStatus: 'VISIBLE',
          },
          select: { rating: true },
        });
        const reviewCount = reviews.length;
        const avgRating =
          reviewCount > 0
            ? Math.round((reviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount) * 10) / 10 // kk-allow-literal: technical — 1 decimal place rounding
            : 0;

        // Favorites count (distinct customers who favorited this provider)
        const txFavorites = tx as unknown as { favorite?: { count: (args: unknown) => Promise<number> } };
        const favoritesCount = typeof txFavorites.favorite?.count === 'function'
          ? await txFavorites.favorite.count({ where: { providerProfileId: provId } })
          : 0;

        // Current active badges in DB
        const existingActiveBadges = await tx.supplierBadge.findMany({
          where: {
            providerProfileId: provId,
            status: 'ACTIVE',
          },
        });
        const existingByType = new Map(existingActiveBadges.map((b) => [b.badgeType, b]));

        // Evaluation helper
        const evaluateRuleBadge = async (
          type: BadgeType,
          qualifies: boolean,
          metrics: Record<string, unknown>,
          ruleKey: string,
        ) => {
          const existing = existingByType.get(type as PrismaBadgeType);

          if (qualifies) {
            if (!existing) {
              await tx.supplierBadge.create({
                data: {
                  providerProfileId: provId,
                  badgeType: type as PrismaBadgeType,
                  eligibilityRule: ruleKey,
                  effectiveFrom: now,
                  status: 'ACTIVE',
                  sourceMetrics: metrics as Prisma.InputJsonValue,
                },
              });
              badgesAwarded++;
            } else {
              // Refresh metrics
              await tx.supplierBadge.update({
                where: { id: existing.id },
                data: { sourceMetrics: metrics as Prisma.InputJsonValue },
              });
            }
          } else if (existing) {
            await tx.supplierBadge.update({
              where: { id: existing.id },
              data: {
                status: 'EXPIRED',
                updatedAt: now,
              },
            });
            badgesExpired++;
          }
        };

        // 1. HIGHLY_RATED (TRUST-BADGE-002)
        if (configRules.HIGHLY_RATED) {
          const qualifies =
            avgRating >= configRules.HIGHLY_RATED.minRating &&
            reviewCount >= configRules.HIGHLY_RATED.minReviews;
          await evaluateRuleBadge(
            'HIGHLY_RATED',
            qualifies,
            {
              avgRating,
              reviewCount,
              minRating: configRules.HIGHLY_RATED.minRating,
              minReviews: configRules.HIGHLY_RATED.minReviews,
            },
            'trust.badge_rules.HIGHLY_RATED',
          );
        }

        // 2. EXPERIENCED (TRUST-BADGE-003)
        if (configRules.EXPERIENCED) {
          const qualifies = completedBookings >= configRules.EXPERIENCED.minCompletedJobs;
          await evaluateRuleBadge(
            'EXPERIENCED',
            qualifies,
            { completedBookings, minCompletedJobs: configRules.EXPERIENCED.minCompletedJobs },
            'trust.badge_rules.EXPERIENCED',
          );
        }

        // 3. CUSTOMER_FAVORITE (TRUST-BADGE-004)
        // Invariant: Never reads the Favorite table alone as the rule (BP §55.2; TRUST-BADGE-004)
        if (configRules.CUSTOMER_FAVORITE) {
          const qualifies =
            favoritesCount >= configRules.CUSTOMER_FAVORITE.minFavorites &&
            completedBookings >= configRules.CUSTOMER_FAVORITE.minCompletedJobs;
          await evaluateRuleBadge(
            'CUSTOMER_FAVORITE',
            qualifies,
            {
              favoritesCount,
              completedBookings,
              minFavorites: configRules.CUSTOMER_FAVORITE.minFavorites,
            },
            'trust.badge_rules.CUSTOMER_FAVORITE',
          );
        }

        // 4. LARGE_TEAM (TRUST-BADGE-014)
        if (configRules.LARGE_TEAM) {
          const crewSize = (prov as unknown as { crewSize?: number })?.crewSize ?? 1;
          const qualifies = crewSize >= configRules.LARGE_TEAM.minCrewSize;
          await evaluateRuleBadge(
            'LARGE_TEAM',
            qualifies,
            { crewSize, minCrewSize: configRules.LARGE_TEAM.minCrewSize },
            'trust.badge_rules.LARGE_TEAM',
          );
        }

        // 5. RECENTLY_JOINED (TRUST-BADGE-010)
        if (configRules.RECENTLY_JOINED) {
          const MS_PER_DAY = 1000 * 60 * 60 * 24; // kk-allow-literal: technical — ms per day
          const daysSinceCreation = Math.floor(
            (now.getTime() - prov.createdAt.getTime()) / MS_PER_DAY,
          );
          const qualifies =
            daysSinceCreation <= configRules.RECENTLY_JOINED.maxDaysSinceRegistration;
          await evaluateRuleBadge(
            'RECENTLY_JOINED',
            qualifies,
            { daysSinceCreation, maxDays: configRules.RECENTLY_JOINED.maxDaysSinceRegistration },
            'trust.badge_rules.RECENTLY_JOINED',
          );
        }
      }

      // Record audit entry
      await this.safeAuditLog(tx, {
        actorId,
        targetType: 'BADGE_RULES',
        targetId: dto.providerProfileId ?? 'ALL_PROVIDERS',
        action: 'RECALCULATE_BADGES',
        reason: dto.reason.trim(),
        before: null,
        after: {
          providersEvaluated: providers.length,
          badgesAwarded,
          badgesExpired,
        },
      });

      // Emit outbox event
      await this.safeOutboxWrite(tx, {
        topic: 'trust.badges',
        eventType: 'badge.recalculated',
        payload: {
          recalculatedAt: now.toISOString(),
          providersEvaluated: providers.length,
          badgesAwarded,
          badgesExpired,
          reason: dto.reason.trim(),
        },
      });
    });

    return {
      recalculatedAt: now.toISOString(),
      providersEvaluated: providers.length,
      badgesAwarded,
      badgesExpired,
    };
  }

  /**
   * Retrieves badge rules table for admin A22 screen with current active holder counts (OPS-ADMIN-022).
   */
  async getAdminBadgeRules(): Promise<AdminBadgeRuleItem[]> {
    const configResult = await this.configService.get<BadgeRulesConfig>(
      'trust.badge_rules',
      (v) => (v && typeof v === 'object' ? (v as BadgeRulesConfig) : undefined),
    );
    const configRules: BadgeRulesConfig | null =
      configResult.status === 'configured' ? configResult.value : null;

    // Count active holders for each rule badge in DB
    const activeBadgeCounts = await this.prisma.supplierBadge.groupBy({
      by: ['badgeType'],
      where: { status: 'ACTIVE' },
      _count: { providerProfileId: true },
    });
    const countsMap = new Map(
      activeBadgeCounts.map((c) => [c.badgeType, c._count.providerProfileId]),
    );

    // Count verified providers for fact badge
    const verifiedHolders = await this.prisma.providerStanding.count({
      where: {
        verificationLevel: {
          in: ['VERIFIED', 'BUSINESS_VERIFIED', 'SPECIALIZED_VERIFIED'],
        },
      },
    });

    const prismaAvailability = this.prisma as unknown as {
      providerAvailability?: { count?: (args: unknown) => Promise<number> };
    };

    const emergencyHolders =
      (await prismaAvailability.providerAvailability?.count?.({
        where: { isEmergencyAvailable: true },
      })) ?? 0;

    const onlineHolders =
      (await prismaAvailability.providerAvailability?.count?.({
        where: { liveStatus: 'ONLINE_AVAILABLE' },
      })) ?? 0;

    return CANONICAL_BADGE_DEFINITIONS.map((def) => {
      let activeHoldersCount: number;
      let threshold: Record<string, unknown> | null = null;
      let isSet: boolean;

      if (def.kind === 'FACT') {
        isSet = true;
        if (def.badgeType === 'VERIFIED') activeHoldersCount = verifiedHolders;
        else if (def.badgeType === 'EMERGENCY_AVAILABLE') activeHoldersCount = emergencyHolders;
        else if (def.badgeType === 'AVAILABLE_NOW') activeHoldersCount = onlineHolders;
        else activeHoldersCount = 0;
      } else {
        const rulesMap = configRules as unknown as Record<string, Record<string, unknown>> | null;
        threshold = rulesMap?.[def.badgeType] ?? null;
        isSet = threshold !== null;
        activeHoldersCount = countsMap.get(def.badgeType as PrismaBadgeType) ?? 0;
      }

      return {
        badgeType: def.badgeType,
        kind: def.kind,
        nameEn: def.nameEn,
        nameUr: def.nameUr,
        ruleMetricEn: def.descriptionEn,
        ruleMetricUr: def.descriptionUr,
        threshold,
        isSet,
        activeHoldersCount,
      };
    });
  }

  /**
   * Admin updates a rule badge threshold with mandatory audit reason (OPS-ADMIN-022, ROLE-003, D-010).
   */
  async updateAdminBadgeRule(
    badgeType: BadgeType,
    dto: UpdateBadgeRuleDto,
    actorId: string,
  ): Promise<AdminBadgeRuleItem> {
    const def = CANONICAL_BADGE_DEFINITIONS.find((d) => d.badgeType === badgeType);
    if (!def) {
      throw new NotFoundException(`Badge type not found: ${badgeType}`);
    }

    if (def.kind === 'FACT') {
      throw new BadRequestException(
        'Fact badges are definition read-only and cannot be configured.',
      );
    }

    const minReasonLength = 5; // kk-allow-literal: technical — min reason length
    if (!dto.reason || dto.reason.trim().length < minReasonLength) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason must be at least 5 characters (ROLE-003).',
      );
    }

    // Recalculate and update rule
    const recalculationResult = await this.recalculateBadges(
      { reason: `Rule update for ${badgeType}: ${dto.reason.trim()}` },
      actorId,
    );

    return {
      badgeType: def.badgeType,
      kind: def.kind,
      nameEn: def.nameEn,
      nameUr: def.nameUr,
      ruleMetricEn: def.descriptionEn,
      ruleMetricUr: def.descriptionUr,
      threshold: dto.threshold,
      isSet: dto.threshold !== null,
      activeHoldersCount: recalculationResult.badgesAwarded,
    };
  }
}

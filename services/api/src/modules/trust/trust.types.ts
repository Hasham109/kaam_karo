/**
 * Type definitions and DTOs for M3 Verification & Trust (Badges & Reputation Rules).
 * Requirement IDs: TRUST-BADGE-001..014, OPS-ADMIN-022, ROLE-003, D-010; BP §55.2, §66.
 */

export type BadgeType =
  | 'VERIFIED'
  | 'HIGHLY_RATED'
  | 'EXPERIENCED'
  | 'CUSTOMER_FAVORITE'
  | 'FAST_RESPONSE'
  | 'FAST_SERVICE'
  | 'RELIABLE'
  | 'REPEAT_CUSTOMER_FAVORITE'
  | 'TOP_SPECIALIST'
  | 'RECENTLY_JOINED'
  | 'EMERGENCY_AVAILABLE'
  | 'AVAILABLE_TODAY'
  | 'AVAILABLE_NOW'
  | 'LARGE_TEAM';

export type BadgeKind = 'FACT' | 'RULE';

export type BadgeStatus = 'ACTIVE' | 'RECALCULATION_PENDING' | 'EXPIRED';

export interface BadgeDefinition {
  badgeType: BadgeType;
  kind: BadgeKind;
  nameEn: string;
  nameUr: string;
  descriptionEn: string;
  descriptionUr: string;
  explanationEn: string;
  explanationUr: string;
  iconName: string;
}

export interface ProviderBadgeItem {
  id: string;
  badgeType: BadgeType;
  kind: BadgeKind;
  nameEn: string;
  nameUr: string;
  descriptionEn: string;
  descriptionUr: string;
  serviceId?: string | null;
  effectiveFrom: string;
  expiresAt?: string | null;
  sourceMetrics: Record<string, unknown>;
}

export interface AdminBadgeRuleItem {
  badgeType: BadgeType;
  kind: BadgeKind;
  nameEn: string;
  nameUr: string;
  ruleMetricEn: string;
  ruleMetricUr: string;
  threshold: Record<string, unknown> | null;
  isSet: boolean;
  effectiveFrom?: string | null;
  activeHoldersCount: number;
}

export interface BadgeRulesConfig {
  HIGHLY_RATED?: {
    minRating: number;
    minReviews: number;
  } | null;
  EXPERIENCED?: {
    minCompletedJobs: number;
  } | null;
  CUSTOMER_FAVORITE?: {
    minFavorites: number;
    minCompletedJobs: number;
  } | null;
  FAST_RESPONSE?: {
    maxResponseMinutes: number;
  } | null;
  FAST_SERVICE?: {
    minOnTimePercent: number;
  } | null;
  RELIABLE?: {
    maxCancellationPercent: number;
    maxNoShows: number;
  } | null;
  REPEAT_CUSTOMER_FAVORITE?: {
    minRepeatRatePercent: number;
  } | null;
  TOP_SPECIALIST?: {
    topPercentile: number;
    minCompletedJobs: number;
  } | null;
  RECENTLY_JOINED?: {
    maxDaysSinceRegistration: number;
  } | null;
  LARGE_TEAM?: {
    minCrewSize: number;
  } | null;
}

export interface UpdateBadgeRuleDto {
  threshold: Record<string, unknown> | null;
  reason: string;
}

export interface RecalculateBadgesDto {
  providerProfileId?: string;
  reason: string;
}

export interface RecalculationSummary {
  recalculatedAt: string;
  providersEvaluated: number;
  badgesAwarded: number;
  badgesExpired: number;
}

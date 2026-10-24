/**
 * Matching Engine Types & DTOs (T3.7, owner A05; M8 Matching).
 * Requirement IDs: MATCH-ELIG-073..079, MATCH-SCORE-001..013, MATCH-FAIR-001..004,
 * MATCH-EXPL-001, MATCH-MODE-001, MATCH-GAP-001, OPS-ADMIN-021; BP §54, §61.3, §68; D-005, D-010, D-020
 */
import {
  AvailabilityCheck,
  EligibilityResult,
  RequestStatus,
  VerificationLevel,
} from '../../generated/prisma/client.js';

export { AvailabilityCheck, EligibilityResult, RequestStatus, VerificationLevel };

/** Hard eligibility rule failure codes (BP §54.1 rules 73–79; D-020). */
export const HardRuleCode = {
  RULE_73_SUSPENDED: 'RULE_73_SUSPENDED',
  RULE_74_NO_SKILL: 'RULE_74_NO_SKILL',
  RULE_75_OUT_OF_AREA: 'RULE_75_OUT_OF_AREA',
  RULE_76_UNAVAILABLE: 'RULE_76_UNAVAILABLE',
  RULE_77_VERIFICATION_LEVEL: 'RULE_77_VERIFICATION_LEVEL',
  RULE_78_CUSTOMER_BLOCKED: 'RULE_78_CUSTOMER_BLOCKED',
  RULE_79_CAPACITY_LIMIT: 'RULE_79_CAPACITY_LIMIT',
  UNPAID_COMMISSION: 'UNPAID_COMMISSION',
} as const;

export type HardRuleCode = (typeof HardRuleCode)[keyof typeof HardRuleCode];

/** Configurable weights for the 13 matching signals (BP §54.2; MATCH-SCORE-001..013; D-010). */
export interface MatchingWeights {
  distanceWeight: number; // 001
  availabilityWeight: number; // 002
  serviceMatchWeight: number; // 003
  preferencesWeight: number; // 004
  verificationWeight: number; // 005
  ratingWeight: number; // 006
  completedJobsWeight: number; // 007
  responseSpeedWeight: number; // 008
  cancellationHistoryWeight: number; // 009
  repeatCustomerWeight: number; // 010
  priceCompetitivenessWeight: number; // 011
  reliabilityWeight: number; // 012
  newProviderBoostWeight: number; // 013
}

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeights = {
  distanceWeight: 0.2, // kk-allow-literal: D-010
  availabilityWeight: 0.15, // kk-allow-literal: D-010
  serviceMatchWeight: 0.15, // kk-allow-literal: D-010
  preferencesWeight: 0.05, // kk-allow-literal: D-010
  verificationWeight: 0.1, // kk-allow-literal: D-010
  ratingWeight: 0.1, // kk-allow-literal: D-010
  completedJobsWeight: 0.05, // kk-allow-literal: D-010
  responseSpeedWeight: 0.05, // kk-allow-literal: D-010
  cancellationHistoryWeight: 0.05, // kk-allow-literal: D-010
  repeatCustomerWeight: 0.03, // kk-allow-literal: D-010
  priceCompetitivenessWeight: 0.02, // kk-allow-literal: D-010
  reliabilityWeight: 0.03, // kk-allow-literal: D-010
  newProviderBoostWeight: 0.02, // kk-allow-literal: D-010
};

/** Fairness configuration (BP §52.3, §54.2, §68; MATCH-FAIR-001..003). */
export interface MatchingFairnessConfig {
  newProviderBoostEnabled: boolean;
  newProviderMaxAgeDays: number;
  providerShownCapPercentage: number | null;
}

export const DEFAULT_FAIRNESS_CONFIG: MatchingFairnessConfig = {
  newProviderBoostEnabled: true,
  newProviderMaxAgeDays: 30, // kk-allow-literal: BP §52
  providerShownCapPercentage: 0.35, // kk-allow-literal: BP §52
};

/** Complete matching configuration. */
export interface MatchingConfig {
  rankingVersion: string;
  weights: MatchingWeights;
  fairness: MatchingFairnessConfig;
  updatedAt: Date;
}

/** Human-readable explanation reason (BP §54.3; MATCH-EXPL-001). */
export interface MatchReason {
  key: string;
  en: string;
  ur: string;
}

/** Card returned to the customer app for discovery & comparison (BP §55.1). */
export interface MatchCandidateCard {
  candidateId: string;
  providerProfileId: string;
  providerName: string;
  businessName: string | null;
  avatarMediaId: string | null;
  verificationLevel: VerificationLevel;
  distanceMeters: number | null;
  etaSeconds: number | null;
  ratingAverage: number | null;
  ratingCount: number;
  completedJobsCount: number;
  isExactServiceMatch: boolean;
  score: number;
  rank: number;
  badges: string[];
  matchReasons: MatchReason[];
}

/** Supply-gap recovery actions (BP §61.3; MATCH-GAP-001). */
export const SupplyGapAction = {
  BROADEN_RADIUS: 'BROADEN_RADIUS',
  CHOOSE_ANOTHER_TIME: 'CHOOSE_ANOTHER_TIME',
  REQUEST_CALLBACK: 'REQUEST_CALLBACK',
  JOIN_WAITLIST: 'JOIN_WAITLIST',
  TRY_RELATED_SERVICE: 'TRY_RELATED_SERVICE',
} as const;

export type SupplyGapAction = (typeof SupplyGapAction)[keyof typeof SupplyGapAction];

export interface SupplyGapRecoveryOption {
  action: SupplyGapAction;
  titleEn: string;
  titleUr: string;
  descriptionEn: string;
  descriptionUr: string;
  suggestedServiceId?: string | null;
}

export const STANDARD_SUPPLY_GAP_OPTIONS: SupplyGapRecoveryOption[] = [
  {
    action: SupplyGapAction.BROADEN_RADIUS,
    titleEn: 'Broaden search radius',
    titleUr: 'تلاش کا دائرہ وسیع کریں',
    descriptionEn: 'Look for qualified technicians in nearby neighborhoods',
    descriptionUr: 'قریبی علاقوں میں ماہرین تلاش کریں',
  },
  {
    action: SupplyGapAction.CHOOSE_ANOTHER_TIME,
    titleEn: 'Choose another time window',
    titleUr: 'کوئی دوسرا وقت منتخب کریں',
    descriptionEn: 'More technicians are available tomorrow morning or evening',
    descriptionUr: 'کل صبح یا شام کے لیے زیادہ ماہرین دستیاب ہیں',
  },
  {
    action: SupplyGapAction.REQUEST_CALLBACK,
    titleEn: 'Request a priority callback',
    titleUr: 'کال بیک کی درخواست کریں',
    descriptionEn: 'Our operations team will arrange a qualified technician for you',
    descriptionUr: 'ہماری ٹیم آپ کے لیے جلد از جلد ماہر کا انتظام کرے گی',
  },
  {
    action: SupplyGapAction.JOIN_WAITLIST,
    titleEn: 'Join waitlist',
    titleUr: 'ویٹ لسٹ میں شامل ہوں',
    descriptionEn: 'We will notify you immediately as soon as a provider becomes available',
    descriptionUr: 'جیسے ہی کوئی ماہر دستیاب ہوگا ہم آپ کو فوری اطلاع دیں گے',
  },
  {
    action: SupplyGapAction.TRY_RELATED_SERVICE,
    titleEn: 'Try related service',
    titleUr: 'متعلقہ سروس منتخب کریں',
    descriptionEn: 'View technicians providing general inspection and repair',
    descriptionUr: 'عام معائنہ اور مرمت کے ماہرین دیکھیں',
  },
];

/** Options passed when finding matches. */
export interface FindMatchesOptions {
  limit?: number;
  preferredVerificationOnly?: boolean;
  maxPriceMinor?: bigint | null;
}

/** Result of executing a matching run for a customer request. */
export interface MatchRunResult {
  requestId: string;
  rankingVersion: string;
  totalEvaluated: number;
  eligibleCount: number;
  isSupplyGap: boolean;
  candidates: MatchCandidateCard[];
  supplyGapOptions: SupplyGapRecoveryOption[];
}

/** Raw signal values for a candidate provider. */
export interface CandidateRawSignals {
  distanceMeters: number | null;
  etaSeconds: number | null;
  isAvailableInWindow: boolean;
  isExactServiceMatch: boolean;
  meetsCustomerPreferences: boolean;
  verificationLevel: VerificationLevel;
  ratingAverage: number | null;
  ratingCount: number;
  completedJobsCount: number;
  medianResponseSeconds: number | null;
  providerCancellationRate: number;
  repeatCustomerRate: number | null;
  repeatCustomerTotalJobs: number;
  priceMinor: bigint | null;
  categoryMedianPriceMinor: bigint | null;
  activeWarningCount: number;
  providerCreatedAt: Date;
}

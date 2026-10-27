/**
 * Type definitions and DTOs for Low-Rating Enforcement (Module M3/M12; owner A05).
 * Requirement IDs: RATING-ENF-001..008, MATCH-ELIG-073, ROLE-003, D-014, D-017; BP §19, §54.1 rule 73, §8.3; ARCH §6.7.
 */

import { RatingStanding } from '../../generated/prisma/client.js';

export { RatingStanding };

export type RatingEnforcementAction =
  | 'NO_ACTION'
  | 'WOULD_WARN_1'
  | 'WOULD_WARN_2'
  | 'WOULD_BLOCK'
  | 'WOULD_RECOVER'
  | 'WARN_1'
  | 'WARN_2'
  | 'BLOCKED'
  | 'RECOVERED';

export interface ProviderEnforcementEvaluation {
  providerProfileId: string;
  userId: string;
  currentStanding: RatingStanding;
  currentWarningCount: number;
  averageRating: number | null;
  ratingCount: number;
  blockThreshold: number;
  warningsBeforeBlock: number;
  isBelowThreshold: boolean;
  action: RatingEnforcementAction;
  reason?: string;
  isDryRun: boolean;
}

export interface RatingEnforcementReportDto {
  evaluatedAt: string;
  isDryRun: boolean;
  dryRunReason?: string;
  providersEvaluated: number;
  warningsIssued: number;
  providersBlocked: number;
  providersRecovered: number;
  evaluations: ProviderEnforcementEvaluation[];
}

export interface ReinstateProviderDto {
  reason: string;
}

export interface RatingStandingDetailsDto {
  providerProfileId: string;
  ratingStanding: RatingStanding;
  ratingWarningCount: number;
  maxWarnings: number;
  blockThreshold: number;
  averageRating: number | null;
  ratingCount: number;
  ratingStandingChangedAt: string | null;
  lastRatingCheckAt: string | null;
  warningNoticeEn: string | null;
  warningNoticeUr: string | null;
  isEligibleForMatching: boolean;
}

export interface RunEnforcementJobOptions {
  dryRun?: boolean;
  now?: Date;
}

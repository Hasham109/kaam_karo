/**
 * Matching Scorer — Multi-signal scoring engine with fairness and Bayesian smoothing (T3.7, owner A05).
 * Requirement IDs: MATCH-SCORE-001..013, MATCH-FAIR-001..003; BP §54.2; D-010.
 */
import {
  type CandidateRawSignals,
  type MatchingFairnessConfig,
  type MatchingWeights,
  VerificationLevel,
} from './matching.types.js';

export interface SignalScoreBreakdown {
  distanceScore: number;
  availabilityScore: number;
  serviceMatchScore: number;
  preferencesScore: number;
  verificationScore: number;
  ratingScore: number;
  completedJobsScore: number;
  responseSpeedScore: number;
  cancellationHistoryScore: number;
  repeatCustomerScore: number;
  priceCompetitivenessScore: number;
  reliabilityScore: number;
  newProviderBoostScore: number;
  totalScore: number;
}

export class MatchingScorer {
  /** Reference max urban travel radius in meters for distance normalization. */
  private static readonly MAX_URBAN_DISTANCE_METERS = 25000; // kk-allow-literal: technical — 25km urban reference

  /** Minimum job count for repeat customer rate to be statistically meaningful (BP §54.2). */
  private static readonly MIN_REPEAT_CUSTOMER_JOBS = 10; // kk-allow-literal: BP §54

  /**
   * Normalizes raw signals and computes weighted score (MATCH-SCORE-001..013).
   * Weight changes take effect immediately without code deployment (OPS-ADMIN-021).
   */
  static computeScore(
    signals: CandidateRawSignals,
    weights: MatchingWeights,
    fairness: MatchingFairnessConfig,
    now: Date = new Date(),
  ): SignalScoreBreakdown {
    // 1. Geographic closeness / ETA (MATCH-SCORE-001)
    const distanceScore = this.computeDistanceScore(signals.distanceMeters);

    // 2. Availability in requested window (MATCH-SCORE-002)
    const availabilityScore = signals.isAvailableInWindow ? 1.0 : 0.5; // kk-allow-literal: BP §54

    // 3. Exact service match vs related skill (MATCH-SCORE-003)
    const serviceMatchScore = signals.isExactServiceMatch ? 1.0 : 0.6; // kk-allow-literal: BP §54

    // 4. Customer preferences match (MATCH-SCORE-004)
    const preferencesScore = signals.meetsCustomerPreferences ? 1.0 : 0.4; // kk-allow-literal: BP §54

    // 5. Verification level (MATCH-SCORE-005)
    const verificationScore = this.computeVerificationScore(signals.verificationLevel);

    // 6. Rating quality and volume, combining average and count (MATCH-SCORE-006)
    const ratingScore = this.computeRatingScore(signals.ratingAverage, signals.ratingCount);

    // 7. Completed relevant jobs count (MATCH-SCORE-007)
    const completedJobsScore = Math.min(1.0, signals.completedJobsCount / 50.0); // kk-allow-literal: BP §54

    // 8. Response speed (MATCH-SCORE-008)
    const responseSpeedScore = this.computeResponseSpeedScore(signals.medianResponseSeconds);

    // 9. Cancellation / no-show history (MATCH-SCORE-009)
    const cancellationHistoryScore = Math.max(0.0, 1.0 - signals.providerCancellationRate);

    // 10. Repeat customer rate (MATCH-SCORE-010)
    const repeatCustomerScore = this.computeRepeatCustomerScore(
      signals.repeatCustomerRate,
      signals.repeatCustomerTotalJobs,
    );

    // 11. Price competitiveness vs category median (MATCH-SCORE-011)
    const priceCompetitivenessScore = this.computePriceScore(
      signals.priceMinor,
      signals.categoryMedianPriceMinor,
    );

    // 12. Reliability & active warnings standing (MATCH-SCORE-012)
    const reliabilityScore = this.computeReliabilityScore(signals.activeWarningCount);

    // 13. Fairness boost for newly approved providers (MATCH-SCORE-013, MATCH-FAIR-001)
    const newProviderBoostScore = this.computeNewProviderBoost(
      signals.providerCreatedAt,
      fairness,
      now,
    );

    // Combine with configurable weights (D-010)
    const totalScore =
      distanceScore * weights.distanceWeight +
      availabilityScore * weights.availabilityWeight +
      serviceMatchScore * weights.serviceMatchWeight +
      preferencesScore * weights.preferencesWeight +
      verificationScore * weights.verificationWeight +
      ratingScore * weights.ratingWeight +
      completedJobsScore * weights.completedJobsWeight +
      responseSpeedScore * weights.responseSpeedWeight +
      cancellationHistoryScore * weights.cancellationHistoryWeight +
      repeatCustomerScore * weights.repeatCustomerWeight +
      priceCompetitivenessScore * weights.priceCompetitivenessWeight +
      reliabilityScore * weights.reliabilityWeight +
      newProviderBoostScore * weights.newProviderBoostWeight;

    // Round to 6 decimal places for database precision
    const roundedTotal = Math.round(totalScore * 1000000) / 1000000; // kk-allow-literal: technical — 6 decimals

    return {
      distanceScore,
      availabilityScore,
      serviceMatchScore,
      preferencesScore,
      verificationScore,
      ratingScore,
      completedJobsScore,
      responseSpeedScore,
      cancellationHistoryScore,
      repeatCustomerScore,
      priceCompetitivenessScore,
      reliabilityScore,
      newProviderBoostScore,
      totalScore: roundedTotal,
    };
  }

  private static computeDistanceScore(distanceMeters: number | null): number {
    if (distanceMeters === null || distanceMeters < 0) return 0.0;
    if (distanceMeters === 0) return 1.0;
    return Math.max(0.0, 1.0 - distanceMeters / this.MAX_URBAN_DISTANCE_METERS);
  }

  private static computeVerificationScore(level: VerificationLevel): number {
    switch (level) {
      case VerificationLevel.SPECIALIZED_VERIFIED:
        return 1.0;
      case VerificationLevel.BUSINESS_VERIFIED:
        return 0.95; // kk-allow-literal: BP §54
      case VerificationLevel.VERIFIED:
        return 0.8; // kk-allow-literal: BP §54
      case VerificationLevel.BASIC:
      default:
        return 0.3; // kk-allow-literal: BP §54
    }
  }

  /**
   * Bayesian smoothing to ensure a 5.0 with 1 rating does not beat 4.8 with 240 ratings (MATCH-SCORE-006).
   */
  private static computeRatingScore(avg: number | null, count: number): number {
    if (avg === null || count === 0) {
      // Prior mean 4.0
      return 0.8; // kk-allow-literal: BP §54
    }
    const priorMean = 4.0; // kk-allow-literal: BP §54
    const priorWeight = 5; // kk-allow-literal: BP §54
    const smoothed = (avg * count + priorMean * priorWeight) / (count + priorWeight);
    return Math.min(1.0, Math.max(0.0, smoothed / 5.0)); // kk-allow-literal: technical — 5 star scale
  }

  private static computeResponseSpeedScore(medianSec: number | null): number {
    if (medianSec === null) return 0.5; // kk-allow-literal: BP §54
    if (medianSec <= 300) return 1.0; // kk-allow-literal: technical — 5 minutes
    if (medianSec <= 900) return 0.8; // kk-allow-literal: technical — 15 minutes
    if (medianSec <= 1800) return 0.6; // kk-allow-literal: technical — 30 minutes
    if (medianSec <= 3600) return 0.4; // kk-allow-literal: technical — 1 hour
    return 0.2; // kk-allow-literal: BP §54
  }

  private static computeRepeatCustomerScore(rate: number | null, totalJobs: number): number {
    if (totalJobs < this.MIN_REPEAT_CUSTOMER_JOBS || rate === null) {
      return 0.0; // Zero below config minimum sample size (BP §54.2)
    }
    return Math.min(1.0, Math.max(0.0, rate));
  }

  private static computePriceScore(price: bigint | null, median: bigint | null): number {
    if (price === null || median === null || median <= 0n) { // kk-allow-literal: technical — zero guard
      return 0.5; // kk-allow-literal: technical — neutral fallback
    }
    const priceNum = Number(price);
    const medianNum = Number(median);
    const ratio = priceNum / medianNum;
    if (ratio <= 0.8) return 1.0; // kk-allow-literal: BP §54
    if (ratio <= 1.0) return 0.8; // kk-allow-literal: BP §54
    if (ratio <= 1.2) return 0.6; // kk-allow-literal: BP §54
    if (ratio <= 1.5) return 0.4; // kk-allow-literal: BP §54
    return 0.2; // kk-allow-literal: BP §54
  }

  private static computeReliabilityScore(warningCount: number): number {
    if (warningCount <= 0) return 1.0;
    if (warningCount === 1) return 0.5; // kk-allow-literal: BP §54
    return 0.1; // kk-allow-literal: BP §54
  }

  private static computeNewProviderBoost(
    createdAt: Date,
    fairness: MatchingFairnessConfig,
    now: Date,
  ): number {
    if (!fairness.newProviderBoostEnabled) return 0.0;
    const MS_PER_DAY = 1000 * 60 * 60 * 24; // kk-allow-literal: technical — ms per day
    const ageDays = (now.getTime() - createdAt.getTime()) / MS_PER_DAY;
    if (ageDays <= fairness.newProviderMaxAgeDays) {
      return 1.0;
    }
    return 0.0;
  }
}

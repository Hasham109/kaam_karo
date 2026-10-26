/**
 * Canonical Rating Computation (BP §19; REV-006, RATING-ENF-002; D-014).
 * "The public rating uses one clear, consistent rule.
 *  The same function computes the rating for C11, matching and enforcement."
 */
import { ReviewModerationStatus } from '../../generated/prisma/client.js';

export interface RatingEligibleReview {
  rating: number;
  moderationStatus: ReviewModerationStatus;
}

export interface PublicRatingResult {
  averageRating: number | null;
  ratingCount: number;
}

/**
 * Computes public aggregated rating from reviews using the single canonical rule (REV-006):
 * - Only reviews with moderationStatus === VISIBLE count.
 * - Moderated-out (REMOVED), flagged, or pending reviews NEVER count (REV-005, RATING-ENF-002).
 * - If count === 0, returns averageRating: null, ratingCount: 0.
 * - If count > 0, average is arithmetic mean rounded to 1 decimal place.
 */
export function computePublicRating(reviews: readonly RatingEligibleReview[]): PublicRatingResult {
  const eligible = reviews.filter((r) => r.moderationStatus === ReviewModerationStatus.VISIBLE);
  const count = eligible.length;
  if (count === 0) {
    return {
      averageRating: null,
      ratingCount: 0,
    };
  }

  const sum = eligible.reduce((acc, r) => acc + r.rating, 0);
  const rawAvg = sum / count;
  const rounded = Math.round(rawAvg * 10) / 10;

  return {
    averageRating: rounded,
    ratingCount: count,
  };
}

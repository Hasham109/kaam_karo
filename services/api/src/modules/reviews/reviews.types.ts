/**
 * Reviews & Reputation Types and DTOs (BP §19, §25; REV-001..007, OPS-ADMIN-011).
 */
import { ReviewFlagStatus, ReviewModerationStatus } from '../../generated/prisma/client.js';

export const CONFIG_KEY_REVIEW_ELIGIBILITY_WINDOW_DAYS = 'reviews.eligibility_window_days';
export const CONFIG_KEY_REVIEW_MAX_TEXT_LENGTH = 'reviews.max_text_length';
export const DEFAULT_REVIEW_MAX_TEXT_LENGTH = 1000;

export interface SubmitReviewDto {
  bookingId: string;
  rating: number;
  tags?: string[];
  text?: string | null;
}

export interface ProviderReviewResponseDto {
  text: string;
}

export interface FlagReviewDto {
  reason: string;
}

export interface ModerationDecisionDto {
  action: 'HIDE' | 'KEEP';
  reason: string; // Mandatory audit reason (ROLE-003)
}

export interface ReviewResponseDto {
  id: string;
  bookingId: string;
  providerProfileId: string;
  customerProfileId: string;
  rating: number;
  tags: string[];
  text: string | null;
  moderationStatus: ReviewModerationStatus;
  providerResponse: string | null;
  providerRespondedAt: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewListItemDto {
  id: string;
  rating: number;
  tags: string[];
  text: string | null;
  customerName: string;
  providerResponse: string | null;
  providerRespondedAt: string | null;
  submittedAt: string;
}

export interface ProviderReviewsResponseDto {
  providerProfileId: string;
  ratingAverage: number | null;
  ratingCount: number;
  reviews: ReviewListItemDto[];
  total: number;
}

export interface ReviewFlagResponseDto {
  id: string;
  reviewId: string;
  flaggedByUserId: string;
  reason: string;
  status: ReviewFlagStatus;
  createdAt: string;
}

export interface ModerationQueueItemDto {
  flagId: string;
  reviewId: string;
  bookingId: string;
  rating: number;
  excerpt: string | null;
  authorName: string | null;
  authorMaskedPhone: string | null;
  reason: string;
  status: ReviewFlagStatus;
  flaggedAt: string;
  providerResponse: string | null;
}

export interface ModerationQueueResponseDto {
  items: ModerationQueueItemDto[];
  total: number;
}

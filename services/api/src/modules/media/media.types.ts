/**
 * Domain types and validations for Media Service (BP §20, §76; MEDIA-001..009).
 */
import {
  type MediaKind,
  type MediaPurpose,
  type MediaScanStatus,
  type MediaSensitivity,
  type MediaUploadStatus,
} from '../../generated/prisma/client.js';

export { MediaKind, MediaPurpose, MediaScanStatus, MediaSensitivity, MediaUploadStatus };

export const ALLOWED_MIME_TYPES: Readonly<Record<MediaKind, readonly string[]>> = {
  AUDIO: [
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
    'audio/wav',
    'audio/m4a',
    'audio/x-m4a',
  ],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp'],
  PHOTO: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  DOCUMENT: ['application/pdf', 'image/jpeg', 'image/png'],
};

/**
 * Maps purpose to sensitivity according to DB CHECK constraint (BP §29, §75 item 97; ABUSE-010).
 * CHECK: (purpose IN ('VERIFICATION_DOCUMENT', 'PAYMENT_PROOF')) <= (sensitivity = 'RESTRICTED')
 */
export function determineSensitivity(purpose: MediaPurpose): MediaSensitivity {
  if (purpose === 'VERIFICATION_DOCUMENT' || purpose === 'PAYMENT_PROOF') {
    return 'RESTRICTED';
  }
  return 'STANDARD';
}

/**
 * Validates whether the supplied MIME type is supported for the given media kind (CHAT-003, MEDIA-004).
 */
export function isMimeTypeAllowed(kind: MediaKind, mimeType: string): boolean {
  const allowed = ALLOWED_MIME_TYPES[kind];
  if (!allowed) return false;
  return allowed.includes(mimeType.toLowerCase());
}

/** Dev/test default limit fallback values (BP §76, D-011). */
export const DEV_TEST_LIMITS = {
  AUDIO_MAX_SECONDS: 120, // ≈ 2 minutes
  VIDEO_MAX_SECONDS: 30, // ≈ 30 seconds
  MAX_UPLOAD_BYTES: 26_214_400, // 25 MiB
  RETENTION_DAYS: 30, // 30 days
} as const;

export interface CreateUploadSessionDto {
  readonly ownerUserId: string;
  readonly kind: MediaKind;
  readonly purpose: MediaPurpose;
  readonly mimeType: string;
  readonly expectedSizeBytes?: number;
  readonly durationMs?: number;
}

export interface FinalizeUploadSessionDto {
  readonly actualSizeBytes: number;
  readonly durationMs?: number;
}

export interface RetentionJobResult {
  readonly scannedCount: number;
  readonly deletedCount: number;
  readonly dryRun: boolean;
}

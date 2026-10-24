/**
 * Storage interface for S3-compatible private object storage (D-001, INFRA-003).
 * Files are private by default; access is granted exclusively through signed, time-limited URLs.
 */

export interface SignedUrlOptions {
  readonly expiresInSeconds?: number;
  readonly contentType?: string;
}

export interface ObjectMetadata {
  readonly sizeBytes: number;
  readonly contentType: string;
  readonly lastModified: Date;
}

export interface StorageUploadResult {
  readonly uploadUrl: string;
  readonly storageKey: string;
  readonly expiresAt: Date;
}

export interface StorageDownloadResult {
  readonly downloadUrl: string;
  readonly expiresAt: Date;
}

export interface ObjectStorage {
  /**
   * Generates a signed, time-limited PUT URL for direct client upload (INFRA-003, MEDIA-009).
   */
  getSignedUploadUrl(storageKey: string, options?: SignedUrlOptions): Promise<StorageUploadResult>;

  /**
   * Generates a signed, time-limited GET URL for private media download (INFRA-003).
   */
  getSignedDownloadUrl(
    storageKey: string,
    options?: SignedUrlOptions,
  ): Promise<StorageDownloadResult>;

  /**
   * Uploads object directly (used for server-side thumbnail generation, tests, or migrations).
   */
  putObject(storageKey: string, data: Buffer, contentType?: string): Promise<void>;

  /**
   * Downloads raw object content (used for thumbnail creation, transcription, or verification).
   */
  getObject(storageKey: string): Promise<Buffer | null>;

  /**
   * Deletes object from storage (used by retention cleanup, MEDIA-007).
   */
  deleteObject(storageKey: string): Promise<void>;

  /**
   * Gets object metadata (size, content type) from storage.
   */
  headObject(storageKey: string): Promise<ObjectMetadata | null>;

  /**
   * Validates storage connectivity (used by health check, REL-011).
   */
  checkHealth(): Promise<'ok' | 'degraded' | 'down'>;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

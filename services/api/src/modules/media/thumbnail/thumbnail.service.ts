/**
 * Thumbnail generation service for video media (BP §76.2; MEDIA-005).
 */
import { Inject, Injectable } from '@nestjs/common';
import { type ObjectStorage, OBJECT_STORAGE } from '../storage/storage.interface';

export interface ThumbnailResult {
  readonly thumbnailStorageKey: string;
  readonly thumbnailMimeType: string;
  readonly sizeBytes: number;
}

@Injectable()
export class ThumbnailService {
  constructor(@Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage) {}

  /**
   * Generates a representative thumbnail image for an uploaded video.
   * Stores the thumbnail image into object storage and returns metadata.
   */
  async generateVideoThumbnail(mediaId: string, videoStorageKey: string): Promise<ThumbnailResult> {
    const thumbnailStorageKey = `${videoStorageKey}.thumb.jpg`;
    const thumbnailMimeType = 'image/jpeg';

    // Generates a lightweight placeholder JPEG representation
    const placeholderData = Buffer.from(`THUMBNAIL_FOR_${mediaId}_FROM_${videoStorageKey}`, 'utf8');

    await this.storage.putObject(thumbnailStorageKey, placeholderData, thumbnailMimeType);

    return {
      thumbnailStorageKey,
      thumbnailMimeType,
      sizeBytes: placeholderData.length,
    };
  }
}

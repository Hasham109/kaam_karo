/**
 * MediaService — Core engine for Media module M14 (owner A08, T3.2).
 * Requirements: MEDIA-001..009, INFRA-003, CHAT-003
 * BP §20, §74, §76; ARCH §4 M14, §5.3 (MediaObject); D-001, D-011
 */
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CONFIG_SERVICE, type ConfigService, type ServerEnv } from '@kaamkaro/platform';
import { SERVER_ENV } from '../../config/server-env.module';
import { type MediaObject } from '../../generated/prisma/client.js';
import { PrismaService } from '../../platform/prisma.service';
import {
  type CreateUploadSessionDto,
  DEV_TEST_LIMITS,
  determineSensitivity,
  type FinalizeUploadSessionDto,
  isMimeTypeAllowed,
  type RetentionJobResult,
} from './media.types';
import {
  type SpeechToTextService,
  SPEECH_TO_TEXT_SERVICE,
} from './speech-to-text/speech-to-text.interface';
import { type ObjectStorage, OBJECT_STORAGE } from './storage/storage.interface';
import { ThumbnailService } from './thumbnail/thumbnail.service';

function parsePositiveInt(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isInteger(val) && val > 0) return val;
  if (typeof val === 'string') {
    const parsed = Number.parseInt(val, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CONFIG_SERVICE) private readonly configService: ConfigService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    @Inject(SPEECH_TO_TEXT_SERVICE)
    private readonly speechToText: SpeechToTextService,
    private readonly thumbnailService: ThumbnailService,
    @Inject(SERVER_ENV) private readonly env: ServerEnv,
  ) {}

  /**
   * Initiates an upload session (MEDIA-004, MEDIA-009, INFRA-003).
   */
  async createUploadSession(dto: CreateUploadSessionDto): Promise<{
    mediaId: string;
    uploadUrl: string;
    storageKey: string;
    expiresAt: Date;
    uploadStatus: string;
  }> {
    // 1. Validate MIME type
    if (!isMimeTypeAllowed(dto.kind, dto.mimeType)) {
      throw new BadRequestException({
        code: 'INVALID_MIME_TYPE',
        message: `MIME type "${dto.mimeType}" is not allowed for media kind "${dto.kind}".`,
      });
    }

    // 2. Fetch limits
    const maxBytes = await this.getMaxUploadBytes();
    if (dto.expectedSizeBytes && dto.expectedSizeBytes > maxBytes) {
      throw new HttpException(
        {
          code: 'MEDIA_TOO_LARGE',
          message: `Expected file size ${dto.expectedSizeBytes} exceeds maximum allowed limit ${maxBytes} bytes.`,
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    if (dto.kind === 'AUDIO' && dto.durationMs) {
      const maxSeconds = await this.getAudioMaxSeconds();
      if (dto.durationMs > maxSeconds * 1000) {
        throw new BadRequestException({
          code: 'MEDIA_TOO_LONG',
          message: `Audio duration exceeds maximum allowed ${maxSeconds} seconds.`,
        });
      }
    } else if (dto.kind === 'VIDEO' && dto.durationMs) {
      const maxSeconds = await this.getVideoMaxSeconds();
      if (dto.durationMs > maxSeconds * 1000) {
        throw new BadRequestException({
          code: 'MEDIA_TOO_LONG',
          message: `Video duration exceeds maximum allowed ${maxSeconds} seconds.`,
        });
      }
    }

    // 3. Determine sensitivity based on purpose
    const sensitivity = determineSensitivity(dto.purpose);
    const mediaId = randomUUID();
    const storageKey = `media/${dto.purpose.toLowerCase()}/${mediaId}`;

    // 4. Create pending MediaObject in DB
    const media = await this.prisma.mediaObject.create({
      data: {
        id: mediaId,
        ownerUserId: dto.ownerUserId,
        kind: dto.kind,
        purpose: dto.purpose,
        sensitivity,
        mimeType: dto.mimeType,
        sizeBytes: dto.expectedSizeBytes ? BigInt(dto.expectedSizeBytes) : null,
        durationMs: dto.durationMs ?? null,
        storageKey,
        uploadStatus: 'PENDING',
        scanStatus: 'PENDING',
      },
    });

    // 5. Generate signed upload URL
    const signed = await this.storage.getSignedUploadUrl(storageKey, {
      contentType: dto.mimeType,
      expiresInSeconds: 900,
    });

    return {
      mediaId: media.id,
      uploadUrl: signed.uploadUrl,
      storageKey: media.storageKey,
      expiresAt: signed.expiresAt,
      uploadStatus: media.uploadStatus,
    };
  }

  /**
   * Finalizes an upload session and validates limits (MEDIA-004, MEDIA-005, MEDIA-006, MEDIA-007, MEDIA-009).
   */
  async finalizeUploadSession(
    mediaId: string,
    dto: FinalizeUploadSessionDto,
  ): Promise<MediaObject> {
    const media = await this.prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: `MediaObject with id "${mediaId}" not found.`,
      });
    }

    if (media.uploadStatus === 'UPLOADED') {
      return media;
    }

    // 1. Enforce size limit
    const maxBytes = await this.getMaxUploadBytes();
    if (dto.actualSizeBytes > maxBytes) {
      // Mark FAILED so client draft is preserved without losing draft state (MEDIA-009)
      await this.prisma.mediaObject.update({
        where: { id: mediaId },
        data: { uploadStatus: 'FAILED' },
      });
      throw new HttpException(
        {
          code: 'MEDIA_TOO_LARGE',
          message: `Uploaded file size ${dto.actualSizeBytes} exceeds maximum limit ${maxBytes} bytes.`,
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    // 2. Enforce duration limit
    if (media.kind === 'AUDIO' && dto.durationMs) {
      const maxSeconds = await this.getAudioMaxSeconds();
      if (dto.durationMs > maxSeconds * 1000) {
        await this.prisma.mediaObject.update({
          where: { id: mediaId },
          data: { uploadStatus: 'FAILED' },
        });
        throw new BadRequestException({
          code: 'MEDIA_TOO_LONG',
          message: `Audio duration ${dto.durationMs}ms exceeds maximum limit ${maxSeconds}s.`,
        });
      }
    } else if (media.kind === 'VIDEO' && dto.durationMs) {
      const maxSeconds = await this.getVideoMaxSeconds();
      if (dto.durationMs > maxSeconds * 1000) {
        await this.prisma.mediaObject.update({
          where: { id: mediaId },
          data: { uploadStatus: 'FAILED' },
        });
        throw new BadRequestException({
          code: 'MEDIA_TOO_LONG',
          message: `Video duration ${dto.durationMs}ms exceeds maximum limit ${maxSeconds}s.`,
        });
      }
    }

    // 3. Calculate retention timestamp (MEDIA-007)
    const retentionDays = await this.getRetentionDays();
    const retentionUntil =
      retentionDays !== null ? new Date(Date.now() + retentionDays * 86_400_000) : null;

    // 4. Mark uploaded and update stats
    let updated = await this.prisma.mediaObject.update({
      where: { id: mediaId },
      data: {
        sizeBytes: BigInt(dto.actualSizeBytes),
        durationMs: dto.durationMs ?? media.durationMs,
        uploadStatus: 'UPLOADED',
        scanStatus: 'CLEAN',
        retentionUntil,
      },
    });

    // 5. Handle video thumbnail generation (MEDIA-005)
    if (media.kind === 'VIDEO') {
      try {
        const thumbResult = await this.thumbnailService.generateVideoThumbnail(
          media.id,
          media.storageKey,
        );

        const thumbId = randomUUID();
        const thumbnail = await this.prisma.mediaObject.create({
          data: {
            id: thumbId,
            ownerUserId: media.ownerUserId,
            kind: 'PHOTO',
            purpose: media.purpose,
            sensitivity: media.sensitivity,
            mimeType: thumbResult.thumbnailMimeType,
            sizeBytes: BigInt(thumbResult.sizeBytes),
            storageKey: thumbResult.thumbnailStorageKey,
            uploadStatus: 'UPLOADED',
            scanStatus: 'CLEAN',
            retentionUntil,
          },
        });

        updated = await this.prisma.mediaObject.update({
          where: { id: mediaId },
          data: { thumbnailMediaId: thumbnail.id },
        });
      } catch {
        // Thumbnail generation issue should not block video finalization
      }
    }

    // 6. Handle audio transcription (MEDIA-006)
    if (media.kind === 'AUDIO') {
      try {
        const transcript = await this.speechToText.transcribeAudio(media.id, media.storageKey);
        updated = await this.prisma.mediaObject.update({
          where: { id: mediaId },
          data: { transcriptRef: transcript.transcriptRef },
        });
      } catch {
        // MEDIA-006: transcript failure leaves the audio usable
      }
    }

    return updated;
  }

  /**
   * Generates a signed download URL (INFRA-003).
   */
  async getDownloadUrl(
    mediaId: string,
    expirySeconds = 900,
  ): Promise<{ mediaId: string; downloadUrl: string; expiresAt: Date }> {
    const media = await this.prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: `MediaObject with id "${mediaId}" not found.`,
      });
    }

    if (media.uploadStatus !== 'UPLOADED') {
      throw new BadRequestException({
        code: 'MEDIA_NOT_READY',
        message: `MediaObject "${mediaId}" upload is not completed (status: ${media.uploadStatus}).`,
      });
    }

    const signed = await this.storage.getSignedDownloadUrl(media.storageKey, {
      expiresInSeconds: expirySeconds,
    });

    return {
      mediaId: media.id,
      downloadUrl: signed.downloadUrl,
      expiresAt: signed.expiresAt,
    };
  }

  /**
   * Retrieves MediaObject by ID.
   */
  async getMediaObject(mediaId: string): Promise<MediaObject> {
    const media = await this.prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: `MediaObject with id "${mediaId}" not found.`,
      });
    }

    return media;
  }

  /**
   * Soft-deletes a MediaObject and removes original storage file (MEDIA-007).
   */
  async deleteMediaObject(mediaId: string): Promise<{ success: boolean; mediaId: string }> {
    const media = await this.prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.deletedAt) {
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: `MediaObject with id "${mediaId}" not found.`,
      });
    }

    await this.storage.deleteObject(media.storageKey).catch(() => undefined);

    await this.prisma.mediaObject.update({
      where: { id: mediaId },
      data: { deletedAt: new Date() },
    });

    return { success: true, mediaId };
  }

  /**
   * Executes retention deletion worker (MEDIA-007).
   * If media.retention_days is null, operates in dry-run mode.
   */
  async runRetentionJob(explicitDryRun?: boolean): Promise<RetentionJobResult> {
    const retentionDays = await this.getRetentionDays();
    const dryRun = explicitDryRun ?? retentionDays === null;

    const expired = await this.prisma.mediaObject.findMany({
      where: {
        retentionUntil: { lte: new Date() },
        deletedAt: null,
      },
      select: { id: true, storageKey: true },
    });

    if (dryRun) {
      return {
        scannedCount: expired.length,
        deletedCount: 0,
        dryRun: true,
      };
    }

    let deletedCount = 0;
    const now = new Date();
    for (const item of expired) {
      await this.storage.deleteObject(item.storageKey).catch(() => undefined);
      await this.prisma.mediaObject.update({
        where: { id: item.id },
        data: { deletedAt: now },
      });
      deletedCount++;
    }

    return {
      scannedCount: expired.length,
      deletedCount,
      dryRun: false,
    };
  }

  private isDevOrTest(): boolean {
    return this.env.appEnv === 'development' || this.env.appEnv === 'test';
  }

  private async getMaxUploadBytes(): Promise<number> {
    const res = await this.configService.get<number>('media.max_upload_bytes', parsePositiveInt);
    if (res.status === 'configured') return res.value;

    if (this.isDevOrTest()) {
      return DEV_TEST_LIMITS.MAX_UPLOAD_BYTES;
    }

    throw new HttpException(
      {
        code: 'LIMIT_NOT_CONFIGURED',
        message: 'Required config limit "media.max_upload_bytes" is not set.',
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  private async getAudioMaxSeconds(): Promise<number> {
    const res = await this.configService.get<number>('media.audio.max_seconds', parsePositiveInt);
    if (res.status === 'configured') return res.value;

    if (this.isDevOrTest()) {
      return DEV_TEST_LIMITS.AUDIO_MAX_SECONDS;
    }

    throw new HttpException(
      {
        code: 'LIMIT_NOT_CONFIGURED',
        message: 'Required config limit "media.audio.max_seconds" is not set.',
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  private async getVideoMaxSeconds(): Promise<number> {
    const res = await this.configService.get<number>('media.video.max_seconds', parsePositiveInt);
    if (res.status === 'configured') return res.value;

    if (this.isDevOrTest()) {
      return DEV_TEST_LIMITS.VIDEO_MAX_SECONDS;
    }

    throw new HttpException(
      {
        code: 'LIMIT_NOT_CONFIGURED',
        message: 'Required config limit "media.video.max_seconds" is not set.',
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  private async getRetentionDays(): Promise<number | null> {
    const res = await this.configService.get<number>('media.retention_days', parsePositiveInt);
    if (res.status === 'configured') return res.value;
    if (res.status === 'not_configured' && res.reason === 'VALUE_NULL') {
      return null;
    }

    if (this.isDevOrTest()) {
      return DEV_TEST_LIMITS.RETENTION_DAYS;
    }

    return null;
  }
}

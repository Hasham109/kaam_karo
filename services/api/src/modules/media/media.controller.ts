/**
 * MediaController (T3.2, owner A08; M14 Media).
 * Requirements: MEDIA-001..009, INFRA-003, CHAT-003
 * BP §20, §74, §76; ARCH §4 M14, §5.3
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Public } from '../identity';
import { MediaService } from './media.service';
import type { CreateUploadSessionDto, FinalizeUploadSessionDto } from './media.types';

@Controller(['v1/media', 'media'])
@UseGuards(AuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Initiates an upload session (MEDIA-004, MEDIA-009, INFRA-003).
   */
  @Public()
  @Post('upload-session')
  @HttpCode(HttpStatus.CREATED)
  async createUploadSession(@Body() body: CreateUploadSessionDto) {
    return this.mediaService.createUploadSession(body);
  }

  /**
   * Finalizes an upload session and validates limits (MEDIA-004, MEDIA-005, MEDIA-006, MEDIA-007, MEDIA-009).
   */
  @Public()
  @Post('upload-session/:id/finalize')
  @HttpCode(HttpStatus.OK)
  async finalizeUploadSession(@Param('id') id: string, @Body() body: FinalizeUploadSessionDto) {
    const media = await this.mediaService.finalizeUploadSession(id, body);
    return {
      media: {
        ...media,
        sizeBytes: media.sizeBytes ? Number(media.sizeBytes) : null,
      },
    };
  }

  /**
   * Generates a signed, time-limited download URL (INFRA-003).
   */
  @Public()
  @Get(':id/download-url')
  @HttpCode(HttpStatus.OK)
  async getDownloadUrl(@Param('id') id: string, @Query('expirySeconds') expirySeconds?: string) {
    const parsed = expirySeconds ? Number.parseInt(expirySeconds, 10) : undefined;
    return this.mediaService.getDownloadUrl(id, parsed);
  }

  /**
   * Retrieves media object metadata.
   */
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getMediaObject(@Param('id') id: string) {
    const media = await this.mediaService.getMediaObject(id);
    return {
      media: {
        ...media,
        sizeBytes: media.sizeBytes ? Number(media.sizeBytes) : null,
      },
    };
  }

  /**
   * Deletes a media object (MEDIA-007).
   */
  @Public()
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteMediaObject(@Param('id') id: string) {
    return this.mediaService.deleteMediaObject(id);
  }

  /**
   * Triggers the retention cleanup worker (MEDIA-007).
   */
  @Public()
  @Post('retention/run')
  @HttpCode(HttpStatus.OK)
  async runRetentionJob(@Body() body?: { dryRun?: boolean }) {
    return this.mediaService.runRetentionJob(body?.dryRun);
  }
}

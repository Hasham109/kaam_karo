/**
 * NotificationsController — REST endpoints for Notifications inbox and preferences (T7.1; owner A10).
 * Requirement IDs: NOTIF-001, NOTIF-009.
 * ARCH §4 M15, §7; BP §24, §80, §84 item 116.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../identity/index.js';
import { NotificationsService } from './notifications.service.js';
import type {
  NotificationCategory,
  NotificationItemDto,
  NotificationPreferencesResponseDto,
  NotificationsListResponseDto,
} from './notifications.types.js';

export interface UpdatePreferencesBody {
  readonly categories: readonly {
    readonly category: NotificationCategory;
    readonly enabled: boolean;
  }[];
}

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  async listNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: 'all' | 'unread' | 'read',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<NotificationsListResponseDto> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? Number.parseInt(offset, 10) : undefined;
    return this.service.getInbox(req.user.id, {
      ...(status !== undefined && { status }),
      ...(parsedLimit !== undefined && { limit: parsedLimit }),
      ...(parsedOffset !== undefined && { offset: parsedOffset }),
    });
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllNotificationsRead(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ markedCount: number }> {
    return this.service.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markNotificationRead(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<NotificationItemDto> {
    return this.service.markRead(req.user.id, id);
  }

  @Get('preferences')
  async getPreferences(
    @Req() req: AuthenticatedRequest,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.service.getPreferences(req.user.id);
  }

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdatePreferencesBody,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.service.updatePreferences(req.user.id, body.categories ?? []);
  }
}

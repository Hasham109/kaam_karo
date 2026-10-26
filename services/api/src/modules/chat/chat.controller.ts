/**
 * ChatController — REST endpoints for Chat, Masked Calling, and Sharing (owner A10, T7.2).
 * Requirements: CHAT-001, CHAT-002, CHAT-003, SHARE-001..003.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type AuthenticatedRequest, AuthGuard } from '../identity/guards/auth.guard';
import { ChatService } from './chat.service';
import type {
  CallRelaySessionDto,
  ConversationDetail,
  MessageItem,
  SendMessageDto,
  SharePayloadDto,
} from './chat.types';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('bookings/:bookingId/conversation')
  async getConversation(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConversationDetail> {
    return this.chatService.getOrCreateConversation(bookingId, req.user);
  }

  @Get('bookings/:bookingId/messages')
  async listMessages(
    @Param('bookingId') bookingId: string,
    @Query('limit') limitStr: string | undefined,
    @Query('before') before: string | undefined,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ conversationId: string; items: MessageItem[]; hasMore: boolean }> {
    const limit = limitStr ? Number.parseInt(limitStr, 10) : undefined;
    return this.chatService.listMessages(bookingId, req.user, {
      ...(limit !== undefined && !Number.isNaN(limit) && { limit }),
      ...(before !== undefined && { before }),
    });
  }

  @Post('bookings/:bookingId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('bookingId') bookingId: string,
    @Body() dto: SendMessageDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MessageItem> {
    return this.chatService.sendMessage(bookingId, req.user, dto);
  }

  @Post('bookings/:bookingId/call-relay')
  @HttpCode(HttpStatus.CREATED)
  async initiateCallRelay(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<CallRelaySessionDto> {
    const session = await this.chatService.initiateCallRelay(bookingId, req.user);
    return {
      sessionId: session.sessionId,
      virtualRelayNumber: session.virtualRelayNumber,
      displayRelayNumber: session.displayRelayNumber,
      expiresAt: session.expiresAt.toISOString(),
      callerRole: session.callerRole,
    };
  }

  @Get('share/booking/:bookingId')
  async getBookingSharePayload(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<SharePayloadDto> {
    return this.chatService.buildBookingSharePayload(bookingId, req.user);
  }

  @Get('share/profile/:providerProfileId')
  async getProviderProfileSharePayload(
    @Param('providerProfileId') providerProfileId: string,
  ): Promise<SharePayloadDto> {
    return this.chatService.buildProviderProfileSharePayload(providerProfileId);
  }
}

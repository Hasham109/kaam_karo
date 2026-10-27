/**
 * ChatService — Core engine for Communication & Chat module M13 (owner A10, T7.2).
 * Requirements: CHAT-001, CHAT-002, CHAT-003, CHAT-004, SHARE-001..003.
 * ARCH §4 M13; BP §20, §25, §74, §82; D-009, D-011.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CONFIG_SERVICE, type ConfigService } from '@kaamkaro/platform';
import {
  ActorRole,
  BookingStatus,
  MessageModerationStatus,
  UserRoleType,
} from '../../generated/prisma/client.js';
import { OutboxWriter } from '../../platform/outbox.writer';
import { PrismaService } from '../../platform/prisma.service';

function parsePositiveInt(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isInteger(val) && val > 0) return val;
  if (typeof val === 'string') {
    const parsed = Number.parseInt(val, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}
import type { RequestUser } from '../identity/index.js';
import {
  type CallRelayService,
  CALL_RELAY_SERVICE,
  type RelaySession,
} from './call-relay/call-relay.interface';
import {
  CHAT_ALLOWED_MIME_TYPES,
  DEFAULT_MAX_CHAT_ATTACHMENT_BYTES,
  type ListMessagesQueryDto,
  maskPhoneNumbersInText,
  type MessageItem,
  type SendMessageDto,
  type SharePayloadDto,
} from './chat.types';

// Offensive/spam trigger list for simple moderation rules (ABUSE-006, ABUSE-008)
const BLOCKED_WORDS = ['scam', 'fraud', 'abusive_word_test', 'hate_speech'];

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxWriter: OutboxWriter,
    @Inject(CALL_RELAY_SERVICE) private readonly callRelay: CallRelayService,
    @Inject(CONFIG_SERVICE) private readonly configService: ConfigService,
  ) {}

  /**
   * Validates that the caller is a legitimate participant in the booking (CHAT-001, BP §20).
   * Only the booking's customer, assigned provider, or admin can participate.
   */
  async validateBookingParticipant(
    bookingId: string,
    caller: RequestUser,
  ): Promise<{
    booking: {
      id: string;
      bookingNumber: string;
      status: BookingStatus;
      customerProfileId: string;
      providerProfileId: string | null;
      serviceId: string;
      locationSnapshotId: string | null;
    };
    callerRole: ActorRole;
    customerUserId: string;
    providerUserId: string | null;
    otherPartyUserId: string | null;
  }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        customerProfileId: true,
        providerProfileId: true,
        serviceId: true,
        locationSnapshotId: true,
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking ${bookingId} not found`,
      });
    }

    const customerProfile = await this.prisma.customerProfile.findUnique({
      where: { id: booking.customerProfileId },
      select: { userId: true },
    });

    if (!customerProfile) {
      throw new NotFoundException({
        code: 'CUSTOMER_PROFILE_NOT_FOUND',
        message: 'Customer profile not found',
      });
    }

    let providerUserId: string | null = null;
    if (booking.providerProfileId) {
      const providerProfile = await this.prisma.providerProfile.findUnique({
        where: { id: booking.providerProfileId },
        select: { userId: true },
      });
      providerUserId = providerProfile?.userId ?? null;
    }

    const isAdmin = caller.roles?.includes(UserRoleType.ADMIN);
    const isCustomer = caller.id === customerProfile.userId;
    const isProvider = providerUserId !== null && caller.id === providerUserId;

    if (!isCustomer && !isProvider && !isAdmin) {
      throw new ForbiddenException({
        code: 'NOT_BOOKING_PARTICIPANT',
        message: 'You are not an authorized participant in this booking conversation (CHAT-001)',
      });
    }

    let callerRole: ActorRole = ActorRole.CUSTOMER;
    let otherPartyUserId: string | null = null;

    if (isCustomer) {
      callerRole = ActorRole.CUSTOMER;
      otherPartyUserId = providerUserId;
    } else if (isProvider) {
      callerRole = ActorRole.PROVIDER;
      otherPartyUserId = customerProfile.userId;
    } else if (isAdmin) {
      callerRole = ActorRole.ADMIN;
      otherPartyUserId = null;
    }

    return {
      booking,
      callerRole,
      customerUserId: customerProfile.userId,
      providerUserId,
      otherPartyUserId,
    };
  }

  /**
   * Retrieves or creates a conversation bound to the booking (CHAT-001, BP §25).
   */
  async getOrCreateConversation(
    bookingId: string,
    caller: RequestUser,
  ): Promise<{ id: string; bookingId: string; createdAt: Date }> {
    await this.validateBookingParticipant(bookingId, caller);

    let conversation = await this.prisma.conversation.findUnique({
      where: { bookingId },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: { bookingId },
      });
    }

    return {
      id: conversation.id,
      bookingId: conversation.bookingId,
      createdAt: conversation.createdAt,
    };
  }

  /**
   * Lists messages in a conversation. Masks sensitive patterns server-side for admin audit (BP §20, CHAT-001).
   */
  async listMessages(
    bookingId: string,
    caller: RequestUser,
    query: ListMessagesQueryDto,
  ): Promise<{ conversationId: string; items: MessageItem[]; hasMore: boolean }> {
    const { callerRole } = await this.validateBookingParticipant(bookingId, caller);

    const conversation = await this.prisma.conversation.findUnique({
      where: { bookingId },
    });

    if (!conversation) {
      return { conversationId: '', items: [], hasMore: false };
    }

    const limit = Math.min(query.limit ?? 50, 100);

    const rows = await this.prisma.message.findMany({
      where: {
        conversationId: conversation.id,
        ...(query.before ? { sentAt: { lt: new Date(query.before) } } : {}),
      },
      orderBy: { sentAt: 'asc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map((m) => {
      // In admin view, mask free-text phone numbers server-side (admin.md §1.6; BP §20)
      const body =
        callerRole === ActorRole.ADMIN && m.body ? maskPhoneNumbersInText(m.body) : m.body;

      return {
        id: m.id,
        conversationId: m.conversationId,
        senderUserId: m.senderUserId,
        senderRole: m.senderRole,
        body,
        attachmentMediaId: m.attachmentMediaId,
        moderationStatus: m.moderationStatus,
        sentAt: m.sentAt,
      };
    });

    return {
      conversationId: conversation.id,
      items,
      hasMore,
    };
  }

  /**
   * Sends a message with attachment validation and emits outbox domain event (CHAT-001, CHAT-003, NOTIF-007).
   */
  async sendMessage(
    bookingId: string,
    caller: RequestUser,
    dto: SendMessageDto,
  ): Promise<MessageItem> {
    const { booking, callerRole, otherPartyUserId, customerUserId, providerUserId } =
      await this.validateBookingParticipant(bookingId, caller);

    const trimmedBody = dto.body?.trim();
    if (!trimmedBody && !dto.attachmentMediaId) {
      throw new BadRequestException({
        code: 'EMPTY_MESSAGE',
        message: 'Message body or attachment required',
      });
    }

    if (dto.attachmentMediaId) {
      await this.validateAttachment(dto.attachmentMediaId);
    }

    const conversation = await this.getOrCreateConversation(bookingId, caller);

    // Content moderation check (ABUSE-006, ABUSE-008, REQ-AI-009)
    let moderationStatus: MessageModerationStatus = MessageModerationStatus.DELIVERED;
    if (trimmedBody) {
      const lower = trimmedBody.toLowerCase();
      if (BLOCKED_WORDS.some((word) => lower.includes(word))) {
        moderationStatus = MessageModerationStatus.BLOCKED;
      }
    }

    // Persist message and outbox event in an atomic transaction
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: conversation.id,
          senderUserId: caller.id,
          senderRole: callerRole,
          body: trimmedBody ?? null,
          attachmentMediaId: dto.attachmentMediaId ?? null,
          moderationStatus,
        },
      });

      if (moderationStatus === MessageModerationStatus.DELIVERED && otherPartyUserId) {
        const preview = trimmedBody ? maskPhoneNumbersInText(trimmedBody.slice(0, 100)) : 'File';

        const senderName = callerRole === ActorRole.CUSTOMER ? 'Customer' : 'Partner';

        // Prepare payload structured for NotificationsService template resolution
        const payload: Record<string, unknown> = {
          bookingId: booking.id,
          bookingReference: booking.bookingNumber,
          conversationId: conversation.id,
          messageId: created.id,
          senderUserId: caller.id,
          senderName,
          messagePreview: preview,
          sentAt: created.sentAt.toISOString(),
        };

        if (callerRole === ActorRole.CUSTOMER) {
          payload.customerUserId = customerUserId;
          payload.providerUserId = otherPartyUserId;
        } else {
          payload.providerUserId = providerUserId;
          payload.customerUserId = otherPartyUserId;
        }

        await this.outboxWriter.append(tx, {
          eventType: 'message.new',
          aggregateType: 'conversation',
          aggregateId: conversation.id,
          schemaVersion: 1,
          payload,
        });
      }

      return created;
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderUserId: message.senderUserId,
      senderRole: message.senderRole,
      body: message.body,
      attachmentMediaId: message.attachmentMediaId,
      moderationStatus: message.moderationStatus,
      sentAt: message.sentAt,
    };
  }

  /**
   * Validates attachment against type and size limits from config (CHAT-003, D-011).
   */
  private async validateAttachment(mediaId: string): Promise<void> {
    const media = await this.prisma.mediaObject.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new BadRequestException({
        code: 'ATTACHMENT_NOT_FOUND',
        message: `Attachment media ${mediaId} not found`,
      });
    }

    if (!CHAT_ALLOWED_MIME_TYPES.has(media.mimeType)) {
      throw new BadRequestException({
        code: 'ATTACHMENT_TYPE_NOT_ALLOWED',
        message: `Attachment mime type ${media.mimeType} is not permitted for chat attachments (CHAT-003)`,
      });
    }

    const configLimit = await this.configService.get<number>(
      'media.chat.max_bytes',
      parsePositiveInt,
    );
    const maxBytes =
      configLimit.status === 'configured' && typeof configLimit.value === 'number'
        ? configLimit.value
        : DEFAULT_MAX_CHAT_ATTACHMENT_BYTES;

    if (media.sizeBytes !== null && media.sizeBytes > maxBytes) {
      throw new BadRequestException({
        code: 'ATTACHMENT_TOO_LARGE',
        message: `Attachment size ${media.sizeBytes} bytes exceeds maximum allowed limit of ${maxBytes} bytes (CHAT-003, D-011)`,
      });
    }
  }

  /**
   * Initiates a masked call relay session (CHAT-002, BP §20, §74; D-009).
   * Available strictly on active matched bookings.
   * Returns a virtual relay number without leaking raw personal phone numbers.
   */
  async initiateCallRelay(bookingId: string, caller: RequestUser): Promise<RelaySession> {
    const { booking, callerRole, customerUserId, providerUserId } =
      await this.validateBookingParticipant(bookingId, caller);

    if (!providerUserId) {
      throw new ConflictException({
        code: 'PROVIDER_NOT_ASSIGNED',
        message: 'Cannot call before a provider is matched and assigned to the booking',
      });
    }

    // Call relay is active strictly for matched/in-progress jobs (BP §20, §74; CHAT-002)
    const allowedActiveStatuses: readonly BookingStatus[] = [
      BookingStatus.ACCEPTED,
      BookingStatus.SCHEDULED,
      BookingStatus.PROVIDER_EN_ROUTE,
      BookingStatus.ARRIVED,
      BookingStatus.IN_PROGRESS,
      BookingStatus.AWAITING_APPROVAL,
    ];

    if (!allowedActiveStatuses.includes(booking.status)) {
      throw new ConflictException({
        code: 'CALL_RELAY_NOT_AVAILABLE',
        message: `Calling is not available while booking is in ${booking.status} status`,
      });
    }

    return this.callRelay.createRelaySession({
      bookingId: booking.id,
      callerUserId: caller.id,
      callerRole,
      customerUserId,
      providerUserId,
    });
  }

  /**
   * Builds an external share payload for a customer booking/request (SHARE-001, SHARE-003, BP §82).
   * Guaranteed to contain ZERO personal phone numbers and NO exact address.
   */
  async buildBookingSharePayload(bookingId: string, caller: RequestUser): Promise<SharePayloadDto> {
    const { booking } = await this.validateBookingParticipant(bookingId, caller);

    let area = 'Lahore';
    if (booking.locationSnapshotId) {
      const snap = await this.prisma.locationSnapshot.findUnique({
        where: { id: booking.locationSnapshotId },
        select: { areaName: true },
      });
      if (snap?.areaName) {
        area = `${snap.areaName}, Lahore`;
      }
    }

    const service = await this.prisma.service.findUnique({
      where: { id: booking.serviceId },
      select: { nameEn: true },
    });
    const serviceName = service?.nameEn ?? 'Service';

    const deepLinkUrl = `https://kaamkaro.pk/b/${booking.bookingNumber}`;
    const text = `Need help with ${serviceName} on Kaam Karo! Booking Ref: ${booking.bookingNumber}. Area: ${area}. View details: ${deepLinkUrl}`;

    return {
      title: 'Kaam Karo Job Request',
      text,
      deepLinkUrl,
    };
  }

  /**
   * Builds an external share payload for a provider's public profile (SHARE-002, SHARE-003, BP §82).
   */
  async buildProviderProfileSharePayload(providerProfileId: string): Promise<SharePayloadDto> {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
      select: { id: true, businessName: true },
    });

    if (!provider) {
      throw new NotFoundException({
        code: 'PROVIDER_PROFILE_NOT_FOUND',
        message: `Provider profile ${providerProfileId} not found`,
      });
    }

    const name = provider.businessName ?? 'Professional Provider';
    const deepLinkUrl = `https://kaamkaro.pk/p/${providerProfileId}`;
    const text = `Check out ${name} on Kaam Karo: ${deepLinkUrl}`;

    return {
      title: 'Kaam Karo Professional Profile',
      text,
      deepLinkUrl,
    };
  }
}

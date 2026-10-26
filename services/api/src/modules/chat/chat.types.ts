/**
 * Chat Types and Constants (owner A10, T7.2).
 * Requirements: CHAT-001, CHAT-002, CHAT-003, CHAT-004, SHARE-001..003.
 * BP §20, §25, §74, §82.
 */
import { ActorRole, MessageModerationStatus } from '../../generated/prisma/client.js';

export const CHAT_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const DEFAULT_MAX_CHAT_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB (D-011)

export interface SendMessageDto {
  body?: string;
  attachmentMediaId?: string;
  clientGeneratedId?: string;
}

export interface ListMessagesQueryDto {
  limit?: number;
  before?: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderRole: ActorRole;
  body: string | null;
  attachmentMediaId: string | null;
  moderationStatus: MessageModerationStatus;
  sentAt: Date;
}

export interface ConversationDetail {
  id: string;
  bookingId: string;
  createdAt: Date;
}

export interface CallRelaySessionDto {
  sessionId: string;
  virtualRelayNumber: string;
  displayRelayNumber: string;
  expiresAt: string;
  callerRole: ActorRole;
}

export interface SharePayloadDto {
  title: string;
  text: string;
  deepLinkUrl: string;
}

/**
 * Regex to detect Pakistani phone numbers and contact patterns in free-text chat (BP §20, SEC-REVIEW #8).
 * Matches formats: +92 300 1234567, 0300-1234567, 03001234567, +923001234567, etc.
 */
export const PHONE_NUMBER_REGEX = /(?:\+?92|0)?\s?[3]\d{2}[-\s]?\d{7}/g;

/**
 * Masks any raw phone number sequences detected in free text for privacy preservation (BP §20).
 */
export function maskPhoneNumbersInText(text: string): string {
  return text.replace(PHONE_NUMBER_REGEX, '+92 ••• •••••••');
}

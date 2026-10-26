/**
 * Notification types and interfaces for Module M15 (ARCH §4 M15, §5.3, §7; BP §24, §80, §84 item 116).
 * Requirement IDs: NOTIF-001..NOTIF-010.
 */
import type { AppLanguage } from '../../generated/prisma/client.js';

export enum NotificationCategory {
  JOBS = 'JOBS',
  PAYMENTS = 'PAYMENTS',
  SUPPORT = 'SUPPORT',
  MESSAGES = 'MESSAGES',
  ACCOUNT = 'ACCOUNT',
}

export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface PushNotificationPayload {
  readonly userId: string;
  readonly fcmToken?: string | null;
  readonly title: string;
  readonly body: string;
  readonly priority: NotificationPriority;
  readonly category: NotificationCategory;
  readonly isCritical: boolean;
  readonly data?: Record<string, string>;
}

export interface NotificationTemplateDefinition {
  readonly eventType: string;
  readonly audienceRole: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  readonly category: NotificationCategory;
  readonly priority: NotificationPriority;
  readonly isCritical: boolean;
  readonly en: {
    readonly title: string;
    readonly body: string;
  };
  readonly ur: {
    readonly title: string;
    readonly body: string;
  };
}

export interface RenderedNotification {
  readonly recipientUserId: string;
  readonly eventType: string;
  readonly outboxEventId: string;
  readonly category: NotificationCategory;
  readonly priority: NotificationPriority;
  readonly isCritical: boolean;
  readonly locale: AppLanguage;
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, string>;
}

export interface NotificationItemDto {
  readonly id: string;
  readonly eventType: string;
  readonly category: string;
  readonly priority: NotificationPriority;
  readonly isCritical: boolean;
  readonly channel: NotificationChannel;
  readonly locale: AppLanguage;
  readonly title: string;
  readonly body: string;
  readonly status: NotificationStatus;
  readonly readAt: string | null;
  readonly createdAt: string;
}

export interface NotificationsListResponseDto {
  readonly items: readonly NotificationItemDto[];
  readonly unreadCount: number;
  readonly total: number;
}

export interface NotificationCategoryPreferenceDto {
  readonly category: NotificationCategory;
  readonly enabled: boolean;
  readonly isCritical: boolean;
}

export interface NotificationPreferencesResponseDto {
  readonly categories: readonly NotificationCategoryPreferenceDto[];
}

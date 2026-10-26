/**
 * NotificationsService — Produces, fans out, stores, and delivers notifications from domain events (T7.1, owner A10).
 * Requirement IDs: NOTIF-001..NOTIF-010.
 * ARCH §4 M15, §5.3, §7; BP §24, §80, §84 item 116.
 */
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { OutboxMessage } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service.js';
import {
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  type NotificationCategoryPreferenceDto,
  type NotificationItemDto,
  type NotificationPreferencesResponseDto,
  type NotificationsListResponseDto,
} from './notifications.types.js';
import { ARCH_SEVEN_TEMPLATES, interpolateTemplate } from './notification-template.registry.js';
import {
  PUSH_NOTIFICATION_GATEWAY,
  type PushNotificationGateway,
} from './push-notification-gateway.js';
import { AppLanguage } from '../../generated/prisma/client.js';

export const CRITICAL_CATEGORIES: ReadonlySet<NotificationCategory> = new Set([
  NotificationCategory.JOBS,
  NotificationCategory.PAYMENTS,
  NotificationCategory.ACCOUNT,
]);

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_NOTIFICATION_GATEWAY)
    private readonly pushGateway: PushNotificationGateway,
  ) {}

  /**
   * Fan-out handler invoked by the Outbox consumer for every ARCH §7 domain event (NOTIF-001..NOTIF-008).
   * Ensures at-least-once idempotency keyed by message.id and respects user preferences (NOTIF-009).
   */
  async handleOutboxEvent(message: OutboxMessage): Promise<void> {
    const matchingTemplates = ARCH_SEVEN_TEMPLATES.filter((t) => t.eventType === message.eventType);
    if (matchingTemplates.length === 0) {
      return;
    }

    const payload = message.payload as Record<string, unknown>;

    for (const template of matchingTemplates) {
      const recipientUserId = this.resolveRecipientUserId(template.audienceRole, payload);
      if (!recipientUserId) {
        continue;
      }

      // 1. Idempotency check: an event delivered once per recipient (NOTIF-001, REL-008)
      const existing = await this.prisma.notification.findFirst({
        where: {
          outboxEventId: message.id,
          userId: recipientUserId,
        },
      });
      if (existing) {
        continue;
      }

      // 2. User category preference check (NOTIF-009):
      // Disabling a non-critical category stops it; critical messages still arrive.
      const pref = await this.prisma.notificationPreference.findUnique({
        where: {
          userId_category: {
            userId: recipientUserId,
            category: template.category,
          },
        },
      });

      if (pref && !pref.enabled && !template.isCritical) {
        // Suppress non-critical notification per user choice
        continue;
      }

      // 3. Resolve language (BP §78.1; I18N-001)
      let locale: AppLanguage = AppLanguage.EN;
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: recipientUserId },
          select: { preferredLanguage: true },
        });
        if (user?.preferredLanguage) {
          locale = user.preferredLanguage;
        }
      } catch {
        // Fallback to English if user lookup unavailable
        locale = AppLanguage.EN;
      }

      // 4. Render template
      const copy = locale === AppLanguage.UR ? template.ur : template.en;
      const title = interpolateTemplate(copy.title, payload);
      const body = interpolateTemplate(copy.body, payload);

      // 5. Persist In-App Notification (NOTIF-001; BP §24)
      const notification = await this.prisma.notification.create({
        data: {
          userId: recipientUserId,
          eventType: message.eventType,
          outboxEventId: message.id,
          category: template.category,
          priority: template.priority,
          isCritical: template.isCritical,
          channel: NotificationChannel.IN_APP,
          locale,
          title,
          body,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });

      // 6. Dispatch Push Notification via Gateway (D-001 FCM abstraction)
      let pushToken: string | null = null;
      try {
        const activeSession = await this.prisma.deviceSession.findFirst({
          where: { userId: recipientUserId, revokedAt: null, pushToken: { not: null } },
          select: { pushToken: true },
          orderBy: { lastSeenAt: 'desc' },
        });
        pushToken = activeSession?.pushToken ?? null;
      } catch {
        pushToken = null;
      }

      await this.pushGateway.send({
        userId: recipientUserId,
        fcmToken: pushToken,
        title,
        body,
        priority: template.priority,
        category: template.category,
        isCritical: template.isCritical,
        data: {
          notificationId: notification.id,
          eventType: message.eventType,
          outboxEventId: message.id,
        },
      });
    }
  }

  /**
   * Returns in-app notifications inbox for user with unread count (BP §12 C26, §13 P19; NOTIF-001).
   */
  async getInbox(
    userId: string,
    options: {
      status?: 'all' | 'unread' | 'read';
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<NotificationsListResponseDto> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const offset = Math.max(options.offset ?? 0, 0);

    const whereClause: { userId: string; readAt?: null | { not: null } } = { userId };
    if (options.status === 'unread') {
      whereClause.readAt = null;
    } else if (options.status === 'read') {
      whereClause.readAt = { not: null };
    }

    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where: whereClause }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    const items: NotificationItemDto[] = rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      category: r.category,
      priority: r.priority as NotificationPriority,
      isCritical: r.isCritical,
      channel: r.channel as NotificationChannel,
      locale: r.locale,
      title: r.title,
      body: r.body,
      status: r.status as NotificationStatus,
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      items,
      unreadCount,
      total,
    };
  }

  /**
   * Marks a single notification as read (BP §12 C26, §13 P19).
   */
  async markRead(userId: string, notificationId: string): Promise<NotificationItemDto> {
    const record = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!record) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: record.readAt ?? new Date() },
    });

    return {
      id: updated.id,
      eventType: updated.eventType,
      category: updated.category,
      priority: updated.priority as NotificationPriority,
      isCritical: updated.isCritical,
      channel: updated.channel as NotificationChannel,
      locale: updated.locale,
      title: updated.title,
      body: updated.body,
      status: updated.status as NotificationStatus,
      readAt: updated.readAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  /**
   * Marks all unread notifications as read.
   */
  async markAllRead(userId: string): Promise<{ markedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { markedCount: result.count };
  }

  /**
   * Gets user notification category preferences (NOTIF-009, BP §74, §84 item 116).
   */
  async getPreferences(userId: string): Promise<NotificationPreferencesResponseDto> {
    const existing = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });
    const prefMap = new Map(existing.map((p) => [p.category, p.enabled]));

    const categories: NotificationCategoryPreferenceDto[] = Object.values(NotificationCategory).map(
      (cat) => {
        const isCritical = CRITICAL_CATEGORIES.has(cat);
        // Default enabled is true
        const enabled = prefMap.has(cat) ? prefMap.get(cat)! : true;
        return {
          category: cat,
          enabled,
          isCritical,
        };
      },
    );

    return { categories };
  }

  /**
   * Updates user notification category preferences (NOTIF-009).
   * Critical categories cannot be disabled.
   */
  async updatePreferences(
    userId: string,
    requestedUpdates: readonly {
      readonly category: NotificationCategory;
      readonly enabled: boolean;
    }[],
  ): Promise<NotificationPreferencesResponseDto> {
    for (const update of requestedUpdates) {
      const isCritical = CRITICAL_CATEGORIES.has(update.category);
      if (isCritical && !update.enabled) {
        throw new BadRequestException(
          `Category ${update.category} is critical for booking and financial operations and cannot be disabled (NOTIF-009).`,
        );
      }

      await this.prisma.notificationPreference.upsert({
        where: {
          userId_category: {
            userId,
            category: update.category,
          },
        },
        create: {
          userId,
          category: update.category,
          enabled: update.enabled,
        },
        update: {
          enabled: update.enabled,
        },
      });
    }

    return this.getPreferences(userId);
  }

  /**
   * Resolves target recipient user ID from event payload based on audience role.
   */
  private resolveRecipientUserId(
    role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN',
    payload: Record<string, unknown>,
  ): string | null {
    if (role === 'CUSTOMER') {
      const id = payload.customerId ?? payload.customerUserId ?? payload.userId;
      return typeof id === 'string' ? id : null;
    }
    if (role === 'PROVIDER') {
      const id = payload.providerUserId ?? payload.providerProfileId ?? payload.providerId;
      return typeof id === 'string' ? id : null;
    }
    if (role === 'ADMIN') {
      const id = payload.adminUserId ?? payload.decidedByUserId;
      return typeof id === 'string' ? id : null;
    }
    return null;
  }
}

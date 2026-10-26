/**
 * Push Notification Gateway abstraction & fake implementation (D-001 FCM; BP §24; NOTIF-001).
 */
import { Injectable } from '@nestjs/common';
import type { PushNotificationPayload } from './notifications.types';

export interface PushNotificationGateway {
  send(
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export const PUSH_NOTIFICATION_GATEWAY = Symbol('PUSH_NOTIFICATION_GATEWAY');

@Injectable()
export class FakePushNotificationGateway implements PushNotificationGateway {
  private readonly sentNotifications: PushNotificationPayload[] = [];

  async send(payload: PushNotificationPayload): Promise<{ success: boolean; messageId: string }> {
    this.sentNotifications.push(payload);
    const messageId = `fake-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return { success: true, messageId };
  }

  getSent(): readonly PushNotificationPayload[] {
    return [...this.sentNotifications];
  }

  clear(): void {
    this.sentNotifications.length = 0;
  }
}

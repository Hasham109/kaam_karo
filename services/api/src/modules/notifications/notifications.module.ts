/**
 * NotificationsModule — NestJS module for Notifications & Domain Event Fan-out (T7.1; owner A10).
 * Requirement IDs: NOTIF-001..NOTIF-010.
 * ARCH §4 M15, §7; BP §24, §80.
 */
import { Module, type OnModuleInit } from '@nestjs/common';
import { OutboxConsumerRegistry } from '@kaamkaro/platform';
import { IdentityModule } from '../identity/index.js';
import { PlatformModule } from '../../platform/index.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import {
  FakePushNotificationGateway,
  PUSH_NOTIFICATION_GATEWAY,
} from './push-notification-gateway.js';
import { ARCH_SEVEN_TEMPLATES } from './notification-template.registry.js';

@Module({
  imports: [IdentityModule, PlatformModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: PUSH_NOTIFICATION_GATEWAY,
      useClass: FakePushNotificationGateway,
    },
    FakePushNotificationGateway,
  ],
  exports: [NotificationsService, PUSH_NOTIFICATION_GATEWAY, FakePushNotificationGateway],
})
export class NotificationsModule implements OnModuleInit {
  constructor(
    private readonly registry: OutboxConsumerRegistry,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    const subscribedEvents = ARCH_SEVEN_TEMPLATES.map((t) => t.eventType);
    const uniqueEvents = [...new Set(subscribedEvents)];

    // Register outbox consumer for domain event fan-out (BP §24; NOTIF-001; REL-009)
    try {
      this.registry.register({
        name: 'notifications',
        eventTypes: uniqueEvents,
        handle: async (message) => {
          await this.notificationsService.handleOutboxEvent(message);
        },
      });
    } catch {
      // Guard against duplicate registration in test or hot reload
    }
  }
}

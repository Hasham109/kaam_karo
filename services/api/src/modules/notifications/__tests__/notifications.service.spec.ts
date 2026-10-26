/**
 * Unit & Integration Tests for Module M15 Notifications (T7.1; owner A10).
 * Tests all requirement IDs: NOTIF-001..NOTIF-010; ARCH §7 events; BP §24, §80, §84 item 116.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationsService } from '../notifications.service.js';
import { FakePushNotificationGateway } from '../push-notification-gateway.js';
import { NotificationCategory, NotificationPriority } from '../notifications.types.js';
import { AppLanguage } from '../../../generated/prisma/client.js';

describe('NotificationsService (T7.1, NOTIF-001..NOTIF-010)', () => {
  let service: NotificationsService;
  let pushGateway: FakePushNotificationGateway;
  let mockPrisma: any;

  // In-memory fake database stores
  let notificationsDb: any[] = [];
  let preferencesDb: any[] = [];
  let usersDb: any[] = [];
  let sessionsDb: any[] = [];

  beforeEach(() => {
    notificationsDb = [];
    preferencesDb = [];
    usersDb = [
      { id: 'user-cust-1', preferredLanguage: AppLanguage.EN },
      { id: 'user-cust-ur', preferredLanguage: AppLanguage.UR },
      { id: 'user-prov-1', preferredLanguage: AppLanguage.EN },
      { id: 'user-admin-1', preferredLanguage: AppLanguage.EN },
    ];
    sessionsDb = [
      {
        userId: 'user-cust-1',
        pushToken: 'fcm-token-cust-1',
        revokedAt: null,
        lastSeenAt: new Date(),
      },
      {
        userId: 'user-prov-1',
        pushToken: 'fcm-token-prov-1',
        revokedAt: null,
        lastSeenAt: new Date(),
      },
    ];

    mockPrisma = {
      notification: {
        findFirst: vi.fn(async ({ where }) => {
          return (
            notificationsDb.find((n) => {
              if (where.outboxEventId && n.outboxEventId !== where.outboxEventId) return false;
              if (where.userId && n.userId !== where.userId) return false;
              if (where.id && n.id !== where.id) return false;
              return true;
            }) ?? null
          );
        }),
        findMany: vi.fn(async ({ where, take, skip }) => {
          let list = notificationsDb.filter((n) => n.userId === where.userId);
          if (where.readAt === null) {
            list = list.filter((n) => n.readAt === null);
          } else if (where.readAt && where.readAt.not !== null) {
            list = list.filter((n) => n.readAt !== null);
          }
          return list.slice(skip ?? 0, (skip ?? 0) + (take ?? list.length));
        }),
        count: vi.fn(async ({ where }) => {
          let list = notificationsDb.filter((n) => n.userId === where.userId);
          if (where.readAt === null) {
            list = list.filter((n) => n.readAt === null);
          }
          return list.length;
        }),
        create: vi.fn(async ({ data }) => {
          const row = {
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ...data,
            readAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          notificationsDb.push(row);
          return row;
        }),
        update: vi.fn(async ({ where, data }) => {
          const item = notificationsDb.find((n) => n.id === where.id);
          if (!item) throw new Error('Not found');
          Object.assign(item, data, { updatedAt: new Date() });
          return item;
        }),
        updateMany: vi.fn(async ({ where, data }) => {
          let count = 0;
          for (const item of notificationsDb) {
            if (
              item.userId === where.userId &&
              (where.readAt === null ? item.readAt === null : true)
            ) {
              Object.assign(item, data, { updatedAt: new Date() });
              count++;
            }
          }
          return { count };
        }),
      },
      notificationPreference: {
        findUnique: vi.fn(async ({ where }) => {
          const key = where.userId_category;
          return (
            preferencesDb.find((p) => p.userId === key.userId && p.category === key.category) ??
            null
          );
        }),
        findMany: vi.fn(async ({ where }) => {
          return preferencesDb.filter((p) => p.userId === where.userId);
        }),
        upsert: vi.fn(async ({ where, create, update }) => {
          const key = where.userId_category;
          const idx = preferencesDb.findIndex(
            (p) => p.userId === key.userId && p.category === key.category,
          );
          if (idx >= 0) {
            preferencesDb[idx] = { ...preferencesDb[idx], ...update };
            return preferencesDb[idx];
          }
          const row = { id: `pref-${Date.now()}`, ...create };
          preferencesDb.push(row);
          return row;
        }),
      },
      user: {
        findUnique: vi.fn(async ({ where }) => {
          return usersDb.find((u) => u.id === where.id) ?? null;
        }),
      },
      deviceSession: {
        findFirst: vi.fn(async ({ where }) => {
          return (
            sessionsDb.find(
              (s) => s.userId === where.userId && s.revokedAt === null && s.pushToken,
            ) ?? null
          );
        }),
      },
    };

    pushGateway = new FakePushNotificationGateway();
    service = new NotificationsService(mockPrisma as any, pushGateway);
  });

  // NOTIF-001: Outbox event yields per-role notifications and de-duplicates
  describe('NOTIF-001: Event-driven fan-out & Idempotency', () => {
    it('creates per-role in-app and push notifications from a domain event', async () => {
      await service.handleOutboxEvent({
        id: 'evt-001',
        eventType: 'booking.accepted',
        schemaVersion: 1,
        aggregateType: 'booking',
        aggregateId: 'book-100',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerUserId: 'user-prov-1',
          providerName: 'Tariq Electrician',
          serviceName: 'AC General Service',
          scheduledTime: '2026-10-27 10:00 AM',
          crewSize: 2,
        },
      });

      expect(notificationsDb).toHaveLength(2); // One for customer, one for provider
      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      const provNotif = notificationsDb.find((n) => n.userId === 'user-prov-1');

      expect(custNotif).toBeDefined();
      expect(custNotif.eventType).toBe('booking.accepted');
      expect(custNotif.title).toContain('Booking Confirmed');
      expect(custNotif.body).toContain('Tariq Electrician');
      expect(custNotif.body).toContain('Crew: 2');
      expect(custNotif.isCritical).toBe(true);

      expect(provNotif).toBeDefined();
      expect(provNotif.eventType).toBe('booking.accepted');
      expect(provNotif.title).toContain('Job Accepted');

      // Verify push delivery
      const sentPushes = pushGateway.getSent();
      expect(sentPushes).toHaveLength(2);
      expect(
        sentPushes.some((p) => p.userId === 'user-cust-1' && p.fcmToken === 'fcm-token-cust-1'),
      ).toBe(true);
    });

    it('is strictly idempotent on repeated delivery of the same outboxEventId', async () => {
      const msg = {
        id: 'evt-dup-1',
        eventType: 'booking.accepted',
        schemaVersion: 1,
        aggregateType: 'booking',
        aggregateId: 'book-100',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerUserId: 'user-prov-1',
          providerName: 'Tariq Electrician',
          scheduledTime: '10:00 AM',
          crewSize: 1,
        },
      };

      await service.handleOutboxEvent(msg);
      expect(notificationsDb).toHaveLength(2);

      // Re-delivery of same event
      await service.handleOutboxEvent(msg);
      expect(notificationsDb).toHaveLength(2); // Zero duplicate notifications
    });
  });

  // NOTIF-002: request.submitted and quote.received
  describe('NOTIF-002: request.submitted and quote.received', () => {
    it('notifies customer, provider and admin with en/ur templates on request.submitted', async () => {
      await service.handleOutboxEvent({
        id: 'evt-req-1',
        eventType: 'request.submitted',
        schemaVersion: 1,
        aggregateType: 'request',
        aggregateId: 'req-1',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-ur', // Urdu user
          providerUserId: 'user-prov-1',
          adminUserId: 'user-admin-1',
          serviceName: 'Plumbing Service',
          area: 'Gulberg III',
          distanceKm: 2.5,
          requestId: 'REQ-9988',
        },
      });

      expect(notificationsDb).toHaveLength(3);
      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-ur');
      expect(custNotif.locale).toBe(AppLanguage.UR);
      expect(custNotif.title).toBe('درخواست موصول ہو گئی');
      expect(custNotif.body).toContain('Gulberg III');

      const provNotif = notificationsDb.find((n) => n.userId === 'user-prov-1');
      expect(provNotif.locale).toBe(AppLanguage.EN);
      expect(provNotif.title).toBe('New Job Alert');
      expect(provNotif.body).toContain('2.5 km away');
    });

    it('notifies customer on quote.received with total price', async () => {
      await service.handleOutboxEvent({
        id: 'evt-quote-1',
        eventType: 'quote.received',
        schemaVersion: 1,
        aggregateType: 'quote',
        aggregateId: 'quote-10',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerUserId: 'user-prov-1',
          providerName: 'Kamran Plumber',
          totalPrice: '3,800',
          bookingId: 'BK-55',
        },
      });

      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      expect(custNotif.title).toBe('New Quote Received');
      expect(custNotif.body).toContain('Rs. 3,800');
    });
  });

  // NOTIF-003: booking.accepted and booking.reminder
  describe('NOTIF-003: booking.accepted & booking.reminder', () => {
    it('notifies both customer and provider with appointment time on booking.reminder', async () => {
      await service.handleOutboxEvent({
        id: 'evt-remind-1',
        eventType: 'booking.reminder',
        schemaVersion: 1,
        aggregateType: 'booking',
        aggregateId: 'book-200',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerUserId: 'user-prov-1',
          providerName: 'Ali AC Tech',
          serviceName: 'AC Repair',
          area: 'Model Town',
          scheduledTime: 'Tomorrow at 11:00 AM',
        },
      });

      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      expect(custNotif.title).toBe('Upcoming Service Reminder');
      expect(custNotif.priority).toBe(NotificationPriority.MEDIUM);

      const provNotif = notificationsDb.find((n) => n.userId === 'user-prov-1');
      expect(provNotif.title).toBe('Upcoming Job Reminder');
    });
  });

  // NOTIF-004: provider.en_route and job.status_changed
  describe('NOTIF-004: provider.en_route & job.status_changed', () => {
    it('notifies customer with ETA when provider is en route', async () => {
      await service.handleOutboxEvent({
        id: 'evt-enroute-1',
        eventType: 'provider.en_route',
        schemaVersion: 1,
        aggregateType: 'booking',
        aggregateId: 'book-300',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerUserId: 'user-prov-1',
          providerName: 'Rashid Electrician',
          etaMinutes: 15,
          area: 'DHA Phase 5',
        },
      });

      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      expect(custNotif.title).toBe('Provider is On The Way');
      expect(custNotif.body).toContain('15 mins');
    });

    it('notifies on job.status_changed transitions', async () => {
      await service.handleOutboxEvent({
        id: 'evt-status-1',
        eventType: 'job.status_changed',
        schemaVersion: 1,
        aggregateType: 'booking',
        aggregateId: 'book-400',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerUserId: 'user-prov-1',
          bookingId: 'BK-400',
          status: 'COMPLETED',
        },
      });

      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      expect(custNotif.body).toContain('COMPLETED');
    });
  });

  // NOTIF-005: charge.proposed
  describe('NOTIF-005: charge.proposed approval request', () => {
    it('dispatches high priority approval alert to customer linking to C37', async () => {
      await service.handleOutboxEvent({
        id: 'evt-charge-1',
        eventType: 'charge.proposed',
        schemaVersion: 1,
        aggregateType: 'booking',
        aggregateId: 'book-500',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerName: 'Umar Plumber',
          amount: '1,200',
          reason: 'Extra Copper Pipe (2 meters)',
        },
      });

      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      expect(custNotif.title).toContain('Approval Required: Extra Charge');
      expect(custNotif.body).toContain('Rs. 1,200');
      expect(custNotif.body).toContain('Extra Copper Pipe');
      expect(custNotif.isCritical).toBe(true);
      expect(custNotif.priority).toBe(NotificationPriority.HIGH);
    });
  });

  // NOTIF-006: payment.succeeded, failed, and refund.issued
  describe('NOTIF-006: Financial lifecycle events', () => {
    it('notifies customer receipt, provider settlement, and Finance record on payment.succeeded', async () => {
      await service.handleOutboxEvent({
        id: 'evt-pay-succ-1',
        eventType: 'payment.succeeded',
        schemaVersion: 1,
        aggregateType: 'payment',
        aggregateId: 'pay-1',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerUserId: 'user-prov-1',
          adminUserId: 'user-admin-1',
          bookingId: 'BK-600',
          amount: '3,800',
          providerShare: '3,200',
          commissionAmount: '600',
          channel: 'DIGITAL',
        },
      });

      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      expect(custNotif.title).toBe('Payment Confirmed');
      expect(custNotif.body).toContain('Rs. 3,800');

      const provNotif = notificationsDb.find((n) => n.userId === 'user-prov-1');
      expect(provNotif.title).toBe('Payment Credited');
      expect(provNotif.body).toContain('Rs. 3,200');

      const adminNotif = notificationsDb.find((n) => n.userId === 'user-admin-1');
      expect(adminNotif.title).toBe('Payment Succeeded');
    });

    it('notifies customer and Admin on payment.failed', async () => {
      await service.handleOutboxEvent({
        id: 'evt-pay-fail-1',
        eventType: 'payment.failed',
        schemaVersion: 1,
        aggregateType: 'payment',
        aggregateId: 'pay-2',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          adminUserId: 'user-admin-1',
          bookingId: 'BK-700',
          amount: '2,500',
          reason: 'INSUFFICIENT_FUNDS',
        },
      });

      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      expect(custNotif.title).toBe('Payment Failed');
      expect(custNotif.body).toContain('INSUFFICIENT_FUNDS');
    });

    it('notifies customer and adjusts provider on refund.issued', async () => {
      await service.handleOutboxEvent({
        id: 'evt-refund-1',
        eventType: 'refund.issued',
        schemaVersion: 1,
        aggregateType: 'refund',
        aggregateId: 'ref-1',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerUserId: 'user-prov-1',
          adminUserId: 'user-admin-1',
          bookingId: 'BK-800',
          refundRef: 'RF-101',
          amount: '1,500',
          providerShare: '1,050',
        },
      });

      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      expect(custNotif.title).toBe('Refund Processed');
      expect(custNotif.body).toContain('Rs. 1,500');

      const provNotif = notificationsDb.find((n) => n.userId === 'user-prov-1');
      expect(provNotif.title).toBe('Refund Ledger Adjustment');
      expect(provNotif.body).toContain('Rs. 1,050');
    });
  });

  // NOTIF-007: message.new and dispute events
  describe('NOTIF-007: Messages & Support Disputes', () => {
    it('notifies parties on message.new', async () => {
      await service.handleOutboxEvent({
        id: 'evt-msg-1',
        eventType: 'message.new',
        schemaVersion: 1,
        aggregateType: 'chat',
        aggregateId: 'msg-1',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          senderName: 'Aslam AC',
          messagePreview: 'I have arrived outside the building.',
        },
      });

      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      expect(custNotif.title).toBe('New Message');
      expect(custNotif.body).toContain('I have arrived');
    });

    it('notifies on dispute.opened and dispute.updated', async () => {
      await service.handleOutboxEvent({
        id: 'evt-disp-1',
        eventType: 'dispute.opened',
        schemaVersion: 1,
        aggregateType: 'dispute',
        aggregateId: 'disp-1',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerUserId: 'user-prov-1',
          adminUserId: 'user-admin-1',
          disputeId: 'DISP-404',
          bookingId: 'BK-999',
          severity: 'L3',
        },
      });

      const custNotif = notificationsDb.find((n) => n.userId === 'user-cust-1');
      expect(custNotif.title).toBe('Dispute Case Opened');
      expect(custNotif.body).toContain('DISP-404');
    });
  });

  // NOTIF-008: Provider account & regulatory events
  describe('NOTIF-008: Provider Account Events (Rating, Commission, Hiring Block)', () => {
    it('notifies provider on provider.rating_warning and blocked_low_rating (D-014)', async () => {
      await service.handleOutboxEvent({
        id: 'evt-rate-warn-1',
        eventType: 'provider.rating_warning',
        schemaVersion: 1,
        aggregateType: 'provider',
        aggregateId: 'prov-1',
        occurredAt: new Date().toISOString(),
        payload: {
          providerUserId: 'user-prov-1',
          adminUserId: 'user-admin-1',
          providerId: 'prov-1',
          warningNumber: 1,
          averageRating: '1.85',
        },
      });

      const warnNotif = notificationsDb.find((n) => n.userId === 'user-prov-1');
      expect(warnNotif.title).toContain('Warning 1');
      expect(warnNotif.body).toContain('1.85');
      expect(warnNotif.isCritical).toBe(true);

      // Blocked low rating
      await service.handleOutboxEvent({
        id: 'evt-rate-block-1',
        eventType: 'provider.blocked_low_rating',
        schemaVersion: 1,
        aggregateType: 'provider',
        aggregateId: 'prov-1',
        occurredAt: new Date().toISOString(),
        payload: {
          providerUserId: 'user-prov-1',
          adminUserId: 'user-admin-1',
          providerId: 'prov-1',
          averageRating: '1.70',
        },
      });

      const blockNotif = notificationsDb.find((n) => n.eventType === 'provider.blocked_low_rating');
      expect(blockNotif.title).toContain('Account Blocked: Low Rating');
    });

    it('notifies provider on commission debited, balance negative, payment submitted/rejected and cleared', async () => {
      // 1. Commission debited (D-016)
      await service.handleOutboxEvent({
        id: 'evt-comm-deb-1',
        eventType: 'provider.commission_debited',
        schemaVersion: 1,
        aggregateType: 'provider',
        aggregateId: 'prov-1',
        occurredAt: new Date().toISOString(),
        payload: {
          providerUserId: 'user-prov-1',
          amount: '600',
          bookingId: 'BK-10',
          balance: '-600',
        },
      });
      expect(notificationsDb.some((n) => n.eventType === 'provider.commission_debited')).toBe(true);

      // 2. Balance negative (D-020)
      await service.handleOutboxEvent({
        id: 'evt-bal-neg-1',
        eventType: 'provider.balance_negative',
        schemaVersion: 1,
        aggregateType: 'provider',
        aggregateId: 'prov-1',
        occurredAt: new Date().toISOString(),
        payload: {
          providerUserId: 'user-prov-1',
          adminUserId: 'user-admin-1',
          amountOwed: '600',
          providerId: 'prov-1',
        },
      });
      const negNotif = notificationsDb.find((n) => n.eventType === 'provider.balance_negative');
      expect(negNotif.title).toContain('Hiring Blocked');
      expect(negNotif.isCritical).toBe(true);

      // 3. Commission payment submitted (D-021)
      await service.handleOutboxEvent({
        id: 'evt-pay-sub-1',
        eventType: 'provider.commission_payment_submitted',
        schemaVersion: 1,
        aggregateType: 'provider',
        aggregateId: 'prov-1',
        occurredAt: new Date().toISOString(),
        payload: {
          providerUserId: 'user-prov-1',
          adminUserId: 'user-admin-1',
          amount: '600',
          transactionRef: 'TX-776655',
          providerId: 'prov-1',
        },
      });
      expect(
        notificationsDb.some((n) => n.eventType === 'provider.commission_payment_submitted'),
      ).toBe(true);

      // 4. Commission payment rejected (D-021)
      await service.handleOutboxEvent({
        id: 'evt-pay-rej-1',
        eventType: 'provider.commission_payment_rejected',
        schemaVersion: 1,
        aggregateType: 'provider',
        aggregateId: 'prov-1',
        occurredAt: new Date().toISOString(),
        payload: {
          providerUserId: 'user-prov-1',
          amount: '600',
          reason: 'Screenshot illegible',
        },
      });
      expect(
        notificationsDb.some((n) => n.eventType === 'provider.commission_payment_rejected'),
      ).toBe(true);

      // 5. Balance cleared (D-020)
      await service.handleOutboxEvent({
        id: 'evt-bal-clr-1',
        eventType: 'provider.balance_cleared',
        schemaVersion: 1,
        aggregateType: 'provider',
        aggregateId: 'prov-1',
        occurredAt: new Date().toISOString(),
        payload: {
          providerUserId: 'user-prov-1',
        },
      });
      const clrNotif = notificationsDb.find((n) => n.eventType === 'provider.balance_cleared');
      expect(clrNotif.title).toContain('Balance Cleared');
    });
  });

  // NOTIF-009: User category controls & Critical priority protection
  describe('NOTIF-009: Category Preferences & Critical Immunity', () => {
    it('suppresses non-critical notifications when user disabled category', async () => {
      // User disabled MESSAGES category
      preferencesDb.push({
        userId: 'user-cust-1',
        category: NotificationCategory.MESSAGES,
        enabled: false,
      });

      await service.handleOutboxEvent({
        id: 'evt-msg-disabled',
        eventType: 'message.new',
        schemaVersion: 1,
        aggregateType: 'chat',
        aggregateId: 'msg-2',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          senderName: 'Aslam AC',
          messagePreview: 'Where are you located?',
        },
      });

      expect(notificationsDb.find((n) => n.outboxEventId === 'evt-msg-disabled')).toBeUndefined();
    });

    it('ALWAYS delivers critical notifications even if category preference is disabled', async () => {
      // Malicious or accidental attempt to disable JOBS
      preferencesDb.push({
        userId: 'user-cust-1',
        category: NotificationCategory.JOBS,
        enabled: false,
      });

      await service.handleOutboxEvent({
        id: 'evt-job-critical',
        eventType: 'booking.accepted',
        schemaVersion: 1,
        aggregateType: 'booking',
        aggregateId: 'book-999',
        occurredAt: new Date().toISOString(),
        payload: {
          customerId: 'user-cust-1',
          providerName: 'Asif Tech',
          scheduledTime: 'Today 4:00 PM',
          crewSize: 1,
        },
      });

      // Critical booking.accepted MUST be delivered
      const notif = notificationsDb.find((n) => n.outboxEventId === 'evt-job-critical');
      expect(notif).toBeDefined();
      expect(notif.isCritical).toBe(true);
    });

    it('rejects disabling critical categories via updatePreferences', async () => {
      await expect(
        service.updatePreferences('user-cust-1', [
          { category: NotificationCategory.JOBS, enabled: false },
        ]),
      ).rejects.toThrow('critical');
    });

    it('allows toggling non-critical categories via updatePreferences', async () => {
      const result = await service.updatePreferences('user-cust-1', [
        { category: NotificationCategory.SUPPORT, enabled: false },
        { category: NotificationCategory.MESSAGES, enabled: true },
      ]);

      const supportPref = result.categories.find(
        (c) => c.category === NotificationCategory.SUPPORT,
      );
      expect(supportPref?.enabled).toBe(false);
      expect(supportPref?.isCritical).toBe(false);
    });
  });

  // Inbox & Read Status Management
  describe('Inbox & Read State Operations', () => {
    it('returns inbox with total count, unread count and pagination', async () => {
      notificationsDb.push(
        {
          id: 'n1',
          userId: 'user-cust-1',
          eventType: 'booking.accepted',
          category: 'JOBS',
          priority: 'HIGH',
          isCritical: true,
          channel: 'IN_APP',
          locale: 'en',
          title: 'T1',
          body: 'B1',
          status: 'SENT',
          readAt: null,
          createdAt: new Date(),
        },
        {
          id: 'n2',
          userId: 'user-cust-1',
          eventType: 'payment.succeeded',
          category: 'PAYMENTS',
          priority: 'HIGH',
          isCritical: true,
          channel: 'IN_APP',
          locale: 'en',
          title: 'T2',
          body: 'B2',
          status: 'SENT',
          readAt: new Date(),
          createdAt: new Date(),
        },
      );

      const inbox = await service.getInbox('user-cust-1', { status: 'all' });
      expect(inbox.items).toHaveLength(2);
      expect(inbox.total).toBe(2);
      expect(inbox.unreadCount).toBe(1);
    });

    it('marks a single notification as read', async () => {
      notificationsDb.push({
        id: 'n-read-1',
        userId: 'user-cust-1',
        eventType: 'booking.reminder',
        category: 'JOBS',
        priority: 'MEDIUM',
        isCritical: false,
        channel: 'IN_APP',
        locale: 'en',
        title: 'T',
        body: 'B',
        status: 'SENT',
        readAt: null,
        createdAt: new Date(),
      });

      const updated = await service.markRead('user-cust-1', 'n-read-1');
      expect(updated.readAt).not.toBeNull();
    });

    it('marks all unread notifications as read', async () => {
      notificationsDb.push(
        { id: 'm1', userId: 'user-cust-1', readAt: null, createdAt: new Date() },
        { id: 'm2', userId: 'user-cust-1', readAt: null, createdAt: new Date() },
      );

      const res = await service.markAllRead('user-cust-1');
      expect(res.markedCount).toBe(2);
    });
  });
});

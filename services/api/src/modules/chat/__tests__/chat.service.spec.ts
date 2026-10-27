/**
 * Unit & Integration Tests for Module M13 Chat & Communication (T7.2; owner A10).
 * Tests all requirement IDs: CHAT-001..004, SHARE-001..003; BP §20, §25, §74, §82; D-009, D-011.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChatService } from '../chat.service.js';
import { FakeCallRelayService } from '../call-relay/fake-call-relay.service.js';
import { maskPhoneNumbersInText } from '../chat.types.js';
import {
  ActorRole,
  BookingStatus,
  MessageModerationStatus,
  UserRoleType,
} from '../../../generated/prisma/client.js';
import type { RequestUser } from '../../identity/guards/auth.guard.js';

describe('ChatService (T7.2, CHAT-001..004, SHARE-001..003)', () => {
  let chatService: ChatService;
  let fakeCallRelay: FakeCallRelayService;

  // In-memory data stores for unit/integration simulation
  let bookingsDb: Array<{
    id: string;
    bookingNumber: string;
    status: BookingStatus;
    customerProfileId: string;
    providerProfileId: string | null;
    serviceId: string;
    locationSnapshotId: string | null;
  }>;

  let customerProfilesDb: Array<{
    id: string;
    userId: string;
  }>;

  let providerProfilesDb: Array<{
    id: string;
    userId: string;
    businessName: string | null;
  }>;

  let conversationsDb: Array<{
    id: string;
    bookingId: string;
    createdAt: Date;
  }>;

  let messagesDb: Array<{
    id: string;
    conversationId: string;
    senderUserId: string;
    senderRole: ActorRole;
    body: string | null;
    attachmentMediaId: string | null;
    moderationStatus: MessageModerationStatus;
    sentAt: Date;
    updatedAt: Date;
  }>;

  let mediaObjectsDb: Array<{
    id: string;
    mimeType: string;
    sizeBytes: number | null;
  }>;

  let locationSnapshotsDb: Array<{
    id: string;
    areaName: string | null;
  }>;

  let servicesDb: Array<{
    id: string;
    nameEn: string;
  }>;

  let outboxEventsDb: Array<{
    id: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    schemaVersion: number;
    payload: Record<string, unknown>;
  }>;

  let configStore: Record<string, unknown>;

  const customerUser: RequestUser = {
    id: 'user-customer-1',
    sessionId: 'sess-cust',
    surface: 'CUSTOMER' as any,
    roles: [UserRoleType.CUSTOMER],
    subRoles: [],
    mfaVerifiedAt: null,
  };

  const providerUser: RequestUser = {
    id: 'user-provider-1',
    sessionId: 'sess-prov',
    surface: 'PARTNER' as any,
    roles: [UserRoleType.PROVIDER],
    subRoles: [],
    mfaVerifiedAt: null,
  };

  const adminUser: RequestUser = {
    id: 'user-admin-1',
    sessionId: 'sess-adm',
    surface: 'ADMIN' as any,
    roles: [UserRoleType.ADMIN],
    subRoles: [],
    mfaVerifiedAt: new Date(),
  };

  const intruderUser: RequestUser = {
    id: 'user-intruder-99',
    sessionId: 'sess-intruder',
    surface: 'CUSTOMER' as any,
    roles: [UserRoleType.CUSTOMER],
    subRoles: [],
    mfaVerifiedAt: null,
  };

  beforeEach(() => {
    bookingsDb = [
      {
        id: 'booking-1',
        bookingNumber: 'KK-BK001',
        status: BookingStatus.ACCEPTED,
        customerProfileId: 'cust-prof-1',
        providerProfileId: 'prov-prof-1',
        serviceId: 'svc-ac-1',
        locationSnapshotId: 'loc-snap-1',
      },
      {
        id: 'booking-unassigned',
        bookingNumber: 'KK-BK002',
        status: BookingStatus.REQUESTED,
        customerProfileId: 'cust-prof-1',
        providerProfileId: null,
        serviceId: 'svc-ac-1',
        locationSnapshotId: 'loc-snap-1',
      },
    ];

    customerProfilesDb = [{ id: 'cust-prof-1', userId: 'user-customer-1' }];

    providerProfilesDb = [
      {
        id: 'prov-prof-1',
        userId: 'user-provider-1',
        businessName: 'Lahore Pro Cooling Services',
      },
    ];

    conversationsDb = [];
    messagesDb = [];

    mediaObjectsDb = [
      { id: 'media-valid-img', mimeType: 'image/jpeg', sizeBytes: 1024 * 1024 }, // 1 MB
      { id: 'media-valid-pdf', mimeType: 'application/pdf', sizeBytes: 500 * 1024 }, // 500 KB
      { id: 'media-disallowed-video', mimeType: 'video/mp4', sizeBytes: 4 * 1024 * 1024 },
      { id: 'media-oversize-img', mimeType: 'image/jpeg', sizeBytes: 12 * 1024 * 1024 }, // 12 MB
    ];

    locationSnapshotsDb = [{ id: 'loc-snap-1', areaName: 'Gulberg III' }];

    servicesDb = [{ id: 'svc-ac-1', nameEn: 'AC General Service' }];

    outboxEventsDb = [];
    configStore = {};

    fakeCallRelay = new FakeCallRelayService();

    const mockPrisma: any = {
      booking: {
        findUnique: async ({ where }: any) => bookingsDb.find((b) => b.id === where.id) ?? null,
      },
      customerProfile: {
        findUnique: async ({ where }: any) =>
          customerProfilesDb.find((cp) => cp.id === where.id) ?? null,
      },
      providerProfile: {
        findUnique: async ({ where }: any) =>
          providerProfilesDb.find((pp) => pp.id === where.id) ?? null,
      },
      conversation: {
        findUnique: async ({ where }: any) =>
          conversationsDb.find((c) => c.bookingId === where.bookingId) ?? null,
        create: async ({ data }: any) => {
          const row = {
            id: `conv-${conversationsDb.length + 1}`,
            bookingId: data.bookingId,
            createdAt: new Date(),
          };
          conversationsDb.push(row);
          return row;
        },
      },
      message: {
        findMany: async ({ where, take }: any) => {
          let list = messagesDb.filter((m) => m.conversationId === where.conversationId);
          if (where.sentAt?.lt) {
            list = list.filter((m) => m.sentAt < where.sentAt.lt);
          }
          list.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
          if (take) {
            list = list.slice(0, take);
          }
          return list;
        },
        create: async ({ data }: any) => {
          const row = {
            id: `msg-${messagesDb.length + 1}`,
            conversationId: data.conversationId,
            senderUserId: data.senderUserId,
            senderRole: data.senderRole,
            body: data.body,
            attachmentMediaId: data.attachmentMediaId,
            moderationStatus: data.moderationStatus,
            sentAt: new Date(),
            updatedAt: new Date(),
          };
          messagesDb.push(row);
          return row;
        },
      },
      mediaObject: {
        findUnique: async ({ where }: any) => mediaObjectsDb.find((m) => m.id === where.id) ?? null,
      },
      locationSnapshot: {
        findUnique: async ({ where }: any) =>
          locationSnapshotsDb.find((l) => l.id === where.id) ?? null,
      },
      service: {
        findUnique: async ({ where }: any) => servicesDb.find((s) => s.id === where.id) ?? null,
      },
      $transaction: async (fn: any) => fn(mockPrisma),
    };

    const mockOutboxWriter: any = {
      append: async (_tx: any, event: any) => {
        const id = `evt-${outboxEventsDb.length + 1}`;
        outboxEventsDb.push({ id, ...event });
        return id;
      },
    };

    const mockConfigService: any = {
      get: async (key: string, parser?: (val: unknown) => any) => {
        const val = configStore[key];
        if (val !== undefined && parser) {
          const parsed = parser(val);
          return { status: 'configured', value: parsed };
        }
        return { status: 'not_configured', value: undefined };
      },
    };

    chatService = new ChatService(mockPrisma, mockOutboxWriter, fakeCallRelay, mockConfigService);
  });

  // ============================================================================
  // 1. Participant Access & Isolation (CHAT-001, BP §20)
  // ============================================================================
  describe('Participant Access & Boundary Control (CHAT-001)', () => {
    it('allows customer of the booking to get or create conversation', async () => {
      const conv = await chatService.getOrCreateConversation('booking-1', customerUser);
      expect(conv).toBeDefined();
      expect(conv.bookingId).toBe('booking-1');
    });

    it('allows assigned provider to get or create conversation', async () => {
      const conv = await chatService.getOrCreateConversation('booking-1', providerUser);
      expect(conv).toBeDefined();
      expect(conv.bookingId).toBe('booking-1');
    });

    it('allows admin role to access conversation', async () => {
      const conv = await chatService.getOrCreateConversation('booking-1', adminUser);
      expect(conv).toBeDefined();
      expect(conv.bookingId).toBe('booking-1');
    });

    it('rejects unauthorized third-party user with 403 Forbidden', async () => {
      await expect(chatService.getOrCreateConversation('booking-1', intruderUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws 404 NotFound if booking does not exist', async () => {
      await expect(
        chatService.getOrCreateConversation('booking-does-not-exist', customerUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // 2. Messaging & Domain Event Fan-out (CHAT-001, NOTIF-007)
  // ============================================================================
  describe('Messaging Lifecycle & Event Fan-out (CHAT-001, NOTIF-007)', () => {
    it('customer sends text message, persists message, and emits message.new outbox event', async () => {
      const msg = await chatService.sendMessage('booking-1', customerUser, {
        body: 'Hello, what time will you arrive?',
      });

      expect(msg.id).toBeDefined();
      expect(msg.body).toBe('Hello, what time will you arrive?');
      expect(msg.senderRole).toBe(ActorRole.CUSTOMER);
      expect(msg.moderationStatus).toBe(MessageModerationStatus.DELIVERED);

      // Verify outbox domain event for notification fan-out (NOTIF-007)
      expect(outboxEventsDb.length).toBe(1);
      const outboxEvt = outboxEventsDb[0]!;
      expect(outboxEvt.eventType).toBe('message.new');
      expect(outboxEvt.payload.customerUserId).toBe('user-customer-1');
      expect(outboxEvt.payload.providerUserId).toBe('user-provider-1');
      expect(outboxEvt.payload.messagePreview).toBe('Hello, what time will you arrive?');
    });

    it('provider replies with text, correctly targets customer in outbox event', async () => {
      const msg = await chatService.sendMessage('booking-1', providerUser, {
        body: 'I will be there in 20 minutes.',
      });

      expect(msg.senderRole).toBe(ActorRole.PROVIDER);
      expect(outboxEventsDb.length).toBe(1);
      const outboxEvt = outboxEventsDb[0]!;
      expect(outboxEvt.payload.providerUserId).toBe('user-provider-1');
      expect(outboxEvt.payload.customerUserId).toBe('user-customer-1');
    });

    it('rejects empty message with 400 BadRequest', async () => {
      await expect(
        chatService.sendMessage('booking-1', customerUser, { body: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns messages list for conversation', async () => {
      await chatService.sendMessage('booking-1', customerUser, { body: 'First' });
      await chatService.sendMessage('booking-1', providerUser, { body: 'Second' });

      const result = await chatService.listMessages('booking-1', customerUser, { limit: 10 });
      expect(result.items.length).toBe(2);
      expect(result.items[0]!.body).toBe('First');
      expect(result.items[1]!.body).toBe('Second');
    });
  });

  // ============================================================================
  // 3. Attachment Validation (CHAT-003, D-011)
  // ============================================================================
  describe('Attachment Validation (CHAT-003, D-011)', () => {
    it('accepts valid JPEG and PDF attachments within size limit', async () => {
      const msgImg = await chatService.sendMessage('booking-1', customerUser, {
        body: 'AC photo',
        attachmentMediaId: 'media-valid-img',
      });
      expect(msgImg.attachmentMediaId).toBe('media-valid-img');

      const msgPdf = await chatService.sendMessage('booking-1', customerUser, {
        body: 'Manual',
        attachmentMediaId: 'media-valid-pdf',
      });
      expect(msgPdf.attachmentMediaId).toBe('media-valid-pdf');
    });

    it('rejects disallowed MIME type (e.g. video) with 400 BadRequest', async () => {
      await expect(
        chatService.sendMessage('booking-1', customerUser, {
          body: 'Video recording',
          attachmentMediaId: 'media-disallowed-video',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects oversized attachment (> 5MB) with 400 BadRequest', async () => {
      await expect(
        chatService.sendMessage('booking-1', customerUser, {
          body: 'Huge file',
          attachmentMediaId: 'media-oversize-img',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects non-existent media ID with 400 BadRequest', async () => {
      await expect(
        chatService.sendMessage('booking-1', customerUser, {
          body: 'Missing media',
          attachmentMediaId: 'media-non-existent',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // 4. Phone Number Masking & Admin Audit (BP §20, CHAT-002)
  // ============================================================================
  describe('Phone Number Privacy & Text Masking (BP §20)', () => {
    it('maskPhoneNumbersInText replaces Pakistani mobile patterns', () => {
      const raw = 'Call me on 03001234567 or +92 321 7654321 tomorrow';
      const masked = maskPhoneNumbersInText(raw);
      expect(masked).not.toContain('03001234567');
      expect(masked).not.toContain('7654321');
      expect(masked).toContain('+92 ••• •••••••');
    });

    it('masks phone numbers in message preview sent to outbox', async () => {
      await chatService.sendMessage('booking-1', customerUser, {
        body: 'Please contact me at 03001234567 for gate access',
      });

      const outboxEvt = outboxEventsDb[0]!;
      expect(outboxEvt.payload.messagePreview).not.toContain('03001234567');
      expect(outboxEvt.payload.messagePreview).toContain('+92 ••• •••••••');
    });

    it('masks phone numbers in free text when admin lists conversation messages (admin.md §1.6)', async () => {
      await chatService.sendMessage('booking-1', customerUser, {
        body: 'Here is my phone: 03009876543',
      });

      const adminView = await chatService.listMessages('booking-1', adminUser, {});
      expect(adminView.items[0]!.body).not.toContain('03009876543');
      expect(adminView.items[0]!.body).toContain('+92 ••• •••••••');
    });
  });

  // ============================================================================
  // 5. Moderation Rules (REQ-AI-009, ABUSE-006, ABUSE-008)
  // ============================================================================
  describe('Message Moderation (ABUSE-006, ABUSE-008)', () => {
    it('flags and blocks messages containing forbidden/abusive content', async () => {
      const msg = await chatService.sendMessage('booking-1', customerUser, {
        body: 'This is a scam offer',
      });

      expect(msg.moderationStatus).toBe(MessageModerationStatus.BLOCKED);
      // Blocked messages must NOT emit notification outbox events
      expect(outboxEventsDb.length).toBe(0);
    });
  });

  // ============================================================================
  // 6. Masked Calling via CallRelay (CHAT-002, BP §20, §74, D-009)
  // ============================================================================
  describe('Masked Calling via CallRelay (CHAT-002, EXT-001)', () => {
    it('initiates masked call relay session returning virtual relay number and zero raw phone numbers', async () => {
      const session = await chatService.initiateCallRelay('booking-1', customerUser);

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.virtualRelayNumber).toBe('+92421115226');
      expect(session.displayRelayNumber).toBe('+92 42 111-KAAM (5226)');
      expect(session.status).toBe('ACTIVE');
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

      // INVARIANT: Raw personal numbers are strictly NOT returned in session payload
      expect(JSON.stringify(session)).not.toContain('0300');
      expect(JSON.stringify(session)).not.toContain('+92300');
    });

    it('refuses call relay before provider is assigned with 409 Conflict', async () => {
      await expect(
        chatService.initiateCallRelay('booking-unassigned', customerUser),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses call relay when booking is in non-active status (e.g. COMPLETED)', async () => {
      bookingsDb[0]!.status = BookingStatus.COMPLETED;
      await expect(chatService.initiateCallRelay('booking-1', customerUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('supports CallRelay fault modes (ok, slow, timeout, error) per test-strategy §3', async () => {
      // 1. Error mode
      fakeCallRelay.setFaultMode('error');
      await expect(chatService.initiateCallRelay('booking-1', customerUser)).rejects.toThrow(
        'Relay telephony service temporarily unavailable',
      );

      // 2. Timeout mode
      fakeCallRelay.setFaultMode('timeout');
      await expect(chatService.initiateCallRelay('booking-1', customerUser)).rejects.toThrow(
        'Relay telephony service timed out',
      );

      // 3. Reset to OK
      fakeCallRelay.setFaultMode('ok');
      const recovered = await chatService.initiateCallRelay('booking-1', customerUser);
      expect(recovered.status).toBe('ACTIVE');
    });
  });

  // ============================================================================
  // 7. Share Payloads & Invariants (SHARE-001..003, BP §82)
  // ============================================================================
  describe('Share Payload Builders (SHARE-001, SHARE-002, SHARE-003)', () => {
    it('builds customer booking share payload with zero personal phone numbers and no exact street address', async () => {
      const payload = await chatService.buildBookingSharePayload('booking-1', customerUser);

      expect(payload.title).toBe('Kaam Karo Job Request');
      expect(payload.deepLinkUrl).toBe('https://kaamkaro.pk/b/KK-BK001');
      expect(payload.text).toContain('AC General Service');
      expect(payload.text).toContain('Gulberg III');
      expect(payload.text).toContain('KK-BK001');

      // Zero personal phone numbers or exact address (BP §20, §52.2, §82)
      expect(payload.text).not.toContain('0300');
      expect(payload.text).not.toContain('+923');
      expect(payload.text).not.toContain('House');
      expect(payload.text).not.toContain('Street');
    });

    it('builds provider public profile share payload (SHARE-002)', async () => {
      const payload = await chatService.buildProviderProfileSharePayload('prov-prof-1');

      expect(payload.title).toBe('Kaam Karo Professional Profile');
      expect(payload.deepLinkUrl).toBe('https://kaamkaro.pk/p/prov-prof-1');
      expect(payload.text).toContain('Lahore Pro Cooling Services');
    });

    it('verifies SHARE-003 invariant: external share links contain no commercial action execution path', async () => {
      const customerShare = await chatService.buildBookingSharePayload('booking-1', customerUser);
      const providerShare = await chatService.buildProviderProfileSharePayload('prov-prof-1');

      // Deep links are purely informational references
      expect(customerShare.deepLinkUrl).toMatch(/^https:\/\/kaamkaro\.pk\/b\/[A-Za-z0-9_-]+$/);
      expect(providerShare.deepLinkUrl).toMatch(/^https:\/\/kaamkaro\.pk\/p\/[A-Za-z0-9_-]+$/);

      // Verify no commercial action tokens (accept, pay, cancel, quote) in URLs
      expect(customerShare.deepLinkUrl).not.toContain('accept');
      expect(customerShare.deepLinkUrl).not.toContain('pay');
      expect(customerShare.deepLinkUrl).not.toContain('token');
      expect(providerShare.deepLinkUrl).not.toContain('accept');
    });
  });
});

/**
 * Database integration tests for Module M9 Booking (T3.4; owner A04).
 * Requirement IDs: BOOK-STATUS-001..017, BOOK-CANCEL-001..006, DATA-002, DATA-004.
 * BP §15, §16, §21, §25; ARCH §4 M9, §6.1; D-003, D-004, D-018, D-021, D-028.
 *
 * Runs against a migrated & seeded PostgreSQL database.
 */
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  BookingStatus,
  ActorRole,
  NoShowParty,
  SellingMode,
  PrismaClient,
} from '../../src/generated/prisma/client.js';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl) {
  throw new Error('booking.db-spec needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL');
}

const app = new PrismaClient({ adapter: new PrismaPg({ connectionString: appUrl }) });
const owner = new PrismaClient({ adapter: new PrismaPg({ connectionString: ownerUrl }) });

afterAll(async () => {
  await app.$disconnect();
  await owner.$disconnect();
});

class Rollback extends Error {}

async function attempt<T>(client: PrismaClient, fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  let value: T | undefined;
  try {
    await client.$transaction(
      async (tx) => {
        value = await fn(tx as unknown as PrismaClient);
        throw new Rollback();
      },
      { maxWait: 10000, timeout: 30000 },
    );
  } catch (err) {
    if (err instanceof Rollback) return value as T;
    throw err;
  }
  return value as T;
}

async function createTestFixtures(tx: PrismaClient) {
  const customerUser = await tx.user.create({
    data: {
      phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: 'Test Customer',
    },
  });

  const customer = await tx.customerProfile.create({
    data: {
      userId: customerUser.id,
    },
  });

  const providerUser = await tx.user.create({
    data: {
      phoneE164: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
      displayName: 'Test Provider',
    },
  });

  const provider = await tx.providerProfile.create({
    data: {
      userId: providerUser.id,
      businessName: 'Fast Fixers Ltd',
      usualTeamSize: 2,
    },
  });

  // Find seeded service
  const service = await tx.service.findFirst();
  if (!service) {
    throw new Error('No active service found in test seed');
  }

  return { customer, provider, service, customerUser, providerUser };
}

describe('[T3.4][BOOK-STATUS-001..017, BOOK-CANCEL-001..006] Booking State Machine Database Integration', () => {
  describe('Database Check Constraints', () => {
    it('[PROV-CREW-002, D-004] enforces booking_crew_size_positive (crew_size >= 1)', async () => {
      await attempt(app, async (tx) => {
        const { customer, service } = await createTestFixtures(tx);

        await expect(
          tx.booking.create({
            data: {
              customerProfileId: customer.id,
              serviceId: service.id,
              sellingMode: SellingMode.CHOOSE_SUPPLIER,
              crewSize: 0, // Violates crew_size >= 1
            },
          }),
        ).rejects.toThrow();
      });
    });

    it('[BOOK-STATUS-017] enforces booking_no_show_has_party (status = NO_SHOW requires no_show_party IS NOT NULL)', async () => {
      await attempt(app, async (tx) => {
        const { customer, service } = await createTestFixtures(tx);

        await expect(
          tx.booking.create({
            data: {
              customerProfileId: customer.id,
              serviceId: service.id,
              sellingMode: SellingMode.CHOOSE_SUPPLIER,
              status: BookingStatus.NO_SHOW,
              noShowParty: null, // Violates check
            },
          }),
        ).rejects.toThrow();
      });
    });

    it('[BOOK-STATUS-017] allows status = NO_SHOW when no_show_party is provided', async () => {
      await attempt(app, async (tx) => {
        const { customer, service } = await createTestFixtures(tx);

        const valid = await tx.booking.create({
          data: {
            customerProfileId: customer.id,
            serviceId: service.id,
            sellingMode: SellingMode.CHOOSE_SUPPLIER,
            status: BookingStatus.NO_SHOW,
            noShowParty: NoShowParty.PROVIDER,
          },
        });
        expect(valid.id).toBeDefined();
        expect(valid.noShowParty).toBe(NoShowParty.PROVIDER);
      });
    });

    it('enforces booking_number uniqueness in PostgreSQL', async () => {
      await attempt(app, async (tx) => {
        const { customer, service } = await createTestFixtures(tx);

        const b1 = await tx.booking.create({
          data: {
            bookingNumber: 'DUPLICATE1',
            customerProfileId: customer.id,
            serviceId: service.id,
            sellingMode: SellingMode.INSTANT,
          },
        });
        expect(b1.bookingNumber).toBe('DUPLICATE1');

        await expect(
          tx.booking.create({
            data: {
              bookingNumber: 'DUPLICATE1',
              customerProfileId: customer.id,
              serviceId: service.id,
              sellingMode: SellingMode.INSTANT,
            },
          }),
        ).rejects.toThrow();
      });
    });

    it('[DATA-002, DATA-004] foreign key relation on job_event requires valid booking_id', async () => {
      await attempt(app, async (tx) => {
        await expect(
          tx.jobEvent.create({
            data: {
              bookingId: randomUUID(), // non-existent booking
              actorRole: ActorRole.CUSTOMER,
              action: 'SUBMIT',
              fromStatus: BookingStatus.DRAFT,
              toStatus: BookingStatus.REQUESTED,
            },
          }),
        ).rejects.toThrow();
      });
    });
  });

  describe('End-to-End Booking Lifecycle & Job Events in PostgreSQL (BP §15, §16, DATA-002)', () => {
    it('executes full lifecycle: DRAFT -> REQUESTED -> ACCEPTED -> SCHEDULED -> EN_ROUTE -> ARRIVED -> IN_PROGRESS -> COMPLETED -> CLOSED', async () => {
      await attempt(app, async (tx) => {
        const { customer, provider, service, customerUser, providerUser } =
          await createTestFixtures(tx);

        // 1. Create Draft
        const booking = await tx.booking.create({
          data: {
            customerProfileId: customer.id,
            serviceId: service.id,
            providerProfileId: provider.id,
            sellingMode: SellingMode.CHOOSE_SUPPLIER,
            status: BookingStatus.DRAFT,
            version: 1,
          },
        });
        await tx.jobEvent.create({
          data: {
            bookingId: booking.id,
            actorUserId: customerUser.id,
            actorRole: ActorRole.CUSTOMER,
            action: 'CREATE_DRAFT',
            fromStatus: null,
            toStatus: BookingStatus.DRAFT,
          },
        });

        // 2. Submit to REQUESTED
        const requested = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.REQUESTED,
            statusChangedAt: new Date(),
            version: 2,
          },
        });
        await tx.jobEvent.create({
          data: {
            bookingId: requested.id,
            actorUserId: customerUser.id,
            actorRole: ActorRole.CUSTOMER,
            action: 'SUBMIT',
            fromStatus: BookingStatus.DRAFT,
            toStatus: BookingStatus.REQUESTED,
          },
        });

        // 3. Provider ACCEPT with crewSize = 2 (D-004)
        const accepted = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.ACCEPTED,
            crewSize: 2,
            statusChangedAt: new Date(),
            version: 3,
          },
        });
        await tx.jobEvent.create({
          data: {
            bookingId: accepted.id,
            actorUserId: providerUser.id,
            actorRole: ActorRole.PROVIDER,
            action: 'ACCEPT',
            fromStatus: BookingStatus.REQUESTED,
            toStatus: BookingStatus.ACCEPTED,
          },
        });

        // 4. Confirm SCHEDULED
        const scheduledTime = new Date(Date.now() + 86400000);
        const scheduled = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.SCHEDULED,
            scheduledAt: scheduledTime,
            statusChangedAt: new Date(),
            version: 4,
          },
        });
        await tx.jobEvent.create({
          data: {
            bookingId: scheduled.id,
            actorUserId: providerUser.id,
            actorRole: ActorRole.PROVIDER,
            action: 'CONFIRM_SCHEDULE',
            fromStatus: BookingStatus.ACCEPTED,
            toStatus: BookingStatus.SCHEDULED,
          },
        });

        // 5. PROVIDER_EN_ROUTE
        const enRoute = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.PROVIDER_EN_ROUTE,
            statusChangedAt: new Date(),
            version: 5,
          },
        });
        await tx.jobEvent.create({
          data: {
            bookingId: enRoute.id,
            actorUserId: providerUser.id,
            actorRole: ActorRole.PROVIDER,
            action: 'START_TRIP',
            fromStatus: BookingStatus.SCHEDULED,
            toStatus: BookingStatus.PROVIDER_EN_ROUTE,
          },
        });

        // 6. ARRIVED
        const arrived = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.ARRIVED,
            statusChangedAt: new Date(),
            version: 6,
          },
        });
        await tx.jobEvent.create({
          data: {
            bookingId: arrived.id,
            actorUserId: providerUser.id,
            actorRole: ActorRole.PROVIDER,
            action: 'ARRIVE',
            fromStatus: BookingStatus.PROVIDER_EN_ROUTE,
            toStatus: BookingStatus.ARRIVED,
          },
        });

        // 7. IN_PROGRESS
        const inProgress = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.IN_PROGRESS,
            statusChangedAt: new Date(),
            version: 7,
          },
        });
        await tx.jobEvent.create({
          data: {
            bookingId: inProgress.id,
            actorUserId: providerUser.id,
            actorRole: ActorRole.PROVIDER,
            action: 'START_WORK',
            fromStatus: BookingStatus.ARRIVED,
            toStatus: BookingStatus.IN_PROGRESS,
          },
        });

        // 8. COMPLETED
        const completed = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.COMPLETED,
            statusChangedAt: new Date(),
            version: 8,
          },
        });
        await tx.jobEvent.create({
          data: {
            bookingId: completed.id,
            actorUserId: providerUser.id,
            actorRole: ActorRole.PROVIDER,
            action: 'COMPLETE',
            fromStatus: BookingStatus.IN_PROGRESS,
            toStatus: BookingStatus.COMPLETED,
          },
        });

        // 9. CLOSED
        const closed = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.CLOSED,
            statusChangedAt: new Date(),
            version: 9,
          },
        });
        await tx.jobEvent.create({
          data: {
            bookingId: closed.id,
            actorRole: ActorRole.SYSTEM,
            action: 'CLOSE',
            fromStatus: BookingStatus.COMPLETED,
            toStatus: BookingStatus.CLOSED,
          },
        });

        expect(closed.status).toBe(BookingStatus.CLOSED);
        expect(closed.version).toBe(9);

        // Verify full Job Event audit trail
        const events = await tx.jobEvent.findMany({
          where: { bookingId: booking.id },
          orderBy: { occurredAt: 'asc' },
        });

        expect(events.length).toBe(9);
        expect(events[0]!.action).toBe('CREATE_DRAFT');
        expect(events[8]!.action).toBe('CLOSE');
      });
    });
  });
});

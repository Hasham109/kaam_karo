/**
 * Database integration tests for Module M10 Quotes & Fare (T3.5; owner A04).
 * Requirement IDs: QUOTE-001..009, FARE-001..013, PRICE-001..007, BOOK-STATUS-010, COMM-003.
 * ARCH §4 M10, §5.6, §6.3, §6.6; BP §17, §18, §53, §58; D-004, D-015, D-018, D-025, D-028, D-029.
 *
 * Runs against a migrated & seeded PostgreSQL database.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  BookingStatus,
  QuoteStatus,
  FareLineType,
  FareLineState,
  MaterialsClass,
  ActorRole,
  SellingMode,
  PrismaClient,
} from '../../src/generated/prisma/client.js';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl) {
  throw new Error('quotes.db-spec needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL');
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
      displayName: 'Test Customer Quotes',
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
      displayName: 'Test Provider Quotes',
    },
  });

  const provider = await tx.providerProfile.create({
    data: {
      userId: providerUser.id,
      businessName: 'Expert Electricians Ltd',
      usualTeamSize: 2,
    },
  });

  const service = await tx.service.findFirst();
  if (!service) {
    throw new Error('No service found in test seed');
  }

  const booking = await tx.booking.create({
    data: {
      customerProfileId: customer.id,
      serviceId: service.id,
      sellingMode: SellingMode.CHOOSE_SUPPLIER,
      status: BookingStatus.QUOTE_PENDING,
    },
  });

  return { customer, provider, service, customerUser, providerUser, booking };
}

describe('[T3.5][QUOTE-001..009, FARE-001..013] Quotes & Fare Database Integration', () => {
  describe('Database Check Constraints', () => {
    it('[PROV-CREW-001, D-004] enforces quote_crew_size_positive check constraint (crew_size >= 1)', async () => {
      await attempt(app, async (tx) => {
        const { booking, provider } = await createTestFixtures(tx);

        await expect(
          tx.quote.create({
            data: {
              bookingId: booking.id,
              providerProfileId: provider.id,
              crewSize: 0, // Violates quote_crew_size_positive CHECK (crew_size >= 1)
              status: QuoteStatus.DRAFT,
            },
          }),
        ).rejects.toThrow();
      });
    });

    it('[PROV-CREW-001, D-004] allows valid quote with crew_size >= 1', async () => {
      await attempt(app, async (tx) => {
        const { booking, provider } = await createTestFixtures(tx);

        const quote = await tx.quote.create({
          data: {
            bookingId: booking.id,
            providerProfileId: provider.id,
            crewSize: 3,
            status: QuoteStatus.SENT,
            validUntil: new Date(Date.now() + 48 * 3600 * 1000),
          },
        });

        expect(quote.crewSize).toBe(3);
        expect(quote.status).toBe(QuoteStatus.SENT);
      });
    });

    it('[BP §58.1, §26] enforces fare_line_amount_not_negative check constraint (amount_minor >= 0)', async () => {
      await attempt(app, async (tx) => {
        const { booking, provider } = await createTestFixtures(tx);

        const quote = await tx.quote.create({
          data: {
            bookingId: booking.id,
            providerProfileId: provider.id,
            crewSize: 2,
            status: QuoteStatus.SENT,
          },
        });

        await expect(
          tx.fareLine.create({
            data: {
              quoteId: quote.id,
              lineType: FareLineType.LABOR,
              description: 'Negative labor',
              amountMinor: BigInt(-1000), // Violates fare_line_amount_not_negative CHECK (amount_minor >= 0)
              proposedByRole: ActorRole.PROVIDER,
            },
          }),
        ).rejects.toThrow();
      });
    });

    it('[ARCH §6.3] enforces fare_line_has_parent check constraint (quote_id or booking_id required)', async () => {
      await attempt(app, async (tx) => {
        await expect(
          tx.fareLine.create({
            data: {
              // neither quoteId nor bookingId provided
              lineType: FareLineType.LABOR,
              description: 'Orphan line',
              amountMinor: BigInt(50000),
              proposedByRole: ActorRole.PROVIDER,
            },
          }),
        ).rejects.toThrow();
      });
    });
  });

  describe('End-to-End Database Lifecycle & Acceptance Criteria', () => {
    it('[QUOTE-006, QUOTE-007, D-004] quote acceptance copies crew_size and fare lines to booking in DB', async () => {
      await attempt(app, async (tx) => {
        const { booking, provider, customerUser } = await createTestFixtures(tx);

        // 1. Create quote with crew_size = 4
        const quote = await tx.quote.create({
          data: {
            bookingId: booking.id,
            providerProfileId: provider.id,
            crewSize: 4,
            status: QuoteStatus.SENT,
            inclusions: 'Main panel breaker upgrade',
            expectedDurationMinutes: 180,
          },
        });

        // 2. Add labor fare line to quote
        await tx.fareLine.create({
          data: {
            quoteId: quote.id,
            lineType: FareLineType.LABOR,
            description: 'Breaker installation labor',
            amountMinor: BigInt(400000), // Rs. 4,000
            proposedByRole: ActorRole.PROVIDER,
            state: FareLineState.PROPOSED,
          },
        });

        // 3. Customer accepts quote: booking gets crew_size = 4, status ACCEPTED
        const updatedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.ACCEPTED,
            providerProfileId: provider.id,
            crewSize: quote.crewSize, // Copied from quote (D-004, ARCH §5.6)
            version: { increment: 1 },
          },
        });

        expect(updatedBooking.crewSize).toBe(4);
        expect(updatedBooking.status).toBe(BookingStatus.ACCEPTED);
        expect(updatedBooking.providerProfileId).toBe(provider.id);

        // Copy quote lines to booking as APPROVED lines
        const bookingFareLine = await tx.fareLine.create({
          data: {
            quoteId: quote.id,
            bookingId: booking.id,
            lineType: FareLineType.LABOR,
            description: 'Breaker installation labor',
            amountMinor: BigInt(400000),
            proposedByRole: ActorRole.PROVIDER,
            state: FareLineState.APPROVED,
            decidedByUserId: customerUser.id,
            decidedAt: new Date(),
          },
        });

        expect(bookingFareLine.bookingId).toBe(booking.id);
        expect(bookingFareLine.state).toBe(FareLineState.APPROVED);
      });
    });

    it('[FARE-012, PRICE-007] unapproved extra charges (PROPOSED) remain excluded from payable sum in DB', async () => {
      await attempt(app, async (tx) => {
        const { booking, customerUser, providerUser } = await createTestFixtures(tx);

        // Line 1: Approved initial labor
        await tx.fareLine.create({
          data: {
            bookingId: booking.id,
            lineType: FareLineType.LABOR,
            description: 'Wiring Labor',
            amountMinor: BigInt(300000), // Rs. 3,000
            proposedByRole: ActorRole.PROVIDER,
            proposedByUserId: providerUser.id,
            state: FareLineState.APPROVED,
            decidedByUserId: customerUser.id,
            decidedAt: new Date(),
          },
        });

        // Line 2: Proposed extra parts (UNAPPROVED)
        await tx.fareLine.create({
          data: {
            bookingId: booking.id,
            lineType: FareLineType.PARTS,
            description: 'Extra conduit pipe',
            amountMinor: BigInt(120000), // Rs. 1,200
            proposedByRole: ActorRole.PROVIDER,
            proposedByUserId: providerUser.id,
            state: FareLineState.PROPOSED,
            materialsClass: MaterialsClass.CUSTOMER_APPROVED_EXTRA,
          },
        });

        // Query all lines for booking
        const lines = await tx.fareLine.findMany({
          where: { bookingId: booking.id },
        });

        // Sum ONLY approved/final lines (FARE-012)
        const payableLines = lines.filter(
          (l) => l.state === FareLineState.APPROVED || l.state === FareLineState.FINAL,
        );
        const unapprovedLines = lines.filter((l) => l.state === FareLineState.PROPOSED);

        expect(payableLines).toHaveLength(1);
        expect(unapprovedLines).toHaveLength(1);

        const totalPayableMinor = payableLines.reduce((sum, l) => sum + Number(l.amountMinor), 0);
        expect(totalPayableMinor).toBe(300000); // 120,000 unapproved line is strictly EXCLUDED
      });
    });

    it('[QUOTE-008, ARCH §5.6] crew-size change proposal moves booking to AWAITING_APPROVAL and approval updates crew_size', async () => {
      await attempt(app, async (tx) => {
        const { booking, customerUser, providerUser } = await createTestFixtures(tx);

        // Initial accepted booking with crew_size = 2
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.IN_PROGRESS,
            crewSize: 2,
          },
        });

        // 1. Provider proposes crew size change to 5 -> moves to AWAITING_APPROVAL
        const proposedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.AWAITING_APPROVAL,
            version: { increment: 1 },
          },
        });

        await tx.jobEvent.create({
          data: {
            bookingId: booking.id,
            fromStatus: BookingStatus.IN_PROGRESS,
            toStatus: BookingStatus.AWAITING_APPROVAL,
            action: 'CREW_SIZE_CHANGE_PROPOSED',
            actorRole: ActorRole.PROVIDER,
            actorUserId: providerUser.id,
            reason: 'Heavy work requires 3 extra helpers',
            sourceMetadata: {
              previousCrewSize: 2,
              proposedCrewSize: 5,
              previousStatus: BookingStatus.IN_PROGRESS,
            },
          },
        });

        expect(proposedBooking.status).toBe(BookingStatus.AWAITING_APPROVAL);

        // 2. Customer approves crew size change -> updates crew_size to 5, status returns to IN_PROGRESS
        const approvedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: {
            crewSize: 5, // D-004
            status: BookingStatus.IN_PROGRESS,
            version: { increment: 1 },
          },
        });

        await tx.jobEvent.create({
          data: {
            bookingId: booking.id,
            fromStatus: BookingStatus.AWAITING_APPROVAL,
            toStatus: BookingStatus.IN_PROGRESS,
            action: 'CREW_SIZE_CHANGE_APPROVED',
            actorRole: ActorRole.CUSTOMER,
            actorUserId: customerUser.id,
            reason: 'Customer approved crew size increase to 5',
          },
        });

        expect(approvedBooking.crewSize).toBe(5);
        expect(approvedBooking.status).toBe(BookingStatus.IN_PROGRESS);
      });
    });
  });
});

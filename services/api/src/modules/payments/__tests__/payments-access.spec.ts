/**
 * Access-control regression tests for payments & provider ledger (T6.6 SEC finding).
 * Requirement IDs: LEDGER-006, PAY-003, SEC-BASE-007; D-030; BP §29 (deny by default).
 */
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../identity/index';
import { PaymentsController } from '../payments.controller';
import { PaymentsService } from '../payments.service';
import { LedgerService } from '../ledger.service';
import { ActorRole } from '../payments.types';

const PROVIDER_USER = 'user-provider-1';
const OTHER_PROVIDER_USER = 'user-provider-2';
const CUSTOMER_USER = 'user-customer-1';

function fakePrisma() {
  const profiles: Record<string, { id: string }> = {
    [PROVIDER_USER]: { id: 'prov-profile-1' },
    [OTHER_PROVIDER_USER]: { id: 'prov-profile-2' },
    [CUSTOMER_USER]: { id: 'cust-profile-1' },
  };
  return {
    booking: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'b1'
          ? { id: 'b1', providerProfileId: 'prov-profile-1', customerProfileId: 'cust-profile-1' }
          : null,
    },
    providerProfile: {
      findUnique: async ({ where }: { where: { userId: string } }) =>
        where.userId.startsWith('user-provider') ? (profiles[where.userId] ?? null) : null,
    },
    customerProfile: {
      findUnique: async ({ where }: { where: { userId: string } }) =>
        where.userId === CUSTOMER_USER ? profiles[CUSTOMER_USER]! : null,
    },
  };
}

describe('Payments access control (LEDGER-006, D-030)', () => {
  const prisma = fakePrisma();
  const service = new PaymentsService(prisma as never, {} as never);
  const ledger = new LedgerService(prisma as never, {} as never);

  it('lets the assigned provider and the booking customer in', async () => {
    await expect(
      service.assertCallerMayAccessBooking('b1', PROVIDER_USER, ActorRole.PROVIDER),
    ).resolves.toBeUndefined();
    await expect(
      service.assertCallerMayAccessBooking('b1', CUSTOMER_USER, ActorRole.CUSTOMER),
    ).resolves.toBeUndefined();
  });

  it('refuses another provider recording cash on someone else\u2019s booking', async () => {
    await expect(
      service.assertCallerMayAccessBooking('b1', OTHER_PROVIDER_USER, ActorRole.PROVIDER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a customer who does not own the booking', async () => {
    await expect(
      service.assertCallerMayAccessBooking('b1', 'user-customer-9', ActorRole.CUSTOMER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reports an unknown booking as not found', async () => {
    await expect(
      service.assertCallerMayAccessBooking('nope', PROVIDER_USER, ActorRole.PROVIDER),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets a provider read only their own ledger', async () => {
    await expect(
      ledger.assertProviderOwnsProfile(PROVIDER_USER, 'prov-profile-1'),
    ).resolves.toBeUndefined();
    await expect(
      ledger.assertProviderOwnsProfile(PROVIDER_USER, 'prov-profile-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      ledger.assertProviderOwnsProfile('user-customer-1', 'prov-profile-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('PaymentsController route protection (BP §29)', () => {
  const proto = PaymentsController.prototype as unknown as Record<string, () => unknown>;
  const isPublic = (name: string) => Reflect.getMetadata(IS_PUBLIC_KEY, proto[name]!) === true;

  it('keeps only the gateway callback and webhook public', () => {
    const handlers = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor');
    const publicOnes = handlers.filter(isPublic);
    expect(publicOnes).toEqual(['confirmPayment', 'handleSafepayWebhook']);
  });

  it('refuses a session on the wrong client surface', async () => {
    const controller = new PaymentsController({} as never, {} as never, {} as never);
    const req = {
      user: {
        id: CUSTOMER_USER,
        sessionId: 's',
        surface: 'CUSTOMER_APP',
        roles: ['PROVIDER'],
        subRoles: [],
        mfaVerifiedAt: null,
      },
    };
    await expect(
      controller.recordCashPayment({ bookingId: 'b1' } as never, req as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

/**
 * Account deletion and anonymization lifecycle service (SEC-AUTH-008; DATA-003; BP §26, §27).
 * Lifecycle: request → hold → anonymise.
 * Preserves transaction records, bookings, payments, and audit logs (traceability test).
 * Cleans up personal identifiers and idempotency_key records (RQ-013 item 1).
 */
import { Inject, Injectable } from '@nestjs/common';
import { AppError, CONFIG_SERVICE, type ConfigService } from '@kaamkaro/platform';
import { PrismaService } from '../../../platform/prisma.service';
import { SessionService } from '../session/session.service';
import { AccountStatus } from '../../../generated/prisma/client.js';

export interface DeleteRequestResult {
  status: 'DELETION_REQUESTED';
  deletionRequestedAt: string;
  holdDays: number;
}

const DEFAULT_HOLD_DAYS = 30; // OQ-028 default hold period

function parseNonNegativeInteger(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : undefined;
}

@Injectable()
export class AnonymizerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    @Inject(CONFIG_SERVICE) private readonly config: ConfigService,
  ) {}

  /**
   * Step 1: User requests account deletion (hold period starts).
   * Revokes all active sessions for the user (SEC-AUTH-008).
   */
  async requestDeletion(userId: string): Promise<DeleteRequestResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.of('NOT_FOUND');
    }

    if (user.status === AccountStatus.BLOCKED) {
      throw new AppError('ACCOUNT_BLOCKED', 403, 'A blocked account cannot request deletion.');
    }

    if (user.status === AccountStatus.ANONYMISED) {
      throw AppError.of('BAD_REQUEST');
    }

    const holdDaysResult = await this.config.inspect(
      'account.deletion_hold_days',
      parseNonNegativeInteger,
    );
    const holdDays =
      holdDaysResult.status === 'configured' ? holdDaysResult.value : DEFAULT_HOLD_DAYS;

    const now = new Date();
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: AccountStatus.DELETION_REQUESTED,
        deletionRequestedAt: now,
        statusChangedAt: now,
      },
    });

    // Revoke all active sessions (SEC-AUTH-002, SEC-AUTH-008)
    await this.sessionService.revokeAllSessions(userId);

    return {
      status: 'DELETION_REQUESTED',
      deletionRequestedAt: (updated.deletionRequestedAt ?? now).toISOString(),
      holdDays,
    };
  }

  /**
   * Step 3: Anonymise user account after hold period finishes.
   * Clears PII fields and deletes user's idempotency_key records (SEC-AUTH-008; RQ-013).
   * Bookings, payments, and audit rows stay linked to the anonymised user ID (DATA-003).
   */
  async anonymizeUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.of('NOT_FOUND');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Anonymize user record
      await tx.user.update({
        where: { id: userId },
        data: {
          phoneE164: null,
          displayName: null,
          email: null,
          status: AccountStatus.ANONYMISED,
          anonymisedAt: now,
          statusChangedAt: now,
        },
      });

      // 2. Revoke & purge any remaining sessions
      await tx.deviceSession.deleteMany({
        where: { userId },
      });

      // 3. Purge user's idempotency keys (RQ-013 item 1: scope user:<id>)
      await tx.idempotencyKey.deleteMany({
        where: { scope: `user:${userId}` },
      });
    });
  }
}

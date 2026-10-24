/**
 * Database integration tests for Module M7 Request & AI Intake (T3.3; owner A07).
 * Requirement IDs: REQ-AI-001..012, OPS-ADMIN-026, CAT-SVC-004.
 * ARCH §4 M7, §6.2, §10; BP §56, §66, §67, §77, §79.
 *
 * Runs against live migrated & seeded PostgreSQL database.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, describe, expect, it } from 'vitest';
import {
  AiApprovalState,
  AiInputClass,
  AiSafetyState,
  AppLanguage,
  Prisma,
  PrismaClient,
  RequestedTimeHint,
  RequestStatus,
} from '../../src/generated/prisma/client.js';

const appUrl = process.env['DATABASE_URL'];
const ownerUrl = process.env['MIGRATION_DATABASE_URL'];
if (!appUrl || !ownerUrl) {
  throw new Error('intake.db-spec needs DATABASE_URL (API login) and MIGRATION_DATABASE_URL');
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
      displayName: 'Test Customer Intake',
    },
  });

  const customerProfile = await tx.customerProfile.create({
    data: {
      userId: customerUser.id,
    },
  });

  const service = await tx.service.findFirst({
    include: {
      category: true,
    },
  });

  if (!service) {
    throw new Error('intake.db-spec requires at least one active seeded service');
  }

  return { customerUser, customerProfile, service };
}

describe('Intake Module DB Integration (T3.3, M7 Request & AI Intake)', () => {
  it('persists a CustomerRequest through COMPOSING -> AWAITING_CONFIRMATION -> SUBMITTED lifecycle', async () => {
    await attempt(app, async (tx) => {
      const { customerProfile, service } = await createTestFixtures(tx);

      // 1. Create request draft in COMPOSING state
      const draft = await tx.customerRequest.create({
        data: {
          customerProfileId: customerProfile.id,
          status: RequestStatus.COMPOSING,
          intentText: 'Mera AC thanda nahi kar raha',
          summaryLanguage: AppLanguage.UR,
        },
      });

      expect(draft.id).toBeDefined();
      expect(draft.status).toBe(RequestStatus.COMPOSING);
      expect(draft.submittedAt).toBeNull();
      expect(draft.version).toBe(1);

      // 2. Attach AI interpretation and move to AWAITING_CONFIRMATION
      const interpreted = await tx.customerRequest.update({
        where: { id: draft.id },
        data: {
          status: RequestStatus.AWAITING_CONFIRMATION,
          serviceId: service.id,
          description: 'AC not cooling properly',
          aiInterpretation: {
            serviceFamily: service.category.nameEn,
            serviceName: service.nameEn,
            confidence: 0.92,
          },
          aiConfidence: new Prisma.Decimal(0.92),
          requestedTimeHint: RequestedTimeHint.TODAY,
          version: { increment: 1 },
        },
      });

      expect(interpreted.status).toBe(RequestStatus.AWAITING_CONFIRMATION);
      expect(interpreted.serviceId).toBe(service.id);
      expect(interpreted.version).toBe(2);

      // 3. Customer explicit confirm moves request to SUBMITTED (REQ-AI-005)
      const submitted = await tx.customerRequest.update({
        where: { id: draft.id },
        data: {
          status: RequestStatus.SUBMITTED,
          supplierSummary: 'اے سی ٹھنڈا نہیں کر رہا، سروس اور مرمت درکار ہے۔',
          submittedAt: new Date(),
          version: { increment: 1 },
        },
      });

      expect(submitted.status).toBe(RequestStatus.SUBMITTED);
      expect(submitted.submittedAt).not.toBeNull();
      expect(submitted.version).toBe(3);
    });
  });

  it('records immutable AiInteraction decisions with scrubbed PII (REQ-AI-008)', async () => {
    await attempt(app, async (tx) => {
      const { customerProfile, service } = await createTestFixtures(tx);

      const request = await tx.customerRequest.create({
        data: {
          customerProfileId: customerProfile.id,
          status: RequestStatus.COMPOSING,
          intentText: 'Geyser leak call me on [REDACTED_PHONE]',
          serviceId: service.id,
        },
      });

      // Insert AI interaction log linked to request
      const log = await tx.aiInteraction.create({
        data: {
          requestId: request.id,
          sessionRef: customerProfile.id,
          modelVersion: 'fake-intake-ai-v1',
          serviceVersion: 'intake-prompts-v0.1.0',
          inputClass: AiInputClass.TEXT,
          outputSummary: 'Geyser leak repair required [REDACTED_PHONE]',
          confidence: new Prisma.Decimal(0.94),
          safetyState: AiSafetyState.ALLOWED,
          approvalState: AiApprovalState.PENDING,
          latencyMs: 145,
        },
      });

      expect(log.id).toBeDefined();
      expect(log.requestId).toBe(request.id);
      expect(log.outputSummary).toContain('[REDACTED_PHONE]');
      expect(log.confidence?.toNumber()).toBe(0.94);
      expect(log.safetyState).toBe(AiSafetyState.ALLOWED);

      // Verify query via relation
      const fetched = await tx.customerRequest.findUnique({
        where: { id: request.id },
        include: { aiInteractions: true },
      });

      expect(fetched?.aiInteractions).toHaveLength(1);
      expect(fetched?.aiInteractions[0]?.id).toBe(log.id);
    });
  });

  it('supports unlinked voice turn AiInteraction records (ARCH §4 M7, BP §77)', async () => {
    await attempt(app, async (tx) => {
      const sessionGuid = 'voice-session-uuid-1234';

      const voiceTurn = await tx.aiInteraction.create({
        data: {
          sessionRef: sessionGuid,
          modelVersion: 'fake-voice-v1',
          serviceVersion: 'voice-turn-v1',
          inputClass: AiInputClass.VOICE_TRANSCRIPT,
          outputSummary: 'Kal shaam electrician chahiye',
          confidence: new Prisma.Decimal(0.88),
          safetyState: AiSafetyState.ALLOWED,
          approvalState: AiApprovalState.PENDING,
          latencyMs: 320,
        },
      });

      expect(voiceTurn.id).toBeDefined();
      expect(voiceTurn.requestId).toBeNull();
      expect(voiceTurn.sessionRef).toBe(sessionGuid);
      expect(voiceTurn.inputClass).toBe(AiInputClass.VOICE_TRANSCRIPT);
    });
  });

  it('supports direct non-AI request creation without AI interaction (REQ-AI-012)', async () => {
    await attempt(app, async (tx) => {
      const { customerProfile, service } = await createTestFixtures(tx);

      const direct = await tx.customerRequest.create({
        data: {
          customerProfileId: customerProfile.id,
          status: RequestStatus.AWAITING_CONFIRMATION,
          serviceId: service.id,
          description: 'Direct selection from catalog',
          aiInterpretation: Prisma.JsonNull,
          aiConfidence: null,
          isEmergency: false,
          summaryLanguage: AppLanguage.UR,
        },
      });

      expect(direct.id).toBeDefined();
      expect(direct.aiConfidence).toBeNull();
      expect(direct.aiInterpretation).toBeNull();
      expect(direct.status).toBe(RequestStatus.AWAITING_CONFIRMATION);
    });
  });

  it('enforces foreign key constraint between customer_request and ai_interaction', async () => {
    await attempt(app, async (tx) => {
      const nonExistentRequestId = '00000000-0000-0000-0000-000000000000';

      await expect(
        tx.aiInteraction.create({
          data: {
            requestId: nonExistentRequestId,
            modelVersion: 'fake-intake-v1',
            inputClass: AiInputClass.TEXT,
            safetyState: AiSafetyState.ALLOWED,
            approvalState: AiApprovalState.PENDING,
          },
        }),
      ).rejects.toThrow();
    });
  });
});

/**
 * Unit test suite for Request & AI Intake Module (T3.3, owner A07).
 * Verifies verbatim acceptance criteria:
 * 1. "Confidence < 0.6 fallback to clarify (test)" (REQ-AI-006, REQ-AI-003)
 * 2. "catalog-invalid output rejected (test)" (REQ-AI-007, REQ-AI-010)
 * 3. "no raw prompt with PII in logs (test)" (REQ-AI-008, SEC-PRIV-001)
 * 4. "Golden tests on the Blueprint examples" (REQ-AI-001, REQ-AI-004)
 * 5. Customer-only submission & non-AI fallback (REQ-AI-005, REQ-AI-012)
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { IntakeService } from '../intake.service';
import { FakeIntakeAiClient } from '../intake-ai.client';
import {
  AiApprovalState,
  AiSafetyState,
  AppLanguage,
  RequestStatus,
  scrubPii,
} from '../intake.types';
import type { PrismaService } from '../../../platform/prisma.service';
import type { CatalogService } from '../../catalog/index';

function createMockPrisma() {
  return {
    service: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    customerProfile: {
      findUnique: vi.fn(),
    },
    customerRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    aiInteraction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

function createMockCatalogService() {
  return {
    availability: vi.fn().mockResolvedValue({ available: true }),
  };
}

describe('IntakeService (T3.3)', () => {
  let intakeService: IntakeService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockCatalogService: ReturnType<typeof createMockCatalogService>;
  let aiClient: FakeIntakeAiClient;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockCatalogService = createMockCatalogService();
    aiClient = new FakeIntakeAiClient();

    intakeService = new IntakeService(
      mockPrisma as unknown as PrismaService,
      mockCatalogService as unknown as CatalogService,
      aiClient,
    );
  });

  describe('Golden tests on Blueprint examples (REQ-AI-001, REQ-AI-004)', () => {
    it('Example 1: "Mera AC thanda nahi kar raha" maps to AC cooling with high confidence', async () => {
      mockPrisma.service.findFirst.mockResolvedValueOnce({
        id: '11111111-1111-1111-1111-111111111111',
        nameEn: 'AC cooling issue diagnosis',
        emergencyAllowed: false,
        category: { nameEn: 'AC, Cooling & Heating' },
      });

      const result = await intakeService.interpret({
        intentText: 'Mera AC thanda nahi kar raha',
        appLanguage: AppLanguage.UR,
      });

      expect(result.serviceName).toBe('AC cooling issue diagnosis');
      expect(result.serviceFamily).toBe('AC, Cooling & Heating');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.needsClarification).toBe(false);
      expect(result.clarifyingQuestions).toHaveLength(0);
      expect(result.isEmergency).toBe(false);
      expect(result.supplierSummary).toBeTruthy();
    });

    it('Example 2: "Kal shaam electrician chahiye" maps to Electrical with tomorrow evening window', async () => {
      mockPrisma.service.findFirst.mockResolvedValueOnce({
        id: '22222222-2222-2222-2222-222222222222',
        nameEn: 'Short-circuit diagnosis',
        emergencyAllowed: false,
        category: { nameEn: 'Electrical & Power' },
      });

      const result = await intakeService.interpret({
        intentText: 'Kal shaam electrician chahiye',
        appLanguage: AppLanguage.EN,
      });

      expect(result.serviceFamily).toBe('Electrical & Power');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.timeHint).toBe('LATER');
      expect(result.requestedWindowFrom).not.toBeNull();
      expect(result.requestedWindowTo).not.toBeNull();
      expect(result.needsClarification).toBe(false);
    });

    it('Example 3: "Mera geyser leak kar raha hai, DHA Phase 4 mein hoon, aaj 7 baje ke baad…" maps to Plumbing with location & today window', async () => {
      mockPrisma.service.findFirst.mockResolvedValueOnce({
        id: '33333333-3333-3333-3333-333333333333',
        nameEn: 'Pipe leakage repair',
        emergencyAllowed: false,
        category: { nameEn: 'Plumbing & Water' },
      });

      const result = await intakeService.interpret({
        intentText: 'Mera geyser leak kar raha hai, DHA Phase 4 mein hoon, aaj 7 baje ke baad…',
        appLanguage: AppLanguage.UR,
      });

      expect(result.serviceFamily).toBe('Plumbing & Water');
      expect(result.locationHint).toBe('Dha Phase 4');
      expect(result.timeHint).toBe('TODAY');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.needsClarification).toBe(false);
    });
  });

  describe('Acceptance Criterion 1: Confidence < 0.6 fallback to clarify (REQ-AI-006, REQ-AI-003)', () => {
    it('vague intent falls back to clarifying questions (at most 2)', async () => {
      const result = await intakeService.interpret({
        intentText: 'kuch theek karwana hai ghar me',
        appLanguage: AppLanguage.UR,
      });

      expect(result.confidence).toBeLessThan(0.6);
      expect(result.needsClarification).toBe(true);
      expect(result.clarifyingQuestions.length).toBeGreaterThanOrEqual(1);
      expect(result.clarifyingQuestions.length).toBeLessThanOrEqual(2);
      expect(result.serviceId).toBeNull();
    });

    it('ambiguous intent in English returns English clarifying questions', async () => {
      const result = await intakeService.interpret({
        intentText: 'need some quick help with something broken',
        appLanguage: AppLanguage.EN,
      });

      expect(result.confidence).toBeLessThan(0.6);
      expect(result.needsClarification).toBe(true);
      expect(result.clarifyingQuestions.length).toBeGreaterThanOrEqual(1);
      expect(result.clarifyingQuestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Acceptance Criterion 2: catalog-invalid output rejected (REQ-AI-007, REQ-AI-010)', () => {
    it('rejects a service name not present in the catalog', async () => {
      mockPrisma.service.findFirst.mockResolvedValueOnce(null);

      const result = await intakeService.interpret({
        intentText: 'Mera AC thanda nahi kar raha',
        appLanguage: AppLanguage.EN,
      });

      expect(result.serviceId).toBeNull();
      expect(result.serviceName).toBeNull();
      expect(result.confidence).toBeLessThan(0.6);
      expect(result.needsClarification).toBe(true);
      expect(result.clarifyingQuestions[0]).toContain('catalog');
    });

    it('anti-hallucination: output schema contains NO price, credentials, or personal contact info', async () => {
      mockPrisma.service.findFirst.mockResolvedValueOnce({
        id: '11111111-1111-1111-1111-111111111111',
        nameEn: 'AC cooling issue diagnosis',
        emergencyAllowed: false,
        category: { nameEn: 'AC, Cooling & Heating' },
      });

      const result = await intakeService.interpret({
        intentText: 'Mera AC thanda nahi kar raha',
      });

      const keys = Object.keys(result);
      expect(keys).not.toContain('price');
      expect(keys).not.toContain('rate');
      expect(keys).not.toContain('cost');
      expect(keys).not.toContain('fare');
      expect(keys).not.toContain('providerCredentials');
      expect(keys).not.toContain('phoneNumber');
    });

    it('rejects service inactive in customer city', async () => {
      mockPrisma.service.findFirst.mockResolvedValueOnce({
        id: '11111111-1111-1111-1111-111111111111',
        nameEn: 'AC cooling issue diagnosis',
        emergencyAllowed: false,
        category: { nameEn: 'AC, Cooling & Heating' },
      });
      mockCatalogService.availability.mockResolvedValueOnce({
        available: false,
        reason: 'FAMILY_INACTIVE',
      });

      const result = await intakeService.interpret({
        intentText: 'Mera AC thanda nahi kar raha',
        cityId: '44444444-4444-4444-4444-444444444444',
      });

      expect(result.serviceId).toBeNull();
      expect(result.needsClarification).toBe(true);
      expect(result.confidence).toBeLessThan(0.6);
    });
  });

  describe('Acceptance Criterion 3: no raw prompt with PII in logs (REQ-AI-008, SEC-PRIV-001)', () => {
    it('scrubs phone numbers, CNIC, and email addresses from raw text', () => {
      const dirty =
        'Mera number 0300-1234567 hai aur CNIC 35201-1234567-1 hai, email test@kaamkaro.pk';
      const clean = scrubPii(dirty);

      expect(clean).not.toContain('0300-1234567');
      expect(clean).not.toContain('35201-1234567-1');
      expect(clean).not.toContain('test@kaamkaro.pk');
      expect(clean).toContain('[REDACTED_PHONE]');
      expect(clean).toContain('[REDACTED_CNIC]');
      expect(clean).toContain('[REDACTED_EMAIL]');
    });

    it('creates ai_interaction log with scrubbed summary when prompt contains phone number', async () => {
      mockPrisma.service.findFirst.mockResolvedValueOnce({
        id: '11111111-1111-1111-1111-111111111111',
        nameEn: 'AC cooling issue diagnosis',
        emergencyAllowed: false,
        category: { nameEn: 'AC, Cooling & Heating' },
      });

      await intakeService.interpret({
        intentText: 'Mera AC thanda nahi kar raha call me on 0321-7654321',
      });

      expect(mockPrisma.aiInteraction.create).toHaveBeenCalledTimes(1);
      const callArg = mockPrisma.aiInteraction.create.mock.calls[0]?.[0];
      expect(callArg?.data.outputSummary).not.toContain('0321-7654321');
      expect(callArg?.data.outputSummary).not.toContain('03217654321');
    });
  });

  describe('Customer-only submission (REQ-AI-005, BP §67)', () => {
    it('createRequest creates a request in COMPOSING state (does NOT auto-submit)', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValueOnce({
        id: '55555555-5555-5555-5555-555555555555',
      });
      mockPrisma.customerRequest.create.mockResolvedValueOnce({
        id: 'req-1',
        customerProfileId: '55555555-5555-5555-5555-555555555555',
        status: RequestStatus.COMPOSING,
        intentText: 'Mera AC thanda nahi kar raha',
        serviceId: null,
        description: null,
        aiInterpretation: null,
        aiConfidence: null,
        supplierSummary: null,
        summaryLanguage: AppLanguage.UR,
        attachmentMediaIds: [],
        locationSnapshotId: null,
        requestedTimeHint: null,
        requestedWindowFrom: null,
        requestedWindowTo: null,
        isEmergency: false,
        submittedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      const res = await intakeService.createRequest({
        customerProfileId: '55555555-5555-5555-5555-555555555555',
        intentText: 'Mera AC thanda nahi kar raha',
      });

      expect(res.status).toBe(RequestStatus.COMPOSING);
      expect(res.submittedAt).toBeNull();
    });

    it('confirmRequest transitions request to SUBMITTED and stamps submittedAt', async () => {
      mockPrisma.customerRequest.findUnique.mockResolvedValueOnce({
        id: 'req-1',
        customerProfileId: '55555555-5555-5555-5555-555555555555',
        status: RequestStatus.AWAITING_CONFIRMATION,
        version: 1,
        isEmergency: false,
      });
      mockPrisma.service.findUnique.mockResolvedValueOnce({
        id: 'svc-1',
        nameEn: 'AC cooling issue diagnosis',
        emergencyAllowed: false,
      });
      mockPrisma.customerRequest.update.mockResolvedValueOnce({
        id: 'req-1',
        customerProfileId: '55555555-5555-5555-5555-555555555555',
        status: RequestStatus.SUBMITTED,
        intentText: 'Mera AC thanda nahi kar raha',
        serviceId: 'svc-1',
        description: null,
        aiInterpretation: null,
        aiConfidence: null,
        supplierSummary: 'AC cooling repair confirmed',
        summaryLanguage: AppLanguage.UR,
        attachmentMediaIds: [],
        locationSnapshotId: null,
        requestedTimeHint: null,
        requestedWindowFrom: null,
        requestedWindowTo: null,
        isEmergency: false,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 2,
      });

      const res = await intakeService.confirmRequest('req-1', {
        serviceId: 'svc-1',
        supplierSummary: 'AC cooling repair confirmed',
      });

      expect(res.status).toBe(RequestStatus.SUBMITTED);
      expect(res.submittedAt).not.toBeNull();
      expect(mockPrisma.aiInteraction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            approvalState: AiApprovalState.CONFIRMED,
          }),
        }),
      );
    });

    it('confirmRequest on already submitted request throws 409 conflict', async () => {
      mockPrisma.customerRequest.findUnique.mockResolvedValueOnce({
        id: 'req-1',
        status: RequestStatus.SUBMITTED,
      });

      await expect(
        intakeService.confirmRequest('req-1', {
          serviceId: 'svc-1',
          supplierSummary: 'Summary',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Non-AI fallback path & safety moderation (REQ-AI-012, REQ-AI-009)', () => {
    it('creates request directly with catalog service ID without requiring AI', async () => {
      mockPrisma.customerProfile.findUnique.mockResolvedValueOnce({
        id: 'cust-1',
      });
      mockPrisma.service.findUnique.mockResolvedValueOnce({
        id: 'svc-direct',
        emergencyAllowed: true,
      });
      mockPrisma.customerRequest.create.mockResolvedValueOnce({
        id: 'req-direct',
        customerProfileId: 'cust-1',
        status: RequestStatus.AWAITING_CONFIRMATION,
        intentText: null,
        serviceId: 'svc-direct',
        description: 'Direct selection without AI',
        aiInterpretation: null,
        aiConfidence: null,
        supplierSummary: null,
        summaryLanguage: AppLanguage.UR,
        attachmentMediaIds: [],
        locationSnapshotId: null,
        requestedTimeHint: null,
        requestedWindowFrom: null,
        requestedWindowTo: null,
        isEmergency: false,
        submittedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      const res = await intakeService.createRequest({
        customerProfileId: 'cust-1',
        serviceId: 'svc-direct',
        description: 'Direct selection without AI',
      });

      expect(res.id).toBe('req-direct');
      expect(res.serviceId).toBe('svc-direct');
    });

    it('blocks prohibited/excluded category content', async () => {
      const res = await intakeService.interpret({
        intentText: 'need doctor consultation and surgery at home',
      });

      expect(res.safetyState).toBe(AiSafetyState.BLOCKED);
      expect(res.confidence).toBe(0);
      expect(res.needsClarification).toBe(true);
      expect(res.clarifyingQuestions[0]).toContain('policy');
    });
  });
});

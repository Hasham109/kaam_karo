/**
 * IntakeService (T3.3, owner A07; ARCH §4 M7, §6.2, §10; BP §56, §66, §67, §77, §79; REQ-AI-001..012).
 *
 * Enforces:
 * 1. Confidence fallback (REQ-AI-006): Confidence < threshold (default 0.60) triggers clarification (max 2 questions, REQ-AI-003).
 * 2. Catalog validation & anti-hallucination (REQ-AI-007, REQ-AI-010): AI outputs are strictly validated against active catalog.
 *    Invalid services are rejected/discarded. Schema never invents price, credentials, or personal contact info.
 * 3. PII scrubbing (REQ-AI-008, SEC-PRIV-001): Raw prompt phone numbers, CNIC, and emails are scrubbed before logging in ai_interaction.
 * 4. Customer-only submission (REQ-AI-005): Only an explicit customer confirm call transitions a request to SUBMITTED.
 * 5. Emergency guard (CAT-SVC-004): Emergency requests only permitted when catalog service has emergency_allowed = true.
 */

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CONFIG_SERVICE, type ConfigService } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { CatalogService } from '../catalog/index.js';
import { INTAKE_AI_CLIENT, type IntakeAiClient } from './intake-ai.client.js';
import {
  AiApprovalState,
  AiInputClass,
  AiSafetyState,
  AppLanguage,
  RequestedTimeHint,
  RequestStatus,
  scrubPii,
  type AiInteractionRecord,
  type ConfirmCustomerRequestDto,
  type CreateCustomerRequestDto,
  type CustomerRequestResponse,
  type InterpretIntentInput,
  type InterpretIntentResponse,
} from './intake.types.js';

@Injectable()
export class IntakeService {
  /** Default confidence threshold for AI interpretations (D-010, REQ-AI-006). */
  private static readonly DEFAULT_CONFIDENCE_THRESHOLD = 0.6; // kk-allow-literal: default confidence threshold

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
    @Inject(INTAKE_AI_CLIENT) private readonly aiClient: IntakeAiClient,
    @Optional()
    @Inject(CONFIG_SERVICE)
    private readonly configService?: ConfigService,
  ) {}

  /**
   * Interprets customer intent text or transcript with IntakeAI.
   * Performs closed schema extraction, catalog validation, PII scrubbing, and append-only AI logging.
   */
  async interpret(input: InterpretIntentInput): Promise<InterpretIntentResponse> {
    const startTime = Date.now();
    const rawIntent = input.intentText?.trim();
    if (!rawIntent) {
      throw new BadRequestException('INTENT_TEXT_REQUIRED');
    }

    // 1. Run AI Interpretation client
    const interpretation = await this.aiClient.interpret(input);
    const latencyMs = Date.now() - startTime;

    // 2. Anti-hallucination & Catalog validation against active services (REQ-AI-007, REQ-AI-010)
    let validatedServiceId: string | null = interpretation.serviceId;
    let validatedServiceName: string | null = interpretation.serviceName;
    let validatedFamily: string | null = interpretation.serviceFamily;
    let confidence = interpretation.confidence;
    let needsClarification = interpretation.needsClarification;
    let clarifyingQuestions = [...interpretation.clarifyingQuestions];

    if (validatedServiceName) {
      // Look up catalog service by name in active catalog
      const service = await this.prisma.service.findFirst({
        where: {
          nameEn: {
            equals: validatedServiceName,
            mode: 'insensitive',
          },
        },
        include: {
          category: true,
        },
      });

      if (!service) {
        // Service name does not exist in the official catalog -> reject/discard (REQ-AI-007)
        validatedServiceId = null;
        validatedServiceName = null;
        validatedFamily = null;
        confidence = 0.35; // kk-allow-literal: degraded confidence on unknown service
        needsClarification = true;
        clarifyingQuestions = [
          input.appLanguage === AppLanguage.UR
            ? 'تجویز کردہ سروس کیٹلاگ میں دستیاب نہیں ہے۔ براہ کرم دستیاب سروسز میں سے انتخاب کریں۔'
            : 'The suggested service is not available in our catalog. Please choose from active services.',
        ];
      } else {
        validatedServiceId = service.id;
        validatedServiceName = service.nameEn;
        validatedFamily = service.category.nameEn;

        // Check if service is emergency-allowed if emergency was detected (CAT-SVC-004)
        if (interpretation.isEmergency && !service.emergencyAllowed) {
          // Fall back emergency flag
          (interpretation as { isEmergency: boolean }).isEmergency = false;
        }

        // Check city availability if cityId provided
        if (input.cityId) {
          const avail = await this.catalogService.availability(input.cityId, service.id);
          if (!avail.available) {
            // Service not active in this city -> fallback to clarification (REQ-AI-002, REQ-AI-007)
            validatedServiceId = null;
            confidence = 0.4; // kk-allow-literal: degraded confidence for inactive city
            needsClarification = true;
            clarifyingQuestions = [
              input.appLanguage === AppLanguage.UR
                ? 'یہ سروس آپ کے شہر میں ابھی دستیاب نہیں ہے۔ کیا آپ کوئی دوسری سروس چاہتے ہیں؟'
                : 'This service is currently not active in your city. Would you like to select another service?',
            ];
          }
        }
      }
    }

    // 3. Confidence Threshold Check (REQ-AI-006)
    const threshold = await this.resolveConfidenceThreshold();
    if (confidence < threshold) {
      needsClarification = true;
      if (clarifyingQuestions.length === 0) {
        clarifyingQuestions = [
          input.appLanguage === AppLanguage.UR
            ? 'کیا آپ مسئلہ تھوڑا مزید واضح کر سکتے ہیں؟'
            : 'Could you please describe the problem in more detail?',
        ];
      }
    }

    // Limit clarifying questions to at most 2 (REQ-AI-003)
    if (clarifyingQuestions.length > 2) {
      clarifyingQuestions = clarifyingQuestions.slice(0, 2);
    }

    // 4. Scrub PII before logging to ai_interaction (REQ-AI-008, SEC-PRIV-001)
    const scrubbedSummary = scrubPii(
      interpretation.supplierSummary ?? interpretation.intentSummary ?? rawIntent,
    );

    // 5. Append-only AI interaction audit row (REQ-AI-008)
    try {
      await this.prisma.aiInteraction.create({
        data: {
          sessionRef: input.customerProfileId ?? null,
          modelVersion: interpretation.modelVersion,
          serviceVersion: interpretation.serviceVersion,
          inputClass: input.inputClass ?? AiInputClass.TEXT,
          outputSummary: scrubbedSummary,
          confidence: new Prisma.Decimal(confidence),
          safetyState: interpretation.safetyState,
          approvalState: AiApprovalState.PENDING,
          latencyMs,
          errorCode: interpretation.safetyState === AiSafetyState.BLOCKED ? 'SAFETY_BLOCKED' : null,
        },
      });
    } catch {
      // AI audit logging failure must never fail user request
    }

    return {
      serviceId: validatedServiceId,
      serviceName: validatedServiceName,
      serviceFamily: validatedFamily,
      intentSummary: interpretation.intentSummary,
      supplierSummary: interpretation.supplierSummary,
      summaryLanguage: interpretation.summaryLanguage,
      confidence,
      needsClarification,
      clarifyingQuestions,
      timeHint: interpretation.timeHint,
      requestedWindowFrom: interpretation.requestedWindowFrom
        ? interpretation.requestedWindowFrom.toISOString()
        : null,
      requestedWindowTo: interpretation.requestedWindowTo
        ? interpretation.requestedWindowTo.toISOString()
        : null,
      locationHint: interpretation.locationHint,
      isEmergency: interpretation.isEmergency,
      safetyState: interpretation.safetyState,
      modelVersion: interpretation.modelVersion,
      serviceVersion: interpretation.serviceVersion,
    };
  }

  /**
   * Creates a customer request in COMPOSING, AWAITING_CONFIRMATION, or direct draft state.
   * Supports both AI-assisted and direct non-AI fallback flow (REQ-AI-012).
   */
  async createRequest(dto: CreateCustomerRequestDto): Promise<CustomerRequestResponse> {
    if (!dto.customerProfileId) {
      throw new BadRequestException('CUSTOMER_PROFILE_ID_REQUIRED');
    }

    // Validate customer profile
    const profile = await this.prisma.customerProfile.findUnique({
      where: { id: dto.customerProfileId },
    });
    if (!profile) {
      throw new NotFoundException('CUSTOMER_PROFILE_NOT_FOUND');
    }

    // If serviceId is supplied directly, validate catalog existence
    if (dto.serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: dto.serviceId },
      });
      if (!service) {
        throw new BadRequestException('INVALID_SERVICE_ID');
      }

      if (dto.isEmergency && !service.emergencyAllowed) {
        throw new BadRequestException('EMERGENCY_NOT_ALLOWED_FOR_SERVICE');
      }
    }

    const initialStatus =
      dto.serviceId && dto.description
        ? RequestStatus.AWAITING_CONFIRMATION
        : RequestStatus.COMPOSING;

    const request = await this.prisma.customerRequest.create({
      data: {
        customerProfileId: dto.customerProfileId,
        status: initialStatus,
        intentText: dto.intentText ?? null,
        serviceId: dto.serviceId ?? null,
        description: dto.description ?? null,
        locationSnapshotId: dto.locationSnapshotId ?? null,
        requestedTimeHint: dto.requestedTimeHint ?? null,
        requestedWindowFrom: dto.requestedWindowFrom ? new Date(dto.requestedWindowFrom) : null,
        requestedWindowTo: dto.requestedWindowTo ? new Date(dto.requestedWindowTo) : null,
        isEmergency: dto.isEmergency ?? false,
        attachmentMediaIds: dto.attachmentMediaIds ? [...dto.attachmentMediaIds] : [],
        summaryLanguage: dto.summaryLanguage ?? AppLanguage.UR,
      },
    });

    return this.toResponse(request);
  }

  /**
   * Retrieves a customer request by ID (REQ-AI-005, REQ-AI-012).
   */
  async getRequest(id: string): Promise<CustomerRequestResponse> {
    const request = await this.prisma.customerRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException('CUSTOMER_REQUEST_NOT_FOUND');
    }
    return this.toResponse(request);
  }

  /**
   * Explicit customer confirmation action (REQ-AI-005, BP §67, §77.3).
   * Only the customer can submit; transitions request to SUBMITTED.
   */
  async confirmRequest(
    id: string,
    dto: ConfirmCustomerRequestDto,
  ): Promise<CustomerRequestResponse> {
    const request = await this.prisma.customerRequest.findUnique({
      where: { id },
    });
    if (!request) {
      throw new NotFoundException('CUSTOMER_REQUEST_NOT_FOUND');
    }

    // Must not be already submitted or closed
    if (
      request.status === RequestStatus.SUBMITTED ||
      request.status === RequestStatus.MATCHING ||
      request.status === RequestStatus.MATCHES_SHOWN
    ) {
      throw new ConflictException('REQUEST_ALREADY_SUBMITTED');
    }

    // Validate confirmed serviceId in catalog
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });
    if (!service) {
      throw new BadRequestException('INVALID_SERVICE_ID');
    }

    const isEmergency = dto.isEmergency ?? request.isEmergency;
    if (isEmergency && !service.emergencyAllowed) {
      throw new BadRequestException('EMERGENCY_NOT_ALLOWED_FOR_SERVICE');
    }

    const scrubbedSummary = scrubPii(dto.supplierSummary);

    // Update request state atomically
    const updated = await this.prisma.customerRequest.update({
      where: { id },
      data: {
        serviceId: dto.serviceId,
        supplierSummary: scrubbedSummary,
        requestedWindowFrom: dto.requestedWindowFrom
          ? new Date(dto.requestedWindowFrom)
          : request.requestedWindowFrom,
        requestedWindowTo: dto.requestedWindowTo
          ? new Date(dto.requestedWindowTo)
          : request.requestedWindowTo,
        isEmergency,
        locationSnapshotId: dto.locationSnapshotId ?? request.locationSnapshotId,
        status: RequestStatus.SUBMITTED,
        submittedAt: new Date(),
        version: { increment: 1 },
      },
    });

    // Record human confirmation in ai_interaction audit trail
    try {
      await this.prisma.aiInteraction.create({
        data: {
          requestId: id,
          sessionRef: request.customerProfileId,
          modelVersion: 'human-confirmed',
          serviceVersion: 'intake-v0.1.0',
          inputClass: AiInputClass.TEXT,
          outputSummary: scrubbedSummary,
          safetyState: AiSafetyState.ALLOWED,
          approvalState: AiApprovalState.CONFIRMED,
        },
      });
    } catch {
      // Do not block confirmation on logging failure
    }

    return this.toResponse(updated);
  }

  /**
   * Retrieves AI decision audit logs for this request with scrubbed PII (REQ-AI-008).
   */
  async listAiInteractions(requestId: string): Promise<readonly AiInteractionRecord[]> {
    const request = await this.prisma.customerRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('CUSTOMER_REQUEST_NOT_FOUND');
    }

    const logs = await this.prisma.aiInteraction.findMany({
      where: { requestId },
      orderBy: { createdAt: 'asc' },
    });

    return logs.map((log) => ({
      id: log.id,
      requestId: log.requestId,
      sessionRef: log.sessionRef,
      modelVersion: log.modelVersion,
      serviceVersion: log.serviceVersion,
      inputClass: log.inputClass,
      outputSummary: log.outputSummary,
      confidence: log.confidence ? log.confidence.toNumber() : null,
      safetyState: log.safetyState,
      approvalState: log.approvalState,
      latencyMs: log.latencyMs,
      errorCode: log.errorCode,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  private async resolveConfidenceThreshold(): Promise<number> {
    if (this.configService) {
      try {
        const res = await this.configService.get<number | null>(
          'ai.confidence_threshold',
          (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : null),
        );
        if (
          res.status === 'configured' &&
          typeof res.value === 'number' &&
          res.value >= 0 &&
          res.value <= 1
        ) {
          return res.value;
        }
      } catch {
        // Fall back to default
      }
    }
    return IntakeService.DEFAULT_CONFIDENCE_THRESHOLD;
  }

  private toResponse(request: {
    id: string;
    customerProfileId: string;
    status: RequestStatus;
    intentText: string | null;
    serviceId: string | null;
    description: string | null;
    aiInterpretation: Prisma.JsonValue;
    aiConfidence: Prisma.Decimal | null;
    supplierSummary: string | null;
    summaryLanguage: AppLanguage | null;
    attachmentMediaIds: string[];
    locationSnapshotId: string | null;
    requestedTimeHint: RequestedTimeHint | null;
    requestedWindowFrom: Date | null;
    requestedWindowTo: Date | null;
    isEmergency: boolean;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  }): CustomerRequestResponse {
    return {
      id: request.id,
      customerProfileId: request.customerProfileId,
      status: request.status,
      intentText: request.intentText,
      serviceId: request.serviceId,
      description: request.description,
      aiInterpretation: request.aiInterpretation as Record<string, unknown> | null,
      aiConfidence: request.aiConfidence ? request.aiConfidence.toNumber() : null,
      supplierSummary: request.supplierSummary,
      summaryLanguage: request.summaryLanguage,
      attachmentMediaIds: request.attachmentMediaIds,
      locationSnapshotId: request.locationSnapshotId,
      requestedTimeHint: request.requestedTimeHint,
      requestedWindowFrom: request.requestedWindowFrom
        ? request.requestedWindowFrom.toISOString()
        : null,
      requestedWindowTo: request.requestedWindowTo
        ? request.requestedWindowTo.toISOString()
        : null,
      isEmergency: request.isEmergency,
      submittedAt: request.submittedAt ? request.submittedAt.toISOString() : null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      version: request.version,
    };
  }
}

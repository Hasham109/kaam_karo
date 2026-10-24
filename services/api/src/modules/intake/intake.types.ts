/**
 * Request & AI Intake Module Types, DTOs & Validation Schemas.
 * (T3.3, owner A07; ARCH §4 M7, §6.2, §10; BP §56, §66, §67, §77, §79; REQ-AI-001..012).
 *
 * Golden rules enforced:
 * - Anti-hallucination (REQ-AI-010): Closed schema MUST NOT include price, provider credentials, or customer PII.
 * - PII scrubbing (REQ-AI-008, SEC-PRIV-001): Raw prompt phone numbers, CNIC, and emails are redacted before logging.
 * - Catalog validation (REQ-AI-007): Services mapped by AI must be active in the customer's city.
 * - Confidence fallback (REQ-AI-006): Confidence < threshold falls back to clarifying questions (max 2, REQ-AI-003).
 */

import {
  AiApprovalState,
  AiInputClass,
  AiSafetyState,
  AppLanguage,
  RequestedTimeHint,
  RequestStatus,
} from '../../generated/prisma/client.js';

export {
  AiApprovalState,
  AiInputClass,
  AiSafetyState,
  AppLanguage,
  RequestedTimeHint,
  RequestStatus,
};

/**
 * Closed AI output interpretation schema (REQ-AI-007, REQ-AI-010).
 * Deliberately excludes price, credentials, and customer personal details.
 */
export interface ClosedAiInterpretation {
  readonly serviceId: string | null;
  readonly serviceName: string | null;
  readonly serviceFamily: string | null;
  readonly intentSummary: string | null;
  readonly supplierSummary: string | null;
  readonly summaryLanguage: AppLanguage;
  readonly confidence: number;
  readonly needsClarification: boolean;
  readonly clarifyingQuestions: readonly string[];
  readonly timeHint: RequestedTimeHint | null;
  readonly requestedWindowFrom: Date | null;
  readonly requestedWindowTo: Date | null;
  readonly locationHint: string | null;
  readonly isEmergency: boolean;
  readonly safetyState: AiSafetyState;
  readonly modelVersion: string;
  readonly serviceVersion: string;
}

/**
 * Input to the Intake AI Client.
 */
export interface InterpretIntentInput {
  readonly intentText: string;
  readonly cityId?: string;
  readonly customerProfileId?: string;
  readonly appLanguage?: AppLanguage;
  readonly inputClass?: AiInputClass;
  readonly locationSnapshotId?: string;
  readonly attachmentMediaIds?: readonly string[];
}

/**
 * Interpret endpoint response DTO.
 */
export interface InterpretIntentResponse {
  readonly serviceId: string | null;
  readonly serviceName: string | null;
  readonly serviceFamily: string | null;
  readonly intentSummary: string | null;
  readonly supplierSummary: string | null;
  readonly summaryLanguage: AppLanguage;
  readonly confidence: number;
  readonly needsClarification: boolean;
  readonly clarifyingQuestions: readonly string[];
  readonly timeHint: RequestedTimeHint | null;
  readonly requestedWindowFrom: string | null;
  readonly requestedWindowTo: string | null;
  readonly locationHint: string | null;
  readonly isEmergency: boolean;
  readonly safetyState: AiSafetyState;
  readonly modelVersion: string;
  readonly serviceVersion: string;
}

/**
 * Create Customer Request DTO.
 */
export interface CreateCustomerRequestDto {
  readonly customerProfileId: string;
  readonly intentText?: string;
  readonly serviceId?: string;
  readonly description?: string;
  readonly locationSnapshotId?: string;
  readonly requestedTimeHint?: RequestedTimeHint;
  readonly requestedWindowFrom?: string;
  readonly requestedWindowTo?: string;
  readonly isEmergency?: boolean;
  readonly attachmentMediaIds?: readonly string[];
  readonly summaryLanguage?: AppLanguage;
}

/**
 * Confirm Customer Request DTO.
 * Explicit customer action confirming the interpreted service & summary (REQ-AI-005).
 */
export interface ConfirmCustomerRequestDto {
  readonly serviceId: string;
  readonly supplierSummary: string;
  readonly requestedWindowFrom?: string;
  readonly requestedWindowTo?: string;
  readonly isEmergency?: boolean;
  readonly locationSnapshotId?: string;
}

/**
 * Customer Request API Response DTO.
 */
export interface CustomerRequestResponse {
  readonly id: string;
  readonly customerProfileId: string;
  readonly status: RequestStatus;
  readonly intentText: string | null;
  readonly serviceId: string | null;
  readonly description: string | null;
  readonly aiInterpretation: Record<string, unknown> | null;
  readonly aiConfidence: number | null;
  readonly supplierSummary: string | null;
  readonly summaryLanguage: AppLanguage | null;
  readonly attachmentMediaIds: readonly string[];
  readonly locationSnapshotId: string | null;
  readonly requestedTimeHint: RequestedTimeHint | null;
  readonly requestedWindowFrom: string | null;
  readonly requestedWindowTo: string | null;
  readonly isEmergency: boolean;
  readonly submittedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}

/**
 * AI Interaction Audit Log Record DTO (REQ-AI-008).
 */
export interface AiInteractionRecord {
  readonly id: string;
  readonly requestId: string | null;
  readonly sessionRef: string | null;
  readonly modelVersion: string;
  readonly serviceVersion: string | null;
  readonly inputClass: AiInputClass;
  readonly outputSummary: string | null;
  readonly confidence: number | null;
  readonly safetyState: AiSafetyState;
  readonly approvalState: AiApprovalState;
  readonly latencyMs: number | null;
  readonly errorCode: string | null;
  readonly createdAt: string;
}

/**
 * PII Scrubber Utility (REQ-AI-008, SEC-PRIV-001).
 * Redacts phone numbers, CNIC, email addresses, and payment details from raw text before logging.
 */
export function scrubPii(text: string): string {
  if (!text) return '';

  let scrubbed = text;

  // 1. Pakistani phone numbers (e.g. 0300-1234567, 03001234567, +923001234567, +92-300-1234567)
  const phoneRegex = /(?:\+92|0092|92|0)?[\s-]?3[0-4][0-9][\s-]?[0-9]{7}/g;
  scrubbed = scrubbed.replace(phoneRegex, '[REDACTED_PHONE]');

  // 2. Pakistani CNIC format: 5 digits - 7 digits - 1 digit (e.g. 35201-1234567-1 or 3520112345671)
  const cnicRegex = /\b\d{5}[-\s]?\d{7}[-\s]?\d{1}\b/g;
  scrubbed = scrubbed.replace(cnicRegex, '[REDACTED_CNIC]');

  // 3. Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  scrubbed = scrubbed.replace(emailRegex, '[REDACTED_EMAIL]');

  // 4. Credit / Debit card 13-19 digits
  const cardRegex = /\b(?:\d[ -]*?){13,19}\b/g;
  scrubbed = scrubbed.replace(cardRegex, (match) => {
    // Only redact if string of digits without too many letters
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      return '[REDACTED_PAYMENT]';
    }
    return match;
  });

  return scrubbed;
}

/**
 * Content Moderation Checker (REQ-AI-009, ARCH §0.3).
 * Detects abusive content, weapons/drugs, and strictly excluded categories (medical, legal, financial, etc.).
 */
export function checkContentModeration(text: string): {
  readonly allowed: boolean;
  readonly reason?: string;
} {
  if (!text) return { allowed: true };

  const lower = text.toLowerCase();

  // Excluded categories (BP §1.4, ARCH §0.3): medical, surgery, legal court, weapons, drugs
  const blockedKeywords = [
    'weapon',
    'gun',
    'pistol',
    'bomb',
    'cocaine',
    'heroin',
    'narcotics',
    'surgery',
    'doctor consultation',
    'prescription drug',
    'court lawyer',
    'childcare service',
    'eldercare nurse',
  ];

  for (const keyword of blockedKeywords) {
    if (lower.includes(keyword)) {
      return {
        allowed: false,
        reason: `EXCLUDED_CATEGORY_OR_POLICY_VIOLATION: ${keyword}`,
      };
    }
  }

  return { allowed: true };
}

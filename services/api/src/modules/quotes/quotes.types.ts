/**
 * Quotes & Fare Types and DTOs (T3.5; owner A04).
 * Requirement IDs: QUOTE-001..009, FARE-001..013, PRICE-001..007, BOOK-STATUS-010, COMM-003.
 * ARCH §4 M10, §5.6, §6.3, §6.6; BP §17, §18, §53, §58; D-004, D-015, D-018, D-025, D-028, D-029.
 */
import {
  QuoteStatus,
  QuoteCustomerResponse,
  FareLineType,
  FareLineState,
  MaterialsClass,
  ActorRole,
  BookingStatus,
} from '../../generated/prisma/client.js';

export {
  QuoteStatus,
  QuoteCustomerResponse,
  FareLineType,
  FareLineState,
  MaterialsClass,
  ActorRole,
  BookingStatus,
};

export interface CreateFareLineItemDto {
  lineType: FareLineType;
  description: string;
  quantity?: number | undefined;
  unit?: string | undefined;
  amountMinor: bigint | number;
  materialsClass?: MaterialsClass | undefined;
  isDeductible?: boolean | undefined;
  notes?: string | undefined;
  evidenceMediaIds?: string[] | undefined;
  applicableRule?: string | undefined;
  isEmergencyException?: boolean | undefined;
}

export interface CreateQuoteDto {
  bookingId: string;
  requestId?: string | undefined;
  crewSize: number;
  inclusions?: string | undefined;
  exclusions?: string | undefined;
  expectedDurationMinutes?: number | undefined;
  validUntil?: Date | string | undefined;
  lines?: CreateFareLineItemDto[] | undefined;
}

export interface ProposeFareLineDto {
  lineType: FareLineType;
  description: string;
  quantity?: number | undefined;
  unit?: string | undefined;
  amountMinor: bigint | number;
  materialsClass?: MaterialsClass | undefined;
  isDeductible?: boolean | undefined;
  notes?: string | undefined;
  evidenceMediaIds?: string[] | undefined;
  applicableRule?: string | undefined;
  isEmergencyException?: boolean | undefined;
}

export interface ProposeCrewSizeChangeDto {
  proposedCrewSize: number;
  reason?: string | undefined;
}

export interface DecideCrewSizeChangeDto {
  approved: boolean;
  reason?: string | undefined;
}

export interface FareLineResponseDto {
  id: string;
  quoteId?: string | null | undefined;
  bookingId?: string | null | undefined;
  lineType: FareLineType;
  description: string;
  quantity?: number | null | undefined;
  unit?: string | null | undefined;
  amountMinor: number;
  proposedByRole: ActorRole;
  proposedByUserId?: string | null | undefined;
  state: FareLineState;
  materialsClass?: MaterialsClass | null | undefined;
  isDeductible?: boolean | null | undefined;
  notes?: string | null | undefined;
  evidenceMediaIds: string[];
  applicableRule?: string | null | undefined;
  isEmergencyException: boolean;
  decidedByUserId?: string | null | undefined;
  decidedAt?: Date | null | undefined;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface QuoteResponseDto {
  id: string;
  bookingId: string;
  providerProfileId: string;
  requestId?: string | null | undefined;
  status: QuoteStatus;
  validUntil?: Date | null | undefined;
  crewSize: number;
  inclusions?: string | null | undefined;
  exclusions?: string | null | undefined;
  expectedDurationMinutes?: number | null | undefined;
  customerResponse?: QuoteCustomerResponse | null | undefined;
  respondedAt?: Date | null | undefined;
  sentAt?: Date | null | undefined;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  lines: FareLineResponseDto[];
}

export interface PayableLineBreakdownItem {
  id: string;
  lineType: FareLineType;
  description: string;
  amountMinor: number;
  state: FareLineState;
  isPayable: boolean;
  isCommissionable: boolean;
}

export interface PayableSummaryDto {
  bookingId: string;
  totalPayableMinor: number;
  approvedLinesCount: number;
  unapprovedLinesCount: number;
  commissionableLabourMinor: number;
  breakdown: PayableLineBreakdownItem[];
}

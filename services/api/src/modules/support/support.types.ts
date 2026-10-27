/**
 * Support & Disputes Type Definitions (Module M16, T7.5; owner A10).
 * Source of truth: ARCH §4 M16; BP §12 C28/C29, §13 P20, §14 A10/A12, §16, §40.
 * Requirements: SUP-001..005, OPS-ADMIN-010, OPS-ADMIN-012, CFG-RULE-012, ROLE-003, BOOK-STATUS-012.
 */

export enum SupportLevel {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  L4 = 'L4',
  L5 = 'L5',
}

export enum TicketSource {
  APP_TICKET = 'APP_TICKET',
  COMPLAINT = 'COMPLAINT',
  SAFETY_STOP = 'SAFETY_STOP',
  NO_SUPPLY_CALLBACK = 'NO_SUPPLY_CALLBACK',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum DisputeOutcome {
  RESOLVED = 'RESOLVED',
  REFUNDED = 'REFUNDED',
  REWORK = 'REWORK',
  CLOSED = 'CLOSED',
}

export enum SLAStatus {
  ON_TRACK = 'ON_TRACK',
  BREACHED = 'BREACHED',
  NOT_SET = 'NOT_SET',
}

export interface FaqItemDto {
  id: string;
  categoryCode: string | null;
  questionEn: string;
  questionUr: string;
  answerEn: string;
  answerUr: string;
  audience: 'CUSTOMER' | 'PROVIDER';
}

export interface SupportTicketResponseDto {
  id: string;
  requesterUserId: string;
  requesterRole: 'CUSTOMER' | 'PROVIDER';
  bookingId: string | null;
  categoryCode: string | null;
  level: SupportLevel;
  assignedToUserId: string | null;
  source: TicketSource;
  isSafety: boolean;
  description: string;
  evidenceMediaIds: string[];
  status: TicketStatus;
  closedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

export interface CaseUpdateResponseDto {
  id: string;
  supportTicketId: string | null;
  disputeId: string | null;
  authorUserId: string;
  authorRole: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  authorName?: string;
  text: string;
  createdAt: string;
}

export interface SupportTicketDetailDto extends SupportTicketResponseDto {
  updates: CaseUpdateResponseDto[];
}

export interface AdminSupportTicketItemDto extends SupportTicketResponseDto {
  slaStatus: SLAStatus;
  requesterName?: string;
  requesterMaskedPhone: string;
}

export interface DisputeResponseDto {
  id: string;
  bookingId: string;
  openedByUserId: string;
  openedByRole: 'CUSTOMER' | 'PROVIDER';
  level: SupportLevel;
  issueType: string | null;
  description: string;
  evidenceMediaIds: string[];
  isSafety: boolean;
  outcome: DisputeOutcome | null;
  outcomeReason: string | null;
  decidedByUserId: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface DisputeDetailDto extends DisputeResponseDto {
  updates: CaseUpdateResponseDto[];
}

export interface AdminDisputeItemDto extends DisputeResponseDto {
  bookingRef: string;
  openedByName?: string;
  openedByMaskedPhone: string;
  paidAmountMinor?: number;
  refundableAmountMinor?: number;
  method?: 'CASH' | 'DIGITAL';
}

export interface CreateSupportTicketDto {
  bookingId?: string;
  categoryCode?: string;
  description: string;
  evidenceMediaIds?: string[];
  source?: TicketSource;
  isSafety?: boolean;
}

export interface CreateDisputeDto {
  bookingId: string;
  issueType?: string;
  description: string;
  evidenceMediaIds?: string[];
  isSafety?: boolean;
}

export interface AddCaseUpdateDto {
  text: string;
}

export interface AdminCaseUpdateDto {
  text: string;
  reason: string;
}

export interface AssignTicketDto {
  reason: string;
}

export interface EscalateLevelDto {
  level: SupportLevel;
  reason: string;
}

export interface SetCategoryDto {
  categoryCode: string;
  reason: string;
}

export interface CloseTicketDto {
  resolutionNote: string;
  reason: string;
}

export interface DecideDisputeDto {
  outcome: DisputeOutcome;
  reason: string;
}

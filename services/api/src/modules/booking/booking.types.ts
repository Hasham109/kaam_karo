/**
 * Types and DTOs for Booking & Job State Machine (T3.4; owner A04).
 * Requirement IDs: BOOK-STATUS-001..017, BOOK-CANCEL-001..006, DATA-002, DATA-004.
 * BP §15, §16, §21, §25; ARCH §4 M9, §6.1; D-003, D-004, D-018, D-021, D-028.
 */
import {
  BookingStatus,
  NoShowParty,
  SellingMode,
  ActorRole,
} from '../../generated/prisma/client.js';

export { BookingStatus, NoShowParty, SellingMode, ActorRole };

export interface AllowedNextAction {
  action: string;
  targetStatus: BookingStatus;
  labelEn: string;
  labelUr: string;
  requiresConfirmation?: boolean | undefined;
  destructive?: boolean | undefined;
}

export interface TransitionGuardContext {
  booking: {
    id: string;
    status: BookingStatus;
    providerProfileId: string | null;
    customerProfileId: string;
    scheduledAt: Date | null;
    version: number;
    crewSize: number | null;
  };
  callerUserId?: string | undefined;
  callerRole: ActorRole;
  requestedAction: string;
  crewSize?: number | undefined;
  noShowParty?: NoShowParty | undefined;
  cancelReasonCode?: string | undefined;
  providerUnpaidBalanceOwed?: number | undefined;
  providerMaxNegativeBalance?: number | undefined;
  currentDate?: Date | undefined;
}

export type TransitionGuard = (ctx: TransitionGuardContext) => {
  allowed: boolean;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
};

export interface TransitionDefinition {
  from: BookingStatus;
  to: BookingStatus;
  action: string;
  allowedRoles: ActorRole[];
  labelEn: string;
  labelUr: string;
  requiresConfirmation?: boolean | undefined;
  destructive?: boolean | undefined;
  guard?: TransitionGuard | undefined;
}

export interface CreateBookingDto {
  customerProfileId: string;
  serviceId: string;
  sellingMode: SellingMode;
  providerProfileId?: string | undefined;
  requestId?: string | undefined;
  locationSnapshotId?: string | undefined;
  scheduledAt?: string | Date | undefined;
  inspectionVisitAt?: string | Date | undefined;
  crewSize?: number | undefined;
  isEmergency?: boolean | undefined;
  submitImmediately?: boolean | undefined;
  /** Disallowed in create; if client passes status it will be rejected or ignored (BOOK-STATUS-016) */
  status?: never | undefined;
}

export interface RequestTransitionDto {
  action: string;
  toStatus: BookingStatus;
  reason?: string | undefined;
  crewSize?: number | undefined;
  noShowParty?: NoShowParty | undefined;
  sourceMetadata?: Record<string, unknown> | undefined;
}

export interface CancelBookingDto {
  reasonCode: string;
  notes?: string | undefined;
}

export interface RecordNoShowDto {
  party: NoShowParty;
  reason?: string | undefined;
}

export interface SafetyStopDto {
  reason: string;
  notes?: string | undefined;
}

export interface BookingResponseDto {
  id: string;
  bookingNumber: string;
  customerProfileId: string;
  serviceId: string;
  providerProfileId: string | null;
  requestId: string | null;
  sellingMode: SellingMode;
  status: BookingStatus;
  statusChangedAt: string;
  locationSnapshotId: string | null;
  scheduledAt: string | null;
  inspectionVisitAt: string | null;
  crewSize: number | null;
  acceptedQuoteId: string | null;
  isEmergency: boolean;
  cancelledByRole: ActorRole | null;
  cancelReasonCode: string | null;
  cancellationFee: number;
  noShowParty: NoShowParty | null;
  reviewSubmittedAt: string | null;
  version: number;
  allowedNextActions: AllowedNextAction[];
  createdAt: string;
  updatedAt: string;
}

export interface JobEventResponseDto {
  id: string;
  bookingId: string;
  actorUserId: string | null;
  actorRole: ActorRole;
  action: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus | null;
  reason: string | null;
  sourceMetadata: Record<string, unknown> | null;
  occurredAt: string;
}

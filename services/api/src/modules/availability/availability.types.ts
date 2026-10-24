/**
 * Types and DTOs for Module M5 Availability & M3 Trust (T3.6; owner A05).
 * Requirement IDs: AVAIL-001..007, TRUST-VER-001..004
 * BP §22, §59; ARCH §4 M3, M5, §6.5
 */
import {
  AvailabilityRuleKind,
  AvailabilityStatus,
  DateOverrideKind,
  RatingStanding,
  ServiceAreaKind,
  VerificationLevel,
  VerificationRecordStatus,
} from '../../generated/prisma/client.js';

export {
  AvailabilityRuleKind,
  AvailabilityStatus,
  DateOverrideKind,
  RatingStanding,
  ServiceAreaKind,
  VerificationLevel,
  VerificationRecordStatus,
};

export interface TimeIntervalDto {
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
}

export interface DayScheduleDto {
  dayOfWeek: number; // 1 = Mon .. 7 = Sun
  isWorking: boolean;
  startTime?: string | undefined; // HH:mm:ss
  endTime?: string | undefined; // HH:mm:ss
  isEmergency?: boolean | undefined;
  breaks?: TimeIntervalDto[] | undefined;
}

export interface WeeklyScheduleResponseDto {
  providerProfileId: string;
  days: DayScheduleDto[];
}

export interface UpdateWeeklyScheduleDto {
  days: DayScheduleDto[];
}

export interface DateOverrideDto {
  id?: string | undefined;
  date: string; // YYYY-MM-DD
  overrideKind: DateOverrideKind;
  startTime?: string | undefined;
  endTime?: string | undefined;
  limitedMaxJobs?: number | undefined;
  isEmergency?: boolean | undefined;
}

export interface ProviderLiveStatusDto {
  providerProfileId: string;
  status: AvailabilityStatus;
  maxActiveJobs: number | null;
  statusChangedAt: Date;
}

export interface UpdateLiveStatusDto {
  status?: AvailabilityStatus | undefined;
  maxActiveJobs?: number | null | undefined;
}

export interface ServiceAreaDto {
  id?: string | undefined;
  kind: ServiceAreaKind;
  centerLatitude?: number | undefined;
  centerLongitude?: number | undefined;
  radiusMeters?: number | undefined;
  serviceZoneId?: string | undefined;
}

export interface CheckAvailabilityRequestDto {
  slotStart: Date;
  slotEnd: Date;
  isEmergency?: boolean | undefined;
  customerLatitude?: number | undefined;
  customerLongitude?: number | undefined;
  serviceZoneId?: string | undefined;
}

export interface CheckAvailabilityResultDto {
  isAvailable: boolean;
  reasons: string[];
  standingEligible: boolean;
  scheduleEligible: boolean;
  capacityEligible: boolean;
  serviceAreaEligible: boolean;
}

export interface ProviderStandingDto {
  providerProfileId: string;
  verificationLevel: VerificationLevel;
  ratingStanding: RatingStanding;
  ratingWarningCount: number;
  isEligibleForNormalJobs: boolean;
}

export interface SubmitVerificationDto {
  requestedLevel: VerificationLevel;
  categoryId?: string;
  documentMediaIds: string[];
}

export interface DecideVerificationDto {
  decision: 'APPROVED' | 'REJECTED';
  reason: string;
  decidedByUserId: string;
}

/**
 * Validates HH:mm:ss format and returns seconds from midnight.
 */
export function timeStringToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map((p) => Number.parseInt(p, 10));
  const hours = parts[0];
  const minutes = parts[1];
  const seconds = parts[2] ?? 0;
  if (hours === undefined || minutes === undefined || parts.some(Number.isNaN)) {
    throw new Error(`Invalid time format: "${timeStr}". Expected HH:mm:ss`);
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    throw new Error(`Time out of bounds: "${timeStr}"`);
  }
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Validates that time interval start is strictly before end.
 */
export function assertValidTimeInterval(
  startTime: string,
  endTime: string,
  context = 'interval',
): void {
  const startSec = timeStringToSeconds(startTime);
  const endSec = timeStringToSeconds(endTime);
  if (startSec >= endSec) {
    throw new Error(
      `${context}: start time "${startTime}" must be strictly before end time "${endTime}"`,
    );
  }
}

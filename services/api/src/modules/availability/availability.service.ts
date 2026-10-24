/**
 * Availability Service (T3.6; owner A05).
 * Requirement IDs: AVAIL-001..007, MATCH-ELIG-075, MATCH-ELIG-076, MATCH-ELIG-079
 * BP §59; ARCH §4 M5, §6.5
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform';
import { calculateHaversineDistanceMeters, isInsidePakistan } from '../location';
import {
  type CheckAvailabilityRequestDto,
  type CheckAvailabilityResultDto,
  type DateOverrideDto,
  type DayScheduleDto,
  type ProviderLiveStatusDto,
  type ServiceAreaDto,
  type UpdateLiveStatusDto,
  type UpdateWeeklyScheduleDto,
  type WeeklyScheduleResponseDto,
  assertValidTimeInterval,
  timeStringToSeconds,
  AvailabilityRuleKind,
  AvailabilityStatus,
  DateOverrideKind,
  ServiceAreaKind,
} from './availability.types';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves provider weekly schedule and breaks (AVAIL-001, AVAIL-002; BP §59.1).
   */
  async getWeeklySchedule(providerProfileId: string): Promise<WeeklyScheduleResponseDto> {
    const rules = await this.prisma.availabilityRule.findMany({
      where: {
        providerProfileId,
        kind: { in: [AvailabilityRuleKind.WEEKLY_HOURS, AvailabilityRuleKind.BREAK] },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { kind: 'asc' }],
    });

    const daysMap = new Map<number, DayScheduleDto>();
    for (let day = 1; day <= 7; day++) {
      daysMap.set(day, {
        dayOfWeek: day,
        isWorking: false,
        breaks: [],
      });
    }

    for (const rule of rules) {
      if (!rule.dayOfWeek) continue;
      const day = daysMap.get(rule.dayOfWeek);
      if (!day) continue;

      if (rule.kind === AvailabilityRuleKind.WEEKLY_HOURS) {
        day.isWorking = true;
        day.startTime = rule.startTime ? this.formatTime(rule.startTime) : undefined;
        day.endTime = rule.endTime ? this.formatTime(rule.endTime) : undefined;
        day.isEmergency = rule.isEmergency;
      } else if (rule.kind === AvailabilityRuleKind.BREAK) {
        if (rule.startTime && rule.endTime) {
          day.breaks?.push({
            startTime: this.formatTime(rule.startTime),
            endTime: this.formatTime(rule.endTime),
          });
        }
      }
    }

    return {
      providerProfileId,
      days: Array.from(daysMap.values()),
    };
  }

  /**
   * Updates provider weekly schedule and breaks transactionally (AVAIL-001, AVAIL-002; BP §59.1).
   */
  async updateWeeklySchedule(
    providerProfileId: string,
    dto: UpdateWeeklyScheduleDto,
  ): Promise<WeeklyScheduleResponseDto> {
    // 1. Validate inputs
    for (const day of dto.days) {
      if (day.dayOfWeek < 1 || day.dayOfWeek > 7) {
        throw new BadRequestException(
          `Invalid dayOfWeek: ${day.dayOfWeek}. Must be between 1 and 7.`,
        );
      }

      if (day.isWorking) {
        if (!day.startTime || !day.endTime) {
          throw new BadRequestException(
            `Day ${day.dayOfWeek} is marked working but missing startTime or endTime.`,
          );
        }
        assertValidTimeInterval(day.startTime, day.endTime, `Day ${day.dayOfWeek}`);

        const dayStartSec = timeStringToSeconds(day.startTime);
        const dayEndSec = timeStringToSeconds(day.endTime);

        if (day.breaks && day.breaks.length > 0) {
          // Validate breaks inside working hours and no overlapping breaks
          const sortedBreaks = [...day.breaks].sort(
            (a, b) => timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime),
          );

          let previousBreakEnd = -1;
          for (const brk of sortedBreaks) {
            assertValidTimeInterval(brk.startTime, brk.endTime, `Day ${day.dayOfWeek} break`);
            const brkStartSec = timeStringToSeconds(brk.startTime);
            const brkEndSec = timeStringToSeconds(brk.endTime);

            if (brkStartSec < dayStartSec || brkEndSec > dayEndSec) {
              throw new BadRequestException(
                `Day ${day.dayOfWeek}: Break (${brk.startTime}-${brk.endTime}) must fall strictly within working hours (${day.startTime}-${day.endTime}).`,
              );
            }

            if (brkStartSec < previousBreakEnd) {
              throw new BadRequestException(
                `Day ${day.dayOfWeek}: Breaks cannot overlap with each other.`,
              );
            }
            previousBreakEnd = brkEndSec;
          }
        }
      }
    }

    // 2. Transactionally replace existing weekly hours and breaks
    await this.prisma.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({
        where: {
          providerProfileId,
          kind: { in: [AvailabilityRuleKind.WEEKLY_HOURS, AvailabilityRuleKind.BREAK] },
        },
      });

      for (const day of dto.days) {
        if (!day.isWorking) continue;

        // Insert WEEKLY_HOURS
        await tx.availabilityRule.create({
          data: {
            providerProfileId,
            kind: AvailabilityRuleKind.WEEKLY_HOURS,
            dayOfWeek: day.dayOfWeek,
            startTime: this.parseTimeToDate(day.startTime!),
            endTime: this.parseTimeToDate(day.endTime!),
            isEmergency: day.isEmergency ?? false,
          },
        });

        // Insert BREAK rules
        if (day.breaks) {
          for (const brk of day.breaks) {
            await tx.availabilityRule.create({
              data: {
                providerProfileId,
                kind: AvailabilityRuleKind.BREAK,
                dayOfWeek: day.dayOfWeek,
                startTime: this.parseTimeToDate(brk.startTime),
                endTime: this.parseTimeToDate(brk.endTime),
              },
            });
          }
        }
      }
    });

    return this.getWeeklySchedule(providerProfileId);
  }

  /**
   * Lists date-specific availability overrides (AVAIL-003; BP §59.2).
   */
  async getDateOverrides(providerProfileId: string, fromDate?: string): Promise<DateOverrideDto[]> {
    const whereClause: {
      providerProfileId: string;
      kind: AvailabilityRuleKind;
      date?: { gte: Date };
    } = {
      providerProfileId,
      kind: AvailabilityRuleKind.DATE_OVERRIDE,
    };

    if (fromDate) {
      whereClause.date = { gte: new Date(fromDate) };
    }

    const rules = await this.prisma.availabilityRule.findMany({
      where: whereClause,
      orderBy: { date: 'asc' },
    });

    return rules.map((r) => ({
      id: r.id,
      date: r.date ? r.date.toISOString().slice(0, 10) : '',
      overrideKind: r.overrideKind as DateOverrideKind,
      startTime: r.startTime ? this.formatTime(r.startTime) : undefined,
      endTime: r.endTime ? this.formatTime(r.endTime) : undefined,
      isEmergency: r.isEmergency,
    }));
  }

  /**
   * Creates or updates a date-specific availability override (AVAIL-003; BP §59.2).
   */
  async setDateOverride(providerProfileId: string, dto: DateOverrideDto): Promise<DateOverrideDto> {
    const targetDate = new Date(dto.date);
    if (Number.isNaN(targetDate.getTime())) {
      throw new BadRequestException(`Invalid date: "${dto.date}". Expected YYYY-MM-DD.`);
    }

    if (
      dto.overrideKind === DateOverrideKind.OPEN ||
      dto.overrideKind === DateOverrideKind.SPECIAL_HOURS
    ) {
      if (!dto.startTime || !dto.endTime) {
        throw new BadRequestException(
          `Override kind "${dto.overrideKind}" requires startTime and endTime.`,
        );
      }
      assertValidTimeInterval(dto.startTime, dto.endTime, 'Date override');
    }

    if (dto.overrideKind === DateOverrideKind.LIMITED && dto.limitedMaxJobs !== undefined) {
      if (dto.limitedMaxJobs < 1) {
        throw new BadRequestException('limitedMaxJobs must be at least 1.');
      }
    }

    // Remove any existing override for the same date
    await this.prisma.availabilityRule.deleteMany({
      where: {
        providerProfileId,
        kind: AvailabilityRuleKind.DATE_OVERRIDE,
        date: targetDate,
      },
    });

    const created = await this.prisma.availabilityRule.create({
      data: {
        providerProfileId,
        kind: AvailabilityRuleKind.DATE_OVERRIDE,
        date: targetDate,
        overrideKind: dto.overrideKind,
        startTime: dto.startTime ? this.parseTimeToDate(dto.startTime) : null,
        endTime: dto.endTime ? this.parseTimeToDate(dto.endTime) : null,
        isEmergency: dto.isEmergency ?? false,
      },
    });

    return {
      id: created.id,
      date: created.date!.toISOString().slice(0, 10),
      overrideKind: created.overrideKind as DateOverrideKind,
      startTime: created.startTime ? this.formatTime(created.startTime) : undefined,
      endTime: created.endTime ? this.formatTime(created.endTime) : undefined,
      isEmergency: created.isEmergency,
    };
  }

  /**
   * Removes a date-specific override (AVAIL-003).
   */
  async deleteDateOverride(providerProfileId: string, ruleId: string): Promise<void> {
    const rule = await this.prisma.availabilityRule.findFirst({
      where: {
        id: ruleId,
        providerProfileId,
        kind: AvailabilityRuleKind.DATE_OVERRIDE,
      },
    });

    if (!rule) {
      throw new NotFoundException(`Date override not found: ${ruleId}`);
    }

    await this.prisma.availabilityRule.delete({ where: { id: ruleId } });
  }

  /**
   * Retrieves provider live status (AVAIL-007; BP §59.3).
   */
  async getLiveStatus(providerProfileId: string): Promise<ProviderLiveStatusDto> {
    let statusRecord = await this.prisma.providerLiveStatus.findUnique({
      where: { providerProfileId },
    });

    if (!statusRecord) {
      // Default initial status is OFFLINE per BP §59.3 (AVAIL-007)
      statusRecord = await this.prisma.providerLiveStatus.create({
        data: {
          providerProfileId,
          status: AvailabilityStatus.OFFLINE,
          statusChangedAt: new Date(),
        },
      });
    }

    return {
      providerProfileId: statusRecord.providerProfileId,
      status: statusRecord.status,
      maxActiveJobs: statusRecord.maxActiveJobs,
      statusChangedAt: statusRecord.statusChangedAt,
    };
  }

  /**
   * Updates provider live availability status and/or capacity limit (AVAIL-006, AVAIL-007; BP §59.1, §59.3).
   */
  async updateLiveStatus(
    providerProfileId: string,
    dto: UpdateLiveStatusDto,
  ): Promise<ProviderLiveStatusDto> {
    if (dto.maxActiveJobs !== undefined && dto.maxActiveJobs !== null && dto.maxActiveJobs < 1) {
      throw new BadRequestException('maxActiveJobs must be at least 1 or null.');
    }

    const current = await this.getLiveStatus(providerProfileId);

    const updateData: {
      status?: AvailabilityStatus;
      maxActiveJobs?: number | null;
      statusChangedAt?: Date;
    } = {};

    if (dto.status && dto.status !== current.status) {
      updateData.status = dto.status;
      updateData.statusChangedAt = new Date();
    }

    if (dto.maxActiveJobs !== undefined) {
      updateData.maxActiveJobs = dto.maxActiveJobs;
    }

    const updated = await this.prisma.providerLiveStatus.update({
      where: { providerProfileId },
      data: updateData,
    });

    return {
      providerProfileId: updated.providerProfileId,
      status: updated.status,
      maxActiveJobs: updated.maxActiveJobs,
      statusChangedAt: updated.statusChangedAt,
    };
  }

  /**
   * Evaluates active jobs against capacity and sets BUSY if limit reached (AVAIL-006, MATCH-ELIG-079).
   */
  async recordActiveJobCount(
    providerProfileId: string,
    activeJobsCount: number,
  ): Promise<ProviderLiveStatusDto> {
    const current = await this.getLiveStatus(providerProfileId);

    if (
      current.maxActiveJobs !== null &&
      activeJobsCount >= current.maxActiveJobs &&
      current.status !== AvailabilityStatus.BUSY &&
      current.status !== AvailabilityStatus.OFFLINE
    ) {
      return this.updateLiveStatus(providerProfileId, {
        status: AvailabilityStatus.BUSY,
      });
    }

    return current;
  }

  /**
   * Retrieves provider service areas (AVAIL-005; BP §59.1).
   */
  async getServiceAreas(providerProfileId: string): Promise<ServiceAreaDto[]> {
    const rawAreas = await this.prisma.$queryRaw<
      Array<{
        id: string;
        kind: ServiceAreaKind;
        lat: number | null;
        lng: number | null;
        radius_meters: number | null;
        service_zone_id: string | null;
      }>
    >`
      SELECT
        id,
        kind,
        ST_Y(center::geometry) AS lat,
        ST_X(center::geometry) AS lng,
        radius_meters,
        service_zone_id
      FROM service_area
      WHERE provider_profile_id = ${providerProfileId}::uuid
      ORDER BY created_at ASC;
    `;

    return rawAreas.map((a) => ({
      id: a.id,
      kind: a.kind,
      centerLatitude: a.lat !== null ? Number(a.lat) : undefined,
      centerLongitude: a.lng !== null ? Number(a.lng) : undefined,
      radiusMeters: a.radius_meters !== null ? Number(a.radius_meters) : undefined,
      serviceZoneId: a.service_zone_id ?? undefined,
    }));
  }

  /**
   * Sets provider service area: Radius or Zone (AVAIL-005; BP §59.1, D-019).
   */
  async setServiceArea(providerProfileId: string, dto: ServiceAreaDto): Promise<ServiceAreaDto> {
    if (dto.kind === ServiceAreaKind.RADIUS) {
      if (dto.centerLatitude === undefined || dto.centerLongitude === undefined) {
        throw new BadRequestException(
          'RADIUS service area requires centerLatitude and centerLongitude.',
        );
      }
      if (!isInsidePakistan(dto.centerLatitude, dto.centerLongitude)) {
        throw new BadRequestException(
          'Service area center must fall strictly within Pakistan boundaries.',
        );
      }
      if (!dto.radiusMeters || dto.radiusMeters <= 0) {
        throw new BadRequestException('RADIUS service area requires positive radiusMeters.');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.serviceArea.deleteMany({ where: { providerProfileId } });

        await tx.$executeRaw`
          INSERT INTO service_area (
            id, provider_profile_id, kind, center, radius_meters, created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            ${providerProfileId}::uuid,
            'RADIUS'::service_area_kind,
            ST_SetSRID(ST_MakePoint(${dto.centerLongitude}, ${dto.centerLatitude}), 4326)::geography,
            ${dto.radiusMeters},
            NOW(),
            NOW()
          );
        `;
      });
    } else if (dto.kind === ServiceAreaKind.ZONE) {
      if (!dto.serviceZoneId) {
        throw new BadRequestException('ZONE service area requires serviceZoneId.');
      }

      const zoneId = dto.serviceZoneId;
      const zone = await this.prisma.serviceZone.findUnique({
        where: { id: zoneId },
      });
      if (!zone) {
        throw new BadRequestException(`Service zone not found: ${zoneId}`);
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.serviceArea.deleteMany({ where: { providerProfileId } });

        await tx.serviceArea.create({
          data: {
            providerProfileId,
            kind: ServiceAreaKind.ZONE,
            serviceZoneId: zoneId,
          },
        });
      });
    } else {
      throw new BadRequestException(`Unknown service area kind: ${dto.kind}`);
    }

    const saved = await this.getServiceAreas(providerProfileId);
    if (!saved[0]) {
      throw new Error('Failed to retrieve saved service area');
    }
    return saved[0];
  }

  /**
   * Checks whether provider is available for a requested slot and location (AVAIL-001..007, MATCH-ELIG-075..079).
   */
  async checkSlotAvailability(
    providerProfileId: string,
    req: CheckAvailabilityRequestDto,
  ): Promise<CheckAvailabilityResultDto> {
    const reasons: string[] = [];
    const standingEligible = true;
    let scheduleEligible = true;
    let capacityEligible = true;
    let serviceAreaEligible = true;

    // 1. Live status & capacity check (AVAIL-006, AVAIL-007)
    const liveStatus = await this.getLiveStatus(providerProfileId);

    if (liveStatus.status === AvailabilityStatus.OFFLINE) {
      reasons.push('PROVIDER_OFFLINE');
      capacityEligible = false;
    } else if (liveStatus.status === AvailabilityStatus.BUSY) {
      reasons.push('PROVIDER_BUSY');
      capacityEligible = false;
    } else if (liveStatus.status === AvailabilityStatus.EMERGENCY_AVAILABLE && !req.isEmergency) {
      reasons.push('PROVIDER_EMERGENCY_ONLY');
      capacityEligible = false;
    }

    // 2. Schedule & date overrides check (AVAIL-001, AVAIL-002, AVAIL-003, AVAIL-004)
    const slotStartDate = new Date(req.slotStart);
    const slotEndDate = new Date(req.slotEnd);
    const targetDateStr = slotStartDate.toISOString().slice(0, 10);
    const slotDayOfWeek = slotStartDate.getUTCDay() === 0 ? 7 : slotStartDate.getUTCDay(); // 1=Mon..7=Sun

    // Check date override for target date
    const dateOverride = await this.prisma.availabilityRule.findFirst({
      where: {
        providerProfileId,
        kind: AvailabilityRuleKind.DATE_OVERRIDE,
        date: new Date(targetDateStr),
      },
    });

    if (dateOverride) {
      if (
        dateOverride.overrideKind === DateOverrideKind.CLOSED ||
        dateOverride.overrideKind === DateOverrideKind.FULLY_BOOKED
      ) {
        reasons.push(`DATE_OVERRIDE_${dateOverride.overrideKind}`);
        scheduleEligible = false;
      } else if (
        dateOverride.overrideKind === DateOverrideKind.OPEN ||
        dateOverride.overrideKind === DateOverrideKind.SPECIAL_HOURS
      ) {
        if (dateOverride.startTime && dateOverride.endTime) {
          const overrideStartSec = this.dateToSecondsFromMidnight(dateOverride.startTime);
          const overrideEndSec = this.dateToSecondsFromMidnight(dateOverride.endTime);
          const slotStartSec =
            slotStartDate.getUTCHours() * 3600 + slotStartDate.getUTCMinutes() * 60;
          const slotEndSec = slotEndDate.getUTCHours() * 3600 + slotEndDate.getUTCMinutes() * 60;

          if (slotStartSec < overrideStartSec || slotEndSec > overrideEndSec) {
            reasons.push('OUTSIDE_OVERRIDE_HOURS');
            scheduleEligible = false;
          }
        }
      }
    } else {
      // Normal weekly schedule
      const weeklyRule = await this.prisma.availabilityRule.findFirst({
        where: {
          providerProfileId,
          kind: AvailabilityRuleKind.WEEKLY_HOURS,
          dayOfWeek: slotDayOfWeek,
        },
      });

      if (!weeklyRule) {
        reasons.push('DAY_NOT_WORKING');
        scheduleEligible = false;
      } else {
        if (
          req.isEmergency &&
          !weeklyRule.isEmergency &&
          liveStatus.status !== AvailabilityStatus.EMERGENCY_AVAILABLE
        ) {
          reasons.push('NOT_EMERGENCY_ELIGIBLE');
          scheduleEligible = false;
        }

        if (weeklyRule.startTime && weeklyRule.endTime) {
          const ruleStartSec = this.dateToSecondsFromMidnight(weeklyRule.startTime);
          const ruleEndSec = this.dateToSecondsFromMidnight(weeklyRule.endTime);
          const slotStartSec =
            slotStartDate.getUTCHours() * 3600 + slotStartDate.getUTCMinutes() * 60;
          const slotEndSec = slotEndDate.getUTCHours() * 3600 + slotEndDate.getUTCMinutes() * 60;

          if (slotStartSec < ruleStartSec || slotEndSec > ruleEndSec) {
            reasons.push('OUTSIDE_WORKING_HOURS');
            scheduleEligible = false;
          }
        }

        // Check breaks (AVAIL-002)
        const breakRules = await this.prisma.availabilityRule.findMany({
          where: {
            providerProfileId,
            kind: AvailabilityRuleKind.BREAK,
            dayOfWeek: slotDayOfWeek,
          },
        });

        const slotStartSec =
          slotStartDate.getUTCHours() * 3600 + slotStartDate.getUTCMinutes() * 60;
        const slotEndSec = slotEndDate.getUTCHours() * 3600 + slotEndDate.getUTCMinutes() * 60;

        for (const brk of breakRules) {
          if (brk.startTime && brk.endTime) {
            const brkStartSec = this.dateToSecondsFromMidnight(brk.startTime);
            const brkEndSec = this.dateToSecondsFromMidnight(brk.endTime);

            // Overlap check
            if (slotStartSec < brkEndSec && slotEndSec > brkStartSec) {
              reasons.push('INSIDE_BREAK_PERIOD');
              scheduleEligible = false;
              break;
            }
          }
        }
      }
    }

    // 3. Service Area Coverage Check (AVAIL-005, MATCH-ELIG-075)
    if (req.customerLatitude !== undefined && req.customerLongitude !== undefined) {
      const areas = await this.getServiceAreas(providerProfileId);
      if (areas.length > 0) {
        let insideAny = false;
        for (const area of areas) {
          if (
            area.kind === ServiceAreaKind.RADIUS &&
            area.centerLatitude &&
            area.centerLongitude &&
            area.radiusMeters
          ) {
            const dist = calculateHaversineDistanceMeters(
              { latitude: area.centerLatitude, longitude: area.centerLongitude },
              { latitude: req.customerLatitude, longitude: req.customerLongitude },
            );
            if (dist <= area.radiusMeters) {
              insideAny = true;
              break;
            }
          } else if (
            area.kind === ServiceAreaKind.ZONE &&
            area.serviceZoneId &&
            req.serviceZoneId
          ) {
            if (area.serviceZoneId === req.serviceZoneId) {
              insideAny = true;
              break;
            }
          }
        }

        if (!insideAny) {
          reasons.push('OUTSIDE_SERVICE_AREA');
          serviceAreaEligible = false;
        }
      }
    }

    const isAvailable =
      standingEligible && scheduleEligible && capacityEligible && serviceAreaEligible;

    return {
      isAvailable,
      reasons,
      standingEligible,
      scheduleEligible,
      capacityEligible,
      serviceAreaEligible,
    };
  }

  // --- Helpers ---

  private formatTime(d: Date): string {
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  private parseTimeToDate(timeStr: string): Date {
    const parts = timeStr.split(':').map((p) => Number.parseInt(p, 10));
    const d = new Date(Date.UTC(1970, 0, 1, parts[0], parts[1], parts[2] ?? 0));
    return d;
  }

  private dateToSecondsFromMidnight(d: Date): number {
    return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
  }
}

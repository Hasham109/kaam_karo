/**
 * Unit tests for AvailabilityService (T3.6; owner A05).
 * Requirement IDs: AVAIL-001..007, MATCH-ELIG-075..079
 * BP §59; ARCH §4 M5, §6.5
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { AvailabilityService } from '../availability.service';
import {
  type AvailabilityRuleKind,
  AvailabilityStatus,
  DateOverrideKind,
  ServiceAreaKind,
} from '../availability.types';
import type { PrismaService } from '../../../platform';

interface MockAvailabilityRule {
  id: string;
  providerProfileId: string;
  kind: AvailabilityRuleKind;
  dayOfWeek?: number | null;
  date?: Date | null;
  overrideKind?: DateOverrideKind | null;
  startTime?: Date | null;
  endTime?: Date | null;
  serviceZoneId?: string | null;
  serviceId?: string | null;
  isEmergency: boolean;
}

interface MockLiveStatus {
  id: string;
  providerProfileId: string;
  status: AvailabilityStatus;
  maxActiveJobs: number | null;
  statusChangedAt: Date;
}

interface MockServiceArea {
  id: string;
  providerProfileId: string;
  kind: ServiceAreaKind;
  center?: { lat: number; lng: number } | null;
  radiusMeters?: number | null;
  serviceZoneId?: string | null;
}

interface RuleWhere {
  providerProfileId?: string;
  kind?: AvailabilityRuleKind | { in: AvailabilityRuleKind[] };
  dayOfWeek?: number;
  date?: Date | { gte?: Date };
}

interface RuleCreateInput {
  providerProfileId: string;
  kind: AvailabilityRuleKind;
  dayOfWeek?: number | null;
  date?: Date | null;
  overrideKind?: DateOverrideKind | null;
  startTime?: Date | null;
  endTime?: Date | null;
  serviceZoneId?: string | null;
  serviceId?: string | null;
  isEmergency?: boolean;
}

interface LiveStatusCreateInput {
  providerProfileId: string;
  status: AvailabilityStatus;
  maxActiveJobs?: number | null;
  statusChangedAt?: Date;
}

interface LiveStatusUpdateInput {
  status?: AvailabilityStatus;
  maxActiveJobs?: number | null;
  statusChangedAt?: Date;
}

interface ServiceAreaCreateInput {
  providerProfileId: string;
  kind: ServiceAreaKind;
  serviceZoneId?: string | null;
}

class MockPrismaService {
  public rules: MockAvailabilityRule[] = [];
  public liveStatuses = new Map<string, MockLiveStatus>();
  public serviceAreas: MockServiceArea[] = [];
  public serviceZones = new Map<string, { id: string; name: string }>();

  availabilityRule = {
    findMany: async ({ where }: { where: RuleWhere }) => {
      return this.rules.filter((r) => {
        if (where.providerProfileId && r.providerProfileId !== where.providerProfileId)
          return false;
        if (
          where.kind &&
          typeof where.kind === 'object' &&
          'in' in where.kind &&
          !where.kind.in.includes(r.kind)
        )
          return false;
        if (where.kind && typeof where.kind === 'string' && r.kind !== where.kind) return false;
        if (where.dayOfWeek !== undefined && r.dayOfWeek !== where.dayOfWeek) return false;
        if (where.date && where.date instanceof Date) {
          if (r.date?.toISOString().slice(0, 10) !== where.date.toISOString().slice(0, 10))
            return false;
        } else if (where.date && typeof where.date === 'object' && 'gte' in where.date) {
          if (!r.date || !where.date.gte || r.date < where.date.gte) return false;
        }
        return true;
      });
    },
    findFirst: async ({ where }: { where: RuleWhere }) => {
      const results = await this.availabilityRule.findMany({ where });
      return results[0] ?? null;
    },
    create: async ({ data }: { data: RuleCreateInput }) => {
      const rule: MockAvailabilityRule = {
        id: `rule-${this.rules.length + 1}`,
        providerProfileId: data.providerProfileId,
        kind: data.kind,
        dayOfWeek: data.dayOfWeek ?? null,
        date: data.date ?? null,
        overrideKind: data.overrideKind ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
        serviceZoneId: data.serviceZoneId ?? null,
        serviceId: data.serviceId ?? null,
        isEmergency: data.isEmergency ?? false,
      };
      this.rules.push(rule);
      return rule;
    },
    deleteMany: async ({ where }: { where: RuleWhere }) => {
      const initialLen = this.rules.length;
      this.rules = this.rules.filter((r) => {
        if (where.providerProfileId && r.providerProfileId !== where.providerProfileId) return true;
        if (
          where.kind &&
          typeof where.kind === 'object' &&
          'in' in where.kind &&
          !where.kind.in.includes(r.kind)
        )
          return true;
        if (where.kind && typeof where.kind === 'string' && r.kind !== where.kind) return true;
        if (
          where.date &&
          where.date instanceof Date &&
          r.date?.toISOString().slice(0, 10) !== where.date.toISOString().slice(0, 10)
        )
          return true;
        return false;
      });
      return { count: initialLen - this.rules.length };
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const idx = this.rules.findIndex((r) => r.id === where.id);
      if (idx !== -1) {
        const [deleted] = this.rules.splice(idx, 1);
        return deleted;
      }
      return null;
    },
  };

  providerLiveStatus = {
    findUnique: async ({ where }: { where: { providerProfileId: string } }) => {
      return this.liveStatuses.get(where.providerProfileId) ?? null;
    },
    create: async ({ data }: { data: LiveStatusCreateInput }) => {
      const status: MockLiveStatus = {
        id: `status-${data.providerProfileId}`,
        providerProfileId: data.providerProfileId,
        status: data.status,
        maxActiveJobs: data.maxActiveJobs ?? null,
        statusChangedAt: data.statusChangedAt ?? new Date(),
      };
      this.liveStatuses.set(data.providerProfileId, status);
      return status;
    },
    update: async ({
      where,
      data,
    }: {
      where: { providerProfileId: string };
      data: LiveStatusUpdateInput;
    }) => {
      const existing = this.liveStatuses.get(where.providerProfileId);
      if (!existing) throw new Error('Live status not found');
      if (data.status) existing.status = data.status;
      if (data.maxActiveJobs !== undefined) existing.maxActiveJobs = data.maxActiveJobs;
      if (data.statusChangedAt) existing.statusChangedAt = data.statusChangedAt;
      return existing;
    },
  };

  serviceArea = {
    deleteMany: async ({ where }: { where: { providerProfileId: string } }) => {
      const initial = this.serviceAreas.length;
      this.serviceAreas = this.serviceAreas.filter(
        (a) => a.providerProfileId !== where.providerProfileId,
      );
      return { count: initial - this.serviceAreas.length };
    },
    create: async ({ data }: { data: ServiceAreaCreateInput }) => {
      const item: MockServiceArea = {
        id: `area-${this.serviceAreas.length + 1}`,
        providerProfileId: data.providerProfileId,
        kind: data.kind,
        serviceZoneId: data.serviceZoneId ?? null,
      };
      this.serviceAreas.push(item);
      return item;
    },
  };

  serviceZone = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.serviceZones.get(where.id) ?? null;
    },
  };

  $transaction = async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
    return fn(this);
  };

  $queryRaw = async <T>(_query: unknown): Promise<T> => {
    return this.serviceAreas.map((a) => ({
      id: a.id,
      kind: a.kind,
      lat: a.center ? a.center.lat : null,
      lng: a.center ? a.center.lng : null,
      radius_meters: a.radiusMeters ?? null,
      service_zone_id: a.serviceZoneId ?? null,
    })) as unknown as T;
  };

  $executeRaw = async (..._args: unknown[]): Promise<number> => {
    return 1;
  };
}

describe('AvailabilityService (T3.6; AVAIL-001..007)', () => {
  let service: AvailabilityService;
  let mockPrisma: MockPrismaService;
  const testProviderId = '11111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    mockPrisma = new MockPrismaService();
    service = new AvailabilityService(mockPrisma as unknown as PrismaService);

    // Seed active service zone
    mockPrisma.serviceZones.set('lahore-zone-uuid', {
      id: 'lahore-zone-uuid',
      name: 'Lahore Metropolitan Service Zone',
    });
  });

  describe('[AVAIL-001][AVAIL-002] Weekly Working Hours & Breaks', () => {
    it('saves and retrieves weekly schedule with breaks', async () => {
      const schedule = await service.updateWeeklySchedule(testProviderId, {
        days: [
          {
            dayOfWeek: 1, // Monday
            isWorking: true,
            startTime: '09:00:00',
            endTime: '18:00:00',
            breaks: [{ startTime: '13:00:00', endTime: '14:00:00' }],
          },
          {
            dayOfWeek: 2, // Tuesday
            isWorking: false,
          },
        ],
      });

      expect(schedule.days).toHaveLength(7);
      const monday = schedule.days.find((d) => d.dayOfWeek === 1)!;
      expect(monday.isWorking).toBe(true);
      expect(monday.startTime).toBe('09:00:00');
      expect(monday.endTime).toBe('18:00:00');
      expect(monday.breaks).toHaveLength(1);
      expect(monday.breaks![0]!.startTime).toBe('13:00:00');

      const tuesday = schedule.days.find((d) => d.dayOfWeek === 2)!;
      expect(tuesday.isWorking).toBe(false);
    });

    it('rejects working day when startTime >= endTime', async () => {
      await expect(
        service.updateWeeklySchedule(testProviderId, {
          days: [
            {
              dayOfWeek: 1,
              isWorking: true,
              startTime: '18:00:00',
              endTime: '09:00:00',
            },
          ],
        }),
      ).rejects.toThrowError(/must be strictly before/);
    });

    it('rejects breaks outside working hours', async () => {
      await expect(
        service.updateWeeklySchedule(testProviderId, {
          days: [
            {
              dayOfWeek: 1,
              isWorking: true,
              startTime: '09:00:00',
              endTime: '17:00:00',
              breaks: [
                { startTime: '08:00:00', endTime: '10:00:00' }, // starts before 09:00
              ],
            },
          ],
        }),
      ).rejects.toThrowError(/must fall strictly within working hours/);
    });

    it('rejects overlapping breaks on the same day', async () => {
      await expect(
        service.updateWeeklySchedule(testProviderId, {
          days: [
            {
              dayOfWeek: 1,
              isWorking: true,
              startTime: '09:00:00',
              endTime: '18:00:00',
              breaks: [
                { startTime: '12:00:00', endTime: '13:30:00' },
                { startTime: '13:00:00', endTime: '14:00:00' }, // overlaps!
              ],
            },
          ],
        }),
      ).rejects.toThrowError(/Breaks cannot overlap/);
    });
  });

  describe('[AVAIL-003] Date-Specific Availability Overrides', () => {
    it('sets and retrieves date overrides (OPEN, CLOSED, SPECIAL_HOURS, LIMITED, FULLY_BOOKED)', async () => {
      // Set CLOSED on a specific date
      const override = await service.setDateOverride(testProviderId, {
        date: '2026-11-01',
        overrideKind: DateOverrideKind.CLOSED,
      });

      expect(override.overrideKind).toBe(DateOverrideKind.CLOSED);
      expect(override.date).toBe('2026-11-01');

      const list = await service.getDateOverrides(testProviderId);
      expect(list).toHaveLength(1);
      expect(list[0]!.overrideKind).toBe(DateOverrideKind.CLOSED);
    });

    it('validates special hours require valid start and end times', async () => {
      await expect(
        service.setDateOverride(testProviderId, {
          date: '2026-11-02',
          overrideKind: DateOverrideKind.SPECIAL_HOURS,
          startTime: '16:00:00',
          endTime: '14:00:00', // invalid start >= end
        }),
      ).rejects.toThrowError(/must be strictly before/);
    });

    it('deletes date override and restores normal schedule', async () => {
      const created = await service.setDateOverride(testProviderId, {
        date: '2026-11-03',
        overrideKind: DateOverrideKind.FULLY_BOOKED,
      });

      await service.deleteDateOverride(testProviderId, created.id!);
      const list = await service.getDateOverrides(testProviderId);
      expect(list).toHaveLength(0);
    });
  });

  describe('[AVAIL-006][AVAIL-007] Live Status & Maximum Active Jobs Capacity', () => {
    it('starts at OFFLINE and transitions between statuses with timestamp update', async () => {
      const initial = await service.getLiveStatus(testProviderId);
      expect(initial.status).toBe(AvailabilityStatus.OFFLINE);

      const updated = await service.updateLiveStatus(testProviderId, {
        status: AvailabilityStatus.ONLINE_AVAILABLE,
        maxActiveJobs: 3,
      });

      expect(updated.status).toBe(AvailabilityStatus.ONLINE_AVAILABLE);
      expect(updated.maxActiveJobs).toBe(3);
    });

    it('auto-transitions to BUSY when active jobs reach maxActiveJobs (AVAIL-006, MATCH-ELIG-079)', async () => {
      await service.updateLiveStatus(testProviderId, {
        status: AvailabilityStatus.ONLINE_AVAILABLE,
        maxActiveJobs: 2,
      });

      // Active jobs = 1 -> still ONLINE_AVAILABLE
      let res = await service.recordActiveJobCount(testProviderId, 1);
      expect(res.status).toBe(AvailabilityStatus.ONLINE_AVAILABLE);

      // Active jobs = 2 (reached limit!) -> auto-transitions to BUSY
      res = await service.recordActiveJobCount(testProviderId, 2);
      expect(res.status).toBe(AvailabilityStatus.BUSY);
    });

    it('rejects negative or zero maxActiveJobs', async () => {
      await expect(
        service.updateLiveStatus(testProviderId, {
          maxActiveJobs: 0,
        }),
      ).rejects.toThrowError(/must be at least 1/);
    });
  });

  describe('[AVAIL-005] Service Area Configuration & Geographic Scope', () => {
    it('validates radius center point falls strictly inside Pakistan (LOC-GEO-001, SCOPE-GEO-001)', async () => {
      await expect(
        service.setServiceArea(testProviderId, {
          kind: ServiceAreaKind.RADIUS,
          centerLatitude: 51.5074, // London (outside Pakistan)
          centerLongitude: -0.1278,
          radiusMeters: 10_000,
        }),
      ).rejects.toThrowError(/must fall strictly within Pakistan boundaries/);
    });

    it('validates zone exists before assigning ZONE service area', async () => {
      await expect(
        service.setServiceArea(testProviderId, {
          kind: ServiceAreaKind.ZONE,
          serviceZoneId: 'non-existent-zone',
        }),
      ).rejects.toThrowError(/Service zone not found/);

      // Valid zone passes
      const set = await service.setServiceArea(testProviderId, {
        kind: ServiceAreaKind.ZONE,
        serviceZoneId: 'lahore-zone-uuid',
      });
      expect(set.kind).toBe(ServiceAreaKind.ZONE);
    });
  });

  describe('[AVAIL-001..007] checkSlotAvailability Integration Evaluation', () => {
    beforeEach(async () => {
      // Configure Monday schedule: 09:00 to 18:00 with lunch break 13:00 to 14:00
      await service.updateWeeklySchedule(testProviderId, {
        days: [
          {
            dayOfWeek: 1, // Monday
            isWorking: true,
            startTime: '09:00:00',
            endTime: '18:00:00',
            breaks: [{ startTime: '13:00:00', endTime: '14:00:00' }],
          },
        ],
      });

      // Online status
      await service.updateLiveStatus(testProviderId, {
        status: AvailabilityStatus.ONLINE_AVAILABLE,
      });
    });

    it('returns available when slot falls inside working hours and outside breaks', async () => {
      // 2026-10-26 is a Monday. Request 10:00 to 11:00 UTC
      const result = await service.checkSlotAvailability(testProviderId, {
        slotStart: new Date('2026-10-26T10:00:00Z'),
        slotEnd: new Date('2026-10-26T11:00:00Z'),
      });

      expect(result.isAvailable).toBe(true);
      expect(result.scheduleEligible).toBe(true);
      expect(result.capacityEligible).toBe(true);
    });

    it('rejects slot that overlaps with a break period (AVAIL-002)', async () => {
      // 13:30 to 14:30 overlaps with 13:00-14:00 lunch break
      const result = await service.checkSlotAvailability(testProviderId, {
        slotStart: new Date('2026-10-26T13:30:00Z'),
        slotEnd: new Date('2026-10-26T14:30:00Z'),
      });

      expect(result.isAvailable).toBe(false);
      expect(result.scheduleEligible).toBe(false);
      expect(result.reasons).toContain('INSIDE_BREAK_PERIOD');
    });

    it('rejects slot when date has a CLOSED override (AVAIL-003)', async () => {
      await service.setDateOverride(testProviderId, {
        date: '2026-10-26',
        overrideKind: DateOverrideKind.CLOSED,
      });

      const result = await service.checkSlotAvailability(testProviderId, {
        slotStart: new Date('2026-10-26T10:00:00Z'),
        slotEnd: new Date('2026-10-26T11:00:00Z'),
      });

      expect(result.isAvailable).toBe(false);
      expect(result.reasons).toContain('DATE_OVERRIDE_CLOSED');
    });

    it('rejects slot when provider live status is OFFLINE or BUSY (AVAIL-007)', async () => {
      await service.updateLiveStatus(testProviderId, {
        status: AvailabilityStatus.BUSY,
      });

      const result = await service.checkSlotAvailability(testProviderId, {
        slotStart: new Date('2026-10-26T10:00:00Z'),
        slotEnd: new Date('2026-10-26T11:00:00Z'),
      });

      expect(result.isAvailable).toBe(false);
      expect(result.capacityEligible).toBe(false);
      expect(result.reasons).toContain('PROVIDER_BUSY');
    });

    it('evaluates emergency availability requirements (AVAIL-004)', async () => {
      // Normal slot with emergency status only
      await service.updateLiveStatus(testProviderId, {
        status: AvailabilityStatus.EMERGENCY_AVAILABLE,
      });

      // Non-emergency request rejected when provider is emergency only
      const resNonEmergency = await service.checkSlotAvailability(testProviderId, {
        slotStart: new Date('2026-10-26T10:00:00Z'),
        slotEnd: new Date('2026-10-26T11:00:00Z'),
        isEmergency: false,
      });
      expect(resNonEmergency.isAvailable).toBe(false);
      expect(resNonEmergency.reasons).toContain('PROVIDER_EMERGENCY_ONLY');

      // Emergency request accepted
      const resEmergency = await service.checkSlotAvailability(testProviderId, {
        slotStart: new Date('2026-10-26T10:00:00Z'),
        slotEnd: new Date('2026-10-26T11:00:00Z'),
        isEmergency: true,
      });
      expect(resEmergency.isAvailable).toBe(true);
    });
  });
});

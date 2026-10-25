/**
 * Unit tests for CommissionService (T6.2; owner A09 + A03).
 * Requirement IDs: COMM-001..004, CFG-RULE-003, D-006, D-015, D-025, D-029; ARCH §6.8; BP §17, §41, §42, §58.1.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NotFoundException } from '@nestjs/common';
import { CommissionService, type LineItemInput } from '../commission.service.js';
import type { PrismaService } from '../../../platform/index.js';
import type { ConfigService } from '@kaamkaro/platform';

interface MockConfigRule {
  id: string;
  key: string;
  scope: string;
  value: unknown;
  effectiveFrom: Date;
}

interface MockDbFareLine {
  id: string;
  bookingId: string;
  lineType: string;
  description: string;
  amountMinor: bigint;
  state: string;
  createdAt: Date;
}

class MockPrismaService {
  public configRules: MockConfigRule[] = [];
  public fareLines: MockDbFareLine[] = [];

  configRule = {
    findFirst: async ({ where }: { where: { key: string; scope?: string } }) => {
      const match = this.configRules.find(
        (r) => r.key === where.key && (!where.scope || r.scope === where.scope),
      );
      return match ?? null;
    },
  };

  fareLine = {
    findMany: async ({ where }: { where: { bookingId: string } }) => {
      return this.fareLines.filter((l) => l.bookingId === where.bookingId);
    },
  };
}

describe('CommissionService (T6.2)', () => {
  let prisma: MockPrismaService;
  let service: CommissionService;

  beforeEach(() => {
    prisma = new MockPrismaService();
    // Default config in DB: 30% commission rate and LABOR base
    prisma.configRules = [
      {
        id: 'cfg-rate',
        key: 'commission.rate',
        scope: 'GLOBAL',
        value: 0.3,
        effectiveFrom: new Date(),
      },
      {
        id: 'cfg-base',
        key: 'commission.base_line_types',
        scope: 'GLOBAL',
        value: ['LABOR'],
        effectiveFrom: new Date(),
      },
    ];

    service = new CommissionService(prisma as unknown as PrismaService);
  });

  describe('ARCH §6.8 Worked Example Verbatim', () => {
    it('calculates commission split matching ARCH §6.8 exact figures in paisa', async () => {
      // Worked example:
      // Labour: Rs. 2,000 (200,000 paisa)
      // Parts: Rs. 1,500 (150,000 paisa)
      // Visit fee: Rs. 300 (30,000 paisa)
      // Total: Rs. 3,800 (380,000 paisa)
      // Commission: 30% x 2,000 = Rs. 600 (60,000 paisa)
      // Provider share: Rs. 3,200 (320,000 paisa)
      const lines: LineItemInput[] = [
        {
          id: 'line-1',
          lineType: 'LABOR',
          description: 'AC compressor repair labour',
          amountMinor: 200_000,
          state: 'APPROVED',
        },
        {
          id: 'line-2',
          lineType: 'PARTS',
          description: 'Replacement capacitor',
          amountMinor: 150_000,
          state: 'APPROVED',
        },
        {
          id: 'line-3',
          lineType: 'VISIT',
          description: 'Standard inspection & callout fee',
          amountMinor: 30_000,
          state: 'APPROVED',
        },
      ];

      const split = await service.calculateSplit({ lines });

      expect(split.totalBillMinor).toBe(380_000);
      expect(split.commissionableLabourMinor).toBe(200_000);
      expect(split.nonCommissionableMinor).toBe(180_000);
      expect(split.platformCommissionMinor).toBe(60_000);
      expect(split.providerShareMinor).toBe(320_000);
      expect(split.roundingPaisaResidual).toBe(0);
      expect(split.platformCommissionMinor + split.providerShareMinor).toBe(split.totalBillMinor);
    });

    it('retrieves lines from DB for bookingId and executes split accurately', async () => {
      const bookingId = 'booking-worked-example-1';
      prisma.fareLines = [
        {
          id: 'fl-1',
          bookingId,
          lineType: 'LABOR',
          description: 'Electrician rewiring',
          amountMinor: BigInt(200_000),
          state: 'APPROVED',
          createdAt: new Date(),
        },
        {
          id: 'fl-2',
          bookingId,
          lineType: 'PARTS',
          description: 'Circuit breakers',
          amountMinor: BigInt(150_000),
          state: 'APPROVED',
          createdAt: new Date(),
        },
        {
          id: 'fl-3',
          bookingId,
          lineType: 'VISIT',
          description: 'Travel fee',
          amountMinor: BigInt(30_000),
          state: 'APPROVED',
          createdAt: new Date(),
        },
      ];

      const split = await service.calculateSplit({ bookingId });
      expect(split.totalBillMinor).toBe(380_000);
      expect(split.commissionableLabourMinor).toBe(200_000);
      expect(split.platformCommissionMinor).toBe(60_000);
      expect(split.providerShareMinor).toBe(320_000);
    });
  });

  describe('Non-Commissionable Lines (D-015, COMM-003)', () => {
    it('excludes parts, materials, visit, inspection, emergency fees from commission base', async () => {
      const lines: LineItemInput[] = [
        { lineType: 'LABOR', description: 'Labour', amountMinor: 100_000 },
        { lineType: 'PARTS', description: 'Parts', amountMinor: 50_000 },
        { lineType: 'MATERIALS', description: 'Materials', amountMinor: 25_000 },
        { lineType: 'VISIT', description: 'Visit fee', amountMinor: 30_000 },
        { lineType: 'INSPECTION', description: 'Inspection', amountMinor: 20_000 },
        { lineType: 'TRAVEL', description: 'Travel allowance', amountMinor: 15_000 },
        { lineType: 'EMERGENCY_SURCHARGE', description: 'Night fee', amountMinor: 40_000 },
      ];

      const split = await service.calculateSplit({ lines });

      expect(split.totalBillMinor).toBe(280_000);
      expect(split.commissionableLabourMinor).toBe(100_000);
      expect(split.nonCommissionableMinor).toBe(180_000);
      // Commission is 30% on ONLY labour: 30% of 100,000 = 30,000
      expect(split.platformCommissionMinor).toBe(30_000);
      // Provider keeps remainder: 280,000 - 30,000 = 250,000
      expect(split.providerShareMinor).toBe(250_000);
      expect(split.platformCommissionMinor + split.providerShareMinor).toBe(split.totalBillMinor);
    });

    it('correctly deducts discounts from totalBillMinor', async () => {
      const lines: LineItemInput[] = [
        { lineType: 'LABOR', description: 'Plumbing labour', amountMinor: 100_000 },
        { lineType: 'DISCOUNT', description: 'Promo coupon', amountMinor: 20_000 },
      ];

      const split = await service.calculateSplit({ lines });
      expect(split.totalBillMinor).toBe(80_000);
      expect(split.commissionableLabourMinor).toBe(100_000);
      expect(split.platformCommissionMinor).toBe(30_000);
      expect(split.providerShareMinor).toBe(50_000);
      expect(split.platformCommissionMinor + split.providerShareMinor).toBe(80_000);
    });
  });

  describe('Unapproved Fare Lines (FARE-012, PRICE-007)', () => {
    it('strictly excludes PROPOSED and REJECTED lines from bill and commission base', async () => {
      const lines: LineItemInput[] = [
        {
          lineType: 'LABOR',
          description: 'Approved base labour',
          amountMinor: 100_000,
          state: 'APPROVED',
        },
        {
          lineType: 'LABOR',
          description: 'Proposed extra labour',
          amountMinor: 50_000,
          state: 'PROPOSED',
        },
        {
          lineType: 'PARTS',
          description: 'Rejected extra pipe',
          amountMinor: 30_000,
          state: 'REJECTED',
        },
        { lineType: 'VISIT', description: 'Final visit fee', amountMinor: 20_000, state: 'FINAL' },
      ];

      const split = await service.calculateSplit({ lines });

      // Only APPROVED and FINAL are counted
      expect(split.totalBillMinor).toBe(120_000);
      expect(split.commissionableLabourMinor).toBe(100_000);
      expect(split.nonCommissionableMinor).toBe(20_000);
      expect(split.platformCommissionMinor).toBe(30_000);
      expect(split.providerShareMinor).toBe(90_000);
    });
  });

  describe('Integer Arithmetic & Exact Rounding Rule (COMM-002)', () => {
    it('guarantees 0 paisa lost to rounding across odd and arbitrary amounts', async () => {
      const oddAmounts = [1, 3, 7, 33, 99, 137, 333_333, 777_777, 1_234_567];

      for (const amount of oddAmounts) {
        const lines: LineItemInput[] = [
          { lineType: 'LABOR', description: 'Odd labour line', amountMinor: amount },
        ];

        const split = await service.calculateSplit({ lines });
        expect(split.roundingPaisaResidual).toBe(0);
        expect(split.platformCommissionMinor + split.providerShareMinor).toBe(amount);
      }
    });

    it('rounds platform commission to nearest integer paisa', async () => {
      // 333 paisa * 0.30 = 99.9 paisa -> rounds to 100 paisa
      // provider share = 333 - 100 = 233 paisa
      const lines: LineItemInput[] = [
        { lineType: 'LABOR', description: 'Labour', amountMinor: 333 },
      ];

      const split = await service.calculateSplit({ lines });
      expect(split.platformCommissionMinor).toBe(100);
      expect(split.providerShareMinor).toBe(233);
      expect(split.platformCommissionMinor + split.providerShareMinor).toBe(333);
    });
  });

  describe('Per-Party Fee Display (COMM-004, D-016, D-025)', () => {
    it('customer display strictly conceals platform commission (D-025)', async () => {
      const lines: LineItemInput[] = [
        { lineType: 'LABOR', description: 'AC repair', amountMinor: 200_000 },
        { lineType: 'PARTS', description: 'Filter', amountMinor: 50_000 },
      ];

      const split = await service.calculateSplit({ lines });
      const customerDisplay = service.getCustomerFeeDisplay(split, lines);

      expect(customerDisplay.totalPayableMinor).toBe(250_000);
      expect(customerDisplay.subtotalMinor).toBe(250_000);
      expect(customerDisplay.customerPlatformFeeMinor).toBe(0);
      expect(customerDisplay.taxMinor).toBe(0);
      expect(customerDisplay.lines).toHaveLength(2);

      // Verify no commission field exposed in customer DTO
      expect(
        (customerDisplay as unknown as Record<string, unknown>).platformCommissionMinor,
      ).toBeUndefined();
      expect(
        (customerDisplay as unknown as Record<string, unknown>).commissionRate,
      ).toBeUndefined();
      expect(
        (customerDisplay as unknown as Record<string, unknown>).providerNetEarningsMinor,
      ).toBeUndefined();
    });

    it('provider display shows total bill, labour commission deduction and net earnings (D-016)', async () => {
      const lines: LineItemInput[] = [
        { lineType: 'LABOR', description: 'Labour', amountMinor: 200_000 },
        { lineType: 'PARTS', description: 'Parts', amountMinor: 150_000 },
        { lineType: 'VISIT', description: 'Visit', amountMinor: 30_000 },
      ];

      const split = await service.calculateSplit({ lines });
      const providerDisplay = service.getProviderFeeDisplay(split);

      expect(providerDisplay.totalBillMinor).toBe(380_000);
      expect(providerDisplay.commissionableLabourMinor).toBe(200_000);
      expect(providerDisplay.nonCommissionableMinor).toBe(180_000);
      expect(providerDisplay.commissionRatePercent).toBe(30);
      expect(providerDisplay.platformCommissionMinor).toBe(60_000);
      expect(providerDisplay.providerNetEarningsMinor).toBe(320_000);

      // Bilingual confirmation notice contains PKR amounts
      expect(providerDisplay.noticeEn).toContain('3,800');
      expect(providerDisplay.noticeEn).toContain('600');
      expect(providerDisplay.noticeEn).toContain('30% of labour');
      expect(providerDisplay.noticeUr).toContain('3,800');
      expect(providerDisplay.noticeUr).toContain('600');
    });

    it('finance display provides complete audit transparency', async () => {
      const lines: LineItemInput[] = [
        { lineType: 'LABOR', description: 'Labour', amountMinor: 100_000 },
        { lineType: 'PARTS', description: 'Parts', amountMinor: 50_000 },
      ];

      const split = await service.calculateSplit({ lines });
      const financeDisplay = service.getFinanceFeeDisplay(split);

      expect(financeDisplay.totalBillMinor).toBe(150_000);
      expect(financeDisplay.commissionableLabourMinor).toBe(100_000);
      expect(financeDisplay.nonCommissionableMinor).toBe(50_000);
      expect(financeDisplay.commissionRate).toBe(0.3);
      expect(financeDisplay.platformRevenueMinor).toBe(30_000);
      expect(financeDisplay.providerPayableMinor).toBe(120_000);
      expect(financeDisplay.roundingPaisaResidual).toBe(0);
      expect(financeDisplay.baseLineTypes).toEqual(['LABOR']);
    });
  });

  describe('Config Retrieval & Fallback (COMM-001, CFG-RULE-003)', () => {
    it('prefers ConfigService when provided and configured', async () => {
      const mockConfigService: ConfigService = {
        get: async (key: string) => {
          if (key === 'commission.rate') {
            return { status: 'configured', value: 0.25, version: 1 };
          }
          if (key === 'commission.base_line_types') {
            return { status: 'configured', value: ['LABOR', 'CUSTOM_WORK'], version: 1 };
          }
          return { status: 'not_found' };
        },
      } as unknown as ConfigService;

      const customService = new CommissionService(
        prisma as unknown as PrismaService,
        mockConfigService,
      );

      const rate = await customService.getCommissionRate();
      const baseTypes = await customService.getCommissionBaseLineTypes();

      expect(rate).toBe(0.25);
      expect(baseTypes).toEqual(['LABOR', 'CUSTOM_WORK']);
    });

    it('throws NotFoundException if commission.rate is missing from config and database', async () => {
      prisma.configRules = [];
      const unconfiguredService = new CommissionService(prisma as unknown as PrismaService);

      await expect(unconfiguredService.getCommissionRate()).rejects.toThrow(NotFoundException);
    });
  });

  describe('Grep Constraint Verification (COMM-001 Acceptance Criterion)', () => {
    it('verifies zero hardcoded rate literal 0.30 or 0.3 in commission.service.ts', () => {
      const serviceFilePath = path.resolve(__dirname, '../commission.service.ts');
      const content = fs.readFileSync(serviceFilePath, 'utf-8');

      // Check for raw literal numeric rates outside comments/docstrings
      // Match "= 0.3" or "* 0.3" or "return 0.3"
      const hardcodedPattern = /(=|\*|\/|\+|-|return)\s*0\.30?\b/;
      expect(hardcodedPattern.test(content)).toBe(false);
    });
  });
});

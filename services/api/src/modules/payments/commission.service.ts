/**
 * CommissionService — Commission calculation, base filtering & per-party fee display (T6.2; owner A09 + A03).
 * Requirement IDs: COMM-001..004, CFG-RULE-003, D-006, D-015, D-025, D-029; ARCH §6.8; BP §17, §41, §42, §58.1.
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CONFIG_SERVICE, type ConfigService, configParsers } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service.js';

export interface LineItemInput {
  id?: string;
  lineType: string;
  description: string;
  amountMinor: bigint | number;
  state?: string;
}

export interface CommissionSplitResult {
  totalBillMinor: number;
  commissionableLabourMinor: number;
  nonCommissionableMinor: number;
  commissionRate: number;
  platformCommissionMinor: number;
  providerShareMinor: number;
  roundingPaisaResidual: number;
  baseLineTypes: string[];
  lines?: LineItemInput[];
}

export interface CustomerFeeDisplayDto {
  lines: Array<{
    description: string;
    lineType: string;
    amountMinor: number;
  }>;
  subtotalMinor: number;
  customerPlatformFeeMinor: number;
  taxMinor: number;
  totalPayableMinor: number;
}

export interface ProviderFeeDisplayDto {
  totalBillMinor: number;
  commissionableLabourMinor: number;
  nonCommissionableMinor: number;
  commissionRatePercent: number;
  platformCommissionMinor: number;
  providerNetEarningsMinor: number;
  noticeEn: string;
  noticeUr: string;
}

export interface FinanceFeeDisplayDto {
  totalBillMinor: number;
  commissionableLabourMinor: number;
  nonCommissionableMinor: number;
  commissionRate: number;
  platformRevenueMinor: number;
  providerPayableMinor: number;
  baseLineTypes: string[];
  roundingPaisaResidual: number;
}

@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(CONFIG_SERVICE)
    private readonly configService?: ConfigService,
  ) {}

  /**
   * Reads commission rate dynamically from ConfigService or directly from config_rule database seed.
   * Invariant: No literal decimal rate hardcoded in code (COMM-001, D-006).
   */
  async getCommissionRate(): Promise<number> {
    if (this.configService) {
      try {
        const res = await this.configService.get('commission.rate', configParsers.ratio);
        if (res.status === 'configured') {
          return res.value;
        }
      } catch {
        // Fallback to database query
      }
    }

    const rule = await this.prisma.configRule.findFirst({
      where: { key: 'commission.rate', scope: 'GLOBAL' },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (rule?.value !== null && rule?.value !== undefined) {
      const parsed = Number(rule.value);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }

    throw new NotFoundException({
      code: 'COMMISSION_RATE_NOT_CONFIGURED',
      message: 'Commission rate is not configured in config store (COMM-001, CFG-RULE-003)',
    });
  }

  /**
   * Reads commissionable base line types from ConfigService or config_rule database seed.
   * Default per D-015: ["LABOR"] (Worker labor lines only; visit/parts/inspection excluded).
   */
  async getCommissionBaseLineTypes(): Promise<string[]> {
    if (this.configService) {
      try {
        const res = await this.configService.get(
          'commission.base_line_types',
          configParsers.stringArray,
        );
        if (res.status === 'configured') {
          return [...res.value];
        }
      } catch {
        // Fallback to database query
      }
    }

    const rule = await this.prisma.configRule.findFirst({
      where: { key: 'commission.base_line_types', scope: 'GLOBAL' },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (rule?.value && Array.isArray(rule.value)) {
      return rule.value as string[];
    }

    return ['LABOR'];
  }

  /**
   * Calculate the commission split for a set of fare lines or an existing booking.
   *
   * ROUNDING RULE (COMM-002):
   * Integer paisa arithmetic:
   * 1. commissionMinor = Math.round(commissionableLabourMinor * commissionRate)
   * 2. providerShareMinor = totalBillMinor - commissionMinor
   * 3. Math ensures: platformCommissionMinor + providerShareMinor === totalBillMinor exactly.
   * 0 paisa lost to rounding.
   */
  async calculateSplit(params: {
    bookingId?: string;
    lines?: LineItemInput[];
    overrideRate?: number;
    overrideBaseLineTypes?: string[];
  }): Promise<CommissionSplitResult> {
    let lines = params.lines;

    if (!lines && params.bookingId) {
      const dbLines = await this.prisma.fareLine.findMany({
        where: { bookingId: params.bookingId },
        orderBy: { createdAt: 'asc' },
      });
      lines = dbLines.map((l) => ({
        id: l.id,
        lineType: l.lineType,
        description: l.description,
        amountMinor: l.amountMinor,
        state: l.state,
      }));
    }

    if (!lines) {
      throw new BadRequestException({
        code: 'MISSING_FARE_LINES',
        message: 'Must provide either bookingId or lines array for commission calculation',
      });
    }

    const commissionRate =
      params.overrideRate !== undefined ? params.overrideRate : await this.getCommissionRate();

    const baseLineTypes =
      params.overrideBaseLineTypes !== undefined
        ? params.overrideBaseLineTypes
        : await this.getCommissionBaseLineTypes();

    let totalBillMinor = 0;
    let commissionableLabourMinor = 0;
    let nonCommissionableMinor = 0;

    for (const line of lines) {
      const amount = Number(line.amountMinor);
      const isApprovedOrFinal = !line.state || line.state === 'APPROVED' || line.state === 'FINAL';

      // Unapproved lines never enter billing or commission calculation (FARE-012, PRICE-007)
      if (!isApprovedOrFinal) {
        continue;
      }

      if (line.lineType === 'DISCOUNT') {
        totalBillMinor -= amount;
        continue;
      }

      totalBillMinor += amount;

      // Only lines matching baseLineTypes are commissionable (D-015, COMM-003)
      if (baseLineTypes.includes(line.lineType)) {
        commissionableLabourMinor += amount;
      } else {
        // Parts, Materials, Visit, Inspection, Travel, Emergency are strictly NON-COMMISSIONABLE
        nonCommissionableMinor += amount;
      }
    }

    if (totalBillMinor < 0) {
      totalBillMinor = 0;
    }

    // Exact Integer Rounding Rule (COMM-002)
    const platformCommissionMinor = Math.round(commissionableLabourMinor * commissionRate);
    const providerShareMinor = totalBillMinor - platformCommissionMinor;
    const roundingPaisaResidual = totalBillMinor - (platformCommissionMinor + providerShareMinor);

    return {
      totalBillMinor,
      commissionableLabourMinor,
      nonCommissionableMinor,
      commissionRate,
      platformCommissionMinor,
      providerShareMinor,
      roundingPaisaResidual,
      baseLineTypes,
      lines,
    };
  }

  /**
   * Generates Customer-facing fee display data (COMM-004, D-025, BP §17).
   * Customer sees line items and bill total only; platform commission is strictly hidden!
   */
  getCustomerFeeDisplay(
    split: CommissionSplitResult,
    lines?: LineItemInput[],
  ): CustomerFeeDisplayDto {
    const rawLines = lines ?? split.lines ?? [];
    const customerLines = rawLines
      .filter((l) => !l.state || l.state === 'APPROVED' || l.state === 'FINAL')
      .map((l) => ({
        description: l.description,
        lineType: l.lineType,
        amountMinor: Number(l.amountMinor),
      }));

    return {
      lines: customerLines,
      subtotalMinor: split.totalBillMinor,
      customerPlatformFeeMinor: 0, // D-025: zero customer platform fee
      taxMinor: 0, // D-029: 0 while tax rules null
      totalPayableMinor: split.totalBillMinor,
    };
  }

  /**
   * Generates Provider-facing fee display data (COMM-004, P14/P15, D-016).
   * Shows bill total, commission deduction, and provider net earnings.
   */
  getProviderFeeDisplay(split: CommissionSplitResult): ProviderFeeDisplayDto {
    const ratePercent = Math.round(split.commissionRate * 100);
    const commissionPkr = (split.platformCommissionMinor / 100).toLocaleString();
    const totalPkr = (split.totalBillMinor / 100).toLocaleString();

    return {
      totalBillMinor: split.totalBillMinor,
      commissionableLabourMinor: split.commissionableLabourMinor,
      nonCommissionableMinor: split.nonCommissionableMinor,
      commissionRatePercent: ratePercent,
      platformCommissionMinor: split.platformCommissionMinor,
      providerNetEarningsMinor: split.providerShareMinor,
      noticeEn: `Confirm the customer paid Rs. ${totalPkr} in cash? Rs. ${commissionPkr} (${ratePercent}% of labour) will be taken from your Kaam Karo balance.`,
      noticeUr: `کیا گاہک نے ${totalPkr} روپے نقد ادا کیے؟ ${commissionPkr} روپے (مزدوری کا ${ratePercent}٪) آپ کے کام کرو بیلنس سے کاٹ لیے جائیں گے۔`,
    };
  }

  /**
   * Generates Finance-facing fee display data (COMM-004, A09/A13/A16).
   * Complete financial audit transparency.
   */
  getFinanceFeeDisplay(split: CommissionSplitResult): FinanceFeeDisplayDto {
    return {
      totalBillMinor: split.totalBillMinor,
      commissionableLabourMinor: split.commissionableLabourMinor,
      nonCommissionableMinor: split.nonCommissionableMinor,
      commissionRate: split.commissionRate,
      platformRevenueMinor: split.platformCommissionMinor,
      providerPayableMinor: split.providerShareMinor,
      baseLineTypes: split.baseLineTypes,
      roundingPaisaResidual: split.roundingPaisaResidual,
    };
  }
}

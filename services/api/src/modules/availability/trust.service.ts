/**
 * Trust & Verification Service (T3.6; owner A05).
 * Requirement IDs: TRUST-VER-001..004, MATCH-ELIG-077, BP §22, ARCH §6.4, D-018
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../platform';
import {
  type DecideVerificationDto,
  type ProviderStandingDto,
  type SubmitVerificationDto,
  RatingStanding,
  VerificationLevel,
  VerificationRecordStatus,
} from './availability.types';

@Injectable()
export class TrustService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves provider trust standing. New providers start at BASIC (TRUST-VER-001; BP §22.1).
   */
  async getProviderStanding(providerProfileId: string): Promise<ProviderStandingDto> {
    let standing = await this.prisma.providerStanding.findUnique({
      where: { providerProfileId },
    });

    if (!standing) {
      standing = await this.prisma.providerStanding.create({
        data: {
          providerProfileId,
          verificationLevel: VerificationLevel.BASIC,
          ratingStanding: RatingStanding.GOOD_STANDING,
          ratingWarningCount: 0,
        },
      });
    }

    const isEligible = this.checkEligibility(standing.verificationLevel);

    return {
      providerProfileId: standing.providerProfileId,
      verificationLevel: standing.verificationLevel,
      ratingStanding: standing.ratingStanding,
      ratingWarningCount: standing.ratingWarningCount,
      isEligibleForNormalJobs: isEligible,
    };
  }

  /**
   * Submits verification documents for Risk/Trust review (TRUST-VER-002, TRUST-VER-003; BP §22.1).
   */
  async submitVerification(providerProfileId: string, dto: SubmitVerificationDto) {
    if (!dto.documentMediaIds || dto.documentMediaIds.length === 0) {
      throw new BadRequestException('At least one verification document is required.');
    }

    if (dto.requestedLevel === VerificationLevel.BASIC) {
      throw new BadRequestException('Cannot apply for BASIC level; all accounts start at BASIC.');
    }

    const record = await this.prisma.verificationRecord.create({
      data: {
        providerProfileId,
        requestedLevel: dto.requestedLevel,
        categoryId: dto.categoryId ?? null,
        documentMediaIds: dto.documentMediaIds,
        status: VerificationRecordStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    return record;
  }

  /**
   * Admin approves or rejects verification application with audited reason (TRUST-VER-002, TRUST-VER-003; BP §8.3).
   */
  async decideVerification(recordId: string, dto: DecideVerificationDto) {
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new BadRequestException('Decision reason must be at least 5 characters long.');
    }

    const record = await this.prisma.verificationRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException(`Verification record not found: ${recordId}`);
    }

    if (record.status !== VerificationRecordStatus.SUBMITTED) {
      throw new BadRequestException(
        `Verification record already decided with status: ${record.status}`,
      );
    }

    const newStatus =
      dto.decision === 'APPROVED'
        ? VerificationRecordStatus.APPROVED
        : VerificationRecordStatus.REJECTED;

    const decidedAt = new Date();

    const [updatedRecord] = await this.prisma.$transaction(async (tx) => {
      const rec = await tx.verificationRecord.update({
        where: { id: recordId },
        data: {
          status: newStatus,
          decidedAt,
          decidedByUserId: dto.decidedByUserId,
          decisionReason: dto.reason.trim(),
        },
      });

      if (dto.decision === 'APPROVED') {
        // Upgrade provider standing to requested verification level
        await tx.providerStanding.upsert({
          where: { providerProfileId: record.providerProfileId },
          create: {
            providerProfileId: record.providerProfileId,
            verificationLevel: record.requestedLevel,
            ratingStanding: RatingStanding.GOOD_STANDING,
          },
          update: {
            verificationLevel: record.requestedLevel,
          },
        });
      }

      return [rec];
    });

    return updatedRecord;
  }

  /**
   * Asserts whether verification level allows receiving normal jobs (TRUST-VER-001, TRUST-VER-002).
   */
  async isEligibleForNormalJobs(providerProfileId: string): Promise<boolean> {
    const standing = await this.getProviderStanding(providerProfileId);
    return standing.isEligibleForNormalJobs;
  }

  private checkEligibility(level: VerificationLevel): boolean {
    // Level Basic: not eligible for normal jobs (TRUST-VER-001)
    // Level Verified & Business Verified: eligible for normal jobs (TRUST-VER-002, TRUST-VER-003)
    return (
      level === VerificationLevel.VERIFIED ||
      level === VerificationLevel.BUSINESS_VERIFIED ||
      level === VerificationLevel.SPECIALIZED_VERIFIED
    );
  }
}

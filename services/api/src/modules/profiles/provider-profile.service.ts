import { Injectable } from '@nestjs/common';
import { AppError } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service';
import type { UpdateProviderProfileDto } from './dto/profile.dto';

@Injectable()
export class ProviderProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureProviderProfile(userId: string) {
    const existing = await this.prisma.providerProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.providerProfile.create({
      data: { userId },
    });
  }

  async getProfile(userId: string) {
    const profile = await this.ensureProviderProfile(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'User account not found');
    }

    return {
      id: profile.id,
      userId: user.id,
      phoneE164: user.phoneE164,
      displayName: user.displayName,
      businessName: profile.businessName,
      photoMediaId: profile.photoMediaId,
      usualTeamSize: profile.usualTeamSize,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProviderProfileDto) {
    await this.ensureProviderProfile(userId);

    const updated = await this.prisma.providerProfile.update({
      where: { userId },
      data: {
        ...(dto.businessName !== undefined ? { businessName: dto.businessName } : {}),
        ...(dto.usualTeamSize !== undefined ? { usualTeamSize: dto.usualTeamSize } : {}),
        ...(dto.photoMediaId !== undefined ? { photoMediaId: dto.photoMediaId } : {}),
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      businessName: updated.businessName,
      photoMediaId: updated.photoMediaId,
      usualTeamSize: updated.usualTeamSize,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async getPublicProfile(providerProfileId: string) {
    const profile = await this.prisma.providerProfile.findUnique({
      where: { id: providerProfileId },
    });
    if (!profile) {
      throw new AppError('PROVIDER_NOT_FOUND', 404, 'Provider profile not found');
    }

    return {
      id: profile.id,
      businessName: profile.businessName,
      photoMediaId: profile.photoMediaId,
      usualTeamSize: profile.usualTeamSize,
    };
  }
}

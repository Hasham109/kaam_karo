import { Injectable } from '@nestjs/common';
import { AppError } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service';
import type { UpdateCustomerProfileDto } from './dto/profile.dto';

@Injectable()
export class CustomerProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCustomerProfile(userId: string) {
    const existing = await this.prisma.customerProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.customerProfile.create({
      data: { userId },
    });
  }

  async getProfile(userId: string) {
    const profile = await this.ensureCustomerProfile(userId);
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
      email: user.email,
      preferredLanguage: user.preferredLanguage,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    await this.ensureCustomerProfile(userId);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.preferredLanguage !== undefined
          ? { preferredLanguage: dto.preferredLanguage }
          : {}),
      },
    });

    const profile = await this.prisma.customerProfile.findUniqueOrThrow({
      where: { userId },
    });

    return {
      id: profile.id,
      userId: updatedUser.id,
      phoneE164: updatedUser.phoneE164,
      displayName: updatedUser.displayName,
      email: updatedUser.email,
      preferredLanguage: updatedUser.preferredLanguage,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}

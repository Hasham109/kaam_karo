import { Injectable } from '@nestjs/common';
import { AppError } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service';
import { CustomerProfileService } from './customer-profile.service';
import type { AddFavoriteDto } from './dto/profile.dto';

@Injectable()
export class FavoriteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerProfileService: CustomerProfileService,
  ) {}

  async listFavorites(userId: string) {
    const profile = await this.customerProfileService.ensureCustomerProfile(userId);

    const favorites = await this.prisma.favorite.findMany({
      where: { customerProfileId: profile.id },
      include: {
        providerProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => ({
      id: f.id,
      customerProfileId: f.customerProfileId,
      providerProfileId: f.providerProfileId,
      businessName: f.providerProfile.businessName,
      notes: f.notes,
      createdAt: f.createdAt,
    }));
  }

  async addFavorite(userId: string, dto: AddFavoriteDto) {
    const profile = await this.customerProfileService.ensureCustomerProfile(userId);

    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: dto.providerProfileId },
    });
    if (!provider) {
      throw new AppError('PROVIDER_NOT_FOUND', 404, 'Provider profile does not exist');
    }

    const favorite = await this.prisma.favorite.upsert({
      where: {
        customerProfileId_providerProfileId: {
          customerProfileId: profile.id,
          providerProfileId: dto.providerProfileId,
        },
      },
      update: {
        notes: dto.notes ?? null,
      },
      create: {
        customerProfileId: profile.id,
        providerProfileId: dto.providerProfileId,
        notes: dto.notes ?? null,
      },
      include: {
        providerProfile: true,
      },
    });

    return {
      id: favorite.id,
      customerProfileId: favorite.customerProfileId,
      providerProfileId: favorite.providerProfileId,
      businessName: favorite.providerProfile.businessName,
      notes: favorite.notes,
      createdAt: favorite.createdAt,
    };
  }

  async removeFavorite(userId: string, providerProfileId: string) {
    const profile = await this.customerProfileService.ensureCustomerProfile(userId);

    const existing = await this.prisma.favorite.findUnique({
      where: {
        customerProfileId_providerProfileId: {
          customerProfileId: profile.id,
          providerProfileId,
        },
      },
    });

    if (!existing) {
      throw new AppError('FAVORITE_NOT_FOUND', 404, 'Favorite not found');
    }

    await this.prisma.favorite.delete({
      where: { id: existing.id },
    });
  }
}

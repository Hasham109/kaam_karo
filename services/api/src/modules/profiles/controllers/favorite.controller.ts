import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRoleType } from '../../../generated/prisma/client.js';
import {
  AuthGuard,
  type AuthenticatedRequest,
  RequireRole,
  RequireRoleGuard,
} from '../../identity';
import { FavoriteService } from '../favorite.service';
import type { AddFavoriteDto } from '../dto/profile.dto';

@Controller('profiles/customer/favorites')
@UseGuards(AuthGuard, RequireRoleGuard)
@RequireRole(UserRoleType.CUSTOMER)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Get()
  async listFavorites(@Req() req: AuthenticatedRequest) {
    const favorites = await this.favoriteService.listFavorites(req.user.id);
    return { favorites };
  }

  @Post()
  async addFavorite(@Req() req: AuthenticatedRequest, @Body() dto: AddFavoriteDto) {
    return this.favoriteService.addFavorite(req.user.id, dto);
  }

  @Delete(':providerProfileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(
    @Req() req: AuthenticatedRequest,
    @Param('providerProfileId') providerProfileId: string,
  ) {
    await this.favoriteService.removeFavorite(req.user.id, providerProfileId);
  }
}

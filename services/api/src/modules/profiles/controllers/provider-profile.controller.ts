import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { UserRoleType } from '../../../generated/prisma/client.js';
import {
  AuthGuard,
  type AuthenticatedRequest,
  Public,
  RequireRole,
  RequireRoleGuard,
} from '../../identity';
import { ProviderProfileService } from '../provider-profile.service';
import type { UpdateProviderProfileDto } from '../dto/profile.dto';

@Controller('profiles')
export class ProviderProfileController {
  constructor(private readonly providerProfileService: ProviderProfileService) {}

  @Get('provider/me')
  @UseGuards(AuthGuard, RequireRoleGuard)
  @RequireRole(UserRoleType.PROVIDER)
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.providerProfileService.getProfile(req.user.id);
  }

  @Patch('provider/me')
  @UseGuards(AuthGuard, RequireRoleGuard)
  @RequireRole(UserRoleType.PROVIDER)
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProviderProfileDto) {
    return this.providerProfileService.updateProfile(req.user.id, dto);
  }

  @Public()
  @Get('providers/:providerProfileId')
  async getPublicProfile(@Param('providerProfileId') providerProfileId: string) {
    return this.providerProfileService.getPublicProfile(providerProfileId);
  }
}

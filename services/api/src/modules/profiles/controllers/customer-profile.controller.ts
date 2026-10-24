import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UserRoleType } from '../../../generated/prisma/client.js';
import {
  AuthGuard,
  type AuthenticatedRequest,
  RequireRole,
  RequireRoleGuard,
} from '../../identity';
import { CustomerProfileService } from '../customer-profile.service';
import type { UpdateCustomerProfileDto } from '../dto/profile.dto';

@Controller('profiles/customer')
@UseGuards(AuthGuard, RequireRoleGuard)
@RequireRole(UserRoleType.CUSTOMER)
export class CustomerProfileController {
  constructor(private readonly customerProfileService: CustomerProfileService) {}

  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.customerProfileService.getProfile(req.user.id);
  }

  @Patch('me')
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateCustomerProfileDto) {
    return this.customerProfileService.updateProfile(req.user.id, dto);
  }
}

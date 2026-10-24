import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { AddressService } from '../address.service';
import type { CreateAddressDto, UpdateAddressDto } from '../dto/profile.dto';

@Controller('profiles/customer/addresses')
@UseGuards(AuthGuard, RequireRoleGuard)
@RequireRole(UserRoleType.CUSTOMER)
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  async listAddresses(@Req() req: AuthenticatedRequest) {
    const addresses = await this.addressService.listAddresses(req.user.id);
    return { addresses };
  }

  @Post()
  async createAddress(@Req() req: AuthenticatedRequest, @Body() dto: CreateAddressDto) {
    return this.addressService.createAddress(req.user.id, dto);
  }

  @Patch(':addressId')
  async updateAddress(
    @Req() req: AuthenticatedRequest,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.updateAddress(req.user.id, addressId, dto);
  }

  @Delete(':addressId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@Req() req: AuthenticatedRequest, @Param('addressId') addressId: string) {
    await this.addressService.deleteAddress(req.user.id, addressId);
  }
}

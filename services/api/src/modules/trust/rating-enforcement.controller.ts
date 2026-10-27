/**
 * RatingEnforcementController — REST Endpoints for Low-Rating Standing & Enforcement (Module M3/M12; owner A05).
 * Requirements: RATING-ENF-001..008, ROLE-003, D-014, D-017; BP §19, §8.3, §54.1 rule 73.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type AuthenticatedRequest, AuthGuard } from '../identity/guards/auth.guard.js';
import {
  RequireAdminSubRole,
  RequireAdminSubRoleGuard,
  RequireRole,
  RequireRoleGuard,
} from '../identity/guards/require-role.guard.js';
import { AdminSubRole, UserRoleType } from '../../generated/prisma/client.js';
import { RatingEnforcementService } from './rating-enforcement.service.js';
import type {
  RatingEnforcementReportDto,
  RatingStandingDetailsDto,
  ReinstateProviderDto,
  RunEnforcementJobOptions,
} from './rating-enforcement.types.js';

@Controller(['v1/providers', 'providers'])
export class ProviderRatingStandingController {
  constructor(private readonly enforcementService: RatingEnforcementService) {}

  /**
   * Retrieves current rating standing and warning details for a provider (D-014; BP §13 P04, P17).
   */
  @Get(':providerId/rating-standing')
  @UseGuards(AuthGuard)
  async getRatingStanding(
    @Param('providerId') providerId: string,
  ): Promise<RatingStandingDetailsDto> {
    return this.enforcementService.getProviderStandingDetails(providerId);
  }
}

@Controller(['v1/admin/trust', 'admin/trust'])
@UseGuards(AuthGuard, RequireRoleGuard, RequireAdminSubRoleGuard)
@RequireRole(UserRoleType.ADMIN)
export class AdminRatingEnforcementController {
  constructor(private readonly enforcementService: RatingEnforcementService) {}

  /**
   * Triggers the low-rating enforcement scheduled job (RATING-ENF-001..008, ARCH §6.7).
   * Restricted to Super Admin, Operations, or Risk/Trust staff.
   */
  @Post('rating-enforcement/run')
  @HttpCode(HttpStatus.OK)
  @RequireAdminSubRole(AdminSubRole.SUPER_ADMIN, AdminSubRole.OPERATIONS, AdminSubRole.RISK_TRUST)
  async triggerEnforcementRun(
    @Body() options?: RunEnforcementJobOptions,
  ): Promise<RatingEnforcementReportDto> {
    return this.enforcementService.runEnforcementJob(options);
  }

  /**
   * Retrieves provider standing details for admin inspection (BP §8.3, §14 A03/A04).
   */
  @Get('standing/:providerProfileId')
  @RequireAdminSubRole(AdminSubRole.SUPER_ADMIN, AdminSubRole.OPERATIONS, AdminSubRole.RISK_TRUST)
  async getProviderStanding(
    @Param('providerProfileId') providerProfileId: string,
  ): Promise<RatingStandingDetailsDto> {
    return this.enforcementService.getProviderStandingDetails(providerProfileId);
  }

  /**
   * Reinstates a blocked provider with a mandatory audited reason (RATING-ENF-006, ROLE-003; BP §8.3; D-014).
   * Restricted to Operations, Risk/Trust, or Super Admin sub-roles.
   */
  @Post('standing/:providerProfileId/reinstate')
  @HttpCode(HttpStatus.OK)
  @RequireAdminSubRole(AdminSubRole.SUPER_ADMIN, AdminSubRole.OPERATIONS, AdminSubRole.RISK_TRUST)
  async reinstateProvider(
    @Req() req: AuthenticatedRequest,
    @Param('providerProfileId') providerProfileId: string,
    @Body() dto: ReinstateProviderDto,
  ) {
    const adminUserId = req.user.id;
    const adminSubRoles = [...req.user.subRoles];
    return this.enforcementService.reinstateProvider(
      adminUserId,
      providerProfileId,
      dto,
      adminSubRoles,
    );
  }
}

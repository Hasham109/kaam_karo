/**
 * BadgesController & AdminBadgesController — REST endpoints for Badges & Reputation Rules (owner A05, T7.4).
 * Requirements: TRUST-BADGE-001..014, OPS-ADMIN-022, ROLE-003, D-010; BP §55.2, §66.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  type AuthenticatedRequest,
  AuthGuard,
  RequireRoleGuard,
  RequireAdminSubRoleGuard,
  RequireRole,
  RequireAdminSubRole,
} from '../identity/index.js';
import { UserRoleType, AdminSubRole } from '../../generated/prisma/client.js';
import { BadgesService } from './badges.service';
import type {
  AdminBadgeRuleItem,
  BadgeDefinition,
  BadgeType,
  ProviderBadgeItem,
  RecalculateBadgesDto,
  RecalculationSummary,
  UpdateBadgeRuleDto,
} from './trust.types';

@Controller(['v1/badges', 'badges'])
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /**
   * Get all platform badge definitions (BP §55.2; TRUST-BADGE-001..014).
   */
  @Get()
  async getBadgeDefinitions(): Promise<{ badges: BadgeDefinition[] }> {
    const badges = this.badgesService.getBadgeDefinitions();
    return { badges };
  }
}

@Controller(['v1/providers', 'providers'])
export class ProviderBadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /**
   * Get active badges for a provider (TRUST-BADGE-001..014).
   */
  @Get(':providerId/badges')
  async getProviderBadges(
    @Param('providerId') providerProfileId: string,
    @Query('serviceId') serviceId?: string,
  ): Promise<{ providerProfileId: string; badges: ProviderBadgeItem[] }> {
    const badges = await this.badgesService.getProviderBadges(providerProfileId, serviceId);
    return {
      providerProfileId,
      badges,
    };
  }
}

@Controller(['v1/admin/badges', 'admin/badges'])
@UseGuards(AuthGuard, RequireRoleGuard, RequireAdminSubRoleGuard)
@RequireRole(UserRoleType.ADMIN)
@RequireAdminSubRole(AdminSubRole.SUPER_ADMIN)
export class AdminBadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /**
   * Get admin badge rules and active holder counts (OPS-ADMIN-022, D-010).
   */
  @Get('rules')
  async getAdminBadgeRules(): Promise<{ rules: AdminBadgeRuleItem[] }> {
    const rules = await this.badgesService.getAdminBadgeRules();
    return { rules };
  }

  /**
   * Update configuration rule for a rule-based badge (OPS-ADMIN-022, ROLE-003, D-010).
   */
  @Put('rules/:badgeType')
  async updateAdminBadgeRule(
    @Req() req: AuthenticatedRequest,
    @Param('badgeType') badgeType: BadgeType,
    @Body() dto: UpdateBadgeRuleDto,
  ): Promise<AdminBadgeRuleItem> {
    return this.badgesService.updateAdminBadgeRule(badgeType, dto, req.user.id);
  }

  /**
   * Recalculate provider badges against configured rules (OPS-ADMIN-022, ROLE-003, D-010).
   */
  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculateBadges(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RecalculateBadgesDto,
  ): Promise<RecalculationSummary> {
    return this.badgesService.recalculateBadges(dto, req.user.id);
  }
}

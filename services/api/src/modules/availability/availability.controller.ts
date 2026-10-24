/**
 * Availability & Trust Controller (T3.6; owner A05).
 * Requirement IDs: AVAIL-001..007, TRUST-VER-001..004
 * BP §22, §59; ARCH §4 M3, M5, §6.5
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Public } from '../identity';
import { AvailabilityService } from './availability.service';
import { TrustService } from './trust.service';
import type {
  CheckAvailabilityRequestDto,
  DateOverrideDto,
  DecideVerificationDto,
  ServiceAreaDto,
  SubmitVerificationDto,
  UpdateLiveStatusDto,
  UpdateWeeklyScheduleDto,
} from './availability.types';

@Controller(['v1', ''])
@UseGuards(AuthGuard)
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
    private readonly trustService: TrustService,
  ) {}

  // --- Weekly Schedule & Breaks (AVAIL-001, AVAIL-002) ---

  @Public()
  @Get('providers/:providerId/availability/schedule')
  async getWeeklySchedule(@Param('providerId') providerId: string) {
    return this.availabilityService.getWeeklySchedule(providerId);
  }

  @Public()
  @Put('providers/:providerId/availability/schedule')
  async updateWeeklySchedule(
    @Param('providerId') providerId: string,
    @Body() body: UpdateWeeklyScheduleDto,
  ) {
    return this.availabilityService.updateWeeklySchedule(providerId, body);
  }

  // --- Date Overrides (AVAIL-003) ---

  @Public()
  @Get('providers/:providerId/availability/date-overrides')
  async getDateOverrides(
    @Param('providerId') providerId: string,
    @Query('fromDate') fromDate?: string,
  ) {
    const overrides = await this.availabilityService.getDateOverrides(providerId, fromDate);
    return { overrides };
  }

  @Public()
  @Post('providers/:providerId/availability/date-overrides')
  @HttpCode(HttpStatus.CREATED)
  async setDateOverride(@Param('providerId') providerId: string, @Body() body: DateOverrideDto) {
    return this.availabilityService.setDateOverride(providerId, body);
  }

  @Public()
  @Delete('providers/:providerId/availability/date-overrides/:ruleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDateOverride(
    @Param('providerId') providerId: string,
    @Param('ruleId') ruleId: string,
  ) {
    await this.availabilityService.deleteDateOverride(providerId, ruleId);
  }

  // --- Live Status & Capacity (AVAIL-006, AVAIL-007) ---

  @Public()
  @Get('providers/:providerId/availability/live-status')
  async getLiveStatus(@Param('providerId') providerId: string) {
    return this.availabilityService.getLiveStatus(providerId);
  }

  @Public()
  @Post('providers/:providerId/availability/live-status')
  async updateLiveStatus(
    @Param('providerId') providerId: string,
    @Body() body: UpdateLiveStatusDto,
  ) {
    return this.availabilityService.updateLiveStatus(providerId, body);
  }

  // --- Service Area (AVAIL-005) ---

  @Public()
  @Get('providers/:providerId/availability/service-area')
  async getServiceArea(@Param('providerId') providerId: string) {
    const areas = await this.availabilityService.getServiceAreas(providerId);
    return {
      providerProfileId: providerId,
      areas,
    };
  }

  @Public()
  @Put('providers/:providerId/availability/service-area')
  async setServiceArea(@Param('providerId') providerId: string, @Body() body: ServiceAreaDto) {
    return this.availabilityService.setServiceArea(providerId, body);
  }

  // --- Availability Check (AVAIL-001..007, MATCH-ELIG-075..079) ---

  @Public()
  @Post('providers/:providerId/availability/check')
  async checkAvailability(
    @Param('providerId') providerId: string,
    @Body() body: CheckAvailabilityRequestDto,
  ) {
    return this.availabilityService.checkSlotAvailability(providerId, body);
  }

  // --- Trust & Verification (TRUST-VER-001..004) ---

  @Public()
  @Get('providers/:providerId/trust/standing')
  async getProviderStanding(@Param('providerId') providerId: string) {
    return this.trustService.getProviderStanding(providerId);
  }

  @Public()
  @Post('providers/:providerId/trust/verification')
  @HttpCode(HttpStatus.CREATED)
  async submitVerification(
    @Param('providerId') providerId: string,
    @Body() body: SubmitVerificationDto,
  ) {
    return this.trustService.submitVerification(providerId, body);
  }

  @Public()
  @Post('admin/trust/verification/:recordId/decide')
  async decideVerification(
    @Param('recordId') recordId: string,
    @Body() body: DecideVerificationDto,
  ) {
    return this.trustService.decideVerification(recordId, body);
  }
}

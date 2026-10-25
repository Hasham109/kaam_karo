/**
 * IntakeController — REST Endpoints for Request & AI Intake Module (T3.3; owner A07).
 * Requirement IDs: REQ-AI-001..012, OPS-ADMIN-026, CAT-SVC-004.
 * ARCH §4 M7, §6.2, §10; BP §56, §66, §67, §77, §79.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Public } from '../identity/index.js';
import { IntakeService } from './intake.service.js';
import type {
  AiInteractionRecord,
  ConfirmCustomerRequestDto,
  CreateCustomerRequestDto,
  CustomerRequestResponse,
  InterpretIntentInput,
  InterpretIntentResponse,
} from './intake.types.js';

@Controller(['v1/intake', 'intake'])
@UseGuards(AuthGuard)
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  /**
   * Interpret customer voice transcript or typed text with AI.
   * Public endpoint to support pre-login or draft onboarding interpretation.
   */
  @Public()
  @Post('interpret')
  @HttpCode(HttpStatus.OK)
  async interpret(@Body() body: InterpretIntentInput): Promise<InterpretIntentResponse> {
    return this.intakeService.interpret(body);
  }

  /**
   * Create a customer request (draft or direct).
   */
  @Public()
  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  async createRequest(@Body() body: CreateCustomerRequestDto): Promise<CustomerRequestResponse> {
    return this.intakeService.createRequest(body);
  }

  /**
   * Get customer request details by ID.
   */
  @Public()
  @Get('requests/:id')
  async getRequest(@Param('id') id: string): Promise<CustomerRequestResponse> {
    return this.intakeService.getRequest(id);
  }

  /**
   * Customer confirms and submits the request.
   */
  @Public()
  @Post('requests/:id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmRequest(
    @Param('id') id: string,
    @Body() body: ConfirmCustomerRequestDto,
  ): Promise<CustomerRequestResponse> {
    return this.intakeService.confirmRequest(id, body);
  }

  /**
   * List AI decision audit interactions for a request.
   */
  @Public()
  @Get('requests/:id/ai-interactions')
  async listAiInteractions(
    @Param('id') id: string,
  ): Promise<{ items: readonly AiInteractionRecord[] }> {
    const items = await this.intakeService.listAiInteractions(id);
    return { items };
  }
}

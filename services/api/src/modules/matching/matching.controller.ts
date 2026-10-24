/**
 * MatchingController — REST Endpoints for Supplier Matching Engine (T3.7; owner A05).
 * Requirement IDs: MATCH-ELIG-073..079, MATCH-SCORE-001..013, MATCH-FAIR-001..004,
 * MATCH-EXPL-001, MATCH-MODE-001, MATCH-GAP-001, OPS-ADMIN-021; BP §54, §61.3, §68; D-005, D-010, D-020
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
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest, Public } from '../identity/index.js';
import { MatchingService } from './matching.service.js';
import type {
  FindMatchesOptions,
  MatchingConfig,
  MatchingFairnessConfig,
  MatchingWeights,
  MatchRunResult,
} from './matching.types.js';

@Controller(['v1/matching', 'matching'])
@UseGuards(AuthGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  /**
   * Evaluates suppliers against hard filters 73-79, calculates scores, and returns ranked matches
   * or structured supply-gap next actions (MATCH-ELIG-073..079, MATCH-SCORE-001..013, MATCH-GAP-001).
   */
  @Public()
  @Post('requests/:requestId/find-matches')
  @HttpCode(HttpStatus.OK)
  async findMatches(
    @Param('requestId') requestId: string,
    @Body() body: FindMatchesOptions,
  ): Promise<MatchRunResult> {
    return this.matchingService.findMatchesForRequest(requestId, body);
  }

  /**
   * Retrieves evaluated match candidates and ranking records for a customer request (BP §66).
   */
  @Public()
  @Get('requests/:requestId/candidates')
  async getCandidates(@Param('requestId') requestId: string) {
    return this.matchingService.getMatchCandidates(requestId);
  }

  /**
   * Retrieves active matching weights and fairness parameters (OPS-ADMIN-021).
   */
  @Public()
  @Get('config')
  async getConfig(): Promise<MatchingConfig> {
    return this.matchingService.getActiveMatchingConfig();
  }

  /**
   * Updates matching weights and fairness configuration without application deployment (OPS-ADMIN-021, MATCH-FAIR-004).
   */
  @Put('config')
  async updateConfig(
    @Body()
    body: {
      reason: string;
      weights?: Partial<MatchingWeights>;
      fairness?: Partial<MatchingFairnessConfig>;
    },
    @Req() req: AuthenticatedRequest,
  ): Promise<MatchingConfig> {
    return this.matchingService.updateMatchingConfig(body, req.user?.id);
  }
}

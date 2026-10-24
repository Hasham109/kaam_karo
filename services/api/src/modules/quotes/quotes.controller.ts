/**
 * QuotesController — REST Endpoints for Quotes & Fare Module (T3.5; owner A04).
 * Requirement IDs: QUOTE-001..009, FARE-001..013, PRICE-001..007, BOOK-STATUS-010, COMM-003.
 * ARCH §4 M10, §5.6, §6.3, §6.6; BP §17, §18, §53, §58; D-004, D-015, D-018, D-025, D-028, D-029.
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
import { AuthGuard, type AuthenticatedRequest, Public } from '../identity/index.js';
import { QuotesService } from './quotes.service.js';
import {
  ActorRole,
  type CreateQuoteDto,
  type ProposeFareLineDto,
  type ProposeCrewSizeChangeDto,
  type DecideCrewSizeChangeDto,
} from './quotes.types.js';

function resolveCaller(req: AuthenticatedRequest): { userId: string; role: ActorRole } {
  const user = req.user;
  let role: ActorRole = ActorRole.CUSTOMER;
  if (user?.role === 'PROVIDER') role = ActorRole.PROVIDER;
  else if (user?.role === 'ADMIN' || user?.role === 'STAFF') role = ActorRole.ADMIN;
  return { userId: user?.id ?? '00000000-0000-0000-0000-000000000001', role };
}

@Controller(['v1', ''])
@UseGuards(AuthGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Public()
  @Post('quotes')
  @HttpCode(HttpStatus.CREATED)
  async createQuote(@Body() body: CreateQuoteDto, @Req() req: AuthenticatedRequest) {
    const { userId } = resolveCaller(req);
    return this.quotesService.createQuote(body, userId);
  }

  @Public()
  @Get('quotes/:id')
  async getQuote(@Param('id') id: string) {
    return this.quotesService.getQuote(id);
  }

  @Public()
  @Get('bookings/:bookingId/quotes')
  async getBookingQuotes(@Param('bookingId') bookingId: string) {
    return this.quotesService.getBookingQuotes(bookingId);
  }

  @Public()
  @Post('quotes/:id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptQuote(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { userId } = resolveCaller(req);
    return this.quotesService.acceptQuote(id, userId);
  }

  @Public()
  @Post('quotes/:id/decline')
  @HttpCode(HttpStatus.OK)
  async declineQuote(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId } = resolveCaller(req);
    return this.quotesService.declineQuote(id, userId, body?.reason);
  }

  @Public()
  @Post('quotes/:id/clarification')
  @HttpCode(HttpStatus.OK)
  async requestClarification(
    @Param('id') id: string,
    @Body() body: { message: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId } = resolveCaller(req);
    return this.quotesService.requestClarification(id, userId, body.message);
  }

  @Public()
  @Post('bookings/:bookingId/fare-lines')
  @HttpCode(HttpStatus.CREATED)
  async proposeFareLine(
    @Param('bookingId') bookingId: string,
    @Body() body: ProposeFareLineDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, role } = resolveCaller(req);
    return this.quotesService.proposeFareLine(bookingId, body, userId, role);
  }

  @Public()
  @Get('bookings/:bookingId/fare-lines')
  async getBookingFareLines(@Param('bookingId') bookingId: string) {
    return this.quotesService.getBookingFareLines(bookingId);
  }

  @Public()
  @Post('fare-lines/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveFareLine(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { userId } = resolveCaller(req);
    return this.quotesService.approveFareLine(id, userId);
  }

  @Public()
  @Post('fare-lines/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectFareLine(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId } = resolveCaller(req);
    return this.quotesService.rejectFareLine(id, userId, body?.reason);
  }

  @Public()
  @Post('bookings/:bookingId/crew-size-change')
  @HttpCode(HttpStatus.OK)
  async proposeCrewSizeChange(
    @Param('bookingId') bookingId: string,
    @Body() body: ProposeCrewSizeChangeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId } = resolveCaller(req);
    return this.quotesService.proposeCrewSizeChange(bookingId, body, userId);
  }

  @Public()
  @Post('bookings/:bookingId/crew-size-change/decide')
  @HttpCode(HttpStatus.OK)
  async decideCrewSizeChange(
    @Param('bookingId') bookingId: string,
    @Body() body: DecideCrewSizeChangeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId } = resolveCaller(req);
    return this.quotesService.decideCrewSizeChange(bookingId, body, userId);
  }

  @Public()
  @Get('bookings/:bookingId/payable-summary')
  async getPayableSummary(@Param('bookingId') bookingId: string) {
    return this.quotesService.getPayableSummary(bookingId);
  }
}

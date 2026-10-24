/**
 * BookingController — REST Endpoints for Booking State Machine (T3.4; owner A04).
 * Requirement IDs: BOOK-STATUS-001..017, BOOK-CANCEL-001..006, DATA-002, DATA-004.
 * BP §15, §16, §21, §25; ARCH §4 M9, §6.1; D-003, D-004, D-018, D-021, D-028.
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
import { BookingService } from './booking.service.js';
import {
  ActorRole,
  type CreateBookingDto,
  type RequestTransitionDto,
  type CancelBookingDto,
  type RecordNoShowDto,
  type SafetyStopDto,
} from './booking.types.js';

function resolveCaller(req: AuthenticatedRequest): { userId?: string; role: ActorRole } {
  const user = req.user;
  let role: ActorRole = ActorRole.CUSTOMER;
  if (user?.role === 'PROVIDER') role = ActorRole.PROVIDER;
  else if (user?.role === 'ADMIN' || user?.role === 'STAFF') role = ActorRole.ADMIN;
  return { userId: user?.id, role };
}

@Controller(['v1', ''])
@UseGuards(AuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Public()
  @Post('bookings')
  @HttpCode(HttpStatus.CREATED)
  async createBooking(@Body() body: CreateBookingDto, @Req() req: AuthenticatedRequest) {
    const { userId, role } = resolveCaller(req);
    return this.bookingService.createBooking(body, userId, role);
  }

  @Public()
  @Get('bookings/:id')
  async getBooking(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const { role } = resolveCaller(req);
    return this.bookingService.getBookingById(id, role);
  }

  @Public()
  @Post('bookings/:id/transitions')
  @HttpCode(HttpStatus.OK)
  async requestTransition(
    @Param('id') id: string,
    @Body() body: RequestTransitionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, role } = resolveCaller(req);
    return this.bookingService.requestTransition(id, body, userId, role);
  }

  @Public()
  @Post('bookings/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @Param('id') id: string,
    @Body() body: CancelBookingDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, role } = resolveCaller(req);
    return this.bookingService.cancelBooking(id, body, userId, role);
  }

  @Public()
  @Post('bookings/:id/no-show')
  @HttpCode(HttpStatus.OK)
  async recordNoShow(
    @Param('id') id: string,
    @Body() body: RecordNoShowDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, role } = resolveCaller(req);
    return this.bookingService.recordNoShow(id, body, userId, role);
  }

  @Public()
  @Post('bookings/:id/safety-stop')
  @HttpCode(HttpStatus.OK)
  async safetyStop(
    @Param('id') id: string,
    @Body() body: SafetyStopDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, role } = resolveCaller(req);
    return this.bookingService.safetyStop(id, body, userId, role);
  }

  @Public()
  @Get('bookings/:id/events')
  async getBookingEvents(@Param('id') id: string) {
    return this.bookingService.getBookingEvents(id);
  }
}

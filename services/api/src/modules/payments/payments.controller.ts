/**
 * PaymentsController — REST endpoints for Payment & Settlement (T6.1; owner A09).
 * Requirement IDs: PAY-001..003, PAY-008, PAY-TIMING-001, LEDGER-001..002.
 * ARCH §4 M11, §6.8; BP §17, §25, §26, §31.2; D-003, D-006, D-008, D-015, D-016, D-030.
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
import { PaymentsService } from './payments.service.js';
import {
  ActorRole,
  type InitiatePaymentDto,
  type ConfirmPaymentDto,
  type RecordCashPaymentDto,
} from './payments.types.js';

function resolveCaller(req: AuthenticatedRequest): { userId?: string; role: ActorRole } {
  const user = req.user;
  let role: ActorRole = ActorRole.CUSTOMER;
  if (user?.role === 'PROVIDER') role = ActorRole.PROVIDER;
  else if (user?.role === 'ADMIN' || user?.role === 'STAFF') role = ActorRole.ADMIN;
  return { userId: user?.id, role };
}

@Controller(['v1/payments', 'payments'])
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiatePayment(@Body() body: InitiatePaymentDto, @Req() req: AuthenticatedRequest) {
    const { userId, role } = resolveCaller(req);
    return this.paymentsService.initiatePayment(body, userId, role);
  }

  @Public()
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(@Body() body: ConfirmPaymentDto) {
    return this.paymentsService.confirmDigitalPayment(body);
  }

  @Public()
  @Post('cash-record')
  @HttpCode(HttpStatus.CREATED)
  async recordCashPayment(@Body() body: RecordCashPaymentDto, @Req() req: AuthenticatedRequest) {
    const { userId } = resolveCaller(req);
    return this.paymentsService.recordCashPayment(body, userId ?? 'provider-user');
  }

  @Public()
  @Get('booking/:bookingId')
  async getBookingPayment(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getBookingPaymentStatus(bookingId);
  }
}

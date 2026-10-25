/**
 * PaymentsController — REST endpoints for Payment & Settlement (T6.1; owner A09).
 * Requirement IDs: PAY-001..003, PAY-008, PAY-TIMING-001, LEDGER-001..002, LEDGER-006.
 * ARCH §4 M11, §6.8; BP §17, §25, §26, §29, §31.2; D-003, D-006, D-008, D-015, D-016, D-030.
 *
 * Access rules (deny by default, BP §29):
 *  - every endpoint needs a valid session, except the gateway callback `confirm`;
 *  - cash is recorded only by the booking's own provider (D-030);
 *  - a provider reads only their own balance/ledger; staff read it only through the admin
 *    endpoint (Finance / Super Admin, MFA-verified admin portal session).
 */
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminSubRole, UserRoleType } from '../../generated/prisma/client.js';
import {
  AuthGuard,
  type AuthenticatedRequest,
  Public,
  RequireAdminSubRole,
  RequireAdminSubRoleGuard,
  RequireRole,
  RequireRoleGuard,
} from '../identity/index.js';
import { PaymentsService } from './payments.service.js';
import { CommissionService } from './commission.service.js';
import { LedgerService } from './ledger.service.js';
import {
  ActorRole,
  type InitiatePaymentDto,
  type ConfirmPaymentDto,
  type RecordCashPaymentDto,
} from './payments.types.js';

/** Admin sub-roles allowed to see money data (OQ-052: everything else stays denied). */
const FINANCE_SUB_ROLES: readonly AdminSubRole[] = [AdminSubRole.FINANCE, AdminSubRole.SUPER_ADMIN];

/**
 * Maps the authenticated session to the acting role. The client surface decides which of a
 * user's roles is acting, so a user holding two roles cannot cross over (BP §25, ROLE-002).
 */
function resolveCaller(req: AuthenticatedRequest): { userId: string; role: ActorRole } {
  const user = req.user;
  if (!user) throw new ForbiddenException({ code: 'UNAUTHENTICATED' });

  if (user.surface === 'ADMIN_PORTAL' && user.roles.includes(UserRoleType.ADMIN)) {
    return { userId: user.id, role: ActorRole.ADMIN };
  }
  if (user.surface === 'PARTNER_APP' && user.roles.includes(UserRoleType.PROVIDER)) {
    return { userId: user.id, role: ActorRole.PROVIDER };
  }
  if (user.surface === 'CUSTOMER_APP' && user.roles.includes(UserRoleType.CUSTOMER)) {
    return { userId: user.id, role: ActorRole.CUSTOMER };
  }
  throw new ForbiddenException({ code: 'FORBIDDEN' });
}

function assertFinanceStaff(req: AuthenticatedRequest): void {
  const user = req.user;
  const allowed =
    user.surface === 'ADMIN_PORTAL' &&
    user.mfaVerifiedAt !== null &&
    user.subRoles.some((s) => FINANCE_SUB_ROLES.includes(s));
  if (!allowed) {
    throw new ForbiddenException({ code: 'FORBIDDEN_FOR_SUB_ROLE' });
  }
}

@Controller(['v1/payments', 'payments'])
@UseGuards(AuthGuard, RequireRoleGuard, RequireAdminSubRoleGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly commissionService: CommissionService,
    private readonly ledgerService: LedgerService,
  ) {}

  @Post('initiate')
  @RequireRole(UserRoleType.CUSTOMER, UserRoleType.PROVIDER)
  @HttpCode(HttpStatus.CREATED)
  async initiatePayment(@Body() body: InitiatePaymentDto, @Req() req: AuthenticatedRequest) {
    const { userId, role } = resolveCaller(req);
    await this.paymentsService.assertCallerMayAccessBooking(body.bookingId, userId, role);
    return this.paymentsService.initiatePayment(body, userId, role);
  }

  /**
   * Gateway callback: carries no user session, so it stays public.
   * TODO(T6.5): verify the real gateway's webhook signature before this goes live (D-008).
   */
  @Public()
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(@Body() body: ConfirmPaymentDto) {
    return this.paymentsService.confirmDigitalPayment(body);
  }

  @Post('cash-record')
  @RequireRole(UserRoleType.PROVIDER)
  @HttpCode(HttpStatus.CREATED)
  async recordCashPayment(@Body() body: RecordCashPaymentDto, @Req() req: AuthenticatedRequest) {
    const { userId, role } = resolveCaller(req);
    await this.paymentsService.assertCallerMayAccessBooking(body.bookingId, userId, role);
    return this.paymentsService.recordCashPayment(body, userId);
  }

  @Get('booking/:bookingId')
  async getBookingPayment(@Param('bookingId') bookingId: string, @Req() req: AuthenticatedRequest) {
    const { userId, role } = resolveCaller(req);
    if (role === ActorRole.ADMIN) assertFinanceStaff(req);
    await this.paymentsService.assertCallerMayAccessBooking(bookingId, userId, role);
    return this.paymentsService.getBookingPaymentStatus(bookingId);
  }

  @Get('booking/:bookingId/fee-display')
  async getBookingFeeDisplay(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, role } = resolveCaller(req);
    if (role === ActorRole.ADMIN) assertFinanceStaff(req);
    await this.paymentsService.assertCallerMayAccessBooking(bookingId, userId, role);
    const split = await this.commissionService.calculateSplit({ bookingId });
    if (role === ActorRole.CUSTOMER) {
      return {
        role: 'CUSTOMER',
        feeDisplay: this.commissionService.getCustomerFeeDisplay(split),
      };
    }
    if (role === ActorRole.PROVIDER) {
      return {
        role: 'PROVIDER',
        feeDisplay: this.commissionService.getProviderFeeDisplay(split),
      };
    }
    return {
      role: 'ADMIN',
      feeDisplay: this.commissionService.getFinanceFeeDisplay(split),
    };
  }

  @Get('provider/:providerProfileId/balance')
  @RequireRole(UserRoleType.PROVIDER)
  async getProviderBalance(
    @Param('providerProfileId') providerProfileId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.ledgerService.assertProviderOwnsProfile(req.user.id, providerProfileId);
    return this.ledgerService.getProviderBalance(providerProfileId);
  }

  @Get('provider/:providerProfileId/ledger')
  @RequireRole(UserRoleType.PROVIDER)
  async getProviderLedger(
    @Param('providerProfileId') providerProfileId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.ledgerService.assertProviderOwnsProfile(req.user.id, providerProfileId);
    return this.ledgerService.getProviderLedgerHistory(providerProfileId);
  }

  @Get('admin/provider/:providerProfileId/ledger')
  @RequireRole(UserRoleType.ADMIN)
  @RequireAdminSubRole(...FINANCE_SUB_ROLES)
  async getAdminProviderLedger(@Param('providerProfileId') providerProfileId: string) {
    const balance = await this.ledgerService.getProviderBalance(providerProfileId);
    const history = await this.ledgerService.getProviderLedgerHistory(providerProfileId, 100);
    return { balance, history };
  }
}

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
  Headers,
  HttpCode,
  HttpStatus,
  Optional,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminSubRole, SettlementStatus, UserRoleType } from '../../generated/prisma/client.js';
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
import { RefundService } from './refund.service.js';
import { SettlementService } from './settlement.service.js';
import { LedgerAdjustmentService } from './ledger-adjustment.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import {
  ActorRole,
  type InitiatePaymentDto,
  type ConfirmPaymentDto,
  type RecordCashPaymentDto,
  type SubmitCommissionPaymentDto,
  type DecideCommissionPaymentDto,
  type CreateRefundDto,
  type CreateSettlementDto,
  type CreateLedgerCorrectionDto,
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
    @Optional() private readonly refundService?: RefundService,
    @Optional() private readonly settlementService?: SettlementService,
    @Optional() private readonly adjustmentsService?: LedgerAdjustmentService,
    @Optional() private readonly reconciliationService?: ReconciliationService,
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

  /**
   * Safepay Webhook Endpoint (Module M11, Task T6.5; PAY-001, PAY-008; SEC-BASE-009; D-008).
   * Verifies cryptographic HMAC-SHA256 signature from `x-sfpy-signature` header before processing event.
   */
  @Public()
  @Post('webhook/safepay')
  @HttpCode(HttpStatus.OK)
  async handleSafepayWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-sfpy-signature') signature: string | undefined,
    @Req()
    req: { rawBody?: Buffer | string; headers?: Record<string, string | string[] | undefined> },
  ) {
    const rawPayload = req.rawBody ?? (typeof body === 'string' ? body : JSON.stringify(body));
    return this.paymentsService.handleSafepayWebhook({
      body,
      signature:
        signature ??
        (typeof req.headers?.['x-sfpy-signature'] === 'string'
          ? req.headers['x-sfpy-signature']
          : undefined),
      rawPayload,
    });
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

  @Post('company/submit')
  @RequireRole(UserRoleType.PROVIDER)
  @HttpCode(HttpStatus.CREATED)
  async submitCommissionPayment(
    @Body() body: SubmitCommissionPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.ledgerService.assertProviderOwnsProfile(req.user.id, body.providerProfileId);
    return this.ledgerService.submitCommissionPayment(body, req.user.id);
  }

  @Get('company/submissions/provider/:providerProfileId')
  @RequireRole(UserRoleType.PROVIDER)
  async getProviderCommissionSubmissions(
    @Param('providerProfileId') providerProfileId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.ledgerService.assertProviderOwnsProfile(req.user.id, providerProfileId);
    return this.ledgerService.getProviderCommissionSubmissions(providerProfileId);
  }

  @Get('company/submissions/pending')
  @RequireRole(UserRoleType.ADMIN)
  @RequireAdminSubRole(...FINANCE_SUB_ROLES)
  async getPendingCommissionSubmissions() {
    return this.ledgerService.getPendingCommissionSubmissions(100);
  }

  @Post('company/submissions/:submissionId/decision')
  @RequireRole(UserRoleType.ADMIN)
  @RequireAdminSubRole(...FINANCE_SUB_ROLES)
  @HttpCode(HttpStatus.OK)
  async decideCommissionPayment(
    @Param('submissionId') submissionId: string,
    @Body() body: DecideCommissionPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ledgerService.decideCommissionPayment(submissionId, body, req.user.id);
  }

  @Get('provider/:providerProfileId/unpaid-block')
  async getProviderHiringBlock(
    @Param('providerProfileId') providerProfileId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, role } = resolveCaller(req);
    if (role === ActorRole.PROVIDER) {
      await this.ledgerService.assertProviderOwnsProfile(userId, providerProfileId);
    } else if (role === ActorRole.ADMIN) {
      assertFinanceStaff(req);
    }
    return this.ledgerService.isProviderHiringBlocked(providerProfileId);
  }

  // --- T6.3 Refunds (PAY-004, PAY-006, SUP-004; A09) ---

  @Post('refunds')
  @RequireRole(UserRoleType.ADMIN)
  @RequireAdminSubRole(...FINANCE_SUB_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async issueRefund(@Body() body: CreateRefundDto, @Req() req: AuthenticatedRequest) {
    assertFinanceStaff(req);
    if (!this.refundService) throw new ForbiddenException();
    return this.refundService.createRefund(body, {
      userId: req.user.id,
      subRoles: req.user.subRoles,
    });
  }

  @Get('booking/:bookingId/refundable')
  async getBookingRefundable(
    @Param('bookingId') bookingId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, role } = resolveCaller(req);
    if (role === ActorRole.ADMIN) assertFinanceStaff(req);
    await this.paymentsService.assertCallerMayAccessBooking(bookingId, userId, role);
    if (!this.refundService) throw new ForbiddenException();
    return this.refundService.getRefundableAmount(bookingId);
  }

  @Get('booking/:bookingId/refunds')
  async getBookingRefunds(@Param('bookingId') bookingId: string, @Req() req: AuthenticatedRequest) {
    const { userId, role } = resolveCaller(req);
    if (role === ActorRole.ADMIN) assertFinanceStaff(req);
    await this.paymentsService.assertCallerMayAccessBooking(bookingId, userId, role);
    if (!this.refundService) throw new ForbiddenException();
    return this.refundService.listBookingRefunds(bookingId);
  }

  // --- T6.3 Settlements (PAY-007, LEDGER-005, LEDGER-007; A10) ---

  @Post('settlements')
  @RequireRole(UserRoleType.ADMIN)
  @RequireAdminSubRole(...FINANCE_SUB_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createSettlement(@Body() body: CreateSettlementDto, @Req() req: AuthenticatedRequest) {
    assertFinanceStaff(req);
    if (!this.settlementService) throw new ForbiddenException();
    return this.settlementService.createSettlement(body, {
      userId: req.user.id,
      subRoles: req.user.subRoles,
    });
  }

  @Get('settlements/ready')
  @RequireRole(UserRoleType.ADMIN)
  @RequireAdminSubRole(...FINANCE_SUB_ROLES)
  async getReadyToSettle() {
    if (!this.settlementService) throw new ForbiddenException();
    return this.settlementService.listReadyToSettle();
  }

  @Get('settlements')
  @RequireRole(UserRoleType.ADMIN)
  @RequireAdminSubRole(...FINANCE_SUB_ROLES)
  async listSettlements(
    @Query('providerProfileId') providerProfileId?: string,
    @Query('status') status?: SettlementStatus,
  ) {
    if (!this.settlementService) throw new ForbiddenException();
    return this.settlementService.listSettlements({ providerProfileId, status });
  }

  @Get('provider/:providerProfileId/settlements')
  @RequireRole(UserRoleType.PROVIDER, UserRoleType.ADMIN)
  async getProviderSettlements(
    @Param('providerProfileId') providerProfileId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const { userId, role } = resolveCaller(req);
    if (role === ActorRole.PROVIDER) {
      await this.ledgerService.assertProviderOwnsProfile(userId, providerProfileId);
    } else if (role === ActorRole.ADMIN) {
      assertFinanceStaff(req);
    }
    if (!this.settlementService) throw new ForbiddenException();
    return this.settlementService.listSettlements({ providerProfileId });
  }

  // --- T6.3 Ledger Corrections (PAY-004, LEDGER-005; A09) ---

  @Post('ledger/corrections')
  @RequireRole(UserRoleType.ADMIN)
  @RequireAdminSubRole(...FINANCE_SUB_ROLES)
  @HttpCode(HttpStatus.CREATED)
  async createLedgerCorrection(
    @Body() body: CreateLedgerCorrectionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    assertFinanceStaff(req);
    if (!this.adjustmentsService) throw new ForbiddenException();
    return this.adjustmentsService.createCorrection(body, {
      userId: req.user.id,
      subRoles: req.user.subRoles,
    });
  }

  // --- T6.3 Reconciliation & Exceptions (PAY-005; A09) ---

  @Post('reconciliation/run')
  @RequireRole(UserRoleType.ADMIN)
  @RequireAdminSubRole(...FINANCE_SUB_ROLES)
  @HttpCode(HttpStatus.OK)
  async runReconciliation(@Req() req: AuthenticatedRequest) {
    assertFinanceStaff(req);
    if (!this.reconciliationService) throw new ForbiddenException();
    return this.reconciliationService.runReconciliation({
      userId: req.user.id,
      subRoles: req.user.subRoles,
    });
  }

  @Get('reconciliation/exceptions')
  @RequireRole(UserRoleType.ADMIN)
  @RequireAdminSubRole(...FINANCE_SUB_ROLES)
  async getReconciliationExceptions(@Req() req: AuthenticatedRequest) {
    assertFinanceStaff(req);
    if (!this.reconciliationService) throw new ForbiddenException();
    const report = await this.reconciliationService.runReconciliation({
      userId: req.user.id,
      subRoles: req.user.subRoles,
    });
    return report.exceptions;
  }
}

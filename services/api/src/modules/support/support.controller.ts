/**
 * SupportController & AdminSupportController — Support & Disputes REST Endpoints (owner A10, T7.5).
 * Requirements: SUP-001..005, OPS-ADMIN-010, OPS-ADMIN-012, CFG-RULE-012, ROLE-003, BOOK-STATUS-012.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  type AuthenticatedRequest,
  AuthGuard,
  RequireAdminSubRoleGuard,
  RequireAdminSubRole,
} from '../identity/index.js';
import { AdminSubRole } from '../../generated/prisma/client.js';
import { SupportService } from './support.service.js';
import {
  SupportLevel,
  TicketStatus,
  type AddCaseUpdateDto,
  type AdminCaseUpdateDto,
  type AdminDisputeItemDto,
  type AdminSupportTicketItemDto,
  type AssignTicketDto,
  type CaseUpdateResponseDto,
  type CloseTicketDto,
  type CreateDisputeDto,
  type CreateSupportTicketDto,
  type DecideDisputeDto,
  type DisputeDetailDto,
  type DisputeOutcome,
  type DisputeResponseDto,
  type EscalateLevelDto,
  type FaqItemDto,
  type SetCategoryDto,
  type SupportTicketDetailDto,
  type SupportTicketResponseDto,
} from './support.types.js';

@Controller(['v1/support', 'support'])
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('faq')
  async getFaqList(@Query('audience') audience?: 'CUSTOMER' | 'PROVIDER'): Promise<FaqItemDto[]> {
    return this.supportService.getFaqList(audience);
  }

  @Get('tickets')
  @UseGuards(AuthGuard)
  async listMyTickets(@Req() req: AuthenticatedRequest): Promise<SupportTicketResponseDto[]> {
    return this.supportService.listMyTickets(req.user.id);
  }

  @Post('tickets')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSupportTicketDto,
  ): Promise<SupportTicketResponseDto> {
    const role = (req.user.roles?.[0] as 'CUSTOMER' | 'PROVIDER') ?? 'CUSTOMER';
    return this.supportService.createTicket(req.user.id, role, dto);
  }

  @Get('tickets/:ticketId')
  @UseGuards(AuthGuard)
  async getTicket(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
  ): Promise<SupportTicketDetailDto> {
    const isStaff = Boolean(req.user.subRoles && req.user.subRoles.length > 0);
    return this.supportService.getTicket(req.user.id, isStaff, ticketId);
  }

  @Post('tickets/:ticketId/updates')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addTicketUpdate(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body() dto: AddCaseUpdateDto,
  ): Promise<CaseUpdateResponseDto> {
    const role = (req.user.roles?.[0] as 'CUSTOMER' | 'PROVIDER') ?? 'CUSTOMER';
    return this.supportService.addTicketUpdate(req.user.id, role, ticketId, dto);
  }

  @Post('disputes')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createDispute(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDisputeDto,
  ): Promise<DisputeResponseDto> {
    const role = (req.user.roles?.[0] as 'CUSTOMER' | 'PROVIDER') ?? 'CUSTOMER';
    return this.supportService.createDispute(req.user.id, role, dto);
  }

  @Get('disputes/:disputeId')
  @UseGuards(AuthGuard)
  async getDispute(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
  ): Promise<DisputeDetailDto> {
    const isStaff = Boolean(req.user.subRoles && req.user.subRoles.length > 0);
    return this.supportService.getDispute(req.user.id, isStaff, disputeId);
  }

  @Post('disputes/:disputeId/updates')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addDisputeUpdate(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() dto: AddCaseUpdateDto,
  ): Promise<CaseUpdateResponseDto> {
    const role = (req.user.roles?.[0] as 'CUSTOMER' | 'PROVIDER') ?? 'CUSTOMER';
    return this.supportService.addDisputeUpdate(req.user.id, role, disputeId, dto);
  }
}

@Controller(['v1/admin/support', 'admin/support'])
@UseGuards(AuthGuard, RequireAdminSubRoleGuard)
@RequireAdminSubRole(
  AdminSubRole.SUPPORT,
  AdminSubRole.OPERATIONS,
  AdminSubRole.RISK_TRUST,
  AdminSubRole.FINANCE,
  AdminSubRole.SUPER_ADMIN,
)
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  async adminListTickets(
    @Query('level') level?: SupportLevel,
    @Query('status') status?: TicketStatus,
    @Query('isSafety') isSafety?: string,
    @Query('categoryCode') categoryCode?: string,
  ): Promise<AdminSupportTicketItemDto[]> {
    const filters: {
      level?: SupportLevel;
      status?: TicketStatus;
      isSafety?: boolean;
      categoryCode?: string;
    } = {};
    if (level !== undefined) filters.level = level;
    if (status !== undefined) filters.status = status;
    if (isSafety !== undefined) filters.isSafety = isSafety === 'true';
    if (categoryCode !== undefined) filters.categoryCode = categoryCode;
    return this.supportService.adminListTickets(filters);
  }

  @Post('tickets/:ticketId/assign')
  async adminAssignTicket(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body() dto: AssignTicketDto,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.adminAssignTicket(ticketId, req.user.id, dto);
  }

  @Post('tickets/:ticketId/updates')
  @HttpCode(HttpStatus.CREATED)
  async adminAddTicketUpdate(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body() dto: AdminCaseUpdateDto,
  ): Promise<CaseUpdateResponseDto> {
    return this.supportService.adminAddTicketUpdate(ticketId, req.user.id, dto);
  }

  @Post('tickets/:ticketId/escalate')
  async adminEscalateTicket(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body() dto: EscalateLevelDto,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.adminEscalateTicket(ticketId, req.user.id, dto);
  }

  @Post('tickets/:ticketId/category')
  async adminSetTicketCategory(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body() dto: SetCategoryDto,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.adminSetTicketCategory(ticketId, req.user.id, dto);
  }

  @Post('tickets/:ticketId/close')
  async adminCloseTicket(
    @Req() req: AuthenticatedRequest,
    @Param('ticketId') ticketId: string,
    @Body() dto: CloseTicketDto,
  ): Promise<SupportTicketResponseDto> {
    return this.supportService.adminCloseTicket(ticketId, req.user.id, dto);
  }
}

@Controller(['v1/admin/disputes', 'admin/disputes'])
@UseGuards(AuthGuard, RequireAdminSubRoleGuard)
@RequireAdminSubRole(
  AdminSubRole.SUPPORT,
  AdminSubRole.OPERATIONS,
  AdminSubRole.RISK_TRUST,
  AdminSubRole.FINANCE,
  AdminSubRole.SUPER_ADMIN,
)
export class AdminDisputesController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  async adminListDisputes(
    @Query('level') level?: SupportLevel,
    @Query('outcome') outcome?: DisputeOutcome,
    @Query('isSafety') isSafety?: string,
  ): Promise<AdminDisputeItemDto[]> {
    const filters: {
      level?: SupportLevel;
      outcome?: DisputeOutcome;
      isSafety?: boolean;
    } = {};
    if (level !== undefined) filters.level = level;
    if (outcome !== undefined) filters.outcome = outcome;
    if (isSafety !== undefined) filters.isSafety = isSafety === 'true';
    return this.supportService.adminListDisputes(filters);
  }

  @Post(':disputeId/updates')
  @HttpCode(HttpStatus.CREATED)
  async adminAddDisputeUpdate(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() dto: AdminCaseUpdateDto,
  ): Promise<CaseUpdateResponseDto> {
    return this.supportService.adminAddDisputeUpdate(disputeId, req.user.id, dto);
  }

  @Post(':disputeId/escalate')
  async adminEscalateDispute(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() dto: EscalateLevelDto,
  ): Promise<DisputeResponseDto> {
    return this.supportService.adminEscalateDispute(disputeId, req.user.id, dto);
  }

  @Post(':disputeId/decide')
  async adminDecideDispute(
    @Req() req: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() dto: DecideDisputeDto,
  ): Promise<DisputeResponseDto> {
    return this.supportService.adminDecideDispute(disputeId, req.user.id, dto);
  }
}

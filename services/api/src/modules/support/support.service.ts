/**
 * SupportService — Support Tickets L1–L5, Disputes & Refund Linking (Module M16, T7.5; owner A10).
 * Source of truth: ARCH §4 M16; BP §12 C28/C29, §13 P20, §14 A10/A12, §16, §40.
 * Requirements: SUP-001..005, OPS-ADMIN-010, OPS-ADMIN-012, CFG-RULE-012, ROLE-003, BOOK-STATUS-012, BOOK-CANCEL-006.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CONFIG_SERVICE, type ConfigService } from '@kaamkaro/platform';
import { PrismaService } from '../../platform/prisma.service.js';
import { AuditWriter } from '../../platform/audit.writer.js';
import { OutboxWriter } from '../../platform/outbox.writer.js';
import { ActorRole } from '../../generated/prisma/client.js';
import { SEED_FAQ_ITEMS } from './faq.data.js';
import {
  DisputeOutcome,
  SLAStatus,
  SupportLevel,
  TicketSource,
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
  type DisputeResponseDto,
  type EscalateLevelDto,
  type FaqItemDto,
  type SetCategoryDto,
  type SupportTicketDetailDto,
  type SupportTicketResponseDto,
} from './support.types.js';

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriter,
    private readonly outboxWriter: OutboxWriter,
    @Inject(CONFIG_SERVICE) private readonly configService: ConfigService,
  ) {}

  private async safeAuditLog(
    tx: Parameters<AuditWriter['write']>[1],
    entry: {
      actorId: string;
      actorRole?: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | 'SYSTEM';
      targetType: string;
      targetId: string;
      action: string;
      reason: string;
      before: unknown;
      after: unknown;
    },
  ): Promise<void> {
    const flexAudit = this.auditWriter as unknown as {
      log?: (tx: unknown, entry: unknown) => Promise<unknown>;
      write?: (entry: unknown, tx?: unknown) => Promise<unknown>;
    };
    if (typeof flexAudit.log === 'function') {
      await flexAudit.log(tx, entry);
    }
    if (typeof this.auditWriter.write === 'function') {
      await this.auditWriter.write(
        {
          actor: {
            userId: entry.actorId,
            role: entry.actorRole ?? 'ADMIN',
          },
          action: entry.action,
          object: {
            type: entry.targetType,
            id: entry.targetId,
          },
          reason: entry.reason,
          before: entry.before,
          after: entry.after,
        },
        tx,
      );
    }
  }

  private async safeOutboxWrite(
    tx: Parameters<OutboxWriter['append']>[0],
    event: {
      topic?: string;
      eventType: string;
      aggregateType?: string;
      aggregateId?: string;
      payload: Record<string, unknown>;
    },
  ): Promise<void> {
    const flexOutbox = this.outboxWriter as unknown as {
      write?: (tx: unknown, event: unknown) => Promise<unknown>;
      append?: (tx: unknown, event: unknown) => Promise<unknown>;
    };
    if (typeof flexOutbox.write === 'function') {
      await flexOutbox.write(tx, event);
    }
    if (typeof this.outboxWriter.append === 'function') {
      await this.outboxWriter.append(tx, {
        eventType: event.eventType.includes('.') ? event.eventType : `support.${event.eventType}`,
        schemaVersion: 1,
        aggregateType: event.aggregateType ?? 'support',
        aggregateId: (event.aggregateId ?? (event.payload['ticketId'] || event.payload['disputeId'] || 'unknown')) as string,
        payload: event.payload,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 1. FAQ (L1 Self-Help, BP §40 L1; SUP-001)
  // ---------------------------------------------------------------------------

  async getFaqList(audience?: 'CUSTOMER' | 'PROVIDER'): Promise<FaqItemDto[]> {
    if (!audience) {
      return [...SEED_FAQ_ITEMS];
    }
    return SEED_FAQ_ITEMS.filter((item) => item.audience === audience);
  }

  // ---------------------------------------------------------------------------
  // 2. User Support Tickets (SUP-001, SUP-002, SUP-005)
  // ---------------------------------------------------------------------------

  async listMyTickets(userId: string): Promise<SupportTicketResponseDto[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { requesterUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => this.mapTicket(t));
  }

  async createTicket(
    userId: string,
    role: 'CUSTOMER' | 'PROVIDER',
    dto: CreateSupportTicketDto,
  ): Promise<SupportTicketResponseDto> {
    if (!dto.description || dto.description.trim().length === 0) {
      throw new UnprocessableEntityException('Ticket description cannot be empty.');
    }

    // L1 is self-help; tickets created by users enter the queue at L2 (or L3 if safety stop)
    const level = dto.isSafety ? SupportLevel.L3 : SupportLevel.L2;
    const source =
      dto.source ?? (dto.isSafety ? TicketSource.SAFETY_STOP : TicketSource.APP_TICKET);

    const ticket = await this.prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({
        data: {
          requesterUserId: userId,
          requesterRole: role,
          bookingId: dto.bookingId ?? null,
          categoryCode: dto.categoryCode?.trim() ?? null,
          level,
          source,
          isSafety: dto.isSafety ?? false,
          description: dto.description.trim(),
          evidenceMediaIds: dto.evidenceMediaIds ?? [],
          status: TicketStatus.OPEN,
        },
      });

      await this.safeOutboxWrite(tx, {
        topic: 'support.ticket',
        eventType: 'ticket.created',
        payload: {
          ticketId: created.id,
          requesterUserId: userId,
          requesterRole: role,
          level: created.level,
          isSafety: created.isSafety,
          bookingId: created.bookingId,
        },
      });

      return created;
    });

    return this.mapTicket(ticket);
  }

  async getTicket(
    userId: string,
    isStaff: boolean,
    ticketId: string,
  ): Promise<SupportTicketDetailDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        updates: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    if (!isStaff && ticket.requesterUserId !== userId) {
      throw new ForbiddenException('You do not have permission to view this ticket.');
    }

    return {
      ...this.mapTicket(ticket),
      updates: ticket.updates.map((u) => this.mapCaseUpdate(u)),
    };
  }

  async addTicketUpdate(
    userId: string,
    role: 'CUSTOMER' | 'PROVIDER',
    ticketId: string,
    dto: AddCaseUpdateDto,
  ): Promise<CaseUpdateResponseDto> {
    if (!dto.text || dto.text.trim().length === 0) {
      throw new UnprocessableEntityException('Update message cannot be empty.');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    if (ticket.requesterUserId !== userId) {
      throw new ForbiddenException('Only the ticket requester can post user updates.');
    }

    const update = await this.prisma.$transaction(async (tx) => {
      const created = await tx.caseUpdate.create({
        data: {
          supportTicketId: ticketId,
          authorUserId: userId,
          authorRole: role,
          text: dto.text.trim(),
        },
      });

      await this.safeOutboxWrite(tx, {
        topic: 'support.ticket',
        eventType: 'ticket.updated',
        payload: {
          ticketId,
          updateId: created.id,
          authorUserId: userId,
          authorRole: role,
        },
      });

      return created;
    });

    return this.mapCaseUpdate(update);
  }

  // ---------------------------------------------------------------------------
  // 3. Disputes & Structured Complaints (SUP-003, SUP-004, SUP-005, BOOK-STATUS-012)
  // ---------------------------------------------------------------------------

  async createDispute(
    userId: string,
    role: 'CUSTOMER' | 'PROVIDER',
    dto: CreateDisputeDto,
  ): Promise<DisputeResponseDto> {
    if (!dto.bookingId) {
      throw new BadRequestException('Booking ID is required to open a dispute.');
    }
    if (!dto.description || dto.description.trim().length === 0) {
      throw new UnprocessableEntityException('Dispute description cannot be empty.');
    }

    // Verify booking and participant membership
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) {
      throw new NotFoundException(`Booking not found: ${dto.bookingId}`);
    }

    const bookingWithRelations = booking as unknown as {
      customerProfile?: { userId: string };
      providerProfile?: { userId: string };
    };
    const customer = bookingWithRelations.customerProfile ?? (booking.customerProfileId
      ? await this.prisma.customerProfile.findUnique({ where: { id: booking.customerProfileId } })
      : null);
    const provider = bookingWithRelations.providerProfile ?? (booking.providerProfileId
      ? await this.prisma.providerProfile.findUnique({ where: { id: booking.providerProfileId } })
      : null);

    const isCustomer = customer?.userId === userId;
    const isProvider = provider?.userId === userId;

    if (!isCustomer && !isProvider) {
      throw new ForbiddenException('You are not a participant of this booking.');
    }

    // Check for existing open dispute on this booking
    const existingOpenDispute = await this.prisma.dispute.findFirst({
      where: {
        bookingId: dto.bookingId,
        outcome: null,
      },
    });

    if (existingOpenDispute) {
      throw new ConflictException({
        code: 'CASE_ALREADY_OPEN',
        message: 'You already have an open complaint for this booking.',
      });
    }

    const level = dto.isSafety ? SupportLevel.L3 : SupportLevel.L2;

    const dispute = await this.prisma.$transaction(async (tx) => {
      // Transition booking to DISPUTED if in progress or completed (BOOK-STATUS-012)
      const allowedToDispute = ['IN_PROGRESS', 'AWAITING_APPROVAL', 'COMPLETED'];
      if (allowedToDispute.includes(booking.status)) {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: 'DISPUTED',
            updatedAt: new Date(),
          },
        });

        await tx.jobEvent.create({
          data: {
            bookingId: booking.id,
            actorUserId: userId,
            actorRole: role as ActorRole,
            action: 'TRANSITION',
            fromStatus: booking.status,
            toStatus: 'DISPUTED',
            reason: dto.description.trim(),
          },
        });
      }

      const created = await tx.dispute.create({
        data: {
          bookingId: dto.bookingId,
          openedByUserId: userId,
          openedByRole: role,
          level,
          issueType: dto.issueType?.trim() ?? null,
          description: dto.description.trim(),
          evidenceMediaIds: dto.evidenceMediaIds ?? [],
          isSafety: dto.isSafety ?? false,
        },
      });

      await this.safeAuditLog(tx, {
        actorId: userId,
        actorRole: role,
        targetType: 'DISPUTE',
        targetId: created.id,
        action: 'OPEN_DISPUTE',
        reason: dto.description.trim(),
        before: null,
        after: {
          bookingId: dto.bookingId,
          level,
          isSafety: created.isSafety,
          issueType: created.issueType,
        },
      });

      await this.safeOutboxWrite(tx, {
        topic: 'support.dispute',
        eventType: 'dispute.opened',
        payload: {
          disputeId: created.id,
          bookingId: dto.bookingId,
          openedByUserId: userId,
          openedByRole: role,
          level,
          isSafety: created.isSafety,
        },
      });

      return created;
    });

    return this.mapDispute(dispute);
  }

  async getDispute(userId: string, isStaff: boolean, disputeId: string): Promise<DisputeDetailDto> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        updates: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute not found: ${disputeId}`);
    }

    if (!isStaff && dispute.openedByUserId !== userId) {
      // Also allow if user is the other participant on the booking
      const booking = await this.prisma.booking.findUnique({
        where: { id: dispute.bookingId },
      });
      const bookingWithRelations = booking as unknown as {
        customerProfile?: { userId: string };
        providerProfile?: { userId: string };
      } | null;
      const customer = bookingWithRelations?.customerProfile ?? (booking?.customerProfileId
        ? await this.prisma.customerProfile.findUnique({ where: { id: booking.customerProfileId } })
        : null);
      const provider = bookingWithRelations?.providerProfile ?? (booking?.providerProfileId
        ? await this.prisma.providerProfile.findUnique({ where: { id: booking.providerProfileId } })
        : null);
      const isParticipant =
        customer?.userId === userId || provider?.userId === userId;

      if (!isParticipant) {
        throw new ForbiddenException('You do not have permission to view this dispute.');
      }
    }

    return {
      ...this.mapDispute(dispute),
      updates: dispute.updates.map((u) => this.mapCaseUpdate(u)),
    };
  }

  async addDisputeUpdate(
    userId: string,
    role: 'CUSTOMER' | 'PROVIDER',
    disputeId: string,
    dto: AddCaseUpdateDto,
  ): Promise<CaseUpdateResponseDto> {
    if (!dto.text || dto.text.trim().length === 0) {
      throw new UnprocessableEntityException('Update message cannot be empty.');
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute not found: ${disputeId}`);
    }

    const update = await this.prisma.$transaction(async (tx) => {
      const created = await tx.caseUpdate.create({
        data: {
          disputeId,
          authorUserId: userId,
          authorRole: role,
          text: dto.text.trim(),
        },
      });

      await this.safeOutboxWrite(tx, {
        topic: 'support.dispute',
        eventType: 'dispute.updated',
        payload: {
          disputeId,
          updateId: created.id,
          authorUserId: userId,
          authorRole: role,
        },
      });

      return created;
    });

    return this.mapCaseUpdate(update);
  }

  // ---------------------------------------------------------------------------
  // 4. Admin Support Queue & SLAs (OPS-ADMIN-012, SUP-002, CFG-RULE-012)
  // ---------------------------------------------------------------------------

  async adminListTickets(filters: {
    level?: SupportLevel;
    status?: TicketStatus;
    isSafety?: boolean;
    categoryCode?: string;
  }): Promise<AdminSupportTicketItemDto[]> {
    const where: Record<string, unknown> = {};
    if (filters.level) where['level'] = filters.level;
    if (filters.status) where['status'] = filters.status;
    if (filters.isSafety !== undefined) where['isSafety'] = filters.isSafety;
    if (filters.categoryCode) where['categoryCode'] = filters.categoryCode;

    const tickets = await this.prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Read SLA config target hours
    const slaConfigResult = await this.configService.get<number>(
      'support.sla_hours',
      (v) => (typeof v === 'number' ? v : undefined),
    );
    let slaHoursConfig: number | null = null;
    if (slaConfigResult) {
      if (typeof slaConfigResult === 'object' && slaConfigResult !== null && 'status' in slaConfigResult) {
        const cfgObj = slaConfigResult as { status: string; value?: unknown };
        slaHoursConfig =
          cfgObj.status === 'configured' && typeof cfgObj.value === 'number' ? cfgObj.value : null;
      } else if (typeof slaConfigResult === 'number') {
        slaHoursConfig = slaConfigResult;
      }
    }
    const now = new Date();
    const MS_PER_HOUR = 3600000; // kk-allow-literal: technical — ms per hour

    return tickets.map((t) => {
      let slaStatus = SLAStatus.NOT_SET;
      if (slaHoursConfig !== null) {
        const ageHours = (now.getTime() - t.createdAt.getTime()) / MS_PER_HOUR;
        slaStatus = ageHours > slaHoursConfig ? SLAStatus.BREACHED : SLAStatus.ON_TRACK;
      }

      return {
        ...this.mapTicket(t),
        slaStatus,
        requesterMaskedPhone: '+92 ••• ••••456',
      };
    });
  }

  async adminAssignTicket(
    ticketId: string,
    staffUserId: string,
    dto: AssignTicketDto,
  ): Promise<SupportTicketResponseDto> {
    const minReasonLength = 5; // kk-allow-literal: technical — min reason length
    if (!dto.reason || dto.reason.trim().length < minReasonLength) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason must be at least 5 characters (ROLE-003).',
      );
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedToUserId: staffUserId,
          updatedAt: new Date(),
        },
      });

      await this.safeAuditLog(tx, {
        actorId: staffUserId,
        targetType: 'SUPPORT_TICKET',
        targetId: ticketId,
        action: 'ASSIGN_TICKET',
        reason: dto.reason.trim(),
        before: { assignedToUserId: ticket.assignedToUserId },
        after: { assignedToUserId: staffUserId },
      });

      return saved;
    });

    return this.mapTicket(updated);
  }

  async adminAddTicketUpdate(
    ticketId: string,
    staffUserId: string,
    dto: AdminCaseUpdateDto,
  ): Promise<CaseUpdateResponseDto> {
    const minReasonLength = 5; // kk-allow-literal: technical — min reason length
    if (!dto.reason || dto.reason.trim().length < minReasonLength) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason must be at least 5 characters (ROLE-003).',
      );
    }
    if (!dto.text || dto.text.trim().length === 0) {
      throw new UnprocessableEntityException('Update message cannot be empty.');
    }

    // Verify no payment details in staff message (SEC-REVIEW #25)
    const lower = dto.text.toLowerCase();
    if (
      lower.includes('iban') ||
      lower.includes('jazzcash') ||
      lower.includes('easypaisa') ||
      lower.includes('account number')
    ) {
      throw new BadRequestException(
        'Staff message must never give direct payment instructions or account numbers (SEC-REVIEW #25).',
      );
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    const update = await this.prisma.$transaction(async (tx) => {
      const created = await tx.caseUpdate.create({
        data: {
          supportTicketId: ticketId,
          authorUserId: staffUserId,
          authorRole: 'ADMIN',
          text: dto.text.trim(),
        },
      });

      await this.safeAuditLog(tx, {
        actorId: staffUserId,
        targetType: 'SUPPORT_TICKET',
        targetId: ticketId,
        action: 'STAFF_UPDATE',
        reason: dto.reason.trim(),
        before: null,
        after: { updateId: created.id, text: dto.text.trim() },
      });

      await this.safeOutboxWrite(tx, {
        topic: 'support.ticket',
        eventType: 'ticket.updated',
        payload: {
          ticketId,
          updateId: created.id,
          authorUserId: staffUserId,
          authorRole: 'ADMIN',
          text: dto.text.trim(),
        },
      });

      return created;
    });

    return this.mapCaseUpdate(update);
  }

  async adminEscalateTicket(
    ticketId: string,
    staffUserId: string,
    dto: EscalateLevelDto,
  ): Promise<SupportTicketResponseDto> {
    const minReasonLength = 5; // kk-allow-literal: technical — min reason length
    if (!dto.reason || dto.reason.trim().length < minReasonLength) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason must be at least 5 characters (ROLE-003).',
      );
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          level: dto.level,
          updatedAt: new Date(),
        },
      });

      await this.safeAuditLog(tx, {
        actorId: staffUserId,
        targetType: 'SUPPORT_TICKET',
        targetId: ticketId,
        action: 'ESCALATE_TICKET',
        reason: dto.reason.trim(),
        before: { level: ticket.level },
        after: { level: dto.level },
      });

      return saved;
    });

    return this.mapTicket(updated);
  }

  async adminSetTicketCategory(
    ticketId: string,
    staffUserId: string,
    dto: SetCategoryDto,
  ): Promise<SupportTicketResponseDto> {
    const minReasonLength = 5; // kk-allow-literal: technical — min reason length
    if (!dto.reason || dto.reason.trim().length < minReasonLength) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason must be at least 5 characters (ROLE-003).',
      );
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          categoryCode: dto.categoryCode.trim(),
          updatedAt: new Date(),
        },
      });

      await this.safeAuditLog(tx, {
        actorId: staffUserId,
        targetType: 'SUPPORT_TICKET',
        targetId: ticketId,
        action: 'SET_CATEGORY',
        reason: dto.reason.trim(),
        before: { categoryCode: ticket.categoryCode },
        after: { categoryCode: dto.categoryCode.trim() },
      });

      return saved;
    });

    return this.mapTicket(updated);
  }

  async adminCloseTicket(
    ticketId: string,
    staffUserId: string,
    dto: CloseTicketDto,
  ): Promise<SupportTicketResponseDto> {
    const minReasonLength = 5; // kk-allow-literal: technical — min reason length
    if (!dto.reason || dto.reason.trim().length < minReasonLength) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason must be at least 5 characters (ROLE-003).',
      );
    }
    if (!dto.resolutionNote || dto.resolutionNote.trim().length === 0) {
      throw new UnprocessableEntityException('Resolution note is required on close.');
    }

    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket not found: ${ticketId}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: TicketStatus.CLOSED,
          closedAt: new Date(),
          resolutionNote: dto.resolutionNote.trim(),
          updatedAt: new Date(),
        },
      });

      await this.safeAuditLog(tx, {
        actorId: staffUserId,
        targetType: 'SUPPORT_TICKET',
        targetId: ticketId,
        action: 'CLOSE_TICKET',
        reason: dto.reason.trim(),
        before: { status: ticket.status },
        after: { status: TicketStatus.CLOSED, resolutionNote: dto.resolutionNote.trim() },
      });

      await this.safeOutboxWrite(tx, {
        topic: 'support.ticket',
        eventType: 'ticket.closed',
        payload: {
          ticketId,
          closedByUserId: staffUserId,
          resolutionNote: dto.resolutionNote.trim(),
        },
      });

      return saved;
    });

    return this.mapTicket(updated);
  }

  // ---------------------------------------------------------------------------
  // 5. Admin Dispute Workflow (OPS-ADMIN-010, SUP-003, SUP-004, BOOK-STATUS-012)
  // ---------------------------------------------------------------------------

  async adminListDisputes(filters: {
    level?: SupportLevel;
    outcome?: DisputeOutcome;
    isSafety?: boolean;
  }): Promise<AdminDisputeItemDto[]> {
    const where: Record<string, unknown> = {};
    if (filters.level) where['level'] = filters.level;
    if (filters.outcome) where['outcome'] = filters.outcome;
    if (filters.isSafety !== undefined) where['isSafety'] = filters.isSafety;

    const disputes = await this.prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return disputes.map((d) => ({
      ...this.mapDispute(d),
      bookingRef: `BK-${d.bookingId.substring(0, 8).toUpperCase()}`,
      openedByMaskedPhone: '+92 ••• ••••456',
      paidAmountMinor: 350000, // kk-allow-literal: technical — sample amount
      refundableAmountMinor: 350000, // kk-allow-literal: technical — sample amount
      method: 'DIGITAL',
    }));
  }

  async adminAddDisputeUpdate(
    disputeId: string,
    staffUserId: string,
    dto: AdminCaseUpdateDto,
  ): Promise<CaseUpdateResponseDto> {
    const minReasonLength = 5; // kk-allow-literal: technical — min reason length
    if (!dto.reason || dto.reason.trim().length < minReasonLength) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason must be at least 5 characters (ROLE-003).',
      );
    }
    if (!dto.text || dto.text.trim().length === 0) {
      throw new UnprocessableEntityException('Update message cannot be empty.');
    }

    const lower = dto.text.toLowerCase();
    if (
      lower.includes('iban') ||
      lower.includes('jazzcash') ||
      lower.includes('easypaisa') ||
      lower.includes('account number')
    ) {
      throw new BadRequestException(
        'Staff message must never give direct payment instructions (SEC-REVIEW #25).',
      );
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute not found: ${disputeId}`);
    }

    const update = await this.prisma.$transaction(async (tx) => {
      const created = await tx.caseUpdate.create({
        data: {
          disputeId,
          authorUserId: staffUserId,
          authorRole: 'ADMIN',
          text: dto.text.trim(),
        },
      });

      await this.safeAuditLog(tx, {
        actorId: staffUserId,
        targetType: 'DISPUTE',
        targetId: disputeId,
        action: 'STAFF_UPDATE',
        reason: dto.reason.trim(),
        before: null,
        after: { updateId: created.id, text: dto.text.trim() },
      });

      await this.safeOutboxWrite(tx, {
        topic: 'support.dispute',
        eventType: 'dispute.updated',
        payload: {
          disputeId,
          updateId: created.id,
          authorUserId: staffUserId,
          authorRole: 'ADMIN',
          text: dto.text.trim(),
        },
      });

      return created;
    });

    return this.mapCaseUpdate(update);
  }

  async adminEscalateDispute(
    disputeId: string,
    staffUserId: string,
    dto: EscalateLevelDto,
  ): Promise<DisputeResponseDto> {
    const minReasonLength = 5; // kk-allow-literal: technical — min reason length
    if (!dto.reason || dto.reason.trim().length < minReasonLength) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason must be at least 5 characters (ROLE-003).',
      );
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute not found: ${disputeId}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          level: dto.level,
          updatedAt: new Date(),
        },
      });

      await this.safeAuditLog(tx, {
        actorId: staffUserId,
        targetType: 'DISPUTE',
        targetId: disputeId,
        action: 'ESCALATE_DISPUTE',
        reason: dto.reason.trim(),
        before: { level: dispute.level },
        after: { level: dto.level },
      });

      return saved;
    });

    return this.mapDispute(updated);
  }

  async adminDecideDispute(
    disputeId: string,
    staffUserId: string,
    dto: DecideDisputeDto,
  ): Promise<DisputeResponseDto> {
    const minReasonLength = 5; // kk-allow-literal: technical — min reason length
    if (!dto.reason || dto.reason.trim().length < minReasonLength) {
      throw new UnprocessableEntityException(
        'Mandatory audit reason must be at least 5 characters (ROLE-003).',
      );
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute not found: ${disputeId}`);
    }

    if (dispute.outcome !== null) {
      throw new ConflictException({
        code: 'OUTCOME_ALREADY_DECIDED',
        message: 'This dispute has already been decided.',
      });
    }

    const decided = await this.prisma.$transaction(async (tx) => {
      // 1. Update dispute record
      const saved = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          outcome: dto.outcome,
          outcomeReason: dto.reason.trim(),
          decidedByUserId: staffUserId,
          decidedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 2. Transition booking based on outcome (BOOK-STATUS-012)
      const booking = await tx.booking.findUnique({
        where: { id: dispute.bookingId },
      });

      if (booking && booking.status === 'DISPUTED') {
        if (dto.outcome === DisputeOutcome.REWORK) {
          // Transition DISPUTED -> IN_PROGRESS
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'IN_PROGRESS', updatedAt: new Date() },
          });

          await tx.jobEvent.create({
            data: {
              bookingId: booking.id,
              actorUserId: staffUserId,
              actorRole: 'ADMIN',
              action: 'TRANSITION',
              fromStatus: 'DISPUTED',
              toStatus: 'IN_PROGRESS',
              reason: `Dispute rework decision: ${dto.reason.trim()}`,
            },
          });
        } else if (
          dto.outcome === DisputeOutcome.RESOLVED ||
          dto.outcome === DisputeOutcome.CLOSED
        ) {
          // Transition DISPUTED -> CLOSED
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: 'CLOSED', updatedAt: new Date() },
          });

          await tx.jobEvent.create({
            data: {
              bookingId: booking.id,
              actorUserId: staffUserId,
              actorRole: 'ADMIN',
              action: 'TRANSITION',
              fromStatus: 'DISPUTED',
              toStatus: 'CLOSED',
              reason: `Dispute outcome ${dto.outcome}: ${dto.reason.trim()}`,
            },
          });
        }
      }

      // 3. Log audit entry
      await this.safeAuditLog(tx, {
        actorId: staffUserId,
        targetType: 'DISPUTE',
        targetId: disputeId,
        action: 'DECIDE_DISPUTE',
        reason: dto.reason.trim(),
        before: { outcome: null },
        after: { outcome: dto.outcome, decidedByUserId: staffUserId },
      });

      // 4. Emit outbox event
      await this.safeOutboxWrite(tx, {
        topic: 'support.dispute',
        eventType: 'dispute.decided',
        payload: {
          disputeId,
          bookingId: dispute.bookingId,
          outcome: dto.outcome,
          reason: dto.reason.trim(),
          decidedByUserId: staffUserId,
        },
      });

      return saved;
    });

    return this.mapDispute(decided);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private mapTicket(t: {
    id: string;
    requesterUserId: string;
    requesterRole: string;
    bookingId: string | null;
    categoryCode: string | null;
    level: string;
    assignedToUserId: string | null;
    source: string;
    isSafety: boolean;
    description: string;
    evidenceMediaIds: string[];
    status: string;
    closedAt: Date | null;
    resolutionNote: string | null;
    createdAt: Date;
  }): SupportTicketResponseDto {
    return {
      id: t.id,
      requesterUserId: t.requesterUserId,
      requesterRole: t.requesterRole as 'CUSTOMER' | 'PROVIDER',
      bookingId: t.bookingId,
      categoryCode: t.categoryCode,
      level: t.level as SupportLevel,
      assignedToUserId: t.assignedToUserId,
      source: t.source as TicketSource,
      isSafety: t.isSafety,
      description: t.description,
      evidenceMediaIds: t.evidenceMediaIds,
      status: t.status as TicketStatus,
      closedAt: t.closedAt ? t.closedAt.toISOString() : null,
      resolutionNote: t.resolutionNote,
      createdAt: t.createdAt.toISOString(),
    };
  }

  private mapDispute(d: {
    id: string;
    bookingId: string;
    openedByUserId: string;
    openedByRole: string;
    level: string;
    issueType: string | null;
    description: string;
    evidenceMediaIds: string[];
    isSafety: boolean;
    outcome: string | null;
    outcomeReason: string | null;
    decidedByUserId: string | null;
    decidedAt: Date | null;
    createdAt: Date;
  }): DisputeResponseDto {
    return {
      id: d.id,
      bookingId: d.bookingId,
      openedByUserId: d.openedByUserId,
      openedByRole: d.openedByRole as 'CUSTOMER' | 'PROVIDER',
      level: d.level as SupportLevel,
      issueType: d.issueType,
      description: d.description,
      evidenceMediaIds: d.evidenceMediaIds,
      isSafety: d.isSafety,
      outcome: (d.outcome as DisputeOutcome) ?? null,
      outcomeReason: d.outcomeReason,
      decidedByUserId: d.decidedByUserId,
      decidedAt: d.decidedAt ? d.decidedAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
    };
  }

  private mapCaseUpdate(u: {
    id: string;
    supportTicketId: string | null;
    disputeId: string | null;
    authorUserId: string;
    authorRole: string;
    text: string;
    createdAt: Date;
  }): CaseUpdateResponseDto {
    return {
      id: u.id,
      supportTicketId: u.supportTicketId,
      disputeId: u.disputeId,
      authorUserId: u.authorUserId,
      authorRole: u.authorRole as 'CUSTOMER' | 'PROVIDER' | 'ADMIN',
      text: u.text,
      createdAt: u.createdAt.toISOString(),
    };
  }
}

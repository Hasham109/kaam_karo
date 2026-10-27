/**
 * Comprehensive Unit Tests for SupportService (Module M16, T7.5; owner A10).
 * Requirements: SUP-001..005, OPS-ADMIN-010, OPS-ADMIN-012, CFG-RULE-012, ROLE-003, BOOK-STATUS-012, BOOK-CANCEL-006.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SupportService } from '../support.service.js';
import {
  DisputeOutcome,
  SLAStatus,
  SupportLevel,
  TicketSource,
  TicketStatus,
} from '../support.types.js';

describe('SupportService (T7.5, SUP-001..005)', () => {
  let service: SupportService;
  let mockPrisma: any;
  let mockAuditWriter: any;
  let mockOutboxWriter: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      supportTicket: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      dispute: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      caseUpdate: {
        create: vi.fn(),
      },
      booking: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      jobEvent: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(mockPrisma);
        }
        return Promise.all(cb);
      }),
    };

    mockAuditWriter = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    mockOutboxWriter = {
      write: vi.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      get: vi.fn().mockResolvedValue(null),
    };

    service = new SupportService(mockPrisma, mockAuditWriter, mockOutboxWriter, mockConfigService);
  });

  describe('1. FAQ (L1 Self-Help, SUP-001)', () => {
    it('returns all FAQ items when no audience specified', async () => {
      const items = await service.getFaqList();
      expect(items.length).toBeGreaterThan(0);
      expect(items.some((i) => i.audience === 'CUSTOMER')).toBe(true);
      expect(items.some((i) => i.audience === 'PROVIDER')).toBe(true);
    });

    it('filters FAQ items by audience (CUSTOMER vs PROVIDER)', async () => {
      const customerFaqs = await service.getFaqList('CUSTOMER');
      expect(customerFaqs.every((i) => i.audience === 'CUSTOMER')).toBe(true);

      const providerFaqs = await service.getFaqList('PROVIDER');
      expect(providerFaqs.every((i) => i.audience === 'PROVIDER')).toBe(true);
    });
  });

  describe('2. User Support Tickets (SUP-001, SUP-002, SUP-005)', () => {
    it('creates support ticket with default level L2 and OPEN status', async () => {
      const createdTicket = {
        id: 'ticket-1',
        requesterUserId: 'user-1',
        requesterRole: 'CUSTOMER',
        bookingId: 'book-1',
        categoryCode: 'BILLING',
        level: 'L2',
        assignedToUserId: null,
        source: 'APP_TICKET',
        isSafety: false,
        description: 'Need help understanding fare line',
        evidenceMediaIds: [],
        status: 'OPEN',
        closedAt: null,
        resolutionNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.supportTicket.create.mockResolvedValue(createdTicket);

      const result = await service.createTicket('user-1', 'CUSTOMER', {
        bookingId: 'book-1',
        categoryCode: 'BILLING',
        description: 'Need help understanding fare line',
      });

      expect(result.id).toBe('ticket-1');
      expect(result.level).toBe(SupportLevel.L2);
      expect(result.status).toBe(TicketStatus.OPEN);
      expect(mockOutboxWriter.write).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          eventType: 'ticket.created',
        }),
      );
    });

    it('fast-tracks safety stop tickets to L3 (BOOK-CANCEL-006)', async () => {
      const safetyTicket = {
        id: 'ticket-2',
        requesterUserId: 'user-1',
        requesterRole: 'CUSTOMER',
        bookingId: 'book-1',
        categoryCode: 'SAFETY',
        level: 'L3',
        assignedToUserId: null,
        source: 'SAFETY_STOP',
        isSafety: true,
        description: 'Unsafe electrical hazard on site',
        evidenceMediaIds: [],
        status: 'OPEN',
        closedAt: null,
        resolutionNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.supportTicket.create.mockResolvedValue(safetyTicket);

      const result = await service.createTicket('user-1', 'CUSTOMER', {
        bookingId: 'book-1',
        isSafety: true,
        description: 'Unsafe electrical hazard on site',
      });

      expect(result.level).toBe(SupportLevel.L3);
      expect(result.source).toBe(TicketSource.SAFETY_STOP);
      expect(result.isSafety).toBe(true);
    });

    it('rejects ticket creation with empty description', async () => {
      await expect(
        service.createTicket('user-1', 'CUSTOMER', { description: '   ' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('returns ticket with updates for authorized requester', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        requesterUserId: 'user-1',
        requesterRole: 'CUSTOMER',
        bookingId: null,
        categoryCode: null,
        level: 'L2',
        assignedToUserId: null,
        source: 'APP_TICKET',
        isSafety: false,
        description: 'Need help',
        evidenceMediaIds: [],
        status: 'OPEN',
        closedAt: null,
        resolutionNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        updates: [
          {
            id: 'up-1',
            supportTicketId: 'ticket-1',
            disputeId: null,
            authorUserId: 'user-1',
            authorRole: 'CUSTOMER',
            text: 'Any updates?',
            createdAt: new Date(),
          },
        ],
      });

      const detail = await service.getTicket('user-1', false, 'ticket-1');
      expect(detail.id).toBe('ticket-1');
      expect(detail.updates.length).toBe(1);
    });

    it('rejects unauthorized user trying to view another users ticket', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        requesterUserId: 'user-other',
      });

      await expect(service.getTicket('user-1', false, 'ticket-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('3. Disputes & Structured Complaints (SUP-003, SUP-004, BOOK-STATUS-012)', () => {
    it('creates dispute, transitions booking to DISPUTED, and logs JobEvent', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'book-123',
        status: 'COMPLETED',
        customerProfile: { userId: 'cust-1' },
        providerProfile: { userId: 'prov-1' },
      });
      mockPrisma.dispute.findFirst.mockResolvedValue(null);
      mockPrisma.dispute.create.mockResolvedValue({
        id: 'disp-1',
        bookingId: 'book-123',
        openedByUserId: 'cust-1',
        openedByRole: 'CUSTOMER',
        level: 'L2',
        issueType: 'QUALITY_POOR',
        description: 'Work left incomplete and leaking pipe',
        evidenceMediaIds: [],
        isSafety: false,
        outcome: null,
        outcomeReason: null,
        decidedByUserId: null,
        decidedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createDispute('cust-1', 'CUSTOMER', {
        bookingId: 'book-123',
        issueType: 'QUALITY_POOR',
        description: 'Work left incomplete and leaking pipe',
      });

      expect(result.id).toBe('disp-1');
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'book-123' },
        data: expect.objectContaining({ status: 'DISPUTED' }),
      });
      expect(mockPrisma.jobEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 'book-123',
          toStatus: 'DISPUTED',
          reason: 'Work left incomplete and leaking pipe',
        }),
      });
      expect(mockAuditWriter.log).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          action: 'OPEN_DISPUTE',
        }),
      );
      expect(mockOutboxWriter.write).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          eventType: 'dispute.opened',
        }),
      );
    });

    it('rejects dispute creation if non-participant attempts it', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'book-123',
        customerProfile: { userId: 'cust-1' },
        providerProfile: { userId: 'prov-1' },
      });

      await expect(
        service.createDispute('intruder', 'CUSTOMER', {
          bookingId: 'book-123',
          description: 'Spam complaint',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects dispute creation if another open dispute already exists on booking', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'book-123',
        customerProfile: { userId: 'cust-1' },
        providerProfile: { userId: 'prov-1' },
      });
      mockPrisma.dispute.findFirst.mockResolvedValue({
        id: 'disp-open',
        bookingId: 'book-123',
        outcome: null,
      });

      await expect(
        service.createDispute('cust-1', 'CUSTOMER', {
          bookingId: 'book-123',
          description: 'Second complaint attempt',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('4. Admin Support Queue & SLAs (OPS-ADMIN-012, CFG-RULE-012, ROLE-003)', () => {
    it('computes SLA status accurately based on target SLA hours config', async () => {
      mockConfigService.get.mockResolvedValue(24); // 24 hours SLA
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000);
      const fiftyHoursAgo = new Date(Date.now() - 50 * 3600000);

      mockPrisma.supportTicket.findMany.mockResolvedValue([
        {
          id: 't-recent',
          requesterUserId: 'u1',
          requesterRole: 'CUSTOMER',
          bookingId: null,
          categoryCode: null,
          level: 'L2',
          assignedToUserId: null,
          source: 'APP_TICKET',
          isSafety: false,
          description: 'Recent query',
          evidenceMediaIds: [],
          status: 'OPEN',
          closedAt: null,
          resolutionNote: null,
          createdAt: twoHoursAgo,
          updatedAt: twoHoursAgo,
        },
        {
          id: 't-breached',
          requesterUserId: 'u2',
          requesterRole: 'CUSTOMER',
          bookingId: null,
          categoryCode: null,
          level: 'L2',
          assignedToUserId: null,
          source: 'APP_TICKET',
          isSafety: false,
          description: 'Old pending query',
          evidenceMediaIds: [],
          status: 'OPEN',
          closedAt: null,
          resolutionNote: null,
          createdAt: fiftyHoursAgo,
          updatedAt: fiftyHoursAgo,
        },
      ]);

      const items = await service.adminListTickets({});
      expect(items.length).toBe(2);
      expect(items[0]?.slaStatus).toBe(SLAStatus.ON_TRACK);
      expect(items[1]?.slaStatus).toBe(SLAStatus.BREACHED);
      expect(items[0]?.requesterMaskedPhone).toBe('+92 ••• ••••456');
    });

    it('requires mandatory min 5-character audit reason for assignment (ROLE-003)', async () => {
      await expect(service.adminAssignTicket('t1', 'staff-1', { reason: '3ch' })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('assigns ticket and logs audit trail when audit reason is valid', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 't1',
        assignedToUserId: null,
        status: 'OPEN',
      });
      mockPrisma.supportTicket.update.mockResolvedValue({
        id: 't1',
        requesterUserId: 'u1',
        requesterRole: 'CUSTOMER',
        bookingId: null,
        categoryCode: null,
        level: 'L2',
        assignedToUserId: 'staff-1',
        source: 'APP_TICKET',
        isSafety: false,
        description: 'Query',
        evidenceMediaIds: [],
        status: 'OPEN',
        closedAt: null,
        resolutionNote: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await service.adminAssignTicket('t1', 'staff-1', {
        reason: 'Taking responsibility for customer follow-up',
      });

      expect(updated.assignedToUserId).toBe('staff-1');
      expect(mockAuditWriter.log).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          action: 'ASSIGN_TICKET',
          reason: 'Taking responsibility for customer follow-up',
        }),
      );
    });

    it('blocks staff update if text contains payment or IBAN instructions (SEC-REVIEW #25)', async () => {
      await expect(
        service.adminAddTicketUpdate('t1', 'staff-1', {
          text: 'Please transfer money to my EasyPaisa account number 03001234567',
          reason: 'Customer asking how to pay',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('closes ticket with resolution note and mandatory audit reason', async () => {
      mockPrisma.supportTicket.findUnique.mockResolvedValue({
        id: 't1',
        status: 'OPEN',
      });
      mockPrisma.supportTicket.update.mockResolvedValue({
        id: 't1',
        requesterUserId: 'u1',
        requesterRole: 'CUSTOMER',
        bookingId: null,
        categoryCode: null,
        level: 'L2',
        assignedToUserId: 'staff-1',
        source: 'APP_TICKET',
        isSafety: false,
        description: 'Query',
        evidenceMediaIds: [],
        status: 'CLOSED',
        closedAt: new Date(),
        resolutionNote: 'Customer confirmed problem was resolved on site.',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const closed = await service.adminCloseTicket('t1', 'staff-1', {
        resolutionNote: 'Customer confirmed problem was resolved on site.',
        reason: 'Issue fully resolved with customer satisfaction',
      });

      expect(closed.status).toBe(TicketStatus.CLOSED);
      expect(mockAuditWriter.log).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({
          action: 'CLOSE_TICKET',
        }),
      );
    });
  });

  describe('5. Admin Dispute Decisions & Booking Rework/Refund (OPS-ADMIN-010, SUP-003..004, BOOK-STATUS-012)', () => {
    it('decides dispute as REWORK and transitions booking DISPUTED -> IN_PROGRESS', async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: 'disp-1',
        bookingId: 'book-1',
        outcome: null,
      });
      mockPrisma.dispute.update.mockResolvedValue({
        id: 'disp-1',
        bookingId: 'book-1',
        openedByUserId: 'cust-1',
        openedByRole: 'CUSTOMER',
        level: 'L3',
        issueType: 'POOR_WORK',
        description: 'Needs fixing',
        evidenceMediaIds: [],
        isSafety: false,
        outcome: DisputeOutcome.REWORK,
        outcomeReason: 'Provider agreed to return and fix pipe free of charge',
        decidedByUserId: 'ops-lead-1',
        decidedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'book-1',
        status: 'DISPUTED',
      });

      const result = await service.adminDecideDispute('disp-1', 'ops-lead-1', {
        outcome: DisputeOutcome.REWORK,
        reason: 'Provider agreed to return and fix pipe free of charge',
      });

      expect(result.outcome).toBe(DisputeOutcome.REWORK);
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'book-1' },
        data: expect.objectContaining({ status: 'IN_PROGRESS' }),
      });
      expect(mockPrisma.jobEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 'book-1',
          fromStatus: 'DISPUTED',
          toStatus: 'IN_PROGRESS',
        }),
      });
    });

    it('decides dispute as RESOLVED and transitions booking DISPUTED -> CLOSED', async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: 'disp-2',
        bookingId: 'book-2',
        outcome: null,
      });
      mockPrisma.dispute.update.mockResolvedValue({
        id: 'disp-2',
        bookingId: 'book-2',
        openedByUserId: 'cust-1',
        openedByRole: 'CUSTOMER',
        level: 'L3',
        issueType: 'MINOR_DELAY',
        description: 'Provider was late',
        evidenceMediaIds: [],
        isSafety: false,
        outcome: DisputeOutcome.RESOLVED,
        outcomeReason: 'Customer accepted apology discount',
        decidedByUserId: 'ops-lead-1',
        decidedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'book-2',
        status: 'DISPUTED',
      });

      const result = await service.adminDecideDispute('disp-2', 'ops-lead-1', {
        outcome: DisputeOutcome.RESOLVED,
        reason: 'Customer accepted apology discount',
      });

      expect(result.outcome).toBe(DisputeOutcome.RESOLVED);
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'book-2' },
        data: expect.objectContaining({ status: 'CLOSED' }),
      });
    });

    it('rejects deciding an already decided dispute with 409 Conflict', async () => {
      mockPrisma.dispute.findUnique.mockResolvedValue({
        id: 'disp-decided',
        outcome: DisputeOutcome.RESOLVED,
      });

      await expect(
        service.adminDecideDispute('disp-decided', 'ops-lead-1', {
          outcome: DisputeOutcome.CLOSED,
          reason: 'Trying to change decision',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});

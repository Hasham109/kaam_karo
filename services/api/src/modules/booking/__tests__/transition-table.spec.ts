/**
 * Unit tests for Booking Transition Table (T3.4; owner A04).
 * Requirement IDs: BOOK-STATUS-001..017, BOOK-CANCEL-001..006, test-strategy.md §4.1.
 * Acceptance criterion: 100% transition table coverage.
 */
import { describe, expect, it } from 'vitest';
import {
  ALL_BOOKING_STATUSES,
  BOOKING_TRANSITIONS,
  isTransitionDefined,
  isTransitionAllowedForRole,
  getAllowedNextActions,
  crewSizeGuard,
  unpaidCommissionGuard,
  noShowGuard,
} from '../transition-table.js';
import { BookingStatus, ActorRole, NoShowParty } from '../booking.types.js';
import { BOOKING_TRANSITIONS_ORACLE } from './booking-transitions.oracle.js';

describe('Booking Transition Table (T3.4; ARCH §6.1, BP §15, BOOK-STATUS-001..017)', () => {
  it('has exactly 17 statuses in ALL_BOOKING_STATUSES', () => {
    expect(ALL_BOOKING_STATUSES.length).toBe(17);
  });

  describe('Bidirectional Oracle Comparison (test-strategy.md §4.1)', () => {
    it('every pair in the oracle exists in the code table with matching action and roles', () => {
      for (const oracle of BOOKING_TRANSITIONS_ORACLE) {
        const found = BOOKING_TRANSITIONS.find((t) => t.from === oracle.from && t.to === oracle.to);
        expect(
          found,
          `Oracle transition ${oracle.from}->${oracle.to} must exist in BOOKING_TRANSITIONS`,
        ).toBeDefined();
        expect(found!.action).toBe(oracle.action);
        for (const role of oracle.allowedRoles) {
          expect(found!.allowedRoles).toContain(role);
        }
      }
    });

    it('every pair in the code table exists in the oracle (no rogue transitions)', () => {
      for (const codeTransition of BOOKING_TRANSITIONS) {
        const found = BOOKING_TRANSITIONS_ORACLE.find(
          (o) => o.from === codeTransition.from && o.to === codeTransition.to,
        );
        expect(
          found,
          `Code transition ${codeTransition.from}->${codeTransition.to} must exist in the oracle`,
        ).toBeDefined();
        expect(codeTransition.action).toBe(found!.action);
      }
    });

    it('has matching total transition count between oracle and code table', () => {
      expect(BOOKING_TRANSITIONS.length).toBe(BOOKING_TRANSITIONS_ORACLE.length);
      expect(BOOKING_TRANSITIONS.length).toBe(38);
    });
  });

  describe('Full Cartesian Product Coverage (17 x 17 = 289 pairs)', () => {
    it('asserts exactly 38 allowed pairs and 251 rejected pairs', () => {
      let allowedCount = 0;
      let rejectedCount = 0;

      for (const from of ALL_BOOKING_STATUSES) {
        for (const to of ALL_BOOKING_STATUSES) {
          if (isTransitionDefined(from, to)) {
            allowedCount++;
          } else {
            rejectedCount++;
          }
        }
      }

      expect(allowedCount).toBe(38);
      expect(rejectedCount).toBe(251);
      expect(allowedCount + rejectedCount).toBe(289);
    });

    it('asserts no transition out of CLOSED (BOOK-STATUS-015)', () => {
      for (const to of ALL_BOOKING_STATUSES) {
        expect(isTransitionDefined(BookingStatus.CLOSED, to)).toBe(false);
      }
    });

    it('asserts terminal statuses only transition to CLOSED (BOOK-STATUS-013, 014, 017)', () => {
      const terminalStatuses = [
        BookingStatus.CANCELLED,
        BookingStatus.EXPIRED,
        BookingStatus.REJECTED,
        BookingStatus.NO_SHOW,
      ];

      for (const terminal of terminalStatuses) {
        for (const to of ALL_BOOKING_STATUSES) {
          const expected = to === BookingStatus.CLOSED;
          expect(isTransitionDefined(terminal, to)).toBe(expected);
        }
      }
    });
  });

  describe('Actor Role Authorization (isTransitionAllowedForRole)', () => {
    it('customer can submit draft but provider cannot', () => {
      expect(
        isTransitionAllowedForRole(
          BookingStatus.DRAFT,
          BookingStatus.REQUESTED,
          ActorRole.CUSTOMER,
        ),
      ).toBe(true);
      expect(
        isTransitionAllowedForRole(
          BookingStatus.DRAFT,
          BookingStatus.REQUESTED,
          ActorRole.PROVIDER,
        ),
      ).toBe(false);
    });

    it('provider can accept requested booking but customer cannot accept their own request', () => {
      expect(
        isTransitionAllowedForRole(
          BookingStatus.REQUESTED,
          BookingStatus.ACCEPTED,
          ActorRole.PROVIDER,
        ),
      ).toBe(true);
      expect(
        isTransitionAllowedForRole(
          BookingStatus.REQUESTED,
          BookingStatus.ACCEPTED,
          ActorRole.CUSTOMER,
        ),
      ).toBe(false);
    });

    it('admin can execute all operational transitions', () => {
      for (const t of BOOKING_TRANSITIONS) {
        expect(
          isTransitionAllowedForRole(t.from, t.to, ActorRole.ADMIN),
          `Admin should be permitted for transition ${t.from}->${t.to}`,
        ).toBe(true);
      }
    });

    it('system can expire timed out bookings', () => {
      expect(
        isTransitionAllowedForRole(
          BookingStatus.REQUESTED,
          BookingStatus.EXPIRED,
          ActorRole.SYSTEM,
        ),
      ).toBe(true);
      expect(
        isTransitionAllowedForRole(
          BookingStatus.QUOTE_PENDING,
          BookingStatus.EXPIRED,
          ActorRole.SYSTEM,
        ),
      ).toBe(true);
      expect(
        isTransitionAllowedForRole(BookingStatus.QUOTED, BookingStatus.EXPIRED, ActorRole.SYSTEM),
      ).toBe(true);
    });
  });

  describe('Guards', () => {
    describe('crewSizeGuard (D-004)', () => {
      it('rejects accept without crewSize when booking has no crewSize', () => {
        const res = crewSizeGuard({
          booking: {
            id: '1',
            status: BookingStatus.REQUESTED,
            providerProfileId: 'prov-1',
            customerProfileId: 'cust-1',
            scheduledAt: null,
            version: 1,
            crewSize: null,
          },
          callerRole: ActorRole.PROVIDER,
          requestedAction: 'ACCEPT',
          crewSize: undefined,
        });
        expect(res.allowed).toBe(false);
        expect(res.errorCode).toBe('CREW_SIZE_REQUIRED');
      });

      it('allows accept when crewSize is provided by provider', () => {
        const res = crewSizeGuard({
          booking: {
            id: '1',
            status: BookingStatus.REQUESTED,
            providerProfileId: 'prov-1',
            customerProfileId: 'cust-1',
            scheduledAt: null,
            version: 1,
            crewSize: null,
          },
          callerRole: ActorRole.PROVIDER,
          requestedAction: 'ACCEPT',
          crewSize: 2,
        });
        expect(res.allowed).toBe(true);
      });

      it('allows accept when booking already had crewSize set from quote', () => {
        const res = crewSizeGuard({
          booking: {
            id: '1',
            status: BookingStatus.QUOTED,
            providerProfileId: 'prov-1',
            customerProfileId: 'cust-1',
            scheduledAt: null,
            version: 1,
            crewSize: 3,
          },
          callerRole: ActorRole.PROVIDER,
          requestedAction: 'ACCEPT',
        });
        expect(res.allowed).toBe(true);
      });
    });

    describe('unpaidCommissionGuard (LEDGER-NEG-005, D-021)', () => {
      it('allows trip/work when provider owes 0', () => {
        const res = unpaidCommissionGuard({
          booking: {
            id: '1',
            status: BookingStatus.SCHEDULED,
            providerProfileId: 'prov-1',
            customerProfileId: 'cust-1',
            scheduledAt: null,
            version: 1,
            crewSize: 1,
          },
          callerRole: ActorRole.PROVIDER,
          requestedAction: 'START_TRIP',
          providerUnpaidBalanceOwed: 0,
          providerMaxNegativeBalance: 1000,
        });
        expect(res.allowed).toBe(true);
      });

      it('rejects trip/work with UNPAID_COMMISSION when owed >= max negative balance limit', () => {
        const res = unpaidCommissionGuard({
          booking: {
            id: '1',
            status: BookingStatus.SCHEDULED,
            providerProfileId: 'prov-1',
            customerProfileId: 'cust-1',
            scheduledAt: null,
            version: 1,
            crewSize: 1,
          },
          callerRole: ActorRole.PROVIDER,
          requestedAction: 'START_TRIP',
          providerUnpaidBalanceOwed: 1500,
          providerMaxNegativeBalance: 1000,
        });
        expect(res.allowed).toBe(false);
        expect(res.errorCode).toBe('UNPAID_COMMISSION');
      });
    });

    describe('noShowGuard (BOOK-STATUS-017)', () => {
      it('rejects no-show when party is missing', () => {
        const res = noShowGuard({
          booking: {
            id: '1',
            status: BookingStatus.SCHEDULED,
            providerProfileId: 'prov-1',
            customerProfileId: 'cust-1',
            scheduledAt: null,
            version: 1,
            crewSize: 1,
          },
          callerRole: ActorRole.CUSTOMER,
          requestedAction: 'REPORT_NO_SHOW',
          noShowParty: undefined,
        });
        expect(res.allowed).toBe(false);
        expect(res.errorCode).toBe('NO_SHOW_PARTY_REQUIRED');
      });

      it('allows no-show when party CUSTOMER or PROVIDER is specified', () => {
        const res = noShowGuard({
          booking: {
            id: '1',
            status: BookingStatus.SCHEDULED,
            providerProfileId: 'prov-1',
            customerProfileId: 'cust-1',
            scheduledAt: null,
            version: 1,
            crewSize: 1,
          },
          callerRole: ActorRole.CUSTOMER,
          requestedAction: 'REPORT_NO_SHOW',
          noShowParty: NoShowParty.PROVIDER,
        });
        expect(res.allowed).toBe(true);
      });
    });
  });

  describe('getAllowedNextActions (BOOK-STATUS-016)', () => {
    it('returns customer actions for DRAFT status', () => {
      const actions = getAllowedNextActions(BookingStatus.DRAFT, ActorRole.CUSTOMER);
      expect(actions.length).toBe(2);
      expect(actions.map((a) => a.action)).toContain('SUBMIT');
      expect(actions.map((a) => a.action)).toContain('REQUEST_QUOTE');
    });

    it('returns provider actions for SCHEDULED status', () => {
      const actions = getAllowedNextActions(BookingStatus.SCHEDULED, ActorRole.PROVIDER);
      expect(actions.map((a) => a.action)).toContain('START_TRIP');
      expect(actions.map((a) => a.action)).toContain('CANCEL');
      expect(actions.map((a) => a.action)).toContain('REPORT_NO_SHOW');
    });

    it('returns empty actions for CLOSED status', () => {
      const customerActions = getAllowedNextActions(BookingStatus.CLOSED, ActorRole.CUSTOMER);
      const providerActions = getAllowedNextActions(BookingStatus.CLOSED, ActorRole.PROVIDER);
      const adminActions = getAllowedNextActions(BookingStatus.CLOSED, ActorRole.ADMIN);
      expect(customerActions.length).toBe(0);
      expect(providerActions.length).toBe(0);
      expect(adminActions.length).toBe(0);
    });
  });
});

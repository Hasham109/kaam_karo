/**
 * Test oracle fixture for Booking State Machine (T3.4; test-strategy.md §4.1).
 * Encodes ARCH §6.1 plus K-05, D-028 readings independently of transition-table.ts.
 * The test compares transition-table.ts to this oracle BOTH WAYS.
 */
import { BookingStatus, ActorRole } from '../booking.types.js';

export interface OracleTransition {
  readonly from: BookingStatus;
  readonly to: BookingStatus;
  readonly action: string;
  readonly allowedRoles: readonly ActorRole[];
}

export const BOOKING_TRANSITIONS_ORACLE: readonly OracleTransition[] = [
  // 1. DRAFT -> REQUESTED
  {
    from: BookingStatus.DRAFT,
    to: BookingStatus.REQUESTED,
    action: 'SUBMIT',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
  },
  // 2. DRAFT -> QUOTE_PENDING
  {
    from: BookingStatus.DRAFT,
    to: BookingStatus.QUOTE_PENDING,
    action: 'REQUEST_QUOTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
  },
  // 3. REQUESTED -> ACCEPTED
  {
    from: BookingStatus.REQUESTED,
    to: BookingStatus.ACCEPTED,
    action: 'ACCEPT',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 4. REQUESTED -> REJECTED
  {
    from: BookingStatus.REQUESTED,
    to: BookingStatus.REJECTED,
    action: 'DECLINE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 5. REQUESTED -> EXPIRED
  {
    from: BookingStatus.REQUESTED,
    to: BookingStatus.EXPIRED,
    action: 'EXPIRE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
  },
  // 6. REQUESTED -> CANCELLED
  {
    from: BookingStatus.REQUESTED,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
  },
  // 7. REQUESTED -> QUOTE_PENDING
  {
    from: BookingStatus.REQUESTED,
    to: BookingStatus.QUOTE_PENDING,
    action: 'CHOOSE_QUOTE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 8. QUOTE_PENDING -> QUOTED
  {
    from: BookingStatus.QUOTE_PENDING,
    to: BookingStatus.QUOTED,
    action: 'SEND_QUOTE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 9. QUOTE_PENDING -> REJECTED
  {
    from: BookingStatus.QUOTE_PENDING,
    to: BookingStatus.REJECTED,
    action: 'DECLINE_QUOTE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 10. QUOTE_PENDING -> EXPIRED
  {
    from: BookingStatus.QUOTE_PENDING,
    to: BookingStatus.EXPIRED,
    action: 'EXPIRE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
  },
  // 11. QUOTE_PENDING -> CANCELLED
  {
    from: BookingStatus.QUOTE_PENDING,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
  },
  // 12. QUOTED -> ACCEPTED
  {
    from: BookingStatus.QUOTED,
    to: BookingStatus.ACCEPTED,
    action: 'ACCEPT_QUOTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
  },
  // 13. QUOTED -> EXPIRED
  {
    from: BookingStatus.QUOTED,
    to: BookingStatus.EXPIRED,
    action: 'EXPIRE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
  },
  // 14. QUOTED -> CANCELLED
  {
    from: BookingStatus.QUOTED,
    to: BookingStatus.CANCELLED,
    action: 'DECLINE_QUOTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
  },
  // 15. ACCEPTED -> SCHEDULED
  {
    from: BookingStatus.ACCEPTED,
    to: BookingStatus.SCHEDULED,
    action: 'CONFIRM_SCHEDULE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.CUSTOMER, ActorRole.SYSTEM, ActorRole.ADMIN],
  },
  // 16. ACCEPTED -> CANCELLED
  {
    from: BookingStatus.ACCEPTED,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 17. SCHEDULED -> PROVIDER_EN_ROUTE
  {
    from: BookingStatus.SCHEDULED,
    to: BookingStatus.PROVIDER_EN_ROUTE,
    action: 'START_TRIP',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 18. SCHEDULED -> CANCELLED
  {
    from: BookingStatus.SCHEDULED,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 19. SCHEDULED -> NO_SHOW
  {
    from: BookingStatus.SCHEDULED,
    to: BookingStatus.NO_SHOW,
    action: 'REPORT_NO_SHOW',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 20. PROVIDER_EN_ROUTE -> ARRIVED
  {
    from: BookingStatus.PROVIDER_EN_ROUTE,
    to: BookingStatus.ARRIVED,
    action: 'ARRIVE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 21. PROVIDER_EN_ROUTE -> CANCELLED
  {
    from: BookingStatus.PROVIDER_EN_ROUTE,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 22. PROVIDER_EN_ROUTE -> NO_SHOW
  {
    from: BookingStatus.PROVIDER_EN_ROUTE,
    to: BookingStatus.NO_SHOW,
    action: 'REPORT_NO_SHOW',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 23. ARRIVED -> IN_PROGRESS
  {
    from: BookingStatus.ARRIVED,
    to: BookingStatus.IN_PROGRESS,
    action: 'START_WORK',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 24. ARRIVED -> CANCELLED
  {
    from: BookingStatus.ARRIVED,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 25. IN_PROGRESS -> AWAITING_APPROVAL
  {
    from: BookingStatus.IN_PROGRESS,
    to: BookingStatus.AWAITING_APPROVAL,
    action: 'PROPOSE_CHARGE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.SYSTEM, ActorRole.ADMIN],
  },
  // 26. IN_PROGRESS -> COMPLETED
  {
    from: BookingStatus.IN_PROGRESS,
    to: BookingStatus.COMPLETED,
    action: 'COMPLETE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 27. IN_PROGRESS -> DISPUTED
  {
    from: BookingStatus.IN_PROGRESS,
    to: BookingStatus.DISPUTED,
    action: 'RAISE_DISPUTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 28. AWAITING_APPROVAL -> IN_PROGRESS
  {
    from: BookingStatus.AWAITING_APPROVAL,
    to: BookingStatus.IN_PROGRESS,
    action: 'RESOLVE_APPROVAL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
  },
  // 29. AWAITING_APPROVAL -> COMPLETED
  {
    from: BookingStatus.AWAITING_APPROVAL,
    to: BookingStatus.COMPLETED,
    action: 'COMPLETE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 30. AWAITING_APPROVAL -> DISPUTED
  {
    from: BookingStatus.AWAITING_APPROVAL,
    to: BookingStatus.DISPUTED,
    action: 'RAISE_DISPUTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
  },
  // 31. COMPLETED -> DISPUTED
  {
    from: BookingStatus.COMPLETED,
    to: BookingStatus.DISPUTED,
    action: 'RAISE_DISPUTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
  },
  // 32. COMPLETED -> CLOSED
  {
    from: BookingStatus.COMPLETED,
    to: BookingStatus.CLOSED,
    action: 'CLOSE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
  },
  // 33. DISPUTED -> IN_PROGRESS
  {
    from: BookingStatus.DISPUTED,
    to: BookingStatus.IN_PROGRESS,
    action: 'SEND_REWORK',
    allowedRoles: [ActorRole.ADMIN],
  },
  // 34. DISPUTED -> CLOSED
  {
    from: BookingStatus.DISPUTED,
    to: BookingStatus.CLOSED,
    action: 'CLOSE_DISPUTE',
    allowedRoles: [ActorRole.ADMIN, ActorRole.SYSTEM],
  },
  // 35. CANCELLED -> CLOSED
  {
    from: BookingStatus.CANCELLED,
    to: BookingStatus.CLOSED,
    action: 'CLOSE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
  },
  // 36. EXPIRED -> CLOSED
  {
    from: BookingStatus.EXPIRED,
    to: BookingStatus.CLOSED,
    action: 'CLOSE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
  },
  // 37. REJECTED -> CLOSED
  {
    from: BookingStatus.REJECTED,
    to: BookingStatus.CLOSED,
    action: 'CLOSE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
  },
  // 38. NO_SHOW -> CLOSED
  {
    from: BookingStatus.NO_SHOW,
    to: BookingStatus.CLOSED,
    action: 'CLOSE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
  },
];

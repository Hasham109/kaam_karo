/**
 * Canonical Booking Transition Table (T3.4; owner A04).
 * Enforces ARCH §6.1, BP §15, BP §16, K-05, D-028, BOOK-STATUS-001..017, BOOK-CANCEL-001..006.
 *
 * Every allowed transition pair and actor role is codified here.
 * Any pair not in this table is strictly rejected with 409 TRANSITION_NOT_ALLOWED.
 */
import {
  BookingStatus,
  ActorRole,
  type TransitionDefinition,
  type TransitionGuardContext,
  type AllowedNextAction,
} from './booking.types.js';

export const ALL_BOOKING_STATUSES: readonly BookingStatus[] = Object.values(BookingStatus);

/** Guard requiring crewSize if not already recorded on booking (D-004) */
export function crewSizeGuard(ctx: TransitionGuardContext): {
  allowed: boolean;
  errorCode?: string;
  errorMessage?: string;
} {
  const currentCrewSize = ctx.booking.crewSize;
  const requestedCrewSize = ctx.crewSize;
  if (!currentCrewSize && (!requestedCrewSize || requestedCrewSize < 1)) {
    return {
      allowed: false,
      errorCode: 'CREW_SIZE_REQUIRED',
      errorMessage:
        'Provider crew size is required upon accepting a booking (D-004, PROV-CREW-002)',
    };
  }
  return { allowed: true };
}

/** Guard checking unpaid commission balance (BOOK-STATUS-006, BOOK-STATUS-008, LEDGER-NEG-005, D-021) */
export function unpaidCommissionGuard(ctx: TransitionGuardContext): {
  allowed: boolean;
  errorCode?: string;
  errorMessage?: string;
} {
  const owed = ctx.providerUnpaidBalanceOwed ?? 0;
  const maxNeg = ctx.providerMaxNegativeBalance ?? 0;
  // If owed amount is worse than max negative balance limit, block trip/work
  if (maxNeg > 0 && owed >= maxNeg) {
    return {
      allowed: false,
      errorCode: 'UNPAID_COMMISSION',
      errorMessage:
        'Cannot proceed: provider account has outstanding unpaid commission exceeding negative balance limit (D-021, LEDGER-NEG-005)',
    };
  }
  return { allowed: true };
}

/** Guard requiring noShowParty (BOOK-STATUS-017, BOOK-CANCEL-005) */
export function noShowGuard(ctx: TransitionGuardContext): {
  allowed: boolean;
  errorCode?: string;
  errorMessage?: string;
} {
  if (!ctx.noShowParty) {
    return {
      allowed: false,
      errorCode: 'NO_SHOW_PARTY_REQUIRED',
      errorMessage: 'No-show report requires party CUSTOMER or PROVIDER (BOOK-STATUS-017)',
    };
  }
  return { allowed: true };
}

export const BOOKING_TRANSITIONS: readonly TransitionDefinition[] = [
  // 1. DRAFT -> REQUESTED (BOOK-STATUS-001)
  {
    from: BookingStatus.DRAFT,
    to: BookingStatus.REQUESTED,
    action: 'SUBMIT',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
    labelEn: 'Submit request',
    labelUr: 'درخواست جمع کرائیں',
  },
  // 2. DRAFT -> QUOTE_PENDING (BOOK-STATUS-001, BOOK-STATUS-003, D-028)
  {
    from: BookingStatus.DRAFT,
    to: BookingStatus.QUOTE_PENDING,
    action: 'REQUEST_QUOTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
    labelEn: 'Request quote',
    labelUr: 'کوٹیشن طلب کریں',
  },
  // 3. REQUESTED -> ACCEPTED (BOOK-STATUS-002, D-004)
  {
    from: BookingStatus.REQUESTED,
    to: BookingStatus.ACCEPTED,
    action: 'ACCEPT',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Accept job',
    labelUr: 'کام قبول کریں',
    guard: crewSizeGuard,
  },
  // 4. REQUESTED -> REJECTED (BOOK-STATUS-002, BOOK-STATUS-017)
  {
    from: BookingStatus.REQUESTED,
    to: BookingStatus.REJECTED,
    action: 'DECLINE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Decline',
    labelUr: 'انکار کریں',
    destructive: true,
  },
  // 5. REQUESTED -> EXPIRED (BOOK-STATUS-002, BOOK-STATUS-014)
  {
    from: BookingStatus.REQUESTED,
    to: BookingStatus.EXPIRED,
    action: 'EXPIRE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
    labelEn: 'Expire',
    labelUr: 'میعاد ختم',
  },
  // 6. REQUESTED -> CANCELLED (BOOK-STATUS-002, BOOK-CANCEL-001)
  {
    from: BookingStatus.REQUESTED,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
    labelEn: 'Cancel request',
    labelUr: 'درخواست منسوخ کریں',
    destructive: true,
  },
  // 7. REQUESTED -> QUOTE_PENDING (BOOK-STATUS-002, BOOK-STATUS-003, D-028)
  {
    from: BookingStatus.REQUESTED,
    to: BookingStatus.QUOTE_PENDING,
    action: 'CHOOSE_QUOTE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Quote or inspect',
    labelUr: 'کوٹیشن یا معائنہ کریں',
  },
  // 8. QUOTE_PENDING -> QUOTED (BOOK-STATUS-003)
  {
    from: BookingStatus.QUOTE_PENDING,
    to: BookingStatus.QUOTED,
    action: 'SEND_QUOTE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Send quote',
    labelUr: 'کوٹیشن بھیجیں',
  },
  // 9. QUOTE_PENDING -> REJECTED (BOOK-STATUS-003, BOOK-STATUS-017)
  {
    from: BookingStatus.QUOTE_PENDING,
    to: BookingStatus.REJECTED,
    action: 'DECLINE_QUOTE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Decline quote request',
    labelUr: 'کوٹیشن دینے سے معذرت',
    destructive: true,
  },
  // 10. QUOTE_PENDING -> EXPIRED (BOOK-STATUS-003, BOOK-STATUS-014)
  {
    from: BookingStatus.QUOTE_PENDING,
    to: BookingStatus.EXPIRED,
    action: 'EXPIRE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
    labelEn: 'Expire',
    labelUr: 'میعاد ختم',
  },
  // 11. QUOTE_PENDING -> CANCELLED (BOOK-STATUS-003, BOOK-CANCEL-001)
  {
    from: BookingStatus.QUOTE_PENDING,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
    labelEn: 'Cancel request',
    labelUr: 'درخواست منسوخ کریں',
    destructive: true,
  },
  // 12. QUOTED -> ACCEPTED (BOOK-STATUS-004)
  {
    from: BookingStatus.QUOTED,
    to: BookingStatus.ACCEPTED,
    action: 'ACCEPT_QUOTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
    labelEn: 'Accept quote',
    labelUr: 'کوٹیشن قبول کریں',
  },
  // 13. QUOTED -> EXPIRED (BOOK-STATUS-004, BOOK-STATUS-014)
  {
    from: BookingStatus.QUOTED,
    to: BookingStatus.EXPIRED,
    action: 'EXPIRE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
    labelEn: 'Expire',
    labelUr: 'میعاد ختم',
  },
  // 14. QUOTED -> CANCELLED (BOOK-STATUS-004, BOOK-CANCEL-001)
  {
    from: BookingStatus.QUOTED,
    to: BookingStatus.CANCELLED,
    action: 'DECLINE_QUOTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
    labelEn: 'Decline quote',
    labelUr: 'کوٹیشن مسترد کریں',
    destructive: true,
  },
  // 15. ACCEPTED -> SCHEDULED (BOOK-STATUS-005)
  {
    from: BookingStatus.ACCEPTED,
    to: BookingStatus.SCHEDULED,
    action: 'CONFIRM_SCHEDULE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.CUSTOMER, ActorRole.SYSTEM, ActorRole.ADMIN],
    labelEn: 'Confirm schedule',
    labelUr: 'وقت طے کریں',
  },
  // 16. ACCEPTED -> CANCELLED (BOOK-STATUS-005, BOOK-CANCEL-002, BOOK-CANCEL-003)
  {
    from: BookingStatus.ACCEPTED,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Cancel booking',
    labelUr: 'بکنگ منسوخ کریں',
    destructive: true,
  },
  // 17. SCHEDULED -> PROVIDER_EN_ROUTE (BOOK-STATUS-006, LEDGER-NEG-005, D-021)
  {
    from: BookingStatus.SCHEDULED,
    to: BookingStatus.PROVIDER_EN_ROUTE,
    action: 'START_TRIP',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: "I'm on my way",
    labelUr: 'میں راستے میں ہوں',
    guard: unpaidCommissionGuard,
  },
  // 18. SCHEDULED -> CANCELLED (BOOK-STATUS-006, BOOK-CANCEL-002, BOOK-CANCEL-003)
  {
    from: BookingStatus.SCHEDULED,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Cancel booking',
    labelUr: 'بکنگ منسوخ کریں',
    destructive: true,
  },
  // 19. SCHEDULED -> NO_SHOW (BOOK-STATUS-006, BOOK-STATUS-017, BOOK-CANCEL-004, BOOK-CANCEL-005)
  {
    from: BookingStatus.SCHEDULED,
    to: BookingStatus.NO_SHOW,
    action: 'REPORT_NO_SHOW',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Report no-show',
    labelUr: 'نہ آنے کی اطلاع دیں',
    destructive: true,
    guard: noShowGuard,
  },
  // 20. PROVIDER_EN_ROUTE -> ARRIVED (BOOK-STATUS-007)
  {
    from: BookingStatus.PROVIDER_EN_ROUTE,
    to: BookingStatus.ARRIVED,
    action: 'ARRIVE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: "I've arrived",
    labelUr: 'میں پہنچ گیا ہوں',
  },
  // 21. PROVIDER_EN_ROUTE -> CANCELLED (BOOK-STATUS-007, BOOK-CANCEL-002, BOOK-CANCEL-003)
  {
    from: BookingStatus.PROVIDER_EN_ROUTE,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Cancel booking',
    labelUr: 'بکنگ منسوخ کریں',
    destructive: true,
  },
  // 22. PROVIDER_EN_ROUTE -> NO_SHOW (BOOK-STATUS-007, BOOK-STATUS-017, BOOK-CANCEL-004, BOOK-CANCEL-005)
  {
    from: BookingStatus.PROVIDER_EN_ROUTE,
    to: BookingStatus.NO_SHOW,
    action: 'REPORT_NO_SHOW',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Report no-show',
    labelUr: 'نہ آنے کی اطلاع دیں',
    destructive: true,
    guard: noShowGuard,
  },
  // 23. ARRIVED -> IN_PROGRESS (BOOK-STATUS-008, LEDGER-NEG-005, D-021)
  {
    from: BookingStatus.ARRIVED,
    to: BookingStatus.IN_PROGRESS,
    action: 'START_WORK',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Start work',
    labelUr: 'کام شروع کریں',
    guard: unpaidCommissionGuard,
  },
  // 24. ARRIVED -> CANCELLED (BOOK-STATUS-008, BOOK-CANCEL-006 Safety stop)
  {
    from: BookingStatus.ARRIVED,
    to: BookingStatus.CANCELLED,
    action: 'CANCEL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Cancel / Stop safety',
    labelUr: 'منسوخ / حفاظتی طور پر روکیں',
    destructive: true,
  },
  // 25. IN_PROGRESS -> AWAITING_APPROVAL (BOOK-STATUS-009, BOOK-STATUS-010, FARE-012)
  {
    from: BookingStatus.IN_PROGRESS,
    to: BookingStatus.AWAITING_APPROVAL,
    action: 'PROPOSE_CHARGE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.SYSTEM, ActorRole.ADMIN],
    labelEn: 'Propose charge',
    labelUr: 'اضافی چارج تجویز کریں',
  },
  // 26. IN_PROGRESS -> COMPLETED (BOOK-STATUS-009, BOOK-STATUS-011)
  {
    from: BookingStatus.IN_PROGRESS,
    to: BookingStatus.COMPLETED,
    action: 'COMPLETE',
    allowedRoles: [ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Mark job complete',
    labelUr: 'کام مکمل قرار دیں',
  },
  // 27. IN_PROGRESS -> DISPUTED (BOOK-STATUS-009, BOOK-STATUS-012, BOOK-CANCEL-006 Safety stop)
  {
    from: BookingStatus.IN_PROGRESS,
    to: BookingStatus.DISPUTED,
    action: 'RAISE_DISPUTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Dispute / Stop safety',
    labelUr: 'شکایت / حفاظتی طور پر روکیں',
    destructive: true,
  },
  // 28. AWAITING_APPROVAL -> IN_PROGRESS (BOOK-STATUS-010, FARE-012)
  {
    from: BookingStatus.AWAITING_APPROVAL,
    to: BookingStatus.IN_PROGRESS,
    action: 'RESOLVE_APPROVAL',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
    labelEn: 'Resume work',
    labelUr: 'کام دوبارہ شروع کریں',
  },
  // 29. AWAITING_APPROVAL -> COMPLETED (BOOK-STATUS-010, BOOK-STATUS-011)
  {
    from: BookingStatus.AWAITING_APPROVAL,
    to: BookingStatus.COMPLETED,
    action: 'COMPLETE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Approve & Complete',
    labelUr: 'منظور اور مکمل کریں',
  },
  // 30. AWAITING_APPROVAL -> DISPUTED (BOOK-STATUS-010, BOOK-STATUS-012)
  {
    from: BookingStatus.AWAITING_APPROVAL,
    to: BookingStatus.DISPUTED,
    action: 'RAISE_DISPUTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.PROVIDER, ActorRole.ADMIN],
    labelEn: 'Dispute charge',
    labelUr: 'چارج پر شکایت درج کریں',
    destructive: true,
  },
  // 31. COMPLETED -> DISPUTED (BOOK-STATUS-011, BOOK-STATUS-012, SUP-003)
  {
    from: BookingStatus.COMPLETED,
    to: BookingStatus.DISPUTED,
    action: 'RAISE_DISPUTE',
    allowedRoles: [ActorRole.CUSTOMER, ActorRole.ADMIN],
    labelEn: 'Dispute completed job',
    labelUr: 'کام پر شکایت درج کریں',
    destructive: true,
  },
  // 32. COMPLETED -> CLOSED (BOOK-STATUS-011, BOOK-STATUS-015)
  {
    from: BookingStatus.COMPLETED,
    to: BookingStatus.CLOSED,
    action: 'CLOSE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
    labelEn: 'Close booking',
    labelUr: 'بکنگ بند کریں',
  },
  // 33. DISPUTED -> IN_PROGRESS (BOOK-STATUS-012 Rework outcome)
  {
    from: BookingStatus.DISPUTED,
    to: BookingStatus.IN_PROGRESS,
    action: 'SEND_REWORK',
    allowedRoles: [ActorRole.ADMIN],
    labelEn: 'Send back for rework',
    labelUr: 'دوبارہ کام کے لیے بھیجیں',
  },
  // 34. DISPUTED -> CLOSED (BOOK-STATUS-012, BOOK-STATUS-015 Resolved/Refunded outcome)
  {
    from: BookingStatus.DISPUTED,
    to: BookingStatus.CLOSED,
    action: 'CLOSE_DISPUTE',
    allowedRoles: [ActorRole.ADMIN, ActorRole.SYSTEM],
    labelEn: 'Resolve and close',
    labelUr: 'حل اور بند کریں',
  },
  // 35. CANCELLED -> CLOSED (BOOK-STATUS-013, BOOK-STATUS-015)
  {
    from: BookingStatus.CANCELLED,
    to: BookingStatus.CLOSED,
    action: 'CLOSE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
    labelEn: 'Close',
    labelUr: 'بند کریں',
  },
  // 36. EXPIRED -> CLOSED (BOOK-STATUS-014, BOOK-STATUS-015)
  {
    from: BookingStatus.EXPIRED,
    to: BookingStatus.CLOSED,
    action: 'CLOSE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
    labelEn: 'Close',
    labelUr: 'بند کریں',
  },
  // 37. REJECTED -> CLOSED (BOOK-STATUS-017, BOOK-STATUS-015)
  {
    from: BookingStatus.REJECTED,
    to: BookingStatus.CLOSED,
    action: 'CLOSE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
    labelEn: 'Close',
    labelUr: 'بند کریں',
  },
  // 38. NO_SHOW -> CLOSED (BOOK-STATUS-017, BOOK-STATUS-015)
  {
    from: BookingStatus.NO_SHOW,
    to: BookingStatus.CLOSED,
    action: 'CLOSE',
    allowedRoles: [ActorRole.SYSTEM, ActorRole.ADMIN],
    labelEn: 'Close',
    labelUr: 'بند کریں',
  },
];

/** Fast lookup map: `${from}->${to}` -> TransitionDefinition */
const TRANSITION_MAP = new Map<string, TransitionDefinition>();
for (const t of BOOKING_TRANSITIONS) {
  TRANSITION_MAP.set(`${t.from}->${t.to}`, t);
}

/** Check whether a transition from -> to exists in the canonical table */
export function isTransitionDefined(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITION_MAP.has(`${from}->${to}`);
}

/** Get the transition definition if it exists */
export function getTransitionDefinition(
  from: BookingStatus,
  to: BookingStatus,
): TransitionDefinition | undefined {
  return TRANSITION_MAP.get(`${from}->${to}`);
}

/** Check if transition is allowed for caller role */
export function isTransitionAllowedForRole(
  from: BookingStatus,
  to: BookingStatus,
  role: ActorRole,
): boolean {
  const def = getTransitionDefinition(from, to);
  if (!def) return false;
  return def.allowedRoles.includes(role);
}

/** Compute allowedNextActions for a given status and actor role */
export function getAllowedNextActions(status: BookingStatus, role: ActorRole): AllowedNextAction[] {
  const actions: AllowedNextAction[] = [];
  for (const t of BOOKING_TRANSITIONS) {
    if (t.from === status && t.allowedRoles.includes(role)) {
      actions.push({
        action: t.action,
        targetStatus: t.to,
        labelEn: t.labelEn,
        labelUr: t.labelUr,
        requiresConfirmation: t.requiresConfirmation ?? false,
        destructive: t.destructive ?? false,
      });
    }
  }
  return actions;
}

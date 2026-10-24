/**
 * Booking status labels — BP §15; ARCH §6.1 (incl. note 2: Rejected, No-show with party);
 * A11Y-003 (status is text, never colour alone); I18N-006; QA F-01.
 *
 * The server is the only source of a status (BP §15.1). This module only turns the server code
 * into words for the customer or the provider. Any code it does not know (a newer server, a
 * typo, a missing No-show party) gives `status.unknown` ("Status: updating") with
 * `known: false`, so the screen shows the fallback and re-fetches (partner.md G9).
 *
 * Codes mirror the Prisma enum `BookingStatus` / `NoShowParty`
 * (services/api/prisma/schema/booking.prisma); a unit test checks they stay equal.
 * TODO(A04, T3.4): switch to the generated contract type when contracts/booking.yaml exists.
 */
import { type Locale } from './locale.js';
import { type MessageKey } from './messages.js';
import { messageTemplate } from './catalog.js';
import { translate } from './translate.js';

export const BOOKING_STATUSES = [
  'DRAFT',
  'REQUESTED',
  'QUOTE_PENDING',
  'QUOTED',
  'ACCEPTED',
  'SCHEDULED',
  'PROVIDER_EN_ROUTE',
  'ARRIVED',
  'IN_PROGRESS',
  'AWAITING_APPROVAL',
  'COMPLETED',
  'DISPUTED',
  'CANCELLED',
  'EXPIRED',
  'CLOSED',
  'REJECTED',
  'NO_SHOW',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const NO_SHOW_PARTIES = ['CUSTOMER', 'PROVIDER'] as const;
export type NoShowParty = (typeof NO_SHOW_PARTIES)[number];

/** Which app shows the label: wording differs per audience (partner.md G9 "Diff" column). */
export type StatusAudience = 'customer' | 'partner';

const CUSTOMER_KEYS: Readonly<Record<BookingStatus, MessageKey>> = {
  DRAFT: 'status.customer.draft',
  REQUESTED: 'status.customer.requested',
  QUOTE_PENDING: 'status.customer.quotePending',
  QUOTED: 'status.customer.quoted',
  ACCEPTED: 'status.customer.accepted',
  SCHEDULED: 'status.customer.scheduled',
  PROVIDER_EN_ROUTE: 'status.customer.providerEnRoute',
  ARRIVED: 'status.customer.arrived',
  IN_PROGRESS: 'status.customer.inProgress',
  AWAITING_APPROVAL: 'status.customer.awaitingApproval',
  COMPLETED: 'status.customer.completed',
  DISPUTED: 'status.customer.disputed',
  CANCELLED: 'status.customer.cancelled',
  EXPIRED: 'status.customer.expired',
  CLOSED: 'status.customer.closed',
  REJECTED: 'status.customer.rejected',
  NO_SHOW: 'status.customer.noShow',
};

/** Provider wording. DRAFT is absent (providers never receive drafts); NO_SHOW is per party. */
const PARTNER_KEYS: Readonly<Partial<Record<BookingStatus, MessageKey>>> = {
  REQUESTED: 'status.partner.requested',
  QUOTE_PENDING: 'status.partner.quotePending',
  QUOTED: 'status.partner.quoted',
  ACCEPTED: 'status.partner.accepted',
  SCHEDULED: 'status.partner.scheduled',
  PROVIDER_EN_ROUTE: 'status.partner.providerEnRoute',
  ARRIVED: 'status.partner.arrived',
  IN_PROGRESS: 'status.partner.inProgress',
  AWAITING_APPROVAL: 'status.partner.awaitingApproval',
  COMPLETED: 'status.partner.completed',
  DISPUTED: 'status.partner.disputed',
  CANCELLED: 'status.partner.cancelled',
  EXPIRED: 'status.partner.expired',
  CLOSED: 'status.partner.closed',
  REJECTED: 'status.partner.rejected',
};

const PARTNER_NO_SHOW_KEYS: Readonly<Record<NoShowParty, MessageKey>> = {
  CUSTOMER: 'status.partner.noShow.customer',
  PROVIDER: 'status.partner.noShow.provider',
};

export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === 'string' && (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function isNoShowParty(value: unknown): value is NoShowParty {
  return typeof value === 'string' && (NO_SHOW_PARTIES as readonly string[]).includes(value);
}

export interface StatusLabel {
  /** The server status, or null when it is unknown to this app version. */
  readonly status: BookingStatus | null;
  readonly key: MessageKey;
  readonly text: string;
  /** false → show the fallback and re-fetch the booking (partner.md G9). */
  readonly known: boolean;
}

function labelKey(
  audience: StatusAudience,
  status: BookingStatus,
  party: unknown,
): MessageKey | undefined {
  if (audience === 'customer') return CUSTOMER_KEYS[status];
  if (status === 'NO_SHOW') return isNoShowParty(party) ? PARTNER_NO_SHOW_KEYS[party] : undefined;
  return PARTNER_KEYS[status];
}

/**
 * Label for a server status code.
 * @param noShowParty the booking's `noShowParty` (needed by the Partner app for NO_SHOW).
 */
export function bookingStatusLabel(
  locale: Locale,
  audience: StatusAudience,
  status: unknown,
  noShowParty?: unknown,
): StatusLabel {
  const known = isBookingStatus(status) ? labelKey(audience, status, noShowParty) : undefined;
  if (known === undefined || !isBookingStatus(status)) {
    return {
      status: null,
      key: 'status.unknown',
      text: translate(locale, 'status.unknown'),
      known: false,
    };
  }
  return { status, key: known, text: messageTemplate(locale, known), known: true };
}

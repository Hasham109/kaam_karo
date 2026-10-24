/**
 * `status.*` — booking status labels (BP §15; ARCH §6.1; A11Y-003; QA F-01).
 * Customer wording: docs/screens/customer.md §2.8. Provider wording: docs/screens/partner.md G9.
 * Status chips always show this text (and an icon), never colour alone (A11Y-003).
 *
 * Changes from the drafts (A14 review, T1.4):
 *  - G9 No-show: the draft "حاضر نہیں ہوا — {party}" did not agree with "آپ" (the provider
 *    themself). One key per party now carries a full, grammatical sentence:
 *    PROVIDER → "آپ حاضر نہیں ہوئے", CUSTOMER → "گاہک حاضر نہیں ہوا".
 *  - Partner Draft: providers never receive Draft bookings (G9), so there is no partner label;
 *    the unknown-status fallback is shown if one ever arrives.
 *  - `status.unknown` (G9): shown for any status code this app version does not know.
 */
export const STATUS_EN = {
  'status.unknown': 'Status: updating',
  // Customer app (customer.md §2.8)
  'status.customer.draft': 'Draft',
  'status.customer.requested': 'Request sent',
  'status.customer.quotePending': 'Waiting for price',
  'status.customer.quoted': 'Price received',
  'status.customer.accepted': 'Accepted',
  'status.customer.scheduled': 'Scheduled',
  'status.customer.providerEnRoute': 'Provider on the way',
  'status.customer.arrived': 'Provider has arrived',
  'status.customer.inProgress': 'Work in progress',
  'status.customer.awaitingApproval': 'Your approval needed',
  'status.customer.completed': 'Completed',
  'status.customer.disputed': 'Issue under review',
  'status.customer.cancelled': 'Cancelled',
  'status.customer.expired': 'Expired',
  'status.customer.closed': 'Closed',
  'status.customer.rejected': 'Not accepted',
  'status.customer.noShow': 'No-show',
  // Partner app (partner.md G9, provider wording)
  'status.partner.requested': 'New request',
  'status.partner.quotePending': 'Price needed',
  'status.partner.quoted': 'Quote sent',
  'status.partner.accepted': 'Accepted',
  'status.partner.scheduled': 'Scheduled',
  'status.partner.providerEnRoute': 'On the way',
  'status.partner.arrived': 'Arrived',
  'status.partner.inProgress': 'Work in progress',
  'status.partner.awaitingApproval': 'Waiting for customer approval',
  'status.partner.completed': 'Completed',
  'status.partner.disputed': 'Issue under review',
  'status.partner.cancelled': 'Cancelled',
  'status.partner.expired': 'Expired',
  'status.partner.closed': 'Closed',
  'status.partner.rejected': 'Declined',
  'status.partner.noShow.customer': 'No-show — customer',
  'status.partner.noShow.provider': 'No-show — you',
} as const satisfies Readonly<Record<`status.${string}`, string>>;

export const STATUS_UR: Readonly<Record<keyof typeof STATUS_EN, string>> = {
  'status.unknown': 'اسٹیٹس اپ ڈیٹ ہو رہا ہے',
  'status.customer.draft': 'مسودہ',
  'status.customer.requested': 'درخواست بھیج دی گئی',
  'status.customer.quotePending': 'قیمت کا انتظار',
  'status.customer.quoted': 'قیمت موصول ہو گئی',
  'status.customer.accepted': 'قبول ہو گئی',
  'status.customer.scheduled': 'وقت طے ہو گیا',
  'status.customer.providerEnRoute': 'کاریگر راستے میں ہے',
  'status.customer.arrived': 'کاریگر پہنچ گیا ہے',
  'status.customer.inProgress': 'کام جاری ہے',
  'status.customer.awaitingApproval': 'آپ کی منظوری درکار ہے',
  'status.customer.completed': 'کام مکمل ہو گیا',
  'status.customer.disputed': 'شکایت زیرِ غور ہے',
  'status.customer.cancelled': 'منسوخ',
  'status.customer.expired': 'میعاد ختم',
  'status.customer.closed': 'بند',
  'status.customer.rejected': 'قبول نہیں ہوئی',
  'status.customer.noShow': 'حاضر نہیں ہوا',
  'status.partner.requested': 'نئی درخواست',
  'status.partner.quotePending': 'قیمت درکار ہے',
  'status.partner.quoted': 'کوٹیشن بھیج دی گئی',
  'status.partner.accepted': 'قبول ہو گئی',
  'status.partner.scheduled': 'وقت طے ہو گیا',
  'status.partner.providerEnRoute': 'راستے میں',
  'status.partner.arrived': 'پہنچ گئے',
  'status.partner.inProgress': 'کام جاری ہے',
  'status.partner.awaitingApproval': 'گاہک کی منظوری کا انتظار',
  'status.partner.completed': 'کام مکمل ہو گیا',
  'status.partner.disputed': 'شکایت زیرِ غور ہے',
  'status.partner.cancelled': 'منسوخ',
  'status.partner.expired': 'میعاد ختم',
  'status.partner.closed': 'بند',
  'status.partner.rejected': 'انکار کر دیا گیا',
  'status.partner.noShow.customer': 'گاہک حاضر نہیں ہوا',
  'status.partner.noShow.provider': 'آپ حاضر نہیں ہوئے',
};

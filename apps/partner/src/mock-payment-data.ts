/**
 * Partner Payment Mock Data & Types (Task T6.4; BP §13 P15, P16; D-016, D-020, D-021; SEC-REVIEW #2).
 */
import type { PayoutMethodItem } from './types';

export interface LedgerJobBreakdown {
  billPkr: number;
  labourPkr: number;
  commissionPkr: number;
  sharePkr: number;
}

export interface LedgerEntryItem {
  id: string;
  entryType:
    'COMMISSION_DEBIT' | 'JOB_CREDIT' | 'COMPANY_PAYMENT_CREDIT' | 'SETTLEMENT' | 'REVERSAL';
  amountMinor: number;
  direction: 'CREDIT' | 'DEBIT';
  reason: string;
  createdAt: string;
  bookingRef?: string;
  jobBreakdown?: LedgerJobBreakdown;
  settlementStatus?: 'PROCESSING' | 'SETTLED';
}

export interface CommissionSubmissionItem {
  id: string;
  amountMinor: number;
  transactionRef: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  decisionReason?: string;
}

export interface UnrecordedBillingJob {
  bookingId: string;
  bookingRef: string;
  serviceTitle: string;
  amountPkr: number;
}

export const INITIAL_LEDGER_ENTRIES: LedgerEntryItem[] = [
  {
    id: 'entry-001',
    entryType: 'COMMISSION_DEBIT',
    amountMinor: 60000, // Rs. 600
    direction: 'DEBIT',
    reason: 'Platform commission deduction for Cash Booking #BK-78912',
    createdAt: '2026-10-25 12:00 PKT',
    bookingRef: 'BK-78912',
    jobBreakdown: {
      billPkr: 2000,
      labourPkr: 2000,
      commissionPkr: 600,
      sharePkr: 1400,
    },
  },
  {
    id: 'entry-002',
    entryType: 'JOB_CREDIT',
    amountMinor: 320000, // Rs. 3,200
    direction: 'CREDIT',
    reason: 'Digital earnings credit for Booking #BK-78401',
    createdAt: '2026-10-24 16:30 PKT',
    bookingRef: 'BK-78401',
    jobBreakdown: {
      billPkr: 4000,
      labourPkr: 4000,
      commissionPkr: 800,
      sharePkr: 3200,
    },
  },
  {
    id: 'entry-003',
    entryType: 'SETTLEMENT',
    amountMinor: 320000,
    direction: 'DEBIT',
    reason: 'Weekly bank payout settlement #STL-9901',
    createdAt: '2026-10-24 18:00 PKT',
    settlementStatus: 'SETTLED',
  },
];

export const SEEDED_BANKS = [
  'Meezan Bank',
  'Habib Bank Limited (HBL)',
  'United Bank Limited (UBL)',
  'MCB Bank',
  'Bank Alfalah',
  'Faysal Bank',
  'Standard Chartered Bank',
];

export const SEEDED_WALLETS = ['JazzCash', 'EasyPaisa', 'NayaPay', 'SadaPay'];

export const INITIAL_PAYOUT_METHODS: PayoutMethodItem[] = [
  {
    id: 'pm-001',
    type: 'BANK_ACCOUNT',
    accountTitle: 'Muhammad Rashid',
    bankOrWalletName: 'Meezan Bank',
    maskedAccountNumber: 'PK36 MEZN •••• •••• 4401',
    status: 'VERIFIED',
    createdAt: '2026-10-20',
  },
];

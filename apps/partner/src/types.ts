/**
 * Partner App Canonical Types (Tasks T4.1, T4.2; BP §10, §13 P01–P07, P22, P23, §22, §59; D-002, D-004, D-018).
 */
export type ScreenId =
  | 'P01'
  | 'P02'
  | 'P03'
  | 'P04'
  | 'P05'
  | 'P06'
  | 'P07'
  | 'P08'
  | 'P09'
  | 'P10'
  | 'P12'
  | 'P13'
  | 'P14'
  | 'P15'
  | 'P16'
  | 'P17'
  | 'P20'
  | 'P22'
  | 'P23'
  | 'P24'
  | 'P25';

export type OnboardingMode = 'register' | 'login';

export type RegStep = 'phone' | 'otp' | 'profile';

export type ProviderType = 'SOLO' | 'TEAM';

export type VerificationLevel = 'BASIC' | 'VERIFIED' | 'BUSINESS_VERIFIED';

export type DocumentStatus =
  'NOT_UPLOADED' | 'UPLOADED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'NEEDS_ACTION';

export type DocumentType = 'CNIC_FRONT' | 'CNIC_BACK' | 'TRADE_CERT' | 'BUSINESS_REG';

export type DocumentTitleKey =
  | 'partner.p03.docCnicFront'
  | 'partner.p03.docCnicBack'
  | 'partner.p03.docTradeCert'
  | 'partner.p03.docBusinessReg';

export interface DocumentItem {
  id: DocumentType;
  titleKey: DocumentTitleKey;
  status: DocumentStatus;
  fileName?: string | undefined;
  fileSizeMb?: number | undefined;
  uploadedAt?: string | undefined;
  reviewerNote?: string | undefined;
  required: boolean;
}

export interface PartnerProfile {
  id: string;
  phone: string;
  fullName: string;
  providerType: ProviderType;
  businessName?: string | undefined;
  teamSize?: number | undefined;
  city: string;
  email?: string | undefined;
  verificationLevel: VerificationLevel;
  verificationSubmitted: boolean;
}

export type ScreenStateMode = 'loading' | 'empty' | 'success' | 'error' | 'pending';

// --- P05 Service Setup Types ---
export type PriceModel = 'FIXED' | 'FROM' | 'INSPECTION_QUOTE';

export type SellingMode = 'INSTANT' | 'CHOOSE_SUPPLIER' | 'REQUEST_QUOTES';

export interface ProviderServiceItem {
  id: string;
  categoryId: string;
  categoryName: string;
  serviceId: string;
  serviceName: string;
  priceModel: PriceModel;
  sellingModes: SellingMode[];
  pricingUnit: string;
  fixedPricePkr?: number | undefined;
  startingPricePkr?: number | undefined;
  visitFeePkr?: number | undefined;
  inspectionFeePkr?: number | undefined;
  inspectionDeductible?: boolean | undefined;
  verificationNeeded: VerificationLevel;
  published: boolean;
}

// --- P06 Availability Types ---
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BreakTime {
  start: string;
  end: string;
}

export interface WeeklyDaySchedule {
  dayOfWeek: DayOfWeek;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  breaks: BreakTime[];
  isEmergency: boolean;
}

export interface WeeklySchedule {
  days: WeeklyDaySchedule[];
  maxActiveJobs?: number | undefined;
}

// --- P07 Service Area Types ---
export interface ServiceAreaCenter {
  name: string;
  latitude: number;
  longitude: number;
}

export interface ServiceAreaConfig {
  center: ServiceAreaCenter;
  radiusKm: number;
  selectedZones: string[];
}

// --- P22 Live Status Types ---
export type LiveStatus =
  'ONLINE_AVAILABLE' | 'BUSY' | 'OFFLINE' | 'SCHEDULED_ONLY' | 'EMERGENCY_AVAILABLE';

// --- P23 Date-specific Overrides Types ---
export type OverrideKind = 'OPEN' | 'CLOSED' | 'LIMITED' | 'FULLY_BOOKED' | 'SPECIAL_HOURS';

export interface DateOverrideItem {
  id: string;
  date: string;
  overrideKind: OverrideKind;
  startTime?: string | undefined;
  endTime?: string | undefined;
  limitedMaxJobs?: number | undefined;
  isEmergency?: boolean | undefined;
}

// --- P08 / P09 / P10 / P25 Job Request & Media Types (Task T4.3; BP §13 P08..P10, P25; BP §85, §62.2, §76.1) ---
export type CommercialModel = 'INSTANT' | 'CHOOSE_SUPPLIER' | 'REQUEST_QUOTES';

export interface JobMediaItem {
  type: 'voice' | 'video' | 'photo';
  url: string;
  thumbnailUrl?: string | undefined;
  durationSeconds?: number | undefined;
  transcriptText?: string | undefined;
}

export interface IncomingJobRequest {
  id: string;
  bookingId: string;
  status: 'REQUESTED' | 'QUOTE_PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  serviceName: string;
  shortSummary: string;
  areaName: string;
  distanceKm: number;
  commercialModel: CommercialModel;
  priceType: 'FIXED' | 'FROM' | 'INSPECTION_QUOTE';
  pricePkr: number;
  timeWindow: string;
  expiresInMinutes?: number | undefined;
  media: JobMediaItem[];
  crewSize?: number | undefined;
  responsibleName?: string | undefined;
  // Pre-match: matchedAddress, customerPhone, and customerName are STRICTLY undefined (BP §52.2, PROF-ADDR-004)
  matchedAddress?: string | undefined;
  customerPhone?: string | undefined;
  customerName?: string | undefined;
}

// --- P24 Structured Quote Builder Types (Task T4.4; BP §18, §58; BP §13 P24; D-004, D-018) ---
export type QuoteLineType =
  | 'VISIT_CALLOUT'
  | 'INSPECTION_DIAGNOSIS'
  | 'LABOUR_SERVICE'
  | 'TOOLS_EQUIPMENT'
  | 'CONSUMABLES'
  | 'PARTS_MATERIALS'
  | 'EMERGENCY_AFTER_HOURS'
  | 'TRAVEL_DISTANCE'
  | 'DISCOUNT';

export type MaterialsClass = 'INCLUDED' | 'NOT_INCLUDED' | 'EXTRA_NEEDS_APPROVAL';

export interface QuoteLineItem {
  id: string;
  lineType: QuoteLineType;
  description: string;
  quantity: number;
  unit?: string | undefined;
  amountPkr: number;
  toolsReason?: string | undefined;
  isDeductible?: boolean | undefined;
  materialsClass?: MaterialsClass | undefined;
}

export interface QuoteDraft {
  bookingId: string;
  lines: QuoteLineItem[];
  validUntil: string;
  inclusions: string;
  exclusions: string;
  expectedDurationHours: number;
  crewSize: number;
  noteToCustomer?: string | undefined;
}

export interface QuoteTotals {
  subtotalPkr: number;
  taxPkr: number;
  totalCustomerPkr: number;
  commissionPkr: number;
  providerSharePkr: number;
}

// --- P12 / P13 / P14 Job Execution, Extras & Completion Types (Task T4.5; BP §13 P12..P14, BP §57.4, §81, §58.1..2; FARE-003..012; D-003, D-006, D-016, D-030) ---
export type ExecutionStatus =
  | 'SCHEDULED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'AWAITING_APPROVAL'
  | 'CANCELLED'
  | 'DISPUTED';

export type ExtraLineType =
  | 'LABOUR_SERVICE'
  | 'TOOLS_EQUIPMENT'
  | 'CONSUMABLES'
  | 'PARTS_MATERIALS'
  | 'EMERGENCY_AFTER_HOURS'
  | 'TRAVEL_DISTANCE'
  | 'DISCOUNT';

export type ExtraLineStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'FINAL';

export interface ProposedExtraLine {
  id: string;
  lineType: ExtraLineType;
  description: string;
  quantity?: number | undefined;
  unit?: string | undefined;
  amountPkr: number;
  toolsReason?: string | undefined;
  materialsClass?: MaterialsClass | undefined;
  status: ExtraLineStatus;
  createdAt: string;
}

export type PaymentMethodChoice = 'CASH' | 'DIGITAL';

export type DigitalPaymentStatus = 'WAITING' | 'PAID' | 'NOT_RECEIVED';

export interface CompletionEvidence {
  workNotes: string;
  photos: string[];
  customerSignature?: string | undefined;
  completionCode?: string | undefined;
  paymentMethod?: PaymentMethodChoice | undefined;
  digitalStatus?: DigitalPaymentStatus | undefined;
  cashCommissionDebited?: number | undefined;
  completedAt?: string | undefined;
}

export interface FinalBillTotals {
  customerTotalPkr: number;
  labourPkr: number;
  materialsPkr: number;
  taxPkr: number;
  commissionPkr: number;
  providerSharePkr: number;
  commissionRatePct: number;
}

export type PayoutMethodType = 'BANK_ACCOUNT' | 'MOBILE_WALLET';
export type PayoutMethodStatus = 'NOT_CHECKED' | 'VERIFIED' | 'FAILED';

export interface PayoutMethodItem {
  id: string;
  type: PayoutMethodType;
  accountTitle: string;
  bankOrWalletName: string;
  maskedAccountNumber: string;
  status: PayoutMethodStatus;
  createdAt: string;
}

export interface PartnerSupportCaseUpdate {
  id: string;
  authorRole: 'CUSTOMER' | 'PROVIDER' | 'SUPPORT' | 'SYSTEM';
  message: string;
  createdAt: string;
}

export interface PartnerSupportCase {
  id: string;
  caseNumber: string;
  category: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  level: number;
  bookingId?: string | undefined;
  createdAt: string;
  updates: PartnerSupportCaseUpdate[];
}

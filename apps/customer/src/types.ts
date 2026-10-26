/**
 * Customer App Core Types (T3.8; BP §12, ARCH §3.1, docs/screens/customer.md).
 * Screens: C01-C11 + C41.
 */
import type { BookingStatus, Locale, MessageKey } from '@kaamkaro/i18n';

export type ScreenId =
  | 'C01' // Splash / App start
  | 'C02' // Welcome
  | 'C03' // Login
  | 'C04' // Register
  | 'C05' // OTP Verification
  | 'C06' // Home
  | 'C07' // Search
  | 'C08' // Search Results
  | 'C09' // Category
  | 'C10' // Service Detail
  | 'C11' // Provider Profile
  | 'C12' // Request / Booking (Simple Form)
  | 'C13' // Quote Details
  | 'C14' // Booking Review
  | 'C15' // Booking Confirmation
  | 'C16' // Payment (D-003, D-008, D-030)
  | 'C17' // Booking Tracking
  | 'C18' // Chat / Contact (BP §12, §20; CHAT-001..004)
  | 'C19' // Job in Progress (On-site)
  | 'C20' // Job Completion & Payment
  | 'C24' // Payment Receipts & Transaction History
  | 'C31' // "What do you need?" Conversational Composer
  | 'C32' // Audio Note Recorder
  | 'C33' // Problem Video Recorder
  | 'C34' // Request Summary Confirmation
  | 'C35' // Supplier Match Results
  | 'C36' // Multi-supplier Offers Comparison
  | 'C37' // Extra-Charge Approval Sheet & Dispute
  | 'C38' // Voice Assistant Overlay (VOICE-001..008, BP §77)
  | 'C39' // Location Confirm
  | 'C40' // No-supply / Supply-gap Screen
  | 'C41'; // Language Selection

export type ScreenState = 'L' | 'E' | 'S' | 'X' | 'P';

export type OtpMode = 'login' | 'changeNumberCurrent' | 'changeNumberNew' | 'delete';

export interface ScreenParams {
  C01?: Record<string, never> | undefined;
  C02?: Record<string, never> | undefined;
  C03?: { returnTo?: ScreenId | undefined } | undefined;
  C04?: { phone: string } | undefined;
  C05?:
    | {
        phone: string;
        mode?: OtpMode | undefined;
        isNewUser?: boolean | undefined;
        returnTo?: ScreenId | undefined;
      }
    | undefined;
  C06?: Record<string, never> | undefined;
  C07?: { initialQuery?: string | undefined } | undefined;
  C08?: { query: string; categoryId?: string | undefined } | undefined;
  C09?: { categoryId: string } | undefined;
  C10?: { serviceId: string } | undefined;
  C11?: { providerId: string } | undefined;
  C12?:
    | {
        serviceId?: string | undefined;
        providerId?: string | undefined;
        returnTo?: ScreenId | undefined;
      }
    | undefined;
  C13?:
    | { quoteId: string; bookingId?: string | undefined; returnTo?: ScreenId | undefined }
    | undefined;
  C14?:
    | {
        bookingId?: string | undefined;
        providerId?: string | undefined;
        serviceId?: string | undefined;
        returnTo?: ScreenId | undefined;
      }
    | undefined;
  C15?:
    | { bookingId: string; status?: BookingStatus | undefined; returnTo?: ScreenId | undefined }
    | undefined;
  C16?: { bookingId?: string | undefined; returnTo?: ScreenId | undefined } | undefined;
  C17?: { bookingId?: string | undefined; returnTo?: ScreenId | undefined } | undefined;
  C18?: { bookingId?: string | undefined; returnTo?: ScreenId | undefined } | undefined;
  C19?: { bookingId?: string | undefined; returnTo?: ScreenId | undefined } | undefined;
  C20?: { bookingId?: string | undefined; returnTo?: ScreenId | undefined } | undefined;
  C24?: { bookingId?: string | undefined; returnTo?: ScreenId | undefined } | undefined;
  C37?:
    | {
        bookingId?: string | undefined;
        initialTab?: 'charges' | 'dispute' | 'crew' | undefined;
        returnTo?: ScreenId | undefined;
      }
    | undefined;
  C31?:
    | {
        initialText?: string | undefined;
        serviceHint?: string | undefined;
        returnTo?: ScreenId | undefined;
      }
    | undefined;
  C32?: { returnTo?: ScreenId | undefined } | undefined;
  C33?: { returnTo?: ScreenId | undefined } | undefined;
  C34?: { returnTo?: ScreenId | undefined } | undefined;
  C35?:
    | {
        requestId?: string | undefined;
        serviceId?: string | undefined;
        returnTo?: ScreenId | undefined;
      }
    | undefined;
  C36?:
    | {
        bookingId?: string | undefined;
        requestId?: string | undefined;
        returnTo?: ScreenId | undefined;
      }
    | undefined;
  C38?:
    | {
        initialQuery?: string | undefined;
        returnTo?: ScreenId | undefined;
      }
    | undefined;
  C39?: { returnTo?: ScreenId | undefined } | undefined;
  C40?:
    | {
        reasonCode?: 'NONE_AT_TIME' | 'NONE_NEARBY' | 'NO_SUPPLY_GENERAL' | undefined;
        returnTo?: ScreenId | undefined;
      }
    | undefined;
  C41?: { returnTo?: ScreenId | undefined; isOnboarding?: boolean | undefined } | undefined;
}

export interface CustomerUser {
  readonly id: string;
  readonly phone: string;
  readonly name: string;
  readonly city: string;
  readonly area?: string | undefined;
}

export interface CityOption {
  readonly id: string;
  readonly nameEn: string;
  readonly nameUr: string;
  readonly isActive: boolean;
}

export interface CategoryItem {
  readonly id: string;
  readonly nameEn: string;
  readonly nameUr: string;
  readonly icon: string;
  readonly isActive: boolean;
  readonly subcategoriesEn: readonly string[];
  readonly subcategoriesUr: readonly string[];
}

export type PriceModel = 'FIXED' | 'FROM' | 'INSPECTION_QUOTE';
export type MaterialsPolicy = 'INCLUDED' | 'CUSTOMER_PROVIDED' | 'CHARGED_SEPARATELY';

export interface ServiceReview {
  readonly id: string;
  readonly authorName: string;
  readonly rating: number;
  readonly commentEn: string;
  readonly commentUr: string;
  readonly date: string;
}

export interface ServiceItem {
  readonly id: string;
  readonly categoryId: string;
  readonly titleEn: string;
  readonly titleUr: string;
  readonly descriptionEn: string;
  readonly descriptionUr: string;
  readonly priceModel: PriceModel;
  readonly basePricePkr?: number;
  readonly unitEn?: string;
  readonly unitUr?: string;
  readonly visitChargePkr?: number;
  readonly inspectionFeePkr?: number;
  readonly inspectionDeductible?: boolean;
  readonly isEmergencyAvailable?: boolean;
  readonly includedEn: readonly string[];
  readonly includedUr: readonly string[];
  readonly notIncludedEn: readonly string[];
  readonly notIncludedUr: readonly string[];
  readonly durationEn: string;
  readonly durationUr: string;
  readonly hoursEn: string;
  readonly hoursUr: string;
  readonly materialsPolicy: MaterialsPolicy;
  readonly warrantyEn?: string;
  readonly warrantyUr?: string;
  readonly infoNeededEn?: string;
  readonly infoNeededUr?: string;
  readonly isFeatured?: boolean;
  readonly isPopular?: boolean;
  readonly rating: number;
  readonly reviewCount: number;
  readonly reviews: readonly ServiceReview[];
}

export type VerificationLevel = 'BASIC' | 'VERIFIED' | 'BUSINESS_VERIFIED';

export interface ProviderBadge {
  readonly id: string;
  readonly nameEn: string;
  readonly nameUr: string;
  readonly descriptionEn: string;
  readonly descriptionUr: string;
}

export interface ProviderItem {
  readonly id: string;
  readonly name: string;
  readonly teamLeaderName: string;
  readonly verificationLevel: VerificationLevel;
  readonly badges: readonly ProviderBadge[];
  readonly rating: number;
  readonly reviewCount: number;
  readonly completedJobsCount: number;
  readonly serviceAreas: readonly string[];
  readonly serviceIds: readonly string[];
  readonly teamSize?: number;
  readonly bioEn: string;
  readonly bioUr: string;
  readonly reviews: readonly ServiceReview[];
}

export interface ActiveBooking {
  readonly id: string;
  readonly serviceTitleEn: string;
  readonly serviceTitleUr: string;
  readonly providerName: string;
  readonly status: BookingStatus;
  readonly scheduledTime: string;
}

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

export type ExtraLineStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED';

export type CustomerMaterialsClass = 'INCLUDED' | 'CUSTOMER_PROVIDED' | 'CHARGED_SEPARATELY';

export interface ProposedExtraChargeItem {
  readonly id: string;
  readonly lineType: ExtraLineType;
  readonly description: string;
  readonly quantity?: number | undefined;
  readonly unit?: string | undefined;
  readonly amountPkr: number;
  readonly toolsReason?: string | undefined;
  readonly materialsClass?: CustomerMaterialsClass | undefined;
  readonly status: ExtraLineStatus;
}

export interface TrackingJobEvent {
  readonly id: string;
  readonly status: string;
  readonly labelEn: string;
  readonly labelUr: string;
  readonly timestamp: string;
  readonly isCompleted: boolean;
}

export interface CustomerTrackingBooking {
  readonly id: string;
  readonly bookingNumber: string;
  readonly serviceTitleEn: string;
  readonly serviceTitleUr: string;
  readonly providerId: string;
  readonly providerName: string;
  readonly providerRating: number;
  readonly providerReviewCount: number;
  readonly isVerified: boolean;
  readonly crewSize: number;
  readonly status: ExecutionStatus;
  readonly scheduledTime: string;
  readonly address: string;
  readonly etaMinutes?: number | undefined;
  readonly isEnRouteLiveTracking?: boolean | undefined;
  readonly pendingChargesCount?: number | undefined;
  readonly pendingCrewChange?: { readonly oldSize: number; readonly newSize: number } | undefined;
  readonly agreedPricePkr: number;
  readonly events: readonly TrackingJobEvent[];
}

export interface CustomerCompletionDetails {
  readonly bookingId: string;
  readonly providerNotes: string;
  readonly beforePhotos: readonly string[];
  readonly afterPhotos: readonly string[];
  readonly completionCode: string;
  readonly isCustomerConfirmed: boolean;
  readonly labourPkr: number;
  readonly extrasApprovedPkr: number;
  readonly taxPkr: number;
  readonly totalPayablePkr: number;
  readonly recordedPaymentMethod?: 'CASH' | 'DIGITAL' | undefined;
  readonly digitalPaymentStatus?: 'WAITING' | 'PAID' | 'NOT_RECEIVED' | undefined;
}

export interface CancellationDisputeSubmission {
  readonly bookingId: string;
  readonly reasonCode: string;
  readonly notes?: string | undefined;
  readonly isSafetyDispute: boolean;
}

export type WhenTimeChoice = 'NOW' | 'TODAY' | 'LATER';

export interface LocationSnapshot {
  readonly address: string;
  readonly city: string;
  readonly area?: string;
  readonly coordinates?: { readonly lat: number; readonly lng: number };
  readonly isConfirmed: boolean;
}

export interface AttachedPhoto {
  readonly id: string;
  readonly uri: string;
  readonly name?: string;
  readonly sizeBytes?: number;
}

export interface AttachedAudioNote {
  readonly id: string;
  readonly uri: string;
  readonly durationSeconds: number;
  readonly sizeBytes?: number;
}

export interface AttachedVideo {
  readonly id: string;
  readonly uri: string;
  readonly durationSeconds: number;
  readonly thumbnailUri?: string;
  readonly sizeBytes?: number;
}

export interface IntakeDraft {
  readonly draftId: string;
  readonly serviceId?: string | undefined;
  readonly providerId?: string | undefined;
  readonly description: string;
  readonly when: WhenTimeChoice;
  readonly scheduledDate?: string | undefined;
  readonly scheduledTimeWindow?: string | undefined;
  readonly location: LocationSnapshot | null;
  readonly photos: readonly AttachedPhoto[];
  readonly audioNote: AttachedAudioNote | null;
  readonly video: AttachedVideo | null;
  readonly preferences: readonly string[];
  readonly aiInterpretedServiceId?: string | undefined;
  readonly aiSummary?: string | undefined;
  readonly aiQuestions?:
    | readonly { readonly id: string; readonly question: string; readonly answer?: string }[]
    | undefined;
}

export interface MatchReason {
  readonly key: string;
  readonly en: string;
  readonly ur: string;
}

export interface MatchCandidateCard {
  readonly candidateId: string;
  readonly providerProfileId: string;
  readonly providerName: string;
  readonly businessName: string | null;
  readonly avatarMediaId: string | null;
  readonly verificationLevel: 'BASIC' | 'VERIFIED' | 'BUSINESS_VERIFIED';
  readonly distanceMeters: number | null;
  readonly etaSeconds: number | null;
  readonly ratingAverage: number | null;
  readonly ratingCount: number;
  readonly completedJobsCount: number;
  readonly isExactServiceMatch: boolean;
  readonly score: number;
  readonly rank: number;
  readonly badges: readonly string[];
  readonly matchReasons: readonly MatchReason[];
  readonly crewSize: number;
  readonly basePricePkr?: number;
  readonly priceModel: PriceModel;
}

export type FareLineType =
  | 'LABOR'
  | 'PARTS'
  | 'TOOLS'
  | 'TRANSPORT'
  | 'ADDITIONAL_SERVICE'
  | 'DISCOUNT'
  | 'EMERGENCY'
  | 'TAX';

export interface FareLineItem {
  readonly id: string;
  readonly lineType: FareLineType;
  readonly description: string;
  readonly amountPkr: number;
  readonly isDeductible?: boolean;
  readonly materialsClass?: 'INCLUDED' | 'CUSTOMER_PROVIDED' | 'CHARGED_SEPARATELY';
}

export type QuoteStatus = 'WAITING' | 'OFFERED' | 'DECLINED' | 'EXPIRED';

export interface QuoteOfferCard {
  readonly id: string;
  readonly bookingId: string;
  readonly providerProfileId: string;
  readonly providerName: string;
  readonly businessName: string | null;
  readonly avatarMediaId: string | null;
  readonly verificationLevel: 'BASIC' | 'VERIFIED' | 'BUSINESS_VERIFIED';
  readonly ratingAverage: number | null;
  readonly totalAmountPkr: number;
  readonly isEstimate: boolean;
  readonly crewSize: number;
  readonly validUntil: string;
  readonly status: QuoteStatus;
  readonly lines: readonly FareLineItem[];
  readonly inclusions?: string;
  readonly exclusions?: string;
  readonly expectedDurationMinutes?: number;
}

export interface ServerAllowedAction {
  readonly action: string;
  readonly targetStatus: BookingStatus;
  readonly labelEn: string;
  readonly labelUr: string;
  readonly requiresConfirmation?: boolean;
  readonly destructive?: boolean;
}

export interface BookingReviewData {
  readonly bookingId: string;
  readonly bookingNumber: string;
  readonly serviceId: string;
  readonly serviceName: string;
  readonly providerProfileId: string;
  readonly providerName: string;
  readonly businessName: string | null;
  readonly verificationLevel: 'BASIC' | 'VERIFIED' | 'BUSINESS_VERIFIED';
  readonly crewSize: number;
  readonly crewSizeConfirmed: boolean;
  readonly addressSnapshot: string;
  readonly scheduledAt: string;
  readonly priceLines: readonly FareLineItem[];
  readonly totalOrEstimatedPkr: number;
  readonly isEstimate: boolean;
  readonly status: BookingStatus;
  readonly allowedNextActions: readonly ServerAllowedAction[];
}

export interface SupplyGapRecoveryOptionItem {
  readonly action:
    | 'BROADEN_RADIUS'
    | 'CHOOSE_ANOTHER_TIME'
    | 'REQUEST_CALLBACK'
    | 'JOIN_WAITLIST'
    | 'TRY_RELATED_SERVICE';
  readonly titleEn: string;
  readonly titleUr: string;
  readonly descriptionEn: string;
  readonly descriptionUr: string;
  readonly suggestedServiceId?: string;
}

export type SupplyGapReasonCode = 'NONE_AT_TIME' | 'NONE_NEARBY' | 'NO_SUPPLY_GENERAL';

export interface BookingConfirmationInfo {
  readonly bookingId: string;
  readonly bookingNumber: string;
  readonly status: 'REQUESTED' | 'QUOTE_PENDING' | 'ACCEPTED' | 'SCHEDULED';
  readonly providerName: string;
  readonly serviceName: string;
  readonly scheduledTime: string;
  readonly totalPkr: number;
  readonly crewSize: number;
  readonly address: string;
}

export type PermissionKind = 'location' | 'camera' | 'microphone';
export type PermissionStateValue = 'prompt' | 'granted' | 'denied';

export interface CustomerAppContextValue {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly currentScreen: ScreenId;
  readonly screenParams: ScreenParams[ScreenId];
  readonly navigate: <S extends ScreenId>(screen: S, params?: ScreenParams[S]) => void;
  readonly goBack: () => void;
  readonly user: CustomerUser | null;
  readonly isGuest: boolean;
  readonly setUser: (user: CustomerUser | null) => void;
  readonly setIsGuest: (isGuest: boolean) => void;
  readonly selectedCity: string;
  readonly setSelectedCity: (city: string) => void;
  readonly favorites: ReadonlySet<string>;
  readonly toggleFavorite: (providerId: string) => void;
  readonly isFavorite: (providerId: string) => boolean;
  readonly activeBooking: ActiveBooking | null;
  readonly recentSearches: readonly string[];
  readonly addRecentSearch: (query: string) => void;
  readonly clearRecentSearches: () => void;
  readonly draft: IntakeDraft;
  readonly updateDraft: (updates: Partial<IntakeDraft>) => void;
  readonly clearDraft: () => void;
  readonly permissionStatus: Record<PermissionKind, PermissionStateValue>;
  readonly setPermissionStatus: (kind: PermissionKind, state: PermissionStateValue) => void;
}

export type VoiceActionType =
  | 'SEARCH'
  | 'NAVIGATE'
  | 'DRAFT_UPDATE'
  | 'LOCATION_SET'
  | 'FILTER_PREFERENCE'
  | 'EXPLAIN'
  | 'SUPPORT'
  | 'PLACE_BOOKING'
  | 'ACCEPT_QUOTE'
  | 'PAY_BOOKING'
  | 'CANCEL_BOOKING'
  | 'SUBMIT_COMPLAINT'
  | 'UNDO'
  | 'UNSUPPORTED';

export interface ConsequentialConfirmationPrompt {
  readonly actionType:
    'PLACE_BOOKING' | 'ACCEPT_QUOTE' | 'PAY_BOOKING' | 'CANCEL_BOOKING' | 'SUBMIT_COMPLAINT';
  readonly titleKey: MessageKey;
  readonly messageKey: MessageKey;
  readonly params: Record<string, string | number>;
  readonly targetScreen?: ScreenId;
  readonly payload?: Record<string, unknown>;
}

export interface VoiceAssistantResult {
  readonly recognizedText: string;
  readonly intentType: VoiceActionType;
  readonly detectedLanguage: 'en' | 'ur';
  readonly explanationEn: string;
  readonly explanationUr: string;
  readonly targetScreen?: ScreenId;
  readonly requiresConfirmation: boolean;
  readonly confirmationPrompt?: ConsequentialConfirmationPrompt;
  readonly draftUpdates?: Partial<IntakeDraft>;
  readonly isUndoRevert?: boolean;
  readonly searchQuery?: string;
  readonly filterPreference?: string;
}

export interface CustomerPaymentDetails {
  bookingId: string;
  bookingRef: string;
  isJobCompleted: boolean;
  labourMinor: number;
  materialsMinor: number;
  taxMinor: number;
  totalMinor: number;
  status: 'NOT_PAID' | 'PROCESSING' | 'PAID' | 'FAILED';
  paidMethod?: 'CASH' | 'DIGITAL';
  paidAt?: string;
  gatewayRef?: string;
}

export interface CustomerReceiptItem {
  id: string;
  bookingId: string;
  bookingRef: string;
  serviceTitle: string;
  amountMinor: number;
  method: 'CASH' | 'DIGITAL';
  status: 'PAID' | 'FAILED' | 'REFUNDED' | 'PROCESSING';
  date: string;
  billLines: { titleKey: MessageKey; amountMinor: number }[];
  taxMinor: number;
  refund?: {
    amountMinor: number;
    date: string;
  };
}

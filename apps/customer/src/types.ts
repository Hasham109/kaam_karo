/**
 * Customer App Core Types (T3.8; BP §12, ARCH §3.1, docs/screens/customer.md).
 * Screens: C01-C11 + C41.
 */
import type { BookingStatus, Locale } from '@kaamkaro/i18n';

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
  | 'C41'; // Language Selection

export type ScreenState = 'L' | 'E' | 'S' | 'X' | 'P';

export type OtpMode = 'login' | 'changeNumberCurrent' | 'changeNumberNew' | 'delete';

export interface ScreenParams {
  C01?: Record<string, never>;
  C02?: Record<string, never>;
  C03?: { returnTo?: ScreenId };
  C04?: { phone: string };
  C05?: { phone: string; mode?: OtpMode; isNewUser?: boolean; returnTo?: ScreenId };
  C06?: Record<string, never>;
  C07?: { initialQuery?: string };
  C08?: { query: string; categoryId?: string };
  C09?: { categoryId: string };
  C10?: { serviceId: string };
  C11?: { providerId: string };
  C41?: { returnTo?: ScreenId; isOnboarding?: boolean };
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
}

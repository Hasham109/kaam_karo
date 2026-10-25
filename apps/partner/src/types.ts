/**
 * Partner App Canonical Types (Task T4.1; BP §10, §13 P01–P03, §22; D-002, D-004, D-018).
 */
export type ScreenId = 'P01' | 'P02' | 'P03' | 'P04';

export type OnboardingMode = 'register' | 'login';

export type RegStep = 'phone' | 'otp' | 'profile';

export type ProviderType = 'SOLO' | 'TEAM';

export type VerificationLevel = 'BASIC' | 'VERIFIED' | 'BUSINESS_VERIFIED';

export type DocumentStatus =
  | 'NOT_UPLOADED'
  | 'UPLOADED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'NEEDS_ACTION';

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

import type {
  AddressLabelKind,
  AppLanguage,
  LocationConfirmation,
  LocationSource,
} from '../../../generated/prisma/client.js';

export interface UpdateCustomerProfileDto {
  displayName?: string;
  email?: string;
  preferredLanguage?: AppLanguage;
}

export interface CreateAddressDto {
  labelKind: AddressLabelKind;
  customLabel?: string;
  cityId: string;
  areaName?: string;
  addressText: string;
  latitude?: number;
  longitude?: number;
  placeRef?: string;
}

export interface UpdateAddressDto {
  labelKind?: AddressLabelKind;
  customLabel?: string;
  areaName?: string;
  addressText?: string;
  latitude?: number;
  longitude?: number;
  placeRef?: string;
}

export interface AddFavoriteDto {
  providerProfileId: string;
  notes?: string;
}

export interface UpdateProviderProfileDto {
  businessName?: string;
  usualTeamSize?: number;
  photoMediaId?: string;
}

export interface CreateLocationSnapshotDto {
  sourceAddressId?: string;
  addressLabel?: string;
  addressText?: string;
  cityId?: string;
  areaName?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  placeRef?: string;
  source?: LocationSource;
  confirmationStatus?: LocationConfirmation;
}

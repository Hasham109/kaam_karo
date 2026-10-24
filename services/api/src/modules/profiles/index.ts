export { ProfilesModule } from './profiles.module';
export { CustomerProfileService } from './customer-profile.service';
export { AddressService, type AddressRecord } from './address.service';
export { LocationSnapshotService, type LocationSnapshotRecord } from './location-snapshot.service';
export { FavoriteService } from './favorite.service';
export { ProviderProfileService } from './provider-profile.service';
export type {
  UpdateCustomerProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
  AddFavoriteDto,
  UpdateProviderProfileDto,
  CreateLocationSnapshotDto,
} from './dto/profile.dto';

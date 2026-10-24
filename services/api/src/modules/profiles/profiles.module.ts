import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity';
import { CustomerProfileService } from './customer-profile.service';
import { AddressService } from './address.service';
import { LocationSnapshotService } from './location-snapshot.service';
import { FavoriteService } from './favorite.service';
import { ProviderProfileService } from './provider-profile.service';
import { CustomerProfileController } from './controllers/customer-profile.controller';
import { AddressController } from './controllers/address.controller';
import { FavoriteController } from './controllers/favorite.controller';
import { ProviderProfileController } from './controllers/provider-profile.controller';
import { LocationSnapshotController } from './controllers/location-snapshot.controller';

@Module({
  imports: [IdentityModule],
  controllers: [
    CustomerProfileController,
    AddressController,
    FavoriteController,
    ProviderProfileController,
    LocationSnapshotController,
  ],
  providers: [
    CustomerProfileService,
    AddressService,
    LocationSnapshotService,
    FavoriteService,
    ProviderProfileService,
  ],
  exports: [
    CustomerProfileService,
    AddressService,
    LocationSnapshotService,
    FavoriteService,
    ProviderProfileService,
  ],
})
export class ProfilesModule {}

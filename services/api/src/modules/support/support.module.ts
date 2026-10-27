import { Module } from '@nestjs/common';
import { PlatformModule } from '../../platform/platform.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import {
  AdminDisputesController,
  AdminSupportController,
  SupportController,
} from './support.controller.js';
import { SupportService } from './support.service.js';

@Module({
  imports: [PlatformModule, IdentityModule],
  controllers: [SupportController, AdminSupportController, AdminDisputesController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}

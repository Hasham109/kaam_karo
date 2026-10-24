/**
 * IntakeModule (T3.3, owner A07; ARCH §4 M7, §6.2, §10; BP §56, §66, §67, §77, §79).
 */

import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/index.js';
import { FakeIntakeAiClient, INTAKE_AI_CLIENT } from './intake-ai.client.js';
import { IntakeController } from './intake.controller.js';
import { IntakeService } from './intake.service.js';

@Module({
  imports: [CatalogModule],
  controllers: [IntakeController],
  providers: [
    IntakeService,
    FakeIntakeAiClient,
    {
      provide: INTAKE_AI_CLIENT,
      useClass: FakeIntakeAiClient,
    },
  ],
  exports: [IntakeService, INTAKE_AI_CLIENT],
})
export class IntakeModule {}

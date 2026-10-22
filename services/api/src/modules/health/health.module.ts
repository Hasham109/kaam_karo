import { Module } from '@nestjs/common';
import { SERVER_ENV } from '../../config/server-env.module';
import { HealthController } from './health.controller';
import { HEALTH_PROBES, HealthService, defaultHealthProbes } from './health.service';

/** REL-011: health module (owner A01). */
@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: HEALTH_PROBES, useFactory: defaultHealthProbes, inject: [SERVER_ENV] },
  ],
})
export class HealthModule {}

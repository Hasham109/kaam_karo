/**
 * GET /health — REL-011 (BP §31.2, §34). Contract: contracts/health.yaml (getHealth).
 * Public on purpose (uptime checks); returns no hostnames, secrets or error details.
 */
import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { HealthReport } from '@kaamkaro/platform';
import { HealthService } from './health.service';

const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;

interface StatusSettable {
  status(code: number): unknown;
}

@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get()
  async getHealth(@Res({ passthrough: true }) res: StatusSettable): Promise<HealthReport> {
    const report = await this.health.check();
    res.status(report.status === 'ok' ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE);
    return report;
  }
}

/**
 * RQ-008 item 5 (A01): fail closed at start-up when a security limit is not configured.
 * SEC-AUTH-004, SEC-BASE-006 (BP §27, §29, §30; SEC-REVIEW-T1.1-1.3 #1; SEC-REVIEW-T2.6 #1).
 * - staging / production: any missing fail-closed key (OTP / login / media limits) → the API
 *   refuses to start (FailClosedConfigError). Per-action checks stay with A02 (T2.4).
 * - development / test: logged as a warning; guarded actions still refuse per action.
 */
import { Inject, Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import {
  CONFIG_SERVICE,
  type ConfigService,
  type Logger,
  type ServerEnv,
  isDeployedEnv,
} from '@kaamkaro/platform';
import { FailClosedConfigError, assertFailClosedKeysSet } from '../modules/config';
import { APP_LOGGER } from '../platform';
import { SERVER_ENV } from './server-env.module';

@Injectable()
export class FailClosedStartupCheck implements OnApplicationBootstrap {
  constructor(
    @Inject(SERVER_ENV) private readonly env: ServerEnv,
    @Inject(CONFIG_SERVICE) private readonly config: ConfigService,
    @Inject(APP_LOGGER) private readonly logger: Logger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await assertFailClosedKeysSet(this.config);
    } catch (error) {
      if (isDeployedEnv(this.env.appEnv)) throw error;
      const keys = error instanceof FailClosedConfigError ? error.keys : [];
      this.logger.warn('security limits not configured; guarded actions are refused', {
        keys,
        err: error instanceof FailClosedConfigError ? undefined : error,
      });
    }
  }
}

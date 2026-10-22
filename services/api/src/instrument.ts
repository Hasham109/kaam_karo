/**
 * Process bootstrap: load env and start Sentry before anything else is imported.
 *
 * - SEC-BASE-011 / SEC-BASE-008 (BP §29, §34): env is validated once; secrets only from env.
 * - INFRA-005 (BP §34; D-001): Sentry starts only when SENTRY_DSN is set (required in
 *   staging/production, see loadServerEnv); otherwise no-op.
 * - SEC-BASE-002 (BP §29; permission-policy §7): options come only from `buildSentryOptions`,
 *   which switches off every data-collection source and scrubs events. Do not add options here.
 */
import * as Sentry from '@sentry/nestjs';
import { buildSentryOptions, loadServerEnv } from '@kaamkaro/platform';

export const serverEnv = loadServerEnv(process.env);

const sentryOptions = buildSentryOptions(serverEnv);
if (sentryOptions) {
  Sentry.init(sentryOptions);
}

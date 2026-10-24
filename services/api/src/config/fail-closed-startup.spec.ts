import { describe, expect, it, vi } from 'vitest';
import {
  CachedConfigService,
  type ConfigRuleVersion,
  type Logger,
  loadServerEnv,
} from '@kaamkaro/platform';
import { FAIL_CLOSED_KEYS } from '../modules/config';
import { FailClosedStartupCheck } from './fail-closed-startup';

function reader(values: Record<string, unknown>) {
  return new CachedConfigService(
    {
      listVersions: (key) =>
        Promise.resolve(
          key in values
            ? [
                {
                  id: key,
                  key,
                  scope: 'GLOBAL',
                  scopeRefId: null,
                  value: values[key] as ConfigRuleVersion['value'],
                  effectiveFrom: new Date(0),
                },
              ]
            : [],
        ),
    },
    { cacheTtlMs: 0 },
  );
}

const logger = (): Logger & { warn: ReturnType<typeof vi.fn> } => {
  const l = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => l };
  return l;
};

// RQ-008 item 5; SEC-AUTH-004, SEC-BASE-006 (BP §27, §29, §30; SEC-REVIEW-T2.6 #1).
describe('[SEC-AUTH-004] start-up refuses to run without security limits', () => {
  it('[SEC-AUTH-004] production with null OTP/login limits → start-up throws', async () => {
    const env = { ...loadServerEnv({ APP_ENV: 'test' }), appEnv: 'production' as const };
    const check = new FailClosedStartupCheck(env, reader({}), logger());
    await expect(check.onApplicationBootstrap()).rejects.toMatchObject({
      name: 'FailClosedConfigError',
    });
    expect(FAIL_CLOSED_KEYS.length).toBeGreaterThan(0);
  });

  it('[SEC-AUTH-004] development only warns (guarded actions still refuse per action)', async () => {
    const log = logger();
    const check = new FailClosedStartupCheck(
      loadServerEnv({ APP_ENV: 'development' }),
      reader({}),
      log,
    );
    await expect(check.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(log.warn).toHaveBeenCalledOnce();
  });
});

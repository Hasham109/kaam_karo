import type { ErrorEvent } from '@sentry/nestjs';
import { describe, expect, it } from 'vitest';
import { SENTRY_DATA_COLLECTION, buildSentryOptions, scrubSentryEvent } from './sentry';

const STAGING = {
  appEnv: 'staging' as const,
  sentryDsn: 'https://publickey@example.invalid/1',
  sentryTracesSampleRate: 0.1,
};

function leakyEvent(): ErrorEvent {
  return {
    type: undefined,
    request: {
      method: 'POST',
      url: 'https://api.example.invalid/auth/otp/verify?phone=03001234567',
      data: { phone: '03001234567', otp: '123456' },
      query_string: 'phone=03001234567',
      cookies: { session: 'secret-session' },
      env: { REMOTE_ADDR: '203.0.113.7' },
      headers: {
        Authorization: 'Bearer secret-token',
        Cookie: 'session=secret-session',
        'X-Forwarded-For': '203.0.113.7',
        'User-Agent': 'KaamKaro/0.0.0',
      },
    },
    user: {
      id: 'u-1',
      ip_address: '203.0.113.7',
      email: 'a@example.invalid',
      username: 'kk-username',
    },
    breadcrumbs: [{ category: 'http', data: { url: 'https://x.invalid/p?otp=123456' } }],
  };
}

describe('[INFRA-005] Sentry options', () => {
  it('[INFRA-005] is a no-op (null) when SENTRY_DSN is not set', () => {
    expect(
      buildSentryOptions({ appEnv: 'development', sentryDsn: null, sentryTracesSampleRate: 0 }),
    ).toBeNull();
  });

  it('[INFRA-005][SEC-BASE-011] uses the DSN from env and tags the environment', () => {
    expect(buildSentryOptions(STAGING)).toMatchObject({
      dsn: 'https://publickey@example.invalid/1',
      environment: 'staging',
      tracesSampleRate: 0.1,
    });
  });
});

describe('[SEC-BASE-002] Sentry never collects personal or secret data (permission-policy §7)', () => {
  it('[SEC-BASE-002] every SDK data-collection source is switched off explicitly', () => {
    const options = buildSentryOptions(STAGING);
    expect(options?.dataCollection).toEqual(SENTRY_DATA_COLLECTION);
    expect(SENTRY_DATA_COLLECTION).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    });
  });

  it('[SEC-BASE-002] beforeSend drops body, cookies, query, auth headers, IP and user details', async () => {
    const options = buildSentryOptions(STAGING);
    const scrubbed = await options?.beforeSend?.(leakyEvent(), {});
    expect(scrubbed).toEqual({
      type: undefined,
      request: {
        method: 'POST',
        url: 'https://api.example.invalid/auth/otp/verify',
        headers: { 'User-Agent': 'KaamKaro/0.0.0' },
      },
      user: { id: 'u-1' },
      breadcrumbs: [{ category: 'http', data: { url: 'https://x.invalid/p' } }],
    });
    expect(JSON.stringify(scrubbed)).not.toMatch(
      /03001234567|123456|secret|203\.0\.113\.7|kk-username/,
    );
  });

  it('[SEC-BASE-002] beforeSendTransaction scrubs the same way', async () => {
    const options = buildSentryOptions(STAGING);
    const transaction = { ...leakyEvent(), type: 'transaction' as const };
    const scrubbed = await options?.beforeSendTransaction?.(transaction, {});
    expect(JSON.stringify(scrubbed)).not.toMatch(/03001234567|123456|secret|203\.0\.113\.7/);
  });

  it('[SEC-BASE-002] an event without user id loses the whole user object', () => {
    const event = leakyEvent();
    event.user = { ip_address: '203.0.113.7' };
    expect(scrubSentryEvent(event).user).toBeUndefined();
  });
});

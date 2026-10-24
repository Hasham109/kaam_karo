/**
 * Sentry options builder (T2.1).
 *
 * INFRA-005 (BP §34, §31.2; D-001 Sentry): centralised error monitoring.
 * The DSN comes only from the environment (SEC-BASE-008). With no DSN, Sentry stays a no-op,
 * so local development and tests never send data anywhere (staging/production refuse to boot
 * without a DSN, see env.ts).
 *
 * SEC-BASE-002 / permission-policy §7 (BP §29; D-002): no OTP codes, session tokens, phone
 * numbers, request bodies, cookies, IP addresses or AI prompts may leave the API through
 * monitoring. SEC-REVIEW T2.1 finding 1: Sentry SDK 11 ignores `sendDefaultPii`; collection is
 * driven by `dataCollection`, whose defaults collect everything. So we (1) switch every
 * collection source off explicitly and (2) scrub every event in `beforeSend` /
 * `beforeSendTransaction` as a second line of defence. The options are typed against the SDK's
 * `NodeOptions` so a renamed/removed option fails typecheck.
 *
 * Type-only dependency on `@sentry/nestjs` (peer); the caller (services/api `instrument.ts`)
 * passes the returned options to `Sentry.init`.
 */
import type { Event, NodeOptions } from '@sentry/nestjs';
import type { AppEnv, ServerEnv } from './env';
import { maskFreeText, maskPii } from './pii/mask';

type DataCollection = NonNullable<NodeOptions['dataCollection']>;
type TransactionEvent = Parameters<NonNullable<NodeOptions['beforeSendTransaction']>>[0];

/** Deny-all data collection (SEC-REVIEW T2.1 finding 1). Every SDK source is switched off. */
export const SENTRY_DATA_COLLECTION = {
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
} satisfies DataCollection;

/** The only request headers that may reach Sentry (lower-case). Never auth, cookies or IPs. */
export const SENTRY_ALLOWED_REQUEST_HEADERS: readonly string[] = ['user-agent'];

function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/**
 * Removes personal and secret data from an event (mutates and returns it): request body,
 * cookies, query string, env, all headers except the allow-list, and every user field except
 * the internal `id`. URLs lose their query string (breadcrumbs included).
 */
export function scrubSentryEvent<T extends Event>(event: T): T {
  const request = event.request;
  if (request) {
    const headers = Object.fromEntries(
      Object.entries(request.headers ?? {}).filter(([name]) =>
        SENTRY_ALLOWED_REQUEST_HEADERS.includes(name.toLowerCase()),
      ),
    );
    event.request = {
      ...(request.method !== undefined ? { method: request.method } : {}),
      ...(request.url !== undefined ? { url: stripQuery(request.url) } : {}),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    };
  }
  if (event.user) {
    if (event.user.id !== undefined) event.user = { id: event.user.id };
    else delete event.user;
  }
  for (const crumb of event.breadcrumbs ?? []) {
    const url = crumb.data?.['url'];
    if (crumb.data && typeof url === 'string') crumb.data['url'] = stripQuery(url);
    if (typeof crumb.message === 'string') crumb.message = maskFreeText(crumb.message);
    if (crumb.data) crumb.data = maskPii(crumb.data) as Record<string, unknown>;
  }
  // SEC-REVIEW-T2.2 #6 (BP §29; SEC-BASE-002): exception text and messages can carry phones,
  // OTP URLs or driver errors with key values — mask them like the logs.
  if (typeof event.message === 'string') event.message = maskFreeText(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (typeof ex.value === 'string') ex.value = maskFreeText(ex.value);
  }
  delete event.extra;
  if (event.contexts) {
    const kept: NonNullable<Event['contexts']> = {};
    for (const name of SENTRY_ALLOWED_CONTEXTS) {
      const ctx = event.contexts[name];
      if (ctx) kept[name] = ctx;
    }
    event.contexts = kept;
  }
  return event;
}

/** Only runtime facts may reach Sentry; every other context is dropped (SEC-REVIEW-T2.2 #6). */
export const SENTRY_ALLOWED_CONTEXTS: readonly string[] = ['runtime', 'os', 'trace'];

export type SentryOptions = NodeOptions & {
  readonly dsn: string;
  /** Each environment reports separately (SEC-BASE-011). */
  readonly environment: AppEnv;
};

/** Returns Sentry init options, or `null` when no DSN is configured (no-op). */
export function buildSentryOptions(
  env: Pick<ServerEnv, 'appEnv' | 'sentryDsn' | 'sentryTracesSampleRate'>,
): SentryOptions | null {
  if (!env.sentryDsn) return null;
  const options = {
    dsn: env.sentryDsn,
    environment: env.appEnv,
    tracesSampleRate: env.sentryTracesSampleRate,
    dataCollection: SENTRY_DATA_COLLECTION,
    beforeSend: (event: Parameters<NonNullable<NodeOptions['beforeSend']>>[0]) =>
      scrubSentryEvent(event),
    beforeSendTransaction: (event: TransactionEvent) => scrubSentryEvent(event),
  } satisfies NodeOptions;
  return options;
}

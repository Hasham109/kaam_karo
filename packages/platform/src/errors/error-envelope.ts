/**
 * One JSON error shape for every API response (T2.2; ARCH §8 rules 4, 6, 9; BP §29, §31.1).
 * Contract: contracts/common.yaml `ErrorEnvelope`.
 *
 * - REL-001 (BP §31.1): the client always gets a stable `code` it can map to an en/ur message
 *   (no user-facing text is produced here; the apps translate codes through packages/i18n).
 * - REL-002 / REL-006: `retryable` tells the client whether the SAME request may be re-sent safely.
 * - SEC-BASE-005 (BP §29): validation failures are 422 `VALIDATION_FAILED`.
 * - No internals leak (BP §29): unknown errors become `INTERNAL_ERROR` with a generic message; stack
 *   traces, SQL, hostnames and exception messages are never put in the envelope.
 *
 * Module-specific codes (e.g. `TRANSITION_NOT_ALLOWED`, `QUOTE_EXPIRED`) are declared by the owning
 * module in its own contract and thrown as `new AppError(code, status, …)`.
 */
import { maskFreeText } from '../pii/mask';

export interface ErrorDetail {
  /** JSON pointer / field path, e.g. `/body/serviceId`. */
  readonly field?: string;
  /** Stable machine reason, e.g. `required`, `invalid_format`. */
  readonly issue: string;
}

export interface ErrorEnvelope {
  readonly error: {
    readonly code: string;
    /** Developer-facing English text; never shown to users as-is (apps translate `code`). */
    readonly message: string;
    readonly requestId: string | null;
    readonly retryable: boolean;
    readonly details?: readonly ErrorDetail[];
  };
}

/** Platform-wide codes. HTTP status and retry hint are fixed per code. */
export const PLATFORM_ERRORS = {
  BAD_REQUEST: { status: 400, retryable: false, message: 'The request is malformed.' },
  UNAUTHENTICATED: { status: 401, retryable: false, message: 'Authentication is required.' },
  FORBIDDEN: { status: 403, retryable: false, message: 'This action is not allowed.' },
  NOT_FOUND: { status: 404, retryable: false, message: 'The resource was not found.' },
  METHOD_NOT_ALLOWED: { status: 405, retryable: false, message: 'Method not allowed.' },
  CONFLICT: {
    status: 409,
    retryable: false,
    message: 'The request conflicts with the current state.',
  },
  PAYLOAD_TOO_LARGE: { status: 413, retryable: false, message: 'The request body is too large.' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, retryable: false, message: 'Unsupported content type.' },
  VALIDATION_FAILED: { status: 422, retryable: false, message: 'The request is invalid.' },
  /** REL-008: a protected operation was called without an Idempotency-Key header. */
  IDEMPOTENCY_KEY_REQUIRED: {
    status: 428,
    retryable: false,
    message: 'An Idempotency-Key header is required for this operation.',
  },
  IDEMPOTENCY_KEY_INVALID: {
    status: 400,
    retryable: false,
    message: 'The Idempotency-Key header is invalid.',
  },
  /** REL-008: same key, different request body. */
  IDEMPOTENCY_KEY_REUSED: {
    status: 409,
    retryable: false,
    message: 'This Idempotency-Key was already used for a different request.',
  },
  /** REL-006: the first request with this key is still running — show "pending", retry later. */
  IDEMPOTENCY_REQUEST_IN_PROGRESS: {
    status: 409,
    retryable: true,
    message: 'A request with this Idempotency-Key is still being processed.',
  },
  /**
   * REL-008 / SEC-REVIEW-T2.2 #2: the first request may have completed but its result could not
   * be stored. The operation is NEVER re-run for this key: the app shows "pending / unknown" and
   * reconciles by reading the resource (REL-006), or contacts support.
   */
  IDEMPOTENCY_OUTCOME_UNKNOWN: {
    status: 409,
    retryable: false,
    message: 'The outcome of the first request with this Idempotency-Key is unknown.',
  },
  /** SEC-REVIEW-T2.2 #9: the original response was too large to store; the action WAS done. */
  IDEMPOTENCY_REPLAY_UNAVAILABLE: {
    status: 409,
    retryable: false,
    message: 'The request was already processed; read the resource to see the result.',
  },
  RATE_LIMITED: { status: 429, retryable: true, message: 'Too many requests.' },
  INTERNAL_ERROR: { status: 500, retryable: false, message: 'Something went wrong.' },
  /** Golden rule 2: a required config value is null (TODO(OWNER)) — the action fails closed. */
  CONFIG_NOT_SET: {
    status: 503,
    retryable: false,
    message: 'This action is not available yet.',
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    retryable: true,
    message: 'The service is temporarily unavailable.',
  },
} as const satisfies Record<string, { status: number; retryable: boolean; message: string }>;

export type PlatformErrorCode = keyof typeof PLATFORM_ERRORS;

/** Stable code format: UPPER_SNAKE_CASE. */
export const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/**
 * The only error type whose code/message reach the client. The message must be FIXED developer
 * text, never interpolated with data (ids, phones, amounts); as a safety net the envelope masks
 * it anyway (SEC-REVIEW-T2.2 #16).
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly options: {
      readonly retryable?: boolean | undefined;
      readonly details?: readonly ErrorDetail[] | undefined;
      readonly cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    if (!ERROR_CODE_PATTERN.test(code)) throw new TypeError(`Invalid error code "${code}"`);
    if (!Number.isInteger(status) || status < 400 || status > 599) {
      throw new TypeError(`Invalid error status ${status}`);
    }
  }

  get retryable(): boolean {
    return this.options.retryable ?? false;
  }

  /** Build a platform error with its fixed status, retry hint and generic message. */
  static of(
    code: PlatformErrorCode,
    extra: { readonly details?: readonly ErrorDetail[] | undefined; readonly cause?: unknown } = {},
  ): AppError {
    const def = PLATFORM_ERRORS[code];
    return new AppError(code, def.status, def.message, {
      retryable: def.retryable,
      details: extra.details,
      cause: extra.cause,
    });
  }
}

/** Default platform code for an HTTP status produced by the framework (404 route, 413 body…). */
export function codeForStatus(status: number): PlatformErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 405:
      return 'METHOD_NOT_ALLOWED';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 415:
      return 'UNSUPPORTED_MEDIA_TYPE';
    case 422:
      return 'VALIDATION_FAILED';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
  }
}

/** Details are sanitised: only `field` + `issue` strings, bounded in size (no internals). */
const MAX_DETAILS = 50;
const MAX_DETAIL_LENGTH = 200;

function sanitiseDetails(details: readonly ErrorDetail[] | undefined): ErrorDetail[] | undefined {
  if (!details || details.length === 0) return undefined;
  return details.slice(0, MAX_DETAILS).map((d) => {
    const issue = String(d.issue).slice(0, MAX_DETAIL_LENGTH);
    return d.field === undefined
      ? { issue }
      : { field: String(d.field).slice(0, MAX_DETAIL_LENGTH), issue };
  });
}

export interface EnvelopeResult {
  readonly status: number;
  readonly body: ErrorEnvelope;
  /** True when the error is unexpected (5xx): report to Sentry and log at error level. */
  readonly unexpected: boolean;
}

/**
 * Turn anything thrown into a status + envelope. Only {@link AppError} keeps its code and message;
 * everything else becomes INTERNAL_ERROR (or the generic code for a known framework status passed
 * as `frameworkStatus`, without its message).
 */
export function toErrorEnvelope(
  error: unknown,
  requestId: string | null,
  frameworkStatus?: number,
): EnvelopeResult {
  if (error instanceof AppError) {
    const details = sanitiseDetails(error.options.details);
    return {
      status: error.status,
      unexpected: error.status >= 500 && error.code === 'INTERNAL_ERROR',
      body: {
        error: {
          code: error.code,
          message: maskFreeText(error.message),
          requestId,
          retryable: error.retryable,
          ...(details ? { details } : {}),
        },
      },
    };
  }
  const code =
    frameworkStatus !== undefined && frameworkStatus >= 400 && frameworkStatus <= 599
      ? codeForStatus(frameworkStatus)
      : 'INTERNAL_ERROR';
  const def = PLATFORM_ERRORS[code];
  return {
    status: def.status,
    unexpected: def.status >= 500,
    body: { error: { code, message: def.message, requestId, retryable: def.retryable } },
  };
}

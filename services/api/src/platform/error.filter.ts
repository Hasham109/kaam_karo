/**
 * Global exception filter → one error envelope (T2.2; ARCH §8; BP §29, §31.1; REL-001,
 * REL-002, SEC-BASE-005). Contract: contracts/common.yaml `ErrorEnvelope`.
 * - AppError → its code/status. Nest HttpException / body-parser errors → generic code for the
 *   status, without their message. Config errors → CONFIG_NOT_SET / SERVICE_UNAVAILABLE.
 * - Everything else → 500 INTERNAL_ERROR, reported to Sentry and logged (INFRA-005). Nothing
 *   internal (message, stack, SQL) is ever sent to the client.
 * - A replayed idempotent error ({@link IdempotentReplay}) is sent exactly as stored (REL-008).
 */
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Inject,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { HttpRequest as Request, HttpResponse as Response } from './http-types';
import {
  AppError,
  ConfigNotSetError,
  ConfigUnavailableError,
  IDEMPOTENT_REPLAY_HEADER,
  type Logger,
  type ServerEnv,
  toErrorEnvelope,
} from '@kaamkaro/platform';
import { APP_LOGGER } from './logger';
import { SERVER_ENV } from '../config/server-env.module';
import { applyRequestContext } from './request-context.middleware';

/** Thrown by the idempotency interceptor to replay a stored error response verbatim. */
export class IdempotentReplay extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super('idempotent replay');
    this.name = 'IdempotentReplay';
  }
}

/** Retry hint for 503 SERVICE_UNAVAILABLE, in seconds (technical). */
const RETRY_AFTER_SECONDS = '5';

function frameworkStatus(exception: unknown): number | undefined {
  if (exception instanceof HttpException) return exception.getStatus();
  // body-parser / http-errors (e.g. 413 entity.too.large, 400 bad JSON) expose a client status.
  const e = exception as { status?: unknown; statusCode?: unknown; expose?: unknown } | null;
  const status = typeof e?.status === 'number' ? e.status : e?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500 && e?.expose === true) {
    return status;
  }
  return undefined;
}

@Catch()
export class ErrorEnvelopeFilter implements ExceptionFilter {
  constructor(
    @Inject(APP_LOGGER) private readonly logger: Logger,
    @Inject(SERVER_ENV) private readonly env: ServerEnv,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    if (res.headersSent) return;
    // SEC-REVIEW-T2.2 #11: body-parser errors (400/413) never reach the middleware; apply the
    // request ID and security headers here too (idempotent when the middleware already ran).
    const requestId = applyRequestContext(req, res, this.env);

    if (exception instanceof IdempotentReplay) {
      res.setHeader(IDEMPOTENT_REPLAY_HEADER, 'true');
      res.status(exception.status).json(exception.body);
      return;
    }

    let error: unknown = exception;
    if (exception instanceof ConfigNotSetError) error = AppError.of('CONFIG_NOT_SET');
    else if (exception instanceof ConfigUnavailableError)
      error = AppError.of('SERVICE_UNAVAILABLE');
    const result = toErrorEnvelope(error, requestId, frameworkStatus(exception));

    if (result.unexpected) {
      Sentry.captureException(exception);
      this.logger.error('unhandled error', {
        err: exception instanceof Error ? exception : new Error('non-error thrown'),
        method: req.method,
      });
    } else if (
      exception instanceof ConfigNotSetError ||
      exception instanceof ConfigUnavailableError
    ) {
      this.logger.warn('config not available', {
        key: (exception as ConfigNotSetError | ConfigUnavailableError).key,
        code: result.body.error.code,
      });
    }
    if (result.status === 503 && result.body.error.retryable) {
      res.setHeader('Retry-After', RETRY_AFTER_SECONDS);
    }
    res.status(result.status).json(result.body);
  }
}

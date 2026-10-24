/**
 * `@Idempotent('<operation>')` + global interceptor (T2.2; ARCH §8 rule 3; BP §31.1, §31.2;
 * REL-002, REL-003, REL-006, REL-008).
 *
 * Usage (create booking, submit request, initiate payment, accept quote, approve charge):
 *
 *   @Post() @Idempotent('booking.create')
 *   create(@Body() body: CreateBookingDto) { ... }
 *
 * - The `Idempotency-Key` header is REQUIRED on decorated routes (428 when missing).
 * - Scope = the authenticated caller (`request.user.id`, set by A02's auth guard in T2.4). No
 *   caller → 401: keys of different callers never collide and anonymous calls are refused
 *   (SEC-BASE-003 deny by default). A02 may override IDEMPOTENCY_SCOPE_RESOLVER.
 * - Same key + same request → the original status/body (`Idempotent-Replayed: true`).
 */
import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { HttpRequest as Request, HttpResponse as Response } from './http-types';
import { type Observable, from, lastValueFrom } from 'rxjs';
import {
  AppError,
  IDEMPOTENCY_HEADER,
  type IdempotencyStore,
  type ServerEnv,
  hashRequest,
  parseIdempotencyKey,
  runIdempotent,
} from '@kaamkaro/platform';
import { SERVER_ENV } from '../config/server-env.module';
import { IdempotentReplay } from './error.filter';
import { requestIdOf } from './request-context.middleware';

export const IDEMPOTENT_OPERATION = 'kaamkaro:idempotent-operation';
export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');
export const IDEMPOTENCY_SCOPE_RESOLVER = Symbol('IDEMPOTENCY_SCOPE_RESOLVER');

/** Returns the caller scope (e.g. user ID) or null when the caller is not authenticated. */
export type IdempotencyScopeResolver = (req: Request) => string | null;

/** Operation names look like `booking.create`, `payment.initiate`. */
const OPERATION_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+$/;

export function Idempotent(operation: string): MethodDecorator {
  if (!OPERATION_PATTERN.test(operation)) throw new TypeError(`Invalid operation "${operation}"`);
  return SetMetadata(IDEMPOTENT_OPERATION, operation);
}

export const defaultScopeResolver: IdempotencyScopeResolver = (req) => {
  const user = req.user;
  return typeof user?.id === 'string' && user.id.length > 0 ? `user:${user.id}` : null;
};

const HOUR_MS = 3_600_000;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(IDEMPOTENCY_STORE) private readonly store: IdempotencyStore,
    @Inject(IDEMPOTENCY_SCOPE_RESOLVER) private readonly resolveScope: IdempotencyScopeResolver,
    @Inject(SERVER_ENV) private readonly env: ServerEnv,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const operation = this.reflector.get<string | undefined>(
      IDEMPOTENT_OPERATION,
      context.getHandler(),
    );
    if (context.getType() !== 'http' || operation === undefined) return next.handle();

    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const key = parseIdempotencyKey(req.headers[IDEMPOTENCY_HEADER]);
    const scope = this.resolveScope(req);
    if (scope === null) throw AppError.of('UNAUTHENTICATED');

    const run = async (): Promise<unknown> => {
      const result = await runIdempotent(
        this.store,
        {
          scope,
          operation,
          key,
          requestHash: hashRequest(req.method, req.originalUrl, req.body),
          ttlMs: this.env.idempotencyKeyTtlHours * HOUR_MS,
          inFlightTimeoutMs: this.env.idempotencyInFlightTimeoutMs,
          maxResponseBytes: this.env.idempotencyMaxResponseBytes,
          requestId: requestIdOf(req),
        },
        async () => {
          const body = await lastValueFrom(next.handle(), { defaultValue: null });
          return { status: res.statusCode, body };
        },
      );
      if (!result.replayed) return result.body;
      // QA-T22-02: Nest would apply the route's default status; the filter sends the stored
      // status and body verbatim, with `Idempotent-Replayed: true`, for success and errors alike.
      throw new IdempotentReplay(result.status, result.body);
    };
    return from(run());
  }
}

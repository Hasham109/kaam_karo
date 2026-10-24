/**
 * Minimal structural types for the Express request/response used by the platform wiring (T2.2).
 * Kept local so no extra type package is needed (D-001: Nest on Express via platform-express).
 */
import type { IncomingHttpHeaders } from 'node:http';

export interface HttpRequest {
  readonly method: string;
  readonly originalUrl: string;
  readonly headers: IncomingHttpHeaders;
  readonly body?: unknown;
  /** Set by A02's auth guard (T2.4). */
  user?: { readonly id?: unknown; readonly [key: string]: unknown };
  /** Server-generated request ID, set by applyRequestContext. */
  requestId?: string;
  /** Client-sent X-Request-Id (validated), a hint only (SEC-REVIEW-T2.2 #12). */
  clientRequestId?: string;
}

export interface HttpResponse {
  statusCode: number;
  readonly headersSent: boolean;
  setHeader(name: string, value: string): unknown;
  removeHeader(name: string): void;
  status(code: number): HttpResponse;
  json(body: unknown): unknown;
}

export type NextFn = (error?: unknown) => void;

/**
 * Structured JSON logger with mandatory PII redaction (T2.2; IMPL §2.2 A01 "structured logging").
 *
 * - INFRA-005 (BP §34, §31.2): one JSON line per event on stdout so the hosting log pipeline can
 *   index it; fields: time, level, msg, requestId, plus context.
 * - BP §29; permission-policy §7; SEC-REVIEW-T2.3 #10: every context object and message passes
 *   through {@link maskPii} / {@link maskFreeText} before it is written. Error objects keep only
 *   their name and a masked message; stacks are written only in development/test.
 *
 * No logging library is added (D-001 stack check): this is a small wrapper over a writer.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { LogLevel } from '../env';
import { type MaskedJson, maskFreeText, maskPii } from '../pii/mask';

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** Per-request values carried through async calls (set by the API request-context middleware). */
export interface RequestContext {
  /** Server-generated (SEC-REVIEW-T2.2 #12). */
  readonly requestId: string;
  /** Client-sent trace ID, a hint for support only. */
  readonly clientRequestId?: string | null;
  readonly actorUserId?: string | null;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn);
}

export function currentRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export type LogWriter = (line: string) => void;

export interface LoggerOptions {
  readonly level: LogLevel;
  /** Logger name, e.g. `outbox-relay` or a module name. */
  readonly name?: string;
  /** Include error stacks (development/test only). */
  readonly includeStacks?: boolean;
  readonly writer?: LogWriter;
  readonly now?: () => Date;
}

export interface Logger {
  debug(msg: string, context?: Record<string, unknown>): void;
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
  child(name: string): Logger;
}

function serialiseError(error: Error, includeStacks: boolean): MaskedJson {
  const out: Record<string, MaskedJson> = {
    name: error.name,
    message: maskFreeText(error.message),
  };
  if (includeStacks && error.stack) out['stack'] = maskFreeText(error.stack);
  return out;
}

const defaultWriter: LogWriter = (line) => {
  process.stdout.write(`${line}\n`);
};

export function createLogger(options: LoggerOptions): Logger {
  const writer = options.writer ?? defaultWriter;
  const now = options.now ?? (() => new Date());
  const threshold = LEVEL_ORDER[options.level];
  const includeStacks = options.includeStacks ?? false;

  const write = (level: LogLevel, msg: string, context?: Record<string, unknown>): void => {
    if (LEVEL_ORDER[level] < threshold) return;
    const fields: Record<string, MaskedJson> = {};
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (value instanceof Error) fields[key] = serialiseError(value, includeStacks);
        else {
          const masked = maskPii({ [key]: value }) as Record<string, MaskedJson>;
          if (key in masked) fields[key] = masked[key] ?? null;
        }
      }
    }
    const request = currentRequestContext();
    const record: Record<string, MaskedJson> = {
      time: now().toISOString(),
      level,
      ...(options.name ? { logger: options.name } : {}),
      msg: maskFreeText(msg),
      ...(request ? { requestId: request.requestId } : {}),
      ...(request?.clientRequestId ? { clientRequestId: request.clientRequestId } : {}),
      ...fields,
    };
    try {
      writer(JSON.stringify(record));
    } catch {
      // Logging must never break the request (REL-001).
    }
  };

  return {
    debug: (msg, ctx) => write('debug', msg, ctx),
    info: (msg, ctx) => write('info', msg, ctx),
    warn: (msg, ctx) => write('warn', msg, ctx),
    error: (msg, ctx) => write('error', msg, ctx),
    child: (name) =>
      createLogger({ ...options, name: options.name ? `${options.name}.${name}` : name }),
  };
}

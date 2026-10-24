/**
 * App logger: the platform JSON logger (PII-redacted) + a Nest LoggerService adapter
 * (T2.2; INFRA-005, BP §34; SEC-REVIEW-T2.3 #10).
 */
import type { LoggerService } from '@nestjs/common';
import { type Logger, type ServerEnv, createLogger } from '@kaamkaro/platform';

export const APP_LOGGER = Symbol('APP_LOGGER');

export function createAppLogger(env: ServerEnv, name = 'api'): Logger {
  return createLogger({
    level: env.logLevel,
    name,
    includeStacks: env.appEnv === 'development' || env.appEnv === 'test',
  });
}

/** Routes Nest's own log lines through the redacting JSON logger. */
export class NestJsonLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  private ctx(optionalParams: unknown[]): Record<string, unknown> | undefined {
    if (optionalParams.length === 0) return undefined;
    const last = optionalParams[optionalParams.length - 1];
    return typeof last === 'string' ? { context: last } : { params: optionalParams };
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.info(String(message), this.ctx(optionalParams));
  }
  error(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.error(String(message), this.ctx(optionalParams));
  }
  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.warn(String(message), this.ctx(optionalParams));
  }
  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug(String(message), this.ctx(optionalParams));
  }
  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug(String(message), this.ctx(optionalParams));
  }
}

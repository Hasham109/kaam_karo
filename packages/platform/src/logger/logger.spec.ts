import { describe, expect, it } from 'vitest';
import { createLogger, runWithRequestContext } from './logger';

function capture(level: 'debug' | 'info' | 'warn' | 'error' = 'info', includeStacks = false) {
  const lines: string[] = [];
  const logger = createLogger({
    level,
    name: 'test',
    includeStacks,
    writer: (l) => lines.push(l),
    now: () => new Date('2026-10-23T00:00:00.000Z'),
  });
  return {
    logger,
    lines,
    parsed: () => lines.map((l) => JSON.parse(l) as Record<string, unknown>),
  };
}

// INFRA-005 (BP §34); SEC-REVIEW-T2.3 #10 (BP §29): structured, PII-redacted logs.
describe('[INFRA-005] structured logger', () => {
  it('[INFRA-005] writes one JSON line with time, level, logger, msg and requestId', () => {
    const { logger, parsed } = capture();
    runWithRequestContext({ requestId: 'req-42' }, () =>
      logger.info('booking created', { count: 2 }),
    );
    expect(parsed()).toEqual([
      {
        time: '2026-10-23T00:00:00.000Z',
        level: 'info',
        logger: 'test',
        msg: 'booking created',
        requestId: 'req-42',
        count: 2,
      },
    ]);
  });

  it('[DATA-004] redacts PII in context and message', () => {
    const { logger, lines } = capture();
    logger.warn('otp failed for 03001234567', {
      phone: '+923001234567',
      ip: '203.0.113.9',
      body: { otp: '654321', note: 'mail me at x@y.pk' },
    });
    const line = lines.join('\n');
    for (const leak of ['03001234567', '923001234567', '203.0.113.9', '654321', 'x@y.pk']) {
      expect(line).not.toContain(leak);
    }
    expect(line).toContain('203.0.113.0/24');
  });

  it('[INFRA-005] respects the level threshold and builds child names', () => {
    const { logger, parsed } = capture('warn');
    logger.info('dropped');
    logger.child('outbox').error('kept');
    expect(parsed()).toHaveLength(1);
    expect(parsed()[0]?.['logger']).toBe('test.outbox');
  });

  it('[DATA-004] errors: masked message, stack only when enabled', () => {
    const noStack = capture();
    noStack.logger.error('failed', { err: new Error('user 03001234567 not found') });
    const rec = noStack.parsed()[0]?.['err'] as Record<string, unknown>;
    expect(rec).toEqual({ name: 'Error', message: 'user [PHONE] not found' });
    const withStack = capture('info', true);
    withStack.logger.error('failed', { err: new Error('boom') });
    expect(withStack.parsed()[0]?.['err']).toHaveProperty('stack');
  });

  it('[REL-001] a failing writer never throws into the caller', () => {
    const logger = createLogger({
      level: 'info',
      writer: () => {
        throw new Error('disk full');
      },
    });
    expect(() => logger.info('x')).not.toThrow();
  });
});

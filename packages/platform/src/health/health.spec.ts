import { createServer, type Server } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { probeTcpUrl, summarizeHealth } from './health';

const OPTS = { defaultPort: 5432, timeoutMs: 1000 };

describe('[REL-011] health summary', () => {
  it('[REL-011] development: missing dependencies are not_configured and status stays ok', () => {
    const report = summarizeHealth('development', {
      database: 'not_configured',
      redis: 'not_configured',
      queue: 'not_configured',
      storage: 'not_configured',
    });
    expect(report.status).toBe('ok');
    expect(report.checks.database.status).toBe('not_configured');
  });

  it('[REL-011] any dependency down → error', () => {
    expect(
      summarizeHealth('development', {
        database: 'up',
        redis: 'down',
        queue: 'not_configured',
        storage: 'not_configured',
      }).status,
    ).toBe('error');
  });

  it('[REL-011][SEC-BASE-011] production: DB or Redis not configured → error', () => {
    expect(
      summarizeHealth('production', {
        database: 'not_configured',
        redis: 'up',
        queue: 'not_configured',
        storage: 'not_configured',
      }).status,
    ).toBe('error');
    expect(
      summarizeHealth('production', {
        database: 'up',
        redis: 'up',
        queue: 'not_configured',
        storage: 'not_configured',
      }).status,
    ).toBe('ok');
  });
});

describe('[REL-011] TCP reachability probe', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    server = createServer((socket) => socket.end());
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('no port');
    port = address.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('[REL-011] null URL → not_configured', async () => {
    expect(await probeTcpUrl(null, OPTS)).toBe('not_configured');
  });

  it('[REL-011] reachable host → up', async () => {
    expect(await probeTcpUrl(`postgresql://u:p@127.0.0.1:${port}/db`, OPTS)).toBe('up');
  });

  it('[REL-011] refused connection → down', async () => {
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
    const address = closed.address();
    if (address === null || typeof address === 'string') throw new Error('no port');
    await new Promise<void>((resolve) => closed.close(() => resolve()));
    expect(await probeTcpUrl(`redis://127.0.0.1:${address.port}`, OPTS)).toBe('down');
  });

  it('[REL-011] malformed URL → down', async () => {
    expect(await probeTcpUrl('not a url', OPTS)).toBe('down');
  });
});

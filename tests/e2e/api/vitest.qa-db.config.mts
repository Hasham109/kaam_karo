/**
 * Runner config for the A16 QA DB probes in tests/e2e/api (T2.2 review; REL-008, REL-009,
 * DATA-004). tests/e2e has no dependencies of its own yet, so every package is resolved from
 * services/api. Run from services/api:
 *   pnpm exec vitest run --config ../../tests/e2e/api/vitest.qa-db.config.mts
 * DATABASE_URL must be the non-owner API login on a fresh migrated database; REDIS_URL local Redis.
 */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const api = fileURLToPath(new URL('../../../services/api/', import.meta.url));
const here = fileURLToPath(new URL('./', import.meta.url));
const requireFromApi = createRequire(`${api}package.json`);
const load = async <T,>(name: string): Promise<T> =>
  (await import(pathToFileURL(requireFromApi.resolve(name)).href)) as T;

const swcMod = await load<{
  default?: { vite?: (o: object) => unknown; default?: { vite(o: object): unknown } };
}>('unplugin-swc');
const swc = (swcMod.default?.vite ? swcMod.default : swcMod.default?.default) as {
  vite(o: object): unknown;
};
const { defineConfig } = await load<{ defineConfig(c: object): object }>('vitest/config');
const dep = (name: string): string => `${api}node_modules/${name}`;

export default defineConfig({
  root: api,
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
    }),
  ],
  resolve: {
    alias: [
      { find: /^@nestjs\/common$/, replacement: dep('@nestjs/common') },
      { find: /^@nestjs\/testing$/, replacement: dep('@nestjs/testing') },
      { find: /^supertest$/, replacement: dep('supertest') },
      { find: /^@kaamkaro\/platform$/, replacement: dep('@kaamkaro/platform') },
      { find: /^reflect-metadata$/, replacement: dep('reflect-metadata') },
    ],
  },
  test: {
    dir: here,
    include: ['**/*.qa.db-spec.ts'],
    allowOnly: false,
    passWithNoTests: false,
    fileParallelism: false,
    testTimeout: 30_000,
  },
});

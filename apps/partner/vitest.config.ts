import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// RQ-002 item 2 (IMPL §7.4): `.only` must never pass, locally or in CI.
// Only plain TypeScript modules are unit-tested here; screens get Maestro flows (A16).
export default defineConfig({
  resolve: {
    alias: {
      '@kaamkaro/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    allowOnly: false,
    passWithNoTests: false,
  },
});

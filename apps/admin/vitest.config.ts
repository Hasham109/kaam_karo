import path from 'node:path';
import { defineConfig } from 'vitest/config';

// RQ-002 item 2 (IMPL §7.4): `.only` must never pass, locally or in CI.
export default defineConfig({
  resolve: {
    alias: {
      '@kaamkaro/i18n': path.resolve(__dirname, '../../packages/i18n/src'),
    },
  },
  test: {
    include: ['app/**/*.spec.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    allowOnly: false,
    passWithNoTests: false,
  },
});

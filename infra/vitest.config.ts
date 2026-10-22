import { defineConfig } from 'vitest/config';

// RQ-002 item 2 (IMPL §7.4): `.only` must never pass, locally or in CI.
export default defineConfig({
  test: {
    include: ['ci/**/*.spec.ts', 'eslint/**/*.spec.ts'],
    allowOnly: false,
    passWithNoTests: false,
  },
});

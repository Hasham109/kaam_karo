import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// NestJS DI needs decorator metadata, which only SWC (not the default transformer) emits.
// RQ-002 item 2 (IMPL §7.4): `.only` must never pass, locally or in CI.
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts', 'src/**/*.e2e-spec.ts', 'prisma/**/*.spec.ts'],
    allowOnly: false,
    passWithNoTests: false,
  },
});

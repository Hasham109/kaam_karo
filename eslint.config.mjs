// Shared ESLint flat config for every workspace (T2.1, PLAT-001; D-001 TypeScript everywhere).
// Each package runs `eslint .`; ESLint finds this file by walking up from the package.
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import vitest from '@vitest/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import kaamkaro from './infra/eslint/kaamkaro-plugin.mjs';

export default defineConfig(
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    '**/build/',
    '**/coverage/',
    '**/.next/',
    '**/.expo/',
    '**/.turbo/',
    '**/web-build/',
    '**/next-env.d.ts',
    'services/api/src/generated/',
    'apps/*/android/',
    'apps/*/ios/',
    'docs/',
    'coordination/',
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
      'no-console': 'off',
    },
  },

  // INFRA-001 (BP §32): no module reaches into another module's internals.
  {
    files: ['services/api/src/**/*.ts'],
    plugins: { kaamkaro },
    rules: { 'kaamkaro/no-cross-module-import': 'error' },
  },

  // RQ-002 item 2 (docs/qa/test-strategy.md §3, P4): no focused or skipped tests.
  {
    files: [
      '**/*.spec.{ts,tsx}',
      '**/*.e2e-spec.ts',
      '**/*.db-spec.ts',
      '**/*.test.{ts,tsx}',
      '**/__tests__/**',
    ],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      // Vitest's expect(value, message) form is used for readable failure messages.
      'vitest/valid-expect': ['error', { maxArgs: 2 }],
    },
  },

  // Admin portal (Next.js, D-001).
  {
    files: ['apps/admin/**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    languageOptions: { globals: { ...globals.browser } },
    settings: { next: { rootDir: 'apps/admin/' } },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // Mobile apps (Expo / React Native, D-001).
  {
    files: ['apps/customer/**/*.{ts,tsx}', 'apps/partner/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
);

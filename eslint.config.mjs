// Shared ESLint flat config for every workspace (T2.1, PLAT-001; D-001 TypeScript everywhere).
// Each package runs `eslint .`; ESLint finds this file by walking up from the package.
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import vitest from '@vitest/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import kaamkaro from './infra/eslint/kaamkaro-plugin.mjs';

const WRITE_METHODS =
  '/^(create|createMany|createManyAndReturn|upsert|update|updateMany|delete|deleteMany)$/';
const PLATFORM_TABLE_WRITE = {
  selector: `CallExpression[callee.object.property.name=/^(auditLog|marketplaceEvent|outboxEvent)$/][callee.property.name=${WRITE_METHODS}]`,
  message:
    'Write audit/marketplace/outbox rows only through AuditWriter, MarketplaceEventWriter or OutboxWriter (services/api/src/platform; SEC-REVIEW-T2.2 #5).',
};
const CONFIG_RULE_WRITE = {
  selector: `CallExpression[callee.object.property.name='configRule'][callee.property.name=${WRITE_METHODS}]`,
  message:
    'config_rule is written only by the config module (ConfigAdminService) or its seed (SEC-REVIEW-T2.6 #2).',
};

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

  // T2.2: NestJS constructor injection needs VALUE imports of injected classes (decorator metadata);
  // tell consistent-type-imports so it never turns them into `import type` (D-001 NestJS).
  {
    files: ['services/api/**/*.ts'],
    languageOptions: {
      parserOptions: { emitDecoratorMetadata: true, experimentalDecorators: true },
    },
  },

  // SEC-REVIEW-T2.2 #5(c), QA-T22-06 (BP §26, §29; DATA-004): only the platform writers create or
  // change audit_log / marketplace_event / outbox_event rows (masker cannot be skipped).
  // SEC-REVIEW-T2.6 #2 (BP §42, §26; CFG-RULE-001…012): only the config module (and its seed)
  // writes config_rule. Three non-overlapping blocks, because flat config overrides a rule.
  {
    files: ['services/api/**/*.ts'],
    ignores: [
      'services/api/src/platform/**',
      'services/api/src/modules/config/**',
      'services/api/prisma/seed/**',
    ],
    rules: { 'no-restricted-syntax': ['error', PLATFORM_TABLE_WRITE, CONFIG_RULE_WRITE] },
  },
  {
    files: ['services/api/src/platform/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', CONFIG_RULE_WRITE] },
  },
  {
    files: ['services/api/src/modules/config/**/*.ts', 'services/api/prisma/seed/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', PLATFORM_TABLE_WRITE] },
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
      '@typescript-eslint/no-explicit-any': 'off',
      'kaamkaro/no-cross-module-import': 'off',
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

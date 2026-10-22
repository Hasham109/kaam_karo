import { RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin, { moduleOf } from './kaamkaro-plugin.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const rule = plugin.rules['no-cross-module-import'];
const tester = new RuleTester({ languageOptions: { ecmaVersion: 'latest', sourceType: 'module' } });

const ROOT = '/repo/services/api/src';
const inBooking = `${ROOT}/modules/booking/booking.service.ts`;

describe('[INFRA-001] kaamkaro/no-cross-module-import (BP §32)', () => {
  it('[INFRA-001] maps a path to its module', () => {
    expect(moduleOf(`${ROOT}/modules/payments/ledger/ledger.repo.ts`)).toEqual({
      module: 'payments',
      rest: '/ledger/ledger.repo.ts',
    });
    expect(moduleOf(`${ROOT}/app.module.ts`)).toBeNull();
  });

  tester.run('no-cross-module-import', rule, {
    valid: [
      { filename: inBooking, code: "import { x } from './booking.repo';" },
      { filename: inBooking, code: "import { PaymentsApi } from '../payments';" },
      { filename: inBooking, code: "import { PaymentsApi } from '../payments/index';" },
      { filename: inBooking, code: "import { PaymentsApi } from '../payments/index.ts';" },
      {
        filename: `${ROOT}/app.module.ts`,
        code: "import { HealthModule } from './modules/health';",
      },
      { filename: inBooking, code: "import { Injectable } from '@nestjs/common';" },
    ],
    invalid: [
      {
        filename: inBooking,
        code: "import { LedgerRepo } from '../payments/ledger/ledger.repo';",
        errors: [{ messageId: 'deep' }],
      },
      {
        filename: inBooking,
        code: "export * from '../payments/payments.service';",
        errors: [{ messageId: 'deep' }],
      },
      {
        filename: `${ROOT}/app.module.ts`,
        code: "import { HealthService } from './modules/health/health.service';",
        errors: [{ messageId: 'deep' }],
      },
      {
        filename: inBooking,
        code: "const m = await import('../payments/payments.repo');",
        errors: [{ messageId: 'deep' }],
      },
    ],
  });
});

/**
 * Fake PayoutProvider (Module M11, T6.3; owner A09).
 * Requirement IDs: PAY-007; EXT-001; D-008.
 * Stands in for the real payout provider until one is chosen. Never sees full account numbers:
 * only the opaque `payoutProviderRef` token of a payout method.
 */
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { PayoutParams, PayoutProvider, PayoutResult } from './payments.types.js';

@Injectable()
export class FakePayoutProvider implements PayoutProvider {
  private nextStatus: PayoutResult['status'] = 'PAID';

  async payout(params: PayoutParams): Promise<PayoutResult> {
    const status = this.nextStatus;
    this.nextStatus = 'PAID';
    return {
      payoutRef: `fake_po_${randomUUID().replace(/-/g, '').slice(0, 16)}_${params.settlementId.slice(0, 8)}`,
      status,
    };
  }

  /** Test helper: the next payout ends with this status. */
  setNextStatus(status: PayoutResult['status']): void {
    this.nextStatus = status;
  }
}

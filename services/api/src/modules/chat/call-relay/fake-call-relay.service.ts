/**
 * FakeCallRelayService — In-memory fake for CallRelay interface (owner A10, T7.2).
 * Conforms to EXT-001 (vendor fake with fault modes per test-strategy §3).
 * Never leaks real phone numbers (CHAT-002; BP §20; D-009).
 */
import { randomUUID } from 'node:crypto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  type CallRelayService,
  type CreateRelaySessionParams,
  type RelaySession,
} from './call-relay.interface';

@Injectable()
export class FakeCallRelayService implements CallRelayService {
  private faultMode: 'ok' | 'slow' | 'timeout' | 'error' = 'ok';
  private readonly sessions = new Map<string, RelaySession>();

  // Virtual relay numbers allocated from simulated DID pool
  private static readonly VIRTUAL_RELAY_NUMBER = '+92421115226';
  private static readonly DISPLAY_RELAY_NUMBER = '+92 42 111-KAAM (5226)';

  setFaultMode(mode: 'ok' | 'slow' | 'timeout' | 'error'): void {
    this.faultMode = mode;
  }

  async createRelaySession(params: CreateRelaySessionParams): Promise<RelaySession> {
    if (this.faultMode === 'error') {
      throw new HttpException(
        {
          code: 'CALL_RELAY_GATEWAY_ERROR',
          message: 'Relay telephony service temporarily unavailable',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (this.faultMode === 'timeout') {
      throw new HttpException(
        {
          code: 'CALL_RELAY_TIMEOUT',
          message: 'Relay telephony service timed out',
        },
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    if (this.faultMode === 'slow') {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes duration

    const session: RelaySession = {
      sessionId,
      bookingId: params.bookingId,
      virtualRelayNumber: FakeCallRelayService.VIRTUAL_RELAY_NUMBER,
      displayRelayNumber: FakeCallRelayService.DISPLAY_RELAY_NUMBER,
      expiresAt,
      callerRole: params.callerRole,
      status: 'ACTIVE',
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async getRelaySession(sessionId: string): Promise<RelaySession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  clearSessions(): void {
    this.sessions.clear();
  }
}

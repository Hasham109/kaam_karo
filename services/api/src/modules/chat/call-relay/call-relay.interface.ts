/**
 * CallRelay Interface — Abstraction for masked/relay telephony service (owner A10, T7.2).
 * ARCH §18; BP §20, §74; CHAT-002; EXT-001; D-009.
 * Ensures customer and provider personal phone numbers are never exposed.
 */
import { ActorRole } from '../../../generated/prisma/client.js';

export const CALL_RELAY_SERVICE = Symbol('CALL_RELAY_SERVICE');

export interface CreateRelaySessionParams {
  bookingId: string;
  callerUserId: string;
  callerRole: ActorRole;
  customerUserId: string;
  providerUserId: string;
}

export interface RelaySession {
  sessionId: string;
  bookingId: string;
  virtualRelayNumber: string;
  displayRelayNumber: string;
  expiresAt: Date;
  callerRole: ActorRole;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
}

export interface CallRelayService {
  createRelaySession(params: CreateRelaySessionParams): Promise<RelaySession>;
  getRelaySession(sessionId: string): Promise<RelaySession | null>;
  setFaultMode(mode: 'ok' | 'slow' | 'timeout' | 'error'): void;
}

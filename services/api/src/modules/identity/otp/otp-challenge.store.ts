/**
 * Store for in-flight OTP challenges, rate limits, and lockouts (SEC-AUTH-004; BP §29, §30).
 * Stores only HMAC-SHA256 hashes of OTPs, never raw codes (SEC-AUTH-003, SEC-BASE-002).
 */

export interface StoredOtpChallenge {
  readonly phoneE164: string;
  readonly codeHash: string;
  attempts: number;
  readonly maxAttempts: number;
  readonly expiresAt: number;
  readonly resendAvailableAt: number;
}

export interface OtpChallengeStore {
  getChallenge(phoneE164: string): Promise<StoredOtpChallenge | null>;
  saveChallenge(challenge: StoredOtpChallenge): Promise<void>;
  deleteChallenge(phoneE164: string): Promise<void>;
  getLockoutUntil(phoneE164: string): Promise<number | null>;
  setLockout(phoneE164: string, untilMs: number): Promise<void>;
  recordSend(phoneE164: string, windowSeconds: number): Promise<number>; // returns send count in window
  clear(): Promise<void>;
}

export class MemoryOtpChallengeStore implements OtpChallengeStore {
  private readonly challenges = new Map<string, StoredOtpChallenge>();
  private readonly lockouts = new Map<string, number>();
  private readonly sendHistory = new Map<string, number[]>();

  async getChallenge(phoneE164: string): Promise<StoredOtpChallenge | null> {
    const c = this.challenges.get(phoneE164);
    if (!c) return null;
    if (Date.now() > c.expiresAt) {
      this.challenges.delete(phoneE164);
      return null;
    }
    return c;
  }

  async saveChallenge(challenge: StoredOtpChallenge): Promise<void> {
    this.challenges.set(challenge.phoneE164, challenge);
  }

  async deleteChallenge(phoneE164: string): Promise<void> {
    this.challenges.delete(phoneE164);
  }

  async getLockoutUntil(phoneE164: string): Promise<number | null> {
    const until = this.lockouts.get(phoneE164);
    if (!until) return null;
    if (Date.now() > until) {
      this.lockouts.delete(phoneE164);
      return null;
    }
    return until;
  }

  async setLockout(phoneE164: string, untilMs: number): Promise<void> {
    this.lockouts.set(phoneE164, untilMs);
  }

  async recordSend(phoneE164: string, windowSeconds: number): Promise<number> {
    const now = Date.now();
    const cutoff = now - windowSeconds * 1000;
    const existing = (this.sendHistory.get(phoneE164) ?? []).filter((t) => t > cutoff);
    existing.push(now);
    this.sendHistory.set(phoneE164, existing);
    return existing.length;
  }

  async clear(): Promise<void> {
    this.challenges.clear();
    this.lockouts.clear();
    this.sendHistory.clear();
  }
}

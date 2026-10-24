/**
 * OTP Sender interface and FakeOtpSender (SEC-AUTH-001; BP §27; D-002, D-009).
 * Real SMS gateway integration is deferred to D-009. Non-production uses FakeOtpSender.
 */

export interface OtpSender {
  sendOtp(phoneE164: string, code: string): Promise<void>;
}

export class FakeOtpSender implements OtpSender {
  private readonly sent = new Map<string, string[]>();

  async sendOtp(phoneE164: string, code: string): Promise<void> {
    const list = this.sent.get(phoneE164) ?? [];
    list.push(code);
    this.sent.set(phoneE164, list);
  }

  /** Test helper (Golden rule 3): returns the most recently sent OTP for the phone number. */
  lastOtpFor(phoneE164: string): string | undefined {
    const list = this.sent.get(phoneE164);
    return list && list.length > 0 ? list[list.length - 1] : undefined;
  }

  /** Test helper: all sent OTPs for the phone number. */
  allOtpsFor(phoneE164: string): readonly string[] {
    return this.sent.get(phoneE164) ?? [];
  }

  clear(): void {
    this.sent.clear();
  }
}

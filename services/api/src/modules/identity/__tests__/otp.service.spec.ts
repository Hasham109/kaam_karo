import { describe, expect, it, beforeEach } from 'vitest';
import type { ConfigService } from '@kaamkaro/platform';
import type { PrismaService } from '../../../platform/prisma.service';
import { AccountStatus } from '../../../generated/prisma/client.js';
import { OtpService, normalizePakistaniPhone } from '../otp/otp.service';
import { FakeOtpSender } from '../otp/otp-sender.interface';
import { MemoryOtpChallengeStore } from '../otp/otp-challenge.store';
import type { SessionService } from '../session/session.service';

describe('OtpService (SEC-AUTH-001, SEC-AUTH-004; BP §27)', () => {
  let otpService: OtpService;
  let fakeSender: FakeOtpSender;
  let challengeStore: MemoryOtpChallengeStore;
  let prismaMock: PrismaService;
  let configMock: ConfigService;
  let sessionServiceMock: SessionService;

  const PEPPER = 'test-pepper-secret-32b-length-ok!';

  beforeEach(() => {
    fakeSender = new FakeOtpSender();
    challengeStore = new MemoryOtpChallengeStore();

    configMock = {
      require: async (key: string) => {
        switch (key) {
          case 'auth.otp.expiry_seconds':
            return 300;
          case 'auth.otp.resend_cooldown_seconds':
            return 60;
          case 'auth.otp.max_attempts':
            return 3;
          case 'auth.otp.lockout_seconds':
            return 900;
          case 'auth.rate_limit.otp_send':
            return { maxSends: 3, windowSeconds: 3600 };
          case 'auth.rate_limit.login':
            return { maxAttempts: 5, windowSeconds: 900 };
          default:
            throw new Error(`Unexpected config key: ${key}`);
        }
      },
      inspect: async () => ({ status: 'not_configured' }),
    } as unknown as ConfigService;

    prismaMock = {
      user: {
        findUnique: async () => null,
      },
      $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => {
        const tx = {
          user: {
            create: async (args: { data: { phoneE164: string } }) => ({
              id: 'user-1',
              phoneE164: args.data.phoneE164,
              status: AccountStatus.ACTIVE,
              version: 1,
            }),
            findUniqueOrThrow: async () => ({
              id: 'user-1',
              phoneE164: '+923001234567',
              displayName: null,
              status: AccountStatus.ACTIVE,
              roles: [{ role: 'CUSTOMER' }],
            }),
          },
          userRole: {
            create: async () => ({ id: 'role-1' }),
          },
        };
        return fn(tx);
      },
    } as unknown as PrismaService;

    sessionServiceMock = {
      createSession: async () => ({
        id: 'sess-1',
        rawToken: 'kk_sec_mock_token_12345',
        expiresAt: new Date(Date.now() + 30 * 86400 * 1000),
      }),
    } as unknown as SessionService;

    otpService = new OtpService(
      prismaMock,
      configMock,
      fakeSender,
      challengeStore,
      PEPPER,
      sessionServiceMock as SessionService,
    );
  });

  describe('normalizePakistaniPhone', () => {
    it('normalizes +923xx format', () => {
      expect(normalizePakistaniPhone('+923001234567')).toBe('+923001234567');
      expect(normalizePakistaniPhone('+92 300 1234567')).toBe('+923001234567');
      expect(normalizePakistaniPhone('+92-300-1234567')).toBe('+923001234567');
    });

    it('normalizes 03xx domestic format', () => {
      expect(normalizePakistaniPhone('03001234567')).toBe('+923001234567');
      expect(normalizePakistaniPhone('0321 9876543')).toBe('+923219876543');
    });

    it('normalizes 3xx 10-digit format', () => {
      expect(normalizePakistaniPhone('3001234567')).toBe('+923001234567');
    });

    it('rejects non-Pakistani or malformed numbers', () => {
      expect(() => normalizePakistaniPhone('+1234567890')).toThrow();
      expect(() => normalizePakistaniPhone('12345')).toThrow();
      expect(() => normalizePakistaniPhone('abc')).toThrow();
      expect(() => normalizePakistaniPhone('')).toThrow();
    });
  });

  describe('sendOtp (SEC-AUTH-001, SEC-AUTH-004)', () => {
    it('sends an OTP to a valid phone and stores HMAC-SHA256 challenge', async () => {
      const res = await otpService.sendOtp('03001234567', 'CUSTOMER_APP');
      expect(res.status).toBe('PENDING');
      expect(res.resendCooldownSeconds).toBe(60);

      const sentCode = fakeSender.lastOtpFor('+923001234567');
      expect(sentCode).toBeDefined();
      expect(sentCode).toMatch(/^[0-9]{6}$/);

      const challenge = await challengeStore.getChallenge('+923001234567');
      expect(challenge).not.toBeNull();
      // Code is never stored raw (SEC-AUTH-003)
      expect(challenge!.codeHash).not.toBe(sentCode);
      expect(challenge!.codeHash).toHaveLength(64); // SHA-256 hex
    });

    it('enforces resend cooldown', async () => {
      await otpService.sendOtp('03001234567', 'CUSTOMER_APP');
      await expect(otpService.sendOtp('03001234567', 'CUSTOMER_APP')).rejects.toMatchObject({
        code: 'RESEND_COOLDOWN',
        status: 429,
      });
    });

    it('enforces rate limit on sends', async () => {
      // 3 sends allowed per hour
      await challengeStore.recordSend('+923001234567', 3600);
      await challengeStore.recordSend('+923001234567', 3600);
      await challengeStore.recordSend('+923001234567', 3600);

      await expect(otpService.sendOtp('03001234567', 'CUSTOMER_APP')).rejects.toMatchObject({
        code: 'RATE_LIMIT_EXCEEDED',
        status: 429,
      });
    });

    it('enforces lockout if already locked out', async () => {
      await challengeStore.setLockout('+923001234567', Date.now() + 60000);
      await expect(otpService.sendOtp('03001234567', 'CUSTOMER_APP')).rejects.toMatchObject({
        code: 'ACCOUNT_LOCKED',
        status: 429,
      });
    });
  });

  describe('verifyOtp (SEC-AUTH-001, SEC-AUTH-004, SEC-AUTH-006)', () => {
    it('verifies correct OTP and provisions new user and session', async () => {
      await otpService.sendOtp('03001234567', 'CUSTOMER_APP');
      const code = fakeSender.lastOtpFor('+923001234567')!;

      const result = await otpService.verifyOtp({
        phoneRaw: '03001234567',
        code,
        surface: 'CUSTOMER_APP',
      });

      expect(result.token).toBe('kk_sec_mock_token_12345');
      expect(result.isNewUser).toBe(true);
      expect(result.user.phoneE164).toBe('+923001234567');
      expect(result.user.roles).toContain('CUSTOMER');

      // Consumed challenge cannot be used again
      await expect(
        otpService.verifyOtp({
          phoneRaw: '03001234567',
          code,
          surface: 'CUSTOMER_APP',
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_OTP',
        status: 401,
      });
    });

    it('increments attempts on wrong OTP and locks out after max attempts (brute-force defense)', async () => {
      await otpService.sendOtp('03001234567', 'CUSTOMER_APP');

      // Attempt 1
      await expect(
        otpService.verifyOtp({
          phoneRaw: '03001234567',
          code: '999999',
          surface: 'CUSTOMER_APP',
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_OTP',
        status: 401,
      });

      // Attempt 2
      await expect(
        otpService.verifyOtp({
          phoneRaw: '03001234567',
          code: '888888',
          surface: 'CUSTOMER_APP',
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_OTP',
        status: 401,
      });

      // Attempt 3: limit reached -> MAX_ATTEMPTS_EXCEEDED (429) and lockout set
      await expect(
        otpService.verifyOtp({
          phoneRaw: '03001234567',
          code: '777777',
          surface: 'CUSTOMER_APP',
        }),
      ).rejects.toMatchObject({
        code: 'MAX_ATTEMPTS_EXCEEDED',
        status: 429,
      });

      // Subsequent attempt is blocked by lockout
      await expect(
        otpService.verifyOtp({
          phoneRaw: '03001234567',
          code: '777777',
          surface: 'CUSTOMER_APP',
        }),
      ).rejects.toMatchObject({
        code: 'ACCOUNT_LOCKED',
        status: 429,
      });
    });

    it('refuses login for blocked account (SEC-AUTH-006)', async () => {
      prismaMock.user.findUnique = (async () => ({
        id: 'user-blocked',
        phoneE164: '+923001234567',
        displayName: null,
        email: null,
        preferredLanguage: null,
        status: AccountStatus.BLOCKED,
        statusChangedAt: new Date(),
        deletionRequestedAt: null,
        anonymisedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
        roles: [{ role: 'CUSTOMER' }],
      })) as unknown as typeof prismaMock.user.findUnique;

      await otpService.sendOtp('03001234567', 'CUSTOMER_APP');
      const code = fakeSender.lastOtpFor('+923001234567')!;

      await expect(
        otpService.verifyOtp({
          phoneRaw: '03001234567',
          code,
          surface: 'CUSTOMER_APP',
        }),
      ).rejects.toMatchObject({
        code: 'ACCOUNT_BLOCKED',
        status: 403,
      });
    });
  });
});

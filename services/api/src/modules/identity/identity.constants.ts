/**
 * Injection tokens and constants for Module M1 Identity & Access (ARCH §4 M1, BP §27).
 */
export const OTP_SENDER = Symbol.for('kaamkaro.identity.OtpSender');
export const OTP_CHALLENGE_STORE = Symbol.for('kaamkaro.identity.OtpChallengeStore');
export const AUTH_PEPPER = Symbol.for('kaamkaro.identity.AuthPepper');
export const ADMIN_MFA_CHALLENGE_STORE = Symbol.for('kaamkaro.identity.AdminMfaChallengeStore');

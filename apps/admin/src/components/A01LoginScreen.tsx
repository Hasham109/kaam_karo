/**
 * Screen A01 — Admin Login (Protected staff authentication with MFA)
 * Requirements: OPS-ADMIN-001, SEC-AUTH-002, SEC-AUTH-003, SEC-AUTH-005, SEC-AUTH-006,
 * ADMIN-ROLE-001..008, D-002, D-026, BP §14, §27, §34.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import type { ScreenState } from '../auth/types';

interface A01LoginScreenProps {
  onLoginSuccess?: () => void;
}

export function A01LoginScreen({ onLoginSuccess }: A01LoginScreenProps) {
  const { environment, pendingChallenge, initiateLogin, verifyMfa } = useAdminAuth();

  // Form inputs
  const [signInId, setSignInId] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  // Screen State (UX-SCREEN-003)
  const [screenState, setScreenState] = useState<ScreenState>('empty');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Submit Primary Credentials
  const handleStep1Submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setScreenState('loading');

    try {
      await initiateLogin(signInId, password);
      setScreenState('success');
    } catch (err) {
      setScreenState('error');
      // Generic error message per A01 spec & BP §30 (account takeover prevention)
      setErrorMessage(
        err instanceof Error ? err.message : translate('en', 'admin.a01.err_generic'),
      );
    }
  };

  // Step 2: Submit Verification Code (MFA)
  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingChallenge) return;

    setErrorMessage(null);
    setScreenState('loading');

    try {
      const res = await verifyMfa(pendingChallenge.challengeId, verificationCode);
      if (res.success) {
        setScreenState('success');
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (err) {
      setScreenState('error');
      setErrorMessage(
        err instanceof Error ? err.message : translate('en', 'admin.a01.err_generic'),
      );
    }
  };

  const envKey =
    environment === 'staging'
      ? 'admin.env.staging'
      : environment === 'production'
        ? 'admin.env.production'
        : 'admin.env.development';

  return (
    <div className="login-page-container" data-testid="a01-login-screen">
      <div className="login-card">
        {/* Environment Badge */}
        <div className="login-header">
          <div className={`env-badge env-${environment}`} data-testid="a01-env-badge">
            {translate('en', envKey)}
          </div>
          <h1 className="login-title">{translate('en', 'admin.a01.title')}</h1>
          <p className="login-subtitle">{translate('en', 'admin.a01.subtitle')}</p>
        </div>

        {/* Error Alert Area */}
        {errorMessage && (
          <div className="error-alert" data-testid="a01-error-area" role="alert">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{errorMessage}</span>
          </div>
        )}

        {/* Step 1: Identifier + Password */}
        {!pendingChallenge ? (
          <form onSubmit={handleStep1Submit} className="login-form" data-testid="a01-step1-form">
            <div className="form-group">
              <label htmlFor="a01-signin-id" className="form-label">
                {translate('en', 'admin.a01.signin_id_label')}
              </label>
              <input
                id="a01-signin-id"
                data-testid="a01-signin-id-input"
                type="text"
                className="form-input"
                placeholder={translate('en', 'admin.a01.signin_id_placeholder')}
                value={signInId}
                onChange={(e) => setSignInId(e.target.value)}
                disabled={screenState === 'loading'}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="a01-password" className="form-label">
                {translate('en', 'admin.a01.password_label')}
              </label>
              <input
                id="a01-password"
                data-testid="a01-password-input"
                type="password"
                className="form-input"
                placeholder={translate('en', 'admin.a01.password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={screenState === 'loading'}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-submit"
              data-testid="a01-continue-btn"
              disabled={screenState === 'loading'}
            >
              {screenState === 'loading'
                ? translate('en', 'admin.a01.checking_btn')
                : translate('en', 'admin.a01.continue_btn')}
            </button>
          </form>
        ) : (
          /* Step 2: Second Factor Verification (MFA) */
          <form onSubmit={handleStep2Submit} className="login-form" data-testid="a01-step2-form">
            <div className="mfa-notice-banner" data-testid="a01-mfa-notice">
              <div className="mfa-notice-title">{translate('en', 'admin.a01.mfa_title')}</div>
              <div className="mfa-notice-body">
                {translate('en', 'admin.a01.mfa_desc', { phone: pendingChallenge.phoneMasked })}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="a01-verification-code" className="form-label">
                {translate('en', 'admin.a01.mfa_code_label')}
              </label>
              <input
                id="a01-verification-code"
                data-testid="a01-mfa-code-input"
                type="text"
                className="form-input code-input"
                placeholder={translate('en', 'admin.a01.mfa_code_placeholder')}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={screenState === 'loading'}
                required
                autoFocus
                autoComplete="one-time-code"
              />
            </div>

            <div className="mfa-guidance">
              <small>{translate('en', 'admin.a01.mfa_setup_prompt')}</small>
            </div>

            <button
              type="submit"
              className="btn-submit"
              data-testid="a01-verify-btn"
              disabled={screenState === 'loading'}
            >
              {screenState === 'loading'
                ? translate('en', 'admin.a01.verifying_btn')
                : translate('en', 'admin.a01.verify_btn')}
            </button>
          </form>
        )}

        <div className="login-footer">
          <small>{translate('en', 'admin.a01.footer')}</small>
        </div>
      </div>
    </div>
  );
}

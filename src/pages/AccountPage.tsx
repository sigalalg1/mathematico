import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { useAuth } from '../auth/useAuth';
import './AccountPage.css';

type Mode = 'signIn' | 'signUp' | 'forgotPassword';

export function AccountPage() {
  const { t } = useTranslation();
  const { user, isConfigured, isPasswordRecovery, signIn, signUp, signOut, resetPassword, updatePassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  function describeError(code: string): string {
    if (code === 'unavailable') return t('auth.unavailable');
    if (code === 'unexpected') return t('auth.unexpectedError');
    return code;
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setMessage(null);
    setResetSent(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    if (mode === 'forgotPassword') {
      const result = await resetPassword(email);
      setSubmitting(false);
      if (result.error) {
        setError(describeError(result.error));
        return;
      }
      setResetSent(true);
      return;
    }

    const result = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password);

    setSubmitting(false);
    if (result.error) {
      setError(describeError(result.error));
      return;
    }
    setPassword('');
    if (mode === 'signUp') {
      setMessage(result.needsEmailConfirmation ? t('auth.signUpConfirmEmail') : t('auth.signUpSuccess'));
    }
  }

  async function handleSetNewPassword(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await updatePassword(newPassword);
    setSubmitting(false);
    if (result.error) {
      setError(describeError(result.error));
      return;
    }
    setNewPassword('');
    setPasswordUpdated(true);
  }

  async function handleSignOut() {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const result = await signOut();
    setSubmitting(false);
    if (result.error) setError(describeError(result.error));
  }

  return (
    <PageLayout title={t('auth.title')} backTo="/" backLabel={t('app.title')}>
      {!isConfigured && <p className="account-notice">{t('auth.unavailable')}</p>}

      {isPasswordRecovery ? (
        <div className="account-panel">
          <h2 className="account-subtitle">{t('auth.setNewPasswordTitle')}</h2>
          {passwordUpdated ? (
            <p className="account-message">{t('auth.setNewPasswordSuccess')}</p>
          ) : (
            <form className="account-form" onSubmit={handleSetNewPassword}>
              <label className="account-field">
                <span>{t('auth.newPassword')}</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  autoComplete="new-password"
                />
              </label>

              {error && <p className="account-error">{error}</p>}

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {t('auth.setNewPasswordAction')}
              </button>
            </form>
          )}
        </div>
      ) : user ? (
        <div className="account-panel">
          <p className="account-email">{user.email}</p>
          {error && <p className="account-error">{error}</p>}
          <button type="button" className="btn btn-primary" onClick={handleSignOut} disabled={submitting}>
            {t('auth.signOut')}
          </button>
        </div>
      ) : mode === 'forgotPassword' ? (
        <div className="account-panel">
          <h2 className="account-subtitle">{t('auth.forgotPasswordTitle')}</h2>
          {resetSent ? (
            <p className="account-message">{t('auth.resetPasswordSent')}</p>
          ) : (
            <form className="account-form" onSubmit={handleSubmit}>
              <label className="account-field">
                <span>{t('auth.email')}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </label>

              {error && <p className="account-error">{error}</p>}

              <button type="submit" className="btn btn-primary" disabled={submitting || !isConfigured}>
                {t('auth.resetPasswordAction')}
              </button>
            </form>
          )}
          <button type="button" className="btn btn-link account-back-link" onClick={() => switchMode('signIn')}>
            {t('auth.backToSignIn')}
          </button>
        </div>
      ) : (
        <div className="account-panel">
          <div className="account-tabs">
            <button
              type="button"
              className={`account-tab ${mode === 'signIn' ? 'is-active' : ''}`}
              onClick={() => switchMode('signIn')}
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              className={`account-tab ${mode === 'signUp' ? 'is-active' : ''}`}
              onClick={() => switchMode('signUp')}
            >
              {t('auth.signUp')}
            </button>
          </div>

          <form className="account-form" onSubmit={handleSubmit}>
            <label className="account-field">
              <span>{t('auth.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="account-field">
              <span>{t('auth.password')}</span>
              {/* Intentionally no length/complexity rules: any non-empty password
                  is accepted so young students can pick something simple. */}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              />
            </label>

            {mode === 'signIn' && (
              <button type="button" className="btn btn-link account-forgot-link" onClick={() => switchMode('forgotPassword')}>
                {t('auth.forgotPasswordLink')}
              </button>
            )}

            {error && <p className="account-error">{error}</p>}
            {message && <p className="account-message">{message}</p>}

            <button type="submit" className="btn btn-primary" disabled={submitting || !isConfigured}>
              {mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </form>

          <p className="account-guest-note">{t('auth.guestNote')}</p>
        </div>
      )}
    </PageLayout>
  );
}

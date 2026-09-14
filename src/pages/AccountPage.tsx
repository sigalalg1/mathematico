import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { useAuth } from '../auth/useAuth';
import './AccountPage.css';

type Mode = 'signIn' | 'signUp';

export function AccountPage() {
  const { t } = useTranslation();
  const { user, isConfigured, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function describeError(code: string): string {
    if (code === 'unavailable') return t('auth.unavailable');
    if (code === 'unexpected') return t('auth.unexpectedError');
    return code;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

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

      {user ? (
        <div className="account-panel">
          <p className="account-email">{user.email}</p>
          {error && <p className="account-error">{error}</p>}
          <button type="button" className="btn btn-primary" onClick={handleSignOut} disabled={submitting}>
            {t('auth.signOut')}
          </button>
        </div>
      ) : (
        <div className="account-panel">
          <div className="account-tabs">
            <button
              type="button"
              className={`account-tab ${mode === 'signIn' ? 'is-active' : ''}`}
              onClick={() => {
                setMode('signIn');
                setError(null);
                setMessage(null);
              }}
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              className={`account-tab ${mode === 'signUp' ? 'is-active' : ''}`}
              onClick={() => {
                setMode('signUp');
                setError(null);
                setMessage(null);
              }}
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

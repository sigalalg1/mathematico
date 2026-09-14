import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';
import './AccountPage.css';

type Mode = 'signIn' | 'signUp';

export function AccountPage() {
  const { t } = useTranslation();
  const { user, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const result = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password);

    setSubmitting(false);
    if (result.error) {
      setError(result.error === 'unavailable' ? t('auth.unavailable') : result.error);
      return;
    }
    if (mode === 'signUp') {
      setMessage(t('auth.signUpSuccess'));
    }
  }

  return (
    <PageLayout title={t('auth.title')} backTo="/" backLabel={t('app.title')}>
      {!supabase && <p className="account-notice">{t('auth.unavailable')}</p>}

      {user ? (
        <div className="account-panel">
          <p className="account-email">{user.email}</p>
          <button type="button" className="btn btn-primary" onClick={() => signOut()}>
            {t('auth.signOut')}
          </button>
        </div>
      ) : (
        <div className="account-panel">
          <div className="account-tabs">
            <button
              type="button"
              className={`account-tab ${mode === 'signIn' ? 'is-active' : ''}`}
              onClick={() => setMode('signIn')}
            >
              {t('auth.signIn')}
            </button>
            <button
              type="button"
              className={`account-tab ${mode === 'signUp' ? 'is-active' : ''}`}
              onClick={() => setMode('signUp')}
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
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              />
            </label>

            {error && <p className="account-error">{error}</p>}
            {message && <p className="account-message">{message}</p>}

            <button type="submit" className="btn btn-primary" disabled={submitting || !supabase}>
              {mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
            </button>
          </form>

          <p className="account-guest-note">{t('auth.guestNote')}</p>
        </div>
      )}
    </PageLayout>
  );
}

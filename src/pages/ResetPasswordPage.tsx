import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { useAuth } from '../auth/useAuth';
import './AccountPage.css';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { isPasswordRecovery, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function describeError(code: string): string {
    if (code === 'unavailable') return t('auth.unavailable');
    if (code === 'unexpected') return t('auth.unexpectedError');
    return code;
  }

  async function handleSubmit(event: FormEvent) {
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
    setDone(true);
  }

  return (
    <PageLayout title={t('auth.setNewPasswordTitle')} backTo="/account" backLabel={t('auth.title')}>
      <div className="account-panel">
        {done ? (
          <>
            <p className="account-message">{t('auth.setNewPasswordSuccess')}</p>
            <Link className="btn btn-primary" to="/account">
              {t('auth.backToSignIn')}
            </Link>
          </>
        ) : !isPasswordRecovery ? (
          <p className="account-notice">{t('auth.resetLinkInvalid')}</p>
        ) : (
          <form className="account-form" onSubmit={handleSubmit}>
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
    </PageLayout>
  );
}

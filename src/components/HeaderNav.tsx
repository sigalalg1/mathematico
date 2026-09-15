import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { InstallAppAction } from './InstallAppAction';
import './HeaderNav.css';

export function HeaderNav() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <nav className="header-nav" aria-label={t('nav.accountNavLabel')}>
      <InstallAppAction />
      <Link className="header-nav-link" to="/activity">
        {t('activity.navLabel')}
      </Link>
      <Link className="header-nav-link" to="/account">
        {user ? t('auth.account') : t('auth.signIn')}
      </Link>
    </nav>
  );
}

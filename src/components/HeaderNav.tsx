import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import { InstallAppAction } from './InstallAppAction';
import { PersonIcon, ProgressIcon } from './icons';
import './HeaderNav.css';

export function HeaderNav() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <nav className="header-nav" aria-label={t('nav.accountNavLabel')}>
      <InstallAppAction />
      <Link className="header-nav-link" to="/activity">
        <ProgressIcon className="header-nav-icon" />
        <span className="header-nav-link-label">{t('activity.navLabel')}</span>
      </Link>
      <Link className="header-nav-link" to="/account">
        <PersonIcon className="header-nav-icon" />
        <span className="header-nav-link-label">{user ? t('auth.account') : t('auth.signIn')}</span>
      </Link>
    </nav>
  );
}

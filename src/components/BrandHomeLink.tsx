import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import './BrandHomeLink.css';

interface BrandHomeLinkProps {
  /** Collapses the lockup to the bare symbol on narrow screens. */
  responsiveMark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tagline?: boolean;
}

export function BrandHomeLink({ responsiveMark = false, size = 'md', tagline = false }: BrandHomeLinkProps) {
  const { t } = useTranslation();

  return (
    <Link
      className={`brand-home-link${responsiveMark ? ' brand-home-link-responsive' : ''}`}
      to="/"
      aria-label={t('app.homeLabel')}
    >
      <BrandLogo size={size} tagline={tagline} />
    </Link>
  );
}

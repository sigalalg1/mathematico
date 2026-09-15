import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './BrandHomeLink.css';

interface BrandHomeLinkProps {
  responsiveMark?: boolean;
}

export function BrandHomeLink({ responsiveMark = false }: BrandHomeLinkProps) {
  const { t } = useTranslation();

  return (
    <Link
      className={`brand-home-link${responsiveMark ? ' brand-home-link-responsive' : ''}`}
      to="/"
      aria-label={t('app.homeLabel')}
    >
      <img
        className="brand-logo"
        src="/brand/matika-logo.png"
        width="1606"
        height="476"
        alt=""
      />
      {responsiveMark && (
        <img
          className="brand-mark"
          src="/brand/matika-mark.png"
          width="406"
          height="460"
          alt=""
        />
      )}
    </Link>
  );
}

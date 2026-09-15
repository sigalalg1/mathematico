import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandHomeLink } from './BrandHomeLink';
import { HeaderNav } from './HeaderNav';
import { LanguageSwitcher } from './LanguageSwitcher';
import './PageLayout.css';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  /** `game` shrinks the page chrome and widens the content so a game scene can own the viewport. */
  variant?: 'default' | 'game';
  brandTitle?: boolean;
  children: ReactNode;
}

export function PageLayout({
  title,
  subtitle,
  backTo,
  backLabel,
  variant = 'default',
  brandTitle = false,
  children,
}: PageLayoutProps) {
  return (
    <div className={`page${variant === 'game' ? ' page-game' : ''}`}>
      <header className="page-header">
        <div className="page-header-bar">
          <div className="page-header-navigation">
            {backTo ? (
              <Link className="back-link" to={backTo}>
                <span className="back-link-arrow" aria-hidden="true">
                  ←
                </span>
                {backLabel ?? 'Back'}
              </Link>
            ) : (
              <span />
            )}
          </div>
          {!brandTitle && <BrandHomeLink responsiveMark />}
          <div className="page-header-actions">
            <HeaderNav />
            <LanguageSwitcher />
          </div>
        </div>
        <div className="page-header-titles">
          {brandTitle ? (
            <h1 className="page-brand-title" aria-label={title}>
              <BrandHomeLink />
            </h1>
          ) : (
            <h1 className="page-title">{title}</h1>
          )}
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </header>
      <main className="page-content">{children}</main>
    </div>
  );
}

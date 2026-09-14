import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HeaderNav } from './HeaderNav';
import { LanguageSwitcher } from './LanguageSwitcher';
import './PageLayout.css';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
}

export function PageLayout({ title, subtitle, backTo, backLabel, children }: PageLayoutProps) {
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-bar">
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
          <div className="page-header-actions">
            <HeaderNav />
            <LanguageSwitcher />
          </div>
        </div>
        <div className="page-header-titles">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </header>
      <main className="page-content">{children}</main>
    </div>
  );
}

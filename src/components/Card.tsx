import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Card.css';

interface CardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  to?: string;
  disabled?: boolean;
  statusBadge?: ReactNode;
  /** `tile` is the grid card; `row` is the full-width list row used for topic and activity listings. */
  layout?: 'tile' | 'row';
  /** Secondary brand accent, used to vary adjacent cards without turning the UI into a rainbow. */
  accent?: 'mint' | 'purple';
}

export function Card({
  title,
  description,
  icon,
  to,
  disabled,
  statusBadge,
  layout = 'tile',
  accent = 'mint',
}: CardProps) {
  const { t } = useTranslation();
  const className = `card card-${layout} card-accent-${accent}`;
  const comingSoon = t('common.comingSoon');
  // Placeholder topics use the coming-soon text as their description; showing
  // it next to the badge would simply repeat the same word twice.
  const shownDescription = description === comingSoon ? undefined : description;

  const content = (
    <>
      {icon && (
        <span className="card-icon" dir="ltr" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="card-body">
        <h3 className="card-title">{title}</h3>
        {shownDescription && <p className="card-description">{shownDescription}</p>}
        {disabled && <span className="card-badge">{comingSoon}</span>}
      </span>
      {statusBadge && <span className="card-status-badge">{statusBadge}</span>}
      {!disabled && to && layout === 'row' && (
        <span className="card-chevron" aria-hidden="true">
          ›
        </span>
      )}
    </>
  );

  if (disabled || !to) {
    return (
      <div className={`${className} card-disabled`} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link className={className} to={to}>
      {content}
    </Link>
  );
}

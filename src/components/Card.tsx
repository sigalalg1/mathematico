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
}

export function Card({ title, description, icon, to, disabled, statusBadge }: CardProps) {
  const { t } = useTranslation();
  const content = (
    <>
      {statusBadge && <span className="card-status-badge">{statusBadge}</span>}
      {icon && <span className="card-icon">{icon}</span>}
      <h3 className="card-title">{title}</h3>
      {description && <p className="card-description">{description}</p>}
      {disabled && <span className="card-badge">{t('common.comingSoon')}</span>}
    </>
  );

  if (disabled || !to) {
    return (
      <div className="card card-disabled" aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link className="card" to={to}>
      {content}
    </Link>
  );
}

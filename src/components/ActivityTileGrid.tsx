import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ActivityIcon } from './ActivityIcons';
import type { PastelTone } from './activityTones';
import './ActivityTileGrid.css';

/**
 * The colourful activity listing used by grades 3–4.
 *
 * Deliberately a sibling of `Card` rather than a variant of it: the dark row
 * card is still the app-wide default (grade selection, topic lists, grade 7)
 * and must not shift when this playful treatment changes. Here the page shell
 * stays dark and only the tiles are pastel, each carrying dark ink for
 * contrast.
 */

function ArrowGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h13" />
      <path d="m12.5 5.5 6.5 6.5-6.5 6.5" />
    </svg>
  );
}

function SparkGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2.5c.7 4.6 2.2 6.1 6.8 6.8-4.6.7-6.1 2.2-6.8 6.8-.7-4.6-2.2-6.1-6.8-6.8 4.6-.7 6.1-2.2 6.8-6.8Z" />
      <path d="M18.6 15.2c.35 2.3 1.1 3.05 3.4 3.4-2.3.35-3.05 1.1-3.4 3.4-.35-2.3-1.1-3.05-3.4-3.4 2.3-.35 3.05-1.1 3.4-3.4Z" />
    </svg>
  );
}

interface ActivityTileProps {
  /** Activity id — also the key for the topic-specific glyph. */
  activityId: string;
  /** 1-based position shown as the card's numbered badge. */
  index: number;
  title: string;
  description?: string;
  to: string;
  tone: PastelTone;
  completedLabel?: string;
}

export function ActivityTile({
  activityId,
  index,
  title,
  description,
  to,
  tone,
  completedLabel,
}: ActivityTileProps) {
  return (
    <Link className={`atile atile-${tone}`} to={to}>
      <span className="atile-top">
        <span className="atile-index" dir="ltr">
          {index}.
        </span>
        <span className="atile-icon" aria-hidden="true">
          <ActivityIcon activityId={activityId} className="atile-icon-svg" />
        </span>
        {completedLabel && <span className="atile-done">{completedLabel}</span>}
      </span>
      <span className="atile-body">
        <span className="atile-title">{title}</span>
        {description && <span className="atile-description">{description}</span>}
      </span>
      <span className="atile-arrow" aria-hidden="true">
        <ArrowGlyph />
      </span>
    </Link>
  );
}

export function ActivityTileGrid({ children }: { children: ReactNode }) {
  return <div className="atile-grid">{children}</div>;
}

/**
 * Decorative sparkles + topic glyph shown beside an activity listing title.
 * Purely ornamental, so it is hidden from assistive technology.
 */
export function TitleSparkles({ children }: { children?: ReactNode }) {
  return (
    <span className="atitle-accent" aria-hidden="true">
      <SparkGlyph className="atitle-spark" />
      {children && <span className="atitle-motif">{children}</span>}
      <SparkGlyph className="atitle-spark atitle-spark-sm" />
    </span>
  );
}

interface PracticeBannerProps {
  /** Existing back destination for this unit — never a new route. */
  backTo: string;
  backLabel: string;
}

/**
 * Closing encouragement strip. The progress link points at `/activity`, the
 * app's real "my activity" screen; nothing here invents a destination.
 */
export function PracticeBanner({ backTo, backLabel }: PracticeBannerProps) {
  const { t } = useTranslation();

  return (
    <aside className="apractice-banner">
      <span className="apractice-star" aria-hidden="true">
        <SparkGlyph />
      </span>
      <div className="apractice-copy">
        <p className="apractice-title">{t('activityList.bannerTitle')}</p>
        <p className="apractice-text">{t('activityList.bannerText')}</p>
      </div>
      <div className="apractice-actions">
        <Link className="apractice-link" to="/activity">
          {t('activityList.progressLink')}
        </Link>
        <Link className="apractice-back" to={backTo}>
          {backLabel}
        </Link>
      </div>
    </aside>
  );
}

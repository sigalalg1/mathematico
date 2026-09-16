import { useTranslation } from 'react-i18next';
import './BrandLogo.css';

/**
 * The Mathletica symbol: two mint diagonal strokes with a single purple dot.
 * It is a fixed piece of brand artwork, so it never mirrors in RTL and never
 * inherits text colour — the two brand colours are part of the mark itself.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={`brand-mark${className ? ` ${className}` : ''}`}
      viewBox="0 0 48 48"
      role="presentation"
      focusable="false"
      aria-hidden="true"
    >
      <g
        stroke="var(--mint)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      >
        <line x1="11" y1="38" x2="24" y2="11" />
        <line x1="26" y1="30" x2="37" y2="11" />
      </g>
      <circle cx="35.5" cy="36" r="5" fill="var(--purple)" />
    </svg>
  );
}

interface BrandLogoProps {
  /** `auto` follows the active interface language. */
  lang?: 'he' | 'en' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  /** Shows the supporting tagline underneath the wordmark. */
  tagline?: boolean;
  className?: string;
}

const WORDMARK: Record<'he' | 'en', string> = {
  he: 'מתלטיקה',
  en: 'Mathletica',
};

const TAGLINE: Record<'he' | 'en', string> = {
  he: 'מתמטיקה קלה יותר',
  en: 'Math made lighter.',
};

/**
 * Horizontal lockup: symbol + wordmark (+ optional tagline). The wordmark is
 * real text rather than outlines so both scripts stay crisp at small mobile
 * sizes and remain readable by assistive technology.
 */
export function BrandLogo({ lang = 'auto', size = 'md', tagline = false, className }: BrandLogoProps) {
  const { i18n } = useTranslation();
  const resolved: 'he' | 'en' = lang === 'auto' ? (i18n.language.startsWith('he') ? 'he' : 'en') : lang;

  return (
    <span className={`brand-logo brand-logo-${size}${className ? ` ${className}` : ''}`}>
      <BrandMark />
      <span className="brand-logo-text" lang={resolved} dir={resolved === 'he' ? 'rtl' : 'ltr'}>
        <span className="brand-logo-wordmark">{WORDMARK[resolved]}</span>
        {tagline && <span className="brand-logo-tagline">{TAGLINE[resolved]}</span>}
      </span>
    </span>
  );
}

/**
 * Square app-icon treatment — the same symbol centred on a dark rounded tile.
 * Used for in-app icon previews; the shipped PWA/favicon assets are generated
 * from the identical geometry.
 */
export function BrandAppIcon({ className }: { className?: string }) {
  return (
    <span className={`brand-app-icon${className ? ` ${className}` : ''}`} aria-hidden="true">
      <BrandMark />
    </span>
  );
}

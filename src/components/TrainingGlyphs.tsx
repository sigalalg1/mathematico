import './TrainingGlyphs.css';

/**
 * Abstract brand graphic for the home screen: a multiplication mark, a rising
 * trend line and a geometric figure in motion. Purely decorative and
 * deliberately not an illustration or mascot — it is drawn from the same
 * mathematical/diagonal language as the logo.
 */
export function TrainingGlyphs() {
  return (
    <svg
      className="training-glyphs"
      viewBox="0 0 220 64"
      role="presentation"
      focusable="false"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="var(--mint)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* × */}
        <path d="M12 20 32 44" />
        <path d="M32 20 12 44" />

        {/* rising trend */}
        <path d="M70 46 88 30 100 38 120 16" />
        <path d="M120 16h-9M120 16v9" stroke="var(--purple)" />

        {/* figure in motion */}
        <path d="M172 24l10 8-8 12" />
        <path d="M182 32h14" stroke="var(--purple)" />
        <path d="M170 44l-8 6" />
      </g>
      <circle cx="170" cy="14" r="5" fill="var(--purple)" />
      <circle cx="56" cy="44" r="3" fill="var(--blue)" />
    </svg>
  );
}

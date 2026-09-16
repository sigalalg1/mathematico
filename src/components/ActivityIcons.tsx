/**
 * Topic-specific activity glyphs for the grade 3–4 activity listings.
 *
 * Flat, single-weight shapes drawn in `currentColor` so they inherit the ink
 * colour of whatever surface they sit on. They are looked up by activity id
 * (`activityIcon(id)`), which keeps them reusable: the same glyph can later be
 * shown inside the activity itself without duplicating any SVG.
 */

import type { ReactElement } from 'react';

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
} as const;

type GlyphProps = { className?: string };
type Glyph = (props: GlyphProps) => ReactElement;

/** A circle with one shaded wedge — the "part of a whole" motif. */
const PieHalf: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 3.8v16.4" />
    <path d="M12 3.8A8.2 8.2 0 0 1 12 20.2Z" fill="currentColor" stroke="none" opacity="0.32" />
  </svg>
);

/** Stacked numerator over denominator. */
const FractionBar: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M4.4 12h15.2" />
    <path d="M8.6 4.2h1.6v5.2" />
    <path d="M7.8 9.4h3.6" />
    <rect x="13.2" y="14.8" width="5.2" height="5.2" rx="1.8" />
    <path d="M5.6 14.8h4.4v5.2H5.6z" fill="currentColor" stroke="none" opacity="0.3" />
    <rect x="5.6" y="14.8" width="4.4" height="5.2" rx="1.8" />
  </svg>
);

/** Magnifier over a slice — hunting for the right fraction. */
const SearchPie: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <circle cx="10.6" cy="10.6" r="6.2" />
    <path d="M10.6 4.4v6.2h6.2" />
    <path d="m15.4 15.4 4.2 4.2" />
  </svg>
);

/** Two halves clicking together into one whole. */
const WholeFromParts: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M11 4.4a7.6 7.6 0 0 0 0 15.2Z" fill="currentColor" stroke="none" opacity="0.32" />
    <path d="M11 4.4a7.6 7.6 0 0 0 0 15.2z" />
    <path d="M13.4 4.6a7.6 7.6 0 0 1 0 14.8" strokeDasharray="2.6 2.4" />
  </svg>
);

/** Two differently-cut bars that hold the same amount. */
const EqualBars: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <rect x="3.2" y="5" width="17.6" height="5" rx="1.6" />
    <path d="M12 5v5" />
    <path d="M3.2 5h8.8v5H3.2z" fill="currentColor" stroke="none" opacity="0.32" />
    <rect x="3.2" y="14" width="17.6" height="5" rx="1.6" />
    <path d="M7.6 14v5M12 14v5M16.4 14v5" />
    <path d="M3.2 14h8.8v5H3.2z" fill="currentColor" stroke="none" opacity="0.32" />
  </svg>
);

/** A number line with a marked point. */
const NumberLineGlyph: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M2.6 13.4h18.8" />
    <path d="M5.6 8.6v9.6M12 8.6v9.6M18.4 8.6v9.6" />
    <circle cx="15.2" cy="13.4" r="2.3" fill="currentColor" stroke="none" />
  </svg>
);

/** A balance scale — which side is greater. */
const Balance: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M12 4.6v14.8" />
    <path d="M6.5 19.4h11" />
    <path d="M4 8.4h16" />
    <path d="M4 8.4 1.8 13.2h4.4zM20 8.4l-2.2 4.8h4.4" />
  </svg>
);

/** A group of counters with some of them selected. */
const Collection: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <circle cx="7.4" cy="7.4" r="2.6" fill="currentColor" stroke="none" opacity="0.38" />
    <circle cx="7.4" cy="7.4" r="2.6" />
    <circle cx="16.6" cy="7.4" r="2.6" />
    <circle cx="7.4" cy="16.6" r="2.6" fill="currentColor" stroke="none" opacity="0.38" />
    <circle cx="7.4" cy="16.6" r="2.6" />
    <circle cx="16.6" cy="16.6" r="2.6" />
  </svg>
);

/** A pizza slice. */
const PizzaSlice: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M12 3.4 20.4 19a22 22 0 0 1-16.8 0z" />
    <path d="M5.4 15.4a18 18 0 0 1 13.2 0" />
    <circle cx="10" cy="16.6" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="14.4" cy="16.8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12.1" cy="12.4" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

/** A trophy — the closing challenge of a unit. */
const Trophy: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M7.4 4.4h9.2v4.2a4.6 4.6 0 0 1-9.2 0z" />
    <path d="M7.4 5.8H5a2.4 2.4 0 0 0 2.4 3.6M16.6 5.8H19a2.4 2.4 0 0 1-2.4 3.6" />
    <path d="M12 13.2v3.4M8.6 19.6h6.8l-.8-3H9.4z" />
  </svg>
);

/** An open angle between two rays. */
const AngleGlyph: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M4.6 18.4h15" />
    <path d="M4.6 18.4 17.4 6.2" />
    <path d="M11.6 18.4a7 7 0 0 0-1.1-3.8" />
  </svg>
);

/** A right-angle marker. */
const RightAngle: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M5 4.6v14.8h14.4" />
    <path d="M5 15.4h4v4" />
    <path d="M12.6 19.4a8 8 0 0 0-1.4-4.4" opacity="0.6" />
  </svg>
);

/** A target — spotting angles in the wild. */
const Target: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <circle cx="12" cy="12" r="8.2" />
    <circle cx="12" cy="12" r="4.4" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

/** A protractor. */
const Protractor: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M3.6 17.6a8.4 8.4 0 0 1 16.8 0z" />
    <path d="M3.6 17.6h16.8" />
    <path d="M12 17.6V9.2" />
    <path d="m12 17.6 5.4-4.6" />
  </svg>
);

/** A polygon with its interior angles marked. */
const AnglesInShape: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M4.4 19.2 8.6 5.2l10.8 5.6-5.4 8.4z" />
    <path d="M7.2 19.2a3 3 0 0 0-.5-2M11.6 19.2a3 3 0 0 0 1.8-1.4" opacity="0.7" />
  </svg>
);

/** A plain triangle. */
const Triangle: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M12 4.4 20.4 19H3.6z" />
  </svg>
);

/** A triangle with side tick marks — classified by its sides. */
const TriangleSides: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M12 4.4 20.4 19H3.6z" />
    <path d="m6.9 12.4 1.7 1M17.1 12.4l-1.7 1M11.1 19h1.8" />
  </svg>
);

/** A triangle with an angle arc — classified by its angles. */
const TriangleAngles: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M12 4.4 20.4 19H3.6z" />
    <path d="M6.9 19a3.6 3.6 0 0 1 .9-2.4M17.1 19a3.6 3.6 0 0 0-.9-2.4" />
  </svg>
);

/** A triangle on a workbench — the build-and-test lab. */
const TriangleLab: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M12 3.8 18.6 15H5.4z" />
    <path d="M3.4 18.4h17.2" />
    <path d="M6.4 18.4v2.2M17.6 18.4v2.2" />
  </svg>
);

/** A riddle card. */
const Riddle: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <rect x="4" y="3.8" width="16" height="16.4" rx="3" />
    <path d="M9.6 9.6a2.5 2.5 0 1 1 3 2.45V14" />
    <circle cx="12.6" cy="17" r="1.05" fill="currentColor" stroke="none" />
  </svg>
);

/** A rotation arrow around a pivot. */
const Rotation: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M19.2 12a7.2 7.2 0 1 1-2.6-5.55" />
    <path d="M17.4 3.4v3.4H14" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

/** A balloon — the multiplication arcade game. */
const Balloon: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="M12 3.4c3.2 0 5.4 2.6 5.4 6 0 3.6-2.6 6.2-5.4 6.2S6.6 13 6.6 9.4c0-3.4 2.2-6 5.4-6z" />
    <path d="M12 15.6v1.6" />
    <path d="M12 17.2c1.6.9 1.6 2.5 0 3.4" />
  </svg>
);

/** A times-table grid with one cell lit — the multiplication fluency drill. */
const TimesTable: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="3" />
    <path d="M3.4 9.1h17.2M3.4 14.9h17.2M9.1 3.4v17.2M14.9 3.4v17.2" />
    <path d="M14.9 9.1h5.7v5.8h-5.7z" fill="currentColor" stroke="none" opacity="0.34" />
  </svg>
);

/** Generic fallback: a star, so a card is never left without a glyph. */
const Star: Glyph = ({ className }) => (
  <svg className={className} {...BASE}>
    <path d="m12 4 2.5 5.2 5.5.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.5-.8z" />
  </svg>
);

const ACTIVITY_GLYPHS: Record<string, Glyph> = {
  /* Grade 4 — Fractions, part 1 */
  'build-a-fraction': PieHalf,
  'numerator-denominator': FractionBar,
  'find-the-fraction': SearchPie,
  'build-the-whole': WholeFromParts,
  'same-fraction': EqualBars,
  'fraction-number-line': NumberLineGlyph,
  'which-is-greater': Balance,
  'fraction-of-collection': Collection,
  'fraction-pizzeria': PizzaSlice,
  'fractions-challenge': Trophy,

  /* Grade 3 — Angles and triangles */
  'meet-the-angle': AngleGlyph,
  'angle-types': RightAngle,
  'angle-hunter': Target,
  'build-an-angle': Protractor,
  'find-the-angles': AnglesInShape,
  'meet-the-triangle': Triangle,
  'triangles-by-sides': TriangleSides,
  'triangles-by-angles': TriangleAngles,
  'triangle-lab': TriangleLab,
  'who-am-i': Riddle,
  rotation: Rotation,
  'geometry-challenge': Trophy,

  /* Grade 4 — Multiplication */
  multiplicationTables: TimesTable,
  monkeyBalloonShooter: Balloon,
};

export { PieHalf as FractionPieGlyph };

/** The glyph for an activity id, falling back to a star for unknown ids. */
export function ActivityIcon({ activityId, className }: { activityId: string; className?: string }) {
  const Glyph = ACTIVITY_GLYPHS[activityId] ?? Star;
  return <Glyph className={className} />;
}

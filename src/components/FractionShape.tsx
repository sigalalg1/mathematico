import type { CSSProperties, KeyboardEvent } from 'react';
import type { FractionShapeKind } from '../types/fractionShape';
import { buildFractionPieces, separationOffset, FRACTION_VIEW } from '../utils/fractionShapeGeometry';
import './FractionShape.css';

interface FractionShapeProps {
  /** Which whole to draw. The fraction model underneath is identical for all of them. */
  shape: FractionShapeKind;
  /** How many equal pieces the whole is currently cut into. `1` is an uncut whole. */
  pieces: number;
  /** Indices of the pieces that are taken. */
  selected?: number[];
  /** Makes pieces tappable; omit for a read-only display. */
  onTogglePiece?: (index: number) => void;
  /** Draws the pieces deliberately unequal — only used by the equal-parts lesson. */
  unequal?: boolean;
  /** `cut` pushes the pieces apart so the child can see they really did separate. */
  separated?: boolean;
  /** Accessible label per piece, e.g. "piece 2 of 4". */
  pieceLabel?: (index: number) => string;
  className?: string;
  'data-testid'?: string;
}

/**
 * The reusable visual whole: one fraction model (denominator = piece count,
 * numerator = how many are selected), three interchangeable outlines.
 *
 * The shape is a pure rendering choice — nothing about the maths, selection or
 * interaction changes between a pie, a chocolate bar and a block.
 */
export function FractionShape({
  shape,
  pieces,
  selected = [],
  onTogglePiece,
  unequal = false,
  separated = false,
  pieceLabel,
  className,
  'data-testid': testId,
}: FractionShapeProps) {
  const geometry = buildFractionPieces(shape, pieces, unequal);
  const selectedSet = new Set(selected);
  const interactive = Boolean(onTogglePiece);

  function handleKeyDown(event: KeyboardEvent<SVGPathElement>, index: number) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onTogglePiece?.(index);
  }

  const classes = ['fraction-shape', `fraction-shape-${shape}`];
  if (separated) classes.push('fraction-shape-separated');
  if (unequal) classes.push('fraction-shape-unequal');
  if (interactive) classes.push('fraction-shape-interactive');
  if (className) classes.push(className);

  return (
    <svg
      viewBox={`0 0 ${FRACTION_VIEW} ${FRACTION_VIEW}`}
      className={classes.join(' ')}
      data-testid={testId}
      focusable="false"
      style={{ '--fs-piece-count': geometry.length } as CSSProperties}
    >
      {geometry.map((piece) => {
        const isSelected = selectedSet.has(piece.index);
        const offset = separationOffset(piece);
        const pieceClasses = ['fs-piece'];
        if (isSelected) pieceClasses.push('fs-piece-selected');

        return (
          <path
            key={piece.index}
            d={piece.path}
            className={pieceClasses.join(' ')}
            data-testid={`fraction-piece-${piece.index}`}
            data-selected={isSelected ? 'true' : 'false'}
            style={
              {
                '--fs-dx': offset.dx.toFixed(3),
                '--fs-dy': offset.dy.toFixed(3),
                '--fs-delay': `${piece.index * 55}ms`,
              } as CSSProperties
            }
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-pressed={interactive ? isSelected : undefined}
            aria-label={pieceLabel?.(piece.index)}
            onClick={interactive ? () => onTogglePiece?.(piece.index) : undefined}
            onKeyDown={interactive ? (event) => handleKeyDown(event, piece.index) : undefined}
          />
        );
      })}
    </svg>
  );
}

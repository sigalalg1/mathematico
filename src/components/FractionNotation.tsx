import { MathText } from './MathText';
import './FractionNotation.css';

export type FractionHighlight = 'none' | 'numerator' | 'denominator' | 'both';

interface FractionNotationProps {
  numerator: number;
  denominator: number;
  /** Which half of the fraction the lesson is pointing at right now. */
  highlight?: FractionHighlight;
  size?: 'sm' | 'md' | 'lg';
  /** Replaces the numerator digits with a placeholder while it is still unknown. */
  unknownNumerator?: boolean;
  className?: string;
  'data-testid'?: string;
}

/**
 * A stacked fraction (numerator over a bar over denominator).
 *
 * Built on MathText so the notation keeps its own LTR direction inside Hebrew
 * RTL text: the numerator is always on top and the denominator always below,
 * whichever way the surrounding paragraph runs.
 *
 * Props-driven on purpose — future fraction games (comparing, equivalence)
 * render the same component with different numbers and highlights.
 */
export function FractionNotation({
  numerator,
  denominator,
  highlight = 'none',
  size = 'md',
  unknownNumerator = false,
  className,
  'data-testid': testId,
}: FractionNotationProps) {
  const numeratorText = unknownNumerator ? '?' : String(numerator);
  const classes = ['fraction', `fraction-${size}`];
  if (className) classes.push(className);

  return (
    <MathText className={classes.join(' ')}>
      <span
        className="fraction-inner"
        role="math"
        aria-label={`${numeratorText}/${denominator}`}
        data-testid={testId}
      >
        <span className={`fraction-part fraction-numerator${highlight === 'numerator' || highlight === 'both' ? ' fraction-lit' : ''}`}>
          {numeratorText}
        </span>
        <span className="fraction-bar" aria-hidden="true" />
        <span className={`fraction-part fraction-denominator${highlight === 'denominator' || highlight === 'both' ? ' fraction-lit' : ''}`}>
          {denominator}
        </span>
      </span>
    </MathText>
  );
}

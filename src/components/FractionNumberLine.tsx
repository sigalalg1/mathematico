import { FractionNotation } from './FractionNotation';
import './FractionLearningVisuals.css';

interface FractionNumberLineProps {
  denominator: number;
  markedNumerator?: number;
  interactive?: boolean;
  selectedNumerator?: number | null;
  onSelect?: (numerator: number) => void;
  label?: string;
}

/**
 * A 0–1 number line divided into equal parts.
 *
 * The line never names the marked point. Reading the mark is the whole task in
 * "which fraction is marked?", so only the 0 and 1 anchors and the child's own
 * selection carry a value — and in read-only mode the ticks are inert spans, so
 * the fraction is not leaked through an accessible name either.
 */
export function FractionNumberLine({
  denominator,
  markedNumerator,
  interactive = false,
  selectedNumerator,
  onSelect,
  label,
}: FractionNumberLineProps) {
  return (
    <div className="fraction-number-line" role={interactive ? 'group' : 'img'} aria-label={label} dir="ltr">
      <span className="fnl-track" aria-hidden="true" />
      {Array.from({ length: denominator + 1 }, (_, numerator) => {
        const marked = numerator === markedNumerator;
        const selected = numerator === selectedNumerator;
        const className = `fnl-point${marked ? ' fnl-point-marked' : ''}${selected ? ' fnl-point-selected' : ''}`;
        const style = { insetInlineStart: `${(numerator / denominator) * 100}%` };
        const body = (
          <>
            <span className="fnl-dot" />
            <span className="fnl-label">
              {numerator === 0 || numerator === denominator ? (
                numerator === 0 ? '0' : '1'
              ) : selected ? (
                <FractionNotation numerator={numerator} denominator={denominator} size="sm" />
              ) : (
                <span aria-hidden="true">?</span>
              )}
            </span>
          </>
        );

        if (!interactive) {
          return (
            <span key={numerator} className={className} style={style} aria-hidden="true">
              {body}
            </span>
          );
        }

        return (
          <button
            key={numerator}
            type="button"
            className={className}
            style={style}
            onClick={() => onSelect?.(numerator)}
            aria-label={`${numerator}/${denominator}`}
            aria-pressed={selected}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}

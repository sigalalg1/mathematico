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
        return (
          <button
            key={numerator}
            type="button"
            className={`fnl-point${marked ? ' fnl-point-marked' : ''}${selected ? ' fnl-point-selected' : ''}`}
            style={{ insetInlineStart: `${(numerator / denominator) * 100}%` }}
            disabled={!interactive}
            onClick={() => onSelect?.(numerator)}
            aria-label={`${numerator}/${denominator}`}
            aria-pressed={interactive ? selected : undefined}
          >
            <span className="fnl-dot" />
            <span className="fnl-label">
              {numerator === 0 || numerator === denominator ? (
                numerator === 0 ? (
                  '0'
                ) : (
                  '1'
                )
              ) : marked || selected ? (
                <FractionNotation numerator={numerator} denominator={denominator} size="sm" />
              ) : (
                <span aria-hidden="true">?</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

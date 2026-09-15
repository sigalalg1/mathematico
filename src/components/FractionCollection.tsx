import './FractionLearningVisuals.css';

interface FractionCollectionProps {
  total: number;
  selected: number;
  selectedIndices?: number[];
  onToggle?: (index: number) => void;
  label?: string;
}

const SYMBOLS = ['●', '★', '◆', '▲'];

export function FractionCollection({ total, selected, selectedIndices, onToggle, label }: FractionCollectionProps) {
  const active = new Set(selectedIndices ?? Array.from({ length: selected }, (_, index) => index));
  return (
    <div className="fraction-collection" role="img" aria-label={label}>
      {Array.from({ length: total }, (_, index) => {
        const Element = onToggle ? 'button' : 'span';
        return (
        <Element
          key={index}
          type={onToggle ? 'button' : undefined}
          className={`collection-item${active.has(index) ? ' collection-item-selected' : ''}`}
          aria-label={onToggle ? `${index + 1}/${total}` : undefined}
          aria-pressed={onToggle ? active.has(index) : undefined}
          aria-hidden={onToggle ? undefined : true}
          onClick={onToggle ? () => onToggle(index) : undefined}
        >
          {SYMBOLS[index % SYMBOLS.length]}
        </Element>
        );
      })}
    </div>
  );
}

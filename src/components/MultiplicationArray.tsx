import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import './MultiplicationArray.css';

interface MultiplicationArrayProps {
  rows: number;
  columns: number;
  visibleCount?: number;
  ghostCount?: number;
  compact?: boolean;
  selected?: boolean;
  animated?: boolean;
  testId?: string;
}

/** A reusable, semantic rows × columns block structure. */
export function MultiplicationArray({
  rows,
  columns,
  visibleCount = rows * columns,
  ghostCount = 0,
  compact = false,
  selected = false,
  animated = false,
  testId,
}: MultiplicationArrayProps) {
  const { t } = useTranslation();
  const total = rows * columns;
  return (
    <div
      className={`multiplication-array${compact ? ' multiplication-array-compact' : ''}${selected ? ' multiplication-array-selected' : ''}`}
      style={{ '--array-columns': columns, '--array-rows': rows } as CSSProperties}
      role="img"
      aria-label={t('blockBuilders.a11y.array', { rows, columns, count: total })}
      data-testid={testId}
    >
      {Array.from({ length: total }, (_, index) => {
        const visible = index < visibleCount;
        const ghost = !visible && index < visibleCount + ghostCount;
        return (
          <span
            key={index}
            className={`multiplication-block${visible ? '' : ghost ? ' multiplication-block-ghost' : ' multiplication-block-empty'}${animated ? ' multiplication-block-arrive' : ''}`}
            style={{ '--block-index': index } as CSSProperties}
            data-block={visible ? 'visible' : ghost ? 'ghost' : 'empty'}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

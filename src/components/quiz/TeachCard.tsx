import { useTranslation } from 'react-i18next';
import type { TeachStep } from '../../types/teachStep';
import { CoordinateGrid } from '../CoordinateGrid';
import { MathText } from '../MathText';
import './TeachCard.css';

interface TeachCardProps {
  step: TeachStep;
  onContinue: () => void;
}

export function TeachCard({ step, onContinue }: TeachCardProps) {
  const { t } = useTranslation();
  const { visual } = step;

  return (
    <div className="teach-card">
      <span className="teach-card-eyebrow">{t('vocabulary.newTerm')}</span>
      <h2 className="teach-card-term">{t(step.termKey)}</h2>
      <p className="teach-card-definition">{t(step.definitionKey)}</p>

      <CoordinateGrid
        highlight={visual.highlight ?? null}
        point={visual.point ?? null}
        highlightOrigin={visual.highlightOrigin}
        quadrant={visual.quadrant ?? null}
      />

      {visual.pair && (
        <MathText className="teach-card-pair">
          (
          <span className={visual.emphasize === 'x' ? 'pair-emphasis' : undefined}>{visual.pair[0]}</span>
          {', '}
          <span className={visual.emphasize === 'y' ? 'pair-emphasis' : undefined}>{visual.pair[1]}</span>)
        </MathText>
      )}

      <button type="button" className="btn btn-primary" onClick={onContinue}>
        {t('quiz.actions.gotIt')}
      </button>
    </div>
  );
}

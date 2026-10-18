import { useTranslation } from 'react-i18next';
import './PlayModeToggle.css';

/**
 * Chosen once on the setup screen, same as difficulty or question count —
 * not something that changes mid-run. "Standard" is always the default, so
 * a student (or a skill whose template mix doesn't suit a sports picker)
 * never has to opt out of anything.
 */
export function PlayModeToggle({ playful, onChange }: { playful: boolean; onChange: (playful: boolean) => void }) {
  const { t } = useTranslation();
  return (
    <div className="pmt-row" role="radiogroup" aria-label={t('decimalExamPrep.common.playModeLabel')}>
      <button type="button" role="radio" aria-checked={!playful} className={`pmt-option${!playful ? ' is-selected' : ''}`} onClick={() => onChange(false)}>
        {t('decimalExamPrep.common.standardMode')}
      </button>
      <button type="button" role="radio" aria-checked={playful} className={`pmt-option${playful ? ' is-selected' : ''}`} onClick={() => onChange(true)}>
        {t('decimalExamPrep.common.gameMode')}
      </button>
    </div>
  );
}

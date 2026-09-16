import { useTranslation } from 'react-i18next';
import type { TrainingActivityDefinition, TrainingMode } from '../../types/training';
import { isChallengeEligible } from '../configuration';
import './TrainingActivity.css';

interface TrainingSetupScreenProps<TPayload> {
  activity: TrainingActivityDefinition<TPayload>;
  mode: TrainingMode;
  difficultyId: string | null;
  questionCount: number;
  onModeChange: (mode: TrainingMode) => void;
  onDifficultyChange: (difficultyId: string) => void;
  onQuestionCountChange: (count: number) => void;
  onStart: () => void;
}

/**
 * The pre-session screen, driven entirely by what the activity declares it
 * supports: an activity without difficulties simply never renders that group,
 * and one without personal challenge never renders the mode switch.
 *
 * Deliberately large tappable choices in the grade 3–4 pastel language rather
 * than a settings form.
 */
export function TrainingSetupScreen<TPayload = never>({
  activity,
  mode,
  difficultyId,
  questionCount,
  onModeChange,
  onDifficultyChange,
  onQuestionCountChange,
  onStart,
}: TrainingSetupScreenProps<TPayload>) {
  const { t } = useTranslation();
  const { capabilities } = activity;

  const counts =
    mode === 'challenge'
      ? capabilities.questionCounts.filter((count) => isChallengeEligible(capabilities, count))
      : capabilities.questionCounts;

  return (
    <div className="tr-setup">
      {capabilities.supportsChallenge && (
        <section className="tr-group" aria-labelledby="tr-mode-label">
          <h2 className="tr-group-title" id="tr-mode-label">
            {t('training.setup.modeLabel')}
          </h2>
          <div className="tr-mode-choices">
            {(['practice', 'challenge'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`tr-mode${mode === option ? ' tr-mode-on' : ''} tr-mode-${option}`}
                data-testid={`tr-mode-${option}`}
                aria-pressed={mode === option}
                onClick={() => onModeChange(option)}
              >
                <span className="tr-mode-name">{t(`training.modes.${option}.name`)}</span>
                <span className="tr-mode-text">{t(`training.modes.${option}.description`)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {capabilities.difficulties.length > 0 && (
        <section className="tr-group" aria-labelledby="tr-difficulty-label">
          <h2 className="tr-group-title" id="tr-difficulty-label">
            {t('training.setup.difficultyLabel')}
          </h2>
          <div className="tr-difficulty-choices">
            {capabilities.difficulties.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`tr-choice tr-difficulty${difficultyId === option.id ? ' tr-choice-on' : ''}`}
                data-testid={`tr-difficulty-${option.id}`}
                aria-pressed={difficultyId === option.id}
                onClick={() => onDifficultyChange(option.id)}
              >
                <span className="tr-choice-name">{t(option.labelKey)}</span>
                <span className="tr-choice-text">{t(option.descriptionKey)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="tr-group" aria-labelledby="tr-count-label">
        <h2 className="tr-group-title" id="tr-count-label">
          {t('training.setup.questionCountLabel')}
        </h2>
        <div className="tr-count-choices">
          {counts.map((count) => (
            <button
              key={count}
              type="button"
              className={`tr-count${questionCount === count ? ' tr-count-on' : ''}`}
              data-testid={`tr-count-${count}`}
              aria-pressed={questionCount === count}
              onClick={() => onQuestionCountChange(count)}
            >
              <span className="tr-count-number" dir="ltr">
                {count}
              </span>
              <span className="tr-count-unit">{t('training.setup.questions')}</span>
            </button>
          ))}
        </div>
        {mode === 'challenge' && <p className="tr-note">{t('training.setup.challengeLengthNote')}</p>}
      </section>

      <button type="button" className="btn btn-primary btn-cta tr-start" data-testid="tr-start" onClick={onStart}>
        {t(mode === 'challenge' ? 'training.setup.startChallenge' : 'training.setup.startPractice')}
      </button>
    </div>
  );
}

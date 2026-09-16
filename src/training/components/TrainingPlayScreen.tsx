import { useTranslation } from 'react-i18next';
import { MathText } from '../../components/MathText';
import { toneForIndex } from '../../components/activityTones';
import type { TrainingMode } from '../../types/training';
import type { TrainingSessionState } from '../useTrainingSession';
import './TrainingActivity.css';

interface TrainingPlayScreenProps {
  session: TrainingSessionState;
  mode: TrainingMode;
  /** i18n key for the activity's own question prompt line. */
  promptKey: string;
}

/**
 * The generic answering screen: progress, an optional streak chip, the fact
 * itself and the answer choices.
 *
 * There is deliberately no visible countdown or running clock. Practice is
 * meant to feel unhurried, and in a challenge a live timer would add pressure
 * without telling the child anything they cannot see at the end.
 */
export function TrainingPlayScreen({ session, mode, promptKey }: TrainingPlayScreenProps) {
  const { t } = useTranslation();
  const { question, lastAnswer, phase } = session;

  return (
    <div className="tr-play">
      <div className="tr-hud">
        <div
          className="tr-progress"
          role="progressbar"
          aria-valuenow={session.index + 1}
          aria-valuemin={1}
          aria-valuemax={session.total}
          aria-label={t('training.hud.progress', { current: session.index + 1, total: session.total })}
        >
          <span className="tr-progress-bar">
            <span
              className="tr-progress-fill"
              style={{ width: `${((session.index + 1) / session.total) * 100}%` }}
            />
          </span>
          <span className="tr-progress-text" dir="ltr">
            {session.index + 1}/{session.total}
          </span>
        </div>
        {mode === 'challenge' && (
          <span className={`tr-streak${session.currentStreak > 0 ? ' tr-streak-on' : ''}`} data-testid="tr-streak">
            {t('training.hud.streak', { value: session.currentStreak })}
          </span>
        )}
      </div>

      <div className="tr-question" data-testid="tr-question">
        <p className="tr-prompt">{t(promptKey)}</p>
        <MathText className="tr-fact">{`${question.prompt} = ?`}</MathText>
      </div>

      <div className="tr-options">
        {question.options.map((option, position) => {
          // Rotating pastel tints, the same device the grade 3–4 activity tiles
          // use, so the answer choices read as playful rather than as a form.
          const classes = ['tr-option', `tr-option-${toneForIndex(position)}`];
          if (phase !== 'answering' && lastAnswer) {
            if (option === lastAnswer.correctAnswer) classes.push('tr-option-correct');
            else if (option === lastAnswer.value) classes.push('tr-option-wrong');
          }
          return (
            <button
              key={option}
              type="button"
              className={classes.join(' ')}
              data-testid={`tr-option-${option}`}
              disabled={phase !== 'answering'}
              onClick={() => session.submit(option)}
            >
              <MathText>{option}</MathText>
            </button>
          );
        })}
      </div>

      <p className="tr-feedback" role="status" aria-live="polite">
        {phase === 'feedback' && lastAnswer
          ? lastAnswer.isCorrect
            ? t('training.feedback.correct')
            : t('training.feedback.wrong', { answer: lastAnswer.correctAnswer })
          : ' '}
      </p>
    </div>
  );
}

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MathText } from '../../components/MathText';
import { toneForIndex } from '../../components/activityTones';
import type { TrainingMode, TrainingQuestion } from '../../types/training';
import type { TrainingSessionState } from '../useTrainingSession';
import './TrainingActivity.css';

/**
 * What an activity that draws its own question needs from the engine: the
 * question, whether answering is still open, what was just answered, and the
 * one way to answer. Deliberately the same `submit(answer: string)` contract
 * the built-in choice buttons use, so a scene that lets the child assemble an
 * answer (shading parts, tapping a number line) needs nothing extra.
 */
export interface TrainingQuestionRenderContext<TPayload> {
  question: TrainingQuestion<TPayload>;
  phase: TrainingSessionState<TPayload>['phase'];
  lastAnswer: TrainingSessionState<TPayload>['lastAnswer'];
  submit: (answer: string) => void;
}

interface TrainingPlayScreenProps<TPayload> {
  session: TrainingSessionState<TPayload>;
  mode: TrainingMode;
  /** i18n key for the activity's own question prompt line. */
  promptKey: string;
  /**
   * Replaces the textual fact and the choice buttons for activities whose
   * question is a picture. The HUD, the feedback line and the whole session
   * lifecycle stay shared.
   */
  renderQuestion?: (context: TrainingQuestionRenderContext<TPayload>) => ReactNode;
}

/**
 * The generic answering screen: progress, an optional streak chip, the fact
 * itself and the answer choices.
 *
 * There is deliberately no visible countdown or running clock. Practice is
 * meant to feel unhurried, and in a challenge a live timer would add pressure
 * without telling the child anything they cannot see at the end.
 */
export function TrainingPlayScreen<TPayload = never>({
  session,
  mode,
  promptKey,
  renderQuestion,
}: TrainingPlayScreenProps<TPayload>) {
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

      {renderQuestion ? (
        <div className="tr-custom-question" data-testid="tr-question">
          {renderQuestion({ question, phase, lastAnswer, submit: session.submit })}
        </div>
      ) : (
        <>
          <div className="tr-question" data-testid="tr-question">
            <p className="tr-prompt">{t(promptKey)}</p>
            <MathText className="tr-fact">{`${question.prompt} = ?`}</MathText>
          </div>

          <div className="tr-options">
            {question.options.map((option, position) => {
              // Rotating pastel tints, the same device the grade 3–4 activity
              // tiles use, so the answer choices read as playful rather than as
              // a form.
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
        </>
      )}

      {/*
        The correct answer is rendered through MathText rather than interpolated
        into the sentence: `<`, `>` and `a/b` are mathematical notation, and
        inside the Hebrew RTL line the comparison signs would be bidi-mirrored
        into their opposite — the feedback would then state the wrong answer.
      */}
      <p className="tr-feedback" role="status" aria-live="polite">
        {phase === 'feedback' && lastAnswer ? (
          lastAnswer.isCorrect ? (
            t('training.feedback.correct')
          ) : (
            <>
              {t('training.feedback.wrongLabel')} <MathText>{lastAnswer.correctAnswer}</MathText>
            </>
          )
        ) : (
          ' '
        )}
      </p>
    </div>
  );
}

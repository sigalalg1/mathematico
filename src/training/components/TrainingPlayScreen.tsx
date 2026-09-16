import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MathText } from '../../components/MathText';
import { toneForIndex } from '../../components/activityTones';
import type { TrainingMode, TrainingQuestion } from '../../types/training';
import { formatDuration } from '../metrics';
import type { TrainingPhase, TrainingSessionState } from '../useTrainingSession';
import './TrainingActivity.css';

/** How often the displayed time is refreshed. It is re-read, never counted. */
const TIMER_REFRESH_MS = 500;

/**
 * The challenge clock. It only ever *displays* what the session engine
 * measured: every refresh re-reads the tracked active duration, so a throttled
 * or missed interval tick cannot make the shown time drift from the recorded
 * one, and hidden or paused spans never appear on it.
 */
function TrainingTimer({ getActiveDurationMs }: { getActiveDurationMs: () => number }) {
  const { t } = useTranslation();
  const [elapsedMs, setElapsedMs] = useState(() => getActiveDurationMs());

  useEffect(() => {
    const id = window.setInterval(() => setElapsedMs(getActiveDurationMs()), TIMER_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [getActiveDurationMs]);

  return (
    <span className="tr-timer" data-testid="tr-timer" aria-label={t('training.hud.timerLabel')}>
      <span aria-hidden="true">⏱</span>
      <span dir="ltr">{formatDuration(elapsedMs)}</span>
    </span>
  );
}

/**
 * What a custom question renderer is handed. Everything an activity's own
 * visual could need to draw the question and take an answer — and nothing that
 * would let it interfere with the session itself: timing, streak, progress and
 * completion stay entirely with the engine.
 */
export interface TrainingQuestionRenderProps {
  question: TrainingQuestion;
  phase: TrainingPhase;
  /** The answer just given, while `phase` is `feedback`. */
  lastAnswer: TrainingSessionState['lastAnswer'];
  mode: TrainingMode;
  /** 0-based position of the current question, and how many there are. */
  index: number;
  total: number;
  /** Already-translated prompt line for this activity. */
  promptLabel: string;
  /** Records the answer. Ignored unless the session is still answering. */
  submit: (answer: string) => void;
}

interface TrainingPlayScreenProps {
  session: TrainingSessionState;
  mode: TrainingMode;
  /** i18n key for the activity's own question prompt line. */
  promptKey: string;
  /**
   * Replaces the default prompt-and-buttons block with the activity's own
   * visual — a game scene, a diagram, anything that can present a prompt and
   * take one of the options as an answer. The HUD, the feedback line and the
   * whole session lifecycle around it stay exactly as they are, which is the
   * point: a picture-based activity gets the full engine for free.
   */
  renderQuestion?: (props: TrainingQuestionRenderProps) => ReactNode;
}

/**
 * The generic answering screen: progress, an optional streak chip, the fact
 * itself and the answer choices.
 *
 * Practice deliberately shows no clock at all: it is meant to feel unhurried,
 * and the time it quietly records is never put in front of the child. A
 * personal challenge does show one, kept small and next to the progress bar —
 * the fact itself stays the thing being looked at. There is never a countdown:
 * nothing runs out, so the timer informs rather than pressures.
 */
export function TrainingPlayScreen({ session, mode, promptKey, renderQuestion }: TrainingPlayScreenProps) {
  const { t } = useTranslation();
  const { question, lastAnswer, phase } = session;

  return (
    <div className={`tr-play${renderQuestion ? ' tr-play-custom' : ''}`}>
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
        {mode === 'challenge' && <TrainingTimer getActiveDurationMs={session.getActiveDurationMs} />}
        {mode === 'challenge' && (
          <span className={`tr-streak${session.currentStreak > 0 ? ' tr-streak-on' : ''}`} data-testid="tr-streak">
            {t('training.hud.streak', { value: session.currentStreak })}
          </span>
        )}
      </div>

      {renderQuestion ? (
        renderQuestion({
          question,
          phase,
          lastAnswer,
          mode,
          index: session.index,
          total: session.total,
          promptLabel: t(promptKey),
          submit: session.submit,
        })
      ) : (
        <>
          <div className="tr-question" data-testid="tr-question">
            <p className="tr-prompt">{t(promptKey)}</p>
            <MathText className="tr-fact">{`${question.prompt} = ?`}</MathText>
          </div>

          <div className="tr-options">
            {question.options.map((option, position) => {
              // Rotating pastel tints, the same device the grade 3–4 activity
              // tiles use, so the answer choices read as playful, not as a form.
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

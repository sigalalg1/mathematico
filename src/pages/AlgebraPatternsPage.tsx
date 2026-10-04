import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { MathText } from '../components/MathText';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { SignedCompletion } from '../components/SignedCompletion';
import { useSound } from '../audio/useSound';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { ALGEBRA_PATTERNS_TOTAL, useAlgebraPatternsGame } from '../hooks/useAlgebraPatternsGame';
import './AlgebraShared.css';

const GAME_ID = 'algebraPatterns';
const ALGEBRA_PATH = '/grade/7/algebra';

export function AlgebraPatternsPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useAlgebraPatternsGame();
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: ALGEBRA_PATTERNS_TOTAL,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('algebraPatterns.feedback.correctMessages', { returnObjects: true }) as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the sound, not derived state
      setCorrectMessage(messages[Math.floor(Math.random() * messages.length)]);
    } else if (game.status === 'incorrect') {
      play('miss');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.attemptSeed]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  useEffect(() => {
    if (game.status !== 'correct') return undefined;
    const timer = window.setTimeout(() => game.next(), 1400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  if (game.completed) {
    return (
      <PageLayout title={t('algebraPatterns.gameName')} context={t('grades.7')} backTo={ALGEBRA_PATH} backLabel={t('algebraPage.title')}>
        <SignedCompletion
          icon="🔎"
          titleKey="algebraPatterns.completion.title"
          total={game.total}
          firstTryCount={game.firstAttemptCorrectCount}
          onRetry={game.retry}
        />
      </PageLayout>
    );
  }

  const challenge = game.challenge;
  const solved = game.status === 'correct';
  const wrong = game.status === 'incorrect';

  return (
    <PageLayout title={t('algebraPatterns.gameName')} context={t('grades.7')} backTo={ALGEBRA_PATH} backLabel={t('algebraPage.title')}>
      <div className="algebra-activity">
        <div className="algebra-activity-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="algebra.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        <p className="algebra-activity-prompt">{t(`algebraPatterns.prompt.${challenge.kind}`)}</p>

        {challenge.kind === 'visualStage' ? (
          <div className="algebra-machine">
            {challenge.knownPairs.map((pair) => (
              <div key={pair.input} className="algebra-stage">
                <span className="algebra-stage-label">{t('algebraPatterns.machine.stageLabel', { stage: pair.input })}</span>
                <div className="algebra-stage-dots">
                  {Array.from({ length: pair.output }, (_, dotIndex) => (
                    <span key={dotIndex} className="algebra-stage-dot" aria-hidden="true" />
                  ))}
                </div>
              </div>
            ))}
            <div className="algebra-stage">
              <span className="algebra-stage-label algebra-machine-unknown">
                {t('algebraPatterns.machine.stageLabel', { stage: challenge.stage })}
              </span>
            </div>
          </div>
        ) : (
          <div className="algebra-machine">
            {challenge.knownPairs.map((pair) => (
              <MathText key={pair.input} className="algebra-machine-row">
                {pair.input} <span className="algebra-machine-arrow">→</span> {pair.output}
              </MathText>
            ))}
            <MathText className="algebra-machine-row algebra-machine-row-open">
              {challenge.kind === 'computeInput' ? (
                <>
                  <span className="algebra-machine-unknown">?</span> <span className="algebra-machine-arrow">→</span>{' '}
                  {challenge.targetOutput}
                </>
              ) : challenge.kind === 'computeRule' ? (
                <>
                  x <span className="algebra-machine-arrow">→</span> <span className="algebra-machine-unknown">?</span>
                </>
              ) : (
                <>
                  {challenge.targetInput} <span className="algebra-machine-arrow">→</span>{' '}
                  <span className="algebra-machine-unknown">?</span>
                </>
              )}
            </MathText>
          </div>
        )}

        <div className="algebra-options">
          {challenge.options.map((option) => {
            const isSelected = game.lastAnswer === option;
            const classes = ['algebra-option'];
            if (solved && option === challenge.answer) classes.push('is-correct');
            else if (wrong && isSelected) classes.push('is-wrong');
            return (
              <button
                key={option}
                type="button"
                className={classes.join(' ')}
                data-testid={`algebra-option-${option}`}
                disabled={solved}
                onClick={() => game.submit(option)}
              >
                <MathText>{option}</MathText>
              </button>
            );
          })}
        </div>

        {solved && (
          <div className="algebra-feedback">
            <p className="algebra-feedback-correct">{correctMessage}</p>
          </div>
        )}

        {wrong && (
          <div className="algebra-feedback algebra-feedback-hint">
            <p>{t('algebraPatterns.feedback.hint')}</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

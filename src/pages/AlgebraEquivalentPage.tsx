import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { MathText } from '../components/MathText';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { SignedCompletion } from '../components/SignedCompletion';
import { useSound } from '../audio/useSound';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { ALGEBRA_EQUIVALENT_TOTAL, useAlgebraEquivalentGame } from '../hooks/useAlgebraEquivalentGame';
import { evalLinearExpr } from '../utils/algebra';
import './AlgebraShared.css';

const GAME_ID = 'algebraEquivalent';
const ALGEBRA_PATH = '/grade/7/algebra';

export function AlgebraEquivalentPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useAlgebraEquivalentGame();

  useGameSessionTracking(GAME_ID, {
    total: ALGEBRA_EQUIVALENT_TOTAL,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'correct') play('hit');
    else if (game.status === 'incorrect') play('miss');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.attemptSeed]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  useEffect(() => {
    if (game.status !== 'correct') return undefined;
    const timer = window.setTimeout(() => game.next(), 1600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  if (game.completed) {
    return (
      <PageLayout title={t('algebraEquivalent.gameName')} context={t('grades.7')} backTo={ALGEBRA_PATH} backLabel={t('algebraPage.title')}>
        <SignedCompletion
          icon="⚖️"
          titleKey="algebraEquivalent.completion.title"
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
  const answered = solved || wrong;

  return (
    <PageLayout title={t('algebraEquivalent.gameName')} context={t('grades.7')} backTo={ALGEBRA_PATH} backLabel={t('algebraPage.title')}>
      <div className="algebra-activity">
        <div className="algebra-activity-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="algebra.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        <p className="algebra-activity-prompt">{t('algebraEquivalent.prompt')}</p>

        <div className="algebra-compare">
          <div className="algebra-compare-side">
            <MathText className="algebra-compare-expr">{challenge.aDisplay}</MathText>
          </div>
          <span className="algebra-compare-sign" aria-hidden="true">
            ?
          </span>
          <div className="algebra-compare-side">
            <MathText className="algebra-compare-expr">{challenge.bDisplay}</MathText>
          </div>
        </div>

        <div className="algebra-machine">
          {challenge.sampleXs.map((x) => (
            <MathText key={x} className="algebra-compare-row">
              x = {x}: {challenge.aDisplay} = {evalLinearExpr(challenge.aExpr, x)}, {challenge.bDisplay} ={' '}
              {evalLinearExpr(challenge.bExpr, x)}
            </MathText>
          ))}
        </div>

        <div className="algebra-judge-options">
          <button
            type="button"
            className={`algebra-option${answered && challenge.equivalent ? ' is-correct' : answered && game.lastAnswer === true ? ' is-wrong' : ''}`}
            data-testid="algebra-judge-equivalent"
            disabled={solved}
            onClick={() => game.submit(true)}
          >
            {t('algebraEquivalent.actions.equivalent')}
          </button>
          <button
            type="button"
            className={`algebra-option${answered && !challenge.equivalent ? ' is-correct' : answered && game.lastAnswer === false ? ' is-wrong' : ''}`}
            data-testid="algebra-judge-not-equivalent"
            disabled={solved}
            onClick={() => game.submit(false)}
          >
            {t('algebraEquivalent.actions.notEquivalent')}
          </button>
        </div>

        {wrong && (
          <div className="algebra-feedback algebra-feedback-hint">
            <p>{t(challenge.equivalent ? 'algebraEquivalent.feedback.missedEquivalent' : 'algebraEquivalent.feedback.missedDifference')}</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { MathText } from '../components/MathText';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { SignedCompletion } from '../components/SignedCompletion';
import { useSound } from '../audio/useSound';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { ALGEBRA_SOLVING_TOTAL, useAlgebraSolvingGame } from '../hooks/useAlgebraSolvingGame';
import { formatOperation } from '../data/games/algebraSolvingData';
import { evalLinearExpr, formatLinearEquation } from '../utils/algebra';
import { formatSigned } from '../utils/signedNumbers';
import './AlgebraShared.css';

const GAME_ID = 'algebraSolving';
const ALGEBRA_PATH = '/grade/7/algebra';

export function AlgebraSolvingPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useAlgebraSolvingGame();

  useGameSessionTracking(GAME_ID, {
    total: ALGEBRA_SOLVING_TOTAL,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.phase === 'verifying') play('hit');
    else if (game.phase === 'wrong') play('miss');
  }, [game.phase, play]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  if (game.completed) {
    return (
      <PageLayout title={t('algebraSolving.gameName')} context={t('grades.7')} backTo={ALGEBRA_PATH} backLabel={t('algebraPage.title')}>
        <SignedCompletion
          icon="🧮"
          titleKey="algebraSolving.completion.title"
          total={game.total}
          firstTryCount={game.firstAttemptCorrectCount}
          onRetry={game.retry}
        />
      </PageLayout>
    );
  }

  const { challenge, equation } = game;
  const originalLeft = evalLinearExpr(challenge.equation.left, challenge.solution);
  const originalRight = evalLinearExpr(challenge.equation.right, challenge.solution);

  return (
    <PageLayout title={t('algebraSolving.gameName')} context={t('grades.7')} backTo={ALGEBRA_PATH} backLabel={t('algebraPage.title')}>
      <div className="algebra-activity">
        <div className="algebra-activity-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="algebra.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        {game.phase !== 'verifying' && (
          <p className="algebra-activity-note">
            {t('algebraSolving.stepLabel', { current: game.stepIndex + 1, total: game.totalSteps })}
          </p>
        )}

        <div data-testid="algebra-solve-equation">
          <MathText className="algebra-expression">{formatLinearEquation(equation)}</MathText>
        </div>

        {game.phase === 'verifying' ? (
          <div className="algebra-machine" data-testid="algebra-solve-verify">
            <p className="algebra-activity-prompt">{t('algebraSolving.verify.title')}</p>
            <MathText className="algebra-machine-row">
              {t('algebraSolving.verify.substituting', { x: formatSigned(challenge.solution) })}
            </MathText>
            <MathText className="algebra-machine-row">
              {formatLinearEquation(challenge.equation)} → {originalLeft} = {originalRight}
            </MathText>
            <p className="algebra-feedback-correct">{t('algebraSolving.verify.confirmed', { value: originalLeft })}</p>
            <button type="button" className="btn btn-primary" data-testid="algebra-solve-next" onClick={game.next}>
              {t('algebraSolving.actions.next')}
            </button>
          </div>
        ) : (
          <>
            <p className="algebra-activity-prompt">{t('algebraSolving.prompt')}</p>
            <div className="algebra-options">
              {game.options.map((option, position) => {
                const isWrong = game.phase === 'wrong' && game.lastWrongOperation && JSON.stringify(option) === JSON.stringify(game.lastWrongOperation);
                return (
                  <button
                    key={position}
                    type="button"
                    className={`algebra-option${isWrong ? ' is-wrong' : ''}`}
                    data-testid={`algebra-solve-option-${position}`}
                    onClick={() => game.choose(option)}
                  >
                    <MathText>{formatOperation(option, t)}</MathText>
                  </button>
                );
              })}
            </div>
            {game.phase === 'wrong' && (
              <div className="algebra-feedback algebra-feedback-hint">
                <p>{t('algebraSolving.feedback.wrong')}</p>
                <button type="button" className="btn btn-secondary" onClick={game.acknowledgeWrong}>
                  {t('algebraSolving.actions.tryAgain')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}

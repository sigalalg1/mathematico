import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { MathText } from '../components/MathText';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { SignedCompletion } from '../components/SignedCompletion';
import { useSound } from '../audio/useSound';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { ALGEBRA_WORD_PROBLEMS_TOTAL, useAlgebraWordProblemsGame } from '../hooks/useAlgebraWordProblemsGame';
import './AlgebraShared.css';

const GAME_ID = 'algebraWordProblems';
const ALGEBRA_PATH = '/grade/7/algebra';

export function AlgebraWordProblemsPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useAlgebraWordProblemsGame();

  useGameSessionTracking(GAME_ID, {
    total: ALGEBRA_WORD_PROBLEMS_TOTAL,
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
    const timer = window.setTimeout(() => game.next(), 2400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  if (game.completed) {
    return (
      <PageLayout title={t('algebraWordProblems.gameName')} context={t('grades.7')} backTo={ALGEBRA_PATH} backLabel={t('algebraPage.title')}>
        <SignedCompletion
          icon="📖"
          titleKey="algebraWordProblems.completion.title"
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
  const { a, b, c, name, other } = challenge.storyParams;

  return (
    <PageLayout title={t('algebraWordProblems.gameName')} context={t('grades.7')} backTo={ALGEBRA_PATH} backLabel={t('algebraPage.title')}>
      <div className="algebra-activity">
        <div className="algebra-activity-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="algebra.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        <p className="algebra-activity-prompt">{t(`algebraWordProblems.story.${challenge.templateId}`, { a, b, c, name, other })}</p>
        <p className="algebra-activity-note">{t('algebraWordProblems.pickEquation')}</p>

        <div className="algebra-options">
          {challenge.options.map((option) => {
            const classes = ['algebra-option'];
            if (solved && option === challenge.answer) classes.push('is-correct');
            else if (wrong && option === game.lastAnswer) classes.push('is-wrong');
            return (
              <button
                key={option}
                type="button"
                className={classes.join(' ')}
                data-testid={`algebra-word-option-${option}`}
                disabled={solved}
                onClick={() => game.submit(option)}
              >
                <MathText>{option}</MathText>
              </button>
            );
          })}
        </div>

        {wrong && (
          <div className="algebra-feedback algebra-feedback-hint">
            <p>{t('algebraWordProblems.feedback.wrong')}</p>
          </div>
        )}

        {solved && (
          <div className="algebra-machine" data-testid="algebra-word-solution">
            <MathText className="algebra-machine-row">
              {challenge.answer} → x = {challenge.solution}
            </MathText>
            <p className="algebra-feedback-correct">
              {t(`algebraWordProblems.interpretation.${challenge.templateId}`, { other, value: challenge.solution })}
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

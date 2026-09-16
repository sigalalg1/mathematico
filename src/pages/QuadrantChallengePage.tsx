import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { CoordinateGrid } from '../components/CoordinateGrid';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { useQuadrantChallengeGame, QUADRANT_CHALLENGE_TOTAL_COUNT } from '../hooks/useQuadrantChallengeGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import type { QuadrantLocation, Sign } from '../types/quadrantChallenge';
import '../components/quiz/QuizShared.css';
import './QuadrantChallengePage.css';

const GAME_ID = 'quadrantChallenge';

export function QuadrantChallengePage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useQuadrantChallengeGame();
  const [xSign, setXSign] = useState<Sign | null>(null);
  const [ySign, setYSign] = useState<Sign | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [correctMessage, setCorrectMessage] = useState('');

  // Clear the sign pickers whenever a new challenge appears (render-time
  // state adjustment, not an effect, since there's no external system here).
  const signsResetKey = `${game.index}-${game.roundKey}`;
  const [lastSignsResetKey, setLastSignsResetKey] = useState(signsResetKey);
  if (signsResetKey !== lastSignsResetKey) {
    setLastSignsResetKey(signsResetKey);
    setXSign(null);
    setYSign(null);
  }

  useGameSessionTracking(GAME_ID, {
    total: QUADRANT_CHALLENGE_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('quadrantChallenge.feedback.correctMessages', { returnObjects: true }) as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the sound, not derived state
      setCorrectMessage(messages[Math.floor(Math.random() * messages.length)]);
    } else if (game.status === 'incorrect') {
      play('miss');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  const prevStageIndex = usePrevious(game.stageIndex);
  useEffect(() => {
    if (game.stageIndex === 0 || prevStageIndex === undefined || prevStageIndex === game.stageIndex) return;
    play('stageComplete');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the chime, not derived state
    setBannerVisible(true);
    const timer = window.setTimeout(() => setBannerVisible(false), 2200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.stageIndex]);

  useEffect(() => {
    if (game.status !== 'correct') return;
    const timer = window.setTimeout(() => game.next(), 650);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  function handleQuadrantClick(quadrant: 1 | 2 | 3 | 4) {
    if (game.status === 'correct') return;
    game.submit({ kind: 'click', value: quadrant });
  }

  function handleChoiceClick(value: QuadrantLocation) {
    if (game.status === 'correct') return;
    game.submit({ kind: 'choice', value });
  }

  function handleSignPick(axis: 'x' | 'y', value: Sign) {
    if (game.status === 'correct') return;
    const nextX = axis === 'x' ? value : xSign;
    const nextY = axis === 'y' ? value : ySign;
    if (axis === 'x') setXSign(value);
    else setYSign(value);
    if (nextX && nextY) {
      game.submit({ kind: 'signs', x: nextX, y: nextY });
    }
  }

  const challenge = game.challenge;
  const answered = game.status !== 'unanswered';
  const signsForText = challenge.showSignsText && challenge.pair ? challenge.pair : null;

  return (
    <PageLayout
      title={t('quadrantChallenge.gameName')}
      context={t('grades.7')} backTo="/grade/7/coordinate-system"
      backLabel={t('coordinateSystemPage.title')}
    >
      {game.completed ? (
        <QuadrantChallengeCompletion total={game.total} firstTryCount={game.firstAttemptCorrectCount} onRetry={game.retry} />
      ) : (
        <div className="quadrant-challenge">
          <div className="quadrant-challenge-top">
            <QuizProgress current={game.index + 1} total={game.total} labelKey="quadrantChallenge.progress" />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <span className="quadrant-challenge-stage">{t(game.stage.nameKey)}</span>
          {bannerVisible && <div className="quadrant-challenge-banner">{t(game.stage.introKey)}</div>}

          <p className="quadrant-challenge-prompt">{t(challenge.promptKey)}</p>

          {challenge.pair && !signsForText && (
            <MathText className="quadrant-challenge-pair">
              ({challenge.pair.x}, {challenge.pair.y})
            </MathText>
          )}
          {signsForText && (
            <MathText className="quadrant-challenge-pair">
              X {signsForText.x > 0 ? '>' : '<'} 0, Y {signsForText.y > 0 ? '>' : '<'} 0
            </MathText>
          )}

          <CoordinateGrid
            size="lg"
            point={challenge.kind === 'click' && !signsForText && !challenge.pair ? (challenge.point ?? null) : null}
            quadrant={
              challenge.kind === 'signs'
                ? (challenge.highlightQuadrant ?? null)
                : answered && typeof challenge.correctLocation === 'number'
                  ? challenge.correctLocation
                  : null
            }
            highlightOrigin={challenge.correctLocation === 'origin' && answered}
            onQuadrantClick={challenge.kind === 'click' && game.status !== 'correct' ? handleQuadrantClick : undefined}
          />

          {challenge.kind === 'signs' && (
            <div className="quadrant-challenge-signs">
              <div className="quadrant-challenge-sign-group">
                <span>{t('quadrantChallenge.signLabels.x')}</span>
                <button
                  type="button"
                  aria-label={`${t('quadrantChallenge.signLabels.x')} ${t('quadrantChallenge.signLabels.plus')}`}
                  className={`question-option question-option-glyph ${xSign === '+' ? 'is-correct' : ''}`}
                  onClick={() => handleSignPick('x', '+')}
                  disabled={game.status === 'correct'}
                >
                  +
                </button>
                <button
                  type="button"
                  aria-label={`${t('quadrantChallenge.signLabels.x')} ${t('quadrantChallenge.signLabels.minus')}`}
                  className={`question-option question-option-glyph ${xSign === '-' ? 'is-correct' : ''}`}
                  onClick={() => handleSignPick('x', '-')}
                  disabled={game.status === 'correct'}
                >
                  −
                </button>
              </div>
              <div className="quadrant-challenge-sign-group">
                <span>{t('quadrantChallenge.signLabels.y')}</span>
                <button
                  type="button"
                  aria-label={`${t('quadrantChallenge.signLabels.y')} ${t('quadrantChallenge.signLabels.plus')}`}
                  className={`question-option question-option-glyph ${ySign === '+' ? 'is-correct' : ''}`}
                  onClick={() => handleSignPick('y', '+')}
                  disabled={game.status === 'correct'}
                >
                  +
                </button>
                <button
                  type="button"
                  aria-label={`${t('quadrantChallenge.signLabels.y')} ${t('quadrantChallenge.signLabels.minus')}`}
                  className={`question-option question-option-glyph ${ySign === '-' ? 'is-correct' : ''}`}
                  onClick={() => handleSignPick('y', '-')}
                  disabled={game.status === 'correct'}
                >
                  −
                </button>
              </div>
            </div>
          )}

          {challenge.kind === 'choice' && challenge.options && (
            <div className="question-options quadrant-challenge-choices">
              {challenge.options.map((option) => (
                <button
                  key={String(option.id)}
                  type="button"
                  className={`question-option ${answered && option.id === challenge.correctLocation ? 'is-correct' : ''} ${
                    answered && game.lastAnswer?.kind === 'choice' && game.lastAnswer.value === option.id && option.id !== challenge.correctLocation
                      ? 'is-incorrect'
                      : ''
                  }`}
                  onClick={() => handleChoiceClick(option.id)}
                  disabled={game.status === 'correct'}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          )}

          {game.status === 'correct' && <p className="quadrant-challenge-feedback feedback-correct-text">{correctMessage}</p>}
          {game.status === 'incorrect' && (
            <p className="quadrant-challenge-feedback feedback-hint-text">
              {challenge.kind === 'signs' ? t('quadrantChallenge.feedback.signsHint') : t('quadrantChallenge.feedback.clickHint')}
            </p>
          )}
        </div>
      )}
    </PageLayout>
  );
}

function usePrevious<T>(value: T): T | undefined {
  const [state, setState] = useState<{ current: T; previous: T | undefined }>({ current: value, previous: undefined });
  if (state.current !== value) {
    setState({ current: value, previous: state.current });
  }
  return state.previous;
}

interface QuadrantChallengeCompletionProps {
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

function QuadrantChallengeCompletion({ total, firstTryCount, onRetry }: QuadrantChallengeCompletionProps) {
  const { t } = useTranslation();
  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        🧭
      </span>
      <h2 className="quiz-completion-title">{t('quadrantChallenge.completion.title')}</h2>
      <p className="quiz-completion-score">{t('quadrantChallenge.completion.summary', { total })}</p>
      <p className="quadrant-challenge-completion-detail">{t('quadrantChallenge.completion.firstTry', { count: firstTryCount })}</p>
      <div className="quadrant-challenge-completion-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {t('launchSpaceship.actions.playAgain')}
        </button>
        <Link className="btn btn-secondary" to="/grade/7/coordinate-system">
          {t('launchSpaceship.actions.backToTopic')}
        </Link>
      </div>
    </div>
  );
}

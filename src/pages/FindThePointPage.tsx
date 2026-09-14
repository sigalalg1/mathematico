import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { CoordinateGrid } from '../components/CoordinateGrid';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { useFindThePointGame, FIND_THE_POINT_TOTAL_COUNT } from '../hooks/useFindThePointGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import { classifyMistake } from '../data/games/hitTheTargetMistakes';
import type { MistakeType } from '../types/hitTheTarget';
import type { Point } from '../types/findThePoint';
import './FindThePointPage.css';

const GAME_ID = 'findThePoint';

export function FindThePointPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useFindThePointGame();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: FIND_THE_POINT_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('findThePoint.feedback.correctMessages', { returnObjects: true }) as string[];
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
    const timer = window.setTimeout(() => game.next(), 750);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  const challenge = game.challenge;
  const answered = game.status !== 'unanswered';

  function handleSelectPoint(id: string) {
    if (game.status === 'correct') return;
    const option = challenge.options.find((o) => o.id === id);
    if (!option) return;
    game.submit(option.point);
  }

  const selectedOption = game.lastAnswer
    ? challenge.options.find((o) => o.point.x === game.lastAnswer!.x && o.point.y === game.lastAnswer!.y)
    : undefined;

  const mistakeMessage =
    game.status === 'incorrect' && game.lastAnswer ? getMistakeMessage(t, classifyMistake(challenge.correct, game.lastAnswer), challenge.correct) : null;

  return (
    <PageLayout title={t('games.findThePoint.name')} backTo="/grade/7/coordinate-system" backLabel={t('coordinateSystemPage.title')}>
      {game.completed ? (
        <FindThePointCompletion total={game.total} firstTryCount={game.firstAttemptCorrectCount} onRetry={game.retry} />
      ) : (
        <div className="find-the-point">
          <div className="find-the-point-top">
            <QuizProgress current={game.index + 1} total={game.total} labelKey="findThePoint.progress" />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <span className="find-the-point-stage">{t(game.stage.nameKey)}</span>
          {bannerVisible && <div className="find-the-point-banner">{t(game.stage.introKey)}</div>}

          <p className="find-the-point-prompt">
            {t('findThePoint.promptLead')}{' '}
            <MathText className="find-the-point-pair">
              ({challenge.correct.x}, {challenge.correct.y})
            </MathText>
            {t('findThePoint.promptTrailing')}
          </p>

          <CoordinateGrid
            size="lg"
            clickablePoints={challenge.options.map((o) => ({ id: o.id, point: o.point, label: o.label }))}
            onSelectPoint={handleSelectPoint}
            selectedPointId={selectedOption?.id ?? null}
            correctPointId={game.status === 'correct' ? challenge.correctOptionId : null}
            pointsAnswered={answered}
            pointsLocked={game.status === 'correct'}
          />

          {game.status === 'correct' && <p className="find-the-point-feedback feedback-correct-text">{correctMessage}</p>}
          {game.status === 'incorrect' && game.lastAnswer && (
            <div className="find-the-point-feedback feedback-hint-text">
              <p>
                {t('findThePoint.feedback.youClicked')}{' '}
                <MathText>
                  ({game.lastAnswer.x}, {game.lastAnswer.y})
                </MathText>
              </p>
              {mistakeMessage && <p>{mistakeMessage}</p>}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}

function getMistakeMessage(t: (key: string, options?: Record<string, unknown>) => string, mistakeType: MistakeType, target: Point): string {
  if (mistakeType === 'xSign') {
    const direction = target.x < 0 ? t('findThePoint.words.left') : t('findThePoint.words.right');
    const sign = target.x < 0 ? t('findThePoint.words.negative') : t('findThePoint.words.positive');
    return t('findThePoint.feedback.xSign', { direction, sign });
  }
  if (mistakeType === 'ySign') {
    const direction = target.y < 0 ? t('findThePoint.words.below') : t('findThePoint.words.above');
    const sign = target.y < 0 ? t('findThePoint.words.negative') : t('findThePoint.words.positive');
    return t('findThePoint.feedback.ySign', { direction, sign });
  }
  if (mistakeType === 'swapped') return t('findThePoint.feedback.swapped');
  return t('findThePoint.feedback.other');
}

function usePrevious<T>(value: T): T | undefined {
  const [state, setState] = useState<{ current: T; previous: T | undefined }>({ current: value, previous: undefined });
  if (state.current !== value) {
    setState({ current: value, previous: state.current });
  }
  return state.previous;
}

interface FindThePointCompletionProps {
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

function FindThePointCompletion({ total, firstTryCount, onRetry }: FindThePointCompletionProps) {
  const { t } = useTranslation();
  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        📍
      </span>
      <h2 className="quiz-completion-title">{t('findThePoint.completion.title')}</h2>
      <p className="quiz-completion-score">{t('findThePoint.completion.summary', { total })}</p>
      <p className="find-the-point-completion-detail">{t('findThePoint.completion.firstTry', { count: firstTryCount })}</p>
      <div className="find-the-point-completion-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {t('findThePoint.actions.playAgain')}
        </button>
        <Link className="btn btn-secondary" to="/grade/7/coordinate-system">
          {t('findThePoint.actions.backToTopic')}
        </Link>
      </div>
    </div>
  );
}

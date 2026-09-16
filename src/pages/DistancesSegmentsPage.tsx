import { useEffect, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { CoordinateGrid } from '../components/CoordinateGrid';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { useDistancesSegmentsGame, DISTANCES_SEGMENTS_TOTAL_COUNT } from '../hooks/useDistancesSegmentsGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import './DistancesSegmentsPage.css';

const GAME_ID = 'distancesSegments';
const DIGITS_ONLY = /^\d*$/;

export function DistancesSegmentsPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useDistancesSegmentsGame();
  const [input, setInput] = useState('');
  const [bannerVisible, setBannerVisible] = useState(false);
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: DISTANCES_SEGMENTS_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  const resetKey = `${game.index}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setInput('');
  }

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('distancesSegments.feedback.correctMessages', { returnObjects: true }) as string[];
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
  const canSubmit = input.length > 0 && game.status !== 'correct';

  function handleSubmit() {
    if (!canSubmit) return;
    game.submit(Number(input));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') handleSubmit();
  }

  return (
    <PageLayout
      title={t('distancesSegments.gameName')}
      context={t('grades.7')} backTo="/grade/7/coordinate-system"
      backLabel={t('coordinateSystemPage.title')}
    >
      {game.completed ? (
        <DistancesSegmentsCompletion total={game.total} firstTryCount={game.firstAttemptCorrectCount} onRetry={game.retry} />
      ) : (
        <div className="distances-segments">
          <div className="distances-segments-top">
            <QuizProgress current={game.index + 1} total={game.total} labelKey="distancesSegments.progress" />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <span className="distances-segments-stage">{t(game.stage.nameKey)}</span>
          {bannerVisible && <div className="distances-segments-banner">{t(game.stage.introKey)}</div>}

          <p className="distances-segments-prompt">{t('distancesSegments.promptHorizontal')}</p>

          <CoordinateGrid
            size="lg"
            segments={[{ from: challenge.a, to: challenge.b, variant: answered ? (game.status === 'correct' ? 'correct' : 'incorrect') : 'default' }]}
            vertexLabels={[
              { point: challenge.a, label: 'A' },
              { point: challenge.b, label: 'B' },
            ]}
          />

          <div className="distances-segments-input-row">
            <label className="distances-segments-field">
              <span>{t('distancesSegments.inputLabel')}</span>
              <input
                type="text"
                inputMode="numeric"
                value={input}
                onChange={(event) => DIGITS_ONLY.test(event.target.value) && setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={game.status === 'correct'}
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
              {t('distancesSegments.actions.check')}
            </button>
          </div>

          {game.status === 'correct' && (
            <p className="distances-segments-feedback feedback-correct-text">
              {correctMessage} <MathText>({challenge.length})</MathText>
            </p>
          )}
          {game.status === 'incorrect' && (
            <p className="distances-segments-feedback feedback-hint-text">{t('distancesSegments.feedback.incorrectHint')}</p>
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

interface DistancesSegmentsCompletionProps {
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

function DistancesSegmentsCompletion({ total, firstTryCount, onRetry }: DistancesSegmentsCompletionProps) {
  const { t } = useTranslation();
  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        📏
      </span>
      <h2 className="quiz-completion-title">{t('distancesSegments.completion.title')}</h2>
      <p className="quiz-completion-score">{t('distancesSegments.completion.summary', { total })}</p>
      <p className="distances-segments-completion-detail">{t('distancesSegments.completion.firstTry', { count: firstTryCount })}</p>
      <div className="distances-segments-completion-actions">
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

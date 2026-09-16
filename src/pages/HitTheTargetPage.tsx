import { useEffect, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { CoordinateGrid } from '../components/CoordinateGrid';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { useHitTheTargetGame, HIT_THE_TARGET_TOTAL_COUNT } from '../hooks/useHitTheTargetGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import { hitTheTargetStages } from '../data/games/hitTheTargetStages';
import type { MistakeType, TargetPoint } from '../types/hitTheTarget';
import './HitTheTargetPage.css';

const GAME_ID = 'hitTheTarget';
const INTEGER_PATTERN = /^-?\d*$/;
const VALID_INTEGER_PATTERN = /^-?\d+$/;

function isValidInteger(value: string): boolean {
  return VALID_INTEGER_PATTERN.test(value);
}

export function HitTheTargetPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useHitTheTargetGame();
  const [xInput, setXInput] = useState('');
  const [yInput, setYInput] = useState('');
  const [bannerVisible, setBannerVisible] = useState(false);
  const [correctMessage, setCorrectMessage] = useState('');

  // Reset the inputs whenever a new target (or a fresh game) appears. This is the
  // React-recommended "adjust state during render" pattern rather than an effect,
  // since it's plain derived state with no external system involved.
  const resetKey = `${game.targetNumber}-${game.roundKey}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setXInput('');
    setYInput('');
  }

  useGameSessionTracking(GAME_ID, {
    total: HIT_THE_TARGET_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'firing') {
      play('fire');
    } else if (game.status === 'correct') {
      play('hit');
      const messages = t('hitTheTarget.feedback.correctMessages', { returnObjects: true }) as string[];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the hit sound, not derived state
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

  useEffect(() => {
    if (!game.justEnteredStage || game.stageIndex === 0) return;
    play('stageComplete');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- paired with the chime, not derived state
    setBannerVisible(true);
    const timer = window.setTimeout(() => setBannerVisible(false), 2200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.justEnteredStage, game.stageIndex]);

  useEffect(() => {
    if (game.status !== 'correct') return;
    const timer = window.setTimeout(() => game.advance(), 650);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.targetNumber]);

  const mistakeMessage = getMistakeMessage(t, game.mistakeType, game.target);

  const canFire = isValidInteger(xInput) && isValidInteger(yInput) && game.status !== 'firing' && game.status !== 'correct';

  function handleFire() {
    if (!canFire) return;
    game.submit(Number(xInput), Number(yInput));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') handleFire();
  }

  function handleXChange(value: string) {
    if (INTEGER_PATTERN.test(value)) setXInput(value);
  }

  function handleYChange(value: string) {
    if (INTEGER_PATTERN.test(value)) setYInput(value);
  }

  const currentStage = hitTheTargetStages[game.stageIndex];

  return (
    <PageLayout
      title={t('games.hitTheTarget.name')}
      context={t('grades.7')} backTo="/grade/7/coordinate-system"
      backLabel={t('coordinateSystemPage.title')}
    >
      {game.completed ? (
        <HitTheTargetCompletion
          total={HIT_THE_TARGET_TOTAL_COUNT}
          firstTryCount={game.firstAttemptCorrectCount}
          onRetry={game.retry}
        />
      ) : (
        <div className="hit-the-target">
          <div className="hit-the-target-top">
            <QuizProgress current={game.targetNumber} total={HIT_THE_TARGET_TOTAL_COUNT} labelKey="hitTheTarget.progress" />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <span className="hit-the-target-stage">{t(currentStage.nameKey)}</span>

          {bannerVisible && <div className="hit-the-target-banner">{t(currentStage.introKey)}</div>}

          <p className="hit-the-target-prompt">{t('hitTheTarget.prompt')}</p>

          <CoordinateGrid
            size="lg"
            targetMarker={game.target}
            targetHit={game.status === 'correct'}
            targetHitSeed={game.targetNumber}
            attemptMarker={game.attemptMarker}
          />

          {game.status === 'correct' && <p className="hit-the-target-feedback feedback-correct-text">{correctMessage}</p>}
          {game.status === 'incorrect' && mistakeMessage && (
            <div className="hit-the-target-feedback feedback-incorrect-text">
              {game.attemptMarker && (
                <MathText className="hit-the-target-attempt-pair">
                  ({game.attemptMarker.x}, {game.attemptMarker.y})
                </MathText>
              )}
              <p>{mistakeMessage}</p>
            </div>
          )}

          <div className="hit-the-target-inputs" dir="ltr">
            <label className="hit-the-target-field">
              <span>{t('hitTheTarget.inputs.x')}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="-?[0-9]*"
                value={xInput}
                onChange={(event) => handleXChange(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={game.status === 'firing' || game.status === 'correct'}
              />
            </label>
            <label className="hit-the-target-field">
              <span>{t('hitTheTarget.inputs.y')}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="-?[0-9]*"
                value={yInput}
                onChange={(event) => handleYChange(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={game.status === 'firing' || game.status === 'correct'}
              />
            </label>
          </div>

          <button type="button" className="btn btn-primary hit-the-target-fire" onClick={handleFire} disabled={!canFire}>
            {t('hitTheTarget.actions.fire')}
          </button>
        </div>
      )}
    </PageLayout>
  );
}

function getMistakeMessage(t: (key: string, options?: Record<string, unknown>) => string, mistakeType: MistakeType | null, target: TargetPoint): string | null {
  if (!mistakeType) return null;

  if (mistakeType === 'xSign') {
    const direction = target.x < 0 ? t('hitTheTarget.words.left') : t('hitTheTarget.words.right');
    const sign = target.x < 0 ? t('hitTheTarget.words.negative') : t('hitTheTarget.words.positive');
    return t('hitTheTarget.feedback.xSign', { direction, sign });
  }
  if (mistakeType === 'ySign') {
    const direction = target.y < 0 ? t('hitTheTarget.words.below') : t('hitTheTarget.words.above');
    const sign = target.y < 0 ? t('hitTheTarget.words.negative') : t('hitTheTarget.words.positive');
    return t('hitTheTarget.feedback.ySign', { direction, sign });
  }
  if (mistakeType === 'swapped') return t('hitTheTarget.feedback.swapped');
  return t('hitTheTarget.feedback.other');
}

interface HitTheTargetCompletionProps {
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

function HitTheTargetCompletion({ total, firstTryCount, onRetry }: HitTheTargetCompletionProps) {
  const { t } = useTranslation();
  const retriedCount = total - firstTryCount;

  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        🎯
      </span>
      <h2 className="quiz-completion-title">{t('hitTheTarget.completion.title')}</h2>
      <p className="quiz-completion-score">{t('hitTheTarget.completion.summary', { total })}</p>
      <p className="hit-the-target-completion-detail">{t('hitTheTarget.completion.firstTry', { count: firstTryCount })}</p>
      {retriedCount > 0 && (
        <p className="hit-the-target-completion-detail">{t('hitTheTarget.completion.retried', { count: retriedCount })}</p>
      )}
      <div className="hit-the-target-completion-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {t('hitTheTarget.actions.playAgain')}
        </button>
        <Link className="btn btn-secondary" to="/grade/7/coordinate-system">
          {t('hitTheTarget.actions.backToTopic')}
        </Link>
      </div>
    </div>
  );
}

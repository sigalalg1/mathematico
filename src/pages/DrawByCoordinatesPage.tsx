import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { CoordinateGrid } from '../components/CoordinateGrid';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import { useDrawByCoordinatesGame } from '../hooks/useDrawByCoordinatesGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import type { Point } from '../types/drawByCoordinates';
import './DrawByCoordinatesPage.css';

const GAME_ID = 'drawByCoordinates';
const WRONG_ATTEMPT_TIMEOUT_MS = 1400;

export function DrawByCoordinatesPage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useDrawByCoordinatesGame();

  useGameSessionTracking(GAME_ID, {
    total: game.total,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.drawnPoints.length === 0) return;
    play('move');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.drawnPoints.length]);

  useEffect(() => {
    if (!game.wrongAttempt) return;
    play('miss');
    const timer = window.setTimeout(() => game.dismissWrongAttempt(), WRONG_ATTEMPT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.wrongAttempt]);

  useEffect(() => {
    if (game.completed) play('gameComplete');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.completed]);

  function handleGridClick(point: Point) {
    if (game.completed) return;
    game.submit(point);
  }

  const hintMessage = game.wrongAttempt ? getHintMessage(t, game.target, game.wrongAttempt) : null;

  return (
    <PageLayout title={t('games.drawByCoordinates.name')} backTo="/grade/7/coordinate-system" backLabel={t('coordinateSystemPage.title')}>
      {game.completed ? (
        <DrawByCoordinatesCompletion drawingNameKey={game.drawing.nameKey} emoji={game.drawing.emoji} onNext={game.nextDrawing} />
      ) : (
        <div className="draw-by-coordinates">
          <div className="draw-by-coordinates-top">
            <span className="draw-by-coordinates-progress">
              {t('drawByCoordinates.progress', { current: game.drawnPoints.length + 1, total: game.total })}
            </span>
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <p className="draw-by-coordinates-prompt">
            {t('drawByCoordinates.promptLead')}{' '}
            <MathText className="draw-by-coordinates-pair">
              ({game.target.x}, {game.target.y})
            </MathText>
          </p>

          <CoordinateGrid
            size="lg"
            drawnPoints={game.drawnPoints}
            attemptMarker={game.wrongAttempt}
            onGridClick={handleGridClick}
          />

          {hintMessage && <p className="draw-by-coordinates-feedback feedback-hint-text">{hintMessage}</p>}
        </div>
      )}
    </PageLayout>
  );
}

function getHintMessage(t: (key: string) => string, target: Point, attempt: Point): string {
  const xMatches = attempt.x === target.x;
  const yMatches = attempt.y === target.y;
  if (!xMatches && yMatches) return t('drawByCoordinates.feedback.checkX');
  if (xMatches && !yMatches) return t('drawByCoordinates.feedback.checkY');
  return t('drawByCoordinates.feedback.checkBoth');
}

interface DrawByCoordinatesCompletionProps {
  drawingNameKey: string;
  emoji: string;
  onNext: () => void;
}

function DrawByCoordinatesCompletion({ drawingNameKey, emoji, onNext }: DrawByCoordinatesCompletionProps) {
  const { t } = useTranslation();
  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        {emoji}
      </span>
      <h2 className="quiz-completion-title">{t('drawByCoordinates.completion.title')}</h2>
      <p className="quiz-completion-score">{t('drawByCoordinates.completion.summary', { name: t(drawingNameKey) })}</p>
      <div className="draw-by-coordinates-completion-actions">
        <button type="button" className="btn btn-primary" onClick={onNext}>
          {t('drawByCoordinates.actions.anotherDrawing')}
        </button>
        <Link className="btn btn-secondary" to="/grade/7/coordinate-system">
          {t('drawByCoordinates.actions.backToTopic')}
        </Link>
      </div>
    </div>
  );
}

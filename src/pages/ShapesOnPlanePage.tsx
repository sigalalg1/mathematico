import { useEffect, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { CoordinateGrid } from '../components/CoordinateGrid';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { useShapesOnPlaneGame, SHAPES_ON_PLANE_TOTAL_COUNT } from '../hooks/useShapesOnPlaneGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import type { Point } from '../types/shapesOnPlane';
import './ShapesOnPlanePage.css';

const GAME_ID = 'shapesOnPlane';
const DIGITS_ONLY = /^\d*$/;

export function ShapesOnPlanePage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useShapesOnPlaneGame();
  const [input, setInput] = useState('');
  const [bannerVisible, setBannerVisible] = useState(false);
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: SHAPES_ON_PLANE_TOTAL_COUNT,
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
      const messages = t('shapesOnPlane.feedback.correctMessages', { returnObjects: true }) as string[];
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
  const isComplete = challenge.kind === 'completeShape';

  function handleGridClick(point: Point) {
    if (!isComplete || game.status === 'correct') return;
    game.submit({ kind: 'point', value: point });
  }

  function handleNumberSubmit() {
    if (input.length === 0 || game.status === 'correct') return;
    game.submit({ kind: 'number', value: Number(input) });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') handleNumberSubmit();
  }

  const knownVertices = isComplete ? challenge.vertices.slice(0, 3) : challenge.vertices;
  const knownLabels = isComplete ? challenge.vertexLabels.slice(0, 3) : challenge.vertexLabels;
  const segments = isComplete
    ? [
        { from: challenge.vertices[0], to: challenge.vertices[1] },
        { from: challenge.vertices[1], to: challenge.vertices[2] },
        ...(answered
          ? [
              { from: challenge.vertices[2], to: challenge.vertices[3], variant: 'correct' as const },
              { from: challenge.vertices[3], to: challenge.vertices[0], variant: 'correct' as const },
            ]
          : []),
      ]
    : [
        { from: challenge.vertices[0], to: challenge.vertices[1] },
        { from: challenge.vertices[1], to: challenge.vertices[2] },
        { from: challenge.vertices[2], to: challenge.vertices[3] },
        { from: challenge.vertices[3], to: challenge.vertices[0] },
        ...(challenge.kind === 'sideLength' && challenge.askedSide
          ? [
              {
                from: challenge.askedSide.from,
                to: challenge.askedSide.to,
                variant: (answered ? (game.status === 'correct' ? 'correct' : 'incorrect') : 'default') as 'correct' | 'incorrect' | 'default',
              },
            ]
          : []),
      ];

  const shapeName = t(`shapesOnPlane.shapeNames.${challenge.shapeKind}`);

  const prompt = isComplete
    ? null
    : challenge.kind === 'sideLength'
      ? t('shapesOnPlane.prompts.sideLength', { side: challenge.askedSide?.label ?? '' })
      : challenge.kind === 'perimeter'
        ? t('shapesOnPlane.prompts.perimeter')
        : t('shapesOnPlane.prompts.area');

  return (
    <PageLayout
      title={t('shapesOnPlane.gameName')}
      backTo="/grade/7/coordinate-system"
      backLabel={t('coordinateSystemPage.title')}
    >
      {game.completed ? (
        <ShapesOnPlaneCompletion total={game.total} firstTryCount={game.firstAttemptCorrectCount} onRetry={game.retry} />
      ) : (
        <div className="shapes-on-plane">
          <div className="shapes-on-plane-top">
            <QuizProgress current={game.index + 1} total={game.total} labelKey="shapesOnPlane.progress" />
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
          </div>

          <span className="shapes-on-plane-stage">{t(game.stage.nameKey)}</span>
          {bannerVisible && <div className="shapes-on-plane-banner">{t(game.stage.introKey)}</div>}

          {isComplete ? (
            <div className="shapes-on-plane-prompt-group">
              <span className="shapes-on-plane-shape-badge">{shapeName}</span>
              <p className="shapes-on-plane-prompt-title">{t(`shapesOnPlane.prompts.completeShapeTitle.${challenge.shapeKind}`)}</p>
              {challenge.shapeKind === 'isoscelesTrapezoid' && (
                <p className="shapes-on-plane-prompt-action">{t('shapesOnPlane.prompts.parallelSidesNote')}</p>
              )}
              <p className="shapes-on-plane-prompt-action">{t('shapesOnPlane.prompts.completeShapeAction')}</p>
            </div>
          ) : (
            <p className="shapes-on-plane-prompt">{prompt}</p>
          )}

          <CoordinateGrid
            size="lg"
            segments={segments}
            vertexLabels={knownVertices.map((point, i) => ({ point, label: knownLabels[i] }))}
            attemptMarker={isComplete && game.status === 'incorrect' && game.lastAnswer?.kind === 'point' ? game.lastAnswer.value : null}
            targetMarker={isComplete && answered ? challenge.vertices[3] : null}
            onGridClick={isComplete && game.status !== 'correct' ? handleGridClick : undefined}
          />

          {!isComplete && (
            <div className="shapes-on-plane-input-row">
              <label className="shapes-on-plane-field">
                <span>{t('shapesOnPlane.inputLabel')}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={input}
                  onChange={(event) => DIGITS_ONLY.test(event.target.value) && setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={game.status === 'correct'}
                />
              </label>
              <button type="button" className="btn btn-primary" onClick={handleNumberSubmit} disabled={input.length === 0 || game.status === 'correct'}>
                {t('shapesOnPlane.actions.check')}
              </button>
            </div>
          )}

          {game.status === 'correct' && <p className="shapes-on-plane-feedback feedback-correct-text">{correctMessage}</p>}
          {game.status === 'incorrect' && (
            <p className="shapes-on-plane-feedback feedback-hint-text">
              {isComplete ? t('shapesOnPlane.feedback.incorrectHintPoint') : t('shapesOnPlane.feedback.incorrectHintNumber')}
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

interface ShapesOnPlaneCompletionProps {
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

function ShapesOnPlaneCompletion({ total, firstTryCount, onRetry }: ShapesOnPlaneCompletionProps) {
  const { t } = useTranslation();
  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        📐
      </span>
      <h2 className="quiz-completion-title">{t('shapesOnPlane.completion.title')}</h2>
      <p className="quiz-completion-score">{t('shapesOnPlane.completion.summary', { total })}</p>
      <p className="shapes-on-plane-completion-detail">{t('shapesOnPlane.completion.firstTry', { count: firstTryCount })}</p>
      <div className="shapes-on-plane-completion-actions">
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

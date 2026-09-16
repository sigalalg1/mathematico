import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';
import { CoordinateGrid } from '../components/CoordinateGrid';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { SoundToggle } from '../components/SoundToggle';
import { MathText } from '../components/MathText';
import {
  COORDINATE_SCALE_TOTAL_COUNT,
  describePosition,
  toAnswer,
  useCoordinateScaleGame,
} from '../hooks/useCoordinateScaleGame';
import { useGameSessionTracking } from '../hooks/useGameSessionTracking';
import { useSound } from '../audio/useSound';
import {
  COORDINATE_SCALE_MAX,
  COORDINATE_SCALE_MIN,
  formatScaleValue,
} from '../data/games/coordinateScaleData';
import type { ScaleOptionKind } from '../types/coordinateScale';
import './CoordinateScalePage.css';

const GAME_ID = 'coordinateScale';

const SCALE_MISTAKES: ScaleOptionKind[] = ['scaleAsOne', 'wrongScale'];

export function CoordinateScalePage() {
  const { t } = useTranslation();
  const { enabled: soundEnabled, play, toggle: toggleSound } = useSound();
  const game = useCoordinateScaleGame();
  const [correctMessage, setCorrectMessage] = useState('');

  useGameSessionTracking(GAME_ID, {
    total: COORDINATE_SCALE_TOTAL_COUNT,
    score: game.firstAttemptCorrectCount,
    completed: game.completed,
    mistakes: game.mistakes,
    roundKey: game.roundKey,
  });

  useEffect(() => {
    if (game.status === 'correct') {
      play('hit');
      const messages = t('coordinateScale.feedback.correctMessages', { returnObjects: true }) as string[];
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
    if (game.status !== 'correct') return;
    const timer = window.setTimeout(() => game.next(), 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.index]);

  if (game.completed) {
    return (
      <PageLayout title={t('coordinateScale.gameName')} context={t('grades.7')} backTo="/grade/7/coordinate-system" backLabel={t('coordinateSystemPage.title')}>
        <CoordinateScaleCompletion total={game.total} firstTryCount={game.firstAttemptCorrectCount} onRetry={game.retry} />
      </PageLayout>
    );
  }

  const challenge = game.challenge;
  const answered = game.status !== 'unanswered';
  const wrong = game.status === 'incorrect' ? game.lastAnswer : null;
  const wrongKind = wrong?.option.kind ?? null;
  const showScaleHint = wrongKind !== null && SCALE_MISTAKES.includes(wrongKind);
  const showSwapPath = wrongKind === 'swappedXY' && wrong !== null;

  const referenceValue = formatScaleValue(challenge.reference.toTick * challenge.scale);
  const referenceSquares = Math.abs(challenge.reference.toTick);

  function handleSelectPoint(id: string) {
    if (game.status === 'correct') return;
    const option = challenge.options.find((candidate) => candidate.id === id);
    if (!option) return;
    game.submit(toAnswer(challenge, option));
  }

  return (
    <PageLayout title={t('coordinateScale.gameName')} context={t('grades.7')} backTo="/grade/7/coordinate-system" backLabel={t('coordinateSystemPage.title')}>
      <div className="coordinate-scale">
        <div className="coordinate-scale-top">
          <QuizProgress current={game.index + 1} total={game.total} labelKey="coordinateScale.progress" />
          <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
        </div>

        <p className="coordinate-scale-note">{t('coordinateScale.sameScale')}</p>

        {challenge.anchor && (
          <p className="coordinate-scale-anchor">
            {t('coordinateScale.prompt.anchorKnown')}{' '}
            <MathText className="coordinate-scale-anchor-value">
              {challenge.anchor.label} = ({formatScaleValue(challenge.anchor.tick.x * challenge.scale)},{' '}
              {formatScaleValue(challenge.anchor.tick.y * challenge.scale)})
            </MathText>
          </p>
        )}

        <p className="coordinate-scale-prompt">
          {challenge.kind === 'axisValue'
            ? t('coordinateScale.prompt.axisValue', { axis: t(`coordinateScale.axisNames.${challenge.axis ?? 'x'}`) })
            : t('coordinateScale.prompt.locate')}{' '}
          <MathText className="coordinate-scale-target">
            {challenge.kind === 'locatePoint' ? `${challenge.targetLabel} = ` : ''}
            {describePosition(challenge, challenge.targetTick)}
          </MathText>
          {t('coordinateScale.prompt.trailing')}
        </p>

        <CoordinateGrid
          size="lg"
          min={COORDINATE_SCALE_MIN}
          max={COORDINATE_SCALE_MAX}
          unitScale={challenge.scale}
          labeledTicks={challenge.labeledTicks}
          vertexLabels={challenge.anchor ? [{ point: challenge.anchor.tick, label: challenge.anchor.label }] : []}
          clickablePoints={challenge.options.map((option) => ({ id: option.id, point: option.tick, label: option.label }))}
          onSelectPoint={handleSelectPoint}
          selectedPointId={wrong?.optionId ?? (game.status === 'correct' ? challenge.correctOptionId : null)}
          correctPointId={game.status === 'correct' ? challenge.correctOptionId : null}
          pointsAnswered={answered}
          pointsLocked={game.status === 'correct'}
          scaleHint={showScaleHint ? challenge.reference : null}
          scaleHintSeed={game.attemptSeed}
          segments={showSwapPath ? swapPathSegments(wrong.tick) : []}
          attemptMarker={showSwapPath ? wrong.tick : null}
        />

        {game.status === 'correct' && <p className="coordinate-scale-feedback feedback-correct-text">{correctMessage}</p>}

        {wrong && (
          <div className="coordinate-scale-feedback feedback-hint-text">
            <p>
              {t('coordinateScale.feedback.youClicked')} <MathText>{wrong.display}</MathText>
            </p>
            {showScaleHint && (
              <p>
                {t('coordinateScale.feedback.scaleExplained', {
                  to: referenceValue,
                  squares: referenceSquares,
                  unit: formatScaleValue(challenge.scale),
                })}
              </p>
            )}
            {wrongKind === 'swappedXY' && <p>{t('coordinateScale.feedback.swapped')}</p>}
            {wrongKind === 'signError' && <p>{t('coordinateScale.feedback.signError')}</p>}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

/** The student's own route to the square they clicked: along X first, then up/down Y. */
function swapPathSegments(tick: { x: number; y: number }) {
  return [
    { from: { x: 0, y: 0 }, to: { x: tick.x, y: 0 }, variant: 'incorrect' as const },
    { from: { x: tick.x, y: 0 }, to: { x: tick.x, y: tick.y }, variant: 'incorrect' as const },
  ];
}

interface CompletionProps {
  total: number;
  firstTryCount: number;
  onRetry: () => void;
}

function CoordinateScaleCompletion({ total, firstTryCount, onRetry }: CompletionProps) {
  const { t } = useTranslation();
  return (
    <div className="quiz-completion">
      <span className="quiz-completion-icon" aria-hidden="true">
        📊
      </span>
      <h2 className="quiz-completion-title">{t('coordinateScale.completion.title')}</h2>
      <p className="quiz-completion-score">{t('coordinateScale.completion.summary', { total })}</p>
      <p className="coordinate-scale-completion-detail">{t('coordinateScale.completion.firstTry', { count: firstTryCount })}</p>
      <div className="coordinate-scale-completion-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {t('coordinateScale.actions.playAgain')}
        </button>
        <Link className="btn btn-secondary" to="/grade/7/coordinate-system">
          {t('coordinateScale.actions.backToTopic')}
        </Link>
      </div>
    </div>
  );
}
